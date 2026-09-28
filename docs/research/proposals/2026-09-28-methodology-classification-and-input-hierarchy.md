# Proposal: classify CTI as a *published-quote benchmark* and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-09-28 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (published surface) — touches a hard-limit file (`/methodology`), does **not** touch `PUBLISHED_METHODOLOGY` or any calculation code |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit). No change to `packages/shared/src/methodology.ts`, `packages/db/migrations/*`, `apps/workers/src/functions/index-calculator.ts`, `apps/workers/src/functions/outlier-detector.ts`, or `apps/workers/src/functions/methodology.test.ts`. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member; hard-limit CODEOWNER). |
| **Effective date if approved** | 2026-10-28 (30 days after intended merge date of 2026-09-28, per the Committee charter's Step 3 public-notice period). If the merge date slips, the effective date slides by the same amount. |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency); IOSCO FR07/13 Principle 8 (Hierarchy of Data Inputs); IOSCO FR03/18 (IOSCOPD549) Guidance; EU BMR Regulation (EU) 2016/1011 Article 11(1)(a)–(c) and 11(3)(d); ICE/LBMA Precious Metals Methodology (auction fix contrast case); Baltic Exchange *Guide to Market Benchmarks* v8.3 (assessment/panel benchmark precedent); IOSCOPD364 *Oil Price Reporting Agencies* (MOC/bid-offer precedent). |

---

## Problem

The published `/methodology` page describes *how* the CTI value is computed (formula, outlier filter, quorum, eligibility floor) but is silent on **what class of benchmark this is** and **how its inputs relate to the observable transaction market**. Two IOSCO/BMR gaps sit exactly under that silence:

- **P7 · Data sufficiency.** IOSCO FR07/13 Principle 7 requires benchmark data to be *"anchored by observable transactions entered into at arm's length"* between buyers and sellers, and IOSCO's Guidance clarifies that *proportionality does not relax the transaction-anchoring requirement.* Every CTI input today is a scraped **listing** (an ask), not an observed trade. Absent a stated classification, a serious reviewer can reasonably press on P7. See gap matrix row P7 (status `partial / structurally weak`) and the full analysis in [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md).

- **P8 · Hierarchy of data inputs.** IOSCO FR07/13 Principle 8 requires published guidelines on the hierarchy of data inputs and on any use of expert judgment; EU BMR Art 11(3)(d) codifies the same requirement. CTI's hierarchy exists in code (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP) but is **not published**. See gap matrix row P8 (`partial`).

Both gaps close with the same edit to the same page. The prior research note already mapped this as the highest-leverage single next deliverable ("Track A", P0). This proposal is the docs-format doc that step 2 of the queue calls for.

The proposal deliberately **does not** change any published number, formula, parameter, or calculation path. `PUBLISHED_METHODOLOGY` in `packages/shared/src/methodology.ts` is unchanged. The methodology lock test at `apps/workers/src/functions/methodology.test.ts` remains untouched. What changes is the *disclosure surface* — how CTI describes itself to auditors, licensees, and regulators.

## Proposed change

Add two new sections to `apps/web/app/methodology/page.tsx`, inserted between the current "Formula" section and the current "Index Committee" section, in the order below.

### New section 1 — "Benchmark classification"

Rendered before "Index Committee". Content (final wording is proposed here for the Committee; adjust prose but preserve the four defining assertions):

> **Benchmark classification.** CTI is a **published-quote benchmark**. Its inputs are firm, executable on-demand list prices captured directly from provider price endpoints. On-demand GPU compute has no public consolidated transaction tape, and CTI does not source, weight, or filter individual customer invoices in the published number. Under EU BMR Art 11(1)(c), transaction data is preferred where available and appropriate; where transaction data is not sufficient or appropriate, *"input data which is not transaction data may be used, including estimated prices, quotes and committed quotes, or other values"*. CTI's inputs are of the *committed-quote* class: at capture time each listed price is executable at click by any counterparty.
>
> The benchmark is anchored in a genuine arms-length cash market for GPU-hours (Vast.ai, RunPod, Lambda Labs, and the hyperscalers transact GPU-hours continuously at arm's length). The published number is computed with no expert judgment: every step is deterministic, versioned, and reproducible from the open-source formula.
>
> CTI does not currently claim unqualified IOSCO Principle 7 compliance. The transaction-anchor track (`invoice_observations`, migration 011) is designed but not yet ingesting; on standing that pipeline up, the Index Committee will publish a periodic reconciliation of the published quote benchmark against observed effective transaction prices. See [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](https://github.com/CarlosGalindo2807/compute-terminal/blob/main/docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md) for the full defensibility analysis and the precedents (Baltic Exchange assessment indices, oil PRAs' Market-on-Close, LBMA Gold auction fix, MSCI/IPD appraisal-based real estate).

### New section 2 — "Hierarchy of data inputs"

Rendered immediately after "Benchmark classification". Content:

> **Hierarchy of data inputs.** Every published index value is derived from inputs in the strict priority order below. Higher-tier data displaces lower-tier data; expert judgment has no priority tier because it does not enter the published-number path.
>
> | Tier | Class | Status today | Rule |
> |---|---|---|---|
> | 1 | **Observed transactions.** Anonymised customer invoices — real prices paid — via the `invoice_observations` table. | *Schema landed (migration 011). Ingest pipeline not built. Empty today.* | Future methodology version may weight these above listings. Not in v1.0. |
> | 2 | **Committed quotes.** Provider-published on-demand list prices, executable at capture time. | **This is what v1.0 uses.** | Ingested via provider scrapers; schema-validated (Zod); catalogued via normalization rules and, for unmatched strings, Claude Sonnet 4.6 at confidence ≥ 0.95 (auto) or 0.70–0.95 (queued for human approval). |
> | 3 | **Indicative quotes / estimated prices.** | *Not ingested.* | Not admitted to the published number in v1.0. |
> | 4 | **Adjustments and expert judgment.** | *Not applicable.* | Zero expert judgment is used in the published-number path. Human review at `/admin/unmatched` operates upstream of eligibility, on catalog membership only, not on price. |
> | 5 | **Missing data / fallback.** | *Not used.* | If quorum (`|E_t| ≥ 5`) is not met, no value is published for that day. CTI never extrapolates, never carries forward, and never falls back to a different formula. |
>
> **Deterministic ingestion pipeline for Tier 2 inputs** (the only tier used in v1.0):
>
> 1. **Capture.** Per-provider scraper writes a raw offer row.
> 2. **Schema validate.** Zod parser drops malformed rows (they never enter `price_snapshots`).
> 3. **Normalize GPU model.**
>    a. Deterministic rule / alias match against the catalog.
>    b. Fuzzy match against known aliases.
>    c. Unmatched → Claude Sonnet 4.6 batch (hourly). Confidence ≥ 0.95 → auto-resolve; 0.70–0.95 → admin queue at `/admin/unmatched`; < 0.70 → dropped.
> 4. **Store.** Row written to `price_snapshots` with `provider_reliability_score` snapshotted at write time.
> 5. **Outlier check.** MAD-3σ filter (see Outlier filter section) writes `is_outlier` flag.
> 6. **Eligibility check.** `reliability_score ≥ 0.5` AND `is_outlier = false` AND `gpu_model ∈ I.universe` AND observation in the 24h window.
> 7. **VWAP.** `Σ(p · q) / Σ q` over the eligible set, weighted by `num_gpus`. If `|E_t| < 5`, no value published.
>
> No stage in this pipeline exercises expert judgment on the price value itself. The single human touch-point (`/admin/unmatched`) governs *catalog membership*, not price weighting.

### Copy-edit changes elsewhere on the page

- The current sentence *"No model picks the formula — humans do, on a scheduled cadence, against documented criteria."* is preserved verbatim.
- Add a one-line pointer at the top of the "Formula" section: *"See "Benchmark classification" below for the input class this formula is applied to."*
- Add a P14 / P19 non-applicability footer paragraph (queued in the gap matrix as separate P1 items — bundle if cheap): *"CTI has no Submitters in the LIBOR sense (inputs are scraped from provider endpoints, not submitted); IOSCO Principle 14 is not applicable. CTI is not currently an ESMA-registered or FCA-supervised benchmark; IOSCO Principle 19 is not applicable at v1.0 and will apply on any future registration."* — **optional; the Committee may split this into its own edit to keep the primary proposal focused.**

### What is NOT changing

- No change to `PUBLISHED_METHODOLOGY` — formula, `windowHours`, `minObservations`, `outlierFilter`, `weight`, or `reliabilityFloor`.
- No change to `apps/workers/src/functions/index-calculator.ts` or `outlier-detector.ts`.
- No change to `apps/workers/src/functions/methodology.test.ts`. (The lock test does not read the page's prose.)
- No new database migration; no change to `methodology_versions`, `methodology_changes`, `index_values_daily`.
- No change to any historical index value. Every prior `index_values_daily` row remains version-stamped at v1.0 and reproducible from the same locked formula.

## Why this is the right shape (vs. alternatives)

Three alternatives were weighed:

**Alternative A — Do nothing / carry the gap.** Rejected. The listings-vs-transactions exposure is the single highest-priority IOSCO gap in the matrix (P0). Leaving `/methodology` silent means the first serious licensee or auditor conversation exposes it as an *undisclosed* weakness rather than a *documented design choice*. LBMA and the Baltic Exchange both demonstrate that a benchmark of a tape-less market can be defensible when the administrator states its input class precisely; being silent is strictly worse than being classified.

**Alternative B — Claim unqualified IOSCO Principle 7 compliance and describe inputs as "transaction-anchored" via the executable-quote argument.** Rejected. IOSCO's Guidance is explicit that proportionality does not relax P7. Claiming P7 compliance without a real transaction layer would (i) overclaim in a way an ESMA/FCA reviewer would immediately reject and (ii) burn credibility in the way LIBOR-era submissions did. The Committee's stated posture ("we would rather be under-claimed and defensible than over-claimed and challenged") points at self-classification, not aspiration.

**Alternative C — Ship the classification page *and* stand up the `invoice_observations` ingest pipeline in the same PR.** Rejected as scope-inflated. The ingest pipeline is a real infrastructure workstream (variable 8 in `docs/decisions.md`, "Pivot to Bloomberg for buyers"), with its own redaction, consent, and reconciliation surfaces. Bundling the two makes this proposal un-mergeable in one committee cycle. The right ordering is: self-classify now (documents the current honest state), then stand up the ingest pipeline as its own PR series, then publish the reconciliation report as a *separate* future proposal.

**Chosen shape** — Track A alone: docs-only edit to `/methodology` that self-classifies as a published-quote benchmark and publishes the data-input hierarchy in one edit. Closes P7 and P8 (both P0 in the gap matrix) simultaneously. Reversible if the Committee later approves a methodology change that admits invoice observations to the hierarchy — the classification text becomes a *versioned statement* about v1.x that would be updated in the same proposal that shipped the numerical change.

## Empirical impact

**No numerical impact.** Since `PUBLISHED_METHODOLOGY` is unchanged, the value written to every `index_values_daily.vwap` row on and after the effective date is identical to what would have been written without this proposal. The methodology lock test at `apps/workers/src/functions/methodology.test.ts` continues to pass without modification. No backtest is required by the proposal template's "For methodology changes — REQUIRED" section because there is no methodology change in the calculation-path sense.

**Signal that the change did what it should have done:**
- After the effective date, `/methodology` renders the two new sections without layout regression on desktop and mobile viewports. (Verify manually + snapshot the rendered page for the audit archive.)
- The `PUBLISHED_METHODOLOGY_VERSION` constant remains `v1.0`; the version history table on `/methodology` gains no new row (this is a disclosure change, not a methodology version bump).
- Gap matrix rows P7 and P8 are updated: `partial → partial (Track A complete)` for P7, `partial → compliant` for P8, with the merged PR linked from both rows and from the priority queue.

**Signal that a reviewer would call this out as inadequate** (to be adversarially checked before merge):
- Any implication in the new prose that CTI *does* claim P7 compliance. The classification section must explicitly say we do not. (First read of the proposed prose: it says so once explicitly; the Committee should verify the wording holds.)
- Any implication that expert judgment enters the published-number path. The pipeline table must place expert judgment in Tier 4 with status "Not applicable" and explain the `/admin/unmatched` scope precisely.
- Any drift between the tier-2 pipeline steps as documented and as implemented. Cross-checked against `apps/workers/src/functions/index-calculator.ts` and the normalization pipeline; the seven-step description matches the code paths as of this commit.

## Risks

**Immediate (this PR):**
- *Prose-only regression:* Committee approves wording that a future licensee reads differently than intended. Mitigation: two-week silent-notice window (the Committee can revise the wording before the 30-day public-notice clock starts, per the charter's emergency-change carve-out).
- *Cross-link rot:* The new sections link to two research notes and to `invoice_observations` (migration 011). If either is renamed or removed, the classification page falls out of sync. Mitigation: the research notes are date-stamped and immutable by convention; migration 011 is immutable by construction (`_migrations` rows never rewrite).
- *Snapshot / visual regression on `/methodology`:* Two new sections push the version-history table down. No functional regression expected. Mitigation: manually verify after merge.

**Second-order (audit and licensee posture):**
- *Auditor reads "we do not claim P7 compliance" as "the benchmark is non-compliant with IOSCO":* This is a real risk in short-attention reviews. Mitigation: the classification section pairs the self-classification with the BMR Art 11(1)(c) treatment of committed quotes and the peer-benchmark precedent — the reader who cares will see the position is precisely stated, not weak.
- *Licensee counsel treats the self-classification as an admission that limits their downstream use of the number:* Real, but the alternative (silent claim, no classification) is strictly worse for the licensee because it moves the P7 risk from the administrator (us) onto them (they inherit an undisclosed exposure). Under IOSCO practice, precise disclosure protects the licensee, not the reverse.
- *Reduces flexibility to reclassify later:* Adopting "published-quote benchmark" as the v1.0 identity means a future move to "transaction-anchored" is a versioned re-classification, not a stealth upgrade. This is a feature: it forces the transition through the same 30-day notice discipline that protects every other user-visible change.
- *Narrows legal defensibility of the v1.0 lock:* The reverse — the classification *strengthens* the lock by explicitly stating what v1.0 is (and, by implication, what it isn't). A future methodology change that admits invoice data becomes a clean v1.x bump with a stated hierarchy delta.

**Rejected non-risks:**
- *"Committee approval of a text-only change is a rubber-stamp."* — Rejected. The classification is the load-bearing sentence in every future licensee contract that names v1.0. It gets committee approval on principle.

## Migration / rollout plan

This is docs-surface work, not a calculation-path methodology change. It still follows the Committee charter's 30-day public-notice procedure because the `/methodology` page **is** the public benchmark contract and CTI's charter does not distinguish "docs-only" changes to that contract from "numerical" changes.

1. **Merge date (target 2026-09-28, or later if PR review pushes it):** PR merges to `main`. The page now renders the new sections with a top-of-section banner *"Effective 2026-10-28 · 30-day public notice period · Committee approval @CarlosGalindo2807 on YYYY-MM-DD."* until the effective date. (The banner is an explicit UI element the Committee can invite feedback via; it also matches the roadmap B8 notice-surface pattern for future changes.)
2. **Notice period (merge date → merge date + 30 days):** The Committee accepts written comment via the complaints-procedure email (gap matrix row P16, itself a P0 item; this proposal does not depend on that email being live but flags it as a coincident P0). If any comment materially challenges the classification, the Committee documents the response and either revises before the effective date or defers.
3. **Effective date (target 2026-10-28):** The banner is removed. A row is added to the Committee minutes (`docs/committee-minutes/` — creation is P18, itself a P1 item; the first entry may as well be this proposal's approval). No row is added to `methodology_versions` because no version bumps.
4. **Rollback:** git revert of the merge commit. Since no data change, no numeric side-effects; rollback restores the prior page in one push. Rollback within the notice period would itself require Committee sign-off to avoid unfairly-short-notice churn on licensees who have already been quoted the new classification.
5. **Monitoring after merge:** Verify page renders without regression on the /methodology route. No `system_events` alerting is required (no calculation-path change).
6. **Gap matrix update (post-merge):** Update `docs/research/gaps/iosco-principles.md` — P7 row status stays `partial` but sub-notes "Track A complete"; P8 row status flips to `compliant` and the priority-queue P0 item 4 is marked done. Update `docs/decisions.md` with a locked-in-decision entry: "CTI v1.0 is classified as a published-quote benchmark. Reclassification requires a new methodology version + 30-day notice."

## Committee deliberation prompt (methodology only)

Copy-pasted verbatim into the Committee's decision record on approval:

> We are formally classifying CTI v1.0 as a **published-quote benchmark** rather than a transaction-anchored benchmark. Every input in the published-number path today is a firm, executable on-demand list price captured directly from a provider endpoint; no customer-invoice data currently enters the calculation. The classification places CTI's inputs in the *committed-quote* class of EU BMR Art 11(1)(c). We are simultaneously publishing the data-input hierarchy required by IOSCO Principle 8 / BMR Art 11(3)(d): five tiers (transactions → committed quotes → indicative quotes → adjustments → missing data), with v1.0 using tier 2 exclusively and zero expert judgment in the published-number path.
>
> This is a *disclosure* change, not a numerical change: no `index_values_daily` value moves, no `PUBLISHED_METHODOLOGY` field changes, and the methodology lock test is untouched.
>
> The trade-off we are making: we accept that the classification explicitly does not claim unqualified IOSCO Principle 7 compliance, in exchange for a precise, defensible, LBMA/Baltic-Exchange-style statement of what CTI is. We prefer under-claimed and defensible over over-claimed and challenged. A future methodology version that admits `invoice_observations` will be a clean v1.x bump with a stated hierarchy delta.
>
> Voted: <yes/no>, Carlos Galindo Dumitrescu (sole founding committee member), on YYYY-MM-DD.

## Closing

After this proposal is approved (PR merged):
1. Mark `docs/research/gaps/iosco-principles.md` row P7 sub-note "Track A complete"; flip row P8 to `compliant`; strike priority-queue P0 item 4 as done; increment the revision-log date to the merge date.
2. Add a decision entry to `docs/decisions.md`: "CTI v1.0 classified as *published-quote benchmark* (2026-09-28 proposal, merged YYYY-MM-DD). Reclassification requires new methodology version + 30-day notice."
3. Link the merged PR in this proposal's footer.
4. Queue the next session's follow-ups from the priority-queue P0 stack: P3/P5 (COI + single-administrator declaration), P1 (name the founding committee member — one-line UPDATE, roadmap B7), P16 (complaints email + SLA). Each is a half-day docs task; the three together plus this proposal completely clear the P0 stack.

---

## Sources

*Cited during research; direct WebFetch of PDFs and EUR-Lex remains blocked from this session's environment. Quoted passages are from search-result excerpts of the primary documents; the prior note [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) records the same source-fetch note. A future session with PDF egress should reconcile the exact wording against the primary text.*

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13 (IOSCOPD415), July 2013. Principle 7 (Data Sufficiency) — *"anchored by observable transactions entered into at arm's length between buyers and sellers"*; and the guidance clarification that the principle *"does not mean that individual benchmark determinations must be constructed solely or even predominantly by transactions or that data must be used in a certain order."* https://www.iosco.org/library/pubdocs/pdf/IOSCOPD415.pdf (SEC-hosted mirror: https://www.sec.gov/files/spotlight/fixed-income-advisory-committee/fimsac-110419-background-iosco.pdf).
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, IOSCOPD549, January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, IOSCOPD364, October 2012 (Market-on-Close bid/offer/transaction blending precedent). https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input Data). Art 11(1)(c): *"the input data shall be transaction data, if available and appropriate … if transaction data is not sufficient or appropriate, input data which is not transaction data may be used, including estimated prices, quotes and committed quotes, or other values"*; Art 11(3)(d) on publishing the hierarchy of input types. EUR-Lex CELEX 32016R1011. https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng ; ESMA Interactive Single Rulebook Art. 11 https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data
- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026 (assessment/panel benchmark precedent). https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf
- ICE Benchmark Administration / LBMA, *LBMA Gold Price FAQs* (auction fix contrast case — the "generate the transaction" pattern). https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price ; ICE *Precious Metals Methodology*. https://www.ice.com/iba/lbma-precious-metals
- MSCI, *IOSCO Principles for Financial Benchmarks* (statement-of-compliance hub, for comparable-administrator shape). https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco

Internal references (all in-repo):
- `apps/web/app/methodology/page.tsx` — the surface being edited (hard-limit).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant (hard-limit; **not** changed by this proposal).
- `apps/workers/src/functions/methodology.test.ts` — methodology lock test (hard-limit; **not** changed).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` schema (the latent transaction layer referenced in the classification).
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — IOSCO map v0 (P7 flagged as "single most important methodological exposure").
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — the analysis this proposal implements Track A of.
- `docs/research/gaps/iosco-principles.md` — running gap matrix; rows P7 and P8; priority-queue P0 item 4.
- `docs/decisions.md` — "Five-methodology A/B → Locked methodology v1.0" entry (the source of the "committee approves methodology changes with 30-day notice" doctrine this proposal extends to disclosure changes).
- `docs/roadmap.md` — item B8 (notice page for proposed changes; this proposal's rollout is the first live use of that pattern).

Merged PR (populated on approval): _pending_.
