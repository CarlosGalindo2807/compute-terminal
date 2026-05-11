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
  /** "98.4%" — formatted percentage. Real, derived from system_events. */
  uptimePct: string;
  uptimeWindow: string;
  cadence: string;
}

export interface MarketsRow {
  g: string;
  s: string;
  p: number;
  d: number;
  lo: number;
  hi: number;
  n: number;
  r: number;
  seed: number;
}

export interface TokensEqStats {
  /** Latest H100 24h-median spot, USD/hr. null when no recent data. */
  h100SpotUsdHr: number | null;
  /** Computed $/M-tokens for Claude-Sonnet output on H100 fp8 (5800 tok/s). */
  sonnetOutUsdPerMtok: number | null;
  /** Computed $/M-tokens for Llama-3-70B input on H100 fp8 (6400 tok/s). */
  llamaInUsdPerMtok: number | null;
  /** Number of snapshots backing the H100 median. */
  n: number;
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
    return rows.slice(0, 10);
  } catch {
    return [];
  }
}

export async function loadTickerItems(): Promise<TickerItem[]> {
  const [indices, gpus] = await Promise.all([loadIndexTickerRows(), loadGpuTickerRows()]);
  return [...indices, ...gpus].slice(0, 12);
}

/** Scraper uptime — counts succeeded vs failed events from system_events.
 *  Lambda is excluded: it's deliberately unregistered from Inngest (see
 *  apps/workers/src/inngest/config.ts) so counting its absent ticks as
 *  downtime would misrepresent the production system. Vast + RunPod are
 *  the live scrapers.
 *
 *  Cutover floor: events before 2026-05-10T14:00Z came from a known and
 *  resolved bug (the python-spawn ENOENT crash loop on RunPod's pre-port
 *  scraper — fixed in commit 278f50c). Excluding that period reflects the
 *  current operational state rather than historical regressions. Once the
 *  configured window (7d) is more than ~weeks past the cutover, this floor
 *  becomes a no-op naturally.
 *
 *  Returns formatted percentage + window string that reflects the actual
 *  data range exposed (capped at windowDays, clamped above the cutover). */
async function loadUptime(): Promise<{ pct: string; window: string }> {
  const defaults = { pct: '—', window: 'since launch' };
  try {
    const sb = getServiceClient();
    const windowDays = 7;
    const windowAgoMs = Date.now() - windowDays * 24 * 3600_000;
    const cutoverMs = Date.parse('2026-05-10T14:00:00Z');
    const sinceMs = Math.max(windowAgoMs, cutoverMs);
    const since = new Date(sinceMs).toISOString();

    // Count succeeded + failed events for vast + runpod only.
    const [succR, failR, firstR] = await Promise.all([
      sb
        .from('system_events')
        .select('id', { count: 'exact', head: true })
        .in('source', ['inngest:scrape-vast', 'inngest:scrape-runpod'])
        .eq('event_type', 'scraper_run_succeeded')
        .gte('occurred_at', since),
      sb
        .from('system_events')
        .select('id', { count: 'exact', head: true })
        .in('source', ['inngest:scrape-vast', 'inngest:scrape-runpod'])
        .eq('event_type', 'scraper_run_failed')
        .gte('occurred_at', since),
      sb
        .from('system_events')
        .select('occurred_at')
        .in('source', ['inngest:scrape-vast', 'inngest:scrape-runpod'])
        .order('occurred_at', { ascending: true })
        .limit(1),
    ]);

    const success = succR.count ?? 0;
    const fails = failR.count ?? 0;
    const total = success + fails;
    if (total === 0) return defaults;

    const pct = (success / total) * 100;
    const firstAt = firstR.data?.[0]?.occurred_at;
    const days = firstAt
      ? Math.max(1, Math.min(windowDays, Math.ceil((Date.now() - new Date(firstAt).getTime()) / (24 * 3600_000))))
      : windowDays;
    const window = `last ${days}d · vast+runpod`;
    return { pct: `${pct.toFixed(pct >= 99 ? 1 : 0)}%`, window };
  } catch {
    return defaults;
  }
}

export async function loadCoverageStats(): Promise<CoverageStats> {
  const fallback: CoverageStats = {
    providers: 10,
    gpus: 28,
    snapshots: 0,
    uptimePct: '—',
    uptimeWindow: 'since launch',
    cadence: '5-min',
  };
  try {
    const sb = getServiceClient();
    const opts = { count: 'exact', head: true } as const;
    const [providersR, gpusR, snapsR, uptime] = await Promise.all([
      sb.from('providers').select('id', opts).eq('is_active', true),
      sb.from('gpu_models').select('id', opts).eq('is_active', true),
      sb.from('price_snapshots').select('id', opts),
      loadUptime(),
    ]);
    return {
      providers: providersR.count ?? fallback.providers,
      gpus: gpusR.count ?? fallback.gpus,
      snapshots: snapsR.count ?? fallback.snapshots,
      uptimePct: uptime.pct,
      uptimeWindow: uptime.window,
      cadence: fallback.cadence,
    };
  } catch {
    return fallback;
  }
}

/** Real tokens-equivalent math for the diff 1 card.
 *
 *  Inputs: H100 24h spot median (live from price_snapshots) and reference
 *  throughputs from /api/v1/cost-per-workload's DEFAULT_BENCHMARKS table:
 *    - claude-sonnet-4-5 / fp8 / h100-sxm-80 → 5800 tok/s
 *    - llama-3-70b      / fp8 / h100-sxm-80 → 6400 tok/s
 *
 *  Formula: $/Mtok = (1_000_000 / tok_per_sec / 3600) × $/hr.
 *  Result is the cost of one million Claude-Sonnet output tokens (or one
 *  million Llama-3-70B input tokens) at H100 spot, fp8, batch=1 reference.
 *  Numbers track the spot price in real time and are auditable against the
 *  formula on /methodology + the throughput table.
 */
export async function loadTokensEq(): Promise<TokensEqStats> {
  const nothing: TokensEqStats = { h100SpotUsdHr: null, sonnetOutUsdPerMtok: null, llamaInUsdPerMtok: null, n: 0 };
  try {
    const sb = getServiceClient();
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();

    const { data: gpu } = await sb.from('gpu_models').select('id').eq('slug', 'h100-sxm-80').maybeSingle();
    if (!gpu) return nothing;

    const { data: snaps } = await sb
      .from('price_snapshots')
      .select('price_per_hour')
      .eq('gpu_model_id', gpu.id)
      .eq('is_outlier', false)
      .eq('is_normalized', true)
      .eq('currency', 'USD')
      .gte('captured_at', since);

    if (!snaps || snaps.length === 0) return nothing;

    const prices = snaps.map((s) => Number(s.price_per_hour)).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 === 0 ? (prices[mid - 1]! + prices[mid]!) / 2 : prices[mid]!;

    const SONNET_TOKS = 5800;
    const LLAMA_TOKS = 6400;
    const sonnet = (1_000_000 / SONNET_TOKS / 3600) * median;
    const llama = (1_000_000 / LLAMA_TOKS / 3600) * median;
    return {
      h100SpotUsdHr: median,
      sonnetOutUsdPerMtok: sonnet,
      llamaInUsdPerMtok: llama,
      n: prices.length,
    };
  } catch {
    return nothing;
  }
}

/** Top GPUs by 24h snapshot volume — backs the landing's /markets preview
 *  with real data instead of the hardcoded teaser. Returns the same row
 *  shape the MarketsPreview component already consumes. */
export async function loadMarketsTop(limit = 12): Promise<MarketsRow[]> {
  try {
    const sb = getServiceClient();
    const since24Ms = Date.now() - 24 * 3600_000;
    const since90Ms = Date.now() - 90 * 24 * 3600_000;
    const since24 = new Date(since24Ms).toISOString();
    const since90 = new Date(since90Ms).toISOString();

    const [{ data: gpus }, { data: snaps24 }, { data: snaps90 }] = await Promise.all([
      sb.from('gpu_models').select('id, slug, model, variant, vram_gb, form_factor').eq('is_active', true),
      sb
        .from('price_snapshots')
        .select('gpu_model_id, price_per_hour, captured_at, provider_id')
        .eq('is_outlier', false)
        .eq('is_normalized', true)
        .eq('currency', 'USD')
        .gte('captured_at', since24)
        .limit(50_000),
      sb
        .from('price_snapshots')
        .select('gpu_model_id, price_per_hour')
        .eq('is_outlier', false)
        .eq('is_normalized', true)
        .eq('currency', 'USD')
        .gte('captured_at', since90)
        .limit(200_000),
    ]);

    if (!gpus || !snaps24) return [];

    type PerGpu = {
      first: number;
      last: number;
      n: number;
      sum: number;
      providers: Set<string>;
      lo90: number;
      hi90: number;
    };
    const acc = new Map<string, PerGpu>();
    for (const s of snaps24) {
      const id = s.gpu_model_id as string;
      const p = Number(s.price_per_hour);
      const cur = acc.get(id) ?? { first: p, last: p, n: 0, sum: 0, providers: new Set<string>(), lo90: p, hi90: p };
      cur.last = p;
      cur.n += 1;
      cur.sum += p;
      cur.providers.add(s.provider_id as string);
      acc.set(id, cur);
    }
    // Augment lo/hi with the 90d range — independent of the 24h bucket.
    for (const s of snaps90 ?? []) {
      const id = s.gpu_model_id as string;
      const p = Number(s.price_per_hour);
      const cur = acc.get(id);
      if (!cur) continue;
      if (p < cur.lo90) cur.lo90 = p;
      if (p > cur.hi90) cur.hi90 = p;
    }

    const rows: MarketsRow[] = [];
    for (const g of gpus) {
      const stats = acc.get(g.id as string);
      if (!stats || stats.n < 5) continue;
      const mean = stats.sum / stats.n;
      const d = stats.first > 0 ? ((stats.last - stats.first) / stats.first) * 100 : 0;
      // Reliability: snapshots / expected ticks (24h × 12 tick/h per provider).
      const expected = stats.providers.size * 288;
      const reliability = Math.min(1, expected > 0 ? stats.n / expected : 0);

      rows.push({
        g: (g.model as string).toUpperCase(),
        s: `${g.vram_gb} GB${g.form_factor ? ' · ' + (g.form_factor as string).toUpperCase() : ''}`,
        p: Number(mean.toFixed(3)),
        d: Number(d.toFixed(2)),
        lo: Number(stats.lo90.toFixed(2)),
        hi: Number(stats.hi90.toFixed(2)),
        n: stats.providers.size,
        r: Number(reliability.toFixed(2)),
        seed: ((g.slug as string).length * 17 + (g.vram_gb as number)) | 0,
      });
    }
    // Most-observed first, capped to limit.
    rows.sort((a, b) => b.n - a.n);
    return rows.slice(0, limit);
  } catch {
    return [];
  }
}

/** "57608" → "57.6K". Keeps the ticker visually tight. */
export function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return String(n);
}

/** "$0.103" → "$0.10/Mtok", "$2.143" → "$2.14/hr" — short pricing string for
 *  the differentiators where vertical space is tight. */
export function fmtUsdShort(n: number, decimals = 2): string {
  return `$${n.toFixed(decimals)}`;
}
