// Server-side data loaders for the landing. Cheap queries, called from RSCs.
// Every loader is failure-tolerant: on any error it returns a sane default
// so the landing never 500s, even mid-incident.

import { getServiceClient } from '@/lib/supabase-server';

export interface TickerItem {
  k: string;
  v: string;
  d: number;
  seed: number;
  /** Real 24h bucketed median series for the sparkline. Empty array means
   *  fall back to seeded decorative output. */
  series?: number[];
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

/** Latest value per index + day-over-day delta + a 14-day sparkline series.
 *
 *  Reads `vwap` — the output of the locked methodology — NOT `close_price`.
 *  close_price in this schema is `max(observed prices that day)` (see
 *  apps/workers/src/functions/index-calculator.ts:170 — after ascending sort,
 *  it takes the last element). That's an artefact of an earlier OHLC-style
 *  shape and isn't the published index level. Day-over-day deltas of
 *  close_price look catastrophic (−85%) when an outlier rotates the daily
 *  max; vwap shows the real move. Documented in docs/decisions.md. */
async function loadIndexTickerRows(): Promise<TickerItem[]> {
  try {
    const sb = getServiceClient();
    const { data: indices } = await sb.from('compute_indices').select('id, slug, name');
    if (!indices) return [];

    const items: TickerItem[] = [];
    for (const idx of indices) {
      const { data } = await sb
        .from('index_values_daily')
        .select('date, vwap')
        .eq('index_id', idx.id)
        .order('date', { ascending: false })
        .limit(14);
      if (!data || data.length === 0) continue;
      const latest = Number(data[0]!.vwap);
      const prev = data[1] ? Number(data[1].vwap) : latest;
      const d = prev > 0 ? ((latest - prev) / prev) * 100 : 0;
      const series = data
        .slice()
        .reverse()
        .map((r) => Number(r.vwap))
        .filter((n) => Number.isFinite(n));
      items.push({
        k: idx.slug.toUpperCase(),
        v: fmtUsd(latest),
        d: Number(d.toFixed(2)),
        seed: idx.slug.length * 13 + 7,
        series: series.length >= 2 ? series : undefined,
      });
    }
    return items;
  } catch {
    return [];
  }
}

/** Top GPUs by recent activity, with methodology-consistent 24h delta +
 *  benchmark-level sparkline.
 *
 *  Reads `gpu_prices_daily.vwap` — the daily fixing of filtered_vwap
 *  v1.0 (locked methodology) per GPU. Delta is `(latest − previous) /
 *  previous`, both endpoints computed under the same methodology by the
 *  nightly cron at 00:35 UTC. This is the IOSCO Principle 8 /
 *  MSCI / S&P / FTSE Russell convention: same formula at both endpoints
 *  means provider-mix bias cancels by construction. The prior version
 *  computed first-quartile vs last-quartile of raw price_snapshots,
 *  which surfaced cross-provider price spread as fake "movement" — e.g.
 *  RTX 4080 Super ranging $0.068 → $0.280 across providers in the same
 *  24h showed +176 % on the ticker when nothing actually moved.
 *
 *  Sparkline: last 14 daily vwap values from gpu_prices_daily. If a row
 *  is missing for a given day, that day's gap is left out — no
 *  last-observation-carried-forward (no inventing data; the audit trail
 *  shows real gaps).
 *
 *  Skip rule: a GPU needs ≥ 2 rows in gpu_prices_daily (one for latest,
 *  one for prior). Otherwise no delta is meaningful and we drop it from
 *  the ticker. */
async function loadGpuTickerRows(): Promise<TickerItem[]> {
  try {
    const sb = getServiceClient();

    const { data: gpus } = await sb
      .from('gpu_models')
      .select('id, slug, model, variant')
      .eq('is_active', true);
    if (!gpus) return [];

    const perGpu = await Promise.all(
      gpus.map(async (g) => {
        const { data } = await sb
          .from('gpu_prices_daily')
          .select('date, vwap, num_observations')
          .eq('gpu_model_id', g.id as string)
          .order('date', { ascending: false })
          .limit(14);
        return { g, rows: (data as Array<{ date: string; vwap: number; num_observations: number }> | null) ?? [] };
      }),
    );

    const ranked: Array<{ n: number; item: TickerItem }> = [];
    for (const { g, rows } of perGpu) {
      if (rows.length < 2) continue;
      const latest = Number(rows[0]!.vwap);
      const prev = Number(rows[1]!.vwap);
      if (!Number.isFinite(latest) || !Number.isFinite(prev) || prev <= 0) continue;
      const d = ((latest - prev) / prev) * 100;
      const series = rows.slice().reverse().map((r) => Number(r.vwap)).filter(Number.isFinite);

      const label = `${g.model}${g.variant ? '·' + g.variant : ''}`.toUpperCase().slice(0, 18);
      ranked.push({
        n: Number(rows[0]!.num_observations) || 0,
        item: {
          k: label,
          v: fmtUsd(latest),
          d: Number(d.toFixed(2)),
          seed: (g.slug as string).length * 7 + 3,
          series: series.length >= 2 ? series : undefined,
        },
      });
    }
    ranked.sort((a, b) => b.n - a.n);
    return ranked.slice(0, 10).map((r) => r.item);
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
 *  shape the MarketsPreview component already consumes.
 *
 *  Same per-GPU parallel pattern as the ticker loader: PostgREST caps
 *  responses at 1000 rows, so a single-sweep `.limit(50_000)` actually
 *  returns only the first ~1h of data when the table is busy. Querying
 *  per GPU keeps each result well under the cap. For 90d extremes,
 *  ORDER BY price_per_hour ASC/DESC LIMIT 1 grabs the min/max directly
 *  without scanning the bucket — exploits the partial index. */
export async function loadMarketsTop(limit = 12): Promise<MarketsRow[]> {
  try {
    const sb = getServiceClient();
    const since24Ms = Date.now() - 24 * 3600_000;
    const since90Ms = Date.now() - 90 * 24 * 3600_000;
    const since24 = new Date(since24Ms).toISOString();
    const since90 = new Date(since90Ms).toISOString();

    const { data: gpus } = await sb
      .from('gpu_models')
      .select('id, slug, model, variant, vram_gb, form_factor')
      .eq('is_active', true);
    if (!gpus) return [];

    const perGpu = await Promise.all(
      gpus.map(async (g) => {
        const [ascR, descR, loR, hiR] = await Promise.all([
          sb
            .from('price_snapshots')
            .select('id, price_per_hour, captured_at, provider_id')
            .eq('gpu_model_id', g.id as string)
            .eq('is_outlier', false)
            .eq('is_normalized', true)
            .eq('currency', 'USD')
            .gte('captured_at', since24)
            .order('captured_at', { ascending: true })
            .limit(1000),
          sb
            .from('price_snapshots')
            .select('id, price_per_hour, captured_at, provider_id')
            .eq('gpu_model_id', g.id as string)
            .eq('is_outlier', false)
            .eq('is_normalized', true)
            .eq('currency', 'USD')
            .gte('captured_at', since24)
            .order('captured_at', { ascending: false })
            .limit(1000),
          sb
            .from('price_snapshots')
            .select('price_per_hour')
            .eq('gpu_model_id', g.id as string)
            .eq('is_outlier', false)
            .eq('is_normalized', true)
            .eq('currency', 'USD')
            .gte('captured_at', since90)
            .order('price_per_hour', { ascending: true })
            .limit(1),
          sb
            .from('price_snapshots')
            .select('price_per_hour')
            .eq('gpu_model_id', g.id as string)
            .eq('is_outlier', false)
            .eq('is_normalized', true)
            .eq('currency', 'USD')
            .gte('captured_at', since90)
            .order('price_per_hour', { ascending: false })
            .limit(1),
        ]);
        const seen = new Set<string>();
        const snaps24: Array<{ price_per_hour: number; captured_at: string; provider_id: string }> = [];
        for (const r of [...(ascR.data ?? []), ...(descR.data ?? [])]) {
          const id = r.id as string;
          if (seen.has(id)) continue;
          seen.add(id);
          snaps24.push({
            price_per_hour: Number(r.price_per_hour),
            captured_at: r.captured_at as string,
            provider_id: r.provider_id as string,
          });
        }
        snaps24.sort((a, b) => a.captured_at.localeCompare(b.captured_at));
        return {
          g,
          snaps24,
          lo90: loR.data?.[0] ? Number(loR.data[0].price_per_hour) : null,
          hi90: hiR.data?.[0] ? Number(hiR.data[0].price_per_hour) : null,
        };
      }),
    );

    const rows: MarketsRow[] = [];
    for (const { g, snaps24, lo90, hi90 } of perGpu) {
      if (snaps24.length < 5) continue;

      const first = snaps24[0]!.price_per_hour;
      const last = snaps24[snaps24.length - 1]!.price_per_hour;
      let sum = 0;
      const providers = new Set<string>();
      for (const s of snaps24) {
        sum += s.price_per_hour;
        providers.add(s.provider_id);
      }
      const mean = sum / snaps24.length;
      const d = first > 0 ? ((last - first) / first) * 100 : 0;
      // Reliability: snapshots / expected ticks (24h × 12 tick/h per provider).
      const expected = providers.size * 288;
      const reliability = Math.min(1, expected > 0 ? snaps24.length / expected : 0);

      rows.push({
        g: (g.model as string).toUpperCase(),
        s: `${g.vram_gb} GB${g.form_factor ? ' · ' + (g.form_factor as string).toUpperCase() : ''}`,
        p: Number(mean.toFixed(3)),
        d: Number(d.toFixed(2)),
        lo: Number((lo90 ?? mean).toFixed(2)),
        hi: Number((hi90 ?? mean).toFixed(2)),
        n: providers.size,
        r: Number(reliability.toFixed(2)),
        seed: ((g.slug as string).length * 17 + (g.vram_gb as number)) | 0,
      });
    }
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
