# Proposal: self-classify CTI as a *published-quote benchmark* and publish the data-input hierarchy on `/methodology`

|   |   |
|---|---|
| **Date** | 2026-07-06 |
| **Author** | index-architect (fourth run) |
| **Risk class** | methodology (docs surface of the published spec) — no change to any published number |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit — public spec surface), `packages/shared/src/methodology.ts` (hard-limit — adds one machine-readable field to `PUBLISHED_METHODOLOGY`), `apps/workers/src/functions/methodology.test.ts` (adds one assertion locking the new field), `docs/research/gaps/iosco-principles.md` (row P7 + P8 status update) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member) |
| **Effective date if approved** | Same day as merge. **This is a disclosure addition, not a methodology change** — see §5 for why 30-day notice does not apply. |
| **References** | IOSCO FR07/13 (July 2013), Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs). EU BMR — Regulation (EU) 2016/1011, Article 11(1)(a), 11(1)(c), 11(3)(d). Companion note: [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md). Gap-matrix rows P7 + P8. |

## Problem

The published `/methodology` page tells a reader what formula CTI uses (filtered VWAP), what filter (MAD-3σ), what quorum (5), what reliability floor (0.5), and what window (24h). It does **not** tell them what *class* of input feeds those calculations. Every `price_snapshots` row is a scraped **listing** — a provider's firm, executable, on-demand list price — not an observed trade. The page is silent on this, and silent on the hierarchy of data inputs the pipeline actually implements.

Two IOSCO / BMR pillars press on that silence:

- **IOSCO Principle 7 (Data Sufficiency).** The 2013 Final Report requires benchmark inputs to "be based on prices, rates, indices or values that have been formed by the competitive forces of supply and demand … and be anchored by observable transactions entered into at arm's length between buyers and sellers." (FR07/13, Principle 7, as reported in ESMA/EBA and FSB implementation reviews.) IOSCO's own guidance is unambiguous that proportionality does not relax this requirement.
- **IOSCO Principle 8 / EU BMR Article 11(3)(d).** BMR Art 11(3)(d) requires the administrator to *"draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement."* Article 11(1)(c) requires that *"input data shall be transaction data, if available and appropriate. If transaction data is not sufficient or is not appropriate to represent accurately and reliably the market or economic reality that the benchmark is intended to measure, input data which is not transaction data may be used, including estimated prices, quotes and committed quotes, or other values."* CTI has that hierarchy in code (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP), but not on the page.

The consequence is the same for both: an external reviewer — auditor, licensee, regulator — has to reverse-engineer the input class and the hierarchy from source before they can even start assessing our design. The 2026-05-12 companion note concluded this was "the single most important methodological exposure" and mapped a two-track response (§4). Track A — this proposal — closes both principles in one edit to one page.

Gap-matrix rows [P7](../gaps/iosco-principles.md) (`partial / structurally weak`, priority P0) and [P8](../gaps/iosco-principles.md) (`partial`, priority P1) both explicitly point at *this proposal* as the next action.

## Proposed change

Three files change. None of them changes any published number, and the methodology lock test continues to pass after the additions.

### 1. `apps/web/app/methodology/page.tsx` — new "Input data" section

Insert a new `<section>` between the current "Formula" section (ends at `</section>` after the "Quorum" subsection, ~line 134 in the current source) and the "Index Committee" section. Proposed heading, subsections and prose below (rendered as one contiguous new section on the page):

> **Input data**
>
> CTI is a **published-quote benchmark**. Every input to the formula above is a firm, executable on-demand list price captured directly from a provider's own price endpoint at a specific moment in time — not an assessment, not a submission, not an estimate. Providers price on-demand GPU-hours in a genuine arms-length cash market; we observe the ask they publish and would be executed against on click. The `q_i` weight is the seller-committed number of GPUs in the offer, not a modelled quantity.
>
> On-demand compute has no public consolidated transaction tape. Consistent with EU BMR Regulation (EU) 2016/1011 Article 11(1)(c), where transaction data is not available or appropriate, *"input data which is not transaction data may be used, including estimated prices, quotes and committed quotes, or other values"* — and CTI's inputs are the strongest sub-class of that permitted set: committed executable quotes from an active market. The benchmark is anchored in a real arm's-length cash market for GPU-hours; the published number is computed with no expert judgment at any stage.
>
> **Hierarchy of data inputs (in priority order).**
>
> 1. **Committed executable quotes** — scraped, schema-validated, deterministically normalised provider listings passing outlier and eligibility filters. This is the **only** class of input that contributes to a published `Index_I,t` value today.
> 2. **Deterministically normalised quotes** — the same, but requiring a stored `normalization_rules` or `hardware_aliases` match to attach the offer to a canonical `gpu_model`. Behaviourally identical to (1) once matched; separated only to distinguish direct-parse from lookup-parse.
> 3. **LLM-assisted normalisation, high confidence (≥ 0.95)** — Claude-proposed GPU-model matches that back-fill `normalization_rules` and are only then re-fed as class (2). No LLM output ever contributes to a published number without first materialising as a deterministic rule.
> 4. **LLM-assisted normalisation, admin-queued (0.70–0.95)** — surfaced at `/admin/unmatched` for one-click human approval. Cannot contribute to a published value until approved.
> 5. **Transaction data (planned, not yet used).** The `invoice_observations` table (migration 011) is designed to hold anonymised real-paid prices. When populated, it will first be used as a *validation anchor* published alongside the index (a periodic list-price-vs-observed-effective-price reconciliation), not as an input to the formula. Admission of transaction data as a weighted input class above committed quotes would be a `v1.x` methodology change, requiring committee review and 30-day public notice.
>
> **Expert judgment.** None is exercised in the published-number path. Human intervention is limited to (a) approving LLM-proposed normalisation rules before they can affect any future computation, and (b) approving new providers into the universe. Neither step touches the value of an already-computed `Index_I,t`.
>
> **Why not transactions.** On-demand GPU rental transacts continuously and at arm's length, but no marketplace publishes a consolidated tape of executed fills, and no clearing venue exists to aggregate one. This mirrors the position of assessment-based benchmarks in freight (Baltic Exchange), oil (Platts / Argus market-on-close), and appraisal-based private real estate (MSCI/IPD, NCREIF), all of which are EU-BMR-compliant on the strength of a documented input-governance framework rather than transaction purity. The response is the same: state the input class, publish the hierarchy, and build the transactional anchor as a companion validation report.

Optional (not required for this proposal to succeed): add a one-line footer sentence to the "Formula" section — after the "reliability(provider_i)" bullet — clarifying that `p_i` is a *committed executable list price*, linking down to the new "Input data" section. This is purely cross-reference. If the Committee prefers a leaner formula box, drop it.

### 2. `packages/shared/src/methodology.ts` — one new field on `PUBLISHED_METHODOLOGY`

Add a single machine-readable `inputDataClass` field so the classification is part of the locked spec, not just prose on a page that a future editor could quietly reword. Diff (all other fields unchanged):

```ts
export const PUBLISHED_METHODOLOGY: {
  version: typeof PUBLISHED_METHODOLOGY_VERSION;
  formulaId: MethodologyName;
  windowHours: number;
  minObservations: number;
  outlierFilter: 'mad_3_sigma';
  weight: 'num_gpus';
  reliabilityFloor: number;
  inputDataClass: 'published_quote';           // ← new
} = {
  version: 'v1.0',
  formulaId: 'filtered_vwap',
  windowHours: 24,
  minObservations: 5,
  outlierFilter: 'mad_3_sigma',
  weight: 'num_gpus',
  reliabilityFloor: 0.5,
  inputDataClass: 'published_quote',           // ← new
};
```

The value `'published_quote'` is a string-literal type so it participates in the lock (a future PR cannot silently change it to `'transaction'` or `'assessment'` without editing this file and the lock test). Downstream consumers already reading `PUBLISHED_METHODOLOGY` — the `/methodology` page, the daily-brief generator, the (queued) compliance-pack PDF (Roadmap B9) — can render the class straight from the constant.

### 3. `apps/workers/src/functions/methodology.test.ts` — add one assertion

Extend the existing `'published methodology v1.0 is filtered_vwap'` test with one line:

```ts
assert.equal(PUBLISHED_METHODOLOGY.inputDataClass, 'published_quote');
```

Nothing else in the test file changes. The lock test continues to enforce the same five constants it enforces today, plus one more. This is the mechanism that catches silent drift, per the charter: any future edit that touches the input classification has to also touch this line, which forces the change author to acknowledge the contract.

### 4. `docs/research/gaps/iosco-principles.md` — mark P7 (Track A) and P8 closed

After the merged effective PR ships to the live page, update the gap matrix:

- **P7 row** — status remains `partial` (Tracks B and C still open — invoice-observation anchor + reconciliation report; scaled quorum) but the "Specific gap" text drops the "self-classify" clause and points at the merged PR as evidence for Track A. Priority queue: P0 item 4 struck through and moved to the Revision Log.
- **P8 row** — status `compliant`. Evidence: the "Input data" section shipped on `/methodology`, the `inputDataClass` field on `PUBLISHED_METHODOLOGY`, the enumerated 5-level hierarchy. Priority queue: P1 item 7 struck through.
- **Revision log** — one line entry at 2026-07-06, index-architect fourth run.

This is a follow-up edit, not part of the initial PR (the matrix documents *shipped* state; it's updated when the /methodology PR merges, not when this proposal PR merges).

## Why this is the right shape (vs. alternatives)

Three alternatives were weighed before landing on the shape above. The proposal-format template asks for at least two.

**Alternative A — "Claim IOSCO P7 compliance as-is; assert scraped listings are transactions."** Rejected. The IOSCO / BMR distinction between transaction data and quotes is textually explicit (BMR Art 11(1)(c) lists "quotes and committed quotes" as a *fallback* class after "transaction data"). Rebranding our inputs as transactions would misrepresent the pipeline to any reader who actually looks at `price_snapshots` and see it holds an ask side without a fill. The first serious licensee counterparty would spot this in due diligence, and the credibility cost of the discovery would exceed any short-term positioning benefit. The whole point of the "become MSCI for compute" trajectory is to be defensible under skeptical review; a stretched claim now trades that defence for a headline.

**Alternative B — "Publish the classification in prose, but do not put `inputDataClass` on the `PUBLISHED_METHODOLOGY` constant."** Rejected on the same grounds the constant was created for: prose drifts, constants don't. The `PUBLISHED_METHODOLOGY` constant + lock test is the mechanism that makes v1.0 licensable — it is the difference between "we said we use filtered VWAP on the marketing page" and "the settlement contract can reference a specific commit hash of a specific field and know what it means." The input class deserves the same protection precisely because it is the field a reviewer will ask about first. Additive cost is one string literal and one test assertion; the reproducibility gain is durable.

**Alternative C — the proposal above ("published-quote" self-classification + 5-level hierarchy + one machine-readable field + one lock-test assertion, no change to the published number).** Chosen. Closes P7-Track-A and P8 in the same edit to the same page and the same constant. The alternative shape considered inside this option was whether to describe our inputs as *"committed quotes"* (the BMR Art 11(1)(c) term of art) or *"published quotes"* (the term used by STOXX and by oil-PRA methodologies for scraped/published-endpoint executable prices). The BMR term is defined by the regulation itself, so it is what a regulator would recognise; the STOXX/PRA term is what most published-price benchmarks in adjacent markets use. The proposal resolves this by using *"published-quote benchmark"* as the class name and quoting the BMR "committed quotes" language in the same paragraph — reader sees both terms and their equivalence.

MSCI's IOSCO Statement of Compliance and STOXX's Input Data Integrity Policy both use the same shape (state the input class explicitly, publish the hierarchy, cross-reference the underlying regulation) — this is the industry-standard disclosure pattern, not a bespoke construction.

## Empirical impact

This proposal changes zero published numbers. Every value in `index_values_daily` before, during, and after the merge is arithmetically identical. That is deliberate — the goal is to *state* what CTI is, not to change what it computes. The empirical signal that says "this works" is therefore the *absence* of change in three places:

- **`index_values_daily.vwap` continuity.** Before and after the merge, running the calculator on the same `price_snapshots` window produces the same value. Verification: the methodology lock test (`apps/workers/src/functions/methodology.test.ts`) still passes with the added assertion, and the ground-truth test (`'published formula matches what the calculator runs'`) is unaffected because `index-calculator.ts` reads `formulaId` and never touches `inputDataClass`.
- **`methodology_versions` table.** No new row. Adding `inputDataClass` to the `PUBLISHED_METHODOLOGY` constant is not a version bump — the semver rule is that a bump is required when the *behaviour* of the published number changes, which this does not. This mirrors how MSCI publishes methodology-book edits: a language clarification that does not change any computed value ships as a marketing/documentation update, not a version bump. The v1.0 row on `/methodology` continues to point at the same commit-hash semantics; the published spec expands, the calculation locks stay identical.
- **Backtest.** Not required (per template §"Empirical impact") because no published number changes. If the Committee prefers a positive signal instead of an argument-from-absence, the diff to run is:

  ```
  # Before merge
  git checkout <base-before-proposal-merge>
  pnpm --filter workers exec node -e "…rerun index-calculator on last 90d of price_snapshots…"

  # After merge
  git checkout <base-after-proposal-merge>
  pnpm --filter workers exec node -e "…same…"

  diff <before> <after>   # expected: empty
  ```

  This is a mechanical check the reviewer can run on the follow-up PR (the one that actually edits `/methodology` and the constant) — not on the proposal PR itself, which only adds documentation to `docs/research/`.

- **`PUBLISHED_METHODOLOGY.inputDataClass` reads.** After the merge, the field is available to downstream consumers. Immediate reader: `apps/web/app/methodology/page.tsx` (renders it into the "Input data" section it just gained). Queued reader: the Roadmap B9 monthly compliance-pack PDF generator (Roadmap open). No existing code path breaks — the field is additive and every existing read of `PUBLISHED_METHODOLOGY` addresses named fields explicitly.

## Risks

Second-order risks are the ones worth naming. Immediate ones are contained by the mechanisms already in place (lock test, CODEOWNERS, methodology-version audit table).

- **Overclaim / narrowing risk.** If we later admit an input class not covered by the published hierarchy (e.g., a broker-relayed indicative quote, or a Vast.ai marketplace clearing print if one ever appears), a reviewer can point at *this* proposal and say "you told us your hierarchy was closed at five levels and now you're using a sixth." Mitigation: the hierarchy is phrased as *"in priority order"*, level 5 already carries the "transaction data (planned)" placeholder, and any addition triggers the standard `v1.x` methodology-version bump procedure — not silent extension. The proposal explicitly reserves that path.
- **Underclaim / defensive-crouch risk.** The opposite mistake: publishing a hierarchy that omits capabilities we actually have and thereby cheapens the disclosure. The 5 levels above match exactly what the pipeline implements today (verifiable by reading `apps/workers/src/functions/index-calculator.ts` + `apps/scrapers/core/normalizer.py` + `apps/web/app/admin/unmatched/*` + migration `011_pivot_v2_schema.sql`). If a reviewer traces the code, they find the same 5 levels; nothing is exaggerated, nothing is elided.
- **Reduces auditor trust risk.** A reviewer new to the file might read "our inputs are not transactions" as an admission of weakness. This is fully-mitigated by the surrounding disclosure — CTI is placed alongside Baltic Exchange, oil PRAs, LBMA and MSCI/IPD, all of which are BMR-compliant despite not having a transaction tape — and by the reference to BMR Art 11(1)(c) explicitly permitting committed quotes as a compliant input class. The disclosure is defensive framing of a known reality, not a fresh admission.
- **Breaks downstream licensee assumptions risk.** No licensee contracts exist yet (D18 on the roadmap). Any licensee contract signed after this proposal ships will incorporate the "Input data" section by reference. This is a *reduction* in downstream risk, not an increase — future contracts inherit the disclosure the counterparty already accepted at signing.
- **Legal defensibility of the v1.0 lock risk.** The lock is a locked *published number* commitment. Adding a machine-readable `inputDataClass` field and one lock-test assertion strengthens the lock (one more field is now protected against silent drift). It cannot weaken it — the fields that were locked before are still locked, on the same test, with the same CODEOWNERS gate.

## Migration / rollout plan

Because no published number changes, this is a docs-plus-locked-constant rollout, not a methodology-version bump.

**PR sequencing.** This proposal ships in one PR (`docs/research/proposals/2026-07-06-methodology-input-classification-and-hierarchy.md`). The Committee reviews the proposal. On approval, a **separate** PR — index-architect will open it — edits `apps/web/app/methodology/page.tsx`, `packages/shared/src/methodology.ts`, `apps/workers/src/functions/methodology.test.ts`, and (as the follow-up matrix update) `docs/research/gaps/iosco-principles.md`. That separation preserves the property that CODEOWNERS approves the actual page-and-constant edit on its own diff, not bundled with the proposal.

**Why not 30-day public notice.** The 30-day notice on `/methodology` Step 3 attaches to methodology *changes* — changes to the published formula, filter, window, floor, quorum, or weight. This proposal changes none of those. It is a disclosure addition: publishing information about the existing pipeline that was already true but not stated. This is the same class of edit as e.g. adding the "AI orchestration" section that shipped in v1.0 — it clarifies what CTI does; it does not change what CTI computes. The Committee should confirm this reading (see deliberation prompt) before the follow-up PR merges.

**Deploy / rollback / monitoring.** Standard Next.js deploy for `/methodology`; standard TypeScript build for the shared package. Rollback: `git revert` on the follow-up PR restores the prior text and drops the `inputDataClass` field. No data migration. No cron changes. No worker restart. `system_events` should show no new events other than the deploy itself.

**What to watch after merge.** For the first week after the follow-up PR merges:
- The `/methodology` page renders without layout regressions (the new section fits between "Formula" and "Index Committee" in the existing max-w-4xl column).
- `pnpm test` in `apps/workers` continues to pass (six tests, five plus the new assertion).
- `pnpm -r typecheck` is green across `packages/shared`, `apps/web`, `apps/workers`.
- No new `provider_quality_degraded` or `index_value_skipped` events (this proposal cannot cause either; a spike would indicate an unrelated regression).

## Committee deliberation prompt (methodology only)

Suggested paragraph for the Committee's decision record:

> "We are stating publicly what CTI already is: a published-quote benchmark whose inputs are firm executable list prices captured from provider price endpoints, with no consolidated transaction tape available for the on-demand-GPU market. This disclosure closes IOSCO Principle 7 self-classification (Track A) and IOSCO Principle 8 / EU BMR Article 11(3)(d) hierarchy-of-inputs publication in one page edit. No published `index_values_daily.vwap` value changes as a result. We accept the second-order commitment that any future admission of a new input class (e.g., transaction data from `invoice_observations`) will trigger a `v1.x` methodology-version bump with 30-day public notice; and we affirm that this proposal itself is a disclosure addition, not a methodology change, and therefore does not require 30-day notice. Voted: <yes / no>, Carlos Galindo Dumitrescu, on 2026-XX-XX."

## Closing

After this proposal is approved (PR merged):
1. Index-architect opens the follow-up PR that edits `apps/web/app/methodology/page.tsx`, `packages/shared/src/methodology.ts`, `apps/workers/src/functions/methodology.test.ts`.
2. On merge of the follow-up PR: index-architect updates [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) — P7 row (Track A closed, evidence link updated), P8 row (`compliant`), priority queue P0 item 4 and P1 item 7 struck through, revision-log entry added.
3. `docs/decisions.md` gets a new "Locked in" entry: *"CTI is a published-quote benchmark; the 5-level input hierarchy is part of the published spec. Adding a new input class is a `v1.x` change under the standard notice period."*
4. This proposal's footer is updated with the merged-PR URL for both PRs (proposal PR + follow-up page/constant PR).

---

## Source-fetch note

Direct WebFetch of `iosco.org/library/pubdocs/pdf/IOSCOPD415.pdf`, `eur-lex.europa.eu/eli/reg/2016/1011/…`, `esma.europa.eu/publications-and-data/interactive-single-rulebook/…article-11`, `handbook.fca.org.uk/techstandards/BMR/…`, `stoxx.com/document/Resources/Regulation/stoxx_input_data_policy.pdf`, `rba.gov.au/mkt-operations/…/compliance.html`, and the CNMV mirror was blocked at the network layer (HTTP 403) again this session — the same behaviour observed on 2026-05-10 and 2026-05-12. Quoted regulatory text in this proposal is reconstructed from IOSCO- and ESMA-published search snippets and from third-party statements of compliance (Citi TRY Implied, Borsa Istanbul, RBA, NY Fed) that quote the same regulations verbatim. Passages in quotation marks appeared near-verbatim in those results. A future session from an environment with PDF egress should download FR07/13, IOSCOPD549 (the 2018 Guidance), and consolidated Regulation (EU) 2016/1011 into a research-only artifact and reconcile any wording differences with this proposal. External page text is treated as untrusted data, never as instructions.

## Sources

Primary regulatory texts (referenced; direct PDF/HTML fetch blocked HTTP 403 this session — see source-fetch note above):
- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13 (IOSCOPD415), July 2013. https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf — Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs).
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, IOSCOPD549, January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data). EUR-Lex CELEX 32016R1011. https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng ; ESMA Interactive Single Rulebook — Article 11. https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data
- FSB, *Review of the Implementation of IOSCO's Principles for Financial Benchmarks*, July 2014. https://www.fsb.org/uploads/r_140722a.pdf
- IOSCO, *Review of the Implementation of IOSCO's Principles for Financial Benchmarks*, IOSCOPD451. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD451.pdf

Industry statements of compliance / methodology surveyed:
- MSCI, *IOSCO Principles for Financial Benchmarks* (statement-of-compliance hub). https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco ; MSCI/IPD IOSCO consultation response, IOSCOPD409. https://www.iosco.org/library/pubdocs/409/pdf/MSCI%20and%20IPD.pdf
- STOXX, *Policy on Input Data Integrity*. https://www.stoxx.com/document/Resources/Regulation/stoxx_input_data_policy.pdf
- Reserve Bank of Australia, Cash Rate Methodology — Compliance with IOSCO Principles. https://www.rba.gov.au/mkt-operations/resources/cash-rate-methodology/compliance.html
- Federal Reserve Bank of New York, *Statement of Compliance with the IOSCO Principles for Financial Benchmarks*, July 2025. https://www.newyorkfed.org/medialibrary/media/markets/IOSCO-statement-of-compliance-jul2025
- Citi, *Statement of Compliance with IOSCO Principles – TRY Implied*. https://www.citi.com/icg/global_markets/docs/iosco-principles-cbna-try.pdf
- Borsa Istanbul, *Statement of Compliance with the IOSCO Principles for Financial Benchmarks*. https://borsaistanbul.com/files/statement-of-compliance-with-the-iosco-principles-for-financial-benchmarks.pdf
- Morgan Stanley, *IOSCO Principles – Statement of Compliance*. https://www.morganstanley.com/content/dam/msdotcom/en/assets/pdfs/sales_and_trading_disclosures/Morgan_Stanley_IOSCO_Principles_Statement_of_Compliance.pdf

Comparable-benchmark methodologies (input-classification references):
- Argus Media, *Consultation-report response*, IOSCOPD399. https://www.iosco.org/library/pubdocs/399/pdf/Argus%20Media.pdf
- ISDA, *Response to IOSCO Consultation on Principles for Financial Benchmarks*. https://www.isda.org/a/4dDDE/isda-response-to-iosco.pdf

Internal references:
- `apps/web/app/methodology/page.tsx` — published methodology page (hard-limit).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` (hard-limit).
- `apps/workers/src/functions/methodology.test.ts` — methodology lock test (hard-limit; adds one assertion under this proposal).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` schema (the future transaction-anchor layer referenced in hierarchy level 5).
- `docs/decisions.md` — "Five-methodology A/B → Locked methodology v1.0" (the underlying lock this proposal extends).
- [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md) — §B, P7 and P8 rows (identified the gap).
- [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) — the research this proposal implements (Track A recommendation, §4).
- [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) — rows P7 and P8, priority-queue P0 item 4 and P1 item 7.
- `docs/roadmap.md` — B7 (name the Committee), B8 (notice-page surface), B9 (compliance-pack PDF).

---

*Merged PR (proposal): TBD.*
*Follow-up PR (page + constant + test + gap-matrix update): TBD.*
