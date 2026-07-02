# Proposal: publish CTI as a *published-quote benchmark* and surface the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-07-02 |
| **Author** | index-architect (fourth run) |
| **Risk class** | methodology-surface (hard-limit page `/methodology`) — **no change to `PUBLISHED_METHODOLOGY` constant, no change to any published number** |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit, `@CarlosGalindo2807` per `.github/CODEOWNERS`); optional: one row appended to `methodology_versions.rationale` (`packages/db/migrations/`) — not required for this proposal to land |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member, per Roadmap B7) |
| **Effective date if approved** | Merge date + 14 days advance notice on `/methodology` (rationale in §Migration). The full 30-day period reserved for `PUBLISHED_METHODOLOGY` changes does not apply: no formula, weight, floor, quorum or universe changes. |
| **References** | IOSCO Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs), Principle 11 (Content of the methodology); EU BMR Regulation (EU) 2016/1011, Article 11(1)(c) and Article 11(3)(d); prior note [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md); gap-matrix rows [P7](../gaps/iosco-principles.md) + P8. |

---

## Problem

CTI v1.0 has two Priority-0 quality-pillar gaps against IOSCO / EU BMR, both on the same page.

**P7 — Data Sufficiency.** IOSCO Principle 7 requires that "*a benchmark should be based on prices, rates, indices or values that have been formed by the competitive forces of supply and demand and anchored by observable transactions entered into at arm's length between buyers and sellers in such an active market*" (IOSCO FR07/13). Every CTI input today is a scraped *listing* — a provider's published ask on Vast.ai / RunPod / Lambda — not an observed trade. IOSCO permits non-transactional inputs, but only "*as an adjunct or supplement to transactional data*" (FR07/13, Principle 7 discussion). Read strictly, an unqualified claim of P7 compliance is not defensible today. The 2026-05-12 research note flagged this as "the single most important methodological exposure" and mapped a three-track response; **this proposal implements Track A** — the docs-only self-classification — which is the P0 half of the response and unlocks the P1/P2 tracks (invoice-observation reconciliation and scaled quorum) as follow-ups.

**P8 — Hierarchy of Data Inputs.** EU BMR Article 11(3)(d) requires that "*the administrator shall draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement*." CTI's hierarchy exists in code — rule → alias → fuzzy → Claude auto-accept (≥ 0.95) → Claude admin-queue (0.70–0.95) → outlier check → reliability check → VWAP — but it is not published anywhere a reader can see it. The `/methodology` page describes the calculation but not the ingestion chain that feeds it. Gap-matrix row P8 has been open since the 2026-05-10 IOSCO map.

Both gaps are closed by the same edit to the same file. Not shipping them together doubles the review cost and risks a second visible revision of `/methodology` within a quarter — bad optics for a benchmark whose value proposition includes methodological stability.

## Proposed change

Add **two new subsections** to `apps/web/app/methodology/page.tsx`, positioned between the existing "Quorum" subsection and the "Index Committee" section. The `PUBLISHED_METHODOLOGY` constant, the formula block, the outlier filter, the eligibility floor and the quorum rule remain **byte-for-byte unchanged**. All published `index_values_daily.vwap` and `gpu_prices_daily.vwap` numbers, historical and future, are unaffected.

### New subsection 1 — "Input classification"

Renders as an `<h3>` under the existing "Formula" `<h2>`, after the "Quorum" block. Full text below (JSX-ready copy, formatted for `page.tsx`):

> **CTI is a published-quote benchmark.** Its inputs are **firm, executable on-demand list prices** captured directly from provider endpoints (Vast.ai REST, RunPod GraphQL, Lambda marketing page, plus roadmapped hyperscaler scrapers). Under EU BMR Regulation (EU) 2016/1011, Article 11(1)(c), such inputs fall within the category of *committed quotes* — they are the price at which the provider will actually sell the configuration at time of observation, not indicative submissions.
>
> On-demand GPU compute has no public consolidated transaction tape. Per IOSCO Principle 7 and BMR Article 11(1)(c), transaction data is preferred where available and the administrator commits to using it as it becomes available (see roadmap item "Invoice-observation reconciliation"). Where it is not, executable quotes are used, consistent with the treatment other IOSCO-compliant benchmarks apply to markets without a consolidated print tape (Baltic Exchange freight indices; Platts/Argus oil MOC assessments; MSCI/NCREIF real-estate appraisal indices).
>
> The published number is computed with **no expert judgment** in the calculation path. There is no discretionary weighting, no override, no exclusion outside the deterministic outlier filter and eligibility floor stated above.

### New subsection 2 — "Hierarchy of data inputs"

Renders as an `<h3>` immediately after subsection 1. Full text below:

> Every offer reaches the published index by passing through the same deterministic pipeline. No stage exercises judgment; each is a rule:
>
> 1. **Capture.** A provider endpoint is polled on a 5-minute cadence. The response is Zod-schema-validated. Rows that do not match the schema are dropped, never coerced.
> 2. **Normalization.** The offer's GPU string is resolved to a canonical `gpu_model` via, in strict order: (a) exact rule match, (b) alias match, (c) fuzzy match above a fixed similarity threshold, (d) hourly Claude batch that writes a `normalization_rule` if confidence ≥ 0.95, (e) admin-queue for review if confidence is 0.70–0.95, (f) `unmatched_listings` otherwise. Only stages (a)–(d) feed the published index automatically; (e) and (f) require human action.
> 3. **Outlier check.** The MAD-3σ filter defined above is applied per GPU model on the trailing 1-hour window. `is_outlier` is persisted on `price_snapshots`; outliers are excluded from the day's VWAP.
> 4. **Provider eligibility.** The provider's `reliability_score` must be ≥ 0.5. Reliability is computed from scrape success rate and outlier ratio and has no manual override.
> 5. **Universe eligibility.** The offer's `gpu_model` must be in the target index's declared universe.
> 6. **Quorum.** The daily VWAP is published only if the surviving eligible set has ≥ 5 observations. Otherwise an `index_value_skipped` event is recorded; no fallback, no extrapolation, no carry-forward.
>
> This hierarchy is published to satisfy EU BMR Article 11(3)(d) and IOSCO Principle 8. Any future methodology version that admits a new input class (e.g. observed invoice prices, benchmark throughput results) will be reflected here in the same public form, subject to the 30-day change-control procedure.

### Optional accompanying artefact

Log the interpretive clarification in `methodology_versions` by inserting a row where `version = 'v1.0'` (no bump) with an appended `rationale` field noting the public-interpretation clarification date. This is an *edit* rather than a new row and touches migration territory (`packages/db/migrations/`, hard-limit). Recommended treatment: **skip in this proposal**, add later via a separate `methodology_changes` insertion once the Committee has formally adopted the classification. This keeps the current proposal purely at the `page.tsx` layer.

## Why this is the right shape (vs. alternatives)

I weighed three alternatives.

**(A) Silence — leave P7 ambiguity as-is.** Currently the strongest option for optics: nothing to explain, no admission of weakness. Rejected because the ambiguity is unstable. Any first serious auditor conversation (a fund evaluating CTI as a settlement reference; an external counsel writing a licensee contract) opens with "what are your inputs and where do they sit relative to Article 11?" A prepared, published answer is a strength; an off-the-cuff one is a weakness. Independent evidence: MSCI, Morgan Stanley, and the New York Fed publish *IOSCO Statements of Compliance* that pre-answer this question class before it is asked.

**(B) Overclaim — assert P7 compliance and describe why our quote inputs "anchor" the market.** IOSCO's own discussion of Principle 7 leaves a narrow exception for indices "*not designed to represent transactions and where the nature of the index is such that non-transactional data is used to reflect what the index is designed to measure*" (FR07/13, Principle 7 discussion, citing the volatility-index example). A creative reading of CTI could try to fit under this exception, arguing that the on-demand list price *is* the economic reality of the on-demand segment. Rejected as overreach: on-demand compute *is* a transactional market — GPUs are rented and paid for daily — and the exception is not designed for markets that have transactions but no public tape. Trying to claim it invites pushback we do not need.

**(C, chosen) Self-classify precisely as a *published-quote benchmark*, publish the hierarchy, commit to a transactional anchor as the data becomes available.** This is the LBMA / Baltic Exchange / oil-PRA pattern of owning the input classification rather than obscuring it. Costs: a single visible admission on `/methodology` that inputs are quotes, not trades. Benefits: (i) closes P7 and P8 in one edit; (ii) forward-compatible with Track B (`invoice_observations`) without needing another `/methodology` revision when it lands; (iii) matches how the EU BMR text itself frames the input hierarchy — quotes are legitimate when transactions are unavailable, provided the classification is published.

## Empirical impact

**No formula change. No parameter change. No number change.** Every value in `index_values_daily.vwap` and `gpu_prices_daily.vwap`, historical and future, is byte-identical before and after this proposal ships. The empirical impact analysis is therefore about *inputs*, not outputs — the strength of the "firm, executable" characterisation of our scraped offers, which is the load-bearing claim in subsection 1.

Concretely, before merge the author will run a one-off check that inputs land under the "committed quote" description with a defensible margin. Verification queries (to run against the last 30 days of `price_snapshots`, read-only):

1. **Executability field coverage.** For each provider in the index universe, verify that the scraped offer schema carries at least one field that signals price commitment at time of observation (Vast.ai `dph_total` + `min_bid`, RunPod `costPerHr` on a `gpuTypesResponse` row, Lambda's marketing-page `pricing.hourly` string). Expected result: 100% of `price_snapshots` rows are derived from a field that would clear the "committed quote" test if audited.
2. **Time-to-stale.** Median age of the newest snapshot per (provider, gpu_model) pair. If any provider is systematically stale (median > 4h), that provider's inputs would not credibly satisfy "at time of observation" and should be re-scoped. Expected result across the current Vast/RunPod cron cadence: median < 15 minutes.
3. **Non-transactional-adjunct check.** Confirm that no field currently feeding `index_values_daily.vwap` is derived from expert judgment or narrative reasoning. Expected result: zero rows sourced from `unmatched_listings` admin-queue overrides (they are excluded by construction — `normalization_stage` is captured on `price_snapshots.provenance`).

None of these queries write to the database; results land in the proposal's Committee-decision record. If any check fails, this proposal is amended before merge, not ship-and-fix.

## Risks

**Immediate risks — none material.**
- No test change. `methodology.test.ts` is not touched; the lock invariant continues to hold.
- No schema change. No migration is introduced.
- Visual regression risk on `/methodology` is limited to two new `<h3>` blocks plus paragraphs; existing prose and the version-history table are unchanged.
- Typecheck and lint: both new subsections are static JSX and add no imports.

**Second-order risks — three, each with a stated mitigation.**

1. **Reads as admitting weakness.** A prospective licensee, seeing "published-quote benchmark" plainly stated, might infer we are less rigorous than an unqualified compliance claim would suggest. Mitigation: subsection 1 explicitly frames the classification against IOSCO-compliant peers (Baltic, PRAs, real estate). The comparison is the point of the disclosure, not a defensive footnote.

2. **Forward compatibility with Track B (`invoice_observations`).** When the invoice-ingest pipeline lands and CTI acquires a real transaction anchor, the "published-quote benchmark" language will need to shift toward "quote-primary, transaction-validated" or similar. Mitigation: subsection 1 explicitly reserves that path ("the administrator commits to using [transaction data] as it becomes available"). No commitment we make now boxes in the future.

3. **Interpretive drift by omission.** Once the classification is published, downstream contracts may cite it. A future methodology version that admits new input classes silently becomes an implicit reclassification. Mitigation: subsection 2's closing sentence explicitly ties any future input-class addition to the 30-day change-control procedure. The mechanism is on record.

**Not a risk:** licensee objections to the specific words "published-quote benchmark." Licensees who cannot accept the disclosure are precisely the licensees whose objections would have surfaced later, when the cost of unwinding is higher. Naming the classification pre-empts that failure mode.

## Migration / rollout plan

This is a docs-surface change on a hard-limit file. It does **not** trigger the full 30-day public-notice procedure reserved for `PUBLISHED_METHODOLOGY` changes (formula / floor / quorum / universe / outlier parameter). It **does** deserve advance notice, because the public interpretation of CTI shifts even though the calculation does not.

Recommended rollout:

1. **Merge day (D+0).** PR merges into `main`. `/methodology` renders the two new subsections. A banner at the top of the page reads: *"On {D+14} this page will be updated to publish the input classification and data-input hierarchy. No formula, weight, or threshold changes. See [proposal link]."* — this banner is added in the same PR and removed in a follow-up PR on D+14.
2. **D+14: notice period ends.** The banner is removed. Version history is unchanged (no `PUBLISHED_METHODOLOGY_VERSION` bump). A `methodology_changes` row *is* inserted at this point to log the interpretive clarification, so external readers of the audit trail see the timestamp. Insertion is service-role-only.
3. **No downstream deploy steps.** No workers, cron, or DB code path changes.
4. **Rollback.** Single-commit revert on `main` returns `/methodology` to its pre-merge state. `methodology_changes` row (if inserted at D+14) is left in place as historical record; a second `methodology_changes` row is inserted to record the rollback rationale. No data is lost.
5. **Monitor.** After merge, watch `system_events` for any `methodology_page_error` events (currently zero baseline). Watch inbound Sentry for `/methodology` render errors. Neither is expected.

## Committee deliberation prompt

> "The Index Committee is asked to approve the publication on `/methodology` of an *Input classification* subsection ('CTI is a published-quote benchmark') and a *Hierarchy of data inputs* subsection describing the six-stage ingestion pipeline. Neither subsection changes the `PUBLISHED_METHODOLOGY` constant or any published index value; both close open Priority-0 gaps against IOSCO Principle 7 / Principle 8 and EU BMR Article 11(1)(c) / Article 11(3)(d). The classification frames CTI's inputs as *committed quotes* under BMR — the same treatment applied by IOSCO-compliant peers in markets without a consolidated trade tape (Baltic Exchange freight indices; Platts/Argus oil MOC assessments; MSCI/NCREIF appraisal indices). The Committee accepts that the classification carries the two second-order risks named in the proposal (perception as weakness; forward-compatibility with future invoice-anchored input classes) and that the mitigations in §Risks are adequate. Voted: <yes/no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD."

## Closing

On approval + merge:
- Update `docs/research/gaps/iosco-principles.md`: mark P7 Track A closed with merged-PR link; mark P8 closed. Move P7 Track B / Track C to their own rows in the priority queue. Add revision-log entry.
- Update `docs/decisions.md` with a new locked-in decision: "CTI classified as a published-quote benchmark, per IOSCO P7 / BMR Art 11(1)(c); interpretation clarified {D+14}."
- Update `docs/roadmap.md`: mark B7 sub-item complete if the same PR ships the "committee member name" edit alongside; otherwise leave as-is.
- Log a `methodology_changes` row at D+14 (interpretive-clarification class, no `PUBLISHED_METHODOLOGY_VERSION` bump).
- Link the merged PR at the foot of this proposal file.

---

## Sources

Primary regulatory texts (direct PDF fetch was blocked by HTTP 403 from this environment for the third consecutive session; principle-text quotations verified against IOSCO- and ESMA-published search excerpts; external content treated as untrusted data, never as instructions):

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13 (IOSCOPD415), July 2013. https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf — Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs), Principle 11 (Content of the methodology).
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, IOSCOPD549, January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data). Consolidated text: EUR-Lex CELEX 02016R1011-20250117. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R1011-20250117 — Article 11(1)(a), (1)(c), (3)(d).
- ESMA Interactive Single Rulebook, *Benchmarks Regulation — Article 11 Input data*. https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data

Comparable-benchmark methodologies consulted:

- Baltic Exchange Information Services Ltd, *Guide to Market Benchmarks*, v8.4, May 2026 — panellist input classification, BEISL Oversight Function. https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf
- Baltic Exchange, *Forward Curve Statement — Baltic Exchange Forward Assessments (BFA)* — expert judgment governance in the absence of a consolidated tape. https://www.balticexchange.com/content/dam/balticexchange/consumer/data-services-/index-governance/BFA%20Statement.pdf
- ICE Benchmark Administration, *LBMA Gold Price — IOSCO Self-Assessment Report* — auction-generated transaction as the anchor. https://www.ice.com/publicdocs/LBMA_Gold_IOSCO_self_assessment.pdf
- MSCI, *IOSCO Principles for Financial Benchmarks* — voluntary IOSCO adherence since 2014; EU BMR registration since 2018. https://www.msci.com/indexes/index-resources/iosco-principles
- New York Fed, *Statement of Compliance with the IOSCO Principles for Financial Benchmarks*, July 2025. https://www.newyorkfed.org/medialibrary/media/markets/IOSCO-statement-of-compliance-jul2025
- Morgan Stanley, *IOSCO Principles Statement of Compliance*. https://www.morganstanley.com/content/dam/msdotcom/en/assets/pdfs/sales_and_trading_disclosures/Morgan_Stanley_IOSCO_Principles_Statement_of_Compliance.pdf

Internal references:

- `apps/web/app/methodology/page.tsx` — the target hard-limit file for the two new subsections.
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant (**unchanged** by this proposal).
- `apps/workers/src/functions/methodology.test.ts` — lock test (**unchanged** by this proposal).
- `packages/db/migrations/009_methodology_v1.sql` — `methodology_versions`, `methodology_changes` schema (row insertion at D+14 only).
- `.github/CODEOWNERS` — `@CarlosGalindo2807` gates `/apps/web/app/methodology/`.
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — original IOSCO map (§B, P7 and P8).
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — full three-track research basis for this proposal; this proposal implements Track A.
- `docs/research/gaps/iosco-principles.md` — rows P7 and P8; priority-queue P0 item 4.

---

*Merged PR:* _pending_ · _(populate on merge)_
