// One-shot version of the normalize-unmatched Inngest function for local
// kick-off. Same logic, no step wrapping. Useful when seeding a fresh DB.

// Run with: node --env-file=../../.env --import tsx scripts/normalize-once.ts
import { getServiceClient } from '@compute-terminal/db';
import { normalizeWithLlm } from '@compute-terminal/llm';

const BATCH_SIZE = 50;
const AUTO = 0.95;
const REVIEW = 0.7;

async function main() {
  const sb = getServiceClient();
  const [{ data: models }, { data: pastRules }] = await Promise.all([
    sb.from('gpu_models').select('slug, manufacturer, model, variant, vram_gb, aliases').eq('is_active', true),
    sb.from('normalization_rules').select('pattern, gpu_model_id').eq('source', 'llm_learned').limit(20),
  ]);
  const knownModels = models ?? [];
  const examples = (pastRules ?? []).slice(0, 5).map((r) => ({
    raw: r.pattern, resolved: r.gpu_model_id, reasoning: 'previously auto-resolved',
  }));

  const { data: queue } = await sb
    .from('unmatched_listings')
    .select('id, raw_string, occurrence_count, provider_id')
    .eq('status', 'pending')
    .order('occurrence_count', { ascending: false })
    .limit(BATCH_SIZE);

  if (!queue || queue.length === 0) { console.log('queue empty'); return; }
  console.log(`processing ${queue.length} unmatched listings`);

  let auto = 0, review = 0, newHw = 0;
  for (const row of queue) {
    process.stdout.write(`  ${row.raw_string.padEnd(40)} → `);
    let result;
    try {
      result = await normalizeWithLlm(row.raw_string, { knownModels, fewShotExamples: examples });
    } catch (e) {
      console.log(`LLM error: ${(e as Error).message.slice(0, 80)}`);
      continue;
    }

    if (result.is_new_hardware) {
      await sb.from('unmatched_listings').update({
        status: 'new_hardware', llm_confidence: result.confidence,
        llm_reasoning: result.reasoning, llm_model: 'claude-sonnet-4-6',
      }).eq('id', row.id);
      console.log(`NEW HARDWARE (${(result.confidence * 100).toFixed(0)}%) — ${result.reasoning}`);
      newHw++; continue;
    }

    if (!result.gpu_model_slug || result.confidence < REVIEW) {
      await sb.from('unmatched_listings').update({
        llm_confidence: result.confidence, llm_reasoning: result.reasoning, llm_model: 'claude-sonnet-4-6',
      }).eq('id', row.id);
      console.log(`unresolved (${(result.confidence * 100).toFixed(0)}%)`);
      continue;
    }

    const { data: gpu } = await sb.from('gpu_models').select('id').eq('slug', result.gpu_model_slug).maybeSingle();
    if (!gpu) {
      console.log(`unknown slug ${result.gpu_model_slug}`);
      continue;
    }

    if (result.confidence >= AUTO) {
      await sb.from('normalization_rules').upsert({
        pattern: row.raw_string, pattern_type: 'exact', gpu_model_id: gpu.id,
        source: 'llm_learned', confidence: result.confidence,
        hit_count: row.occurrence_count, last_hit_at: new Date().toISOString(),
      }, { onConflict: 'pattern,pattern_type,gpu_model_id' });
      await sb.from('unmatched_listings').update({
        status: 'auto_resolved', suggested_gpu_id: gpu.id, llm_confidence: result.confidence,
        llm_reasoning: result.reasoning, llm_model: 'claude-sonnet-4-6',
        resolved_at: new Date().toISOString(), resolved_by: 'llm_auto',
      }).eq('id', row.id);
      await sb.from('price_snapshots').update({ gpu_model_id: gpu.id, is_normalized: true })
        .eq('raw_gpu_string', row.raw_string).is('gpu_model_id', null);
      await sb.from('system_events').insert({
        event_type: 'normalization_auto_learned',
        entity_type: 'unmatched_listing', entity_id: row.id,
        payload: { raw: row.raw_string, gpu_slug: result.gpu_model_slug, confidence: result.confidence },
        source: 'script:normalize-once',
      });
      console.log(`✓ ${result.gpu_model_slug} (${(result.confidence * 100).toFixed(0)}%)`);
      auto++;
    } else {
      await sb.from('unmatched_listings').update({
        suggested_gpu_id: gpu.id, llm_confidence: result.confidence,
        llm_reasoning: result.reasoning, llm_model: 'claude-sonnet-4-6',
      }).eq('id', row.id);
      console.log(`? ${result.gpu_model_slug} (${(result.confidence * 100).toFixed(0)}%) → review`);
      review++;
    }
  }

  console.log(`\nresult: ${auto} auto · ${review} review · ${newHw} new-hw · ${queue.length - auto - review - newHw} unresolved`);
}

main().catch((e) => { console.error(e); process.exit(1); });
