// Auto-scrolling ticker strip. CSS keyframe animation, no JS needed.
// Items duplicated once in the rendered HTML so the -50% transform loop
// produces a seamless wrap.
//
// Data: latest CTI index values + active GPU spot medians, both fetched
// server-side. Falls back to a hardcoded set if Supabase is unavailable
// so the landing never renders without a ticker.

import { Sparkline } from './sparkline';
import { loadTickerItems, type TickerItem } from './data';

const FALLBACK: TickerItem[] = [
  { k: 'CTI-H100', v: '$2.143', d: -1.2, seed: 1 },
  { k: 'CTI-COMPOSITE', v: '$1.879', d: 0.4, seed: 2 },
  { k: 'H100·SXM', v: '$2.14', d: -1.2, seed: 3 },
  { k: 'H200', v: '$3.42', d: 0.7, seed: 4 },
  { k: 'B200', v: '$5.81', d: 2.1, seed: 5 },
  { k: 'A100·80', v: '$1.18', d: -0.3, seed: 6 },
  { k: 'L40S', v: '$0.78', d: -0.9, seed: 7 },
  { k: 'MI300X', v: '$2.61', d: 1.4, seed: 8 },
  { k: 'CTI-H100-EU', v: '$2.78', d: 0.2, seed: 9 },
  { k: 'CTI-H100-SOV', v: '$3.04', d: 0, seed: 10 },
  { k: 'RTX-PRO-6000', v: '$0.42', d: 0, seed: 11 },
  { k: 'A6000', v: '$0.51', d: -0.1, seed: 12 },
];

function Item({ k, v, d, seed, series }: TickerItem) {
  return (
    <div className="tk-item">
      <span className="tk-label">{k}</span>
      <span className="tk-val">{v}</span>
      <span className="spark">
        <Sparkline seed={seed} values={series} ariaLabel={`${k} 24h`} />
      </span>
      <span className={`tk-d ${d >= 0 ? 'up' : 'down'}`}>
        {d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(2)}%
      </span>
    </div>
  );
}

export async function Ticker() {
  const live = await loadTickerItems();
  const items = live.length >= 4 ? live : FALLBACK;
  return (
    <div className="ticker">
      <div className="ticker-track">
        {items.map((it, i) => (
          <Item key={`a-${it.k}-${i}`} {...it} />
        ))}
        {items.map((it, i) => (
          <Item key={`b-${it.k}-${i}`} {...it} />
        ))}
      </div>
    </div>
  );
}
