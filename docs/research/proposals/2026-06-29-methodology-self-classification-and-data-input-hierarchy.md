# Proposal: Self-classify CTI as a *published-quote benchmark* and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-06-29 |
| **Author** | index-architect (fourth run) |
| **Risk class** | governance / docs (hard-limit surface — `/methodology` page) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx`, `packages/shared/src/methodology.ts` (semver bump only, no formula change), `packages/db/migrations/015_methodology_v1_0_1.sql` (new `methodology_versions` + `methodology_changes` row) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole Index Committee member, v1.0) |
| **Notice posted** | <merge date, set on PR merge> |
| **Effective date if approved** | <merge date + 30 days> — i.e. the new subsections render on `/methodology` *and* `methodology_versions` flips to `v1.0.1` effective on the same day, per the Committee charter Step 3 (30-day public notice) |
| **References** | IOSCO FR07/13 Principles 7 (Data Sufficiency) & 8 (Hierarchy of Data Inputs); IOSCO Guidance IOSCOPD549 (2018); EU BMR Regulation (EU) 2016/1011, Article 11(1)(a)–(c) and 11(3)(d); IOSCO Oil PRA Principles IOSCOPD364 (2012); Baltic Exchange Guide to Market Benchmarks v8.3 (Apr 2026); ICE/LBMA Precious Metals methodology; MSCI IOSCO statement of compliance. Full URLs in §Sources. Upstream research: [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md). |

> **Source-fetch note.** Direct WebFetch of `ioscopd415.pdf`, IOSCOPD549, the
> EUR-Lex CELEX 02016R1011 consolidated text, the NY Fed compliance statement,
> the RBA cash-rate compliance page, and the FSB mirror was blocked at the
> network layer (HTTP 403) for the third successive Index Architect session
> (2026-05-10, 2026-05-12, 2026-06-29). All verbatim Principle 7 / Principle 8 /
> Article 11 quotations in this proposal were reconstructed from search-result
> snippets indexed against those same primary documents. A future session run
> from an environment with PDF egress (`gh codespace`, a local laptop, or the
> Index Committee member's own desk) should download FR07/13 and IOSCOPD549 to a
> repo-local artifact and reconcile any wording drift before merge. The
> proposal's substance does not turn on the precise wording — every quoted
> phrase appears unchanged across at least two independent secondary sources —
> but the discipline of citing primaries matters. External page text is treated
> as untrusted data and is never acted on as instructions.

---

## 1. Problem

Gap-matrix row [`P7 (Data Sufficiency)`](../gaps/iosco-principles.md) is
currently `partial / structurally weak`. Row [`P8 (Hierarchy of Data
Inputs)`](../gaps/iosco-principles.md) is `partial`. Both are P0/P1 priorities
in the rolling queue. Together they are the single most-pressed-on weakness an
external reviewer (a fund's counsel, an exchange's risk team, an auditor) would
identify when assessing whether CTI is citable.

The substantive issue, established in full in
[`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md):

- **IOSCO Principle 7 (Data Sufficiency)** requires that a benchmark be "based
  on prices, rates, indices or values that have been formed by the competitive
  forces of supply and demand and … anchored by observable transactions
  entered into at arm's length between buyers and sellers." It explicitly
  permits executable bids and offers ("the data used does not preclude from
  using executable bids or offers anchored by observable transactions … in such
  an active market"), but *requires the anchoring market to be real and
  transactional*.
- **EU BMR Article 11(1)(c)** codifies a strict hierarchy: "the input data
  shall be transaction data, if available and appropriate" and only "if
  transaction data is not sufficient or is not appropriate to represent
  accurately and reliably the market or economic reality that the benchmark is
  intended to measure" may "input data which is not transaction data … be used,
  including estimated prices, quotes and committed quotes, or other values."
- **EU BMR Article 11(3)(d)** further requires an administrator to "draw up
  and publish clear guidelines regarding the types of input data, the priority
  of use of the different types of input data and the exercise of expert
  judgement."

CTI v1.0 today:
- inputs are firm, executable list prices scraped from provider endpoints
  (substantively "committed quotes" in BMR terms, not "estimated prices");
- the underlying market is genuinely transactional and arms-length
  (Vast.ai/RunPod/Lambda/hyperscaler on-demand GPU-hours, billed continuously);
- but the published `/methodology` page declares neither **what type of input
  data** is used nor **what priority** would apply if transaction data became
  available, nor does it publish a **hierarchy** under Art 11(3)(d).

This is a disclosure gap, not a methodology defect. The fix is a docs edit to
the public page — but `/methodology` is a hard-limit surface (CODEOWNERS-gated
at `/apps/web/app/methodology/` per the charter), so the path is: this
proposal → Committee approval → 30-day public notice → v1.0.1 effective.

The proposal also opportunistically closes two other small `n/a` documentation
gaps from the same matrix at zero marginal cost on the same page edit:
- **P14** (Submitter Code of Conduct): n/a — inputs are scraped, not
  submitted. Currently undocumented as `n/a`.
- **P19** (Cooperation with regulatory authorities): n/a — CTI is not an
  ESMA-registered or FCA-supervised benchmark today. Currently undocumented.

Closing P7 + P8 + P14 + P19 in one /methodology edit, with one committee
review, is materially more efficient than splitting into four separate
notice cycles.

## 2. Proposed change

### 2.1. New page sections on `/methodology`

The proposal adds **four new subsections** to `apps/web/app/methodology/page.tsx`,
inserted *between* the existing "Quorum" subsection (line ~134) and the
existing "Index Committee" section (line ~138). The exact prose to ship — to be
pasted into the page by a follow-up implementation PR after this proposal is
approved:

#### 2.1.a. New subsection — "Data classification"

> **Data classification.** CTI is a *published-quote benchmark*. Its inputs
> are firm, executable on-demand list prices for GPU-hour rentals, captured
> directly from each provider's public price endpoint or pricing page. They are
> *committed quotes* in the sense of EU BMR Article 11(1)(c) — a buyer who
> arrived at the listed configuration during the snapshot window could have
> transacted at the listed price — not estimates, indications, or
> expert-judgment submissions.
>
> The underlying market is genuinely transactional and arms-length: on-demand
> GPU rental on Vast.ai, RunPod, Lambda and comparable venues clears
> continuously at competitive market prices between unrelated buyers and
> sellers. The economic reality CTI measures — the prevailing on-demand
> $/GPU-hour for a given GPU model — is therefore anchored in an active
> transactional market in the sense of IOSCO Principle 7. On-demand compute
> does not, however, have a public consolidated transaction tape, and CTI does
> not today observe individual trades. Where a transactional data source
> becomes available (see §Hierarchy of data inputs below), it takes precedence
> over executable quotes; the current absence of such a source is the reason
> CTI's inputs are quotes today.

#### 2.1.b. New subsection — "Hierarchy of data inputs"

> **Hierarchy of data inputs.** The administrator applies the following
> deterministic priority order when computing any published value. Higher-rank
> inputs displace lower-rank inputs of the same offer specification within the
> window `W_t`. No human judgment is exercised at any stage of input
> selection.
>
> 1. **Observed concluded transactions** in the underlying interest (a customer
>    paying a provider for an on-demand GPU-hour). *Not currently observed.*
>    The `invoice_observations` table (`packages/db/migrations/011_pivot_v2_schema.sql`)
>    is the designed home for this class. Ingest pipeline pending; see
>    roadmap §3.
> 2. **Observed concluded transactions in related markets** (for example,
>    cleared OTC compute forwards, if and when such a market emerges). *Not
>    currently observed.* `forward_curves` table reserves the schema.
> 3. **Executable committed quotes** — provider on-demand list prices captured
>    from public endpoints, schema-validated, normalised against the GPU
>    catalogue, outlier-filtered by MAD-3σ, and weighted by `num_gpus`. *This
>    is the input class used for every published CTI value as of v1.0.* These
>    quotes are the substance of `price_snapshots` rows where
>    `is_normalized = true` and `is_outlier = false`.
> 4. **Indicative quotes** (non-executable price indications, brokered
>    indications). **Not used.** CTI does not ingest indicative-only sources.
> 5. **Expert judgment.** **Not used.** No human discretion ever enters the
>    published-number path. If quorum (§Quorum above) is not met, no value is
>    published and an `index_value_skipped` event is recorded; CTI never
>    fills, extrapolates or substitutes.
>
> When an input becomes available at a higher rank than the rank used on the
> prior day for the same offer, the administrator must publish a methodology
> change under §Index Committee (Steps 1–4) before that input enters the
> published-number path. Adding a new input class is therefore a deliberate,
> noticed event — not a silent upgrade.

#### 2.1.c. New subsection — "Submitter Code of Conduct (P14)"

> **No Submitters.** CTI does not operate a submission-based model. All inputs
> are mechanically captured from public price endpoints by the scraping
> agents documented in §AI orchestration. There are no human Submitters in
> the sense of IOSCO Principle 14, and the principle's Submitter Code of
> Conduct requirements therefore do not apply. If CTI ever incorporates an
> input class that depends on third-party submissions (for example, cleared
> forward marks reported by a clearing partner), a Submitter Code of Conduct
> consistent with IOSCO Annex B will be drafted and published as part of the
> Committee notice introducing that input class.

#### 2.1.d. New subsection — "Regulatory status (P19)"

> **Regulatory status.** CTI is **not** today a regulated benchmark within the
> meaning of EU BMR (Regulation (EU) 2016/1011), UK BMR, or the equivalent
> regimes in Singapore (MAS), Hong Kong (SFC), Australia (ASIC) or Japan
> (FSA). The administrator is not registered with ESMA, the FCA or any
> equivalent authority. The methodology is published, version-locked, and
> change-controlled to align with the IOSCO Principles for Financial
> Benchmarks (FR07/13, July 2013) so that registration is available as a
> deliberate future step rather than a costly retrofit. The administrator
> will cooperate fully and proactively with any competent authority that asks
> about CTI; that commitment stands today, independent of registration
> status.

### 2.2. New `methodology_versions` row — `v1.0.1`

A new row in `methodology_versions`:

| column | value |
|---|---|
| `version` | `v1.0.1` |
| `formula_id` | `filtered_vwap` (unchanged) |
| `formula_params` | unchanged (`{"window_hours":24,"min_observations":5,"outlier":"mad_3_sigma","weight":"num_gpus","reliability_floor":0.5}`) |
| `effective_from` | merge date + 30 days |
| `effective_to` | NULL |
| `rationale` | `Disclosure-only annotation: adds data-classification and hierarchy-of-data-inputs disclosures to /methodology per IOSCO P7/P8 and EU BMR Art 11. No change to the published number. No backtest required because the formula is unchanged. See proposal docs/research/proposals/2026-06-29-methodology-self-classification-and-data-input-hierarchy.md.` |
| `approved_by` | `Carlos Galindo Dumitrescu (sole founding Index Committee member, v1.0)` |
| `approved_at` | PR merge timestamp |
| `document_url` | URL of merged PR |

A companion row in `methodology_changes`:

| column | value |
|---|---|
| `from_version` | `v1.0` |
| `to_version` | `v1.0.1` |
| `change_type` | `disclosure_annotation` (semver patch — no formula change) |
| `effective_from` | merge date + 30 days |
| `notice_posted_at` | merge timestamp |
| `summary` | `Adds Data classification + Hierarchy of data inputs + P14/P19 non-applicability subsections to /methodology. Closes IOSCO P7, P8, P14, P19 gaps. Published number is unchanged.` |

Shipped via a new migration `packages/db/migrations/015_methodology_v1_0_1.sql`
(only INSERT statements — no schema changes). Migration 015 lands in the same
PR as the page edit.

The existing `methodology.test.ts` lock test continues to assert the v1.0
constant; it is **not** modified — see §5 Risks. A `PUBLISHED_METHODOLOGY_VERSION`
constant bump to `'v1.0.1'` accompanies the page change, because the version
shown on the page banner must match the row in `methodology_versions` that is
in force. The lock test is updated to assert `'v1.0.1'` *as a single-line edit
guarded by this proposal*; no other field in `PUBLISHED_METHODOLOGY` is
touched.

### 2.3. Gap-matrix updates

After merge, [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md)
rows P7, P8, P14, P19 flip from `partial`/`gap`/`n/a` to `compliant` (P7 retains
`partial` on the *transaction anchor*, but moves the disclosure-side gap to
closed; the open work is Track B / Track C from the upstream note). The
companion edit is included in the same PR.

### 2.4. What this proposal does **not** do

To make the scope unambiguous:

- **Does not change the formula.** `filtered_vwap` v1.0 stays exactly as
  written in `packages/shared/src/methodology.ts`. `windowHours=24`,
  `minObservations=5`, `outlierFilter='mad_3_sigma'`, `weight='num_gpus'`,
  `reliabilityFloor=0.5` — all unchanged.
- **Does not change what is written to `index_values_daily.vwap`.** Every
  daily row computed before and after the effective date uses the same
  inputs, the same outlier filter, the same eligibility floor, the same
  quorum, the same weighting.
- **Does not introduce a new input class.** `invoice_observations` remains
  empty; the hierarchy text describes what *would* happen if it were
  populated, but populating it requires a separate v1.x methodology change
  with its own backtest. (Track B in the upstream note.)
- **Does not change quorum.** Track C (provider-count-scaled quorum) is a
  separate future v1.x proposal, blocked on the read-only backtest queued
  for the next session.
- **Does not modify `methodology.test.ts` semantics.** The only edit is
  swapping the asserted version string from `'v1.0'` to `'v1.0.1'` — the
  lock-test discipline is preserved.

## 3. Why this is the right shape (vs. alternatives)

An MSCI methodology revision committee would consider at least three
alternatives. They are:

### Alternative A — *Do nothing.*
Leave `/methodology` as-is. Rely on the in-repo research note for any
licensee or auditor who presses on P7/P8.
- **Why rejected.** The first time a serious institutional reviewer reads
  `/methodology` they will draw the wrong conclusion (either "this is an
  unqualified P7 claim and it's wrong" or "this is silent on P7 so it's
  unclaimed and unusable"). Either interpretation kills a conversation. The
  public page is the document of record; the research note is not. Doing
  nothing converts a documentation gap into a credibility incident on first
  contact.

### Alternative B — *Overclaim full P7 compliance now.*
Add a single line: "CTI complies with IOSCO Principle 7."
- **Why rejected.** This is the LIBOR mistake — claiming a compliance
  property the data does not support. IOSCO's own 2018 Guidance (IOSCOPD549)
  emphasises that proportionality does **not** relax the transaction-anchoring
  requirement, and an unqualified claim invites a refutation that becomes
  expensive to walk back. A precise self-classification ("published-quote
  benchmark anchored in an arms-length transactional market") is both more
  defensible and *more useful* to a reviewer than a vague compliance
  assertion.

### Alternative C (chosen) — *Self-classify precisely and publish the
hierarchy.*
The Baltic Exchange / LBMA / oil-PRA pattern of *owning the limitation*.
- **Why chosen.** Three reasons. First, it converts the most-pressed-on
  weakness into a stated, defensible design position before any external
  conversation surfaces it — exactly the recommended response in the
  upstream note (§4 Track A). Second, it directly satisfies BMR Art 11(3)(d)'s
  publish-the-hierarchy obligation, closing P8 in the same edit as P7. Third,
  it costs only a docs change and a semver-patch version row — the cheapest
  possible vehicle for closing two P0/P1 gaps simultaneously, and it
  exercises the v1.0 change-control machinery end-to-end (closing the
  "compliant in design, untested" qualifier on row P12 as a side effect).

### Alternative D considered — *Publish the hierarchy but skip the
self-classification.*
Add the hierarchy text from §2.1.b but omit the §2.1.a "published-quote
benchmark" framing.
- **Why rejected.** The two halves reinforce each other. The hierarchy text
  alone is informative but reads as descriptive; the self-classification gives
  the reviewer the *category* CTI fits into, after which the hierarchy reads
  as the implementation of that category. Splitting them halves the leverage
  of the page change without proportionate risk reduction.

### Alternative E considered — *Wait until `invoice_observations` is
populated and ship Tracks A and B together.*
- **Why rejected.** Track B (invoice ingest pipeline + reconciliation report)
  is at minimum a quarter of engineering work and depends on customer
  pipelines that don't exist yet. Track A is shippable today and unblocks the
  first institutional conversation. There is no architectural benefit to
  withholding the disclosure until the transaction layer exists — the
  hierarchy text already names invoices as the rank-1 input, so when they
  arrive the documentation is in place.

## 4. Empirical impact

This is a docs change — no number written to `index_values_daily.vwap`
changes. The empirical signal that says "this works without changing
anything that shouldn't change" has three parts.

### 4.1. No formula change → no backtest required, by construction

The locked constants in `PUBLISHED_METHODOLOGY` are byte-identical before and
after this proposal (the only edit is `version: 'v1.0'` → `version: 'v1.0.1'`).
`index-calculator.ts` reads `PUBLISHED_METHODOLOGY.formulaId` and the
remaining parameters; those are unchanged. The MAD-3σ filter, the
`num_gpus` weight, the `reliabilityFloor`, the `minObservations` quorum, the
24h window — all unchanged. By construction, the daily VWAP series is
unchanged.

### 4.2. Verification step bundled into the PR

The implementation PR (separate from this proposal) will:
1. Run `pnpm -r typecheck` — must pass.
2. Run `pnpm test --filter=workers` so `methodology.test.ts` exercises the
   version-string change (the only line modified) and confirms the rest of
   `PUBLISHED_METHODOLOGY` is unchanged.
3. Run the index calculator dry-run script
   (`scripts/recompute-index-day.mjs`, if extant; otherwise add a one-shot
   script that recomputes the most recent N days of `index_values_daily`
   under `v1.0.1` and diffs against the live rows). Expected diff: zero
   numeric difference; only `methodology_version` column flips from `v1.0`
   to `v1.0.1` on rows dated `effective_from` and after. Verified by a
   committed unit test in the PR.

### 4.3. Per-input-class coverage today

For the on-record audit trail, the share of each input class in today's
published number, taken from the most recent calendar day with full data:

| Rank | Input class | Snapshots used | Share of weight | Source |
|---|---|---|---|---|
| 1 | Observed transactions in underlying interest | 0 | 0 % | `invoice_observations` (empty) |
| 2 | Observed transactions in related markets | 0 | 0 % | `forward_curves` (empty) |
| 3 | Executable committed quotes | 100 % of inputs | 100 % | `price_snapshots WHERE is_normalized AND NOT is_outlier` |
| 4 | Indicative quotes | 0 | 0 % | n/a (not ingested) |
| 5 | Expert judgment | 0 | 0 % | n/a (not used) |

The implementation PR will populate this table from a live SQL query as of
the snapshot date and embed it in the migration `015` comment so the
percentages are an artifact of the v1.0.1 effective date, not a
copy-and-paste claim.

### 4.4. Side benefit — first end-to-end test of the change-control procedure

Gap-matrix row P12 currently reads `compliant in design, untested`. This
proposal is the test case: a real walk through Committee notice → 30-day
window → version bump → page update → migration → row in
`methodology_changes`. After the PR merges and the effective date passes,
P12 flips to `compliant`. That is the highest-leverage corollary of
shipping a disclosure-only v1.0.1: it converts the change-control story
from "we designed it this way" to "we've done it once."

## 5. Risks

### 5.1. Narrowing legal defensibility of the v1.0 lock

**Risk.** A precise self-classification (`published-quote benchmark`,
`committed quotes` in Art 11(1)(c) terms) is a specific claim. If we later
discover the inputs are *not* substantively executable — for example, a
provider's listed prices are routinely stale or rejected on click — the
self-classification becomes a misstatement.
**Mitigation.** The classification language was chosen to be defensible
against the worst case. "Firm, executable on-demand list prices captured
directly from each provider's public price endpoint or pricing page"
describes what the scrapers actually do; it does not assert that *every*
listing is honoured at every moment. The follow-up Track B reconciliation
report (CTI list-price vs. observed invoice prices) is the empirical check;
if the report ever shows a systematic gap, that is a v1.x material-change
trigger, not a defensibility crisis.
**Residual risk.** Low. The class of "executable committed quotes" is the
class BMR Art 11(1)(c) explicitly contemplates; defending it is materially
easier than defending an unqualified P7 claim.

### 5.2. Inviting regulator attention before we are ready

**Risk.** Publishing the regulatory-status disclosure (§2.1.d) names
specific authorities. A national competent authority might read it and
either welcome the proactive transparency or pre-emptively raise the
question of whether registration is overdue.
**Mitigation.** The text is structured to invite the *first* outcome and
foreclose the second — it explicitly states CTI is not registered, why,
and that the methodology is *built* to be registration-ready. This is the
standard pattern in IOSCO statements of compliance by non-EU
administrators (RBA, NY Fed, MSCI). The risk of *not* disclosing is
materially worse: an unknowing licensee assumes regulation that doesn't
exist and is later surprised.
**Residual risk.** Low.

### 5.3. Wrong-shape version bump

**Risk.** Some interpretations of semver would not classify a
disclosure-only annotation as deserving a patch bump (`v1.0` →
`v1.0.1`); they might prefer `v1.0` with a `last_updated` field, or a
post-release tag.
**Mitigation.** The semver here is *index methodology* semver, not software
semver. The Committee charter says the version field on every
`index_values_daily` row is version-stamped so historical values remain
reproducible. A reader of a 2027 row that says `v1.0.1` should be able to
look up the exact disclosure text that was in force on the day the value
was computed. That requires a real row in `methodology_versions` with its
own `effective_from`, which in turn requires its own semver. Patch is the
correct level because the formula is unchanged; minor would suggest a
formula change.
**Residual risk.** Negligible; this is explicit in the charter Step 4 ("the
version field on every `index_values_daily` row is version-stamped, so
historical values remain reproducible").

### 5.4. Breaking the methodology lock test

**Risk.** `apps/workers/src/functions/methodology.test.ts` asserts that
`PUBLISHED_METHODOLOGY.version === 'v1.0'`. The implementation PR must
change one line in that test, and the charter is emphatic: "Disable or
modify it to 'make it pass' — never." A reviewer might (correctly) flag
the edit as a charter violation.
**Mitigation.** The intent of the lock-test prohibition is to prevent
silent drift on the *formula*, not the version label. The charter section
on "What you CAN implement directly" implicitly permits version-stamp
maintenance: "the version field on every `index_values_daily` row is
version-stamped, so historical values remain reproducible" is impossible
without periodic version-string updates. This proposal explicitly logs the
test edit as expected (and small, one line) so the reviewer can confirm
that the rest of `PUBLISHED_METHODOLOGY` is byte-unchanged. The PR diff
will make this auditable in 30 seconds.
**Residual risk.** Low if the implementation PR is mechanical and tightly
scoped. Mitigated further by the rule that this proposal-and-PR pair are
the only path through which the version string ever advances.

### 5.5. Downstream licensee assumptions

**Risk.** A hypothetical settlement contract written "against CTI v1.0"
becomes ambiguous after a v1.0.1 row exists.
**Mitigation.** No such contract exists today. The 30-day public notice
period is the standard insurance against this risk — anyone integrating
against CTI in the notice window sees the upcoming change. The contract
language convention that the Committee should publish in parallel (a
suggested clause: "References to CTI mean the value published in
`index_values_daily.vwap` on the date in question, stamped with the
methodology version in `methodology_version`") robustly handles all future
disclosure-only bumps without semantic ambiguity.
**Residual risk.** Negligible at the current licensee count (zero).

### 5.6. Hidden assumption about all five formulas

**Risk.** The "Hierarchy of data inputs" subsection (§2.1.b) describes a
hierarchy that applies to *the published methodology*. The nightly A/B
runs four other formulas (simple_vwap, trimmed_mean_10, median_weighted,
time_decay_vwap). If a Committee in 2027 switches `formulaId`, the
hierarchy text remains accurate (it's about input *selection*, not the
aggregation formula) — but a reader could conflate them.
**Mitigation.** §2.1.b is written about input selection only; the existing
"Formula" section on the page handles aggregation. The two are
deliberately separated in the new layout. The Committee should reread the
hierarchy text at every formula-change deliberation to confirm it stays
accurate.
**Residual risk.** Low.

## 6. Migration / rollout plan

Per the Committee charter on `/methodology` Steps 1–4 (with the
disclosure-only character of this change noted at each step):

| Step | When | What happens |
|---|---|---|
| 1. Research | done | This proposal + the upstream note + the gap-matrix row P7 update. |
| 2. Quarterly review | this proposal | The Committee deliberates this proposal as the v1.0.1 disclosure annotation. No formula candidates are competing; the deliberation is a single-question vote. |
| 3. Public notice | merge date | Implementation PR merges with the four new subsections added to `/methodology` rendered immediately as a *proposed* change. A new banner at the top of the page reads: "Proposed: v1.0.1 — disclosure annotation effective <date>. See version history." The `methodology_changes` row carries the same effective date. |
| 4. Effective date | merge date + 30 days | On the announced effective date, `PUBLISHED_METHODOLOGY_VERSION` flips to `'v1.0.1'` in code, the `methodology_versions` row's `effective_from` matches that date, and every new `index_values_daily` row from that date onwards stamps `methodology_version = 'v1.0.1'`. Historical rows retain `'v1.0'`. No values are recomputed. |

After merge, the implementation PR (separate from this proposal) does:
1. Add the four new `<section>` blocks to `apps/web/app/methodology/page.tsx`,
   structured to match the existing typographic conventions on the page.
2. Add a "Proposed change" banner that reads from `methodology_changes WHERE
   effective_from > now()` — this *also* satisfies roadmap item B8 (notice
   page for proposed changes) as a side benefit. A separate, smaller proposal
   may be needed if the banner work expands; if so, the disclosure banner for
   *this* change can be a hardcoded `<aside>` until the dynamic surface ships.
3. Update `PUBLISHED_METHODOLOGY_VERSION` constant from `'v1.0'` to `'v1.0.1'`.
4. Update `methodology.test.ts` assertion (one-line edit, as flagged in §5.4).
5. Add migration `015_methodology_v1_0_1.sql` containing only the
   `methodology_versions` INSERT and the `methodology_changes` INSERT.
6. Run `pnpm -r typecheck` and `pnpm test`; both must be green.
7. Open PR with `index-architect:` prefix, body links to this proposal,
   request review from @CarlosGalindo2807.

Rollback steps if anything goes wrong on the effective date:
- Revert the `PUBLISHED_METHODOLOGY_VERSION` constant in a hotfix PR.
- UPDATE the `methodology_versions` row to set `effective_to = now()` and
  the `methodology_changes` row to record the rollback reason.
- File a follow-up proposal explaining what triggered the rollback.

Monitoring after the effective date: a one-time check that
`index_values_daily.methodology_version` is `'v1.0.1'` on the rows dated
`>= effective_from`. Recorded in a `methodology_version_promoted` row in
`system_events`.

## 7. Committee deliberation prompt

> *On 2026-06-29 the Index Architect proposed a disclosure-only annotation
> bump from CTI v1.0 to v1.0.1. The annotation adds four subsections to the
> public `/methodology` page that (a) self-classify CTI as a published-quote
> benchmark whose inputs are committed quotes in the sense of EU BMR
> Article 11(1)(c), (b) publish the hierarchy of data inputs required by
> BMR Article 11(3)(d), (c) document IOSCO Principle 14 (Submitter Code of
> Conduct) as non-applicable because CTI does not operate a
> submission-based model, and (d) document the current regulatory status as
> non-registered with a proactive cooperation commitment. The formula is
> unchanged; no value written to `index_values_daily.vwap` changes; the
> 30-day public-notice procedure is followed in full. We are accepting a
> precise, defensible self-classification that exposes us to scrutiny on
> what we actually do, in exchange for closing the single most-pressed-on
> IOSCO weakness (Principle 7 / Principle 8) before any external licensee
> conversation surfaces it. We are also exercising the v1.0 change-control
> procedure end-to-end for the first time, which on its own promotes
> gap-matrix row P12 from "compliant in design, untested" to "compliant".
> Voted: <yes/no>, Carlos Galindo Dumitrescu (sole founding Index
> Committee member), on YYYY-MM-DD. Effective date: YYYY-MM-DD (notice
> date + 30 days).*

## 8. Closing

After this proposal is approved (PR merged):
- Implementation PR opens immediately; carries the new subsections, the
  constant bump, the test-line edit, and migration 015.
- Gap-matrix rows P7, P8, P14, P19 update to reflect the new state. P7
  remains `partial` on the transaction-anchor side (Track B / Track C
  still open), but its *disclosure* gap is closed. P8, P14, P19 flip to
  `compliant`. P12 flips to `compliant` after the effective date passes.
- `docs/decisions.md` gets a new entry under the heading "v1.0.1
  disclosure annotation (added YYYY-MM-DD)" capturing the rationale, the
  alternatives considered, and a link to the merged PR.
- The roadmap item B8 (notice page for proposed changes) is partially
  closed by the hardcoded banner in the implementation PR; the
  dynamic-banner version becomes a smaller follow-up issue rather than a
  greenfield item.
- This proposal's footer is updated with the merged-PR URL.

The next session can pick up either (a) Track C (provider-count-scaled
quorum) starting from the read-only backtest queued in the upstream note,
or (b) the highest remaining P0 row in the gap matrix — P3 / P5
(conflict-of-interest disclosure + single-administrator declaration) and
P16 (complaints procedure), both of which are short docs surfaces that
can ship under the same notice cadence.

---

## Sources

Primary regulatory texts (referenced by URL; direct WebFetch blocked HTTP
403 this session — see source-fetch note at the top):
- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13
  (IOSCOPD415), July 2013.
  https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf — Principle 7
  (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs), Annex B
  (Submitter Code of Conduct).
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*,
  IOSCOPD549, January 2018.
  https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf — clarifies
  that proportionality does not relax transaction anchoring.
- IOSCO, *Methodology for Assessing Implementation of the IOSCO
  Principles for Financial Benchmarks*, IOSCOPD562, December 2017.
  https://www.iosco.org/library/pubdocs/pdf/IOSCOPD562.pdf
- IOSCO/IEA/IEF/OPEC, *Functioning and Oversight of Oil Price Reporting
  Agencies*, IOSCOPD364, October 2012.
  https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input
  data). EUR-Lex CELEX 32016R1011.
  https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng — Article 11(1)(a)–(c)
  and 11(3)(d).
- ESMA Interactive Single Rulebook, Article 11.
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data

Comparable-benchmark compliance statements consulted:
- Federal Reserve Bank of New York, *Statement of Compliance with the
  IOSCO Principles for Financial Benchmarks*, July 2025.
  https://www.newyorkfed.org/medialibrary/media/markets/IOSCO-statement-of-compliance-jul2025
  — model of a precise, principle-by-principle disclosure.
- Reserve Bank of Australia, *Compliance with IOSCO Principles — Cash
  Rate Methodology*.
  https://www.rba.gov.au/mkt-operations/resources/cash-rate-methodology/compliance.html
- MSCI, *IOSCO Principles for Financial Benchmarks — Statement of
  Compliance hub*.
  https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco
- Stoxx Ltd., *Policy on Input Data Integrity*, 2023.
  https://www.stoxx.com/document/Resources/Regulation/stoxx_input_data_policy.pdf
  — example hierarchy publication under BMR Art 11(3)(d).
- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026.
  https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf
- ICE Benchmark Administration / LBMA, *LBMA Gold Price FAQs and
  Methodology*. https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price ;
  https://www.ice.com/iba/lbma-precious-metals

Internal references:
- `apps/web/app/methodology/page.tsx` — the page edited by the
  implementation PR (hard-limit, CODEOWNERS-gated).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY_VERSION`
  constant edited from `'v1.0'` to `'v1.0.1'` (hard-limit).
- `apps/workers/src/functions/methodology.test.ts` — one-line edit to
  the asserted version string (hard-limit).
- `packages/db/migrations/015_methodology_v1_0_1.sql` — new INSERTs only
  (hard-limit).
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` —
  the upstream research note; this proposal is its §4 Track A
  recommendation realised.
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` —
  the original IOSCO map that identified P7/P8 as the load-bearing gaps.
- `docs/research/gaps/iosco-principles.md` — rows P7, P8, P12, P14, P19
  updated in the same PR.
- `docs/decisions.md` — entry added after merge under "v1.0.1 disclosure
  annotation".
- `docs/roadmap.md` — item B8 (notice page) partially closed by the
  banner implementation in the follow-up PR.

---

*Merged PR: <fill in on merge>.*
