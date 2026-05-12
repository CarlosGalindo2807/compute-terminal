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

## Tighten RLS to all 19 public-schema tables (added 2026-05-10)

**What:** Migration `010_rls_public_tables.sql` enables RLS on every table in the public schema. Public-read policies on the 8 tables that are meaningfully public (catalog + index values + methodology audit trail). Conditional public read on `generated_content` (`status = 'published'` only). No anon/authenticated policy on the 6 internal tables (`system_events`, `system_health_metrics`, `unmatched_listings`, `provider_candidates`, `index_methodology_experiments`, `_migrations`) — RLS-on-with-no-policy means only the service role can touch them.

**Why:** v0 had RLS only on the 4 user-scoped tables (007_rls.sql) because reads happened exclusively server-side via the service role. That's safe today but a single misuse of the anon key in browser code would expose internal tables. Defense in depth costs nothing here because the service role bypasses RLS by default — frontend pages and Inngest workers all use `getServiceClient()` from `packages/db` and remain unaffected.

**How verified:** After applying, confirmed via `pg_tables.rowsecurity = true` for all 19 tables and `pg_policies` count = 15 (4 prior user-scoped + 8 public reads + 1 published-content + 0 on internal tables).

**Reconsider if:** the frontend ever needs the anon key in the browser to query internal tables (don't — that's exactly the leak this migration prevents). Or if a licensee program needs read-only access to internal experiment data; then add a `licensee` Postgres role with explicit policies, don't downgrade to anon.

## Vercel env vars BOM contamination (added 2026-05-10)

**What happened:** On 2026-05-08 the env-upload flow (vercel env add via REST POST /v10/projects/{id}/env) wrote `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ANTHROPIC_API_KEY` with a UTF-8 BOM (0xFEFF / char 65279) prefixed. Symptom: every Vercel function query to Supabase timed out at 7s, /markets rendered empty, dynamic slug pages returned 404 on existing rows, scrape-vast threw `provider vast not seeded`, Inngest cloud wrote zero events for ~24 hours despite the dashboard showing fired runs.

**Diagnosis tool:** `apps/web/app/api/health/route.ts` returns `supabase_host`, key fingerprints (length + first 6 chars + numeric char codes), and four canary Supabase probes with per-query timing. Hit `https://compute-terminal.vercel.app/api/health` to triage Vercel-vs-Supabase env mismatches in one request.

**Fix tool:** `scripts/fix-vercel-env-bom.mjs` reads the local `.env` (verified BOM-free), lists Vercel env vars via REST, PATCHes contaminated target vars. Restricts to `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` — explicitly excludes `INNGEST_SIGNING_KEY` / `INNGEST_EVENT_KEY` because Vercel stores the integration-managed JWT-format keys (~1.2 KB) and overwriting with our local dev keys would break cloud signing.

**Don't:** use `vercel env add` from PowerShell stdin (uploads empty values) or paste env values from editors that auto-add BOM. Use the script.

## Scrapers fully TS-native, drop Python spawn (added 2026-05-11)

**What:** `apps/workers/src/functions/scrapers.ts` now ships three TS-native Inngest functions: `scrape-vast` (REST, unchanged), `scrape-runpod` (GraphQL POST, ported from `apps/scrapers/providers/runpod/scraper.py`), and `scrape-lambda_labs` (regex on the marketing page HTML, ported from the BeautifulSoup parser). The `runPythonScraper` / `makeShellScraper` helpers and the `child_process.spawn` import are gone.

**Why:** On Vercel the python venv binary doesn't exist, so the spawn raised `ENOENT` every 5 minutes and wrote a `scraper_run_failed` event. That was real noise — `providers.reliability_score` dropped artificially because failure rate was being computed on attempts that could never succeed in the deployment target. After porting, both providers write actual `price_snapshots` rows and the failure events are reserved for genuine scrape errors.

**What we kept:** `apps/scrapers/` Python tree stays in the repo. It's the canonical implementation for local backfills (where Playwright is available for Lambda's JS-rendered pricing fallback) and the regression-test fixtures the TS parsers were ported against. The Inngest cron now points at the TS path.

**Reconsider if:** Lambda's marketing page goes 100% client-rendered and the static HTML stops including the price strings — then we'd need Playwright (no TS-native equivalent that runs on Vercel functions), and the choices are (a) move the Lambda scraper to a Railway worker that already has Playwright installed, or (b) hit a different Lambda data source if they expose one.

## Vercel functions colocated in `fra1` + ISR on `/markets` (added 2026-05-11)

**What:** `apps/web/vercel.json` pins `regions: ["fra1"]`. `/markets` drops `dynamic = 'force-dynamic'` and keeps `revalidate = 30`.

**Why:** Supabase project lives in `eu-central-1`. Vercel's default `iad1` adds ~150 ms RTT per query, which is the dominant cost on `/markets` after the 28→1 query refactor (warm went 7170 ms → 670 ms). Frankfurt removes the trans-Atlantic hop. Combined with ISR, hot cache reads serve from the edge without ever entering the function — first user every 30s pays the (now-shorter) function path, everyone else gets static-fast responses.

**Reconsider if:** we add a US-east customer for whom EU-resident Vercel edge still feels slow, or Supabase moves region. With Fluid Compute and `regions` array, multi-region is a config change.

## @anthropic-ai/sdk 0.40 → 0.95.1 (added 2026-05-11)

**What:** Bumped the SDK across `packages/llm`. Removed the `as never` casts on `thinking: { type: 'adaptive' }` (`content.ts`) and on the `system: [...]` array with `cache_control` blocks (`normalize.ts`) — both shapes are now first-class in the SDK types.

**Why:** The casts were a 2026-Q1 workaround that compounded every time someone touched those files. The new SDK types `thinking` as a first-class param and accepts `cache_control` on system text blocks without a cast. No runtime API changes affect our usage path; typecheck passes across all 7 workspace packages.

**Reconsider if:** the SDK ships a breaking change to `messages.create` request shape that touches our two callsites — both are simple text-in / JSON-out so this is unlikely.

## /index/[slug] chart is server-rendered SVG, no chart library (added 2026-05-11)

**What:** `apps/web/components/index-chart.tsx` is a pure React Server Component that emits a single 880×340 SVG. It carries the line + gradient area + 4-tick Y axis + 5-tick X axis + watermark + (future) methodology-change markers. No `recharts`, `nivo`, `visx`, `d3`, or client-side hydration.

**Why:** The page is a benchmark publication, not an interactive dashboard. Tooltips and crosshairs are nice-to-haves; a watermark stamp + reproducibility from `index_values_daily` is the load-bearing requirement. A chart library would have added 60–120 KB to first-load JS for a page that scrolls more than it interacts. Inline SVG keeps `/index/[slug]` rendering at the same first-load size as the rest of the site and means every chart is a pure function of the locked methodology.

**Methodology-change markers:** when adjacent rows in `index_values_daily` carry different `methodology_version`, the chart draws a dashed yellow vertical line with the new version label. Today this never fires (v1.0 only) but the visual contract is what proves to a future reader that a committee approval actually changed the math, not just the docs.

**Reconsider if:** customers ask for hover-tooltips with per-day VWAP / N / providers — that's the natural moment to either (a) add a small client-side overlay that decorates the existing SVG, or (b) move to `visx` (lightest of the libs). Don't do it speculatively.

## Lambda Labs domain migration (added 2026-05-11)

**What:** `lambdalabs.com` returns 404 across the marketing tree as of 2026-Q2. Lambda's pricing page now lives at `lambda.ai/service/gpu-cloud` with the same path. `scrape-lambda_labs` (Inngest function id retained) points at the new host.

**Why memory:** the domain change isn't documented anywhere visible, and the `lambdalabs.com` redirect is *not* in place — the legacy host genuinely 404s rather than serving a 301. If we ever revive the Python scraper for local backfill, that file's `URL` constant needs the same edit (`apps/scrapers/providers/lambda_labs/scraper.py`).

## Provider-discovery hardening — defense in depth ahead of Brave key (added 2026-05-11)

**Background:** `provider-discovery` runs daily, takes Brave Search results, fetches each candidate's landing page, asks Claude to assess, and queues survivors into `provider_candidates` for **manual** admin approval at `/admin/providers`. The manual approval is the load-bearing safety boundary — approving only flips a status, it does NOT auto-create a `providers` row or auto-fetch from the candidate URL. Onboarding a real provider always requires writing scraper code by hand.

That said, before flipping `BRAVE_SEARCH_API_KEY` on, we widened the moat between "fetch a candidate URL" and "anything bad can happen":

**a. Private-IP block (SSRF guard).** `apps/workers/src/lib/url-safety.ts` resolves the candidate hostname via `dns.promises.lookup({ all: true })` and rejects if any A/AAAA record falls in RFC1918, loopback, link-local (incl. AWS/GCP/Azure metadata 169.254.169.254), 0.0.0.0/8, CGNAT, multicast, ULA `fc00::/7`, or IPv4-mapped private. `all: true` defeats DNS rebinding (a poisoned domain that resolves to two records, one public one private). Malformed IP strings fail closed.

**b. No redirects.** `safeFetch` uses `redirect: 'manual'` — a 3xx response is treated as a failure with `reason=redirect_blocked_<status>`. Without this, an attacker could pass the IP check on a public hostname, then redirect us to `127.0.0.1` or metadata.

**c. TLD allowlist.** Curated set: `ai io com net co cloud computer gpu dev app sh tech`. Country TLDs that statistically dominate abuse (`.ru .cn .tk .zip` …) get rejected before fetch, before LLM, before DNS — earliest possible cut. Adding a TLD is one-line cheap; bias is towards rejecting unfamiliar.

**d. Candidate cap 12 → 5.** Tighter Brave quota usage and a smaller blast surface per run. We're not optimizing for breadth; we're optimizing for "every candidate that lands in the admin queue is worth a human's 10 seconds".

**e. Prompt-injection guard.** `assess-provider.ts` system prompt explicitly tells the model that the user-message page text is untrusted, and that any text inside it asking the model to redefine its role / change ratings / output non-schema is itself signal of "spam"/"low". User message wraps the page text in `<<<page>>> … <<<end-page>>>` delimiters as a structural marker. The combination is defense-in-depth on top of the manual gate — even if a page jailbroke the model and fake-rated itself "high priority 9", a human still has to click Approve, and Approve still doesn't onboard.

**Why I'm being thorough on a feature that's still gated by manual approval:** Carlos's framing was correct — once an attacker gets ANY foothold in the discovery pipeline (even just "their URL gets fetched from our IP"), they have an SSRF surface. Hardening before the key is provisioned is cheaper than hardening after the first incident.

**Reconsider if:** we ever automate "approve and onboard" without human review (don't). Or if the TLD allowlist starts blocking legitimate candidates — broaden the set, never disable the gate.

## Pivot to "Bloomberg for buyers" framing after Silicon Data discovery (added 2026-05-11)

**What:** REFRAME_v2.md (root) and docs/three-product-lines.md land the public framing change. CTI is the *application / observability / decision layer* on top of the compute market for buyers — CTOs, Heads of Infra, CFOs of AI scaleups paying 50-500k€/mo. Silicon Data (Carmen Li ex-Bloomberg, backed by DRW + Jump) already occupies the institutional-reference slot with SDH100RT/SDA100RT/SDB200RT distributed via Bloomberg/Refinitiv. We do not compete for that slot.

**Why:** Three differentiators the institutional index cannot adopt without breaking fungibility for derivatives — and that the buyer needs:
  (1) tokens-equivalents (`$/M-tokens-Claude-Sonnet`, not `$/H100-hour`),
  (2) EU-compliance sub-indices (CTI-H100-EU, CTI-H100-Spain, CTI-H100-Sovereign),
  (3) behavioral pricing (real paid prices vs published, segmented by spend band — moat by network effect).
Sequenced into three product lines (L1 Terminal → L2 Hedging-as-a-Service → L3 Marketplace OTC); KPIs and triggers in `docs/three-product-lines.md`.

**What stays:** filtered_vwap v1.0, `methodology_versions`/`methodology_changes` audit, /methodology + /index/[slug], watermarked SVG chart, Index Architect cloud routine. Same artifact, repurposed as the *rigor signal* underneath the buyer-facing terminal — not the headline product.

**What's new in this commit:** migration `011_pivot_v2_schema.sql` adds `provider_compliance` (var 3), `throughput_benchmarks` (var 1), `invoice_observations` (var 8), `forward_curves` (L2 internal). Endpoint `/api/v1/cost-per-workload` is the first public surface of variable 1 — translates `$/gpu-hour` into `$/workload-unit`. Whitepapers `docs/cti-methodology-v1.md` + `docs/competitive-positioning.md` follow in a separate commit (gated on review).

**What we explicitly don't do:** license Silicon Data's feed (cost-prohibitive; not needed for our customer). The three differentiators cannot be extracted from their feed by design — that's the whole point of the differentiation.

**Schema deltas worth flagging:** REFRAME_v2 specified `provider_id text` for `provider_compliance` but `providers.id` is uuid in this repo since migration 001 — used uuid + FK. REFRAME_v2 also specified `create_hypertable('invoice_observations', ...)` but Supabase removed TimescaleDB in 2024 (see "TimescaleDB over plain Postgres" entry above) — replaced with composite btree indexes. Both deviations preserve the spec's access patterns.

**Reconsider if:** Silicon Data ships an end-user terminal at <500€/mo → reposition fast around the three variables (or pivot L1 to be a complement to their feed rather than a competitor). Response plan in `docs/competitive-positioning.md`.

## Thin admin auth (env-listed emails) instead of role tables

**What:** `lib/auth.ts` checks `email ∈ process.env.ADMIN_EMAILS`.

**Why:** v0 has one admin (Carlos). A roles table is over-engineering for a 1-person team.

**Reconsider if:** team grows to 3+, or we bring on a contractor who needs partial admin access. Then move to a `user_profiles.role` enum.

## Open question — index_calculator daily delta volatility (2026-05-11 → 2026-05-12)

**Original observation (2026-05-11):** day-over-day moves on `close_price` looked catastrophic:

| index | 2026-05-09 close | 2026-05-10 close | 2026-05-11 close | δ |
|---|---|---|---|---|
| cti-h100 | $2.690 | $2.690 | $1.534 | −43% |
| cti-blackwell | $1.189 | $5.980 | $1.064 | −82% |
| cti-composite | $2.690 | $5.980 | $0.877 | −85% |

**Root cause found (2026-05-12):** `close_price` is `max(observed_prices)` after an ascending sort (`index-calculator.ts:170`). It's not the published index level — it's the day's maximum observation. A single outlier (e.g. a B200 listing on 2026-05-10 at $5.98) rotates the daily max and creates fake catastrophic deltas.

**The real published value is `vwap`** — the output of the locked `filtered_vwap` methodology. With vwap:

| index | 2026-05-09 vwap | 2026-05-10 vwap | 2026-05-11 vwap | real δ |
|---|---|---|---|---|
| cti-h100 | $2.647 | $2.641 | $1.494 | −43% |
| cti-blackwell | $1.188 | $1.188 | $0.826 | −30% |
| cti-composite | $1.311 | $1.205 | $0.875 | −27% |

**Fixed:** the landing ticker switched to `vwap` (this commit). The remaining −43% on cti-h100 is still significant and warrants a calculator audit — the H100 universe expanded from 21 to 363 observations between 2026-05-09 and 2026-05-11, almost certainly including a wider set of H100 variants and/or lower-priced providers. That's a real signal we should understand before publishing index commentary.

**Two follow-ups for the next session:**
1. `close_price` / `open_price` / `high_price` / `low_price` columns should reflect real intra-day OHLC (first vs last observation by timestamp), not min/max. Today's calculator code is misusing them. Fix is one-liner per column in `index-calculator.ts:167-170`.
2. The published index universe per `compute_indices.methodology.gpu_models` should be auditable — a row in `index_values_daily` should be able to identify which `gpu_model_id`s contributed. Today this is implicit. Worth adding `contributing_gpu_ids text[]` for traceability.

**Methodology lock still holds:** `methodology_used` on every recent row is `filtered_vwap` v1.0 per the locked spec; the 2026-05-09 row showing `simple_vwap` is pre-lock historical residue.
