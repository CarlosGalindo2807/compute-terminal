// Pure-math tests on the methodology helpers — no DB / network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { methodologies, compositeScore } from '@compute-terminal/shared/methodology';

const inputs = [
  { pricePerHour: 2.0, numGpus: 1, capturedAt: new Date(), providerReliability: 1 },
  { pricePerHour: 2.1, numGpus: 1, capturedAt: new Date(), providerReliability: 1 },
  { pricePerHour: 2.05, numGpus: 1, capturedAt: new Date(), providerReliability: 1 },
  { pricePerHour: 2.0, numGpus: 4, capturedAt: new Date(), providerReliability: 0.9 },
  { pricePerHour: 99.0, numGpus: 1, capturedAt: new Date(), providerReliability: 0.5 }, // outlier
];

test('simple_vwap weights by num_gpus', () => {
  const r = methodologies.simple_vwap(inputs);
  assert.equal(r.numObservations, 5);
  assert.ok(r.value > 2 && r.value < 30);
});

test('filtered_vwap excludes the obvious outlier', () => {
  const r = methodologies.filtered_vwap(inputs);
  assert.ok(r.value < 3, `expected < 3, got ${r.value}`);
});

test('compositeScore in [0,1]', () => {
  const s = compositeScore({ consistency: 1, volatility: 0, coverage: 1 });
  assert.equal(s, 1);
});
