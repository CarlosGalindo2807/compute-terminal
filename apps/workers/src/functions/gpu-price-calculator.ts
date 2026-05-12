// Nightly 00:35 UTC, 5 min after the index calculator. Publishes the
// per-GPU benchmark level under the locked methodology (filtered_vwap
// v1.0). Same fixing window (24 h), same reliability floor, same
// MAD-3σ outlier filter, same num_gpus weighting as the index — so the
// per-GPU value and the index value are arithmetically consistent.
//
// Why this exists: the landing GPU ticker previously computed deltas as
// first-snapshot vs last-snapshot of price_snapshots. For GPUs with wide
// provider-price spread (e.g. RTX 4080 Super $0.068 → $0.280 across
// providers in the same 24 h) that surfaced provider-mix bias as fake
// price movement (+176 % observed live 2026-05-12). Major benchmarks
// (MSCI, S&P, FTSE Russell, Bloomberg Commodity, ICE) all compute
// level_T and level_T−1 under the same methodology and report the
// difference. This function writes level_T per GPU each night so the
// ticker can do exactly that.
//
// Skip behavior matches indexCalculator: if a GPU has fewer than
// minObservations eligible snapshots, we record `gpu_price_skipped` and
// write nothing for the day. Never a silent fallback.

import { getServiceClient } from '@compute-terminal/db';
import {
  PUBLISHED_METHODOLOGY,
  PUBLISHED_METHODOLOGY_VERSION,
  methodologies,
  type MethodologyInput,
} from '@compute-terminal/shared/methodology';
import { inngest } from '../inngest/client';
import { publishEvent } from '../inngest/publish-event';

export const gpuPriceCalculator = inngest.createFunction(
  { id: 'gpu-price-calculator', name: 'Daily per-GPU price calculation (locked methodology)' },
  { cron: '35 0 * * *' },
  async ({ step }) => {
    const sb = getServiceClient();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dateStr = today.toISOString().slice(0, 10);
    const since = new Date(today.getTime() - PUBLISHED_METHODOLOGY.windowHours * 3600_000).toISOString();

    const { data: gpus } = await sb.from('gpu_models').select('id, slug').eq('is_active', true);
    const { data: providers } = await sb.from('providers').select('id, reliability_score');
    const reliabilityById = new Map((providers ?? []).map((p) => [p.id, Number(p.reliability_score)]));

    let computed = 0;
    let skipped = 0;

    for (const gpu of gpus ?? []) {
      await step.run(`gpu-${gpu.id}`, async () => {
        // Per-GPU snapshot fetch hits the (gpu_model_id, captured_at desc) WHERE
        // is_outlier=false partial index. Cap-of-1000 (PostgREST max-rows) is
        // not a concern at the per-GPU + 24h scale; ~1000 / 24h / 28 GPUs.
        const { data: snapshots } = await sb
          .from('price_snapshots')
          .select('price_per_hour, num_gpus, captured_at, provider_id')
          .eq('gpu_model_id', gpu.id)
          .eq('is_outlier', false)
          .eq('is_normalized', true)
          .eq('currency', 'USD')
          .gte('captured_at', since)
          .limit(1000);

        const eligible = (snapshots ?? []).filter(
          (s) => (reliabilityById.get(s.provider_id) ?? 0) >= PUBLISHED_METHODOLOGY.reliabilityFloor,
        );

        if (eligible.length < PUBLISHED_METHODOLOGY.minObservations) {
          skipped += 1;
          await publishEvent({
            event_type: 'gpu_price_computed',
            entity_type: 'gpu_model',
            entity_id: gpu.id,
            payload: {
              date: dateStr,
              skipped: true,
              reason: 'insufficient_eligible_observations',
              count: eligible.length,
              min_required: PUBLISHED_METHODOLOGY.minObservations,
              methodology_version: PUBLISHED_METHODOLOGY_VERSION,
            },
            source: 'worker:gpu-price-calculator',
          });
          return;
        }

        const inputs: MethodologyInput[] = eligible.map((s) => ({
          pricePerHour: Number(s.price_per_hour),
          numGpus: Number(s.num_gpus),
          capturedAt: new Date(s.captured_at),
          providerReliability: reliabilityById.get(s.provider_id) ?? 1,
        }));

        const publishedFn = methodologies[PUBLISHED_METHODOLOGY.formulaId];
        const published = publishedFn(inputs);
        if (!Number.isFinite(published.value)) {
          skipped += 1;
          await publishEvent({
            event_type: 'gpu_price_computed',
            entity_type: 'gpu_model',
            entity_id: gpu.id,
            payload: {
              date: dateStr,
              skipped: true,
              reason: 'published_formula_returned_nonfinite',
              methodology_version: PUBLISHED_METHODOLOGY_VERSION,
            },
            source: 'worker:gpu-price-calculator',
          });
          return;
        }

        // OHLC: open/close are first/last by *timestamp* (not by price), to
        // match the OHLC contract. high/low are min/max. Same convention as
        // index-calculator.ts post-migration-013.
        const byTime = [...eligible].sort(
          (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime(),
        );
        const prices = inputs.map((i) => i.pricePerHour);
        const sortedPrices = [...prices].sort((a, b) => a - b);

        const numProviders = new Set(eligible.map((s) => s.provider_id)).size;
        const contributingProviderIds = Array.from(new Set(eligible.map((s) => s.provider_id)));

        await sb.from('gpu_prices_daily').upsert({
          gpu_model_id: gpu.id,
          date: dateStr,
          open_price: Number(byTime[0]!.price_per_hour),
          high_price: sortedPrices[sortedPrices.length - 1],
          low_price: sortedPrices[0],
          close_price: Number(byTime[byTime.length - 1]!.price_per_hour),
          vwap: published.value,
          median_price: sortedPrices[Math.floor(sortedPrices.length / 2)],
          trimmed_mean: methodologies.trimmed_mean_10(inputs).value,
          num_observations: inputs.length,
          num_providers: numProviders,
          methodology_used: PUBLISHED_METHODOLOGY.formulaId,
          methodology_version: PUBLISHED_METHODOLOGY_VERSION,
          methodology_locked: true,
          contributing_provider_ids: contributingProviderIds,
          confidence_score: null,
        });

        computed += 1;
        await publishEvent({
          event_type: 'gpu_price_computed',
          entity_type: 'gpu_model',
          entity_id: gpu.id,
          payload: {
            date: dateStr,
            value: published.value,
            methodology: PUBLISHED_METHODOLOGY.formulaId,
            methodology_version: PUBLISHED_METHODOLOGY_VERSION,
            num_observations: inputs.length,
            num_providers: numProviders,
          },
          source: 'worker:gpu-price-calculator',
        });
      });
    }

    return { gpus: gpus?.length ?? 0, computed, skipped };
  },
);
