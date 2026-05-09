// Scraper Inngest functions.
//
// scrape-vast: TS-native (runs on Vercel/Inngest cloud — no Python dependency).
// scrape-runpod / scrape-lambda: spawn the local Python scrapers; only used in
// local dev. They no-op cleanly on Vercel because the venv binary won't exist
// (the spawn fires an `error` event we catch and publish as scraper_run_failed).

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve as pathResolve } from 'node:path';

import { getServiceClient } from '@compute-terminal/db';
import { normalizeGpuString } from '@compute-terminal/shared/normalize-fastpath';

import { inngest } from '../inngest/client';
import { publishEvent } from '../inngest/publish-event';

// ────────────────────────────────────────────────
// scrape-vast (TS-native, runs anywhere Node runs)
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

    const { data: provider } = await sb
      .from('providers')
      .select('id')
      .eq('slug', 'vast')
      .single();
    if (!provider) throw new Error('provider vast not seeded');
    const providerId = provider.id;

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

    let unmatched = 0;
    const batch: Array<Record<string, unknown>> = [];
    for (const offer of offers) {
      const parsed = parseOffer(offer);
      if (!parsed) continue;
      const gpuId = await normalizeGpuString(sb, parsed.raw_gpu_string, {
        providerId,
        rawPayload: parsed.raw_payload,
      });
      if (!gpuId) unmatched++;
      batch.push({
        provider_id: providerId,
        gpu_model_id: gpuId,
        region: parsed.region,
        price_per_hour: parsed.price_per_hour,
        currency: 'USD',
        num_gpus: parsed.num_gpus,
        interconnect: parsed.interconnect,
        availability_count: parsed.availability_count,
        raw_payload: parsed.raw_payload,
        raw_gpu_string: parsed.raw_gpu_string,
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

    await publishEvent({
      event_type: 'scraper_run_succeeded',
      entity_type: 'provider',
      entity_id: providerId,
      payload: { saved: batch.length, unmatched, duration_ms: Date.now() - startedAt },
      source: 'inngest:scrape-vast',
    });

    logger.info({ saved: batch.length, unmatched }, 'scrape-vast done');
    return { ok: true, saved: batch.length, unmatched };
  },
);

function parseOffer(offer: VastOffer): {
  raw_gpu_string: string;
  price_per_hour: number;
  num_gpus: number;
  region: string | null;
  interconnect: string | null;
  availability_count: number | null;
  raw_payload: Record<string, unknown>;
} | null {
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
// scrape-runpod / scrape-lambda (Python spawn, local-only)
// ────────────────────────────────────────────────

const SCRAPERS_DIR = pathResolve(process.env.SCRAPERS_DIR ?? '../scrapers');

function resolvePython(): string {
  const isWin = process.platform === 'win32';
  const venvPython = isWin
    ? join(SCRAPERS_DIR, '.venv', 'Scripts', 'python.exe')
    : join(SCRAPERS_DIR, '.venv', 'bin', 'python');
  if (existsSync(venvPython)) return venvPython;
  return isWin ? 'py' : 'python3';
}

function runPythonScraper(provider: string): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const python = resolvePython();
    let child;
    try {
      child = spawn(python, ['-m', 'core.cli', provider], {
        cwd: SCRAPERS_DIR,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      resolve({ ok: false, output: `spawn failed: ${(err as Error).message}` });
      return;
    }
    const chunks: Buffer[] = [];
    child.on('error', (err) => resolve({ ok: false, output: `spawn error: ${err.message}` }));
    child.stdout?.on('data', (b) => chunks.push(b));
    child.stderr?.on('data', (b) => chunks.push(b));
    child.on('exit', (code) => resolve({ ok: code === 0, output: Buffer.concat(chunks).toString('utf8') }));
  });
}

const makeShellScraper = (provider: string) =>
  inngest.createFunction(
    { id: `scrape-${provider}`, name: `Scrape ${provider} (Python spawn)` },
    { cron: '*/5 * * * *' },
    async () => {
      const r = await runPythonScraper(provider);
      if (!r.ok) {
        await publishEvent({
          event_type: 'scraper_run_failed',
          entity_type: 'provider',
          entity_id: provider,
          payload: { tail: r.output.slice(-500) },
          source: `inngest:scrape-${provider}`,
        });
      }
      return { provider, ok: r.ok };
    },
  );

export const scrapeRunpod = makeShellScraper('runpod');
export const scrapeLambda = makeShellScraper('lambda_labs');
