"""Publish a row to system_events. Fire-and-forget; never raises out."""

from __future__ import annotations

from typing import Any

from core.logger import get_logger
from core.supabase_client import get_supabase

log = get_logger(__name__)


def publish_event(
    event_type: str,
    *,
    payload: dict[str, Any] | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    source: str | None = None,
) -> None:
    try:
        get_supabase().table("system_events").insert(
            {
                "event_type": event_type,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "payload": payload or {},
                "source": source,
            }
        ).execute()
    except Exception as exc:
        log.warning("event_publish_failed", event_type=event_type, error=str(exc))
