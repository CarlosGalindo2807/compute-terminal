# Compute Index Terminal

Procurement and observability terminal for teams that buy AI compute — the buyer's Bloomberg, not the trader's. Real-time GPU-hour prices across every major marketplace and cloud, normalized into sub-indices (CTI-H100, CTI-Tokens-Equivalent, CTI-H100-EU) you can act on.

> **Positioning:** see `REFRAME_v2.md` for the strategic framing and `docs/three-product-lines.md` for the L1 Terminal → L2 Hedging-as-a-Service → L3 Marketplace OTC sequence. We are independent from and not affiliated with Silicon Data Inc. (SDH100RT / SDA100RT / SDB200RT) — see `docs/competitive-positioning.md`.
>
> **Architectural non-negotiable:** every component must answer *"how does this make the system smarter tomorrow without human intervention?"* See `docs/flywheel.md`.
>
> **Published methodology:** the formula is locked at v1.0 (`filtered_vwap`, MAD-3σ outlier filter, 24h window, num_gpus weight, reliability_floor=0.5). It changes only via Index Committee review — see [/methodology](https://compute-terminal.vercel.app/methodology) for the public spec, `docs/cti-methodology-v1.md` for the full whitepaper, and version history at the same path.
>
> **What's next:** the working punch list is `docs/roadmap.md`. Closed decisions live in `docs/decisions.md`.

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

## Status

**System is live in production.** Web at https://compute-terminal.vercel.app, Inngest cloud firing crons against the Vercel-deployed `/api/inngest`, no laptop required. See `docs/production.md` for the runbook.

## Manual handoff steps (only needed for fresh local dev setup)

See **`docs/handoff.md`** for the complete first-time checklist (Supabase project creation, Inngest signing keys, Vercel link, etc.).

## Docs

- **[`docs/how-it-works.md`](./docs/how-it-works.md) — plain-English walk-through with diagrams. Start here if you're new.**
- [`docs/architecture.md`](./docs/architecture.md) — high-level data flow
- [`docs/data-model.md`](./docs/data-model.md) — every table, every column, why it exists
- [`docs/flywheel.md`](./docs/flywheel.md) — how the system learns
- [`docs/decisions.md`](./docs/decisions.md) — non-obvious technical choices and why
- [`docs/research/`](./docs/research/README.md) — Index Architect agent's working dossier (notes, gaps, proposals)
- [`.claude/agents/index-architect.md`](./.claude/agents/index-architect.md) — the agent's charter and hard limits

## License

All rights reserved. Proprietary.
