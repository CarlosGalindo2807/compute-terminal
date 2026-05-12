// Audit /markets in production: pull the page, extract the data the user
// actually sees, and cross-check against gpu_prices_daily + price_snapshots
// to surface inconsistencies.

const ORIGIN = 'https://compute-terminal.vercel.app';

console.log('=== 1. Fetch /markets HTML + latency ===');
const t0 = Date.now();
const r = await fetch(ORIGIN + '/markets');
const html = await r.text();
const t1 = Date.now();
console.log(`status: ${r.status} · len: ${html.length} · latency: ${t1 - t0}ms`);
console.log(`x-vercel-cache: ${r.headers.get('x-vercel-cache')}`);
console.log(`age: ${r.headers.get('age')}`);

// Look for the rendered rows. The MarketsTable component emits <tr> elements
// with GPU name + current price + change + provider count + sparkline.
console.log('\n=== 2. Extract rendered rows (first 12) ===');
// Each row in /markets is a <tr> with the GPU name in a slug-anchored <a>
// or as plain text. The data shape is in the page source as React Server
// Components output — strip JSX-encoded structure and grab the row data.
const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
let m;
let count = 0;
while ((m = rowRe.exec(html)) && count < 14) {
  const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) =>
    c[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  );
  if (cells.length === 0) continue;
  console.log(`  row ${count}: ${cells.join(' | ')}`);
  count++;
}

// Pull the JSON-ish data embedded in the React Flight payload — gives us
// raw current / change_pct without the formatter rounding.
console.log('\n=== 3. Look for change-pct values (post-format) ===');
const pctMatches = [...html.matchAll(/([\+\-]?\d+\.\d{1,3}\s*%)/g)].slice(0, 30);
console.log('first 30 % values seen on page:', pctMatches.map((m) => m[1]).join(' · '));

// Latency by component: time the homepage similarly
console.log('\n=== 4. Compare to landing latency ===');
const tLand0 = Date.now();
const lr = await fetch(ORIGIN + '/');
await lr.text();
const tLand1 = Date.now();
console.log(`/  latency: ${tLand1 - tLand0}ms · x-vercel-cache: ${lr.headers.get('x-vercel-cache')}`);

// Compare /markets and landing ticker numbers for the SAME GPUs.
console.log('\n=== 5. /markets vs landing ticker — same GPU same number? ===');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };

// Landing ticker reads gpu_prices_daily — same methodology both endpoints.
// /markets reads price_snapshots — current = mean of last hour, change_pct =
// (current - earliest) / earliest where earliest is first snapshot in 24h.
// Different aggregations on the same underlying data.
const targets = ['h100-sxm-80', 'rtx-5090', 'rtx-4090', 'b200-sxm', 'v100-sxm2'];
for (const slug of targets) {
  const [g] = await (await fetch(url + '/rest/v1/gpu_models?select=id&slug=eq.' + slug, { headers: h })).json();
  if (!g) {
    console.log(`  ${slug}: not in catalog`);
    continue;
  }
  // Ticker / gpu_prices_daily side
  const dailyRows = await (await fetch(
    url + '/rest/v1/gpu_prices_daily?select=date,vwap&gpu_model_id=eq.' + g.id + '&order=date.desc&limit=2',
    { headers: h },
  )).json();
  const tickerLatest = dailyRows[0]?.vwap ?? null;
  const tickerPrev = dailyRows[1]?.vwap ?? null;
  const tickerDelta = tickerPrev > 0 ? ((tickerLatest - tickerPrev) / tickerPrev) * 100 : null;

  // /markets side: mean of last 1h price_snapshots, change vs first snap in 24h
  const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
  const since1 = new Date(Date.now() - 1 * 3600_000).toISOString();
  const [asc, desc] = await Promise.all([
    fetch(
      url +
        '/rest/v1/price_snapshots?select=price_per_hour,captured_at&gpu_model_id=eq.' +
        g.id +
        '&is_outlier=eq.false&is_normalized=eq.true&captured_at=gte.' +
        since24 +
        '&order=captured_at.asc&limit=1',
      { headers: h },
    ).then((r) => r.json()),
    fetch(
      url +
        '/rest/v1/price_snapshots?select=price_per_hour,captured_at&gpu_model_id=eq.' +
        g.id +
        '&is_outlier=eq.false&is_normalized=eq.true&captured_at=gte.' +
        since1 +
        '&order=captured_at.desc&limit=200',
      { headers: h },
    ).then((r) => r.json()),
  ]);
  const earliest = asc[0]?.price_per_hour ? Number(asc[0].price_per_hour) : null;
  const last1hPrices = desc.map((s) => Number(s.price_per_hour));
  const last1hMean = last1hPrices.length > 0 ? last1hPrices.reduce((a, b) => a + b, 0) / last1hPrices.length : null;
  const marketsDelta = earliest && last1hMean ? ((last1hMean - earliest) / earliest) * 100 : null;

  console.log(
    `  ${slug.padEnd(14)} · ticker: $${tickerLatest?.toFixed(3) ?? '—'} Δ${tickerDelta?.toFixed(2) ?? '—'}% · /markets: $${last1hMean?.toFixed(3) ?? '—'} Δ${marketsDelta?.toFixed(2) ?? '—'}% (earliest 24h: $${earliest?.toFixed(3) ?? '—'})`,
  );
}
