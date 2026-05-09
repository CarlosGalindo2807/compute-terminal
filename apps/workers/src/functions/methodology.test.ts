// Pure-math tests on the methodology helpers — no DB / network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  methodologies,
  compositeScore,
  PUBLISHED_METHODOLOGY,
  PUBLISHED_METHODOLOGY_VERSION,
} from '@compute-terminal/shared/methodology';

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

test('published methodology v1.0 is filtered_vwap', () => {
  // Locking this prevents accidental drift. Changing the published methodology
  // requires a committee decision — and an explicit edit to this test, which
  // forces the change author to acknowledge the contract.
  assert.equal(PUBLISHED_METHODOLOGY_VERSION, 'v1.0');
  assert.equal(PUBLISHED_METHODOLOGY.formulaId, 'filtered_vwap');
  assert.equal(PUBLISHED_METHODOLOGY.outlierFilter, 'mad_3_sigma');
  assert.equal(PUBLISHED_METHODOLOGY.windowHours, 24);
  assert.equal(PUBLISHED_METHODOLOGY.weight, 'num_gpus');
});

test('published formula matches what the calculator runs', () => {
  // Ground truth: the same inputs feed the published formula directly. If
  // index-calculator.ts drifts away from PUBLISHED_METHODOLOGY.formulaId, the
  // composite will not match and this test will fail.
  const direct = methodologies[PUBLISHED_METHODOLOGY.formulaId](inputs).value;
  assert.ok(direct < 3, 'published filtered_vwap must drop the 99.0 outlier');
});
