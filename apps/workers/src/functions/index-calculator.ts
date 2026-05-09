// Nightly 00:30 UTC: A/B every methodology against each compute_index,
// score them, write the champion to index_values_daily.

import { getServiceClient } from '@compute-terminal/db';
import {
  allMethodologyNames,
  compositeScore,
  methodologies,
  type MethodologyInput,
  type MethodologyName,
} from '@compute-terminal/shared/methodology';
import { inngest } from '../inngest/client';
import { publishEvent } from '../inngest/publish-event';

const WINDOW_HOURS = 24;

export const indexCalculator = inngest.createFunction(
  { id: 'index-calculator', name: 'Daily index calculation with methodology A/B' },
  { cron: '30 0 * * *' },
  async ({ step }) => {
    const sb = getServiceClient();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dateStr = today.toISOString().slice(0, 10);
    const since = new Date(today.getTime() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    const { data: indices } = await sb.from('compute_indices').select('*').eq('is_active', true);
    if (!indices) return { indices: 0 };

    const results: Array<Record<string, unknown>> = [];

    for (const idx of indices) {
      const methodology = idx.methodology as Record<string, unknown>;
      const gpuFilter = (methodology.gpu_models as string[] | undefined) ?? Object.keys((methodology.gpu_weights as Record<string, number>) ?? {});

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

      if (!snapshots || snapshots.length < 5) {
        await publishEvent({
          event_type: 'index_value_computed',
          entity_type: 'compute_index',
          entity_id: idx.id,
          payload: { date: dateStr, skipped: true, reason: 'insufficient_observations', count: snapshots?.length ?? 0 },
          source: 'worker:index-calculator',
        });
        continue;
      }

      const { data: providers } = await sb.from('providers').select('id, reliability_score');
      const reliabilityById = new Map((providers ?? []).map((p) => [p.id, Number(p.reliability_score)]));

      const inputs: MethodologyInput[] = snapshots.map((s) => ({
        pricePerHour: Number(s.price_per_hour),
        numGpus: Number(s.num_gpus),
        capturedAt: new Date(s.captured_at),
        providerReliability: reliabilityById.get(s.provider_id) ?? 1,
      }));

      const numProviders = new Set(snapshots.map((s) => s.provider_id)).size;

      const yesterdayStr = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { data: yesterdayRow } = await sb
        .from('index_values_daily')
        .select('vwap, methodology_used')
        .eq('index_id', idx.id)
        .eq('date', yesterdayStr)
        .maybeSingle();

      const experiments = await step.run(`run-experiments-${idx.id}`, async () => {
        const out: Array<{ name: MethodologyName; value: number; volatility: number; consistency: number; coverage: number; composite: number }> = [];
        for (const name of allMethodologyNames) {
          const fn = methodologies[name];
          const r = fn(inputs);
          if (!Number.isFinite(r.value)) continue;
          const yPrice = yesterdayRow?.vwap ? Number(yesterdayRow.vwap) : r.value;
          const volatility = Math.min(1, Math.abs(r.value - yPrice) / Math.max(yPrice, 1e-9));
          const consistency = 1 - Math.min(1, Math.abs(r.value - methodologies.simple_vwap(inputs).value) / Math.max(r.value, 1e-9));
          const coverage = Math.min(1, numProviders / 8);
          const composite = compositeScore({ consistency, volatility, coverage });
          out.push({ name, value: r.value, volatility, consistency, coverage, composite });
        }
        return out.sort((a, b) => b.composite - a.composite);
      });

      if (experiments.length === 0) continue;
      const champion = experiments[0]!;

      await step.run(`persist-${idx.id}`, async () => {
        for (const e of experiments) {
          await sb.from('index_methodology_experiments').insert({
            index_id: idx.id,
            date: dateStr,
            methodology_name: e.name,
            methodology_params: methodology,
            result_value: e.value,
            volatility_score: e.volatility,
            consistency_score: e.consistency,
            composite_score: e.composite,
            was_champion: e.name === champion.name,
          });
        }

        const prices = inputs.map((i) => i.pricePerHour).sort((a, b) => a - b);
        await sb.from('index_values_daily').upsert({
          index_id: idx.id,
          date: dateStr,
          open_price: prices[0],
          high_price: prices[prices.length - 1],
          low_price: prices[0],
          close_price: prices[prices.length - 1],
          vwap: methodologies.simple_vwap(inputs).value,
          median_price: prices[Math.floor(prices.length / 2)],
          trimmed_mean: methodologies.trimmed_mean_10(inputs).value,
          num_observations: inputs.length,
          num_providers: numProviders,
          methodology_used: champion.name,
          confidence_score: champion.composite,
        });

        if (yesterdayRow?.methodology_used && yesterdayRow.methodology_used !== champion.name) {
          await publishEvent({
            event_type: 'methodology_changed',
            entity_type: 'compute_index',
            entity_id: idx.id,
            payload: {
              date: dateStr,
              previous_methodology: yesterdayRow.methodology_used,
              new_methodology: champion.name,
              composite_score: champion.composite,
            },
            source: 'worker:index-calculator',
          });
        }

        await publishEvent({
          event_type: 'index_value_computed',
          entity_type: 'compute_index',
          entity_id: idx.id,
          payload: { date: dateStr, value: champion.value, methodology: champion.name },
          source: 'worker:index-calculator',
        });
      });

      results.push({ index: idx.slug, champion: champion.name, value: champion.value });
    }

    return { indices: indices.length, computed: results.length, results };
  },
);
