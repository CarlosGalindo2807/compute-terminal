// Daily 07:00 UTC: assemble market-movement summary, hand to Claude, write a
// draft into generated_content. content-publisher promotes to channels at 09:00
// unless rejected in /admin/content.

import { getServiceClient } from '@compute-terminal/db';
import { generateDailyBrief, type BriefInputs } from '@compute-terminal/llm';
import { inngest } from '../inngest/client.js';
import { publishEvent } from '../inngest/publish-event.js';

const WINDOW_HOURS = 24;

export const contentGenerator = inngest.createFunction(
  { id: 'content-generator', name: 'Generate Daily Compute Brief' },
  { cron: '0 7 * * *' },
  async ({ step }) => {
    const sb = getServiceClient();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const since24 = new Date(now.getTime() - WINDOW_HOURS * 3600_000).toISOString();
    const since48 = new Date(now.getTime() - 2 * WINDOW_HOURS * 3600_000).toISOString();

    const { data: gpus } = await sb.from('gpu_models').select('id, slug').eq('is_active', true);
    const slugById = new Map((gpus ?? []).map((g) => [g.id, g.slug]));
    const { data: providers } = await sb.from('providers').select('id, name');
    const nameById = new Map((providers ?? []).map((p) => [p.id, p.name]));

    const { data: today } = await sb
      .from('price_snapshots')
      .select('gpu_model_id, provider_id, price_per_hour')
      .gte('captured_at', since24)
      .eq('is_outlier', false)
      .eq('is_normalized', true);

    const { data: yesterday } = await sb
      .from('price_snapshots')
      .select('gpu_model_id, provider_id, price_per_hour')
      .gte('captured_at', since48)
      .lt('captured_at', since24)
      .eq('is_outlier', false)
      .eq('is_normalized', true);

    const groupAvg = (rows: NonNullable<typeof today>): Map<string, number> => {
      const acc = new Map<string, { sum: number; n: number }>();
      for (const r of rows) {
        const k = `${r.gpu_model_id}:${r.provider_id}`;
        const a = acc.get(k) ?? { sum: 0, n: 0 };
        a.sum += Number(r.price_per_hour);
        a.n += 1;
        acc.set(k, a);
      }
      const out = new Map<string, number>();
      for (const [k, v] of acc) out.set(k, v.sum / v.n);
      return out;
    };

    const todayAvg = groupAvg(today ?? []);
    const yAvg = groupAvg(yesterday ?? []);

    const movements: BriefInputs['topMovers'] = [];
    for (const [k, t] of todayAvg) {
      const y = yAvg.get(k);
      if (!y || y === 0) continue;
      const [gpuId, provId] = k.split(':');
      movements.push({
        gpu: slugById.get(gpuId!) ?? gpuId!,
        provider: nameById.get(provId!) ?? provId!,
        from: y,
        to: t,
        change_pct: (t - y) / y,
      });
    }
    movements.sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
    const topMovers = movements.slice(0, 3);

    const byGpu = new Map<string, Array<{ provider: string; price: number }>>();
    for (const [k, t] of todayAvg) {
      const [gpuId, provId] = k.split(':');
      const arr = byGpu.get(gpuId!) ?? [];
      arr.push({ provider: nameById.get(provId!) ?? provId!, price: t });
      byGpu.set(gpuId!, arr);
    }
    let widest: BriefInputs['widestSpread'] | null = null;
    for (const [gpuId, rows] of byGpu) {
      if (rows.length < 2) continue;
      rows.sort((a, b) => a.price - b.price);
      const spread = rows.at(-1)!.price - rows[0]!.price;
      if (!widest || spread > widest.max - widest.min) {
        widest = {
          gpu: slugById.get(gpuId) ?? gpuId,
          min_provider: rows[0]!.provider,
          max_provider: rows.at(-1)!.provider,
          min: rows[0]!.price,
          max: rows.at(-1)!.price,
        };
      }
    }

    const { data: indexValues } = await sb
      .from('index_values_daily')
      .select('index_id, vwap, date')
      .gte('date', new Date(now.getTime() - 2 * 24 * 3600_000).toISOString().slice(0, 10));
    const indexDelta: Record<string, number> = {};
    const byIdx = new Map<string, Array<{ date: string; vwap: number }>>();
    for (const r of indexValues ?? []) {
      if (!r.vwap) continue;
      const arr = byIdx.get(r.index_id) ?? [];
      arr.push({ date: r.date, vwap: Number(r.vwap) });
      byIdx.set(r.index_id, arr);
    }
    for (const [idxId, rows] of byIdx) {
      rows.sort((a, b) => a.date.localeCompare(b.date));
      if (rows.length >= 2) indexDelta[idxId] = (rows.at(-1)!.vwap - rows[0]!.vwap) / rows[0]!.vwap;
    }

    if (topMovers.length === 0 && !widest) {
      return { skipped: true, reason: 'no_data' };
    }

    const brief = await step.run('generate-brief', async () =>
      generateDailyBrief({
        date: dateStr,
        topMovers,
        widestSpread: widest ?? { gpu: '-', min_provider: '-', max_provider: '-', min: 0, max: 0 },
        indexDelta,
      }),
    );

    const scheduledFor = new Date(now);
    scheduledFor.setUTCHours(9, 0, 0, 0);
    if (scheduledFor.getTime() <= now.getTime()) scheduledFor.setUTCDate(scheduledFor.getUTCDate() + 1);

    await sb.from('generated_content').insert([
      {
        content_type: 'daily_brief',
        title: `Daily Compute Brief — ${dateStr}`,
        body: brief.brief_markdown,
        metadata: { hero_chart_caption: brief.hero_chart_caption, top_movers: topMovers, widest_spread: widest },
        status: 'draft',
        channels: ['blog', 'email'],
        scheduled_for: scheduledFor.toISOString(),
      },
      {
        content_type: 'social_post',
        title: `Tweet — ${dateStr}`,
        body: brief.tweet,
        metadata: { length: brief.tweet.length },
        status: 'draft',
        channels: ['twitter'],
        scheduled_for: scheduledFor.toISOString(),
      },
      {
        content_type: 'social_post',
        title: `LinkedIn — ${dateStr}`,
        body: brief.linkedin_post,
        status: 'draft',
        channels: ['linkedin'],
        scheduled_for: scheduledFor.toISOString(),
      },
    ]);

    await publishEvent({
      event_type: 'content_drafted',
      payload: { date: dateStr, items: 3 },
      source: 'worker:content-generator',
    });

    return { drafted: 3 };
  },
);
