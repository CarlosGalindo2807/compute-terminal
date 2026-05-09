import { notFound } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Sparkline } from '@/components/sparkline';
import { formatPrice, formatRelativeTime } from '@compute-terminal/shared/formatters';
import { getServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function GpuDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = getServiceClient();
  const { data: gpu } = await sb.from('gpu_models').select('*').eq('slug', slug).maybeSingle();
  if (!gpu) notFound();

  const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const { data: snaps } = await sb
    .from('price_snapshots')
    .select('price_per_hour, captured_at, provider_id')
    .eq('gpu_model_id', gpu.id)
    .eq('is_outlier', false)
    .gte('captured_at', since)
    .order('captured_at', { ascending: true });

  const { data: providers } = await sb.from('providers').select('id, name, slug');
  const providerById = new Map((providers ?? []).map((p) => [p.id, p]));

  const byProvider = new Map<string, Array<{ price: number; t: number }>>();
  for (const s of snaps ?? []) {
    const arr = byProvider.get(s.provider_id) ?? [];
    arr.push({ price: Number(s.price_per_hour), t: new Date(s.captured_at).getTime() });
    byProvider.set(s.provider_id, arr);
  }

  const overall = (snaps ?? []).map((s) => Number(s.price_per_hour));
  const current = overall.length ? overall[overall.length - 1] : NaN;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="display text-4xl">{gpu.model}{gpu.variant ? ` · ${gpu.variant}` : ''}</h1>
        <p className="mono text-2xs uppercase tracking-widest text-ink-muted">
          {gpu.manufacturer} · {gpu.vram_gb} GB · {gpu.generation ?? '—'}
        </p>
        <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded border border-bg-border bg-bg-border">
          <div className="bg-bg-surface p-5">
            <div className="mono text-2xs uppercase tracking-wider text-ink-muted">Current</div>
            <div className="display mt-1 text-3xl">{formatPrice(current ?? 0)}</div>
          </div>
          <div className="bg-bg-surface p-5">
            <div className="mono text-2xs uppercase tracking-wider text-ink-muted">7d trend</div>
            <div className="mt-2"><Sparkline values={overall.slice(-100)} width={200} height={36} positive /></div>
          </div>
          <div className="bg-bg-surface p-5">
            <div className="mono text-2xs uppercase tracking-wider text-ink-muted">Reference</div>
            <div className="display mt-1 text-3xl text-ink-secondary">{formatPrice(Number(gpu.reference_price_per_hour ?? 0))}</div>
          </div>
        </div>

        <h2 className="display mt-12 text-2xl">By provider</h2>
        <table className="mt-3 w-full text-sm tabular">
          <thead className="bg-bg-surface text-2xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-3 py-2 text-left">Provider</th>
              <th className="px-3 py-2 text-right">$/hr</th>
              <th className="px-3 py-2 text-right">Last seen</th>
              <th className="px-3 py-2 text-right">Samples (7d)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border">
            {Array.from(byProvider.entries())
              .sort((a, b) => (a[1].at(-1)?.price ?? 0) - (b[1].at(-1)?.price ?? 0))
              .map(([pid, arr]) => {
                const last = arr.at(-1)!;
                const provider = providerById.get(pid);
                return (
                  <tr key={pid}>
                    <td className="px-3 py-2">{provider?.name ?? pid}</td>
                    <td className="px-3 py-2 text-right mono">{formatPrice(last.price)}</td>
                    <td className="px-3 py-2 text-right text-ink-secondary mono">{formatRelativeTime(new Date(last.t).toISOString())}</td>
                    <td className="px-3 py-2 text-right text-ink-secondary mono">{arr.length}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </main>
    </>
  );
}
