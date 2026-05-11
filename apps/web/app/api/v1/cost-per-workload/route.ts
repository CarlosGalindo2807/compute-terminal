// GET /api/v1/cost-per-workload?model=claude-sonnet-4-5&workload=voice_agent_3min&volume=10000
//
// First public endpoint of the v2 pivot. Translates "$/gpu-hour" into the
// metric the buyer actually cares about: $ per N units of a workload.
//
// Inputs (all required):
//   - model:    LLM model identifier (matches throughput_benchmarks.llm_model)
//   - workload: preset key from WORKLOADS below
//   - volume:   integer count of workload units to estimate
//
// Output: per-GPU cost breakdown + cheapest pick + provenance tags
// (price_source, throughput_source) so callers can audit each estimate.
//
// Data flow:
//   1. Resolve workload preset → tokens per unit
//   2. Load throughput rows for that LLM (DB first, fall back to inline defaults)
//   3. Load latest 24h median price per gpu_model from price_snapshots
//   4. Compute cost = (volume × tokens_per_unit) / tokens_per_second / 3600 × price_per_hour
//
// Pre-Trim 1 caveat: throughput_benchmarks is empty until we seed it. The
// inline DEFAULT_BENCHMARKS keep the endpoint demoable from day one; every DB
// row added overrides the matching default and is tagged source='database'.

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { checkRate, identifierForRequest } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type WorkloadSpec = { input_tokens: number; output_tokens: number; description: string };

const WORKLOADS: Record<string, WorkloadSpec> = {
  voice_agent_3min: {
    input_tokens: 500,
    output_tokens: 1500,
    description: '3-minute voice agent turn (500 in, 1500 out)',
  },
  chat_short: {
    input_tokens: 500,
    output_tokens: 500,
    description: 'Short chat exchange (500 in, 500 out)',
  },
  longform_summary: {
    input_tokens: 8000,
    output_tokens: 1000,
    description: 'Long-context document summary (8k in, 1k out)',
  },
  agent_loop_10steps: {
    input_tokens: 5000,
    output_tokens: 5000,
    description: 'Multi-step agent loop, ~10 tool calls (5k in, 5k out)',
  },
};

type BenchmarkRow = {
  gpu_model: string;
  llm_model: string;
  precision: string;
  tokens_per_second: number;
  source: 'internal' | 'mlperf' | 'vendor' | 'community' | 'inline_default';
};

// Inline fallback so the endpoint is demoable before throughput_benchmarks is
// populated. Numbers are rough public-source ballparks for end-to-end inference
// throughput at fp8/bf16 and small batch — replace with measured values as the
// table fills. See docs/cti-methodology-v1.md for the calibration protocol.
// gpu_model values must match `gpu_models.slug` for the price lookup to find
// a 24h-median; otherwise estimates fall back to `price_source: 'no_recent_snapshots'`.
const DEFAULT_BENCHMARKS: BenchmarkRow[] = [
  { gpu_model: 'h100-sxm-80', llm_model: 'claude-sonnet-4-5', precision: 'fp8', tokens_per_second: 5800, source: 'inline_default' },
  { gpu_model: 'h100-pcie-80', llm_model: 'claude-sonnet-4-5', precision: 'fp8', tokens_per_second: 4400, source: 'inline_default' },
  { gpu_model: 'h200-sxm-141', llm_model: 'claude-sonnet-4-5', precision: 'fp8', tokens_per_second: 7800, source: 'inline_default' },
  { gpu_model: 'a100-sxm-80', llm_model: 'claude-sonnet-4-5', precision: 'bf16', tokens_per_second: 2400, source: 'inline_default' },
  { gpu_model: 'b200-sxm-192', llm_model: 'claude-sonnet-4-5', precision: 'fp8', tokens_per_second: 11500, source: 'inline_default' },
  { gpu_model: 'mi300x-oam-192', llm_model: 'claude-sonnet-4-5', precision: 'fp16', tokens_per_second: 3800, source: 'inline_default' },
  { gpu_model: 'h100-sxm-80', llm_model: 'llama-3-70b', precision: 'fp8', tokens_per_second: 6400, source: 'inline_default' },
  { gpu_model: 'a100-sxm-80', llm_model: 'llama-3-70b', precision: 'bf16', tokens_per_second: 2700, source: 'inline_default' },
  { gpu_model: 'h100-sxm-80', llm_model: 'gpt-4o', precision: 'fp8', tokens_per_second: 5600, source: 'inline_default' },
  { gpu_model: 'h100-sxm-80', llm_model: 'mistral-large', precision: 'fp8', tokens_per_second: 5200, source: 'inline_default' },
];

type PriceRow = { gpu_slug: string; median_usd_hour: number; n: number };

async function loadBenchmarks(llm_model: string): Promise<BenchmarkRow[]> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from('throughput_benchmarks')
    .select('gpu_model, llm_model, precision, tokens_per_second, source')
    .eq('llm_model', llm_model);

  const fromDb: BenchmarkRow[] = (!error && data) ? data.map((r) => ({
    gpu_model: r.gpu_model as string,
    llm_model: r.llm_model as string,
    precision: r.precision as string,
    tokens_per_second: Number(r.tokens_per_second),
    source: r.source as BenchmarkRow['source'],
  })) : [];

  const defaults = DEFAULT_BENCHMARKS.filter((b) => b.llm_model === llm_model);

  // DB rows win per (gpu_model, precision); fill remaining gaps with defaults.
  const seen = new Set(fromDb.map((b) => `${b.gpu_model}::${b.precision}`));
  const merged = [...fromDb];
  for (const d of defaults) {
    if (!seen.has(`${d.gpu_model}::${d.precision}`)) merged.push(d);
  }
  return merged;
}

async function loadLatestPrices(gpu_slugs: string[]): Promise<Map<string, PriceRow>> {
  const out = new Map<string, PriceRow>();
  if (gpu_slugs.length === 0) return out;

  const sb = getServiceClient();
  // Map slugs → ids (gpu_models is small, single round-trip).
  const { data: gpus } = await sb
    .from('gpu_models')
    .select('id, slug')
    .in('slug', gpu_slugs);

  if (!gpus || gpus.length === 0) return out;

  const idToSlug = new Map<string, string>();
  for (const g of gpus) idToSlug.set(g.id as string, g.slug as string);

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: snaps } = await sb
    .from('price_snapshots')
    .select('gpu_model_id, price_per_hour, currency')
    .in('gpu_model_id', Array.from(idToSlug.keys()))
    .eq('is_outlier', false)
    .eq('currency', 'USD')
    .gte('captured_at', since);

  if (!snaps) return out;

  const buckets = new Map<string, number[]>();
  for (const s of snaps) {
    const slug = idToSlug.get(s.gpu_model_id as string);
    if (!slug) continue;
    const arr = buckets.get(slug) ?? [];
    arr.push(Number(s.price_per_hour));
    buckets.set(slug, arr);
  }
  for (const [slug, prices] of buckets) {
    if (prices.length === 0) continue;
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    // prices.length > 0 guaranteed above; index access is safe.
    const median = prices.length % 2 === 0
      ? (prices[mid - 1]! + prices[mid]!) / 2
      : prices[mid]!;
    out.set(slug, { gpu_slug: slug, median_usd_hour: median, n: prices.length });
  }
  return out;
}

export async function GET(request: Request) {
  // Rate limit before any DB work. Upstash no-ops gracefully when env vars
  // aren't set; once provisioned, each IP gets 60 req/min sliding window.
  const rate = await checkRate(`cpw:${identifierForRequest(request)}`);
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', remaining: rate.remaining, reset_at: new Date(rate.reset).toISOString() },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(rate.limit),
          'X-RateLimit-Remaining': String(rate.remaining),
          'X-RateLimit-Reset': String(rate.reset),
        },
      },
    );
  }

  const url = new URL(request.url);
  const model = url.searchParams.get('model');
  const workloadKey = url.searchParams.get('workload');
  const volumeRaw = url.searchParams.get('volume');

  if (!model || !workloadKey || !volumeRaw) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_params',
        required: ['model', 'workload', 'volume'],
        workloads_available: Object.keys(WORKLOADS),
      },
      { status: 400 },
    );
  }

  const workload = WORKLOADS[workloadKey];
  if (!workload) {
    return NextResponse.json(
      { ok: false, error: 'unknown_workload', workloads_available: Object.keys(WORKLOADS) },
      { status: 400 },
    );
  }

  const volume = Number.parseInt(volumeRaw, 10);
  if (!Number.isFinite(volume) || volume <= 0 || volume > 100_000_000) {
    return NextResponse.json(
      { ok: false, error: 'invalid_volume', accepted_range: '1..100_000_000' },
      { status: 400 },
    );
  }

  const benchmarks = await loadBenchmarks(model);
  if (benchmarks.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'no_benchmarks_for_model',
        model,
        hint: 'Seed throughput_benchmarks for this LLM, or use one of the inline-default models',
        models_with_inline_defaults: Array.from(new Set(DEFAULT_BENCHMARKS.map((b) => b.llm_model))),
      },
      { status: 404 },
    );
  }

  const priceMap = await loadLatestPrices(Array.from(new Set(benchmarks.map((b) => b.gpu_model))));

  const tokens_per_unit = workload.input_tokens + workload.output_tokens;
  const total_tokens = tokens_per_unit * volume;

  const estimates = benchmarks
    .map((b) => {
      const price = priceMap.get(b.gpu_model);
      if (!price) {
        return {
          gpu_model: b.gpu_model,
          precision: b.precision,
          tokens_per_second: b.tokens_per_second,
          throughput_source: b.source,
          price_source: 'no_recent_snapshots',
          gpu_seconds_required: total_tokens / b.tokens_per_second,
          gpu_hours_required: total_tokens / b.tokens_per_second / 3600,
          median_price_per_hour_usd: null,
          estimated_cost_usd: null,
        };
      }
      const gpu_seconds = total_tokens / b.tokens_per_second;
      const gpu_hours = gpu_seconds / 3600;
      const cost = gpu_hours * price.median_usd_hour;
      return {
        gpu_model: b.gpu_model,
        precision: b.precision,
        tokens_per_second: b.tokens_per_second,
        throughput_source: b.source,
        price_source: `vwap_24h_n=${price.n}`,
        gpu_seconds_required: gpu_seconds,
        gpu_hours_required: gpu_hours,
        median_price_per_hour_usd: price.median_usd_hour,
        estimated_cost_usd: cost,
      };
    })
    .sort((a, b) => {
      if (a.estimated_cost_usd === null) return 1;
      if (b.estimated_cost_usd === null) return -1;
      return a.estimated_cost_usd - b.estimated_cost_usd;
    });

  const cheapest = estimates.find((e) => e.estimated_cost_usd !== null) ?? null;

  return NextResponse.json({
    ok: true,
    model,
    workload: {
      key: workloadKey,
      description: workload.description,
      input_tokens_per_unit: workload.input_tokens,
      output_tokens_per_unit: workload.output_tokens,
    },
    volume,
    tokens_per_unit,
    total_tokens,
    estimates,
    cheapest: cheapest?.gpu_model ?? null,
    cheapest_cost_usd: cheapest?.estimated_cost_usd ?? null,
    computed_at: new Date().toISOString(),
    methodology_version: 'v1.0',
    disclaimer: 'Estimates use 24h-median spot prices and reference throughput numbers. Actual cost depends on batch size, sequence length, contention, and contract terms. See /methodology and docs/cti-methodology-v1.md.',
  });
}
