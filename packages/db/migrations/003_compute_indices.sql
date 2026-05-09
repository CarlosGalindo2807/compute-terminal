-- Migration 003: compute indices and methodology A/B store
create table if not exists compute_indices (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  name          text not null,
  description   text,
  methodology   jsonb not null,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

create table if not exists index_values_daily (
  index_id           uuid not null references compute_indices(id),
  date               date not null,
  open_price         numeric,
  high_price         numeric,
  low_price          numeric,
  close_price        numeric,
  vwap               numeric,
  median_price       numeric,
  trimmed_mean       numeric,
  num_observations   int,
  num_providers      int,
  methodology_used   text,
  confidence_score   numeric,
  primary key (index_id, date)
);

create index if not exists index_values_daily_date_idx
  on index_values_daily (date desc);

create table if not exists index_methodology_experiments (
  id                  uuid primary key default uuid_generate_v4(),
  index_id            uuid not null references compute_indices(id),
  date                date not null,
  methodology_name    text not null,
  methodology_params  jsonb not null,
  result_value        numeric,
  volatility_score    numeric,
  consistency_score   numeric,
  composite_score     numeric,
  was_champion        boolean default false,
  created_at          timestamptz default now()
);

create index if not exists index_experiments_lookup
  on index_methodology_experiments (index_id, date desc, composite_score desc);
