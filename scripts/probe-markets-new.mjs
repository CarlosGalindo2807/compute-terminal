// Simulate the post-fix /markets logic and cross-check vs ticker side.
// Run with: node --env-file=.env scripts/probe-markets-new.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };

const RELIABILITY_FLOOR = 0.5;
const MIN_OBS = 5;
const MAD_SIGMA = 3;

const median = (xs) => {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
};
const mad = (xs) => {
  const m = median(xs);
  return median(xs.map((x) => Math.abs(x - m)));
};
function filteredVwap(rows) {
  if (rows.length === 0) return NaN;
  const prices = rows.map((r) => r.price);
  const m = median(prices);
  const d = mad(prices) || 1e-9;
  const kept = rows.filter((r) => Math.abs(r.price - m) <= MAD_SIGMA * d);
  let sumW = 0, sumPV = 0;
  for (const k of kept) { sumW += k.numGpus; sumPV += k.price * k.numGpus; }
  return sumW > 0 ? sumPV / sumW : NaN;
}

const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
const [gpusR, provR] = await Promise.all([
  fetch(url + '/rest/v1/gpu_models?select=id,slug,model,variant,vram_gb&is_active=eq.true&order=reference_price_per_hour.desc', { headers: h }),
  fetch(url + '/rest/v1/providers?select=id,reliability_score', { headers: h }),
]);
const gpus = await gpusR.json();
const provs = await provR.json();
const relById = new Map(provs.map((p) => [p.id, Number(p.reliability_score)]));

const out = [];
for (const g of gpus) {
  const base =
    url +
    '/rest/v1/price_snapshots?select=id,price_per_hour,num_gpus,captured_at,provider_id&gpu_model_id=eq.' +
    g.id +
    '&is_outlier=eq.false&is_normalized=eq.true&currency=eq.USD&captured_at=gte.' +
    since24 +
    '&limit=1000';
  const [asc, desc, daily] = await Promise.all([
    fetch(base + '&order=captured_at.asc', { headers: h }).then((r) => r.json()),
    fetch(base + '&order=captured_at.desc', { headers: h }).then((r) => r.json()),
    fetch(
      url + '/rest/v1/gpu_prices_daily?select=vwap,date,num_observations,num_providers&gpu_model_id=eq.' + g.id + '&order=date.desc&limit=1',
      { headers: h },
    ).then((r) => r.json()),
  ]);
  const seen = new Set();
  const snaps = [];
  for (const r of [...asc, ...desc]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    snaps.push({
      price: Number(r.price_per_hour),
      numGpus: Number(r.num_gpus),
      capturedAt: r.captured_at,
      providerId: r.provider_id,
    });
  }
  const eligible = snaps.filter((s) => (relById.get(s.providerId) ?? 0) >= RELIABILITY_FLOOR);
  const providers = new Set(eligible.map((s) => s.providerId));
  const name = `${g.model}${g.variant ? ' ' + g.variant : ''}`;

  if (eligible.length < MIN_OBS) {
    out.push({ name, current: null, prevClose: daily[0]?.vwap ?? null, delta: null, providers: providers.size, n: eligible.length });
    continue;
  }
  const PREV_MIN_OBS = 20;
  const current = filteredVwap(eligible);
  const prevClose = daily[0]?.vwap != null ? Number(daily[0].vwap) : null;
  const prevN = Number(daily[0]?.num_observations ?? 0);
  const deltaReady = prevClose && prevClose > 0 && eligible.length >= PREV_MIN_OBS && prevN >= PREV_MIN_OBS;
  const delta = deltaReady ? ((current - prevClose) / prevClose) * 100 : null;
  out.push({ name, current, prevClose, delta, prevN, providers: providers.size, n: eligible.length, gated: !deltaReady && prevClose != null });
}

console.log('Predicted /markets table after fix:\n');
console.log('GPU                              | current$/hr | prevClose$/hr | Δ%       | prov | n today | n prev | note');
console.log('---------------------------------|-------------|---------------|----------|------|---------|--------|-----');
for (const r of out) {
  const cur = r.current != null && Number.isFinite(r.current) ? `$${r.current.toFixed(3)}` : '—';
  const prev = r.prevClose != null ? `$${r.prevClose.toFixed(3)}` : '—';
  const d = r.delta != null ? `${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(2)}%` : '—';
  const note = r.gated ? 'gated (Δ < 20 obs)' : '';
  console.log(
    `${r.name.padEnd(32)} | ${cur.padStart(10)}  | ${prev.padStart(12)}  | ${d.padStart(8)} | ${String(r.providers).padStart(4)} | ${String(r.n).padStart(6)}  | ${String(r.prevN).padStart(6)} | ${note}`,
  );
}

// Cross-check landing ticker numbers (same source of truth)
console.log('\nCross-check: landing ticker vs predicted /markets (top 6 by snapshots):');
const top = [...out].filter((r) => r.delta != null).sort((a, b) => b.n - a.n).slice(0, 6);
for (const r of top) console.log(`  ${r.name.padEnd(28)} · prevClose=$${r.prevClose.toFixed(3)} (ticker shows latest vwap) · current=$${r.current.toFixed(3)} (live filtered_vwap) · Δ${r.delta.toFixed(2)}%`);
