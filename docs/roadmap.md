# Roadmap — what's next

Last updated: 2026-05-10 after the methodology v1.0 + BOM-fix + RLS hardening session.

This is the working punch list. Status of *closed* items lives in `docs/decisions.md` and the session memory under `~/.claude/projects/D--computo/memory/`. The roadmap below is what's still open, ordered roughly by impact ÷ effort.

---

## A. Quick wins (1-2h each)

- [ ] **A1 · Fix RunPod + Lambda scrapers**. Both currently spawn Python on Vercel and fail every 5 min with `spawn python3 ENOENT`. The `scraper_run_failed` events are noise that artificially degrades `providers.reliability_score`. Two paths:
  - Port to TS-native (RunPod is GraphQL JSON, ~15 lines; Lambda is HTML scraping, ~50 lines with `cheerio`).
  - Or unregister them in `apps/workers/src/inngest/config.ts` until ported.
- [ ] **A2 · Move Vercel functions to `fra1`**. Today they run in `iad1` (Washington DC) → ~150 ms RTT to Supabase eu-central-1. Co-locating in Frankfurt brings `/markets` warm from ~670ms to ~250ms. Add to `apps/web/vercel.json` (or root `vercel.json`).
- [ ] **A3 · Drop `force-dynamic` from `/markets`, lean on `revalidate=30`**. Already serves a 30-second-stale ISR cache. Combined with A2, sub-100ms perceived load for 99% of hits.
- [ ] **A4 · Bump `@anthropic-ai/sdk`** off pinned 0.40 to current. Lets us drop `as never` casts on `thinking: { type: 'adaptive' }` and re-adopt `output_config.format` for schema-strict structured outputs (cleaner than the prompt-engineered JSON path we ship today).
- [ ] **A5 · Add `BRAVE_SEARCH_API_KEY`** to enable `provider-discovery`. Without it the cron runs nightly and no-ops. Brave free tier (2000 queries/mo) is plenty for daily discovery.

## B. Things the published methodology needs but doesn't have yet

- [ ] **B6 · Time-series chart on `/index/[slug]`**. Currently shows a tabular history. Need a 90-day VWAP line chart with a watermark "v1.0 · filtered_vwap". This is what someone evaluating the index expects to see first.
- [ ] **B7 · Name the Index Committee members**. Today `methodology_versions.approved_by` reads "Index Committee — founding charter". For citability, name the actual members (even if it's only Carlos in v1.0). One-line UPDATE statement.
- [ ] **B8 · Notice page for proposed changes**. The committee policy says "30 days public notice". There's currently no surface for those notices. Add a section to `/methodology` that lists `methodology_changes` rows with `effective_from` in the future.
- [ ] **B9 · Compliance pack PDF**. Auto-generated monthly: the formula, snapshots used, outliers excluded with reason, reliability scores per provider. Generate via the daily-brief generator infrastructure. This is what a fund/exchange asks for to audit the index.
- [ ] **B10 · 30-day data window**. Soft requirement, time-bound: index needs ≥30 days × ≥6 providers to be citable. Today we have ~1 day × 1-2 providers. Resolves itself if A1 ships and the cron stays green.

## C. Operational health

- [ ] **C11 · Snapshots-per-hour alert**. Today we could go 24h without a single write and not notice (this happened on 2026-05-09). Need a cron that reads `system_health_metrics.snapshots_per_hour` and fires an email/webhook if it stays at 0 for >2h. Use `RESEND_API_KEY` for email or a Slack webhook.
- [ ] **C12 · Gate `/api/health`** with an `X-Admin-Token` header. Today it's public. Safe (returns no secret values, only fingerprints) but exposes attack-surface info — Vercel region, env-var names, query patterns.
- [ ] **C13 · Bump Supabase to Pro**. Free tier has no point-in-time recovery. The day we have customer-citable data in there, ~$25/mo for PITR + larger DB is non-negotiable.
- [ ] **C14 · Wire Sentry + Axiom**. Documented as chosen, not actually wired. Without these the silent half-failures (index-calculator skipping a day, normalize-unmatched dropping rows) are invisible.
- [ ] **C15 · Webhook to a private channel on every `methodology_changed` event**. Belt-and-braces — even though the methodology can only change via human committee, an unexpected `methodology_changed` event in `system_events` should page somebody.

## D. Strategic — moves the thesis (weeks, not hours)

- [ ] **D16 · Hyperscaler scrapers**. Today catalog has AWS / GCP / Azure / CoreWeave but no scrapers. AWS p5/p4d on-demand pricing, GCP A3, Azure ND-H100, CoreWeave reserved+spot. Multiplies provider universe 3-5×, dramatically improves benchmark credibility. Each is its own day of work because pricing pages are JS-heavy.
- [ ] **D17 · Public licensee API**. `GET /api/index/cti-h100/latest` signed with a JWT per licensee. Trivial to build (one Next route handler). The hard part is choosing pricing/licensing tier structure. Until we do that we can't sell this.
- [ ] **D18 · CME / ICE / Larry Fink conversation**. Not code — sales. But before today we had no defensible artifact to bring to that meeting. Now we do.
- [ ] **D19 · Compute Terminal Pro** subscription tier (alerts on threshold crossings, downloadable historical CSVs, API access). The Stripe scaffolding is in the repo from v0 bring-up but no products defined.
- [ ] **D20 · Multi-region historical comparison**. Surface "$/h on H100 in EU vs US-East over the last 30 days" — the kind of view a quant team builds for their slide deck. Differentiator vs. just being a price feed.

---

## How to resume

When you open the terminal and want to know what's next, read this file top-down. Items in section A are the cleanest targets. Mark items with `[x]` when shipped, and move the explanation to `docs/decisions.md` so this file stays a forward-looking list, not a history.
