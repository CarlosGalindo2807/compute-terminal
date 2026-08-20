# Proposal: Self-classify CTI as a published-quote benchmark and publish the hierarchy of data inputs on `/methodology`

| | |
|---|---|
| **Date** | 2026-08-20 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (edits a hard-limit surface; no change to `PUBLISHED_METHODOLOGY` values, no change to any calculator code path) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (adds one new section between "Formula" and "Index Committee"; no edit to `packages/shared/src/methodology.ts`, `apps/workers/src/functions/index-calculator.ts`, `outlier-detector.ts`, or `methodology.test.ts`) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member; hard-limit surface) |
| **Effective date if approved** | On merge — see §"Migration / rollout plan" below for the case that this qualifies as a documentation clarification, not a methodology change requiring the 30-day public-notice window. The Committee may elect to run the 30-day gate anyway as a dry-run of P12 (see §"Alternatives") |
| **References** | IOSCO FR07/13 Principles 7 (Data Sufficiency), 8 (Hierarchy of Data Inputs), 11 (Content of the Methodology); IOSCO Guidance IOSCOPD549 (2018); EU BMR (Regulation (EU) 2016/1011) Article 11(1)(a)(c) and Article 11(3)(d); companion research note [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md); gap-matrix rows **P7** and **P8** in [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) |

## Problem

Two gap-matrix rows are open at **P0** priority and share the same underlying
edit:

- **P7 (Data Sufficiency).** CTI's inputs are scraped provider listings, not
  observed trades. IOSCO Principle 7 requires that a benchmark be "anchored by
  observable transactions entered into at arm's length" and IOSCO's own guidance
  (IOSCOPD549) is explicit that proportionality does **not** relax the
  transaction-anchoring requirement. The path forward mapped in
  [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
  §4 is not to overclaim strict-P7 compliance but to self-classify precisely
  ("published-quote benchmark"; inputs are firm executable committed quotes in
  the BMR Art 11(1)(c) sense) and to publish the reason transaction data is
  unavailable. This turns a silent weakness into a stated design position — the
  Baltic-Exchange / LBMA / oil-PRA pattern of *owning the limitation*.
- **P8 (Hierarchy of Data Inputs).** CTI already implements a deterministic
  hierarchy of ingestion stages (rule → alias → fuzzy → Claude ≥ 0.95 auto →
  Claude 0.70–0.95 admin queue → outlier check → reliability floor → quorum →
  VWAP). BMR Article 11(3)(d) explicitly requires an administrator to "draw up
  and publish clear guidelines regarding the types of input data, the priority
  of use of the different types of input data and the exercise of expert
  judgement." Today the hierarchy exists in code and in `docs/decisions.md` but
  is not published on `/methodology`.

Both rows are closed by the same edit to the same page. The Committee-charter
gate (`/methodology` is a hard-limit file per `.claude/agents/index-architect.md`
§"Hard limits") requires a proposal before that edit — this document.

## Proposed change

Insert one new top-level section into `apps/web/app/methodology/page.tsx`
between the existing "Formula" section (`{/* ─── Formula ─── */}`, ending after
the Quorum subsection) and the existing "Index Committee" section
(`{/* ─── Index Committee ─── */}`). Also insert a one-line classification
badge inside the existing "Currently in force" banner. **No other change** —
no formula edit, no `PUBLISHED_METHODOLOGY` mutation, no touch of
`index-calculator.ts`, `outlier-detector.ts`, or `methodology.test.ts`.

### Proposed exact copy — new "Data inputs" section

> **Data inputs · a published-quote benchmark**
>
> CTI is a **published-quote benchmark**. Its inputs are firm, executable
> on-demand list prices for GPU-hours, captured directly from provider endpoints
> at 5-minute cadence. Every input is an offer a buyer can transact on at the
> quoted price at the moment of capture — closer in substance to the "committed
> quotes" class enumerated in EU BMR Article 11(1)(c) than to indicative
> submissions.
>
> **Why not transaction data.** On-demand compute has no public consolidated
> transaction tape. There is no venue that clears GPU-hour trades and publishes
> executed prints; each provider settles bilaterally with its customers. In line
> with EU BMR Article 11(1)(c) — which permits "quotes and committed quotes"
> when transaction data "is not sufficient or is not appropriate" — CTI uses
> executable listings as the primary input class and states that election here.
>
> **Anchoring.** The benchmark is anchored in a genuine arms-length cash market
> for GPU-hours: Vast.ai, RunPod, Lambda and the hyperscaler on-demand tiers
> transact continuously at arm's length. CTI observes what providers will sell
> at, in a market where prices are formed by competitive supply and demand. A
> published-quote framing is not a claim that no trades exist — it is a
> statement that the tape of those trades is not publicly observable.
>
> **Roadmap: transactional layer.** The schema for real-paid-price observations
> exists as `invoice_observations` (migration 011). A subsequent workstream will
> stand up the redaction / ingest pipeline and publish a periodic
> list-price-vs-observed-effective-price reconciliation. That is a validation
> anchor for the published-quote number; it does not change the published
> formula. Any future admission of transaction data as a *weighted input class*
> above listings would be a methodology change subject to Committee review and
> the 30-day public-notice procedure below.
>
> ---
>
> **Hierarchy of data inputs**
>
> Every published index value is produced by the following deterministic
> hierarchy. Each stage either passes an observation to the next stage or drops
> it with a recorded reason; no stage exercises expert judgment on the
> published-number path.
>
> 1. **Capture.** Scrapers write raw offers into `price_snapshots` on a 5-minute
>    cron. Provider-native REST/GraphQL where available; HTML parsers otherwise.
>    Each row records `captured_at`, `provider_id`, raw GPU string, price and
>    `num_gpus`.
> 2. **Schema validation.** Zod validation rejects malformed rows before they
>    reach the store. Failures are logged as dead-letter events, not silently
>    coerced.
> 3. **Normalization to catalog GPU.** A four-stage cascade resolves the raw
>    GPU string to a canonical `gpu_model_id`:
>    (a) exact `normalization_rules` match;
>    (b) alias table;
>    (c) fuzzy match;
>    (d) LLM (Claude Sonnet) — confidence ≥ 0.95 auto-resolves and creates a
>        new rule; 0.70–0.95 is queued at `/admin/unmatched` for one-click human
>        approval; below 0.70 is left unresolved.
>    An observation is eligible only if `is_normalized = true`.
> 4. **Outlier flag.** Every 15 minutes, MAD-3σ per `gpu_model` over the
>    trailing 1 hour writes `is_outlier` back to `price_snapshots`. Observations
>    with `is_outlier = true` are excluded from the published number.
> 5. **Provider reliability floor.** Providers with
>    `reliability_score < 0.5` are excluded. `reliability_score` is a rolling
>    signal derived from scrape-success rate and outlier ratio; it decays
>    automatically and has no manual override.
> 6. **Universe filter.** Only observations of `gpu_model`s listed in the index
>    universe are considered.
> 7. **Window.** Observations captured in `[t − 24h, t)`.
> 8. **Quorum.** If fewer than 5 eligible observations remain for an index, no
>    value is published for that day. A `index_value_skipped` event is
>    recorded. We never extrapolate, never carry forward, never fall back to a
>    different formula.
> 9. **VWAP.** The published value is the num-gpus-weighted average price of
>    the surviving eligible observations under the locked filtered-VWAP
>    formula in §"Formula".
>
> **No expert judgment on the published-number path.** The only human step in
> the pipeline is admin approval at `/admin/unmatched` for the 0.70–0.95 LLM
> band. That step decides whether a raw GPU string resolves to a catalog model;
> it never sets, weights or overrides a published price. Every published value
> is a pure function of the locked formula applied to the observations that
> survive stages 1–8.

### Proposed exact copy — classification badge in the "Currently in force" banner

Add one line below the existing `{PUBLISHED_METHODOLOGY.formulaId} · filtered VWAP, 24h window`
sub-line:

> `published-quote benchmark · executable list prices · no expert judgment on published number`

### What does *not* change

- `PUBLISHED_METHODOLOGY` in `packages/shared/src/methodology.ts` — untouched.
- `PUBLISHED_METHODOLOGY_VERSION` — remains `v1.0` (see §"Migration / rollout plan").
- `methodology.test.ts` — untouched; lock passes without modification.
- `index-calculator.ts`, `outlier-detector.ts`, `normalize-unmatched.ts` — none touched. The hierarchy above **describes** the existing code paths; it does not modify them.
- Every existing `index_values_daily` row — untouched. The published number for every historical day is bit-identical to what was published before this edit.

## Why this is the right shape (vs. alternatives)

Three alternatives were weighed against this proposal.

**Alt 1 — Do nothing.** Leave the gap open, rely on the fact that CTI has not
yet publicly claimed IOSCO compliance. *Rejected because:* the first serious
licensee / auditor conversation will surface P7 and P8 on the first read. It is
strictly better to state the classification proactively in a paragraph we wrote
than to be pushed into stating it in a slide we did not.

**Alt 2 — Ship the classification only, defer the hierarchy.** Publish "we are
a published-quote benchmark" but leave the input hierarchy in
`docs/decisions.md`. *Rejected because:* BMR Art 11(3)(d) requires publication
of the hierarchy on the public methodology surface; splitting the two into
separate PRs doubles Committee review overhead without a defensible reason (the
hierarchy is a straight description of code that already runs).

**Alt 3 — Wait until Track B (invoice observations) is live, then ship a
combined "here is our transaction anchor + here is our hierarchy" edit.*
*Rejected because:* Track B is a multi-week infra workstream. The disclosure
gap is P0 today. Shipping Track A now costs one page edit; deferring means
carrying the un-owned exposure for weeks while the infra is built. When Track B
lands it earns its own edit — a reconciliation-report section.

## Empirical impact

**This is a docs-class change to a hard-limit surface, not a methodology-value
change.** The `PUBLISHED_METHODOLOGY` constant, the calculator, the outlier
detector, the normalizer and every row in `index_values_daily` are unchanged
by this proposal. There is no formula to backtest.

The empirical signal that says "this works" is negative: after merge, the
methodology lock test (`apps/workers/src/functions/methodology.test.ts`) still
passes, `pnpm -r typecheck` still passes, and a byte-diff of any newly-computed
`index_values_daily` row against the pre-merge value on the same source
snapshots is zero.

A more interesting empirical claim we *could* make in the new section but
consciously do not: a quantitative fraction of Vast.ai/RunPod listings that
transact within N minutes of capture. That would elevate "executable in
principle" to "executable in observed practice." It requires either Track B
data or the `time_remaining`-style utilisation signal mentioned in the
2026-05-12 note §4B. Flagged here as the natural strengthening edit once the
data exists; explicitly out of scope for this proposal so the docs edit is not
gated on data collection.

## Risks

**Immediate.**
- *Wording risk.* The proposed copy makes specific regulatory claims
  ("committed quotes in the BMR Art 11(1)(c) sense", "no expert judgment on the
  published number"). Both are supportable but read as legalese. Committee
  reviewer should confirm each phrase is one we are prepared to defend
  verbatim in a licensee conversation. Every phrase in the proposed copy above
  is written to be quotable.
- *Version-history-table risk.* If this edit gets stamped as a new version row
  in `methodology_versions` (see §"Migration / rollout plan" option B), the
  version-history table on `/methodology` will render a v1.0.1 row. That is
  visible to every page visitor and needs a rationale string. Rationale
  proposed below.

**Second-order.**
- *"We just admitted we don't have trades."* Some readers will parse the new
  section as an admission of weakness. This is why the note recommended the
  Baltic/LBMA pattern: state the classification proactively, in your own
  words, before someone else does. The alternative is to let it be discovered.
- *Downstream licensee assumptions.* If a downstream user has already assumed
  CTI inputs are transactions (they should not have, but they might), the new
  disclosure surfaces the mismatch. Reducing that risk **is** the point — an
  auditor who discovers this on their own is a worse outcome than a licensee
  who is corrected by the methodology page.
- *Narrows nothing legally.* This proposal does not add any new commitment,
  SLA or promise. It classifies existing behavior. The legal defensibility of
  the v1.0 lock is unchanged.

## Migration / rollout plan

The Committee has two viable paths. **Author recommends Option A**; Option B is
offered because it also closes gap-matrix row **P12** (dry-run of the
methodology-change procedure).

**Option A — ship as a documentation clarification (recommended).**
- No bump to `PUBLISHED_METHODOLOGY_VERSION`. Version stays `v1.0`.
- A new row is added to `methodology_changes` with
  `kind = 'documentation_clarification'`,
  `effective_from = <merge date>`,
  `rationale = 'Publish P7/P8 self-classification and hierarchy of data inputs; no change to published values.'`
  and a link to this proposal file and the merged PR.
- No `methodology_versions` row is created. The version-history table on
  `/methodology` is unchanged. A published number computed today is
  byte-identical to a published number computed after merge on the same input
  data — that invariant is what makes this a documentation change, not a
  methodology change.
- The 30-day public-notice window does not run: notice is required for
  methodology changes; this proposal changes zero methodology parameters and
  zero eligible inputs.

**Option B — Committee elects to treat as a v1.0.1 bump to dry-run P12.**
- `PUBLISHED_METHODOLOGY_VERSION` bumps `v1.0` → `v1.0.1`. The
  `PUBLISHED_METHODOLOGY` object gains a `version: 'v1.0.1'` update; the
  formula parameters (`formulaId`, `windowHours`, `minObservations`,
  `outlierFilter`, `weight`, `reliabilityFloor`) do not change.
- A `methodology_versions` row is inserted with the same formula id, same
  formula params, `rationale = 'Publish P7/P8 self-classification and
  hierarchy of data inputs; no change to formula parameters.'`, and a 30-day
  gap between merge date and `effective_from`.
- `methodology.test.ts` needs a one-line edit to accept the new version
  string. This is the *only* case in which a hard-limit lock file is
  co-modified in this PR, and even then only to allow the new version — the
  underlying-values lock is unaffected. The Committee-review path for that
  co-modification is this same proposal.
- Rollback if the notice window surfaces a defect: revert the version constant
  to `v1.0` and drop the pending `methodology_versions` row. `index_values_daily`
  rows are never affected because the `effective_from` is in the future.

Both options are safe. Option A ships the disclosure today. Option B costs 30
days but exercises the Committee's own change-control procedure for the first
time — a P1 gap on its own that has been open since inception.

**Post-merge, either option:**
- Mark gap-matrix rows P7 and P8 as `partial → largely-closed` with the merged
  PR linked. (P7 Track B and Track C stay open at P1.)
- Update `docs/decisions.md` with the classification wording (short entry).
- Notify the (single-member) Committee in writing on the day of merge; file
  the notification under the `docs/committee-minutes/` directory once P18 is
  stood up.

## Committee deliberation prompt

> "We are choosing to publish, as part of the CTI v1.0 methodology page, the
> statement that CTI is a published-quote benchmark whose inputs are executable
> list prices in the sense of EU BMR Article 11(1)(c), and to publish the
> nine-stage hierarchy of data inputs that the calculator already implements.
> Neither disclosure changes any published index value, any formula parameter,
> or any eligibility rule; the change is additive documentation on a
> hard-limit surface, and its purpose is to close IOSCO Principle 7 and 8
> gaps by owning a specific and defensible classification rather than leaving
> the classification implicit. We accept the risk that some readers will
> parse the disclosure as an admission of weakness; we prefer proactive
> disclosure in our own words over reactive disclosure in a licensee's
> counsel's memo. Committee elects Option A (documentation clarification, no
> version bump) / Option B (v1.0.1 bump, 30-day notice, dry-run of the P12
> procedure): __________. Voted: <yes/no>, Carlos Galindo Dumitrescu, on
> 2026-__-__."

## Closing

After this proposal is approved (PR merged):

- Mark `docs/research/gaps/iosco-principles.md` rows **P7** and **P8** as
  substantially closed by this PR (Track B and Track C remain open under P7).
- Add a short entry to `docs/decisions.md` under a new heading "Published-quote
  self-classification + input hierarchy on /methodology (added 2026-__-__)"
  linking to this proposal and the merged PR.
- Update the rolling priority queue in `iosco-principles.md`: this PR removes
  items P0/#4 and P1/#7 (they were the same edit). P0 remaining after merge:
  P3/P5 (COI + single-administrator disclosure), P1 (name the Committee
  member), P16 (complaints email + SLA).
- The next-session natural follow-up is the **P0 COI + single-administrator
  disclosure** (also a `/methodology` edit; deserves its own proposal), or
  the **P12 dry-run** if Committee chose Option A here (needs its own
  inert-version-bump proposal).

---

*This proposal follows `docs/research/proposals/_TEMPLATE.md`. Sections that
the template marks REQUIRED for methodology-class proposals (empirical
backtest, ±10% sensitivity, false-positive/false-negative rate) are explicitly
addressed in §"Empirical impact" as "not applicable — no methodology
parameter changes"; the byte-identity invariant is the equivalent empirical
signal for a documentation-class proposal.*
