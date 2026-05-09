import Link from 'next/link';
import { Sparkline } from '@/components/sparkline';
import { getServiceClient } from '@/lib/supabase-server';
import { formatRelativeTime } from '@compute-terminal/shared/formatters';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  const sb = getServiceClient();
  const since1 = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();

  const [
    { count: snaps1h },
    { count: pendingUnmatched },
    { data: providers },
    { data: candidates },
    { data: drafts },
    { data: recentEvents },
    { data: metrics },
  ] = await Promise.all([
    sb.from('price_snapshots').select('*', { count: 'exact', head: true }).gte('captured_at', since1),
    sb.from('unmatched_listings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('providers').select('slug, name, reliability_score, consecutive_failures, last_success_at').order('reliability_score', { ascending: false }),
    sb.from('provider_candidates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('generated_content').select('*', { count: 'exact', head: true }).in('status', ['draft', 'approved']),
    sb.from('system_events').select('event_type, source, occurred_at, payload').gte('occurred_at', since24).order('occurred_at', { ascending: false }).limit(15),
    sb.from('system_health_metrics').select('*').gte('recorded_at', since24).order('recorded_at', { ascending: true }),
  ]);

  const sparkBy = new Map<string, number[]>();
  for (const m of metrics ?? []) {
    const arr = sparkBy.get(m.metric_name) ?? [];
    arr.push(Number(m.metric_value));
    sparkBy.set(m.metric_name, arr);
  }

  const card = (label: string, value: React.ReactNode, sub?: React.ReactNode, sparkKey?: string) => (
    <div className="bg-bg-surface p-5">
      <div className="mono text-2xs uppercase tracking-wider text-ink-muted">{label}</div>
      <div className="display mt-1 text-3xl">{value}</div>
      {sub && <div className="mt-1 text-2xs text-ink-muted">{sub}</div>}
      {sparkKey && sparkBy.get(sparkKey) ? (
        <div className="mt-2"><Sparkline values={sparkBy.get(sparkKey)!} width={140} height={26} positive /></div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded border border-bg-border bg-bg-border">
        {card('Snapshots last hour', snaps1h ?? 0, 'live', 'snapshots_per_hour')}
        {card('Unmatched pending', pendingUnmatched ?? 0,
          (pendingUnmatched ?? 0) > 50 ? <Link className="text-signal-warn" href="/admin/unmatched">Review →</Link> : 'queue healthy',
          'unmatched_pending',
        )}
        {card('Provider candidates', candidates?.length ?? 0, <Link className="text-ink-secondary hover:text-ink-primary" href="/admin/providers">Review →</Link>)}
        {card('Content drafts', drafts?.length ?? 0, <Link className="text-ink-secondary hover:text-ink-primary" href="/admin/content">Review →</Link>)}
      </div>

      <section>
        <h2 className="display text-2xl">Providers</h2>
        <table className="mt-3 w-full text-sm tabular">
          <thead className="bg-bg-surface text-2xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-3 py-2 text-left">Provider</th>
              <th className="px-3 py-2 text-right">Reliability</th>
              <th className="px-3 py-2 text-right">Failures</th>
              <th className="px-3 py-2 text-right">Last success</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border">
            {(providers ?? []).map((p) => {
              const r = Number(p.reliability_score);
              const cls = r >= 0.9 ? 'text-signal-pos' : r >= 0.7 ? 'text-signal-warn' : 'text-signal-neg';
              return (
                <tr key={p.slug}>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className={`px-3 py-2 text-right mono ${cls}`}>{r.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right mono">{p.consecutive_failures}</td>
                  <td className="px-3 py-2 text-right mono text-ink-secondary">{p.last_success_at ? formatRelativeTime(p.last_success_at) : 'never'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="display text-2xl">Recent system events</h2>
        <table className="mt-3 w-full text-sm tabular">
          <thead className="bg-bg-surface text-2xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">Event</th>
              <th className="px-3 py-2 text-left">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border">
            {(recentEvents ?? []).map((e, i) => (
              <tr key={i}>
                <td className="px-3 py-2 mono text-ink-secondary">{formatRelativeTime(e.occurred_at)}</td>
                <td className="px-3 py-2 mono">{e.event_type}</td>
                <td className="px-3 py-2 mono text-ink-muted">{e.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
