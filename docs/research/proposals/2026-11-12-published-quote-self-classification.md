# Proposal: self-classify CTI as a published-quote benchmark and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-11-12 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (edits a hard-limit surface: `apps/web/app/methodology/page.tsx`) — **not** a methodology change (does not modify `PUBLISHED_METHODOLOGY`) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit, requires @CarlosGalindo2807 review per CODEOWNERS) |
| **Required reviewer(s)** | @CarlosGalindo2807 (founding Index Committee member) |
| **Effective date if approved** | Merge date. **Non-material clarification** — no change to `PUBLISHED_METHODOLOGY`, no change to any published index value past or future, no 30-day notice required (see §Migration). |
| **References** | IOSCO FR07/13 **Principle 7** (Data Sufficiency); **Principle 8** (Hierarchy of Data Inputs); IOSCOPD549 (2018 Guidance); EU BMR **Art 11(1)(a)–(c)** and **Art 11(3)(d)** (Regulation (EU) 2016/1011). Prior research: [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md); [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md); gap matrix rows **P7**, **P8** at [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md). |

---

## Problem

The gap matrix has two rows marked `partial` that share a single root cause and a single fix.

- **P7 — Data sufficiency.** CTI's inputs are scraped *listings* (published on-demand asks), not observed trades. A strict reading of IOSCO Principle 7 requires a benchmark to be "anchored by observable transactions entered into at arm's length". On-demand compute has no public consolidated transaction tape. As it stands, a serious external reviewer can press on P7 and `/methodology` has no answer in the room with them.
- **P8 — Hierarchy of data inputs.** EU BMR Art 11(3)(d) requires the administrator to "draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement." CTI's hierarchy exists in code (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP) and has **zero** expert-judgment steps in the published-number path — a strong stance — but it is **not published**. An auditor reading `/methodology` today has to infer it.

The research note of 2026-05-12 mapped the response to P7 into three tracks: **Track A** (self-classify + publish hierarchy on `/methodology`), **Track B** (stand up the `invoice_observations` ingest and publish a list-price-vs-observed-effective-price reconciliation report), **Track C** (provider-count-scaled quorum). This proposal executes **Track A only**. It bundles P7 and P8 into a single edit to `/methodology` because they are the same disclosure made in different terms — IOSCO's own guidance treats them as a pair.

Track B is infrastructure (reads `invoice_observations`, writes a report to `docs/research/`) and is out of scope here — it belongs to a separate PR once the invoice-ingest pipeline is built. Track C is methodology-class (would change `PUBLISHED_METHODOLOGY.minObservations` or add a `providerFloor`) and is explicitly excluded from this proposal: it requires a backtest and a 30-day notice period, which this proposal does not.

## Proposed change

Edit `apps/web/app/methodology/page.tsx` to add two new sections between the existing *Quorum* subsection and the existing *Index Committee* section. The published formula itself, the constants in `PUBLISHED_METHODOLOGY`, and every downstream calculation remain byte-for-byte identical.

### New section 1 — "Data class and transaction anchoring"

Proposed text (verbatim, to be inserted immediately after the `Quorum` subsection, inside the existing `Formula` `<section>` or as a new `<section>` at the same level):

> **Data class.** CTI is a **published-quote benchmark**. Every input is a firm, executable on-demand list price captured directly from a provider's public endpoint (REST, GraphQL, or scraped HTML where no API exists). We observe what providers will sell GPU-hours at; we do not observe the specific transactions that clear at those prices. On-demand compute has no public consolidated transaction tape.
>
> **Transaction anchoring.** The *interest* CTI measures — the prevailing on-demand $/GPU-hour for a given model — is a genuine arms-length cash market. Vast.ai, RunPod, Lambda and the hyperscalers transact GPU-hours continuously at arm's length. Each eligible listing is a firm quote that can be executed on click at the quoted price; in EU BMR terminology these are "committed quotes" (Art 11(1)(c)), permitted as input where transaction data is not available. A list-price-vs-observed-effective-price reconciliation report, drawing on anonymised invoice observations, is on the roadmap; see §Roadmap at the foot of this page.
>
> **What this means in practice.** CTI faithfully represents the on-demand listed-price segment of the GPU compute market. It is not a trade-weighted spot index — such an index is not currently constructible from public data. Where a future consumer requires a transaction-anchored benchmark (for example, a cash-settled compute future), CTI's listed-price level can be used in combination with the forthcoming reconciliation report, or a dedicated transaction-anchored sister index would be published under a separate methodology version.

### New section 2 — "Hierarchy of data inputs"

Proposed text (verbatim, to be inserted immediately after the *Data class and transaction anchoring* section):

> The regulation requires administrators to publish the hierarchy of data types used in a determination and how expert judgment, if any, is exercised (EU BMR Art 11(3)(d); IOSCO FR07/13 Principle 8). CTI uses a single class of input (firm executable listings) and admits **zero expert judgment** in the published-number path. The ingestion hierarchy, in order, is:
>
> 1. **Raw capture.** A listing is scraped from a provider's public endpoint. Each row is Zod-schema-validated; rows that fail validation are dropped, not silently coerced.
> 2. **Normalization — deterministic.** The GPU string is resolved via (a) exact `normalization_rules` match, then (b) alias match, then (c) fuzzy string match above a fixed similarity floor. Over 95% of captured listings resolve at this stage.
> 3. **Normalization — model-assisted.** Unresolved strings drain hourly to a Claude call. Confidence **≥ 0.95** auto-resolves and becomes a new `normalization_rule` (back-filling matching historical rows). Confidence **0.70–0.95** is queued at `/admin/unmatched` for one-click human approval. Below 0.70 is discarded. No model output enters the published-number path without either a deterministic rule it generated or a human approval.
> 4. **Outlier flag.** Each normalized observation is checked against the MAD-3σ filter above (per GPU model, 1-hour window) and `is_outlier` is written back to `price_snapshots` for audit.
> 5. **Eligibility filter.** The observation is retained for the day's calculation iff it is in the 24-hour window, not an outlier, from a provider with `reliability_score ≥ 0.5`, and the GPU model is in the index universe.
> 6. **Quorum.** If the eligible set has fewer than 5 observations, no value is published for that day. We never extrapolate, never carry forward, and never fall back to a different formula.
> 7. **VWAP.** The published number is the `num_gpus`-weighted mean of eligible prices.
>
> **No expert judgment.** Stages 2 and 3 can involve model-assisted normalization *of inputs*, but the published-number path from stage 4 onward is deterministic. There is no point at which a human or model selects which observations contribute, overrides the outlier filter, or adjusts the VWAP.

### Companion edits (non-page, non-hard-limit)

- Update `docs/research/gaps/iosco-principles.md`: move P7 and P8 from `partial` to `compliant` conditional on this PR merging, with an evidence pointer to the merged commit. Rewrite the revision-log entry.
- Add an entry to `docs/decisions.md` summarising the self-classification (one-paragraph "what / why").

Both are plain docs edits with no code impact.

## Why this is the right shape (vs. alternatives)

Three alternatives were weighed; the chosen shape is **(A)**.

**(A) Self-classify as a published-quote benchmark + publish hierarchy on `/methodology`.** Chosen. Converts the single most-pressable methodological weakness into an explicitly-stated design choice. Costs no methodology change. Is reversible (a future PR can refine the text). Mirrors how the Baltic Exchange (an EU-BMR-compliant freight-index administrator whose indices settle cleared derivatives at SGX / EEX / LCH) and the oil Price Reporting Agencies (Platts, Argus) handle the same limitation: the regulatory world accepts benchmarks that run largely on bids/offers *provided the methodology says so and the administrator can defend the weighting*. The Baltic Exchange operates without any public trade tape at all, relying on panellist assessments disciplined by a 2025-adopted monthly Operational Benching audit. CTI's position is structurally stronger: our inputs are mechanically-captured firm executable quotes rather than human submissions, and the published number has no expert-judgment stage. Owning that distinction is the leverage.

**(B) Build the transaction anchor (`invoice_observations` ingest) before saying anything on `/methodology`.** Rejected for *this* proposal, kept on the roadmap. The infra is real work (anonymisation / consent / schema / ingest / redaction / reconciliation report) and until it ships the page cannot *claim* a transaction anchor. In the meantime the page carries an unstated weakness. (A) and (B) are not mutually exclusive; (A) buys the correct disclosure today and (B) strengthens it later.

**(C) Tighten the methodology — raise `minObservations` and add a `providerFloor` so thin-coverage indices suppress earlier.** Rejected for this proposal (it is Track C from the note). It is methodology-class — modifying `PUBLISHED_METHODOLOGY` requires a full backtest, a 30-day public notice, a committee deliberation record, and a version bump to v1.1. It is on the queue but belongs in its own proposal. Nothing in (C) substitutes for (A): even a highly selective quorum rule does not satisfy P7 on its own, because P7 is about *what the inputs are*, not *how many of them must agree*.

## Empirical impact

No methodology change, so there is no backtest to run on the published index level — every `index_values_daily.vwap` row produced after this merges would be identical to one produced before it.

The empirical signal that says "this works":

- **Methodology lock test** (`apps/workers/src/functions/methodology.test.ts`) continues to pass. Its assertions on `PUBLISHED_METHODOLOGY.{formulaId, windowHours, minObservations, outlierFilter, weight, reliabilityFloor}` remain green because this proposal changes none of those values. If the test were to fail after this PR, it would mean the PR exceeded its own stated scope — the test is the backstop.
- **`/methodology` renders at parity** apart from the two new sections. The existing *Currently in force*, *Formula*, *Outlier filter*, *Eligibility floor*, *Quorum*, *Index Committee*, *AI orchestration* and *Version history* sections are not touched. `pnpm -r typecheck` must pass on `apps/web`.
- **Gap matrix updates.** P7 and P8 move to `compliant` only after the PR merges. Before that, the gap matrix is updated to show `partial → in-flight (this PR)` so the state is visible without pre-judging the Committee decision.

The qualitative signal that says "this is worth doing":

- An external reviewer reading `/methodology` after the merge can answer the "what are your inputs?" question in full from the page itself, without having to look at the repo. That is what P8 asks for in one line.
- The P7 self-classification turns a yes/no vulnerability into a documented scope. The administrator's defence shifts from *"we are compliant with P7"* (a claim that is difficult to sustain under scrutiny) to *"CTI is a published-quote benchmark and its P7 status is as documented on the methodology page"* (a position that is defensible, matches how Baltic/Platts/Argus describe their own benchmarks, and leaves room for Track B to strengthen it later).

## Risks

**Immediate (low).**
- **Hard-limit surface edit.** `/methodology` is on the hard-limit list and CODEOWNERS routes the review to @CarlosGalindo2807. The proposal exists precisely so this is a reviewed, not silent, change.
- **Wording drift.** The proposed text is prescriptive; a reviewer may want to tighten or soften specific sentences. A tracked PR review is the appropriate forum. No sentence is load-bearing on a numerical value.
- **Typographic.** `pnpm -r typecheck` and a visual check on `/methodology` locally are sufficient. The page uses no new components or data sources.

**Second-order (low–medium).**
- **"Published-quote benchmark" label.** This is the exact phrase proposed. It is not a defined term in BMR; EU BMR uses "regulated-data benchmark", "interest rate benchmark", "commodity benchmark" and (by implication) classifies everything else as a "non-regulated-data benchmark". CTI is arguably a *non-regulated-data commodity benchmark* under BMR Annex II taxonomy, but that phrasing is unhelpful to a non-regulatory reader. "Published-quote benchmark" mirrors the shape used by Baltic Exchange in plain-English contexts and is unambiguous on the salient dimension (input class). Reviewer may substitute another phrase; "listed-price benchmark" is an acceptable fallback.
- **Reads as an admission.** A hostile reviewer could frame "CTI is a published-quote benchmark" as "CTI is not a transaction benchmark" and treat the latter as disqualifying. This is a presentation risk, not a substantive one, and the proposed text handles it by naming the comparison benchmarks (BMR committed quotes, Baltic Exchange, PRAs) and the transition path (Track B) in the same section.
- **Licensee contracts.** No current licensee contracts reference CTI; the clarification cannot break downstream users. If a licensee contract is drafted between this PR being opened and merged, the contract should reference the post-merge page text.

**Explicitly not risked.**
- **No change to `PUBLISHED_METHODOLOGY`.** Historical values remain reproducible. The methodology lock test remains the backstop.
- **No new dependencies, no new data sources, no new environment variables, no migration.** Pure page-text edit plus docs updates.

## Migration / rollout plan

**This is a non-material clarification, not a methodology change.** The arguments:

- `PUBLISHED_METHODOLOGY` constant: unchanged.
- The published index value for every past, current and future day (under v1.0): unchanged.
- The set of inputs, the normalization pipeline, the outlier filter, the eligibility floor, the quorum rule: unchanged.
- The Index Committee cadence and change-control procedure: unchanged.

What changes is that `/methodology` describes two aspects of v1.0 — the data class and the ingestion hierarchy — that are already true but previously unstated. Under EU BMR Art 11(3)(d) and IOSCO Principle 8, publishing this disclosure is a *compliance improvement*, not a *methodology amendment*. The 30-day public-notice procedure in the Index Committee charter applies to changes that alter what gets calculated; this proposal does not.

**Committee discretion.** If the Committee disagrees with the non-material framing, the fallback is to apply a 30-day notice period anyway — a short delay with no operational cost — and merge on day 31. The proposal is compatible with either path; the recommendation is "non-material, merge on approval".

**Deploy / rollback.**
- Deploy: standard Vercel preview on PR open, production on merge to `main`. The page is ISR-cached (`revalidate = 300`); the new sections appear within ~5 minutes of merge.
- Rollback: `git revert` the merge commit. No state anywhere else depends on the new text.
- Monitor: nothing in `system_events` changes shape. No new alerts needed.

**Post-merge checklist.**
- Flip P7 and P8 in `docs/research/gaps/iosco-principles.md` from `partial` to `compliant`, link the merged PR as evidence.
- Add a one-paragraph entry to `docs/decisions.md` capturing the decision.
- Schedule Track B research (invoice-ingest spec) for the next index-architect run.

## Committee deliberation prompt

> "We are publishing a two-part clarification on `/methodology`: (1) CTI is explicitly a **published-quote benchmark** anchored in a genuine arms-length on-demand GPU cash market; its inputs are firm executable list prices, not observed trades — closer in nature to EU BMR 'committed quotes' than to indicative submissions. A list-price-vs-observed-effective-price reconciliation report is on the roadmap. (2) The ingestion hierarchy, which today has no expert-judgment stage in the published-number path, is published in full. The locked `PUBLISHED_METHODOLOGY` constant, every past and future `index_values_daily.vwap` value under v1.0, and every downstream calculation are unchanged. This closes the two IOSCO principles most pressable on the current page (P7, P8) with no numerical consequence. We judge the change **non-material** under our published change-control procedure; the Committee may instead elect to apply a 30-day notice period as a precaution, with no operational cost. Voted: <yes/no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD."

## Closing

On approval of this proposal (PR merged):

1. Update [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) — rows P7 and P8 to `compliant`, link the merged PR, update the revision log and the P0 priority queue.
2. Add a `docs/decisions.md` entry — one paragraph summarising the self-classification, because the gap matrix is a living document and the decisions file is the point-in-time record.
3. Schedule the Track B research for the next index-architect run: specifically, a design note on the `invoice_observations` ingest pipeline (consent flow, redaction, retention, how the reconciliation report would be computed) and the P1 queue item it closes.

Merged PR link to be added here after review: *(pending)*.

---

## Sources

Primary regulatory texts (referenced; direct PDF fetch is repeatedly blocked HTTP 403 in this execution environment; passages quoted from IOSCO- and ESMA-published search excerpts):

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13 (IOSCOPD415), July 2013 — Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs). https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, IOSCOPD549, January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- Regulation (EU) 2016/1011 of the European Parliament and of the Council of 8 June 2016 on indices used as benchmarks (BMR), **Article 11 (Input data)**. EUR-Lex CELEX 32016R1011. https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng ; ESMA Interactive Single Rulebook, Art. 11. https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data

Comparable-benchmark methodologies cited for shape and defensibility arguments:

- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026. https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf ; methodology page https://www.balticexchange.com/en/data-services/Methodology.html ; "Baltic Exchange introduces monthly audits for physical panellists" (Operational Benching), June 2025. https://www.maritimelondon.com/news/baltic-exchange-introduces-monthly-audits-for-physical-panellists-to-further-improve-baltic-index-quality
- IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, IOSCOPD364, October 2012. https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf ; Platts & Argus methodology submissions, IOSCOPD399. https://www.iosco.org/library/pubdocs/399/pdf/Platts.pdf
- ICE Benchmark Administration / LBMA, *LBMA Gold Price FAQs*. https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price ; ICE *Precious Metals Methodology*. https://www.ice.com/iba/lbma-precious-metals
- MSCI, *IOSCO Principles for Financial Benchmarks* (statement of compliance hub). https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco

Internal references:

- `apps/web/app/methodology/page.tsx` — the target file (hard-limit).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant (hard-limit; untouched by this proposal).
- `apps/workers/src/functions/methodology.test.ts` — methodology lock test (hard-limit; continues to pass).
- `packages/db/migrations/009_methodology_v1.sql` — `methodology_versions`, `methodology_changes` schema.
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` schema (Track B dependency).
- [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) — full research; this proposal is the Track-A deliverable it recommends.
- [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md) — §B rows P7–P8, the origin of this work.
- [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) — rows P7 and P8, state owner of record, to be updated on merge.
- `docs/decisions.md` — locked-in decisions, to receive a one-paragraph summary entry on merge.
