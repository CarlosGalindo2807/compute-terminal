// One-off: query recent scraper events from system_events via PostgREST.
// Run from repo root: node --env-file=.env scripts/check-scrapers.mjs
// No deps — uses Supabase's REST endpoint directly with the service role key.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sources = [
  'inngest:scrape-vast',
  'inngest:scrape-runpod',
  'inngest:scrape-lambda_labs',
];

const minutes = Number(process.argv[2] ?? 20);
const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();

const params = new URLSearchParams({
  select: 'source,event_type,occurred_at,payload',
  source: `in.(${sources.join(',')})`,
  occurred_at: `gte.${since}`,
  order: 'occurred_at.desc',
  limit: '60',
});

const resp = await fetch(`${url}/rest/v1/system_events?${params}`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});

if (!resp.ok) {
  console.error('REST error', resp.status, await resp.text());
  process.exit(1);
}

const rows = await resp.json();

for (const r of rows) {
  const src = r.source.replace('inngest:', '').padEnd(20);
  const kind = r.event_type.padEnd(25);
  const t = r.occurred_at.slice(11, 19);
  console.log(`${t}  ${src}  ${kind}  ${JSON.stringify(r.payload).slice(0, 260)}`);
}

console.log(`\nTotal events in last ${minutes} min: ${rows.length}`);
