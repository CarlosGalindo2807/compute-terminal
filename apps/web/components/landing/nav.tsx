// Landing-specific top nav. Same styling as the global Nav but with two CTAs
// (Sign in + Open terminal) instead of just Sign in. Identical structure
// reuses the .cti-nav CSS rules in globals.css.

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
