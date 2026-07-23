# Proposal: publish CTI's data-input classification and hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-07-23 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs — but touches a **hard-limit** surface (`/methodology`), so requires proposal + `@CarlosGalindo2807` review per the charter |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (add one new `<section>` between Formula and Index Committee). **No change** to `packages/shared/src/methodology.ts`, no change to `PUBLISHED_METHODOLOGY`, no change to `methodology.test.ts`. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member) |
| **Effective date if approved** | Merge date. This is a **disclosure clarification**, not a change to the published number — see §Migration below for why the 30-day notice period is discussed but not automatically triggered; the Committee decides. |
| **References** | IOSCO FR07/13, Principle 7 (Data Sufficiency) and Principle 8 (Hierarchy of Data Inputs); IOSCO FR03/18 (IOSCOPD549), Guidance on the Principles for Financial Benchmarks (2018); Regulation (EU) 2016/1011, Article 11(1)(a)–(c) and Article 11(3)(d); companion note `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`; gap-matrix rows P7 + P8. |

---

## Problem

`docs/research/gaps/iosco-principles.md` currently flags both **P7 (Data
Sufficiency)** and **P8 (Hierarchy of Data Inputs)** at status `partial` and
priority **P0**, with the queue's #4 P0 item being "proposal for the
`/methodology` published-quote-benchmark self-classification + data-input
hierarchy subsection (P7 + P8 in one edit)". The 2026-05-12 companion note
worked through the exposure and mapped a three-track response; the note's own
recommendation was that the next single deliverable should be *this proposal*.

**The gap in one sentence.** `/methodology` publishes the formula, the outlier
filter, the eligibility floor, the quorum and the change-control procedure — but
does not publish (a) *what class of data* CTI's inputs belong to (transactions?
committed quotes? indicative submissions?), or (b) *the hierarchy* by which
those inputs enter the published number. That silence is exactly what BMR
Article 11(3)(d) requires an administrator to break: "*The administrator shall
draw up and publish clear guidelines regarding the types of input data, the
priority of use of the different types of input data and the exercise of expert
judgement, to ensure compliance with these requirements and the methodology.*"
And IOSCO Principle 8's 2018 guidance says explicitly that an administrator
relying "*exclusively on executable quotes as contemplated by Principle 7 would
not need to explain in each determination why it has been constructed with
executable bids or offers, provided there is disclosure in the Methodology.*"
CTI *does* rely exclusively on executable quotes today; it just hasn't
disclosed it.

The right fix is one page edit that (i) names CTI a *published-quote
benchmark*, (ii) cites the primary regulatory carve-out that authorises the
model, (iii) publishes the operational hierarchy that is already in the code,
and (iv) makes the "zero expert judgment in the published-number path" claim
explicit and verifiable.

## Proposed change

**Edit `apps/web/app/methodology/page.tsx`.** Add one new `<section>` between
the existing *Formula* section and the existing *Index Committee* section. No
other file changes.

The new section renders the following prose. Component style matches the page
convention (`h2.display`, prose in `text-ink-secondary`, tables use the same
`bg-bg-surface` / `border-bg-border` treatment as the Version-history table
already on the page).

> ### Data inputs and hierarchy
>
> CTI is a **published-quote benchmark**. Its inputs are firm, executable list
> prices scraped directly from provider endpoints — the actual $/GPU-hour a
> buyer pays to rent a machine on-demand — captured hourly into
> `price_snapshots`. Inputs are not panellist submissions and not model
> estimates.
>
> On-demand GPU compute has no public consolidated transaction tape: buyers
> transact through each provider's platform and completed trades are not
> publicly reported. **EU Benchmarks Regulation Article 11(1)(c)** provides for
> exactly this case: "*the input data shall be transaction data, if available
> and appropriate. If transaction data is not sufficient or is not appropriate
> to represent accurately and reliably the market or economic reality that the
> benchmark is intended to measure, input data which is not transaction data
> may be used, including estimated prices, quotes and committed quotes, or
> other values.*" **IOSCO Principle 8's 2018 Guidance** similarly permits an
> administrator to rely exclusively on executable quotes without
> per-determination justification, *provided the reliance is disclosed in the
> methodology*. This section is that disclosure.
>
> Provider list prices are firm executable quotes in substance — they are
> neither indicative nor negotiated; a buyer can transact at the quoted price
> by clicking "rent". That places CTI structurally closer to LBMA-fixing- or
> Baltic-index-style quote benchmarks than to submission-based rate benchmarks.
>
> **Hierarchy of inputs, in order of application:**
>
> | # | Stage | Deterministic rule |
> |---|---|---|
> | 1 | Rule match | Regex + canonical alias table normalises GPU strings inline in the scraper. Highest confidence. |
> | 2 | Alias reverse-lookup | Match against `normalization_rules` populated by prior stage-4 approvals. |
> | 3 | Fuzzy match | Levenshtein ≤ 2 against canonical `gpu_models.name`. |
> | 4 | LLM ≥ 0.95 | Claude self-normalizer auto-writes a new `normalization_rule` when its structured-output confidence is ≥ 0.95. Feeds back to stage 2 on the next batch. |
> | 5 | LLM 0.70–0.95 | Queued for one-click human approval at `/admin/unmatched`. **Not eligible** for the index until approved. |
> | 6 | Outlier check | Snapshot is excluded from the eligible set `E_t` if `\|p_i − median(P_g)\| > 3·MAD(P_g)` across the same GPU model in the trailing hour. |
> | 7 | Eligibility floor | Snapshot excluded if the source provider's `reliability_score < 0.5`. |
> | 8 | Quorum | The index for GPU model `g` is not published on day `t` if `\|E_t\| < 5`; a `index_value_skipped` event is written instead. |
> | 9 | Weighted mean | The published value is `Σ (p_i · num_gpus_i) / Σ num_gpus_i` over `E_t`. |
>
> **Expert judgment: none.** The published number is a pure function of the
> inputs through stages 1–9. No human weighs individual snapshots. No model
> overrides. Where a human is involved (stage 5), the decision is binary — *is
> this observation part of the eligible set at all* — not *how it is weighted*.
> This is stricter than IOSCO Principle 8's baseline, which permits disclosed
> expert judgment; CTI publishes the negative claim instead. `contributing_provider_ids`
> on every `index_values_daily` row makes the composition of `E_t` reproducible
> per day.
>
> **Transaction anchor — in progress.** Migration 011 introduced
> `invoice_observations` for anonymised effective prices actually paid by
> counterparties. When that ingest pipeline lands, CTI will publish a periodic
> reconciliation between its quote-based published value and observed effective
> prices, in the manner MSCI/IPD real-estate indices reconcile against private
> transaction data. A future methodology `v1.x` may admit invoice observations
> as an input class above listings; that would follow the normal 30-day-notice
> Index Committee procedure.

**Placement.** Between the H2 *Formula* section (which ends at *Quorum*) and
the H2 *Index Committee* section. Natural narrative: math → data provenance →
governance.

**Placement rationale.** The existing *Outlier filter*, *Eligibility floor*,
and *Quorum* live as H3 subsections of *Formula* — they belong there because
they define what enters the formula. The new *Data inputs and hierarchy*
section is a separate H2 because it describes the *class of data being
processed*, not the algebra applied to it. Reading top-to-bottom will now go:
what the number is → what the data underneath the number is → who decides
either can change.

## Why this is the right shape (vs. alternatives)

Three alternatives were considered.

**Alt A — Do nothing; wait for `invoice_observations` to land, then claim
qualified P7 compliance.** Rejected. This is the longest-latency response and
leaves both P7 and P8 flagged `partial` in the gap matrix through the entire
window in which the index needs to be shown to auditors, licensees, and
counterparties. The 2026-05-12 note documents that a strict reader can press
on P7 today; not publishing the classification is the same as claiming the
listing-based design is transaction-anchored, which it is not.

**Alt B — Change the methodology to run a fixing auction (LBMA-style).**
Rejected as out-of-scope. LBMA generates the trade rather than assessing it,
which fully satisfies P7, but requires a central venue and settlement
infrastructure that does not exist for on-demand compute. Kept on record as a
long-horizon direction under the *Distribution / Settlement* branch of the
roadmap.

**Alt C — Add the classification AND immediately admit `invoice_observations`
as an input class in the same edit.** Rejected as scope creep. Adding a new
input class is a `v1.x` methodology bump: it changes the published number's
inputs, requires backtest, sensitivity analysis, 30-day public notice, and a
new `methodology_versions` row. Bundling it here would (a) delay closing the
P0 disclosure gap by weeks, and (b) violate the charter's "bias to small
reversible PRs". The *reconciliation report* is the intermediate artifact —
readable, no formula change — and belongs in a separate infra proposal once
the ingest pipeline exists.

**Chosen shape (this proposal).** Disclose what is true today about inputs;
signal the transaction-anchor direction as future work; keep the published
number, the constant, and the lock test untouched. This is the smallest
reversible edit that closes P7 + P8 at the disclosure level.

## Empirical impact

This is a docs edit to a hard-limit surface. There is no numerical or
algorithmic change.

- `PUBLISHED_METHODOLOGY` constant: **unchanged.**
- `methodology.test.ts` lock test: **passes unchanged.** The test asserts each
  field of `PUBLISHED_METHODOLOGY`; none is touched.
- `index_values_daily` back-computation: **byte-identical** to a run without
  this proposal.
- 90-day backtest: not applicable — no formula change to backtest. The
  published series under the proposal is the same as the published series
  today, by construction.
- `pnpm -r typecheck`: should be a no-op — new prose only, no new imports,
  same JSX shape as the existing sections.
- `pnpm test`: unchanged (no test paths touch page prose).

The empirical signal that says "this works" is: `/methodology` renders the new
section; the version-history table below it lists the same v1.0 row it lists
today; no `methodology_changes` row is required *unless the Committee chooses
to record this disclosure as a `disclosure_clarification` change type* (see
§Migration).

## Risks

**R1 — A reviewer treats the self-classification as an admission of
non-compliance.** A hostile counterparty could quote "*CTI is a
published-quote benchmark; inputs are not transaction data*" and infer P7
non-compliance. Mitigation is the direct citation to BMR Art 11(1)(c) and
IOSCO Principle 8's 2018 Guidance in the same paragraph — both authorise the
model when the disclosure is made. Silence is worse than disclosure here;
LBMA, Baltic Exchange, oil PRAs and NCREIF all operate on essentially the same
carve-out and cite it explicitly.

**R2 — The "no expert judgment" claim needs to survive the stage-5 admin
queue.** Stage 5 (Claude confidence 0.70–0.95 queued for admin approval)
involves human review. The claim in the new section is that human review at
stage 5 is *inclusion/exclusion of an observation from the eligible set*, not
*weighting*. This is true today (see `apps/web/app/admin/unmatched/page.tsx`
approval flow: an approval writes a `normalization_rules` row, back-fills the
snapshots, they then flow into the standard outlier + eligibility + VWAP
pipeline unweighted). Committee should verify the claim once against the flow
before signing off; if a reviewer wants belt-and-braces, the section can be
strengthened to "*Where a human is involved (stage 5), the decision is binary
— include or exclude — and the resulting weight is identical to any other
observation at stage 9.*"

**R3 — A future `v1.x` that admits `invoice_observations` will need this
section revised.** Expected and normal. The section is written so that adding
an input class above listings is a natural amendment — one new row in the
hierarchy table, one strengthened paragraph in the transaction-anchor block —
not a rewrite. Cost of revision at that time is low.

**R4 — The 30-day-notice question sets a precedent.** If the Committee decides
this counts as a methodology change requiring notice, every future clarifying
docs edit inherits that 30-day tail. If the Committee decides it is a
disclosure clarification bypassing notice, we set a distinction that must be
policed carefully in future proposals so it does not become a loophole. **This
is the single decision worth the Committee's time on this proposal.** §Migration
argues for the clarification interpretation with a compensating audit-trail
row.

## Migration / rollout plan

This is not a change to the published number, the formula, the outlier filter,
the eligibility floor, the quorum, the reliability floor, the window, the
weight, or the constant. It is new prose disclosing what has been true since
v1.0's effective date.

**Recommended treatment:** *disclosure clarification*.

- Merge the PR after `@CarlosGalindo2807` review.
- Add one row to `methodology_changes` with a proposed new `change_type =
  'disclosure_clarification'` (or the existing closest field), `effective_from
  = merge_date`, `rationale = "Publish input classification and hierarchy per
  IOSCO P8 / BMR Art 11(3)(d) disclosure requirement; no change to
  PUBLISHED_METHODOLOGY."`, `approved_by = "Carlos Galindo Dumitrescu"`, PR
  link.
- Do **not** bump `PUBLISHED_METHODOLOGY_VERSION`. It stays at `v1.0`. This
  proposal does not create a new methodology version because the methodology
  is unchanged.
- Update `docs/research/gaps/iosco-principles.md`: rows P7 + P8 move from
  `partial (P0)` to `partial (P1)` (P7's structural weakness remains, but the
  disclosure gap is closed) and the queue's P0 item #4 is checked off with a
  link to this proposal and the merged PR.
- Update `docs/decisions.md` with a new entry documenting the
  clarification-vs-change distinction the Committee ratified.

**Alternative treatment if the Committee disagrees:** *methodology change with
notice*. Then the merge date starts a 30-day counter; the new section is
prefixed with a *"Effective from YYYY-MM-DD"* banner during the notice window;
a `methodology_changes` row is written with `effective_from = merge_date +
30d`; the `/methodology` renderer shows the pending section behind a "Proposed
— effective YYYY-MM-DD" chip. Infrastructure to render pending changes is
`roadmap.md` item B8 (not yet built); if the Committee chooses this path, B8
must ship first or the notice period runs by way of this markdown file plus a
`system_events` event of type `disclosure_proposed`.

Rollback plan: revert the PR. There is nothing else to undo.

## Committee deliberation prompt

> "The `/methodology` page publishes the algebra of the CTI but does not
> disclose what class of data the algebra runs on, or the hierarchy by which
> that data enters the number. IOSCO Principle 8 (2018 Guidance) and EU BMR
> Art 11(1)(c) + Art 11(3)(d) both require this disclosure for a benchmark
> whose inputs are executable quotes rather than transactions.
>
> The proposed edit adds one section publishing (a) the *published-quote
> benchmark* classification with regulatory citation, (b) the nine-stage
> deterministic input hierarchy already in the code, and (c) the explicit
> claim that no expert judgment enters the published number. No numerical
> field of `PUBLISHED_METHODOLOGY` changes. The locked test continues to pass.
> The published series is byte-identical.
>
> The Committee is asked to decide (i) whether the edit ships, and (ii)
> whether the edit is treated as a *disclosure clarification* (merge and
> record in `methodology_changes` without triggering the 30-day notice, since
> the number is unchanged) or as a *methodology change* (30-day notice
> triggered, effective_from = merge + 30 days). The Author recommends the
> *clarification* treatment on the grounds that the number does not move and
> the disclosure closes a compliance gap rather than opening one. Voted:
> <yes / yes-with-notice / no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD."

## Closing

After the PR is merged:

1. Update `docs/research/gaps/iosco-principles.md`: mark P7 disclosure-track
   closed and P8 closed; move both rows to `P1` status; add a revision-log
   entry.
2. Update `docs/decisions.md` with the ratified interpretation of
   *disclosure clarification vs. methodology change* — this precedent matters
   more than the edit itself.
3. Add a `methodology_changes` row per §Migration.
4. Link the merged PR at the bottom of this proposal.
5. Cross-reference this proposal from the 2026-05-12 note (§4, Track A: done).

Sources (as previously cited in the companion note; direct WebFetch of the
IOSCO and EUR-Lex PDFs returned HTTP 403 again this session, so verbatim
Article 11(1)(c) and Principle 8 guidance text is reproduced from IOSCO- and
ESMA-published search excerpts):

- IOSCO FR07/13, *Principles for Financial Benchmarks — Final Report*, July
  2013. https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO FR03/18 (IOSCOPD549), *Guidance on the IOSCO Principles for Financial
  Benchmarks*, January 2018.
  https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- Regulation (EU) 2016/1011, Article 11 (Input data). EUR-Lex CELEX
  32016R1011. https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng ; ESMA
  Interactive Single Rulebook, Art. 11.
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data
- Commission Delegated Regulation (EU) 2018/1642, Article 2 (Nature of the
  input data). FCA Handbook rehost.
  https://www.handbook.fca.org.uk/techstandards/BMR/2018/reg_del_2018_1642_oj/003.html

Internal references:

- `apps/web/app/methodology/page.tsx` — target file.
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY`, unchanged by
  this proposal.
- `apps/workers/src/functions/methodology.test.ts` — lock test, unchanged.
- `packages/db/migrations/009_methodology_v1.sql` — `methodology_versions`,
  `methodology_changes` schema (target for the audit-trail row).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations`,
  the future transaction-anchor input class.
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — full
  analysis behind this proposal; §4 Track A.
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — §B, P7
  original flag.
- `docs/research/gaps/iosco-principles.md` — rows P7, P8; queue item #4.

Merged PR: *(to fill in on merge)*
