# Proposal: Self-classify CTI as a published-quote benchmark and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-10-26 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (page copy on a hard-limit surface — `apps/web/app/methodology/page.tsx`) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit). Does **not** touch `packages/shared/src/methodology.ts`, `index-calculator.ts`, `outlier-detector.ts`, `methodology.test.ts`, or any migration. No published number changes. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member; CODEOWNERS gates `/methodology`). |
| **Effective date if approved** | On merge. Not a methodology change — the published formula, constants and version row are untouched — so the 30-day public-notice cadence does not apply. See §6 for why. |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency) and Principle 8 (Hierarchy of Data Inputs); EU BMR (Regulation (EU) 2016/1011) Art. 11(1)(a)–(d), Art. 11(3)(d). Primary URLs in §9. |
| **Supersedes** | — |
| **Closes gap-matrix rows** | P7, P8 (`docs/research/gaps/iosco-principles.md`). |
| **Companion research** | `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` (full literature review). |

## 1. Problem

CTI v1.0's single largest IOSCO exposure is Principle 7 (Data Sufficiency),
which requires a benchmark to be "anchored by observable transactions entered
into at arm's length." Every row of `price_snapshots` is a scraped *listing*
(a provider's published ask), not an observed trade. The companion note
([`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md))
diagnoses the exposure in detail and surveys how comparable benchmarks of
tape-less markets (Baltic Exchange freight, Platts/Argus oil, LBMA fixings,
MSCI/IPD property) satisfy IOSCO without a public trade tape.

The headline finding of that note — and the premise of this proposal — is
that EU BMR Art. 11(1)(c) explicitly admits "committed quotes" as acceptable
input when "transaction data is not sufficient or is not appropriate," and
CTI's inputs are firm executable list prices (click-to-buy on
Vast.ai/RunPod/Lambda) that sit substantively closer to "committed quotes"
than to indicative submissions. Art. 11(3)(d) in turn requires administrators
to "draw up and publish clear guidelines regarding the types of input data,
the priority of use of the different types of input data and the exercise of
expert judgement."

CTI today does neither of those things on the published page. The methodology
page describes the formula, the eligibility floor, the outlier filter, and
the quorum, but it does **not**:

1. State what *class* of input data CTI uses (listings vs. quotes vs. trades),
   why that class, and under what regulatory treatment.
2. Publish the hierarchy of data inputs the system actually implements —
   which exists in code (rule → alias → fuzzy → Claude-auto → admin queue →
   outlier filter → eligibility filter → VWAP) but is nowhere on the public
   page.

These are gap-matrix rows **P7** (Data Sufficiency) and **P8** (Hierarchy of
Data Inputs). They are the same page edit, and they are the top of the
current P0 queue (`docs/research/gaps/iosco-principles.md` §Rolling priority
queue, item 4).

A serious external reviewer — the fund lawyer in a licensing conversation,
or an auditor's benchmark specialist — will press on P7 before any other
quality-pillar principle. The right response, borrowed from the LBMA /
Baltic / PRA playbook, is to **own the limitation precisely**: self-classify
as a published-quote benchmark, publish the hierarchy, and point to the
transactional anchor (the `invoice_observations` reconciliation report)
that is already on the roadmap. That converts the single most-pressed-on
weakness into a stated, defensible design position.

## 2. Proposed change

### 2.1 What changes

**One file:** `apps/web/app/methodology/page.tsx`. **Two additions, no
deletions.**

Insert a new `<section>` block titled **"Input data"** between the existing
"Quorum" subsection and the existing "Index Committee" section. The new
section contains:

- A **self-classification statement** declaring CTI a *published-quote
  benchmark* in the EU BMR Art. 11(1)(c) sense ("committed quotes"), with
  the reasoning (no public transaction tape for on-demand compute; inputs
  are firm executable list prices from a genuine arms-length cash market).
- A **Hierarchy of Data Inputs** ordered list of the five classes the system
  can in principle consume, in BMR-style priority order (observed
  transactions → observed firm quotes → published list prices → estimated
  prices → expert judgement), with each class annotated by (i) whether CTI
  uses it today and (ii) which stage of the ingest pipeline implements it.
- A **declared position** stating that CTI uses Class 3 (published list
  prices) today, with Class 1 (observed transactions, via
  `invoice_observations`) scheduled as a validation anchor and ultimately
  as a weighted input class — the latter requiring full Committee process
  per the methodology change-control policy below.
- A **cross-reference** to the research note and to the IOSCO / BMR
  citations in the proposal's §9.

### 2.2 Exact copy for the new `<section>` (ready to paste)

> ### Input data
>
> CTI is a **published-quote benchmark**. Its inputs are firm, executable
> on-demand list prices captured directly from provider endpoints at the
> moment each snapshot is taken. On-demand compute has no public
> consolidated transaction tape — unlike equities (NMS), futures (CME) or
> precious metals (LBMA auction fix) — so a strict "transactions-only"
> benchmark is not constructible today without inventing a settlement
> venue. The data CTI does ingest is substantively close to EU BMR
> Art. 11(1)(c) "committed quotes": each listing is a firm offer that a
> buyer can execute at the quoted price with a single click, and is
> captured mechanically with no human submission step.
>
> **Hierarchy of data inputs.** CTI's input hierarchy, from most to least
> preferred, follows the structure of EU BMR Art. 11 and IOSCO Principle 8:
>
> 1. **Observed arm's-length transactions.** Not used in the published
>    v1.0 formula. The `invoice_observations` table (migration 011) is
>    the designed home for anonymised real-paid prices by (provider, GPU
>    model, spend band, contract type); the ingest/redaction pipeline is
>    on the roadmap. First use: as a *validation anchor* in a periodic
>    reconciliation report ("CTI list-price index vs. median observed
>    effective price over the trailing 90 days"). Admission as a weighted
>    *input* class is a methodology-class change (v1.x) requiring full
>    Committee process and 30-day public notice.
> 2. **Observed firm quotes with disclosed size and duration.** Not
>    currently distinct from Class 3 in CTI's universe: on-demand
>    marketplaces publish price but typically not committed size or
>    duration separately from the listing itself.
> 3. **Published firm executable list prices.** *Used today, exclusive
>    input class to the published number.* Captured by per-provider
>    scrapers (`apps/scrapers/providers/*`), schema-validated by the Zod
>    parser, normalised by the catalog (`core.normalizer` fast-path →
>    hourly Claude batch at ≥ 0.95 confidence auto, 0.70 – 0.95 admin
>    queue), scored for outliers (MAD-3σ, `apps/workers/src/functions/outlier-detector.ts`),
>    gated by the per-provider reliability floor (≥ 0.5), and aggregated
>    by the locked VWAP formula above.
> 4. **Estimated prices.** Not used. The published number is never
>    extrapolated, carried forward, or imputed. On insufficient data the
>    index is suppressed and an `index_value_skipped` event is recorded.
> 5. **Expert judgement.** Not used in the published-number path. Human
>    adjudication is confined to the normalisation queue (new GPU model
>    strings at 0.70 – 0.95 Claude confidence) and never adjusts a price
>    or an outlier flag.
>
> **Why this classification matters.** EU BMR Art. 11(3)(d) requires
> administrators to publish the types of input data, the priority of use
> and the role of expert judgement. CTI's position is: Classes 4 and 5
> are absent by design, Classes 2 and 3 are collapsed by the structure of
> the on-demand market, Class 3 is the exclusive source of the published
> value today, and Class 1 is the planned long-term anchor. The index is
> computed under a deterministic formula from a single input class, with
> no expert judgement — a stricter, more reproducible profile than most
> benchmarks admitted under Art. 11(1)(c).
>
> **Research background.** The full comparison to Baltic Exchange,
> Platts/Argus and LBMA — and the reasoning behind the "published-quote
> benchmark" self-classification — is in `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`
> on GitHub.

### 2.3 What explicitly does **NOT** change

- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant,
  version string, formula, params. Untouched.
- `apps/workers/src/functions/methodology.test.ts` — the methodology lock
  test. Untouched. (A docs-only addition to `/methodology` must not touch
  it, and does not need to.)
- `apps/workers/src/functions/index-calculator.ts`. Untouched.
- `apps/workers/src/functions/outlier-detector.ts`. Untouched.
- Any migration in `packages/db/migrations/`. Untouched.
- `methodology_versions` row for v1.0. Untouched. **No new row is added
  and no semver bump occurs** — this is a page-copy clarification of the
  same published methodology, not a new version of it. (See §6 for why
  this is the right posture under the Committee charter.)

### 2.4 Published-number impact

**Zero.** The index-calculator, the outlier detector and the published
constants are not touched. The 90-day backtest requirement of the
`_TEMPLATE.md` form is reported as *N/A* because no `index_values_daily`
row changes. If a Committee member disagrees with that framing and asks
for a backtest anyway, the right answer is "the backtest is trivially
`new == old` because no numeric input to the formula changes; here is
the diff showing the code path is untouched" — a short exhibit, not a
regenerated series.

## 3. Why this is the right shape (vs. alternatives)

The research note weighed four plausible shapes. The chosen shape (A — Track A)
is the smallest change that closes both P7 and P8.

### Alt. 1 (chosen) — Self-classify + publish hierarchy on `/methodology`, no code

- **Scope:** page-copy change only, bounded.
- **Pros:** closes P7 and P8 together; converts the exposure into a stated
  design position; mirrors the LBMA / Baltic approach of owning the
  limitation; no risk to the locked v1.0 numbers; reversible by a page
  rollback; sets up the Track B reconciliation report as the natural
  follow-up.
- **Cons:** does nothing to *physically* add transaction anchoring. P7
  remains `partial / structurally weak` in the gap matrix; closing it
  fully requires Track B. The upside is that an auditor conversation
  starts from "we classified our inputs correctly and we have a
  roadmap" rather than from "we never addressed it."

### Alt. 2 — Build the `invoice_observations` ingest first, then publish

- **Scope:** multi-week infrastructure work (redaction pipeline, provider
  outreach for voluntary invoice submission, API surface, admin review).
- **Pros:** addresses the substance of P7 directly, not just the
  disclosure.
- **Cons:** blocks the P0 disclosure fix behind P1 infrastructure work.
  Every day the page continues to describe the formula without
  classifying the input class is a day a licensee conversation goes
  wrong on the opening page view. The right sequencing is: ship the
  disclosure now, then build the anchor.

### Alt. 3 — Admit invoice observations as a weighted input class in v1.0

- **Scope:** methodology-class change. Full Committee process, 30-day
  public notice, 90-day backtest, new semver (v1.1), new row in
  `methodology_versions`.
- **Pros:** maximum P7 strength.
- **Cons:** charter-prohibited while the ingest pipeline doesn't exist
  (no invoice data to weight), and ill-advised even once it exists —
  mixing a sparse new input class into the locked formula without a
  robustness study is the opposite of the discipline the charter
  requires. Flagged in the research note as "not now; v1.x after Track
  B is production-grade."

### Alt. 4 — Say nothing; keep the current page and rely on open code

- **Scope:** zero.
- **Pros:** nothing to review.
- **Cons:** this is the status quo and it is the status quo this
  proposal exists to end. "The code is open" is not an answer a BMR
  Art. 11(3)(d) reviewer will accept.

An MSCI methodology revision committee would reach for Alt. 1 for an
analogous disclosure gap on an existing index: smallest edit that
closes the review, with the structural fix (Track B) on a published
roadmap. S&P and FTSE Russell publish *Index Mathematics* / *Benchmark
Statement* documents in exactly this register — classification first,
then formula, then operational detail.

## 4. Empirical impact

Methodology template §Empirical impact is **N/A for this proposal** —
no numeric input changes, so no backtest moves. The empirical signal
that "this works" is instead:

- **Diff exhibit.** The PR diff is bounded to `apps/web/app/methodology/page.tsx`.
  The hard-limit files (`packages/shared/src/methodology.ts`,
  `apps/workers/src/functions/methodology.test.ts`,
  `apps/workers/src/functions/index-calculator.ts`,
  `apps/workers/src/functions/outlier-detector.ts`, `packages/db/migrations/*`)
  are not in the diff. CI's `pnpm test` passes unchanged, including
  the methodology lock test — which is the empirical proof that no
  published-number drift was introduced.
- **Reader test.** A fund lawyer reading `/methodology` top-to-bottom
  before the change gets to "Index Committee" without ever learning
  what input class the index consumes. After the change, they get it
  on the way through. This is testable only by a human read; the
  closing section includes a reviewer-eye checklist.
- **Downstream effect on the gap matrix.** After merge: `iosco-principles.md`
  P7 moves from "`partial / structurally weak` — Track A: write the
  proposal" to "`partial` — Track A done; Track B pending" (Track B
  remains the structural strengthening; the status word drops the
  "structurally weak" qualifier because the disclosure is now the
  LBMA/Baltic-pattern defence of the limitation, not an unaddressed
  exposure). P8 moves from `partial` to `compliant`.

## 5. Risks

### 5.1 Immediate (test / data)

- **Zero methodology drift.** The methodology lock test exists to catch
  silent changes to `PUBLISHED_METHODOLOGY`. This proposal does not
  touch it; the test will pass unchanged. CI gate protects against a
  diff that quietly expands.
- **Zero downstream data impact.** No `index_values_daily` row is
  recomputed; no row is added; no row's `methodology_version` field
  changes. Historical values remain reproducible.

### 5.2 Second-order (reviewer trust)

- **Overclaiming.** The failure mode is a page that reads as "CTI is
  IOSCO-compliant" when gap-matrix row P7 says `partial / structurally
  weak`. The chosen copy is deliberate: *"CTI is a published-quote
  benchmark"* is a classification, not a compliance claim. The copy
  explicitly says Class 1 inputs are "not used in the published v1.0
  formula" and points to the reconciliation report as the planned
  anchor. Reviewers see honesty, not aspiration.
- **Underclaiming.** The failure mode is reading "we only use list
  prices, not trades" as a disqualification. The copy mitigates by
  grounding the classification in BMR Art. 11(1)(c) committed-quote
  language and by naming the comparable benchmarks (Baltic, PRA) that
  live in the same category.
- **Licensee contract drafting.** A licensee contract that references
  CTI must reference *this classification* going forward. The
  mitigation is to publish the classification *before* the first
  licensee contract — which is why this is a P0.

### 5.3 Charter / lock-in

- **The 30-day public-notice question.** The Committee charter on
  `/methodology` says methodology changes get 30 days' notice before
  effective date. The question is whether a page-copy addition about
  the input class is a "methodology change." The research note's
  reading, and this proposal's position, is **no**: the published
  formula, the published constants, the computed values, and the
  version row are all identical pre- and post-merge. The addition
  describes the input class the current locked methodology already
  consumes; it does not alter the methodology. By analogy, MSCI's
  routine updates to the *descriptive* sections of a *Methodology Book*
  do not trigger a reconstitution event. A one-line note in the §6
  rollout plan records this reading in writing so the next Committee
  can review the posture if they disagree.

## 6. Migration / rollout plan

- **Public-notice window.** Not applicable per §5.3 — no methodology
  change, no new `methodology_versions` row, no semver bump. If the
  reviewer disagrees, the fallback is: merge the file edit, delay
  deployment to prod for 30 days by withholding the Vercel promote,
  and announce the effective date on the page itself. **This is a
  reviewer call** — flagged explicitly in §8 so it is not assumed.
- **Deploy steps.** Standard Vercel deploy on merge to `main`. The
  methodology page is `revalidate = 300`, so the new copy is live
  within 5 minutes of the Vercel build going green.
- **Rollback steps.** Revert the one-file PR; redeploy. Reversible
  within one commit.
- **Post-merge monitoring.** Watch `system_events` for `methodology_changed`
  events for 24 hours — none should fire, because no methodology code
  path is touched. If one does fire, that is a bug in the proposal and
  requires immediate rollback and investigation. (This is the exact
  belt-and-braces check Roadmap C15 would automate; today it is a
  manual read of the `system_events` tail.)
- **Documentation follow-ups** (not in this PR, queued for next
  index-architect runs):
  1. Update `docs/research/gaps/iosco-principles.md` rows P7 and P8
     per §4 above (same PR; see §7).
  2. Open the Track B workstream — invoice-observations ingest +
     reconciliation report — as a separate roadmap item (B11 or
     subsequent).
  3. On the Committee's first quarterly review (due ~2026-07-29;
     delayed into Q4 by this cycle's work), include a Review item:
     "P7/P8 disclosure on `/methodology` — does the published copy
     still match the implementation?" This is the P10 recurrence
     check.

## 7. In-scope changes to the gap matrix

Same PR as the page edit updates `docs/research/gaps/iosco-principles.md`:

- Row **P7**, status column: `partial` (drop the "structurally weak"
  qualifier); Evidence column adds "self-classified as published-quote
  benchmark on `/methodology`, Input data section, PR #<n>"; Specific
  gap column replaces Track A line with "Track A done. Track B
  (`invoice_observations` ingest + reconciliation report) is P1,
  infra, no hard-limit file."
- Row **P8**, status column: `compliant`; Evidence column: "Hierarchy
  of data inputs section on `/methodology`, five classes in BMR-style
  priority order, PR #<n>."
- Rolling priority queue P0 item 4 removed. P1 item 7 removed (bundled
  into P0 item 4, now resolved).
- Revision log entry: "2026-10-26 — P7 self-classification + P8
  hierarchy proposal merged (PR #<n>). P7 drops `structurally weak`
  (Track A delivered; Track B pending). P8 → `compliant`. Priority
  queue P0 item 4 and P1 item 7 removed. (index-architect fourth run.)"

The revision log entry only lands with the merge; the PR itself writes
the status/evidence/gap cells.

## 8. Committee deliberation prompt

> *Reviewer, you are being asked three distinct things:*
>
> *(1) **Is the self-classification correct?** CTI is being declared a
> "published-quote benchmark" under EU BMR Art. 11(1)(c)'s
> "committed quotes" treatment. The reasoning is in §1 and the
> research note. Alternatives (full transaction benchmark, estimated
> benchmark, expert-judgement benchmark) are each ruled out in §2.2.
> If you disagree with the classification, say which class is more
> accurate and why.*
>
> *(2) **Is the Hierarchy of Data Inputs copy right?** The five-class
> ordered list in §2.2 is CTI's reading of BMR Art. 11 / IOSCO P8
> adapted to the on-demand compute market. The two most consequential
> judgement calls are: Classes 2 and 3 are collapsed (both executable,
> but no separate size/duration commitment on Class 3), and Class 1
> is named with the specific future path (invoice reconciliation →
> future weighted admission after full Committee process). If you
> would re-order, re-split, or re-word a class, mark the specific
> line.*
>
> *(3) **Is the 30-day public-notice posture (§5.3, §6) acceptable?**
> This proposal takes the position that classifying the existing
> input class on a descriptive page is **not** a methodology change
> under the charter — the formula, constants, version row, and
> computed values are identical pre- and post-merge. If you consider
> any addition to `/methodology` to require 30 days' notice regardless
> of whether a locked number changes, the fallback (delay the Vercel
> promote by 30 days and announce an effective date on the page) is
> available at no extra engineering cost. State the posture you want
> adopted so it becomes the standing rule for future descriptive-text
> changes to `/methodology`.*
>
> *Voted: <yes / yes-with-copy-edits / no>, @CarlosGalindo2807, on
> YYYY-MM-DD. Rationale: ______.*

## 9. Sources

**Primary regulatory texts** — direct `WebFetch` of these documents
returned HTTP 403 or DNS failure in this session's sandbox (as in the
2026-05-10 and 2026-05-12 sessions). Quoted phrases are taken from
IOSCO- and ESMA-indexed search excerpts and from the companion research
note's reconstruction; a future session from an environment with PDF
egress should snapshot these documents into a research-only artifact
and reconcile line by line.

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13
  (IOSCOPD415), July 2013. https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
  — Principle 6 (Benchmark Design), Principle 7 (Data Sufficiency),
  Principle 8 (Hierarchy of Data Inputs), Principle 9 (Transparency of
  Benchmark Determinations).
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*,
  IOSCOPD549, January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
  — Guidance on Principle 7 proportionality.
- IOSCO, *Review of the Implementation of IOSCO's Principles for
  Financial Benchmarks by Administrators of EURIBOR, LIBOR and TIBOR*,
  FR07/14 (IOSCOPD454), July 2014. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD454.pdf
  — the "Principle 7 has posed particular challenges" finding referenced
  in §1.
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input
  data). EUR-Lex CELEX 32016R1011. https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng
  — Art. 11(1)(a) sufficiency; Art. 11(1)(c) hierarchy and committed
  quotes; Art. 11(3)(d) published guidelines on input-data priority
  and expert judgement.
- UK-retained version of Art. 11, legislation.gov.uk:
  https://www.legislation.gov.uk/eur/2016/1011/article/11/data.xht ,
  https://legislation.gov.uk/eur/2016/1011/annexes?view=plain — Annex I
  for the committed-quotes priority order in interest-rate benchmarks.
- ESMA, Interactive Single Rulebook, BMR Art. 11.
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data

**Comparable-benchmark input-class disclosures** (industry models for
the kind of self-classification this proposal implements):

- STOXX, *Input Data Integrity Policy*. https://www.stoxx.com/documents/dax-indices/Documents/Resources/Index_Regulations/Input_Data_Integrity_Policy.pdf
- STOXX, *IOSCO Compliance Report 2017*. https://www.stoxx.com/documents/stoxxnet/Documents/Resources/Regulation/STOXX_IOSCO_REPORT_2017.pdf
- NSE Indices, *IOSCO Compliance Statement* (2015, 2017, 2020, 2022).
  https://nsearchives.nseindia.com/supra_global/content/iisl/Nifty_Indices_IOSCO_Compliance_2017.pdf
- Baltic Exchange, *Guide to Market Benchmarks* v8.3 (Apr 2026).
  https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf
- ICE Benchmark Administration / LBMA, *LBMA Gold Price FAQs*.
  https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price

**Internal references:**

- `apps/web/app/methodology/page.tsx` — target (hard-limit).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` (hard-limit, **not** modified).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` schema (Track B anchor).
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — full research review.
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — original P7 flag.
- `docs/research/gaps/iosco-principles.md` — rows P7, P8 and the P0 queue.
- `docs/decisions.md` — "Pivot to Bloomberg for buyers" (invoice data as variable 8); "Five-methodology A/B → Locked methodology v1.0" (change-control contract).
- `docs/roadmap.md` — B9 (compliance pack PDF), B10 (30-day data window), C15 (methodology_changed webhook).

## Closing

On merge:

- Mark `docs/research/gaps/iosco-principles.md` rows **P7** and **P8**
  per §7 (page edit, revision-log entry, queue updates).
- Add to `docs/decisions.md`: *"CTI is self-classified as a
  published-quote benchmark under EU BMR Art. 11(1)(c); Hierarchy of
  Data Inputs section published on `/methodology`; Track B
  (`invoice_observations` reconciliation) is the structural
  strengthening path on roadmap. (2026-10-26, PR #<n>.)"*
- Link the merged PR number back into this proposal's footer.

---

*Reviewer-eye checklist (paste into the PR body if useful):*

- [ ] Classification language is accurate (§2.2 — "published-quote benchmark").
- [ ] Hierarchy of Data Inputs § matches the implementation (§2.2 — five classes).
- [ ] "Not used" / "Used today" / "Scheduled" annotations are each correct for the class above them.
- [ ] 30-day public-notice posture (§5.3, §6) is acceptable, or the fallback (Vercel-promote delay + effective-date banner) is to be used instead.
- [ ] No hard-limit file is modified by this PR's diff beyond `apps/web/app/methodology/page.tsx`.
- [ ] `methodology.test.ts` passes unchanged.

*PR footer slot — fill after merge:*

> Merged as PR #___ on YYYY-MM-DD. Live at https://computeterminal.io/methodology on YYYY-MM-DD HH:MM UTC (deploy of commit <sha>).
