-- Migration 011: pivot v2 schema — buyer-side intelligence layer.
--
-- Context: REFRAME_v2.md repositions CTI from "the index" (Silicon Data already
-- holds that slot institutionally) to "the procurement + observability terminal
-- for teams that buy AI compute". This migration adds the four tables that
-- back the three differentiating variables described in section 3 of the
-- REFRAME, plus the internal forward-curve table referenced in section 4.
--
-- Tables added:
--   1. provider_compliance      — jurisdiction + certifications (variable 3 EU)
--   2. throughput_benchmarks    — GPU × LLM × precision token throughput
--                                 (variable 1 tokens-equivalent index)
--   3. invoice_observations     — anonymized real-paid prices vs published
--                                 (variable 8 behavioral pricing)
--   4. forward_curves           — internal forward curve, never licensed out
--
-- Deviations from the literal REFRAME_v2 spec, with rationale:
--   * provider_compliance.provider_id is uuid references providers(id),
--     not text. providers.id is uuid in this repo (migration 001).
--   * invoice_observations does NOT call create_hypertable(). Supabase
--     removed TimescaleDB from hosted projects in 2024 (see decisions.md
--     "TimescaleDB over plain Postgres"). Replaced with composite btree
--     indexes covering the same access patterns.
--   * RLS posture follows the same defense-in-depth pattern as migration 010:
--       - provider_compliance, throughput_benchmarks → public-read (catalog)
--       - invoice_observations, forward_curves       → internal only
--     Aggregate views over invoice_observations can be exposed publicly later
--     once redaction is audited; the raw rows stay service-role only.

-- ─── 1. provider_compliance ──────────────────────────────────
-- Jurisdictional and certification metadata per provider. Drives the
-- CTI-H100-EU sub-index and the customer-facing compliance filter.
create table if not exists provider_compliance (
  provider_id              uuid primary key references providers(id) on delete cascade,
  datacenter_country       text not null,            -- ISO 3166-1 alpha-2
  parent_company_country   text,                     -- ISO 3166-1 alpha-2
  certifications           text[] default array[]::text[],  -- e.g. {iso27001,soc2,eu_ccc}
  subject_to_cloud_act     boolean,                  -- US Cloud Act exposure
  notes                    text,
  attested_at              timestamptz default now(),
  attested_by              text,                     -- 'self' | 'public_filing' | 'audit'
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

create index if not exists provider_compliance_country_idx
  on provider_compliance (datacenter_country);

create index if not exists provider_compliance_certs_gin
  on provider_compliance using gin (certifications);

drop trigger if exists provider_compliance_updated_at on provider_compliance;
create trigger provider_compliance_updated_at before update on provider_compliance
  for each row execute function set_updated_at();

-- ─── 2. throughput_benchmarks ────────────────────────────────
-- Tokens/second for (gpu_model × llm_model × precision × batch_size).
-- Sources: 'internal' (we measured), 'mlperf', 'vendor', 'community'.
-- Used by /api/v1/cost-per-workload to translate $/gpu-hour into $/M-tokens.
create table if not exists throughput_benchmarks (
  id                  bigserial primary key,
  gpu_model           text not null,                 -- gpu_models.slug (loose ref, not FK — benchmarks may pre-date catalog)
  llm_model           text not null,                 -- 'claude-sonnet-4-5', 'llama-3-70b', etc
  precision           text not null,                 -- 'fp16' | 'fp8' | 'int4' | 'bf16'
  tokens_per_second   numeric not null check (tokens_per_second > 0),
  batch_size          int,
  context_length      int,                           -- typical context used in measurement
  measured_at         timestamptz not null default now(),
  source              text not null check (source in ('internal','mlperf','vendor','community')),
  source_url          text,
  notes               text,
  created_at          timestamptz default now(),
  unique (gpu_model, llm_model, precision, batch_size, source)
);

create index if not exists throughput_benchmarks_gpu_idx
  on throughput_benchmarks (gpu_model);

create index if not exists throughput_benchmarks_llm_idx
  on throughput_benchmarks (llm_model);

-- ─── 3. invoice_observations ─────────────────────────────────
-- Anonymized facts from user-uploaded invoices. NEVER store account_id,
-- customer_name, invoice_number, contact_email — redaction happens upstream
-- before this row is written. The redaction pipeline is a separate workstream
-- (REFRAME_v2 section 3 / variable 8); this table is the destination only.
create table if not exists invoice_observations (
  id                          bigserial primary key,
  uploaded_at                 timestamptz not null default now(),
  observation_date            date not null,         -- billing period the invoice covers
  provider                    text not null,         -- 'aws' | 'gcp' | 'azure' | 'lambda' | 'coreweave' | ...
  gpu_model                   text not null,         -- gpu_models.slug, loose
  effective_price_usd_hour    numeric not null check (effective_price_usd_hour >= 0),
  monthly_volume_gpu_hours    numeric,
  customer_spend_band         text not null check (customer_spend_band in
    ('under_5k','5k_to_25k','25k_to_100k','over_100k')),
  contract_type               text check (contract_type in
    ('on_demand','spot','reserved_1m','reserved_3m','reserved_6m','reserved_12m','reserved_36m','enterprise_agreement')),
  region                      text,                  -- provider region code if disclosed
  metadata                    jsonb default '{}'::jsonb,
  created_at                  timestamptz default now()
);

-- Access patterns we expect:
--   a) "median effective price by (provider, gpu_model, spend_band) over last 90d"
--   b) "all observations for a provider within a date range"
--   c) "all observations for a gpu_model within a date range"
create index if not exists invoice_observations_date_idx
  on invoice_observations (observation_date desc);

create index if not exists invoice_observations_segment_idx
  on invoice_observations (provider, gpu_model, customer_spend_band, observation_date desc);

create index if not exists invoice_observations_provider_idx
  on invoice_observations (provider, observation_date desc);

create index if not exists invoice_observations_gpu_idx
  on invoice_observations (gpu_model, observation_date desc);

-- ─── 4. forward_curves ───────────────────────────────────────
-- Internal forward curve estimates per (gpu_model, curve_date, tenor).
-- Drives Línea 2 (Hedging-as-a-Service) recommendations. NOT licensed
-- externally — REFRAME_v2 section 4 explicit.
create table if not exists forward_curves (
  id            bigserial primary key,
  source        text not null default 'internal',
  gpu_model     text not null,                       -- gpu_models.slug, loose
  curve_date    date not null,                       -- as-of date
  tenor_days    int not null check (tenor_days > 0),
  forward_rate  numeric(10,4) not null check (forward_rate >= 0),
  methodology   text,                                -- 'no_arbitrage' | 'vwap_derived' | 'committee_overlay'
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now(),
  unique (source, gpu_model, curve_date, tenor_days)
);

create index if not exists forward_curves_lookup_idx
  on forward_curves (gpu_model, curve_date desc, tenor_days);

-- ─── RLS posture ──────────────────────────────────────────────
-- Same pattern as migration 010: enable RLS everywhere, public-read where
-- safe, no policies (= service-role only) where sensitive.

alter table provider_compliance     enable row level security;
alter table throughput_benchmarks   enable row level security;
alter table invoice_observations    enable row level security;
alter table forward_curves          enable row level security;

drop policy if exists "public read provider_compliance" on provider_compliance;
create policy "public read provider_compliance"
  on provider_compliance for select to anon, authenticated using (true);

drop policy if exists "public read throughput_benchmarks" on throughput_benchmarks;
create policy "public read throughput_benchmarks"
  on throughput_benchmarks for select to anon, authenticated using (true);

-- invoice_observations and forward_curves: RLS on, no anon/authenticated policy.
-- Service role bypasses RLS, so server-side reads from getServiceClient() still
-- work. Aggregate views with k-anonymity guarantees can be exposed via SECURITY
-- DEFINER functions in a later migration once redaction is audit-grade.
