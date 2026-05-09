-- Migration 007: row level security
alter table user_profiles enable row level security;
alter table user_actions enable row level security;
alter table alerts enable row level security;
alter table data_flags enable row level security;

drop policy if exists "users see own profile" on user_profiles;
create policy "users see own profile"
  on user_profiles for select using (auth.uid() = id);

drop policy if exists "users update own profile" on user_profiles;
create policy "users update own profile"
  on user_profiles for update using (auth.uid() = id);

drop policy if exists "users see own actions" on user_actions;
create policy "users see own actions"
  on user_actions for select using (auth.uid() = user_id);

drop policy if exists "users insert own actions" on user_actions;
create policy "users insert own actions"
  on user_actions for insert with check (auth.uid() = user_id);

drop policy if exists "users manage own alerts" on alerts;
create policy "users manage own alerts"
  on alerts for all using (auth.uid() = user_id);

drop policy if exists "users see own flags" on data_flags;
create policy "users see own flags"
  on data_flags for all using (auth.uid() = user_id);

-- Public read tables: providers, gpu_models, price_snapshots (non-outlier), compute_indices, index_values_daily, generated_content (published)
-- Keep RLS off for these in v0 — read happens server-side with service role from API routes.
-- If exposing via PostgREST/anon key later, enable here.
