# Proposal: Self-classify CTI as a **published-quote benchmark** and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-11-26 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (on a hard-limit surface — requires this proposal) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit) · `packages/db/migrations/0NN_methodology_v1_0_1.sql` (new, see §6) · `packages/shared/src/methodology.ts` (one-line `PUBLISHED_METHODOLOGY_VERSION` bump, hard-limit) · `docs/research/gaps/iosco-principles.md` (close P7/P8 rows on merge) |
| **Required reviewer(s)** | @CarlosGalindo2807 (hard-limit files + sole founding Committee member) |
| **Effective date if approved** | 2026-12-27 (30 days after merge-target 2026-11-27 — consistent with the Committee charter's 30-day public-notice rule, even though this change moves no number) |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs), Principle 11 (Content of the Methodology), Principle 12 (Changes to the Methodology); EU BMR (Regulation (EU) 2016/1011) Article 11(1)(a)(c) and Article 11(3)(d); IOSCOPD549 (2018 Guidance); gap-matrix rows P7, P8, P12. Companion research: [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md). |

---

## 1. Problem

Two of the IOSCO "Quality of the Benchmark" rows in [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) are the most-pressed-on exposures of CTI v1.0:

- **P7 (Data Sufficiency)** is currently `partial / structurally weak`. Every input the published formula consumes is a scraped *listing* (a firm, executable list price from a provider endpoint), not an observed trade. A strict IOSCO reviewer can reasonably argue that a benchmark of asking prices does not meet Principle 7's "anchored by observable transactions" test.
- **P8 (Hierarchy of Data Inputs)** is currently `partial`. The hierarchy exists in code (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP) but is not **published**. EU BMR Article 11(3)(d) explicitly requires the administrator to "draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement."

The prior-session research note [listings-vs-transactions-iosco-p7](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) worked both of these out end-to-end. Its §4 "Track A" and §5 "Recommended single next deliverable" are explicit: the right next step is a docs-only edit to `/methodology` that (a) self-classifies CTI precisely as a **published-quote benchmark**, and (b) publishes the data-input hierarchy. The same edit closes both gap-matrix rows.

Because `apps/web/app/methodology/page.tsx` is a hard-limit file (see `.claude/agents/index-architect.md` §Hard limits), the edit cannot be made directly; it must come through this proposal. That same constraint, incidentally, gives us a free opportunity to **dry-run the Committee's change procedure** for the first time — closing a third gap-matrix row (P12) that today reads "compliant in design, untested."

## 2. Proposed change

The proposal has four moving parts. All of them land in a single PR; the PR merges after @CarlosGalindo2807 approves, and the change takes effect 30 days later.

### 2a. Two new subsections on `/methodology`

Insert the following two subsections into `apps/web/app/methodology/page.tsx`, immediately after the existing "Quorum" subsection and before the "Index Committee" section. The subsections are prose-only; no formula values change.

> #### Input-data classification
>
> CTI is a **published-quote benchmark**. Every input that the formula above consumes is a firm, executable on-demand list price, captured directly from a provider's public price endpoint. We observe what providers will sell GPU-hours at; we do not observe what customers paid.
>
> On-demand GPU compute is a genuine arms-length cash market — Vast.ai, RunPod, Lambda, and the hyperscalers transact GPU-hours continuously at competitive, published prices — but it has no public consolidated transaction tape. Where no trade tape exists, EU BMR Article 11(1)(c) permits the use of *committed quotes* as input data, provided the hierarchy is published and the reason transaction data is unavailable is stated. CTI's inputs satisfy that definition: a Vast.ai or RunPod listing is executable on click at the quoted price, not an indicative submission in the LIBOR sense.
>
> This classification is deliberate. We do not claim CTI is a *transaction* benchmark. We claim it is a **published-quote benchmark anchored in a real cash market for GPU-hours**, computed with no expert judgement. Where observed-transaction data becomes available in the future (see `invoice_observations` in the public schema), we will publish a periodic reconciliation between CTI and median effective paid prices by spend band, as additional evidence that the published quote series tracks economic reality. Any decision to admit transaction data as a *weighted input class* in the formula itself would follow the standard methodology-change procedure below.
>
> #### Hierarchy of data inputs
>
> The data pipeline that produces each day's published value is deterministic. Every observation passes through the stages below, in order; earlier stages take priority, and there is no expert judgement at any step.
>
> 1. **Ingestion.** A per-marketplace scraper fetches the provider's public price endpoint. Each row is validated against a Zod schema; rows that do not match are dropped (not coerced) and a `scraper_run_failed` event is written to `system_events`.
> 2. **GPU-model normalisation.** The raw GPU string is resolved in this order: (i) deterministic rule from `normalization_rules`; (ii) alias table; (iii) fuzzy match to the catalog; (iv) Claude batch normaliser — only strings that fell through (i)–(iii) are considered, and only confidence ≥ 0.95 auto-resolves. Confidence 0.70–0.95 enters the admin queue and never touches the published number until a human approves. Confidence &lt; 0.70 is dropped.
> 3. **Outlier flagging.** MAD-3σ per GPU model, computed over the last 1 hour. Flagged rows are written back to `price_snapshots.is_outlier = true`.
> 4. **Eligibility.** A snapshot is eligible if, and only if, it is schema-valid, normalised to a known GPU model in the index universe, `is_outlier = false`, captured in the 24 h preceding publication, and comes from a provider with `reliability_score ≥ 0.5`. `reliability_score` is itself deterministic — it auto-decays on sustained outlier ratio and auto-recovers after seven stable days; no manual override.
> 5. **Quorum.** If the eligible set for an index has fewer than 5 observations, the index value for that day is not published. The day is recorded as `index_value_skipped`. We never extrapolate, carry forward, or fall back.
> 6. **Calculation.** The published value is the `num_gpus`-weighted mean of the eligible set, using the `filtered_vwap` formula defined above. No other methodology is published; the other four research methodologies (`simple_vwap`, `trimmed_mean_10`, `median_weighted`, `time_decay_vwap`) run nightly to `index_methodology_experiments` and are reviewed quarterly by the Index Committee, but never substitute for the published value.
>
> Stages 1–3 have standing override surfaces (admin unmatched queue, catalog corrections) that are themselves version-controlled and audited through `system_events`. Stages 4–6 have no override — if quorum is not met, no number is published, and no manual value may be substituted.

### 2b. Two short "non-applicability" declarations on `/methodology`

Immediately after the Index Committee section, add a one-paragraph scope note that closes gap-matrix rows P14 and P19 without a separate proposal each:

> #### Scope notes
>
> **Submitter Code of Conduct (IOSCO Principle 14).** CTI has no *Submitters* in the LIBOR sense. All inputs are mechanically scraped from public provider price endpoints, with no human submission step. The absence of a submitter code of conduct is by design.
>
> **Regulatory status (IOSCO Principle 19).** CTI is not currently an ESMA-registered or FCA-supervised benchmark. If and when registration is pursued, CTI commits to full cooperation with the relevant regulatory authorities, including the information- and documentation-provision obligations set out in Article 41 of Regulation (EU) 2016/1011 and equivalents.

These are not independently negotiable disclosures — they state the design as it already is. Including them in this PR avoids opening three separate proposals against the same page for materially similar changes.

### 2c. Version bump: v1.0 → v1.0.1 (docs-only patch)

Bump `PUBLISHED_METHODOLOGY_VERSION` in `packages/shared/src/methodology.ts` from `'v1.0'` to `'v1.0.1'`. **Every other field of `PUBLISHED_METHODOLOGY` remains byte-identical** — same `formulaId`, same `windowHours`, same `minObservations`, same `outlierFilter`, same `weight`, same `reliabilityFloor`. The methodology lock test `apps/workers/src/functions/methodology.test.ts` is updated **only** to assert against `'v1.0.1'`; the lock on the `filtered_vwap` identifier and on every numeric parameter is preserved verbatim. A diff that touched any numeric parameter would fail this proposal's own review.

Why bump at all if nothing numeric moves? Three reasons:

1. **Audit trail.** Every row of `index_values_daily` carries `methodology_version`. A reader who looks at an archived number from 2026-12-26 should be able to pull the exact `/methodology` page text that was published alongside it. Keeping v1.0 across a visible page-text change would silently erode that property.
2. **Dry-run of P12.** The gap matrix (row P12) reads "compliant in design, untested — no change has yet been processed end-to-end." An inert docs-only v1.0.1 bump exercises the full procedure (proposal → committee approval → merge → 30-day notice → effective date → `methodology_versions` row inserted → `methodology_changes` row inserted → version-stamp on first affected publication) without any risk to the published numbers. This is exactly the "inert v1.0.1 docs-only bump as the test case" that the prior-session research note recommended.
3. **Reproducibility.** Future licensees who reference CTI by version in a settlement contract need the version string to uniquely identify the entire *disclosure surface*, not just the numeric formula.

### 2d. One new migration: `0NN_methodology_v1_0_1.sql`

A trivial migration that inserts one row into `methodology_versions` and one into `methodology_changes`:

```sql
-- 0NN_methodology_v1_0_1.sql — docs-only patch bump
-- Published-quote self-classification + data-input hierarchy publication.
-- No numeric parameter of PUBLISHED_METHODOLOGY changes under this version.

INSERT INTO methodology_versions (
  version, formula_id, formula_params,
  effective_from, effective_to,
  rationale, approved_by, approved_at, document_url
) VALUES (
  'v1.0.1', 'filtered_vwap',
  '{"windowHours": 24, "minObservations": 5, "outlierFilter": "mad_3_sigma", "weight": "num_gpus", "reliabilityFloor": 0.5}'::jsonb,
  DATE '2026-12-27', NULL,
  'Docs-only patch. Adds published-quote self-classification and data-input hierarchy to /methodology (IOSCO P7, P8; BMR Art 11(1)(c), 11(3)(d)). No numeric parameter changes. Supersedes v1.0 without recomputing historical values.',
  'Carlos Galindo Dumitrescu — sole founding Index Committee member',
  NOW(),
  'https://github.com/carlosgalindo2807/compute-terminal/blob/main/docs/research/proposals/2026-11-26-methodology-published-quote-self-classification.md'
);

UPDATE methodology_versions
SET effective_to = DATE '2026-12-26'
WHERE version = 'v1.0' AND effective_to IS NULL;

INSERT INTO methodology_changes (
  from_version, to_version,
  announced_at, effective_from,
  summary, detail_url
) VALUES (
  'v1.0', 'v1.0.1',
  NOW(), DATE '2026-12-27',
  'Docs-only: published-quote self-classification + input-data hierarchy published on /methodology. Formula, outlier filter, quorum, reliability floor unchanged.',
  'https://github.com/carlosgalindo2807/compute-terminal/blob/main/docs/research/proposals/2026-11-26-methodology-published-quote-self-classification.md'
);
```

The exact migration number (`0NN`) is assigned at merge time against `packages/db/migrations/`. If the `methodology_changes` schema in migration 009 lacks `summary` or `detail_url` columns, substitute the equivalent `rationale` / `document_url` column names present in that migration — the schema-check is the second review item below.

## 3. Why this shape (vs. alternatives)

The prior-session note [§3](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md#3-how-comparable-benchmarks-live-without-a-public-trade-tape) surveyed four comparable-benchmark patterns. Each suggests a different shape for the response. We rejected three.

**Alternative A — Stay silent and keep claiming unqualified P7 compliance.** This is the current state. It is the worst option: it leaves the single largest audit exposure *unnamed and undefended* on the surface a licensee or auditor will read first. Every other benchmark listed in the companion note (Baltic, Platts/Argus, LBMA, MSCI/IPD) states its input class explicitly on its own methodology page. Silence functions as an implicit over-claim.

**Alternative B — Run a fixing auction (the LBMA Gold model).** Technically the strongest answer to P7: generate the transaction, publish the clearing price, and the P7 question dissolves. Rejected as infeasible for v1: on-demand GPU compute has no central venue, no clearing partner, no settlement infrastructure, and a fixing would require convincing providers to participate in a submission window. Flagged in the companion note as the long-horizon shape if CTI ever acquires a clearing partner; not now.

**Alternative C — Submitter-panel model (the Baltic shipping model).** Also defensible — build an IOSCO-compliant benchmark on *assessments* with strong input-governance rules and no transaction tape. Rejected because CTI's mechanical-scrape model is a *stronger* control story than any submitter panel (no human submission step to game; schema-validated inputs; outlier-filtered mechanically), *provided we document it as such*. Moving to a submitter model would strictly reduce defensibility.

**Chosen — Alternative D: self-classify as a published-quote benchmark and publish the hierarchy.** This matches the BMR Article 11(1)(c) "committed quotes" fallback and the MSCI/IPD "methodologically-disciplined estimate of value satisfies BMR Art 11(1)(a)" precedent. It converts the hidden weakness into a stated, defensible design choice. The disclosure cost is one page edit; the benefit is that the next time a licensee or auditor presses on P7, the answer is *written down on the public page, exactly as we are prepared to defend it*. This is the "own the limitation" pattern (LBMA-fixing-FAQ, Baltic Panellist Code), recommended in the companion note §4 Track A.

A fifth alternative — add the invoice-observations reconciliation now — was considered and deferred to Track B of the companion note. The reconciliation is high-value but blocked on the `invoice_observations` ingest pipeline being empty. Standing that pipeline up is a separate, larger workstream. Doing Track A now does not block or prejudice Track B; in fact Track A's published language already names the reconciliation as the forward commitment.

## 4. Empirical impact

This is a docs change, not a methodology change. The empirical signal is therefore inverted: the test is that **no published number moves**. Specifically:

- **Formula lock test (`apps/workers/src/functions/methodology.test.ts`).** Expected to pass byte-identically except for the version-string assertion update (`'v1.0'` → `'v1.0.1'`). Every numeric parameter of `PUBLISHED_METHODOLOGY` is unchanged. Reviewer: inspect the diff — if any numeric field moved, the proposal has failed its own lock test and must be rejected.
- **Index-calculator output.** On the first nightly run after 2026-12-27, `index_values_daily.methodology_version` on new rows will stamp `'v1.0.1'` instead of `'v1.0'`. The `vwap` value for a given (index, date) pair *computed from the same `price_snapshots`* must be bitwise identical under v1.0 and v1.0.1. Dry-run: `pnpm --filter workers test index-calculator` before merge, and spot-check two days of 2026-11-* data against a scratch `v1.0.1`-stamped branch calculator.
- **Historical values.** Not recomputed. `index_values_daily` rows dated ≤ 2026-12-26 remain `methodology_version = 'v1.0'`, forever. This is the audit-immutability principle stated in the proposal template.
- **Methodology-change markers on `/index/[slug]`.** `apps/web/components/index-chart.tsx` draws a dashed yellow vertical line when adjacent rows carry different `methodology_version`. This marker will fire for the first time on the 2026-12-27 boundary, labelled `v1.0.1`. The visual contract already exists (`docs/decisions.md` → "/index/[slug] chart is server-rendered SVG, no chart library"); the proposal tests it live.
- **Version-history table on `/methodology`.** Renders one new row (`v1.0.1`, effective 2026-12-27 → present) and closes out the `v1.0` row with `effective_to = 2026-12-26`. The render is already wired; the migration in §2d is what populates it.

The absence of a formal backtest here is not an exemption from the template's REQUIRED fields — it is a direct consequence of the change having a null numeric impact. The template's "REQUIRED backtest" clause is scoped to methodology changes that move a published number; a v1.0.1 patch that moves none is the degenerate case. The reviewer discipline that replaces the backtest is the diff-level formula-lock check above.

## 5. Risks

**Immediate — test failures.** A careless edit to `packages/shared/src/methodology.ts` could touch a numeric field alongside the version string. Mitigation: the methodology lock test will fail loudly. Mitigation-of-mitigation: this proposal's own §4 names the "numeric-field diff" as the single reviewer discipline @CarlosGalindo2807 should run before approving.

**Immediate — migration schema drift.** The `methodology_changes` schema (migration 009) must accept the columns the §2d migration INSERTs. If column names differ (`summary` vs `rationale`, `detail_url` vs `document_url`, etc.), the migration will fail. Mitigation: the PR author inspects migration 009 before writing `0NN`, and the PR description names the exact column mapping used.

**Second-order — licensee-expectation risk.** A future licensee contract that references CTI by version string may be written against `v1.0`. Bumping to `v1.0.1` *before* any such contract exists is cost-free; bumping *after* would require coordinated contract amendment. Mitigation: there are no licensee contracts referencing CTI today. This is the right time to do the first inert version bump — exactly because it is free.

**Second-order — disclosure over-claim.** The published-quote classification states that inputs are *firm, executable* on-demand list prices. If any input source (RunPod, Vast.ai, Lambda) ever changes to indicative/soft pricing, the classification becomes an over-claim. Mitigation: the P8-hierarchy stage 1 (Ingestion) names the scraper schema and the dead-letter event; if a provider's endpoint ceases to be executable, the Zod validation and the system-events trail will expose it before the misclassification can accrete audit exposure. A standing operational control to run periodically: spot-check one random listing per provider per month and verify it is actually bookable at the quoted price. Not in scope for this proposal; worth a `docs/control-framework.md` row when gap-matrix P4 is closed.

**Second-order — Committee-procedure legitimacy.** Running the first methodology-change through a docs-only patch raises the question: "does the Committee's 30-day public notice really apply when no number moves?" Answer (adopted here): yes, because the published disclosure surface is part of the methodology by Principle 11. The alternative — a hot-patch without the 30-day wait — would set a precedent that future docs changes may bypass notice, which is exactly what the Committee's charter is designed to prevent. Doing the inert bump the hard way is itself the signal that the charter binds.

**Narrow — over-fitting to EU BMR.** The disclosure cites BMR Article 11(1)(c) directly. A non-EU jurisdiction's regulator may interpret "committed quotes" differently. Mitigation: the text is written to IOSCO Principle 7 (the international floor) first and BMR second; BMR's "committed quotes" language is cited as *consistent with*, not *defined by*, our classification. A future UK/HK/SG/AU regulator can read the IOSCO framing without reaching the BMR cite.

## 6. Migration / rollout plan

Per the `/methodology` Index Committee procedure (Steps 1–4) and `_TEMPLATE.md` REQUIRED fields.

- **Step 1 — Research (done).** The [listings-vs-transactions](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) note is Step 1. Gap matrix row P7/P8 updated 2026-05-12.
- **Step 2 — Committee review (this PR).** @CarlosGalindo2807 reviews the proposal against the charter. Approval signal: PR review marked "Approved" with a one-paragraph decision record pasted (see Committee deliberation prompt in §7). Rejection signal: PR review marked "Request changes" with the clause in §2 that is unsupported.
- **Step 3 — Public notice (merge date, target 2026-11-27).** On merge, the `methodology_versions` row for `v1.0.1` lands with `effective_from = 2026-12-27`. The existing `/methodology` version-history section will render `v1.0.1` as a *future-effective* row — this is a visible 30-day public notice on the exact surface IOSCO/BMR require. (Rendering future-effective rows is itself gap-matrix item B8/Roadmap B8; if the rendering does not already visually distinguish future rows, add a one-line "effective from" badge in this same PR — it is a trivial docs-surface change and belongs with the proposal, not a separate ticket.)
- **Step 4 — Effective date (2026-12-27).** At 00:30 UTC on 2026-12-27, the nightly `index-calculator` writes its first `v1.0.1`-stamped row to `index_values_daily`. On the next page render (cache TTL 300 s), the Currently-In-Force banner on `/methodology` flips to `v1.0.1`. The `v1.0` row in the version-history table moves to `effective_to = 2026-12-26`.

**Rollback plan.** If a defect in the new page text is discovered after merge but before 2026-12-27: revert the two JSX subsections in a follow-up PR, revert the migration in a second migration that `UPDATE`s the `v1.0.1` row to `effective_from = NULL` and re-opens `v1.0`. No index-values-daily rows will have been `v1.0.1`-stamped before the effective date, so no historical rows need touching. If the defect is discovered *after* 2026-12-27, the rollback path is a forward-fix v1.0.2 docs-only patch, same procedure as this one — do not retrospectively amend `v1.0.1` rows.

**Post-merge monitoring (in `system_events`).** Watch for `index_value_skipped` events on 2026-12-27 and 2026-12-28 — if quorum unexpectedly fails on the version-rollover day, investigate immediately; the formula is unchanged so the cause would be upstream (scraper outage coinciding with the rollover), not the version bump itself.

## 7. Committee deliberation prompt (methodology — docs-class)

A paragraph the sole founding Committee member (Carlos Galindo Dumitrescu) can paste into the PR approval message as the first methodology-change decision record:

> "On 2026-11-26, the Index Architect proposed a v1.0.1 docs-only patch bumping CTI's published methodology surface to (a) self-classify CTI as a **published-quote benchmark** anchored in a real cash market for GPU-hours, consistent with the IOSCO Principle 7 'anchored by observable transactions' standard read through the EU BMR Article 11(1)(c) committed-quotes fallback, and (b) publish the deterministic data-input hierarchy satisfying BMR Article 11(3)(d) and IOSCO Principle 8. No numeric parameter of `PUBLISHED_METHODOLOGY` changes under v1.0.1; the methodology-lock test passes byte-identically except for the version-string assertion update. The alternative of staying silent on P7 was considered and rejected on the grounds that it leaves the single largest audit exposure unnamed; the alternative of a fixing-auction model was rejected as infeasible for v1; the alternative of a submitter-panel model was rejected as strictly weaker than our mechanical-scrape controls. The 30-day public notice period begins on the merge date and v1.0.1 becomes effective 2026-12-27. Voted: yes, Carlos Galindo Dumitrescu, on 2026-11-26."

## 8. Closing

On merge of the PR implementing this proposal:

- Mark gap-matrix rows **P7, P8** as `partial → compliant (claim defensible, see v1.0.1 /methodology)`, add merged-PR link, update the priority queue (removes P0 item 4 and P1 item 7, merges with P0 item 1 if P3/P5 ships in the same window). Also mark **P14, P19** as `gap → compliant (scope note on /methodology)` and remove their rows from the P1 queue.
- Mark gap-matrix row **P12** as `compliant in design, untested → compliant in design, exercised once end-to-end (v1.0 → v1.0.1)`. Add a line to the row's "Specific gap" column: "No *numeric* change has yet been processed end-to-end." P12 remains in the P1 queue, de-risked.
- Update `docs/decisions.md` with a new entry: "v1.0 → v1.0.1 docs-only methodology version bump (added 2026-12-27)" — summary of the three changes, the 30-day notice compliance, and the row count before/after in `methodology_versions`.
- Link the merged PR in this proposal's footer.
- Append one line to `docs/research/gaps/iosco-principles.md` Revision log: `2026-11-26 — P7/P8/P12/P14/P19 closed under v1.0.1 docs-only bump per proposals/2026-11-26-methodology-published-quote-self-classification.md. (index-architect fourth run.)`

---

**Source-fetch note.** Direct WebFetch of `www.esma.europa.eu` and `eur-lex.europa.eu` returned `ENOTFOUND` from this session's network policy; same egress limitation as the 2026-05-10 and 2026-05-12 runs. All Article 11 and Principle 7/8/11/12 language above is drawn from the quotations already captured in the prior-session note [listings-vs-transactions-iosco-p7](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md), which reconstructed them from IOSCO- and ESMA-published excerpts and training knowledge. A future session with egress allowlisted for `www.iosco.org` + `eur-lex.europa.eu` + `www.esma.europa.eu` should download FR07/13, IOSCOPD549 and the consolidated Regulation (EU) 2016/1011 into a research-only artifact and reconcile any wording drift against this proposal's §2a. If a mismatch is found, a v1.0.2 docs-only patch via the same procedure corrects it.

**External-content safety.** Every passage quoted within double-quotes in the §2a page text is wording this proposal is prepared to defend on its own terms as a disclosure authored by CTI — not a reproduction of an external document asking us to behave in a particular way. External-page text continues to be treated as untrusted data throughout.

**Merged PR:** _to be filled in by the merger._
