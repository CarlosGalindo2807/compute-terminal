// Hero section — corner marks, meta line, big serif headline, sub line with
// caret, two CTAs, and the live ticker docked at the bottom of the viewport.
//
// Sub-line numbers pull from the same coverage loader that backs the markets
// section so the two stay in lockstep. No hardcoded marketing values.

import Link from 'next/link';
import { Clock } from './clock';
import { Ticker } from './ticker';
import { loadCoverageStats, fmtCount } from './data';

export async function Hero() {
  const c = await loadCoverageStats();

  return (
    <section className="hero">
      <div className="corner-marks">
        <span className="tl" />
        <span className="tr" />
        <span className="bl" />
        <span className="br" />
      </div>
      <div className="hero-rail" />

      <div className="hero-meta">
        <span>CTI · COMPUTE INDEX TERMINAL</span>
        <span className="sep" />
        <span>EST. 2026 · BARCELONA</span>
        <span className="sep" />
        <Clock />
      </div>

      <h1>
        The reference
        <br />
        price for <em>compute.</em>
      </h1>

      <p className="hero-sub">
        Live across {c.providers} providers · {c.gpus} GPU models · {fmtCount(c.snapshots)} snapshots since launch.
        <br />
        Independently governed index, locked methodology, tokens-equivalent pricing
        <span className="caret" />
      </p>

      <div className="hero-actions">
        <Link href="/markets" className="cti-btn cti-btn-primary">
          See live prices →
        </Link>
        <Link href="/methodology" className="cti-btn">
          Read methodology
        </Link>
        <span className="hint">No card. 24h-delayed prices free forever.</span>
      </div>

      <Ticker />
    </section>
  );
}
