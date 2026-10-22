# Proposal: Add "published-quote benchmark" self-classification + Data-Input Hierarchy to `/methodology`

| | |
|---|---|
| **Date** | 2026-10-22 |
| **Author** | index-architect (fourth run) |
| **Risk class** | **docs** (hard-limit page edit; `PUBLISHED_METHODOLOGY` constant and formula unchanged) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit per `.github/CODEOWNERS`) — no change to `packages/shared/src/methodology.ts`, `apps/workers/src/functions/methodology.test.ts`, or `index-calculator.ts`. |
| **Required reviewer(s)** | @CarlosGalindo2807 (CODEOWNERS gates `/apps/web/app/methodology/`) |
| **Effective date if approved** | **On merge.** This proposal does not change the formula, any numeric constant, any version string, or any published daily value — the 30-day public-notice period mandated by the Committee charter applies to *methodology* changes (Step 3 of the `/methodology` committee procedure) and is **not triggered** by a disclosure-only edit. See §6 for the explicit reasoning the Committee can adopt or reject. |
| **References** | IOSCO FR07/13 **Principle 7** (Data Sufficiency); IOSCO FR07/13 **Principle 8** (Hierarchy of Data Inputs); EU BMR Regulation (EU) 2016/1011 **Article 11(1)(c)** (input-data hierarchy, "committed quotes"); **Article 11(3)(d)** (publish guidelines on types and priority of input data); **Annex I** (input-data classes). |
| **Companion research** | [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) §4–5 (recommended "Track A"); [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md) §B (P7, P8); [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) rows **P7**, **P8**, and priority queue **P0 item 4**. |

---

## Problem

Two IOSCO quality-pillar principles are open at `partial` on the gap matrix with explicit next actions that converge on the same page edit:

- **P7 — Data Sufficiency.** IOSCO FR07/13 says a benchmark's inputs must be "formed by the competitive forces of supply and demand" and "anchored by observable transactions entered into at arm's length between buyers and sellers." Every CTI input today is a scraped *listing* (an executable offer price), not an observed trade. The companion note established that this is a defensible but *unclaimed* position: the inputs are firm executable quotes from a real arms-length cash market, which BMR Art 11(1)(c) explicitly admits as a fallback input class ("committed quotes"), but the `/methodology` page does not say so. Until it does, a serious external reviewer can press on P7 and we have no stated response.
- **P8 — Hierarchy of Data Inputs.** BMR Art 11(3)(d) requires the administrator to "draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement." The hierarchy exists deterministically in CTI's code (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP) but is **implicit**, not published.

The companion note's **recommended single next deliverable** (§4 Track A, §5 top row) is to close both at once in one edit to `/methodology`. That is this proposal.

A second-order problem the proposal also fixes: today's `/methodology` has no language telling a reader *what* category of benchmark CTI self-identifies as under IOSCO/BMR taxonomy. Any potential licensee lawyer or auditor reading the page has to classify it themselves; this invites the worst-case classification. Self-classifying as a **published-quote benchmark** is the LBMA / Baltic Exchange pattern of "owning the limitation" — it is the shape of the room any serious conversation with an exchange, fund, or Big Four auditor will be held in regardless, and it is better had on CTI's own terms.

## Proposed change

Insert two new sections into `apps/web/app/methodology/page.tsx` **between** the existing *Formula* section (ending with the "Quorum" subsection) and the existing *Index Committee* section. No other section is modified; the `PUBLISHED_METHODOLOGY` constant, the lock test, the formula math, and every numeric parameter stay exactly as they are.

### 1. New section — "Input classification"

Headline: `Input classification`.

Body (verbatim copy for the page):

> **The Compute Terminal Index is a published-quote benchmark.** Each `price_snapshots` row that feeds the index is a firm, executable on-demand list price captured directly from a provider's own price endpoint — the same ask that a customer would pay were they to click "rent" at the moment of capture. CTI does not use indicative submissions, expert judgment, or model-estimated prices in the published-number path.
>
> **The underlying market is transactional and arms-length.** On-demand GPU rental is a continuously-traded, competitive cash market across the eligible provider universe. CTI's inputs are therefore anchored in a genuine arms-length transactional market in the sense of IOSCO FR07/13 Principle 7 — but the inputs themselves are *firm executable quotes*, not records of individual trades, because on-demand compute has no public consolidated transaction tape.
>
> **This matches EU BMR Art 11(1)(c).** Where transaction data "is not sufficient or is not appropriate," the Benchmarks Regulation expressly permits input data that "is not transaction data … including estimated prices, quotes and **committed quotes**, or other values" (Regulation (EU) 2016/1011, Art 11(1)(c); Annex I category (c) *committed quotes*). CTI uses the strictest tier below transaction data: firm, executable, machine-captured quotes. There is no expert-judgment layer.
>
> **Transactional anchor — roadmap.** The schema in `packages/db/migrations/011_pivot_v2_schema.sql` reserves an `invoice_observations` table for anonymised real-paid prices by `(provider, gpu_model, customer_spend_band, contract_type)`. Once the ingest pipeline is live, CTI will publish a periodic reconciliation of the published quote-index against observed effective transaction prices from that table, as a transparency artifact. Admitting invoice observations as a weighted input class above listings would be a methodology change — any such future proposal follows the Committee process below, with a backtest.

### 2. New section — "Hierarchy of data inputs"

Headline: `Hierarchy of data inputs`.

Body (verbatim copy for the page):

> Each raw provider offer passes through a deterministic hierarchy on its way into the index. No tier below is reached unless every tier above has yielded no match. All stages run in code; no stage uses expert judgment to set a published number.
>
> 1. **Capture — firm executable quotes.** Scraper agents read provider price endpoints every ≤5 minutes and persist the raw offer to `price_snapshots`. Each row is schema-validated against a Zod parser; rows that do not match are dropped, not coerced.
> 2. **Normalisation (deterministic).** The provider's GPU string is resolved against `normalization_rules` (exact rule → alias → fuzzy match ≥ 0.9).
> 3. **Normalisation (model, auto).** Strings unresolved after step 2 drain hourly through a Claude Sonnet batch. Only predictions at confidence **≥ 0.95** are written back as a new `normalization_rule` and back-fill prior snapshots. The *model's output is never a published-number input*; it only produces a deterministic rule for subsequent passes.
> 4. **Normalisation (model, human-approved).** Predictions at confidence **0.70–0.95** are queued at `/admin/unmatched` for one-click human approval. Below 0.70 they stay unmatched.
> 5. **Outlier filter.** `is_outlier(i) ⇔ |p_i − median(P_g)| > 3 · MAD(P_g)` over the per-GPU-model 1-hour window (unchanged — see *Formula* above).
> 6. **Eligibility filter.** `reliability(provider_i) ≥ 0.5` (unchanged).
> 7. **Quorum gate.** `|E_t| ≥ 5` or no value is published for the day (unchanged).
> 8. **VWAP.** The published value is `Σ(p_i · q_i) / Σq_i` over all eligible offers in the trailing 24h, weighted by `num_gpus` (unchanged).
>
> Mapped onto EU BMR **Annex I** input-data categories: steps 1–4 produce category **(c) committed quotes** (firm, executable). Category (a) *contributor transactions*, category (b) *the price at which the Administrator has committed to deal*, and category (d) *indicative quotes or expert judgements* are not currently used. Expert judgement is not used anywhere in the published-number path.

### What this proposal is NOT changing

- `packages/shared/src/methodology.ts` — the `PUBLISHED_METHODOLOGY` object. Untouched.
- `apps/workers/src/functions/methodology.test.ts` — the lock test. Untouched. All five of its assertions (`v1.0` / `filtered_vwap` / `mad_3_sigma` / `windowHours === 24` / `weight === 'num_gpus'`) remain correct by construction after the proposal is merged.
- `apps/workers/src/functions/index-calculator.ts` — the index calculator. Untouched.
- `packages/db/migrations/*` — no new migration. The reference to `invoice_observations` is to the already-shipped migration 011.
- Every daily value in `index_values_daily` from v1.0 forward — unchanged. The proposal describes the existing system more precisely; it does not change what the system does.
- `PUBLISHED_METHODOLOGY_VERSION` — remains `v1.0`. The Committee may optionally choose to bump a *docs-only* micro-version (e.g. `v1.0.1-docs`) in `methodology_versions` to record the publication date of the clarification, but this is at Committee discretion and is not part of this proposal.

## Why this is the right shape (vs. alternatives)

Three alternatives were weighed against the chosen design before converging on it in the companion note. Restated here so the Committee's decision record is complete.

**Alternative A — stay silent on P7/P8 ("fix it when a licensee asks").** Zero code change; the system already satisfies the substance of Art 11(1)(c). *Rejected.* The licensee / auditor conversation happens with CTI's silence as the starting posture — the reviewer classifies CTI unilaterally, almost always to the more conservative class, and the correction then costs trust rather than earning it. The companion note (§3a Baltic Exchange) documents that assessment and quote-based benchmarks that *own the classification* in their methodology are the ones that get through regulator and derivatives-market acceptance; the ones that stay silent get re-classified for them.

**Alternative B — build the invoice-observation ingest pipeline first, then publish once CTI has real transaction data.** The theoretically-cleanest path. *Rejected as the first step.* It is listed as Track B in the companion note and remains the right next infrastructure workstream; the gap matrix already schedules it as P1. But it is weeks of ingest + redaction engineering, blocking any P7 disclosure the whole time, and the proposal in this file is the right **predecessor** — it (a) names the current input tier precisely, so the invoice work has a stated hierarchy to slot into, and (b) gives the Committee a documented position to defend during the engineering window.

**Alternative C — change the formula to incorporate a quote-vs-transaction weighting (methodology change, v1.x).** The destination the Committee may eventually choose if invoice data proves tracking-reliable. *Explicitly out of scope here* — such a change requires a backtest, 30-day notice, and a full methodology-class proposal, and prejudging it today would commit the Committee to work before the data exists to inform it.

The chosen shape — docs-only edit that self-classifies and publishes the already-implicit hierarchy — is the smallest reversible change that closes P7 (Track A) and P8 together, is auditable in a single diff, risks no numeric drift, and establishes the position Track B will later reconcile against.

## Empirical impact

Per the template: "For infrastructure / governance / docs — describe the empirical signal that says 'this works' or 'this doesn't change anything that shouldn't change'."

**What changes empirically:** nothing in the published-number path. The proposal is purely descriptive text added to a web page.

**Signals that prove nothing-that-shouldn't-change does change:**

1. **Methodology lock test continues to pass.** `apps/workers/src/functions/methodology.test.ts` asserts `PUBLISHED_METHODOLOGY_VERSION === 'v1.0'`, `.formulaId === 'filtered_vwap'`, `.outlierFilter === 'mad_3_sigma'`, `.windowHours === 24`, and `.weight === 'num_gpus'`. The proposal touches none of those fields; the lock test must continue to pass. Any PR implementing this proposal that fails the lock test is implementing it wrong and must be rejected.
2. **Typecheck continues to pass.** `pnpm -r typecheck` compiles `apps/web/app/methodology/page.tsx` against the unchanged `PUBLISHED_METHODOLOGY` import. New JSX blocks referencing `PUBLISHED_METHODOLOGY.minObservations`, `.reliabilityFloor`, etc. must bind to the same constants that today's page uses — no new fields are introduced.
3. **No row in `index_values_daily` changes.** The daily publisher reads `PUBLISHED_METHODOLOGY.formulaId`, not the page text. By inspection: there is no code path in `apps/workers/src/` or `packages/` that reads `apps/web/app/methodology/page.tsx`. The page is a view, not a config.
4. **No new `methodology_changes` row.** The 30-day-notice workflow is driven by inserts to `methodology_changes`; this proposal inserts none. §6 below records the Committee's reasoning for treating a disclosure-only edit as outside the notice workflow.

**Signals that confirm the proposal "works" at its stated purpose:**

- A fresh reader opening `/methodology` can, within one scroll, (a) identify CTI's input-data class under BMR Annex I and (b) see the hierarchy of ingestion stages from scrape to publication. Today they can do neither.
- A gap-matrix revision pass flips rows P7 (Track A) and P8 from `partial` to `partial → compliant on disclosure`, with the next open subtasks on P7 narrowing to Track B (invoice-observation infra, P1) and Track C (scaled quorum, methodology-class). The gap matrix revision log should be updated in the same PR.

## Risks

**Immediate (test / build / data) risks.**
- *Risk:* A sloppy implementation of this proposal accidentally re-wires `PUBLISHED_METHODOLOGY` or introduces a hidden runtime dependency from the page to the published-number path. *Mitigation:* the methodology lock test and `pnpm -r typecheck` both run in CI (`.github/workflows/ci.yml`); CODEOWNERS requires @CarlosGalindo2807 on the hard-limit path; reviewer-level diff inspection is the final check. There is no plausible way to break the published number via this proposal that survives those three gates.
- *Risk:* The new copy references `invoice_observations` as a roadmap item; a reader could interpret this as a *commitment* to admit it as an input class. *Mitigation:* the copy says the pipeline will "publish a periodic reconciliation" (transparency), not that invoice observations will become a weighted input class. The copy explicitly flags that admitting them is "a methodology change — any such future proposal follows the Committee process below, with a backtest."

**Second-order (external / strategy) risks.**
- *Risk:* Explicitly self-classifying as a *published-quote* benchmark concedes ground to a stricter reviewer who insists on anchoring to actual trades. *Mitigation:* the companion note (§3a–d) documents that this is the position several widely-cited IOSCO/BMR-compliant benchmarks (Baltic indices, oil PRAs, NCREIF/IPD) occupy. "Published quote" is not a demoted position — it is a defined and defended position under BMR Annex I (c). The alternative is being classified silently by someone else.
- *Risk:* A future invoice-observations rollout surfaces that CTI list prices systematically overstate transacted prices (common for on-demand compute when enterprise discounts are generous). *Mitigation:* this proposal does not predict a specific tracking error; the eventual reconciliation report publishes whatever the data shows. CTI's thesis survives most plausible tracking-error shapes because the stated interest ("the published on-demand quote CTI's inputs are drawn from") is itself what the index measures. If tracking error turns out to be very large and asymmetric, that is a Committee / Track B conversation, not a reason to delay the disclosure that makes the conversation possible.
- *Risk:* Reduced auditor trust if an auditor interprets the new section as an admission that CTI *was* non-compliant before the clarification. *Mitigation:* the gap matrix (P7 row) and both research notes have carried an in-repo diagnosis of the gap since 2026-05-10; the written record shows an administrator diagnosing the gap and systematically closing it, which is the pattern an IOSCO reviewer wants to see.
- *Risk:* Downstream licensee contracts (none exist today, but future) reference "the published methodology at `/methodology`" by text; this proposal changes that text. *Mitigation:* no methodology constant, formula, parameter, or published value changes; licensee-material changes to the methodology are governed by the Committee charter's 30-day notice (Step 3 of the on-page procedure), which this edit does not trigger. The Committee may at its option announce the clarification on the forthcoming notice page (Roadmap B8); see Migration below.

## Migration / rollout plan

This is a docs-only edit; the methodology-change template's 30-day migration flow does not apply. Deploy and rollback steps:

- **Deploy** — merge the PR implementing this proposal. Vercel rebuilds `apps/web`. `/methodology` renders the new sections on next ISR revalidate (300s).
- **Rollback** — revert the merge commit. No DB migration, no data back-fill, no cache invalidation.
- **Monitor** after merge:
  - `system_events` for any new `methodology_changed` events — expected count: **0**. Any event here would indicate accidental coupling of the page to the methodology-change audit trail, which this proposal does not touch; investigate.
  - CI `test` job on main after merge — the methodology lock test must stay green. If it ever reports red post-merge, revert.
- **Follow-ups queued for subsequent sessions / PRs** (not blocking this one):
  - Gap-matrix revision log entry (included in the same PR as this proposal — the gaps file is docs, not hard-limit).
  - When Roadmap **B8** (notice page for proposed changes) ships, the Committee may at its option post a backdated notice reading "2026-10-22 — methodology clarification: added published-quote classification + data-input hierarchy to `/methodology`; no change to published values," as a belt-and-braces record. Not required for this proposal to merge.
  - When Roadmap **B9** (compliance pack PDF) ships, the hierarchy from this proposal becomes a direct source of the pack's "Input data classification" section.

## Committee deliberation prompt

A short paragraph the Index Committee can paste into its decision record:

> **Deliberation (2026-10-22):** We considered whether to classify CTI's input data publicly on `/methodology`. The input layer is unchanged — firm executable list prices scraped mechanically from provider endpoints, aggregated by filtered 24h num_gpus-weighted VWAP under `v1.0`. We are self-classifying as a *published-quote benchmark* per IOSCO FR07/13 Principle 7 and EU BMR Art 11(1)(c) / Annex I category (c), and publishing the ingest hierarchy to satisfy Principle 8 / Art 11(3)(d). This is a disclosure of the existing system, not a change to it. The formula, every numeric parameter, and every published daily value remain fixed under `v1.0`. We therefore treat this as effective on merge rather than triggering the 30-day notice period that applies to methodology changes. Voted: **<yes/no>**, Carlos Galindo Dumitrescu, on **2026-__-__**.

## Closing

After this proposal is approved (PR merged):

1. **Implement.** A follow-up PR edits `apps/web/app/methodology/page.tsx` to insert the two sections verbatim from §Proposed change. That PR will again touch the hard-limit path and will go through CODEOWNERS; its diff is purely additive JSX. CI must stay green.
2. **Update `docs/decisions.md`** with a new entry: "P7 self-classification + input hierarchy published (2026-__-__)" — what / why / what we'd reconsider.
3. **Update `docs/research/gaps/iosco-principles.md`** rows P7 and P8 to `partial → compliant on disclosure`, with the open subtasks narrowed to Track B (invoice-observation infra) and Track C (scaled quorum). The gap-matrix revision log should record the merged proposal's PR link.
4. **Update `/methodology` version-history table** only if the Committee decides to record a docs micro-version in `methodology_versions`. Default: no row; `PUBLISHED_METHODOLOGY_VERSION` stays `v1.0`.
5. **Queue for next week's run:** scaled-quorum backtest (companion note §4 Track C) — read-only analysis against `index_values_daily` / `price_snapshots`, output as `docs/research/notes/<date>-scaled-quorum-backtest.md`. That feeds a *methodology-class* proposal (v1.x candidate) once the Committee is ready.

**Merged PR link (to be filled after merge):** _TBD_

---

*Companion research:* [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md), [`notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md), [`gaps/iosco-principles.md`](../gaps/iosco-principles.md).

*Source-fetch note:* As in the previous two index-architect sessions (2026-05-10, 2026-05-12), direct network access to `iosco.org`, `eur-lex.europa.eu`, `esma.europa.eu`, and `legislation.gov.uk` returns HTTP 403 at the egress proxy for this environment. The regulation text quoted above matches wording confirmed via search-engine snippets from the ESMA Single Rulebook and `legislation.gov.uk` retained-law pages for Art 11(1)(c) ("estimated prices, quotes and committed quotes") and Annex I (categories (a)–(d), including "(c) committed quotes" and "(d) indicative quotes or expert judgements"), and from IOSCO's own public summaries of FR07/13 Principle 7 ("anchored by observable transactions entered into at arm's length between buyers and sellers"). A future session with unrestricted PDF egress should download FR07/13 (IOSCOPD415) and the EUR-Lex consolidated Regulation (EU) 2016/1011 and reconcile any phrasing differences; the material claims — the Annex I category list and the Art 11(1)(c) hierarchy — are structurally stable across these sources.
