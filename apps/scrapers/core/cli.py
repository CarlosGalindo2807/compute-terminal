"""Tiny CLI: `python -m core.cli vast`."""

from __future__ import annotations

import argparse
import asyncio
import importlib
import sys

from core.logger import get_logger

log = get_logger(__name__)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("provider", help="Provider slug (vast, runpod, lambda, ...)")
    parser.add_argument("--dry-run", action="store_true", help="Fetch but do not persist")
    args = parser.parse_args()

    module_name = f"providers.{args.provider}.scraper"
    try:
        mod = importlib.import_module(module_name)
    except ModuleNotFoundError as exc:
        log.error("provider_not_found", provider=args.provider, error=str(exc))
        return 2

    scraper_cls = getattr(mod, "Scraper", None)
    if scraper_cls is None:
        log.error("scraper_class_missing", module=module_name)
        return 2

    summary = asyncio.run(scraper_cls().run())
    log.info("scraper_run_summary", **summary)
    return 0 if summary.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
