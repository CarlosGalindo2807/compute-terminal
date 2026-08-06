# Proposal: `/methodology` — self-classify as a published-quote benchmark and publish the data-input hierarchy

| | |
|---|---|
| **Date** | 2026-08-06 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs — but the target is a hard-limit surface (`apps/web/app/methodology/page.tsx`), so this follows the methodology-change proposal procedure per the charter. **No change to `PUBLISHED_METHODOLOGY`, `index-calculator.ts`, `outlier-detector.ts`, or any migration.** No new row in `methodology_versions`. Bit-identical numbers before and after. |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (add two new subsections). No code / no constant / no migration changes. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member) |
| **Effective date if approved** | 2026-09-05 — merge date + 30 days, following the standard notice procedure on `/methodology`. Zero-impact rationale for a shortened notice is discussed in §Migration; the recommendation is to keep the standard 30 days regardless, to build institutional muscle on the change procedure ahead of the first real methodology change. |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs); EU BMR Regulation (EU) 2016/1011 Article 11(1)(a)–(c) and Article 11(3)(d); gap matrix rows P7 and P8; research note `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`. |

## Problem

CTI v1.0 publishes a formula, an outlier filter, an eligibility floor, a quorum
rule, and a change-control procedure — but it does **not** publish the two most
load-bearing regulatory disclosures for a benchmark of a market with no public
trade tape:

1. **What class of input data drives the number.** IOSCO Principle 7 requires
   inputs to be "**anchored by observable transactions entered into at arm's
   length between buyers and sellers**." Every `price_snapshots` row today is a
   scraped *offer* — a provider's published ask — not an observed trade.
   On-demand cloud compute has no public consolidated tape. This is
   substantively defensible (see §"Why this is the right shape") but is
   currently *undisclosed*, which is a worse posture than either overclaiming
   or honestly self-classifying.
2. **The hierarchy of data inputs and the treatment of expert judgment.** BMR
   Article 11(3)(d) requires the administrator to "*draw up and publish clear
   guidelines regarding the types of input data, the priority of use of the
   different types of input data and the exercise of expert judgment*." IOSCO
   Principle 8 requires the same. CTI's hierarchy is implicit in code
   (rule → alias → fuzzy → Claude auto → admin queue → outlier check →
   eligibility check → VWAP) and enforces **zero expert judgment in the
   published-number path** — a genuinely strong position — but is nowhere
   stated on `/methodology`.

The gap-matrix rows are P7 (`partial / structurally weak`, priority P0) and P8
(`partial`, priority P1 but bundled into the same edit). Both were identified
in the first index-architect note (2026-05-10) and diagnosed in depth in the
third-run note (2026-05-12), which recommended a single combined proposal as
"the most valuable single deliverable" for the next session. This is that
proposal.

Because `apps/web/app/methodology/page.tsx` is on the hard-limit list, the
charter requires a written proposal + committee review before the page can be
edited. That protection exists to prevent silent drift of what the index means;
this proposal *strengthens* what the page says the index means, but goes
through the same door.

## Proposed change

Add two new subsections to `apps/web/app/methodology/page.tsx`, placed between
the existing "Quorum" subsection and the "Index Committee" section. The two
subsections share a top-level heading "Data inputs" so they read as a single
coherent block. Below is the exact page text to render, in prose form — the JSX
markup at merge time follows the existing page's `<h2>` / `<h3>` / `<p>` /
`<div className="mono ...">` conventions and is not a design change.

### Subsection 1 — "Data inputs: classification"

Rendered under a new `<h2 className="display text-2xl">Data inputs</h2>`
grouping, first `<h3 className="display mt-10 text-xl">Classification</h3>`:

> The Compute Terminal Index is a **published-quote benchmark**. Its inputs
> are firm, executable on-demand list prices captured directly from provider
> endpoints — the same prices a buyer would pay if they clicked "rent" at the
> moment of capture. These inputs are quotes, not observed trades: on-demand
> compute has no public consolidated transaction tape, and no such tape exists
> for any on-demand cloud service today.
>
> The benchmark is nonetheless anchored in a genuine arms-length cash market
> for GPU-hours. Vast.ai, RunPod, Lambda and the hyperscalers transact
> GPU-hours continuously at arm's length between independent buyers and
> sellers; every input to CTI is a firm, click-executable offer from that
> market. This is the substance IOSCO Principle 7 requires, and it matches
> the treatment EU Benchmarks Regulation Article 11(1)(c) gives to
> **committed quotes** — "*input data which is not transaction data may be
> used, including estimated prices, quotes and committed quotes, or other
> values*" — where transaction data is unavailable or inappropriate.
>
> No expert judgment enters the published-number path. Every published value
> is a deterministic function of the eligibility-filtered snapshot set and the
> `filtered_vwap` formula above; there is no discretionary override, no
> submitter panel, and no smoothing.
>
> **Roadmap to transaction anchoring.** The `invoice_observations` table
> (introduced in migration 011 for anonymised real-paid prices by
> provider × GPU × spend band × contract type) is the designed home for
> observed-transaction data. Once its ingestion pipeline is live, CTI will
> publish a periodic reconciliation between the list-price index and the
> median observed effective price from invoices — a validation anchor, not a
> methodology input, that does not affect the published `vwap`. Admitting
> observed prices as an input class in a future methodology version would be
> a `v1.x` change under the standard 30-day Committee procedure.

### Subsection 2 — "Data inputs: hierarchy"

Under the same `<h2>Data inputs</h2>`, second
`<h3 className="display mt-10 text-xl">Hierarchy</h3>`. Rendered as an
ordered list of ingestion stages, each with the deterministic rule that
applies:

> Each captured offer traverses this hierarchy in order. Every step is fully
> deterministic; there is no discretionary override at any stage.
>
> 1. **Scrape.** Each provider's published price endpoint is captured on a
>    fixed schedule (5-minute cadence for the TypeScript-native scrapers,
>    hourly for the Python fallbacks). Offers are schema-validated against a
>    Zod parser before persistence; a parse failure drops the row and emits
>    a `scraper_run_failed` event.
> 2. **Normalization — rule / alias / fuzzy.** GPU-model strings are resolved
>    against the catalog: first by exact rule match, then by curated alias,
>    then by string-similarity fuzzy match. A resolved string persists as
>    `normalization_rule` for future exact matching. Failures fall through
>    to the next stage.
> 3. **Normalization — Claude (assisted, gated).** Unmatched strings drain
>    hourly through a Claude batch call. Model confidence `≥ 0.95` writes an
>    auto-approved `normalization_rule` and back-fills the source snapshot.
>    Confidence in `[0.70, 0.95)` queues the string at `/admin/unmatched`
>    for one-click human approval. Confidence `< 0.70` is dropped. The
>    published-number path never depends on an unapproved row — until a
>    string is either auto-resolved (`≥ 0.95`) or manually approved, its
>    snapshots are excluded from `E_t`.
> 4. **Outlier check (MAD-3σ, per GPU model, per hour).** Every 15 minutes,
>    the outlier detector writes `is_outlier=true` on any snapshot whose
>    price deviates from the per-GPU-model hourly median by more than three
>    median absolute deviations. Flagged snapshots are excluded from `E_t`.
>    Flag reasons are preserved per snapshot.
> 5. **Provider eligibility.** Providers with
>    `reliability_score < 0.5` are excluded entirely from `E_t`. Reliability
>    is computed from observed scrape-success rate and outlier ratio, with
>    automatic decay on `outlier_ratio > 30%` and automatic recovery after
>    7 days of stable behavior. No manual override.
> 6. **Quorum.** If `|E_t| < 5` for a given index, no value is published for
>    that day. No extrapolation, no last-value carry-forward, no fallback
>    formula. An `index_value_skipped` event is written to `system_events`.
> 7. **Volume-weighted average (`filtered_vwap`).** The published value is
>    the `num_gpus`-weighted mean price over the surviving `E_t`, per the
>    formula above.
>
> Expert judgment is used exclusively in the *catalog-maintenance* branch
> — step 3's human queue (whether an unrecognized string represents a real
> GPU model and how to normalize it) and the Committee's quarterly review of
> the formula itself (per the Index Committee section below). It is never
> used in the published-number path once a snapshot has been captured and
> normalized.

**Placement.** Both subsections live under a single new `<section>` block
titled "Data inputs" inserted between the existing "Quorum" subsection and the
"Index Committee" section. No existing paragraph on the page is deleted or
reordered. The version-history table at the bottom of the page does **not**
gain a new row (there is no methodology-version change).

**Downstream artifacts.** Two follow-on items become naturally tractable once
this text ships and can be included in the same PR or a follow-up PR at the
Committee's option:

- Add a one-paragraph note on `/methodology` that Principle 14 (Submitter Code
  of Conduct) is `n/a` — CTI has no Submitters in the LIBOR sense; inputs are
  scraped, not submitted. (Gap-matrix row P14, priority P1.)
- Add a one-paragraph note that Principle 19 (Cooperation with regulatory
  authorities) is `not-yet-applicable` — CTI is not currently an
  ESMA-registered or FCA-supervised benchmark. (Gap-matrix row P19, priority
  P1.)

Both are included in this proposal for the Committee's decision (accept
inline vs. defer to a follow-up docs PR). They are one-line additions
and do not warrant a separate proposal.

## Why this is the right shape (vs. alternatives)

Three alternatives were considered.

**Alternative A — Claim unqualified P7 compliance and stay silent on the
classification.** *Rejected.* This is the current posture and it is the worst
of the available options. A strict IOSCO or ESMA reviewer will read
`/methodology`, notice that nothing on the page says whether the inputs are
trades or quotes, and press. Silence is read as either uninformed ("they
don't know the distinction") or evasive ("they know and are hiding it").
Comparable-benchmark administrators publish their input classification
prominently precisely to close this attack surface on themselves — the LBMA
Gold Price FAQs open with "the price is set through an electronic auction
… tradeable at that price", the Baltic Exchange *Guide to Market Benchmarks*
opens with the panel-assessment mechanism.

**Alternative B — Wait for the `invoice_observations` pipeline to ship and
promote invoice data to the primary input class before disclosing anything.**
*Rejected.* This inverts the correct order. The `invoice_observations`
pipeline is a several-quarter build (redaction contracts with cooperating
buyers, statistical de-anonymization defenses, secure ingest). Publishing the
disclosure only after invoice data exists means we go 6–12 months with the
existing gap open and one more surprise for anyone reading the page today.
The correct sequence is disclose-then-improve: state honestly what we do
today, describe the path to observed-transaction anchoring, and ship the
anchor when it exists. This mirrors how ICE Benchmark Administration handled
the LIBOR-to-SOFR transition (announced the classification limitation first,
built the alternate anchor over years).

**Alternative C — Add a light disclaimer ("prices are indicative") without
publishing a full data-input hierarchy.** *Rejected.* This is the classic
under-disclosure trap. Calling firm executable list prices "indicative" is
inaccurate — they are firm, click-executable committed quotes in the BMR
Article 11(1)(c) sense — and would undersell the substance of what we have.
Publishing the full hierarchy is *cheaper* (it's descriptive, not
argumentative) and closes both P7 and P8 in one edit rather than leaving
P8 open for a second round.

The chosen shape — a precise self-classification as a **published-quote
benchmark** plus the full **hierarchy of data inputs** — is the same shape
several IOSCO-compliant benchmarks use:

- **Oil PRAs (Platts, Argus)** publish their Market-on-Close methodology and
  explicitly state that bids and offers are blended with transactions and
  weighted per the published methodology. On illiquid grades, bids/offers
  dominate on any given day; the classification is disclosed rather than
  hidden.
- **Baltic Exchange freight indices** publish that inputs are panellist
  assessments (an even lighter input class than firm quotes) and rely on
  input-governance disclosure — panellist code of conduct, submission-window
  definitions, monthly "Operational Benching" audits — for their
  IOSCO/BMR-compliant status. Baltic-cleared FFAs settle on this.
- **LBMA Gold Price** publishes the auction mechanism verbatim; the price
  *is* a transaction, and the disclosure is used to distinguish the fix from
  ordinary spot quotes.
- **NCREIF Property Index / MSCI-IPD real estate** publish the appraisal
  methodology and defend "economic reality" as satisfying BMR 11(1)(a)
  through discipline of the estimation process rather than trade purity.

CTI's substance is closer to the LBMA and PRA end of the spectrum than to
Baltic — the "submitters" are the providers' own price endpoints, captured
mechanically, schema-validated, and outlier-filtered, which is a *stronger*
input governance regime than a human panellist submitting a subjective
assessment. The disclosure catches up to that reality.

## Empirical impact

This proposal changes zero numbers.

- **`PUBLISHED_METHODOLOGY` constant:** unchanged. `formulaId='filtered_vwap'`,
  `windowHours=24`, `minObservations=5`, `outlierFilter='mad_3_sigma'`,
  `weight='num_gpus'`, `reliabilityFloor=0.5`. All bit-identical.
- **`methodology_versions` table:** no new row. `PUBLISHED_METHODOLOGY_VERSION`
  stays at `v1.0`. `methodology.test.ts` continues to pass unmodified.
- **`index_values_daily.vwap` for any past or future date:** bit-identical.
  A backtest is not applicable because the calculation is unchanged.
- **Public API responses:** unchanged.
- **The rendered `/methodology` page:** gains one new `<section>` with two
  `<h3>` blocks, ~600 words of prose, no new components, no chart, no data
  fetch. Vercel build size delta: ~4 KB gzipped. No runtime change.

The empirical signal that says "this works" is:

1. The `methodology.test.ts` lock test still passes (asserts on the constant,
   not the page).
2. The page renders in preview at the correct location (between "Quorum" and
   "Index Committee") without regressing the version-history table's data
   fetch.
3. `pnpm -r typecheck` passes across all 7 workspaces (docs change touches
   JSX only, no imports or types).

The empirical signal that says "this doesn't change anything that shouldn't
change" is the standard `filtered_vwap` daily sanity check the calculator
already runs — the pre-merge and post-merge published values for a given
snapshot set are identical, because the calculator does not read
`/methodology`.

## Risks

**Immediate risks — very low, all reversible.**

- **Rendering / JSX error.** Mitigated by the standard PR-preview flow;
  Vercel's preview build will fail the check before merge.
- **Wording chosen for the classification is subtly overclaiming or
  underclaiming.** Mitigated by the specificity of the language ("firm,
  executable on-demand list prices"; "committed quotes … per Article
  11(1)(c)") and by Committee review as the last gate. Any word Carlos
  wants tightened is a one-line edit in the PR review round.
- **The 30-day notice interacts with in-flight licensee conversations.**
  There are no active licensee conversations today; if one starts between
  merge and effective date, the pending change is discoverable on the page
  itself (a licensee reading the page sees "effective 2026-09-05: …") which
  is the entire point of the notice period. Positive signal, not risk.

**Second-order risks — worth naming.**

- **Codifying "published-quote benchmark" makes a future move to a hybrid
  transaction+quote input class more disruptive.** *Mitigated in the
  proposed text.* The "Roadmap to transaction anchoring" paragraph explicitly
  reserves the option, describes `invoice_observations` as the designed
  home, and frames a future v1.x change as the standard 30-day path. The
  disclosure names the destination without prematurely claiming it.
- **A licensee lawyer reads "no expert judgment in the published-number path"
  as an unbounded warranty.** *Mitigated by scope-limiting language.* The
  proposed text says "in the published-number path once a snapshot has been
  captured and normalized" — expert judgment in *catalog maintenance*
  (step 3's admin queue) and in the *quarterly formula review* is explicitly
  named as expert judgment. A licensee is not misled about where humans
  touch the pipeline.
- **Under-classification of Vast.ai's `time_remaining` fields as
  "transaction-proximate" signals.** *Deferred, not risked.* The 2026-05-12
  note flagged utilisation-derived weighting as a research-note-worthy
  future signal. This proposal deliberately does not commit to using it;
  admitting it later would be a methodology change under the standard
  procedure. Silence on it is the correct disclosure today.
- **Publishing the full ingestion hierarchy tips design details to a
  malicious scraper-poisoning actor.** *Not a real risk in shape.* Every
  stage in the hierarchy is defended by property (schema validation,
  outlier filter, reliability decay, quorum) rather than by obscurity.
  Making the design explicit does not reduce defense.
- **Overclaim risk on Principle 14 / 19 addenda if included.** *Mitigated by
  the split.* The proposal makes the P14 / P19 addenda an explicit Committee
  decision (accept inline vs. defer), so overclaim risk cannot arise by
  omission — either it's decided and reviewed, or it's deferred to a labeled
  follow-up.

## Migration / rollout plan

This proposal follows the **standard methodology-change rollout**, even
though it doesn't change the methodology, for two reasons: (a) the
`/methodology` page is on the hard-limit list precisely so its text is
protected by the same discipline as the constants, and (b) the first real
methodology change will land in coming quarters, and using this
zero-empirical-impact edit as the dry run builds Committee muscle on the
procedure without any market risk.

**Timeline.**

- **Day 0 (proposal PR merged).** This document (proposals/2026-08-06-…md)
  lands on `main` via PR reviewed by @CarlosGalindo2807. Gap-matrix rows
  P7 and P8 are updated to point to this proposal. The 30-day public
  notice clock starts.
- **Day 0 (same PR).** The `/methodology` page is *not* edited in the same
  PR. Docs-only PR structure: proposals directory + gap-matrix update
  only.
- **Day 0 (Committee decision on P14 / P19 addenda).** Carlos, as sole
  founding member, records the decision (accept-inline vs. defer) in this
  proposal's Closing section and in the eventual `committee-minutes/`
  entry that will land under gap-matrix row P18.
- **Day 30 (2026-09-05).** A follow-up PR (`index-architect:
  /methodology — publish data-input classification + hierarchy`) edits
  `apps/web/app/methodology/page.tsx` with exactly the text agreed here,
  merges without a further Committee decision (Carlos's approval is
  recorded here), and the change is live. No new `methodology_versions`
  row; existing lock test still passes.
- **Day 30 (same PR).** Update `docs/decisions.md` with the entry "P7 / P8
  data-input classification + hierarchy published on `/methodology`" and
  the effective date.
- **Day 30 (rollback plan).** Trivial `git revert` of the day-30 PR
  restores the prior page text. The classification is not baked into any
  API, contract, or licensee doc between day 0 and day 30, so revert
  costs are near zero.

**Deploy signals to monitor after the day-30 merge.** None specific to
this change. Standard Vercel deploy health, `/methodology` renders,
`methodology.test.ts` still passes. Nothing writes to
`system_events` on this path.

**Shortened-notice consideration (recommended not taken).** IOSCO Principle
12 and BMR Article 13 allow shortened notice for changes that are
non-material to the benchmark determination — a disclosure clarification
that changes no number qualifies. The temptation is a 14-day track. The
recommendation is to **keep the standard 30 days** because the value of
the first end-to-end run through the procedure is worth more than the
15 days of calendar time saved, and because a shortened-notice track for
`/methodology` edits would itself require a separate proposal to define
the "non-material" test cleanly. If the Committee prefers 14 days for
this specific proposal on the grounds of zero empirical impact, that
is a defensible call to record here — but the default recommendation is
30 days.

## Committee deliberation prompt

> "We are formally classifying the Compute Terminal Index as a
> **published-quote benchmark**, anchored in the arms-length cash market for
> on-demand GPU-hours but constructed from firm executable list prices
> rather than observed transactions, and are publishing the full
> data-input hierarchy that determines which offers reach `E_t`. This
> converts an undisclosed structural feature into a stated design position
> and closes IOSCO Principles 7 and 8 (BMR Article 11(1)(c) and
> Article 11(3)(d)) in a single edit. No published value changes; the
> `PUBLISHED_METHODOLOGY` constant is unmodified; the `methodology_versions`
> table gains no row. Rollout uses the standard 30-day notice as a dry run
> for future material changes. Voted: <yes/no>, Carlos Galindo Dumitrescu,
> on 2026-08-__."

## Closing

After this proposal is approved (PR merged):
- Update `docs/research/gaps/iosco-principles.md` row P7 status from
  `partial / structurally weak` to `partial — disclosure proposal merged,
  effective 2026-09-05` and add the merged PR link.
- Update row P8 from `partial` to `partial — disclosure proposal merged,
  effective 2026-09-05`.
- Move rolling-priority-queue item 4 from P0 ("write the proposal") to
  P0-in-flight ("proposal merged; awaiting day-30 page edit").
- On day 30 (2026-09-05), the follow-up page-edit PR merges and both P7 and
  P8 statuses move to `substantially compliant on disclosure; transaction
  anchoring remains a P1 infra roadmap item under invoice_observations`.
- Add a new entry to `docs/decisions.md` on day 30: **"CTI classified as
  published-quote benchmark per IOSCO P7 / BMR Art 11(1)(c) — full
  data-input hierarchy published"** with the effective date and merged PR
  link.

**Committee decisions requested from @CarlosGalindo2807 in the PR review:**

1. **Accept the classification wording** ("published-quote benchmark") or
   propose alternate wording that better tracks house style. Recommendation:
   accept as written; the phrase matches the LBMA/BMR usage precisely.
2. **Accept the hierarchy's step-3 characterization** ("assisted, gated")
   for the Claude-normalization stage. This is the phrase most likely to
   trigger reviewer questions later; getting it right now is cheaper than
   rewording after publication.
3. **Decide on the P14 / P19 addenda:** accept inline in the day-30 page
   edit, or defer to a labeled follow-up docs PR. Recommendation: accept
   inline — both are one-paragraph disclosures whose absence is currently
   noted in the gap matrix, and bundling costs nothing.
4. **Confirm 30-day rollout vs. 14-day shortened notice.** Recommendation:
   30 days — dry-run value.
5. **Record the vote** using the deliberation prompt above; this becomes
   the first entry in the eventual `committee-minutes/` directory.

---

**PR link (to be added on merge):** _<to be filled by the merge author>_

*This proposal lives at `docs/research/proposals/2026-08-06-methodology-published-quote-self-classification.md`.
Copy of the /methodology page text to render on day 30 is in §"Proposed change"
above — treat it as the authoritative source when the day-30 edit PR is
prepared.*
