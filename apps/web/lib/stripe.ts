// Server-side Stripe client. Singleton so a single Vercel function instance
// reuses one HTTP agent across invocations. Returns null when the secret
// key is absent, so checkout endpoints can fail gracefully instead of 500.

import Stripe from 'stripe';

let _stripe: Stripe | null = null;
let _checked = false;

export function getStripe(): Stripe | null {
  if (_checked) return _stripe;
  _checked = true;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  _stripe = new Stripe(key, {
    apiVersion: '2026-04-22.dahlia',
    // Vercel Functions don't share a Node global between invocations, but
    // within the same warm instance Stripe will reuse keepalive sockets.
    maxNetworkRetries: 2,
    typescript: true,
  });
  return _stripe;
}

/** Resolve { tier → Stripe Price ID } at runtime. Price IDs are stored
 *  in env so we can swap them between test + live keys without redeploying.
 *  Returns null when the env var is missing — caller renders an "upgrade
 *  flow not yet available" state. */
export function priceIdFor(tier: 'pro' | 'team'): string | null {
  if (tier === 'pro') return process.env.STRIPE_PRICE_PRO ?? null;
  if (tier === 'team') return process.env.STRIPE_PRICE_TEAM ?? null;
  return null;
}
