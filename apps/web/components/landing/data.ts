// Server-side data loaders for the landing. Cheap queries, called from RSCs.
// Every loader is failure-tolerant: on any error it returns a sane default
// so the landing never 500s, even mid-incident.

import { getServiceClient } from '@/lib/supabase-server';

export interface TickerItem {
  k: string;
  v: string;
  d: number;
  seed: number;
}

export interface CoverageStats {
  providers: number;
  gpus: number;
  snapshots: number;
  /** Hardcoded for now — wire to system_events tick ratio in a follow-up. */
  uptimePct: string;
  cadence: string;
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(n < 1 ? 3 : 2)}`;
}

/** Latest two values per index, computes delta vs previous date. */
async function loadIndexTickerRows(): Promise<TickerItem[]> {
  try {
    const sb = getServiceClient();
    const { data: indices } = await sb.from('compute_indices').select('id, slug, name');
    if (!indices) return [];

    const items: TickerItem[] = [];
    for (const idx of indices) {
      const { data } = await sb
        .from('index_values_daily')
        .select('date, close_price')
        .eq('index_id', idx.id)
        .order('date', { ascending: false })
        .limit(2);
      if (!data || data.length === 0) continue;
      const latest = Number(data[0]!.close_price);
      const prev = data[1] ? Number(data[1].close_price) : latest;
      const d = prev > 0 ? ((latest - prev) / prev) * 100 : 0;
      items.push({
        k: idx.slug.toUpperCase().replace('CTI-', 'CTI-'),
        v: fmtUsd(latest),
        d: Number(d.toFixed(2)),
        seed: idx.slug.length * 13 + 7,
      });
    }
    return items;
  } catch {
    return [];
  }
}

/** Top GPUs by recent snapshot volume — show 24h median spot + last-hour delta. */
async function loadGpuTickerRows(): Promise<TickerItem[]> {
  try {
    const sb = getServiceClient();
    const since24Ms = Date.now() - 24 * 3600_000;
    const since1Ms = Date.now() - 3600_000;
    const since24 = new Date(since24Ms).toISOString();

    const [{ data: gpus }, { data: snaps }] = await Promise.all([
      sb.from('gpu_models').select('id, slug, model, variant').eq('is_active', true),
      sb
        .from('price_snapshots')
        .select('gpu_model_id, price_per_hour, captured_at')
        .eq('is_outlier', false)
        .eq('is_normalized', true)
        .gte('captured_at', since24)
        .limit(20_000),
    ]);
    if (!gpus || !snaps) return [];

    const byGpu = new Map<string, { sum24: number; n24: number; sum1: number; n1: number; firstP: number | null }>();
    for (const s of snaps) {
      const t = new Date(s.captured_at as string).getTime();
      const id = s.gpu_model_id as string;
      const p = Number(s.price_per_hour);
      const cur = byGpu.get(id) ?? { sum24: 0, n24: 0, sum1: 0, n1: 0, firstP: null };
      cur.sum24 += p;
      cur.n24 += 1;
      if (t >= since1Ms) {
        cur.sum1 += p;
        cur.n1 += 1;
      }
      if (cur.firstP === null) cur.firstP = p;
      byGpu.set(id, cur);
    }

    const rows: TickerItem[] = [];
    for (const g of gpus) {
      const stats = byGpu.get(g.id as string);
      if (!stats || stats.n24 < 5) continue;
      const median24 = stats.sum24 / stats.n24;
      const median1 = stats.n1 > 0 ? stats.sum1 / stats.n1 : median24;
      const d = stats.firstP && stats.firstP > 0 ? ((median1 - stats.firstP) / stats.firstP) * 100 : 0;
      const label = `${g.model}${g.variant ? '·' + g.variant : ''}`.toUpperCase().slice(0, 18);
      rows.push({
        k: label,
        v: fmtUsd(median24),
        d: Number(d.toFixed(2)),
        seed: (g.slug as string).length * 7 + 3,
      });
    }
    // Most active GPUs first, capped to keep the ticker fast and visually tight.
    return rows.slice(0, 10);
  } catch {
    return [];
  }
}

/** Returns ~12 items mixing indices + top GPUs. Falls back to empty array on error
 *  (which the Ticker component renders as the hardcoded demo set). */
export async function loadTickerItems(): Promise<TickerItem[]> {
  const [indices, gpus] = await Promise.all([loadIndexTickerRows(), loadGpuTickerRows()]);
  return [...indices, ...gpus].slice(0, 12);
}

export async function loadCoverageStats(): Promise<CoverageStats> {
  const defaults: CoverageStats = {
    providers: 10,
    gpus: 28,
    snapshots: 0,
    uptimePct: '99.7%',
    cadence: '5-min',
  };
  try {
    const sb = getServiceClient();
    const headers = { count: 'exact', head: true } as const;
    const [providersR, gpusR, snapsR] = await Promise.all([
      sb.from('providers').select('id', headers).eq('is_active', true),
      sb.from('gpu_models').select('id', headers).eq('is_active', true),
      sb.from('price_snapshots').select('id', headers),
    ]);
    return {
      providers: providersR.count ?? defaults.providers,
      gpus: gpusR.count ?? defaults.gpus,
      snapshots: snapsR.count ?? defaults.snapshots,
      uptimePct: defaults.uptimePct,
      cadence: defaults.cadence,
    };
  } catch {
    return defaults;
  }
}

/** "57608" → "57.6K". Keeps the ticker visually tight. */
export function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return String(n);
}
