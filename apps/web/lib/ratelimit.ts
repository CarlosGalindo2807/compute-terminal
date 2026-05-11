// Upstash Redis rate limiter. Public API endpoints under /api/v1/* call
// this before doing real work. When UPSTASH_REDIS_REST_URL/_TOKEN are
// absent the limiter no-ops (allow everything) so local dev and pre-
// integration deploys don't get blocked.

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let _limiter: Ratelimit | null = null;
let _checked = false;

function getLimiter(): Ratelimit | null {
  if (_checked) return _limiter;
  _checked = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    // 60 requests per minute per identifier. Generous for browser usage,
    // tight enough to discourage scraping. Tune per-route as needed.
    limiter: Ratelimit.slidingWindow(60, '60 s'),
    analytics: true,
    prefix: 'cti.rl.v1',
  });
  return _limiter;
}

interface CheckResult {
  ok: boolean;
  /** Remaining requests in window. */
  remaining: number;
  /** Window reset timestamp (ms epoch). */
  reset: number;
  /** Max allowed in window. */
  limit: number;
}

/** identifier is typically the caller IP or API key. When the limiter is
 *  unavailable (env not provisioned, transient Upstash error) returns
 *  { ok: true } and a remaining = -1 sentinel so the caller still serves
 *  the request — better to over-serve than to falsely 429 in incidents. */
export async function checkRate(identifier: string): Promise<CheckResult> {
  const lim = getLimiter();
  if (!lim) {
    return { ok: true, remaining: -1, reset: 0, limit: -1 };
  }
  try {
    const r = await lim.limit(identifier);
    return { ok: r.success, remaining: r.remaining, reset: r.reset, limit: r.limit };
  } catch {
    return { ok: true, remaining: -1, reset: 0, limit: -1 };
  }
}

/** Convenience: read identifier from Request headers (x-forwarded-for first,
 *  fall back to a CF-style header, last resort a "unknown" bucket so the
 *  whole site shares one quota during proxy outages). */
export function identifierForRequest(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip') ?? req.headers.get('cf-connecting-ip');
  if (real) return real;
  return 'unknown';
}
