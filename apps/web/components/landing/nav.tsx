// Landing-specific top nav. Distinct from the global Nav (components/nav.tsx)
// used by /markets, /admin, etc — that one stays unchanged so we don't
// disturb other pages. This one carries the gold chip, ticker-style brand
// mark, and the theme toggle.

import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

export function LandingNav() {
  return (
    <header className="cti-nav">
      <div className="cti-nav-inner">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <b>COMPUTE</b>
          <span>/</span>
          <b>TERMINAL</b>
        </Link>
        <nav className="cti-nav-links">
          <Link href="/markets">Markets</Link>
          <Link href="/index/cti-h100">Indices</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="#calculator">Calculator</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="#api" style={{ color: 'var(--ink-mute)' }}>
            API
          </Link>
        </nav>
        <div className="cti-nav-cta">
          <Link href="/methodology" className="chip">
            <span className="dot" />
            v1.0 · filtered_vwap · locked
          </Link>
          <ThemeToggle />
          <Link href="/login" className="cti-btn">
            Sign in
          </Link>
          <Link href="/markets" className="cti-btn cti-btn-primary">
            Open terminal →
          </Link>
        </div>
      </div>
    </header>
  );
}
