# Compute Terminal — scrapers

Python 3.11+ with httpx, BeautifulSoup, Playwright fallback, Pydantic v2.

## Setup

```bash
cd apps/scrapers
python -m venv .venv
.venv\Scripts\activate           # Windows
# source .venv/bin/activate      # macOS / Linux
pip install -e .[dev]
playwright install chromium      # only needed if Lambda fallback fires
```

## Run a one-off scrape

```bash
ct-scrape vast
ct-scrape runpod
ct-scrape lambda
```

`SUPABASE_DB_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` must be set in `.env`
at the repo root or in the shell environment.

## Tests

```bash
pytest                    # everything
pytest providers/vast     # one provider only
```

Tests use `respx` to mock httpx — no network access.

## Adding a new provider

1. Create `providers/<slug>/scraper.py` with a `Scraper(BaseScraper)` subclass implementing `fetch_listings`.
2. Insert the provider row in `packages/db/seeds/001_initial.sql` (or via the admin UI later).
3. Add tests under `providers/<slug>/tests/`.
4. Wire it into `apps/workers/inngest.config.ts` for scheduled runs.

The `BaseScraper` handles retries, reliability scoring, normalization, persistence, and event publishing — your subclass only worries about parsing.
