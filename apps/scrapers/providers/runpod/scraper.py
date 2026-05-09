"""RunPod scraper — GraphQL endpoint.

Returns gpuTypes with secureCloud and communityCloud price points.
"""

from __future__ import annotations

from typing import Any

import httpx

from core.base_scraper import BaseScraper, ScrapedListing

ENDPOINT = "https://api.runpod.io/graphql"

QUERY = """
query GpuTypes {
  gpuTypes {
    id
    displayName
    memoryInGb
    secureCloud
    communityCloud
    lowestPrice(input: {gpuCount: 1}) {
      minimumBidPrice
      uninterruptablePrice
    }
  }
}
""".strip()


class Scraper(BaseScraper):
    def __init__(self) -> None:
        super().__init__("runpod")

    async def fetch_listings(self, http: httpx.AsyncClient) -> list[ScrapedListing]:
        resp = await http.post(ENDPOINT, json={"query": QUERY})
        resp.raise_for_status()
        body = resp.json()
        gpu_types = (body.get("data") or {}).get("gpuTypes") or []
        listings: list[ScrapedListing] = []
        for gt in gpu_types:
            for parsed in _parse_gpu_type(gt):
                listings.append(parsed)
        return listings


def _parse_gpu_type(gt: dict[str, Any]) -> list[ScrapedListing]:
    name = (gt.get("displayName") or "").strip()
    if not name:
        return []
    out: list[ScrapedListing] = []
    lowest = gt.get("lowestPrice") or {}
    spot = lowest.get("minimumBidPrice")
    on_demand = lowest.get("uninterruptablePrice")

    if gt.get("secureCloud") and on_demand and on_demand > 0:
        out.append(_listing(name, on_demand, gt, region="secure", interconnect="on_demand"))
    if gt.get("communityCloud") and on_demand and on_demand > 0:
        out.append(_listing(name, on_demand, gt, region="community", interconnect="on_demand"))
    if spot and spot > 0:
        out.append(_listing(name, spot, gt, region="community", interconnect="spot"))
    return out


def _listing(
    name: str,
    price: float,
    gt: dict[str, Any],
    *,
    region: str,
    interconnect: str,
) -> ScrapedListing:
    return ScrapedListing(
        raw_gpu_string=name,
        price_per_hour=float(price),
        currency="USD",
        num_gpus=1,
        region=region,
        interconnect=interconnect,
        raw_payload={
            "id": gt.get("id"),
            "memoryInGb": gt.get("memoryInGb"),
            "secureCloud": gt.get("secureCloud"),
            "communityCloud": gt.get("communityCloud"),
            "tier": region,
            "pricing_type": interconnect,
        },
    )
