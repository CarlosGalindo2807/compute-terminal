# Proposal: Self-classify CTI as a *Published-Quote Benchmark* and publish the Data-Input Hierarchy on `/methodology` (v1.0 → v1.0.1, editorial)

| | |
|---|---|
| **Date** | 2026-11-02 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs + governance (editorial version bump; **no change to the published number**) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit, page content only), `packages/shared/src/methodology.ts` (hard-limit, add `inputClass` + bump `PUBLISHED_METHODOLOGY_VERSION` from `v1.0` → `v1.0.1`), `apps/workers/src/functions/methodology.test.ts` (hard-limit, lock-test version string), `packages/db/migrations/015_methodology_v1_0_1_editorial.sql` (new, inserts the `v1.0.1` row and the `methodology_changes` notice) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member) |
| **Effective date if approved** | 2026-12-02 (≥ 30 days after merge, per Committee charter Step 3 — "at least 30 days' notice before taking effect") |
| **References** | IOSCO FR07/13 Principles 7, 8, 11, 12 ; IOSCO FR03/18 (IOSCOPD549) Guidance ; EU BMR Reg (EU) 2016/1011 Art. 11(1)(c), Art. 11(3)(d) ; Baltic Exchange *Guide to Market Benchmarks* v8.3 (Apr 2026) ; ICE/LBMA *Precious Metals Methodology* ; companion research note [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) ; gap-matrix rows P7 + P8 [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) |

---

## Problem

Gap-matrix rows **P7 (Data Sufficiency)** and **P8 (Hierarchy of Data Inputs)** are the two highest-leverage un-closed items in the Quality-of-Benchmark pillar of CTI's IOSCO alignment:

- **P7 (status: `partial / structurally weak`).** Every input into the published `filtered_vwap` is a scraped *listing* — a provider's firm, executable on-demand ask — not an observed trade. On-demand compute has no public consolidated transaction tape. A strict IOSCO reviewer can press that P7's "anchored by observable transactions" test is unmet. The companion note of 2026-05-12 established that this position is **defensible but requires an explicit, published self-classification** — the Baltic / LBMA / oil-PRA pattern of *owning the limitation* rather than overclaiming.
- **P8 (status: `partial`).** The data-input hierarchy that *already governs every published number* (scraper → Zod schema validation → rule / alias / fuzzy normalization → Claude ≥ 0.95 auto / 0.70–0.95 admin queue → outlier filter → eligibility floor → quorum → VWAP) exists in code but is not published. EU BMR Art 11(3)(d) specifically requires administrators to "draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement."

Both are the *same edit to the same page*. The companion note's §4–5 identifies this proposal as the single highest-leverage next deliverable — closing two P0 queue items in one page change, with **zero movement of the published number**. The research is done; this proposal is the implementation blueprint.

## Proposed change

Four coordinated edits land in one PR. The published number does not change on any day under this proposal. The lock test still passes against identical outputs. This is an **editorial version bump** — the industry-standard pattern (MSCI `vX.Y.0` → `vX.Y.1`; S&P "methodology notice, no reconstitution"; Baltic Exchange *Guide* revisions) used when the *documented* methodology grows more precise but the *computed* methodology is unchanged.

### 1. `apps/web/app/methodology/page.tsx` — two new sections

Inserted immediately after the "Quorum" sub-section of **Formula** and before **Index Committee**:

#### 1a. "Input classification" (new §)

> **CTI is a Published-Quote Benchmark.** Its inputs are firm, executable on-demand list prices captured directly from provider pricing endpoints. The underlying interest — the prevailing on-demand $/GPU-hour for a given GPU model in a given hour — is a real arms-length cash market: Vast.ai, RunPod, Lambda and the hyperscalers transact GPU-hours continuously at those prices.
>
> On-demand compute has no public consolidated transaction tape. Per EU BMR Reg (EU) 2016/1011 Art. 11(1)(c), where transaction data is unavailable or inappropriate, administrators may rely on **committed quotes** — firm, executable prices at which a counterparty will trade — and estimated prices. CTI's inputs are committed quotes in substance: a Vast.ai or RunPod listing is executable on click at the quoted price, closer to LME firm quotes than to indicative LIBOR submissions.
>
> This classification sits in the same regulated-benchmark lineage as the Baltic Exchange freight indices (panellist assessments of a tape-less market, EU-BMR-compliant, used to settle cleared FFAs), the Platts / Argus Market-on-Close oil assessments (bids / offers / confirmed trades blended in a defined window, operating under the IOSCO Principles for Oil Price Reporting Agencies), and the MSCI / IPD and NCREIF property indices (independent methodologically-disciplined appraisals of a market without a contemporaneous trade tape). CTI's position is structurally stronger than the panel/appraisal pattern — our "submitters" are the providers' own published price endpoints, captured mechanically with no human submission step, schema-validated, outlier-filtered, and with zero expert judgment in the published-number path.
>
> CTI does not claim unqualified IOSCO Principle 7 compliance in its listing-only configuration. It claims to be a Published-Quote Benchmark anchored in a genuine arms-length transactional market, operated under the input-governance and control framework described below. A separate `invoice_observations` ingest workstream is in development (see roadmap) to establish a transactional reconciliation layer; it does not alter the published formula.

#### 1b. "Hierarchy of data inputs" (new §)

A numbered list, each item a deterministic stage, no expert judgment in the published-number path:

1. **Capture.** TypeScript-native scrapers in `apps/workers/src/functions/scrapers.ts` call provider pricing endpoints every 5 minutes. Response bodies are schema-validated against a per-provider Zod parser. Responses that do not match the schema are **dropped**, not coerced; a `scrape-failed` event is written to `system_events`.
2. **Normalization — deterministic first.** Captured GPU strings pass through `core/normalizer.py`'s rule → alias → fuzzy pipeline. A match at any of those three stages resolves to a `gpu_model_id` immediately. ≥ 95 % of listings resolve here after the catalog matures.
3. **Normalization — Claude as adjunct, with human gate.** Unmatched strings drain hourly to a Claude (Sonnet 4.6) batch. Confidence ≥ 0.95 auto-resolves into a `normalization_rule`. Confidence 0.70 – 0.95 is queued at `/admin/unmatched` for one-click human approval. Below 0.70 is held, not published. Claude's role is pattern-matching unknown strings onto the catalog, **never price estimation** — the price is the scraped value in all cases.
4. **Outlier filter.** MAD-3σ per GPU model over the trailing 1 hour, run every 15 minutes. Observations that fail are flagged `is_outlier = true` in `price_snapshots` and excluded from the eligibility set. No price adjustment, no winsorizing.
5. **Reliability floor.** Provider-level `reliability_score` auto-decays on outlier ratio > 30 %, recovers after 7 stable days. No human override. Providers below the floor (`reliability_score < 0.5`) are excluded entirely.
6. **Quorum.** For a given index on a given day, if the eligible set is < `min_observations` (5), nothing is published. No fallback formula. An `index_value_skipped` event is written. CTI never extrapolates, never carries forward.
7. **VWAP.** Volume-weighted (by `num_gpus`) mean over the eligible set. This is the published number.

A short explanatory paragraph closes the section:

> **Expert judgment:** there is none in the published-number path. The ingestion pipeline above is fully deterministic from input to output; the only human-gated step (Claude's 0.70 – 0.95 normalization queue) governs whether an input *enters* the pipeline, never what value it carries. The 5-way research-only A/B (`index_methodology_experiments`) uses the same pipeline inputs; it never changes the published value — a formula change requires the Index Committee's 30-day-notice procedure above.
>
> **Transaction data:** none is used today. The schema for `invoice_observations` (migration 011) exists in anticipation of an observed-effective-price reconciliation layer; the ingest pipeline is a separate workstream. Any future admission of invoice observations as a *weighted input* in the hierarchy above is a methodology-class change — Index Committee, 30-day notice, backtest. See [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md) §4 Track B.

### 2. `packages/shared/src/methodology.ts` — version bump and `inputClass` field

```diff
-export const PUBLISHED_METHODOLOGY_VERSION = 'v1.0' as const;
+export const PUBLISHED_METHODOLOGY_VERSION = 'v1.0.1' as const;

 export const PUBLISHED_METHODOLOGY: {
   version: typeof PUBLISHED_METHODOLOGY_VERSION;
   formulaId: MethodologyName;
   windowHours: number;
   minObservations: number;
   outlierFilter: 'mad_3_sigma';
   weight: 'num_gpus';
   reliabilityFloor: number;
+  inputClass: 'published_quote';
 } = {
-  version: 'v1.0',
+  version: 'v1.0.1',
   formulaId: 'filtered_vwap',
   windowHours: 24,
   minObservations: 5,
   outlierFilter: 'mad_3_sigma',
   weight: 'num_gpus',
   reliabilityFloor: 0.5,
+  inputClass: 'published_quote',
 };
```

Rationale for a *structural* field (`inputClass`) rather than only a page edit:

- The input classification is methodology-level information. A licensee programmatically fetching `PUBLISHED_METHODOLOGY` to render it in their own system should see the classification, not have to scrape our page.
- The field has a closed enum (today: `'published_quote'`). Any future admission of transaction data (Track B) widens this to `'published_quote' | 'transaction_data' | 'blended'`, and the step is visible in a diff. That makes the audit trail legible.
- No behavioral code reads `inputClass` today. It is purely metadata exposed by the constant.

### 3. `apps/workers/src/functions/methodology.test.ts` — lock test version string

```diff
-expect(PUBLISHED_METHODOLOGY.version).toBe('v1.0');
+expect(PUBLISHED_METHODOLOGY.version).toBe('v1.0.1');
+expect(PUBLISHED_METHODOLOGY.inputClass).toBe('published_quote');
```

Every other assertion in the lock test remains byte-identical — formula, outlier filter, weight, window hours, min observations, reliability floor. The test continues to catch silent drift on the *computed* methodology.

### 4. `packages/db/migrations/015_methodology_v1_0_1_editorial.sql` — audit-trail rows

Inserts the `v1.0.1` row into `methodology_versions` with:

- `version = 'v1.0.1'`
- `formula_id = 'filtered_vwap'` (unchanged)
- `formula_params` — identical to `v1.0`
- `effective_from = '2026-12-02'` (30 days after planned merge)
- `effective_to` on the `v1.0` row set to `'2026-12-02'` (same date; closes v1.0 cleanly)
- `approved_by` populated per Roadmap B7 — this proposal piggybacks the sole-founding-member rename
- `document_url` points at the merged PR

Inserts the `methodology_changes` row with `change_class = 'editorial'`, `rationale` summarizing this proposal, `public_notice_from = <merge date>`, `effective_from = '2026-12-02'`.

The migration is idempotent (`ON CONFLICT DO NOTHING`) so a re-apply on an environment that already has it is safe. No row in `index_values_daily` is recomputed; historical values stay stamped with `v1.0` by design (the proposal reasserts the "historical values are immutable" audit principle).

## Why this is the right shape (vs. alternatives)

Three alternative shapes were weighed before landing on the one above.

### Alternative A — Page edit only, no version bump

**Shape:** add the two sections to `/methodology`; leave `PUBLISHED_METHODOLOGY_VERSION` at `v1.0`, no migration, no `inputClass` field, no change-notice row.

**Rejected because:** it fails the "legible audit trail" test. An external reviewer scanning `methodology_versions` would see v1.0 is the only published version, and would not have a signal that the published methodology's *disclosure* materially changed on this date. The whole value of the proposal is converting a silent position into a stated one — recording that moment in the versioned audit chain is non-negotiable. S&P / MSCI / Baltic all mark editorial clarifications with a methodology-document revision number; so should CTI.

### Alternative B — Treat as a material methodology change (v1.1), full backtest

**Shape:** same page edits, but version bumps to `v1.1`, 90-day backtest attached, change_class = `material`.

**Rejected because:** nothing about the computed number changes. A material change under the Committee charter is a change that *could* alter the published value — adopting a different formula, tightening the outlier filter, widening the quorum. Classifying a pure disclosure as material would train future readers to treat all version bumps as functional changes, diluting the signal of a real material change later. The ICE and S&P methodology-change conventions explicitly distinguish editorial from material revisions; mirror that here. (`change_class = 'editorial'` is already a column on `methodology_changes` per migration 009 — the schema anticipated this.)

### Alternative C (chosen) — Editorial v1.0.1 bump with structural `inputClass` field

The proposal above. Chosen because it:

1. Converts a hidden position into a stated one (closes P7's "structurally weak" and P8's "implicit, not published").
2. Preserves the 30-day public notice discipline — important precisely because this is the *first* version transition ever processed end-to-end on CTI (gap-matrix row P12 is "compliant in design, **untested**"; this proposal is the untested-until-now dry run).
3. Keeps the `v1.0` lock meaningful. The lock test continues to catch silent drift on the formula.
4. Marks the audit trail at the row level (new `methodology_versions` row, new `methodology_changes` row) without triggering backtest overhead that would be theatrical for a non-functional change.
5. Exposes the classification programmatically to future licensees via `PUBLISHED_METHODOLOGY.inputClass`.

## Empirical impact

For an editorial change, the required empirical signal is **"the published number does not move."** This is enforceable automatically and should be the committee's exit criterion.

### Zero-numeric-change assertion

The pre-merge CI check runs the following against the last 90 days of `price_snapshots` (or the full live history, whichever is shorter):

- Compute `filtered_vwap` under `PUBLISHED_METHODOLOGY` as defined on `main` (v1.0).
- Compute `filtered_vwap` under `PUBLISHED_METHODOLOGY` as defined on this branch (v1.0.1 + `inputClass`).
- Assert row-level equality on every (index, date) pair in `index_values_daily`'s date range.

Because the only field diff is `inputClass` (metadata, read by no calculator code path), equality holds by construction. The CI check is a belt-and-braces assertion against accidental coupling: if any calculator path were to start reading `inputClass`, this test would fire the moment the first non-metadata use lands.

### Coverage impact

Zero. No GPU model, no provider, no (index, date) row is added, removed, or recomputed. `index_values_daily.methodology_version` on rows published on or after 2026-12-02 will carry the string `'v1.0.1'`; rows before that date remain stamped `'v1.0'`. The chart on `/index/[slug]` draws a version-change marker at 2026-12-02 — the first time that visual contract fires in production.

### Sensitivity analysis

Not applicable (no numeric parameter changes).

### False-positive / false-negative rate

Not applicable (outlier filter unchanged).

### P7 / P8 compliance delta

Qualitative, documented against the gap matrix:

| Row | Pre | Post |
|---|---|---|
| P7 | `partial / structurally weak` — inputs listed as scraped offers, no self-classification, no stated hierarchy. | `partial — self-classified as Published-Quote Benchmark; hierarchy published; Track B invoice reconciliation remains in flight`. Still not fully `compliant` (that requires live transaction-reconciliation data under Track B), but the compliance *position* is now defensible and auditor-presentable. |
| P8 | `partial` — hierarchy exists in code only. | `compliant` — hierarchy published verbatim on `/methodology` with the deterministic rule at each stage. |
| P11 | `compliant` | `compliant`, strengthened (more detail published). |
| P12 | `compliant in design, untested` | `compliant, tested` — first end-to-end run of the 30-day-notice procedure. |

Priority queue in `gaps/iosco-principles.md` loses P0 item 4 and P1 item 7 on merge; shifts P1 items up.

## Risks

### Immediate (test / data)

1. **Lock test miss.** If `methodology.test.ts` is updated inconsistently with the constant (e.g. test asserts `v1.0.1` but constant stays `v1.0`), CI fails. **Mitigation:** this proposal edits both in the same PR; CODEOWNERS requires @CarlosGalindo2807 to approve both.
2. **Migration 015 reapply.** If a worker runs migration 015 before deploy coordination, it could create a v1.0.1 row whose `effective_from` is in the past relative to the index-calculator's `now`, causing the calculator to pick `v1.0.1` early. **Mitigation:** `effective_from = 2026-12-02` is a date 30 days out, so even on a mis-ordered deploy the calculator continues to resolve the published version to `v1.0` until that date. The migration is also idempotent and does not touch any computed row.
3. **Downstream consumers reading `PUBLISHED_METHODOLOGY_VERSION`.** The ticker, markets, and index pages all show the version string. On merge they will immediately render `v1.0.1`; between merge and effective date, that creates a disclosure gap (the page shows v1.0.1 but index values are still v1.0). **Mitigation:** the proposal's companion page edit introduces a "Pending v1.0.1 effective 2026-12-02" banner, exactly the surface that gap-matrix row **P12 / Roadmap B8** has long asked for. This proposal thereby *also* closes B8 as a side effect.

### Second-order (trust / defensibility)

1. **"Published-Quote Benchmark" is not a formal regulatory category.** We invent the term. **Mitigation:** anchor it against the recognized `committed quotes` category in EU BMR Art 11(1)(c) in the published text. An auditor's question is answered by a one-sentence pointer to the Regulation, not by novel jargon of ours.
2. **Explicit self-classification could be read as "we admit P7 non-compliance".** **Mitigation:** the published language is specifically *not* an admission of non-compliance — it is a declaration of the compliance *category* CTI operates in, by analogy to Baltic / Platts / Argus / LBMA. All four are IOSCO-aligned benchmarks that do not satisfy a naive "trades-only" reading of P7. The proposal frames CTI alongside them, not below them.
3. **A future licensee could demand transaction-anchored inputs.** **Mitigation:** the proposed language names the Track B invoice-reconciliation workstream explicitly, so a licensee negotiating today sees the roadmap, not a dead end. This is exactly the shape MSCI uses when disclosing a methodology under revision.
4. **The 30-day notice period risks a bad-faith argument that the new disclosure "retroactively" changes CTI's compliance posture for the pre-effective-date window.** **Mitigation:** publish the notice banner (page) at merge; stamp `index_values_daily` rows with `v1.0.1` only on and after 2026-12-02. The audit trail cleanly separates "disclosure effective date" from "values labelled under the new disclosure." The companion `methodology_changes` row records both dates.

### Reduces auditor trust

1. The proposal does *not* promise P7 full compliance. An uncharitable reader could conclude "CTI will never be P7-compliant." **Mitigation:** the published text actively names Track B (invoice observations) as the forward-looking path to full P7 compliance; the roadmap item is linked. The pattern of "today we are X; here is the mapped path to Y" is the exact format MSCI uses in its IOSCO statements of compliance.

### Breaks downstream licensee assumptions

None exist today — CTI has no production licensees. This is explicitly the right moment to establish the convention before the first licensee contract is written.

### Narrows the legal defensibility of the v1.0 lock

No. The v1.0 lock is defined by the computed-formula constants (`filtered_vwap`, `window = 24h`, `k = 3`, `floor = 0.5`, `quorum = 5`, `weight = num_gpus`). None of those change. The lock test continues to pin every one of them.

## Migration / rollout plan

**T-30 → T-0 (public notice window):**

1. PR merges on **merge date = T-30**. Immediately, `/methodology` renders both new sections *plus* a pending-change banner: "Methodology v1.0.1 (editorial) takes effect 2026-12-02. See the change notice for details." The banner is also what closes roadmap item **B8** (notice surface for future `methodology_changes` rows) — reusing the same component.
2. During the 30-day window, `index_values_daily` continues to be stamped `v1.0` by `index-calculator.ts`. Nothing in the calculation flow consults `inputClass`.
3. The merged PR URL is linked from the `methodology_versions.document_url` column for the v1.0.1 row.

**T-0 (effective date, 2026-12-02):**

1. The next scheduled run of `index-calculator` (00:30 UTC) and `gpu-price-calculator` (00:35 UTC) stamp new rows with `methodology_version = 'v1.0.1'`.
2. The `/methodology` version banner updates automatically (the page reads from `PUBLISHED_METHODOLOGY_VERSION` and the live `methodology_versions` row).
3. The chart's methodology-change marker fires for the first time at the 2026-12-02 vertex.

**Historical values:**

NOT recomputed. Rows dated before 2026-12-02 remain stamped `v1.0`. This matches the audit principle established in `methodology.test.ts` and in the published Committee charter Step 4.

**Rollback plan:**

If the editorial change is rolled back before 2026-12-02, the revert is one PR: restore `v1.0` on the constant and lock-test, UPDATE `methodology_versions` SET `effective_to = NULL` WHERE version = 'v1.0', DELETE the v1.0.1 row. No `index_values_daily` row has yet been stamped `v1.0.1` so there is no asymmetric cleanup.

If rollback is required *after* 2026-12-02, it is a material change in its own right: a v1.0.2 bump restoring the previous disclosure, Committee process, 30-day notice. The v1.0.1 row stays in the audit chain by design (immutability). This is the correct behavior — the audit trail should record what was published, not what we wish had been published.

**What to monitor in `system_events` after merge:**

- `methodology_changed` event with `payload.change_class = 'editorial'`, `payload.from_version = 'v1.0'`, `payload.to_version = 'v1.0.1'`, `payload.effective_from = '2026-12-02'`. Fires once on migration 015 apply.
- No `index_value_skipped` events should correlate with the merge. The eligibility and quorum rules are unchanged.
- No `methodology_lock_mismatch` events. If one fires, this proposal's test-change delta is wrong — halt and investigate.

Roadmap item **C15** (webhook on `methodology_changed`) is the belt-and-braces alert. It fires on this proposal's effective date, which is exactly the audit signal it was designed for.

## Committee deliberation prompt

> *"We are converting CTI's silent position on IOSCO Principle 7 (Data Sufficiency) into a published, defensible self-classification as a Published-Quote Benchmark, anchored on the EU BMR Art 11(1)(c) 'committed quotes' category, alongside Baltic / Platts / Argus / LBMA / MSCI-IPD precedents for benchmarks of real markets without a consolidated transaction tape. We are simultaneously publishing the data-input hierarchy that already governs every CTI value (IOSCO Principle 8), closing a quality-pillar gap in the same page edit. The published number does not change on any date; the lock test continues to pin every computed-formula constant. We are electing an editorial v1.0.1 version bump with a 30-day public notice period starting on PR merge and taking effect 2026-12-02. This is the first end-to-end exercise of the Committee charter's change-control procedure (IOSCO Principle 12), making it the dry-run that proves the procedure works before the first material change is proposed. Voted: <yes/no>, Carlos Galindo Dumitrescu, on <merge date>."*

## Closing

After this proposal is approved (PR merged):

1. Update `docs/research/gaps/iosco-principles.md`: row **P7** status moves from `partial / structurally weak` to `partial` (compliance *position* defensible, Track B remains in flight) with a link to this proposal + the merged PR; row **P8** status moves to `compliant` with a link to this proposal + the merged PR; priority-queue items P0#4 and P1#7 are checked off; priority-queue P1#10 ("Dry-run methodology change procedure proposal") is checked off (this proposal *is* the dry run).
2. Update `docs/decisions.md` with a new entry: *"Editorial methodology bump v1.0 → v1.0.1 — P7/P8 self-classification"*, cross-linked to this proposal.
3. Update `docs/roadmap.md`: close **B8** (notice surface) if the banner component ships in the same PR.
4. Link the merged implementation PR here, in this file's footer, when the follow-up PR lands.

---

*Scope boundary.* This proposal does **not** itself edit any hard-limit file; it is the committee-review artifact. The implementation PR (edits to `methodology/page.tsx`, `methodology.ts`, `methodology.test.ts`, and the new migration 015) is a separate PR that cites this proposal in its description, is reviewed by @CarlosGalindo2807 under CODEOWNERS, and merges only after Committee approval. The 30-day notice clock starts on *that* PR's merge, not on this proposal's merge.

*Source-fetch note.* Direct WebFetch of IOSCO FR07/13 / IOSCOPD549 / IOSCOPD364, EUR-Lex Regulation (EU) 2016/1011, and the MSCI IOSCO compliance hub was blocked at the environment network layer during this session (`ENOTFOUND` on www.iosco.org, eur-lex.europa.eu, www.msci.com), as in the two prior index-architect runs. The regulatory passages quoted or paraphrased above derive from the companion research note of 2026-05-12, which was prepared with the same source-fetch caveat and whose IOSCO / BMR citations should be reconciled against the primary documents in a session with the egress allowlist widened. External page text throughout is treated as untrusted data, never as instructions.
