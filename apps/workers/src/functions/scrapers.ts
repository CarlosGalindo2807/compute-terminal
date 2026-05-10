// Scraper Inngest functions — all TS-native, run anywhere Node runs.
//
// scrape-vast      : Vast.ai REST bundles endpoint.
// scrape-runpod    : RunPod GraphQL.
// scrape-lambda    : Lambda Labs marketing page (HTML, regex parse).

import { getServiceClient } from '@compute-terminal/db';
import { normalizeGpuString } from '@compute-terminal/shared/normalize-fastpath';

import { inngest } from '../inngest/client';
import { publishEvent } from '../inngest/publish-event';

type Sb = ReturnType<typeof getServiceClient>;

// ────────────────────────────────────────────────
// Common types + helpers
// ────────────────────────────────────────────────

export interface ParsedListing {
  raw_gpu_string: string;
  price_per_hour: number;
  num_gpus: number;
  region: string | null;
  interconnect: string | null;
  availability_count: number | null;
  raw_payload: Record<string, unknown>;
}

function supabaseHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host;
  } catch {
    return 'invalid';
  }
}

// ────────────────────────────────────────────────
// scrape-vast (Vast.ai REST)
// ────────────────────────────────────────────────

const VAST_ENDPOINT = 'https://console.vast.ai/api/v0/bundles/';

interface VastOffer {
  id?: number;
  gpu_name?: string;
  gpu_model?: string;
  dph_total?: number;
  num_gpus?: number;
  geolocation?: string;
  country?: string;
  rentable?: boolean;
  nvlink?: boolean;
  pcie_bw?: number;
  pcie_gen?: number;
  reliability2?: number;
  reliability?: number;
  verified?: boolean;
  host_id?: number;
  datacenter?: number;
  inet_up?: number;
  inet_down?: number;
  machine_id?: number;
  dlperf?: number;
}

export const scrapeVast = inngest.createFunction(
  { id: 'scrape-vast', name: 'Scrape Vast.ai (native TS)' },
  { cron: '*/5 * * * *' },
  async ({ logger }) => {
    const sb = getServiceClient();
    const startedAt = Date.now();

    const lookup = await sb.from('providers').select('id').eq('slug', 'vast').maybeSingle();
    if (!lookup.data) {
      // Diagnostic: tells us which Supabase the deployed function is actually
      // pointing at, without leaking the key. This is the line that fired silently
      // in early production (env mismatch on Vercel pointing at the wrong project).
      await publishEvent({
        event_type: 'scraper_run_failed',
        entity_type: 'provider',
        entity_id: 'vast',
        payload: {
          reason: 'provider_lookup_returned_no_row',
          lookup_error: lookup.error?.message ?? null,
          supabase_host: supabaseHost(),
          service_key_present: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
        source: 'inngest:scrape-vast',
      });
      return { ok: false, reason: 'provider_lookup_failed' };
    }
    const providerId = lookup.data.id;

    let offers: VastOffer[];
    try {
      const r = await fetch(VAST_ENDPOINT, {
        headers: { 'User-Agent': 'ComputeTerminalBot/0.1 (+https://computeterminal.io)' },
        signal: AbortSignal.timeout(20_000),
      });
      if (!r.ok) throw new Error(`vast HTTP ${r.status}`);
      const body = (await r.json()) as { offers?: VastOffer[] };
      offers = body.offers ?? [];
    } catch (err) {
      await publishEvent({
        event_type: 'scraper_run_failed',
        entity_type: 'provider',
        entity_id: providerId,
        payload: { error: (err as Error).message },
        source: 'inngest:scrape-vast',
      });
      throw err;
    }

    const parsed: ParsedListing[] = [];
    for (const offer of offers) {
      const p = parseVastOffer(offer);
      if (p) parsed.push(p);
    }

    const result = await persistListings(sb, parsed, providerId);

    await publishEvent({
      event_type: 'scraper_run_succeeded',
      entity_type: 'provider',
      entity_id: providerId,
      payload: { ...result, duration_ms: Date.now() - startedAt },
      source: 'inngest:scrape-vast',
    });

    logger.info(result, 'scrape-vast done');
    return { ok: true, ...result };
  },
);

export function parseVastOffer(offer: VastOffer): ParsedListing | null {
  const name = offer.gpu_name ?? offer.gpu_model;
  const dph = offer.dph_total;
  const numGpus = offer.num_gpus ?? 1;
  if (!name || dph === undefined || dph <= 0 || numGpus <= 0) return null;
  return {
    raw_gpu_string: String(name).trim(),
    price_per_hour: dph / numGpus,
    num_gpus: numGpus,
    region: offer.geolocation ?? offer.country ?? null,
    interconnect: offer.nvlink
      ? 'nvlink'
      : offer.pcie_bw || offer.pcie_gen
        ? `pcie:${offer.pcie_bw ?? offer.pcie_gen}`
        : null,
    availability_count: offer.rentable ? 1 : 0,
    raw_payload: {
      id: offer.id,
      machine_id: offer.machine_id,
      dph_total: offer.dph_total,
      dlperf: offer.dlperf,
      reliability: offer.reliability2 ?? offer.reliability,
      verified: offer.verified,
      rentable: offer.rentable,
      host_id: offer.host_id,
      datacenter: offer.datacenter,
      inet_up: offer.inet_up,
      inet_down: offer.inet_down,
    },
  };
}

// ────────────────────────────────────────────────
// scrape-runpod (RunPod GraphQL)
// ────────────────────────────────────────────────

const RUNPOD_ENDPOINT = 'https://api.runpod.io/graphql';

const RUNPOD_QUERY = `
query GpuTypes {
  gpuTypes {
    id
    displayName
    memoryInGb
    secureCloud
    communityCloud
    lowestPrice(input: {gpuCount: 1}) {
      minimumBidPrice
      uninterruptablePrice
    }
  }
}`.trim();

interface RunpodGpuType {
  id?: string;
  displayName?: string;
  memoryInGb?: number | null;
  secureCloud?: boolean;
  communityCloud?: boolean;
  lowestPrice?: { minimumBidPrice?: number | null; uninterruptablePrice?: number | null } | null;
}

export const scrapeRunpod = inngest.createFunction(
  { id: 'scrape-runpod', name: 'Scrape RunPod (native TS)' },
  { cron: '*/5 * * * *' },
  async ({ logger }) => {
    const sb = getServiceClient();
    const startedAt = Date.now();

    const lookup = await sb.from('providers').select('id').eq('slug', 'runpod').maybeSingle();
    if (!lookup.data) {
      await publishEvent({
        event_type: 'scraper_run_failed',
        entity_type: 'provider',
        entity_id: 'runpod',
        payload: {
          reason: 'provider_lookup_returned_no_row',
          lookup_error: lookup.error?.message ?? null,
          supabase_host: supabaseHost(),
          service_key_present: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
        source: 'inngest:scrape-runpod',
      });
      return { ok: false, reason: 'provider_lookup_failed' };
    }
    const providerId = lookup.data.id;

    let gpuTypes: RunpodGpuType[];
    try {
      const r = await fetch(RUNPOD_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ComputeTerminalBot/0.1 (+https://computeterminal.io)',
        },
        body: JSON.stringify({ query: RUNPOD_QUERY }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!r.ok) throw new Error(`runpod HTTP ${r.status}`);
      const body = (await r.json()) as { data?: { gpuTypes?: RunpodGpuType[] }; errors?: unknown };
      if (body.errors) throw new Error(`runpod GraphQL errors: ${JSON.stringify(body.errors)}`);
      gpuTypes = body.data?.gpuTypes ?? [];
    } catch (err) {
      await publishEvent({
        event_type: 'scraper_run_failed',
        entity_type: 'provider',
        entity_id: providerId,
        payload: { error: (err as Error).message },
        source: 'inngest:scrape-runpod',
      });
      throw err;
    }

    const parsed: ParsedListing[] = [];
    for (const gt of gpuTypes) {
      for (const p of parseRunpodGpuType(gt)) parsed.push(p);
    }

    const result = await persistListings(sb, parsed, providerId);

    await publishEvent({
      event_type: 'scraper_run_succeeded',
      entity_type: 'provider',
      entity_id: providerId,
      payload: { ...result, duration_ms: Date.now() - startedAt },
      source: 'inngest:scrape-runpod',
    });

    logger.info(result, 'scrape-runpod done');
    return { ok: true, ...result };
  },
);

export function parseRunpodGpuType(gt: RunpodGpuType): ParsedListing[] {
  const name = (gt.displayName ?? '').trim();
  if (!name) return [];
  const lowest = gt.lowestPrice ?? {};
  const onDemand = lowest.uninterruptablePrice;
  const spot = lowest.minimumBidPrice;
  const out: ParsedListing[] = [];

  const make = (price: number, region: string, interconnect: string): ParsedListing => ({
    raw_gpu_string: name,
    price_per_hour: price,
    num_gpus: 1,
    region,
    interconnect,
    availability_count: null,
    raw_payload: {
      id: gt.id,
      memoryInGb: gt.memoryInGb,
      secureCloud: gt.secureCloud,
      communityCloud: gt.communityCloud,
      tier: region,
      pricing_type: interconnect,
    },
  });

  if (gt.secureCloud && typeof onDemand === 'number' && onDemand > 0) {
    out.push(make(onDemand, 'secure', 'on_demand'));
  }
  if (gt.communityCloud && typeof onDemand === 'number' && onDemand > 0) {
    out.push(make(onDemand, 'community', 'on_demand'));
  }
  if (typeof spot === 'number' && spot > 0) {
    out.push(make(spot, 'community', 'spot'));
  }
  return out;
}

// ────────────────────────────────────────────────
// scrape-lambda (Lambda Labs HTML, regex parse)
// ────────────────────────────────────────────────

const LAMBDA_URL = 'https://lambdalabs.com/service/gpu-cloud';

// Extract GPU mention and a nearby price (within 200 chars of plain text).
// The page is JS-heavy; this tolerates table-or-grid markup variations and is
// resilient to whitespace/tag noise. Order matters: longer GPU names first so
// "H100 SXM" matches before bare "H100".
const LAMBDA_PAIR_RE =
  /\b((?:H200|H100|B200|GB200|A100|A6000|L40S|MI300X)[A-Za-z0-9 \-]{0,40})[\s\S]{0,200}?\$([0-9]+(?:\.[0-9]+)?)\s*\/?\s*(?:hour|hr|h)\b/gi;

export const scrapeLambda = inngest.createFunction(
  { id: 'scrape-lambda_labs', name: 'Scrape Lambda Labs (native TS)' },
  { cron: '*/5 * * * *' },
  async ({ logger }) => {
    const sb = getServiceClient();
    const startedAt = Date.now();

    // Provider seed slug is 'lambda' (the Inngest function id stays
    // 'scrape-lambda_labs' for historical continuity with the old Python spawn).
    const lookup = await sb.from('providers').select('id').eq('slug', 'lambda').maybeSingle();
    if (!lookup.data) {
      await publishEvent({
        event_type: 'scraper_run_failed',
        entity_type: 'provider',
        entity_id: 'lambda',
        payload: {
          reason: 'provider_lookup_returned_no_row',
          lookup_error: lookup.error?.message ?? null,
          supabase_host: supabaseHost(),
          service_key_present: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
        source: 'inngest:scrape-lambda_labs',
      });
      return { ok: false, reason: 'provider_lookup_failed' };
    }
    const providerId = lookup.data.id;

    let html: string;
    try {
      const r = await fetch(LAMBDA_URL, {
        headers: { 'User-Agent': 'ComputeTerminalBot/0.1 (+https://computeterminal.io)' },
        signal: AbortSignal.timeout(20_000),
      });
      if (!r.ok) throw new Error(`lambda HTTP ${r.status}`);
      html = await r.text();
    } catch (err) {
      await publishEvent({
        event_type: 'scraper_run_failed',
        entity_type: 'provider',
        entity_id: providerId,
        payload: { error: (err as Error).message },
        source: 'inngest:scrape-lambda_labs',
      });
      throw err;
    }

    const parsed = parseLambdaHtml(html);

    if (parsed.length === 0) {
      // The page is JS-rendered; if the HTML payload doesn't contain prices, we
      // can't recover without a headless browser. Surface as a failure so the
      // reliability score reflects the scraper's actual capability.
      await publishEvent({
        event_type: 'scraper_run_failed',
        entity_type: 'provider',
        entity_id: providerId,
        payload: {
          reason: 'no_listings_in_static_html',
          html_bytes: html.length,
        },
        source: 'inngest:scrape-lambda_labs',
      });
      return { ok: false, saved: 0, unmatched: 0, reason: 'no_listings_in_static_html' };
    }

    const result = await persistListings(sb, parsed, providerId);

    await publishEvent({
      event_type: 'scraper_run_succeeded',
      entity_type: 'provider',
      entity_id: providerId,
      payload: { ...result, duration_ms: Date.now() - startedAt },
      source: 'inngest:scrape-lambda_labs',
    });

    logger.info(result, 'scrape-lambda done');
    return { ok: true, ...result };
  },
);

export function parseLambdaHtml(html: string): ParsedListing[] {
  // Strip tags so the GPU↔price pair regex doesn't have to traverse markup
  // boundaries. Keeps numeric/alphabetic text intact.
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

  const seen = new Set<string>();
  const out: ParsedListing[] = [];
  for (const m of text.matchAll(LAMBDA_PAIR_RE)) {
    const rawGpu = m[1]!.trim().replace(/\s+/g, ' ');
    const price = Number.parseFloat(m[2]!);
    if (!Number.isFinite(price) || price <= 0) continue;
    const key = `${rawGpu.toLowerCase()}|${price.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      raw_gpu_string: rawGpu,
      price_per_hour: price,
      num_gpus: 1,
      region: null,
      interconnect: null,
      availability_count: null,
      raw_payload: { source: 'html_regex', match_index: m.index ?? null },
    });
  }
  return out;
}

// ────────────────────────────────────────────────
// Shared persistence path
// ────────────────────────────────────────────────

async function persistListings(
  sb: Sb,
  listings: ParsedListing[],
  providerId: string,
): Promise<{ saved: number; unmatched: number }> {
  let unmatched = 0;
  const batch: Array<Record<string, unknown>> = [];
  for (const l of listings) {
    const gpuId = await normalizeGpuString(sb, l.raw_gpu_string, {
      providerId,
      rawPayload: l.raw_payload,
    });
    if (!gpuId) unmatched++;
    batch.push({
      provider_id: providerId,
      gpu_model_id: gpuId,
      region: l.region,
      price_per_hour: l.price_per_hour,
      currency: 'USD',
      num_gpus: l.num_gpus,
      interconnect: l.interconnect,
      availability_count: l.availability_count,
      raw_payload: l.raw_payload,
      raw_gpu_string: l.raw_gpu_string,
      is_normalized: gpuId !== null,
    });
  }

  if (batch.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < batch.length; i += CHUNK) {
      await sb.from('price_snapshots').insert(batch.slice(i, i + CHUNK));
    }
  }

  await sb
    .from('providers')
    .update({ consecutive_failures: 0, last_success_at: new Date().toISOString() })
    .eq('id', providerId);

  return { saved: batch.length, unmatched };
}
