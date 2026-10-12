# Proposal: Self-classify CTI as a *published-quote benchmark* and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-10-12 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (hard-limit page — `apps/web/app/methodology/page.tsx`) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (prose only, new subsection) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member) |
| **Effective date if approved** | On merge (see §7 for the Committee's option to invoke the 30-day notice path instead) |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs); EU BMR Reg. (EU) 2016/1011 Art. 11(1)(c) and Art. 11(3)(d); gap-matrix rows P7, P8, P12; prior note [`2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) |

---

## 1. Problem

The gap matrix flags two of the five quality-pillar IOSCO principles as `partial` with a specific documentation defect:

- **P7 (Data Sufficiency) — `partial / structurally weak`.** CTI's inputs are scraped *listings*, not observed trades. The prior note established that these are substantively **firm executable quotes** (closer to BMR Art. 11(1)(c)'s "committed quotes" than to indicative LIBOR-style submissions) and that the published number is anchored in a genuine arms-length cash market for on-demand GPU-hours. But `/methodology` does **not say so**. A serious reviewer reading the page today cannot tell whether CTI is a trade-tape benchmark (it is not), an estimate-based assessment (it is not), or something else. The ambiguity is unforced.
- **P8 (Hierarchy of Data Inputs) — `partial`.** The ingestion hierarchy exists deterministically in code (scrape → rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier filter → eligibility floor → VWAP) with **zero expert judgment** in the published-number path. BMR Art. 11(3)(d) requires administrators to "draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement." The hierarchy is defensible; it is just not published.

Both gaps resolve as **one edit to one page**, which is why the prior note recommended them as the single next deliverable. A third gap-matrix row — **P12 (Changes to the methodology)**, status `compliant in design, untested` — benefits incidentally: this proposal is the first end-to-end exercise of the change-control procedure, so a successful merge converts P12 from "untested" to "exercised" without the risk of a formula change.

Related, but **explicitly out of scope** here (deferred to future proposals, in priority order): Track B of the prior note (invoice-observation ingest + list-price-vs-observed-effective-price reconciliation report, infra-class, P1); Track C (provider-count-scaled quorum, methodology-class, P1); the P3 conflict-of-interest disclosure (separate `/methodology` edit, P0); the P16 complaints procedure (separate `/methodology` edit, P0).

## 2. Proposed change

Add one new subsection to the published `/methodology` page, titled **"Data inputs"**, between the opening paragraph (ending "…against documented criteria.") and the existing **"Formula"** section. The exact text and placement follow. No other change to the page. No change to `packages/shared/src/methodology.ts`, `PUBLISHED_METHODOLOGY`, `PUBLISHED_METHODOLOGY_VERSION`, `index-calculator.ts`, `outlier-detector.ts`, the lock test, or any migration. The computation that writes `index_values_daily.vwap` is **byte-identical** before and after this change.

### 2.1 Exact text to add to `/methodology`

> **Data inputs**
>
> **Classification.** CTI is a *published-quote benchmark*. Each row that enters the index calculation is a provider's own executable list price for a specified GPU configuration, captured mechanically from a public provider endpoint. We do **not** solicit or accept submissions. We do **not** publish an estimated or assessed price. We publish a volume-weighted average of firm executable quotes.
>
> **Economic reality.** The interest CTI measures — the prevailing on-demand $/GPU-hour for a given GPU model, over a 24-hour window — is traded continuously at arm's length on Vast.ai, RunPod, Lambda and comparable marketplaces. On-demand compute does not have a public consolidated transaction tape; no central venue publishes every GPU-hour transacted. The published-quote formulation represents that market faithfully because the quotes are themselves executable: a user can click any listed row and pay the quoted price for the configuration shown.
>
> **Hierarchy of inputs.** Where multiple input classes are available for the same observation, the deterministic order of preference is:
>
> 1. *Observed transactions.* Not currently available; on-demand compute lacks a public consolidated tape. If an anonymised real-paid-price source is stood up (see roadmap), observed transactions enter at the top of this hierarchy. The destination table `invoice_observations` exists and is empty today.
> 2. *Firm executable quotes* — the current CTI input class. Captured directly from provider endpoints; schema-validated against a strict Zod contract; discarded if the row does not match the contract.
> 3. *Indicative or estimated quotes.* Not used. CTI contains no estimated or interpolated prices.
> 4. *Expert judgment.* Not used in the published-number path. Human review exists only for GPU-string normalisation at confidence 0.70–0.95 (admin queue at `/admin/unmatched`); it never adjusts, re-weights, or substitutes a price.
>
> **Processing pipeline (deterministic).** Each firm executable quote flows through: schema validation (Zod) → normalisation (rule → alias → fuzzy → Claude self-learning catalogue, auto at confidence ≥ 0.95, admin-queued at 0.70–0.95, dropped below 0.70) → outlier flag (MAD-3σ per GPU model, 1h window) → eligibility check (`reliability_score ≥ 0.5`) → inclusion in the 24h VWAP. Each stage is codified in open-source files whose paths are listed at the foot of this page. No stage uses expert judgment on the published value.
>
> **Why this classification.** EU BMR Art. 11(1) requires transaction data where available and appropriate, and permits "committed quotes" where transaction data is unavailable or inappropriate; it further requires the administrator to publish the input-data hierarchy. IOSCO Principle 7 permits a benchmark to be built on quotes rather than trades when the benchmark is anchored in a genuine arms-length market and the limitation is disclosed. CTI meets both conditions. Published-quote benchmarks are not uncommon: assessment panels (Baltic Exchange freight indices), market-on-close agencies (Platts, Argus), and auction fixes (LBMA Gold/Silver) each resolve the same "no public tape" problem differently; CTI's resolution is to publish a volume-weighted average of firm executable quotes with no expert judgment on the published number.
>
> *Amended 2026-10-12. Index Committee resolution recorded in `methodology_changes` as a disclosure amendment. The computation that produces each `index_values_daily` row is unchanged by this amendment; the published value under methodology `v1.0` remains byte-identical before and after.*

### 2.2 What does NOT change

- `PUBLISHED_METHODOLOGY_VERSION` remains `v1.0`.
- `PUBLISHED_METHODOLOGY` constant remains byte-identical.
- `apps/workers/src/functions/methodology.test.ts` lock test continues to assert the current fingerprint. **No test is modified.**
- `index_values_daily` row-production is byte-identical. No historical row is rewritten. No row is suppressed or re-emitted.
- No row is added to `methodology_versions`. (Versions track *computation* identity.)
- One row is added to `methodology_changes` with `change_type = 'disclosure_amendment'` and `effective_from = <merge date>` — see §6.

## 3. Why this shape (vs. alternatives)

### 3a. Alternative: no change / defer

**Rejected.** The gap matrix lists P7 as the index's "single most important methodological exposure" (prior note §2). The disclosure is cheap, the authorities are explicit (BMR Art. 11(3)(d) is a *shall*), and every quarter without it leaves a hidden weakness that is best disclosed by the administrator before a licensee or auditor presses on it. The lesson from Baltic Exchange, LBMA, and the oil PRAs is the same: own the limitation on the methodology page; do not force the reader to discover it.

### 3b. Alternative: version bump to `v1.0.1` with full 30-day notice

**Not recommended, but offered to the Committee in §7.** A disclosure that does not change the published number does not, in letter or in spirit, satisfy the Committee charter's definition of a "formula change" (the charter's Step 2 explicitly scopes the quarterly review to "a non-published candidate beat[ing] the published one on a pre-registered composite score"). The 30-day notice period's purpose is to give licensees time to understand a different *number* before it hits their contract; a prose clarification of what the current number is does not meet that condition. Still, running this edit through the full procedure anyway would serve as the P12 dry-run called for in the gap matrix. Trade-off: that dry-run value against the signalling cost of implying by action that the computation is changing when it is not. The recommended path (§3c) captures most of the P12 benefit without the misleading signal.

### 3c. Alternative (recommended): disclosure amendment, immediate effective date, Committee minute

**Chosen.** On merge:

1. The /methodology page carries the new "Data inputs" subsection and the "Amended 2026-10-12" marker.
2. A row is added to `methodology_changes` with `change_type = 'disclosure_amendment'`, `effective_from = <merge date>`, `effective_to = NULL`, and `rationale` referencing this proposal's PR URL.
3. A short Committee minute is committed to `docs/committee-minutes/2026-10-12-disclosure-amendment-p7-p8.md` (bootstrapping the directory that gap-matrix row P18 calls for).
4. The P12 "procedure is unproven" state closes by exercising every step *that applies to a disclosure amendment*: proposal → Committee review → merge → `methodology_changes` row → public /methodology surface. The one step not exercised — the 30-day pre-effective-date window — is specifically for formula changes and is not applicable here. A future `v1.x` formula change exercises it then.

This shape also opens the `docs/committee-minutes/` directory, closing gap-matrix P18's "commit-on-decision discipline" sub-item in the same PR.

### 3d. Alternative: shorter prose

**Rejected.** The disclosure needs to carry three distinct ideas (classification, economic reality, hierarchy) and name the regulatory authorities that validate the shape. Any shorter and an auditor who has read BMR Art. 11 cannot verify the mapping. Any longer and licensee-side readers skim past it. The ~470-word subsection is tuned to the former audience; the latter audience is served by the headline sentence of each paragraph.

### 3e. Alternative: a separate dedicated page (e.g. `/methodology/inputs`)

**Rejected.** IOSCO Principle 11 (Content of the methodology) and BMR Art. 13 require a single discoverable surface for the methodology. Fragmenting it across multiple pages serves no reader. The in-page subsection is the LBMA/Baltic pattern.

## 4. Empirical impact

For a docs-class change where the published number does not change, the empirical signal is *everything that should stay the same, stays the same*. Three invariants:

1. **Methodology lock test passes.** `apps/workers/src/functions/methodology.test.ts` asserts the fingerprint of `PUBLISHED_METHODOLOGY`. Running `pnpm test` after this edit returns the same green state as before; no bytes of the constant change.
2. **`PUBLISHED_METHODOLOGY_VERSION` is unchanged.** Still `v1.0`. The version field on `index_values_daily` rows produced today and tomorrow is byte-identical.
3. **No row of `index_values_daily` is recomputed.** This proposal defines no backfill, no re-run of the calculator, no `recompute` worker. Published history is immutable per gap-matrix row P17.

A secondary check — does the new prose misstate anything about the pipeline today? The hierarchy as written matches the code paths in `apps/workers/src/functions/normalize-unmatched.ts` (0.95 auto / 0.70–0.95 queue thresholds), `apps/workers/src/functions/outlier-detector.ts` (MAD-3σ, 1h window), the Zod validation in each scraper's parser module, and the eligibility floor in `index-calculator.ts`. Any reader could grep the repo and verify each stage is where this text claims it is.

## 5. Risks

**Immediate (near-zero).** No code path is touched. No test is modified. No DB schema is migrated. The methodology-lock test (`methodology.test.ts`) is specifically designed to flag silent drift and will remain green because no drift exists.

**Second-order (small, non-zero).** Four to weigh:

1. *Licensee confusion.* A reader who sees "amended" on the /methodology page may assume the number is changing. Mitigated by the explicit "the published value under methodology v1.0 remains byte-identical" line in the amendment stamp.
2. *Hostage to the hierarchy.* Publishing the hierarchy constrains the administrator against informal exceptions. This is a feature, not a bug — but a future contested row that currently gets dropped silently (e.g. a scraper that occasionally returns prices in cents when the schema expects dollars) is now a transparent "schema validation drops the row" event, auditable by a licensee. There is no mitigation needed; this is the intent.
3. *Transaction-data commitment.* The hierarchy promises that observed transactions, if available, enter at the top. If the invoice-observations pipeline (Track B) stands up and the Committee opts to use it only as a *validation* anchor (not an *input* anchor) — the prior note's recommendation — the subsection as written stays accurate because validation is not input-class usage; the row simply remains at "not currently available for inclusion as input class 1." But if the Committee later decides to admit invoice observations as a weighted input class in a future `v1.x`, the subsection must be amended at that time. Flag only; this is a well-signalled future event, not a trap.
4. *Prompt-injection on fetched docs.* All external text used to inform this proposal (BMR articles, IOSCO principles, comparable methodology PDFs) is treated as data, never as instructions, per the charter.

**No regulator risk.** CTI is not yet an ESMA-registered benchmark; publishing a BMR-shaped disclosure voluntarily does not create a registration obligation. P19 (Cooperation with regulatory authorities) remains `n/a` until registration.

## 6. Migration / rollout plan

Docs/governance class — the full plan fits one subsection.

**Pre-merge.**
- Human reviewer: @CarlosGalindo2807 as sole founding Index Committee member.
- Automated gate: CODEOWNERS requires @CarlosGalindo2807 approval on `apps/web/app/methodology/page.tsx`. The PR will not merge without it.
- Automated gate: `pnpm -r typecheck` must pass. (No TS changes expected; the page is a React server component with inline strings — Next build will validate it.)
- Automated gate: `pnpm test` must pass. The methodology lock test runs; it must remain green.

**At merge.**
- One commit adds the "Data inputs" subsection to `apps/web/app/methodology/page.tsx` between the opening paragraph and the "Formula" section, with the exact text in §2.1.
- One commit (or the same commit) adds `docs/committee-minutes/2026-10-12-disclosure-amendment-p7-p8.md` recording Carlos Galindo Dumitrescu's sign-off, bootstrapping that directory per gap-matrix P18.
- One `methodology_changes` row insertion via a short SQL statement in `scripts/record-disclosure-amendment-2026-10-12.sql` (run manually by @CarlosGalindo2807 against Supabase after merge; this file is a template, not an auto-executed migration — the hard-limit list includes migrations touching `methodology_versions` or `methodology_changes`, so a human runs this statement).

**Post-merge.**
- Gap-matrix rows updated: P7 → `partial / documented` with pointer to this proposal; P8 → `compliant` once the PR merges and the page re-renders; P12 → `exercised (disclosure-amendment path); formula-change path still untested` with pointer to this proposal and the Committee minute; P18 → first row of `committee-minutes/` populated.
- `docs/decisions.md` entry recording the self-classification as a locked design choice: "CTI is a published-quote benchmark. The hierarchy and the fact that no expert judgment is applied to the published number is now part of the public contract."
- Observation window: @CarlosGalindo2807 watches `/methodology` traffic and any `complaints` channel (once P16 lands) for 7 days post-merge for licensee or reader confusion. No signal expected.

**Rollback (unlikely but documented).** The amendment reverts cleanly by reverting the PR commits; the `methodology_changes` row is marked `effective_to = <revert date>`, and a Committee minute explains. No data recovery is required because no computation changed.

## 7. Committee deliberation prompt (@CarlosGalindo2807)

A short paragraph that can be pasted into the first `docs/committee-minutes/` entry:

> *"We are adding a 'Data inputs' subsection to the published `/methodology` page that classifies CTI as a published-quote benchmark, states the deterministic hierarchy of input classes, and explicitly declares that no expert judgment is applied to the published number. The subsection addresses IOSCO Principle 7 (Data Sufficiency) and Principle 8 (Hierarchy of Data Inputs), and EU BMR Art. 11(1)(c) and Art. 11(3)(d). It does not change `PUBLISHED_METHODOLOGY`, does not change `PUBLISHED_METHODOLOGY_VERSION`, does not change any published value in `index_values_daily`, and does not modify the methodology lock test. It is classified as a disclosure amendment, effective on merge, recorded in `methodology_changes` with `change_type = 'disclosure_amendment'`, and bootstraps the `docs/committee-minutes/` directory called for by gap-matrix row P18. The Committee's alternative is to treat the amendment as a `v1.0.1` version bump and run it through the full 30-day public-notice procedure as a P12 dry-run; this is not recommended because the 30-day window exists to protect licensees from a changed number, and no number changes here. Voted: <approve as disclosure amendment / approve as v1.0.1 with 30-day notice / reject with written reason>, Carlos Galindo Dumitrescu, on 2026-10-12."*

## 8. Closing

After this proposal is approved (PR merged):

1. Mark `docs/research/gaps/iosco-principles.md` row P7 as `partial / documented`, row P8 as `compliant`, row P12 as `exercised (disclosure path)`, and row P18 as `partial (minutes directory bootstrapped)`. Add a revision-log entry on the gap-matrix file with the merge date and PR link.
2. Add an entry to `docs/decisions.md` under a new "Index-architect governance decisions" subsection: title *"CTI is a published-quote benchmark; the data-input hierarchy is public."* Linked to this proposal and the Committee minute.
3. Link the merged PR URL in this proposal's footer.
4. Queue the next session's P0 items: P3 (conflict-of-interest disclosure) and P16 (complaints procedure) as the next two `/methodology` edits, each with its own proposal.

---

## Primary sources consulted (all treated as untrusted content per the charter)

Regulatory texts:
- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13 (IOSCOPD415), July 2013. https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf — Principle 7 (Data Sufficiency) and Principle 8 (Hierarchy of Data Inputs). Direct PDF fetch again blocked HTTP 403 in this session; principle text reconstructed from IOSCO- and FSA-published mirrors and the WebSearch result set.
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, IOSCOPD549, January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data) — Art. 11(1)(c) "input data shall be transaction data, if available and appropriate" and the committed-quotes carve-out; Art. 11(3)(d) obligation to "draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement." https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng
- ESMA, *Interactive Single Rulebook* — Benchmarks Regulation Art. 11. https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data
- UK retained-EU mirror of Reg. 2016/1011 Art. 11, Annex I ranking (transactions > committed quotes > indicative quotes > expert judgement). https://www.legislation.gov.uk/eur/2016/1011/article/11/data.htm

Comparable-benchmark methodologies consulted for shape (cited in the prior note; no new citations added):
- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026.
- ICE Benchmark Administration / LBMA, *LBMA Gold Price methodology and FAQs*.
- Platts and Argus *Oil Price Reporting Agencies* submissions to IOSCO (IOSCOPD364, IOSCOPD399).
- MSCI, *IOSCO Principles for Financial Benchmarks* (statement of compliance hub); S&P DJI *Management Statement of Adherence to the IOSCO Principles* (annual, most recent 2026-09-10 press release).

Internal references:
- `apps/web/app/methodology/page.tsx` — the file this proposal edits (one subsection added, nothing else modified).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant (unchanged).
- `apps/workers/src/functions/methodology.test.ts` — lock test (unchanged, still green).
- `apps/workers/src/functions/index-calculator.ts` — calculator (unchanged).
- `apps/workers/src/functions/outlier-detector.ts` — MAD-3σ outlier flagger (unchanged).
- `packages/db/migrations/009_methodology_v1.sql` — `methodology_versions`, `methodology_changes` schema (unchanged).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` destination for the Track B transaction anchor (unchanged, still empty).
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — IOSCO Principles overview; §B P7 flagged this analysis as needed.
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — the research backbone for this proposal; §4 Track A is this proposal.
- `docs/research/gaps/iosco-principles.md` — rows P7 (status owner), P8, P12, P18 (closing targets of this PR).
- `docs/roadmap.md` — items B7–B9 (Committee naming, change-notice surface, compliance pack) remain open after this proposal.

---

*Merged PR URL: <populate on merge>.*
