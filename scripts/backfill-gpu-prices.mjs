// One-shot backfill of gpu_prices_daily for the last 30 days.
// Applies filtered_vwap v1.0 (the locked methodology) to historical
// price_snapshots, exactly as the nightly gpu-price-calculator would.
//
// Why backfill: the ticker sparkline needs 14 days of history. Without
// backfill, the sparkline takes 14 nightly runs to populate. Major
// indices (MSCI, S&P, Bloomberg Commodity) routinely back-compute a new
// methodology over historical data and publish the resulting time series
// labeled with the methodology version — that's the standard practice
// for benchmark inception. methodology_used + methodology_version on
// every backfilled row preserves the audit trail (every row is stamped
// filtered_vwap v1.0).
//
// Skip rule mirrors the cron: GPU + day with < 5 eligible obs writes
// nothing. ASC+DESC merge mirrors the ticker loader to handle high-volume
// GPUs that exceed PostgREST's 1000-row cap.
//
// Run with: node --env-file=.env scripts/backfill-gpu-prices.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };

const DAYS = 30;
const MIN_OBS = 5;
const RELIABILITY_FLOOR = 0.5;
const MAD_SIGMA = 3;
const METHODOLOGY = 'filtered_vwap';
const METHODOLOGY_VERSION = 'v1.0';

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

// filtered_vwap: MAD-3σ filter on prices, then num_gpus-weighted mean.
function filteredVwap(rows) {
  if (rows.length === 0) return { value: NaN, kept: [] };
  const prices = rows.map((r) => r.price);
  const m = median(prices);
  const d = mad(prices) || 1e-9;
  const kept = rows.filter((r) => Math.abs(r.price - m) <= MAD_SIGMA * d);
  let sumW = 0;
  let sumPV = 0;
  for (const k of kept) {
    sumW += k.numGpus;
    sumPV += k.price * k.numGpus;
  }
  return { value: sumW > 0 ? sumPV / sumW : NaN, kept };
}

function trimmedMean10(rows) {
  if (rows.length < 5) return filteredVwap(rows).value;
  const sorted = [...rows].sort((a, b) => a.price - b.price);
  const cut = Math.floor(sorted.length * 0.1);
  const kept = sorted.slice(cut, sorted.length - cut);
  const sum = kept.reduce((a, r) => a + r.price, 0);
  return sum / kept.length;
}

console.log('Loading active GPUs and provider reliability...');
const [gpusR, provR] = await Promise.all([
  fetch(url + '/rest/v1/gpu_models?select=id,slug&is_active=eq.true', { headers: h }),
  fetch(url + '/rest/v1/providers?select=id,reliability_score', { headers: h }),
]);
const gpus = await gpusR.json();
const providers = await provR.json();
const reliabilityById = new Map(providers.map((p) => [p.id, Number(p.reliability_score)]));
console.log(`Active GPUs: ${gpus.length} · Providers: ${providers.length}`);

let totalComputed = 0;
let totalSkipped = 0;
const tStart = Date.now();

// Match the cron convention: row labeled D contains the 24h window
// [D - 24h, D] = the day before D's data. So the row labeled 2026-05-12
// is what the cron would have published at 00:30 UTC on 2026-05-12 and
// reflects 2026-05-11's price activity. Iterate today → 30 days back so
// the freshest (and most-likely-queried) rows land first.
const todayUTC = new Date();
todayUTC.setUTCHours(0, 0, 0, 0);

for (let d = 0; d <= DAYS; d++) {
  const pubDate = new Date(todayUTC.getTime() - d * 24 * 3600_000);
  const dayStart = new Date(pubDate.getTime() - 24 * 3600_000);
  const dayEnd = pubDate;
  const dateStr = pubDate.toISOString().slice(0, 10);
  const sinceISO = dayStart.toISOString();
  const untilISO = dayEnd.toISOString();

  let dayComputed = 0;
  let daySkipped = 0;

  // 28 GPUs in parallel for this day. ASC + DESC per GPU to handle the
  // PostgREST 1000-row cap on high-volume GPUs.
  await Promise.all(
    gpus.map(async (g) => {
      const base =
        url +
        '/rest/v1/price_snapshots?select=id,price_per_hour,num_gpus,captured_at,provider_id&gpu_model_id=eq.' +
        g.id +
        '&is_outlier=eq.false&is_normalized=eq.true&currency=eq.USD&captured_at=gte.' +
        sinceISO +
        '&captured_at=lt.' +
        untilISO +
        '&limit=1000';
      const [asc, desc] = await Promise.all([
        fetch(base + '&order=captured_at.asc', { headers: h }).then((r) => r.json()),
        fetch(base + '&order=captured_at.desc', { headers: h }).then((r) => r.json()),
      ]);
      const seen = new Set();
      const all = [];
      for (const r of [...asc, ...desc]) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        all.push(r);
      }

      const eligible = all.filter(
        (s) => (reliabilityById.get(s.provider_id) ?? 0) >= RELIABILITY_FLOOR,
      );
      if (eligible.length < MIN_OBS) {
        daySkipped += 1;
        return;
      }

      const rows = eligible.map((s) => ({
        price: Number(s.price_per_hour),
        numGpus: Number(s.num_gpus),
        capturedAt: s.captured_at,
        providerId: s.provider_id,
      }));
      const fv = filteredVwap(rows);
      if (!Number.isFinite(fv.value)) {
        daySkipped += 1;
        return;
      }

      const byTime = [...eligible].sort(
        (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime(),
      );
      const sortedPrices = rows.map((r) => r.price).sort((a, b) => a - b);
      const numProviders = new Set(eligible.map((s) => s.provider_id)).size;
      const contributingProviderIds = Array.from(new Set(eligible.map((s) => s.provider_id)));

      const body = {
        gpu_model_id: g.id,
        date: dateStr,
        open_price: Number(byTime[0].price_per_hour),
        high_price: sortedPrices[sortedPrices.length - 1],
        low_price: sortedPrices[0],
        close_price: Number(byTime[byTime.length - 1].price_per_hour),
        vwap: fv.value,
        median_price: sortedPrices[Math.floor(sortedPrices.length / 2)],
        trimmed_mean: trimmedMean10(rows),
        num_observations: rows.length,
        num_providers: numProviders,
        methodology_used: METHODOLOGY,
        methodology_version: METHODOLOGY_VERSION,
        methodology_locked: true,
        contributing_provider_ids: contributingProviderIds,
      };

      const up = await fetch(url + '/rest/v1/gpu_prices_daily', {
        method: 'POST',
        headers: {
          ...h,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(body),
      });
      if (!up.ok) {
        console.error(`[${dateStr} · ${g.slug}] upsert failed: ${up.status} ${await up.text()}`);
        return;
      }
      dayComputed += 1;
    }),
  );

  totalComputed += dayComputed;
  totalSkipped += daySkipped;
  console.log(`${dateStr}: ${dayComputed} computed · ${daySkipped} skipped`);
}

console.log(
  `\nDone in ${((Date.now() - tStart) / 1000).toFixed(1)}s · ${totalComputed} rows written · ${totalSkipped} (gpu × day) pairs skipped (< ${MIN_OBS} obs).`,
);
