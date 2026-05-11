// Four pricing tiles. Pro/Team buttons POST to /api/checkout/session and
// redirect to Stripe-hosted Checkout. Free → /markets, Enterprise →
// mailto:sales. Static copy until Stripe products are created in dashboard.

'use client';

import { useState } from 'react';

type Tier = 'free' | 'pro' | 'team' | 'enterprise';

interface TierDef {
  name: string;
  code: string;
  price: string;
  per: string;
  desc: string;
  items: string[];
  cta: string;
  featured: boolean;
  action: { kind: 'href'; href: string } | { kind: 'checkout'; tier: 'pro' | 'team' } | { kind: 'mailto'; to: string };
}

const TIERS: TierDef[] = [
  {
    name: 'Free',
    code: 'tier_00',
    price: '€0',
    per: '/forever',
    desc: 'The whole UI, full read access, 24-hour delayed prints.',
    items: ['24h-delayed prices', 'H100 SKU only', '90-day chart history', 'Methodology & Committee charter'],
    cta: 'Open terminal',
    featured: false,
    action: { kind: 'href', href: '/markets' },
  },
  {
    name: 'Pro',
    code: 'tier_01',
    price: '€99',
    per: '/month',
    desc: 'Real-time across every GPU, alerts, tokens-equivalent calculator.',
    items: ['Real-time, all 28 SKUs', 'Price alerts · saved views', 'Tokens-equivalent calculator', 'Full 24-month history'],
    cta: 'Start Pro · 14 days',
    featured: true,
    action: { kind: 'checkout', tier: 'pro' },
  },
  {
    name: 'Team',
    code: 'tier_02',
    price: '€299',
    per: '/month',
    desc: 'API, exports, multi-user, EU & Spain sub-indices.',
    items: ['API · CSV · JSON', 'EU / Sovereign / Spain feeds', 'Multi-user (5 seats)', 'Webhooks & alert routing'],
    cta: 'Start Team',
    featured: false,
    action: { kind: 'checkout', tier: 'team' },
  },
  {
    name: 'Enterprise',
    code: 'tier_03',
    price: '€2,500',
    per: '/from · month',
    desc: 'SLA, behavioral pricing, hedging advisory.',
    items: ['Behavioral pricing (invoice net)', 'Hedging advisory (L2)', 'SLA · dedicated workspace', 'Custom indices & feeds'],
    cta: 'Talk to sales',
    featured: false,
    action: { kind: 'mailto', to: 'sales@computeterminal.io?subject=Compute%20Terminal%20Enterprise' },
  },
];

function PricingTile({ t }: { t: TierDef }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setError(null);
    if (t.action.kind === 'href') {
      window.location.href = t.action.href;
      return;
    }
    if (t.action.kind === 'mailto') {
      window.location.href = `mailto:${t.action.to}`;
      return;
    }
    // checkout
    setBusy(true);
    try {
      const r = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: t.action.tier }),
      });
      const j = (await r.json()) as { ok: boolean; url?: string; error?: string; hint?: string };
      if (r.ok && j.ok && j.url) {
        window.location.href = j.url;
        return;
      }
      setError(j.hint ?? j.error ?? 'checkout_failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'network_error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`price${t.featured ? ' featured' : ''}`}>
      <div className="tier">
        <b>{t.name}</b>
        <span>{t.code}</span>
      </div>
      <div className="amt">
        {t.price}
        <span className="per">{t.per}</span>
      </div>
      <div className="desc">{t.desc}</div>
      <ul>
        {t.items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
      <button
        type="button"
        disabled={busy}
        onClick={handle}
        className={`cti-btn${t.featured ? ' cti-btn-primary' : ''} price-cta`}
        style={busy ? { opacity: 0.6, cursor: 'progress' } : undefined}
      >
        {busy ? '…' : t.cta}
      </button>
      {error ? (
        <div
          style={{
            marginTop: 10,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5,
            color: 'var(--neg)',
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

export function Pricing() {
  return (
    <section className="section" id="pricing">
      <div className="section-tag">04 · Pricing</div>
      <h2>
        From a free terminal
        <br />
        to a hedging desk.
      </h2>
      <p className="lede">
        Locked panels show the real chart underneath — no blur, no fake skeleton. Unlock when you need it.
      </p>

      <div className="price-grid">
        {TIERS.map((t) => (
          <PricingTile key={t.code} t={t} />
        ))}
      </div>
    </section>
  );
}
