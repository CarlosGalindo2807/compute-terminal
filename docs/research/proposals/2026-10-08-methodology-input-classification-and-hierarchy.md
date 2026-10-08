# Proposal: Classify CTI as a published-quote benchmark and publish the data-input hierarchy

| | |
|---|---|
| **Date** | 2026-10-08 |
| **Author** | index-architect (fourth run) |
| **Risk class** | methodology-disclosure (edits a hard-limit page; does **not** change `PUBLISHED_METHODOLOGY` values) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit per `.github/CODEOWNERS`). No change to `packages/shared/src/methodology.ts`, `apps/workers/src/functions/index-calculator.ts`, `apps/workers/src/functions/outlier-detector.ts`, `apps/workers/src/functions/methodology.test.ts`, or any migration. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member) |
| **Effective date if approved** | On merge. See §Migration — this is not a methodology-value change, so the 30-day notice period does **not** apply; it is a disclosure clarification that strengthens the P7/P8 position of the already-published v1.0 formula. If the Committee prefers to treat *any* edit to `/methodology` as a public-notice change, propose an effective date ≥ 30 days after merge; see §Risks. |
| **References** | IOSCO FR07/13 P7 (Data sufficiency), P8 (Hierarchy of data inputs); EU BMR Reg. (EU) 2016/1011 Art. 11(1)(c), Art. 11(3)(d); companion note [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md); gap matrix [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) rows P7, P8. |

---

## Problem

Two of the four P0 gaps in [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) are structurally about what the published `/methodology` page *says*, not about what the formula does:

- **P7 (Data sufficiency).** CTI inputs are scraped **listings** (asks), not observed trades. A strict IOSCO reader of Principle 7 — "anchored by observable transactions entered into at arm's length between buyers and sellers" — can press hard on a benchmark whose every input is a published ask. The companion note shows the position is defensible on substance (firm executable quotes from a real arms-length market, akin to BMR Art 11(1)(c) "committed quotes", and in line with how Baltic freight indices, oil PRAs on illiquid grades, and MSCI/IPD property indices satisfy regulators without a public trade tape). But today `/methodology` makes no classification claim, so an external reviewer has to construct the defence from scratch. That's the exact failure mode the Baltic Exchange and LBMA avoid by *owning* their input classification in their methodology statements.

- **P8 (Hierarchy of data inputs).** The hierarchy exists in code (rule → alias → fuzzy → Claude≥0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP) but is nowhere published. BMR Art 11(3)(d) explicitly requires administrators to "draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement." Today an auditor cannot cite a URL for that hierarchy; they'd have to read `apps/workers/src/functions/normalize-unmatched.ts` and `outlier-detector.ts`.

Both gaps resolve with the same edit to the same page. Research is done; this proposal is the specific page-text change.

## Proposed change

Edit `apps/web/app/methodology/page.tsx` to insert **two new sections** between the existing "Formula" section (ends at the "Quorum" paragraph, ~line 134) and the existing "Index Committee" section (starts ~line 137):

### Section 1 — "Input classification"

Inserted directly after the current "Quorum" subsection. Verbatim text proposed:

> **Input classification.** CTI is a **published-quote benchmark**. Every input to the formula above is a firm, executable on-demand list price captured mechanically from a provider's own price endpoint — not an observed trade and not an expert-judgment submission.
>
> We are explicit about this because IOSCO Principle 7 and EU BMR Article 11 draw a bright line between transaction data and quotes. On-demand GPU compute has no public consolidated transaction tape: no venue publishes trade prints. The underlying market is nonetheless a genuine arms-length cash market for GPU-hours, and the quotes CTI ingests are **committed quotes** in the BMR Art. 11(1)(c) sense — a user can execute at the quoted price by clicking rent on the provider's site, without renegotiation. This is substantively closer to exchange firm quotes than to indicative submissions.
>
> We publish this classification rather than claim unqualified transaction-anchoring because *owning the limitation* is what IOSCO-aligned administrators do when their market has no tape — see the Baltic Exchange freight indices (panel assessments, EU-BMR-compliant, settle cleared FFAs), oil PRA Market-on-Close assessments (bids + offers + confirmed trades, weighted per methodology), and MSCI/IPD real-estate indices (independent appraisals, no trade tape). CTI's input discipline — mechanical capture, schema-validated, outlier-filtered, no human submission step — is arguably stronger than any of these on *input integrity*; the P7-honest classification just names the input type precisely.
>
> A transactional anchor is under construction: the `invoice_observations` schema (migration 011) is the designed home for anonymised real-paid prices by `(provider, gpu_model, spend_band, contract_type)`. Once populated, CTI will publish a periodic reconciliation of the published list-price index against observed effective prices — the gold-standard P7 artefact an auditor expects without requiring the published formula to admit transaction inputs. Any future methodology that promotes `invoice_observations` into the formula's input hierarchy is a methodology-class change following the full 30-day Committee procedure below.

### Section 2 — "Hierarchy of data inputs"

Inserted immediately after Section 1. Verbatim text proposed:

> **Hierarchy of data inputs.** Per EU BMR Article 11(3)(d), the following is the complete, deterministic sequence by which an observation becomes eligible for the formula above. There is **zero expert judgment** in the published-number path.
>
> 1. **Capture.** TypeScript-native scrapers (Vast.ai REST, RunPod GraphQL, Lambda HTML) run on Vercel Functions every 5 min. Each HTTP response is parsed by a Zod schema; shapes that don't match the contract are dropped, not silently coerced, and a `scraper_run_failed` event is written.
> 2. **Normalization.** The scraped GPU string is resolved to a canonical `gpu_model_id` via, in order: (a) exact-match rule; (b) alias table; (c) fuzzy match ≥ 0.90 against the catalog. Unresolved strings are enqueued to `unmatched_listings`.
> 3. **LLM normalization (asynchronous, out-of-path).** An hourly batch asks Claude Sonnet to resolve queued strings. Confidence **≥ 0.95** → auto-promoted to a `normalization_rule` and back-filled; **0.70–0.95** → queued at `/admin/unmatched` for one-click human approval; **< 0.70** → left pending. The LLM never writes to `price_snapshots.price_per_hour`; it only maps strings to catalog ids.
> 4. **Outlier flag.** Every 15 min, MAD-3σ against the per-GPU-model 1-hour price distribution writes `price_snapshots.is_outlier`. The flag is auditable per-snapshot and the same formula applies to every observation.
> 5. **Reliability floor.** Provider `reliability_score` auto-decays on sustained outlier ratio > 30 % and recovers after 7 days of stability — no manual override. Observations from providers with `reliability_score < 0.5` are excluded entirely from the formula.
> 6. **Universe check.** Only observations whose `gpu_model_id` is in the target index's declared universe are eligible.
> 7. **Window.** Only observations captured in the trailing 24 h window at the nightly 00:30 UTC fixing are eligible.
> 8. **Quorum.** If fewer than 5 eligible observations remain for a given index, no value is published for that day. We never extrapolate, never carry forward, and never fall back to a different formula; a `index_value_skipped` event is recorded.
> 9. **Formula.** The surviving set `E_t` is fed to `filtered_vwap` v1.0 — the num_gpus-weighted mean after MAD-3σ outlier exclusion against the per-set median.
>
> Stages 1–3 shape *what is a valid observation* (type coercion, catalog identity, string normalization). Stages 4–8 shape *what is an eligible input to the formula* (quality, universe, time, sufficiency). Stage 9 is the formula itself. No stage uses a value that depends on who is operating the pipeline today. Every stage writes a durable row to a version-stamped table that can be replayed.
>
> If a future methodology version introduces a new input class (e.g. invoice observations as transactional anchors), this hierarchy is amended by the same proposal and 30-day-notice procedure as the formula itself.

### No change to the formula, the Committee section, the AI-orchestration cards, or the version-history table

The proposed edit is strictly additive: two new sections of page text. The `PUBLISHED_METHODOLOGY` constant, the lock test, the outlier detector, the index calculator, and every migration are untouched. The published value for any index on any day is bit-identical before and after this change.

## Why this is the right shape (vs. alternatives)

Three alternatives were considered against the §4 Track-A recommendation of the companion note.

**Alt 1 — Do nothing; argue P7 defence case-by-case when it is raised.** Rejected. Every serious benchmark administrator with a tape-less underlying market (Baltic Exchange, Platts, Argus, MSCI/IPD, NCREIF) publishes its input classification *in* its methodology statement, not in private correspondence. CTI is unusual in *not* doing so for v1.0; the gap is cheap to close and visibly load-bearing. Doing nothing leaves the two highest-priority quality-pillar gaps open while every follow-on conversation (licensee, auditor, counsel) has to re-derive the defence.

**Alt 2 — Change the formula to include transactional inputs now.** Rejected (and out of scope for this proposal). The `invoice_observations` table is empty; promoting an unpopulated input into the published formula would (a) not strengthen P7 — "we admit transaction data in principle" is weaker than "here is the reconciliation report against trailing-90-day observed effective prices" — and (b) require full Committee procedure, 30-day notice, 90-day backtest, and new tests against a dataset that doesn't exist. The right sequence is: build the invoice ingest pipeline → publish the reconciliation report → *then* consider a methodology-class change in a future proposal. That path is explicitly flagged as Track B in the companion note and remains on the P1 queue.

**Alt 3 — Publish both sections, but on a new standalone page (e.g. `/methodology/inputs`).** Rejected. `/methodology` is the surface external readers (auditors, licensees, licensees' counsel) will cite. Fragmenting the methodology spec across multiple URLs loses the one-URL-is-the-contract property that justifies the hard-limit lock in the first place. The sections belong in `/methodology/page.tsx` directly.

The chosen shape — two additive sections on the existing hard-limit page, carefully worded to classify precisely without overclaiming — mirrors how LBMA, Baltic Exchange, and MSCI write their input-classification language in their own IOSCO statements of compliance.

## Empirical impact

The published value is **unchanged**. The methodology constants, the formula, the outlier filter, the reliability floor, the quorum, and the universe are all untouched. Therefore:

- **Backtest:** not applicable in the usual sense (no formula change). Diff of `PUBLISHED_METHODOLOGY` before/after this proposal = `{}`. The lock test `methodology.test.ts` continues to pass with no changes to its expected snapshot.
- **Sensitivity:** n/a — no parameter is changing.
- **Coverage impact:** zero provider-days change eligibility.

The empirical signal that "this works" is instead:
- `pnpm -r typecheck` passes (edit is to a `.tsx` page with text-only JSX inserts, same component shape).
- A manual read-through of `/methodology` after merge confirms the two sections render in the correct order (between "Quorum" and "Index Committee"), with correct dark-mode styling using the existing `rounded border border-bg-border bg-bg-surface p-6` card idiom.
- `methodology_versions` table is **not** modified. No new row. No `methodology_changes` row. This is a disclosure, not a methodology change. See §Risks for the committee's call on whether that framing is defensible.

A verification checklist for the reviewer, in the PR body:
- [ ] `pnpm -r typecheck` — green
- [ ] `pnpm --filter @compute-terminal/workers test methodology.test` — green (unchanged)
- [ ] `git diff packages/shared/src/methodology.ts` — empty
- [ ] `git diff apps/workers/src/functions/index-calculator.ts` — empty
- [ ] `git diff apps/workers/src/functions/outlier-detector.ts` — empty
- [ ] `git diff packages/db/migrations/` — empty
- [ ] Visual check on preview deploy: two new sections render, no formula edit

## Risks

**Immediate (negligible).**
- *JSX edit breaks the page build.* Mitigated by `pnpm -r typecheck` + preview deploy before merge.
- *Dark-mode or mobile layout regression.* Low — the proposed sections reuse existing component idioms (`<section className="mt-16">`, `rounded border border-bg-border bg-bg-surface p-6`). Preview check covers it.

**Second-order (worth deliberating).**
- *Is this a "material change" to the methodology under our own charter?* The Committee charter (`/methodology`, Step 3) requires 30 days' public notice for a *change* to the published methodology. This proposal does **not** change the published value for any input — the formula constants are frozen — and so our reading is that it falls below the "material change" bar. A conservative reading could say that *anything* appearing on `/methodology` is methodology and therefore the 30-day clock should run anyway. The Committee should pick one of two framings:
  - **(a)** Treat as docs-only clarification — merge on approval, effective immediately, no `methodology_changes` row, no version bump. This is our recommendation; the companion note classifies the edit as a disclosure, not a methodology change, and the published number is bit-identical.
  - **(b)** Treat as a formal `/methodology` edit requiring 30-day notice — add a `methodology_changes` row with `change_type='disclosure'`, `effective_from = merge_date + 30d`, display a banner on `/methodology` during the notice window, and merge the page edit on the effective date (not on PR merge). Costs a month of latency for a near-zero-risk edit, but exercises the public-notice procedure for the first time (closes gap-matrix P12 "untested" status). If chosen, note that the proposal to *dry-run* the notice procedure (gap-matrix P12 action item) is intentionally not this proposal — this one is substantive — but doing it anyway here would double-up the value.
- *Overclaim risk.* The proposed text names BMR Art. 11(1)(c) "committed quotes" as the applicable fallback class. A reviewer could argue a scraped list price is not quite a "committed quote" in the strict Regulation sense (which contemplates a dealer explicitly quoting a tradeable size). The text is deliberately hedged ("in the BMR Art. 11(1)(c) *sense*") rather than claiming formal classification; the Committee should confirm the hedge is strong enough. If not, we tone down to "executable list prices" and drop the BMR reference, keeping only the IOSCO defence.
- *Reduces future flexibility.* Once `/methodology` names a specific hierarchy with 9 stages, changing the hierarchy later is a methodology-class event. This is a feature, not a bug — the whole point of a locked spec is that drift is visible. But the Committee should confirm the 9-stage breakdown as proposed is the one we want to live with.
- *Legal counsel review.* This proposal makes explicit public claims about how the benchmark relates to IOSCO P7/P8 and BMR Art. 11. For v1.0 — pre-registration, no licensees — this is low risk. Before the first licensee signs, the full `/methodology` page (including this classification) should be reviewed by counsel. Not blocking for this proposal; flagged for the licensee-conversation workstream (Roadmap D18).

**No regression risk** on the formula, the data pipeline, the audit tables, or the hard-limit lock test. All of those are unchanged.

## Migration / rollout plan

Under framing (a) — recommended docs-only path:

1. **Merge.** PR edits only `apps/web/app/methodology/page.tsx` (two new sections) plus this proposal doc under `docs/research/proposals/`. No code elsewhere, no migrations, no new tests, no changes to any hard-limit file apart from the page itself.
2. **Deploy.** Vercel preview on PR, then auto-deploy to production on merge. The page is ISR'd (`revalidate = 300` on `apps/web/app/methodology/page.tsx`) — cold-cache users see the new sections within 5 min of merge; everyone else at the next ISR regeneration.
3. **No methodology_versions row.** No new row in `methodology_versions`. The published formula remains v1.0; `PUBLISHED_METHODOLOGY_VERSION` stays `'v1.0'`. The methodology lock test `methodology.test.ts` continues to pass against the unchanged constant.
4. **No `methodology_changes` row.** This is not a methodology change — nothing a licensee's settlement contract references has moved. If the Committee elects framing (b), add a row with `change_type='disclosure'`, `summary='Published input classification and data-input hierarchy'`, `effective_from=<merge + 30d>` — but this is not the recommended path.
5. **Update companion docs.** On merge, this proposal moves from "proposed" to "merged" by updating its footer with the merged PR URL and merge date. The gap-matrix rows P7 and P8 in `docs/research/gaps/iosco-principles.md` are updated to `compliant` (with a cross-link to the merged proposal), and the P0 queue is shortened accordingly. The companion note gets a "status: adopted via proposal YYYY-MM-DD" header line.
6. **What to monitor after merge.** `system_events` for any `methodology_*` event (should be none — this is a disclosure, not a change). `/methodology` page render time (should be unchanged — the new sections are static JSX). No new metric needs alerting.

**Rollback.** Trivial — revert the PR. The two sections are additive and self-contained; removing them leaves the page in the exact prior state. The underlying formula and audit tables are untouched throughout.

## Committee deliberation prompt

> "We publish an input-classification + data-input-hierarchy disclosure on `/methodology`. The published CTI value does not change: the formula constants, the outlier filter, the reliability floor, the quorum, and the universe are untouched. The disclosure closes IOSCO Principle 7 and Principle 8 by (a) naming CTI as a published-quote benchmark anchored in a tape-less but genuine arms-length cash market, and (b) enumerating the deterministic 9-stage input pipeline. We considered promoting invoice observations into the formula now, and we considered doing nothing; both were rejected per the proposal. We accept that any future change to the 9-stage hierarchy is itself a methodology-class event under our Committee charter. The alternative framing — treating this disclosure edit as a methodology change requiring 30-day public notice — would exercise our untested notice procedure for the first time (closing gap-matrix P12 "untested in practice"); we have elected / have not elected to adopt that framing today. Voted: <yes/no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD."

## Closing

After this proposal is approved (PR merged):
- Mark `docs/research/gaps/iosco-principles.md` rows **P7** and **P8** as `compliant` with evidence pointer "merged PR #<n>, `/methodology` sections 'Input classification' and 'Hierarchy of data inputs'".
- Update `docs/decisions.md` with a new entry titled "Published input classification + hierarchy (2026-10-08)" summarising the chosen framing (docs-only vs. 30-day-notice) and the rationale.
- Shorten the P0 priority queue in the gap matrix to its remaining three entries (P3/P5, P1 Committee naming, P16 complaints) and add this merged PR as a precedent for the next docs-class edits.
- Link the merged PR URL in this proposal's footer.

---

*Proposal footer — populated on merge:*
*Merged PR: <TBD>*
*Merge date: <TBD>*
*Status: proposed → <adopted / adopted-with-amendments / rejected>*
