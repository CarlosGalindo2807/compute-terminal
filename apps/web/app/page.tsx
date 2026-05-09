import Link from 'next/link';
import { Nav } from '@/components/nav';

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-20">
        <div className="space-y-6">
          <p className="mono text-2xs uppercase tracking-[0.2em] text-ink-muted">
            CTI · Compute Index Terminal
          </p>
          <h1 className="display text-6xl leading-[0.95] tracking-tight">
            The reference price <br />
            for <span className="italic text-accent">compute</span>.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-ink-secondary">
            Real-time GPU-hour prices across every major marketplace and cloud,
            normalized into a single benchmark. The index your futures will settle on.
          </p>
          <div className="flex gap-4 pt-4">
            <Link
              href="/markets"
              className="rounded border border-accent bg-accent px-5 py-2 text-bg-base hover:opacity-90"
            >
              Open the terminal →
            </Link>
            <Link
              href="/index/cti-composite"
              className="rounded border border-bg-border px-5 py-2 text-ink-secondary hover:text-ink-primary"
            >
              CTI-Composite
            </Link>
          </div>
        </div>

        <section className="mt-24 grid grid-cols-3 gap-px overflow-hidden rounded border border-bg-border bg-bg-border">
          {[
            { label: 'Tracked providers', value: '10' },
            { label: 'Snapshots / day', value: '~20K' },
            { label: 'Index methodologies A/B-tested nightly', value: '5' },
          ].map((s) => (
            <div key={s.label} className="bg-bg-surface p-6">
              <div className="mono text-2xs uppercase tracking-[0.18em] text-ink-muted">{s.label}</div>
              <div className="display mt-2 text-4xl">{s.value}</div>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
