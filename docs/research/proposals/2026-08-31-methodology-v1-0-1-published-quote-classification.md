# Proposal: Methodology v1.0.1 — publish CTI's input classification and data-input hierarchy

| | |
|---|---|
| **Date** | 2026-08-31 |
| **Author** | index-architect (fourth run) |
| **Risk class** | methodology (disclosure-only, no computation change) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx`, `packages/shared/src/methodology.ts`, `apps/workers/src/functions/methodology.test.ts`, new `packages/db/migrations/012_methodology_v1_0_1.sql` |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Committee member) |
| **Effective date if approved** | 2026-10-01 (≥ 30 days after any merge date on or before 2026-08-31; effective date is the first `index_values_daily` row published under v1.0.1) |
| **References** | IOSCO Principles for Financial Benchmarks (FR07/13) Principles 7 (Data Sufficiency) and 8 (Hierarchy of Data Inputs); Regulation (EU) 2016/1011 (BMR) Article 11(1)(a)(c) and Article 11(3)(d); gap-matrix rows P7 + P8; companion research note `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`; primary URLs: IOSCO FR07/13 https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf , IOSCO Guidance IOSCOPD549 https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf , EUR-Lex CELEX 32016R1011 https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng , ESMA Single Rulebook Art 11 https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data . |

## Problem

`docs/research/gaps/iosco-principles.md` currently records two P0/P1 quality-pillar gaps against the same surface (`/methodology`):

- **P7 — Data sufficiency (partial / structurally weak).** Every CTI input is a scraped *listing* (a firm executable offer), not an observed *trade*. IOSCO Principle 7 states that benchmarks must be "anchored by observable transactions," and BMR Article 11(1)(c) sets a strict preference for transaction data. CTI's inputs are, in BMR terms, closest to "committed quotes" — permitted as a fallback under 11(1)(c) — but this position has never been *stated* on the published page. Silence reads as either an unclaimed compliance posture or, worse to an auditor, as an unwitting overclaim.
- **P8 — Hierarchy of data inputs (partial).** The ingestion pipeline enforces a hierarchy in code (rule → alias → fuzzy → Claude ≥ 0.95 auto → 0.70–0.95 admin queue → outlier check → eligibility check → quorum → filtered VWAP), and no expert judgment ever touches the published number. BMR Article 11(3)(d) requires the administrator to "draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement." The hierarchy exists — it just isn't published.

Both gaps are single-surface fixes to the same page. The 2026-05-12 research note (companion) reached the same conclusion:

> **Recommended single next deliverable:** the `/methodology` self-classification + data-input-hierarchy proposal (Track A). It closes the two highest-leverage quality-pillar gaps (P7, P8) at once, is a contained docs/page change, and turns CTI's most-pressed-on weakness into a stated design position before any external licensee conversation surfaces it.

This proposal is that deliverable. Because `/methodology` is a hard-limit file (charter §Hard limits) and the change materially alters what is published to the world, it also carries a **version bump to v1.0.1** — a disclosure-only patch that does not change any computation.

## Proposed change

Three coordinated edits, all landing in one PR, all reversible:

### 1. `apps/web/app/methodology/page.tsx` — two new sections inserted between "Formula" and "Index Committee"

**New section A — Input classification.** Placed immediately after the existing `Quorum` subsection, before `Index Committee`:

```tsx
{/* ─── Input classification ─── */}
<section className="mt-16">
  <h2 className="display text-2xl">Input classification</h2>
  <p className="mt-3 text-ink-secondary">
    CTI is a <em>published-quote</em> benchmark. Its inputs are firm,
    executable on-demand list prices captured directly from provider
    endpoints — a Vast.ai or RunPod listing is executable on click at the
    quoted price. On-demand compute has no public consolidated transaction
    tape; per EU Benchmarks Regulation Article 11(1)(c), where transaction
    data is not sufficient or appropriate, input data which is not
    transaction data may be used, including estimated prices, quotes and
    committed quotes. CTI's inputs sit closest to <em>committed quotes</em>
    in that hierarchy.
  </p>
  <p className="mt-3 text-ink-secondary">
    The benchmark is anchored in a genuine arms-length cash market for
    GPU-hours. Every published number is computed with zero expert judgment.
    An observed-transaction layer is roadmapped: the{' '}
    <span className="mono">invoice_observations</span> table exists in
    schema for anonymised real-paid prices; when its ingest is stood up, it
    will feed a periodic list-price-vs-observed-effective-price
    reconciliation report, and only later — through a full methodology
    version bump with committee review and 30-day public notice — could it
    become a weighted input class.
  </p>
</section>
```

**New section B — Hierarchy of data inputs.** Placed immediately after Section A:

```tsx
{/* ─── Hierarchy of data inputs ─── */}
<section className="mt-16">
  <h2 className="display text-2xl">Hierarchy of data inputs</h2>
  <p className="mt-3 text-ink-secondary">
    Every published value is derived through the following stages, in
    strict order, with no expert judgment at any step:
  </p>
  <ol className="mt-6 space-y-3 text-ink-secondary">
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">1 · Ingestion</span>
      <div className="mt-1">Firm executable listings captured from provider endpoints on a 5-minute cron.</div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">2 · Schema validation</span>
      <div className="mt-1">Zod parser rejects any offer that fails the contract; failures emit a dead-letter event, never a silent coercion.</div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">3 · Normalization</span>
      <div className="mt-1">Rule → alias → fuzzy match against the GPU catalog. Unmatched strings drain hourly to a Claude batch: confidence ≥ 0.95 auto-resolves into a normalization rule; 0.70 – 0.95 queues at <span className="mono">/admin/unmatched</span> for one-click human approval. No Claude output ever enters the published-number path without either a threshold pass or human approval.</div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">4 · Outlier flagging</span>
      <div className="mt-1">MAD-3σ per GPU model over a 1-hour window. Flagged rows are excluded from <span className="mono">E_t</span> but retained in <span className="mono">price_snapshots</span> for audit.</div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">5 · Eligibility check</span>
      <div className="mt-1"><span className="mono">provider_reliability_score ≥ 0.5</span>. Reliability is derived deterministically from scrape success rate and outlier ratio — no manual override.</div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">6 · Universe check</span>
      <div className="mt-1">GPU model must be in the declared universe of the index being computed.</div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">7 · Quorum</span>
      <div className="mt-1"><span className="mono">|E_t| ≥ {`{PUBLISHED_METHODOLOGY.minObservations}`}</span> or the day is skipped; an <span className="mono">index_value_skipped</span> event is emitted. No extrapolation, no carry-forward, no fallback formula.</div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">8 · Filtered VWAP</span>
      <div className="mt-1">Volume-weighted by <span className="mono">num_gpus</span>. The result is written to <span className="mono">index_values_daily.vwap</span> stamped with <span className="mono">methodology_version</span>.</div>
    </li>
  </ol>
  <p className="mt-6 text-sm text-ink-muted">
    <strong>Input types accepted, in priority:</strong> (a) observed
    transaction data — not currently ingested; latent home in{' '}
    <span className="mono">invoice_observations</span>; (b) firm executable
    quotes — the current input class; (c) indicative quotes or estimates —
    not used, and adopting them would require a methodology version bump
    with committee review. Expert judgment is not used in the
    published-number path.
  </p>
</section>
```

### 2. `packages/shared/src/methodology.ts` — bump version to v1.0.1

```diff
-export const PUBLISHED_METHODOLOGY_VERSION = 'v1.0' as const;
+export const PUBLISHED_METHODOLOGY_VERSION = 'v1.0.1' as const;

 export const PUBLISHED_METHODOLOGY: {
-  version: typeof PUBLISHED_METHODOLOGY_VERSION;
+  version: typeof PUBLISHED_METHODOLOGY_VERSION;
   formulaId: MethodologyName;
   windowHours: number;
   minObservations: number;
   outlierFilter: 'mad_3_sigma';
   weight: 'num_gpus';
   reliabilityFloor: number;
 } = {
-  version: 'v1.0',
+  version: 'v1.0.1',
   formulaId: 'filtered_vwap',
   windowHours: 24,
   minObservations: 5,
   outlierFilter: 'mad_3_sigma',
   weight: 'num_gpus',
   reliabilityFloor: 0.5,
 };
```

**All formula constants are unchanged.** `formulaId`, `windowHours`, `minObservations`, `outlierFilter`, `weight`, and `reliabilityFloor` remain identical. The bump is disclosure-only.

**Versioning discipline established by this bump** (documented in `docs/decisions.md` as part of this PR): `v1.0 → v1.0.1` = disclosure or clarification, no computation change. `v1.x` = compute-affecting parameter change (e.g. `windowHours`, `minObservations`, `reliabilityFloor`, outlier k-factor). `v2.0` = structural change (new formula, new input class admitted to the hierarchy, universe redefinition). This mirrors the SemVer-for-benchmarks pattern MSCI uses in its indices' change-log semantics (patch = clarification, minor = parameter, major = design).

### 3. `apps/workers/src/functions/methodology.test.ts` — extend lock, don't replace

The lock test is a hard-limit file whose entire purpose is to catch silent drift. Under this proposal it is **extended** (not weakened) to lock v1.0.1:

- The version string assertion moves from `v1.0` to `v1.0.1`.
- Every other assertion (`formulaId === 'filtered_vwap'`, `windowHours === 24`, `minObservations === 5`, `reliabilityFloor === 0.5`, `outlierFilter === 'mad_3_sigma'`, `weight === 'num_gpus'`) is preserved unchanged.
- No test is skipped, disabled, marked `.only`, or otherwise made easier to pass.

The exact `.test.ts` diff is drafted in the PR that follows this proposal — this file only describes the shape, because the test file is hard-limit and the charter requires that the actual edit be part of the review PR, not the proposal.

### 4. New migration `packages/db/migrations/012_methodology_v1_0_1.sql`

A single INSERT into `methodology_versions`. No schema change, no touch of any existing row (v1.0 stays as-is with its `effective_to` set to the day before v1.0.1's `effective_from`).

```sql
-- 012_methodology_v1_0_1.sql
-- v1.0.1 disclosure bump: publishes CTI's input classification and
-- data-input hierarchy on /methodology. No formula change.
-- Effective 2026-10-01 (≥ 30 days after merge per Index Committee charter).

BEGIN;

UPDATE methodology_versions
SET effective_to = DATE '2026-09-30'
WHERE version = 'v1.0'
  AND effective_to IS NULL;

INSERT INTO methodology_versions (
  version, formula_id, formula_params, effective_from, effective_to,
  rationale, approved_by, approved_at, document_url
) VALUES (
  'v1.0.1',
  'filtered_vwap',
  '{"windowHours":24,"minObservations":5,"outlierFilter":"mad_3_sigma","weight":"num_gpus","reliabilityFloor":0.5}'::jsonb,
  DATE '2026-10-01',
  NULL,
  'Disclosure-only patch: publishes CTI''s classification as a published-quote benchmark (BMR Art 11(1)(c)) and the deterministic data-input hierarchy (BMR Art 11(3)(d) / IOSCO Principle 8). No formula constants change.',
  'Carlos Galindo Dumitrescu, sole founding Committee member',
  '<timestamp of merge>',
  'https://github.com/carlosgalindo2807/compute-terminal/pull/<this-pr>'
);

INSERT INTO methodology_changes (
  from_version, to_version, effective_from, notice_published_at,
  summary, iosco_principles, bmr_articles
) VALUES (
  'v1.0',
  'v1.0.1',
  DATE '2026-10-01',
  '<timestamp of merge>',
  'Publishes CTI''s input classification (published-quote benchmark) and its data-input hierarchy on /methodology. No formula change; every published value under v1.0.1 is identical to what v1.0 would have published.',
  ARRAY['P7','P8'],
  ARRAY['11(1)(a)','11(1)(c)','11(3)(d)']
);

COMMIT;
```

If `methodology_changes` does not carry `iosco_principles` / `bmr_articles` columns today, drop them from the INSERT and instead put the mapping in the row's `summary`. (The schema check happens at PR time, not proposal time.)

## Why this is the right shape (vs. alternatives)

Three alternatives were weighed:

**Alt 1 — Add the disclosure text but keep the version as v1.0.**
- *Cheaper:* no test/migration touch, no committee approval needed for the constant.
- *Rejected because:* what is published to the world materially changed (a new classification, a new hierarchy). An auditor's first question at the version-history table is "what changed at v1.0.1?" — a page that changed its published content without a version stamp defeats the whole point of `index_values_daily.methodology_version`. It also sets a precedent that lets substantive disclosures slip in outside the change-control envelope.

**Alt 2 — Wait and roll the disclosure into the next v1.x methodology change (e.g. a future `minObservations` or `reliabilityFloor` tune).**
- *Cheaper:* one committee cycle instead of two.
- *Rejected because:* P0 items in the gap matrix are P0 for a reason — they block any external "we are IOSCO-aligned" claim. Delaying the classification until a compute-affecting change happens ties the disclosure to a distant, unscheduled event. The whole point of the change-control machinery is that it's *available* for surgical bumps like this one, not reserved for large rewrites.

**Alt 3 (chosen) — v1.0.1 patch: disclosure-only bump, formula constants unchanged, full committee procedure exercised in the small.**
- *Slightly more work* (test lock extension + migration).
- *Chosen because:* (a) closes both P0/P1 gaps at their proper surface with a proper audit stamp; (b) exercises the 30-day public notice procedure end-to-end for the first time — automatically resolves gap-matrix row P12 ("no change has yet been processed end-to-end"); (c) establishes the SemVer-for-benchmarks discipline (patch = clarification, minor = parameter, major = design) for every future bump; (d) minimal blast radius — the arithmetic under v1.0.1 is bit-for-bit v1.0.

The MSCI Global Investable Market Indexes Methodology (December 2022) uses the same three-tier discipline: "corrections and clarifications" are published in change logs without altering the index level, "policy updates" that change a rule but not the level, and "methodology enhancements" that do. This proposal is the CTI analog of the first tier.

## Empirical impact

**Formula constants under the proposal:** unchanged. Every field of `PUBLISHED_METHODOLOGY` other than `version` retains its v1.0 value.

**Numeric identity guarantee.** For every day `t` in `[v1.0.effective_from, 2026-08-31]` where `index_values_daily` has a row with `methodology_version = 'v1.0'`:

```
compute_vwap(price_snapshots WHERE captured_at ∈ [t-24h, t), PUBLISHED_METHODOLOGY_v1_0_1)
  == index_values_daily.vwap[t]  (bit-exact under the same input set)
```

This holds because `filtered_vwap` is a pure function of `(rows, params)` and `params` are unchanged. The methodology lock test enforces this at CI time under v1.0.1 by re-asserting every parameter.

**Backtest of the new value vs. the last 90 days.** For a disclosure-only bump the backtest is the identity above. The PR that lands this proposal will include a one-shot script (`scripts/backtest-v1-0-1-identity.ts`) that, in read-only mode against `price_snapshots` and `index_values_daily`, recomputes v1.0.1 for the last 90 days and asserts equality to v1.0 (tolerance `0.0`, exact float equality — pure function, same inputs, no drift permitted). The script writes its output to `docs/research/notes/2026-08-31-v1-0-1-backtest.md` as the empirical record.

**Sensitivity analysis.** No parameter has moved, so ±10% is undefined. The disclosure text was fact-checked against the code paths it names:
- `filtered_vwap`, `windowHours = 24`, `minObservations = 5`, `mad_3_sigma`, `weight = num_gpus`, `reliabilityFloor = 0.5` — all match `packages/shared/src/methodology.ts` lines 114-121.
- Normalization thresholds (`≥ 0.95` auto, `0.70 – 0.95` queue) — match the AgentCard on the existing `/methodology` page and `docs/decisions.md` §Synchronous fast-path normalization.
- Outlier: MAD-3σ per GPU model over a 1-hour window — matches the existing `/methodology` `is_outlier` block and `apps/workers/src/functions/outlier-detector.ts`.

**Coverage impact.** Zero provider-days affected. Zero index-days recomputed. Historical `index_values_daily` rows keep `methodology_version = 'v1.0'` forever (audit principle: published numbers are immutable). New rows from 2026-10-01 forward carry `methodology_version = 'v1.0.1'`.

**False-positive / false-negative rate.** N/a — outlier filter unchanged.

## Risks

**Immediate:**
- **Lock-test drift.** If the lock test's assertion set is silently narrowed while the version string moves, we lose the drift detector. **Mitigation:** the PR diff for `methodology.test.ts` must be a single-character edit on the version literal plus, at reviewer's discretion, a *new* assertion for any newly-published field. No `.skip`, no `.only`, no comment-out.
- **Migration ordering.** `012_methodology_v1_0_1.sql` uses a hard-coded `effective_from = 2026-10-01`. If merge slips past 2026-08-31 by more than a day, the "≥ 30 days" invariant breaks. **Mitigation:** on merge, verify `(effective_from - merge_date) ≥ 30 days`; if not, the migration is edited to push `effective_from` forward before running.
- **Committee-record staleness.** `approved_by` / `approved_at` and the PR URL are placeholders in the migration. **Mitigation:** they are filled in at merge, not at proposal draft time.

**Second-order:**
- **Overclaim risk.** The disclosure text calls CTI a "published-quote benchmark" — precise language, but a careless reader might read that as "IOSCO-compliant." **Mitigation:** the text explicitly does NOT claim IOSCO or BMR compliance. It classifies the *inputs* (per BMR Art 11(1)(c)'s "committed quotes" language) and publishes the hierarchy (per BMR Art 11(3)(d)). A separate future proposal — after P3, P5, P16 are also closed — can add an IOSCO Statement of Alignment page.
- **Licensee downstream assumption break.** Any settlement contract or licensee that pins to `methodology_version = 'v1.0'` continues to see v1.0 rows through 2026-09-30 and v1.0.1 rows from 2026-10-01. Contracts should reference the semantic pinning policy documented in `docs/decisions.md` (this PR adds that section). Because v1.0.1 is bit-exact-equivalent to v1.0, a licensee that upgrades their pin on 2026-10-01 sees no discontinuity.
- **Auditor reads the hierarchy and asks why observed transactions aren't yet ingested.** The right answer, and the one the proposed text gives, is: the layer is designed (`invoice_observations` in schema), the redaction/ingest pipeline is roadmapped as Track B, and its first product is a reconciliation report — not an input-class change. This is the honest, defensible posture the 2026-05-12 note recommended.
- **Precedent risk.** If v1.0.1 lands with the 30-day notice, this becomes the template for every future disclosure. That is a feature, not a bug: it forces future disclosures through the same review discipline.

## Migration / rollout plan

- **T-30d (proposal merge, target on or before 2026-08-31):** PR opened against the proposal, hard-limit CODEOWNERS gate triggers @CarlosGalindo2807 review. Merge closes the proposal. The 30-day public-notice clock starts.
- **T-30d (same PR):** the `/methodology` page is updated in the same PR so that a "Proposed changes" banner appears — this is Roadmap B8's future home. Interim shape: the changed sections render immediately but the "Currently in force" banner still reads v1.0 until 2026-10-01 (guarded by `PUBLISHED_METHODOLOGY_VERSION` remaining `'v1.0'` in the merged code, with a companion const `PROPOSED_NEXT_METHODOLOGY_VERSION = 'v1.0.1'` and its `effectiveFrom` date).
  - *If the reviewer prefers the simpler shape:* land the two new sections and the version bump in a single atomic PR merged at least 30 days before 2026-10-01. Either shape satisfies the 30-day notice requirement.
- **T-0 (2026-10-01):** the index-calculator's next run stamps `methodology_version = 'v1.0.1'` on `index_values_daily` rows. If migration `012` has not been applied by that point, the calculator will fail its foreign-key check on `methodology_versions.version` — the desired behaviour (it fails loud, not silent). Ops check on 2026-10-01: `SELECT * FROM methodology_versions ORDER BY effective_from DESC LIMIT 3` should show v1.0.1 active.
- **T+1d:** run the identity backtest (`scripts/backtest-v1-0-1-identity.ts`) against the first v1.0.1 day. Assert equality vs. what a v1.0 computation would have produced from the same `price_snapshots`. Any deviation is a P0 incident.
- **Historical values NOT recomputed.** Every `index_values_daily.methodology_version = 'v1.0'` row stays as-is. This is the audit principle.
- **`methodology_versions`** gains a new row with the v1.0.1 entry.
- **`docs/decisions.md`** gains a "Methodology versioning discipline (v1.0.1 established the patch tier)" entry.
- **Rollback plan:** if a defect is discovered in the disclosure text between merge and effective date, land a follow-up PR editing the text and, if the semantic content of the disclosure changes, push `effective_from` in `methodology_versions` forward by a further 30 days. The migration is designed to make this trivial (update one row).

## Committee deliberation prompt (methodology only)

> "We are publishing CTI's input classification (published-quote benchmark, per EU BMR Article 11(1)(c)) and its data-input hierarchy (per BMR Article 11(3)(d) and IOSCO Principle 8) on `/methodology`. No computation changes — every published value under v1.0.1 is bit-for-bit identical to what v1.0 would have published from the same inputs. The bump exists because what is *published* changed, and every substantive publication change must carry a version stamp. This also establishes the versioning discipline (patch = disclosure/clarification, minor = parameter change, major = design change) that will govern every future bump, and exercises the 30-day public-notice procedure end-to-end for the first time. Voted: <yes/no>, Carlos Galindo Dumitrescu, on <YYYY-MM-DD>."

## Closing

After this proposal is approved (PR merged): 
- Mark `docs/research/gaps/iosco-principles.md` rows P7 (Track A) and P8 as resolved for the classification/hierarchy scope; P7 residual actions (Track B invoice ingest, Track C scaled quorum) remain open under P1. Also mark row P12 (methodology change procedure — "no change has yet been processed end-to-end") as resolved: v1.0 → v1.0.1 is that end-to-end run.
- Add a `docs/decisions.md` entry under "Methodology versioning discipline" with the patch/minor/major mapping.
- Link the merged PR + effective-date confirmation in this proposal's footer.
- Update the gap-matrix revision log with the closure delta.

---

*This proposal lives at `docs/research/proposals/2026-08-31-methodology-v1-0-1-published-quote-classification.md`. It follows the format in `docs/research/proposals/_TEMPLATE.md`. The companion research note is `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`.*
