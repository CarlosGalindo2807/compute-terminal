// Single registry of every Inngest function. Web app (apps/web) imports this
// to expose /api/inngest; the workers process here imports it to start the dev runtime.

import { contentGenerator } from '../functions/content-generator';
import { contentPublisher } from '../functions/content-publisher';
import { indexCalculator } from '../functions/index-calculator';
import { normalizeUnmatched } from '../functions/normalize-unmatched';
import { outlierDetector } from '../functions/outlier-detector';
import { providerDiscovery } from '../functions/provider-discovery';
import { recordSystemMetrics } from '../functions/record-system-metrics';
import { scrapeLambda, scrapeRunpod, scrapeVast } from '../functions/scrapers';
import { inngest } from './client';

export const functions = [
  scrapeVast,
  scrapeRunpod,
  scrapeLambda,
  outlierDetector,
  normalizeUnmatched,
  recordSystemMetrics,
  indexCalculator,
  providerDiscovery,
  contentGenerator,
  contentPublisher,
];

export { inngest };
