// Auto-scrolling ticker strip. CSS keyframe animation, no JS needed.
// Items duplicated once in the rendered HTML so the -50% transform loop
// produces a seamless wrap.
//
// Demo values for the visual structure; wire to live medians from
// price_snapshots + index_values_daily in a follow-up PR (server fetch
// at request time, then revalidate=30 to match the rest of the site).

import { Sparkline } from './sparkline';

const ITEMS = [
  { k: 'CTI-H100', v: '$2.143', d: -1.2 },
  { k: 'CTI-COMPOSITE', v: '$1.879', d: 0.4 },
  { k: 'H100·SXM', v: '$2.14', d: -1.2 },
  { k: 'H200', v: '$3.42', d: 0.7 },
  { k: 'B200', v: '$5.81', d: 2.1 },
  { k: 'A100·80', v: '$1.18', d: -0.3 },
  { k: 'L40S', v: '$0.78', d: -0.9 },
  { k: 'MI300X', v: '$2.61', d: 1.4 },
  { k: 'CTI-H100-EU', v: '$2.78', d: 0.2 },
  { k: 'CTI-H100-SOV', v: '$3.04', d: 0 },
  { k: 'RTX-PRO-6000', v: '$0.42', d: 0 },
  { k: 'A6000', v: '$0.51', d: -0.1 },
];

function Item({ k, v, d, seed }: { k: string; v: string; d: number; seed: number }) {
  return (
    <div className="tk-item">
      <span className="tk-label">{k}</span>
      <span className="tk-val">{v}</span>
      <span className="spark">
        <Sparkline seed={seed} ariaLabel={`${k} 24h`} />
      </span>
      <span className={`tk-d ${d >= 0 ? 'up' : 'down'}`}>
        {d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(2)}%
      </span>
    </div>
  );
}

export function Ticker() {
  return (
    <div className="ticker">
      <div className="ticker-track">
        {ITEMS.map((it, i) => (
          <Item key={`a-${it.k}`} {...it} seed={i + 1} />
        ))}
        {ITEMS.map((it, i) => (
          <Item key={`b-${it.k}`} {...it} seed={i + 1 + 100} />
        ))}
      </div>
    </div>
  );
}
