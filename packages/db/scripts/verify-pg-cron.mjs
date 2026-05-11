// One-off: verify pg_cron job + invoke record_system_metrics_v1() once.
// Run from repo root: node --env-file=.env scripts/verify-pg-cron.mjs

import postgres from 'postgres';

const sql = postgres(process.env.SUPABASE_DB_URL, { ssl: 'require', max: 1 });

console.log('--- cron.job rows ---');
const jobs = await sql`
  select jobid, schedule, command, jobname, active
    from cron.job
    where jobname = 'record_system_metrics_hourly'
`;
console.log(jobs);

console.log('--- triggering record_system_metrics_v1() once ---');
await sql`select record_system_metrics_v1()`;

console.log('--- last 4 rows just written (source=pg_cron) ---');
const rows = await sql`
  select metric_name, metric_value, dimensions, recorded_at
    from system_health_metrics
    where dimensions->>'source' = 'pg_cron'
    order by recorded_at desc
    limit 4
`;
console.log(rows);

await sql.end();
