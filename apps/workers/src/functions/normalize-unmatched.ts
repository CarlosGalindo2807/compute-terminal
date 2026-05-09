// Hourly: drain top unmatched_listings via Claude.
// Confidence > 0.95 → auto-resolve, create rule, re-process snapshots.
// 0.70–0.95 → leave pending with suggested_gpu_id for admin review.
// is_new_hardware → flag for admin.

import { getServiceClient } from '@compute-terminal/db';
import { normalizeWithLlm } from '@compute-terminal/llm';
import { inngest } from '../inngest/client';
import { publishEvent } from '../inngest/publish-event';

const BATCH_SIZE = 50;
const AUTO_RESOLVE_THRESHOLD = 0.95;
const REVIEW_THRESHOLD = 0.7;

export const normalizeUnmatched = inngest.createFunction(
  { id: 'normalize-unmatched', name: 'Normalize unmatched listings via Claude' },
  { cron: '0 * * * *' },
  async ({ step, logger }) => {
    const sb = getServiceClient();

    const { knownModels, examples } = await step.run('load-context', async () => {
      const [{ data: models }, { data: pastRules }] = await Promise.all([
        sb.from('gpu_models').select('slug, manufacturer, model, variant, vram_gb, aliases').eq('is_active', true),
        sb
          .from('normalization_rules')
          .select('pattern, gpu_model_id, source')
          .eq('source', 'llm_learned')
          .order('hit_count', { ascending: false })
          .limit(20),
      ]);
      return {
        knownModels: models ?? [],
        examples:
          (pastRules ?? []).slice(0, 5).map((r) => ({
            raw: r.pattern,
            resolved: r.gpu_model_id,
            reasoning: 'previously auto-resolved',
          })) ?? [],
      };
    });

    const { data: queue } = await sb
      .from('unmatched_listings')
      .select('id, raw_string, raw_payload, occurrence_count, provider_id')
      .eq('status', 'pending')
      .order('occurrence_count', { ascending: false })
      .limit(BATCH_SIZE);

    if (!queue || queue.length === 0) {
      return { processed: 0 };
    }

    let auto = 0;
    let review = 0;
    let newHw = 0;

    for (const row of queue) {
      const result = await step.run(`resolve-${row.id}`, async () => {
        return normalizeWithLlm(row.raw_string, { knownModels, fewShotExamples: examples });
      });

      if (result.is_new_hardware) {
        await sb
          .from('unmatched_listings')
          .update({
            status: 'new_hardware',
            llm_confidence: result.confidence,
            llm_reasoning: result.reasoning,
            llm_model: 'claude-sonnet-4-6',
          })
          .eq('id', row.id);
        await publishEvent({
          event_type: 'new_hardware_detected',
          entity_type: 'unmatched_listing',
          entity_id: row.id,
          payload: { raw: row.raw_string, reasoning: result.reasoning },
          source: 'worker:normalize-unmatched',
        });
        newHw++;
        continue;
      }

      if (!result.gpu_model_slug || result.confidence < REVIEW_THRESHOLD) {
        await sb
          .from('unmatched_listings')
          .update({
            llm_confidence: result.confidence,
            llm_reasoning: result.reasoning,
            llm_model: 'claude-sonnet-4-6',
          })
          .eq('id', row.id);
        continue;
      }

      const { data: gpu } = await sb.from('gpu_models').select('id').eq('slug', result.gpu_model_slug).maybeSingle();
      if (!gpu) {
        logger.warn({ raw: row.raw_string, slug: result.gpu_model_slug }, 'llm_returned_unknown_slug');
        continue;
      }

      if (result.confidence >= AUTO_RESOLVE_THRESHOLD) {
        await step.run(`auto-resolve-${row.id}`, async () => {
          await sb.from('normalization_rules').upsert(
            {
              pattern: row.raw_string,
              pattern_type: 'exact',
              gpu_model_id: gpu.id,
              source: 'llm_learned',
              confidence: result.confidence,
              hit_count: row.occurrence_count,
              last_hit_at: new Date().toISOString(),
            },
            { onConflict: 'pattern,pattern_type,gpu_model_id' },
          );
          await sb
            .from('unmatched_listings')
            .update({
              status: 'auto_resolved',
              suggested_gpu_id: gpu.id,
              llm_confidence: result.confidence,
              llm_reasoning: result.reasoning,
              llm_model: 'claude-sonnet-4-6',
              resolved_at: new Date().toISOString(),
              resolved_by: 'llm_auto',
            })
            .eq('id', row.id);
          await sb
            .from('price_snapshots')
            .update({ gpu_model_id: gpu.id, is_normalized: true })
            .eq('raw_gpu_string', row.raw_string)
            .is('gpu_model_id', null);
          await publishEvent({
            event_type: 'normalization_auto_learned',
            entity_type: 'unmatched_listing',
            entity_id: row.id,
            payload: {
              raw: row.raw_string,
              gpu_model_id: gpu.id,
              gpu_slug: result.gpu_model_slug,
              confidence: result.confidence,
              snapshots_updated: row.occurrence_count,
            },
            source: 'worker:normalize-unmatched',
          });
        });
        auto++;
      } else {
        await sb
          .from('unmatched_listings')
          .update({
            suggested_gpu_id: gpu.id,
            llm_confidence: result.confidence,
            llm_reasoning: result.reasoning,
            llm_model: 'claude-sonnet-4-6',
          })
          .eq('id', row.id);
        review++;
      }
    }

    return { processed: queue.length, auto, review, new_hardware: newHw };
  },
);
