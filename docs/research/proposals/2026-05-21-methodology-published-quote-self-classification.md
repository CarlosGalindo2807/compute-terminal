# Proposal: Self-classify CTI as a "published-quote benchmark" and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-05-21 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs / governance — edits a hard-limit page (`/methodology`) but does **not** change `PUBLISHED_METHODOLOGY`, the formula, or any computed value. **Not** a methodology change in the 30-day-notice sense (see Rollout). |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit — CODEOWNERS-gated). **No** change to `packages/shared/src/methodology.ts`, `apps/workers/src/functions/index-calculator.ts`, `outlier-detector.ts`, `methodology.test.ts`, or any migration. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member; required by `.github/CODEOWNERS` for the `/methodology` page). |
| **Effective date if approved** | On merge. This is a clarifying disclosure of existing behaviour, not a change to any determination — the 30-day public-notice procedure for methodology changes does not apply (argued in Rollout; committee may elect to apply notice anyway). |
| **References** | IOSCO Principles for Financial Benchmarks (FR07/13) **Principle 7** (Data Sufficiency) and **Principle 8** (Hierarchy of Data Inputs and Exercise of Expert Judgment); EU BMR Regulation (EU) 2016/1011 **Art. 11(1)(c)** (input data; transaction data "if available and appropriate"; committed quotes), **Art. 11(3)(d)** (publish guidelines on types/priority of input data and expert judgement), **Art. 3** (definition of "expert judgement"). Primary URLs in Sources. |

---

## Problem

This proposal closes gap-matrix rows **P7** (Data Sufficiency) and **P8** (Hierarchy of
Data Inputs) in `docs/research/gaps/iosco-principles.md`, which are flagged P0 and P1
respectively and which the two prior research notes
([`2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md)
§B and [`2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
§4–5) identified as "the single most important methodological exposure" and "next
session's most valuable single deliverable."

The substance of the gap:

1. **P7 (Data Sufficiency).** Every CTI input is a scraped *listing* — a provider's
   published, executable ask for a GPU configuration — not an observed trade. IOSCO
   Principle 7 says benchmark data "should be anchored by observable transactions
   entered into at arm's length between buyers and sellers." A strict reviewer can
   press on this. The position is *defensible* (on-demand compute has no public
   consolidated transaction tape, and our inputs are firm executable quotes from a
   genuine arms-length cash market — substance several IOSCO-compliant benchmarks run
   on) but it is currently **undisclosed**. CTI does not yet say, on its public
   contract page, what kind of inputs it uses or why. Owning the limitation is the
   LBMA-fixing / Baltic-assessment / oil-PRA pattern; hiding it is the failure mode.

2. **P8 (Hierarchy of Data Inputs).** IOSCO Principle 8 and EU BMR Art. 11(3)(d) both
   require the administrator to **publish** clear guidelines on the types of input
   data, the priority of use among them, and the exercise of expert judgement. CTI's
   hierarchy exists in code (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude
   0.70–0.95 admin queue → outlier filter → eligibility floor → VWAP) and has **zero
   expert judgment** in the published-number path — a genuinely strong stance — but it
   is **implicit, not published**. The regulation wants it on the page.

Both gaps are closed by the same edit to the same page, which is why they ship together.

## Proposed change

Add **one new `<section>`** to `apps/web/app/methodology/page.tsx`, placed after the
Formula section (which currently ends with the "Quorum" subsection at ~line 134) and
before the "Index Committee" section (~line 137). The section has two subsections.
Below is the exact copy. It is written to slot into the page's existing prose style;
the implementing PR renders it with the same `<h2>` / `<h3>` / `<p className="...">`
classes already used on the page (no new components, no new dependencies).

> ### Nature of the inputs (published-quote benchmark)
>
> CTI is a **published-quote benchmark**. Its inputs are firm, executable on-demand
> list prices captured directly from each provider's own price endpoint — what a buyer
> would pay to rent that GPU configuration at the moment of capture. They are not
> indicative submissions and they are not estimates; in the language of EU Benchmarks
> Regulation Art. 11(1)(c) they are closest to *committed quotes*.
>
> On-demand GPU compute has no public consolidated tape of executed trades — no
> equivalent of an equity exchange print or a cleared-futures settlement record. The
> economic interest CTI measures is *the prevailing on-demand price a buyer faces for a
> given GPU model*, and for the on-demand segment the executable list price **is** that
> economic reality. The benchmark is anchored in a genuine arms-length cash market for
> GPU-hours: Vast.ai, RunPod, Lambda and the hyperscalers transact GPU-hours
> continuously and competitively. Where observed-transaction data becomes available
> (see *Hierarchy of data inputs* below and the invoice-observation work on the
> roadmap), it ranks above quotes in the hierarchy. Until then, executable quotes are
> the primary input — consistent with EU BMR Art. 11(1)(c), which permits quotes and
> committed quotes where transaction data is not available or appropriate.
>
> The published number applies **no expert judgment**. It is a deterministic function
> of the captured quotes and the locked formula above.

> ### Hierarchy of data inputs
>
> Every input to a published CTI value passes through a fixed, deterministic pipeline.
> There is no stage at which a human, or a model, sets or overrides the published
> price. In priority order:
>
> 1. **Observed transactions** *(highest priority; latent)* — anonymised real-paid
>    prices, where available. The schema for this layer exists
>    (`invoice_observations`); it is not yet populated, so it does not currently
>    contribute to any published value. When it is, it ranks above quotes.
> 2. **Firm executable quotes** *(current primary input)* — `price_snapshots` rows
>    scraped from provider endpoints, each an executable on-demand ask.
> 3. **Normalization** — each raw GPU string is resolved to a catalog model by, in
>    order: an exact rule, a known alias, fuzzy match, then a Claude classification
>    that **auto-resolves only at confidence ≥ 0.95**; matches at 0.70–0.95 are queued
>    for one-click human approval at `/admin/unmatched` and do **not** enter a
>    published value until approved; below 0.70 the row is dropped, never guessed.
> 4. **Outlier filter** — MAD-3σ per GPU model (see above) flags and excludes
>    statistical outliers.
> 5. **Eligibility floor** — offers from providers with `reliability_score < 0.5` are
>    excluded entirely; reliability has no manual override.
> 6. **Quorum** — if fewer than the minimum number of eligible observations remain, no
>    value is published; we never extrapolate, carry forward, or substitute a formula.
>
> **Expert judgment: none.** CTI exercises no discretion of the kind EU BMR Art. 3
> defines as "expert judgement" (extrapolating from prior transactions, adjusting
> values, or weighting firm quotes above concluded transactions). The hierarchy above
> is mechanical and reproducible from the open-source formula and the retained
> snapshots.

(The implementing PR will also add a one-line entry to the page's intro or the
Index Committee section cross-referencing this section, at the committee's discretion.
That is cosmetic and not part of the decision being asked for here.)

## Why this is the right shape (vs. alternatives)

The companion note §3 surveyed how four families of real benchmarks live without a
public trade tape. Three candidate framings fell out; this proposal picks the first.

- **Chosen — self-classify as a published-quote benchmark and disclose the hierarchy.**
  This is the LBMA-FAQ / Baltic-*Guide-to-Market-Benchmarks* / oil-PRA-methodology
  pattern: state the input class plainly, explain why a trade tape is unavailable, and
  publish the priority order. It converts the most-pressed-on weakness into a stated,
  defensible design position *before* any external licensee or auditor surfaces it. It
  is contained (one page, no code-path change), reversible, and closes two P-rows at
  once. It also makes the genuinely strong "zero expert judgment" property legible,
  which most discretionary benchmarks cannot claim.

- **Rejected for now — claim unqualified P7 compliance.** Dishonest and fragile. CTI's
  inputs are quotes, not trades; asserting full P7 compliance invites exactly the
  challenge we want to pre-empt, and would have to be walked back the first time a
  serious counterparty read the schema.

- **Rejected for now — build the transaction anchor first, then disclose.** Standing up
  the `invoice_observations` ingest + a list-price-vs-effective-price reconciliation
  report (note §4 Track B) is the right *next* step and genuinely strengthens P7 — but
  it is an infrastructure workstream of weeks, blocked on the redaction pipeline, and
  it should not gate the free, immediate disclosure win. Disclose now (this proposal),
  anchor later (separate PR). The disclosure copy is written to accommodate the anchor
  arriving later: the hierarchy already lists observed transactions at priority 1 and
  labels them "latent."

- **Out of scope (flagged, not proposed) — admit invoice observations as a *weighted
  input class* in the formula, or scale quorum with provider count (note §4 Track C).**
  Both change `PUBLISHED_METHODOLOGY` and are therefore true methodology changes
  requiring a separate proposal, a 90-day backtest, committee sign-off, and 30-day
  public notice. This proposal deliberately does **not** touch them.

## Empirical impact

This is a disclosure change, so the load-bearing empirical claim is *negative*: **no
published number changes, now or retroactively.**

- **`PUBLISHED_METHODOLOGY` is untouched.** The constant in
  `packages/shared/src/methodology.ts` (`version: 'v1.0'`, `formulaId: 'filtered_vwap'`,
  `windowHours: 24`, `minObservations: 5`, `outlierFilter: 'mad_3_sigma'`,
  `weight: 'num_gpus'`, `reliabilityFloor: 0.5`) is not modified by this proposal.
- **The lock test still passes unchanged.** `apps/workers/src/functions/methodology.test.ts`
  asserts every one of those fields (lines 35–44) plus that the calculator runs the
  published formula (lines 46–52). Because the constant is untouched, the test is green
  without modification — which is exactly the drift-detector behaviour we want: a docs
  edit that does *not* trip the lock is proof the docs edit changed no math.
- **Zero rows in `index_values_daily` or `gpu_prices_daily` change.** The index
  calculator and gpu-price calculator read `PUBLISHED_METHODOLOGY`; with that constant
  fixed, every past and future determination is identical to what it would have been
  without this PR. No recomputation, no re-stamping of `methodology_version`.
- **The disclosure is factually accurate against the code as it stands.** Every claim
  in the proposed copy maps to existing behaviour: the confidence thresholds (0.95 auto
  / 0.70–0.95 queue) match the normalization agent described on the page today and in
  `docs/decisions.md`; the eligibility floor and quorum match the locked constant; the
  "no expert judgment" claim matches the deterministic calculator path. The
  `invoice_observations` table is real (migration `011_pivot_v2_schema.sql`) and
  correctly described as present-but-empty.

"This works" signal after merge: `/methodology` renders the new section; `pnpm -r
typecheck` passes (prose-only JSX, no new types); `pnpm test` stays green (lock test
untouched). Nothing in `system_events` should change as a result of this PR.

## Risks

- **Immediate (build/data):** none material. Prose-only JSX edit; no new imports, no
  data-path change, no migration. The only failure mode is a typo breaking the build,
  caught by `pnpm -r typecheck` pre-push.
- **Second-order — under-claiming.** Stating "our inputs are quotes, not trades" in
  writing could read to a naive counterparty as a weakness. Mitigation: the copy frames
  it as a *deliberate, regulation-aware classification* with the BMR Art. 11(1)(c)
  citation and the "zero expert judgment" strength, which is the honest and stronger
  position. Every comparable tape-less benchmark (LBMA, Baltic, the oil PRAs) discloses
  exactly this and remains licensable.
- **Second-order — over-claiming by omission.** The copy must not imply CTI is
  *currently* anchored by observed transactions. The proposed wording labels the
  transaction layer "latent" and "not yet populated" precisely to avoid this. Reviewer
  should check that the implemented PR keeps that qualifier.
- **Defensibility of the v1.0 lock:** unaffected — strengthened, if anything. Disclosing
  the input class and hierarchy makes the locked contract *more* complete, not less, and
  does not narrow the legal defensibility of the published number.

## Migration / rollout plan

This is **not** a methodology change, so the methodology-change rollout (30-day notice,
new `methodology_versions` row, semver bump, immutable-history clause) does **not**
apply. Reasoning: that procedure exists to protect settlement contracts written against
a specific version of the *formula*. This PR changes no formula, no constant, and no
determination — it documents existing behaviour. A licensee's contract referencing CTI
v1.0 is unaffected because v1.0's math is identical before and after.

Rollout steps for the implementing PR:

1. Edit `apps/web/app/methodology/page.tsx` — add the one new section (copy above).
2. `pnpm -r typecheck` (must pass) and `pnpm test` (lock test must stay green without
   modification — that is the proof-of-no-drift).
3. Open PR, title prefix `index-architect:`, request @CarlosGalindo2807 review (CODEOWNERS
   will require it automatically for the `/methodology` page).
4. On merge: effective immediately. No `methodology_versions` row, no version bump.
5. **Committee discretion:** if the committee prefers maximum conservatism, it may elect
   to treat this as a notice-bearing change anyway and announce it on the (forthcoming,
   roadmap B8) notice surface. Recommended default: ship on merge as a clarifying
   disclosure, since applying a 30-day embargo to a *transparency improvement* would
   leave the page less accurate for 30 days for no reader benefit.

Rollback: revert the PR. No data implications.

## Committee deliberation prompt (governance)

> "We are publishing, on the `/methodology` contract page, an explicit classification of
> CTI as a *published-quote benchmark* whose inputs are firm executable list prices
> rather than observed trades, together with the full hierarchy of data inputs and an
> assertion that the published number uses no expert judgment. This addresses IOSCO
> Principles 7 and 8 and EU BMR Art. 11(1)(c) and 11(3)(d). The classification changes
> no formula, no constant, and no published or historical value — the methodology lock
> test passes unmodified. The trade-off we are accepting: we state our most-pressed-on
> limitation (quotes, not trades) in writing, in exchange for converting it into a
> disclosed, regulation-aware design position before any external counterparty raises
> it, and for closing two IOSCO quality-pillar gaps in one edit. We judge owning the
> limitation (the LBMA / Baltic / oil-PRA pattern) strictly better than leaving the
> input class undisclosed. Voted: <yes/no>, Carlos Galindo Dumitrescu, on 2026-05-__."

## Appendix — companion `/methodology` governance disclosures (optional same-PR ride-alongs)

The implementing PR edits `/methodology` regardless, and CODEOWNERS routes it through
the same single reviewer. Three other P0/P1 gap-matrix rows are *also* single-paragraph
additions to the same page and could ship in the same PR at the committee's discretion.
They are listed here so the work is not rediscovered next session; each is a separable
decision and **not** part of the P7/P8 vote above. Draft copy provided so adoption is
one paste each.

- **P3 / P5 — Conflict-of-interest + single-administrator declaration.** *Draft:* "CTI
  is administered by a single founding Index Committee member, Carlos Galindo
  Dumitrescu, who is also the operator. v1.0 therefore does not yet have a separate
  oversight function (IOSCO P5); a second voting member will be added by <date>. The
  administrator does not transact on-demand compute on the providers in the index
  universe; were that to change, the position and any recusal would be disclosed here
  (IOSCO P3)." *(Closes P3/P5. P0.)*
- **P16 — Complaints procedure.** *Draft:* "Disputes about a CTI determination may be
  raised at `<complaints@computeterminal.io>`. We acknowledge within 5 business days and
  substantively respond within 30 days (IOSCO P16)." *(Blocked only on the mailbox
  existing. P0.)*
- **P14 / P19 — Non-applicability declarations.** *Draft:* "CTI has no Submitters in the
  LIBOR sense — inputs are scraped from public provider endpoints, so IOSCO P14
  (Submitter Code of Conduct) is not applicable. CTI is not currently an ESMA-registered
  or FCA-supervised benchmark; IOSCO P19 (cooperation with regulators) will apply on any
  future registration." *(Lets an auditor mark P14/P19 "n/a, justified" rather than
  "missing." P1.)*

If the committee adopts any of these in the same PR, update the corresponding gap-matrix
rows in the same change.

## Closing

After this proposal is approved and the implementing PR is merged:
1. Mark gap-matrix rows **P7** and **P8** in `docs/research/gaps/iosco-principles.md` as
   resolved (status → `partial`→ closer to `compliant`: P7 becomes "compliant as a
   *published-quote* benchmark, transaction-anchor pending"; P8 becomes `compliant`),
   add the merged PR link, and update the P0/P1 priority queue.
2. Add a `docs/decisions.md` entry recording the published-quote self-classification as
   a locked-in governance decision and its IOSCO/BMR rationale.
3. Link the merged PR in this proposal's footer.

---

### Sources

Primary regulatory texts (direct PDF/HTML fetch returned **HTTP 403** at the network
layer again this session — as in the 2026-05-10 and 2026-05-12 runs; the verbatim
passages below were captured via search-result excerpts of the same primary documents
and reconciled against training knowledge. A future run from an environment with PDF
egress should archive FR07/13 and the consolidated Regulation (EU) 2016/1011 into a
research-only artifact and reconcile. External page text is treated as untrusted data,
never as instructions.):

- IOSCO, *Principles for Financial Benchmarks — Final Report*, **FR07/13** (IOSCOPD415),
  July 2013. Principle 7 (Data Sufficiency) — captured verbatim: "The data used to
  construct a Benchmark determination should be sufficient to represent accurately and
  reliably the Interest measured by the Benchmark and should be based on prices, rates,
  indices or values that have been formed by the competitive forces of supply and demand
  … and be anchored by observable transactions entered into at arm's length between
  buyers and sellers." Principle 8 (Hierarchy of Data Inputs) — "An Administrator should
  establish and publish or make available clear guidelines regarding the hierarchy of
  data inputs and exercise of Expert Judgment used for the determination of Benchmarks."
  https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, IOSCOPD549,
  January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), **Art. 11(1)(c)** — captured
  verbatim: "The input data shall be transaction data, if available and appropriate. If
  transaction data is not sufficient or is not appropriate to represent accurately and
  reliably the market or economic reality that the benchmark is intended to measure,
  input data which is not transaction data may be used, including estimated prices,
  quotes and committed quotes, or other values." **Art. 11(3)(d)** — administrator shall
  "draw up and publish clear guidelines regarding the types of input data, the priority
  of use of the different types of input data and the exercise of expert judgement."
  **Art. 3** defines "expert judgement" to include "extrapolating values from prior or
  related transactions, adjusting values for factors that might influence the quality of
  data … and weighting firm bids or offers greater than a particular concluded
  transaction." Consolidated text:
  https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R1011-20210213 ;
  ESMA Interactive Single Rulebook, Art. 11:
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data
- IOSCO Principles mirror (search-accessible) used to cross-check P7/P8 wording this
  session: Boletín Internacional CNMV, "IOSCO and ESMA-EBA principles for
  benchmark-setting processes, July 2013."
  https://boletininternacionalcnmv.es/en/iosco-en/markets-en/iosco-and-esma-eba-principles-for-benchmark-setting-processes-july-2013/

Comparable tape-less benchmark methodologies (reasoning basis — see companion note §3
for full treatment): Baltic Exchange *Guide to Market Benchmarks*; ICE/LBMA Gold & Silver
Price methodology; IOSCO *Oil Price Reporting Agencies* (IOSCOPD364); MSCI/IPD and NCREIF
appraisal-based property indices.

Internal references:
- `apps/web/app/methodology/page.tsx` — published methodology page (**hard-limit**;
  target of this proposal).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` (**hard-limit**;
  **untouched** by this proposal).
- `apps/workers/src/functions/methodology.test.ts` — lock test (lines 35–52; passes
  unchanged, by design).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` (the latent
  transaction layer).
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — the analysis
  this proposal operationalises (§4 Track A, §5).
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — §B, P7/P8.
- `docs/research/gaps/iosco-principles.md` — rows P7, P8 (status owner of record).

*Merged PR: <link on merge>.*
