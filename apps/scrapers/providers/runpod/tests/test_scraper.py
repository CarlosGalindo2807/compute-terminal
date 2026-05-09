"""RunPod scraper tests."""

from __future__ import annotations

import httpx
import pytest
import respx

from providers.runpod.scraper import ENDPOINT, Scraper, _parse_gpu_type


def test_parse_gpu_type_emits_three_rows_when_all_tiers_priced() -> None:
    gt = {
        "id": "NVIDIA H100 80GB HBM3",
        "displayName": "H100 80GB HBM3",
        "memoryInGb": 80,
        "secureCloud": True,
        "communityCloud": True,
        "lowestPrice": {"uninterruptablePrice": 2.49, "minimumBidPrice": 1.99},
    }
    rows = _parse_gpu_type(gt)
    assert len(rows) == 3
    prices = sorted(r.price_per_hour for r in rows)
    assert prices == [1.99, 2.49, 2.49]


def test_parse_gpu_type_skips_unpriced() -> None:
    gt = {
        "id": "X",
        "displayName": "Mystery GPU",
        "secureCloud": True,
        "communityCloud": False,
        "lowestPrice": {"uninterruptablePrice": None, "minimumBidPrice": 0},
    }
    assert _parse_gpu_type(gt) == []


@respx.mock
@pytest.mark.asyncio
async def test_fetch_listings_posts_graphql() -> None:
    payload = {
        "data": {
            "gpuTypes": [
                {
                    "id": "1",
                    "displayName": "H100 80GB SXM5",
                    "memoryInGb": 80,
                    "secureCloud": True,
                    "communityCloud": False,
                    "lowestPrice": {"uninterruptablePrice": 2.99, "minimumBidPrice": None},
                }
            ]
        }
    }
    respx.post(ENDPOINT).mock(return_value=httpx.Response(200, json=payload))

    scraper = Scraper()
    async with httpx.AsyncClient() as client:
        listings = await scraper.fetch_listings(client)
    assert len(listings) == 1
    assert listings[0].price_per_hour == pytest.approx(2.99)
