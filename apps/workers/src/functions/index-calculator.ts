// Nightly 00:30 UTC. Publishes the official index value using the LOCKED
// methodology (PUBLISHED_METHODOLOGY in @compute-terminal/shared/methodology).
//
// The 5-way A/B continues to run, but writes only to
// `index_methodology_experiments` for review by the Index Committee.
// The published value in `index_values_daily` always uses the locked formula.
// Changing the formula is a human action — see /methodology for the policy.
//
// If the published methodology cannot be computed (insufficient data after
// reliability + outlier filter), we record a `index_value_skipped` event and
// write nothing for the day. We never silently fall back to a different formula.

import { getServiceClient } from '@compute-terminal/db';
import {
  PUBLISHED_METHODOLOGY,
  PUBLISHED_METHODOLOGY_VERSION,
  allMethodologyNames,
  compositeScore,
  methodologies,
  type MethodologyInput,
  type MethodologyName,
} from '@compute-terminal/shared/methodology';
import { inngest } from '../inngest/client';
import { publishEvent } from '../inngest/publish-event';

export const indexCalculator = inngest.createFunction(
  { id: 'index-calculator', name: 'Daily index calculation (locked methodology + research A/B)' },
  { cron: '30 0 * * *' },
  async ({ step }) => {
    const sb = getServiceClient();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dateStr = today.toISOString().slice(0, 10);
    const since = new Date(today.getTime() - PUBLISHED_METHODOLOGY.windowHours * 3600_000).toISOString();

    const { data: indices } = await sb.from('compute_indices').select('*').eq('is_active', true);
    if (!indices) return { indices: 0 };

    const results: Array<Record<string, unknown>> = [];

    for (const idx of indices) {
      const methodology = idx.methodology as Record<string, unknown>;
      const gpuFilter = (methodology.gpu_models as string[] | undefined) ??
        Object.keys((methodology.gpu_weights as Record<string, number>) ?? {});

      const { data: gpuRows } = gpuFilter.length
        ? await sb.from('gpu_models').select('id, slug').in('slug', gpuFilter)
        : { data: [] as Array<{ id: string; slug: string }> };
      const gpuIds = (gpuRows ?? []).map((r) => r.id);
      if (gpuIds.length === 0) continue;

      const { data: snapshots } = await sb
        .from('price_snapshots')
        .select('price_per_hour, num_gpus, captured_at, provider_id, gpu_model_id')
        .in('gpu_model_id', gpuIds)
        .gte('captured_at', since)
        .eq('is_outlier', false)
        .eq('is_normalized', true);

      const { data: providers } = await sb.from('providers').select('id, reliability_score');
      const reliabilityById = new Map((providers ?? []).map((p) => [p.id, Number(p.reliability_score)]));

      const eligible = (snapshots ?? []).filter(
        (s) => (reliabilityById.get(s.provider_id) ?? 0) >= PUBLISHED_METHODOLOGY.reliabilityFloor,
      );

      if (eligible.length < PUBLISHED_METHODOLOGY.minObservations) {
        await publishEvent({
          event_type: 'index_value_computed',
          entity_type: 'compute_index',
          entity_id: idx.id,
          payload: {
            date: dateStr,
            skipped: true,
            reason: 'insufficient_eligible_observations',
            count: eligible.length,
            min_required: PUBLISHED_METHODOLOGY.minObservations,
            methodology_version: PUBLISHED_METHODOLOGY_VERSION,
          },
          source: 'worker:index-calculator',
        });
        continue;
      }

      const inputs: MethodologyInput[] = eligible.map((s) => ({
        pricePerHour: Number(s.price_per_hour),
        numGpus: Number(s.num_gpus),
        capturedAt: new Date(s.captured_at),
        providerReliability: reliabilityById.get(s.provider_id) ?? 1,
      }));
      const numProviders = new Set(eligible.map((s) => s.provider_id)).size;

      // ─── Published value: LOCKED METHODOLOGY ───
      const publishedFn = methodologies[PUBLISHED_METHODOLOGY.formulaId];
      const published = publishedFn(inputs);
      if (!Number.isFinite(published.value)) {
        await publishEvent({
          event_type: 'index_value_computed',
          entity_type: 'compute_index',
          entity_id: idx.id,
          payload: {
            date: dateStr,
            skipped: true,
            reason: 'published_formula_returned_nonfinite',
            methodology_version: PUBLISHED_METHODOLOGY_VERSION,
          },
          source: 'worker:index-calculator',
        });
        continue;
      }

      // ─── Research A/B: still runs, only writes to experiments table ───
      const yesterdayStr = new Date(today.getTime() - 86400_000).toISOString().slice(0, 10);
      const { data: yesterdayRow } = await sb
        .from('index_values_daily')
        .select('vwap')
        .eq('index_id', idx.id)
        .eq('date', yesterdayStr)
        .maybeSingle();

      const research = await step.run(`research-ab-${idx.id}`, async () => {
        const out: Array<{
          name: MethodologyName;
          value: number;
          volatility: number;
          consistency: number;
          coverage: number;
          composite: number;
        }> = [];
        for (const name of allMethodologyNames) {
          const fn = methodologies[name];
          const r = fn(inputs);
          if (!Number.isFinite(r.value)) continue;
          const yPrice = yesterdayRow?.vwap ? Number(yesterdayRow.vwap) : r.value;
          const volatility = Math.min(1, Math.abs(r.value - yPrice) / Math.max(yPrice, 1e-9));
          const consistency = 1 - Math.min(1, Math.abs(r.value - published.value) / Math.max(r.value, 1e-9));
          const coverage = Math.min(1, numProviders / 8);
          const composite = compositeScore({ consistency, volatility, coverage });
          out.push({ name, value: r.value, volatility, consistency, coverage, composite });
        }
        return out.sort((a, b) => b.composite - a.composite);
      });

      await step.run(`persist-${idx.id}`, async () => {
        // Research log — every variant, every day, never overrides published value.
        for (const e of research) {
          await sb.from('index_methodology_experiments').insert({
            index_id: idx.id,
            date: dateStr,
            methodology_name: e.name,
            methodology_params: methodology,
            result_value: e.value,
            volatility_score: e.volatility,
            consistency_score: e.consistency,
            composite_score: e.composite,
            // was_champion = top-of-research, NOT necessarily published. The committee
            // looks at sustained champions when proposing methodology version bumps.
            was_champion: research.length > 0 && e.name === research[0]!.name,
          });
        }

        // Published value — always the locked methodology, version-stamped.
        const prices = inputs.map((i) => i.pricePerHour).sort((a, b) => a - b);
        await sb.from('index_values_daily').upsert({
          index_id: idx.id,
          date: dateStr,
          open_price: prices[0],
          high_price: prices[prices.length - 1],
          low_price: prices[0],
          close_price: prices[prices.length - 1],
          vwap: published.value,
          median_price: prices[Math.floor(prices.length / 2)],
          trimmed_mean: methodologies.trimmed_mean_10(inputs).value,
          num_observations: inputs.length,
          num_providers: numProviders,
          methodology_used: PUBLISHED_METHODOLOGY.formulaId,
          methodology_version: PUBLISHED_METHODOLOGY_VERSION,
          methodology_locked: true,
          confidence_score: research[0]?.composite ?? null,
        });

        await publishEvent({
          event_type: 'index_value_computed',
          entity_type: 'compute_index',
          entity_id: idx.id,
          payload: {
            date: dateStr,
            value: published.value,
            methodology: PUBLISHED_METHODOLOGY.formulaId,
            methodology_version: PUBLISHED_METHODOLOGY_VERSION,
            num_observations: inputs.length,
            num_providers: numProviders,
            research_top: research[0]?.name ?? null,
            research_top_composite: research[0]?.composite ?? null,
          },
          source: 'worker:index-calculator',
        });
      });

      results.push({
        index: idx.slug,
        version: PUBLISHED_METHODOLOGY_VERSION,
        formula: PUBLISHED_METHODOLOGY.formulaId,
        value: published.value,
        research_top: research[0]?.name ?? null,
      });
    }

    return { indices: indices.length, computed: results.length, results };
  },
);
