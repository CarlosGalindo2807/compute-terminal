// One-off: pull all scrape-runpod failure events from system_events
// over the last 7d and bucket them by error fingerprint.
// Run: node --env-file=.env scripts/investigate-runpod-fails.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };

const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
const r = await fetch(
  url +
    '/rest/v1/system_events?source=eq.inngest:scrape-runpod&event_type=eq.scraper_run_failed&occurred_at=gte.' +
    since +
    '&select=occurred_at,payload&order=occurred_at.desc&limit=500',
  { headers: h },
);
const rows = await r.json();
console.log(`runpod failures last 7d: ${rows.length}`);

// Bucket by an error fingerprint (first ~80 chars of payload.error, normalized).
const buckets = new Map();
for (const row of rows) {
  const err = row.payload?.error ?? row.payload?.message ?? JSON.stringify(row.payload ?? {}).slice(0, 80);
  // Normalize numbers + UUIDs + timestamps so similar errors group.
  const fp = String(err)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<uuid>')
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^\s"]*/g, '<ts>')
    .replace(/\b\d+\b/g, '<n>')
    .replace(/[ \t]+/g, ' ')
    .slice(0, 120);
  const arr = buckets.get(fp) ?? { count: 0, first: row.occurred_at, last: row.occurred_at, sample: row };
  arr.count++;
  if (row.occurred_at < arr.first) arr.first = row.occurred_at;
  if (row.occurred_at > arr.last) arr.last = row.occurred_at;
  buckets.set(fp, arr);
}

console.log('\n=== fingerprints ===\n');
const sorted = [...buckets.entries()].sort((a, b) => b[1].count - a[1].count);
for (const [fp, info] of sorted) {
  console.log(`${String(info.count).padStart(3)} × ${fp}`);
  console.log(`     first: ${info.first}`);
  console.log(`     last:  ${info.last}`);
  console.log(`     sample payload: ${JSON.stringify(info.sample.payload).slice(0, 300)}`);
  console.log();
}

// Also print succeeded count for the same window so we have the ratio
const r2 = await fetch(
  url +
    '/rest/v1/system_events?source=eq.inngest:scrape-runpod&event_type=eq.scraper_run_succeeded&occurred_at=gte.' +
    since +
    '&select=id',
  { headers: { ...h, Prefer: 'count=exact', Range: '0-0' } },
);
const succCount = parseInt(r2.headers.get('content-range').split('/')[1]);
const total = succCount + rows.length;
console.log(`succeeded: ${succCount} · failed: ${rows.length} · total: ${total} · fail-rate: ${((rows.length / total) * 100).toFixed(1)}%`);
