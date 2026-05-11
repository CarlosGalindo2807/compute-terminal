#!/usr/bin/env node
/**
 * Fix BOM-contaminated env vars on Vercel.
 *
 * Reads CLEAN values from local .env (verified BOM-free),
 * compares against Vercel's stored values, PATCHes any that differ
 * or that show signs of BOM/whitespace contamination.
 *
 * Requires VERCEL_TOKEN env var with Read+Write env scope.
 * Run from repo root.
 *
 *   $env:VERCEL_TOKEN = "vercel_xxx"
 *   node --env-file=.env scripts/fix-vercel-env-bom.mjs --dry-run   # preview
 *   node --env-file=.env scripts/fix-vercel-env-bom.mjs              # apply
 */

import { readFileSync } from 'node:fs';

const VERCEL_API = 'https://api.vercel.com';
const TEAM_ID = 'team_y7LYI5AjrgLP0GiVdrDkhP8P';
const PROJECT_ID = 'prj_mG125vQ0UTslivPbYmGOCWW4nStA';

// Vars we'll PATCH on Vercel with clean values from local .env.
//
// EXCLUDED on purpose:
//   * INNGEST_SIGNING_KEY / INNGEST_EVENT_KEY — Vercel stores the production
//     JWT-format keys (~1.2 KB each) provisioned by the Vercel-Inngest
//     integration. Local .env has dev keys (~80 chars). Overwriting would
//     break cloud signing on the Inngest endpoint.
//   * SUPABASE_DB_URL — used by the migration runner, locally only. Don't
//     need it on Vercel runtime.
const TARGET_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  // Sentry — added 2026-05-11. Both SENTRY_DSN (server) and NEXT_PUBLIC_SENTRY_DSN
  // (client) hold the same DSN value. SENTRY_AUTH_TOKEN is used at build time
  // by withSentryConfig to upload source maps. SENTRY_ORG/PROJECT/PUBLIC_KEY
  // are non-secret but go on the env for completeness.
  'SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
  'SENTRY_PUBLIC_KEY',
  'SENTRY_OTLP_TRACES_URL',
  'SENTRY_VERCEL_LOG_DRAIN_URL',
  // PostHog — added 2026-05-11. Both are NEXT_PUBLIC_* so they ship to
  // the client bundle. Provisioned by the Vercel Marketplace integration.
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
  // Stripe — added 2026-05-11. STRIPE_SECRET_KEY is server-only.
  // STRIPE_PRICE_PRO/TEAM are runtime-resolved per checkout; keep them
  // env-controlled so we can swap test ↔ live without redeploying code.
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_PRO',
  'STRIPE_PRICE_TEAM',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  // AI Gateway — added 2026-05-11 (commit bb996d3). Routes Claude calls
  // through gateway when present; falls back to ANTHROPIC_API_KEY when absent.
  'AI_GATEWAY_API_KEY',
  // Resend — added 2026-05-11. RESEND_FROM is the From: address (must be on
  // a verified sending domain). RESEND_API_KEY is the secret.
  'RESEND_API_KEY',
  'RESEND_FROM',
  // Upstash Redis — added 2026-05-11. Rate limiter on /api/v1/*. Both come
  // from the Vercel Marketplace integration; the SDK uses them directly,
  // no further config needed.
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

const dryRun = process.argv.includes('--dry-run');
const token = process.env.VERCEL_TOKEN;
if (!token) {
  console.error('VERCEL_TOKEN not set. Generate one at https://vercel.com/account/tokens');
  process.exit(1);
}

// Parse local .env (no dotenv dep — handles "KEY=VALUE" lines, ignores #).
const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const localEnv = {};
for (const rawLine of envFile.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq < 1) continue;
  const k = line.slice(0, eq).trim();
  let v = line.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  localEnv[k] = v;
}

function fingerprint(s) {
  if (!s) return '(empty)';
  const codes = [];
  for (let i = 0; i < Math.min(3, s.length); i++) codes.push(s.charCodeAt(i));
  return `len=${s.length} prefix="${s.slice(0, 6)}" codes=[${codes.join(',')}]`;
}

async function api(method, path, body) {
  const r = await fetch(VERCEL_API + path + (path.includes('?') ? '&' : '?') + 'teamId=' + TEAM_ID, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

console.log('Listing existing Vercel env vars...');
const list = await api('GET', `/v10/projects/${PROJECT_ID}/env?decrypt=true`);
// Vercel returns { envs: [...] } in newer API versions; older returns array directly.
const envs = Array.isArray(list) ? list : (list.envs ?? []);
console.log(`Found ${envs.length} env vars on Vercel.\n`);

let bomCount = 0;
let mismatchCount = 0;
let okCount = 0;
let missingCount = 0;
const actions = [];

for (const key of TARGET_VARS) {
  const local = localEnv[key];
  const remoteAll = envs.filter(
    (e) => e.key === key && (e.target ?? []).includes('production'),
  );
  if (!local) {
    console.log(`SKIP ${key}: not in local .env`);
    continue;
  }
  if (remoteAll.length === 0) {
    console.log(`MISS ${key}: not on Vercel (production)`);
    missingCount++;
    actions.push({ kind: 'create', key, value: local });
    continue;
  }
  // If multiple, fix all of them.
  for (const remote of remoteAll) {
    const remoteValue = remote.value ?? '';
    const hasBom = remoteValue.charCodeAt(0) === 0xfeff;
    const matches = remoteValue === local;
    if (matches && !hasBom) {
      console.log(`OK   ${key}  ${fingerprint(remoteValue)}`);
      okCount++;
    } else {
      console.log(
        `FIX  ${key}  remote=${fingerprint(remoteValue)}  local=${fingerprint(local)}  ${hasBom ? '(BOM)' : '(mismatch)'}`,
      );
      if (hasBom) bomCount++;
      else mismatchCount++;
      actions.push({ kind: 'patch', envId: remote.id, key, value: local });
    }
  }
}

console.log(
  `\nSummary: ok=${okCount}  bom=${bomCount}  mismatch=${mismatchCount}  missing=${missingCount}  → ${actions.length} action(s)`,
);

if (dryRun) {
  console.log('\n--dry-run set, no changes applied.');
  process.exit(0);
}
if (actions.length === 0) {
  console.log('Nothing to fix.');
  process.exit(0);
}

console.log('\nApplying fixes...');
for (const a of actions) {
  if (a.kind === 'patch') {
    await api('PATCH', `/v9/projects/${PROJECT_ID}/env/${a.envId}`, { value: a.value });
    console.log(`  patched ${a.key}`);
  } else {
    await api('POST', `/v10/projects/${PROJECT_ID}/env`, {
      key: a.key,
      value: a.value,
      type: a.key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
      target: ['production', 'preview', 'development'],
    });
    console.log(`  created ${a.key}`);
  }
}

console.log('\nDone. Trigger a redeploy of the latest commit on main to pick up the new env.');
