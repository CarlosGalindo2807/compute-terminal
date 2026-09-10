# Proposal: Self-classify CTI as a "published-quote benchmark" and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-09-10 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs — but the target surface `/methodology` is hard-limit under the charter (page communicates the published spec), so this must be reviewed through the same process as a methodology change even though the `PUBLISHED_METHODOLOGY` constant, index calculator, outlier detector, and lock test are all **untouched**. No behavioural change to any published number. |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (adds one section, minor wording tweak in the hero paragraph). No change to `packages/shared/src/methodology.ts`, `apps/workers/src/functions/index-calculator.ts`, `apps/workers/src/functions/outlier-detector.ts`, `apps/workers/src/functions/methodology.test.ts`, or any migration. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member). |
| **Effective date if approved** | 2026-10-11 (≥ 30 days after merge per Committee charter Step 3, treating this page edit as the class of change that gets the notice period even though the formula is unchanged — the *description* of what the benchmark is is itself a public-facing commitment). |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs); EU BMR (Regulation (EU) 2016/1011) Article 11(1)(a)(c) and Article 11(3)(d); IOSCO FR07/13 recital on "committed quotes". Companion research: `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`. |

## Problem

Gap-matrix rows **P7** and **P8** in `docs/research/gaps/iosco-principles.md`
are the two highest-leverage open items in the Quality-of-the-Benchmark pillar.
Both P0 in the rolling priority queue. Both close in a single edit.

**P7 (Data Sufficiency).** IOSCO Principle 7 and BMR Art 11(1)(c) prefer inputs
that are "anchored by observable transactions". CTI's inputs are firm executable
list prices scraped from provider endpoints — closer in kind to BMR's "committed
quotes" than to indicative submissions, but not observed trades. Prior sessions
resolved the substantive question (a published-quote design *is* IOSCO-defensible
when honestly disclosed — see Baltic Exchange assessments, LBMA fixings,
appraisal-based NCREIF/IPD indices, all IOSCO-aligned) but the disclosure itself
is missing from the public page. Today `/methodology` is silent on the class of
inputs used and on the fact that CTI does not currently ingest transactions. An
external reviewer reading only the page cannot tell what class of benchmark this
is. That silence *is* the P7 gap.

**P8 (Hierarchy of Data Inputs).** IOSCO P8 and BMR Art 11(3)(d) require
administrators to *publish* "clear guidelines regarding the types of input data,
the priority of use of the different types of input data and the exercise of
expert judgement." A hierarchy exists in code (rule-based normalization → alias
map → fuzzy match → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier
check → eligibility check → VWAP; zero expert judgment in the published-number
path) but is nowhere on the page. The compliance obligation is a *publication*
obligation. Same fix as P7 — one page edit satisfies both.

The two are the same edit because the hierarchy is what makes the published-quote
self-classification defensible: "we use quotes, and here is exactly which quote,
in exactly which priority, under exactly which deterministic rule".

## Proposed change

Add one new section to `apps/web/app/methodology/page.tsx` — **"Data inputs"** —
placed between the current "Formula" section and the "Index Committee" section.
The section has three subsections: (1) *Benchmark classification*, (2) *Hierarchy
of data inputs*, (3) *Expert judgment*. Also a one-sentence addition to the hero
paragraph that flags the classification up-top for anyone who reads only the
lede.

The exact copy for the new section is below; the proposal itself is what the
Committee approves, and the PR that implements it will render this copy in the
site's `<section className="mt-16">` template used by every other section.

### Proposed hero addition (one sentence, appended to the existing lede)

> CTI is a **published-quote benchmark**: its inputs are firm, executable
> on-demand list prices captured directly from provider endpoints, aggregated
> under a locked formula with no expert judgment.

### Proposed new section — verbatim copy

> ## Data inputs
>
> ### Benchmark classification
>
> CTI is a **published-quote benchmark**. Every input is a firm, executable
> on-demand list price published by a compute provider on its own commerce
> surface and captured by our scrapers within the 24-hour window. Prices are
> denominated in the currency the provider quotes to buyers (USD, per GPU-hour,
> per whole-GPU allocation); no synthetic conversion, indicative bid, or dealer
> mark is admitted.
>
> On-demand GPU compute has no public consolidated transaction tape. There is no
> venue analogous to the NYSE consolidated tape or the LSE order book from which
> observed trades could be aggregated. Every serious benchmark in a market with
> this shape — Baltic Exchange freight indices, LBMA precious-metal fixings,
> NCREIF/IPD real-estate — is built from disciplined non-transaction inputs
> (broker assessments, panellist quotes, independent appraisals) and remains
> IOSCO-aligned by *owning the limitation* in its published methodology rather
> than obscuring it. CTI follows the same pattern: we use executable list
> prices, we say so, and we set out the hierarchy of how they enter the number
> below.
>
> Per EU Benchmarks Regulation Article 11(1)(c), where transaction data is not
> sufficient or not appropriate the Regulation contemplates "estimated prices,
> quotes and committed quotes, or other values". CTI's list-price inputs are
> the strongest form in that list: **committed quotes** — a buyer clicking the
> price transacts at that price, subject only to availability. They are not
> indicative broker submissions and they carry no expert-judgment adjustment.
>
> The transaction layer that would satisfy the strict reading of IOSCO Principle
> 7 exists in the schema (`invoice_observations`, migration 011) and is on the
> roadmap. Once populated, we will publish a periodic *reconciliation* — CTI
> list-price index versus median observed effective price per invoice, by
> spend band — as a stand-alone report. That report is a validation anchor,
> not an input; it does not change the published number.
>
> ### Hierarchy of data inputs
>
> Every offer takes the same deterministic path from provider endpoint to
> published index value. There is one hierarchy; it is fixed in code; it never
> depends on a person's judgment on the day:
>
> 1. **Scrape.** Per-marketplace scraper captures raw offer payload, validated
>    against a per-provider Zod schema. Offers failing validation are dropped
>    with a per-provider dead-letter event; they never enter the pipeline.
> 2. **Normalise GPU model — rule.** Deterministic rule-based match against the
>    `gpu_catalog` table. Highest priority.
> 3. **Normalise GPU model — alias.** Curated alias map (`normalization_rule`
>    rows with `source = 'alias'`). Second priority.
> 4. **Normalise GPU model — fuzzy.** String-similarity match against catalog
>    entries above a fixed distance threshold. Third priority.
> 5. **Normalise GPU model — Claude high-confidence.** Sonnet 4.6 classifier;
>    confidence ≥ 0.95 auto-resolves into a new `normalization_rule` and
>    back-fills. This is a *classification* step, not a valuation step; the
>    price is never adjusted, only the label. Fourth priority.
> 6. **Normalise GPU model — Claude low-confidence, human queue.** Confidence
>    0.70–0.95 sits at `/admin/unmatched` until a human confirms or rejects. No
>    value enters the daily calculation without a matched label. Fifth priority.
> 7. **Reliability floor.** Offers from providers with
>    `reliability_score < 0.5` are excluded. Reliability is computed from
>    scrape-success rate and outlier ratio; it has no manual override.
> 8. **Outlier filter (MAD-3σ).** Per-GPU-model median absolute deviation on the
>    last hour; offers more than three MADs from the median are flagged
>    `is_outlier = true` and excluded. The flag is written to
>    `price_snapshots.is_outlier` and is auditable per snapshot.
> 9. **Eligibility check.** The offer must fall in the 24-hour window
>    `[t − 24h, t)` and its normalised GPU model must be in the index universe.
> 10. **Aggregate.** Volume-weighted mean over the surviving set, weight
>     `num_gpus`. If the surviving set has fewer than 5 offers, no value is
>     published for the day and an `index_value_skipped` event is emitted.
>
> Steps 1–6 are input classification. Steps 7–10 are the published formula
> already locked in `packages/shared/src/methodology.ts`. No adjustment,
> imputation, or fallback exists between steps 6 and 10. Every input either
> makes it through unchanged or is excluded with a machine-readable reason.
>
> ### Expert judgment
>
> The published-number path uses **no expert judgment**. Every step above is
> either a deterministic rule or a classifier with a fixed confidence
> threshold. The rule-set and thresholds themselves are set by the Index
> Committee under the change-control procedure below and cannot be altered on
> the day. Human review at step 6 is a **classification** decision (is this
> the same GPU model?) not a **valuation** decision (what price should we
> record?). Prices are never overwritten, smoothed, or extrapolated.
>
> The Discovery agent (Brave Search → Claude Opus provider proposal) is not in
> the published-number path — it proposes candidates for future inclusion in the
> universe, subject to Committee promotion via the same 30-day notice procedure.

## Why this is the right shape (vs. alternatives)

Three alternatives were weighed against the chosen design.

**Alternative 1: silence.** Leave `/methodology` as it is; rely on the code
being open-source for anyone who wants to verify what class of input is used.
Rejected because IOSCO P8 and BMR Art 11(3)(d) are *publication* obligations
independent of code openness — the auditor's question is "what does your
methodology page say?", not "what does your repo say?". Also fails the licensee
test: a fund lawyer reading a licensing memo will not treat "read the repo" as
disclosure.

**Alternative 2: claim unqualified IOSCO P7 compliance.** State on the page
that CTI is anchored by observable transactions and gesture at the outlier
filter as evidence. Rejected because it is not true today (see 2026-05-12
research note): our inputs are executable quotes, not observed trades. An
auditor that discovered the mismatch would treat it as a material
misrepresentation, and the correct short-term posture is disclosure, not
overclaim. The design commitment is *earn* transaction-anchoring by populating
`invoice_observations` first, then publish it.

**Alternative 3: claim P7 non-applicability.** State that P7 does not apply to
compute because the market has no consolidated tape. Rejected because P7 does
apply — its intent (a benchmark should represent economic reality with defensible
inputs) governs every serious benchmark — and its guidance explicitly
contemplates non-transaction inputs (offers, bids, committed quotes) as
adjuncts. The correct posture is the LBMA / Baltic / NCREIF one: *P7 applies,
we meet it via the committed-quote route, and here is the publication that
proves the discipline*. This is Alternative 3's insight without its overclaim.

The chosen design also has one non-obvious property: by publishing the hierarchy
now, the eventual v1.x methodology change that *does* admit invoice observations
as an input class becomes a clean insertion between steps 7 and 8, not a
restructuring of the page. The change-control machinery works better when the
current design is described explicitly.

## Empirical impact

This is a docs change; there is no formula change to backtest. The signals that
say "this works" or "this doesn't change what shouldn't change":

- `PUBLISHED_METHODOLOGY` constant unchanged. `methodology.test.ts` (the lock
  test) continues to pass without modification. Not touched by this PR.
- `index_values_daily` values for every existing row are unchanged. Values
  computed on and after the effective date use the same formula.
- No new dependency, table, migration, or environment variable.
- Semver: no version bump. `PUBLISHED_METHODOLOGY_VERSION` remains at its
  current value. The change is documentary refinement of the *same* v1.0
  methodology, not a new version. `methodology_versions` gets no new row.
- `pnpm -r typecheck` passes on the branch. `pnpm test` passes (no code
  behavioural change).
- Manual read-through: the new section renders under the existing site
  templates (`section`, `display`, `mono`, etc.) with no new components or
  utility classes.

The one qualitative signal the Committee should confirm: the section reads
consistently with the existing Formula section's tone (declarative, no hedges,
mono-blocked equations where relevant) and does not accidentally introduce
ambiguity about the locked formula.

## Risks

**Immediate risks.**
- Wording drift between the proposed copy above and the copy that lands in the
  page could weaken or overclaim. Mitigation: reviewer diff-checks the PR
  against the verbatim block in this proposal.
- The 30-day notice window means the disclosure lands ~one month later than
  the merge. If a licensee conversation arrives in that window they will see
  the old page. Mitigation: the notice itself is published on merge (in the
  `methodology_changes` surface once B8 lands, or as a static banner on the
  page until then).

**Second-order risks.**
- Publishing "we use committed quotes, not transactions" gives sophisticated
  readers an explicit weakness to press on. Mitigation: this is not a new
  weakness — it is the current weakness, disclosed. The 2026-05-12 note argues
  at length that disclosed limitations *are* the LBMA/Baltic playbook and
  strengthen rather than weaken defensibility.
- Locks in the "no expert judgment" claim. If a future v1.x wanted to add any
  discretionary adjustment (e.g. a spot-quote weight adjustment during a
  scraper outage) the disclosure would have to be revised. Mitigation: this is
  a *feature* — the whole thesis of CTI is deterministic reproduction, and any
  future proposal that wanted expert judgment would have to justify it against
  this disclosure.
- Narrows what the Discovery agent can do "in production" — anything Discovery
  starts touching in a value-affecting way would need to be pulled into the
  hierarchy. Mitigation: Discovery is *already* out of the published-number
  path (see decisions.md); this makes that architectural commitment public.

**Risk this proposal creates elsewhere.** None to the code paths. One to the
roadmap: with the classification published, the *reconciliation report* (Track B
in the 2026-05-12 note; reads `invoice_observations` when populated) moves from
a "would be nice" to "we said we would publish this once data exists". That is
the intended anchoring commitment — but the Committee should confirm it is
willing to accept that as a stated forward obligation.

## Migration / rollout plan

- **T + 0** (merge). This proposal PR merges (proposal file + gap-matrix
  cross-reference). No user-visible change yet.
- **T + 0** (implementation PR). A second, separate PR opens against
  `apps/web/app/methodology/page.tsx` implementing the verbatim copy above.
  It carries a static "Effective 2026-10-11 — 30-day public notice, see change
  log" banner at the top of the new section until the effective date, then
  removes the banner.
- **T + 30d** (effective date, ~2026-10-11). The banner is removed via the
  same PR's second commit (or a one-line follow-up PR). The section becomes
  the live disclosure.
- **T + 30d** (audit trail). A `methodology_changes` row is inserted noting
  "documentary refinement of v1.0: input classification + hierarchy
  published". No `methodology_versions` row (no new version).
- **Rollback.** Revert either PR. No data migration, no schema change, nothing
  behavioural to roll back. If either PR is reverted after the effective date,
  a `methodology_changes` row is inserted noting the revert and the reason.
- **What to monitor in `system_events`.** Nothing new. `index_value_computed`
  events should continue at the same daily cadence with the same
  `methodology_version` stamp; any deviation would be unrelated to this PR
  and should be investigated on its own merits.

## Committee deliberation prompt

> "We are formalising, as a public commitment, that CTI is a published-quote
> benchmark and that its inputs enter through the deterministic hierarchy set
> out in the new section. The published formula is unchanged; the empirical
> impact on every existing and future computed value is zero; the change is
> disclosure catching up to code. The trade-off is that we accept the forward
> obligation to publish a reconciliation against `invoice_observations` once
> that data exists, and we accept that admitting expert judgment in any future
> version would require revising this disclosure under the 30-day notice
> procedure. Both are commitments we already intend to keep. Voted:
> <yes/no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD."

## Closing

After this proposal is approved and both PRs are merged:

- Update `docs/research/gaps/iosco-principles.md` row P7: status
  `partial / structurally weak` → `partial (disclosed; anchor deferred to Track
  B)`; evidence pointer to the new `/methodology` section; remove Track A from
  the P0 queue.
- Update row P8: status `partial` → `compliant` (hierarchy published; no code
  gap remaining).
- Update `docs/decisions.md` with a new "Published-quote benchmark
  classification (v1.0, 2026-10-11)" entry linking this proposal and both PRs.
- Add a revision-log entry to the gap matrix dated on the effective date.
- Link both merged PRs in this proposal's footer.

---

*Template: `docs/research/proposals/_TEMPLATE.md`. Companion note:
`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`. Gap
matrix: `docs/research/gaps/iosco-principles.md` rows P7, P8.*
