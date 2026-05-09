-- Migration 009: Lock the published index methodology to v1.0 = filtered_vwap.
-- The 5-methodology A/B continues nightly but writes to index_methodology_experiments
-- only — it is research input for the Index Committee and does NOT change what is
-- published. The published value comes from the locked methodology + the version
-- recorded here.
--
-- Changes:
--  1. index_values_daily.methodology_version  — frozen identifier ("v1.0")
--  2. index_values_daily.methodology_locked   — boolean, true while not human-overridden
--  3. methodology_versions                    — change log signed by the committee
--  4. methodology_changes                     — every committee-approved transition

alter table index_values_daily
  add column if not exists methodology_version text;

alter table index_values_daily
  add column if not exists methodology_locked boolean default true;

create table if not exists methodology_versions (
  version           text primary key,
  formula_id        text not null,
  formula_params    jsonb not null default '{}'::jsonb,
  effective_from    date not null,
  effective_to      date,
  rationale         text,
  approved_by       text,
  approved_at       timestamptz,
  document_url      text,
  created_at        timestamptz default now()
);

create table if not exists methodology_changes (
  id                bigserial primary key,
  from_version      text references methodology_versions(version),
  to_version        text not null references methodology_versions(version),
  decision_date     date not null,
  decision_minutes  text,
  approved_by       jsonb not null,
  effective_from    date not null,
  created_at        timestamptz default now()
);

insert into methodology_versions
  (version, formula_id, formula_params, effective_from, rationale, approved_by, approved_at, document_url)
values (
  'v1.0',
  'filtered_vwap',
  '{"outlier_filter":"mad_3_sigma","window_hours":24,"min_observations":5,"weight":"num_gpus","reliability_floor":0.5}'::jsonb,
  current_date,
  'Initial published methodology. VWAP weighted by num_gpus over a 24-hour window, after excluding observations more than 3 MAD from the median per GPU model. Rationale documented at /methodology.',
  'Index Committee — founding charter',
  now(),
  '/methodology'
)
on conflict (version) do nothing;

-- Backfill existing rows: anything already computed used the locked methodology now.
update index_values_daily
  set methodology_version = 'v1.0', methodology_locked = true
  where methodology_version is null;
