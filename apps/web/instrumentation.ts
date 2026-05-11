// Next.js instrumentation hook — runs once at server boot, per runtime.
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
//
// Sentry init is no-op when SENTRY_DSN is missing, so this file is safe to ship
// before the Marketplace integration provisions the DSN.

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? 'development',
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      // Drop Supabase pings and Inngest health probes — these are high-volume
      // and never carry actionable signal.
      beforeSendTransaction(event) {
        const url = event.request?.url ?? '';
        if (url.includes('/api/health') || url.includes('/api/inngest')) return null;
        return event;
      },
    });
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? 'development',
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      tracesSampleRate: 0.1,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
