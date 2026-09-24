# Proposal: Self-classify CTI as a "published-quote benchmark" and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-09-24 |
| **Author** | index-architect (fourth run) |
| **Risk class** | methodology (touches hard-limit `/methodology` surface; no change to any published number, no change to `PUBLISHED_METHODOLOGY` constant, no change to `index-calculator.ts` or `outlier-detector.ts`) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (add two new sections — see §Proposed change) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member; CODEOWNERS gate on `/methodology`) |
| **Effective date if approved** | Merge date + 30 days. This is a disclosure that describes existing behaviour rather than changing any computed value, and could plausibly be treated as an editorial page edit rather than a methodology change (see §Why this shape). We recommend applying the 30-day public-notice window anyway — establishing the precedent that anything touching `/methodology` follows Steps 1–4 is worth more than the 30 days saved. |
| **References** | IOSCO FR07/13, **Principle 7** (Data Sufficiency) and **Principle 8** (Hierarchy of Data Inputs) — https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf ; IOSCO **IOSCOPD549** *Guidance on the IOSCO Principles for Financial Benchmarks*, Jan 2018 — https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf ; **EU BMR** Regulation (EU) 2016/1011, **Article 11(1)(a)–(c)** and **Article 11(3)(d)** — https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng ; MSCI *IOSCO Principles for Financial Benchmarks* statement-of-compliance hub — https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco ; companion note [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) ; gap matrix [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) rows **P7 + P8**. |

## Problem

`docs/research/gaps/iosco-principles.md` currently marks two rows as open and
mutually reinforcing:

- **P7 (Data Sufficiency) — `partial / structurally weak`, P0.** CTI's inputs
  are scraped executable listings, not observed trades. Strict readings of IOSCO
  FR07/13 Principle 7 require a benchmark to be "anchored by observable
  transactions entered into at arm's length between buyers and sellers." CTI has
  not yet stated on `/methodology` what its inputs actually are, why on-demand
  compute has no public trade tape, or how that classification relates to the
  BMR Art 11(1)(c) "committed quotes" category. Any serious IOSCO-aligned
  reviewer will press on this on first pass.
- **P8 (Hierarchy of Data Inputs) — `partial`, P1.** The hierarchy exists in
  code (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue
  → outlier check → eligibility check → VWAP) with **zero expert judgment in
  the published-number path**, but it is not stated on `/methodology`. BMR Art
  11(3)(d) requires an administrator to "draw up and publish clear guidelines
  regarding the types of input data, the priority of use of the different types
  of input data and the exercise of expert judgement." Today CTI meets the
  substance but fails the "publish" half of that obligation.

The 2026-05-12 research note walked comparable benchmarks that live without a
public trade tape (Baltic freight assessments, Platts/Argus PRAs, LBMA fixings,
MSCI/IPD appraisals) and concluded that CTI's position is *defensible and
improvable* — the LBMA-fixing / Baltic-assessment pattern of **owning the
limitation** by classifying inputs precisely and publishing the hierarchy is
the right first move. That note's §5 recommended "the `/methodology`
self-classification + data-input-hierarchy proposal (Track A) [as] the single
most valuable next deliverable" and priced it at zero risk to any published
number. This is that proposal.

## Proposed change

Two new sections on `/methodology`, inserted **between the current "Quorum"
subsection and the current "Index Committee" section** (i.e. inside the
existing `<section>` that describes the formula, immediately after the
`Quorum` `<h3>`, and before the `Index Committee` `<h2>` block). The rest of
the page is untouched: the formula block, the outlier filter description, the
eligibility floor, the quorum rule, the committee procedure, the AI-orchestration
grid and the version history table all stay exactly as they are on 2026-09-24.

### New section 1 — Input classification

Rendered as an `<h3>` under the existing Formula section, with the same styling
as the existing "Outlier filter", "Eligibility floor" and "Quorum" `<h3>`s.
Exact wording proposed for the page:

> ### Input classification
>
> CTI is a **published-quote benchmark**. Every input is a **firm, executable
> on-demand list price** captured directly from a provider's own price endpoint
> — not a broker submission, not a modelled estimate, not a survey response.
> The prices we ingest are what a buyer would pay if they clicked "rent" on the
> provider's console at the moment of capture.
>
> On-demand GPU-hour compute is a large, real, arm's-length cash market, but it
> has **no public consolidated transaction tape**. There is no equivalent of
> the CTA/UTP feed in US equities or the T+1 trade-reporting apparatus in fixed
> income; provider invoices are bilateral and not disclosed. In the language of
> EU Regulation (EU) 2016/1011 (the Benchmarks Regulation), Article 11(1)(c),
> our inputs sit in the "committed quotes" class — inputs that are firm and
> executable but not themselves observed trades.
>
> We do not claim CTI is built from transaction data. We claim it is a
> transparent, reproducible, judgment-free aggregation of executable quotes
> from a genuine cash market, published with the hierarchy below so a reviewer
> can see exactly what enters the number.

### New section 2 — Hierarchy of data inputs

Rendered as an `<h3>` immediately after "Input classification". The prose
describes each stage in the order it runs on ingested data. Exact wording
proposed:

> ### Hierarchy of data inputs
>
> Every provider snapshot is processed by the same deterministic pipeline
> before it can enter <span className="mono">E_t</span>. The order is fixed;
> no stage may be skipped, and no stage exercises expert judgment on the
> published number.
>
> 1. **Schema validation.** The raw response from a provider endpoint is parsed
>    against a Zod schema. Rows that fail validation are dropped and emit a
>    <span className="mono">dead_letter</span> event. No coercion.
> 2. **GPU-model normalization.** The provider's product string is resolved to
>    a canonical GPU model through, in order: (a) an exact
>    <span className="mono">normalization_rule</span> row, (b) an alias table,
>    (c) a fuzzy match above a fixed similarity threshold, (d) a Claude
>    (Sonnet 4.6) classification with **confidence ≥ 0.95** which is auto-
>    committed as a new rule and applied to future snapshots, or (e) a Claude
>    classification between <span className="mono">0.70</span> and
>    <span className="mono">0.95</span>, which is queued at
>    <span className="mono">/admin/unmatched</span> for human approval **and
>    does not enter the published number until approved**. Rows below
>    <span className="mono">0.70</span> are held out entirely.
> 3. **Outlier flag.** The MAD-3σ filter described above runs per GPU model
>    over the trailing 1 hour and writes
>    <span className="mono">price_snapshots.is_outlier = true</span> on flagged
>    rows. Flagged rows are excluded from
>    <span className="mono">E_t</span> but retained in the audit trail.
> 4. **Eligibility gate.** Provider reliability
>    (<span className="mono">≥ {PUBLISHED_METHODOLOGY.reliabilityFloor}</span>),
>    universe membership
>    (<span className="mono">gpu_model ∈ I.universe</span>) and window
>    membership (<span className="mono">captured_at ∈ [t − {PUBLISHED_METHODOLOGY.windowHours}h, t)</span>)
>    are checked. Failing rows are excluded from
>    <span className="mono">E_t</span> but retained.
> 5. **Quorum check.** If
>    <span className="mono">|E_t| &lt; {PUBLISHED_METHODOLOGY.minObservations}</span>,
>    the index is suppressed for day <span className="mono">t</span> and an
>    <span className="mono">index_value_skipped</span> event is recorded. No
>    fallback, no carry-forward, no alternate formula.
> 6. **Aggregation.** The filtered VWAP formula above is evaluated on
>    <span className="mono">E_t</span>. The result is written to
>    <span className="mono">index_values_daily</span> with the current
>    <span className="mono">methodology_version</span> stamp.
>
> **Roadmap: transaction-anchored inputs.** Migration 011 defines
> `invoice_observations` — an anonymised store of real-paid effective prices by
> `(provider, gpu_model, spend band, contract type)`. When that table is
> populated, a periodic *reconciliation report* comparing the CTI list-price
> series against median observed effective prices from invoices will be
> published as a research artifact under `docs/research/`. That report will
> not change any published index value; it will document how closely the
> published-quote benchmark tracks realised prices. A future methodology
> version could admit invoice observations as a higher-priority input class;
> that would require a separate proposal, a 30-day public notice and a full
> backtest.

### What is NOT changing

- `packages/shared/src/methodology.ts` — no change. `PUBLISHED_METHODOLOGY`
  keeps every field at its current value; no new fields are added. The lock
  test at `apps/workers/src/functions/methodology.test.ts` continues to pass
  unmodified.
- `apps/workers/src/functions/index-calculator.ts` — no change.
- `apps/workers/src/functions/outlier-detector.ts` — no change.
- `packages/db/migrations/*` — no change; no new migration.
- The formula block, outlier-filter description, eligibility-floor description,
  quorum description, Index Committee procedure, AI-orchestration grid, and
  version-history table on `/methodology` — all unchanged.
- `PUBLISHED_METHODOLOGY_VERSION` — remains `v1.0`. No `methodology_versions`
  row is added. The `methodology_changes` table gets one new row of type
  `disclosure` (see §Migration / rollout plan below) recording the merged PR.

### Diff surface

Concretely the PR is one edit to one file:

- `apps/web/app/methodology/page.tsx` — insert the two new `<h3>` blocks
  between the existing `Quorum` `<h3>` (currently lines 126–133) and the
  closing `</section>` for the Formula section (currently line 134). No JSX
  imports change. No new client components. No new data fetches. Ships as
  server-rendered static content with the same `revalidate = 300` cadence as
  the rest of the page. Estimated diff: **+ ~60 lines, − 0 lines, one file
  touched**.

## Why this is the right shape (vs. alternatives)

Three alternative shapes were considered.

**Alternative A — Bump `PUBLISHED_METHODOLOGY` to v1.0.1 with a new
`dataInputHierarchy` field.** Puts the hierarchy under the lock test, which
is elegant. Rejected because it (a) requires modifying the lock test to
recognise the new field, which sits close to the "don't modify the lock test
to make it pass" line even though the intent is legitimate extension, and (b)
implies to downstream licensees that something computed has changed. The
constant should stay a mathematical contract; disclosure lives on the page.

**Alternative B — Write the classification into `docs/methodology-notes.md`
outside `/methodology`.** Zero risk to the hard-limit page. Rejected because
the whole point of the exercise is BMR Art 11(3)(d) compliance, which
requires the hierarchy to be **published** — not merely findable in a repo.
`/methodology` is the citable surface. Half a disclosure that lives off-page
is worse than no disclosure at all: an auditor now has two documents to
reconcile.

**Alternative C — Wait until `invoice_observations` ingest is live, then ship
Tracks A + B together.** Rejected because the P7 exposure exists today. Every
week the site runs without the classification is a week where an external
reviewer's first pass finds an unstated weakness. Track A closes the
disclosure gap now at zero risk; Track B when the data exists.

The chosen shape — page-only edit, no formula change, no constant change, one
narrow disclosure that describes existing behaviour precisely — is the smallest
reversible move that closes the two highest-priority quality-pillar gaps at
once. It follows the LBMA / Baltic pattern (§3a / §3c of the companion note)
of **owning the limitation** rather than obscuring it, and it preserves every
future degree of freedom: adding invoice observations, tightening quorum, or
formally bumping to v1.0.1 all remain available as separate proposals.

## Empirical impact

**On any published index value: zero.** No arithmetic changes. To confirm this
in the reviewer's terms:

- **Backtest.** The current `index-calculator.ts` continues to run
  `filtered_vwap` on `E_t` with the same
  `{ windowHours: 24, minObservations: 5, reliabilityFloor: 0.5,
  outlierFilter: 'mad_3_sigma', weight: 'num_gpus' }` parameters. Every row
  ever written to `index_values_daily` — and every row that would be written
  under this proposal — is byte-identical. The trivial 90-day backtest is
  therefore: `diff(index_values_daily @ t=merge-30d ... merge, run_before,
  run_after) → ∅`. We can and should include this null-result as an
  attachment in the PR, computed by re-running the calculator over the
  live snapshot store with the current code — the value of publishing it is
  that it forces the reviewer to notice that the change surface really is
  empty.
- **Sensitivity analysis.** Not applicable — no parameter changes.
- **Outlier false-positive / false-negative rate.** Not applicable — the
  outlier filter is unchanged.
- **Coverage impact.** Zero provider-days added or removed from `E_t`.

**On external perception and audit-readiness: material.** Two
principle-level gaps close. The signal to a licensee, an auditor or an ESMA
reviewer is that the administrator has read Principles 7 and 8, has
classified its inputs precisely, and has published the hierarchy in the
place a benchmark statement would live. That is the specific artifact MSCI's
IOSCO statement of compliance leads with; it should be ours too.

**On operational health: negligible.** One additional static page section
adds no runtime cost. No new API calls, no new DB reads, no new dependency,
no new environment variable. Vercel bundle-size impact rounds to zero.

## Risks

**Immediate — none material.**

- No test can fail from this change: no code path changes, no schema
  changes, no runtime dependency added. `pnpm -r typecheck` and `pnpm test`
  must pass before merge; the methodology lock test in particular continues
  to guard `PUBLISHED_METHODOLOGY` unmodified.

**Second-order — three, all manageable, none blocking.**

1. **Overclaiming risk.** If the prose overstates certainty ("CTI is
   IOSCO-compliant"), we generate the exposure we were trying to avoid. The
   proposed wording avoids the word "compliant" entirely — we self-classify
   ("published-quote benchmark"), we cite BMR Art 11(1)(c) as the category
   we sit under, and we explicitly say "we do not claim CTI is built from
   transaction data." Reviewer should read the wording adversarially before
   approval.
2. **Underclaiming risk / negative-signal misread.** A visitor lands on the
   page, sees "we do not claim CTI is built from transaction data" and
   concludes we are less rigorous than they thought. Mitigated by the
   framing — the classification is *stronger* than the pre-disclosure state
   (executable, firm, judgment-free, no consolidated tape available for
   anyone), and the "roadmap" paragraph shows a credible path to transaction
   anchoring via `invoice_observations`. Silence is a worse position than
   this admission because the exposure is knowable from first principles by
   any reviewer who cares enough to look.
3. **Locking us in.** By publishing the hierarchy, we constrain future
   ingestion changes to update the page or face an inconsistency. This is
   the *point* of the disclosure — the discipline of "if you change what
   enters the number, you change the disclosure" is exactly what BMR Art
   11(3)(d) requires. The `methodology_changes` audit trail already captures
   this workflow.

**Excluded risk — regulatory reclassification.** This proposal does not
register CTI as a BMR benchmark, does not seek ESMA authorisation, and does
not make any claim that would trigger regulatory perimeter. It is a
transparency disclosure on a public methodology page, consistent with how
unregulated but IOSCO-aligned administrators (Baltic Exchange, PRAs) publish
their input hierarchies. Row P19 in the gap matrix (regulatory cooperation)
remains `n/a until regulated`.

## Migration / rollout plan

1. **PR opened** on branch
   `index-architect/2026-09-24-published-quote-benchmark-hierarchy` with
   title prefix `index-architect:`. Body includes: link to this proposal,
   link to the companion note, IOSCO Principles 7 + 8 references, BMR Art 11
   reference, explicit `@CarlosGalindo2807` ask.
2. **PR contents.** Two commits, in order: (a) this proposal file,
   unchanged; (b) the `apps/web/app/methodology/page.tsx` edit implementing
   the disclosure verbatim as written in §Proposed change. The two-commit
   split is intentional — the proposal-first commit is the audit-trail
   anchor a Committee member reviews *before* looking at the page diff, and
   it stands alone if the page change is deferred.
3. **Local validation before push.** `pnpm -r typecheck` (must be clean;
   this is JSX-only, no type surface added). `pnpm test` (must be green;
   in particular the methodology lock test must pass unmodified). Screenshot
   the rendered page in local dev and attach to PR for the reviewer's convenience.
4. **Public-notice window.** On merge, the 30-day clock starts. `/methodology`
   displays the two new sections immediately (they describe existing
   behaviour, so there is no misleading period), but the merge PR body
   states that the *disclosure* is treated as if it were a methodology
   change under Steps 1–4 of the Index Committee procedure. This is the
   precedent-setting call — see the effective-date rationale in the header.
5. **`methodology_changes` row.** On the effective date (merge + 30d),
   insert one row with `change_type = 'disclosure'`,
   `description = 'Added input classification and data-input hierarchy
   subsections to /methodology per proposals/2026-09-24-published-quote-
   benchmark-hierarchy.md; no change to any published index value.'`,
   `effective_at = <effective date>`, `approved_by = 'Carlos Galindo
   Dumitrescu'`, `document_url` = link to the merged proposal file on the
   default branch. This is a manual SQL UPDATE, not a migration.
6. **Monitor after merge.** `system_events` for the day of merge — none
   of the following should appear: `outlier_flag_spike`, `quorum_miss`,
   `dead_letter` at an elevated rate, or any event categorised
   `methodology_*`. If they do, they are unrelated to this change (which
   touches no code path any of those events fire from) and should be
   investigated on their own merits.
7. **Rollback.** Trivial — revert the `page.tsx` edit. No data migration,
   no state to undo, no downstream licensee to notify (the disclosure
   describes existing behaviour, so reverting only removes text; it does
   not un-do anything about how the number is computed).

## Committee deliberation prompt

> *"We are publishing on `/methodology` a plain-English classification of
> CTI's inputs as firm, executable, published quotes (EU BMR Art 11(1)(c)
> committed-quote category), together with the deterministic hierarchy by
> which those quotes enter the published number. No formula changes; no
> published value changes; no field of `PUBLISHED_METHODOLOGY` changes;
> the lock test continues to guard the constant unmodified. In exchange
> we surface the current input class explicitly, which closes the P7 and
> P8 disclosure gaps on the IOSCO principle matrix in a single edit and
> forecloses the most-likely first-pass objection from any external
> reviewer (auditor, licensee, regulator's counsel). We accept the
> constraint that any future change to the ingestion pipeline must also
> update this disclosure. Voted: \<yes/no>, Carlos Galindo Dumitrescu,
> on \<effective date>."*

## Closing

After merge (and on the effective date):

- Change `docs/research/gaps/iosco-principles.md` row **P7** status from
  `partial / structurally weak` to `partial` (Track A closed; Tracks B and
  C remain P1); note the merged PR in the row's Evidence cell. Change row
  **P8** from `partial` to `compliant` and cite the merged PR. Update the
  rolling priority queue: remove item 4 from P0; renumber; the new P0 head
  becomes what was P0 item 1 (P3/P5 COI + single-administrator disclosure).
  Add a `2026-09-24` (or effective-date) entry to the revision log.
- Add a `docs/decisions.md` entry titled *"Published-quote benchmark
  self-classification (v1.0)"* recording: what was locked, why, and the
  merged PR link. Frame it as an audit-trail entry, not a policy statement.
- Link the merged PR in this proposal's footer below.

---

*Merged PR: (fill in after merge)*
*Effective date: (fill in after merge)*
