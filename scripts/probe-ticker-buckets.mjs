// Simulate the ASC+DESC merge fix: real deltas + populated buckets for each GPU.
// Run with: node --env-file=.env scripts/probe-ticker-buckets.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };

const since24Ms = Date.now() - 24 * 3600_000;
const since24 = new Date(since24Ms).toISOString();

const gpusRes = await fetch(url + '/rest/v1/gpu_models?select=id,slug,model,variant&is_active=eq.true', { headers: h });
const gpus = await gpusRes.json();

const N = 12;
const bucketMs = (24 * 3600_000) / N;
function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

const tStart = Date.now();
const perGpu = await Promise.all(
  gpus.map(async (g) => {
    const base =
      url +
      '/rest/v1/price_snapshots?select=id,price_per_hour,captured_at&gpu_model_id=eq.' +
      g.id +
      '&is_outlier=eq.false&is_normalized=eq.true&currency=eq.USD&captured_at=gte.' +
      since24 +
      '&limit=1000';
    const [asc, desc] = await Promise.all([
      fetch(base + '&order=captured_at.asc', { headers: h }).then((r) => r.json()),
      fetch(base + '&order=captured_at.desc', { headers: h }).then((r) => r.json()),
    ]);
    const seen = new Set();
    const snaps = [];
    for (const r of [...asc, ...desc]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      snaps.push({ p: Number(r.price_per_hour), t: new Date(r.captured_at).getTime() });
    }
    return { g, snaps };
  }),
);
const tEnd = Date.now();
console.log(`28 × ASC+DESC = 56 parallel queries in ${tEnd - tStart}ms\n`);

const rows = [];
for (const { g, snaps } of perGpu) {
  if (snaps.length < 8) continue;
  const buckets = Array.from({ length: N }, () => []);
  for (const s of snaps) {
    const idx = Math.min(N - 1, Math.max(0, Math.floor((s.t - since24Ms) / bucketMs)));
    buckets[idx].push(s.p);
  }
  const med24 = median(snaps.map((s) => s.p));
  const fQ = buckets.slice(0, 3).flat();
  const lQ = buckets.slice(N - 3).flat();
  let d = 0;
  if (fQ.length > 0 && lQ.length > 0) {
    const mF = median(fQ);
    const mL = median(lQ);
    d = mF > 0 ? ((mL - mF) / mF) * 100 : 0;
  }
  const popB = buckets.filter((b) => b.length > 0).length;
  rows.push({
    label: `${g.model}${g.variant ? '·' + g.variant : ''}`.slice(0, 18),
    n: snaps.length,
    med24,
    delta: d,
    popB,
    fQn: fQ.length,
    lQn: lQ.length,
  });
}
rows.sort((a, b) => b.n - a.n);
console.log('label                | n    | med$/hr | 24hΔ%   | popB/12 | fQn  | lQn');
console.log('---------------------|------|---------|---------|---------|------|------');
for (const r of rows.slice(0, 12)) {
  console.log(
    `${r.label.padEnd(20)} | ${String(r.n).padStart(4)} | $${r.med24.toFixed(3)} | ${r.delta.toFixed(2).padStart(7)}% | ${String(r.popB).padStart(2)}/12   | ${String(r.fQn).padStart(4)} | ${String(r.lQn).padStart(4)}`,
  );
}
