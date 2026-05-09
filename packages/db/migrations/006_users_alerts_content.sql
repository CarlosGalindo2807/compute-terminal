-- Migration 006: users, alerts, content, flags

create table if not exists user_profiles (
  id                  uuid primary key references auth.users(id),
  email               text not null,
  plan                text default 'free' check (plan in ('free','pro','team','enterprise')),
  stripe_customer_id  text,
  api_key             text unique,
  api_calls_mtd       int default 0,
  signals             jsonb default '{}'::jsonb,
  created_at          timestamptz default now()
);

create table if not exists user_actions (
  id              bigserial primary key,
  user_id         uuid references auth.users(id),
  action_type     text not null,
  context         jsonb,
  occurred_at     timestamptz default now()
);

create index if not exists user_actions_user_time on user_actions (user_id, occurred_at desc);
create index if not exists user_actions_type_time on user_actions (action_type, occurred_at desc);

create table if not exists alerts (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id),
  gpu_model_id        uuid references gpu_models(id),
  index_id            uuid references compute_indices(id),
  condition           text not null check (condition in ('above','below','change_pct_above','change_pct_below')),
  threshold           numeric not null,
  channel             text not null check (channel in ('email','telegram','webhook')),
  channel_target      text,
  is_active           boolean default true,
  last_triggered_at   timestamptz,
  trigger_count       int default 0,
  created_at          timestamptz default now()
);

create index if not exists alerts_active_user_idx on alerts (user_id) where is_active = true;
create index if not exists alerts_active_subject_idx on alerts (gpu_model_id, index_id) where is_active = true;

create table if not exists generated_content (
  id              uuid primary key default uuid_generate_v4(),
  content_type    text not null
                  check (content_type in ('daily_brief','social_post','newsletter','blog_post')),
  title           text,
  body            text not null,
  metadata        jsonb,
  status          text default 'draft' check (status in ('draft','approved','published','rejected')),
  channels        text[] default array[]::text[],
  scheduled_for   timestamptz,
  published_at    timestamptz,
  metrics         jsonb,
  created_at      timestamptz default now()
);

create index if not exists generated_content_status_idx on generated_content (status, scheduled_for);
create index if not exists generated_content_type_published on generated_content (content_type, published_at desc);

create table if not exists data_flags (
  id              uuid primary key default uuid_generate_v4(),
  snapshot_id     bigint,
  user_id         uuid references auth.users(id),
  reason          text,
  llm_assessment  jsonb,
  status          text default 'pending' check (status in ('pending','valid','invalid','resolved')),
  created_at      timestamptz default now()
);

create index if not exists data_flags_status_idx on data_flags (status);
