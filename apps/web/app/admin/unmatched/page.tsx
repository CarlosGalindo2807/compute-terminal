import { revalidatePath } from 'next/cache';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth';
import { formatRelativeTime } from '@compute-terminal/shared/formatters';

export const dynamic = 'force-dynamic';

async function resolveUnmatched(formData: FormData) {
  'use server';
  const email = await requireAdmin();
  const id = String(formData.get('id'));
  const gpuId = String(formData.get('gpu_id'));
  const rawString = String(formData.get('raw_string'));
  if (!id || !gpuId) return;

  const sb = getServiceClient();
  await sb.from('normalization_rules').upsert(
    {
      pattern: rawString,
      pattern_type: 'exact',
      gpu_model_id: gpuId,
      source: 'manual',
      confidence: 1.0,
      hit_count: 0,
      last_hit_at: new Date().toISOString(),
    },
    { onConflict: 'pattern,pattern_type,gpu_model_id' },
  );
  await sb
    .from('unmatched_listings')
    .update({
      status: 'manual_resolved',
      suggested_gpu_id: gpuId,
      resolved_at: new Date().toISOString(),
      resolved_by: `manual:${email}`,
    })
    .eq('id', id);
  await sb
    .from('price_snapshots')
    .update({ gpu_model_id: gpuId, is_normalized: true })
    .eq('raw_gpu_string', rawString)
    .is('gpu_model_id', null);
  await sb.from('system_events').insert({
    event_type: 'normalization_manual_resolved',
    entity_type: 'unmatched_listing',
    entity_id: id,
    payload: { raw: rawString, gpu_model_id: gpuId, by: email },
    source: 'admin:unmatched',
  });
  revalidatePath('/admin/unmatched');
}

async function ignoreUnmatched(formData: FormData) {
  'use server';
  const email = await requireAdmin();
  const id = String(formData.get('id'));
  const sb = getServiceClient();
  await sb
    .from('unmatched_listings')
    .update({ status: 'ignored', resolved_at: new Date().toISOString(), resolved_by: `manual:${email}` })
    .eq('id', id);
  revalidatePath('/admin/unmatched');
}

export default async function UnmatchedPage() {
  const sb = getServiceClient();
  const [{ data: rows }, { data: gpus }] = await Promise.all([
    sb
      .from('unmatched_listings')
      .select('id, raw_string, occurrence_count, suggested_gpu_id, llm_confidence, llm_reasoning, status, created_at')
      .in('status', ['pending', 'new_hardware'])
      .order('occurrence_count', { ascending: false })
      .limit(100),
    sb.from('gpu_models').select('id, slug, model, variant, vram_gb').eq('is_active', true).order('slug'),
  ]);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="display text-3xl">Unmatched listings</h1>
        <p className="mono text-2xs uppercase tracking-widest text-ink-muted">{rows?.length ?? 0} pending</p>
      </div>

      <div className="mt-6 space-y-3">
        {(rows ?? []).map((row) => {
          const suggested = (gpus ?? []).find((g) => g.id === row.suggested_gpu_id);
          const conf = row.llm_confidence ? Number(row.llm_confidence) : null;
          const confColor = conf == null ? '' : conf >= 0.95 ? 'text-signal-pos' : conf >= 0.7 ? 'text-signal-warn' : 'text-ink-muted';
          return (
            <div key={row.id} className="rounded border border-bg-border bg-bg-surface p-4">
              <div className="flex items-baseline justify-between">
                <div className="mono text-base">{row.raw_string}</div>
                <div className="mono text-2xs text-ink-muted">×{row.occurrence_count} · {formatRelativeTime(row.created_at)}</div>
              </div>
              {row.llm_reasoning ? (
                <div className="mt-1 text-xs text-ink-secondary">
                  Claude: <span className="italic">{row.llm_reasoning}</span>
                  {conf != null && <span className={`ml-2 mono ${confColor}`}>({(conf * 100).toFixed(0)}% confidence)</span>}
                </div>
              ) : null}
              <form action={resolveUnmatched} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="raw_string" value={row.raw_string} />
                <select
                  name="gpu_id"
                  defaultValue={row.suggested_gpu_id ?? ''}
                  className="rounded border border-bg-border bg-bg-base px-2 py-1 text-sm mono"
                >
                  <option value="">— choose GPU —</option>
                  {(gpus ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.slug} ({g.model}{g.variant ? ' ' + g.variant : ''} {g.vram_gb}GB)
                    </option>
                  ))}
                </select>
                <button type="submit" className="rounded border border-accent bg-accent px-3 py-1 text-sm text-bg-base hover:opacity-90">
                  Resolve {suggested ? `as ${suggested.slug}` : ''}
                </button>
                <button
                  type="submit"
                  formAction={ignoreUnmatched}
                  className="rounded border border-bg-border px-3 py-1 text-sm text-ink-secondary hover:text-signal-neg"
                >
                  Ignore
                </button>
                {row.status === 'new_hardware' && (
                  <span className="mono text-2xs uppercase tracking-wider text-signal-warn">new hardware?</span>
                )}
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
