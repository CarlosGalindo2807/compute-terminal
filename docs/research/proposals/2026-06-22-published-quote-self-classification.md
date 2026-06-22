# Proposal: self-classify CTI as a *published-quote benchmark* and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-06-22 |
| **Author** | index-architect (fourth run) |
| **Risk class** | methodology (disclosure-only — adds published commitments to `/methodology`; does NOT change any constant in `PUBLISHED_METHODOLOGY`) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit surface) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member at v1.0) |
| **Effective date if approved** | 2026-07-22 (≥ 30 days after merge per the Committee charter on `/methodology` Step 3) |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency); IOSCO FR07/13 Principle 8 (Hierarchy of Data Inputs); IOSCO FR03/18 (IOSCOPD549) Guidance §3.2; EU BMR Regulation (EU) 2016/1011 Article 11(1)(a)(c) and Article 11(3)(d); EU BMR Annex II (commodity-benchmark transparency on inputs and waterfall); LBMA Gold/Silver Price methodology (ICE Benchmark Administration); Baltic Exchange *Guide to Market Benchmarks* v8.3, April 2026; IOSCO/IEA/IEF/OPEC *Oil PRAs* (IOSCOPD364, 2012). |

---

## Problem

`docs/research/gaps/iosco-principles.md` flags **P7 (Data Sufficiency)** as
`partial / structurally weak` and **P8 (Hierarchy of Data Inputs)** as `partial`.
Both are top-of-queue P0 items. The companion note
[`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
documented the underlying issue in detail and concluded that the single
highest-leverage next deliverable is **this proposal** — converting two
hidden methodological positions into stated, defensible design choices on
the published `/methodology` page.

The two positions, in plain English:

1. **CTI's inputs are firm, executable on-demand list prices** captured
   directly from provider endpoints. They are not observed trades. They are
   not indicative submissions. They behave substantively like the
   "committed quotes" class explicitly admitted by EU BMR
   Article 11(1)(c). The `/methodology` page does not yet say this. A
   serious external reviewer reading `/methodology` today would not be able
   to tell, from the page alone, what *type* of input the index runs on —
   only that some formula is applied to "eligible offers."
2. **CTI has an implicit but unpublished hierarchy** of how raw scrape
   outputs become VWAP-eligible inputs (rule → alias → fuzzy → Claude ≥ 0.95
   auto → Claude 0.70–0.95 admin queue → outlier check → reliability check
   → eligibility check). BMR Article 11(3)(d) requires administrators to
   "draw up and publish clear guidelines regarding the types of input data,
   the priority of use of the different types of input data and the
   exercise of expert judgement." We have those guidelines; we have not
   published them.

The fix to both is the same surface — a text addition to
`apps/web/app/methodology/page.tsx` — which is why this proposal bundles
them. Shipping the disclosure converts the index's most-pressed-on
methodological exposure (P7) and its biggest documented-but-undisclosed
control (P8) into two stated design positions in a single committee cycle.

This proposal does **not** change `PUBLISHED_METHODOLOGY`. It does not
change any published number. It does not change behaviour of
`index-calculator.ts`, `outlier-detector.ts`, or any test. It only
publishes information already true about how the index works.

## Proposed change

Add two new sections to `apps/web/app/methodology/page.tsx`, immediately
**after** the existing "Quorum" subsection (line 134) and **before** the
"Index Committee" section header (line 137). Both are static JSX inside
the existing `<main>` container; no new data fetches, no new components
beyond reusing the existing typographic patterns from the file.

### Section 1 — "Input classification" (new `<section>`, ~ line 135)

Exact rendered text (final word-smithing in the implementation PR, but the
substance is locked here):

> **Input classification.** CTI is a *published-quote benchmark*. Every
> input row is a firm, executable on-demand list price captured directly
> from a provider's published endpoint — what a buyer would actually pay
> if they clicked "Rent" at that moment. They are not indicative
> submissions and they are not estimated values. On-demand cloud compute
> has no public consolidated transaction tape, so the benchmark is
> computed from the next-best class of input that EU BMR explicitly
> admits: *committed quotes* (Regulation (EU) 2016/1011, Article 11(1)(c)).
>
> The interest measured — the prevailing on-demand $/GPU-hour for a given
> GPU model — is anchored in a genuine arms-length cash market for
> GPU-hours. CTI does not, at v1.0, claim unqualified compliance with
> IOSCO Principle 7's transaction-anchoring requirement; transactional
> data (anonymised invoice observations) is on the roadmap as a
> reconciliation layer published alongside, not above, the locked v1.0
> formula. See the Index Committee version history for any future
> change in input class.

### Section 2 — "Hierarchy of data inputs" (new `<section>`, follows Section 1)

A short numbered list under the heading "Hierarchy of data inputs",
matching the typographic style of the existing "Outlier filter (MAD-3σ)"
and "Eligibility floor" sub-headings. Each step names (a) the
deterministic rule that applies and (b) the table the artifact lands in.

Bullet structure (rendered as a styled ordered list):

1. **Scrape.** Provider's public price endpoint is fetched on its own
   cron. Output is validated against a per-provider Zod schema; rows
   that do not parse are dropped, never silently coerced.
2. **Normalize.** GPU strings resolve through a deterministic waterfall:
   exact rule match → alias match → fuzzy match. Anything left is
   batched hourly to Claude Sonnet 4.6 for structured normalization;
   confidence ≥ 0.95 auto-promotes into `normalization_rule`, 0.70–0.95
   queues for one-click human approval at `/admin/unmatched`, < 0.70 is
   rejected. Confidence threshold is configuration, not judgement.
3. **Outlier filter.** Each normalized snapshot is compared against the
   MAD-3σ band of same-GPU prices in the last 1 hour. Failing rows are
   stamped `is_outlier = true` in `price_snapshots`; they remain in the
   table for audit but are excluded from `E_t`.
4. **Provider reliability gate.** Snapshots from providers with
   `reliability_score < 0.5` are excluded entirely. Reliability decays
   automatically on outlier ratio > 30% and recovers after 7 stable
   days. No human override.
5. **Universe membership.** Each composite index `I` has a fixed GPU
   universe; only snapshots whose normalized `gpu_model` is in that
   universe enter `E_t`.
6. **Quorum check.** If `|E_t| < 5` after the above filters, no value
   is published for that day. A `index_value_skipped` event is recorded
   and the row is omitted from `index_values_daily`.
7. **Publish.** The single locked formula (`filtered_vwap`, 24h window,
   num_gpus-weighted) is computed and written to
   `index_values_daily.vwap`, version-stamped with
   `methodology_version = v1.0`.

The list is closed with a one-sentence transparency commitment:

> **No step in this hierarchy exercises expert judgement on the
> published number.** Every parameter (`0.95` Claude threshold, `30%`
> outlier ratio, `0.5` reliability floor, `5` quorum, 24h window, MAD-3σ
> filter) is open-source in `packages/shared/src/methodology.ts` and
> `apps/workers/src/functions/outlier-detector.ts`; changing any of them
> requires the committee process documented below.

### Order of sections after change

For the reviewer: the final on-page order of the second-level headings
becomes (additions in **bold**):

- Formula
- Outlier filter (MAD-3σ)
- Eligibility floor
- Quorum
- **Input classification**
- **Hierarchy of data inputs**
- Index Committee
- AI orchestration
- Version history

The new sections sit at the *quality* tier of the page (next to the
formula's controls), not the governance tier — they describe what the
inputs are and how they enter the formula, before the page pivots to who
maintains the formula.

### What is NOT in this change

- No edit to `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY`
  keeps every field at its v1.0 value.
- No edit to `apps/workers/src/functions/methodology.test.ts` — the lock
  test still passes verbatim.
- No edit to `apps/workers/src/functions/index-calculator.ts` or
  `outlier-detector.ts`.
- No new migration. No new row in `methodology_changes` (this is a
  disclosure, not a methodology version bump — `PUBLISHED_METHODOLOGY_VERSION`
  stays `v1.0`).
- No JSON-LD or structured-data emission of the classification (defer to
  a later infra PR if a licensee API needs it).

## Why this is the right shape (vs. alternatives)

An MSCI revision committee would weigh at least three alternatives before
landing here.

### Alt A — Do nothing; keep `/methodology` silent on input class

Cheapest. Indefensible the first time a fund counsel reads BMR
Article 11(3)(d) and asks "where is your published input hierarchy?"
The current page lists `eligibility`, `outlier`, `quorum`, `reliability`
— all *post-ingest* filters. The page is silent on whether the inputs
themselves are trades, quotes, or estimates. This is exactly the kind
of unstated commitment that a regulator or auditor reads as either an
oversight or an over-claim, depending on their priors. The IOSCO 2018
Guidance (IOSCOPD549) §3.2 is explicit that the hierarchy must be
*published*, not just internally maintained. Rejected.

### Alt B — Encode `inputType: 'published_quotes'` in `PUBLISHED_METHODOLOGY`

More invasive but more machine-readable. Future licensees consuming a
signed-attestation API (Roadmap D17) could read the class directly. The
downside is that any new field on `PUBLISHED_METHODOLOGY` (a) requires
editing `methodology.test.ts` to lock the new field, (b) is a `v1.0 →
v1.0.1` semver bump that has to be reasoned about in the version
history, and (c) creates a precedent that *every* future disclosure
ratchets the version. It is also unnecessary today: the
classification's value is to external readers (auditors, counsel,
licensees), all of whom read the rendered page, not the TypeScript.
**Recommend deferring** to a future v1.x bump alongside another
substantive change — for example, the first time invoice observations
enter the input hierarchy. Flagged on the roadmap, not pursued in this
proposal. Rejected for this cycle.

### Alt C — Self-classify but skip the data-input hierarchy

Saves a section of page text but leaves P8 (BMR Art 11(3)(d)) unmet.
Since the two are the same edit to the same page and the hierarchy is
the natural follow-on from the classification ("inputs are X, here is
how we process X"), splitting them invites a second proposal and
second 30-day cycle for what should be one disclosure. Rejected.

### Chosen — Alt D (this proposal): self-classify + publish hierarchy in one page edit

- Closes both P7 and P8 in one committee cycle.
- Touches one file (`apps/web/app/methodology/page.tsx`), text-only.
- Adds no new constants, no new tests, no new migrations.
- Establishes the precedent that *disclosure-class* methodology
  changes (text on `/methodology` that does not alter published
  numbers) follow the same notice procedure as numeric changes, which
  is the more conservative reading of IOSCO P12 and BMR Art 13.
- Sets up the future v1.x change that *would* add `inputType` to
  `PUBLISHED_METHODOLOGY` to do so against a page that already names
  the field's prose equivalent.

The shape matches the LBMA / Baltic Exchange pattern of *owning the
limitation* in published methodology language (LBMA Gold Price FAQs;
Baltic Exchange *Guide to Market Benchmarks* v8.3 §2). It does not
borrow the oil-PRA model of blending trades + bids + offers under
expert judgement (IOSCOPD364, IOSCOPD399) because CTI does not exercise
expert judgement and the systematic-MOC pattern is closer in spirit to
the assessment indices than to the PRA model.

## Empirical impact

This is a disclosure-class change. No published number moves. The
empirical claim is "this changes only text and changes nothing that
should not change," and the signal that demonstrates it is:

1. **Methodology lock test passes verbatim.** Running
   `pnpm --filter @compute-terminal/workers test` after the
   implementation PR shows all assertions in
   `apps/workers/src/functions/methodology.test.ts` green; the locked
   fields (`PUBLISHED_METHODOLOGY_VERSION = 'v1.0'`,
   `formulaId = 'filtered_vwap'`, `outlierFilter = 'mad_3_sigma'`,
   `windowHours = 24`, `weight = 'num_gpus'`) are untouched.
2. **`index_values_daily` byte-equal before vs after.** No row in
   `index_values_daily` is recomputed; `methodology_version` continues
   to read `v1.0`; the next scheduled run of
   `index-calculator.ts` produces a `vwap` value indistinguishable
   (modulo new arriving snapshots) from what it would have produced
   without the change. Verifiable post-merge by snapshot diff of the
   first day's row.
3. **No new `methodology_changes` row.** This change does not
   constitute a methodology version bump; the
   `methodology_versions` table is unchanged. The audit-trail
   commitment is captured in this proposal + the committee approval on
   the PR review, not in the SQL tables.
4. **Typecheck and full test suite green.** `pnpm -r typecheck` and
   `pnpm test` pass before the implementation PR is opened. JSX-only
   addition.

If any of (1) (2) (3) (4) fail, the implementation PR is wrong and
should not be merged.

A 90-day backtest of the published value is not applicable because no
formula or parameter changes. The proposal template's "REQUIRED
backtest of the *new* methodology against the last 90 days" applies to
*numeric* methodology changes; this change does not move
`index_values_daily.vwap` for any (date, gpu_model) tuple. Documented
here so the committee can see the requirement was considered and
deliberately found inapplicable.

## Risks

**Immediate (low / contained):**

- *JSX render bug.* The new sections sit in the same `<main>` container
  as existing markup; the risk is purely visual regression. Mitigated by
  taking a screenshot of `/methodology` before and after on a Vercel
  preview deployment, attached to the implementation PR.
- *Stale field references.* The text names specific thresholds (`0.95`,
  `30%`, `0.5`, `5`, 24h) that are also encoded in
  `PUBLISHED_METHODOLOGY` and `outlier-detector.ts`. Future drift
  between page text and constants is the same risk that already exists
  on the rest of the methodology page. Acceptable; mitigated long-term
  by templating these from the imported `PUBLISHED_METHODOLOGY` in the
  implementation PR where reasonable (the existing page already pulls
  `PUBLISHED_METHODOLOGY.reliabilityFloor` etc.).

**Second-order (the real ones to weigh):**

- *Reduces auditor trust if the disclosure under-claims.* The page
  declines to claim unqualified P7 compliance. A reviewer who has not
  read the supporting note may interpret this as "CTI admits its inputs
  are weak." Mitigation: the same paragraph names what *is* true (firm,
  executable, arms-length, anchored in a real cash market) and cites
  the BMR Article that admits committed quotes. The message is "we are
  precise about input class, like LBMA and Baltic," not "we are weak."
  The committee should read the wording once before the implementation
  PR ships to confirm the tone lands.
- *Reduces auditor trust if the disclosure over-claims.* The opposite
  failure mode: claiming the inputs are "essentially transactions"
  would invite a P7 challenge the index cannot meet. Mitigation: the
  proposed wording deliberately separates "executable list prices" from
  "transactions" and references the BMR Article 11(1)(c) language
  exactly. Phrased as a precise classification, not a claim.
- *Narrows the legal defensibility of the v1.0 lock if a future v1.x
  changes input class.* By publishing the input class explicitly, any
  future change that admits invoice-observation inputs becomes an
  IOSCO P12 / BMR Art 13 "material change" requiring full notice. This
  is the *correct* outcome — pre-committing now to treat input-class
  changes as material is what makes the change-control procedure
  meaningful — but it should be a deliberate committee choice, not a
  side-effect of disclosure.
- *Establishes a precedent that all `/methodology` text changes
  require the 30-day notice.* Future cosmetic edits (typo fixes,
  reformatting) should not need the full procedure. Mitigation: the
  implementation PR's commit message names this as a "disclosure-class
  methodology change" specifically; trivial text edits do not invoke
  the procedure unless they alter a stated commitment. Worth
  documenting as a one-line clarification in `docs/decisions.md` when
  the implementation PR ships.

**No data-corruption risk.** No code path changes. No migration. No
production data is touched.

## Migration / rollout plan

This is a methodology disclosure change. The Committee charter on
`/methodology` Step 3 ("Public notice — the new version is published on
this page with at least 30 days' notice before taking effect") applies.

**Two-PR rollout, conservative:**

1. **PR-1 (this run).** Merge this proposal markdown into `main`. The
   merge date starts the 30-day public-notice clock. No `/methodology`
   page change ships with this PR; the proposal itself is the notice
   artifact. The PR description, when posted, includes a one-paragraph
   *proposed-change notice* suitable for inclusion on a future B8
   notice page (Roadmap B8).
2. **PR-2 (≥ 30 days later, on or after 2026-07-22).** Implements the
   `apps/web/app/methodology/page.tsx` text addition exactly as
   described in §"Proposed change." Includes:
   - The two new `<section>` blocks.
   - A Vercel preview screenshot before/after.
   - `pnpm -r typecheck` + `pnpm test` green.
   - A one-line entry under "Version history" — *not* a new
     `methodology_versions` row — naming the disclosure and the
     proposal that authorised it. The
     `methodology_versions.approved_by` / `effective_from` fields stay
     on the existing v1.0 row.
   - Commit message:
     `methodology: disclose published-quote input classification + input hierarchy (v1.0 disclosure)`.
3. **`docs/research/gaps/iosco-principles.md`** rows P7 and P8 updated
   in the same PR-2: status `partial → compliant in design`, evidence
   pointer to the rendered page + the merged proposal + the merged
   PR-2.

**Rollback.** PR-2 is a revertible single-file text edit. If a serious
defect is found in the rendered text between merge and the next
business day, `git revert <sha>` on PR-2 restores the page and a
follow-up amendment PR ships through the same procedure. The proposal
(PR-1) does not need to be reverted because it does not alter
production behaviour; it stays in `docs/research/proposals/` as the
record.

**Cessation of notice.** If, during the 30-day window, the Committee
determines (via PR review or a follow-up comment) that the wording
needs material revision, PR-2 should be opened against a revised
version of this proposal and the 30-day clock restarts from the merge
of the revision proposal. Minor word-smithing of PR-2 against this
proposal's substance does not restart the clock.

## Committee deliberation prompt

Suggested wording for the decision record on PR-1:

> "We are accepting the publication of two new disclosures on
> `/methodology` — (1) explicit self-classification of CTI as a
> *published-quote benchmark* whose inputs are firm executable list
> prices anchored in a genuine arms-length cash market for GPU-hours,
> and (2) the data-input hierarchy that those quotes pass through
> before entering the locked filtered-VWAP formula. Neither disclosure
> changes any value of `PUBLISHED_METHODOLOGY` and no row of
> `index_values_daily` is recomputed. The trade-off favours
> precise, defensible language over silence on input class — at the
> cost of pre-committing to treat any future change of input class as
> a material methodology change under the 30-day-notice procedure. The
> disclosure is consistent with the LBMA precious-metal-fix pattern of
> owning the limitation in published methodology text. EU BMR
> Article 11(3)(d) requires the hierarchy be published; IOSCO
> Principle 8 requires it be documented; both are met by the proposed
> page text. Voted: <yes/no>, Carlos Galindo Dumitrescu (sole founding
> Committee member, v1.0 charter), on YYYY-MM-DD."

## Closing

On PR-1 merge:

- The 30-day public-notice clock starts (effective date ≥ 2026-07-22
  given a same-day merge).
- This proposal stays in `docs/research/proposals/` as the durable
  notice artifact.
- The implementation PR (PR-2) is queued for ≥ 2026-07-22.

On PR-2 merge:

- `docs/research/gaps/iosco-principles.md` rows P7 and P8 are marked
  `compliant in design, untested under external review` with evidence
  pointers to the rendered page and the two merged PRs.
- `docs/decisions.md` gains a new entry: "Disclosure-class methodology
  changes follow the same 30-day notice procedure as numeric changes;
  trivial cosmetic edits do not."
- Roadmap B8 (notice page for proposed changes) is updated to reflect
  that the first notice in production was a disclosure change, not a
  numeric change — confirming the dry-run of the change-control
  procedure (gap-matrix P12 advances toward `compliant`).

**Merged PRs (filled on close):**
- PR-1 (proposal): _to be filled_
- PR-2 (implementation): _to be filled, ≥ 2026-07-22_
