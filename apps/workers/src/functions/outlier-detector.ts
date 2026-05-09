// Every 15 minutes: flag statistical outliers (|x - median| > 3 * MAD over the
// last hour, per gpu_model). Adjust provider reliability if a provider trends bad.

import { getServiceClient } from '@compute-terminal/db';
import { inngest } from '../inngest/client';
import { publishEvent } from '../inngest/publish-event';

const MAD_MULTIPLIER = 3;
const PROVIDER_OUTLIER_RATIO_THRESHOLD = 0.3;
const PROVIDER_HEALTHY_THRESHOLD = 0.05;

const median = (xs: number[]): number => {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
};
const mad = (xs: number[]): number => {
  const m = median(xs);
  return median(xs.map((x) => Math.abs(x - m)));
};

export const outlierDetector = inngest.createFunction(
  { id: 'outlier-detector', name: 'Detect statistical outliers + adjust provider reliability' },
  { cron: '*/15 * * * *' },
  async ({ step }) => {
    const sb = getServiceClient();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: rows } = await sb
      .from('price_snapshots')
      .select('id, captured_at, gpu_model_id, provider_id, price_per_hour, is_outlier')
      .gte('captured_at', since)
      .not('gpu_model_id', 'is', null);

    if (!rows || rows.length === 0) return { snapshots_seen: 0 };

    const groups = new Map<string, typeof rows>();
    for (const r of rows) {
      const k = r.gpu_model_id as string;
      const arr = groups.get(k) ?? [];
      arr.push(r);
      groups.set(k, arr);
    }

    const flaggedIds: number[] = [];
    const providerOutlierCounts = new Map<string, { total: number; outliers: number }>();

    for (const [, group] of groups) {
      if (group.length < 4) continue;
      const prices = group.map((r) => Number(r.price_per_hour));
      const m = median(prices);
      const d = mad(prices) || 1e-9;
      for (const r of group) {
        const isOutlier = Math.abs(Number(r.price_per_hour) - m) > MAD_MULTIPLIER * d;
        const stats = providerOutlierCounts.get(r.provider_id) ?? { total: 0, outliers: 0 };
        stats.total++;
        if (isOutlier) stats.outliers++;
        providerOutlierCounts.set(r.provider_id, stats);
        if (isOutlier && !r.is_outlier) flaggedIds.push(r.id);
      }
    }

    if (flaggedIds.length > 0) {
      await step.run('mark-outliers', async () => {
        const CHUNK = 200;
        for (let i = 0; i < flaggedIds.length; i += CHUNK) {
          const slice = flaggedIds.slice(i, i + CHUNK);
          await sb
            .from('price_snapshots')
            .update({ is_outlier: true, outlier_reason: 'statistical_mad_3sigma' })
            .in('id', slice);
        }
      });
    }

    for (const [providerId, stats] of providerOutlierCounts) {
      const ratio = stats.outliers / stats.total;
      if (ratio > PROVIDER_OUTLIER_RATIO_THRESHOLD) {
        const { data: prov } = await sb
          .from('providers')
          .select('reliability_score')
          .eq('id', providerId)
          .single();
        const newScore = Math.max(0, (prov?.reliability_score ?? 1) * 0.95);
        await sb.from('providers').update({ reliability_score: newScore }).eq('id', providerId);
        await publishEvent({
          event_type: 'provider_quality_degraded',
          entity_type: 'provider',
          entity_id: providerId,
          payload: { outlier_ratio: ratio, new_reliability: newScore },
          source: 'worker:outlier-detector',
        });
      } else if (ratio < PROVIDER_HEALTHY_THRESHOLD) {
        const { data: prov } = await sb
          .from('providers')
          .select('reliability_score')
          .eq('id', providerId)
          .single();
        const current = prov?.reliability_score ?? 1;
        if (current < 1) {
          const newScore = Math.min(1, current + 0.01);
          await sb.from('providers').update({ reliability_score: newScore }).eq('id', providerId);
        }
      }
    }

    return { snapshots_seen: rows.length, flagged: flaggedIds.length, providers_seen: providerOutlierCounts.size };
  },
);
