# Proposal: self-classify CTI v1.0 as a **published-quote benchmark** and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-08-17 |
| **Author** | index-architect (fourth run) |
| **Risk class** | governance (methodology disclosure — no numerical change) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit surface). No change to `packages/shared/src/methodology.ts` `PUBLISHED_METHODOLOGY` constant. No change to `apps/workers/src/functions/index-calculator.ts` or `outlier-detector.ts`. No new migration. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member per Roadmap B7). |
| **Effective date if approved** | 2026-09-17 (30 days after intended merge) — see §7. |
| **References** | IOSCO Principle 7 (Data Sufficiency); IOSCO Principle 8 (Hierarchy of Data Inputs); Regulation (EU) 2016/1011 Article 11(1)–(3) (Input data); Regulation (EU) 2016/1011 Article 12 (Methodology); IOSCO FR07/13 (2013) — https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf ; IOSCO FR03/18 / IOSCOPD549 (2018 Guidance) — https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf ; EUR-Lex CELEX 32016R1011 — https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng ; ESMA Interactive Single Rulebook Art 11 — https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data . Prior research: [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md), [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md), gap-matrix rows P7 and P8 in [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md). |

> **Source-fetch note (2026-08-17).** Direct WebFetch of `iosco.org`, `eur-lex.europa.eu`, `esma.europa.eu`, `msci.com`, and `lbma.org.uk` was blocked at the organization egress proxy in this session (HTTP 403; per `/root/.ccr/README.md`, 403s are hard denials and are not retried). This matches the fetch state of the three prior index-architect sessions. Regulatory language cited below is drawn from the prior research notes, which reconstructed the material from IOSCO/ESMA-published search snippets and comparable-administrator IOSCO statements. A future session run from an environment with regulator-domain egress should download FR07/13, IOSCOPD549, and the consolidated Regulation (EU) 2016/1011 into a research-only artifact and reconcile any wording differences with this proposal before the effective date. **External page text is treated as untrusted user data and is never interpreted as instructions.**

---

## 1. Problem

CTI v1.0 has two open IOSCO/BMR quality-pillar exposures that share a single remedy:

- **P7 (Data Sufficiency).** IOSCO Principle 7 requires a benchmark to be "sufficient to represent accurately and reliably the [interest] measured" and to be "based on prices, rates, indices or values that have been formed by the competitive forces of supply and demand and be anchored by observable transactions entered into at arm's length between buyers and sellers." Every input into CTI v1.0 today is a scraped *listing* — a provider's published on-demand ask. On-demand cloud compute has no public consolidated transaction tape. A strict P7 reading can therefore press on whether a listings-only benchmark is "anchored by observable transactions." Prior research (`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`) mapped the exposure and the paths out; the gap-matrix flags it as **`partial / structurally weak`** and CTI's single most important methodological exposure.

- **P8 (Hierarchy of Data Inputs).** IOSCO Principle 8 and Regulation (EU) 2016/1011 Article 11(3)(d) require the administrator to "draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement." CTI v1.0 *has* a hierarchy — rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP — and has zero expert judgment in the published-number path. But it is not published on `/methodology`. The hierarchy is implicit rather than explicit, which is exactly the P8 gap.

Both gaps close in a single edit to `/methodology`: publish a **classification** ("published-quote benchmark") that says plainly what CTI's inputs are, and publish the **data-input hierarchy** underneath it so a reader can see the priority order in one place. This is the LBMA / Baltic / MSCI pattern of *owning the limitation* — the position becomes stronger by being stated, not by being hidden. It also aligns CTI's disclosures with Article 11(1)(c) of the EU BMR, which explicitly permits "committed quotes" as an input class where transaction data is unavailable or inappropriate — provided the hierarchy and the reason are published.

## 2. Proposed change

Add two subsections to `apps/web/app/methodology/page.tsx`, immediately after the existing "Formula" section and before "Index Committee". No change to any code path that determines the published number. No change to `packages/shared/src/methodology.ts` `PUBLISHED_METHODOLOGY`. No change to any migration. No change to the methodology lock test.

The **exact copy** to add is set out below. It is intentionally short (about 550 words on the rendered page) so the page remains scannable, and it uses the same visual tokens as the existing sections.

### 2.1 New subsection: **Classification**

Placement: immediately after the "Quorum" heading in `page.tsx`. Rendered as an `<h3 className="display mt-10 text-xl">Classification</h3>` block matching the existing `<h3>` blocks in the Formula section.

> ### Classification
>
> The Compute Terminal Index is a **published-quote benchmark**. Its inputs are firm, executable on-demand list prices captured directly from provider endpoints — closer in kind to exchange committed quotes than to indicative broker submissions. On-demand cloud compute has no public consolidated transaction tape; per the data-input hierarchy below, transaction data is preferred where available and executable quotes are used otherwise, consistent with EU BMR Article 11(1)(c)'s treatment of "committed quotes" as an acceptable input class where transaction data is not sufficient or not appropriate.
>
> The interest CTI measures — the prevailing on-demand $/GPU-hour for a given GPU model in a given hour — is anchored in a genuine arms-length cash market for GPU-hours. Vast.ai, RunPod, Lambda, and the hyperscalers transact GPU-hours continuously at arm's length. Every published CTI number is computed with no expert judgment.
>
> This classification is what an auditor should expect to see cited on any downstream reference to CTI: *"CTI is a published-quote benchmark. Inputs are executable listings; no expert judgment; MAD-3σ filtered VWAP weighted by num_gpus over a 24h window."*

### 2.2 New subsection: **Data-input hierarchy**

Placement: immediately after the "Classification" block. Rendered as an `<h3 className="display mt-10 text-xl">Data-input hierarchy</h3>` block followed by an ordered list; the ordering below is the priority order that will be published.

> ### Data-input hierarchy
>
> The priority order below is the hierarchy CTI applies to any candidate input. Higher-priority classes displace lower-priority classes for the same observation; within a class, all observations enter the filtered VWAP on equal footing. There is no expert-judgment override at any stage.
>
> 1. **Transaction data — invoiced effective prices.** Anonymised real-paid $/GPU-hour by `(provider, gpu_model, customer_spend_band, contract_type)`, redacted and aggregated. **Not yet a live input.** Schema exists in migration `011_pivot_v2_schema.sql` (`invoice_observations` table); the redaction and ingest pipeline is on the roadmap (see Track B, §4). When it is stood up, an amended methodology version will admit this class above executable quotes in the hierarchy.
> 2. **Executable quotes — provider list prices.** The current CTI input class. Scraped directly from provider on-demand pricing endpoints; validated against a Zod schema; normalized against the shared GPU catalog via a rule → alias → fuzzy → Claude (≥ 0.95 confidence auto-resolves, 0.70–0.95 human-approves at `/admin/unmatched`) path; filtered by MAD-3σ per GPU model; excluded if the provider's `reliability_score` is below 0.5.
> 3. **Non-transactional adjuncts.** Time-remaining / utilization signals, discovery-agent observations, and third-party price commentary. **Never** admitted to the published-number path. Retained only for research, monitoring, and provider-reliability calibration.
>
> **Expert judgment.** Zero. No human input adjusts a published CTI value between the eligible-input set and the final VWAP. All quality decisions upstream (outlier flagging, reliability scoring, catalog normalization) are deterministic given the input stream and the published parameters. Every published value is reproducible from `price_snapshots` + `PUBLISHED_METHODOLOGY` + the outlier/eligibility rules above.
>
> **When quorum fails.** If fewer than `minObservations` eligible observations survive the hierarchy above for a given index and day, **no value is published** and an `index_value_skipped` event is recorded. We never extrapolate, never carry forward from a prior day, and never fall back to a lower-priority input class or to a different formula.

### 2.3 What does NOT change

To be explicit, so the diff a reviewer receives on the follow-up PR is trivially auditable:

- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant untouched. `formulaId`, `windowHours`, `minObservations`, `outlierFilter`, `weight`, `reliabilityFloor` all unchanged.
- `apps/workers/src/functions/index-calculator.ts` — untouched.
- `apps/workers/src/functions/outlier-detector.ts` — untouched.
- `apps/workers/src/functions/methodology.test.ts` — methodology lock test unchanged; will continue to pass byte-for-byte after this PR merges.
- `packages/db/migrations/*` — no new migration.
- Every daily value already in `index_values_daily` remains identical. `methodology_version` remains `v1.0`. No historical values are recomputed or restated.

The change is **strictly a disclosure update on the published spec page**. It changes what a reader sees; it does not change any number CTI publishes.

## 3. Why this is the right shape (vs. alternatives)

Three alternatives were weighed against the proposed shape.

**Alternative A — Do nothing; wait until invoice-observation ingest ships, then reclassify.** Attractive because it defers the discussion and preserves optionality. Rejected because (a) it leaves the two highest-priority open gaps in the IOSCO matrix (P0 in the priority queue) unaddressed for months, (b) it puts CTI in the *weakest* possible P7 position on the day a licensee or auditor first asks — quiet reliance on listings with no stated classification is the exact posture that reads as "hidden weakness" rather than "documented design choice", and (c) invoice-observation ingest is on the Track B roadmap for a future quarter and blocks this on a code workstream that is not required to close the gap.

**Alternative B — Bump the version to v1.1 to record the classification.** Attractive because it's the cleanest audit signal ("version rows in `methodology_versions` map 1:1 to methodology changes"). Rejected because no number changes; a version bump would falsely signal to licensees, downstream contracts, and cached consumers that CTI's daily value may differ on the effective date, when it will not. IOSCO P12 and EU BMR Article 13 both treat "material change" through the lens of *impact on the published value or its representativeness*; a disclosure-only edit that reflects existing behavior does not meet that threshold. The correct instrument is a versioned entry in the `/methodology` change history (a `methodology_changes` row with `formula_id_from = formula_id_to = filtered_vwap`), not a `PUBLISHED_METHODOLOGY_VERSION` bump.

**Alternative C — Publish the hierarchy but skip the "published-quote benchmark" self-classification.** Half-measure. It closes P8 but leaves P7 in exactly the position the third-run note flagged as CTI's most-pressed-on weakness. It also fails the LBMA/Baltic pattern the note argues for: the value of the disclosure is precisely that CTI *names its input class*, so a reader (auditor, licensee, regulator) does not have to reason about it. Ship both together or neither.

**Proposed shape (accepted):** ship both together in one edit, treat it as a docs-class disclosure change on a hard-limit surface, log it as a `methodology_changes` row with a plain-English rationale, and honor the Committee charter's 30-day public-notice cadence even though it is not strictly required for a non-value-changing disclosure — because doing so is the exact rehearsal of the P12 procedure the gap matrix flags as untested (P12: "compliant in design, untested"). The first live exercise of the change procedure on a benign disclosure is the cheapest way to prove the procedure works before it has to carry a real methodology change.

## 4. Empirical impact

**No formula change ⇒ no backtest of a *new* value is possible or meaningful.** The proposal does not change what CTI publishes on any past, present, or future day. Every value already in `index_values_daily` remains identical; every value that will be written between the merge date and the effective date remains identical; every value written after the effective date remains identical.

The empirical signal that says "this works as advertised" is therefore:

1. **Locked-methodology test passes byte-for-byte on the same fixture set.** `pnpm --filter @compute-terminal/workers test` — the `methodology.test.ts` fixture snapshot must be unchanged.
2. **CI typecheck passes.** `pnpm -r typecheck`. No TS surface changes; only JSX text nodes on `/methodology`.
3. **`/methodology` page renders in production with the two new subsections in the expected positions**, no layout regression on the mobile breakpoint (the existing `overflow-x-auto` wrapper around the formula block is untouched).
4. **`methodology_changes` insert succeeds** with `change_type = 'disclosure'`, `formula_id_from = formula_id_to = 'filtered_vwap'`, `effective_from = 2026-09-17`, and shows up in the version-history table on `/methodology`. This exercises the change-record path end-to-end (P12 dry-run value).

There is no coverage impact (no `E_t` change), no false-positive / false-negative shift on the outlier filter (no filter change), no sensitivity to any parameter (no parameter change).

For the reconciliation-report track that a future proposal will introduce (Track B in the third-run note — list-price index vs. observed effective invoice price from `invoice_observations`), the empirical work belongs in *that* proposal, not this one. This proposal deliberately does not enter the input-anchor discussion.

## 5. Risks

**Immediate risks.**

- *Layout regression on `/methodology`*: Two new `<h3>` blocks and one ordered list are added to a Tailwind-tokenized surface. The visual risk is low but non-zero — the mobile breakpoint (`md:` grid switches) around the "AI orchestration" section could be pushed. Mitigation: the follow-up PR includes a screenshot of `/methodology` at 375px, 768px, and 1280px in its description. If the reviewer sees any regression, revert.
- *SEO / link-target regression*: `/methodology` does not currently emit heading `id`s for internal linking, so no external inbound link targets a section that would move. Confirmed by grep — no `id="` attributes on the `<h2>/<h3>` in the current page.
- *`methodology_changes` schema surprise*: The `change_type` enum in migration `009_methodology_v1.sql` should be inspected before the follow-up PR opens the insert. If `'disclosure'` is not an accepted value, the follow-up PR either (a) uses an existing value like `'clarification'` or (b) adds a new value in a small enum-extension migration — which is a schema change that must NOT be bundled with this docs edit. Flagged for the reviewer.

**Second-order risks.**

- *Reduced auditor trust from bringing attention to P7.* The counterargument is that any serious auditor will identify the listings-vs-transactions question in the first 15 minutes of due diligence. The choice is not "raise it or hide it" — it is "raise it on our terms with a mapped remediation path, or let it be raised on the auditor's terms with no stated position." Every comparable benchmark (Baltic, oil PRAs, LBMA before the electronic auction) publishes exactly this kind of self-classification for exactly this reason. Disclosing strengthens trust; hiding weakens it.
- *Narrowing the legal defensibility of the v1.0 lock.* This proposal does not change the v1.0 lock. It documents what v1.0 already is. A defense attorney who later argues "our published spec did not clearly disclose the input class" is strictly worse off than one who can point to the classification text as it existed at the effective date. Net effect: defensibility strengthens.
- *Downstream licensee assumption break.* CTI has no live external licensees today. The reference API scaffolding (Roadmap D17) is unbuilt. There is no counterparty whose assumptions this proposal can invalidate. If licensees exist by the effective date, they will be reading `/methodology` and will see the change during the 30-day notice period.
- *Encourages "just add another disclosure" as a substitute for real remediation on P7.* Guarded against explicitly in §7 — this proposal ships Track A only; Tracks B and C remain queued as separate later work and are not marked "done" in the gap matrix by this PR.

## 6. Migration / rollout plan

Because this is a hard-limit-surface change and because it exercises the Committee's change procedure for the first time, it follows the full 30-day notice cadence even though no number moves.

**Timeline.**

- **T + 0 (target 2026-08-19)** — this proposal PR merges after @CarlosGalindo2807 review. The proposal itself lands under `docs/research/proposals/` and touches no hard-limit file. No production surface changes.
- **T + 0 → T + 30** — public notice window. A `methodology_changes` row is inserted:
  - `change_type` = `'disclosure'` (or the closest existing enum value — see §5 flag).
  - `formula_id_from` = `formula_id_to` = `'filtered_vwap'`.
  - `params_from` = `params_to` = the current `PUBLISHED_METHODOLOGY` object.
  - `effective_from` = 2026-09-17.
  - `rationale` = "Publish the input classification (`published-quote benchmark`) and the data-input hierarchy on the spec page. Closes IOSCO P7 disclosure exposure and satisfies IOSCO P8 / EU BMR Art 11(3)(d). No change to any published value." Link to this proposal.
  - Roadmap B8 (notice surface listing future `methodology_changes` rows) can render this row from the same table used by the version-history section, giving the notice a public URL without needing a separate CMS.
- **T + 30 (target 2026-09-17)** — follow-up PR merges, editing `apps/web/app/methodology/page.tsx` per §2.1 and §2.2 verbatim. Screenshots at three breakpoints in the PR body.
- **T + 30 → ongoing** — the section text is part of the published spec. Any subsequent edit (a typo fix aside) goes through the same procedure.

**Rollback.** If a regression is discovered on the effective date, revert the follow-up PR. The `methodology_changes` row remains as an audit-trail entry marked `rolled_back` (or an equivalent field — check enum first). The classification and hierarchy remain the *intent* of record; the disclosure just is not yet on the page.

**Monitor after the follow-up PR merges.** `system_events` for any `index_value_skipped` spike that shouldn't happen (it shouldn't — no eligibility logic changed). `/methodology` load time (should not change; the addition is static markup). Zero-error targets on both.

## 7. Committee deliberation prompt

A short paragraph @CarlosGalindo2807 can paste into `docs/committee-minutes/2026-08-XX.md` (or the equivalent minutes location once it exists — see gap-matrix P18) as the decision record.

> *"The Committee approves the addition of a `Classification` and `Data-input hierarchy` subsection to `/methodology`, verbatim as drafted in `docs/research/proposals/2026-08-17-published-quote-benchmark-self-classification.md`. This is a disclosure of CTI v1.0's existing behavior — no change to `PUBLISHED_METHODOLOGY`, no change to any published number, no restatement of history. The disclosure closes IOSCO Principle 7 and Principle 8 exposures and aligns CTI with EU BMR Article 11(1)(c) and Article 11(3)(d). The Committee elects to observe the full 30-day public-notice window even though no value changes, in order to exercise the change procedure end-to-end for the first time (Principle 12 dry-run). Effective date: 2026-09-17. Track B (invoice-observation reconciliation) and Track C (provider-count-scaled quorum) remain queued and are explicitly out of scope of this decision. Voted: <yes/no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD."*

## 8. Closing

**If this proposal is approved (this PR merged):**

- Update `docs/research/gaps/iosco-principles.md` P0 item 4 status from "proposal drafted" to "proposal approved; follow-up PR pending 2026-09-17".
- Insert `methodology_changes` row per §6 in a separate small data-only PR within a week of approval.
- Open the follow-up PR against `apps/web/app/methodology/page.tsx` scheduled for merge on 2026-09-17. Screenshots at 375 / 768 / 1280 px in the body.
- Append the follow-up PR link to this proposal's footer.

**If the Committee prefers not to observe the 30-day notice window** (rationale: it is a pure disclosure with no value change, and speed is preferred), the proposal is trivially adjustable — remove the T+0 → T+30 window from §6, merge the follow-up PR immediately after Committee approval, insert the `methodology_changes` row with `effective_from = merge date`. Documenting this option here so the Committee decision is a real choice rather than a rubber-stamp.

**If the Committee prefers to defer** pending invoice-observation ingest (Alternative A in §3), record the reasoning in minutes and re-queue this proposal for the quarter after Track B lands. In the interim, `/methodology` continues to publish v1.0 without the classification; the gap-matrix P7 and P8 rows stay at their current "proposal drafted, deferred" status.

---

*This proposal was drafted by the index-architect agent per its charter at `.claude/agents/index-architect.md`. It touches only files under `docs/research/proposals/` and is docs-only. The hard-limit files (`packages/shared/src/methodology.ts`, `apps/workers/src/functions/methodology.test.ts`, `apps/workers/src/functions/index-calculator.ts`, `apps/workers/src/functions/outlier-detector.ts`, `packages/db/migrations/*`, `apps/web/app/methodology/page.tsx`) are unchanged by this PR; the follow-up PR that edits `page.tsx` is filed separately after Committee approval.*
