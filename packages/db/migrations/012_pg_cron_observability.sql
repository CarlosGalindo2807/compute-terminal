-- Migration 012: pg_cron extension + move hourly observability cron into Postgres.
--
-- Context: today record-system-metrics runs in Inngest cloud, but the job is
-- four simple aggregates + a single insert into system_health_metrics. Moving
-- it inside Postgres removes a network round-trip per hour and a dependency
-- on Inngest cloud being up. The outlier detector deliberately stays in
-- Inngest — its logic is load-bearing for the methodology v1.0 lock test
-- (is_outlier on price_snapshots is an input to the published index), so any
-- change to it needs Committee review, not a silent infra migration.
--
-- What this migration does:
--   1. Enables the pg_cron extension under schema `cron` (Supabase pattern).
--   2. Defines record_system_metrics_v1() — SECURITY DEFINER plpgsql function
--      that replicates apps/workers/src/functions/record-system-metrics.ts.
--   3. Schedules it hourly at HH:15 to match the existing Inngest cadence.
--   4. Idempotent: every step uses IF NOT EXISTS / drop-then-create patterns
--      so re-running the migration is safe.
--
-- Companion change (separate commit): unregister recordSystemMetrics from
-- apps/workers/src/inngest/config.ts. The function definition stays in the
-- file so it can be re-registered in case pg_cron has to be rolled back.

-- ─── 1. pg_cron extension ──────────────────────────────────
-- Supabase manages pg_cron under the `cron` schema. The extension itself
-- lives in pg_catalog once enabled; only the schedule + job tables are user
-- facing.
create extension if not exists pg_cron;

-- ─── 2. SQL implementation of record-system-metrics ─────────
-- Same four metrics + the same hourly window the TS version computes.
-- SECURITY DEFINER so pg_cron (running as superuser) can write through RLS
-- and read tables across schemas without per-call grants.

create or replace function record_system_metrics_v1()
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_since timestamptz := now() - interval '1 hour';
  v_snapshots int;
  v_unmatched int;
  v_outliers int;
  v_avg_reliability numeric;
begin
  select count(*) into v_snapshots
    from price_snapshots
    where captured_at >= v_since;

  select count(*) into v_unmatched
    from unmatched_listings
    where status = 'pending';

  select count(*) into v_outliers
    from price_snapshots
    where captured_at >= v_since and is_outlier = true;

  select coalesce(avg(reliability_score), 1)::numeric into v_avg_reliability
    from providers
    where is_active = true;

  insert into system_health_metrics (metric_name, metric_value, dimensions, recorded_at)
  values
    ('snapshots_per_hour',       v_snapshots,       jsonb_build_object('source', 'pg_cron'), now()),
    ('unmatched_pending',        v_unmatched,       jsonb_build_object('source', 'pg_cron'), now()),
    ('outliers_per_hour',        v_outliers,        jsonb_build_object('source', 'pg_cron'), now()),
    ('avg_provider_reliability', v_avg_reliability, jsonb_build_object('source', 'pg_cron'), now());
end;
$$;

comment on function record_system_metrics_v1() is
  'Hourly observability snapshot. Scheduled via pg_cron at HH:15.'
  ' Replaces Inngest recordSystemMetrics from 2026-05-11. Dimensions.source = pg_cron'
  ' lets us trace which cron stack wrote each row during the migration window.';

-- ─── 3. Schedule the job (HH:15 hourly) ────────────────────
-- Unschedule any prior registration before adding so re-running the migration
-- doesn't create a duplicate every time. cron.unschedule(jobname) is idempotent
-- in pg_cron 1.5+ (returns false silently if absent).

do $$
begin
  perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'record_system_metrics_hourly';
exception when others then
  -- Schema or table absent on a fresh project. Continue.
  null;
end$$;

select cron.schedule(
  'record_system_metrics_hourly',
  '15 * * * *',
  $cmd$select record_system_metrics_v1()$cmd$
);

-- ─── 4. Read access for service-role observability ─────────
-- Service role is used by the workers + Next API to surface cron state on
-- /admin/health. Grant select on the cron.job + cron.job_run_details views
-- so we don't need to issue admin-level credentials for diagnostics.

grant usage on schema cron to service_role;
grant select on cron.job to service_role;
grant select on cron.job_run_details to service_role;
