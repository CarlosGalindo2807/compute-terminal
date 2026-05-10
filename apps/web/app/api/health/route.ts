// Diagnostic endpoint. Returns what env the running function sees + a real
// roundtrip to Supabase + a couple of canary queries that the prod pages depend
// on. Used to localize: env-mismatch vs network-timeout vs RLS misconfig.
//
// Safe to expose: keys are NOT returned, only their prefix and length so we can
// tell legacy JWT (`eyJ...`) apart from the new `sb_secret_...` format.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function fingerprint(value: string | undefined): { present: boolean; length: number; prefix: string | null } {
  if (!value) return { present: false, length: 0, prefix: null };
  return { present: true, length: value.length, prefix: value.slice(0, 7) };
}

function safeHost(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return 'invalid-url';
  }
}

export async function GET() {
  const startedAt = Date.now();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SB_SECRET_KEY;

  const env = {
    supabase_host: safeHost(url),
    service_key: fingerprint(key),
    anon_key: fingerprint(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SB_PUBLISHABLE_KEY),
    inngest_signing_key_present: Boolean(process.env.INNGEST_SIGNING_KEY),
    inngest_event_key_present: Boolean(process.env.INNGEST_EVENT_KEY),
    vercel_region: process.env.VERCEL_REGION ?? null,
    vercel_env: process.env.VERCEL_ENV ?? null,
  };

  if (!url || !key) {
    return NextResponse.json({ ok: false, reason: 'missing_env', env, total_ms: Date.now() - startedAt }, { status: 200 });
  }

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const probes: Record<string, unknown> = {};

  const t1 = Date.now();
  const provLookup = await sb.from('providers').select('slug', { count: 'exact' }).eq('slug', 'vast');
  probes.providers_vast_lookup = {
    ms: Date.now() - t1,
    count: provLookup.count ?? null,
    rows: provLookup.data?.length ?? 0,
    error: provLookup.error?.message ?? null,
  };

  const t2 = Date.now();
  const idxLookup = await sb.from('compute_indices').select('slug, name, is_active').eq('slug', 'cti-composite').maybeSingle();
  probes.index_cti_composite = {
    ms: Date.now() - t2,
    found: Boolean(idxLookup.data),
    error: idxLookup.error?.message ?? null,
  };

  const t3 = Date.now();
  const gpuLookup = await sb.from('gpu_models').select('slug, model').eq('slug', 'h200-sxm-141').maybeSingle();
  probes.gpu_h200_lookup = {
    ms: Date.now() - t3,
    found: Boolean(gpuLookup.data),
    error: gpuLookup.error?.message ?? null,
  };

  const t4 = Date.now();
  const snapAgg = await sb
    .from('price_snapshots')
    .select('*', { count: 'exact', head: true })
    .gte('captured_at', new Date(Date.now() - 86400_000).toISOString());
  probes.snapshots_24h_count = {
    ms: Date.now() - t4,
    count: snapAgg.count ?? null,
    error: snapAgg.error?.message ?? null,
  };

  return NextResponse.json(
    {
      ok: true,
      env,
      probes,
      total_ms: Date.now() - startedAt,
    },
    { status: 200 },
  );
}
