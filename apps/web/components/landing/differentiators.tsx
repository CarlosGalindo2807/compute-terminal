// The three things-nobody-else-does grid. Demo example values calibrated to
// the brief in docs/web-redesign-brief.md §1; the real numbers will land
// once tokens-equivalent and behavioral-pricing pipelines are seeded.

import { Sparkline } from './sparkline';

const DIFFS = [
  {
    roman: 'I.',
    tag: 'TOKENS_EQ',
    title: 'Tokens, not hours.',
    body:
      'Stop quoting GPU-hour. Quote what your CFO actually pays per million Claude-Sonnet output tokens, fp8, in production.',
    rows: [
      { k: 'H100 · spot median', v: '€2.14/hr', acc: false },
      { k: '↳ Claude-Sonnet out', v: '€0.37 /Mtok', acc: true },
      { k: '↳ Llama-3-70B in', v: '€0.11 /Mtok', acc: false },
    ],
  },
  {
    roman: 'II.',
    tag: 'EU_COMPLIANT',
    title: 'EU-compliant by default.',
    body:
      'Sub-indices for sovereign, EU-only and Spain-only inventory. Cloud-Act exposure is a column, not a footnote.',
    rows: [
      { k: 'CTI-H100-EU', v: '€2.78/hr', acc: false },
      { k: '↳ premium vs global', v: '+23.4%', acc: true },
      { k: '↳ providers', v: 'IBM · OVH · Scaleway', acc: false },
    ],
  },
  {
    roman: 'III.',
    tag: 'EFFECTIVE_PX',
    title: 'Real prices, not list prices.',
    body:
      'Median price actually paid, derived from anonymized invoice uploads, segmented by spend band — the published vs. effective delta is the point.',
    rows: [
      { k: 'H100 · paid · 25k–100k', v: '€1.89/hr', acc: false },
      { k: '↳ vs published median', v: '−12.1%', acc: true },
      { k: '↳ n_invoices', v: '412', acc: false },
    ],
  },
];

export function Differentiators() {
  return (
    <section className="section" id="why">
      <div className="section-tag">01 · What we do that nobody else does</div>
      <h2>
        Three things a Bloomberg
        <br />
        terminal won&apos;t give you.
      </h2>
      <p className="lede">
        We don&apos;t sell index data to portfolio managers. We sell procurement intelligence to operators who sign
        cloud invoices. Built for the Head of Infra at 09:00 — am I paying the right price, what does my workload
        actually cost, and who meets my compliance constraints.
      </p>

      <div className="diff-grid">
        {DIFFS.map((d, i) => (
          <article key={d.tag} className="diff">
            <div className="ix">
              <span>{d.roman}</span>
              <b>{d.tag}</b>
            </div>
            <h3>{d.title}</h3>
            <p>{d.body}</p>
            <div className="example">
              {d.rows.map((r) => (
                <div key={r.k} className="row">
                  <span className="k">{r.k}</span>
                  <span className={`v${r.acc ? ' acc' : ''}`}>{r.v}</span>
                </div>
              ))}
            </div>
            <Sparkline seed={(i + 1) * 7} variant="area" width={200} height={42} className="mini" />
          </article>
        ))}
      </div>
    </section>
  );
}
