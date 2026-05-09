// Hourly: snapshot system_health_metrics so /admin/health has trendlines.

import { getServiceClient } from '@compute-terminal/db';
import { inngest } from '../inngest/client';

export const recordSystemMetrics = inngest.createFunction(
  { id: 'record-system-metrics', name: 'Record hourly system health metrics' },
  { cron: '15 * * * *' },
  async () => {
    const sb = getServiceClient();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [{ count: snapshots }, { count: unmatched }, { count: outliers }, { data: providers }] = await Promise.all([
      sb.from('price_snapshots').select('*', { count: 'exact', head: true }).gte('captured_at', since),
      sb.from('unmatched_listings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('price_snapshots').select('*', { count: 'exact', head: true }).gte('captured_at', since).eq('is_outlier', true),
      sb.from('providers').select('reliability_score').eq('is_active', true),
    ]);

    const avgReliability =
      (providers ?? []).reduce((a, p) => a + Number(p.reliability_score ?? 1), 0) / Math.max(1, (providers ?? []).length);

    const metrics: Array<{ metric_name: string; metric_value: number; dimensions?: Record<string, unknown> }> = [
      { metric_name: 'snapshots_per_hour', metric_value: snapshots ?? 0 },
      { metric_name: 'unmatched_pending', metric_value: unmatched ?? 0 },
      { metric_name: 'outliers_per_hour', metric_value: outliers ?? 0 },
      { metric_name: 'avg_provider_reliability', metric_value: avgReliability },
    ];

    await sb.from('system_health_metrics').insert(metrics);
    return { metrics: metrics.length };
  },
);
