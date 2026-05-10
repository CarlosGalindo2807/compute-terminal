// Pure parser tests for the TS-native scrapers — no DB / network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRunpodGpuType, parseLambdaHtml, parseVastOffer } from './scrapers';

// ──────────── runpod ────────────

test('runpod: emits three rows when secure+community on-demand and spot are priced', () => {
  const gt = {
    id: 'NVIDIA H100 80GB HBM3',
    displayName: 'H100 80GB HBM3',
    memoryInGb: 80,
    secureCloud: true,
    communityCloud: true,
    lowestPrice: { uninterruptablePrice: 2.49, minimumBidPrice: 1.99 },
  };
  const rows = parseRunpodGpuType(gt);
  assert.equal(rows.length, 3);
  const prices = rows.map((r) => r.price_per_hour).sort();
  assert.deepEqual(prices, [1.99, 2.49, 2.49]);
});

test('runpod: skips unpriced gpu types', () => {
  const gt = {
    id: 'X',
    displayName: 'Mystery GPU',
    secureCloud: true,
    communityCloud: false,
    lowestPrice: { uninterruptablePrice: null, minimumBidPrice: 0 },
  };
  assert.deepEqual(parseRunpodGpuType(gt), []);
});

test('runpod: secure-only on-demand emits one row', () => {
  const gt = {
    id: '1',
    displayName: 'H100 80GB SXM5',
    memoryInGb: 80,
    secureCloud: true,
    communityCloud: false,
    lowestPrice: { uninterruptablePrice: 2.99, minimumBidPrice: null },
  };
  const rows = parseRunpodGpuType(gt);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.price_per_hour, 2.99);
  assert.equal(rows[0]!.region, 'secure');
  assert.equal(rows[0]!.interconnect, 'on_demand');
});

test('runpod: empty displayName yields nothing', () => {
  assert.deepEqual(
    parseRunpodGpuType({ displayName: '', lowestPrice: { uninterruptablePrice: 2.0 } }),
    [],
  );
});

// ──────────── lambda ────────────

const LAMBDA_FIXTURE = `
<html><body>
<table>
  <tr><td>1x NVIDIA H100 SXM 80GB</td><td>$2.49 / hour</td></tr>
  <tr><td>1x NVIDIA A100 PCIe 40GB</td><td>$1.10 / hr</td></tr>
  <tr><td>RTX A6000 48GB</td><td>$0.80/hour</td></tr>
  <tr><td>Discontinued</td><td>n/a</td></tr>
</table>
</body></html>
`;

test('lambda: extracts three listings from the table fixture', () => {
  const listings = parseLambdaHtml(LAMBDA_FIXTURE);
  assert.equal(listings.length, 3);
  const prices = listings.map((l) => l.price_per_hour).sort();
  assert.deepEqual(prices, [0.8, 1.1, 2.49]);
});

test('lambda: empty when no GPU/price pairs', () => {
  assert.deepEqual(parseLambdaHtml('<html><body><p>nothing here</p></body></html>'), []);
});

test('lambda: dedupes identical (gpu, price) pairs', () => {
  const html = `
    <table>
      <tr><td>H100 SXM 80GB</td><td>$2.49 / hour</td></tr>
      <tr><td>H100 SXM 80GB</td><td>$2.49 / hour</td></tr>
    </table>
  `;
  const listings = parseLambdaHtml(html);
  assert.equal(listings.length, 1);
});

// ──────────── vast (smoke — just verify the existing parser still works) ────────────

test('vast: parses a basic offer and divides dph by num_gpus', () => {
  const p = parseVastOffer({
    id: 1,
    gpu_name: 'RTX 4090',
    dph_total: 2.0,
    num_gpus: 2,
    geolocation: 'US',
    rentable: true,
  });
  assert.ok(p);
  assert.equal(p!.raw_gpu_string, 'RTX 4090');
  assert.equal(p!.price_per_hour, 1.0);
  assert.equal(p!.num_gpus, 2);
  assert.equal(p!.region, 'US');
  assert.equal(p!.availability_count, 1);
});

test('vast: drops offers with zero price or missing name', () => {
  assert.equal(parseVastOffer({ gpu_name: 'X', dph_total: 0, num_gpus: 1 }), null);
  assert.equal(parseVastOffer({ dph_total: 1.0, num_gpus: 1 }), null);
});
