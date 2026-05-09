import { revalidatePath } from 'next/cache';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth';
import { formatRelativeTime } from '@compute-terminal/shared/formatters';

export const dynamic = 'force-dynamic';

async function approveContent(formData: FormData) {
  'use server';
  await requireAdmin();
  const id = String(formData.get('id'));
  const sb = getServiceClient();
  await sb.from('generated_content').update({ status: 'approved' }).eq('id', id);
  revalidatePath('/admin/content');
}

async function rejectContent(formData: FormData) {
  'use server';
  await requireAdmin();
  const id = String(formData.get('id'));
  const sb = getServiceClient();
  await sb.from('generated_content').update({ status: 'rejected' }).eq('id', id);
  revalidatePath('/admin/content');
}

export default async function ContentPage() {
  const sb = getServiceClient();
  const { data: drafts } = await sb
    .from('generated_content')
    .select('*')
    .in('status', ['draft', 'approved'])
    .order('scheduled_for', { ascending: true })
    .limit(40);

  return (
    <div>
      <h1 className="display text-3xl">Content drafts</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Approve to keep auto-publish on; reject to block. Auto-publish fires hourly past <code className="mono">scheduled_for</code>.
      </p>

      <div className="mt-6 space-y-4">
        {(drafts ?? []).map((d) => (
          <article key={d.id} className="rounded border border-bg-border bg-bg-surface p-5">
            <header className="flex items-baseline justify-between">
              <div>
                <div className="mono text-2xs uppercase tracking-widest text-ink-muted">
                  {d.content_type} · {(d.channels ?? []).join(', ')}
                </div>
                <h3 className="display mt-1 text-xl">{d.title}</h3>
              </div>
              <div className="mono text-2xs text-ink-secondary">
                {d.status === 'approved' && <span className="text-signal-pos">approved · </span>}
                fires {d.scheduled_for ? formatRelativeTime(d.scheduled_for) : '—'}
              </div>
            </header>
            <div className="mt-3 whitespace-pre-wrap rounded bg-bg-base p-3 mono text-xs leading-relaxed text-ink-secondary">
              {d.body}
            </div>
            <footer className="mt-3 flex gap-2">
              {d.status !== 'approved' && (
                <form action={approveContent}>
                  <input type="hidden" name="id" value={d.id} />
                  <button type="submit" className="rounded border border-signal-pos px-3 py-1 text-sm text-signal-pos hover:bg-signal-pos hover:text-bg-base">
                    Approve
                  </button>
                </form>
              )}
              <form action={rejectContent}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className="rounded border border-bg-border px-3 py-1 text-sm text-ink-secondary hover:text-signal-neg">
                  Reject
                </button>
              </form>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
