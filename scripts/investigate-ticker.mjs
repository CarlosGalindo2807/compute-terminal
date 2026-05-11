// Audit the ticker: print what's rendered + what SHOULD be rendered
// from raw Supabase data, so we can spot the bugs.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };

console.log('=== 1. Compute indices (CTI-*) latest close_price ===\n');
const r1 = await fetch(url + '/rest/v1/compute_indices?select=id,slug,name', { headers: h });
const indices = await r1.json();
for (const idx of indices) {
  const r = await fetch(
    url +
      '/rest/v1/index_values_daily?index_id=eq.' +
      idx.id +
      '&select=date,close_price,vwap,num_observations&order=date.desc&limit=3',
    { headers: h },
  );
  const vals = await r.json();
  console.log(`${idx.slug.padEnd(15)} ·`, vals.map((v) => `${v.date} close=$${Number(v.close_price).toFixed(3)} vwap=$${Number(v.vwap).toFixed(3)} n=${v.num_observations}`).join(' | '));
}

console.log('\n=== 2. Top 10 GPUs by 24h activity — first-hour vs last-hour median ===\n');
const since24Ms = Date.now() - 24 * 3600_000;
const sinceLastMs = Date.now() - 3600_000;
const sinceFirstMs = since24Ms;
const since24 = new Date(since24Ms).toISOString();
const sinceLast = new Date(sinceLastMs).toISOString();

const r2 = await fetch(url + '/rest/v1/gpu_models?is_active=eq.true&select=id,slug,model,variant', { headers: h });
const gpus = await r2.json();

// One bulk pull
const r3 = await fetch(
  url +
    '/rest/v1/price_snapshots?is_outlier=eq.false&is_normalized=eq.true&currency=eq.USD&captured_at=gte.' +
    since24 +
    '&select=gpu_model_id,price_per_hour,captured_at&limit=20000',
  { headers: h },
);
const snaps = await r3.json();
console.log('snaps in window: ' + snaps.length + '\n');

const byGpu = new Map();
for (const s of snaps) {
  const arr = byGpu.get(s.gpu_model_id) ?? [];
  arr.push({ p: Number(s.price_per_hour), t: new Date(s.captured_at).getTime() });
  byGpu.set(s.gpu_model_id, arr);
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

const rows = [];
for (const g of gpus) {
  const arr = byGpu.get(g.id);
  if (!arr || arr.length < 10) continue;
  arr.sort((a, b) => a.t - b.t);
  const firstHourEnd = arr[0].t + 3600_000;
  const lastHourStart = arr[arr.length - 1].t - 3600_000;
  const firstHour = arr.filter((x) => x.t <= firstHourEnd).map((x) => x.p);
  const lastHour = arr.filter((x) => x.t >= lastHourStart).map((x) => x.p);
  if (firstHour.length === 0 || lastHour.length === 0) continue;
  const m24 = median(arr.map((x) => x.p));
  const mFirst = median(firstHour);
  const mLast = median(lastHour);
  const delta = mFirst > 0 ? ((mLast - mFirst) / mFirst) * 100 : 0;
  rows.push({
    label: `${g.model}${g.variant ? ' ' + g.variant : ''}`,
    n: arr.length,
    median24: m24,
    firstHour: mFirst,
    lastHour: mLast,
    delta24h: delta,
  });
}

rows.sort((a, b) => b.n - a.n);
for (const r of rows.slice(0, 12)) {
  console.log(
    r.label.padEnd(28),
    `n=${String(r.n).padStart(4)}`,
    `24h-med=$${r.median24.toFixed(2)}`.padEnd(14),
    `first-h=$${r.firstHour.toFixed(2)}`.padEnd(14),
    `last-h=$${r.lastHour.toFixed(2)}`.padEnd(14),
    `Δ24h=${r.delta24h >= 0 ? '+' : ''}${r.delta24h.toFixed(2)}%`,
  );
}

console.log('\n=== 3. What the ticker SHOULD show (next pass) vs what current loader produces ===');
console.log('\ncurrent loader bug: delta uses iteration-order firstP, not actual first-hour median.');
console.log('with bug, deltas are essentially noise. fix = compute real first-hour vs last-hour.\n');
