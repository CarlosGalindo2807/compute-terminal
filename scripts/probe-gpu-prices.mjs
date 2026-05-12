// Verify gpu_prices_daily was backfilled correctly + show the ticker
// payload the page would render.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };

console.log('=== gpu_prices_daily summary by date ===');
const r1 = await fetch(
  url + '/rest/v1/gpu_prices_daily?select=date&order=date.desc',
  { headers: h },
);
const allRows = await r1.json();
const byDate = new Map();
for (const r of allRows) byDate.set(r.date, (byDate.get(r.date) ?? 0) + 1);
for (const [d, n] of byDate) console.log(`  ${d}: ${n} GPUs`);

console.log('\n=== Ticker payload simulation ===');
const gpusR = await fetch(url + '/rest/v1/gpu_models?select=id,slug,model,variant&is_active=eq.true', { headers: h });
const gpus = await gpusR.json();

const ranked = [];
for (const g of gpus) {
  const r = await fetch(
    url + '/rest/v1/gpu_prices_daily?select=date,vwap,num_observations&gpu_model_id=eq.' + g.id + '&order=date.desc&limit=14',
    { headers: h },
  );
  const rows = await r.json();
  if (rows.length < 2) continue;
  const latest = Number(rows[0].vwap);
  const prev = Number(rows[1].vwap);
  if (!Number.isFinite(latest) || !Number.isFinite(prev) || prev <= 0) continue;
  const d = ((latest - prev) / prev) * 100;
  ranked.push({
    label: `${g.model}${g.variant ? '·' + g.variant : ''}`.slice(0, 18),
    n: rows[0].num_observations,
    latest,
    prev,
    delta: d,
    series: rows.length,
  });
}
ranked.sort((a, b) => b.n - a.n);
console.log('label                | n    | latest$/hr | prev$/hr  | Δ%       | sparkPts');
console.log('---------------------|------|------------|-----------|----------|---------');
for (const r of ranked.slice(0, 10)) {
  console.log(
    `${r.label.padEnd(20)} | ${String(r.n).padStart(4)} | $${r.latest.toFixed(3).padStart(8)}   | $${r.prev.toFixed(3).padStart(7)}  | ${r.delta.toFixed(2).padStart(7)}% | ${r.series}`,
  );
}

console.log('\nTotal rows in gpu_prices_daily:', allRows.length);
