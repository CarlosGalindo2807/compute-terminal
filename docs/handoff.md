# Manual handoff — what's left for Carlos

Everything in code is generated. The list below is what only you can do.

## 0. Windows / corporate-proxy quirks (read first if on Windows)

Two SSL workarounds had to go in. Same fix on any fresh Windows behind HTTPS inspection:

- **`NODE_OPTIONS=--use-system-ca`** — Node uses its bundled CAs by default. Set the env var so it reads the Windows certificate store. Without it, `pnpm install` and Anthropic SDK calls fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.
- **Python `truststore`** — same root cause in `httpx`. The package is installed and `inject_into_ssl()` is called at the top of `apps/scrapers/core/__init__.py`. No per-machine config needed.

If you can't install pnpm globally (admin required), use `npx --yes pnpm@9.15.0 <cmd>` — that's what we've been doing.

## 1. Local prerequisites (5 min)

```powershell
# Windows / PowerShell — adjust for your OS
npm install -g pnpm           # if admin; otherwise: `npx --yes pnpm@9.15.0` everywhere below
node -v                       # 20+ (we're on 24)
python --version              # 3.11+ (3.12 recommended; 3.14 may lack wheels)
```

## 2. Supabase project (10 min)

1. **Create the project** at https://supabase.com/dashboard/new — pick the closest region (`us-east-1` is fine for v0).
2. Project Settings → Database → Extensions: enable **`timescaledb`** (might already be on), **`pg_trgm`**, **`uuid-ossp`**.
3. Settings → API: copy `Project URL`, `anon public key`, `service_role key` into `.env`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
4. Settings → Database → Connection string → "URI" — copy and append the password. Set `SUPABASE_DB_URL=...` in `.env`. The migration runner uses this directly (not the Supabase client).
5. Run migrations + seed:
   ```bash
   pnpm install
   pnpm db:migrate
   pnpm db:seed
   ```
6. Authentication → Providers → Email: keep "Magic Link" enabled, set Site URL to `http://localhost:3000` (and later your prod URL).
7. Authentication → URL Configuration → Redirect URLs: add `http://localhost:3000/auth/callback` and your prod equivalent.

## 3. Anthropic API key (2 min)

https://console.anthropic.com → API Keys → Create. Drop into `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

## 4. Inngest (5 min)

1. https://www.inngest.com → New app → name it `compute-terminal`. Free tier is enough for v0.
2. Settings → Event keys → copy → `INNGEST_EVENT_KEY=`
3. Settings → Signing keys → copy → `INNGEST_SIGNING_KEY=`
4. Local dev — the workers package starts the Inngest dev server automatically:
   ```
   pnpm --filter @compute-terminal/workers dev
   ```
   Visit http://127.0.0.1:8288 to see jobs and trigger them manually.

## 5. Upstash Redis (3 min)

https://console.upstash.com → New database (Regional, US East). Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

(Optional in v0 — only used once you turn on the per-user API quota in `apps/web`.)

## 6. Brave Search API (3 min)

https://brave.com/search/api/ → free tier. `BRAVE_SEARCH_API_KEY=...` enables `provider-discovery`. Without it, the worker no-ops.

## 7. Resend (3 min)

https://resend.com → API key. Verify a domain (`computeterminal.io`) for newsletter sends. `RESEND_API_KEY=...`.

(Daily-brief publish to email is wired but no-ops without this.)

## 8. Sentry + Axiom (optional for v0)

Sentry: create project → DSN → `SENTRY_DSN=...`. Axiom: dataset `compute-terminal` → token → `AXIOM_TOKEN=...`. Both are no-op without env vars.

## 9. Boot it locally

```bash
# In three terminals:

# Terminal 1 — DB connection check + dev migrations
pnpm db:migrate

# Terminal 2 — workers + Inngest dev
pnpm --filter @compute-terminal/workers dev

# Terminal 3 — Next.js
pnpm --filter @compute-terminal/web dev
```

Then in a fourth terminal, run a one-off scrape to seed real data:
```bash
cd apps/scrapers
python -m venv .venv
.venv\Scripts\activate
pip install -e .[dev]
ct-scrape vast
ct-scrape runpod
ct-scrape lambda_labs
```

Open http://localhost:3000/markets — you should see live H100 / A100 / B200 prices.

## 10. Set yourself as admin

```
ADMIN_EMAILS=carlos@computeterminal.io
```

Sign in via /login (magic link), then visit /admin.

## 11. Production deploy

- **Vercel**: import the repo, set the **Root Directory** to `apps/web`, framework auto-detected. Drop all env vars from `.env` into Vercel's Environment Variables. Add `https://yourapp.vercel.app/auth/callback` to Supabase redirect URLs.
- **Railway**: import the repo, point it at `apps/workers`, build command `pnpm install && pnpm --filter @compute-terminal/workers... build`, start command `pnpm --filter @compute-terminal/workers start`. Same env vars.
- **Scrapers**: same Railway service if memory allows; otherwise a sidecar service running `python -m core.cli vast` (etc) on cron via Railway scheduled jobs *or* let the Inngest scraper functions in apps/workers spawn them (current default).

## 12. After 24h, verify the flywheel

Open `/admin`:
- `Snapshots last hour` should be in the hundreds
- `Unmatched pending` should drop overnight (normalize-unmatched ran)
- A row should appear in `index_values_daily` for yesterday's date with a `methodology_used`
- `Content drafts` should show 1 daily-brief + 2 social posts at 07:00 UTC, then flip to published at 09:00 unless rejected

If any of those aren't true, check `/admin/events` for failures and `/admin/health` for trends.

## What I left undone (intentionally)

- **Real Twitter / LinkedIn channel pushes**: `content-publisher` flips the row to `published` and emits an event. Wire `apps/workers/src/channels/{twitter,linkedin,resend}.ts` when you have credentials.
- **Telegram bot for new-hardware alerts**: `provider-discovery` and `normalize-unmatched` emit events ready to be consumed; bot client not implemented.
- **Stripe billing flow**: tables exist (`user_profiles.plan`, `stripe_customer_id`), checkout pages don't.
- **Generated content charts**: metadata.hero_chart_caption is set, but no actual PNG generation. Use `quickchart.io` or `node-canvas` when ready.
- **/dashboard alerts UI**: alerts table exists; the create-alert UI doesn't.
- **`generate-types` against the live Supabase project**: run `supabase gen types typescript --project-id $ID --schema public > packages/db/src/types.ts` once you have the project, replacing the hand-rolled types.
