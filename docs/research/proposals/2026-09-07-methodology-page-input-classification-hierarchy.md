# Proposal: publish input classification + data-input hierarchy on `/methodology` (IOSCO P7 + P8, EU BMR Art 11)

| | |
|---|---|
| **Date** | 2026-09-07 |
| **Author** | index-architect (fourth run) |
| **Risk class** | governance + docs (hard-limit page; no change to published number) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit surface) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member) |
| **Effective date if approved** | Merge date. The 30-day public-notice period does **not** apply because `PUBLISHED_METHODOLOGY` (`packages/shared/src/methodology.ts`) is unchanged, `filtered_vwap` v1.0 stays in force, no `index_values_daily.vwap` value moves. This is a disclosure-only edit to a hard-limit surface. |
| **References** | IOSCO FR07/13 Principle 6 (Benchmark Design), Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs), Principle 9 (Transparency of Benchmark Determinations); IOSCO Guidance IOSCOPD549 (Jan 2018); EU BMR (Regulation (EU) 2016/1011) Article 11(1)(a), 11(1)(c), 11(3)(d); Baltic Exchange *Guide to Market Benchmarks* v8.3; ICE/LBMA *Precious Metals Methodology*. Full URLs in [Sources](#sources) below. |

## Problem

The gap matrix at [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md)
marks two P0 rows on the "Quality of the Benchmark" pillar:

- **P7 · Data sufficiency** — `partial / structurally weak`. CTI's inputs are
  scraped executable **listings**, not observed trades. A strict IOSCO reviewer
  can and will press on the "anchored by observable transactions" language in
  Principle 7. Prior research
  ([`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md))
  concluded the position is *defensible and improvable*, but only if we
  **self-classify precisely** rather than either overclaim compliance or stay
  silent about the input type.
- **P8 · Hierarchy of data inputs** — `partial`. The hierarchy exists in code
  (rule → alias → fuzzy → Claude ≥ 0.95 auto-resolve → Claude 0.70 – 0.95 admin
  queue → outlier check → eligibility check → VWAP). It is not published on
  `/methodology`. EU BMR Art 11(3)(d) requires administrators to "draw up and
  publish clear guidelines regarding the types of input data, the priority of
  use of the different types of input data and the exercise of expert
  judgement." We currently satisfy this in code; we do not satisfy the
  *publication* half.

Both gaps close through the **same page edit** — the same visitor scrolling
past "Formula" needs both disclosures before they hit "Index Committee". Two
proposals would fragment a coherent disclosure into two half-edits, so this
proposal folds P7 and P8 into one PR (per the note's §5 recommendation and
gap-matrix P0 queue item 4).

The narrow question this proposal answers: *what exact text goes on the
`/methodology` page to close P7 and P8 without changing the published number
or overclaiming regulatory status?*

## Proposed change

Insert **two new sections** into `apps/web/app/methodology/page.tsx`, placed
between the existing "Formula" section (which ends with the "Quorum"
subheading around L134) and the existing "Index Committee" section (which
begins around L138).

No other edits to the page. No edits to `PUBLISHED_METHODOLOGY` in
`packages/shared/src/methodology.ts`. No edits to `index-calculator.ts`,
`outlier-detector.ts`, `methodology.test.ts`, or any migration. No new
`methodology_versions` row (formula is unchanged). A `methodology_changes`
row of `change_type = 'disclosure'` is added out-of-scope in a follow-up
so the audit trail records that this page changed even though the formula
didn't — flagged, not required for this PR.

### New Section 1 — "Input classification"

Placement: immediately after the current **Quorum** subsection, before the
**Index Committee** section header.

Proposed exact copy (JSX shown; wording is what matters — the reviewer should
push back on any phrase they think overreaches):

```tsx
{/* ─── Input classification ─── */}
<section className="mt-16">
  <h2 className="display text-2xl">Input classification</h2>
  <p className="mt-3 text-ink-secondary">
    CTI is a <strong>published-quote benchmark</strong>. Every input is a
    firm, executable on-demand list price captured directly from a
    provider&apos;s public endpoint — an ask a buyer can transact against on
    click, not an indicative submission and not a modelled estimate. On-demand
    GPU rental is a genuine arms-length cash market; CTI measures the
    prevailing $/GPU-hour a buyer would face in it.
  </p>
  <p className="mt-3 text-ink-secondary">
    On-demand compute has no public consolidated transaction tape. Per the
    hierarchy below, transaction data would be preferred where available and
    appropriate. Where it is not, executable quotes are used — a class the
    EU Benchmarks Regulation (Reg. (EU) 2016/1011, Art. 11(1)(c)) explicitly
    admits alongside transaction data (&ldquo;input data which is not
    transaction data may be used, including estimated prices, quotes and
    committed quotes, or other values&rdquo;). The published number is
    computed with no expert judgment.
  </p>
  <p className="mt-3 text-ink-secondary">
    A latent transaction anchor is scheduled: the{' '}
    <span className="mono">invoice_observations</span> table (migration 011)
    is designed to hold anonymised real-paid prices by provider, GPU model,
    customer spend band, and contract type. Once its ingest pipeline lands,
    CTI will publish a periodic reconciliation of the list-price index
    against the median observed effective price. That reconciliation is a
    validation surface, not a change to the locked v1.0 formula — a
    committee proposal is required before any transaction data enters the
    published-number path.
  </p>
  <p className="mt-3 text-sm text-ink-muted">
    CTI is not an ESMA-registered or FCA-supervised benchmark today. The
    classification above and the hierarchy below are the administrator&apos;s
    published guidelines, referenced against IOSCO Principles 7 and 8 (FR07/13,
    July 2013) and BMR Art. 11(3)(d). If CTI ever seeks registration, the
    hierarchy is the surface a competent authority would review.
  </p>
</section>
```

### New Section 2 — "Hierarchy of data inputs"

Placement: immediately after Section 1, still before the Index Committee
section header.

Proposed exact copy:

```tsx
{/* ─── Hierarchy of data inputs ─── */}
<section className="mt-16">
  <h2 className="display text-2xl">Hierarchy of data inputs</h2>
  <p className="mt-3 text-ink-secondary">
    Every offer that reaches the VWAP passes through the following stages in
    order. Each stage is deterministic; higher stages have priority. No stage
    admits expert judgment on the published-number path.
  </p>
  <ol className="mt-6 space-y-4 text-ink-secondary">
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 1 · Rule-matched normalization</span>
      <div className="mt-1">
        The scraped GPU string matches an entry in{' '}
        <span className="mono">normalization_rules</span> exactly. Fastest
        path; ~95% of live traffic once the catalog matures. No LLM call.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 2 · Alias / fuzzy resolution</span>
      <div className="mt-1">
        Matches an alias table or a bounded Levenshtein-distance canonical
        form. Deterministic and reproducible from open source. No LLM call.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 3 · Claude auto-resolve (confidence ≥ 0.95)</span>
      <div className="mt-1">
        Unmatched strings are batched hourly to Claude Sonnet 4.6. When the
        model returns a canonical GPU model with confidence ≥ 0.95, the
        result is inserted into <span className="mono">normalization_rules</span>{' '}
        (Stage 1 for future traffic) and back-fills historical snapshots.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 4 · Human admin review (confidence 0.70 – 0.95)</span>
      <div className="mt-1">
        Mid-confidence classifications queue at{' '}
        <span className="mono">/admin/unmatched</span> for one-click
        approval. The audit trail records the reviewer and the timestamp.
        Below 0.70, the string is dropped and logged.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 5 · Outlier filter (MAD-3σ)</span>
      <div className="mt-1">
        Normalized offers are checked against the per-GPU-model 1-hour
        median with a 3-MAD tolerance (see Formula above). Excluded offers
        are marked <span className="mono">is_outlier = true</span> and
        retained for audit; they never enter the VWAP.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 6 · Provider eligibility floor</span>
      <div className="mt-1">
        Offers from providers with{' '}
        <span className="mono">reliability_score &lt; {`${PUBLISHED_METHODOLOGY.reliabilityFloor}`}</span>{' '}
        are excluded from the eligible set{' '}
        <span className="mono">E_t</span>. Reliability decays on outlier
        ratio and recovers on stability; no manual override.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 7 · Quorum check</span>
      <div className="mt-1">
        If <span className="mono">|E_t| &lt; {`${PUBLISHED_METHODOLOGY.minObservations}`}</span>{' '}
        for a given index at day <span className="mono">t</span>, no value is
        published. A <span className="mono">index_value_skipped</span> event
        is recorded. We never extrapolate, carry forward, or fall back to a
        different formula.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 8 · Published VWAP</span>
      <div className="mt-1">
        The surviving eligible set feeds the filtered VWAP formula above.
        The output is written to{' '}
        <span className="mono">index_values_daily.vwap</span> with a{' '}
        <span className="mono">methodology_version</span> stamp of{' '}
        <span className="mono">v1.0</span>.
      </div>
    </li>
  </ol>
  <p className="mt-6 text-sm text-ink-muted">
    Once the <span className="mono">invoice_observations</span> pipeline is
    live, an additional Stage 0 &mdash; observed transaction data &mdash;
    would become the highest-priority input class in this hierarchy, per BMR
    Art. 11(1)(c)&apos;s &ldquo;transaction data, if available and
    appropriate&rdquo; preference. Admitting invoice data into the
    published-number path is a v1.x methodology change and requires a
    separate proposal, committee vote, and 30-day public notice.
  </p>
</section>
```

### What does not change

- `packages/shared/src/methodology.ts` — untouched. `PUBLISHED_METHODOLOGY` still
  resolves to `filtered_vwap` v1.0 with `minObservations = 5`, `windowHours = 24`,
  `reliabilityFloor = 0.5`, `outlierFilter = 'mad_3_sigma'`, `weight = 'num_gpus'`.
- `apps/workers/src/functions/methodology.test.ts` — untouched. The lock test
  keeps guarding the constant.
- `apps/workers/src/functions/index-calculator.ts` — untouched. Every day's
  `vwap` under this proposal equals every day's `vwap` without it.
- No new migration. No new `methodology_versions` row. No change to
  `methodology_changes` schema.
- Nothing on `/index/[slug]`, `/markets`, `/api/*`, or any downstream surface.

## Why this is the right shape (vs. alternatives)

An MSCI-style methodology committee would ask for at least two alternatives to
be weighed. Four were considered.

| Alternative | Shape | Why not chosen |
|---|---|---|
| **A. Status quo (silence)** | Don't disclose. Rely on `/methodology` naming the input source implicitly ("all eligible offers in the last 24 hours"). | The words *offer* and *transaction* are not synonyms and an IOSCO reviewer knows it. Silence forfeits control of the framing to whoever raises the question first — auditor, licensee, or a competitor writing a comparison note. Baltic Exchange and the oil PRAs both *own* the classification precisely because owning it is defensible; ducking it is not. |
| **B. Claim unqualified P7 compliance** | Add a "CTI is IOSCO Principle 7 compliant" line to `/methodology`. | Overreach. Strict Principle 7 language says "anchored by observable transactions"; CTI is not, today. Overclaiming would be materially misleading to a fund or exchange counterparty and would be trivially rebutted by anyone who reads the PDF. It also poisons future licensee conversations — an overclaim that survives one meeting collapses in the next. |
| **C. Suspend publication until `invoice_observations` ingest lands** | Stop publishing CTI-H100 / -Blackwell / -Composite until Track B ships. | Disproportionate and self-defeating. Baltic freight indices, oil PRA benchmarks, LBMA precious metals (auction), and MSCI/IPD property (appraisal) all publish live, cited numbers *without* a full public trade tape. The correct fix is to disclose the input class, not to take the benchmark down. |
| **D. Self-classify precisely + publish the hierarchy** (this proposal) | Two docs sections, no change to the number. | Matches the actual precedents most similar to CTI. Baltic runs on panellist assessments and clears derivatives on that; oil PRAs blend bids/offers/prints in a Market-on-Close and settle physical delivery contracts on it; both are IOSCO-cited. LBMA (auction) is unreachable for CTI today because there is no clearing venue for on-demand compute. Precedent D is the compliant, non-overreaching, non-suspending path. It also creates a natural docket for the eventual v1.x proposal that would admit `invoice_observations` — the sentence "Stage 0 would become the highest-priority input class" is the anchor future work commits against. |

The `/methodology` page also currently has no disclosure about P14 (Submitter
Code of Conduct — n/a because inputs are scraped, not submitted) or P19
(regulatory status). Those are gap-matrix rows 12 and 15 in the P1 queue; a
future proposal can fold them into the same page section. Deliberately out of
scope here — this proposal keeps the edit surgical.

## Empirical impact

Because this proposal changes no formula, no filter parameter, and no
eligibility threshold, the standard "backtest + sensitivity + coverage impact"
appendix does not apply. The empirical claim is instead:

- **Under proposal, published value equals current published value.** For
  every day *d* in `index_values_daily` for which a value would exist under
  the current page, the exact same `vwap`, `methodology_version`, and
  `contributing_provider_ids` are written under this proposal.
- **`methodology.test.ts` still passes.** The lock test guards
  `PUBLISHED_METHODOLOGY`, which is unchanged. Any pre-merge CI run confirms.
- **Gap-matrix status shifts:**
  - Row **P7** stays `partial / structurally weak` on data type
    (transactional anchor is still not in the pipeline), but its *disclosure
    gap* — the reason it is P0 — resolves. The row moves from "hidden
    weakness" to "stated, defensible design choice with a written Track B
    path." Priority downgrades from `P0` to `P1`.
  - Row **P8** moves from `partial` to `compliant`. The hierarchy is now
    published in the required form, mapping each stage to a deterministic
    rule and stating explicitly that expert judgment is absent from the
    published-number path.

- **Downstream surfaces:** none. `/markets`, `/index/[slug]`, the ticker,
  `/api/v1/cost-per-workload`, and every consumer of `index_values_daily`
  are unaffected. There is no schema, migration, or worker touched.

- **Reader-comprehension signal:** an external counsel or auditor reading
  the updated page should be able to answer, without leaving the page:
  (1) what class of data feeds CTI, (2) whether that class is admitted by
  the applicable regulation, (3) what happens between the raw offer and
  the published number, and (4) what would change if transaction data
  became available. All four are the questions row P7 exists to answer.

## Risks

**R1. Wording drift creates an overclaim we cannot defend.** Any phrase
stronger than "arms-length cash market", "firm executable list price",
"published-quote benchmark", or "classification referenced against Principle
7" risks a strict reader concluding CTI claims transactional-anchor
compliance. The draft copy above is intentionally hedged; any Committee
edit that removes a hedge should be re-tested against Principle 7's exact
"anchored by observable transactions" language. Mitigation: no marketing
copy in this section. If a phrase reads like a value proposition, it does
not belong.

**R2. Publishing the hierarchy creates an obligation to hold to it.**
Stage-by-stage disclosure means any future divergence between code and the
published stages becomes a public defect. Mitigation: the hierarchy above
matches the current code path (see `apps/workers/src/functions/normalize-*.ts`,
`outlier-detector.ts`, and `index-calculator.ts`). Any future change to the
ingestion path that would reorder or add a stage becomes a hard-limit-file
edit and triggers this same proposal process. That is a feature, not a bug —
it is exactly the control BMR Art. 11(3)(d) wants to induce.

**R3. Naming BMR Art. 11 in a public disclosure invites regulator questions
about registration status.** A reader may infer CTI is claiming to be
BMR-registered when it is not. Mitigation: the last paragraph of Section 1
explicitly disclaims registration ("CTI is not an ESMA-registered or
FCA-supervised benchmark today") and frames the reference as the
administrator's published guidelines, not a regulated administrator's
submission. This is the same posture MSCI, S&P, and FTSE Russell take for
their non-EU-domiciled index families under UK/EU transitional regimes.

**R4. Committing to publish a reconciliation once `invoice_observations`
lands creates a schedule commitment.** Mitigation: the language above says
"scheduled" and "once the pipeline is live", not "by Q4" or a specific date.
The commitment is directional, not calendarised, and the reconciliation is a
follow-up proposal in its own right.

**R5. The "Stage 0 would become the highest-priority input class" sentence
could be read as pre-announcing a methodology change without the required
30-day notice.** Mitigation: the exact sentence following it — "Admitting
invoice data into the published-number path is a v1.x methodology change
and requires a separate proposal, committee vote, and 30-day public
notice" — is load-bearing. Committee members should not remove or soften
that sentence in review.

## Migration / rollout plan

This is a hard-limit-file docs change that ships as a single PR. There is no
methodology bump, so no 30-day notice.

1. **Merge.** Committee reviews this proposal in-PR (posted as a review
   comment on the branch), then a follow-up PR (a separate change to the
   Committee's satisfaction) edits `apps/web/app/methodology/page.tsx` with
   the exact JSX in the "Proposed change" section above. The follow-up PR
   references this proposal by filename.
2. **Deploy.** Merge to `main` triggers Vercel. `/methodology` re-renders on
   next ISR revalidate (revalidate = 300 s per page config). No cache purge
   is required.
3. **Verify.** Manual check that the two new sections render between
   Formula/Quorum and Index Committee. `pnpm -r typecheck` must be green;
   the affected file is server-rendered so no client bundle change is
   expected. `apps/workers/src/functions/methodology.test.ts` must still
   pass (no reason to regress; the constant is not touched).
4. **Record.** After merge:
   - Update `docs/research/gaps/iosco-principles.md`: mark row P7's
     disclosure gap as closed and priority downgraded to `P1`; mark row P8
     as `compliant`; move both out of the P0 queue.
   - Add a `docs/decisions.md` entry (title: "CTI classified as
     published-quote benchmark; input-hierarchy published on
     /methodology (added 2026-09-DD)"). Wire the merged PR link.
   - Insert a `methodology_changes` row of `change_type = 'disclosure'`,
     `effective_from = <merge date>`, `rationale = "P7+P8 disclosure per
     docs/research/proposals/2026-09-07-methodology-page-input-classification-hierarchy.md"`
     for the audit trail. This is *optional* — the schema treats disclosure
     rows the same as methodology rows for immutability but does not
     require them for docs edits. Flagged as a nice-to-have; the PR should
     not block on it.
5. **Rollback.** If the wording proves overclaiming in a real reviewer
   conversation post-merge, revert the follow-up PR that edited the page.
   The revert restores the exact previous JSX without any data or schema
   effect. The `PUBLISHED_METHODOLOGY` constant, the daily index values,
   and the audit trail are unaffected either way — that is the whole point
   of keeping the edit disclosure-only.

**Nothing to monitor in `system_events` after this merge that isn't already
monitored.** The change is inert with respect to workers, scrapers, and the
calculator.

## Committee deliberation prompt (methodology only)

Even though this is a disclosure-only change (no formula bump), it edits the
published methodology page and therefore warrants a Committee record.
Suggested minute:

> "We are formally classifying the Compute Terminal Index (CTI) as a
> **published-quote benchmark** whose inputs are firm executable on-demand
> list prices captured directly from provider endpoints, and publishing on
> `/methodology` the eight-stage hierarchy of data inputs currently
> implemented in the ingestion path. This edit does not change
> `PUBLISHED_METHODOLOGY` (v1.0, `filtered_vwap`, 24h window, MAD-3σ,
> `num_gpus` weight, reliability floor 0.5, quorum 5). Every historical and
> future `index_values_daily.vwap` under v1.0 is unchanged.
>
> The disclosure addresses IOSCO Principles 7 (Data Sufficiency) and 8
> (Hierarchy of Data Inputs) and satisfies the publication half of EU BMR
> Art. 11(3)(d), which requires administrators to publish guidelines on
> input types and priority. The classification is intentionally hedged — it
> does not claim unqualified Principle 7 compliance, since the ingestion
> path is not yet anchored on observed transactions. It commits, in
> writing, that any future admission of `invoice_observations` into the
> published-number path is a v1.x methodology change requiring a separate
> proposal, this committee's vote, and 30 days' public notice.
>
> Voted: <yes/no>, Carlos Galindo Dumitrescu, sole founding Committee
> member, on YYYY-MM-DD. Rationale for record: [the trade-off is between
> disclosing a real structural exposure (giving future counterparties a
> pre-answered question) and the risk of new-reader misinterpretation
> (mitigated by the explicit non-registration and non-transactional-anchor
> language)]. This deliberation record is committed to
> `docs/committee-minutes/` once that directory exists (gap-matrix row
> P18)."

## Closing

On merge:

- Mark [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md)
  row **P7** disclosure-gap closed; downgrade priority to `P1` (Track B —
  `invoice_observations` ingest + reconciliation — remains open).
- Mark row **P8** as `compliant`; remove from the priority queue.
- Add a `docs/decisions.md` entry summarising the disclosure and linking the
  PR that applied the JSX.
- Link the merged PR at the bottom of this proposal.

Merged PR: _to be filled in_

---

## Sources

Primary regulatory texts (URLs cited; direct WebFetch of these hosts was
blocked at the network egress proxy this session, as in the 2026-05-10 and
2026-05-12 sessions — the P7 note records the same block. WebSearch snippets
corroborate the Article 11 hierarchy language quoted here. A future session
run from an environment with PDF egress should reconcile the exact wording
against the primary PDFs):

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13
  (IOSCOPD415), July 2013.
  https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*,
  IOSCOPD549, January 2018.
  https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data).
  EUR-Lex CELEX 32016R1011.
  https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng
- ESMA Interactive Single Rulebook, Art. 11 (Input data).
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data
- UK retained BMR, Regulation (EU) 2016/1011 Art. 11 (post-Brexit source of
  the same text).
  https://www.legislation.gov.uk/eur/2016/1011/article/11/data.htm

Comparable-benchmark methodologies (consulted for §3 of the P7 note):

- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026.
  https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf
- ICE Benchmark Administration / LBMA, *LBMA Gold Price FAQs*.
  https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price
- ICE *Precious Metals Methodology*.
  https://www.ice.com/iba/lbma-precious-metals
- MSCI, *IOSCO Principles for Financial Benchmarks* statement of compliance.
  https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco

Internal references:

- [`apps/web/app/methodology/page.tsx`](../../../apps/web/app/methodology/page.tsx) — hard-limit page this proposal targets.
- [`packages/shared/src/methodology.ts`](../../../packages/shared/src/methodology.ts) — hard-limit constant (unchanged by this proposal).
- [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) — full P7 analysis and recommendation to write this proposal.
- [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md) — P7/P8 rows §B.
- [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) — rows P7 and P8, and P0 queue item 4 (this proposal's target).
- [`docs/decisions.md`](../../decisions.md) — "Locked methodology v1.0 published, A/B becomes research input" and "Pivot to 'Bloomberg for buyers' framing" entries provide the context for keeping this edit disclosure-only.
- [`docs/roadmap.md`](../../roadmap.md) — rows B7 (Committee membership), B8 (notice page), B9 (compliance pack) — none blocked by this proposal.

---

*Template: [`docs/research/proposals/_TEMPLATE.md`](_TEMPLATE.md).*
