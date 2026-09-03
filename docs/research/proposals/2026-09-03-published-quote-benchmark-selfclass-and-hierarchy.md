# Proposal: classify CTI as a *published-quote benchmark* on `/methodology` and publish the data-input hierarchy

| | |
|---|---|
| **Date** | 2026-09-03 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (touches hard-limit file `apps/web/app/methodology/page.tsx`) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` — additive JSX only. No change to `packages/shared/src/methodology.ts` (`PUBLISHED_METHODOLOGY` constant untouched), no change to the calculation path (`apps/workers/src/functions/index-calculator.ts`), no change to `outlier-detector.ts`, no new migration. The methodology lock test (`apps/workers/src/functions/methodology.test.ts`) stays green by construction. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member; CODEOWNERS-gated for `apps/web/app/methodology/page.tsx`) |
| **Effective date if approved** | 2026-10-05 (32 days after 2026-09-03; ≥ 30 days per the Committee charter Step 3 on `/methodology`) |
| **References** | IOSCO Principle 7 (Data Sufficiency) and Principle 8 (Hierarchy of Data Inputs), FR07/13; EU BMR Article 11(1)(c) and Article 11(3)(d); see Sources at the foot of this file. |

---

## Problem

The gap matrix at `docs/research/gaps/iosco-principles.md` records:

- **P7 (Data Sufficiency) — status `partial / structurally weak`.** Every input to CTI is a scraped provider *listing* (an ask), not an observed trade. On-demand cloud compute has no public consolidated transaction tape. A strict IOSCO reviewer can reasonably argue that a benchmark of asking prices does not satisfy P7's "anchored by observable transactions" requirement.
- **P8 (Hierarchy of Data Inputs) — status `partial`.** The ingestion hierarchy exists in code (scrape → schema-validate → rules → aliases → fuzzy → Claude auto ≥ 0.95 → Claude admin queue 0.70–0.95 → outlier check → eligibility check → VWAP) but is not published on `/methodology`. There is zero expert judgment in the published-number path — a strong stance worth stating explicitly.

The listings-vs-transactions research note ([`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)) worked the P7 question end-to-end and concluded with an explicit recommendation for the "single next deliverable": propose a `/methodology` self-classification as a **published-quote benchmark** plus a **Hierarchy of data inputs** subsection, closing both gaps in one edit to one page. This proposal implements that recommendation.

The rolling priority queue in the gap matrix places this at P0, item #4 — the last remaining pre-drafted P0 item before any external "we are IOSCO-aligned" claim.

## Proposed change

Two additive subsections on `apps/web/app/methodology/page.tsx`, inserted after the existing "Quorum" subsection and before the "Index Committee" section. No existing text is deleted or reworded. No mathematical constant changes. The `PUBLISHED_METHODOLOGY` object in `packages/shared/src/methodology.ts` is not touched.

### Subsection 1 — "Nature of inputs" (new `<h3>` inside the existing Formula `<section>`)

Rendered text (exact prose to appear on the public page):

> **Nature of inputs**
>
> CTI is a **published-quote benchmark**. Every input row is a firm, executable on-demand list price captured directly from a provider's public price endpoint at the moment of scrape — the same price a buyer clicking "rent" would be charged. Inputs are *not* observed transactions ("customer X paid $Y for N GPU-hours"); on-demand cloud compute has no public consolidated transaction tape.
>
> This design is consistent with the *committed quotes* input class contemplated by EU BMR Article 11(1)(c), which permits input data other than transaction data — including *"estimated prices, quotes and committed quotes, or other values"* — where transaction data "is not sufficient or is not appropriate". The published number is anchored in a genuine arms-length cash market for GPU-hours: providers transact continuously with customers at the quoted prices we capture.
>
> A separately-tracked workstream (`invoice_observations`, migration 011) is designed to accept anonymised real-paid prices when licensees contribute them; a periodic reconciliation of the published quote index against observed effective prices will follow when that data exists. Until then, we do not claim unqualified IOSCO Principle 7 compliance; we classify precisely and disclose the class.

Rationale for exact wording:
- "**Published-quote benchmark**" is the load-bearing self-classification — a stated design position rather than a hidden weakness. Same pattern LBMA / Baltic Exchange use to own their input-class limitation.
- The BMR quote is verbatim from Article 11(1)(c) as reproduced across multiple regulatory-mirror sources (ESMA Interactive Single Rulebook, FCA Handbook UK-retained version). Verbatim matters: it lets an auditor drop the text into a compliance mapping without paraphrase-drift.
- "We do not claim unqualified IOSCO P7 compliance" is deliberate — honest under-claim is more defensible than an unproven boast, and mirrors the language MSCI / New York Fed use in their IOSCO statements of compliance for input classes that fall short.

### Subsection 2 — "Hierarchy of data inputs" (new top-level `<section>`)

Rendered content: an ordered list of the eight stages between a scrape and a published number, each labelled with the file where the deterministic rule lives. The point is that a reader can walk the pipeline start-to-finish without seeing a single instance of expert judgment on the published-number path.

Proposed rendered text:

> **Hierarchy of data inputs**
>
> The path from a scraped provider offer to a published index value is a fixed sequence of deterministic stages, each with a named location in the open-source code. There is no expert judgment on the published-number path.
>
> 1. **Ingestion.** Scraper writes one row per offer to `price_snapshots`, schema-validated by Zod. Offers that fail the schema are dropped, not coerced. *(`apps/workers/src/functions/scrapers.ts`.)*
> 2. **Normalization — rule.** GPU string matches a `normalization_rule` → resolved to a canonical `gpu_model_id`. *(`apps/scrapers/core/normalizer.py`.)*
> 3. **Normalization — alias.** GPU string matches a `gpu_aliases` entry → resolved. *(Same file.)*
> 4. **Normalization — fuzzy.** GPU string matches by string similarity above a fixed threshold → resolved. *(Same file.)*
> 5. **Normalization — Claude auto.** Unmatched string reaches the hourly Claude batch. **Confidence ≥ 0.95 auto-resolves** into a `normalization_rule` and back-fills. **0.70 – 0.95 queues at `/admin/unmatched`** for one-click human approval; approval writes the rule, it does not alter the current day's index value. **Below 0.70 is dropped.** *(`apps/workers/src/functions/normalize-unmatched.ts`.)*
> 6. **Outlier check.** Every 15 minutes, MAD-3σ per `gpu_model` writes `is_outlier` back to `price_snapshots`. *(`apps/workers/src/functions/outlier-detector.ts`.)*
> 7. **Eligibility check.** At 00:30 UTC nightly the index calculator selects rows where `is_outlier = false`, `provider.reliability_score ≥ 0.5`, `gpu_model ∈ index.universe`, `captured_at ∈ [t − 24 h, t)`. *(`apps/workers/src/functions/index-calculator.ts`.)*
> 8. **Aggregation.** `filtered_vwap` (weight = `num_gpus`) computes the published value. If `|E_t| < 5` for the index, no value is published; an `index_value_skipped` event is recorded. *(`packages/shared/src/methodology.ts`, function `methodologies.filtered_vwap`.)*
>
> Stages 2–5 (normalization) resolve a *string* to a `gpu_model_id`; they never edit price or quantity. Stages 6–8 (statistics + aggregation) never touch the input row's price. The only human input on the path is stage-5 admin approval of a Claude-proposed normalization rule, and that approval only creates rules for *future* snapshots — it cannot rewrite an already-published index value.
>
> This structure implements the IOSCO Principle 8 requirement that an administrator publish clear guidelines on the hierarchy of inputs and the (in our case, absent) use of expert judgment.

Rationale for exact wording:
- Each stage cites its file path — the auditor can grep and verify.
- The two closing paragraphs pre-empt the two questions a serious reviewer will ask: (a) does normalization ever touch price? (No.) (b) is there any human editorial input? (Yes but only for future rules, and structurally it cannot alter a published value.)
- IOSCO P8 verbatim requires publication of the hierarchy; publishing it *and* declaring the absence of expert judgment converts P8 from `partial` to `compliant`.

### What does not change

- No change to `PUBLISHED_METHODOLOGY` constants. Version stays `v1.0`. `filtered_vwap` still runs. The methodology lock test does not require an update.
- No new migration. `methodology_versions` and `methodology_changes` are not written to.
- No calculator behaviour change. `apps/workers/src/functions/index-calculator.ts` is unmodified.
- No change to the current or historical `index_values_daily.vwap` values.

### Version-history housekeeping

Because the published methodology text on `/methodology` changes materially even though the mathematics does not, the version-history table on the same page should carry a row noting the docs-only clarification. Two options:

**Option A (recommended):** treat this as a *docs-clarification* accompanying `v1.0` — no version bump, but insert a stand-alone row in the version-history table on `/methodology` reading `v1.0 · docs-clarification 2026-10-05 · Added "Nature of inputs" and "Hierarchy of data inputs" subsections. No calculation change.` This is a database write to `methodology_versions` (row inserted by SQL alongside the merge — see Migration plan below) that sets `formula_id = 'filtered_vwap'`, `formula_params = same as v1.0`, `rationale = "docs-clarification: published-quote self-classification + input hierarchy per IOSCO P7/P8"`, `document_url` pointing at this merged proposal's PR URL. Because `PUBLISHED_METHODOLOGY_VERSION` stays `v1.0`, `apps/web/app/methodology/page.tsx`'s "Currently in force" banner remains unchanged.

**Option B:** mint `v1.0.1` in `PUBLISHED_METHODOLOGY_VERSION`, update `methodology.test.ts`'s lock string, insert the new `methodology_versions` row with `version = 'v1.0.1'`, effective date 2026-10-05.

Option A is preferred because Option B implies a mathematical change that hasn't happened — settlement contracts written against "CTI v1.0" would ambiguously terminate. Option A preserves the v1.0 identity while giving auditors a permanent, dated record that the docs materially expanded. **Committee call at review time.**

## Why this is the right shape (vs. alternatives)

Four shapes were considered.

1. **Do nothing; wait for `invoice_observations` data before addressing P7.** *Rejected.* Waiting means every external conversation between now and then hits the same undisclosed weakness cold. The point of self-classification is that a stated limitation is defensible; a hidden one is a landmine. Also, the invoice-pipeline is weeks-to-months of work (variable 8 in REFRAME_v2); a docs edit that closes the P7 disclosure gap costs an hour of Committee review.

2. **Claim unqualified IOSCO P7 compliance in the classification.** *Rejected.* An unproven claim gets challenged. MSCI's IOSCO statement enumerates specific principles it *does* claim compliance with and specific limitations for those it does not; NY Fed's July 2025 statement does the same for the SOFR family. Both underclaim on principles they cannot yet fully evidence. CTI should follow the same pattern: precise language, no boast.

3. **Ship the classification but not the hierarchy in this proposal; batch the hierarchy separately.** *Rejected.* Same page, same reviewer, same 30-day notice window. The two-in-one edit is one Committee decision instead of two, and pairing them in-page reads more coherently — the classification names the input class; the hierarchy shows the deterministic path from that class to the published number.

4. **Add the classification / hierarchy as fields on `PUBLISHED_METHODOLOGY` and render them from the constant.** *Rejected for v1.* Sound in the abstract — data-driven pages are more auditable — but touching `PUBLISHED_METHODOLOGY` invokes the full methodology-change ceremony including the lock-test bump, migration 009-family write of a new `methodology_versions` row, and a `methodology_changes` announcement. All that machinery is designed for numeric changes; using it here would blur the meaning of "the methodology changed" in the audit trail. A future proposal that generalises `PUBLISHED_METHODOLOGY` to expose `inputClass` and `hierarchy` as first-class typed fields is worth doing once we have a second such docs-clarification to justify the abstraction — the third instance is when a helper earns its cost.

## Empirical impact

This is a docs proposal — no numeric change and no backtest is required by the template. The empirical signals we can name:

- **Methodology-lock test remains green.** `packages/shared/src/methodology.ts` is not modified. `apps/workers/src/functions/methodology.test.ts` continues to lock `v1.0 filtered_vwap windowHours=24 minObservations=5 reliabilityFloor=0.5 weight=num_gpus outlierFilter=mad_3_sigma`. Run: `pnpm --filter @compute-terminal/workers test methodology`.
- **Type-check remains green.** JSX text-node additions do not alter types. Run: `pnpm -r typecheck`.
- **Published `index_values_daily` rows are unchanged.** Zero-diff on any past or future computed number. This is the load-bearing empirical claim; it is trivially true by construction because no code that writes `index_values_daily` is touched.
- **Rendered-page contract.** The current `/methodology` page carries seven `<section>` blocks and, inside "Formula", three subordinate `<h3>` blocks (Outlier filter / Eligibility floor / Quorum). This proposal adds one new `<h3>` inside Formula ("Nature of inputs") and one new top-level `<section>` ("Hierarchy of data inputs") between the "Formula" and "Index Committee" sections. Visual: two additional blocks of prose; no layout change, no new dependency, no client-side JS.
- **Auditor-facing signal.** A P7 + P8 double-close moves the gap matrix from **5 P0 / 11 P1 / 1 P2** to **3 P0 / 10 P1 / 1 P2**, or **~40% of the pre-audit P0 backlog closed by this single PR** (P1 name-committee-member and P7+P8 self-classify+hierarchy in one).

## Risks

**Immediate.**

- *Prose drift from formula.* The new "Nature of inputs" text mentions `filtered_vwap`, `num_gpus` weighting, and the 24 h window implicitly by describing the pipeline. If the Committee ever changes any of those, the two new subsections need a coordinated update. Mitigation: the methodology-change PR checklist gets a line — "if amending `PUBLISHED_METHODOLOGY`, re-read Nature of inputs + Hierarchy of data inputs for consistency". Add this line to the proposal template on merge.
- *Confusion with a methodology change.* A reader seeing an update to `/methodology` might assume the number changed. Mitigation: the "Currently in force" banner is unchanged (still `v1.0`, same effective date); the docs-clarification row added to the version-history table (Option A above) states explicitly "No calculation change".

**Second-order.**

- *Legal defensibility of the v1.0 lock.* The lock protects the *numerical output* of the benchmark, not the accompanying prose. This change strengthens the lock's legal defensibility by adding a stated input-class self-classification — a defendant reading a licensee dispute would see a benchmark that stated its input class rather than one whose limitations had to be inferred. Net-positive on this axis.
- *Downstream licensee assumptions.* No downstream licensee exists yet (roadmap D17 is unshipped). Once licensees exist, methodology *page* changes should trigger a licensee notification even when the number is unchanged — that hook is unbuilt and out of scope here, but is worth tracking as a follow-up (`roadmap C15` webhook could carry a docs-only change event with an explicit flag).
- *Prompt-injection surface.* The new hierarchy subsection cites internal file paths verbatim. These paths are public in the open-source repo already, so no new surface is created — but an attacker who can influence one of those files could indirectly influence how the page reads. Mitigation exists already: hard-limit files are CODEOWNERS-gated to @CarlosGalindo2807.

## Migration / rollout plan

**Timeline.**

- **Day 0 (this PR merged, e.g. 2026-09-04):** proposal file lands in `docs/research/proposals/`. No user-visible change; `/methodology` page unchanged.
- **Day 1 (2026-09-05 or later):** a follow-up PR — small, single-file — edits `apps/web/app/methodology/page.tsx` to add the two subsections. That PR is gated on Committee review of *this* proposal. It ships behind an env flag (`METHODOLOGY_DOCS_CLARIFICATION_2026_10_05_ENABLED`) or a build-time constant that reads the current date and only renders the new subsections on or after the effective date.
- **2026-09-05 → 2026-10-04 (30 days):** public-notice window. During this period the *proposed text* is visible on this proposal PR (public repo), giving any future licensee 30 days to comment before it becomes part of the published `/methodology` page.
- **Day 32 (2026-10-05):** effective date. The follow-up PR's env flag flips (or the date-guard admits the render), and `/methodology` renders the two new subsections. On the same day, the `methodology_versions` row for the docs-clarification (Option A above) is inserted via a one-shot admin script (`scripts/insert-docs-clarification-version-row.mjs`, to be written alongside the follow-up PR); the row does not create a new *version* in the semver sense, so the `PUBLISHED_METHODOLOGY_VERSION` constant is unchanged.

**Deploy steps for the follow-up PR (not this PR).**

1. Edit `apps/web/app/methodology/page.tsx` to add the two subsections behind the date guard.
2. Add a JSX snapshot test (or a Playwright text-content check) verifying both new subsections render *only* on or after `2026-10-05T00:00:00Z`.
3. Merge on or after 2026-09-05.
4. On 2026-10-05, run `scripts/insert-docs-clarification-version-row.mjs` from an admin session; verify the new row appears in the version-history table on `/methodology`. (Trivial to write; ≤30 lines calling `supabase.from('methodology_versions').insert(...)`.)

**Rollback steps.**

- If, after the effective date, any language reads badly: revert the follow-up PR. The date-guard means a straight `git revert` restores the pre-edit page instantly. The docs-clarification row in `methodology_versions` can be marked with an `effective_to` date if we want to record the retraction (never DELETE).
- No data written to `index_values_daily`, `price_snapshots`, or `methodology_changes` — nothing to roll back there.

**Monitor after merge.**

- `system_events` for any new `methodology_changed` event (should be zero — this is docs, not methodology).
- `/api/health` for anything odd; the page is server-rendered with `revalidate = 300` so worst-case a stale cached version serves for five minutes after the effective date, which is acceptable.
- Committee-minutes discipline (gap matrix P18): the merge of the follow-up PR should append a one-line entry to `docs/committee-minutes/2026-10.md` (the file to be created) recording the vote.

## Committee deliberation prompt

> "We are accepting a materially expanded `/methodology` page that self-classifies CTI as a *published-quote benchmark* and publishes the eight-stage data-input hierarchy, in exchange for closing gap-matrix rows P7 (Data Sufficiency) and P8 (Hierarchy of Data Inputs) with a stated, defensible design position rather than a hidden weakness. The mathematics does not change; `PUBLISHED_METHODOLOGY` stays `v1.0`; no `index_values_daily.vwap` row past or future is affected. The trade-off favours honest self-classification and audit-ready transparency over the option to later claim unqualified P7 compliance without disclosing our input class; the underclaim is deliberate and mirrors MSCI / New York Fed IOSCO-statement practice. Voted: <yes/no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD."

## Closing

After this proposal is approved (PR merged):
- The follow-up implementation PR editing `/methodology` can be opened, subject to the 30-day-notice window.
- Update `docs/research/gaps/iosco-principles.md`:
  - Row P7: status → `partial → compliant on classification, partial on transactional anchor (invoice pipeline pending)`; priority stays P1 (Track B).
  - Row P8: status → `compliant`; priority `—`; owner action closed with link to merged PR.
  - Revision log: add a 2026-10-05 entry.
  - Rolling priority queue: drop P0 item #4 (this one); Track B (invoice reconciliation) rises to be the P7-owning follow-up.
- Update `docs/decisions.md` with a new entry titled "CTI classified as a published-quote benchmark; input hierarchy published (added 2026-10-05)".
- Link the merged PR of the follow-up (page-edit) here in a footer.

---

## Sources

**Primary regulatory texts — verbatim excerpts sourced this session.** Direct WebFetch of `www.iosco.org`, `eur-lex.europa.eu`, `www.esma.europa.eu`, and `www.legislation.gov.uk` all returned `EGRESS_BLOCKED` from this environment (same as the two prior sessions' `HTTP 403`). Verbatim passages below were reconstructed from WebSearch result excerpts of the primary URLs and cross-checked against Better Regulation, FCA Handbook, and MSCI's IOSCO Statement pages (also cited). A future session in an environment with PDF egress should download `IOSCOPD415`, the consolidated `32016R1011`, and `IOSCOPD549` (2018 Guidance) into a research-only artifact and reconcile.

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13 / IOSCOPD415, July 2013. Principle 7 (Data Sufficiency): *"The data used to construct a Benchmark determination should be sufficient to represent accurately and reliably the Interest measured by the Benchmark and should: a) Be based on prices, rates, indices or values that have been formed by the competitive forces of supply and demand … and b) Be anchored by observable transactions entered into at arm's length between buyers and sellers in the market for the Interest the Benchmark measures …"* Principle 8 (Hierarchy of Data Inputs): *"An Administrator should establish and Publish or Make Available clear guidelines regarding the hierarchy of data inputs and exercise of Expert Judgment used for the determination of Benchmarks. In general, the hierarchy of data inputs should include: … Reported or observed concluded Arm's-length Transactions in the underlying interest; … Firm (executable) bids and offers; and Other market information or Expert Judgments."* URL (egress-blocked from this session): https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, FR03/18 / IOSCOPD549, January 2018. https://www.iosco.org/library/pubdocs/pdf/ioscopd549.pdf (egress-blocked)
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data). Verbatim per WebSearch excerpt of both EUR-Lex and ESMA Interactive Single Rulebook: *"The input data shall be transaction data, if available and appropriate. However, if transaction data is not sufficient or is not appropriate to represent accurately and reliably the market or economic reality that the benchmark is intended to measure, input data which is not transaction data may be used, including estimated prices, quotes and committed quotes, or other values."* Article 11(3)(d): *"draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement."* CELEX 32016R1011. URLs (egress-blocked): https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng ; ESMA Interactive Single Rulebook: https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data
- FCA (UK), *UK Benchmarks Regulation* portal — carries the UK-retained BMR text after 2020. https://www.fca.org.uk/markets/benchmarks/regulation
- Better Regulation, *Regulation 2016/1011/EU — Benchmarks Regulation (BMR), Article 3 (Definitions)* — includes the verbatim BMR definition of an index as *"based on the value of one or more underlying assets or prices, including estimated prices, actual or estimated interest rates, quotes and committed quotes, or other values or surveys."* https://service.betterregulation.com/document/236357

**Comparable-benchmark IOSCO statements consulted for shape and language pattern.**

- MSCI, *IOSCO Principles for Financial Benchmarks* (statement-of-compliance hub). Pattern: enumerates specific principles with named limitations. https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco
- Federal Reserve Bank of New York, *Statement of Compliance with the IOSCO Principles for Financial Benchmarks*, July 2025. https://www.newyorkfed.org/medialibrary/media/markets/IOSCO-statement-of-compliance-jul2025
- Reserve Bank of Australia, *Compliance with IOSCO Principles — Cash Rate Methodology*. https://www.rba.gov.au/mkt-operations/resources/cash-rate-methodology/compliance.html
- Baltic Exchange, *Guide to Market Benchmarks* v8.3 (April 2026); methodology page. Precedent for an assessment-based benchmark of a real market with no public transaction tape, BMR-compliant on the strength of input governance. https://www.balticexchange.com/en/data-services/Methodology.html
- ICE Benchmark Administration / LBMA, *LBMA Gold Price* — precedent for a benchmark that generates its own transaction (auction fixing), the long-horizon shape of P7 compliance. https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price

**Internal references.**

- `apps/web/app/methodology/page.tsx` — the hard-limit page this proposal targets.
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant (untouched by this proposal).
- `apps/workers/src/functions/methodology.test.ts` — lock test (unchanged; still passing).
- `packages/db/migrations/009_methodology_v1.sql` — `methodology_versions`, `methodology_changes` schema; the docs-clarification row (Option A) inserts here.
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` schema (Track B, follow-up workstream).
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — first-run IOSCO map; flagged P7 as "the single most important methodological exposure".
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — third-run deep dive that produced this proposal's Track A recommendation.
- `docs/research/gaps/iosco-principles.md` — living gap matrix; this proposal targets rows P7 and P8.
- `docs/decisions.md` — locked-in decisions ledger; update on merge.
- `docs/roadmap.md` — open work items B7 (Committee membership), B8 (notice page), B9 (compliance pack).

*This file will be updated with the merged PR URL of the follow-up implementation PR once that lands.*
