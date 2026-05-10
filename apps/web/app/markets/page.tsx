import { Nav } from '@/components/nav';
import { Sparkline } from '@/components/sparkline';
import { formatPrice, formatPctChange } from '@compute-terminal/shared/formatters';
import { getServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 30;

interface Row {
  gpu_id: string;
  slug: string;
  name: string;
  vram: number;
  current: number;
  change_pct: number;
  num_providers: number;
  spark: number[];
}

interface Snap {
  gpu_model_id: string;
  price_per_hour: number;
  captured_at: string;
  provider_id: string;
}

async function loadMarkets(): Promise<Row[]> {
  const sb = getServiceClient();
  const since24Ms = Date.now() - 24 * 3600_000;
  const since1Ms = Date.now() - 1 * 3600_000;
  const since24 = new Date(since24Ms).toISOString();

  // Two queries total: GPUs catalog + all eligible snapshots in window.
  // Replaces a per-GPU loop (was 28 sequential round-trips).
  const [{ data: gpus }, { data: snapsAll }] = await Promise.all([
    sb
      .from('gpu_models')
      .select('id, slug, model, variant, vram_gb')
      .eq('is_active', true)
      .order('reference_price_per_hour', { ascending: false }),
    sb
      .from('price_snapshots')
      .select('gpu_model_id, price_per_hour, captured_at, provider_id')
      .eq('is_outlier', false)
      .eq('is_normalized', true)
      .gte('captured_at', since24)
      .order('captured_at', { ascending: true })
      .limit(50_000),
  ]);

  // Group snapshots by gpu_model_id once. O(N) instead of O(GPUs × N).
  const byGpu = new Map<string, Snap[]>();
  for (const s of (snapsAll as Snap[] | null) ?? []) {
    if (!s.gpu_model_id) continue;
    const arr = byGpu.get(s.gpu_model_id);
    if (arr) arr.push(s);
    else byGpu.set(s.gpu_model_id, [s]);
  }

  const buckets = 24;
  const bucketMs = (24 * 3600_000) / buckets;

  return (gpus ?? []).map((g) => {
    const snaps = byGpu.get(g.id) ?? [];
    const name = `${g.model}${g.variant ? ' ' + g.variant : ''}`;

    if (snaps.length === 0) {
      return { gpu_id: g.id, slug: g.slug, name, vram: g.vram_gb, current: NaN, change_pct: NaN, num_providers: 0, spark: [] };
    }

    // Single linear pass: compute earliest, last hour avg, sparkline buckets,
    // and provider set without re-scanning the snapshots array each time.
    const sparkSum = new Array<number>(buckets).fill(0);
    const sparkCount = new Array<number>(buckets).fill(0);
    let recentSum = 0;
    let recentCount = 0;
    const providers = new Set<string>();

    for (const s of snaps) {
      const t = new Date(s.captured_at).getTime();
      const idx = Math.min(buckets - 1, Math.max(0, Math.floor((t - since24Ms) / bucketMs)));
      const p = Number(s.price_per_hour);
      sparkSum[idx]! += p;
      sparkCount[idx]! += 1;
      if (t >= since1Ms) {
        recentSum += p;
        recentCount += 1;
      }
      providers.add(s.provider_id);
    }

    const earliest = Number(snaps[0]!.price_per_hour);
    const lastPrice = Number(snaps[snaps.length - 1]!.price_per_hour);
    const current = recentCount > 0 ? recentSum / recentCount : lastPrice;
    const change_pct = earliest > 0 ? (current - earliest) / earliest : NaN;

    const spark: number[] = [];
    let lastSeen = current;
    for (let i = 0; i < buckets; i++) {
      if (sparkCount[i]! > 0) {
        lastSeen = sparkSum[i]! / sparkCount[i]!;
        spark.push(lastSeen);
      } else {
        spark.push(lastSeen);
      }
    }

    return { gpu_id: g.id, slug: g.slug, name, vram: g.vram_gb, current, change_pct, num_providers: providers.size, spark };
  });
}

export default async function MarketsPage() {
  const rows = await loadMarkets();
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-baseline justify-between">
          <h1 className="display text-3xl">Markets</h1>
          <p className="mono text-2xs uppercase tracking-widest text-ink-muted">
            updated · {new Date().toUTCString().slice(17, 25)} UTC
          </p>
        </div>
        <div className="mt-6 overflow-hidden rounded border border-bg-border">
          <table className="w-full text-sm tabular">
            <thead className="bg-bg-surface text-2xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">GPU</th>
                <th className="px-4 py-3 text-right font-medium">VRAM</th>
                <th className="px-4 py-3 text-right font-medium">$/hour</th>
                <th className="px-4 py-3 text-right font-medium">24h</th>
                <th className="px-4 py-3 text-center font-medium">Trend</th>
                <th className="px-4 py-3 text-right font-medium">Providers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border bg-bg-base">
              {rows.map((r) => {
                const positive = r.change_pct >= 0;
                return (
                  <tr key={r.gpu_id} className="hover:bg-bg-surface">
                    <td className="px-4 py-3">
                      <a href={`/gpu/${r.slug}`} className="text-ink-primary hover:text-accent">
                        {r.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right text-ink-secondary mono">{r.vram} GB</td>
                    <td className="px-4 py-3 text-right mono">{formatPrice(r.current)}</td>
                    <td className={`px-4 py-3 text-right mono ${Number.isFinite(r.change_pct) ? (positive ? 'text-signal-pos' : 'text-signal-neg') : 'text-ink-muted'}`}>
                      {Number.isFinite(r.change_pct) ? formatPctChange(r.change_pct) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-block">
                        {r.spark.length > 0 ? <Sparkline values={r.spark} positive={positive} /> : <span className="text-ink-muted">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-ink-secondary mono">{r.num_providers}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
