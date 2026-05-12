-- Migration 014: gpu_prices_daily — per-GPU daily benchmark applying the
-- locked methodology (filtered_vwap v1.0) at the same fixing window as
-- index_values_daily.
--
-- Why: the landing GPU ticker was computing 24h delta as first-snapshot vs
-- last-snapshot of raw price_snapshots. For high-spread GPUs (RTX 4080
-- Super spans $0.068 → $0.280 across providers in the same 24h) this
-- surfaced provider-mix bias as "price movement" — +176 % on the ticker
-- when nothing about the underlying market actually moved. IOSCO Principle
-- 7 (Data Sufficiency) and Principle 8 (Hierarchy of Data Inputs) plus
-- the practice of every benchmark we benchmark against (S&P, MSCI, FTSE
-- Russell, Bloomberg Commodity, ICE) require: same methodology applied at
-- both endpoints of a comparison, delta = level_T − level_T−1. This table
-- materializes that level per GPU per day. Provider mix bias cancels by
-- construction because the same MAD-3σ outlier filter + num_gpus weighting
-- runs on both endpoints.
--
-- Schema mirrors index_values_daily intentionally so the same audit
-- queries work on both. The committee-approved methodology lock applies
-- (methodology_used, methodology_version, methodology_locked).
--
-- Companion code lands in the same commit:
--   - apps/workers/src/functions/gpu-price-calculator.ts (cron 35 0 * * *,
--     5 min after the index calculator runs)
--   - scripts/backfill-gpu-prices.mjs (one-shot, 30 days of seed)
--   - apps/web/components/landing/data.ts:loadGpuTickerRows reads from
--     gpu_prices_daily.vwap T vs T−1, with sparkline from the last 14 rows.

create table if not exists gpu_prices_daily (
  gpu_model_id              uuid not null references gpu_models(id),
  date                      date not null,
  open_price                numeric,
  high_price                numeric,
  low_price                 numeric,
  close_price               numeric,
  vwap                      numeric,
  median_price              numeric,
  trimmed_mean              numeric,
  num_observations          int,
  num_providers             int,
  methodology_used          text,
  methodology_version       text,
  methodology_locked        boolean default true,
  contributing_provider_ids uuid[],
  confidence_score          numeric,
  created_at                timestamptz default now(),
  primary key (gpu_model_id, date)
);

create index if not exists gpu_prices_daily_date_idx
  on gpu_prices_daily (date desc);

create index if not exists gpu_prices_daily_gpu_date_idx
  on gpu_prices_daily (gpu_model_id, date desc);

-- Defense-in-depth RLS per migration 010 pattern. gpu_prices_daily is a
-- published benchmark — public-read, service-role-write.
alter table gpu_prices_daily enable row level security;

drop policy if exists "public read gpu_prices_daily" on gpu_prices_daily;
create policy "public read gpu_prices_daily"
  on gpu_prices_daily for select
  to anon, authenticated
  using (true);

comment on table gpu_prices_daily is
  'Daily per-GPU benchmark level under the locked methodology. Same methodology + audit columns as index_values_daily — the published per-GPU equivalent of CTI-* index values. Built so ticker / chart deltas compare like-with-like (filtered_vwap T vs filtered_vwap T−1) rather than raw snapshot first-vs-last.';

comment on column gpu_prices_daily.contributing_provider_ids is
  'Provider ids whose snapshots cleared reliability + MAD outlier filter. Lets us attribute level changes to provider mix vs underlying price movement.';
