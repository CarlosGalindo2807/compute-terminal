import { Sparkline } from '@/components/sparkline';
import { getServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  const sb = getServiceClient();
  const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const { data } = await sb
    .from('system_health_metrics')
    .select('metric_name, metric_value, recorded_at')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  const byName = new Map<string, number[]>();
  for (const r of data ?? []) {
    const arr = byName.get(r.metric_name) ?? [];
    arr.push(Number(r.metric_value));
    byName.set(r.metric_name, arr);
  }

  return (
    <div>
      <h1 className="display text-3xl">System health</h1>
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded border border-bg-border bg-bg-border">
        {Array.from(byName.entries()).map(([name, values]) => {
          const latest = values.at(-1) ?? 0;
          const earliest = values[0] ?? 0;
          const delta = earliest === 0 ? 0 : (latest - earliest) / earliest;
          return (
            <div key={name} className="bg-bg-surface p-5">
              <div className="mono text-2xs uppercase tracking-wider text-ink-muted">{name.replace(/_/g, ' ')}</div>
              <div className="display mt-1 text-3xl">{Number.isInteger(latest) ? latest : latest.toFixed(2)}</div>
              <div className={`mono text-2xs mt-1 ${delta >= 0 ? 'text-signal-pos' : 'text-signal-neg'}`}>
                {delta >= 0 ? '+' : ''}{(delta * 100).toFixed(1)}% over 7d
              </div>
              <div className="mt-2"><Sparkline values={values.slice(-100)} width={220} height={32} positive={delta >= 0} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
