import Link from 'next/link';

export function Nav() {
  return (
    <header className="border-b border-bg-border bg-bg-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="display text-2xl tracking-tight">
          Compute<span className="italic text-accent">Terminal</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/markets" className="text-ink-secondary hover:text-ink-primary">Markets</Link>
          <Link href="/index/cti-composite" className="text-ink-secondary hover:text-ink-primary">Index</Link>
          <Link href="/blog" className="text-ink-secondary hover:text-ink-primary">Brief</Link>
          <Link
            href="/login"
            className="rounded border border-bg-border px-3 py-1 text-ink-primary hover:border-accent hover:text-accent"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
