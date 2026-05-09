-- Migration 004: self-learning queue and rules

create table if not exists unmatched_listings (
  id                uuid primary key default uuid_generate_v4(),
  raw_string        text not null,
  raw_payload       jsonb,
  provider_id       uuid references providers(id),
  occurrence_count  int default 1,
  status            text default 'pending'
                    check (status in ('pending','auto_resolved','manual_resolved','ignored','new_hardware')),
  suggested_gpu_id  uuid references gpu_models(id),
  llm_confidence    numeric,
  llm_reasoning     text,
  llm_model         text,
  resolved_at       timestamptz,
  resolved_by       text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create unique index if not exists unmatched_listings_unique_raw
  on unmatched_listings (provider_id, raw_string);

create index if not exists unmatched_listings_queue_idx
  on unmatched_listings (status, occurrence_count desc) where status = 'pending';

drop trigger if exists unmatched_listings_updated_at on unmatched_listings;
create trigger unmatched_listings_updated_at before update on unmatched_listings
  for each row execute function set_updated_at();

create table if not exists normalization_rules (
  id              uuid primary key default uuid_generate_v4(),
  pattern         text not null,
  pattern_type    text not null check (pattern_type in ('exact','regex','contains','fuzzy')),
  gpu_model_id    uuid not null references gpu_models(id),
  confidence      numeric default 1.0,
  source          text not null check (source in ('seed','llm_learned','manual','rule_based')),
  hit_count       int default 0,
  last_hit_at     timestamptz,
  created_at      timestamptz default now()
);

create unique index if not exists normalization_rules_unique
  on normalization_rules (pattern, pattern_type, gpu_model_id);
create index if not exists normalization_rules_lookup
  on normalization_rules (pattern_type, confidence desc);

create table if not exists provider_candidates (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  url             text not null,
  source          text not null,
  signals         jsonb,
  llm_assessment  jsonb,
  status          text default 'pending'
                  check (status in ('pending','approved','rejected','integrated')),
  created_at      timestamptz default now()
);

create unique index if not exists provider_candidates_unique_url on provider_candidates (url);
create index if not exists provider_candidates_status_idx on provider_candidates (status);
