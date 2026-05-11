// Send a single canary event to Sentry to verify the DSN routes correctly.
// Run from repo root: node --env-file=.env scripts/sentry-canary.mjs
// One-off — intended to be deleted or kept as a connectivity diagnostic.

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
if (!dsn) {
  console.error('SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN not set');
  process.exit(1);
}

const m = dsn.match(/^https:\/\/([^@]+)@(o\d+)\.ingest\.([a-z.]+)\/(\d+)$/);
if (!m) {
  console.error('DSN does not match expected ingest pattern');
  process.exit(1);
}
const [, key, orgHost, ingestDomain, projectId] = m;
const envelopeUrl = `https://${orgHost}.ingest.${ingestDomain}/api/${projectId}/envelope/`;

const event_id = crypto.randomUUID().replace(/-/g, '');
const ts = new Date().toISOString();
const envelope = [
  JSON.stringify({ event_id, sent_at: ts, dsn }),
  JSON.stringify({ type: 'event' }),
  JSON.stringify({
    event_id,
    timestamp: ts,
    platform: 'node',
    level: 'info',
    release: 'sentry-connectivity-test',
    environment: 'production',
    message: {
      message:
        'Sentry wired into compute-terminal — connectivity test from local Claude session, 2026-05-11.',
    },
    tags: { source: 'local-verify-script', verified_by: 'claude-code' },
  }),
].join('\n');

const r = await fetch(envelopeUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-sentry-envelope',
    'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${key}, sentry_client=compute-terminal-verify/1.0`,
  },
  body: envelope,
});

console.log('Sentry ingest status:', r.status);
const txt = await r.text();
console.log(txt.slice(0, 400));
console.log('event_id:', event_id);
