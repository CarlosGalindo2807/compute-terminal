// Four pricing tiles. Static — pricing copy lives here as the single source
// of truth until Stripe products are defined and we drive these from a
// `tiers` table.

const TIERS = [
  {
    name: 'Free',
    code: 'tier_00',
    price: '€0',
    per: '/forever',
    desc: 'The whole UI, full read access, 24-hour delayed prints.',
    items: ['24h-delayed prices', 'H100 SKU only', '90-day chart history', 'Methodology & Committee charter'],
    cta: 'Open terminal',
    featured: false,
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
  },
] as const;

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
          <div key={t.code} className={`price${t.featured ? ' featured' : ''}`}>
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
            <button type="button" className={`cti-btn${t.featured ? ' cti-btn-primary' : ''} price-cta`}>
              {t.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
