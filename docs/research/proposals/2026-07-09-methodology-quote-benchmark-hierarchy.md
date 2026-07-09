# Proposal: classify CTI as a *published-quote benchmark* and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-07-09 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (surface is hard-limit — see below) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit; text-only, no formula change) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole Index Committee member at v1.0) |
| **Effective date if approved** | 2026-08-08 (≥ 30 days after merge per Committee charter — this is a page-text change; see §6 for why the 30-day notice still applies) |
| **References** | IOSCO Principles for Financial Benchmarks (FR07/13, July 2013) — Principle 6, Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs), Principle 11 (Content of the Methodology). EU Benchmarks Regulation (Regulation (EU) 2016/1011), Article 3(1)(14) (definition of *input data*), Article 3(1)(15) (definition of *transaction data*), Article 11(1)(a), Article 11(1)(c), Article 11(3)(d). See §7 for primary URLs. |

---

## 1. Problem

`docs/research/gaps/iosco-principles.md` currently carries two open P0/P1 rows that
share a single root cause and a single fix:

- **P7 (Data Sufficiency) — `partial / structurally weak`.** IOSCO Principle 7
  requires benchmark data to "be anchored by observable transactions entered
  into at arm's length between buyers and sellers." Every input CTI ingests
  today is a scraped provider *listing* — an ask, not a print — and on-demand
  GPU compute has no public consolidated transaction tape. A strict IOSCO
  reviewer can reasonably press on this. The full analysis, including how
  comparable benchmarks (Baltic freight indices, Platts/Argus oil PRAs, LBMA
  Gold, MSCI/IPD real estate) survive the same absence of a public trade tape,
  is in [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md).
- **P8 (Hierarchy of Data Inputs) — `partial`.** IOSCO Principle 8 requires
  administrators to "Publish or Make Available clear guidelines regarding the
  hierarchy of data inputs and exercise of Expert Judgment." Our hierarchy
  exists in code (rule → alias → fuzzy → Claude confidence tiers → outlier
  check → eligibility check → VWAP) but is not published on `/methodology`.

Both gaps close in the same edit to the same page. That is what this proposal
lands. The proposal itself does **not** touch `/methodology`; it specifies the
exact page-text change for Committee sign-off, after which the edit ships as a
follow-up PR against `apps/web/app/methodology/page.tsx` under the 30-day
public-notice procedure.

## 2. Proposed change

Add two new sections to `apps/web/app/methodology/page.tsx`, positioned between
the existing **Quorum** subsection and the **Index Committee** section. The text
below is the exact copy proposed for the page; JSX wrappers follow the existing
`<section className="mt-16">` / `<h2 className="display text-2xl">` pattern
already used by the page.

### 2a. New section: *Classification*

> ## Classification
>
> CTI is a **published-quote benchmark**. Its inputs are firm, executable
> on-demand list prices captured directly from provider endpoints (Vast.ai,
> RunPod, Lambda Labs and the hyperscalers as they are onboarded). Each
> ingested price is executable on click at the quoted rate at the moment of
> capture; the benchmark measures the prevailing on-demand $/GPU-hour a buyer
> actually faces in that window.
>
> On-demand GPU compute does not have a public consolidated transaction tape.
> Consistent with EU BMR Regulation (EU) 2016/1011 Article 11(1)(c) — "if
> transaction data is not sufficient or is not appropriate … input data which
> is not transaction data may be used, including estimated prices, quotes and
> committed quotes, or other values" — CTI uses committed-quote-class inputs
> and states this explicitly rather than implicitly. The market underneath the
> quotes is a genuine arms-length cash market for GPU-hours in the sense of
> IOSCO Principle 7; the quotes we ingest are the observable expression of
> that market that a buyer can transact against.
>
> A separate transaction-data track — the `invoice_observations` table
> introduced in migration 011 — is designed to admit anonymised real-paid
> prices as a validation anchor and, eventually, as a higher-tier input class
> under a future methodology version. That work is on the roadmap; a future
> reconciliation report will publish list-price CTI vs. observed effective
> prices from that table for licensee review. No change to the published
> number is proposed here.

### 2b. New section: *Hierarchy of data inputs*

> ## Hierarchy of data inputs
>
> Every value in `index_values_daily` is produced by the pipeline below.
> Stages are deterministic and applied in this fixed order. Expert judgment is
> not used in the published-number path; the only place a human decision
> enters is the Claude-normalization admin queue (stage 3b), and that decision
> only affects catalog membership, never the arithmetic.
>
> | # | Stage | Rule | Where |
> |---|---|---|---|
> | 1 | **Capture** | Every 5 min per provider, TS-native Inngest cron writes one `price_snapshots` row per (provider, gpu_model, num_gpus, region, region_type, is_spot) with the quoted `price_per_hour`. Schema-validated by Zod; rejected offers are dropped, not coerced. | `apps/workers/src/functions/scrapers.ts` |
> | 2 | **Normalization — deterministic** | Provider-supplied GPU string is resolved by rule → alias → fuzzy match. Matches at this tier are used inline. | `packages/shared/src/normalizer.ts` (fast path); `apps/scrapers/core/normalizer.py` (canonical reference) |
> | 3a | **Normalization — Claude ≥ 0.95** | Unmatched strings are batched hourly to Claude Sonnet. Confidence ≥ 0.95 auto-resolves into a `normalization_rule` row and back-fills `price_snapshots`. | `apps/workers/src/functions/normalize-unmatched.ts` |
> | 3b | **Normalization — Claude 0.70–0.95 (human queue)** | Confidence 0.70–0.95 → admin approval queue at `/admin/unmatched`. Auto-decisions are never taken in this band. | `apps/web/app/admin/unmatched/` |
> | 4 | **Outlier flag (MAD-3σ)** | For each `gpu_model` in the trailing 1 h, an offer is flagged `is_outlier = true` if `|p_i − median(P_g)| > 3 · MAD(P_g)`. Flags are written back to `price_snapshots` and are auditable per-snapshot. | `apps/workers/src/functions/outlier-detector.ts` |
> | 5 | **Eligibility floor** | `provider_reliability_score < 0.5` → excluded from `E_t`. Reliability decays deterministically on outlier ratio > 30 % and recovers after 7 stable days. No manual override. | `apps/workers/src/functions/reliability-scorer.ts` |
> | 6 | **Quorum** | If `|E_t| < 5` for a given index, no value is published for that day and an `index_value_skipped` event is written. No extrapolation, no carry-forward, no fallback formula. | `apps/workers/src/functions/index-calculator.ts` |
> | 7 | **VWAP (locked formula)** | Volume-weighted mean over `E_t` with weights `q_i = num_gpus`. Version-stamped `methodology_version = v1.0`. | `packages/shared/src/methodology.ts` |
>
> Mapping to IOSCO Principle 8's recommended hierarchy of data inputs:
> stages 1–3 produce inputs equivalent to tier (d) *"Firm (executable) bids
> and offers"*; tiers (a)–(c) *"concluded arms-length transactions"* are not
> currently available for on-demand GPU compute and, when they become
> available via `invoice_observations`, will be admitted as a higher-priority
> input class through the standard Committee methodology-change procedure
> (§ Index Committee below). Tier (e) *"Other market information or Expert
> Judgments"* is not used in the published-number path.

### 2c. No other page edits

The Formula, Outlier filter, Eligibility floor, Quorum, Index Committee, AI
orchestration and Version history sections are unchanged. The `PUBLISHED_METHODOLOGY`
constant is unchanged. `methodology.test.ts` is unchanged. No new migration.
No new dependency. Public values in `index_values_daily.vwap` are unchanged
before, during and after this edit.

## 3. Why this is the right shape (vs. alternatives)

Three alternatives were weighed against the *self-classify + publish hierarchy*
shape proposed above.

**Alternative A — do nothing / stay silent on classification.** Cheapest, and
technically permitted (the current page nowhere claims IOSCO or BMR compliance).
Rejected because the gap becomes visible the first time an institutional
consumer, an auditor, or a regulator reads `/methodology`. The `partial /
structurally weak` P7 row in the gap matrix is exactly the question a
sophisticated reader asks first. Owning it in-page — as Baltic Exchange,
Platts, Argus, LBMA and the appraisal-based property index families all do — is
the standard pattern for benchmarks of markets without a public trade tape (see
the 2026-05-12 note § 3 for the precedent survey). Silence is a worse position
than a stated one.

**Alternative B — claim unqualified P7 compliance ("our inputs are transaction
data").** Rejected as false. IOSCO defines *transaction data* (BMR Art 3(1)(15)
codifies this) as observable prices representing transactions between
unaffiliated counterparties in an active market. A listing is not a
transaction. Overclaiming here is the opposite of the credibility we are
building; it is also the exact pattern the LIBOR failure taught the regulatory
community to look for.

**Alternative C — self-classify as a *listed-price* benchmark (weaker
formulation than *published-quote*).** Considered. Rejected because "listed
price" understates what our inputs actually are. Vast.ai, RunPod and Lambda
list prices are firm and executable — buying at the quoted price is a single
API call away — which lines up cleanly with IOSCO Principle 8 tier (d) *"Firm
(executable) bids and offers"* and BMR Art 11(1)(c)'s *"committed quotes"*. The
*published-quote* language accurately places CTI in that regulatory taxonomy;
*listed-price* would leave the reader guessing which class we mean.

**Alternative D — move the disclosure to a separate `/compliance` page.**
Rejected. IOSCO Principle 11 (Content of the Methodology) is explicit that the
methodology publication should be "sufficient detail to allow Stakeholders to
understand how the Benchmark is derived and to assess its representativeness."
The classification and the input hierarchy *are* part of "how the benchmark is
derived." Splitting them across pages weakens both. `/compliance` is still
valuable for later artifacts (per-principle IOSCO compliance statement,
control-framework document per gap-matrix row P4) but is not the right home
for the classification and the hierarchy.

## 4. Empirical impact

This is a docs surface change, not a methodology-arithmetic change. The
`PUBLISHED_METHODOLOGY` constant does not change. Every value in
`index_values_daily.vwap` before the edit is bit-identical to every value
after. Consequently:

- **No backtest is required.** A backtest is defined for changes that would
  produce different published numbers under old-vs-new; the number produced by
  filtered_vwap v1.0 is unchanged.
- **No sensitivity analysis is required.** No parameter is being modified.
- **`methodology.test.ts` continues to pass unchanged.** Verified locally:
  `pnpm --filter @compute-terminal/workers test -- methodology.test.ts`.
- **`methodology_versions` table is unchanged.** No new row. Version stays at
  `v1.0`. The `document_url` field for the `v1.0` row may optionally be
  updated to point at the specific `/methodology` page revision that includes
  the new sections — a Committee-approved amendment to a version row, not a
  new version.

The *empirical signal that this works* is that reader comprehension improves —
verifiable at the next licensee or auditor conversation by whether the P7
question ("what's your transaction data?") gets asked or, ideally, gets
pre-answered by the page itself. Not measurable in-code; measurable in
in-market feedback.

## 5. Risks

**Immediate (this session, docs-only).**

- **R1. Language error introduces regulatory ambiguity.** If the phrase
  "published-quote benchmark" is later used in a regulatory filing and turns
  out to have a defined technical meaning under a jurisdiction we haven't
  surveyed, we have a mismatch. *Mitigation:* Section 2a uses the phrase
  descriptively, defines it in plain English, and cites BMR Art 11(1)(c) as
  the pigeonhole. It does not claim compliance with any specific regulatory
  status. Any future ESMA registration will restate the classification in
  ESMA's own vocabulary.
- **R2. Publishing the pipeline invites focused-injection attacks on stage 4
  (outlier filter) or stage 5 (reliability floor).** *Mitigation:* the
  pipeline is already public (source-visible in the repo and the outlier /
  reliability files are named on the current `/methodology` page). Naming the
  order does not increase attack surface materially; if anything, it lets a
  serious counterparty argue about the *specific* filter rather than fabricate
  claims about our arbitrariness.

**Second-order (weeks–months).**

- **R3. Naming the *invoice_observations* track on `/methodology` creates an
  expectation that we will ship it.** Accepted. That expectation is correct;
  the roadmap already carries it (REFRAME_v2 variable 8). We publish a
  qualified statement — "designed to admit … eventually … through the standard
  Committee procedure" — that neither promises a date nor understates the
  intent.
- **R4. Committee methodology-change procedure has never been exercised on a
  page-text change.** Documented as gap-matrix row P12; this proposal is a
  first live use of the procedure and closes P12 empirically. See § 6.
- **R5. Reduces defensibility of any future silent tweak to the pipeline
  order.** Correct and intended. Any change to stages 1–7 will now be visibly
  a methodology change and must run the 30-day-notice procedure. This is the
  discipline we want; it is the whole point of the lock.

## 6. Migration / rollout plan

This is a docs surface change that lands under the same 30-day-notice
procedure as any methodology change, because `/methodology` is the published
contract and any material amendment to the classification or the disclosed
pipeline is by construction material — a licensee reading v1.0 today would be
entitled to know these were the terms.

**Timeline.**

- `2026-07-09` — this proposal PR opens against `main` for Committee review.
  No live user-facing surface changes.
- **Committee sign-off** — @CarlosGalindo2807 approves or requests revisions
  as sole voting member. Approval recorded in the PR review and mirrored to
  `docs/committee-minutes/` (directory creation is a companion housekeeping
  item, gap-matrix row P18).
- **Merge → notice-period start.** On merge, a follow-up PR against
  `apps/web/app/methodology/page.tsx` inserts the two new sections **and**
  appends a "Notices" banner listing this change with an effective date of
  `2026-08-08`, ≥ 30 days from merge.
- `2026-08-08` — the change becomes effective. The banner rolls off; the new
  sections stay. A row is added to `methodology_changes` (schema per migration
  009: `change_id`, `version_from='v1.0'`, `version_to='v1.0'`, `type='disclosure_amendment'`,
  `effective_from='2026-08-08'`, `notice_published_on='<merge date>'`,
  `rationale` cross-references this proposal). No `methodology_versions` row
  is added — this is a disclosure amendment to `v1.0`, not a new version.

**Rollback.** If the Committee reverses the decision within the notice period,
the follow-up PR is reverted before `2026-08-08`; no published value is
affected because none change. If reversal happens after the effective date,
the same revert PR is issued and a further 30-day counter-notice is published.

**Monitor after the effective date.**

- `system_events` for any `methodology_changed` events. There should be
  exactly one, from the follow-up PR's migration script, and it should carry
  `type='disclosure_amendment'`.
- `/methodology` rendering — sanity-check that the new tables render in dark
  and light themes and that mobile line-wrapping on the pipeline table is
  acceptable.
- Licensee-facing conversations — track whether the P7 question is
  pre-answered by the page in the next two conversations.

## 7. Committee deliberation prompt

> "We are amending the published `/methodology` page to (a) self-classify CTI
> as a *published-quote benchmark* per BMR Art 11(1)(c) and IOSCO Principle 8
> tier (d), and (b) publish the seven-stage data-input hierarchy already
> implemented in code. No arithmetic change; no `PUBLISHED_METHODOLOGY` change;
> no `index_values_daily.vwap` change before, during, or after the effective
> date. The change moves two IOSCO P0/P1 gaps from *partial* to *compliant*
> (P7 as *partial → compliant-in-classification*, P8 as *partial →
> compliant*). It commits us to running any future change to the seven-stage
> pipeline through this same procedure. It also commits us to eventually
> shipping the `invoice_observations` transaction-data track named in the
> classification section. Voted: <yes/no>, Carlos Galindo Dumitrescu, on
> YYYY-MM-DD."

## 8. References

Primary regulatory texts. Direct WebFetch of iosco.org PDFs and eur-lex was
blocked HTTP 403 from this session (same as prior sessions); the passages
quoted in §§ 1–2 above appeared verbatim in web-search results for the
document body text. A future run from a network path with PDF egress should
download the sources into a research-only artifact and reconcile any
discrepancies.

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13, July
  2013. Principle 6, Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of
  Data Inputs), Principle 11 (Content of the Methodology).
  https://www.iosco.org/library/pubdocs/pdf/IOSCOPD415.pdf
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*,
  IOSCOPD549, January 2018 — reiterates that "Principle 7 that a Benchmark
  must be anchored in an active market having observable, Arm's-length
  Transactions is not affected by the concept of proportionality".
  https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- IOSCO, *Methodology for Assessing Implementation of the IOSCO Principles
  for Financial Benchmarks*, IOSCOPD562.
  https://www.iosco.org/library/pubdocs/pdf/IOSCOPD562.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 3(1)(14)
  (*input data*), Article 3(1)(15) (*transaction data*), Article 11(1)(a),
  Article 11(1)(c), Article 11(3)(d).
  https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng
- ESMA, *Interactive Single Rulebook — Benchmarks Regulation, Article 11
  (Input data)*.
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data

Compliance-statement precedents consulted for shape (self-classification
language, hierarchy formatting):

- Reserve Bank of Australia, *Compliance with IOSCO Principles — Cash Rate
  Methodology*. RBA computes the cash rate from "observed, valid cash market
  transactions recorded in RITS" with three market-activity thresholds; when
  thresholds are unmet, the RBA falls back to Expert Judgement per a published
  hierarchy in the Cash Rate Procedures Manual.
  https://www.rba.gov.au/mkt-operations/resources/cash-rate-methodology/compliance.html
- Federal Reserve Bank of New York, *Statement of Compliance with the IOSCO
  Principles for Financial Benchmarks*, July 2025.
  https://www.newyorkfed.org/medialibrary/media/markets/IOSCO-statement-of-compliance-jul2025
- Morgan Stanley, *IOSCO Principles Statement of Compliance 2024*.
  https://www.morganstanley.com/content/dam/msdotcom/en/assets/pdfs/sales_and_trading_disclosures/Morgan_Stanley_IOSCO_Principles_Statement_of_Compliance_2024.pdf
- STOXX Ltd., *Policy on Input Data Integrity*.
  https://www.stoxx.com/document/Resources/Regulation/stoxx_input_data_policy.pdf
- MSCI, *IOSCO Principles for Financial Benchmarks* (statement of compliance
  hub). https://www.msci.com/indexes/index-resources/iosco-principles

Comparable-benchmark precedent (already surveyed in
[`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)):
Baltic Exchange, Platts / Argus (oil PRAs, IOSCOPD364), LBMA Gold (auction
fix), NCREIF / MSCI IPD (appraisal-based property indices).

Internal references:

- `apps/web/app/methodology/page.tsx` — the target file (hard-limit).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant
  (unchanged by this proposal).
- `apps/workers/src/functions/methodology.test.ts` — lock test (unchanged and
  continues to pass).
- `packages/db/migrations/009_methodology_v1.sql` — `methodology_versions`,
  `methodology_changes` schema referenced in §6.
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations`
  table referenced in §2a.
- `docs/decisions.md` — "Five-methodology A/B → Locked methodology v1.0"
  entry; "Pivot to 'Bloomberg for buyers'" entry (variable 8 =
  behavioral / invoice pricing).
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — full
  IOSCO map at v0.
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` —
  precedent survey, three-track plan, recommendation for exactly this proposal.
- `docs/research/gaps/iosco-principles.md` — gap matrix, rows P7 and P8.
- `docs/roadmap.md` — B7 (name Committee members), B8 (notice surface), B9
  (compliance pack PDF).

## 9. Closing

If this proposal is approved (PR merged): (i) mark rows **P7** and **P8** in
`docs/research/gaps/iosco-principles.md` with the merged PR link and
`awaiting-effective-date` status until `2026-08-08`; (ii) after the effective
date, flip P8 to `compliant` and P7 to `partial-classification-published,
transaction-anchor-track-open`; (iii) update `docs/decisions.md` with a new
entry ("`/methodology` self-classification + input hierarchy — 2026-08-08")
explaining that stages 1–7 are now public contract and that any change to them
runs the same 30-day procedure; (iv) update `docs/roadmap.md` B8 to note the
"Notices" banner has now been used in-anger for the first time.
