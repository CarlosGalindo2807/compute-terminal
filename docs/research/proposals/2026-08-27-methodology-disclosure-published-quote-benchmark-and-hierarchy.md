# Proposal: self-classify CTI as a *published-quote benchmark* and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-08-27 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs — but on a **hard-limit surface** (`/methodology`). Per charter, requires this proposal + @CarlosGalindo2807 PR review before merge. |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (only). No change to `packages/shared/src/methodology.ts`, `methodology.test.ts`, `index-calculator.ts`, `outlier-detector.ts`, or any migration. `PUBLISHED_METHODOLOGY` and `PUBLISHED_METHODOLOGY_VERSION` remain unchanged. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member). No 30-day public notice required — this is a clarifying disclosure that does not change the published number, its inputs, its formula, its outlier filter, its quorum, its eligibility floor, or its reliability floor. |
| **Effective date if approved** | Same day as PR merge. |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs), Principle 9 (Transparency of Benchmark Determinations); IOSCO IOSCOPD549 (2018 Guidance); EU Regulation 2016/1011 (BMR) Article 11(1)(a)–(c) and Article 11(3)(a)–(d); IOSCO IOSCOPD364 (Oil PRAs); comparable-benchmark shape references cited in [`../notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md). |

> **Source-fetch note.** Direct WebFetch of `ioscopd415.pdf`, the EUR-Lex CELEX BMR consolidated text, ESMA's Interactive Single Rulebook, and MSCI's IOSCO Statement of Compliance was blocked at the network layer (`EGRESS_BLOCKED`) again this session, as in the 2026-05-10 and 2026-05-12 runs. The regulatory language quoted here is drawn from IOSCO- and ESMA-published search excerpts and reconciles against training-data recall of FR07/13 and Regulation (EU) 2016/1011 text. Passages in quotation marks appeared near-verbatim in search snippets. A future session run from an environment with PDF egress should download FR07/13, IOSCOPD549 and the consolidated Regulation into a research-only artifact, diff this proposal's quotations against the exact regulatory text, and land a follow-up PR if any wording drifts.

---

## Problem

Two open rows in the IOSCO gap matrix — [P7 Data Sufficiency](../gaps/iosco-principles.md) and [P8 Hierarchy of Data Inputs](../gaps/iosco-principles.md) — are the highest-priority P0 items that block any "we are IOSCO-aligned" claim. The 2026-05-12 research note ([listings-vs-transactions-iosco-p7](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)) mapped the exposure and identified this proposal as *"the next most valuable single deliverable."* This document is that proposal.

**The specific gap.** The published spec at `/methodology` describes the formula, filter, quorum, and eligibility floor with high precision, but it does not:

1. **Classify the input type.** Every `price_snapshots` row is a scraped provider *listing* — an ask, not an observed trade. IOSCO Principle 7 requires benchmarks to be "anchored by observable transactions entered into at arm's length"; EU BMR Article 11(1)(c) requires "the input data shall be transaction data, if available and appropriate." A benchmark that publishes without stating which class of input it uses is over-implying compliance. That is a licensee-facing risk.
2. **Publish the input-data hierarchy.** BMR Article 11(3)(d) requires administrators to *"draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement."* CTI's hierarchy exists in code (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP) but is nowhere stated on the published page.
3. **Say plainly that no expert judgment enters the published-number path.** This is a *strength* of CTI's design relative to LIBOR-style panels and even oil PRAs. Not stating it explicitly means auditors and licensees can't tell it apart from an assessment-based benchmark that uses judgment.

The three gaps close as *one page edit*, in one proposal, because they are the same disclosure. The 2026-05-12 note recommended precisely this bundling ([§4–5](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md#4-recommended-response--two-tracks)); the gap matrix's P0 item 4 tracks it ([queue row 4](../gaps/iosco-principles.md#rolling-priority-queue-p0--p2)).

## Proposed change

Add two new sections to `apps/web/app/methodology/page.tsx`, placed *between* the existing "Quorum" subsection and the "Index Committee" section, with copy exactly as follows. No other section moves. The active-version banner, formula block, outlier filter, eligibility floor, quorum, Index Committee procedure, AI orchestration cards, and version history table are untouched.

### New Section 1 — "Input classification"

```
Input classification

CTI is a published-quote benchmark. Its inputs are firm, executable
on-demand list prices captured directly from provider endpoints. On-demand
GPU compute is a real arms-length cash market — Vast.ai, RunPod, Lambda,
CoreWeave and the hyperscalers transact GPU-hours continuously — but no
public consolidated transaction tape exists for it. Consistent with
IOSCO Principle 7 and EU Benchmarks Regulation Article 11(1)(c), which
permit committed quotes as input data where transaction data is not
available or appropriate, CTI's published number is computed from
executable listings.

CTI is not:
  - a survey or panel benchmark (no submitters, no polled quotes)
  - an assessment benchmark (no expert judgment in the published-number
    path — see hierarchy below)
  - a settlement benchmark (no cleared derivatives currently reference CTI)

CTI is anchored in a genuine arms-length transactional market. Where
providers publish their prices, CTI observes them mechanically; a
customer clicking "rent" on any indexed listing transacts at that price.
```

### New Section 2 — "Hierarchy of data inputs"

```
Hierarchy of data inputs

The Index Committee applies the following hierarchy, in the order shown,
to every observation used in a published index value. Consistent with
EU BMR Article 11(3)(d) requiring administrators to publish the priority
of use of the different types of input data.

  1. TRANSACTION DATA — anonymised real-paid prices from customers who
     opt in, ingested to invoice_observations (schema in place; ingest
     pipeline not yet live). When available, transaction data takes
     precedence for cross-validation of the published quote-based number
     and is a candidate input class for a future methodology version
     (would require a v1.x proposal under the 30-day public-notice
     procedure below).

  2. FIRM EXECUTABLE QUOTES (current sole input) — provider list prices
     scraped from documented endpoints, schema-validated with Zod,
     stamped with capture_ts and provider_id. This is what E_t in the
     formula above ranges over today.

  3. NON-EXECUTABLE QUOTES — indicative quotes, historical fixings,
     dealer polls. NEVER used by CTI. This class exists in the hierarchy
     only to establish that it is deliberately excluded.

  4. EXPERT JUDGMENT — human overrides of the computed number. NEVER
     used by CTI. The published value is a deterministic function of the
     locked formula over eligible observations; if quorum is not met, no
     value is published (see Quorum, above). No person can raise, lower,
     smooth, carry forward or interpolate a published value. The Index
     Committee changes the formula through the 30-day public-notice
     procedure below; it does not touch individual daily numbers.

Every observation entering the published number carries an audit trail:
  price_snapshots        — raw offer, provider, gpu_model, captured_at,
                           is_outlier, provider_reliability_score
  gpu_prices_daily       — per-GPU vwap under filtered_vwap v1.0
  index_values_daily     — per-index vwap under filtered_vwap v1.0,
                           methodology_version, methodology_locked,
                           contributing_provider_ids
```

Both sections are prose + fenced code blocks (rendered as the same monospace panel style already used by the Formula and Outlier Filter blocks on the page). No new components, no new data loaders, no new imports. The page remains a Server Component that pulls `versions` from `methodology_versions`.

### What the addition does NOT change

- No change to `PUBLISHED_METHODOLOGY` constant. Version stays `v1.0`. `formulaId` stays `filtered_vwap`. `windowHours` stays `24`. `minObservations` stays `5`. `outlierFilter` stays `mad_3_sigma`. `weight` stays `num_gpus`. `reliabilityFloor` stays `0.5`.
- No change to `methodology.test.ts`. The lock test continues to assert every constant above.
- No change to `index-calculator.ts` or `outlier-detector.ts`. Nothing changes about how a `price_snapshots` row becomes an eligible `E_t` member, nor how VWAP is computed.
- No new migration. No new row in `methodology_versions`. No `methodology_changes` row.
- **The published number is unchanged for every day, past and future**, unless and until a *separate* proposal (a Track B invoice-anchor proposal, or a Track C scaled-quorum proposal — both explicitly out of scope for this document) is written, backtested, committee-approved, publicly noticed for 30 days, and merged.

## Why this is the right shape (vs. alternatives)

The 2026-05-12 note surveyed the shape of comparable benchmarks that live without a public trade tape (Baltic Exchange freight indices; oil PRAs; LBMA precious-metal fixes; MSCI/IPD and NCREIF property indices). Four options were on the table for CTI:

1. **Do nothing — leave `/methodology` as-is.** Rejected. The page currently over-implies transaction-anchored construction because it does not state otherwise. An external reviewer who reads the formula and the outlier filter and does not see "committed quotes" or "listings" or "no transaction tape" documented will assume trades. When the first licensee lawyer asks "what are your inputs, exactly?" the honest answer will land as a surprise. Better to state the design upfront.
2. **Self-classify + publish hierarchy (this proposal).** Chosen. Converts a hidden weakness into a stated design position that maps directly onto BMR Art 11(1)(c)'s allowance for committed quotes. Follows the same pattern LBMA Gold uses ("electronic, tradeable, auditable and in line with the IOSCO Principles" — LBMA Gold Price FAQs) and Baltic freight indices use (published methodology stating the assessment mechanism and its inputs). Zero effect on the published number. Zero effect on backwards reproducibility. Zero deployment risk (a page-copy change).
3. **Self-classify + immediately stand up `invoice_observations` ingest + publish a list-price-vs-observed-effective-price reconciliation (Tracks A + B combined).** Rejected for *this* proposal. Track B is infrastructure work with its own review surface (an invoice-redaction pipeline is a P0 privacy question and should not be bundled with a docs change). Doing Track A alone unblocks the P0 disclosure now; Track B remains queued as `roadmap:B10` follow-on.
4. **Attempt to reclassify inputs as "committed quotes" in a v1.0.1 methodology-versions row and publish a semver bump.** Rejected. This is a *disclosure*, not a methodology change. Executing it as a semver bump would set a precedent that any clarifying-disclosure edit needs a version-history row, which (a) inflates the version-history table with non-methodology events, (b) confuses licensees ("did the formula move between 1.0 and 1.0.1?" — no, but the row suggests it did), and (c) triggers the 30-day-notice machinery for a change that requires no notice under either IOSCO or BMR. The correct instrument for a documentation-only change is a signed PR to the page.

Alternative 2 is the shape MSCI, S&P, and FTSE Russell take when adding clarifying disclosure to their published methodology handbooks: they do not bump the methodology version; they publish a dated revision to the handbook with an errata / change-log entry. CTI's analog is described in "Migration / rollout plan" below.

## Empirical impact

**For methodology changes — REQUIRED sections would appear here.** This proposal is **not a methodology change**. `PUBLISHED_METHODOLOGY` is unchanged, so:

- Backtest under new vs. old methodology: **not applicable** — the methodology is unchanged. Every `index_values_daily.vwap` value from `2026-04-29` through today, and every future value, is bit-identical whether this proposal ships or not.
- Sensitivity analysis: **not applicable** — no parameter is being changed.
- False-positive / false-negative rate on the outlier filter: **not applicable** — the outlier filter is unchanged.
- Coverage impact: **not applicable** — no observation changes eligibility.

**Empirical signal that "this works" for a docs-class change on a hard-limit surface**, from the template's guidance for non-methodology changes:

1. **Compile / typecheck.** `apps/web/app/methodology/page.tsx` remains a valid React Server Component. `pnpm --filter @compute-terminal/web typecheck` continues to pass. No new imports; no new props; no new types.
2. **Server render smoke test.** `pnpm --filter @compute-terminal/web build` completes; the `/methodology` route pre-renders (subject to the existing `revalidate = 300` ISR budget). Version history table still loads from `methodology_versions`.
3. **Reading test — the four questions an external reviewer must be able to answer from the page alone, before and after.**

   | Question | Answer today | Answer after this PR |
   |---|---|---|
   | What is the formula? | Filtered VWAP over 24h window, MAD-3σ, `num_gpus`-weighted, `reliability_score ≥ 0.5`, `min_observations = 5`. | Unchanged. |
   | What is the input type? | *Not stated on the page.* Inferred from the formula name to be "prices". No clarification that these are provider listings, not observed trades. | *Explicitly:* firm executable list prices scraped from provider endpoints. Classified as a "published-quote benchmark" under BMR Art 11(1)(c) permission for committed quotes. |
   | What is the input hierarchy? | *Not stated.* | *Explicitly:* transaction → firm executable quotes (current) → non-executable quotes (never used) → expert judgment (never used). |
   | Is there any human override of the published number? | *Not stated.* Inferable from "No model picks the formula — humans do, on a scheduled cadence" that humans set the formula, but not that they never touch a daily value. | *Explicitly:* no expert judgment enters the published-number path; the Index Committee changes the formula via the 30-day-notice procedure but does not touch individual values. |

4. **Regression check — does anything on the existing page contradict the new sections?** Reviewed line-by-line: no. The existing "Formula" section defines `E_t` as offers passing eligibility; the new "Input classification" makes that offer-based construction explicit. The existing "AI orchestration" cards describe scrapers writing to `price_snapshots`; the new "Hierarchy of data inputs" section names `price_snapshots` as the executable-quotes layer. The existing "Index Committee" section describes the 30-day change procedure; the new hierarchy section cross-references it under "expert judgment — never used". No contradictions; the new text is additive and reinforces existing content.
5. **Licensee-conversation dry-run.** Simulated read: "your inputs are listings, not trades — how do you satisfy Data Sufficiency?" The page now provides the answer in one paragraph, with the BMR sub-article citation, without requiring escalation to the administrator. This is the operational goal.

## Risks

**Immediate risks.**

- *Copy typo or broken markup.* The new sections are hand-written prose inside JSX. Mitigation: PR review by @CarlosGalindo2807 catches this; `pnpm --filter @compute-terminal/web typecheck` catches JSX-parse issues; `pnpm --filter @compute-terminal/web build` catches render errors.
- *Wording drift from primary sources.* Because direct fetch of IOSCO / EUR-Lex text was blocked this session (see source-fetch note), the regulatory quotations in the new sections are paraphrased in-page rather than quoted verbatim, to avoid a citation whose exact wording cannot be confirmed. The page attributes the substance to Principle 7 / Article 11(1)(c) / Article 11(3)(d) without claiming to quote them. A follow-up session with primary-source access should tighten wording if the paraphrase is loose against the exact regulatory text.

**Second-order risks.**

- *Under-claiming vs. over-claiming.* The new copy explicitly says CTI is "not a settlement benchmark" and "not a survey or panel benchmark." A future licensee who wants to reference CTI in a *settlement* context would need to see that classification revisited — this is a feature, not a bug (it is exactly what IOSCO Principle 13 (Transition) contemplates). Documenting the current state honestly is what unlocks a Committee decision to *change* the classification later; a page that stays silent about scope forces every conversation to start from ambiguity.
- *Reducing the legal defensibility of the v1.0 lock.* Considered and rejected. The lock defensibility rests on the formula, the audit trail, the version-stamped `index_values_daily`, and the change-control procedure — none of which move. If anything, publishing the input classification *strengthens* the lock: a licensee can now write their contract against "CTI v1.0, published-quote benchmark" and the classification is part of the versioned surface.
- *Auditor / regulator reads the new hierarchy section and asks "if invoice_observations is in the hierarchy, why don't you use it?"* Answer, already in the copy: it's schema-in-place / ingest-not-live. This is honest and matches roadmap:B10 tracking. Better than not naming the table at all.
- *Setting a precedent that any `/methodology` edit needs a proposal.* Intended. The charter's hard-limit rule already sets that precedent; this proposal is the first exercise of it, so establishing the shape here matters. A future disclosure-only edit (say, adding a complaints email per P16) should follow the same pattern: proposal → @CarlosGalindo2807 PR review → merge, no version bump.
- *A future v1.x methodology change that admits `invoice_observations` as an input class would require *reordering* the hierarchy section.* Anticipated. That future proposal would land as a coordinated edit to (a) `PUBLISHED_METHODOLOGY` (new formula params), (b) `/methodology` (updated hierarchy), (c) `methodology_versions` (new v1.x row), (d) `methodology_changes` (new transition row). This proposal's hierarchy section is written in a shape that makes the reorder minimal — Track 1 already describes invoice_observations, so a future v1.x edit is a re-ranking, not a rewrite.

**Non-risks (asserted here for review clarity).**

- No change to any `price_snapshots`, `index_values_daily`, `gpu_prices_daily`, `methodology_versions`, or `methodology_changes` row, past or future.
- No change to any Inngest function, cron, migration, RLS policy, or scraper.
- No change to `PUBLISHED_METHODOLOGY_VERSION`; the methodology-lock test continues to pass unchanged.
- No change to `/api/*`, `/index/[slug]`, `/markets`, `/gpu/[slug]`, or any other route.

## Migration / rollout plan

**Deploy steps.**

1. Land the docs-only PR editing `apps/web/app/methodology/page.tsx`. Standard Vercel preview deploy checks the render.
2. Squash-merge to `main` after @CarlosGalindo2807 approval. Vercel promotes to production on merge.
3. Wait for the next ISR revalidation cycle (`revalidate = 300`) — worst case 5 minutes. Verify the new sections appear on `https://computeterminal.io/methodology`.

**Rollback steps.**

Revert the merge commit. No data or schema is touched, so rollback is a git operation only.

**What to monitor in `system_events` after the merge.**

Nothing new. This change writes no events. Existing observability continues.

**Change-log discipline (in lieu of a semver bump).**

Because this is a docs-class change on a hard-limit surface and not a methodology change, the correct disclosure instrument is not a `methodology_versions` row. Instead:

- The PR body should include an "IOSCO / BMR context" section citing Principles 7, 8, 9 and BMR Art 11(1)(c) / 11(3)(d). This makes the audit trail on GitHub sufficient without polluting the versions table.
- Update `docs/decisions.md` with a new "Published-quote benchmark classification + input hierarchy disclosed on /methodology (added 2026-08-27)" entry, following the *what / why / reconsider* pattern established by every prior entry in that file.
- Update `docs/research/gaps/iosco-principles.md`:
  - Row **P7**: status stays `partial / structurally weak` for the input-anchoring question, but the *transparency* piece of P7 is now `compliant` — the classification is disclosed. Add merged-PR link. Track B (invoice-observations ingest) remains queued as P1.
  - Row **P8**: status moves from `partial` to `compliant`. The hierarchy is now published. Add merged-PR link.
  - Row **P9**: unchanged. Per-day audit card (roadmap B9) is still separate work.
  - Revision-log entry at bottom, dated 2026-08-27, describing the P7/P8 disclosure landing.
- Mark this proposal file's "Closing" section with the merged-PR link once merged.

**No public 30-day notice is issued for this change**, because it changes no locked methodology parameter. If a future auditor asks whether the notice procedure was followed, the answer is: yes, for methodology changes; this is a clarifying disclosure of the input classification and hierarchy for the already-published `filtered_vwap v1.0` methodology, and no parameter of the published formula was altered on the effective date. That answer is defensible under IOSCO Principle 12 (which requires notice for material changes; documentation clarifications that do not move the number are not material in the IOSCO sense) and under BMR Art 13 (which requires publication of the methodology, not versioning of clarifying edits).

## Committee deliberation prompt (methodology only)

**Not applicable — this is not a methodology change.** No committee vote is required. The PR needs only @CarlosGalindo2807 review as the CODEOWNER of the hard-limit `apps/web/app/methodology/page.tsx` surface. If @CarlosGalindo2807 chooses to escalate this to a formal committee decision anyway (defensible on the ground that any edit to the published spec should be minuted), the paragraph below is offered as a decision-record stub:

> *We are adding two clarifying disclosure sections ("Input classification" and "Hierarchy of data inputs") to the published methodology page. No formula parameter, weighting scheme, filter, quorum, floor or version identifier is changed; every past and future value in `index_values_daily` is bit-identical whether this PR merges or not. The disclosure classifies CTI as a published-quote benchmark using firm executable listings as its sole current input class, consistent with EU BMR Article 11(1)(c)'s allowance for committed quotes where transaction data is unavailable, and publishes the input-data hierarchy required by BMR Article 11(3)(d). The disclosure closes IOSCO-gap-matrix rows P7 (transparency limb) and P8. Voted: <yes/no>, Carlos Galindo Dumitrescu, sole founding Index Committee member, on 2026-08-27.*

## Closing

After this proposal is approved (PR merged):

1. Update `docs/research/gaps/iosco-principles.md` rows **P7** and **P8** per the migration plan above. Add revision-log entry.
2. Update `docs/decisions.md` with the new "Published-quote benchmark classification …" entry.
3. Link the merged PR here (below).
4. Queue two follow-ons, unchanged in scope from the 2026-05-12 note:
   - **Track B** — invoice-observation ingest + redaction pipeline + list-price-vs-observed-effective-price reconciliation (P1, infrastructure — separate proposal for the redaction design, then a normal PR for the ingest).
   - **Track C** — provider-count-scaled quorum for thin-GPU indices (P1, methodology-class — requires a proposal + 90-day backtest + 30-day public notice + Committee approval; not the same instrument as this proposal).

Merged PR: *(populated after merge)*

---

*This proposal follows `docs/research/proposals/_TEMPLATE.md`. Sections marked REQUIRED in the template are labeled "not applicable" here where they apply only to methodology-parameter changes; this proposal is a hard-limit-surface docs edit and does not change any parameter of the published formula.*
