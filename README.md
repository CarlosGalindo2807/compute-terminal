# Compute Index Terminal

Real-time aggregator of GPU-hour prices across marketplaces and clouds. Bloomberg-style terminal today, settlement benchmark for compute futures tomorrow.

> **Architectural non-negotiable:** every component must answer *"how does this make the system smarter tomorrow without human intervention?"* See `docs/flywheel.md`.

## Stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 15 App Router, Tailwind, shadcn/ui, Tremor |
| Database | Supabase Postgres + TimescaleDB + pg_trgm |
| Cache / Queue | Upstash Redis |
| Scrapers | Python 3.11+, httpx, BeautifulSoup4, Playwright fallback, Pydantic v2 |
| Orchestration | Inngest (cron + event-driven) |
| LLM | Anthropic SDK — Claude Sonnet 4.5 with structured outputs |
| Auth | Supabase Auth (magic link) |
| Observability | Axiom (logs) + Sentry (errors) |
| Deploy | Vercel (web/API) + Railway (Python scrapers, Inngest dev) |

## Layout

```
compute-terminal/
├─ apps/
│  ├─ web/        Next.js 15 — public + admin
│  ├─ scrapers/   Python — provider scrapers
│  └─ workers/    TypeScript — Inngest functions, Claude jobs
├─ packages/
│  ├─ db/         migrations, seeds, generated types
│  ├─ shared/     domain types, normalization helpers
│  ├─ llm/        Claude wrapper with structured outputs
│  └─ ui/         shared shadcn components
└─ docs/          architecture.md, data-model.md, flywheel.md, decisions.md
```

## Quickstart (local)

```bash
# 0) install pnpm globally if you don't have it
npm install -g pnpm

# 1) install workspace deps
pnpm install

# 2) Python scrapers env
cd apps/scrapers
python -m venv .venv && .venv/Scripts/activate    # Windows
# source .venv/bin/activate                        # macOS / Linux
pip install -e .[dev]
cd ../..

# 3) configure env
cp .env.example .env
# fill in SUPABASE_DB_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# ANTHROPIC_API_KEY, INNGEST_*, UPSTASH_REDIS_*

# 4) DB
pnpm db:migrate
pnpm db:seed

# 5) start everything
pnpm dev   # spins up web (3000), workers (8288 Inngest dev), via Turborepo
# scrapers run as one-off jobs — see apps/scrapers/README.md
```

After ~24h of uptime you should see the flywheel firing:
- `unmatched_listings` shrinking as Claude resolves them
- `index_values_daily` rows appearing nightly with the champion methodology
- `generated_content` rows with daily brief drafts at 07:00 UTC

## Manual handoff steps for Carlos

See **`docs/handoff.md`** for the complete checklist (Supabase project creation, Inngest signing keys, Vercel link, etc.).

## Docs

- [`docs/architecture.md`](./docs/architecture.md) — high-level data flow
- [`docs/data-model.md`](./docs/data-model.md) — every table, every column, why it exists
- [`docs/flywheel.md`](./docs/flywheel.md) — how the system learns
- [`docs/decisions.md`](./docs/decisions.md) — non-obvious technical choices and why

## License

All rights reserved. Proprietary.
