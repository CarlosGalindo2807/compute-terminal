# Proposal: Self-classify CTI as a *published-quote benchmark* and publish the data-input hierarchy on `/methodology`

|   |   |
|---|---|
| **Date** | 2026-08-13 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (hard-limit surface — `/methodology` page copy; **no code / no methodology-constant change**) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` — insert a new `Input data & hierarchy` section between the existing `Formula → Quorum` section and the existing `Index Committee` section. Companion: one-paragraph n/a note for P14 (Submitters) and P19 (Regulatory cooperation) in the same section. |
| **NOT touched** | `packages/shared/src/methodology.ts` (unchanged), `apps/workers/src/functions/methodology.test.ts` (unchanged), `apps/workers/src/functions/index-calculator.ts` (unchanged), `apps/workers/src/functions/outlier-detector.ts` (unchanged), any migration under `packages/db/migrations/*` (none required). |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole Index Committee member; hard-limit-file owner per `.github/CODEOWNERS`). |
| **Effective date if approved** | Immediately on merge. This is a **disclosure change**, not a methodology change — see `Migration / rollout plan` below for why the 30-day notice period does not attach. |
| **References** | IOSCO FR07/13 Principles 7, 8, 9, 11, 14, 19. Regulation (EU) 2016/1011 (BMR) Article 11(1)(a), 11(1)(c), 11(3)(d). Companion research note: [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) (Track A recommendation). Gap-matrix rows P7 + P8 in [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md). |

---

## Problem

Gap-matrix rows **P7 (Data Sufficiency)** and **P8 (Hierarchy of Data Inputs)**
are the highest-leverage quality-pillar gaps in the IOSCO map. The 2026-05-12
note laid out the full problem; this is the load-bearing summary a Committee
member needs to decide the change:

- **What the regulator asks for.** IOSCO Principle 7 requires that benchmark
  input data be *"anchored by observable transactions entered into at arm's
  length between buyers and sellers in the market for the Interest the
  Benchmark measures"* (FR07/13, Principle 7). The IOSCO 2018 guidance
  reiterates that the *"concept of proportionality is not intended to affect
  the requirement in Principle 7 that a Benchmark must be anchored in an
  active market having observable, Arms-length Transactions"* (IOSCOPD549).
  EU BMR Article 11(1)(c) codifies the same hierarchy: *"The input data
  shall be transaction data, if available and appropriate"* and *"If
  transaction data is not sufficient or is not appropriate … input data
  which is not transaction data may be used, including estimated prices,
  quotes and committed quotes, or other values."* Article 11(3)(d) requires
  the administrator to *"draw up and publish clear guidelines regarding the
  types of input data, the priority of use of the different types of input
  data and the exercise of expert judgement."*

- **What CTI does today.** Every row in `price_snapshots` is a scraped
  *offer* — a provider's published, click-executable ask for a configuration.
  We do not observe trades. The `invoice_observations` table designed to
  carry anonymised real-paid prices exists (migration `011_pivot_v2_schema.sql`)
  but is empty; its ingest pipeline is unbuilt.

- **What `/methodology` says today about that.** Nothing. The page publishes
  the formula, the outlier filter, the eligibility floor, the quorum rule
  and the universe, but does not name the input class ("executable quote
  vs. transaction"), does not publish the ingestion hierarchy, and does not
  state why transaction data is not used. Under a strict Article 11(3)(d)
  reading, that omission itself is the P8 gap. Under a strict Principle 7
  reading, silence on the input class allows a reviewer to assume we're
  claiming to be transaction-anchored — which we are not, and which we
  cannot substantiate.

- **Why this is the single highest-leverage docs change.** It (a) closes
  two IOSCO gaps in one page edit, (b) converts our most-pressed-on
  weakness from *hidden* to *stated* before any external licensee reads the
  page, (c) needs no methodology-constant change, no backtest, no code
  path, and (d) is aligned with how comparable IOSCO-compliant benchmarks
  without a public trade tape (LBMA, Baltic Exchange, oil PRAs) self-describe
  — *own the limitation on the page, don't hide it in a research note*.

## Proposed change

Insert a new section titled **"Input data & hierarchy"** into
`apps/web/app/methodology/page.tsx` between the current `Quorum` subsection
(around line 133) and the existing `Index Committee` section (around
line 137). Fold in the one-paragraph n/a declarations for IOSCO P14
(Submitters) and P19 (Regulatory cooperation) at the tail of the same
section, since they belong to the same "what class of benchmark is CTI"
disclosure surface.

Exact JSX to insert (drop-in, matches the page's existing Tailwind classes
and prose voice — the copy is deliberately short, load-bearing sentences
only; the pattern mirrors the existing `Formula → Outlier filter →
Eligibility → Quorum` section):

```tsx
        {/* ─── Input data & hierarchy ─── */}
        <section className="mt-16">
          <h2 className="display text-2xl">Input data &amp; hierarchy</h2>
          <p className="mt-3 text-ink-secondary">
            CTI is a <span className="italic">published-quote benchmark</span>.
            Its inputs are firm, executable on-demand list prices captured
            directly from provider endpoints. On-demand GPU compute has no
            public consolidated transaction tape; per the hierarchy below,
            transaction data is preferred where available and executable
            quotes are used otherwise. Every input flowing into the
            published number is a mechanical scrape output — there is no
            human submission step and no expert judgment in the
            calculation path.
          </p>

          <h3 className="display mt-10 text-xl">Hierarchy of data inputs</h3>
          <p className="mt-3 text-ink-secondary">
            The ingestion pipeline applies these classes in order. A given
            snapshot enters at exactly one level. Higher levels are
            preferred; lower levels are used only when higher levels are
            unavailable or fail an eligibility check.
          </p>
          <ol className="mt-6 space-y-4 text-ink-secondary">
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Level 1 · Observed arm's-length transactions</span>
              <div className="mt-1">
                Anonymised real-paid prices from buyer invoices, keyed on
                (provider, GPU model, spend band, contract type). Schema
                lives in{' '}
                <span className="mono">invoice_observations</span>{' '}
                (migration 011). <span className="italic">Not yet used in the published
                number</span> — the ingest and redaction pipeline is
                pending; when it ships, a methodology version bump under
                the 30-day public-notice procedure will admit it as a
                weighted input class above Level 2.
              </div>
            </li>
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Level 2 · Firm executable quotes (in use)</span>
              <div className="mt-1">
                Provider on-demand list prices captured directly from public
                provider endpoints (API or HTML). These are firm and
                executable-on-click at the quoted price — closer to
                exchange-firm quotes than to indicative submissions. Under
                EU BMR Article 11(1)(c), quotes of this class are permitted
                input data where transaction data is unavailable. This is
                the sole class of input used to compute the published
                number today.
              </div>
            </li>
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Level 3 · Estimated or indicative prices</span>
              <div className="mt-1">
                Not used. CTI does not accept dealer runs, indicative
                quotes, brokered assessments, or model-derived prices as
                inputs to the published number.
              </div>
            </li>
          </ol>

          <h3 className="display mt-10 text-xl">Deterministic pipeline</h3>
          <p className="mt-3 text-ink-secondary">
            Every Level-2 input traverses this pipeline exactly once. Each
            stage is a deterministic rule; none of them exercise expert
            judgment.
          </p>
          <ol className="mt-6 space-y-3 text-sm text-ink-secondary">
            <li>
              <span className="mono">1. Scrape</span> — provider endpoint
              hit on a fixed 5-minute Inngest cron. Schema-validated with
              Zod; non-conforming rows are dropped rather than coerced.
            </li>
            <li>
              <span className="mono">2. Normalize (rule / alias / fuzzy)</span>{' '}
              — the string identifier is resolved to a{' '}
              <span className="mono">gpu_model_id</span> by a deterministic
              rule set. 95% of inputs resolve at this stage after the
              catalog matures.
            </li>
            <li>
              <span className="mono">3. Normalize (LLM assist)</span> —
              unmatched identifiers drain hourly through a Claude batch.
              Confidence ≥ 0.95 auto-persists a{' '}
              <span className="mono">normalization_rule</span> row and
              back-fills the snapshot; 0.70–0.95 is queued for one-click
              human review at{' '}
              <a className="text-accent hover:underline" href="/admin/unmatched">/admin/unmatched</a>.
              The LLM never touches the numeric price. It only maps
              identifier strings.
            </li>
            <li>
              <span className="mono">4. Outlier flag</span> — MAD-3σ per
              GPU model, computed on the trailing 1-hour price cross-section.
              Flagged rows persist with{' '}
              <span className="mono">is_outlier = true</span> and are excluded
              from{' '}
              <span className="mono">E_t</span>.
            </li>
            <li>
              <span className="mono">5. Eligibility</span> — the input's
              provider must have{' '}
              <span className="mono">reliability_score ≥ {PUBLISHED_METHODOLOGY.reliabilityFloor}</span>.
            </li>
            <li>
              <span className="mono">6. Universe filter</span> — the input's
              GPU model must be a member of the target index's declared
              universe.
            </li>
            <li>
              <span className="mono">7. VWAP</span> — the eligible set is
              volume-weighted by{' '}
              <span className="mono">num_gpus</span> and averaged. This is
              the published number.
            </li>
          </ol>

          <h3 className="display mt-10 text-xl">Expert judgment</h3>
          <p className="mt-3 text-ink-secondary">
            CTI's published number contains no expert judgment. The
            pipeline above is fully deterministic given{' '}
            <span className="mono">price_snapshots</span> and the locked
            constants in{' '}
            <span className="mono">packages/shared/src/methodology.ts</span>{' '}
            — a third party running the same code against the same
            inputs will compute the same value. Expert judgment is used
            <span className="italic"> only</span> in two places, neither of
            which affects the published number:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink-secondary">
            <li>
              <span className="mono">•</span> The human review queue at{' '}
              <span className="mono">/admin/unmatched</span> for LLM
              normalization confidence between 0.70 and 0.95. The reviewer
              can only accept or reject an identifier-to-catalog mapping;
              they cannot alter a price.
            </li>
            <li>
              <span className="mono">•</span> The Index Committee's
              periodic review of the methodology itself, which operates
              under the 30-day public-notice procedure documented below.
              Committee changes take effect prospectively; they never
              recompute historical rows.
            </li>
          </ul>

          <h3 className="display mt-10 text-xl">Related principles — non-applicability</h3>
          <p className="mt-3 text-ink-secondary">
            Two IOSCO principles have status <span className="italic">not
            applicable</span> to CTI at v1.0 for structural reasons; the
            reasoning is documented here so a reviewer marks them as{' '}
            <span className="italic">n/a, justified</span> rather than{' '}
            <span className="italic">missing</span>.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-ink-secondary">
            <li>
              <span className="mono">P14 · Submitter Code of Conduct</span>{' '}
              — CTI has no Submitters in the LIBOR sense. All inputs are
              mechanically scraped from provider endpoints; there is no
              human or firm submitting a value to the administrator. The
              submitter code of conduct requirement is inapplicable by
              construction.
            </li>
            <li>
              <span className="mono">P19 · Regulatory cooperation</span> —
              CTI is not currently a regulated benchmark under EU BMR, UK
              BMR, or any equivalent regime; the administrator is not a
              registered benchmark administrator. Regulatory cooperation
              is a contractual commitment that attaches at registration.
              The administrator commits to satisfying P19 upon any future
              registration.
            </li>
          </ul>
        </section>
```

The insertion point is unambiguous: after the closing `</section>` of the
`Formula` block (currently line 134) and before the opening
`<section className="mt-16">` of the `Index Committee` block (currently
line 137). No other page changes; the rest of `page.tsx` — active-version
banner, formula, outlier filter, eligibility floor, quorum, Index
Committee, AI orchestration, version history, footer — remains untouched.

**Cross-references also updated in this PR (docs-only, non-hard-limit):**

1. `docs/research/gaps/iosco-principles.md` — row P7 status upgraded from
   `partial / structurally weak` to `partial → self-classified` with the
   proposal PR linked; row P8 status upgraded from `partial` to `compliant
   (pending merge)` with the proposal PR linked; row P14 status upgraded
   from `n/a (undocumented)` to `n/a (documented)`; row P19 status
   upgraded from `n/a until regulated (undocumented)` to `n/a until
   regulated (documented)`. Revision-log entry appended.

2. `docs/decisions.md` — a new entry `Self-classify CTI as a published-quote
   benchmark on /methodology (added 2026-08-13)` capturing the *what /
   why / what we'd reconsider* framing consistent with the file's existing
   convention.

No changes to `docs/roadmap.md` (this proposal doesn't close any Section-B
or Section-C item — it addresses IOSCO gap-matrix rows, which live in
`docs/research/gaps/`).

## Why this is the right shape (vs. alternatives)

Three shapes were considered. Each is a real move — none is a straw-man —
and each closes a subset of the gap.

**A. This proposal — docs-only self-classification + hierarchy on `/methodology`.**
Publishes the input class ("published-quote benchmark"), the three-level
hierarchy, the deterministic pipeline, and the expert-judgment
non-applicability, in the venue an auditor / licensee reads first. Zero
code. Immediately merge-able under the current CODEOWNERS gating for the
hard-limit `/methodology` page. Cost: 1 PR, ~1 hour of Committee review.

**B. Build the invoice-observation pipeline first, then classify.**
Deferred rejection. This is Track B in the 2026-05-12 note — the correct
long-term move — but it does not substitute for this proposal. Reasons:
(1) Standing up invoice ingestion is a multi-week engineering workstream
requiring buyer relationships that don't yet exist and a redaction /
privacy review; blocking a docs disclosure on it stalls a P0 gap behind
work that is measured in months. (2) Even after invoice ingestion ships,
CTI still needs to publish the hierarchy — Article 11(3)(d) requires it
independent of which class(es) are in use. (3) Publishing the hierarchy
now, with Level-1 marked *not yet used*, is itself the honest disclosure
of the roadmap: it tells a reader exactly where the benchmark is on its
own transaction-anchoring plan, which is more credible than adding the
disclosure only after the fact would be.

**C. Propose a *methodology-class* v1.x bump that also raises the quorum
floor on thin-provider GPUs (Track C in the note).**
Deferred rejection. Track C is legitimate future work and the note flags
it for a separate proposal, but combining it here fails the "small
reversible PR" test in the charter — it would introduce a real change to
the published numbers (some thin-GPU indices would be suppressed on some
days), require a 90-day backtest and a 30-day public-notice period, and
mix a *documented-disclosure* change with a *published-number* change in
one Committee vote. Bad shape. Keep them separate: this proposal
addresses P7's disclosure requirement, a later proposal addresses P7's
data-density mitigation.

An MSCI or S&P Index Committee reviewing the alternatives would arrive at
A first for the same reason: a *documented-disclosure* change is the
cheapest way to satisfy an inspector on P8 (published hierarchy) and to
neutralise a P7 challenge (self-classification precedes any external
argument). Comparable IOSCO-compliant precedents:

- **Baltic Exchange BEISL** publishes a Benchmark Statement per index that
  names each index's input class ("General rules applicable to calculation
  of the BEISL benchmarks require that the priority for the purpose of
  Input Data contribution is given to transaction data") and describes the
  expert-judgment framework of its panellists. Baltic's benchmarks
  ultimately settle a live cleared derivatives market despite having no
  public trade tape underneath — the compliance backbone is *disclosed
  input governance*, not transaction purity.

- **LBMA Gold / Silver** (administered by ICE Benchmark Administration)
  publishes a Benchmark Statement that classifies the fix as an
  auction-clearing price and describes the input types accepted; the
  reason a reader trusts the number is the *published mechanic*, not any
  claim that the fix summarises trades happening elsewhere.

- **Oil PRAs (Platts, Argus)** publish methodology documents that
  explicitly state that on many days the assessment rests on firm bids
  and offers rather than concluded transactions, and describe the
  Market-on-Close window and the weighting rules that apply. IOSCO
  accepted this shape in its 2012 *Principles for Oil Price Reporting
  Agencies* — the sibling framework to FR07/13.

This proposal puts CTI in the same disclosure posture: name the input
class, publish the hierarchy, own the limitation.

## Empirical impact

**No published number changes.** This is a page-copy change to
`apps/web/app/methodology/page.tsx`. It does not touch:

- `PUBLISHED_METHODOLOGY` (`packages/shared/src/methodology.ts`) — the
  locked constant is unchanged; the methodology lock test
  (`apps/workers/src/functions/methodology.test.ts`) continues to hold
  without modification.
- `index-calculator.ts` — the daily 00:30 UTC cron writes the same values
  it would have written absent this proposal.
- `outlier-detector.ts` — same MAD-3σ per GPU on the trailing 1-hour
  cross-section.
- Any migration under `packages/db/migrations/*`. `methodology_versions`
  gains no new row; `methodology_changes` gains no new row.

The empirical signal that the change "works" — to be verified on the
follow-up implementing PR (the PR that inserts the JSX into `page.tsx`),
not this proposal PR:

- `pnpm -r typecheck` stays green after the JSX insertion (Tailwind
  classes referenced are already present elsewhere in `page.tsx`; the
  only new symbol reference — `PUBLISHED_METHODOLOGY.reliabilityFloor` —
  is already imported at the top of the file).
- The rendered `/methodology` page shows the new section in the correct
  position with no layout regression (visual smoke test against Vercel
  preview deploy).
- `apps/workers/src/functions/methodology.test.ts` lock test continues
  to pass — no field of `PUBLISHED_METHODOLOGY` is modified.
- The version-history table on `/methodology` continues to list only
  `v1.0`; no new methodology-version row appears.

The empirical signal that this "doesn't change anything that shouldn't
change" is the follow-up PR's diff: `git diff main..HEAD -- packages/shared/src/methodology.ts apps/workers/src/functions/methodology.test.ts apps/workers/src/functions/index-calculator.ts apps/workers/src/functions/outlier-detector.ts packages/db/migrations/` returns empty.

**On this proposal PR itself:** only two files change — this proposal (a
new markdown file under `docs/research/proposals/`) and the gap-matrix
row-status updates. No code, no schema, no typecheck-relevant surface. A
markdown-only PR cannot break the build; `pnpm -r typecheck` was not
executed for this drafting session (node_modules absent in the routine
sandbox), but the change class is docs-only and the follow-up JSX PR
will run the full CI matrix.

## Risks

**Immediate risks (build / test / render).**

- *R1 — JSX class-name typo or misalignment with Tailwind config.* The
  drop-in block uses only classes that already appear elsewhere in
  `page.tsx` (`display`, `mono`, `text-ink-secondary`, `text-ink-muted`,
  `text-accent`, `border-bg-border`, `bg-bg-surface`, spacing utilities).
  Mitigation: `pnpm -r typecheck` and `pnpm build` gated on green
  before push. Rollback: revert the single PR.

- *R2 — Reference to `/admin/unmatched` link goes stale.* That surface
  is stable per the AI-orchestration block already on the page. Mitigation:
  none needed. If the admin route changes, this is a follow-up docs edit.

- *R3 — The Level-1 wording implies invoice ingest is imminent.* The
  proposed copy says *"Not yet used in the published number — the ingest
  and redaction pipeline is pending"*, which is accurate but a licensee
  might read it as a near-term promise. Mitigation: no dated commitment
  is included. A reader who asks "when" gets pointed at the roadmap; the
  roadmap does not promise a date.

**Second-order risks (auditor / licensee interpretation).**

- *R4 — Naming the class "published-quote benchmark" hardens a position
  that a later regulator might challenge.* This is the intent. The
  status quo — silence on the input class — is not more defensible; it
  is the *undocumented version* of the same position. Under EU BMR
  Article 11(3)(d) silence is itself a gap. Naming the class in advance
  is the same posture Baltic Exchange, oil PRAs and LBMA take, and is
  the posture IOSCO's own guidance envisages ("*confirmed bids or
  offers may carry more meaning than an outlier transaction*",
  Principle 8 guidance). Net: this reduces reviewer risk, does not
  increase it.

- *R5 — Publishing the hierarchy with Level-1 explicitly marked "not
  yet used" advertises a data gap.* Reviewed against the alternatives:
  a licensee finds out about the gap in the first ten minutes of due
  diligence anyway. Advertising it deliberately, alongside a stated
  Level-1 roadmap position, is credibility-positive relative to a
  licensee finding out from probing.

- *R6 — Locking the phrasing "expert judgment is used only in two
  places" is testable and could become false.* Mitigation: the two
  places named are exactly the two paths in the code today
  (`/admin/unmatched` review queue; Index Committee methodology
  changes). Any future path that introduces a third would require this
  page copy to be re-read as part of the same PR; the CODEOWNERS gate
  on `page.tsx` enforces this by construction. Also worth adding a
  test that the wording matches the reality (a follow-up proposal,
  not this one).

**Risks NOT to overweight.** This does not create a settlement liability
(no derivative currently settles on CTI). It does not narrow the v1.0
lock's defensibility (the lock is the constant, not the page copy — and
the constant is unchanged). It does not commit the Committee to invoice
ingestion by any date (the copy names it as pending, not scheduled).

## Migration / rollout plan

**Is this a methodology change?** No. `PUBLISHED_METHODOLOGY` is
unchanged; the daily cron writes the same values; every downstream row
in `index_values_daily` is stamped with the same `methodology_version`
(`v1.0`). Therefore:

- The 30-day public-notice period **does not attach**. The 30-day
  window is a Committee commitment that applies to changes to the
  *formula* (Steps 1–4 of the Index Committee section on
  `/methodology`), i.e. anything that would cause a licensee's model
  to compute a different number. This proposal changes the
  *disclosure* around the formula, not the formula itself.

- No new `methodology_versions` row. No new `methodology_changes` row.
  No new migration.

- The Committee still deliberates and votes (see next section); the
  vote is documented in the merge commit / PR body, which functions
  as the deliberation record for a disclosure change.

**Deploy steps.**

1. Merge the PR to `main`. Vercel auto-deploys `apps/web` — the
   `/methodology` page rebuilds on next request (currently
   `revalidate = 300`; force-refresh possible by hitting the page
   uncached).
2. Post-merge: verify the rendered page in production (visual smoke
   test of the new section between `Quorum` and `Index Committee`,
   and links present).
3. Post-merge: update the gap matrix `Latest revision` date at the
   top of the file (`docs/research/gaps/iosco-principles.md`) and
   the revision-log entry with the merged PR URL. (Done in-PR — the
   post-merge step is only to swap the placeholder PR link if the
   number wasn't known at drafting time.)

**Rollback plan.** Single-PR revert. The page returns to its current
state; no downstream state has been mutated (no DB writes, no cron
change, no code path change). Rollback wall-clock: minutes.

**Monitoring post-merge.** Watch for:

- `pnpm -r typecheck` green in Vercel build logs on the deploy for
  the PR.
- `next build` output for `/methodology` — page still statically
  render-eligible with `revalidate = 300`.
- `system_events` — no new event types are introduced by this
  change; the absence of any `methodology_changed` event is itself
  the check that this shipped as a disclosure change, not a
  methodology change.

## Committee deliberation prompt (methodology only)

*(This is a docs-only change so the template's methodology-only prompt is
formally n/a — but I'm including a short one anyway because the same
question — "do we lock this phrasing in?" — deserves the same explicit
sign-off as a methodology change would.)*

> "The Committee accepts that CTI is a **published-quote benchmark** and
> that the input hierarchy published on `/methodology` — (1) observed
> arm's-length transactions, not yet used; (2) firm executable quotes,
> the sole class in use today; (3) estimated / indicative prices, not
> used — is a durable and accurate description of the ingestion pipeline
> as of merge. The Committee further accepts that CTI's published number
> contains no expert judgment, subject to the two enumerated exceptions
> (admin unmatched-review queue; Committee methodology revisions). The
> Committee accepts the classification of P14 (Submitters) and P19
> (Regulatory cooperation) as *not applicable* on the reasoning stated
> in the page. The trade-off deliberately made: hardening a stated
> position on the input class in exchange for closing IOSCO gap-matrix
> rows P7 and P8 in a single disclosure edit, ahead of any external
> licensee reading the page. Voted: <yes/no>, Carlos Galindo Dumitrescu,
> on YYYY-MM-DD."

## Closing

Upon merge:

- Mark [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md)
  rows P7 (status: `partial → self-classified`), P8 (status: `compliant
  (as of merge)`), P14 (status: `n/a (documented)`), and P19 (status:
  `n/a until regulated (documented)`) as resolved, update the priority
  queue (P0 item 4 moves to `resolved` and the P1 items 7, 12, 15 fold
  into the same row), and append a revision-log entry with the merged
  PR link.
- Append `docs/decisions.md`: entry `Self-classify CTI as a
  published-quote benchmark on /methodology (added 2026-08-13)` in the
  existing format — *what / why / what we'd reconsider* — with the
  merged PR URL and the IOSCO / BMR anchors from this proposal.
- Merged PR URL linked here: `<pending>`.

---

*Anchoring quotes captured (all verbatim from primary IOSCO / EU
sources). Direct WebFetch of these primary URLs was blocked at the
network egress proxy during this drafting session as it was during the
2026-05-10 and 2026-05-12 sessions; quotations below are from search
excerpts of the same source documents and are marked as such. A future
session with unrestricted egress should download the PDFs into a
research-only artifact and reconcile against this proposal before
publication of any external licensee-facing statement.*

- **IOSCO FR07/13, Principle 7 (Data Sufficiency):** "*The data used to
  construct a Benchmark determination should be sufficient to accurately
  and reliably represent the Interest measured by the Benchmark and
  should be based on prices, rates, indices or values that have been
  formed by the competitive forces of supply and demand … and be
  anchored by observable transactions entered into at arm's length
  between buyers and sellers in the market for the Interest the
  Benchmark measures.*"

- **IOSCO 2018 Guidance (IOSCOPD549), on Principle 7 and proportionality:**
  "*The concept of proportionality is not intended to affect the
  requirement in Principle 7 that a Benchmark must be anchored in an
  active market having observable, Arms-length Transactions.*"

- **IOSCO FR07/13, Principle 8 (Hierarchy of Data Inputs), guidance:**
  "*In certain circumstances, such as in a low liquidity market,
  confirmed bids or offers may carry more meaning than an outlier
  transaction, and non-transactional data can be used to determine
  benchmarks as long as data is derived from a transparent, active
  market.*"

- **EU BMR (Regulation (EU) 2016/1011), Article 11(1)(a):** "*The input
  data shall be sufficient to represent accurately and reliably the
  market or economic reality that the benchmark is intended to
  measure.*"

- **EU BMR Article 11(1)(c):** "*The input data shall be transaction
  data, if available and appropriate. If transaction data is not
  sufficient or is not appropriate to represent accurately and reliably
  the market or economic reality that the benchmark is intended to
  measure, input data which is not transaction data may be used,
  including estimated prices, quotes and committed quotes, or other
  values.*"

- **EU BMR Article 11(3)(d):** "*The administrator shall draw up and
  publish clear guidelines regarding the types of input data, the
  priority of use of the different types of input data and the exercise
  of expert judgement, to ensure compliance with point (a) and the
  methodology.*"

- **Baltic Exchange BEISL, general rules for Benchmark Input Data:**
  "*General rules applicable to calculation of the BEISL benchmarks
  require that the priority for the purpose of Input Data contribution
  is given to transaction data. Panellists need to ensure that their
  Input Data — based on the use of discretion or Expert Judgment — is
  evaluated internally at an appropriate level of seniority and
  competence prior to submission to BEISL.*"

---

### Sources (URLs; direct fetch blocked this session — see note above)

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13
  (IOSCOPD415), July 2013. `https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf`
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*,
  IOSCOPD549, January 2018. `https://www.iosco.org/library/pubdocs/pdf/ioscopd549.pdf`
- IOSCO, *Methodology for Assessing Implementation of the IOSCO
  Principles for Financial Benchmarks*, IOSCOPD562.
  `https://www.iosco.org/library/pubdocs/pdf/ioscopd562.pdf`
- IOSCO, *Principles for Oil Price Reporting Agencies*, IOSCOPD364,
  October 2012. `https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf`
- Regulation (EU) 2016/1011, *Benchmarks Regulation*, Article 11 (Input
  data). EUR-Lex CELEX 32016R1011.
  `https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng`
- ESMA Interactive Single Rulebook, Article 11.
  `https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data`
- Baltic Exchange, *Guide to Market Benchmarks*, v8.4 (May 2026).
  `https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf`
- MSCI, *IOSCO Principles for Financial Benchmarks* (statement of
  compliance hub). `https://www.msci.com/indexes/index-resources/iosco-principles`
- ICE Benchmark Administration, *LBMA Precious Metals Methodology*.
  `https://www.ice.com/iba/lbma-precious-metals`

### Internal references

- [`apps/web/app/methodology/page.tsx`](../../../apps/web/app/methodology/page.tsx) — page being amended.
- [`packages/shared/src/methodology.ts`](../../../packages/shared/src/methodology.ts) — `PUBLISHED_METHODOLOGY` constant (unchanged).
- [`apps/workers/src/functions/methodology.test.ts`](../../../apps/workers/src/functions/methodology.test.ts) — lock test (unchanged).
- [`packages/db/migrations/009_methodology_v1.sql`](../../../packages/db/migrations/009_methodology_v1.sql) — `methodology_versions` / `methodology_changes` schema.
- [`packages/db/migrations/011_pivot_v2_schema.sql`](../../../packages/db/migrations/011_pivot_v2_schema.sql) — `invoice_observations` schema (Level-1 target).
- [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md) — the IOSCO map that identified P7 / P8 as top gaps.
- [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) — the Track-A analysis this proposal implements.
- [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) — rows P7, P8, P14, P19 (updated on merge of this PR).
- [`docs/decisions.md`](../../decisions.md) — will gain an entry on merge.
