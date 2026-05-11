// Landing footer — brand + three nav columns + legal bottom row.

import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="cti-foot">
      <div className="foot">
        <div>
          <Link href="/" className="brand" style={{ marginBottom: 18 }}>
            <span className="brand-mark" />
            <b>COMPUTE</b>
            <span>/</span>
            <b>TERMINAL</b>
          </Link>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              color: 'var(--ink-dim)',
              fontSize: 12.5,
              lineHeight: 1.6,
              maxWidth: '42ch',
              margin: '14px 0 0',
            }}
          >
            The procurement and observability terminal for teams that buy AI compute. Independently governed
            reference index. Methodology v1.0.
          </p>
        </div>
        <div>
          <h5>Product</h5>
          <Link href="/markets">Markets</Link>
          <Link href="/index/cti-h100">Indices</Link>
          <Link href="#calculator">Calculator</Link>
          <Link href="#api">API</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>
        <div>
          <h5>Governance</h5>
          <Link href="/methodology">Methodology</Link>
          <Link href="/methodology#committee">Committee charter</Link>
          <Link href="/methodology#versions">Version history</Link>
          <Link href="/blog">Change log</Link>
          <Link href="/api/health">Status</Link>
        </div>
        <div>
          <h5>Company</h5>
          <Link href="/blog">Blog · Daily brief</Link>
          <Link href="/methodology#compliance">Compliance</Link>
          <Link href="mailto:hello@computeterminal.io">Contact</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
      <div className="foot-bottom">
        <span>© 2026 · Compute Index Terminal · Barcelona</span>
        <span>v1.0 · filtered_vwap · locked · committee@cti</span>
      </div>
    </footer>
  );
}
