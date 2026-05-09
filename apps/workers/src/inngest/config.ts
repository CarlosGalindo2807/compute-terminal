// Single registry of every Inngest function. Web app (apps/web) imports this
// to expose /api/inngest; the workers process here imports it to start the dev runtime.

import { contentGenerator } from '../functions/content-generator.js';
import { contentPublisher } from '../functions/content-publisher.js';
import { indexCalculator } from '../functions/index-calculator.js';
import { normalizeUnmatched } from '../functions/normalize-unmatched.js';
import { outlierDetector } from '../functions/outlier-detector.js';
import { providerDiscovery } from '../functions/provider-discovery.js';
import { recordSystemMetrics } from '../functions/record-system-metrics.js';
import { scrapeLambda, scrapeRunpod, scrapeVast } from '../functions/scrapers.js';
import { inngest } from './client.js';

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
