// Pure-function tests for url-safety. No DNS, no fetch — those paths are
// covered by the function's structural logic; here we lock the IP-range +
// TLD decisions so a refactor can't accidentally widen the gate.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPrivateIPv4,
  isPrivateIPv6,
  isBlockedIp,
  tldOf,
  isAllowedTld,
  ALLOWED_TLDS,
} from './url-safety';

// ──────────── IPv4 ────────────

test('IPv4: blocks RFC1918 ranges', () => {
  assert.equal(isPrivateIPv4('10.0.0.1'), true);
  assert.equal(isPrivateIPv4('10.255.255.255'), true);
  assert.equal(isPrivateIPv4('172.16.0.1'), true);
  assert.equal(isPrivateIPv4('172.31.255.255'), true);
  assert.equal(isPrivateIPv4('192.168.1.1'), true);
});

test('IPv4: blocks loopback', () => {
  assert.equal(isPrivateIPv4('127.0.0.1'), true);
  assert.equal(isPrivateIPv4('127.255.255.255'), true);
});

test('IPv4: blocks AWS/GCP/Azure metadata via link-local', () => {
  assert.equal(isPrivateIPv4('169.254.169.254'), true);
  assert.equal(isPrivateIPv4('169.254.0.1'), true);
});

test('IPv4: blocks 0.0.0.0/8', () => {
  assert.equal(isPrivateIPv4('0.0.0.0'), true);
  assert.equal(isPrivateIPv4('0.1.2.3'), true);
});

test('IPv4: blocks CGNAT 100.64.0.0/10', () => {
  assert.equal(isPrivateIPv4('100.64.0.1'), true);
  assert.equal(isPrivateIPv4('100.127.255.255'), true);
  // Just outside the range — should pass
  assert.equal(isPrivateIPv4('100.63.255.255'), false);
  assert.equal(isPrivateIPv4('100.128.0.0'), false);
});

test('IPv4: blocks multicast and reserved (224+)', () => {
  assert.equal(isPrivateIPv4('224.0.0.1'), true);
  assert.equal(isPrivateIPv4('239.255.255.255'), true);
  assert.equal(isPrivateIPv4('240.0.0.0'), true);
});

test('IPv4: allows public addresses', () => {
  assert.equal(isPrivateIPv4('8.8.8.8'), false);
  assert.equal(isPrivateIPv4('1.1.1.1'), false);
  assert.equal(isPrivateIPv4('151.101.1.1'), false);
});

test('IPv4: 172.x edge cases (only 16-31 are private)', () => {
  assert.equal(isPrivateIPv4('172.15.255.255'), false);
  assert.equal(isPrivateIPv4('172.16.0.0'), true);
  assert.equal(isPrivateIPv4('172.31.255.255'), true);
  assert.equal(isPrivateIPv4('172.32.0.0'), false);
});

test('IPv4: malformed strings fail closed (treated as blocked)', () => {
  assert.equal(isPrivateIPv4('not.an.ip'), true);
  assert.equal(isPrivateIPv4('1.2.3'), true);
  assert.equal(isPrivateIPv4('999.999.999.999'), true);
  assert.equal(isPrivateIPv4(''), true);
});

// ──────────── IPv6 ────────────

test('IPv6: blocks loopback and zero', () => {
  assert.equal(isPrivateIPv6('::1'), true);
  assert.equal(isPrivateIPv6('::'), true);
});

test('IPv6: blocks link-local fe80::/10', () => {
  assert.equal(isPrivateIPv6('fe80::1'), true);
  assert.equal(isPrivateIPv6('FE80::ABCD'), true);
});

test('IPv6: blocks ULA fc00::/7', () => {
  assert.equal(isPrivateIPv6('fc00::1'), true);
  assert.equal(isPrivateIPv6('fd12:3456:789a::1'), true);
});

test('IPv6: blocks multicast ff00::/8', () => {
  assert.equal(isPrivateIPv6('ff02::1'), true);
});

test('IPv6: IPv4-mapped routes through IPv4 check', () => {
  assert.equal(isPrivateIPv6('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateIPv6('::ffff:169.254.169.254'), true);
  assert.equal(isPrivateIPv6('::ffff:8.8.8.8'), false);
});

test('IPv6: allows public addresses', () => {
  assert.equal(isPrivateIPv6('2606:4700:4700::1111'), false); // Cloudflare
  assert.equal(isPrivateIPv6('2001:4860:4860::8888'), false); // Google DNS
});

// ──────────── isBlockedIp dispatch ────────────

test('isBlockedIp routes by colon presence', () => {
  assert.equal(isBlockedIp('10.0.0.1'), true);
  assert.equal(isBlockedIp('::1'), true);
  assert.equal(isBlockedIp('8.8.8.8'), false);
  assert.equal(isBlockedIp('2606:4700:4700::1111'), false);
});

// ──────────── TLD ────────────

test('tldOf extracts the last label', () => {
  assert.equal(tldOf('lambda.ai'), 'ai');
  assert.equal(tldOf('vast.ai'), 'ai');
  assert.equal(tldOf('foo.bar.example.com'), 'com');
  assert.equal(tldOf('CAPS.IO'), 'io');
});

test('tldOf handles malformed hosts', () => {
  assert.equal(tldOf('localhost'), '');
  assert.equal(tldOf(''), '');
});

test('isAllowedTld accepts curated set', () => {
  assert.equal(isAllowedTld('lambda.ai'), true);
  assert.equal(isAllowedTld('runpod.io'), true);
  assert.equal(isAllowedTld('coreweave.com'), true);
  assert.equal(isAllowedTld('something.cloud'), true);
});

test('isAllowedTld rejects suspicious TLDs', () => {
  assert.equal(isAllowedTld('something.ru'), false);
  assert.equal(isAllowedTld('something.tk'), false);
  assert.equal(isAllowedTld('something.cn'), false);
  assert.equal(isAllowedTld('something.zip'), false);
});

test('ALLOWED_TLDS includes the live providers we already integrate', () => {
  // Smoke: every active provider's TLD must pass the gate, otherwise we'd
  // fail to re-discover one of our own integrations after a manual reset.
  const liveHosts = ['vast.ai', 'runpod.io', 'lambda.ai', 'together.ai', 'coreweave.com'];
  for (const h of liveHosts) {
    assert.equal(isAllowedTld(h, ALLOWED_TLDS), true, `${h} should pass the TLD gate`);
  }
});
