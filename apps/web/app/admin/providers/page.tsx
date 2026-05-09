import { revalidatePath } from 'next/cache';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth';
import { formatRelativeTime } from '@compute-terminal/shared/formatters';

export const dynamic = 'force-dynamic';

async function setCandidateStatus(formData: FormData) {
  'use server';
  await requireAdmin();
  const id = String(formData.get('id'));
  const status = String(formData.get('status'));
  const sb = getServiceClient();
  await sb.from('provider_candidates').update({ status }).eq('id', id);
  revalidatePath('/admin/providers');
}

export default async function ProvidersAdminPage() {
  const sb = getServiceClient();
  const [{ data: providers }, { data: candidates }] = await Promise.all([
    sb.from('providers').select('*').order('reliability_score', { ascending: false }),
    sb.from('provider_candidates').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="display text-3xl">Providers</h1>
        <table className="mt-3 w-full text-sm tabular">
          <thead className="bg-bg-surface text-2xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-right">Reliability</th>
              <th className="px-3 py-2 text-right">Failures</th>
              <th className="px-3 py-2 text-right">Last success</th>
              <th className="px-3 py-2 text-right">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border">
            {(providers ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2 mono">{p.slug}</td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2 mono text-ink-secondary">{p.type}</td>
                <td className="px-3 py-2 text-right mono">{Number(p.reliability_score).toFixed(2)}</td>
                <td className="px-3 py-2 text-right mono">{p.consecutive_failures}</td>
                <td className="px-3 py-2 text-right mono text-ink-secondary">
                  {p.last_success_at ? formatRelativeTime(p.last_success_at) : 'never'}
                </td>
                <td className="px-3 py-2 text-right mono">{p.is_active ? 'yes' : 'no'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="display text-2xl">Discovery candidates ({candidates?.length ?? 0})</h2>
        <div className="mt-3 space-y-3">
          {(candidates ?? []).map((c) => {
            const a = c.llm_assessment as Record<string, unknown> | null;
            return (
              <div key={c.id} className="rounded border border-bg-border bg-bg-surface p-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="mono text-base">{c.name}</div>
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-ink-secondary hover:text-accent">
                      {c.url}
                    </a>
                  </div>
                  <div className="mono text-2xs text-ink-muted">
                    priority {(a?.priority_score as number)?.toFixed?.(1) ?? '?'} · {String(a?.quality_assessment ?? '')}
                  </div>
                </div>
                {a?.reasoning ? <p className="mt-2 text-xs text-ink-secondary italic">{String(a.reasoning)}</p> : null}
                <form action={setCandidateStatus} className="mt-2 flex gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <button name="status" value="approved" className="rounded border border-signal-pos px-3 py-1 text-xs text-signal-pos hover:bg-signal-pos hover:text-bg-base">
                    Approve
                  </button>
                  <button name="status" value="rejected" className="rounded border border-bg-border px-3 py-1 text-xs text-ink-secondary hover:text-signal-neg">
                    Reject
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
