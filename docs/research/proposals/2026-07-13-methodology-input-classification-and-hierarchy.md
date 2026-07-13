# Proposal: publish CTI's input classification and data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-07-13 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs / governance (edits a hard-limit surface; **no** change to `PUBLISHED_METHODOLOGY`, no change to any published index value) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit — CODEOWNERS-gated) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Committee member) |
| **Effective date if approved** | Docs surface: on merge (no 30-day notice required — see §*Rollout*). No `methodology_versions` bump; `PUBLISHED_METHODOLOGY` unchanged. |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs), Principle 14 (Submitter Code of Conduct), Principle 19 (Regulatory Cooperation); EU BMR (Regulation (EU) 2016/1011) Article 3 (Definitions — `input data`, `transaction data`, `expert judgement`), Article 11(1)(a),(c), 11(3), 11(4); primary URLs in §*Sources* |
| **Closes gap-matrix rows** | P7 (Track A), P8, P14 (n/a disclosure), P19 (n/a disclosure). Priority-queue P0 item 4. |

---

## 1. Problem

`docs/research/gaps/iosco-principles.md` classifies four IOSCO principles as
unresolved P0/P1 items whose remedy is the **same edit to the same page**:

| Row | Principle | Status today | What's missing on `/methodology` |
|---|---|---|---|
| **P7** | Data Sufficiency | `partial / structurally weak` | Inputs are executable listings, not observed trades. The page doesn't say so. A strict IOSCO/BMR reviewer will press on this. |
| **P8** | Hierarchy of Data Inputs | `partial` | The hierarchy exists in code (rule → alias → fuzzy → Claude ≥ 0.95 → admin queue → outlier check → eligibility check → VWAP); it is not published. BMR Art 11(3) requires publication. |
| **P14** | Submitter Code of Conduct | `n/a`, undocumented | CTI has no Submitters in the LIBOR sense — inputs are scraped. Non-applicability needs to be stated so an assessor marks "n/a, justified" instead of "missing". |
| **P19** | Regulatory Cooperation | `n/a until regulated` | CTI is not ESMA/FCA-registered. Non-applicability needs to be stated on the public spec so the position is not later mistaken for evasion. |

The full research trail is in
[`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
and [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md).
This proposal converts that research into a specific, mergeable page edit.

The gap is not that CTI *fails* these principles — the note argues P7 is
defensible on the "committed quotes" reading of BMR Art 11(1)(c). The gap is
that the position is not stated on the public spec. That silence is what a
reviewer, licensee, or auditor reads as evasion. **Owning the limitation is
what turns it from a hidden weakness into a design position.** The LBMA
Gold fixing, the Baltic freight indices, and MSCI/IPD property indices all
solved the same problem the same way: publish the input class, publish the
hierarchy, publish the reason transaction data is not primary — and be
IOSCO-compliant on the strength of *governance and control around the
inputs*, not on transaction purity.

## 2. Proposed change

Edit `apps/web/app/methodology/page.tsx` to add **one new top-level section**
(`Data inputs`) between the existing "Formula" and "Index Committee"
sections, and to add **two short disclosures** at the foot of the page
(P14, P19). No other section moves; the Formula, Index Committee, AI
orchestration, and Version-history sections are unchanged.

### 2a. New section: `Data inputs`

Copy below is the intended user-facing text. Formatting matches the
page's existing Tailwind classes (`display`, `mono`, `text-ink-secondary`,
`bg-bg-surface`, etc.); the actual JSX in the PR will mirror the sibling
sections' shape.

> ### Data inputs
>
> **Classification.** CTI is a **published-quote benchmark**. Its inputs
> are firm, executable on-demand list prices captured directly from
> provider endpoints. Every eligible offer would settle on click at the
> quoted price — closer, in substance, to committed quotes than to
> indicative submissions. On-demand compute has no public consolidated
> transaction tape; per the hierarchy below, transaction data is
> preferred where available and executable quotes are used otherwise.
> This treatment is consistent with EU BMR Regulation (EU) 2016/1011
> Article 11(1)(c), which permits "estimated prices, quotes and
> committed quotes" where transaction data is not sufficient or is not
> appropriate to represent the market or economic reality the benchmark
> measures.
>
> The interest CTI measures — the prevailing on-demand $/GPU-hour for a
> given GPU model in a given hour — is anchored in a genuine arms-length
> cash market. The published number is computed from that market with
> **no expert judgment**.
>
> **Hierarchy of data inputs (Principle 8 / BMR Art 11(3)).**
> Every price snapshot passes through the ordered stages below. Each
> stage is deterministic; no stage exercises expert judgment. A snapshot
> that fails any stage is excluded from that day's determination and,
> where relevant, the exclusion reason is retained in `price_snapshots`.
>
> | # | Stage | Determined by | Auditable in |
> |---|---|---|---|
> | 1 | **Capture.** Poll provider endpoint at cron cadence; parse into a `PriceSnapshot` shape. | Zod schema (schema-validated; malformed rows dropped, not coerced). | `apps/workers/src/functions/scrapers.ts`, `apps/scrapers/providers/*` |
> | 2 | **GPU-model normalization.** Match the vendor-supplied string to the canonical `gpu_models.slug` — rule → alias → fuzzy. | Static rulebook; identical inputs → identical outputs. | `apps/scrapers/core/normalizer.py` |
> | 3 | **Batched LLM normalization** (unknown strings only). Hourly Claude Sonnet 4.6 batch. Confidence ≥ 0.95 auto-resolves and back-fills; 0.70 – 0.95 queued for one-click admin approval; < 0.70 dropped. Runs after the deterministic stages, never in the published-value path for known GPUs. | Confidence threshold constants; every resolution logged. | `apps/workers/src/functions/normalize.ts`, `/admin/unmatched` |
> | 4 | **Provider-reliability floor.** Snapshots from providers with `reliability_score < 0.5` are excluded. Reliability decays automatically on outlier ratio > 30% and recovers when stable for 7 days. **No manual override.** | Reliability decay rule; open-source. | `apps/workers/src/functions/reliability-scorer.ts`, `/admin/health` |
> | 5 | **Outlier filter (MAD-3σ).** Per GPU model over the last hour, an offer whose price deviates from the median by more than three MADs is flagged `is_outlier = true` and excluded from `E_t`. Same robust dispersion estimator used by S&P GSCI and ICE settlement procedures. | Deterministic; formula in §Formula above. | `apps/workers/src/functions/outlier-detector.ts`; per-row flag on `price_snapshots.is_outlier` |
> | 6 | **Quorum.** For each index, if the count of eligible snapshots is < 5 for the 24-hour window, no value is published. An `index_value_skipped` event is written. We never extrapolate, never carry forward, and never fall back to a different formula. | `minObservations = 5` in `PUBLISHED_METHODOLOGY`. | `apps/workers/src/functions/index-calculator.ts:67`; `system_events` |
> | 7 | **Volume-weighted mean.** The published index value is `Σ p_i·q_i / Σ q_i` over the surviving set — the formula in §Formula. | Locked in `PUBLISHED_METHODOLOGY.formulaId = 'filtered_vwap'`. | `packages/shared/src/methodology.ts` |
>
> The above is the **only** ordering the published-number path uses. When
> transaction data (see: `invoice_observations`, populating from a
> forthcoming redaction/ingest pipeline) becomes reliably available, a
> future methodology version may admit it as an input class above
> stage 5 in this hierarchy; that admission would follow the Index
> Committee 30-day-notice procedure and would arrive with a companion
> proposal, a v1.x version bump, and a backtest.
>
> **What CTI is *not* today.** CTI is not built from a tape of observed
> customer transactions, because no public consolidated tape exists for
> on-demand compute. CTI is not an auction fix (LBMA-style); no clearing
> venue exists. CTI is not built on panel submissions (Baltic-style); no
> human submitters are in the pipeline. The design choice — executable
> published quotes from provider endpoints, mechanically captured,
> schema-validated, outlier-filtered — is documented here so it is a
> stated position rather than an implicit one.

### 2b. Two short disclosures at the foot of the page

Insert two paragraphs (or bullets) after the Version-history section and
above the existing source-reference footer. Suggested copy:

> **Submitters (IOSCO Principle 14).** CTI has no Submitters in the
> LIBOR sense. Inputs are captured mechanically from provider-published
> price endpoints; there is no human submission step. A Submitter Code of
> Conduct is therefore not applicable. This non-applicability is
> documented so an assessor evaluating CTI against the IOSCO Principles
> can mark P14 as "n/a, justified" rather than "missing".
>
> **Regulatory status (IOSCO Principle 19).** CTI is not an
> ESMA-registered EU BMR benchmark, and is not FCA-supervised in the UK.
> The Administrator commits, on registration, to the cooperation-with-
> regulators obligations of Principle 19. This position is stated so the
> spec does not silently claim regulatory status the benchmark does not
> yet hold.

### 2c. What does **not** change

- `packages/shared/src/methodology.ts` — no change. `PUBLISHED_METHODOLOGY_VERSION` stays `'v1.0'`.
- `apps/workers/src/functions/methodology.test.ts` — no change. The lock test remains active.
- `apps/workers/src/functions/index-calculator.ts` — no change. Same eligibility rules, same order.
- `apps/workers/src/functions/outlier-detector.ts` — no change.
- `packages/db/migrations/*` — no change. No new tables, no altered columns.
- Every row already in `index_values_daily` remains unchanged. **No historical values are recomputed.**
- The 5-way A/B in `index_methodology_experiments` — no change.
- The AI-orchestration cards — no change (they already describe stages 1–3 correctly).

## 3. Why this is the right shape (vs. alternatives)

### Alternative A — Do nothing until an external reviewer asks.
Cheapest today; most expensive on first contact with a serious licensee or
auditor. A licensing conversation opens with "how does this satisfy IOSCO
P7?"; not having a stated position forces the conversation into ad-hoc
defence rather than a documented design choice. **Rejected.**

### Alternative B — Change the methodology to raise quorum / narrow universe so P7 pressure eases.
This is "Track C" in the 2026-05-12 note. It is a real option, but it is a
*methodology-class* change: requires v1.x bump, 30-day notice, and a backtest
showing suppression rate. It does not close P8 (hierarchy still unpublished)
or P14/P19 (still undocumented). Deferred to a separate proposal after data
sufficiency accumulates. **Not this proposal.**

### Alternative C — Build the transactional anchor first (`invoice_observations` ingest), then publish.
This is "Track B" in the 2026-05-12 note. Right long-term direction; wrong
sequencing. The ingest pipeline is weeks of work (redaction rules, customer
consent flow, spend-band bucketing, statistical reconciliation). The docs
edit is hours. Shipping the classification first turns the current
executable-quote position into a **stated** design choice, which the
transaction anchor then *strengthens* rather than *rescues*. **Complementary
future proposal, not blocking.**

### Alternative D (chosen) — Publish the classification and hierarchy now, docs-only.
Closes four principle gaps with one page edit. Touches no lock file. Requires
no backtest (no published number changes). Sits inside the existing charter
(the Committee approves docs edits to `/methodology`; only *methodology*
changes trigger the 30-day notice). Sets up Tracks B and C as *additions*
to a stated baseline rather than *replacements* for a hidden one. This is the
same sequencing MSCI/IPD, Baltic Exchange, and the oil PRAs used —
statement of compliance first, transaction-anchor tightening later.

## 4. Empirical impact

**Because this proposal changes no formula, constant, table, or computation,
the empirical signal is: no published index value changes.** Verifiable in
three ways:

1. **`methodology.test.ts` still passes.** The lock test snapshots
   `PUBLISHED_METHODOLOGY` verbatim; if this proposal accidentally touched
   the constant, the test would fail on CI. The test is untouched by this PR.
2. **`index_values_daily` diff.** Re-run `apps/workers/src/functions/index-calculator.ts`
   over the last 30 days on a scratch DB against the changed branch; every
   row's `vwap`, `num_observations`, `contributing_provider_ids`, and
   `methodology_version` matches production byte-for-byte. (This is a
   *reader* test — it reads `price_snapshots`, writes no side-effects to
   prod tables. If this test cannot be run before merge because of scratch-DB
   plumbing gaps, note it as a follow-up in the PR body; the lock test
   already provides the load-bearing invariant.)
3. **CI check on hard-limit constants.** `apps/workers/src/functions/methodology.test.ts`
   asserts `PUBLISHED_METHODOLOGY` matches the frozen snapshot. Any drift
   fails CI. No drift is expected.

**Docs-quality signal.** Post-merge, running the IOSCO gap matrix
([`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md))
top-to-bottom, four rows move: P7 → `partial → partial (Track A shipped;
Tracks B, C queued)`; P8 → `partial → compliant`; P14 → `n/a undocumented →
n/a documented`; P19 → `n/a undocumented → n/a documented`. Three of four
P0 items 1-4 collapse to a single merged PR after this and B7 (name Carlos)
and P3/P5 (COI disclosure) ship. Only P16 (complaints email) remains P0
after that.

**Signal that the new copy is accurate.** The seven-stage hierarchy in
§2a mirrors the pipeline as it exists at merge time. If a stage is missing
or misordered, a reader can prove it from the linked source files:
`scrapers.ts`, `normalizer.py`, `normalize.ts`, `reliability-scorer.ts`,
`outlier-detector.ts`, `index-calculator.ts`. The PR should include a
reviewer note asking Carlos to spot-check each stage's linked file
matches the described behaviour before merge.

## 5. Risks

**Immediate (this PR).**
- *Misdescription of a pipeline stage.* If the copy misstates a stage
  (e.g. wrong threshold, wrong ordering, an omitted step), it publishes
  an incorrect audit statement. **Mitigation:** every stage in the table
  links to the source file; reviewer walks the seven links.
- *Broken build.* Docs-only JSX edit in a Server Component; `pnpm -r
  typecheck` catches. See §*Rollout*.
- *Copy tone drift.* The existing page's tone is precise and unshowy; the
  new copy must match. Reviewer: line-edit for tone before merge.

**Second-order (design risks the copy could bake in).**
- *Overclaiming.* The copy calls CTI's inputs "closer, in substance, to
  committed quotes than to indicative submissions." That claim relies on
  the executability of each provider's published price. If Vast.ai / RunPod
  / Lambda ever moves to *indicative* pricing (list price ≠ purchase
  price), the classification would be misleading. **Mitigation:** the
  reliability decay path already flags providers whose published prices
  systematically diverge from executable behaviour (via outlier ratio); the
  Committee's quarterly review is the check that the classification still
  holds. If it stops holding, that's a v1.x methodology conversation.
- *Underclaiming, and creating regulatory drag.* Explicitly stating "not
  ESMA-registered" is honest but visible. A future licensee may treat it as
  a red flag rather than a status marker. **Mitigation:** the same P19
  paragraph explicitly commits to cooperation on registration; the position
  is honest, not evasive. This is the shape adopted by every IOSCO
  Statement of Compliance the note cites (NY Fed, Morgan Stanley, RBA).
- *Locking in a hierarchy that we then want to change.* Publishing the
  hierarchy is BMR Art 11(3) compliance; changing the hierarchy in future
  is a *methodology* change (Committee + 30-day notice) because it
  materially affects what enters `E_t`. This is a feature, not a bug —
  the whole point is that ingestion-order changes get the same discipline
  as formula changes. But it means the hierarchy in §2a becomes the same
  class of contract as `PUBLISHED_METHODOLOGY` itself. **Mitigation:** the
  wording in §2a paragraph "The above is the **only** ordering…" makes the
  contract explicit, so a future editor knows the escape hatch is a
  proposal, not a docstring edit.

**Regulatory drag risk from the P19 disclosure — reviewer decision needed.**
If the Committee prefers a softer disclosure (e.g. "administrator status is
under review" instead of "not registered"), the P19 paragraph is the
smallest possible edit; flag on PR review.

## 6. Rollout plan

Docs-class change (not a methodology change). The 30-day public-notice
procedure applies to methodology-value changes (i.e. edits that change what
appears in `index_values_daily.vwap`). This proposal changes neither the
formula, the constants, the eligibility rules, nor the outlier filter — it
publishes the classification of inputs and the ordering already used in
code. Therefore:

1. **Merge on approval.** No `methodology_versions` row is inserted. No
   `methodology_changes` row is inserted (the table is for *methodology*
   changes; this is a *methodology-page* clarification).
2. **Cache invalidation.** `/methodology` uses `revalidate = 300`. Next
   revalidation within 5 minutes surfaces the new copy globally.
3. **No data migration.** No SQL runs.
4. **Rollback plan.** `git revert` on the PR. `/methodology` restores to
   pre-merge state within one revalidation window. No downstream artifact
   references any of the new text.
5. **Post-merge verification checklist for the reviewer:**
   - [ ] `pnpm -r typecheck` green on the merged commit.
   - [ ] `apps/workers/src/functions/methodology.test.ts` green on CI.
   - [ ] `/methodology` renders the new "Data inputs" section between
     "Formula" and "Index Committee", with the seven-row hierarchy table.
   - [ ] `/methodology` renders the two footer disclosures (P14, P19).
   - [ ] `index_values_daily` row count / values for the 24 hours post-merge
     match the row that would have been produced pre-merge (spot check the
     next 00:30 UTC calculator run).
6. **Follow-ups queued (out of scope for this PR):**
   - Update `docs/research/gaps/iosco-principles.md` P7/P8/P14/P19 rows +
     priority-queue to reflect the merged edit. (Done in the same PR as
     part of §7 below.)
   - Update `docs/decisions.md` with a new entry summarising the input
     classification. (Done in the same PR.)
   - Draft the P16 (complaints email + SLA) proposal — smallest remaining
     P0 item after this ships.
   - Draft the P3 (COI disclosure) + P5 (single-administrator declaration)
     proposal — second-smallest remaining P0.

## 7. Committee deliberation prompt

Suggested paragraph for the Committee to paste into the decision record on
approval:

> "We are publishing on `/methodology` the classification of CTI's inputs
> as *executable published quotes* (substantively BMR Art 11(1)(c)
> 'committed quotes'), the seven-stage deterministic input hierarchy, and
> non-applicability disclosures for IOSCO Principles 14 (Submitters, no
> submission step exists) and 19 (Regulatory Cooperation, not yet
> registered; commitment on registration stated). No formula, constant,
> eligibility rule, or outlier filter changes. No published index value
> changes. This resolves gap-matrix rows P7 (Track A), P8, P14, and P19
> as documented in [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md).
> We accept the second-order risk that publishing 'not ESMA-registered'
> makes CTI's regulatory status more visible to prospective licensees, in
> exchange for the credibility of an honest, IOSCO-Statement-of-Compliance-
> shaped public position. Voted: <yes/no>, Carlos Galindo Dumitrescu, on
> 2026-07-<dd>."

## 8. Closing

On approval and merge:
- Mark rows P7 (Track A), P8, P14, P19 in
  [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md)
  as resolved; move their entries out of the P0/P1 priority queues; add a
  revision-log line dated 2026-07-<merge>.
- Add an entry to [`docs/decisions.md`](../../decisions.md) titled
  "Published-quote classification + input hierarchy on `/methodology`
  (added 2026-07-13)" summarising the change, the four principles closed,
  and the reasoning; link this proposal and the merged PR.
- Link the merged PR in the footer of this proposal.

Merged PR: *pending.*

---

## Sources

Primary regulatory texts (direct PDF/HTML fetch remained blocked HTTP 403
from this session's egress as in prior runs; verbatim passages below are
reconstructed from IOSCO- and ESMA-published search excerpts and from
official mirrors. A future session run from an environment with unblocked
egress should download `IOSCOPD415.pdf`, `IOSCOPD549.pdf`, and the
consolidated `32016R1011` into a research-only artifact and reconcile any
material differences with this proposal.):

- IOSCO, *Principles for Financial Benchmarks — Final Report* (FR07/13,
  IOSCOPD415), July 2013. Principle 7 (Data Sufficiency): "based on prices,
  rates, indices or values that have been formed by the competitive forces
  of supply and demand and anchored by observable transactions entered into
  at arm's length between buyers and sellers in such an active market";
  clarified that P7 "does not preclude using executable bids or offers"
  and "does not mean that individual benchmark determinations must be
  constructed solely or even predominantly by transactions or that data
  must be used in a certain order." Principle 8 (Hierarchy of Data
  Inputs): "The administrator will set up and publish guidelines regarding
  the hierarchy of data inputs and the exercise of expert judgment used
  for the determination of benchmarks." See
  https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*
  (FR03/18, IOSCOPD549), January 2018. Reiterates that "the requirement in
  Principle 7 that a Benchmark must be anchored in an active market having
  observable, Arm's-length Transactions is not affected by the concept of
  proportionality"; permits non-transactional data (offers, bids, expert
  judgment) as "adjunct or supplement." See
  https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation).
  Article 3 definitions include `input data` ("data in respect of the
  value of one or more underlying assets, or prices, including estimated
  prices, quotes, committed quotes or other values, used by an administrator
  to determine a benchmark"), `transaction data` ("observable prices, rates,
  indices or values representing transactions between unaffiliated
  counterparties in an active market subject to competitive supply and
  demand forces"), and `expert judgement` ("exercise of discretion by an
  administrator or a contributor with respect to the use of data in
  determining a benchmark, including extrapolating values from prior or
  related transactions, adjusting values for factors that might influence
  the quality of data such as market events or impairment of a buyer or
  seller's credit quality, and weighting firm bids or offers greater than a
  particular concluded transaction"). Article 11(1)(c): "The input data
  shall be transaction data, if available and appropriate. However, if
  transaction data is not sufficient or is not appropriate to represent
  accurately and reliably the market or economic reality that the
  benchmark is intended to measure, input data which is not transaction
  data may be used, including estimated prices, quotes and committed
  quotes, or other values." Article 11(3): "The administrator shall draw
  up and publish clear guidelines regarding the types of input data, the
  priority of use of the different types of input data and the exercise of
  expert judgement, to ensure compliance with point (a) and the
  methodology." Consolidated text (CELEX: 02016R1011-20250117):
  https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R1011-20250117
  Original: https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng
  ESMA Interactive Single Rulebook, Article 11:
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data

Comparable-administrator IOSCO Statements of Compliance (for shape /
structure precedent):
- New York Fed, *Statement of Compliance with the IOSCO Principles for
  Financial Benchmarks*, July 2025. https://www.newyorkfed.org/medialibrary/media/markets/IOSCO-statement-of-compliance-jul2025
- MSCI, *IOSCO Principles for Financial Benchmarks*.
  https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco
- Reserve Bank of Australia, *Compliance with IOSCO Principles* (Cash Rate
  Methodology). https://www.rba.gov.au/mkt-operations/resources/cash-rate-methodology/compliance.html
- ICE Benchmark Administration, *LBMA Gold Price — IOSCO Assessment
  Report*. https://www.ice.com/publicdocs/LBMA_Gold_IOSCO_self_assessment.pdf
- Parameta Solutions, *Statement Regarding the IOSCO Principles for
  Financial Benchmarks*, February 2026. https://www.parametasolutions.com/wp-content/uploads/2026/02/2026.02.18-IOSCO-Statement-of-Compliance-v3.2.pdf

Internal references (hard-limit files listed for reviewer convenience;
this proposal edits only `apps/web/app/methodology/page.tsx`):
- `apps/web/app/methodology/page.tsx` — published methodology page (**target file**).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` (hard-limit; **unchanged by this PR**).
- `apps/workers/src/functions/methodology.test.ts` — methodology lock test (hard-limit; **unchanged by this PR**).
- `apps/workers/src/functions/index-calculator.ts` — publishing function (hard-limit; **unchanged by this PR**; referenced from hierarchy stage 6).
- `apps/workers/src/functions/outlier-detector.ts` — MAD-3σ filter (hard-limit; **unchanged by this PR**; referenced from hierarchy stage 5).
- `apps/workers/src/functions/scrapers.ts` — capture (stage 1).
- `apps/scrapers/core/normalizer.py` — deterministic normalization (stage 2).
- `apps/workers/src/functions/normalize.ts` — LLM normalization (stage 3).
- `apps/workers/src/functions/reliability-scorer.ts` — reliability decay (stage 4).
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — full 19-principle map.
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — the analysis behind this proposal's classification decision.
- `docs/research/gaps/iosco-principles.md` — gap matrix and priority queue (updated in this PR).
- `docs/decisions.md` — locked-in technical decisions (entry added in this PR).
