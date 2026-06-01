# Proposal: Self-classify CTI as a "published-quote benchmark" and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-06-01 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (hard-limit page — requires proposal per charter) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (page text only — no constants, no logic, no schema) |
| **Required reviewer(s)** | @CarlosGalindo2807 |
| **Effective date if approved** | Day of merge. **No 30-day notice period required** — see §5. |
| **References** | IOSCO FR07/13 Principles 7 (Data Sufficiency) and 8 (Hierarchy of Data Inputs); IOSCO Guidance IOSCOPD549 (2018); Regulation (EU) 2016/1011 ("BMR") Art 11(1)(c), Art 11(3)(d), Art 3(1)(14)–(15); ICE LIBOR "waterfall of methodologies"; MSCI / NY Fed Statements of Compliance. URLs in §Sources. |

## 1. Problem

[`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) marks two rows as P0 quality-pillar gaps:

- **P7 · Data sufficiency** — `partial / structurally weak`. CTI inputs are scraped *listings* (executable list prices), not observed trades. A strict P7 read could press on whether CTI is "anchored by observable transactions".
- **P8 · Hierarchy of data inputs** — `partial`. CTI's input hierarchy (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP) exists in code but is **not published** on `/methodology`. EU BMR Art 11(3)(d) explicitly requires publication: *"the administrator must draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement."*

The companion research note [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) mapped the response in three tracks (A: docs self-classification; B: invoice anchor; C: scaled quorum). **This proposal lands Track A** — the docs-only edit that closes both P7 and P8 in a single page change. It is the single highest-leverage action available right now because:

1. It addresses **two** P0 gaps in one edit, on one file.
2. It does **not** touch `PUBLISHED_METHODOLOGY`, `index-calculator.ts`, `outlier-detector.ts`, `methodology.test.ts`, or any database migration. The locked computation does not move. The lock test remains green.
3. It converts CTI's most-pressed-on weakness — "you only have asks, not trades" — into a stated design position consistent with established benchmark practice (LBMA pre-fix, oil PRAs, Baltic indices, and, decisively, **IOSCO's own follow-up guidance**, which contemplates benchmarks "constructed exclusively on executable quotes").
4. It is the action P7 itself prescribes: *"provided there is disclosure in the Methodology"* (IOSCO FR07/13 follow-up text — see §3).

## 2. The dispositive primary-source text

This proposal hinges on three short passages. They are quoted here so the reviewer can decide on the language alone.

### 2a. IOSCO FR07/13 Principle 7 — full and follow-up

> *"[A benchmark] should be based on prices, rates, indices or values that have been formed by the competitive forces of supply and demand and anchored by observable transactions entered into at arm's length between buyers and sellers in such an active market."* — IOSCO FR07/13, Principle 7 (Data Sufficiency).

And — this is the load-bearing follow-up clause that the previous research note flagged but did not fully quote:

> *"It does not preclude from using executable bids or offers anchored by observable transactions entered into at arm's length between buyers and sellers (observable market)."* — IOSCO FR07/13, Principle 7 commentary.

And — from IOSCO's accompanying guidance on what disclosure is required when this option is taken:

> *"Benchmarks constructed exclusively on executable quotes as contemplated by Principle 7 would not need to explain in each determination why it has been constructed with executable bids or offers, provided there is disclosure in the Methodology … a benchmark that is based exclusively on executable quotes would not need to explain in each determination why it has not used transaction data, provided that it includes the requisite disclosure in its published rules and procedures."* — IOSCO Principles guidance (cf. IOSCOPD549, 2018).

**Reading.** Principle 7 establishes "anchored in an observable market" as the floor, and **explicitly preserves the option** of constructing a benchmark from executable quotes alone — provided the methodology *says so*. CTI's gap is therefore not structural; it is a missing paragraph on `/methodology`.

### 2b. EU BMR Art 11(1) and definitions

> *"[I]nput data shall be transaction data, if available and appropriate. If transaction data is not sufficient or is not appropriate to represent accurately and reliably the market or economic reality that the benchmark is intended to measure, input data which is not transaction data may be used, including estimated prices, quotes and committed quotes, or other values."* — Regulation (EU) 2016/1011, Art 11(1)(c).

> *"'transaction data' means observable prices, rates, indices or values representing transactions between unaffiliated counterparties in an active market subject to competitive supply and demand forces."* — BMR Art 3(1)(14).

> *"'input data' means the data in respect of the value of one or more underlying assets, or prices, including estimated prices, quotes, committed quotes or other values, used by an administrator to determine a benchmark."* — BMR Art 3(1)(15).

> *"[The administrator must] draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement."* — BMR Art 11(3)(d).

**Reading.** BMR enumerates *four* input classes in priority order: (1) transaction data, (2) committed quotes, (3) other quotes, (4) other values / estimates. **A Vast.ai or RunPod listing is firm and executable on click at the quoted price** — substantively a *committed quote* in BMR's taxonomy, not an "estimated price". The disclosure burden in Art 11(3)(d) is satisfied by publishing the priority guidelines on `/methodology` — exactly what §4 of this proposal does.

### 2c. ICE / LIBOR "waterfall of methodologies" — the shape to mirror

> *"[IBA] proposes a 'waterfall of methodologies' made of three levels: (1) transactions; (2) data derived from transactions (including interpolation and extrapolation); (3) expert judgement."* — IBA LIBOR methodology submission.

The waterfall is the standardised shape for a P8 disclosure. CTI's adaptation is structurally identical but reflects two CTI-specific facts that the disclosure should state plainly:

- **Level 1 (transactions)** is presently *unavailable*, not declined. `invoice_observations` schema exists (migration `011_pivot_v2_schema.sql`) and is the future home of this layer.
- **Level 3 (expert judgement)** is *not used at all*. The published value is the output of a deterministic function. There is no discretionary step in the calculation path — a stronger stance than even IBA's waterfall, and one CTI should claim explicitly.

## 3. Honest diagnosis: where CTI sits today

| Question | CTI v1.0 answer |
|---|---|
| Is there a genuine arms-length transactional market underneath? | **Yes.** On-demand GPU rental is a large, real, competitive cash market. Vast.ai, RunPod, Lambda, and the hyperscalers transact GPU-hours continuously at arm's length. |
| Are CTI's inputs transaction data per BMR Art 3(1)(14)? | **No.** Every `price_snapshots` row is a scraped provider offer, not an observed customer trade. |
| Are they at least "committed quotes" per BMR Art 11(1)(c) / Art 3(1)(15)? | **Substantively yes.** A Vast.ai or RunPod listing is executable on click at the quoted price by an unaffiliated counterparty. The provider has *committed* to transact at that price for the duration the listing is published. This is the input class BMR explicitly admits when transaction data is unavailable. |
| Is the benchmark "constructed exclusively on executable quotes as contemplated by Principle 7"? | **Yes.** This is the IOSCO-recognised class CTI falls into. |
| Does CTI use expert judgment in the published-number path? | **No.** The deterministic function `filtered_vwap(rows)` in `packages/shared/src/methodology.ts` has no human input. The Index Committee selects *the formula*; it does not adjust *the numbers*. |
| Is the data-input hierarchy currently published? | **No.** This is the P8 gap this proposal closes. |

**Verdict.** CTI is a published-quote benchmark constructed exclusively on firm executable quotes from a real arms-length cash market, with zero expert judgment in the determination. That position is fully consistent with IOSCO P7 and BMR Art 11 — *once it is disclosed on the methodology page.*

## 4. Proposed change

Two new subsections added to `apps/web/app/methodology/page.tsx`, placed after the existing "Quorum" subsection and before the "Index Committee" section. Word-for-word page text follows; React/JSX wrapping mirrors the existing subsections in that file.

---

### 4a. New subsection: **Input data classification**

> **Input data classification**
>
> CTI is a **published-quote benchmark**. Its inputs are firm, executable on-demand list prices captured directly from provider endpoints — substantively *committed quotes* in the sense of [EU BMR Art 11(1)(c)](https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng) and Art 3(1)(15). Each `price_snapshots` row records the price at which a provider has publicly committed to transact a defined GPU configuration; the listing is executable on click by an unaffiliated counterparty at the quoted price.
>
> On-demand compute does not have a public consolidated transaction tape. Until invoice-class data is admitted as a separate input layer (see *Data-input hierarchy* below), CTI is constructed exclusively on executable quotes. This is the input class explicitly contemplated by [IOSCO Principle 7 (Data Sufficiency)](https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf), which permits a benchmark "constructed exclusively on executable quotes" provided the methodology states so. This subsection is that disclosure.
>
> The benchmark is anchored in a genuine arms-length cash market for GPU-hours. The interest measured is *the prevailing on-demand $/GPU-hour for a given GPU model in a given 24-hour window*. The published value is computed with no expert judgment (see *Hierarchy of data inputs*).

### 4b. New subsection: **Hierarchy of data inputs**

> **Hierarchy of data inputs**
>
> Per [IOSCO Principle 8](https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf) and [EU BMR Art 11(3)(d)](https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng), the priority of use of the different types of input data is published below. The structure follows the established three-level "waterfall of methodologies" shape (cf. ICE LIBOR), adapted for an executable-quote benchmark with no expert-judgment layer.
>
> **Level 1 — Transaction data.** *Not currently used; available capacity reserved.* CTI's schema includes an `invoice_observations` table (`packages/db/migrations/011_pivot_v2_schema.sql`) designed to record anonymised real-paid prices by `(provider, gpu_model, customer_spend_band, contract_type)`. The redaction/ingest pipeline for this table is not yet built; until it is, no Level 1 data flows into any determination. When this layer is admitted, its addition will follow the full Index Committee change-control procedure (30-day public notice, methodology version bump, see *Index Committee* below).
>
> **Level 2 — Executable list prices.** *Sole input class today.* Each `price_snapshots` row is a firm, executable on-demand list price captured by the per-marketplace scrapers from a provider's published endpoint. Records pass through a deterministic ingestion path before becoming eligible for the index:
>
>   1. **Schema validation.** Scraped rows are parsed against a Zod schema. Rows that do not match the contract are rejected, not coerced.
>   2. **GPU-model normalization.** The provider's GPU string is resolved against the catalog: (a) by exact rule, (b) by alias, (c) by fuzzy match. Unresolved strings drain hourly through a Claude 4.6 batch — auto-resolved only at confidence ≥ 0.95, admin-queued at 0.70 – 0.95, dropped below.
>   3. **Outlier classification.** The MAD-3σ filter described above tags each row's `is_outlier` flag, computed per GPU model on the trailing 1 h window.
>   4. **Provider eligibility.** Rows from providers with `reliability_score < 0.5` are excluded.
>   5. **Window selection.** Only rows in the 24-hour pre-determination window `W_t` are eligible.
>   6. **VWAP determination.** The published value is the `num_gpus`-weighted average of the surviving rows.
>
> **Level 3 — Expert judgment.** *Not used.* The published value is the output of a deterministic function (`filtered_vwap` in `packages/shared/src/methodology.ts`). No human adjusts the daily number. The Index Committee determines *the formula*; it does not determine *the values produced by the formula*. If quorum is not met (`|E_t| < 5`), no value is published — there is no fallback, no extrapolation, no expert override.
>
> The full priority order is therefore: **Level 1 (transaction data, when admitted) → Level 2 (executable list prices) → no further fallback**. A determination either meets quorum at Level 2 or is suppressed and an `index_value_skipped` event is recorded.

---

That is the entire proposed page change. No formula edits. No constant edits. No schema edits. No tests modified. No methodology version bump.

## 5. Why this is the right shape (vs. alternatives)

The Index Committee should see at least two alternatives weighed against the chosen design.

**Alternative A — claim unqualified P7 compliance.** Quietly state that CTI satisfies P7 because the underlying market is arms-length. *Rejected:* dishonest and brittle. The first serious external reviewer — a fund counsel, an exchange listing committee, a Big Four benchmark auditor — will press on "show me the transactions". Better to own the input class explicitly.

**Alternative B — defer the disclosure until `invoice_observations` is populated.** Wait until Level 1 data exists, then disclose the hierarchy from a position of having "real" transactions. *Rejected:* (a) blocks every licensee conversation until 2026-Q4 at the earliest; (b) leaves the P0 disclosure gap open the entire time; (c) misreads what P7 actually requires — it requires *disclosure of the input class*, not *transaction-class data*.

**Alternative C — chosen.** Disclose precisely what we are today (a published-quote benchmark with no expert judgment), publish the hierarchy that already exists in code, and reserve Level 1 as a future inclusion that will follow the full committee procedure. This is the LBMA / Baltic Exchange / oil-PRA pattern: *own the input class explicitly, document the controls, leave room to evolve.*

**Why this is docs-only and not a methodology version bump.** The methodology version (`PUBLISHED_METHODOLOGY_VERSION = 'v1.0'`) describes *the computation*: filtered VWAP, 24h window, MAD-3σ filter, ≥ 5 obs, ≥ 0.5 reliability, weighted by `num_gpus`. None of those values change. The page text gains two new subsections that *describe* the input class and hierarchy that have governed the v1.0 computation since day one. This is a disclosure clarification, not a methodology change.

Consequently the 30-day public-notice period — which the page text itself binds only to *formula changes* ("If the committee proposes a change, the new version is published on this page with at least 30 days' notice before taking effect") — does not apply. The proposal still goes through the CODEOWNERS-gated review path; that is the boundary the charter requires.

If the committee disagrees and wants 30-day notice anyway, the cost is small: merge with an "Effective 2026-07-01" banner on the new subsections.

## 6. Empirical impact

**Computation impact: none.** The two locked guards already in the repo are sufficient evidence:

- `apps/workers/src/functions/methodology.test.ts` — the lock test that asserts `PUBLISHED_METHODOLOGY` equals the v1.0 shape and that `filtered_vwap(testRows)` returns a fixed value. This test must continue to pass on the PR. It guarantees the computation is byte-for-byte unchanged.
- `index_values_daily.methodology_version` — every row published since 2026-04-29 carries `methodology_version = 'v1.0'`. No row is recomputed, re-stamped, or relabelled by this proposal.

**Disclosure impact (the actual signal):** the page gains ~450 words across two subsections. Reading-time penalty < 90 s. Information density increases. The disclosure folds two existing P0 gap-matrix rows (P7, P8) from `partial` to `compliant`.

**What "this works" looks like post-merge:**
1. `pnpm -r typecheck` passes (no code touched outside `apps/web/app/methodology/page.tsx`).
2. `pnpm test` passes including `methodology.test.ts`.
3. The rendered `/methodology` page shows two new subsections in their intended position.
4. `docs/research/gaps/iosco-principles.md` rows P7 and P8 are updated to status `compliant` with a link to the merged PR.

**What would say this doesn't work:** an external reviewer (auditor, counsel, exchange) reading the disclosure and pressing further. We would want to know that — it would inform whether Level 1 ingest needs to be accelerated.

## 7. Risks

**Immediate:**
- *Page reflow.* The new subsections push "Index Committee" further down the page. Acceptable — the methodology spec belongs before governance in the reading order.
- *Wording drift between page text and reality.* If the ingestion path described in §4b is ever changed (e.g. a new normalization stage added), the page text must be updated in the same PR. Mitigated by the CODEOWNERS gate on `/methodology` — any future code change to the pipeline will already require a hard-limit review where this text is visible.

**Second-order:**
- *Lock-in.* Once we publish "constructed exclusively on executable quotes" and "no expert judgment", we cannot later silently introduce either without breaking the disclosure. **This is intentional.** That is the lock-in property that makes the index licensable. Future evolution (e.g. admitting `invoice_observations`) goes through the full committee process and produces a new methodology version — exactly as the v1.0 design intended.
- *External misreading.* A reader might infer that CTI claims unqualified IOSCO compliance. The disclosure language explicitly does not — it states the input class and the hierarchy and lets a reader assess. The gap-matrix at `docs/research/gaps/iosco-principles.md` remains the authoritative status document.

**No methodology-class risks** — published numbers are unchanged.

## 8. Migration / rollout plan

This is an infrastructure-class change (docs surface on hard-limit page), not a methodology change. Steps:

1. **PR opened** against `main` from `index-architect/2026-06-01-published-quote-self-classification`. Body cites this proposal and the two primary IOSCO/BMR sources.
2. **CODEOWNERS review** by @CarlosGalindo2807 — required by `.github/CODEOWNERS`'s gate on `/apps/web/app/methodology/`.
3. **`pnpm -r typecheck` + `pnpm test`** must pass on the PR. The methodology lock test is the load-bearing guard.
4. **Merge** when approved. The new subsections become live on `/methodology` on the next deploy.
5. **Post-merge updates** (folded into the same PR):
   - `docs/research/gaps/iosco-principles.md` — rows P7 and P8 moved to status `compliant` with merged-PR link.
   - `docs/decisions.md` — new entry: "Self-classified as published-quote benchmark; data-input hierarchy published on `/methodology`. Closes IOSCO P7/P8 gap-matrix rows. No computation change."
6. **No deploy gating.** Vercel ISR will rebuild `/methodology` within `revalidate = 300` of merge.

**Rollback steps if needed:** revert the PR. Page text reverts to v0; no downstream system is affected because no computation depends on the page text.

**What to monitor in `system_events` after the merge:** nothing. This change adds no new events. Existing `methodology_changed` events would not fire because the methodology version is unchanged.

## 9. Committee deliberation prompt

> *"CTI v1.0 is, in substance, a published-quote benchmark constructed exclusively on firm executable on-demand list prices, with no expert judgment in the determination. IOSCO Principle 7 explicitly contemplates this input class ('It does not preclude from using executable bids or offers anchored by observable transactions') and conditions reliance on it on disclosure in the published methodology. EU BMR Art 11(1)(c) admits committed quotes as input data when transaction data is unavailable. The proposed page edit adds (a) an 'Input data classification' subsection naming the input class, and (b) a 'Hierarchy of data inputs' subsection mirroring the ICE/LIBOR waterfall shape, adapted to our two-level reality (Level 1 transaction data reserved for future inclusion; Level 2 executable quotes is the sole present input; Level 3 expert judgment not used). The published computation is unchanged; the methodology version remains v1.0; the lock test continues to pass. Voted: <yes/no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD."*

## 10. Closing

After merge:
- Mark `docs/research/gaps/iosco-principles.md` rows **P7** and **P8** as `compliant`. Update the revision log entry at the bottom of that file. Move both items out of the P0 queue.
- Add a `docs/decisions.md` entry — *"Published-quote self-classification + data-input hierarchy on /methodology (2026-06-01)"* — describing the disclosure, the IOSCO/BMR basis, and the explicit non-change to computation.
- Link the merged PR in this proposal's footer (below).
- Next-session priority queue advances to P0 item #1 (P3 / P5 — Conflict-of-interest disclosure + single-administrator declaration) or P0 item #2 (P1 — name the founding Committee member, Roadmap B7) — both are half-day docs tasks and both also live on `/methodology`, so a single follow-up proposal can bundle them.

---

## Sources

Primary regulatory texts (direct PDF/HTML fetch returned HTTP 403 from this session's environment — quoted passages reconciled against IOSCO- and ESMA-published search excerpts and against the IOSCO Assessment Methodology IOSCOPD562; passages in quotation marks appeared verbatim in those excerpts):
- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13 (IOSCOPD415), July 2013. <https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf>
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, IOSCOPD549, January 2018. <https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf>
- IOSCO, *Methodology for Assessing Implementation of the IOSCO Principles for Financial Benchmarks*, IOSCOPD562. <https://www.iosco.org/library/pubdocs/pdf/IOSCOPD562.pdf>
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Articles 3, 11. EUR-Lex CELEX 32016R1011. <https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng>
- ESMA Interactive Single Rulebook — BMR Art 11 (Input data). <https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data>

Comparable-benchmark disclosures consulted for shape:
- New York Fed, *Statement of Compliance with the IOSCO Principles for Financial Benchmarks*, July 2025 (SOFR family). <https://www.newyorkfed.org/medialibrary/media/markets/IOSCO-statement-of-compliance-jul2025>
- ICE Benchmark Administration — LIBOR "waterfall of methodologies" (transactions → derived data → expert judgment).
- MSCI, *IOSCO Principles for Financial Benchmarks* (statement of compliance hub). <https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco>
- MSCI, *Index Calculation Methodology*, Feb 2025. <https://www.msci.com/indexes/documents/methodology/0_MSCI_Index_Calculation_Methodology_20240812.pdf>
- CME Group, *CME Term SOFR Reference Rates Benchmarks IOSCO Compliance Statement*. <https://www.cmegroup.com/market-data/files/cme-term-sofr-reference-rates-benchmarks.pdf>

Internal references:
- `apps/web/app/methodology/page.tsx` — target of the page edit.
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` (unchanged by this proposal).
- `apps/workers/src/functions/methodology.test.ts` — the lock test (continues to pass).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` schema (the future Level 1 layer).
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — initial IOSCO mapping.
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — Track-A/B/C analysis this proposal lands Track A of.
- `docs/research/gaps/iosco-principles.md` — gap-matrix rows P7 (status: partial / structurally weak → compliant after merge) and P8 (status: partial → compliant after merge).

---

**Merged PR:** *(filled in after merge)*
