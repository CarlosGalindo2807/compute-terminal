import { Nav } from '@/components/nav';
import { Sparkline } from '@/components/sparkline';
import { formatPrice, formatPctChange } from '@compute-terminal/shared/formatters';
import {
  PUBLISHED_METHODOLOGY,
  methodologies,
  type MethodologyInput,
} from '@compute-terminal/shared/methodology';
import { getServiceClient } from '@/lib/supabase-server';

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
  price_per_hour: number;
  num_gpus: number;
  captured_at: string;
  provider_id: string;
}

// /markets shows methodology-consistent prices end-to-end:
//   current   = filtered_vwap v1.0 over trailing 24h of eligible snapshots
//   prevClose = latest gpu_prices_daily.vwap row for the same GPU
//   change_pct = (current − prevClose) / prevClose
// Same formula at both endpoints means provider-mix bias cancels by
// construction. Previous shape — current = mean of last 1h, change vs the
// oldest snapshot in 24h — surfaced cross-provider spread as fake movement
// (B200·SXM showed −34.12% on /markets while the landing ticker said
// −24.98% for the same GPU on the same day; the +73% / +84% / +155%
// numbers observed in the audit were entirely a sample-composition artifact).
// Bloomberg / Refinitiv use the same shape: Last + Prev Close + % Change.
//
// Per-GPU ASC+DESC fetches handle the PostgREST 1000-row cap. Reliability +
// MIN_OBS gates match the nightly gpu-price-calculator so the numbers shown
// here would reproduce the gpu_prices_daily row exactly if the cron were to
// run "now".
async function loadMarkets(): Promise<Row[]> {
  const sb = getServiceClient();
  const since24Ms = Date.now() - 24 * 3600_000;
  const since24 = new Date(since24Ms).toISOString();

  const [{ data: gpus }, { data: providersRows }] = await Promise.all([
    sb
      .from('gpu_models')
      .select('id, slug, model, variant, vram_gb')
      .eq('is_active', true)
      .order('reference_price_per_hour', { ascending: false }),
    sb.from('providers').select('id, reliability_score'),
  ]);
  const reliabilityById = new Map<string, number>(
    (providersRows ?? []).map((p) => [p.id as string, Number(p.reliability_score)]),
  );

  const buckets = 24;
  const bucketMs = (24 * 3600_000) / buckets;

  const results = await Promise.all(
    (gpus ?? []).map(async (g) => {
      const [ascR, descR, dailyR] = await Promise.all([
        sb
          .from('price_snapshots')
          .select('id, price_per_hour, num_gpus, captured_at, provider_id')
          .eq('gpu_model_id', g.id)
          .eq('is_outlier', false)
          .eq('is_normalized', true)
          .eq('currency', 'USD')
          .gte('captured_at', since24)
          .order('captured_at', { ascending: true })
          .limit(1000),
        sb
          .from('price_snapshots')
          .select('id, price_per_hour, num_gpus, captured_at, provider_id')
          .eq('gpu_model_id', g.id)
          .eq('is_outlier', false)
          .eq('is_normalized', true)
          .eq('currency', 'USD')
          .gte('captured_at', since24)
          .order('captured_at', { ascending: false })
          .limit(1000),
        sb
          .from('gpu_prices_daily')
          .select('vwap')
          .eq('gpu_model_id', g.id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const seen = new Set<string>();
      const snaps: Snap[] = [];
      for (const r of [...(ascR.data ?? []), ...(descR.data ?? [])]) {
        const id = r.id as string;
        if (seen.has(id)) continue;
        seen.add(id);
        snaps.push({
          price_per_hour: Number(r.price_per_hour),
          num_gpus: Number(r.num_gpus),
          captured_at: r.captured_at as string,
          provider_id: r.provider_id as string,
        });
      }
      snaps.sort((a, b) => a.captured_at.localeCompare(b.captured_at));
      const name = `${g.model}${g.variant ? ' ' + g.variant : ''}`;

      const eligible = snaps.filter(
        (s) => (reliabilityById.get(s.provider_id) ?? 0) >= PUBLISHED_METHODOLOGY.reliabilityFloor,
      );
      const providers = new Set(eligible.map((s) => s.provider_id));

      if (eligible.length < PUBLISHED_METHODOLOGY.minObservations) {
        return {
          gpu_id: g.id,
          slug: g.slug,
          name,
          vram: g.vram_gb,
          current: NaN,
          change_pct: NaN,
          num_providers: providers.size,
          spark: [],
        } satisfies Row;
      }

      const inputs: MethodologyInput[] = eligible.map((s) => ({
        pricePerHour: s.price_per_hour,
        numGpus: s.num_gpus,
        capturedAt: new Date(s.captured_at),
        providerReliability: reliabilityById.get(s.provider_id) ?? 1,
      }));
      const live = methodologies[PUBLISHED_METHODOLOGY.formulaId](inputs);
      const current = Number.isFinite(live.value) ? live.value : NaN;

      const prevClose = dailyR.data?.vwap != null ? Number(dailyR.data.vwap) : NaN;
      const change_pct =
        Number.isFinite(current) && Number.isFinite(prevClose) && prevClose > 0
          ? (current - prevClose) / prevClose
          : NaN;

      // Sparkline: intra-day texture from the same eligible set. 24 buckets
      // of bucket-mean (not methodology-filtered) — purely visual.
      const sparkSum = new Array<number>(buckets).fill(0);
      const sparkCount = new Array<number>(buckets).fill(0);
      for (const s of eligible) {
        const t = new Date(s.captured_at).getTime();
        const idx = Math.min(buckets - 1, Math.max(0, Math.floor((t - since24Ms) / bucketMs)));
        sparkSum[idx]! += s.price_per_hour;
        sparkCount[idx]! += 1;
      }
      const spark: number[] = [];
      let lastSeen = Number.isFinite(current) ? current : NaN;
      for (let i = 0; i < buckets; i++) {
        if (sparkCount[i]! > 0) {
          lastSeen = sparkSum[i]! / sparkCount[i]!;
        }
        spark.push(lastSeen);
      }

      return {
        gpu_id: g.id,
        slug: g.slug,
        name,
        vram: g.vram_gb,
        current,
        change_pct,
        num_providers: providers.size,
        spark: spark.every(Number.isFinite) ? spark : [],
      } satisfies Row;
    }),
  );

  return results;
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
