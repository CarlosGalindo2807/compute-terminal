"""Vast.ai scraper tests — pure parsing logic, no network."""

from __future__ import annotations

import httpx
import pytest
import respx

from providers.vast.scraper import ENDPOINT, Scraper, _parse_offer


def test_parse_offer_normalizes_per_gpu_price() -> None:
    offer = {
        "gpu_name": "H100 SXM 80GB",
        "dph_total": 8.0,
        "num_gpus": 4,
        "geolocation": "US",
        "rentable": True,
        "id": 1234,
    }
    listing = _parse_offer(offer)
    assert listing is not None
    assert listing.price_per_hour == pytest.approx(2.0)
    assert listing.num_gpus == 4
    assert listing.region == "US"
    assert listing.raw_payload["id"] == 1234


def test_parse_offer_rejects_invalid() -> None:
    assert _parse_offer({"gpu_name": "H100", "dph_total": 0, "num_gpus": 1}) is None
    assert _parse_offer({"dph_total": 1.0, "num_gpus": 1}) is None  # missing gpu_name
    assert _parse_offer({"gpu_name": "H100", "dph_total": 1.0, "num_gpus": 0}) is None


@respx.mock
@pytest.mark.asyncio
async def test_fetch_paginates_and_stops_on_empty() -> None:
    page1 = {
        "offers": [
            {"gpu_name": "H100 SXM 80GB", "dph_total": 2.0, "num_gpus": 1, "id": 1},
            {"gpu_name": "A100 SXM 80GB", "dph_total": 1.4, "num_gpus": 1, "id": 2},
        ]
    }
    page2 = {"offers": []}
    route = respx.get(ENDPOINT).mock(
        side_effect=[
            httpx.Response(200, json=page1),
            httpx.Response(200, json=page2),
        ]
    )

    scraper = Scraper()
    async with httpx.AsyncClient() as client:
        listings = await scraper.fetch_listings(client)

    assert route.call_count == 2
    assert len(listings) == 2
    assert listings[0].raw_gpu_string == "H100 SXM 80GB"
