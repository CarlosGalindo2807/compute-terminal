// The three differentiator cards.
//
// Diff 1 (Tokens, not hours) is fully wired to live data: H100 24h-median
// spot from price_snapshots → $/M-token computed via the inline-default
// throughputs in /api/v1/cost-per-workload (calibrated against reference
// fp8 numbers for Claude-Sonnet 4.5 and Llama-3-70B on H100-SXM-80).
//
// Diff 2 (EU-compliant sub-indices) and Diff 3 (Effective prices from
// invoices) are explicitly framed as roadmap. The CTI v2 pivot
// (REFRAME_v2.md) keeps the methodology rigour as the trust signal —
// fabricated numbers would burn that. Cards keep the structural pitch +
// example shape, but values are em-dash with a clear roadmap chip and a
// one-sentence reason instead of made-up €.
//
// When provider_compliance and invoice_observations are seeded (Q3/Q4
// per current roadmap), the same component template renders the real
// numbers — just swap the source.

import { Sparkline } from './sparkline';
import { loadTokensEq } from './data';

type Row = { k: string; v: string; acc: boolean };

function fmtUsd(n: number | null, decimals: number, suffix: string): string {
  if (n === null) return '—';
  return `$${n.toFixed(decimals)}${suffix}`;
}

export async function Differentiators() {
  const tokens = await loadTokensEq();

  const diff1Rows: Row[] = [
    {
      k: 'H100 · 24h median',
      v: tokens.h100SpotUsdHr !== null ? fmtUsd(tokens.h100SpotUsdHr, 2, '/hr') : '—',
      acc: false,
    },
    {
      k: '↳ Claude-Sonnet out · fp8',
      v: tokens.sonnetOutUsdPerMtok !== null ? fmtUsd(tokens.sonnetOutUsdPerMtok, 3, '/Mtok') : '—',
      acc: true,
    },
    {
      k: '↳ Llama-3-70B in · fp8',
      v: tokens.llamaInUsdPerMtok !== null ? fmtUsd(tokens.llamaInUsdPerMtok, 3, '/Mtok') : '—',
      acc: false,
    },
  ];

  const diff2Rows: Row[] = [
    { k: 'CTI-H100-EU', v: '—', acc: false },
    { k: '↳ premium vs global', v: '—', acc: true },
    { k: '↳ EU-jurisdiction providers', v: 'roadmap · Q3 2026', acc: false },
  ];

  const diff3Rows: Row[] = [
    { k: 'H100 · effective · 25k–100k spend', v: '—', acc: false },
    { k: '↳ vs published median', v: '—', acc: true },
    { k: '↳ n_invoices', v: 'roadmap · Q4 2026', acc: false },
  ];

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
        {/* Diff 1 — live tokens-equivalent */}
        <article className="diff">
          <div className="ix">
            <span>I.</span>
            <b>TOKENS_EQ</b>
          </div>
          <h3>Tokens, not hours.</h3>
          <p>
            Stop quoting GPU-hour. Quote what your CFO actually pays per million Claude-Sonnet output tokens, fp8,
            in production.
          </p>
          <div className="example">
            {diff1Rows.map((r) => (
              <div key={r.k} className="row">
                <span className="k">{r.k}</span>
                <span className={`v${r.acc ? ' acc' : ''}`}>{r.v}</span>
              </div>
            ))}
          </div>
          <DiffMeta
            kind="live"
            text={`live · n=${tokens.n} · throughput ref inline_default — see /methodology`}
          />
          <Sparkline seed={7} variant="area" width={200} height={42} className="mini" />
        </article>

        {/* Diff 2 — EU sub-indices roadmap */}
        <article className="diff">
          <div className="ix">
            <span>II.</span>
            <b>EU_COMPLIANT</b>
          </div>
          <h3>EU-compliant by default.</h3>
          <p>
            Sub-indices for sovereign, EU-only and Spain-only inventory. Cloud-Act exposure is a column, not a
            footnote.
          </p>
          <div className="example">
            {diff2Rows.map((r) => (
              <div key={r.k} className="row">
                <span className="k">{r.k}</span>
                <span className={`v${r.acc ? ' acc' : ''}`}>{r.v}</span>
              </div>
            ))}
          </div>
          <DiffMeta
            kind="roadmap"
            text="Live when provider_compliance is seeded + EU-only quorum reached"
          />
          <Sparkline seed={14} variant="area" width={200} height={42} className="mini" />
        </article>

        {/* Diff 3 — Effective prices from invoices */}
        <article className="diff">
          <div className="ix">
            <span>III.</span>
            <b>EFFECTIVE_PX</b>
          </div>
          <h3>Real prices, not list prices.</h3>
          <p>
            Median price actually paid, derived from anonymized invoice uploads, segmented by spend band — the
            published vs. effective delta is the point.
          </p>
          <div className="example">
            {diff3Rows.map((r) => (
              <div key={r.k} className="row">
                <span className="k">{r.k}</span>
                <span className={`v${r.acc ? ' acc' : ''}`}>{r.v}</span>
              </div>
            ))}
          </div>
          <DiffMeta
            kind="roadmap"
            text="Live when invoice upload pipeline ships + first cohort with k-anonymity ≥ 5"
          />
          <Sparkline seed={21} variant="area" width={200} height={42} className="mini" />
        </article>
      </div>
    </section>
  );
}

function DiffMeta({ kind, text }: { kind: 'live' | 'roadmap'; text: string }) {
  const color = kind === 'live' ? 'var(--pos)' : 'var(--accent)';
  const label = kind === 'live' ? 'LIVE' : 'ROADMAP';
  return (
    <div
      style={{
        marginTop: 10,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        letterSpacing: '0.06em',
        color: 'var(--ink-mute)',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <span style={{ color, fontWeight: 600 }}>{label}</span>
      <span style={{ width: 1, height: 10, background: 'var(--line-strong)' }} />
      <span>{text}</span>
    </div>
  );
}
