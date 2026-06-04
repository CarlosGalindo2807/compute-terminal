# Proposal: Self-classify CTI as a published-quote benchmark and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-06-04 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (touches hard-limit `apps/web/app/methodology/page.tsx`; no methodology constant changes) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` — adds two sections; no edits to `packages/shared/src/methodology.ts`, `PUBLISHED_METHODOLOGY`, `index-calculator.ts`, `outlier-detector.ts`, or any migration. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole Index Committee member, v1.0 charter) |
| **Effective date if approved** | On merge. This proposal makes no change to any published index value or to the formula; the 30-day public-notice window in the Committee charter applies to methodology *value* changes, not to disclosure refinements. The merged page is the disclosure. |
| **References** | IOSCO FR07/13 Principles 7 (Data Sufficiency) and 8 (Hierarchy of Data Inputs); EU BMR (Regulation (EU) 2016/1011) Article 11(1)(a), 11(1)(c), 11(3)(d); IOSCO definitions of "input data" and "transaction data"; `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`; `docs/research/gaps/iosco-principles.md` rows P7 + P8. Primary-source URLs in §References. |

## Problem

Two adjacent gap-matrix rows (P7 Data Sufficiency, P8 Hierarchy of Data Inputs) are both blocked on the same missing disclosure on `/methodology`:

- **P7 — Data Sufficiency.** CTI's inputs are scraped *firm executable list prices*, not observed trades. BMR Art 11(1)(c) reads: *"The input data shall be transaction data, if available and appropriate. If transaction data is not sufficient or is not appropriate to represent accurately and reliably the market or economic reality that the benchmark is intended to measure, input data which is not transaction data may be used, including estimated prices, quotes and committed quotes, or other values."* The 2026-05-12 research note ([notes/2026-05-12-listings-vs-transactions-iosco-p7.md](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)) concluded the inputs are *substantively committed quotes* (executable on click) anchored in a genuine arms-length cash market for GPU-hours — but that defense is only available if the methodology page *says* so. Today the page does not.
- **P8 — Hierarchy of Data Inputs.** BMR Art 11(3)(d) requires the administrator to *"draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement."* IOSCO Principle 8 articulates the canonical priority order: concluded arm's-length transactions in the underlying interest, then transactions in related markets, then non-transactional data such as firm bids and offers as adjuncts. CTI has an implicit hierarchy in code (rule → alias → fuzzy → Claude ≥ 0.95 → admin queue → outlier check → eligibility check → VWAP), but no part of it is published on `/methodology`.

The combined result is that any serious external reviewer — a fund counsel evaluating CTI for a licensing contract, an auditor running a Big Four IOSCO-compliance attestation, an ESMA examiner if and when registration is sought — would read `/methodology` today, find no explicit statement of the benchmark's input class, find no published priority of use, and reasonably ask both questions before going further. Closing the two gaps in a single page edit is the highest-leverage docs change available to the project this quarter.

Both rows are tracked at P0 in [gaps/iosco-principles.md](../gaps/iosco-principles.md). The gap matrix explicitly names this proposal as the next deliverable: *"Next: proposal for the `/methodology` self-classification + hierarchy (P7 + P8 in one edit)."*

## Proposed change

A single, additive edit to `apps/web/app/methodology/page.tsx`. **No constants change. No formula changes. No published index value changes — past, present, or future.** Two new sections are inserted between the existing "Outlier filter / Eligibility floor / Quorum" block and the "Index Committee" block (around the page's current line ~135). The intent is that a reader scrolling the page sees, in order: what we compute → what inputs we compute it from → who governs changes.

### Section to add — A. Input classification

A `<section>` titled **"Input classification"** with the following content (rendered prose, in the page's existing voice):

> *CTI is a **published-quote benchmark**. Its inputs are firm, executable on-demand list prices captured directly from provider price endpoints (Vast.ai REST, RunPod GraphQL, Lambda HTML, with hyperscalers in scope per the public roadmap). Every input is observable at the source, machine-captured with no human submission step, schema-validated by a Zod parser, and persisted to `price_snapshots` with provenance.*
>
> *On-demand compute has no public consolidated transaction tape — there is no central venue and no print feed comparable to a regulated exchange. Per EU BMR Article 11(1)(c), where transaction data is unavailable, "input data which is not transaction data may be used, including estimated prices, quotes and committed quotes." CTI's inputs are committed quotes in substance: a listed offer on a constituent provider is executable at the quoted price at the moment of capture, with no negotiation step between observation and execution. This places CTI in the same input class as oil price-reporting-agency assessments and the Baltic Exchange freight indices, both of which are EU-BMR-compliant benchmarks of real but tape-less markets.*
>
> *The benchmark is **anchored in a genuine arms-length cash market for GPU-hours**: the providers in the universe transact GPU-hours continuously at arm's length with unaffiliated buyers, and the economic interest CTI measures (the prevailing on-demand $/GPU-hour) is unambiguously real. The published number is computed by a deterministic formula with **no expert judgment** — see §"Formula" above.*
>
> *A latent transaction-data layer is on the roadmap: the `invoice_observations` schema (migration 011) is designed to anchor anonymised real-paid prices once an ingest pipeline lands. The first publication of that data will be a reconciliation report comparing the CTI list-price series to observed effective prices, not a change to the published formula. See [the listings-vs-transactions research note](../../docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md) for the full reasoning.*

### Section to add — B. Hierarchy of data inputs

A `<section>` titled **"Hierarchy of data inputs"** introducing the priority-of-use disclosure required by BMR Art 11(3)(d). The body is an ordered list of input *classes* in priority order, with the rule applied at each rung. Plain English, no apology, no caveats other than what is true:

> *In order of priority, CTI ingests:*
>
> *1. **Concluded arm's-length transactions in the underlying interest.** Not currently in the published input set. Schema reserved (`invoice_observations`, migration 011); pipeline not yet built. Will enter the hierarchy at rank 1 when ingested; the locked formula and its parameters do not change for that, but the input class is documented here for the moment it does. Any future change that admits transaction data into the published formula will go through the full Index Committee 30-day-notice procedure described below.*
>
> *2. **Firm executable quotes from provider price endpoints.** The currently-published input class. Captured directly from each provider's machine-readable price surface (REST/GraphQL/HTML) every 5 minutes, schema-validated against a Zod parser at ingest. Persisted to `price_snapshots` with `(provider_id, gpu_model_id, price_per_hour, num_gpus, captured_at, region, contract_type)` provenance. Every input value present at the source is captured; values that fail schema validation are dropped, not coerced.*
>
> *3. **Derived inputs from provider observation.** Provider `reliability_score` (computed from observed scrape success rate and observed outlier ratio over a rolling window) is a derived input used to filter, not weight, listings into the eligibility set. It is not a quote and not a transaction; it is a quality control on the input stream above. Documented as a derived input class so its role in determining the published number is explicit.*
>
> *4. **Expert judgment.** Not used in the published-number path. The Index Committee charter (§"Index Committee" below) is the only point at which human judgment enters the system, and it acts on the **methodology**, never on a single day's value. There is no expert override on `index_values_daily`; quorum failures result in a `index_value_skipped` event, never a substituted estimate.*
>
> *The published index value at day t is computed exclusively from rank-2 inputs filtered by rank-3 inputs, with no rank-4 contribution. The hierarchy above is the priority of use; the eligibility, outlier, and quorum rules in §"Formula" are how each input class is admitted, screened, and aggregated. This disclosure satisfies the published-guidelines requirement of EU BMR Article 11(3)(d) and the priority-of-use requirement of IOSCO Principle 8.*

### What is **not** changing

- `PUBLISHED_METHODOLOGY` and `PUBLISHED_METHODOLOGY_VERSION` are unchanged. The formula remains `filtered_vwap` v1.0.
- No edit to `apps/workers/src/functions/index-calculator.ts`, `outlier-detector.ts`, or `methodology.test.ts`. The lock test continues to pass identically — this proposal does not modify a single field the test guards.
- No migration. No DB row touches `methodology_versions` or `methodology_changes`; this is a *disclosure* of the existing v1.0, not a v1.1 bump. The Committee may, separately, choose to record a `methodology_changes` row of type `disclosure` to log that the disclosure expanded on this date — proposed as an option to the Committee but not as a requirement of this proposal, because the v1.0 row's `effective_from` and the page's contents are independent.
- No edit to the prior committee narrative. The 30-day-notice procedure for methodology value changes remains exactly as published.

### File-level diff summary (illustrative — actual JSX in the implementation PR)

```
apps/web/app/methodology/page.tsx
  + new <section> "Input classification"   (≈ 60 lines JSX, ~9 paragraphs of prose)
  + new <section> "Hierarchy of data inputs" (≈ 80 lines JSX, ordered list + footer)
  - no removals
  - no edits to constants, imports, version banner, formula block, or Index Committee block
```

Insertion point: between the current Quorum subsection (page closes around line 133) and the Index Committee section (currently opens at line 137). New sections render in the order `Input classification` → `Hierarchy of data inputs` → `Index Committee`, so a reader's mental model is: *what the value means → what goes in → how changes get governed*.

## Why this is the right shape (vs. alternatives)

Three other shapes were considered. Each is rejected with reasons preserved here so a future reader sees the deliberation.

**Alternative 1: Stand up the `invoice_observations` ingest pipeline first, then publish "anchored by transactions" without qualification.** Rejected — chronologically backward, and it leaves the present-day defensibility gap open for the duration of the build. The reconciliation report from real invoice data is a P1 deliverable that follows this disclosure; both can ship in parallel, but the disclosure cannot wait on the pipeline. IOSCO's own guidance (FR07/13) explicitly accepts "non-transactional data such as offers and bids" as inputs provided the hierarchy is published — the corrective action is disclosure first, then anchor.

**Alternative 2: Issue a "v1.0 IOSCO Self-Statement of Compliance" PDF as a separate artifact, leave `/methodology` unchanged.** Rejected — the public contract is the page, not a side document. MSCI, S&P, and FTSE Russell each publish their IOSCO statements as discoverable on the index page itself; the index methodology page and the IOSCO-compliance disclosure are not separable surfaces. A side PDF that says one thing while the page says another (or omits the disclosure entirely) is the worst of both worlds: it splits the contract and invites a "which document governs?" question. The PDF can come later as an attestation artifact (gap-matrix row P4, control-framework document) but it is not a substitute for the page edit.

**Alternative 3: A minimum-viable single-paragraph addition: "CTI uses firm quotes, not transaction data."** Rejected — closes P7 in form only and leaves P8 entirely unaddressed. BMR Art 11(3)(d) explicitly demands "the **priority of use** of the different types of input data," not just a class label. Doing both in one edit costs roughly the same lawyer-review time as doing one, and a half-disclosure is harder to defend than either none or the full one — a partial disclosure can be read as "they thought about it and chose not to publish the hierarchy," which is structurally worse than no disclosure at all.

The chosen shape — two new sections on `/methodology`, no formula change, two IOSCO/BMR concerns retired in a single review — is the smallest reversible PR that closes the two highest-priority quality-pillar gaps in the matrix simultaneously.

## Empirical impact

This proposal changes **no published number** — past, present, or future. The "backtest" of a disclosure-only proposal is therefore the verification that the disclosure is *descriptively accurate* of the existing behavior, not that a new behavior preserves an old number.

Two evidence-gathering tasks before merge (both read-only; a follow-up PR or the implementation PR itself will include the output):

1. **Hierarchy-accuracy audit.** Query the last 30 days of `index_values_daily` and verify that every published row was computed exclusively from rank-2 inputs (firm quotes), filtered by rank-3 inputs (`provider_reliability_score`), with zero rank-4 contributions (expert overrides). Concretely: `SELECT methodology_used, COUNT(*) FROM index_values_daily WHERE methodology_version = 'v1.0'` should return `filtered_vwap` only, and `SELECT COUNT(*) FROM system_events WHERE event_type = 'expert_override'` should be 0 over the same window. If either condition fails, the proposed disclosure is inaccurate and must be corrected before merge.
2. **Input-class audit.** Query `price_snapshots` for the same window and confirm every contributing row carries a `source_url` or `provider_id` that maps to a documented machine-readable price endpoint — i.e. every input is in fact a provider-published listing, not a synthesised or human-entered value. Any row with `source = 'manual'` or `provider_id IS NULL` would invalidate the "captured directly from provider price endpoints" claim and require correction.

Both checks are read-only against existing tables; neither requires a migration. The implementation PR will include the SQL output as a comment so a reviewer can confirm at merge time without re-running.

There is no sensitivity analysis required (no parameter is being moved), no false-positive/false-negative rate to compute (no filter is being tuned), and no coverage impact (no input is being admitted or excluded that was not already admitted or excluded). The empirical question is exclusively "is the disclosed hierarchy what the code actually does?", and the two queries above answer it.

## Risks

**Immediate risks (the merge itself).**
- *Wording precision risk.* The phrase "committed quotes" in the proposed text is load-bearing — it is the BMR Art 11(1)(c) term of art. If a fund counsel reads CTI inputs and concludes they are not in fact committed (e.g., a provider price can change between scrape and execution by more than the bid/ask spread), the disclosure overstates. Mitigation: the proposed text already says "executable at the quoted price *at the moment of capture*" rather than "executable indefinitely", which is the conservatively true statement. The Committee should confirm this framing reads as accurate.
- *Inconsistency risk if a future code change introduces a path not described here.* If, post-merge, someone adds (say) a manual price-override admin endpoint, the disclosure becomes inaccurate. Mitigation: the `methodology.test.ts` lock test already guards the formula; we should add a small parallel test that asserts `price_snapshots.source` values in the last 30 days are a strict subset of the documented input classes. Proposed as a follow-up PR; not blocking this one.

**Second-order risks (downstream effects).**
- *Reduces optionality on future methodology framing.* Once `/methodology` says "published-quote benchmark," reframing in a future review (e.g., to "hybrid quote-and-transaction benchmark" when invoice data lands) requires a Committee-approved version bump. This is the *desired* outcome — the page is a contract, not a draft — but the Committee should accept the optionality cost knowingly.
- *Invites scrutiny on the absent transaction layer.* The disclosure makes the absence of transaction data legible to any reader. This is a feature, not a bug: it is structurally better for a reviewer to ask "why no transactions?" with the answer already on the page than to discover it during diligence. The reframing of the absence as a *stated design position* (BMR-permitted committed-quote class, with a roadmapped reconciliation anchor) is the load-bearing legal argument and is precisely what this proposal exists to publish.
- *Sets a precedent that disclosure changes ship on a docs-class cadence.* Future disclosure refinements may be expected on the same cadence. Acceptable because the alternative is the disclosure surface ossifying.

**Risks not relevant to this proposal.**
- No data-corruption risk (no DB writes).
- No licensee-contract breakage risk (no value series changes; existing references to `methodology_version = 'v1.0'` continue to point at the unchanged formula and the unchanged published values).
- No `methodology_changes` row required; this is a disclosure refinement, not a methodology revision. The Committee may opt to log it for traceability but is not required to.

## Migration / rollout plan

This is a docs-class change, not a methodology change. The standard methodology rollout plan (`/_TEMPLATE.md` §"Migration / rollout plan") does not apply. The actual plan:

1. **Pre-merge:** the implementation PR runs the two read-only audits in §"Empirical impact" and includes their output. Reviewer confirms each disclosed input class matches code behaviour. Reviewer confirms wording precision on "committed quotes" and "executable at the moment of capture".
2. **Merge:** standard Vercel deploy publishes the new page. ISR refresh on `/methodology` is 300 s; the new disclosure is live within 5 minutes of merge.
3. **Post-merge (same day):** gap-matrix [iosco-principles.md](../gaps/iosco-principles.md) row P7 status moves from `partial / structurally weak` to `partial` (Track A complete; Tracks B and C remain). Row P8 status moves from `partial` to `compliant`. Revision log entry added. Priority queue item 4 (P0) is retired; P1 items shift up one slot.
4. **Follow-up — same week:** a separate PR adds the `price_snapshots.source` audit test described in §"Risks" so any future input-class drift fails CI rather than silently invalidating the disclosure.
5. **Follow-up — next quarter:** the Track B `invoice_observations` reconciliation report (P7 row) becomes the next P7 milestone. That work does not touch the page; it produces an artifact under `docs/research/reports/`.

**Rollback:** revert the merge commit on `apps/web/app/methodology/page.tsx`. The page returns to its prior state; no data, constants, or downstream artifacts are affected.

**What to monitor in `system_events` after merge:** nothing methodology-related, because nothing methodology-related changed. The only observable effect should be `methodology_page_view` events (if/when telemetry is added; not blocking).

## Committee deliberation prompt

This proposal does **not** change any published number, formula, parameter, or methodology version. It refines the *disclosure* of the existing v1.0 methodology on `/methodology` to publish two pieces of information that BMR Art 11(1)(c), 11(3)(d), and IOSCO Principles 7 + 8 require an administrator to publish:

1. The class of the benchmark's inputs (firm executable committed quotes, not transaction data, and the reason).
2. The priority of use across input classes (the published hierarchy).

The Committee is asked to consider:

> *"We are publishing on `/methodology` that CTI's inputs are firm executable list prices treated as committed quotes per EU BMR Art 11(1)(c), anchored in a genuine arms-length cash market for GPU-hours, and that the priority of use of input classes is (1) transactions [empty today, latent in `invoice_observations`], (2) firm executable quotes [the live input class], (3) derived reliability filters, (4) expert judgment [unused on the published-number path]. This disclosure changes no published value. It converts CTI's most-pressed-on weakness (no public trade tape) into a stated, BMR-permitted design position before any external licensee or auditor conversation surfaces it. Voted: <yes/no>, Carlos Galindo Dumitrescu, on 2026-06-04."*

If the Committee approves, the implementation PR is opened against this branch with the two new `<section>` JSX blocks following the prose above, the two audit queries' output in the PR description, and merges on the standard CODEOWNERS path. If the Committee declines or amends, this proposal is updated in place with the rationale and re-circulated.

## Closing

After this proposal is approved (PR merged): mark [gaps/iosco-principles.md](../gaps/iosco-principles.md) row P7 as advanced to `partial` (Track A done) and row P8 as `compliant`; bump the revision log and date the file. Update [docs/decisions.md](../../decisions.md) with a new entry "Published-quote benchmark self-classification + Art 11(3)(d) hierarchy (added 2026-06-04)" recording the decision and its rationale. Link the merged PR in this proposal's footer.

The follow-up tracking items already named in the gap matrix — Track B invoice-observations ingest + reconciliation report (P7 P1), Track C provider-count-scaled quorum (P7 P1, methodology-class), input-class CI test (P8 hardening) — remain on the queue and are not blocked by this proposal's approval or by its rejection.

---

## References

Primary regulatory texts (cited verbatim where in quotation marks; full PDF/HTML egress remained blocked at the network layer this session, as on 2026-05-10 and 2026-05-12 — the verbatim passages here were sourced from indexed search excerpts of the official documents below):

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13, July 2013. https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf — Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs).
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, IOSCOPD549, January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data). EUR-Lex CELEX 32016R1011 consolidated text. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R1011-20250117 ; ESMA Interactive Single Rulebook entry: https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data
- MSCI, *IOSCO Principles for Financial Benchmarks* (statement of compliance hub). https://www.msci.com/indexes/index-resources/iosco-principles

Internal references:

- `apps/web/app/methodology/page.tsx` — target file (hard-limit).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` (hard-limit, **not edited** by this proposal).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` schema (latent transaction layer).
- [docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md](../notes/2026-05-10-iosco-principles-applied-to-cti.md) — initial IOSCO mapping, §B P7 and P8.
- [docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) — full source survey + two-track recommendation this proposal implements (Track A).
- [docs/research/gaps/iosco-principles.md](../gaps/iosco-principles.md) — gap matrix rows P7, P8; priority queue P0 item 4.
- [docs/roadmap.md](../../roadmap.md) — B8 (notice page) and B9 (compliance pack) remain separate workstreams; this proposal does not address either directly but unblocks both by establishing the disclosure surface they will append to.

---

*Merged PR: <pending — to be linked on approval>*
