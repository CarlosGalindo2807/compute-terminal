# Technical decisions

Non-obvious calls made during the v0 build. Each entry: what / why / what we'd reconsider.

## Synchronous fast-path normalization in Python, async LLM in TS

**What:** `core/normalizer.py` resolves cleanly-known strings inline (rule → alias → fuzzy). Unknown strings fall through to `unmatched_listings` and the *hourly* TS worker calls Claude.

**Why:** Calling Claude on every snapshot would be slow ($), bursty ($$), and synchronous-network-bound during scrapes. Batching unknown strings lets us amortize. 95% of listings hit the fast path after the catalog matures.

**Reconsider if:** initial backfill is so slow that admin gets bored watching. Could optionally enable an "aggressive" mode that calls Claude inline for the first 24h.

## ~~TimescaleDB over plain Postgres~~ → plain Postgres + monthly partitioning when needed

**What (revised 2026-05-09):** `price_snapshots` and `system_health_metrics` are plain Postgres tables with strong indexes. The original design used TimescaleDB hypertables.

**Why we switched:** Supabase removed TimescaleDB from hosted projects in 2024. The migration runner errored on `create extension timescaledb` ("not available"). Reverting to vanilla Postgres beats moving DB providers — the read patterns are well-served by btree indexes on (gpu_model_id, captured_at desc) and (provider_id, captured_at desc), both partial-indexed on `is_outlier=false` for the markets-table fast path.

**Reconsider when:** `price_snapshots` exceeds ~10M rows (~67 days at 150k/day). At that point, install `pg_partman` (Supabase ships it) and partition by month on `captured_at`. The 24h-window queries the workers issue will start to feel slow before then; that's the trigger.

## Service-role reads from Next.js for public tables

**What:** /markets and /gpu/[slug] use `getServiceClient()` (service role) instead of the anon key + RLS.

**Why:** RLS adds query overhead; v0 traffic is low and these tables don't need per-user filtering. Keeps the SQL paths simple.

**Reconsider if:** we ever expose the anon key in a way that lets clients query directly. At that point flip RLS on with public read policies.

## Inngest, not BullMQ + a Redis-only queue

**What:** Cron + event-driven jobs run on Inngest.

**Why:** Inngest manages the cron schedules, retries, dead-letter, and dev UI for free. BullMQ would force us to write all of that. Inngest also gives us deterministic step-level resumption — important when a Claude call fails midway through a batch.

**Reconsider if:** Inngest pricing breaks the unit economics or we hit step-count limits. Self-host alternative is graphile-worker.

## Anthropic Claude (not OpenAI) for the LLM steps

**What:** All structured-output calls use Claude — `claude-sonnet-4-6` for routine work, `claude-opus-4-7` for the daily brief.

**Why:** native `output_config.format` for JSON-schema-validated outputs, adaptive thinking for the harder normalization edge cases, predictable schema-strict tool use. Plus the user already has an Anthropic relationship.

**Reconsider if:** model migration tooling becomes a maintenance burden. The wrapper in `packages/llm` is intentionally tiny so swapping providers is mostly find-and-replace.

## ~~Five-methodology A/B nightly, champion auto-selected~~ → Locked methodology v1.0 published, A/B becomes research input (revised 2026-05-09)

**What (revised 2026-05-09):** The index-calculator now publishes a fixed formula (currently `filtered_vwap`, version v1.0). The same five methodologies still run nightly, but write only to `index_methodology_experiments`. The research output is reviewed quarterly by the Index Committee and changes the published formula only with public 30-day notice.

**Why we switched:** A licensed settlement benchmark (the whole 2-3 year goal — settlement of compute futures) cannot have its formula change without notice. ICE / S&P / MSCI all publish fixed methodologies that change only via committee. Auto-selecting champion was good as a research moat but disqualifying as a published index. The flywheel value is preserved: every candidate is still logged, every published value is version-stamped (`index_values_daily.methodology_version`), and the committee has audit-grade evidence to defend its decisions.

**Concretely:** `PUBLISHED_METHODOLOGY` constant in `packages/shared/src/methodology.ts` + migration `009_methodology_v1.sql` introduce `methodology_versions` and `methodology_changes` tables. `/methodology` page publishes the spec and version history. Test `methodology.test.ts` locks v1.0 to prevent drift.

**Reconsider if:** the committee decides a different formula better serves licensees. That triggers a v1.x bump with public notice — exactly the path this design is built for.

## Spawning Python from the Inngest worker via `spawn`

**What:** scraper Inngest functions just `spawn('python', ['-m', 'core.cli', provider])`.

**Why:** keeps the scraper code in Python where parsing libraries are best, but uses Inngest for orchestration. Avoids running two cron systems.

**Reconsider if:** we deploy scrapers to a separate process boundary (e.g. Cloud Run jobs). Then the Inngest function becomes a job-trigger HTTP call.

## Single repo, no separate deploy units in v0

**What:** one Turborepo with apps/web (Vercel), apps/workers (Railway), apps/scrapers (Railway co-located with workers).

**Why:** avoids mono-vs-poly arguments at this scale. `transpilePackages` in Next config lets the web app pull from `packages/shared` and `packages/db` without a build step.

**Reconsider if:** the workers process becomes too heavy and needs its own resource profile, or scrapers need GPU/CPU isolation.

## Prompt-engineered JSON instead of `output_config.format` (revised 2026-05-09)

**What:** Every Claude call in `packages/llm` requests JSON via system-prompt instructions + an `extractJson` helper that strips markdown fences and parses with Zod. The original design used the SDK's `output_config: {format: {...}}` parameter for structured outputs.

**Why we switched:** The pinned `@anthropic-ai/sdk@^0.40.0` Carlos installed doesn't accept `output_config` — the API returns `400 invalid_request_error: output_config`. Bumping the SDK across all three workspaces is more invasive than just using the prompt-only path; the latter also works on every SDK version going back years and on third-party Claude proxies.

**Reconsider when:** SDK is bumped to a version that types `output_config`. At that point it's worth migrating because (a) it eliminates the regex-based JSON extractor and (b) the API will refuse to emit responses that don't match the schema, instead of failing at parse time.

## Env loaded at startup, not in scripts (revised 2026-05-09)

**What:** Three places load `.env` differently:
1. **Migration runner / one-shot scripts**: invoked via `node --env-file=../../.env ...` (Node 20.6+ built-in)
2. **Next.js dev server**: `next.config.mjs` walks up to repo root and parses `.env` into `process.env` at boot
3. **Python scrapers**: `core/settings.py` walks up from the source file looking for `.env` files; pydantic-settings loads them in order

**Why three different paths:** Each runtime has its own quirks. Node has `--env-file`. Next.js auto-loads `.env*` only from the app directory and there's no built-in repo-root walker, so the config has to do it. Python can pass a tuple of `env_file` paths to `SettingsConfigDict` cleanly.

**Why no symlink to `apps/web/.env.local`:** Windows symlinks need admin. Copying duplicates secrets across N apps. Walking up from each entrypoint is the only thing that works equally on Windows + macOS + Linux + Vercel.

## Truststore for httpx in Python (revised 2026-05-09)

**What:** `apps/scrapers/core/__init__.py` calls `truststore.inject_into_ssl()` at the top.

**Why:** On Windows behind a corporate proxy that injects its own root CA, `httpx`/Python's default SSL context can't verify the chain — Python ships its own CA bundle (certifi) and ignores the OS store. `truststore` patches the SSL context to use the OS native store (Windows certificate store / macOS keychain), no per-machine `SSL_CERT_FILE` needed.

**Why not the same for Node:** Node has `NODE_OPTIONS=--use-system-ca` which is the equivalent. We document this in handoff.md.

## Thin admin auth (env-listed emails) instead of role tables

**What:** `lib/auth.ts` checks `email ∈ process.env.ADMIN_EMAILS`.

**Why:** v0 has one admin (Carlos). A roles table is over-engineering for a 1-person team.

**Reconsider if:** team grows to 3+, or we bring on a contractor who needs partial admin access. Then move to a `user_profiles.role` enum.
