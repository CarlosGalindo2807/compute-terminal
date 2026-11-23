# Proposal: Classify CTI as a published-quote benchmark and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-11-23 |
| **Author** | index-architect (fourth run, autonomous schedule) |
| **Risk class** | docs (hard-limit surface edit; no change to any published numeric value or to `PUBLISHED_METHODOLOGY` constants) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit); `packages/shared/src/methodology.ts` (hard-limit — version bump only: `v1.0` → `v1.0.1`, formula fields unchanged); `packages/db/migrations/XXX_methodology_v1_0_1_docs_bump.sql` (new, inert version row); `apps/workers/src/functions/methodology.test.ts` (hard-limit — version-string update only, formula lock assertions unchanged) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member, per gap-matrix P1 action pending Roadmap B7) |
| **Effective date if approved** | 2026-12-28 (30 days after the earliest plausible merge date of 2026-11-28, per the Committee charter `Step 3 · Public notice`) |
| **References** | IOSCO FR07/13 **Principle 7** (Data Sufficiency) and **Principle 8** (Hierarchy of Data Inputs); EU BMR **Regulation (EU) 2016/1011 Art 11(1)(a)–(c)** (input data) and **Art 11(3)(d)** (duty to publish data-input hierarchy); companion research note [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md); gap-matrix rows **P7**, **P8**, **P12** at [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) |

---

## Problem

`docs/research/gaps/iosco-principles.md` carries two unresolved high-leverage
rows that share the same remedy on the same page:

- **Row P7 (Data Sufficiency)** — `partial / structurally weak`. CTI's inputs
  are firm executable list prices, not observed transactions. IOSCO FR07/13
  Principle 7 wants benchmarks "anchored by observable transactions"; BMR
  Art 11(1)(c) codifies the same preference but explicitly admits "committed
  quotes" as a permitted fallback where transaction data "is not sufficient or
  is not appropriate". The research note 2026-05-12 diagnosed CTI's inputs as
  substantively "committed quotes" (firm, executable, mechanically captured,
  from a genuine arms-length cash market) and recommended **Track A**: do not
  claim unqualified P7 compliance; instead, self-classify precisely on
  `/methodology`.

- **Row P8 (Hierarchy of Data Inputs)** — `partial`. The hierarchy exists in
  code (`normalization_rule → alias → fuzzy → Claude ≥0.95 auto → 0.70–0.95
  admin queue → outlier check → eligibility check → VWAP`) but is not stated on
  the public page. BMR Art 11(3)(d) requires administrators to "draw up and
  publish clear guidelines regarding the types of input data, the priority of
  use of the different types of input data and the exercise of expert
  judgement."

Both rows close with the same page edit. `/methodology` is a hard-limit surface
(CODEOWNERS-gated via `@CarlosGalindo2807`), so the edit requires this
proposal + Committee review + the 30-day public-notice step.

A third, free-rider closure is available: gap-matrix row **P12 (Changes to the
methodology)** is `compliant in design, untested` and queues *"dry-run the
methodology change procedure"* as its remediation. Taking this proposal through
the full Step 1–4 pipeline **is** that dry run — the first end-to-end exercise
of the Committee charter's own change-control procedure, on a change that is
genuinely low-risk (no published number moves). Running it now, before the
first contested methodology-parameter change, surfaces any procedural gaps
without any at-risk benchmark value.

## Proposed change

**One page edit, one semver patch bump, one inert `methodology_versions` row.
No change to any formula, parameter, filter, weight, or published value.**

### 1. `apps/web/app/methodology/page.tsx` — add two new sections

Insert **before** the existing "Formula" section (so a reader hits the input
classification before the formula that consumes it):

> **Section — "Data inputs"** (new, inserted immediately after the
> `Currently in force` banner):
>
> *Classification.* CTI is a **published-quote benchmark**. Its inputs are
> firm, executable on-demand list prices captured directly from provider
> endpoints. On-demand GPU compute is a large, real, competitive cash market;
> however, there is no public consolidated transaction tape for on-demand
> GPU-hours. Where transaction data is not available, EU BMR Art 11(1)(c)
> permits "committed quotes" as input, and CTI's inputs qualify in substance:
> each `price_snapshots` row is a provider's own executable ask, callable at
> the quoted price at the moment of capture, mechanically ingested and
> schema-validated (no human submission step). The benchmark is anchored in a
> genuine arms-length cash market; the published number is computed from
> those quotes with no expert judgment. CTI does not currently claim
> unqualified IOSCO Principle 7 compliance; a reconciliation of published
> quotes against observed effective prices is planned (see Roadmap B10 /
> `invoice_observations` ingest).
>
> *Hierarchy of data inputs* (satisfies BMR Art 11(3)(d)). Every snapshot
> passes through the stages below, in order; **no later stage overrides or
> re-weights an earlier stage**, and no stage introduces expert judgment into
> the published number. (Expert judgment is permitted only in Stage 4, and
> only where it classifies a GPU string — never where it changes a price.)
>
> 1. **Raw capture** — provider marketplace endpoint or structured catalog;
>    Zod-schema-validated; non-conforming rows are dropped, never coerced.
> 2. **GPU-model normalization** — in strict priority: (a) deterministic rule
>    (`normalization_rule` table); (b) alias match; (c) fuzzy match ≥ 0.95
>    similarity; (d) Claude Sonnet model proposal with confidence ≥ 0.95
>    (auto-resolves and back-fills into `normalization_rule`); (e) Claude
>    proposal 0.70–0.95 (routed to `/admin/unmatched` for one-click human
>    approval); (f) < 0.70 or no proposal (dropped as unmatched).
> 3. **Statistical quality gate** — MAD-3σ outlier flag per GPU model, 1-hour
>    comparison window, deterministic. Flagged rows are excluded from the
>    determination but retained in `price_snapshots` with `is_outlier = true`
>    for audit.
> 4. **Provider eligibility gate** — `reliability_score ≥ 0.5`, computed from
>    observed scrape success rate and outlier ratio with a defined decay
>    function; no manual override.
> 5. **Quorum gate** — fewer than 5 eligible observations ⇒ **no value is
>    published** for that index-day. A `index_value_skipped` event is emitted
>    with the shortfall count. CTI never extrapolates, carries forward, or
>    falls back to a different formula.
> 6. **Determination** — the published value is the filtered-VWAP defined in
>    "Formula" below, computed deterministically from the set of observations
>    that cleared stages 1–5.
>
> *Preference for transaction data.* Where transaction data becomes available
> (initially via `invoice_observations`; later potentially via a clearing
> partner), it will first be published as a **reconciliation artifact** (a
> list-price-vs-effective-price report per GPU, per 90-day window). Any change
> to the determination pipeline that admits transaction data as a weighted
> input is a methodology-class change and requires the full
> `Step 1 · Research → Step 4 · Effective date` procedure described below.

> **Section — "What this methodology does not claim"** (new, inserted at
> the end of the page, immediately before the footer source-code pointer):
>
> - CTI is not an **IOSCO-registered** benchmark; the index administrator is
>   not currently registered under EU BMR or supervised by the FCA. IOSCO
>   compliance is self-assessed; the public gap matrix at
>   [`docs/research/gaps/iosco-principles.md`](https://github.com/CarlosGalindo2807/compute-terminal/blob/main/docs/research/gaps/iosco-principles.md)
>   records every principle's status and the specific remaining gap.
> - CTI is not a **settlement benchmark**. No derivatives contract settles
>   against a CTI value today. A future transition to settlement use would
>   require a cessation-and-transition policy (gap-matrix P13) and is not in
>   scope for v1.x.
> - CTI does **not** have Submitters in the LIBOR sense (BMR Art 15 / IOSCO
>   P14 n/a) because inputs are mechanically scraped, not submitted. The P8
>   hierarchy above replaces a Submitter Code of Conduct.
> - CTI is **not** a transactional benchmark. See "Data inputs" above for the
>   published-quote classification and the planned reconciliation path.

### 2. `packages/shared/src/methodology.ts` — version bump only

```diff
-export const PUBLISHED_METHODOLOGY_VERSION = 'v1.0' as const;
+export const PUBLISHED_METHODOLOGY_VERSION = 'v1.0.1' as const;
-  version: 'v1.0',
+  version: 'v1.0.1',
```

**All other fields of `PUBLISHED_METHODOLOGY` are byte-identical to v1.0.**
The formula (`filtered_vwap`), window (24h), quorum (`minObservations: 5`),
outlier filter (`mad_3_sigma`), weight (`num_gpus`), and reliability floor
(0.5) are unchanged.

Proposed semver convention (new — Committee to ratify or amend):

- **PATCH** (`v1.0.x`): changes to published documentation that explain,
  classify, or disclose the existing methodology without altering any
  constant in `PUBLISHED_METHODOLOGY` or any logic in `index-calculator.ts` /
  `outlier-detector.ts`. **This proposal is a PATCH.**
- **MINOR** (`v1.x.0`): changes to numeric parameters of the existing formula
  (e.g. `minObservations: 5 → 7`) or to the eligibility / outlier / quorum
  gates. Requires 30-day notice and a 90-day backtest.
- **MAJOR** (`v2.0.0`): change of the published formula itself (e.g.
  `filtered_vwap → trimmed_mean_10`). Requires 30-day notice, 90-day backtest,
  and an explicit Committee vote recorded under `docs/committee-minutes/`
  (gap-matrix P18).

### 3. `apps/workers/src/functions/methodology.test.ts` — version-string update only

The lock test currently asserts `PUBLISHED_METHODOLOGY_VERSION === 'v1.0'`.
Update that single string to `'v1.0.1'`. **All six formula-parameter lock
assertions are unchanged.** This is the single legitimate reason the test is
edited — a documentation-only version bump that carries forward every
numeric lock. Any attempt to loosen a formula-parameter lock assertion in the
same PR must be rejected at review.

### 4. New migration `packages/db/migrations/XXX_methodology_v1_0_1_docs_bump.sql`

Inserts one row into `methodology_versions`:

```sql
INSERT INTO methodology_versions (
  version, formula_id, formula_params,
  effective_from, effective_to,
  rationale, approved_by, approved_at, document_url
) VALUES (
  'v1.0.1', 'filtered_vwap',
  '{"windowHours":24,"minObservations":5,"outlierFilter":"mad_3_sigma","weight":"num_gpus","reliabilityFloor":0.5}'::jsonb,
  '2026-12-28', NULL,
  'Documentation-only patch: adds published-quote benchmark self-classification and data-input hierarchy to /methodology (gap-matrix P7 Track A + P8). Numeric methodology identical to v1.0; no published-number change. Dry-run of the Committee change-control procedure (gap-matrix P12).',
  '<approved_by_text_pending_B7>',
  NOW(),
  'https://github.com/CarlosGalindo2807/compute-terminal/pull/<this-PR>'
);

-- Close v1.0 by setting effective_to = effective_from of v1.0.1
UPDATE methodology_versions
   SET effective_to = '2026-12-28'
 WHERE version = 'v1.0' AND effective_to IS NULL;

-- Record the change in methodology_changes for the /methodology notice surface (Roadmap B8).
INSERT INTO methodology_changes (
  from_version, to_version, change_type,
  announced_at, effective_from,
  summary, full_rationale_url
) VALUES (
  'v1.0', 'v1.0.1', 'documentation',
  NOW(), '2026-12-28',
  'Classify CTI as a published-quote benchmark (IOSCO P7 Track A) and publish the data-input hierarchy (BMR Art 11(3)(d) / IOSCO P8). No change to any published value.',
  '<URL of this proposal file on main>'
);
```

(Table columns per `packages/db/migrations/` schema — any column-name drift
discovered at PR-opening time is a non-substantive fix-up, not a rewrite of
this proposal.)

## Why this is the right shape (vs. alternatives)

Three shapes were weighed:

**Alternative A — do nothing (status quo).** Rejected. The gap matrix P7 row
is the single most-pressed-on exposure in any serious external review; the
companion note calls it "the single most important methodological exposure."
Leaving P7+P8 unaddressed makes every future licensee / auditor conversation
start from a defensive posture.

**Alternative B — edit the page as an unversioned docs fix (no `methodology_versions` row).**
Rejected on two grounds. First, `/methodology` is the *published contract*;
changing its text without a version marker breaks the reproducibility promise
("historical values remain reproducible" — Committee charter Step 4). Second,
this foregoes the free-rider closure of P12: without running the version
pipeline end-to-end on a low-risk change, the first run of the pipeline will
be on a contested parameter change, with real published-number stakes.

**Alternative C (chosen) — v1.0.1 PATCH + proposal + Committee review + 30-day notice + migration + version-stamped documentation edit.**
Same substantive content as Alternative B, routed through the full charter
procedure. Incremental cost over B is small (one extra migration row, a
30-day wait, a Committee minute); value is large: a proven procedure, a
reviewable precedent for the semver convention, and a `methodology_versions`
row that future licensees can cite.

An **Alternative D — bundle Track B (invoice reconciliation) into the same
proposal** — was considered and rejected. Track B depends on the
`invoice_observations` ingest pipeline, which is unbuilt; bundling blocks a
docs change that is unblocked today on an infrastructure change that isn't.
Track B belongs in a separate proposal once the ingest is live.

## Empirical impact

**No published-number change is produced by this proposal.** The empirical
claim to validate is therefore the *negative*: that running under v1.0.1
produces byte-identical published numbers to v1.0 for every day in the live
history.

Proof plan (to be executed in the PR branch, output committed as
`docs/research/notes/2026-12-01-v1-0-1-identity-backtest.md`):

1. Snapshot the current `index_values_daily` table to a read-only artifact at
   `docs/research/snapshots/2026-11-23-pre-v1-0-1-cutover/index_values_daily.csv`.
2. Replay the index calculator against the prior 90 days of `price_snapshots`
   under `PUBLISHED_METHODOLOGY_VERSION = 'v1.0.1'` with every field other
   than `version` unchanged.
3. Diff the output `(index_slug, trade_date, vwap, num_observations)` tuples
   against the pre-cutover snapshot. **Expected result: zero diff rows.** A
   single non-zero diff is a merge blocker and surfaces a bug in the lock
   test.

Sensitivity analysis is non-applicable: no parameter varies. Coverage impact
is non-applicable: no eligibility rule varies. False-positive / false-negative
rates on the outlier filter are non-applicable: no filter varies.

The one piece of empirical signal this proposal does generate is the **procedure
timing** itself — how long each of Steps 1–4 actually takes (research:
complete; notice: 30 days; Committee review PR → merge: TBD). That timing is
what tells us whether the charter is realistic for faster future changes, or
whether the quarterly review cadence needs a documented emergency-patch path.

## Risks

**Immediate risks.**

- *Risk: the v1.0 → v1.0.1 transition breaks reproducibility of pre-cutover
  values.* **Mitigation:** every `index_values_daily` row carries its
  `methodology_version` string; rows written under v1.0 keep `'v1.0'`. Nothing
  recomputes historical values. The audit principle in the proposal template
  ("Historical values are NOT recomputed; published numbers are immutable") is
  honored as-stated.
- *Risk: the lock-test edit (`'v1.0'` → `'v1.0.1'`) could mask a parameter
  change smuggled into the same PR.* **Mitigation:** the lock test retains
  all six parameter assertions on `PUBLISHED_METHODOLOGY`; only the version
  string equality moves. CI diff review and CODEOWNERS gating catch any
  parameter edit in the same PR.
- *Risk: the migration fails to close v1.0's `effective_to` atomically.*
  **Mitigation:** both statements wrapped in a single transaction; migration
  idempotence enforced by the standard `_migrations` row pattern already in
  use.

**Second-order risks.**

- *Risk: an external reviewer reads the self-classification as a weakening of
  the IOSCO claim.* **Mitigation:** CTI has not yet made an IOSCO claim; the
  self-classification *strengthens* the position relative to the status quo
  (where the strongest argument against CTI is unaddressed). The gap matrix
  itself is public — anyone reading `/methodology` can follow the link and
  see the full self-assessment.
- *Risk: proposed semver scheme (PATCH = docs, MINOR = parameters, MAJOR =
  formula) binds future Committee choices awkwardly.* **Mitigation:** the
  scheme is proposed, not asserted; Committee is explicitly asked to ratify
  or amend in the deliberation prompt below. If ratified, it becomes a
  decision entry in `docs/decisions.md`.
- *Risk: licensees reading "CTI does not currently claim unqualified IOSCO
  P7 compliance" overreact.* **Mitigation:** there are no licensees yet
  (Roadmap D17–D18). The right time to state this is before, not after,
  the first licensee conversation. A contract that references CTI today
  would reference `v1.0`; the v1.0.1 PATCH does not change what that
  contract settles on.

## Migration / rollout plan

- **Public-notice period starts** on merge date (target: 2026-11-28).
- **First `index_values_daily` row stamped `v1.0.1`** is the row dated
  2026-12-28 (effective date = merge date + 30 days per Committee charter
  Step 3).
- **Historical values are NOT recomputed.** Rows dated 2026-05-11 through
  2026-12-27 keep `methodology_version = 'v1.0'`.
- **New row added to `methodology_versions`** per migration above.
- **`methodology_changes` row inserted** so Roadmap B8's "notice page for
  proposed changes" (when built) has a real row to surface.
- **Committee charter on `/methodology` is updated** to list v1.0.1 in the
  version-history table (this happens automatically because the table is
  rendered from `methodology_versions`).

Deploy steps after merge:

1. Apply the new migration against production Supabase (standard `pnpm db:push`
   path — no PITR requirement, since rows are insert-only and reversible by a
   later migration).
2. Verify `/methodology` renders the new sections against production data
   (RSC build; ISR revalidate = 300 — allow ~5 min for first-visitor refresh).
3. Confirm the v1.0 row's `effective_to` shows as `2026-12-28` in the
   version-history table.
4. Open a `methodology_versioned` advisory in `system_events` with the diff.
5. Set a 2026-12-28 calendar reminder to verify the first v1.0.1-stamped
   `index_values_daily` row appears on-schedule.

Rollback steps (if a defect is discovered before 2026-12-28):

- Revert the migration (`DELETE FROM methodology_changes WHERE to_version =
  'v1.0.1'; DELETE FROM methodology_versions WHERE version = 'v1.0.1'; UPDATE
  methodology_versions SET effective_to = NULL WHERE version = 'v1.0';`).
- Revert the page edit, the constant bump, and the lock-test update in one
  revert commit.
- Document the revert in `docs/committee-minutes/` as the first Committee
  minute entry (also closes gap-matrix P18 for the first time).

Monitor in `system_events` after merge: `methodology_changed` events (should
emit exactly one, dated the merge); `index_value_skipped` events in the 24
hours spanning 2026-12-28T00:30 UTC (should emit zero incremental events
beyond the natural skip rate).

## Committee deliberation prompt

> "We are classifying CTI as a **published-quote benchmark** and publishing
> our data-input hierarchy on `/methodology`, closing gap-matrix rows P7
> (Track A) and P8, and simultaneously using the change itself to exercise
> the charter's own change-control pipeline (P12). No published numeric
> value changes — the formula, outlier filter, quorum, eligibility floor,
> and weight are byte-identical between v1.0 and v1.0.1. The version bump
> is strictly a documentation marker required by the charter's
> reproducibility commitment. We are also proposing a semver convention
> (PATCH = docs, MINOR = parameters, MAJOR = formula) to make future
> version bumps mechanical rather than contested. Accepting this proposal
> means: (a) agreeing that CTI's inputs are best described as 'committed
> quotes' within the meaning of EU BMR Art 11(1)(c) and that a precise
> self-classification is stronger than an implicit over-claim; (b)
> agreeing that the hierarchy published here is an accurate description of
> the actual code path; (c) ratifying the semver convention; (d) starting
> the 30-day public-notice clock. Voted: <yes/no>, Carlos Galindo
> Dumitrescu, on YYYY-MM-DD."

## Closing

Upon approval and merge:

1. Update `docs/research/gaps/iosco-principles.md` — row **P7** to `partial
   (Track A closed; Track B, C queued)` with a link to the merged PR; row
   **P8** to `compliant` with a link; row **P12** to `compliant` with a note
   that the v1.0 → v1.0.1 transition served as the first end-to-end run of
   the Committee charter.
2. Add an entry to `docs/decisions.md` titled "Published-quote classification
   + semver convention (v1.0.1)" with the merged-PR link and a one-paragraph
   summary of the deliberation.
3. Create `docs/committee-minutes/2026-11-23-v1-0-1-patch.md` with the
   Committee vote record, satisfying the first row of gap-matrix P18
   (`committee-minutes/` directory establishment).
4. Link the merged PR below.

---

### References — full URLs

- IOSCO FR07/13, *Principles for Financial Benchmarks*, Jul 2013,
  https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf — Principles 7, 8.
- IOSCO IOSCOPD549, *Guidance on the IOSCO Principles for Financial Benchmarks*,
  Jan 2018, https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf.
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data),
  EUR-Lex CELEX 32016R1011, https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng.
- ESMA Interactive Single Rulebook, BMR Article 11,
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data.
- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, Apr 2026,
  https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf
  — comparable published-assessment benchmark (BMR-compliant without a trade tape).
- MSCI, *IOSCO Principles for Financial Benchmarks* statement-of-compliance hub,
  https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco.

(Source-fetch note: direct fetch of ESMA, EUR-Lex, and IOSCO PDF hosts was
blocked at the network layer (`ENOTFOUND`) during the 2026-11-23 research
session, as in the 2026-05-10 and 2026-05-12 sessions. Quoted BMR Art 11(1)(c)
and IOSCO P7 text here is reconstructed from the near-verbatim excerpts cited
in [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
§1, which were themselves triangulated from IOSCO- and ESMA-published search
excerpts and from training knowledge of the regulation. External page text is
treated as untrusted data throughout. A future session with egress to these
hosts should reconcile and file the reconciliation as a `/docs/research/notes`
PR.)

---

*Merged PR: `<TBD>`.*
