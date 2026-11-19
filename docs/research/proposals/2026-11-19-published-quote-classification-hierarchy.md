# Proposal: Self-classify CTI as a "Published-Quote Benchmark" and publish the Data-Input Hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-11-19 |
| **Author** | index-architect (fourth run) |
| **Risk class** | methodology (disclosure-only; `PUBLISHED_METHODOLOGY` constant is **not** changed) / docs |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit) — add two subsections. **No change** to `packages/shared/src/methodology.ts`, `index-calculator.ts`, `outlier-detector.ts`, `methodology.test.ts`, or any `packages/db/migrations/*`. |
| **Required reviewer(s)** | @CarlosGalindo2807 (always for methodology-surface edits; CODEOWNERS gates `/methodology`) |
| **Effective date if approved** | PR merge date. **No 30-day public-notice period is required** — see §Rollout for the reasoning (nothing in `PUBLISHED_METHODOLOGY` changes; published numbers are bit-identical before and after). |
| **References** | IOSCO FR07/13 **Principle 7** (Data Sufficiency) and **Principle 8** (Hierarchy of Data Inputs); EU BMR (Regulation (EU) 2016/1011) **Article 11(1)(a)–(c)** and **Article 11(3)(d)** (input-data types and published guidance on priority of use). Companion research: [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) and [`notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md). Gap-matrix rows this closes: [`gaps/iosco-principles.md`](../gaps/iosco-principles.md) **P7** and **P8**. |

---

## Problem

Two of the three remaining quality-pillar gaps on our IOSCO matrix are about
what the `/methodology` page does **not** say, not what the formula does.

- **P7 (Data Sufficiency).** IOSCO FR07/13 requires a benchmark to be "anchored
  by observable transactions entered into at arm's length." Every current
  `price_snapshots` row is a scraped **listing** — a provider's firm executable
  ask captured directly from an endpoint — not an observed trade. On-demand
  compute has no public consolidated transaction tape. The 2026-05-12 companion
  note established that this is a *defensible* position (BMR Art 11(1)(c)
  explicitly admits "committed quotes" where transaction data is unavailable),
  but the position is only defensible **once it is stated**. Today it is not.
  A reviewer who presses on P7 finds `/methodology` silent on what input class
  our data falls into. That silence looks worse than the honest answer.

- **P8 (Hierarchy of Data Inputs).** BMR Art 11(3)(d) requires administrators
  to "draw up and publish clear guidelines regarding the types of input data,
  the priority of use of the different types of input data and the exercise of
  expert judgement." Our ingestion pipeline **is** a strict deterministic
  hierarchy — rule-match → alias → fuzzy → Claude ≥ 0.95 auto-resolve → 0.70–0.95
  human queue → reliability floor → outlier filter → VWAP, with zero expert
  judgment in the published-number path — but that hierarchy is implicit in
  code, not published in words. Gap-matrix row P8 has sat at `partial` since
  the first run precisely because of this disclosure gap.

Both gaps sit on the same surface (`/methodology`) and can be closed in a
single page edit. The 2026-05-12 note's §5 explicitly recommended this as
"Next session's most valuable single deliverable." Nothing has landed on
`/methodology` between that note and this proposal (the most recent commits
are `gpu_prices_daily` plumbing and the `markets` Δ-column data-sufficiency
gate — none touched the methodology page itself).

## Proposed change

Two new subsections added to `apps/web/app/methodology/page.tsx`, inserted
**between** the existing "Quorum" subsection and the "Index Committee" section
(i.e. after the formula is stated, before the governance procedure). No other
file changes.

### Subsection 1 — "Data classification (published-quote benchmark)"

Add directly after the **Quorum** subsection:

> **Data classification.** CTI is a **published-quote benchmark**. Its inputs
> are firm, executable on-demand list prices captured directly from provider
> endpoints — not observed transactions. On-demand GPU compute has no public
> consolidated transaction tape, so no benchmark of this market can be built
> purely from prints today. The benchmark is anchored in a genuine arm's-length
> cash market: providers in the eligibility universe transact GPU-hours
> continuously at the prices CTI ingests, and those prices are executable on
> click. In the data-input terminology of EU Benchmarks Regulation Article
> 11(1), CTI inputs are **committed quotes**, used in preference to estimated
> prices or expert-judgment adjustments (of which there are none in the
> published-number path).
>
> A latent transactional layer exists in the schema (`invoice_observations`,
> migration 011) to admit anonymised real-paid prices as a future input or
> validation class; its ingest pipeline is a separate workstream. Until it is
> live, CTI publishes no transaction-anchored number and makes no claim to the
> contrary.

### Subsection 2 — "Hierarchy of data inputs"

Add directly after the data-classification subsection:

> **Hierarchy of data inputs.** The published formula consumes `price_snapshots`
> rows that have already passed a deterministic ingestion ladder. Each stage
> accepts or rejects the row by a fixed rule; no stage uses judgement. In
> priority order from most- to least-preferred:
>
> 1. **Exact rule match** — the raw GPU string matches a curated entry in
>    `gpu_normalization_rules`. Highest confidence; used preferentially.
> 2. **Alias match** — the raw string matches a documented alias of a catalog
>    `gpu_models.slug`.
> 3. **Fuzzy / near-match** — trigram similarity above a fixed threshold to a
>    catalog slug.
> 4. **Claude-auto (confidence ≥ 0.95)** — model resolves the string to a slug
>    with confidence at or above 0.95; the resolution is written back as a new
>    `gpu_normalization_rules` row so the next identical string takes stage 1.
> 5. **Claude-queued (confidence 0.70–0.95)** — queued at `/admin/unmatched`
>    for one-click human approval. Nothing enters the published-number path
>    from this tier without an operator click.
> 6. **Reliability floor** — `provider_reliability_score ≥ 0.5`, auto-computed
>    from scrape success rate and outlier ratio with no manual override.
> 7. **Outlier filter** — MAD-3σ per GPU model over a 1-hour window;
>    `is_outlier` is persisted on every snapshot for audit.
> 8. **Quorum** — `|E_t| ≥ 5` eligible observations; otherwise the day is
>    skipped and no value is published.
>
> Stages 1–5 are normalization; stages 6–8 are eligibility. Confidence below
> 0.70 at stage 5 is discarded. There is no "expert judgement" step. There is
> no fallback formula when quorum fails.
>
> **Future input classes.** If and when `invoice_observations` ingest is live
> and committee-approved, anonymised invoice observations would sit *above*
> stages 1–8 as a preferred transactional class (BMR Art 11(1)(c) priority).
> That change is methodology-class, requires a separate proposal, 30-day public
> notice, and a backtest per Committee charter — it is not part of this edit.

Implementation detail: both subsections use existing design primitives
(`display`, `mono`, `text-ink-secondary`, `border-l-2 border-bg-border pl-4`
list items). No new imports. No change to the version banner, the formula
block, the outlier-filter block, the eligibility block, the quorum block, the
Index Committee section, the AI-orchestration grid, or the version-history
table.

## Why this is the right shape (vs. alternatives)

Three alternatives were considered.

**Alternative A — do nothing; wait for `invoice_observations` to be populated.**
Rejected. The point of a self-classification is to disclose **before** a
reviewer asks. Waiting to classify until we have trade data is the LIBOR
mistake — overclaiming until forced to restate. Shipping the classification
*now* and the invoice anchor *later* is strictly better order-wise: today's
inputs fit the "committed quote" class cleanly, and the disclosure gets more
defensible, not less, when the transactional class is added on top.

**Alternative B — admit the gap and promise future compliance, no reclassification.**
Rejected. "We fail P7 today and will fix it" is both weaker than "we classify
precisely under P8 and the classification is BMR-admissible" *and* factually
sloppy — our inputs are not "estimated prices" or "indicative submissions";
they are firm executable quotes. Baltic Exchange (panel-assessed), Platts and
Argus oil MOC assessments (hybrid bid-offer-trade), and ICE's LBMA auction fixes
are all IOSCO-compliant on different legs of Article 11, and the honest
classification is what makes each defensible. Our inputs are structurally
closer to committed quotes than Baltic's panellist submissions.

**Alternative C — change the formula to incorporate `invoice_observations` now.**
Rejected and out of scope. The table is empty. Admitting an input class with
no data populated would be worse than silence. A future proposal (methodology
class, 30-day notice, 90-day backtest) is the only path for that change; it is
explicitly flagged in the new subsection so licensees know it is on the
roadmap but not in the live methodology.

The chosen shape — disclosure-only edit, formula untouched, future path named
— is the smallest change that closes both gaps and introduces zero new numeric
risk. It also means no backtest is required (see §Empirical impact).

## Empirical impact

This proposal **does not change `PUBLISHED_METHODOLOGY`, any eligibility
threshold, any filter parameter, or the index-calculator write path.** Every
row written to `index_values_daily.vwap` after merge would be bit-identical to
the row that would have been written without this proposal. Therefore:

- **Backtest** — not applicable. The computed series is unchanged. Running the
  calculator pre- and post-merge against the same `price_snapshots` set must
  produce byte-for-byte identical `index_values_daily` rows; the lock test
  (`apps/workers/src/functions/methodology.test.ts`) continues to pass
  unmodified and in fact guarantees this property structurally.
- **Sensitivity analysis** — not applicable. No parameter is changing.
- **False-positive / false-negative on outlier filter** — not applicable. The
  filter is not touched.
- **Coverage impact** — zero. Same provider-days enter the index.

The empirical signal that "this ships correctly" is therefore:

1. `pnpm -r typecheck` passes. The edit is to a React component; TSX syntax
   and imports are the only compile-time surface.
2. `pnpm test` passes — the methodology lock test is not disabled, modified, or
   its constant changed.
3. The rendered `/methodology` page shows the two new subsections, in order,
   between "Quorum" and "Index Committee", and the "Currently in force" banner
   still reads `v1.0 · filtered_vwap · 24h window`.
4. `git diff --stat` lists only `apps/web/app/methodology/page.tsx` (plus this
   proposal file). No other file is touched.
5. The next scheduled index-calculator run writes a row with
   `methodology_version = 'v1.0'` (unchanged) and `vwap` equal to the value
   that would have been computed from the same snapshot set under v1.0 — a
   property the lock test already guarantees by shape.

## Risks

**Immediate risks.**

- *Over-claim in disclosure text.* The subsections state that inputs are
  "committed quotes" in BMR terminology. This is a legal-ish characterisation;
  if challenged, the evidence is that our scraped listings are executable on
  click at the quoted price and are captured mechanically. Mitigation: the
  language is bounded ("in the data-input terminology of EU BMR Article
  11(1)") and makes no claim of BMR registration or ESMA supervision — rows
  P12 (change control, compliant in design) and P19 (regulatory cooperation,
  n/a until regulated) remain unchanged.
- *Future-input class ambiguity.* The hierarchy subsection notes that invoice
  observations *would* sit above stages 1–8. A licensee could misread this as
  implemented. Mitigation: the paragraph explicitly says "methodology-class,
  requires a separate proposal, 30-day public notice, and a backtest — not
  part of this edit."

**Second-order risks.**

- *Narrows the defensibility of a future `v1.x` that admits non-executable
  inputs.* Having publicly classified CTI as a published-quote benchmark, a
  v1.x that admitted estimated or modelled prices without reclassifying would
  be a bigger change than if we had never classified at all. Mitigation: this
  is the intended property. The point of publishing the classification is
  that departures from it are deliberate, documented, and noticed.
- *Reduces flexibility to use "expert judgement" during data outages.* The
  hierarchy subsection says plainly "no expert judgement." That matches
  current code (quorum-fail skips the day, no fallback formula) and the
  Committee charter. If a future operator wanted to carry-forward a value
  during a prolonged scraper outage, the disclosure now forecloses it without
  a proposal. Mitigation: this is also intended. The "never extrapolate,
  never carry forward, never fall back" property is what makes v1.0
  licensable; codifying it in the hierarchy section hardens the lock.

**Reversibility.** Trivial. If the Committee decides the disclosure is
mischaracterised, a follow-up PR can edit or remove the two subsections. No
data, no indexed value, no migration is touched.

## Migration / rollout plan

This is a **methodology-surface edit, not a methodology-value change.** The
Committee charter (Step 3 on `/methodology`) requires 30-day public notice
"before taking effect" of a *new version* of the methodology — that is,
before `PUBLISHED_METHODOLOGY` or `PUBLISHED_METHODOLOGY_VERSION` move. Since
neither moves here, and no `index_values_daily` row would differ before vs.
after, **no 30-day notice is required by the letter of the charter**. The
disclosure takes effect on PR merge.

However — and this is a legitimate Committee question — one could argue that
*any* change to the public `/methodology` surface deserves the same
public-notice discipline, to prevent future drift via disclosure-only edits.
The Committee should decide explicitly which rule applies. A reasonable
middle ground: merge immediately but publish a "Change notice" entry on
`/methodology` (per gap row B8, which also needs its own surface) so the
addition is announced rather than silently appearing.

**No new row in `methodology_versions`.** The version stays at `v1.0`, the
`formula_id` stays at `filtered_vwap`, every parameter stays identical.
Historical values are not recomputed. The lock test is not touched. The
`methodology_changes` table gets no row either — this is a published-contract
disclosure refinement, not a methodology change under the `methodology_changes`
schema.

**What to monitor after merge.**

1. `system_events` for any unexpected `methodology_changed` row — there should
   be none; if one appears, the C15 webhook (once wired) should page.
2. The lock test `apps/workers/src/functions/methodology.test.ts` passes
   unchanged in the next CI run.
3. The `/methodology` page renders both subsections in Safari + Chrome +
   Firefox at desktop and ≤ 420px widths (the page uses the same primitives
   as the existing subsections, so this should be a formality).
4. The `/methodology` page response-time at `fra1` is unchanged (±10 ms).

**Rollback.** `git revert <merge SHA>` restores the previous page. No data
backfill is needed because no data has been written differently.

## Committee deliberation prompt (methodology)

> We are publishing a precise self-classification of CTI's input data as
> **committed quotes under EU BMR Article 11(1)(c)**, and the deterministic
> ingestion hierarchy that produces those quotes — on `/methodology`, without
> changing a single parameter of `PUBLISHED_METHODOLOGY`. The trade-off is
> that we lock ourselves into this classification publicly: any future
> methodology version that admits a different input class (invoice data,
> modelled prices, time-decayed quotes) must explicitly reclassify, with 30
> days' public notice. We judge that the loss of silent flexibility is
> outweighed by closing IOSCO gap-matrix rows P7 and P8 with a stated,
> defensible design position before any external licensee or audit
> conversation surfaces the question. Voted: &lt;yes / no&gt;, Carlos Galindo
> Dumitrescu, on 2026-11-&lt;DD&gt;.

## Closing

After this proposal is approved (PR merged):

1. Update `docs/research/gaps/iosco-principles.md`:
   - Row **P7** — change status to `partial` (same), but strike the P0 action;
     move the "Track A (self-classification) is P0" item in the priority queue
     to resolved, link the merged PR. Track B (invoice anchor) remains open at
     P1; Track C (scaled quorum) remains open at P1.
   - Row **P8** — change status from `partial` to `compliant`; evidence cell
     cites the merged PR and the new `/methodology` hierarchy subsection.
   - Rolling priority queue: remove P7+P8 from the P0 block. The P0 block then
     narrows to P1 (name committee member), P3+P5 (COI + single-administrator
     disclosure), P16 (complaints procedure).
   - Add a revision-log entry dated 2026-11-19 describing the change.
2. Update `docs/decisions.md` with a new locked-in entry: *"CTI v1.0 is
   published as a published-quote benchmark under BMR Art 11(1)(c); the data
   hierarchy is explicit, closed-set, judgment-free. Changing the input class
   is a methodology-level change requiring 30-day public notice."* Cite this
   proposal file and the merged PR.
3. Update `docs/roadmap.md`: nothing moves (this isn't a roadmap item), but
   note the P7/P8 closure in the next session's starting summary.
4. Linked merged PR URL (to be filled on merge):

---

*Template: `docs/research/proposals/_TEMPLATE.md`. Companion research:
[`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) §§ 4–5.
Gap matrix: [`gaps/iosco-principles.md`](../gaps/iosco-principles.md) rows P7, P8.*
