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

async function loadMarkets(): Promise<Row[]> {
  const sb = getServiceClient();
  const { data: gpus } = await sb
    .from('gpu_models')
    .select('id, slug, model, variant, vram_gb')
    .eq('is_active', true)
    .order('reference_price_per_hour', { ascending: false });

  const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
  const since1 = new Date(Date.now() - 1 * 3600_000).toISOString();

  const out: Row[] = [];
  for (const g of gpus ?? []) {
    const { data: snaps } = await sb
      .from('price_snapshots')
      .select('price_per_hour, captured_at, provider_id')
      .eq('gpu_model_id', g.id)
      .eq('is_outlier', false)
      .gte('captured_at', since24)
      .order('captured_at', { ascending: true });

    if (!snaps || snaps.length === 0) {
      out.push({
        gpu_id: g.id,
        slug: g.slug,
        name: `${g.model}${g.variant ? ' ' + g.variant : ''}`,
        vram: g.vram_gb,
        current: NaN,
        change_pct: NaN,
        num_providers: 0,
        spark: [],
      });
      continue;
    }

    const recent = snaps.filter((s) => s.captured_at >= since1).map((s) => Number(s.price_per_hour));
    const current = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : Number(snaps[snaps.length - 1]!.price_per_hour);
    const earliest = Number(snaps[0]!.price_per_hour);
    const change_pct = earliest > 0 ? (current - earliest) / earliest : NaN;

    const buckets = 24;
    const interval = (24 * 3600_000) / buckets;
    const start = Date.now() - 24 * 3600_000;
    const spark: number[] = [];
    for (let i = 0; i < buckets; i++) {
      const lo = start + i * interval;
      const hi = lo + interval;
      const inside = snaps.filter((s) => {
        const t = new Date(s.captured_at).getTime();
        return t >= lo && t < hi;
      });
      spark.push(
        inside.length > 0
          ? inside.reduce((a, s) => a + Number(s.price_per_hour), 0) / inside.length
          : (spark[spark.length - 1] ?? current),
      );
    }

    const providers = new Set(snaps.map((s) => s.provider_id));
    out.push({
      gpu_id: g.id,
      slug: g.slug,
      name: `${g.model}${g.variant ? ' ' + g.variant : ''}`,
      vram: g.vram_gb,
      current,
      change_pct,
      num_providers: providers.size,
      spark,
    });
  }
  return out;
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
