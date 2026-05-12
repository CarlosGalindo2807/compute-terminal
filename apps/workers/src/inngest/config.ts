// Single registry of every Inngest function. Web app (apps/web) imports this
// to expose /api/inngest; the workers process here imports it to start the dev runtime.

import { contentGenerator } from '../functions/content-generator';
import { contentPublisher } from '../functions/content-publisher';
import { gpuPriceCalculator } from '../functions/gpu-price-calculator';
import { indexCalculator } from '../functions/index-calculator';
import { normalizeUnmatched } from '../functions/normalize-unmatched';
import { outlierDetector } from '../functions/outlier-detector';
import { providerDiscovery } from '../functions/provider-discovery';
// recordSystemMetrics is intentionally NOT registered as of migration 012.
// The same job runs inside Postgres now via pg_cron — see
// packages/db/migrations/012_pg_cron_observability.sql and the
// `record_system_metrics_hourly` schedule on cron.job. Removes the Inngest
// round-trip per hour and the dependency on Inngest cloud being up for the
// most basic observability metric write. The TS implementation under
// functions/record-system-metrics.ts stays in the repo as the rollback path:
// re-add it to this array if pg_cron has to be unwound.
import { scrapeRunpod, scrapeVast } from '../functions/scrapers';
import { inngest } from './client';

// scrapeLambda is intentionally NOT registered. lambda.ai sits behind
// Cloudflare bot-fight which 404s any Vercel function IP from fra1 even with
// our regular User-Agent. Fighting that with UA spoofing is an arms race; the
// durable fix is to run the Lambda scraper on Railway with Playwright (browser
// fingerprint + stable IPs) — the python implementation under
// apps/scrapers/providers/lambda_labs/ already has the Playwright fallback.
// Re-register here once the Railway worker is deployed.
//
// The function definition (`scrapeLambda` in functions/scrapers.ts) stays so
// we can flip it back on with a single line change.

export const functions = [
  scrapeVast,
  scrapeRunpod,
  outlierDetector,
  normalizeUnmatched,
  indexCalculator,
  gpuPriceCalculator,
  providerDiscovery,
  contentGenerator,
  contentPublisher,
];

export { inngest };
