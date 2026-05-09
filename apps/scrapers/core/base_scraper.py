"""Abstract scraper base. Concrete scrapers implement `fetch_listings` only."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Iterable

import httpx
from pydantic import BaseModel, Field
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from core.event_publisher import publish_event
from core.logger import get_logger
from core.normalizer import normalize_gpu_string
from core.settings import settings
from core.supabase_client import get_supabase

log = get_logger(__name__)


class ScrapedListing(BaseModel):
    """One row produced by a scraper before normalization + persistence."""

    raw_gpu_string: str
    price_per_hour: float = Field(gt=0)
    currency: str = "USD"
    num_gpus: int = Field(default=1, gt=0)
    region: str | None = None
    interconnect: str | None = None
    availability_count: int | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class BaseScraper(ABC):
    provider_slug: str

    def __init__(self, provider_slug: str) -> None:
        self.provider_slug = provider_slug
        self._provider_id: str | None = None
        self._http: httpx.AsyncClient | None = None
        self.log = log.bind(provider=provider_slug)

    # ───────────────────── Public lifecycle ─────────────────────

    async def run(self) -> dict[str, Any]:
        """Fetch + normalize + persist + publish. Returns a summary dict."""
        started = datetime.now(timezone.utc)
        await self._ensure_provider_id()
        try:
            listings = await self._fetch_with_retry()
        except Exception as exc:
            await self._record_failure(exc)
            return {"ok": False, "provider": self.provider_slug, "error": str(exc)}

        ok = await self._record_success()
        saved, unmatched = self._persist(listings)
        publish_event(
            "scraper_run_succeeded",
            payload={
                "saved": saved,
                "unmatched": unmatched,
                "duration_ms": int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
            },
            entity_type="provider",
            entity_id=self._provider_id,
            source=f"scraper:{self.provider_slug}",
        )
        return {
            "ok": ok,
            "provider": self.provider_slug,
            "fetched": len(listings),
            "saved": saved,
            "unmatched": unmatched,
        }

    # ───────────────────── To override ─────────────────────

    @abstractmethod
    async def fetch_listings(self, http: httpx.AsyncClient) -> list[ScrapedListing]:
        """Concrete implementations return parsed ScrapedListing objects."""

    # ───────────────────── Internals ─────────────────────

    async def _fetch_with_retry(self) -> list[ScrapedListing]:
        async with httpx.AsyncClient(
            timeout=settings.scraper_request_timeout_s,
            headers={"User-Agent": settings.scraper_user_agent},
            follow_redirects=True,
        ) as client:
            self._http = client
            attempt_iter: Iterable[Any]
            attempt_iter = AsyncRetrying(
                stop=stop_after_attempt(3),
                wait=wait_exponential(multiplier=1.5, min=1, max=15),
                retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
                reraise=True,
            )
            async for attempt in attempt_iter:
                with attempt:
                    return await self.fetch_listings(client)
        return []

    async def _ensure_provider_id(self) -> None:
        if self._provider_id:
            return
        res = (
            get_supabase()
            .table("providers")
            .select("id")
            .eq("slug", self.provider_slug)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise RuntimeError(
                f"Provider '{self.provider_slug}' not found in providers table — run db:seed first."
            )
        self._provider_id = res.data[0]["id"]

    async def _record_success(self) -> bool:
        try:
            sb = get_supabase()
            sb.table("providers").update(
                {
                    "consecutive_failures": 0,
                    "last_success_at": "now()",
                }
            ).eq("id", self._provider_id).execute()
            return True
        except Exception as exc:
            self.log.warning("record_success_failed", error=str(exc))
            return False

    async def _record_failure(self, exc: Exception) -> None:
        self.log.error("scraper_run_failed", error=str(exc))
        try:
            sb = get_supabase()
            row = (
                sb.table("providers")
                .select("consecutive_failures, reliability_score")
                .eq("id", self._provider_id)
                .single()
                .execute()
            )
            current = row.data
            new_failures = (current.get("consecutive_failures") or 0) + 1
            new_reliability = max(0.0, float(current.get("reliability_score") or 1.0) * 0.95)
            sb.table("providers").update(
                {
                    "consecutive_failures": new_failures,
                    "reliability_score": new_reliability,
                }
            ).eq("id", self._provider_id).execute()
        except Exception as inner:
            self.log.warning("record_failure_metrics_failed", error=str(inner))

        publish_event(
            "scraper_run_failed",
            payload={"error": str(exc)},
            entity_type="provider",
            entity_id=self._provider_id,
            source=f"scraper:{self.provider_slug}",
        )

    def _persist(self, listings: list[ScrapedListing]) -> tuple[int, int]:
        if not listings:
            return 0, 0
        sb = get_supabase()
        rows: list[dict[str, Any]] = []
        unmatched = 0
        for listing in listings:
            gpu_id = normalize_gpu_string(
                listing.raw_gpu_string,
                provider_id=self._provider_id,
                raw_payload=listing.raw_payload,
            )
            if gpu_id is None:
                unmatched += 1
            rows.append(
                {
                    "provider_id": self._provider_id,
                    "gpu_model_id": gpu_id,
                    "region": listing.region,
                    "price_per_hour": listing.price_per_hour,
                    "currency": listing.currency,
                    "num_gpus": listing.num_gpus,
                    "interconnect": listing.interconnect,
                    "availability_count": listing.availability_count,
                    "raw_payload": listing.raw_payload,
                    "raw_gpu_string": listing.raw_gpu_string,
                    "is_normalized": gpu_id is not None,
                }
            )
        # Chunked insert to keep payloads small
        CHUNK = 500
        for i in range(0, len(rows), CHUNK):
            sb.table("price_snapshots").insert(rows[i : i + CHUNK]).execute()
        return len(rows), unmatched
