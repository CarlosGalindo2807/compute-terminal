"""Lambda Labs HTML parser tests — fixture-based."""

from __future__ import annotations

import pytest

from providers.lambda_labs.scraper import _parse_html

FIXTURE = """
<html><body>
<table>
  <tr><td>1x NVIDIA H100 SXM 80GB</td><td>$2.49 / hour</td></tr>
  <tr><td>1x NVIDIA A100 PCIe 40GB</td><td>$1.10 / hr</td></tr>
  <tr><td>RTX A6000 48GB</td><td>$0.80/hour</td></tr>
  <tr><td>Discontinued</td><td>n/a</td></tr>
</table>
</body></html>
"""


def test_parse_html_extracts_three_listings() -> None:
    listings = _parse_html(FIXTURE)
    assert len(listings) == 3
    by_price = {round(l.price_per_hour, 2): l.raw_gpu_string for l in listings}
    assert pytest.approx(2.49) in by_price
    assert pytest.approx(1.10) in by_price
    assert pytest.approx(0.80) in by_price


def test_parse_html_empty_when_no_matches() -> None:
    assert _parse_html("<html><body><p>nothing here</p></body></html>") == []


def test_parse_html_dedupes() -> None:
    html = """
    <table>
      <tr><td>H100 SXM 80GB</td><td>$2.49 / hour</td></tr>
      <tr><td>H100 SXM 80GB</td><td>$2.49 / hour</td></tr>
    </table>
    """
    listings = _parse_html(html)
    assert len(listings) == 1
