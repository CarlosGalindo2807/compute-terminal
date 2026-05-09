-- Migration 001: extensions and catalogs
-- Idempotent: safe to re-run.

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;
-- TimescaleDB intentionally absent: Supabase removed it from hosted projects in 2024.
-- price_snapshots uses plain Postgres + GIN/btree indexes; revisit pg_partman at >10M rows.

-- ─── providers ─────────────────────────────────────────────
create table if not exists providers (
  id                    uuid primary key default uuid_generate_v4(),
  slug                  text unique not null,
  name                  text not null,
  type                  text not null check (type in ('marketplace','cloud','reserved','forward')),
  base_url              text,
  api_endpoint          text,
  scrape_strategy       text check (scrape_strategy in ('api','html','playwright','manual')),
  has_api               boolean default false,
  is_active             boolean default true,
  reliability_score     numeric default 1.0 check (reliability_score >= 0 and reliability_score <= 1),
  consecutive_failures  int default 0,
  last_success_at       timestamptz,
  metadata              jsonb default '{}'::jsonb,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists providers_active_idx on providers (is_active) where is_active = true;
create index if not exists providers_reliability_idx on providers (reliability_score desc);

-- ─── gpu_models ────────────────────────────────────────────
create table if not exists gpu_models (
  id                          uuid primary key default uuid_generate_v4(),
  slug                        text unique not null,
  manufacturer                text not null check (manufacturer in ('nvidia','amd','intel','google','aws')),
  model                       text not null,
  variant                     text,
  vram_gb                     int not null,
  fp16_tflops                 numeric,
  fp8_tflops                  numeric,
  memory_bandwidth_gb_s       numeric,
  release_year                int,
  generation                  text,
  reference_price_per_hour    numeric,
  is_active                   boolean default true,
  aliases                     text[] default array[]::text[],
  created_at                  timestamptz default now()
);

create index if not exists gpu_models_aliases_gin on gpu_models using gin (aliases);
create index if not exists gpu_models_slug_trgm on gpu_models using gin (slug gin_trgm_ops);
create index if not exists gpu_models_active_idx on gpu_models (is_active) where is_active = true;

-- updated_at trigger helper (used in later migrations too)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists providers_updated_at on providers;
create trigger providers_updated_at before update on providers
  for each row execute function set_updated_at();
