// POST /api/checkout/session  body: { tier: 'pro' | 'team' }
// Returns { url } pointing at a Stripe-hosted Checkout session.
//
// What this is and isn't:
//   - This is the bare minimum we need before the first Pro signup: pick a
//     tier, return a Stripe Checkout URL, redirect the user.
//   - No customer auto-creation, no metadata mapping to user_profiles, no
//     webhook reconciliation yet — those land when we wire Clerk/Supabase
//     Auth and have a real user_id to attach to a Stripe customer.
//   - When STRIPE_SECRET_KEY or the relevant price ID is missing, returns
//     503 with a helpful payload so the pricing page can show "talk to
//     sales" instead of a broken redirect.

import { NextResponse } from 'next/server';
import { getStripe, priceIdFor } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { tier?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const tier = body.tier;
  if (tier !== 'pro' && tier !== 'team') {
    return NextResponse.json({ ok: false, error: 'unknown_tier', allowed: ['pro', 'team'] }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: 'stripe_not_configured', hint: 'STRIPE_SECRET_KEY not set on this deployment' },
      { status: 503 },
    );
  }

  const price = priceIdFor(tier);
  if (!price) {
    return NextResponse.json(
      {
        ok: false,
        error: 'price_not_configured',
        hint: `Set STRIPE_PRICE_${tier.toUpperCase()} on Vercel after creating the product in Stripe`,
      },
      { status: 503 },
    );
  }

  const origin = request.headers.get('origin') ?? 'https://compute-terminal.vercel.app';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#pricing?checkout=cancelled`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: false },
      billing_address_collection: 'auto',
      // No customer yet — Stripe will collect email at checkout and we'll
      // reconcile to user_profiles when the subscription.created webhook
      // fires (separate work).
      metadata: { tier },
    });

    if (!session.url) {
      return NextResponse.json({ ok: false, error: 'no_session_url' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, url: session.url, id: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: 'stripe_error', message }, { status: 502 });
  }
}
