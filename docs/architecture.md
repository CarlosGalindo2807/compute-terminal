# Architecture

```
┌──────────────────────┐    ┌─────────────────────────────┐    ┌──────────────────────┐
│  Python scrapers     │    │  Inngest worker process     │    │  Next.js 15 web      │
│  (Railway / cron)    │    │  (apps/workers)             │    │  (apps/web → Vercel) │
│                      │    │                             │    │                      │
│  Vast / RunPod /     │───▶│  outlier-detector  /15min   │───▶│  /markets            │
│  Lambda / ...        │    │  normalize-unmatched 1h     │    │  /gpu/[slug]         │
│  → price_snapshots   │    │  index-calculator   00:30   │    │  /index/[slug]       │
│                      │    │  provider-discovery 04:00   │    │  /admin/*            │
│                      │    │  content-generator  07:00   │    │  /blog               │
└──────────────────────┘    │  content-publisher  hourly  │    └──────────────────────┘
                            │  record-system-metrics 1h   │
                            └──────────┬──────────────────┘
                                       │
                                       ▼
                        ┌──────────────────────────────┐
                        │  Supabase Postgres + Timescale│
                        │  (single source of truth)     │
                        └──────────────────────────────┘
```

## Data flow

1. **Scraper** fetches a marketplace's listings, parses them into `ScrapedListing` Pydantic models.
2. `BaseScraper` runs each through `normalize_gpu_string` (synchronous fast path: rule → alias → fuzzy → unmatched).
3. Rows insert into `price_snapshots` — gpu_model_id may be null on first sight of a new string.
4. `system_events` records `scraper_run_succeeded` / `scraper_run_failed`. Provider `reliability_score` and `consecutive_failures` adjust accordingly.
5. **Outlier detector** marks `is_outlier=true` on rows >3 MAD from the per-gpu median. Bad providers get reliability decayed by 0.95.
6. **Normalize-unmatched** (hourly) drains the top 50 unmatched_listings, asks Claude for a structured `{slug, confidence, is_new_hardware}` verdict, auto-resolves at conf ≥ 0.95 by creating a rule and back-filling all snapshots.
7. **Index-calculator** (nightly) runs every methodology against the last 24h of normalized non-outlier data, scores them, and writes the champion to `index_values_daily`.
8. **Provider-discovery** (daily) hits Brave Search, has Claude assess each result, queues high-quality candidates to `provider_candidates`.
9. **Content-generator** (07:00) builds a market summary from the day's snapshots, has Claude write the brief / tweet / LinkedIn post, drops them into `generated_content` as drafts.
10. **Content-publisher** (hourly) flips drafts older than `scheduled_for` to `published` unless they were rejected in /admin/content.

## Why the split

- **Python for scrapers**: HTML parsing libraries (BeautifulSoup, Playwright) have better Python ergonomics, and provider websites change so we want quick fixture-based testing.
- **TypeScript for workers**: Inngest's TS SDK is the most mature, and structured Anthropic outputs share types with the web app.
- **Single Postgres**: TimescaleDB lets us treat price_snapshots as a hypertable (compression after 7 days) without giving up SQL joins to providers / gpu_models.

See [`flywheel.md`](./flywheel.md) for how each component contributes to the system getting smarter on its own.
