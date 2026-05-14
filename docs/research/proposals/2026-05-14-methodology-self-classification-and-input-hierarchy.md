# Proposal: Self-classify CTI as a "published-quote benchmark" and publish the Hierarchy of Data Inputs on `/methodology`

| | |
|---|---|
| **Date** | 2026-05-14 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (but edits a hard-limit surface: `/methodology` page) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (insertion-only — no changes to formula, eligibility floor, outlier filter, quorum, or `PUBLISHED_METHODOLOGY` constant) |
| **Required reviewer(s)** | @CarlosGalindo2807 — sole founding Index Committee member |
| **Effective date if approved** | On merge — this proposal contains **no methodology change**. It adds disclosure prose only. The 30-day public-notice rule is reserved for changes to the published formula or its parameters; adding a description of what the formula already is does not trigger it. (Reviewer please confirm.) |
| **References** | IOSCO FR07/13 Principles 7 (Data Sufficiency) and 8 (Hierarchy of Data Inputs); EU BMR Article 11(1)(a), 11(1)(c), 11(3)(d); `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`; `docs/research/gaps/iosco-principles.md` rows P7 and P8 |

---

## Problem

The IOSCO compliance gap matrix (`docs/research/gaps/iosco-principles.md`) carries two
open rows that, together, are the highest-leverage outstanding work against the Quality
of the Benchmark pillar:

- **Row P7 (Data Sufficiency).** Status `partial / structurally weak`. CTI's inputs
  are scraped *listings* (firm executable list prices from provider endpoints), not
  observed trades. A strict P7 reading requires inputs "anchored by observable
  transactions entered into at arm's length." On-demand cloud compute has no
  consolidated trade tape, so the literal anchor is unavailable — but the underlying
  cash market is genuine. The exposure is real and unaddressed in the published spec.
- **Row P8 (Hierarchy of Data Inputs).** Status `partial`. CTI has an implicit
  hierarchy (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin
  queue → outlier check → eligibility check → VWAP) with **zero expert judgment in
  the published-number path**, but this hierarchy is not published. IOSCO Principle 8
  and BMR Article 11(3)(d) both require the administrator to "draw up and publish
  clear guidelines regarding the types of input data, the priority of use of the
  different types of input data and the exercise of expert judgement."

The 2026-05-12 listings-vs-transactions research note
(`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`) surveyed how
comparable benchmarks (Baltic freight indices, oil PRAs, LBMA precious-metal fixes,
MSCI/IPD property indices) live with absent trade tapes. The conclusion was a
three-track response — Track A (docs-only self-classification), Track B (invoice
ingest + reconciliation; infrastructure-class, blocked on data), Track C
(provider-count-scaled quorum; methodology-class, future).

**This proposal is Track A.** It closes rows P7 and P8 of the gap matrix in one
edit to the `/methodology` page. It is intentionally tightly scoped: insertion-only
prose, no change to the formula or any locked constant.

## Proposed change

Insert two new sections into `apps/web/app/methodology/page.tsx`, placed between the
existing "Formula / Outlier filter / Eligibility floor / Quorum" block and the
"Index Committee" section. The exact prose appears below; the rendered HTML is
plain Tailwind-styled markup that matches the page's existing visual language.

### 1. Insert immediately before the "Index Committee" section

```tsx
{/* ─── Data-input classification (IOSCO P7) ─── */}
<section className="mt-16">
  <h2 className="display text-2xl">Classification of inputs</h2>
  <p className="mt-3 text-ink-secondary">
    CTI is a <strong>published-quote benchmark</strong>. Its inputs are firm,
    executable on-demand list prices captured directly from provider
    endpoints — Vast.ai, RunPod, Lambda, and the other providers in the
    universe. Every input row is an offer a buyer could, at the moment of
    capture, transact against by completing a checkout.
  </p>
  <p className="mt-3 text-ink-secondary">
    The interest CTI measures — the prevailing on-demand $/GPU-hour for a given
    GPU model — exists in a genuine arms-length cash market. Providers compete
    for buyers; buyers compare and rent. The market is real. What it lacks is
    a public consolidated trade tape: no central venue aggregates and
    publishes every executed GPU-hour rental the way an equity exchange
    publishes prints, and no individual provider publishes its sold-price
    history. The published benchmark therefore rests on competitive
    executable quotes rather than on observed trades, and we say so plainly.
  </p>
  <p className="mt-3 text-ink-secondary">
    This places CTI alongside a recognised class of benchmarks whose inputs
    are firm quotes rather than prints: the Baltic Exchange freight indices
    (independent broker assessments), the LBMA Gold Price (cleared auction
    quotes), oil PRA assessments (bids, offers and confirmed trades blended
    over a market-on-close window), and appraisal-based real-estate indices
    (independent professional valuations). EU BMR Article 11(1)(c) explicitly
    contemplates this: where transaction data is not sufficient or appropriate
    to represent the market reality, input data which is not transaction data
    may be used, including <em>committed quotes</em>. CTI's inputs are at the
    executable end of that spectrum — a Vast.ai or RunPod listing is firm at
    the quoted price at the moment of capture; it is not an indicative
    submission.
  </p>
  <p className="mt-3 text-sm text-ink-muted">
    We do not claim to be a transaction-anchored benchmark. The
    transaction-anchored layer is the planned invoice-observation
    reconciliation track (separate workstream); until that exists publicly,
    the published CTI level is a quote benchmark and is labelled as one here.
  </p>
</section>

{/* ─── Hierarchy of data inputs (IOSCO P8 / BMR Art 11(3)(d)) ─── */}
<section className="mt-16">
  <h2 className="display text-2xl">Hierarchy of data inputs</h2>
  <p className="mt-3 text-ink-secondary">
    Every value in <span className="mono">E_t</span> passes through a fixed
    sequence of stages. The hierarchy is deterministic: each stage applies a
    documented rule, and a row that passes a stage is never re-evaluated by a
    later one. <strong>No expert judgement is exercised at any stage of the
    published-number path.</strong>
  </p>
  <ol className="mt-6 space-y-4 text-ink-secondary">
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 1 · Ingestion</span>
      <div className="mt-1">
        Provider endpoints are polled on a fixed cron (every five minutes).
        Each raw offer is validated against a Zod schema; offers that fail
        validation are rejected — not silently coerced — and a
        <span className="mono"> scraper_run_failed </span> event is emitted.
        Inputs are mechanical; there is no human submission step and no
        panellist with discretion.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 2 · Normalisation</span>
      <div className="mt-1">
        The provider's GPU string is matched against the catalogue in this
        strict order: (a) exact rule, (b) alias, (c) fuzzy match above the
        deterministic similarity floor, (d) Claude classification at
        confidence ≥ 0.95 (auto-resolves, back-fills snapshots), (e) Claude
        classification at 0.70 – 0.95 (queued for admin approval; does
        <em> not </em> enter <span className="mono">E_t</span> until approved).
        Strings that no stage resolves are held in
        <span className="mono"> unmatched_listings </span> and excluded.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 3 · Outlier filter</span>
      <div className="mt-1">
        The MAD-3σ rule above runs per GPU model on the trailing 1-hour
        window. Flagged rows are kept in <span className="mono">price_snapshots</span>
        with <span className="mono">is_outlier = true</span> and excluded
        from <span className="mono">E_t</span>. The flag is per-row,
        per-timestamp, and reproducible.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 4 · Eligibility floor</span>
      <div className="mt-1">
        Providers with <span className="mono">reliability_score &lt; {PUBLISHED_METHODOLOGY.reliabilityFloor}</span>{' '}
        are excluded. Reliability is computed mechanically from observed scrape
        success rate and outlier ratio; there is no manual override and no
        committee discretion.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 5 · Quorum</span>
      <div className="mt-1">
        If <span className="mono">|E_t| &lt; {PUBLISHED_METHODOLOGY.minObservations}</span>{' '}
        for an index after the prior four stages, no value is published. The
        day is recorded as <span className="mono">index_value_skipped</span>.
        We do not extrapolate, carry forward, or substitute a different
        formula.
      </div>
    </li>
  </ol>
  <p className="mt-6 text-sm text-ink-muted">
    Where a transaction-anchored input becomes available (the planned
    invoice-observation pipeline), it would be admitted as a new top stage of
    this hierarchy above scraped listings. Any such addition is a
    methodology-class change and would proceed through the Index Committee
    procedure below with the standard 30-day public notice.
  </p>
</section>
```

### 2. No other file changes

- `packages/shared/src/methodology.ts` — unchanged. `PUBLISHED_METHODOLOGY` constants
  unchanged.
- `apps/workers/src/functions/methodology.test.ts` — unchanged. The lock test continues
  to pass exactly as before, because no published parameter moves.
- `apps/workers/src/functions/index-calculator.ts` — unchanged.
- `apps/workers/src/functions/outlier-detector.ts` — unchanged.
- `packages/db/migrations/*` — no new migration.

The change is rendered prose only. Every published index value computed before merge
and every value computed after merge is identical. The methodology lock test exists
specifically to prove that, and it remains green.

## Why this is the right shape (vs. alternatives)

Three alternatives were weighed; the chosen design is the most conservative one that
closes both gaps.

**Alternative A — Do nothing; let P7/P8 ride.** The cheapest option, but the rows
stay open in the gap matrix and the exposure is invisible to any external reviewer
who reads `/methodology`. The first time a licensee, auditor, or regulator inspects
the page, the question "what type of inputs are these?" lands without a documented
answer. That conversation is materially harder than the same conversation with a
self-classification already on the page.

**Alternative B — Self-classify only (P7); defer the hierarchy disclosure (P8) to a
later edit.** Splits one page edit into two, with a second 30-day notice if the
reviewer treats hierarchy disclosure as a methodology change. P7 and P8 are routinely
co-disclosed by recognised benchmark administrators (the NY Fed and Morgan Stanley
IOSCO compliance statements consulted for shape both pair them in adjacent sections).
Bundling them is the standard pattern and avoids unnecessary churn on the public
page.

**Alternative C — Self-classify *and* expand the hierarchy to cover invoice
observations now, in anticipation of Track B.** Rejected as premature. Track B
requires the invoice-observation ingest pipeline to exist and the data to be
non-empty. Publishing a hierarchy that names a layer the index does not yet use
would be misleading and would carry a methodology-class implication (a *new* input
class) that this proposal explicitly avoids. The hierarchy section closes with a
forward-looking note that admits invoice data is a future top stage, which
preserves optionality without overclaiming.

**Chosen design (this proposal — Alternative D):** Self-classify as a published-quote
benchmark + publish the existing hierarchy + state plainly that no expert judgement
is exercised + flag the future transaction-anchored input class as a possible
methodology change. Closes P7 and P8 in one edit. Adds no parameter. Changes no
number. Maintains the option value of the Track B work without committing to it.

## Empirical impact

Not a methodology change — no backtest required by the template's "for methodology
changes" rubric. The "empirical signal that says this works" is the negative
empirical claim:

- **Identity test.** The methodology lock test
  (`apps/workers/src/functions/methodology.test.ts`) hashes `PUBLISHED_METHODOLOGY`
  and asserts the value. After this PR merges, that test continues to pass —
  evidence that the published constants are byte-identical to v1.0.
- **Reproduction test.** Every row in `index_values_daily` carries
  `methodology_version`. The published values for the day before merge and the day
  after merge are computed under the same `'v1.0'` constants on the same inputs;
  the day-over-day move reflects only real market movement, not a methodology
  change. (This is the same check that would catch any silent drift.)
- **Page render check.** The new sections are pure static prose with no data
  binding except the existing `PUBLISHED_METHODOLOGY.reliabilityFloor` and
  `PUBLISHED_METHODOLOGY.minObservations` reads, which are already used elsewhere
  on the same page.

Coverage impact: zero. Provider-day impact: zero. False-positive / false-negative
rate impact: zero. The benchmark is unchanged; only its disclosure is enriched.

## Risks

**Immediate risks:**
- `pnpm -r typecheck` — must pass. The change is JSX text plus existing constant
  references; no new imports or symbols. Risk: low.
- `pnpm test` — must pass, including `methodology.test.ts`. Since no constant
  changes, the lock test trivially passes. Risk: low.
- Page render at `/methodology` — must remain valid. The new sections follow the
  same Tailwind class conventions used by the existing sections. Risk: low.

**Second-order risks:**
- *Self-classifying could be read as an admission.* The opposite is true. An IOSCO-
  aligned reviewer reading `/methodology` today sees no input-type disclosure and
  has to ask. After this PR, the reviewer sees a stated position they can either
  accept or argue with. Stated positions are easier to defend than absences. The
  Baltic Exchange and the LBMA both win their IOSCO arguments by *owning* the
  same kind of disclosure.
- *Naming Track B publicly creates an expectation.* The prose says the invoice-
  observation track is "planned" and "separate workstream" without committing to a
  timeline. If Track B is descoped, the closing paragraphs of both new sections
  can be removed or softened in a follow-up edit — a routine docs change, not a
  methodology change.
- *Future hierarchy edits will need to update this section.* Yes. That is the
  intended design — a published hierarchy becomes part of the spec, so any
  addition (e.g. admitting invoice observations) is treated as a methodology
  change with the standard 30-day notice. The hierarchy section *is* the
  surface that future committee decisions will edit.

## Migration / rollout plan

Not a methodology change. Standard PR review and merge.

- **Pre-merge:** `pnpm -r typecheck` and `pnpm test` must both be green. CI is
  configured to run both on the PR.
- **Merge:** routine. No migration. No version bump in
  `PUBLISHED_METHODOLOGY_VERSION`. No new row in `methodology_versions`. No row
  in `methodology_changes` (the table is reserved for changes that alter the
  published number).
- **Post-merge:** `/methodology` renders the new sections; gap matrix
  `docs/research/gaps/iosco-principles.md` rows P7 and P8 update from `partial` to
  `compliant (claim defensible)` with this PR linked as evidence. `docs/decisions.md`
  gains an entry: "Methodology page self-classifies CTI as a published-quote
  benchmark with hierarchy disclosure — closes IOSCO P7/P8 against the gap matrix."
- **Monitoring:** `system_events` should contain no `methodology_changed` rows in
  the 24 hours following merge (since no methodology change occurred). If one
  appears, that is a defect — investigate before declaring the rollout clean.
- **Rollback:** trivial. `git revert` the merge commit. No data migration. No
  downstream impact.

## Committee deliberation prompt

> "We are not changing the published index value, the formula, the outlier filter,
> the eligibility floor, or the quorum rule. We are adding two prose sections to
> `/methodology` that (a) classify CTI as a published-quote benchmark anchored in a
> real arms-length cash market without a public trade tape, and (b) publish the
> existing five-stage data-input hierarchy and state that no expert judgement is
> exercised in the published-number path. Both additions are required by IOSCO
> Principles 7 and 8 and by EU BMR Article 11(3)(d). The reviewer-question
> closing this deliberation is: do we accept the published-quote self-classification
> as the honest characterisation of v1.0 inputs? If yes, voted: yes / no, Carlos
> Galindo Dumitrescu, sole founding Index Committee member, 2026-MM-DD."

## Closing

On merge:

1. Mark `docs/research/gaps/iosco-principles.md` rows **P7** and **P8** as
   `compliant (claim defensible)`; link this PR as the closing evidence in both
   rows; remove P7 + P8 from the P0 queue.
2. Update `docs/decisions.md` with a one-paragraph entry titled
   "Methodology page self-classifies CTI as a published-quote benchmark (IOSCO P7/P8)".
3. Re-prioritise the rolling queue. With P7+P8 closed, the surviving P0 row is
   **P3/P5** (single-administrator declaration + COI disclosure on `/methodology`);
   that is the natural next-session deliverable.

Tracks B (invoice-observation ingest + list-price-vs-paid-price reconciliation
report) and C (provider-count-scaled quorum) remain open with the timelines
described in the companion note. Neither is blocked by this proposal; both are
unblocked by it, because the published hierarchy is now the surface they edit.

---

## Sources

Primary regulatory texts — referenced here from authoritative second-hand search
excerpts where direct PDF/HTML fetch returned HTTP 403 to this session
(see source-fetch note in companion research notes). A follow-up session from an
environment with direct access should reconcile any wording differences:

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13
  (IOSCOPD415), July 2013. Principle 7 (Data Sufficiency), Principle 8
  (Hierarchy of Data Inputs).
  https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*,
  IOSCOPD549, January 2018.
  https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, IOSCOPD364, October 2012
  (companion guidance for assessment-based benchmarks).
  https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data),
  in particular 11(1)(a), 11(1)(c), and 11(3)(d). EUR-Lex CELEX 32016R1011.
  https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng
- ESMA Interactive Single Rulebook, Article 11.
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data
- UK retained version of Article 11 (post-Brexit text on legislation.gov.uk).
  https://www.legislation.gov.uk/eur/2016/1011/article/11

Comparable-administrator statements consulted for the shape of P7/P8 disclosure
(not for content of CTI's claims):

- New York Fed, *Statement of Compliance with the IOSCO Principles for Financial
  Benchmarks*, July 2025.
  https://www.newyorkfed.org/medialibrary/media/markets/IOSCO-statement-of-compliance-jul2025
- Morgan Stanley, *IOSCO Principles Statement of Compliance 2024*.
  https://www.morganstanley.com/content/dam/msdotcom/en/assets/pdfs/sales_and_trading_disclosures/Morgan_Stanley_IOSCO_Principles_Statement_of_Compliance_2024.pdf
- MSCI, *IOSCO Principles for Financial Benchmarks*.
  https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco
- Reserve Bank of Australia, *Compliance with IOSCO Principles · Cash Rate
  Methodology*.
  https://www.rba.gov.au/mkt-operations/resources/cash-rate-methodology/compliance.html
- CME Group, *Term SOFR Reference Rates Benchmarks IOSCO Compliance Statement*.
  https://www.cmegroup.com/market-data/files/cme-term-sofr-reference-rates-benchmarks.pdf

Comparable-methodology references on quote-anchored / assessment-based benchmarks:

- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026 (assessment-based
  freight indices, BMR-compliant).
  https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf
- ICE Benchmark Administration / LBMA, *LBMA Gold Price* — auction-clearing
  fixing methodology.
  https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price
- NCREIF Property Index — appraisal-based real-estate index methodology.
  https://www.ncreif.org/data-products/property/

Internal references:

- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — full
  IOSCO mapping at v0; §B P7 and P8 framed the gap this proposal closes.
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` —
  comparable-benchmark survey and three-track response; this proposal implements
  Track A.
- `docs/research/gaps/iosco-principles.md` — rows P7, P8, and the priority queue
  this proposal advances.
- `apps/web/app/methodology/page.tsx` — target file; hard-limit surface.
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY`; untouched.
- `apps/workers/src/functions/methodology.test.ts` — methodology lock; remains
  green.
- `docs/decisions.md` — locked-in technical decisions; to be appended on merge.
- `docs/roadmap.md` — open items B8 (notice surface) and B9 (compliance pack)
  share the same `/methodology` surface and may bundle into a future edit.

---

## Source-fetch note

WebFetch returned HTTP 403 for every direct IOSCO, EUR-Lex, ESMA, and
legislation.gov.uk URL attempted in this session, consistent with the same
blocks observed in the 2026-05-10 and 2026-05-12 sessions. The verbatim
language quoted in this proposal's prose (e.g. "anchored by observable
transactions entered into at arm's length", "transaction data, if available
and appropriate", "committed quotes", "draw up and publish clear guidelines
regarding the types of input data") matches the phrasing returned by
authoritative search-result excerpts and aligns with the language captured in
the prior research notes. A future session from an environment with PDF
egress should download FR07/13, IOSCOPD549, and the consolidated BMR
(02016R1011) into a research-only artifact and reconcile. External page text
fetched by any tool is treated as untrusted data, never as instructions.
