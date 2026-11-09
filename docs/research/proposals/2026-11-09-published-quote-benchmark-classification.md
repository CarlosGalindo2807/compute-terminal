# Proposal: Classify CTI as a "published-quote benchmark" on `/methodology` and publish the data-input hierarchy

| | |
|---|---|
| **Date** | 2026-11-09 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (hard-limit surface: `/methodology`) — **no change to `PUBLISHED_METHODOLOGY`** constants, no change to any value written to `index_values_daily` |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (new sections only; existing Formula / Outlier / Eligibility / Quorum / Committee / Agents / Version-history sections unchanged) |
| **Required reviewer(s)** | @CarlosGalindo2807 (hard-limit file owner). Index Committee acknowledgement — v1.0 is single-administrator; see P5 row of the gap matrix. |
| **Effective date if approved** | 2026-12-10 (30 days after merge per Committee charter Step 3). The published number does not change on the effective date; only the page text does. |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency) · IOSCO FR07/13 Principle 8 (Hierarchy of Data Inputs) · IOSCO FR03/18 / IOSCOPD549 (2018 Guidance) · EU BMR Regulation (EU) 2016/1011, Article 11(1)(a), 11(1)(c), 11(3)(d) · Comparable published-quote / assessment benchmarks: Baltic Exchange *Guide to Market Benchmarks* v8.3; Platts/Argus MOC methodology; LBMA Gold/Silver fix (ICE Benchmark Administration) · Primary URLs listed under §Sources at the foot of this proposal. |

---

## Problem

Two P0 gap-matrix rows (`docs/research/gaps/iosco-principles.md`) are currently
open against the same page:

- **P7 · Data Sufficiency.** IOSCO FR07/13 and EU BMR Art 11(1)(c) require a
  benchmark to be *anchored by observable transactions*, with non-transactional
  data acceptable only when transaction data is "not sufficient or not
  appropriate" and the administrator says so. Every CTI v1.0 input is a scraped
  *listing* — a provider's published, firm, executable on-demand ask — not an
  observed trade. On-demand compute has no public consolidated transaction tape.
  The listings-vs-transactions research note
  ([2026-05-12-listings-vs-transactions-iosco-p7.md](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md),
  §1–3) concluded the position is **defensible but currently unstated**: CTI's
  inputs are firm executable quotes from a real arms-length cash market (closer
  to BMR "committed quotes" than to LIBOR-style indicative submissions), and
  comparable regulated benchmarks (Baltic freight assessments, Platts/Argus
  Market-on-Close) sit on the same substance. What's missing is the explicit
  classification on the public page.

- **P8 · Hierarchy of data inputs.** IOSCO FR07/13 and EU BMR Art 11(3)(d)
  require the administrator to "draw up and publish clear guidelines regarding
  the types of input data, the priority of use of the different types of input
  data and the exercise of expert judgement." The hierarchy exists in CTI's
  code path (scrape → rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95
  admin queue → outlier check → eligibility check → VWAP) but is **implicit, not
  published**. The published-quote classification and the hierarchy are the same
  disclosure to the same reader — they belong in the same edit to the same page.

Both rows sit at the top of the P0 queue in the gap matrix. Closing them is the
prerequisite to any external "CTI is IOSCO-aligned" claim and is specifically
flagged (gap matrix, revision log 2026-05-12) as "the next step" after the
research note.

## Proposed change

A single edit to `apps/web/app/methodology/page.tsx` adding two new sections
*between* the existing "Formula" section and the existing "Index Committee"
section. **No existing section is modified or removed.** No change to
`packages/shared/src/methodology.ts`, `apps/workers/src/functions/index-calculator.ts`,
`outlier-detector.ts`, `methodology.test.ts`, or any migration under
`packages/db/migrations/`. No change to the `PUBLISHED_METHODOLOGY` constant.
No change to what is written to `index_values_daily.vwap`.

### New Section A — "Input classification" (goes directly after "Quorum")

Draft text, approximately as it should land on the rendered page (final
rewording at review time preserving substance):

> **Input classification.** CTI is a **published-quote benchmark**. Its inputs
> are firm, executable on-demand list prices — the same configurations and
> rates a customer would be charged if they clicked "rent" at the moment of
> capture. Inputs are captured mechanically from each provider's public
> endpoint; there is no human submission step, no indicative quote, and no
> expert judgment in the published-number path.
>
> On-demand GPU compute has no public consolidated transaction tape. Where
> observed-transaction data becomes available to CTI (see "Hierarchy of data
> inputs" below), the hierarchy below specifies when and how it is preferred.
> Executable listings are used otherwise — the same substance EU BMR Article
> 11(1)(c) classes as "committed quotes" and that the Baltic Exchange freight
> assessments and Platts/Argus Market-on-Close methodologies rely on for the
> majority of their regulated determinations.
>
> This classification is a stated design position, not an aspiration. CTI
> does not claim to be anchored by observed trades. It claims to measure the
> prevailing *published* price of on-demand GPU compute, computed
> deterministically from firm executable quotes in a genuine arms-length cash
> market.

### New Section B — "Hierarchy of data inputs" (goes directly after Section A)

An ordered list of the ingestion stages, each a sentence, with the deterministic
rule at each stage. Rendered as a `<ol>`:

1. **Scraped offer.** Each provider endpoint is scraped on its Inngest schedule
   (5 min for Vast.ai and RunPod via TS-native scrapers, nightly for Python
   scrapers that exist). The raw offer is schema-validated with Zod; malformed
   rows are dropped and emit a `scraper_schema_rejected` event.

2. **GPU-model normalization.** The provider's free-text GPU string is resolved
   against `normalization_rules` (deterministic alias → canonical `gpu_models`
   row). Unknown strings fall to `unmatched_listings` and are resolved hourly:
   Claude ≥ 0.95 confidence auto-promotes into a new rule and back-fills; 0.70–0.95
   confidence queues for one-click human approval at `/admin/unmatched`; < 0.70 is
   dropped from the index path.

3. **Outlier filter.** The normalized offer is tested against MAD-3σ dispersion
   over the per-GPU-model prices in the last hour. Outliers are written to
   `price_snapshots.is_outlier = true` and excluded from the VWAP. The flag is
   retained — outlier snapshots are auditable, not deleted.

4. **Provider eligibility.** The offer's provider must have
   `reliability_score ≥ {PUBLISHED_METHODOLOGY.reliabilityFloor}`. Reliability is
   deterministic from scrape success rate and outlier ratio with no manual
   override.

5. **Quorum check.** If fewer than `{PUBLISHED_METHODOLOGY.minObservations}`
   eligible offers remain for an index on day *t*, no value is published for
   that day. An `index_value_skipped` event is recorded; the previous day's
   value is **not** carried forward.

6. **Publication.** Eligible offers are reduced to a volume-weighted average by
   `num_gpus`, per the formula above. The published value is written with its
   methodology version to `index_values_daily`.

**Transaction data — treatment and future precedence.** CTI has a reserved
schema for observed-transaction inputs: `invoice_observations` (migration
`011_pivot_v2_schema.sql`) accepts anonymised real-paid prices by
`(provider, gpu_model, customer_spend_band, contract_type)`. The ingest pipeline
is unbuilt and the table is empty at v1.0. When invoice-observation ingest ships
and reaches sufficient density, two uses are mapped and will appear in the
version history on this page:

- *Validation anchor (non-methodology, publishable without a v1.x bump):* a
  periodic reconciliation report compares the published quote index against the
  median effective price observed over trailing windows. This is an
  infrastructure artifact; it does **not** change the published number.
- *Input anchor (future methodology-class change, requires full committee
  process + 30-day notice + backtest):* a future `v1.x` methodology may admit
  invoice observations as a weighted input class above executable listings in
  the hierarchy. The scaffolding is reserved; the change itself is **out of
  scope of this proposal**.

### Component-level impact

- `apps/web/app/methodology/page.tsx` — two new `<section>` blocks inserted;
  no existing selector / id / section renamed.
- No changes to any `packages/shared/src/methodology.ts` export; no changes to
  `apps/workers/src/functions/*`; no new migration; no new environment variable;
  no new DB row.
- `index_values_daily` writes on the effective date are byte-identical to what
  they would have been without this proposal.

### Existing tests that guard this change

- `apps/workers/src/functions/methodology.test.ts` (**lock test, hard-limit, not
  modified by this proposal**) continues to assert the `PUBLISHED_METHODOLOGY`
  constant is unchanged. Any accidental constant edit would fail CI. This
  proposal deliberately touches no file under its guard.
- `pnpm -r typecheck` across all workspaces continues to pass; the edit is to a
  Next.js RSC file that renders static JSX, so no new types are introduced.

## Why this is the right shape (vs. alternatives)

Three alternatives were considered.

**Alternative 1 — Leave the page as-is; argue the point only when asked.**
Rejected. The whole point of a published methodology is that a reviewer
(auditor, licensee, regulator) can read it once and understand the shape.
Waiting for the question means CTI is visibly silent on the exact principle
(P7) most likely to be pressed first. The research note already shows the
position is defensible; not stating it is an own-goal.

**Alternative 2 — Change the published formula to admit some proxy of
transactions (e.g., Vast.ai `time_remaining` as a volume signal).**
Rejected for this proposal. It is a methodology-class change and belongs in a
future `v1.x` proposal with its own backtest and committee deliberation. The
research note explicitly puts Track C (scaled quorum) and Track B input-anchor
promotion in that category. Doing docs-only classification *first* is the
reversible step; methodology changes are the irreversible one.

**Alternative 3 — Claim P7 compliant without classification, relying on the
"committed quotes" clause in BMR Art 11(1)(c).**
Rejected. The clause permits committed quotes "if transaction data is not
sufficient or not appropriate" — the administrator must *publish* the reason.
Silent reliance is the LIBOR failure mode. Stating the reason explicitly on
`/methodology` is cheap and converts a tacit assumption into a cite-able
disclosure.

**Chosen shape (docs-only classification + published hierarchy)** is the
minimum intervention that closes both P0 rows, is fully reversible via a
subsequent PR if the Committee changes its mind, follows the LBMA/Baltic/PRA
pattern of *owning the limitation*, and preserves optionality on every future
methodology move (Tracks B and C).

## Empirical impact

This is a docs-only change to a hard-limit surface. The ordinary backtest
required for methodology changes does not apply because no constant and no
computation changes. The empirical signal that says "this works":

- **No change to any `index_values_daily.vwap` value** on or after the effective
  date (2026-12-10). Verified by a one-line probe comparing the pre-effective
  and post-effective rows for every live index — identical to byte.
- **No change to any `index_values_daily.methodology_version` value**. The
  constant `PUBLISHED_METHODOLOGY_VERSION = 'v1.0'` is unchanged by this
  proposal. (A future minor bump — e.g., `v1.0.1` for a docs-only revision tag
  on the Version History table — is a Committee decision separate from this
  proposal; the default is to not bump.)
- **Rendered-page diff is additive only.** Before/after screenshots at merge
  time will confirm: existing Formula, Outlier, Eligibility, Quorum, Committee,
  Agents and Version-history sections are pixel-identical; two new sections
  appear between Quorum and Committee. Captured into the PR body on push.
- **Gap-matrix rows P7 and P8** move from `partial / structurally weak` and
  `partial` to `compliant (claim defensible, named evidence on /methodology)`.
  The matrix revision log gains a 2026-12-10 entry.
- **No regression risk to the methodology lock test.**
  `apps/workers/src/functions/methodology.test.ts` is not edited; it continues
  to lock the constant it locks today, and that constant is not touched.

## Risks

**Immediate.**
- *Rendered-page regression on an existing visual contract.* Mitigated by
  scoping the edit to additive `<section>` insertion between two existing
  sections, and by requiring screenshot diffs in the PR body.
- *Prose drift from the substance of the research note.* Mitigated by locking
  the draft text in this proposal; the PR must land the proposal's language
  (with editorial-only changes), not a rewritten version.

**Second-order.**
- *A reviewer reading the classification as a weakening claim.* The text is
  deliberately framed as an *active design choice* (LBMA/Baltic/PRA pattern),
  not an apology. Preserving that framing through review is a style constraint,
  not a code one.
- *Increased scrutiny of the `invoice_observations` roadmap.* By naming the
  future transaction anchor on the public page, we create a public expectation
  that we will build it. This is already a committed workstream (REFRAME_v2 §3
  / variable 8, `docs/decisions.md`) so the risk is low — the expectation is
  accurate — but once published, dropping the invoice-observations workstream
  would itself require a public notice.
- *Discouraging an external Committee member from joining because the single-
  administrator state is now publicly stated.* Opposite is more likely: a
  stated P5 gap with a chartered remediation date reads as serious governance
  intent, not evasion. Still, flagging the trade-off here so the Committee
  decides consciously.

**Rollback.**
- Reverting the edit is a single revert PR touching the same file. No data is
  affected. No cached `index_values_daily` row needs rebuilding. The reversal
  itself would require a public notice (because `/methodology` is under the
  30-day procedure), but the published number is not affected either way.

## Migration / rollout plan

This is a docs change to a hard-limit surface, so the Committee's 30-day public
notice procedure applies even though no constant changes. Concretely:

- **T₀ (merge day).** PR merges into `main`. `/methodology` renders with the
  two new sections **and** a visible "proposed, effective 2026-12-10" banner on
  those two sections only (visual pattern: left-border callout matching the
  Committee charter's Step 3). This is the public-notice mode.
- **T₀ + 30d (2026-12-10, effective date).** A trivial follow-up PR removes the
  "proposed, effective …" banner, leaving the sections as part of the published
  spec. The `methodology_changes` row (see next bullet) transitions to
  `effective_from` set.
- **`methodology_changes` row inserted.** A new row with
  `change_type = 'documentation'`, `summary = 'Published-quote benchmark
  self-classification + data-input hierarchy'`, `effective_from = 2026-12-10`,
  `rationale` linking to this proposal, `approved_by = 'Carlos Galindo Dumitrescu,
  sole founding committee member'`. The row is inserted at merge by a one-line
  SQL snippet shipped alongside the PR (not a migration — a one-shot `INSERT`
  under `scripts/one-shot/`), run against the production DB after merge. No
  schema change.
- **No new `methodology_versions` row.** `PUBLISHED_METHODOLOGY_VERSION` stays
  at `v1.0`. If the Committee prefers a `v1.0.1` tag to make the change
  visible in the Version History table, that is a one-line decision at review
  time — either way, `PUBLISHED_METHODOLOGY` and `index_values_daily.vwap` are
  unaffected. **Recommendation: no version bump.** The spirit of the version
  constant is "the math changed"; a docs clarification should not inflate the
  integer-count of substantive methodology revisions.
- **Gap-matrix update** (`docs/research/gaps/iosco-principles.md`) ships *in the
  same PR* as this proposal's implementation — the row-level edits (P7, P8 →
  `compliant`) and a revision-log entry. This is a docs file, not hard-limit.
- **Monitoring after merge.**
  - `system_events` watched for any unexpected `methodology_changed` event
    firing — none expected, but C15 webhook (roadmap) would fire if one did.
  - `/api/health` canary continues to render — no API path touched.
  - Standard `pnpm -r typecheck` + `pnpm test` CI must be green.

## Committee deliberation prompt

> "On 2026-11-09 the Index Committee reviewed a docs-only proposal to classify
> CTI as a *published-quote benchmark* on `/methodology`, and to publish the
> data-input hierarchy that is currently implicit in the code path. The
> `PUBLISHED_METHODOLOGY` constant (v1.0) and every value written to
> `index_values_daily` are unchanged. The classification follows the pattern
> established by the Baltic Exchange freight assessments, the Platts/Argus
> Market-on-Close regime and ICE's LBMA fixings — regulated benchmarks of
> real markets without a public consolidated transaction tape. It also meets
> EU BMR Article 11(3)(d)'s requirement to publish the hierarchy of input
> types and the priority of use.
>
> We are converting a tacit position (CTI runs on executable listings) into a
> stated one. We are accepting that this is visible — an external reviewer
> will read it and press on it — in exchange for closing the single-most-
> likely-to-be-pressed-on gap (P7) and simultaneously closing P8 with the
> same edit. We are not changing the benchmark; we are telling the reader
> accurately what the benchmark is.
>
> Voted: __, Carlos Galindo Dumitrescu, on 2026-11-__."

## Closing

After this proposal is approved (PR merged → effective date passes):

1. Mark `docs/research/gaps/iosco-principles.md` rows P7 and P8 as `compliant`
   with the merged-PR link and the on-page section anchors as the named
   evidence; add a revision-log entry.
2. Update `docs/decisions.md` with a new entry — "CTI classified as a
   published-quote benchmark on `/methodology` (added 2026-12-10)" — recording
   the decision, the regulatory citation, and the explicit non-change to
   `PUBLISHED_METHODOLOGY`.
3. Link the merged PR in this file's footer.
4. Bump the P0 queue: with P7 and P8 closed, the next P0 items are P3 / P5
   (conflict-of-interest + single-administrator declaration) and P16
   (complaints procedure). Both are smaller docs edits on `/methodology`
   without touching the formula, and are the natural next session's work.

---

## Sources

Primary regulatory texts (referenced; direct fetch of `iosco.org`,
`eur-lex.europa.eu` and `esma.europa.eu` was blocked at the session network
layer — both `getaddrinfo ENOTFOUND` and HTTP 403 in prior sessions. These
URLs must be added to the session's network allowlist for a future run to
reconcile verbatim passages against this proposal; the substance here follows
the prior research note which worked from the same constraint):

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13
  (IOSCOPD415), July 2013.
  https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*,
  IOSCOPD549, January 2018.
  https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data).
  EUR-Lex CELEX 32016R1011. https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng
- ESMA Interactive Single Rulebook, BMR Article 11.
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data

Comparable-benchmark methodologies cited for the published-quote /
assessment pattern (fetched successfully in prior sessions for the companion
research note; see that note's §Sources for the direct URLs):

- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026 — panel
  assessment model under EU BMR, cleared derivatives downstream.
- Platts / Argus, *Market-on-Close* methodology submissions to IOSCO
  (IOSCOPD399) — blended bids / offers / transactions, weighting defined by
  methodology.
- ICE Benchmark Administration / LBMA, *Precious Metals Methodology* — the
  contrast case where the benchmark *is* the transaction (auction fix); not
  feasible for fragmented on-demand compute today, retained as long-horizon
  reference.

Internal references:

- Companion research note: [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
  (§1–3 primary-source analysis; §4 three-track response; §5 mapping of what
  needs a proposal; this file implements §4 Track A).
- First-pass IOSCO mapping: [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md)
  §B, P7 and P8.
- Gap matrix: [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md)
  rows P7, P8, and priority-queue item 4 (P0).
- Published contract (**hard-limit, this proposal edits**): `apps/web/app/methodology/page.tsx`.
- Published constant (**hard-limit, this proposal does NOT edit**):
  `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` stays at v1.0.
- Lock test (**hard-limit, this proposal does NOT edit**):
  `apps/workers/src/functions/methodology.test.ts`.
- Invoice-observation reserved schema (future transaction anchor, named on-page
  but not promoted to input class by this proposal): `packages/db/migrations/011_pivot_v2_schema.sql`.
- Prior pivot context: `docs/decisions.md` — "Pivot to 'Bloomberg for buyers'"
  (variable 8 = behavioral / invoice pricing) and "Five-methodology A/B → Locked
  methodology v1.0" entries.

---

*Merged PR link: __ (fill in on merge).*
