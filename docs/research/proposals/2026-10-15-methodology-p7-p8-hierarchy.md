# Proposal: `/methodology` — published-quote self-classification + Hierarchy of Data Inputs (IOSCO P7 + P8)

| | |
|---|---|
| **Date** | 2026-10-15 |
| **Author** | index-architect (fourth run) |
| **Risk class** | governance / docs — touches a hard-limit surface (`/methodology`), but does **not** change `PUBLISHED_METHODOLOGY` or any published numeric value |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit) · `docs/research/gaps/iosco-principles.md` (status rows P7, P8, P14, P19) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member) |
| **Effective date if approved** | Public-notice merge date (no 30-day waiting period: the `PUBLISHED_METHODOLOGY` constant and every computed number remain unchanged — this is a disclosure addition, not a methodology change under Committee Charter Step 3) |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs), Principle 14 (Submitter Code of Conduct), Principle 19 (Cooperation with regulatory authorities) · EU BMR Reg. (EU) 2016/1011 Article 11(1)(a), 11(1)(c), 11(3)(d) · Prior research: [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md), [`notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md) · Gap matrix: [`gaps/iosco-principles.md`](../gaps/iosco-principles.md) rows P7, P8, P14, P19 |

---

## Problem

The gap matrix carries four open rows on `/methodology` that are all a single-paragraph disclosure addition each. Three (P7, P8, P16) are flagged **P0** in the rolling queue; two of them (P7, P8) have the research done and queued as "write the proposal." Two more (P14, P19) are flagged as needing a one-paragraph n/a declaration on the same page. All four touch the same hard-limit surface, so bundling them into one proposal is the right unit of work — it closes the single highest-leverage docs gap on the quality-pillar axis of the IOSCO map in one page edit, under one Committee approval, with one 30-day-notice clock that is **not actually required to run** because the published numeric contract (`PUBLISHED_METHODOLOGY`) is not changing.

The specific gaps this proposal closes:

- **P7 (Data Sufficiency) — `partial / structurally weak`.** `/methodology` does not explicitly disclose that CTI inputs are *executable published quotes*, not observed trades. A strict IOSCO reviewer can press on this. The research note of 2026-05-12 established that the position is defensible once stated (comparable to Baltic Exchange assessments, oil-PRA MOC fixes, and MSCI/IPD appraisal indices — all IOSCO-compliant without a public trade tape) but today it is unstated, which forces the reader to reverse-engineer it from the formula.
- **P8 (Hierarchy of Data Inputs) — `partial`.** The ingestion hierarchy (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier filter → eligibility floor → VWAP) exists only in code. EU BMR Art 11(3)(d) explicitly requires the administrator to "draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement." This is a disclosure obligation, not a logic change.
- **P14 (Submitter Code of Conduct) — `n/a`.** CTI has no Submitters in the LIBOR panel-bank sense — inputs are scraped from provider endpoints — but the non-applicability is not yet documented, so the reader has to infer it.
- **P19 (Cooperation with regulatory authorities) — `n/a until regulated`.** CTI is not ESMA-registered or FCA-supervised today, and the conditional commitment ("will cooperate if and when registered") is not published.

## Proposed change

Add three disclosure subsections to `apps/web/app/methodology/page.tsx`, after the existing "Quorum" subsection and before the "Index Committee" section. Nothing is removed; no existing paragraph is reworded; no exported constant changes. The additions are plain prose with the same JSX structure as the surrounding sections (`<h3 className="display mt-10 text-xl">` + `<p className="mt-3 text-ink-secondary">` siblings; monospace blocks where a formal statement is appropriate).

### §1. New subsection — "Data-input classification" (addresses P7)

Verbatim text to render (first-person-plural tense matches the rest of the page):

> **Data-input classification.** The Compute Terminal Index is a **published-quote benchmark**. Its inputs are firm, executable on-demand list prices captured directly from provider endpoints — closer in substance to the "committed quotes" permitted by EU Benchmarks Regulation Article 11(1)(c) than to indicative submissions. On-demand compute has no public consolidated transaction tape; where observed transaction data is available in the future (see the Hierarchy of data inputs below, class 0) it will be preferred over listings. The benchmark is anchored in a genuine arms-length cash market for GPU-hours; the published number is computed with no expert judgment and no manual override.
>
> This classification is consistent with IOSCO's acceptance (FR07/13, Principle 7) that "Administrators may rely on non-transactional data such as offers and bids … for purposes of constructing an individual Benchmark determination" when such data is used systematically and the hierarchy is published, and with comparable IOSCO-compliant benchmarks that operate on quotes rather than trades (Baltic Exchange freight indices, Platts/Argus Market-on-Close oil assessments, MSCI/IPD appraisal-based property indices).

### §2. New subsection — "Hierarchy of data inputs" (addresses P8 and BMR Art 11(3)(d))

Render as an ordered list of classes with a short deterministic rule attached to each. Verbatim text:

> **Hierarchy of data inputs.** When the Index Committee considers a methodology version, it ranks input classes in the following order. Only one class (class 2) feeds the currently-published v1.0 formula; the other classes are either empty today or research-only. The ranking is the published preference order the committee will apply in any future revision.
>
> | # | Class | Status in v1.0 | Deterministic rule |
> |---|-------|----------------|---------------------|
> | 0 | **Observed transactions** — invoiced, arms-length, counterparty-confirmed. Schema at `invoice_observations` (migration 011). | Table exists; empty. Not yet used. | Preferred where available. Admitting as an input class is a methodology change requiring Committee review. |
> | 1 | **Firm executable quotes with proven fill** — a listing that is observable as near-full / committed. Research-only; not an input class today. | Not used. | Candidate signal from provider utilisation fields (e.g. Vast.ai `time_remaining`). |
> | 2 | **Firm executable list prices** — scraped provider endpoints; schema-validated; outlier-filtered; eligibility-floored. This is the input class that produces the published number. | **Sole input class in use.** | `is_normalized ∧ ¬is_outlier ∧ reliability(provider) ≥ 0.5 ∧ gpu_model ∈ universe`, within a 24h window. |
> | 3 | **Indicative or non-executable quotes** (e.g. "contact us", "from $X"). | Dropped. | Rejected at the Zod ingestion schema; never enters `price_snapshots`. |
> | 4 | **Expert judgment / discretionary override.** | Not used. | **No expert judgment path exists in the published-number pipeline.** Any future override would require a methodology change, a `methodology_versions` row, a 30-day public notice, and an audit entry in `methodology_changes` — the same procedure as any other version bump. |
>
> Within class 2, the ingestion sub-ordering (rule → alias → fuzzy match → LLM-normalized ≥ 0.95 confidence → LLM-normalized 0.70–0.95 to admin queue) determines **catalog mapping**, not price. Price contributes to the index only after a row is in `price_snapshots` with `is_normalized = true` and has passed the outlier filter, reliability floor, and quorum tests above. Expert judgment is used in the admin queue only to confirm a GPU-model match for strings the LLM found ambiguous; it is never used to accept, reject, or adjust a price.

### §3. New subsection — "Non-applicable principles" (addresses P14, P19)

Render as a short two-paragraph block:

> **Submitter Code of Conduct (IOSCO Principle 14) — not applicable.** CTI has no "Submitters" in the panel-bank sense. All inputs are mechanical reads of provider-published prices and are schema-validated before storage; no human submits a price. Principle 14 therefore does not apply to CTI v1.0. If CTI ever admits panel-contributed data (none planned), a Submitter Code of Conduct will be drafted and published before that data enters the published number.
>
> **Cooperation with regulatory authorities (IOSCO Principle 19) — conditional.** CTI is not an ESMA-registered benchmark under EU BMR, nor an FCA-supervised benchmark under UK BMR, nor registered under any equivalent regime, as of the version date on this page. The administrator commits that if the benchmark is used as a reference in a regulated instrument such that registration is required (per EU BMR Art. 29, UK BMR Art. 29 or equivalent), the administrator will apply for the appropriate registration and will cooperate with the competent authority on all requests consistent with that registration.

### Collateral updates

- Update `docs/research/gaps/iosco-principles.md`:
  - Add 2026-10-15 revision-log entry.
  - P7: status `partial / structurally weak` → `partial` with the strict-reviewer caveat moved to the evidence cell (classification now published; Track B invoice anchor still outstanding).
  - P8: status `partial` → `compliant` once the subsection ships (hierarchy will be published).
  - P14: status `n/a` evidence cell gains "declared n/a on `/methodology` as of v1.0.1 docs bump."
  - P19: same, for P19 row.
  - Rolling priority queue: P0 item 4 moves to a "shipped on merge of this proposal" strike-through; P1 item 7 (bundled P8) same.

- No change to `packages/shared/src/methodology.ts`. No change to `methodology_versions` or `methodology_changes` schemas. No new migration. No change to `apps/workers/src/functions/index-calculator.ts`, `outlier-detector.ts`, or `methodology.test.ts`. The lock test should continue to pass without a single character edited.

## Why this is the right shape (vs. alternatives)

Three alternatives were considered.

**Alt 1 — Split into four separate proposals (one per principle).** Rejected because the four edits touch the same page in the same release, the research justifying each is already written, and splitting multiplies the review surface by 4× without reducing the risk of any one. The 2026-05-12 note explicitly recommended bundling P7+P8 into one page edit; folding in the two cheap n/a declarations (P14, P19) is a free extension that cleans up the four n/a rows in the matrix at the same time. A fund lawyer or auditor reading `/methodology` for the first time benefits from seeing the whole input-data story in one place rather than discovering class-2 inputs on page X and the non-applicability of class 4 submitters on page Y.

**Alt 2 — Treat this as a methodology version bump (`v1.0` → `v1.0.1`) requiring 30-day public notice.** Rejected because the Committee Charter Step 3 ("public notice before taking effect") is defined against *methodology changes* — things that would make `index_values_daily.vwap` compute to a different number. This proposal changes no constant, no formula, no filter, no eligibility rule, no quorum, and no universe. Every historical row remains byte-identical. The methodology lock test, which is the mechanical contract that enforces the 30-day gate, does not fail against this change — because `PUBLISHED_METHODOLOGY` is untouched. The right analogy is **MSCI's rendering of its methodology document**: MSCI updates index-methodology PDFs with wording improvements continuously under a document-versioning scheme that is separate from methodology effective-date changes. We follow that pattern: a documentation revision does not re-start the 30-day clock, but it does still require Committee sign-off (because `/methodology` is a hard-limit surface) and does update the `methodology_versions.document_url` pointer and the version-history table on the page footer.

**Alt 3 — Do the P7 self-classification only; defer P8/P14/P19 to later proposals.** Rejected because P8 is the companion gap that the 2026-05-12 note identified as logically inseparable (the self-classification only lands if the reader can see the hierarchy that justifies it; otherwise "we are a published-quote benchmark" is an assertion without evidence). P14 and P19 are each half a paragraph. There is no cost saving in deferring them and real cost in a reader seeing a map with four open n/a rows next to the published spec.

The chosen shape — one PR, one page edit, one Committee approval — is the smallest reversible change that closes the four rows. If the Committee rejects any single §, the merge-smaller fallback is well-defined: delete the offending `<section>` from the PR and merge the rest.

## Empirical impact

This is a documentation change, so the empirical signal is "nothing that shouldn't change, changes."

- **`PUBLISHED_METHODOLOGY` constant.** Expected diff: 0 bytes. Validation: `methodology.test.ts` passes with no edit.
- **`index_values_daily.vwap`.** Expected diff: 0 rows affected. Validation: a `SELECT COUNT(*)` over `index_values_daily` yields the same row count and the same per-day vwap values before and after merge.
- **`gpu_prices_daily.vwap`.** Same.
- **`methodology_versions` table.** Expected diff: `document_url` on the v1.0 row may be updated to point at the newly-rendered `/methodology` URL fragment, if we choose to version-stamp the documentation revision; otherwise 0 rows affected. The row's `formula_id`, `formula_params`, `effective_from`, `approved_by`, and `approved_at` are untouched.
- **`methodology_changes` table.** 0 rows affected (no methodology-change event is being emitted; this is a documentation revision, not a formula change).
- **`/methodology` rendered output.** Three new `<section>` blocks render. Rest of the page is byte-identical.
- **Public-facing diff summary a licensee or auditor would read:** "You now disclose three things that were previously implicit: your input class, your preference order, and the non-applicability of P14/P19. Your number is unchanged."

No backtest is required because no formula parameter is being changed. If the Committee wishes to see a backtest anyway as a *control*, the natural one is: compute `filtered_vwap` over the last 90 days of `price_snapshots` twice — once at the current `packages/shared/src/methodology.ts` and once at a build that only contains the `/methodology` page diff. The two series will be identical to float precision because the published-formula code path is unmodified.

## Risks

**Immediate (first-order) risks:**

- **R1 — Phrasing a disclosure in a way that later binds the Committee to a shape it hasn't yet agreed.** Specifically, the "class 0 preferred where available" language in §2 could be read as a commitment to admit `invoice_observations` as an input class at some future date. Mitigation: the row explicitly says "Admitting as an input class is a methodology change requiring Committee review." The hierarchy publishes the *preference order* the Committee would apply if it chose to admit the class, not a commitment to admit it. If the Committee prefers a strictly narrower phrasing — "class 0 is reserved for a future Committee decision" — the single row's deterministic-rule cell is a one-line edit on the PR.
- **R2 — Rendering regression in `apps/web/app/methodology/page.tsx`.** Mitigation: `pnpm -r typecheck` must pass before push; the diff is pure JSX in the existing component structure (no new imports, no new props, no new state); a Vercel preview will render the exact page before merge.
- **R3 — Over-promising on P19 "cooperation."** Mitigation: the phrasing is deliberately conditional ("if … is required, the administrator will apply … and will cooperate consistent with that registration"), tracks the normative BMR Art. 29 language, and does not pre-commit to a specific regime, timeline, or jurisdiction.

**Second-order risks (reduced auditor trust / downstream licensee impact):**

- **R4 — A strict reviewer still presses on P7 after the self-classification.** This is the structural weakness that the 2026-05-12 note already named: the self-classification mitigates it; it does not eliminate it. The *elimination path* is Track B (standing up `invoice_observations` ingest + publishing a reconciliation report) which is a separate workstream and is explicitly out of scope here. The proposal narrows the attack surface from "they haven't thought about trades vs. quotes" to "they've thought about it, they've classified correctly, the Track B pipeline is on their roadmap." That is a materially better position for a licensee conversation than today's silence, which is exactly the point. The proposal does **not** claim unqualified P7 compliance.
- **R5 — Setting a precedent that `/methodology` can be edited without the 30-day notice.** Mitigation: this proposal is explicit that the Committee Charter Step 3 clock is defined against *methodology changes* (changes that would alter a published numeric output), not documentation revisions. The precedent set is a narrow one: documentation that does not alter `PUBLISHED_METHODOLOGY` or the `methodology.test.ts` lock does not trigger the 30-day gate but still requires Committee sign-off via PR review. If the Committee prefers a stricter rule — "any `/methodology` page edit, including docs, requires 30-day notice" — the proposal can be merged with an effective date 30 days after approval instead. This is a Committee choice, not a technical constraint.

## Migration / rollout plan

Documentation revision; no methodology change. Steps:

1. **Pre-merge.** PR renders a Vercel preview of `/methodology` showing the three new subsections. @CarlosGalindo2807 reviews. If approved, the PR is merged to `main`.
2. **On merge.** The new text is live on `/methodology`. No cron, no event, no row insert is triggered. `pnpm -r typecheck` and `pnpm test` must be green before merge (both are green pre-change; the diff is pure JSX in an existing component).
3. **Record of the revision.** Append a one-line entry to the `methodology_versions.document_url` field on the v1.0 row (optional; discuss in review) linking the merged PR as the audit trail for the documentation revision. The `effective_from` and `approved_by` fields on the v1.0 row are unchanged — the *methodology* is still v1.0 and still approved by the founding Committee charter. The *documentation* of v1.0 is being revised; the version-history table on `/methodology` can show this as "v1.0 (doc rev. 2026-10-15)" or similar if the Committee wants explicit documentation versioning. (If so, a tiny schema concern: `methodology_versions` has no `document_revision` column today; the simplest route is to keep this in Git history and the PR URL alone, no schema change.)
4. **Gap-matrix update.** The same PR updates `docs/research/gaps/iosco-principles.md` rows P7, P8, P14, P19 and the rolling priority queue, with a 2026-10-15 revision-log entry.
5. **Monitor after merge.** No new metric to watch — this is a static page edit. If a future reader (external audit, licensee, regulator) presses on P7, the response is the published subsection + the pointer to the 2026-05-12 note.
6. **Rollback.** Revert the PR. Rolling back a text addition is a `git revert` with no state cleanup, no cron pause, and no data migration.

## Committee deliberation prompt

(This block is included even though no numeric change is being voted on, because the hard-limit edit still requires Committee sign-off; the Committee's choice is to accept, modify, or reject the four disclosures as drafted.)

> We are publishing four disclosures on `/methodology` that are either required (P7, P8 under IOSCO FR07/13 and EU BMR Art 11(3)(d)) or hygienic (P14, P19 non-applicability). The published formula and every historical number are unchanged. The disclosures convert four open rows on the IOSCO gap matrix from `partial` / `gap` / undocumented-n/a to `compliant` or declared-n/a. We accept the second-order risk R5 (that documentation revisions can be shipped without re-starting the 30-day notice clock) with the narrowing rule: a documentation revision is a page edit that does not alter `PUBLISHED_METHODOLOGY` or the output of the methodology-lock test, and still requires Committee sign-off via PR review. Voted: <yes/no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD.

## Closing

After merge:

1. Mark `docs/research/gaps/iosco-principles.md` rows P7 (→ `partial`, scope narrowed), P8 (→ `compliant`), P14 (→ documented-n/a), P19 (→ documented-n/a) as resolved; strike through the matching rolling-queue items.
2. Add a `docs/decisions.md` entry titled "Documentation revisions to `/methodology` do not re-start the 30-day notice clock" explaining the narrowing rule the Committee accepts here, so the precedent is captured in the authoritative-decisions file where future readers (and future runs of this agent) will see it.
3. Link the merged PR in this proposal's footer.

The P0 items that remain on the queue after this proposal lands are **P3 / P5** (COI + sole-administrator disclosure on `/methodology`) and **P16** (complaints email + SLA on `/methodology`). All three are small docs edits on the same hard-limit page; they are candidates to be bundled into a follow-up proposal in the next session, now that the four-row P7/P8/P14/P19 bundle has set the precedent for a docs-only proposal on this surface.

---

*Proposal filed 2026-10-15. PR link: <to be inserted on open>. Merged PR link: <to be inserted on merge>.*
