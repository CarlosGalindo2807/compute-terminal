# Proposal: Self-classify CTI as a *published-quote benchmark* and publish the Hierarchy of Data Inputs on `/methodology`

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Author** | index-architect (fourth run, cloud routine) |
| **Risk class** | docs (disclosure) — no change to any published number, no change to `PUBLISHED_METHODOLOGY` |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit — requires @CarlosGalindo2807 review per `.github/CODEOWNERS`) |
| **Required reviewer(s)** | @CarlosGalindo2807 (Index Committee, founding charter) |
| **Effective date if approved** | On merge. No 30-day public notice period required: the locked formula constant does not change (no `methodology_versions` row, no `index_values_daily` cell is recomputed). This is a disclosure addition to the already-published spec, exactly the kind of clarification BMR Art 11(3)(d) *requires* an administrator to publish. |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs); EU BMR Regulation (EU) 2016/1011 Article 11(1)(a), 11(1)(c), 11(3)(d); Commission Delegated Regulation (EU) 2018/1642 Art. 2 (nature of input data); IOSCO FR07/13 Guidance on P7 ("non-transactional data such as bids or offers … as an adjunct or supplement"); comparator: STOXX *Input Data Integrity Policy* (ref. 202206-11); comparator: Baltic Exchange *Guide to Market Benchmarks* v8.3; comparator: ICE/LBMA Gold Price methodology. See `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` §3 for the full benchmark survey. |

---

## Problem

Gap matrix (`docs/research/gaps/iosco-principles.md`) rows **P7** and **P8** are
the two highest-leverage quality-pillar gaps for CTI v1.0:

- **P7 — Data Sufficiency.** `status = partial / structurally weak`. Every
  `price_snapshots` row today is a scraped *offer* (an executable list price),
  not an observed trade. IOSCO Principle 7 requires a benchmark be "anchored by
  observable transactions entered into at arm's length." A strict reviewer can
  reasonably press on this.
- **P8 — Hierarchy of Data Inputs.** `status = partial`. The ingestion hierarchy
  (`rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue →
  outlier check → eligibility check → VWAP`) exists in code but is **not
  published** on `/methodology`. BMR Art 11(3)(d) explicitly requires an
  administrator to "draw up and publish clear guidelines regarding the types of
  input data, the priority of use of the different types of input data and the
  exercise of expert judgement." Today we do not.

The research note
[`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
mapped the exposure in detail (§1–2), surveyed how comparable benchmarks of
tape-less markets live within IOSCO/BMR (Baltic Exchange, oil PRAs, LBMA Gold,
MSCI/IPD real estate — §3), and recommended a three-track response (§4):

- **Track A** (now, docs-only) — *self-classify* CTI as a published-quote
  benchmark and publish the data-input hierarchy.
- **Track B** (next quarter, infra) — stand up `invoice_observations` ingest and
  publish a list-price-vs-observed-effective-price reconciliation.
- **Track C** (future, methodology-class) — scale quorum with provider count.

**This proposal implements Track A only.** It closes gap-matrix rows P7 and P8
in one page edit, without touching the locked `PUBLISHED_METHODOLOGY` constant
or any computed value. Tracks B and C are explicitly out of scope and remain in
the queue.

The note's §5 concludes:

> **Recommended single next deliverable:** the `/methodology` self-classification
> + data-input-hierarchy proposal (Track A). It closes the two highest-leverage
> quality-pillar gaps (P7, P8) at once, is a contained docs/page change, and
> turns CTI's most-pressed-on weakness into a stated design position before any
> external licensee conversation surfaces it.

This proposal is that deliverable.

## Proposed change

Add two new sections to `apps/web/app/methodology/page.tsx`, placed between the
existing `Quorum` subsection and the `Index Committee` section. **No change** to
`packages/shared/src/methodology.ts`, `index-calculator.ts`,
`outlier-detector.ts`, or any migration. **No new `methodology_versions` row**
(no number changes). The lock test continues to pass unchanged.

### Section 1 — "Data inputs and benchmark classification"

Insert after the `Quorum` subsection (`/methodology` page, line ~133). Plain
English copy, published verbatim on the page:

> **Data inputs and benchmark classification**
>
> CTI is a **published-quote benchmark**. Every input to the formula above is a
> firm, executable on-demand list price captured directly from a provider's
> own API, pricing page, or GraphQL endpoint. These are "committed quotes" in
> the sense of EU BMR Art 11(1)(c) and Commission Delegated Regulation
> 2018/1642 Art. 2 — a buyer can click to rent at the quoted price at the time
> of capture. They are not estimates, not panellist submissions, and not expert
> judgment.
>
> We publish this classification because on-demand GPU compute has **no public
> consolidated transaction tape**. Unlike equities (TRACE, consolidated tapes)
> or FX (CLS settlement data), there is no central venue through which a buyer
> and seller's completed trade is reported to the market. CTI is anchored in a
> genuine arm's-length cash market for GPU-hours — Vast.ai, RunPod, Lambda, the
> hyperscalers all transact GPU-hours continuously — but the only observable
> primitive we can collect at scale today is the executable quote.
>
> This is the same substance several IOSCO- and BMR-compliant benchmarks run
> on. The Baltic Exchange freight indices are built from panel assessments
> grounded in the same real-but-tape-less market and settle a cleared FFA
> derivatives market. Oil PRA benchmarks (Dated Brent, WTI differentials) blend
> bids, offers, and transactions in a "Market-on-Close" window and routinely
> publish numbers whose underlying weight is quotes rather than prints. MSCI
> and NCREIF real-estate indices rely on independent professional appraisals
> because direct-property transactions are sparse and heterogeneous. In each
> case the IOSCO/BMR defensibility is governance and control around the
> inputs, not transaction purity.
>
> We do not yet claim unqualified compliance with IOSCO Principle 7 (Data
> Sufficiency). The honest position is: CTI's input class is well-defined,
> publicly disclosed, and consistent with BMR Art 11(1)(c)'s treatment of
> committed quotes; a transactional layer (invoice-level observed prices) is
> on the roadmap as a validation anchor; and the Index Committee will revisit
> this classification at each quarterly review as data quality evolves. See
> the companion research note at
> [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](https://github.com/CarlosGalindo2807/compute-terminal/blob/main/docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
> for the full analysis.

### Section 2 — "Hierarchy of data inputs"

Insert immediately after Section 1. The hierarchy is already enforced in code;
this section only makes it visible on the public page.

> **Hierarchy of data inputs**
>
> We follow the structure of EU BMR Art 11(1) and Commission Delegated
> Regulation 2018/1642 Art. 2, adapted for a scraped-quote benchmark. The
> types of input data that may contribute to the published formula, in order
> of priority:
>
> | Tier | Input type | Status in v1.0 | Where used |
> |---|---|---|---|
> | 1 | **Transactions in the underlying market** (observed trades, invoice-level real-paid prices) | Not yet available. Schema exists (`invoice_observations`, migration 011). Target: Track B, 2026-Q4. | Not used today. |
> | 2 | **Observations of third-party transactions** (e.g. secondary-market resale data) | Not available. | Not used today. |
> | 3 | **Committed quotes** (firm, executable, buyer-can-click prices from provider endpoints) | **Sole input class in v1.0.** All rows in `price_snapshots` are tier-3. | Entire formula. |
> | 4 | **Indicative quotes** (non-executable published rates, "contact-sales" opaque pricing, published whitepapers) | Explicitly excluded. | Not used today, and not planned. |
> | 5 | **Expert judgement** (committee adjustments, hand-set values) | Explicitly excluded by charter. | **Never used.** The methodology is deterministic by design. |
>
> **Within tier 3**, inputs pass through the following ingestion stages. Every
> stage is deterministic code; no stage uses expert judgment on a per-value
> basis.
>
> 1. **Capture.** TypeScript-native scrapers (`apps/workers/src/functions/scrapers.ts`)
>    poll provider endpoints every 5 minutes; the Python tree
>    (`apps/scrapers/`) is the local-backfill fallback where Playwright is
>    required.
> 2. **Schema validation (Zod).** Rows that don't match the contract are
>    dropped, not silently coerced. Dropped rows are counted in
>    `system_events`.
> 3. **GPU-model normalization.** Rule-based (`core/normalizer.py`), then
>    alias, then fuzzy. Strings that still don't resolve drain hourly through
>    Claude Sonnet 4.6; `confidence ≥ 0.95` auto-resolves into a
>    `normalization_rule`, `0.70–0.95` queues at `/admin/unmatched` for
>    one-click human approval. **Human approval is governance, not expert
>    judgement on price** — it decides what GPU a string refers to, never what
>    the price of that GPU should be. The admin can only accept or reject the
>    normalization, never edit a price.
> 4. **Outlier filter.** MAD-3σ per GPU-model over the trailing 1 hour. Flag
>    is written back to `price_snapshots.is_outlier` and is per-row auditable.
> 5. **Eligibility floor.** `providers.reliability_score ≥ 0.5`. Reliability is
>    computed from observed scrape success rate and outlier ratio and has no
>    manual override.
> 6. **Quorum.** `|E_t| ≥ 5` eligible observations per index-date. Below
>    quorum, nothing is published; no fallback, no carry-forward, no
>    extrapolation. An `index_value_skipped` event is recorded instead.
> 7. **Published value.** `filtered_vwap` as specified above, weighted by
>    `num_gpus`, version-stamped on every `index_values_daily` row.
>
> Any future admission of tier-1 or tier-2 inputs (observed transactions) into
> the published formula is a methodology-class change and triggers the full
> Index Committee procedure: committee deliberation, 30-day public notice,
> version bump, backtest. The present document is a disclosure of the current
> input class, not a change to it.

### What the diff touches

- **Modified:** `apps/web/app/methodology/page.tsx` — insert two JSX
  `<section>` blocks (~140 lines of static copy and one `<table>`). No new
  imports; no new props on the page; no change to `loadVersionHistory()` or
  the `AgentCard` helper.
- **Modified:** `docs/research/gaps/iosco-principles.md` — update rows P7 and
  P8 status from `partial` → `partial, Track-A disclosed` with a merged-PR
  link; move queue items 4 and 7 from P0/P1 to "resolved".
- **Modified:** `docs/decisions.md` — new entry
  "Published-quote benchmark self-classification + Hierarchy of Data Inputs
  disclosed on /methodology (added 2026-10-01)" summarising the change and
  linking the PR.
- **Not modified:** `packages/shared/src/methodology.ts`,
  `apps/workers/src/functions/methodology.test.ts`,
  `apps/workers/src/functions/index-calculator.ts`,
  `apps/workers/src/functions/outlier-detector.ts`, any migration.

## Why this is the right shape (vs. alternatives)

Three alternative shapes were considered.

**Alt 1 — Do nothing and defer until invoice ingest exists.** The listings-vs-
transactions research note explicitly rejected this (§4): the exposure is in
the gap matrix *today*, not the day a licensee asks about it. Standing up
`invoice_observations` ingest is Track B — multi-week infra, dependent on
customer agreements for anonymised invoice sharing. Deferring the disclosure
until that lands means every month between now and then CTI publishes without
the P8-required published hierarchy, with no mitigating written position on
P7. **Rejected:** the cost of the disclosure is one PR; the cost of its
absence is unanswered on every reviewer press.

**Alt 2 — Claim unqualified IOSCO P7 compliance.** Would be substantively
incorrect — our inputs are not transactions — and would collapse under even
mild external review. The IOSCO FR07/13 Guidance on P7 is explicit: "the
requirement in Principle 7 that a Benchmark must be anchored in an active
market having observable, Arm's-length Transactions is not affected by the
concept of proportionality." Claiming it when we don't have observed
transactions would damage credibility more than disclosing honestly. The
Baltic / oil-PRA / LBMA pattern is to *own the limitation*. **Rejected on
honesty and durability.**

**Alt 3 — Hybrid: declare a transition plan with specific invoice-coverage
thresholds.** E.g. "CTI will claim P7 compliance when `invoice_observations`
covers ≥ X% of index weight over trailing 90 days." Attractive because it
pre-commits a bright line. **Rejected for now** because (a) the threshold
cannot be chosen responsibly without first running Track B and observing what
real invoice coverage looks like — committing to a number today would be a
guess, and the whole point of the proposal is to stop guessing; (b) the
disclosure under the chosen path (Alt 0 — self-classify as published-quote,
publish hierarchy, note Track B as the validation anchor) is already the
substance a licensee or auditor would want in draft form, and leaves room for
a cleaner future commitment once invoice data exists. The Index Committee can
revisit the bright-line question at the first quarterly review (2026-Q4) with
real invoice-coverage data in hand.

**Chosen shape — the two sections above.** Minimal page edit; honest and
specific classification; publishes the hierarchy the regulation requires;
preserves the locked constant; does not pre-commit the Committee to numeric
thresholds it can only choose responsibly after Track B.

## Empirical impact

### Does any published number change?

**No.** This is a docs-only disclosure proposal. The published formula
constant (`PUBLISHED_METHODOLOGY` in `packages/shared/src/methodology.ts`) is
not edited. The methodology lock test
(`apps/workers/src/functions/methodology.test.ts`) continues to assert
`version='v1.0', formulaId='filtered_vwap', windowHours=24,
minObservations=5, outlierFilter='mad_3_sigma', weight='num_gpus',
reliabilityFloor=0.5` and continues to pass without modification.
`index-calculator.ts` and `outlier-detector.ts` are untouched. Every
historical row in `index_values_daily` and `gpu_prices_daily` remains
reproducible from the same `price_snapshots` with the same formula.

### Does the input-class claim match the actual data?

Yes. A read-only inspection of the `price_snapshots` schema and ingest paths
confirms every row currently in the table is a tier-3 input under the
proposed hierarchy:

- All active scrapers (`scrape-vast`, `scrape-runpod`, future `scrape-lambda_labs`)
  query provider endpoints whose quoted price is executable at the time of
  capture — rent-with-one-click on Vast.ai, GraphQL `rentableGpuTypes` on
  RunPod, published rate card on Lambda. No scraper reads an indicative or
  negotiable price.
- No row in `price_snapshots` is written by a human. The only write path is
  the Inngest cron.
- No methodology stage introduces expert judgment on price. The
  normalization-admin queue decides *what GPU a string refers to*, never a
  price value; the queue action is an enum (approve / reject / split), with no
  price field. (Verified by reading `apps/web/app/admin/unmatched` route
  handlers — out of scope for this PR but is background evidence for the
  claim.)
- Tier-4 (indicative quotes) and tier-5 (expert judgement) have no code path
  into `price_snapshots` or `index_values_daily`. The hierarchy table's
  "Explicitly excluded" column therefore reflects actual repo state, not
  aspiration.

### Does any downstream page change?

Only `/methodology` renders new copy; no other page template references the
new sections. The `/index/[slug]` server-rendered SVG chart is untouched. The
`/markets` page is untouched. The licensee-API scaffolding (D17 in the
roadmap) is untouched.

## Risks

**Immediate (ship-day):**

- *Nil* on numbers — nothing numeric changes. Methodology lock test, index-
  calculator, outlier-detector all unmodified.
- Page copy increases by ~140 lines; first-load JS unchanged (page is a
  Server Component with no client bundle). ISR revalidate budget already
  covers.
- The `<table>` added to render the hierarchy uses the same utility classes
  (`tabular`, `mono`, `text-ink-secondary`) already present in the Version
  history section. No new Tailwind utilities.

**Second-order (reputational / legal):**

- **Pre-commits CTI to publishing a transactional reconciliation once
  `invoice_observations` is populated.** The classification text says "a
  transactional layer … is on the roadmap as a validation anchor"; if we
  stand up invoice ingest and then publish nothing, we would be
  self-contradicting on the public page. **Mitigation:** this is Track B in
  the research note — already scoped — and the dependency is one-directional
  (we don't ship Track B silently; it is explicitly a public artifact).
- **The classification is binding on future methodology changes.** Once we
  state that tier-4 (indicative) and tier-5 (expert judgment) are "explicitly
  excluded", a future committee change admitting either would be a
  substantive deviation requiring a methodology version bump and public
  notice. **This is a feature, not a bug** — it is exactly the lock-in that
  makes the benchmark licensable.
- **Does not weaken the licensing position; strengthens it.** A licensee
  (fund, exchange, settlement counterparty) will press on P7 regardless of
  what we publish. A disclosed classification with hierarchy is harder to
  attack than a silent one — the attacker has to argue our stated class is
  wrong, not that we failed to classify.
- **Does not foreclose a future "transaction-anchored" claim.** When
  `invoice_observations` is populated and the reconciliation report ships
  (Track B), the Committee can revise this section with full 30-day notice.
  The present text is explicit that "the Index Committee will revisit this
  classification at each quarterly review."

**Procedural:**

- The `/methodology` page is a hard-limit file under `.github/CODEOWNERS`.
  CODEOWNERS enforcement means this PR cannot land without
  @CarlosGalindo2807 review — the gate is working as designed.
- No `methodology_versions` row is added. Rationale: that table records
  changes to the *formula* (`formula_id`, `formula_params`,
  `effective_from`). A disclosure that adds documentation of the
  pre-existing input class without changing the computation is not a formula
  change in the schema's sense. If the Committee prefers a traceable "docs-
  only" version marker, the alternative is a `v1.0.1` row with
  `formula_id='filtered_vwap'`, identical `formula_params`, and a
  `rationale='Disclosure of input-data classification and hierarchy; no
  change to computed values'`. **Flagged for Committee preference; happy to
  include in-PR either way.**

## Migration / rollout plan

This is a docs disclosure, not a methodology change. The simplified rollout
plan:

1. **Pre-merge checks** (CI, run before pushing the branch):
   - `pnpm -r typecheck` across all workspaces (expected: pass unchanged).
   - `pnpm test` across all workspaces (expected: pass unchanged;
     methodology lock test continues to assert v1.0).
   - Lint on the modified `page.tsx` (expected: no new warnings).
2. **PR review.** @CarlosGalindo2807 reviews as the sole founding Index
   Committee member. Any Committee member who joins before merge is added as
   reviewer (Roadmap B7).
3. **Merge window.** Standard — no scheduled embargo because no number
   changes. Preferred: during a quiet trading-hours window (nights/weekends)
   so the Vercel ISR revalidate pass hits an uncontended `/methodology`
   render.
4. **Post-merge monitoring.** Watch `system_events` for the 24h after merge:
   zero `methodology_changed` events are expected (the formula didn't
   change). An unexpected event would be a code bug and triggers Roadmap C15
   (webhook on methodology_changed). None of the metric cards on
   `/admin/health` should move.
5. **Gap-matrix close-out.** Within the same PR, update
   `docs/research/gaps/iosco-principles.md` rows P7 and P8 to reflect the
   Track-A disclosure and add the merged-PR link; add the
   `docs/decisions.md` entry.
6. **Rollback.** `git revert <merge sha>` on `main`. There is no DB or data
   impact to roll back. Rollback is instant and reversible.

### What is NOT in this PR (deliberately out of scope)

- `invoice_observations` ingest / redaction pipeline (Track B).
- Scaled quorum / utilisation-weighting methodology changes (Track C).
- Any update to `PUBLISHED_METHODOLOGY` constant.
- Compliance-pack PDF generator (Roadmap B9).
- Complaints procedure publication (gap-matrix P16, P0 queue item 3) — a
  separate, parallel P0 docs PR, intentionally not bundled here to keep the
  review surface narrow.
- Conflict-of-interest disclosure (gap-matrix P3/P5, P0 queue items 1–2) —
  also parallel, also P0; separate PR.
- Index Committee member naming (Roadmap B7, gap-matrix P1 action) — a
  one-line UPDATE on `methodology_versions.approved_by`, separate PR.

The three parallel P0 items above are explicitly left to separate PRs so each
has its own review surface and so the gap-matrix close-outs can be audited
one at a time. Nothing in this proposal depends on them, and nothing in them
depends on this.

## Committee deliberation prompt (methodology only)

This proposal is a *docs disclosure*, not a methodology change. A Committee
deliberation prompt is therefore optional, but included for traceability so
the decision is logged in future audits:

> "We are classifying CTI's input class as *committed quotes* (BMR Art
> 11(1)(c)) and publishing the Hierarchy of Data Inputs on `/methodology`.
> This surfaces an existing design choice; it does not change any computed
> value. The classification pre-commits CTI to publishing a transactional
> reconciliation report once `invoice_observations` is populated (Track B in
> the companion research note). Approving this proposal is a positive
> commitment to Track B as a successor artifact. Voted: <yes/no>, Carlos
> Galindo Dumitrescu, on YYYY-MM-DD."

## Closing

Once approved and merged:

- Mark `docs/research/gaps/iosco-principles.md` row **P7** status: `partial`
  → `partial, Track-A disclosed (<PR link>)`. Keep in P1 queue because
  Track B / Track C remain open; drop out of the P0 queue (item 4
  resolved).
- Mark row **P8** status: `partial` → `compliant` with hierarchy published
  under `/methodology`. Drop out of the P1 queue (item 7 resolved).
- Add an entry to `docs/decisions.md` titled "Published-quote benchmark
  self-classification + Hierarchy of Data Inputs disclosed on
  `/methodology` (added 2026-10-01)" with: what / why / what we'd
  reconsider; link to the merged PR; link to the two companion research
  notes (2026-05-10, 2026-05-12) and this proposal.
- Update the `/methodology` Section 1 "a transactional layer … is on the
  roadmap" phrasing *only* when Track B begins (next session can propose
  the one-line edit; a trivial docs follow-up).
- Link this proposal's merged PR in the footer below.

---

*This proposal lives at
`docs/research/proposals/2026-10-01-published-quote-benchmark-classification.md`.
It follows `docs/research/proposals/_TEMPLATE.md`. The ask on
@CarlosGalindo2807 is: review the two inserted sections for voice and
substance, decide the "methodology_versions v1.0.1 docs-row" question (§Risks,
"Procedural"), and either request changes or approve + merge.*

**Merged PR:** _pending_.
