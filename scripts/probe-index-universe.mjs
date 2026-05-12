// Investigate the suspect deltas:
//   1. cti-h100 universe expansion 21 → 363 between 2026-05-09 and 2026-05-11
//   2. RTX 4080 Super / RTX 3090 showing +176% / +191% in the ticker
// Run with: node --env-file=.env scripts/probe-index-universe.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };

console.log('=== 1. Migration 013 column check ===');
const r0 = await fetch(
  url + '/rest/v1/index_values_daily?select=date,contributing_gpu_ids&order=date.desc&limit=2',
  { headers: h },
);
console.log(await r0.text());

console.log('\n=== 2. cti-h100 daily history (full columns) ===');
const r1 = await fetch(url + '/rest/v1/compute_indices?slug=eq.cti-h100&select=id,methodology', { headers: h });
const [idx] = await r1.json();
const declared = idx.methodology?.gpu_models ?? [];
console.log('Declared GPU universe for cti-h100:', declared);

const r2 = await fetch(
  url +
    '/rest/v1/index_values_daily?index_id=eq.' +
    idx.id +
    '&select=date,open_price,high_price,low_price,close_price,vwap,num_observations,num_providers,methodology_used,contributing_gpu_ids&order=date.desc&limit=5',
  { headers: h },
);
const rows = await r2.json();
for (const row of rows) {
  console.log(
    `${row.date} · vwap=$${Number(row.vwap).toFixed(3)} · O=$${Number(row.open_price ?? 0).toFixed(3)} H=$${Number(row.high_price ?? 0).toFixed(3)} L=$${Number(row.low_price ?? 0).toFixed(3)} C=$${Number(row.close_price ?? 0).toFixed(3)} · n=${row.num_observations} · methodology=${row.methodology_used} · contrib=${row.contributing_gpu_ids ? row.contributing_gpu_ids.length : 'null (pre-013)'}`,
  );
}

console.log('\n=== 3. RTX 4080 Super outlier hunt — current 24h ===');
const since = new Date(Date.now() - 24 * 3600_000).toISOString();
const r3 = await fetch(url + '/rest/v1/gpu_models?slug=eq.rtx-4080-super&select=id,model,variant,vram_gb', { headers: h });
const [rtx] = await r3.json();
if (rtx) {
  console.log('GPU:', rtx);
  const asc = await fetch(
    url +
      '/rest/v1/price_snapshots?select=price_per_hour,captured_at,provider_id,is_outlier&gpu_model_id=eq.' +
      rtx.id +
      '&is_outlier=eq.false&is_normalized=eq.true&currency=eq.USD&captured_at=gte.' +
      since +
      '&order=price_per_hour.asc&limit=5',
    { headers: h },
  );
  const desc = await fetch(
    url +
      '/rest/v1/price_snapshots?select=price_per_hour,captured_at,provider_id&gpu_model_id=eq.' +
      rtx.id +
      '&is_outlier=eq.false&is_normalized=eq.true&currency=eq.USD&captured_at=gte.' +
      since +
      '&order=price_per_hour.desc&limit=5',
    { headers: h },
  );
  const a = await asc.json();
  const d = await desc.json();
  console.log('5 cheapest (filtered, normalized, USD):');
  for (const s of a) console.log('  $' + Number(s.price_per_hour).toFixed(3) + ' @ ' + s.captured_at);
  console.log('5 most expensive (same filter):');
  for (const s of d) console.log('  $' + Number(s.price_per_hour).toFixed(3) + ' @ ' + s.captured_at);
}

console.log('\n=== 4. RTX 3090 outlier hunt — current 24h ===');
const r4 = await fetch(url + '/rest/v1/gpu_models?slug=eq.rtx-3090&select=id', { headers: h });
const [rtx2] = await r4.json();
if (rtx2) {
  const asc = await fetch(
    url +
      '/rest/v1/price_snapshots?select=price_per_hour,captured_at&gpu_model_id=eq.' +
      rtx2.id +
      '&is_outlier=eq.false&is_normalized=eq.true&currency=eq.USD&captured_at=gte.' +
      since +
      '&order=price_per_hour.asc&limit=5',
    { headers: h },
  );
  const desc = await fetch(
    url +
      '/rest/v1/price_snapshots?select=price_per_hour,captured_at&gpu_model_id=eq.' +
      rtx2.id +
      '&is_outlier=eq.false&is_normalized=eq.true&currency=eq.USD&captured_at=gte.' +
      since +
      '&order=price_per_hour.desc&limit=5',
    { headers: h },
  );
  console.log('5 cheapest:', (await asc.json()).map((s) => '$' + Number(s.price_per_hour).toFixed(3)).join(' · '));
  console.log('5 most expensive:', (await desc.json()).map((s) => '$' + Number(s.price_per_hour).toFixed(3)).join(' · '));
}
