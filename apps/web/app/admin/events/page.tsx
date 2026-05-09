import { getServiceClient } from '@/lib/supabase-server';
import { formatRelativeTime } from '@compute-terminal/shared/formatters';

export const dynamic = 'force-dynamic';

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const sp = await searchParams;
  const sb = getServiceClient();
  let query = sb.from('system_events').select('*').order('occurred_at', { ascending: false }).limit(200);
  if (sp.type) query = query.eq('event_type', sp.type);
  const { data: events } = await query;

  return (
    <div>
      <h1 className="display text-3xl">System events</h1>
      <form className="mt-3 flex gap-2 mono text-xs" method="get">
        <input
          name="type"
          defaultValue={sp.type ?? ''}
          placeholder="filter event_type, e.g. normalization_auto_learned"
          className="flex-1 rounded border border-bg-border bg-bg-surface px-3 py-1"
        />
        <button type="submit" className="rounded border border-bg-border px-3 py-1">filter</button>
      </form>
      <div className="mt-4 space-y-1 mono text-xs">
        {(events ?? []).map((e) => (
          <div key={e.id} className="flex gap-3 border-b border-bg-border py-2">
            <span className="w-24 shrink-0 text-ink-muted">{formatRelativeTime(e.occurred_at)}</span>
            <span className="w-64 shrink-0 text-accent">{e.event_type}</span>
            <span className="w-48 shrink-0 text-ink-muted">{e.source}</span>
            <span className="grow truncate text-ink-secondary">{JSON.stringify(e.payload)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
