import { notFound } from 'next/navigation';
import { Nav } from '@/components/nav';
import { IndexChart } from '@/components/index-chart';
import { formatPrice, formatPctChange } from '@compute-terminal/shared/formatters';
import { getServiceClient } from '@/lib/supabase-server';

export const revalidate = 60;

export default async function IndexDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = getServiceClient();
  const { data: idx } = await sb.from('compute_indices').select('*').eq('slug', slug).maybeSingle();
  if (!idx) notFound();

  const { data: history } = await sb
    .from('index_values_daily')
    .select('date, vwap, methodology_used, methodology_version, num_observations, num_providers, confidence_score')
    .eq('index_id', idx.id)
    .order('date', { ascending: true })
    .limit(90);

  const rows = history ?? [];
  const chartPoints = rows
    .map((r) => ({
      date: r.date as string,
      vwap: Number(r.vwap),
      methodology_version: (r.methodology_version as string | null) ?? null,
    }))
    .filter((p) => Number.isFinite(p.vwap));

  const latest = chartPoints.at(-1)?.vwap ?? NaN;
  const earliest = chartPoints[0]?.vwap ?? NaN;
  const delta = earliest && earliest > 0 ? (latest - earliest) / earliest : NaN;
  const positive = delta >= 0;

  // Watermark = the most-recent row's stamped methodology, falling back to v1.0
  // (the published version) so the chart always carries an attribution.
  const latestVersion = (rows.at(-1)?.methodology_version as string | undefined) ?? 'v1.0';
  const latestFormula = (rows.at(-1)?.methodology_used as string | undefined) ?? 'filtered_vwap';
  const watermark = `${latestVersion} · ${latestFormula}`;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="mono text-2xs uppercase tracking-widest text-ink-muted">Compute Index</p>
        <h1 className="display text-4xl">{idx.name}</h1>
        <p className="text-ink-secondary mt-1">{idx.description}</p>

        <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded border border-bg-border bg-bg-border">
          <div className="bg-bg-surface p-5">
            <div className="mono text-2xs uppercase tracking-wider text-ink-muted">Latest</div>
            <div className="display mt-1 text-3xl">{formatPrice(latest ?? 0)}</div>
          </div>
          <div className="bg-bg-surface p-5">
            <div className="mono text-2xs uppercase tracking-wider text-ink-muted">90d change</div>
            <div className={`display mt-1 text-3xl ${positive ? 'text-signal-pos' : 'text-signal-neg'}`}>
              {Number.isFinite(delta) ? formatPctChange(delta) : '—'}
            </div>
          </div>
          <div className="bg-bg-surface p-5">
            <div className="mono text-2xs uppercase tracking-wider text-ink-muted">Methodology</div>
            <div className="display mt-1 text-3xl">{latestVersion}</div>
            <div className="mono mt-1 text-2xs uppercase tracking-wider text-ink-muted">
              {latestFormula}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded border border-bg-border bg-bg-surface p-3">
          <IndexChart values={chartPoints} watermark={watermark} positive={positive} />
        </div>

        <h2 className="display mt-12 text-2xl">Methodology</h2>
        <pre className="mt-3 overflow-x-auto rounded border border-bg-border bg-bg-surface p-4 mono text-xs text-ink-secondary">
          {JSON.stringify(idx.methodology, null, 2)}
        </pre>

        <h2 className="display mt-12 text-2xl">History</h2>
        <table className="mt-3 w-full text-sm tabular">
          <thead className="bg-bg-surface text-2xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-right">VWAP</th>
              <th className="px-3 py-2 text-left">Methodology</th>
              <th className="px-3 py-2 text-right">N</th>
              <th className="px-3 py-2 text-right">Providers</th>
              <th className="px-3 py-2 text-right">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border">
            {(history ?? []).slice().reverse().map((r) => (
              <tr key={r.date}>
                <td className="px-3 py-2 mono">{r.date}</td>
                <td className="px-3 py-2 text-right mono">{formatPrice(Number(r.vwap ?? 0))}</td>
                <td className="px-3 py-2 mono text-ink-secondary">{r.methodology_used ?? '—'}</td>
                <td className="px-3 py-2 text-right mono">{r.num_observations ?? '—'}</td>
                <td className="px-3 py-2 text-right mono">{r.num_providers ?? '—'}</td>
                <td className="px-3 py-2 text-right mono">{r.confidence_score?.toFixed(2) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}
