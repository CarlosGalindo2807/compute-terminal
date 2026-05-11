// Standalone worker server (Hono + Inngest) for local dev and Railway deploy.
// In production, the same `functions` array is also served from apps/web/api/inngest/route.ts.

// Sentry must be the very first import so its global hooks are installed
// before anything else can throw.
import './sentry';

import { serve as serveHono } from '@hono/node-server';
import { Hono } from 'hono';
import { serve } from 'inngest/hono';
import { functions, inngest } from './inngest/config';

const app = new Hono();

app.get('/healthz', (c) => c.json({ ok: true }));

app.on(['GET', 'POST', 'PUT'], '/api/inngest', serve({ client: inngest, functions }));

const port = Number(process.env.PORT ?? 8787);
serveHono({ fetch: app.fetch, port });
console.log(JSON.stringify({ level: 'info', msg: 'workers_listening', port }));
