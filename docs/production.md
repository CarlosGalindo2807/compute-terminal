# Production runbook

System is deployed and runs 24/7 without any local process. This is what's where, how data flows, and how to operate it.

## Topology

```
                                           ┌──────────────────────────────┐
                                           │   GitHub                     │
                                           │   carlosgalindo2807/         │
                                           │   compute-terminal (private) │
                                           └──────────────┬───────────────┘
                                                          │ git push
                                                          ▼
                              ┌────────────────────────────────────────────┐
                              │  Vercel — agentai2/compute-terminal        │
                              │  rootDirectory: apps/web                   │
                              │  • https://compute-terminal.vercel.app     │
                              │  • /, /markets, /gpu/[slug], /index/[slug] │
                              │  • /admin/* (env-gated by ADMIN_EMAILS)    │
                              │  • /api/inngest (10 functions, cloud mode) │
                              └─────────┬───────────────────────┬──────────┘
                                        │ reads / writes        │
                                        ▼                       │
                        ┌──────────────────────────────┐        │
                        │  Supabase Postgres           │        │
                        │  dnqahqlqbhqenbqblint        │        │
                        │  (eu-central-1, free tier)   │        │
                        │  Session-pooler IPv4 :5432   │        │
                        └──────────────────────────────┘        │
                                                                │ HTTPS
                                  ┌─────────────────────────────┴────┐
                                  │  Inngest cloud                   │
                                  │  app: compute-terminal           │
                                  │  triggers crons → calls Vercel   │
                                  │  Vercel integration auto-syncs   │
                                  │  on every deploy                 │
                                  └────────┬─────────────────────────┘
                                           │
                                           ▼
                            ┌──────────────────────────────┐
                            │  Anthropic API               │
                            │  Claude Sonnet 4.6 (default) │
                            │  Claude Opus 4.7 (briefs)    │
                            └──────────────────────────────┘
```

## Cron schedule (UTC)

| Function | Schedule | Cost / call (est.) |
|---|---|---|
| `scrape-vast` (TS-native) | `*/5 * * * *` | $0 |
| `outlier-detector` | `*/15 * * * *` | $0 |
| `record-system-metrics` | `15 * * * *` | $0 |
| `normalize-unmatched` (Claude) | `0 * * * *` | $0.05 / batch (cached catalog) |
| `content-publisher` | `5 * * * *` | $0 |
| `index-calculator` | `30 0 * * *` | $0 |
| `provider-discovery` (Claude) | `0 4 * * *` | $0 (no-op without `BRAVE_SEARCH_API_KEY`) |
| `content-generator` (Claude Opus) | `0 7 * * *` | ~$0.11 / day |
| `scrape-runpod` (Python spawn) | `*/5 * * * *` | $0 (fail-soft on Vercel) |
| `scrape-lambda` (Python spawn) | `*/5 * * * *` | $0 (fail-soft on Vercel) |

Steady-state monthly Anthropic cost target: **$15–25** with caching.

## Day-2 operations

| Task | Where |
|---|---|
| Watch crons fire | https://app.inngest.com → app `compute-terminal` → Functions |
| Inspect failures | Inngest dashboard run log, or `/admin/events` filtered by `*_failed` |
| Check live data | https://compute-terminal.vercel.app/markets |
| Add a new GPU SKU | New SQL migration `packages/db/migrations/00X_*.sql` — push, run `pnpm db:migrate` locally with prod env vars |
| Resolve `unmatched_listings` manually | https://compute-terminal.vercel.app/admin/unmatched (after sign-in) |
| Approve a content draft | https://compute-terminal.vercel.app/admin/content |
| Tune Anthropic spend | Toggle model in `packages/llm/src/index.ts` (`DEFAULT_MODEL = ...`); Sonnet 4.6 → Haiku 4.5 = 3× cheaper |
| Roll back a bad deploy | `vercel rollback <previous-deployment-url>` or via dashboard |

## Env vars (all in Vercel; managed via REST API, not `vercel env add`)

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` (NOT the dashboard URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client reads (RLS off in v0 so unused) |
| `SUPABASE_SERVICE_ROLE_KEY` | server reads + writes |
| `SUPABASE_DB_URL` | direct Postgres connection (Session pooler URL) |
| `ANTHROPIC_API_KEY` | Claude calls |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` |
| `ANTHROPIC_MODEL_FALLBACK` | `claude-haiku-4-5-20251001` |
| `INNGEST_EVENT_KEY` | event publishing |
| `INNGEST_SIGNING_KEY` | inbound request validation (set by Inngest cloud) |
| `ADMIN_EMAILS` | comma-separated allow-list for `/admin/*` |

## Pitfalls / gotchas already burned

See `docs/decisions.md` for the full backstory. Quick reference:
- **Don't put Vercel `installCommand`/`buildCommand` overrides** — Vercel auto-detects pnpm monorepo; overrides break.
- **Don't trust `vercel env add` via PowerShell stdin** — uploads empty values. Use `POST /v10/projects/{id}/env`.
- **Don't use `output_config.format`** — needs SDK ≥ 0.50; we use prompt-engineered JSON until upgrade.
- **Don't use `.js` extensions in workspace-package relative imports** — Next webpack can't resolve them.
- **Don't use the Direct connection string** for `SUPABASE_DB_URL` on free tier (IPv6-only). Session pooler.

## Hard-shutdown safety

Local dev processes (Next dev, workers server, Inngest dev CLI) are **not** required for production. Stopping them only kills `localhost:*`. Cloud crons and the Vercel deployment continue regardless.
