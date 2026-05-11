// /markets teaser — top GPUs by activity in the last 24h, real data.
// Falls back to a 6-row demo set if Supabase returns nothing (e.g. fresh
// install) so the landing never renders an empty table.

import { Sparkline } from './sparkline';
import { loadCoverageStats, loadMarketsTop, fmtCount, type MarketsRow } from './data';

const FALLBACK_ROWS: MarketsRow[] = [
  { g: 'H100', s: '80 GB · SXM5', p: 2.14, d: -1.2, lo: 1.92, hi: 2.78, n: 9, r: 0.94, seed: 1 },
  { g: 'H200', s: '141 GB · SXM5', p: 3.42, d: 0.7, lo: 3.05, hi: 4.1, n: 7, r: 0.91, seed: 2 },
  { g: 'B200', s: '180 GB · SXM6', p: 5.81, d: 2.1, lo: 5.1, hi: 6.42, n: 4, r: 0.86, seed: 3 },
  { g: 'A100', s: '80 GB · SXM4', p: 1.18, d: -0.3, lo: 0.94, hi: 1.51, n: 10, r: 0.96, seed: 4 },
  { g: 'L40S', s: '48 GB · PCIe', p: 0.78, d: -0.9, lo: 0.61, hi: 0.99, n: 7, r: 0.9, seed: 5 },
  { g: 'A6000', s: '48 GB · PCIe', p: 0.51, d: -0.1, lo: 0.41, hi: 0.68, n: 9, r: 0.92, seed: 6 },
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

export async function MarketsPreview() {
  const [coverage, liveRows] = await Promise.all([loadCoverageStats(), loadMarketsTop(12)]);
  const rows = liveRows.length >= 4 ? liveRows : FALLBACK_ROWS;
  const isLive = liveRows.length >= 4;

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
          <span>· {coverage.gpus} SKUs</span>
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
            {rows.map((row, i) => (
              <tr key={`${row.g}-${row.s}-${i}`}>
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
                  <Sparkline seed={row.seed} ariaLabel={`${row.g} 24h`} />
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
        {!isLive ? (
          <div
            style={{
              padding: '10px 18px',
              borderTop: '1px solid var(--line)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10.5,
              letterSpacing: '0.06em',
              color: 'var(--ink-mute)',
            }}
          >
            REFERENCE · live data resumes when scrapers catch up
          </div>
        ) : null}
      </div>

      <div className="coverage">
        <b>{coverage.providers} providers</b>
        <span className="divider" />
        <b>{coverage.gpus} GPU models</b>
        <span className="divider" />
        <b>{fmtCount(coverage.snapshots)} snapshots</b>
        <span>since launch</span>
        <span className="divider" />
        <b>{coverage.uptimePct}</b>
        <span>uptime · {coverage.uptimeWindow}</span>
        <span className="divider" />
        <b>{coverage.cadence}</b>
        <span>refresh cadence</span>
      </div>
    </section>
  );
}
