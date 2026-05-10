-- Migration 010: complete RLS coverage.
--
-- Status quo (2026-05-10): RLS only on the 4 user-scoped tables. Every other
-- table is RLS-off, which is fine while reads happen exclusively server-side
-- via the service role. This migration closes that gap defensively, in case the
-- anon key is ever exposed to the browser.
--
-- Strategy:
--   * Public-read tables (8): RLS on, with a select-everyone policy.
--   * generated_content: RLS on, anon may read only rows with status='published'.
--   * Internal tables (6): RLS on, no anon/auth policies — only the service role
--     can touch them (service role bypasses RLS by definition).
--
-- The frontend pages and Inngest workers all use the service role
-- (getServiceClient / lib/supabase-server.ts) so this migration cannot break
-- them. We verified this by grepping the repo before writing the policies.

-- ─── Public-read catalog tables ───────────────────────────────────────

alter table compute_indices       enable row level security;
alter table gpu_models            enable row level security;
alter table providers             enable row level security;
alter table index_values_daily    enable row level security;
alter table methodology_versions  enable row level security;
alter table methodology_changes   enable row level security;
alter table price_snapshots       enable row level security;
alter table normalization_rules   enable row level security;

drop policy if exists "public read compute_indices" on compute_indices;
create policy "public read compute_indices"
  on compute_indices for select to anon, authenticated using (true);

drop policy if exists "public read gpu_models" on gpu_models;
create policy "public read gpu_models"
  on gpu_models for select to anon, authenticated using (true);

drop policy if exists "public read providers" on providers;
create policy "public read providers"
  on providers for select to anon, authenticated using (true);

drop policy if exists "public read index_values_daily" on index_values_daily;
create policy "public read index_values_daily"
  on index_values_daily for select to anon, authenticated using (true);

drop policy if exists "public read methodology_versions" on methodology_versions;
create policy "public read methodology_versions"
  on methodology_versions for select to anon, authenticated using (true);

drop policy if exists "public read methodology_changes" on methodology_changes;
create policy "public read methodology_changes"
  on methodology_changes for select to anon, authenticated using (true);

drop policy if exists "public read price_snapshots non-outlier" on price_snapshots;
-- Outliers are an internal-quality signal. Public consumers see only the
-- snapshots that contributed to the published index.
create policy "public read price_snapshots non-outlier"
  on price_snapshots for select to anon, authenticated using (is_outlier = false);

drop policy if exists "public read normalization_rules" on normalization_rules;
-- Read-only access to normalization rules is fine — they document how raw
-- strings map to the catalog. Useful for licensees auditing the index.
create policy "public read normalization_rules"
  on normalization_rules for select to anon, authenticated using (true);

-- ─── generated_content: only published rows are public ────────────────

alter table generated_content     enable row level security;

drop policy if exists "public read published content" on generated_content;
create policy "public read published content"
  on generated_content for select to anon, authenticated
  using (status = 'published');

-- ─── Internal-only tables ─────────────────────────────────────────────
-- RLS on with NO policy → only service_role can read or write. Anon and
-- authenticated requests get zero rows back.

alter table system_events                  enable row level security;
alter table system_health_metrics          enable row level security;
alter table unmatched_listings             enable row level security;
alter table provider_candidates            enable row level security;
alter table index_methodology_experiments  enable row level security;

-- _migrations is internal infrastructure; lock it down too.
alter table _migrations                    enable row level security;
