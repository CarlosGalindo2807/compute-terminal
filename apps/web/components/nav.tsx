// Shared top nav, used by every route in the app. Styled in the same Aurum
// vocabulary as the landing (.cti-nav rules in globals.css). Server-only —
// the only client island is <ThemeToggle/> which flips html[data-mode].

import Link from 'next/link';
import { ThemeToggle } from './landing/theme-toggle';

export function Nav() {
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
          <Link href="/blog">Brief</Link>
          <Link href="/dashboard" style={{ color: 'var(--ink-mute)' }}>
            Dashboard
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
        </div>
      </div>
    </header>
  );
}
