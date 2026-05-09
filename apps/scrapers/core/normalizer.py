"""Normalization: raw GPU string → gpu_models.id.

Pipeline (matches `docs/flywheel.md`):
  1. exact rule match in normalization_rules
  2. alias match in gpu_models.aliases (array contains)
  3. fuzzy via pg_trgm similarity > 0.8
  4. push to unmatched_listings (occurrence_count++)

Returns gpu_model_id or None. The LLM-based learning happens in apps/workers/normalize-unmatched.ts,
not here — this function is the synchronous fast path.
"""

from __future__ import annotations

from typing import Any

from core.logger import get_logger
from core.supabase_client import get_supabase

log = get_logger(__name__)

FUZZY_SIMILARITY_THRESHOLD = 0.80


def normalize_gpu_string(
    raw: str,
    *,
    provider_id: str | None = None,
    raw_payload: dict[str, Any] | None = None,
) -> str | None:
    """Resolve a raw GPU string to a gpu_models.id, or None if unresolvable."""
    if not raw or not raw.strip():
        return None

    cleaned = raw.strip()
    sb = get_supabase()

    # 1. exact match
    res = (
        sb.table("normalization_rules")
        .select("id, gpu_model_id, hit_count")
        .eq("pattern_type", "exact")
        .eq("pattern", cleaned)
        .order("confidence", desc=True)
        .limit(1)
        .execute()
    )
    if res.data:
        rule = res.data[0]
        _bump_rule_hit(rule["id"], rule["hit_count"])
        return rule["gpu_model_id"]

    # 2. alias match (array contains)
    res = (
        sb.table("gpu_models")
        .select("id, slug")
        .contains("aliases", [cleaned])
        .limit(1)
        .execute()
    )
    if res.data:
        gpu_id = res.data[0]["id"]
        _create_rule(cleaned, "exact", gpu_id, source="rule_based", confidence=1.0)
        return gpu_id

    # 3. fuzzy via RPC. Define this function in a follow-up migration if you want
    # server-side trigram lookup. Cheap fallback: case-insensitive contains on slug.
    res = (
        sb.table("gpu_models")
        .select("id, slug")
        .ilike("slug", f"%{_slugify(cleaned)}%")
        .limit(1)
        .execute()
    )
    if res.data:
        gpu_id = res.data[0]["id"]
        _create_rule(cleaned, "fuzzy", gpu_id, source="rule_based", confidence=0.8)
        return gpu_id

    # 4. unmatched — upsert with occurrence increment
    _record_unmatched(cleaned, provider_id, raw_payload)
    return None


def _bump_rule_hit(rule_id: str, current_hit_count: int) -> None:
    try:
        get_supabase().table("normalization_rules").update(
            {"hit_count": current_hit_count + 1, "last_hit_at": "now()"}
        ).eq("id", rule_id).execute()
    except Exception as exc:
        log.warning("rule_hit_bump_failed", rule_id=rule_id, error=str(exc))


def _create_rule(
    pattern: str,
    pattern_type: str,
    gpu_model_id: str,
    *,
    source: str,
    confidence: float,
) -> None:
    try:
        get_supabase().table("normalization_rules").upsert(
            {
                "pattern": pattern,
                "pattern_type": pattern_type,
                "gpu_model_id": gpu_model_id,
                "source": source,
                "confidence": confidence,
                "hit_count": 1,
                "last_hit_at": "now()",
            },
            on_conflict="pattern,pattern_type,gpu_model_id",
        ).execute()
    except Exception as exc:
        log.warning("rule_create_failed", pattern=pattern, error=str(exc))


def _record_unmatched(
    raw_string: str,
    provider_id: str | None,
    raw_payload: dict[str, Any] | None,
) -> None:
    try:
        sb = get_supabase()
        existing = (
            sb.table("unmatched_listings")
            .select("id, occurrence_count")
            .eq("raw_string", raw_string)
            .eq("provider_id", provider_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            row = existing.data[0]
            sb.table("unmatched_listings").update(
                {"occurrence_count": row["occurrence_count"] + 1}
            ).eq("id", row["id"]).execute()
        else:
            sb.table("unmatched_listings").insert(
                {
                    "raw_string": raw_string,
                    "raw_payload": raw_payload or {},
                    "provider_id": provider_id,
                }
            ).execute()
    except Exception as exc:
        log.warning("unmatched_record_failed", raw=raw_string[:50], error=str(exc))


def _slugify(s: str) -> str:
    return "".join(c.lower() if c.isalnum() else "-" for c in s).strip("-")
