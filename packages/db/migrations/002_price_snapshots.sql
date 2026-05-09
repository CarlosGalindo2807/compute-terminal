-- Migration 002: price_snapshots — the heart of the system.
-- Plain Postgres (Supabase removed TimescaleDB). Indexes carry the read patterns:
--   • (gpu_model_id, captured_at desc) — markets table + gpu/[slug] page
--   • (provider_id, captured_at desc) — admin provider drill-downs
--   • (raw_gpu_string) where not normalized — the back-fill loop
-- At >10M rows, partition by month via pg_partman.

create table if not exists price_snapshots (
  id                  bigserial primary key,
  provider_id         uuid not null references providers(id),
  gpu_model_id        uuid references gpu_models(id),
  region              text,
  price_per_hour      numeric not null check (price_per_hour > 0),
  currency            text default 'USD',
  num_gpus            int default 1 check (num_gpus > 0),
  interconnect        text,
  availability_count  int,
  raw_payload         jsonb not null,
  raw_gpu_string      text,
  is_outlier          boolean default false,
  outlier_reason      text,
  is_normalized       boolean default false,
  captured_at         timestamptz not null default now()
);

create index if not exists price_snapshots_gpu_time_idx
  on price_snapshots (gpu_model_id, captured_at desc) where is_outlier = false;
create index if not exists price_snapshots_provider_time_idx
  on price_snapshots (provider_id, captured_at desc);
create index if not exists price_snapshots_unnormalized_idx
  on price_snapshots (is_normalized, captured_at desc) where is_normalized = false;
create index if not exists price_snapshots_raw_string_idx
  on price_snapshots (raw_gpu_string) where is_normalized = false;
create index if not exists price_snapshots_captured_at_idx
  on price_snapshots (captured_at desc);
