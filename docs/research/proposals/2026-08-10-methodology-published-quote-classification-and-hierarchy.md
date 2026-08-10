# Proposal: publish CTI's data-input hierarchy and self-classify as a "published-quote benchmark" on `/methodology`

| | |
|---|---|
| **Date** | 2026-08-10 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (published-page edit; no change to `PUBLISHED_METHODOLOGY` or any computed value) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` — one new `<section>` between the existing "Formula" and "Index Committee" sections |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member; CODEOWNER for `apps/web/app/methodology/**` under the hard-limit convention documented in `.claude/agents/index-architect.md`) |
| **Effective date if approved** | On merge. See §"Migration / rollout plan" for the argument that the 30-day public-notice period does **not** apply to disclosure-only edits that leave `PUBLISHED_METHODOLOGY` and every published value unchanged. |
| **References** | IOSCO *Principles for Financial Benchmarks*, FR07/13 (July 2013), Principle 7 (Data Sufficiency) and Principle 8 (Hierarchy of Data Inputs) · IOSCO *Guidance on the IOSCO Principles*, IOSCOPD549 (January 2018) · Regulation (EU) 2016/1011 (EU Benchmarks Regulation), Article 11(1)(a), 11(1)(c), 11(3)(d) · Precedent: Baltic Exchange freight indices (assessment-panel model), ICE/LBMA Gold/Silver auctions (transaction-generating model), Platts/Argus oil PRAs (MoC hybrid), MSCI/IPD Property indices (appraisal model) · Companion research: [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) and [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) rows P7 and P8. |

## Problem

`docs/research/gaps/iosco-principles.md` currently lists two P0 items against `/methodology`:

- **Row P7 (Data sufficiency)** — status `partial / structurally weak`. CTI's inputs
  are firm executable listings, not observed trades. On-demand compute has no
  public consolidated tape. Under IOSCO Principle 7 and EU BMR Art 11(1)(c), a
  benchmark that runs on quotes rather than transactions must (i) demonstrate the
  underlying market is genuinely arms-length and transactional in substance,
  (ii) prefer transaction data where available, and (iii) *publish the data
  hierarchy and the reason non-transaction data is used*. CTI does (i) and (ii)
  in substance but does not do (iii) in text. That silence is the actual gap.

- **Row P8 (Hierarchy of data inputs)** — status `partial`. The hierarchy
  exists deterministically in code (`rule → alias → fuzzy → Claude ≥ 0.95 auto →
  Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP`) but
  is nowhere published on `/methodology`. IOSCO Principle 8 and BMR Art 11(3)(d)
  require the hierarchy to be published, in plain language, so that a reader can
  reconstruct which input class a given determination rests on.

Both gaps close in a single page edit. The [2026-05-12 companion note](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
did the source-anchored analysis and explicitly named this proposal as the next
session's most valuable single deliverable. Not writing it is the current
blocker to any "we are IOSCO-aligned" claim in a licensee or auditor
conversation — those readers will press on P7 first, and today the honest answer
is "we haven't stated our position in writing."

## Proposed change

Add one new section — **"Data-input hierarchy and benchmark classification"** —
to `apps/web/app/methodology/page.tsx`, positioned **between** the existing
"Formula" section (which ends after the "Quorum" subsection at approximately
line 134) and the existing "Index Committee" section (which begins at
approximately line 136). Nothing else on the page changes. No text in existing
sections is edited. No new `useState`, no new data fetch, no new dependencies —
the section is static prose plus a plain ordered list, matching the existing
page style (`display`, `text-ink-secondary`, `mono`, `rounded border …
bg-bg-surface` conventions).

### Exact copy to add

The insert is the following JSX block. Copy verbatim into
`apps/web/app/methodology/page.tsx` between line 134 (`</section>` of Formula)
and line 136 (`{/* ─── Index Committee ─── */}`). No other file changes.

```tsx
{/* ─── Data-input hierarchy and benchmark classification ─── */}
<section className="mt-16">
  <h2 className="display text-2xl">Data-input hierarchy and benchmark classification</h2>

  <p className="mt-3 text-ink-secondary">
    CTI is a <span className="italic">published-quote benchmark</span>. Every
    input is a firm, executable on-demand list price captured mechanically from
    a provider's own price endpoint — not an indicative submission, not an
    expert assessment, and not a survey. On-demand GPU compute is a genuinely
    arms-length transactional market, but there is no public consolidated tape
    of executed rentals. We therefore construct the benchmark from the highest
    class of input the market actually publishes: firm listings that are
    executable on click at the quoted price.
  </p>

  <p className="mt-3 text-ink-secondary">
    This classification is deliberate. We do not claim CTI is a transaction
    benchmark; we do not use expert judgment in the published-number path; we
    do not use extrapolation or model estimation to fill gaps. When
    transactional data (real invoiced GPU-hour prices) becomes available
    through the observation program, it will move above listings in the
    hierarchy below and the change will follow the Index Committee procedure
    with public notice, as documented in the following section.
  </p>

  <h3 className="display mt-10 text-xl">Hierarchy of data inputs</h3>
  <p className="mt-3 text-ink-secondary">
    The ordered list below is the deterministic hierarchy used to construct
    each daily <span className="mono">Index_I,t</span>. Higher tiers take
    strict precedence: a lower tier is used only when the tiers above it are
    empty for a given (provider, GPU model, hour). No manual override exists.
  </p>

  <ol className="mt-6 space-y-4 text-ink-secondary">
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Tier 1 · Observed transactions</span>
      <div className="mt-1">
        Real invoiced GPU-hour prices contributed under the observation
        program. Written to <span className="mono">invoice_observations</span>{' '}
        (schema present since migration 011). <span className="italic">Not yet
        populated as of the current effective date; reserved as the top tier
        for the next methodology version that admits it.</span>
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Tier 2 · Firm executable list prices</span>
      <div className="mt-1">
        Prices scraped directly from a provider's price endpoint that are
        executable on click at the quoted rate, for a specific GPU
        configuration and quantity. This is the sole input class of CTI v1.0.
        Every row in <span className="mono">price_snapshots</span> is a Tier-2
        input. Under EU BMR Art 11(1)(c) these correspond to{' '}
        <span className="italic">committed quotes</span> rather than indicative
        or estimated quotes.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Tier 3 · Indicative quotes</span>
      <div className="mt-1">
        Quoted prices that are not immediately executable (marketing-page
        rate cards without an active checkout path, reserved-only prices
        without an on-demand equivalent). <span className="italic">Not used
        in CTI v1.0.</span> Excluded at the scraper layer.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Tier 4 · Model prices / expert judgment</span>
      <div className="mt-1">
        Extrapolated, interpolated, or estimated prices;
        proxy-model outputs; human assessments.{' '}
        <span className="italic">Prohibited by design.</span> If a given
        (index, day) has fewer than <span className="mono">{`{PUBLISHED_METHODOLOGY.minObservations}`}</span>{' '}
        eligible Tier-2 inputs, no value is published. We never fall back to a
        lower tier and never emit a value from Tier 4.
      </div>
    </li>
  </ol>

  <h3 className="display mt-10 text-xl">Determination pipeline</h3>
  <p className="mt-3 text-ink-secondary">
    Within Tier 2, each raw <span className="mono">price_snapshots</span> row
    is processed by a fixed deterministic pipeline before it can enter{' '}
    <span className="mono">E_t</span>. The order is invariant and encoded in
    code, not configuration:
  </p>
  <ol className="mt-4 list-decimal space-y-1 pl-6 text-ink-secondary">
    <li>Schema validation (Zod parser; malformed rows are dropped, not coerced).</li>
    <li>GPU-model normalization: exact rule → alias → fuzzy match → Claude auto (confidence ≥ 0.95) → Claude human queue (0.70 – 0.95) → unresolved.</li>
    <li>Outlier flag (MAD-3σ per GPU model, 1-hour window; see previous section).</li>
    <li>Eligibility filter (provider <span className="mono">reliability_score ≥ {`{PUBLISHED_METHODOLOGY.reliabilityFloor}`}</span>; universe membership; window membership).</li>
    <li>Aggregation (num_gpus-weighted VWAP over the surviving set).</li>
    <li>Quorum check (<span className="mono">|E_t| ≥ {`{PUBLISHED_METHODOLOGY.minObservations}`}</span>; otherwise <span className="mono">index_value_skipped</span> is written to <span className="mono">system_events</span> and no value is published).</li>
  </ol>

  <p className="mt-6 text-sm text-ink-muted">
    Regulatory anchors: this section is CTI's public statement under IOSCO{' '}
    <span className="italic">Principles for Financial Benchmarks</span>{' '}
    Principle 7 (Data Sufficiency) and Principle 8 (Hierarchy of Data Inputs),
    and under Regulation (EU) 2016/1011 (EU Benchmarks Regulation) Article
    11(1)(c) and 11(3)(d). CTI is not currently registered as a regulated
    benchmark; this classification exists to make the input basis unambiguous
    to any licensee, auditor, or downstream consumer.
  </p>
</section>
```

### Why the copy reads the way it does

Each paragraph is doing specific regulatory work. Documenting the mapping so
the Committee can evaluate it, not because the page needs it:

| Sentence in the copy | Purpose |
|---|---|
| "CTI is a *published-quote benchmark*." | Self-classifies precisely. Avoids the overclaim of "transaction benchmark" (which would fail P7 on inspection) and the underclaim of "assessment benchmark" (which we are not — no human judgment enters the number). |
| "…genuinely arms-length transactional market, but there is no public consolidated tape…" | Directly addresses P7's "anchored by observable transactions" test as reinterpreted by IOSCOPD549: the *market* must be transactional, the *inputs* need not exclusively be, provided the hierarchy is published. |
| "firm listings that are executable on click at the quoted price" | Maps Tier 2 to BMR Art 11(1)(c)'s enumerated category of *committed quotes*, which is explicitly permitted as an input class when transaction data is not available. |
| "we do not use expert judgment in the published-number path" | Distinguishes CTI from PRA-style benchmarks (Platts, Argus) which do use judgment. This narrower position is more defensible for a young benchmark with no chartered committee-of-experts. |
| "When transactional data … becomes available … it will move above listings in the hierarchy … with public notice" | Signals the roadmap without pre-committing the Committee to a date. Consistent with the `invoice_observations` schema landed in migration 011. |
| Tier 4 "*Prohibited by design*" | Turns a limitation into a strength. Says explicitly what the quorum rule *already* does, but names it in the language IOSCO reviewers will look for. |
| "This classification is deliberate." | Owns the position rather than presenting it as a limitation. This is the Baltic Exchange / LBMA pattern of naming the input model and defending it, not apologising for it. |

## Why this is the right shape (vs. alternatives)

Three shapes were considered. The proposed shape is (A).

**(A) Chosen — one static prose section on `/methodology`, no code, no data model change, no new endpoint.**
Ships in one small PR. Reviewable in ten minutes. Removes the P7 + P8 gaps in a
single edit. No user-facing surface changes, no schema migration, no risk to any
published value. The disclosure is stable — the underlying claim ("published-quote
benchmark constructed from committed quotes over a 24 h window") will remain
true across any v1.x change we currently foresee, so the text does not become
stale.

**(B) Rejected — add a "Data hierarchy" data model + per-day JSON endpoint.**
This is what a mature MSCI-style page will eventually look like: each daily
publication is accompanied by a machine-readable disclosure of which input
tiers contributed, how many observations per tier, and the eligibility outcome
for each excluded row. It is the right shape for a v2 audit surface. But it
requires (i) a new schema on `index_values_daily`, (ii) an ingest change in
`index-calculator.ts`, (iii) an API design decision that hasn't been made yet
(licensee gating? public JSON?), and (iv) at least two of these touch hard-limit
files. Doing this now would move the P7/P8 disclosure gap sideways — the text
would still need to be added — and would delay closing the gap by weeks.
Correct destination, wrong sequencing.

**(C) Rejected — publish a standalone `/methodology/hierarchy` page.**
Splits the disclosure across two pages. A regulator or licensee reading
`/methodology` should not have to click through to find CTI's Principle 7
position. The whole document must be citable at one URL.

Shape (A) is the smallest edit that closes the actual gap. Shapes (B) and (C)
are worth revisiting when the invoice-observation ingest lands (roadmap D-line
item under REFRAME_v2 variable 8) and per-day audit disclosures become
data-driven rather than static prose.

## Empirical impact

This section is docs, not methodology. The following empirical claims are all
statements about **what does NOT change**:

- **Published value of every `index_values_daily` row: unchanged.** No formula
  constant, no filter parameter, no eligibility floor, no quorum threshold, no
  input filter is edited by this PR. `PUBLISHED_METHODOLOGY` in
  `packages/shared/src/methodology.ts` is not touched. `index-calculator.ts` is
  not touched. `outlier-detector.ts` is not touched. The methodology lock test
  passes without any change.
- **Backtest: not required, and would be meaningless.** The template mandates a
  backtest for methodology changes. This is not a methodology change — it is a
  disclosure addition that names the existing methodology's input class. A
  backtest would compare the current formula against itself and return zero
  delta by construction. Documenting so the Committee doesn't flag the missing
  section: it is intentionally omitted per the template's own scoping ("REQUIRED
  for methodology changes").
- **Sensitivity: n/a.** No parameter is introduced or moved.
- **Coverage impact: 0 provider-days.** No row that was eligible today becomes
  ineligible tomorrow, and vice versa.
- **Empirical signal that this "works":** after merge, `/methodology` renders
  the new section between "Formula" and "Index Committee"; the page still fetches
  and displays the version-history table from `methodology_versions`; the
  methodology lock test (`apps/workers/src/functions/methodology.test.ts`) still
  passes bit-identically; a `curl` of the deployed page contains the phrase
  "published-quote benchmark" and the list `Tier 1 … Tier 2 … Tier 3 … Tier 4`.

## Risks

**Immediate (build / render):**

- **JSX injection into an existing tsx file must not break existing rendering.**
  Mitigation: the insert is a self-contained `<section>` with the same
  className vocabulary already used on the page (`display`, `mt-16`, `text-2xl`,
  `border-l-2 border-bg-border pl-4`, `mono text-xs uppercase tracking-widest
  text-ink-muted`). `pnpm -r typecheck` must be run before push (charter
  requirement) and must be green.
- **Template-literal expressions inside the JSX** (`{PUBLISHED_METHODOLOGY.minObservations}`,
  `{PUBLISHED_METHODOLOGY.reliabilityFloor}`) reference values already imported
  at the top of the file (line 3). No new import is needed.

**Second-order (regulatory / licensee):**

- **Over-claiming risk.** A reader could interpret "published-quote benchmark" as
  a claim of full IOSCO or BMR compliance. Mitigation: the closing paragraph
  says explicitly *"CTI is not currently registered as a regulated benchmark;
  this classification exists to make the input basis unambiguous."* This is the
  same disclaimer pattern used by pre-registration ICE Benchmark Administration
  products.
- **Under-claiming risk.** A reader could interpret "not yet populated" for Tier 1
  as an admission that the benchmark is weak. Mitigation: the surrounding text
  frames the tier structure as *forward-looking hierarchy discipline*, not a
  reassurance that data will soon replace it. The Baltic Dry Index runs on
  Tier 4-equivalent panel submissions and is a licensable settlement benchmark;
  Tier 2 committed quotes are a strictly stronger input class.
- **Locking-in-a-position risk.** Publishing the hierarchy makes any future
  Committee decision that admits a lower-tier input (e.g. an indicative quote
  from a hyperscaler that doesn't expose an executable on-demand price) more
  visible. This is the correct incentive — the whole point of a published
  hierarchy is that changes to it are procedural events, not silent drift. The
  30-day-notice procedure for methodology changes is exactly the surface that
  handles this cleanly.
- **Contradicts existing page copy? Reviewed and no.** The Formula section
  already refers to `E_t = { i : i ∈ W_t ∧ is_normalized(i) ∧ ¬is_outlier(i) ∧
  reliability(provider_i) ≥ … ∧ gpu_model(i) ∈ I.universe }`. The new
  Determination Pipeline subsection restates this in prose and adds the
  normalisation-cascade sub-hierarchy, which does not appear in the Formula
  block today but is a truthful description of what the code already does. No
  edits to the Formula block are required.

**What could go wrong second-order that this PR does *not* mitigate:**

- **Regulator-registration path.** If CTI files for BMR registration later,
  BMR Art 12–14 require a full Benchmark Statement, of which this
  hierarchy disclosure is a subset. That is a separate, larger workstream — not
  a reason to delay the smaller disclosure now.
- **External audit engagement.** A Big-Four audit will want per-day machine-readable
  disclosures of hierarchy application (Shape B above). Publishing the static
  text now does not preclude the machine-readable version later; it just names
  the classification that Shape B will operationalise.

## Migration / rollout plan

**Does the 30-day public-notice period apply?**

The Committee charter on `/methodology` (Step 3) requires "at least 30 days'
notice before taking effect" for **a formula change**. This PR is not a formula
change:

- `PUBLISHED_METHODOLOGY` is untouched.
- `PUBLISHED_METHODOLOGY_VERSION` remains `v1.0`.
- No row in `index_values_daily` is recomputed.
- No new row is written to `methodology_versions`.
- No new row is written to `methodology_changes`.
- The methodology lock test (`apps/workers/src/functions/methodology.test.ts`)
  passes without modification.

The proposal's position: **30-day notice does not apply, because the substantive
methodology is unchanged.** What this PR adds is a *disclosure of the existing
methodology's input classification*, which is a docs-clarity improvement. The
IOSCO principle being addressed (P8) requires the hierarchy to be **published**;
it does not require the hierarchy to be **stable for 30 days before publication**.
Making the disclosure faster is IOSCO-positive, not IOSCO-negative.

If the Committee disagrees on the notice question — reasonable minds can differ,
since editing `/methodology` at all is a hard-limit action — the fallback plan
is:

1. Merge this PR as **draft state**: add the new section behind a placeholder
   note reading *"Draft for Index Committee review — not yet in force. Effective
   date: 2026-09-10."*
2. Cut a second PR on 2026-09-10 removing the placeholder banner. That second
   PR contains no substantive text change.

This fallback preserves the 30-day-notice contract in the strictest possible
interpretation while still shipping the disclosure now. The author's
recommendation is against it (adds ceremony, and the placeholder itself creates
a page state that a licensee reading `/methodology` between merge and 09-10
would reasonably find confusing), but it is the least-risk path if the
Committee's read of Step 3 is broader than the author's.

**Rollout steps (recommended path):**

1. This proposal is merged (docs-only PR against `main`, review by
   @CarlosGalindo2807). This PR does not touch `/methodology` — only
   `docs/research/proposals/` and `docs/research/gaps/`.
2. A **follow-up PR** cuts the actual edit to `apps/web/app/methodology/page.tsx`
   using the exact JSX in §"Proposed change" above. That PR is also reviewed by
   @CarlosGalindo2807 as the CODEOWNER of the hard-limit surface. Splitting the
   proposal from the implementation preserves the "propose first, edit second"
   discipline in the charter.
3. On merge of the follow-up PR, Vercel redeploys `/methodology` on the next
   ISR window (`revalidate = 300`). No cache warm-up required — the page is
   pure static prose plus one DB fetch that is unchanged.
4. Gap-matrix rows P7 and P8 are updated to status `compliant` (P8) and
   `partial-mitigated` (P7 — Track A of the 2026-05-12 note is now shipped;
   Tracks B and C remain).
5. `docs/decisions.md` gains a new entry: "Published data-input hierarchy on
   `/methodology` (added 2026-08-DD)" with a link to the merged follow-up PR
   and this proposal.

**Monitoring after the follow-up PR merges:**

- Watch `system_events` for the 24 h after deploy — no
  `index_value_skipped` should fire that was not already firing (this is a
  no-op change to computation, so any deviation is a coincidence of data, not a
  regression).
- Confirm the methodology lock test remains green on the next scheduled CI run.
- Confirm the version history table on `/methodology` still renders (this PR
  doesn't touch its data fetch, but the JSX edit is above it in the page — a
  bracketing bug would break both sections).

## Committee deliberation prompt (methodology-adjacent — included even though this is not a formula change)

The template lists this section as "methodology only". Including it anyway
because the Committee is being asked to sign off on an edit to a hard-limit
surface, and the decision record benefits from a paste-ready paragraph:

> "We are publishing an explicit classification of CTI as a *published-quote
> benchmark* under IOSCO Principle 7 and EU BMR Article 11(1)(c), and a
> four-tier hierarchy of data inputs under IOSCO Principle 8 and EU BMR
> Article 11(3)(d). The classification is deliberately narrower than the
> broadest defensible reading of Principle 7 for a benchmark of this market:
> we do not claim to be a transaction benchmark, we do not use expert
> judgment, and we prohibit Tier 4 model or estimation inputs. We accept the
> constraint that any future admission of a new input tier (in particular the
> Tier 1 invoice observations reserved by migration 011) must move through
> the full 30-day-notice Committee procedure. In return we gain a citable,
> auditable, and IOSCO-aligned statement of what CTI actually rests on, which
> is a precondition for licensee and auditor conversations. Voted: <yes/no>,
> Carlos Galindo Dumitrescu, on 2026-08-DD. Reasoning archived in
> docs/committee-minutes/ (to be created — see gap-matrix row P18 action)."

## Closing

On merge of the follow-up PR that actually edits `/methodology`:

1. Update `docs/research/gaps/iosco-principles.md`:
   - Row **P7** status → `partial-mitigated` (Track A shipped; Tracks B and C
     remain open — invoice-observation ingest and scaled quorum). Update
     "Specific gap" cell to remove Track A.
   - Row **P8** status → `compliant`. Update "Evidence today" cell to point at
     the `/methodology` "Data-input hierarchy and benchmark classification"
     section. Remove from priority queue.
   - Rolling priority queue: remove P0 item 4. Renumber remaining items.
   - Add revision-log entry with the merged PR link.
2. Update `docs/decisions.md` with the new locked-in disclosure and rationale
   (see §"Migration / rollout plan" step 5).
3. Link both merged PRs (this proposal and the follow-up implementation PR) in
   this proposal's footer for audit-trail closure.

**Follow-ups this proposal explicitly does *not* address (out of scope for
this PR):**

- Populating Tier 1 (`invoice_observations` ingest). Separate PR, separate
  workstream, REFRAME_v2 variable 8.
- Scaled quorum (Track C of the 2026-05-12 note). Methodology-class — requires
  its own proposal + committee + 30-day notice + 90-day backtest.
- Per-day machine-readable hierarchy disclosure (Shape B). v2 audit surface —
  worth revisiting once Tier 1 data exists.
- Complaints procedure (gap-matrix row P16). Separate P0.
- Conflict-of-interest disclosure (gap-matrix rows P3, P5). Separate P0.
- Committee member naming (roadmap B7). Separate P0, five-minute UPDATE.

---

*After merge, this section will hold links to the merged proposal PR and
follow-up implementation PR.*
