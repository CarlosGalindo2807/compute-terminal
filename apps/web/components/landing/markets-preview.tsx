// /markets teaser — 12 rows, intentionally a demo so the landing renders in
// 0 ms with no DB call. Real markets table lives at /markets, which already
// queries Supabase + ISR-revalidates every 30 s.

import { Sparkline } from './sparkline';

type Row = { g: string; s: string; p: number; d: number; lo: number; hi: number; n: number; r: number };

const ROWS: Row[] = [
  { g: 'H100', s: '80 GB · SXM5', p: 2.143, d: -1.2, lo: 1.92, hi: 2.78, n: 9, r: 0.94 },
  { g: 'H200', s: '141 GB · SXM5', p: 3.42, d: 0.7, lo: 3.05, hi: 4.1, n: 7, r: 0.91 },
  { g: 'B200', s: '180 GB · SXM6', p: 5.81, d: 2.1, lo: 5.1, hi: 6.42, n: 4, r: 0.86 },
  { g: 'A100', s: '80 GB · SXM4', p: 1.18, d: -0.3, lo: 0.94, hi: 1.51, n: 10, r: 0.96 },
  { g: 'A100', s: '40 GB · PCIe', p: 0.92, d: -0.4, lo: 0.78, hi: 1.2, n: 8, r: 0.93 },
  { g: 'L40S', s: '48 GB · PCIe', p: 0.78, d: -0.9, lo: 0.61, hi: 0.99, n: 7, r: 0.9 },
  { g: 'MI300X', s: '192 GB · OAM', p: 2.61, d: 1.4, lo: 2.24, hi: 3.18, n: 5, r: 0.83 },
  { g: 'V100', s: '32 GB · SXM2', p: 0.34, d: 0, lo: 0.28, hi: 0.42, n: 6, r: 0.88 },
  { g: 'A6000', s: '48 GB · PCIe', p: 0.51, d: -0.1, lo: 0.41, hi: 0.68, n: 9, r: 0.92 },
  { g: 'RTX PRO 6000', s: '96 GB · Blackwell', p: 0.42, d: 0, lo: 0.39, hi: 0.51, n: 3, r: 0.79 },
  { g: 'RTX 4090', s: '24 GB', p: 0.27, d: -0.6, lo: 0.22, hi: 0.38, n: 9, r: 0.85 },
  { g: 'RTX 5090', s: '32 GB', p: 0.49, d: 1.2, lo: 0.41, hi: 0.62, n: 6, r: 0.81 },
];

function Dots({ n }: { n: number }) {
  const visible = Math.min(n, 8);
  return (
    <span className="prov-dots">
      {Array.from({ length: visible }).map((_, i) => (
        <i key={i} className={i === 0 ? 'acc' : ''} />
      ))}
    </span>
  );
}

export function MarketsPreview() {
  return (
    <section className="section" id="markets">
      <div className="section-tag">02 · /markets — the daily-driver view</div>
      <h2>
        Twelve rows of truth
        <br />
        on every desk.
      </h2>
      <p className="lede">
        Sort by cheapest, most reliable, biggest mover. Filter by jurisdiction. Toggle $/hr to $/M-tokens. Pinned
        providers stay glued to the right rail. This is the page your team opens first.
      </p>

      <div className="markets-card">
        <div className="mk-head">
          <span>QUERY</span>
          <span className="pill on">spot</span>
          <span className="pill">7d avg</span>
          <span className="pill">30d vwap</span>
          <span className="spacer" />
          <span className="pill on">$/hr</span>
          <span className="pill">$/Mtok</span>
          <span className="pill">EU-only</span>
          <span>· 28 SKUs</span>
        </div>
        <table className="mk">
          <thead>
            <tr>
              <th>GPU</th>
              <th className="r">SPOT MEDIAN</th>
              <th className="r">24H Δ</th>
              <th className="r">90D RANGE</th>
              <th>24H</th>
              <th>PROVIDERS</th>
              <th className="r">RELIABILITY</th>
              <th>METHOD</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={`${row.g}-${row.s}`}>
                <td>
                  <span className="gpu-name">{row.g}</span>
                  <span className="gpu-spec">{row.s}</span>
                </td>
                <td className="r">
                  <span style={{ color: 'var(--ink)', fontWeight: 500 }}>${row.p.toFixed(3)}</span>
                  <span style={{ color: 'var(--ink-mute)' }}>/hr</span>
                </td>
                <td className="r">
                  <span className={row.d >= 0 ? 'delta-up' : 'delta-dn'}>
                    {row.d >= 0 ? '▲' : '▼'} {Math.abs(row.d).toFixed(2)}%
                  </span>
                </td>
                <td className="r" style={{ color: 'var(--ink-dim)' }}>
                  {row.lo.toFixed(2)} — {row.hi.toFixed(2)}
                </td>
                <td style={{ color: 'var(--ink-dim)' }}>
                  <Sparkline seed={i * 13 + 5} ariaLabel={`${row.g} 24h`} />
                </td>
                <td>
                  <span style={{ color: 'var(--ink)' }}>{row.n}</span>
                  <Dots n={row.n} />
                </td>
                <td className="r">
                  <span className="reli">
                    <span className="reli-bar">
                      <i style={{ width: `${(row.r * 100).toFixed(0)}%` }} />
                    </span>
                    <span style={{ color: 'var(--ink-dim)' }}>{row.r.toFixed(2)}</span>
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--ink-mute)', fontSize: 10.5 }}>v1.0</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="coverage">
        <b>10 providers</b>
        <span className="divider" />
        <b>28 GPU models</b>
        <span className="divider" />
        <b>4.2M snapshots</b>
        <span>since launch</span>
        <span className="divider" />
        <b>99.7%</b>
        <span>scraper uptime · 30d</span>
        <span className="divider" />
        <b>5-min</b>
        <span>refresh cadence</span>
      </div>
    </section>
  );
}
