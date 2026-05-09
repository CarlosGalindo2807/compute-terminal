"""Vast.ai scraper.

Public bundles endpoint: https://console.vast.ai/api/v0/bundles/
- No auth required
- Returns JSON with `offers` list
- Vast hardened the `q` filter format in 2025+; we now request without `q` and
  the API returns its default page (~thousands of offers in one shot, which
  is plenty for v0). Pagination can be added back with the new filter shape
  (`{"verified": {"eq": true}, ...}`) when we need finer slicing.
"""

from __future__ import annotations

from typing import Any

import httpx

from core.base_scraper import BaseScraper, ScrapedListing

ENDPOINT = "https://console.vast.ai/api/v0/bundles/"


class Scraper(BaseScraper):
    def __init__(self) -> None:
        super().__init__("vast")

    async def fetch_listings(self, http: httpx.AsyncClient) -> list[ScrapedListing]:
        resp = await http.get(ENDPOINT)
        resp.raise_for_status()
        data = resp.json()
        offers = data.get("offers") or []
        listings: list[ScrapedListing] = []
        for offer in offers:
            parsed = _parse_offer(offer)
            if parsed:
                listings.append(parsed)
        return listings


def _parse_offer(offer: dict[str, Any]) -> ScrapedListing | None:
    gpu_name = offer.get("gpu_name") or offer.get("gpu_model")
    dph = offer.get("dph_total")
    num_gpus = offer.get("num_gpus") or 1
    if not gpu_name or dph is None or float(dph) <= 0 or num_gpus <= 0:
        return None
    # dph_total is the total $/h for `num_gpus` GPUs. Normalize to per-GPU price.
    per_gpu = float(dph) / float(num_gpus)
    return ScrapedListing(
        raw_gpu_string=str(gpu_name).strip(),
        price_per_hour=per_gpu,
        currency="USD",
        num_gpus=int(num_gpus),
        region=offer.get("geolocation") or offer.get("country"),
        interconnect=_classify_interconnect(offer),
        availability_count=offer.get("rentable") and 1 or 0,
        raw_payload={
            "id": offer.get("id"),
            "machine_id": offer.get("machine_id"),
            "dph_total": dph,
            "dlperf": offer.get("dlperf"),
            "reliability": offer.get("reliability2") or offer.get("reliability"),
            "verified": offer.get("verified"),
            "rentable": offer.get("rentable"),
            "host_id": offer.get("host_id"),
            "datacenter": offer.get("datacenter"),
            "inet_up": offer.get("inet_up"),
            "inet_down": offer.get("inet_down"),
        },
    )


def _classify_interconnect(offer: dict[str, Any]) -> str | None:
    if offer.get("nvlink"):
        return "nvlink"
    pcie_gen = offer.get("pcie_bw") or offer.get("pcie_gen")
    if pcie_gen:
        return f"pcie:{pcie_gen}"
    return None
