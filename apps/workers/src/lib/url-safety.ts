// URL-safety primitives for the discovery path.
// Goal: prevent provider-discovery from being a foothold into anything we
// don't already expose to the open internet — private IPs, link-local, AWS
// metadata, multicast — even if Brave hands us a poisoned hostname or a DNS
// rebinder. All functions are pure aside from `safeFetch`, which does DNS +
// HTTP. Pure helpers are the unit-test surface.

import { lookup } from 'node:dns/promises';

// Curated TLD allowlist for compute-marketplace candidates. Adding entries
// is cheap; the cost of being wrong is one false-positive in the admin queue.
// Bias towards generic TLDs that legit cloud companies use; reject country
// TLDs that are statistically dominated by abuse.
export const ALLOWED_TLDS: ReadonlySet<string> = new Set([
  'ai', 'io', 'com', 'net', 'co', 'cloud', 'computer', 'gpu',
  'dev', 'app', 'sh', 'tech',
]);

export function tldOf(host: string): string {
  const lastDot = host.lastIndexOf('.');
  return lastDot < 0 ? '' : host.slice(lastDot + 1).toLowerCase();
}

export function isAllowedTld(host: string, allowed: ReadonlySet<string> = ALLOWED_TLDS): boolean {
  return allowed.has(tldOf(host));
}

// Private + reserved IPv4 ranges. Any address in here means a fetch could
// reach internal infrastructure or instance-metadata endpoints.
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((n) => Number.parseInt(n, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    // Malformed strings get treated as blocked — fail closed.
    return true;
  }
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;                            // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true;     // 172.16.0.0/12
  if (a === 192 && b === 168) return true;              // 192.168.0.0/16
  if (a === 127) return true;                           // loopback
  if (a === 169 && b === 254) return true;              // link-local incl. AWS/GCP/Azure metadata
  if (a === 0) return true;                             // 0.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true;    // CGNAT 100.64.0.0/10
  if (a >= 224) return true;                            // multicast + reserved (224.0.0.0+)
  return false;
}

// Private + reserved IPv6 ranges. Includes IPv4-mapped (::ffff:a.b.c.d).
export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:([0-9.]+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]!);
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fe80:') || lower.startsWith('fec0:')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;       // ULA fc00::/7
  if (lower.startsWith('ff')) return true;                                  // multicast
  return false;
}

export function isBlockedIp(ip: string): boolean {
  return ip.includes(':') ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
}

export interface SafeFetchOk {
  ok: true;
  status: number;
  text: string;
  resolved_ips: string[];
}
export interface SafeFetchFail {
  ok: false;
  reason: string;
  status?: number;
}
export type SafeFetchResult = SafeFetchOk | SafeFetchFail;

// Defense-in-depth fetch:
//  1. URL must parse and use http(s)
//  2. TLD must be on the allowlist
//  3. DNS resolves to public IPs only (every record — DNS rebinding catch)
//  4. fetch with redirect: 'manual' (a 3xx could otherwise hop to a private IP)
//  5. timeout via AbortSignal
//
// Failures return a structured reason string for diagnostics rather than throwing.
export async function safeFetch(
  rawUrl: string,
  opts: { userAgent: string; timeoutMs: number },
): Promise<SafeFetchResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'unsupported_protocol' };
  }
  if (!isAllowedTld(parsed.host)) {
    return { ok: false, reason: 'tld_not_allowed' };
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(parsed.hostname, { all: true });
  } catch (err) {
    return { ok: false, reason: `dns_lookup_failed:${(err as Error).message}` };
  }
  if (addresses.length === 0) return { ok: false, reason: 'dns_no_records' };
  for (const a of addresses) {
    if (isBlockedIp(a.address)) {
      return { ok: false, reason: `private_ip:${a.address}` };
    }
  }

  let response: Response;
  try {
    response = await fetch(rawUrl, {
      method: 'GET',
      headers: { 'User-Agent': opts.userAgent },
      redirect: 'manual',
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
  } catch (err) {
    return { ok: false, reason: `fetch_failed:${(err as Error).message}` };
  }

  if (response.status >= 300 && response.status < 400) {
    return { ok: false, reason: `redirect_blocked_${response.status}`, status: response.status };
  }
  if (!response.ok) {
    return { ok: false, reason: `http_${response.status}`, status: response.status };
  }

  const text = await response.text();
  return {
    ok: true,
    status: response.status,
    text,
    resolved_ips: addresses.map((a) => a.address),
  };
}
