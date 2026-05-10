"""Lambda Labs scraper.

No public API for on-demand pricing — scrape the marketing page.
Primary path: httpx + BeautifulSoup. Fallback: Playwright if the table is rendered client-side.
"""

from __future__ import annotations

import re
from decimal import Decimal
from typing import Any

import httpx
from bs4 import BeautifulSoup

from core.base_scraper import BaseScraper, ScrapedListing
from core.logger import get_logger

# Lambda renamed lambdalabs.com -> lambda.ai in 2026; the legacy host returns
# a hard 404 (no redirect). The pricing path is unchanged.
URL = "https://lambda.ai/service/gpu-cloud"
PRICE_RE = re.compile(r"\$([0-9]+\.[0-9]+)\s*/?\s*(?:hour|hr|h)", re.IGNORECASE)
GPU_HINT_RE = re.compile(r"(H100|H200|B200|A100|A6000|L40S|MI300X|GB200)[\w\-\s]*", re.IGNORECASE)

log = get_logger(__name__)


class Scraper(BaseScraper):
    def __init__(self) -> None:
        super().__init__("lambda")

    async def fetch_listings(self, http: httpx.AsyncClient) -> list[ScrapedListing]:
        resp = await http.get(URL)
        resp.raise_for_status()
        listings = _parse_html(resp.text)
        if listings:
            return listings

        # Fallback: Playwright. Imported lazily so the dependency is optional in dev.
        log.info("lambda_html_empty_fallback_playwright")
        return await _fetch_with_playwright()


def _parse_html(html: str) -> list[ScrapedListing]:
    soup = BeautifulSoup(html, "lxml")
    listings: list[ScrapedListing] = []

    # Lambda renders a pricing table; rows have GPU name + $/hour cells.
    # Be defensive: support both <tr> tables and div-based grids.
    seen: set[tuple[str, float]] = set()
    for row in soup.find_all(["tr", "div"]):
        text = row.get_text(separator=" ", strip=True)
        if not text:
            continue
        gpu_match = GPU_HINT_RE.search(text)
        price_match = PRICE_RE.search(text)
        if not gpu_match or not price_match:
            continue
        raw_gpu = gpu_match.group(0).strip()
        price = float(Decimal(price_match.group(1)))
        key = (raw_gpu.lower(), price)
        if key in seen or price <= 0:
            continue
        seen.add(key)
        listings.append(
            ScrapedListing(
                raw_gpu_string=raw_gpu,
                price_per_hour=price,
                currency="USD",
                num_gpus=1,
                region=None,
                interconnect=None,
                raw_payload={"source": "html_table", "row_text": text[:300]},
            )
        )
    return listings


async def _fetch_with_playwright() -> list[ScrapedListing]:
    try:
        from playwright.async_api import async_playwright
    except ImportError:  # pragma: no cover
        log.error("playwright_not_installed")
        return []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            await page.goto(URL, wait_until="networkidle", timeout=30_000)
            html = await page.content()
        finally:
            await browser.close()
    return _parse_html(html)


# Allow tests to inject HTML directly
parse_html: Any = _parse_html
