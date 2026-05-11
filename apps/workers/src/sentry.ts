// Sentry init for the standalone worker process. Must be imported before any
// other module so its global instrumentation hooks are in place. When
// SENTRY_DSN is missing the SDK no-ops, so the file is safe to import in dev.

import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.RAILWAY_ENVIRONMENT ?? 'development',
  release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RAILWAY_GIT_COMMIT_SHA,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});

process.on('unhandledRejection', (reason) => {
  Sentry.captureException(reason);
});

export { Sentry };
