# Proposal: Self-classify CTI v1.0 as a *published-quote benchmark* and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-05-28 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (hard-limit surface — `/methodology` page edit, no change to `PUBLISHED_METHODOLOGY` constant, no change to any computed number) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit per charter). No change to `packages/shared/src/methodology.ts`, `apps/workers/src/functions/methodology.test.ts`, `apps/workers/src/functions/index-calculator.ts`, `apps/workers/src/functions/outlier-detector.ts`, or any `packages/db/migrations/*` file. |
| **Required reviewer(s)** | @CarlosGalindo2807 (CODEOWNERS-required for `apps/web/app/methodology/page.tsx` per the founding charter — sole Index Committee member at v1.0). |
| **Effective date if approved** | Immediate on merge. **This is not a methodology change** in the `v1.0 → v1.x` sense — the formula, constants, eligibility, outlier filter, quorum, and reliability floor in `PUBLISHED_METHODOLOGY` are untouched. It is a clarifying disclosure that completes the documentation of v1.0 against IOSCO P7/P8 and EU BMR Art 11(1)(c) / 11(3)(d). The 30-day public-notice procedure in `/methodology` Step 3 applies to methodology changes that alter the published number; this proposal alters no published number. The Committee may nonetheless elect to publish a notice — recommended in §"Migration / rollout plan" below. |
| **References** | IOSCO FR07/13, *Principles for Financial Benchmarks*, Principles 7 (Data Sufficiency) and 8 (Hierarchy of Data Inputs). Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data), specifically 11(1)(c) and 11(3)(d), and Article 13 (Transparency of methodology). Companion research: [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md); gap-matrix rows P7 and P8 in [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md). |

---

## Problem

CTI's `/methodology` page today publishes the formula, the MAD-3σ outlier
filter, the eligibility floor, the quorum rule and the Index Committee
change-control procedure. It does **not** state what *class* of benchmark
CTI is, and it does not publish the **hierarchy of data inputs** that
ingestion follows. Two specific consequences:

1. **IOSCO Principle 7 (Data Sufficiency) ambiguity.** P7 says
   "...the data used to construct a benchmark determination should be
   sufficient to represent accurately and reliably the [interest] measured
   ... and be anchored by observable transactions entered into at arm's
   length between buyers and sellers." (IOSCO FR07/13, P7, July 2013.)
   Every CTI input is a scraped **listing** — a provider's published,
   click-executable ask — not an observed trade. A strict reviewer can
   reasonably press on P7. The position is defensible (the inputs are
   firm, executable quotes from a real cash market for GPU-hours, and
   IOSCO itself adds that P7 "does not mean that individual benchmark
   determinations must be constructed solely or even predominantly by
   transactions"), but the *defense is currently not on the page*. The
   listings-vs-transactions note (2026-05-12) maps this in full; this
   proposal lands the resulting disclosure.

2. **EU BMR Article 11(3)(d) gap.** Article 11(1)(c) states that "input
   data shall be transaction data, if available and appropriate" and
   that "if transaction data is not sufficient or is not appropriate ...
   input data which is not transaction data may be used, **including
   estimated prices, quotes and committed quotes, or other values**."
   Article 11(3)(d) then *requires* an administrator to "draw up and
   publish clear guidelines regarding the types of input data, the
   priority of use of the different types of input data, and the
   exercise of expert judgement." CTI's hierarchy exists in code
   (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin
   queue → outlier check → eligibility check → VWAP) but is **not
   published** as a hierarchy guideline.

Both gaps are P0 in the IOSCO gap matrix and both are closable in *the
same edit to the same page*. Closing them turns CTI's most-pressed-on
weakness into a stated, defensible design position — the LBMA-fixing /
Baltic-assessment pattern of *owning* the limitation rather than hiding
it. See `notes/2026-05-12-listings-vs-transactions-iosco-p7.md` §3 for
the precedents (Baltic Exchange freight indices, oil PRA Market-on-Close,
LBMA Gold auction, MSCI/NCREIF appraisal-based property indices) that
establish the pattern is regulator-accepted.

## Proposed change

Add **two new sections** to `apps/web/app/methodology/page.tsx`,
positioned between the existing "Formula" section (which ends with
"Quorum") and the existing "Index Committee" section. No existing copy
on the page is changed. No values inside `PUBLISHED_METHODOLOGY` are
touched. The page's two new sub-headings are:

1. **"Classification — published-quote benchmark"**
2. **"Hierarchy of data inputs"**

### Draft copy (suitable for direct paste into `page.tsx`)

The text below is in the same prose register as the existing page.
It uses the page's existing class conventions (`display`, `mono`,
`text-ink-secondary`, `border border-bg-border bg-bg-surface`,
`rounded`, `text-2xs uppercase tracking-widest text-ink-muted`)
so that styling does not change. Render structure mirrors the existing
"Outlier filter (MAD-3σ)", "Eligibility floor" and "Quorum" subsections.

---

**Section 1 — Classification.** Insert after the "Quorum" subsection,
before the "Index Committee" `<section>` tag, as a new sub-heading
(`<h3 className="display mt-10 text-xl">Classification — published-quote benchmark</h3>`)
inside the existing Formula `<section>`.

> CTI is a **published-quote benchmark**. Its inputs are firm,
> click-executable on-demand list prices captured directly from the price
> endpoints of cloud GPU providers. The benchmark is anchored in a
> genuine arm's-length cash market for GPU-hours: providers and
> customers transact continuously and bilaterally at the prices CTI
> reads. CTI does not, today, ingest observed transaction prices —
> on-demand GPU compute has no public consolidated trade tape, and no
> private trade tape is yet contributed to CTI.
>
> This classification is consistent with EU BMR Article 11(1)(c), which
> permits "estimated prices, quotes and committed quotes, or other
> values" as input data where transaction data is not sufficient or not
> appropriate, and with the structural shape of established
> non-transaction-tape benchmarks: the Baltic Exchange freight indices
> (panellist-assessment, settling cleared FFAs under EU BMR), oil
> Market-on-Close assessments by Platts and Argus (firm bids and offers
> dominating on illiquid grades, under the IOSCO Principles for Oil PRAs),
> and the MSCI/IPD and NCREIF property indices (independent appraisals,
> covered by MSCI's IOSCO statement of compliance).
>
> CTI's published value is computed with **no expert judgment**. The
> 24-hour VWAP, the MAD-3σ outlier filter, the eligibility floor and the
> quorum rule are deterministic functions of the captured snapshots; the
> formula is the same code path on every run, and is locked under the
> Index Committee change-control procedure below. Any future change to
> add transaction-class inputs (for example, anonymised invoice
> observations under the schema in `invoice_observations`) would be a
> new methodology version under that procedure, with public notice and
> committee approval.

---

**Section 2 — Hierarchy of data inputs.** Insert immediately after the
Classification sub-section, still inside the Formula `<section>`, as a
new sub-heading (`<h3 className="display mt-10 text-xl">Hierarchy of data inputs</h3>`).

> Per EU BMR Article 11(3)(d), the priority order applied to every
> observation before it can contribute to the published index value:
>
> 1. **Captured.** Snapshot is fetched from a per-provider scraper
>    (`apps/workers/src/functions/scrapers.ts`) and persisted to
>    `price_snapshots` only if it passes a Zod schema validation
>    (price > 0, `num_gpus ≥ 1`, recognised provider, parseable
>    timestamp). Schema-invalid rows are dropped, not coerced.
> 2. **Normalised.** The GPU model string is resolved to a catalog
>    `gpu_model_id` in this fixed deterministic order:
>    *(a)* exact match against `normalization_rules` (regex / literal);
>    *(b)* exact match against `gpu_aliases`;
>    *(c)* fuzzy match (Levenshtein over the catalog name set);
>    *(d)* Claude-batch resolution, hourly, with confidence ≥ 0.95
>    auto-promoted into `normalization_rules` and back-filled;
>    *(e)* Claude-batch confidence 0.70–0.95 queued at `/admin/unmatched`
>    for one-click human approval. Confidence below 0.70 is left in
>    `unmatched_listings` and never contributes to a published value.
> 3. **Outlier-classified.** Every 15 minutes, MAD-3σ deviation from
>    the per-GPU-model 1-hour median is computed
>    (`apps/workers/src/functions/outlier-detector.ts`) and `is_outlier`
>    is written back to `price_snapshots`. Outliers remain visible in
>    the table for audit but are excluded from `E_t`.
> 4. **Eligibility-gated.** An observation contributes only if the
>    provider's `reliability_score ≥ 0.5`. Reliability is computed
>    deterministically from scrape success rate and outlier ratio and
>    has no manual override.
> 5. **Quorum-gated.** If `|E_t| < 5` for a given index on day *t*, no
>    value is published. We never extrapolate, never carry forward, and
>    never fall back to a different formula.
> 6. **Aggregated.** The remaining observations enter the locked
>    formula (`filtered_vwap`, num_gpus-weighted, 24-hour window) and
>    the result is written to `index_values_daily.vwap` with
>    `methodology_version = v1.0`.
>
> **Expert judgment is not exercised at any stage above.** Stages 1, 3,
> 4, 5 and 6 are pure code. Stages 2(a)–2(c) and 2(d, ≥ 0.95) are pure
> code. Stage 2(e, 0.70–0.95) — the only human touchpoint — is a binary
> approve/reject decision on a *catalog mapping* (does string X refer
> to GPU model Y?), not on a *price*. No human can edit a price, an
> outlier flag, a reliability score, an eligibility outcome, or a
> published value. The audit surface for this claim is
> `system_events` + the per-snapshot `is_outlier` and
> `provider_reliability_score` retained on every row in
> `price_snapshots`.

---

(End of inserted copy. No other content on `/methodology` changes.)

## Why this is the right shape (vs. alternatives)

Three alternatives were considered and rejected for the reasons below.

**Alternative A — claim unqualified P7 compliance.** Reject. Inputs are
listings, not trades. A strict IOSCO reviewer would correctly flag this
as overclaim, and the credibility cost on first contact with a
regulator or institutional licensee far exceeds the (zero) operational
benefit of the wider claim. The 2026-05-12 note documents the precise
pressure point in §1.

**Alternative B — say nothing on the page; document only internally
in `docs/research/`.** Reject. The gap is real and the cure is cheap.
External counsel for a prospective licensee will read `/methodology` —
not the research dossier — first. If P7 and Art 11(3)(d) are not
addressed on that page, the first counsel meeting opens with the
question we should have pre-empted. This is the LBMA-fixing /
Baltic-assessment lesson from §3 of the note: own the limitation in
public.

**Alternative C — change the formula now to admit a transactional
input class (e.g. start ingesting `invoice_observations`).** Reject for
this proposal, **separately recommended for a future v1.x cycle.**
Three reasons it is wrong *now*: (1) `invoice_observations` is empty
(migration 011 created the schema; the ingest / redaction pipeline is
unbuilt — this is REFRAME_v2 variable 8 / "Bloomberg-for-buyers" Track
B); (2) any change to `PUBLISHED_METHODOLOGY` would require a 30-day
notice, a 90-day backtest, and committee approval, which would delay
the much-cheaper P7/P8 disclosure that this proposal lands; (3) the
right design for an invoice-anchored CTI is a *validation* anchor
first (publish a periodic CTI-vs-effective-price reconciliation report
without changing the formula) before promoting it to an *input* anchor
that changes the formula. The reconciliation report is infrastructure
work that touches no hard-limit file; it can ship on its own pace.

The **chosen shape** (this proposal) is the smallest reversible move
that closes both P7 and P8 gaps at once. No published number changes.
The disclosure is consistent with what code already does. It pre-empts
the question the next licensee or auditor will ask. It is one PR.

## Empirical impact

This proposal does not change any number that is, has been, or will be
written to `index_values_daily.vwap`. The change set is purely a docs
edit to the rendered `/methodology` page; the locked constant
`PUBLISHED_METHODOLOGY` and every function in
`packages/shared/src/methodology.ts` are byte-identical before and
after. As such:

- **Backtest**: not applicable (no formula change). The
  `methodology.test.ts` lock test continues to pass unmodified; that
  is the empirical signal that "no number that shouldn't change
  changed."
- **Sensitivity**: not applicable.
- **Coverage impact**: zero — same observations are eligible before and
  after.
- **Test addition** (recommended in the PR but not part of this
  proposal's required edits): a one-line content-snapshot test on
  `apps/web/app/methodology/page.tsx` asserting that the strings
  "published-quote benchmark" and "Hierarchy of data inputs" appear on
  the page, so that an accidental future revert of the disclosure is
  caught by CI. This is in the same defense-in-depth spirit as
  `methodology.test.ts`, scaled to the docs surface.

The signal that says "this works" is therefore qualitative: the page now
addresses the two IOSCO principles cleanly, and the public statement
matches what code does. The gap-matrix update to rows P7 and P8 (see
"Closing" below) is the record of the change taking effect.

## Risks

**Immediate / mechanical risks (low).**
- `next build` could break if the inserted JSX is malformed. Mitigated
  by running `pnpm -r typecheck` and `pnpm --filter @compute-terminal/web build`
  before pushing.
- The page is rendered with `dynamic = 'force-dynamic'` and
  `revalidate = 300`. Edge cache will pick up the new copy within five
  minutes of deploy. No data migration is involved.
- The `methodology_versions` row for v1.0 is unchanged. The new copy
  describes how v1.0 already operates; it does not assert a v1.0.1.

**Second-order risks (these are the ones the Committee should weigh).**
- **Overclaim risk on the word "anchored".** The draft copy says CTI
  is "anchored in a genuine arm's-length cash market for GPU-hours" —
  *true of the market*, but a strict IOSCO reviewer might read it as
  asserting that the *individual determinations* are transaction-
  anchored, which is what P7 actually asks for. Defensive reading:
  the next sentence ("CTI does not, today, ingest observed transaction
  prices") cures this — we anchor on the market but ingest quotes.
  Recommend the Committee read the two sentences together and confirm
  the disclosure is honest. If they want stronger separation, change
  the verb in the first sentence from "anchored in" to "drawn from"
  and the assertion becomes weaker than strictly true rather than
  stronger.
- **Comparable-benchmark name-checking risk.** The draft invokes
  Baltic, Platts/Argus, and MSCI/IPD by name. None of these have
  endorsed CTI; we are inviting comparison, not claiming peer status.
  If the Committee considers this presumptuous, the names can be
  removed and the same point made structurally ("regulated benchmarks
  exist for markets without public trade tapes; they rely on input
  governance rather than transaction purity"). Recommend keeping the
  names — concrete precedents are more credible than abstract claims —
  but flagged for explicit committee choice.
- **Future-licensee assumption risk.** A licensee that has already
  written a contract referencing "CTI v1.0" reads the disclosure as a
  description of what v1.0 has always been. That is true — v1.0 has
  always been a quote-derived index — so disclosure should not
  surprise any licensee. There are no licensees today, which makes the
  cost of this clarification monotonically downward over time.
- **Narrowing-the-defense risk.** Publishing the hierarchy explicitly
  removes future flexibility to add a hidden expert-judgment override.
  This is the *point*, not a risk — it strengthens the v1.0 lock — but
  it does mean any future "we need to manually adjust a value because
  X" pressure will be visibly contradicted by the published hierarchy.
  The Committee should embrace this constraint, not regret it.

## Migration / rollout plan

This is a docs-class change to a hard-limit file, not a methodology
change. The procedure:

1. **Open PR** with the page edit, the gap-matrix update (P7/P8 rows
   marked "addressed" once merged, with the merged-PR link), and the
   recommended snapshot test.
2. **CODEOWNERS gate.** `apps/web/app/methodology/page.tsx` is owned by
   @CarlosGalindo2807; the PR cannot merge without their review. This
   is the load-bearing gate that this proposal explicitly respects.
3. **Pre-merge checks.** Run `pnpm -r typecheck` and
   `pnpm --filter @compute-terminal/web build` locally and in CI.
   Confirm `apps/workers/src/functions/methodology.test.ts` still
   passes (it will — `PUBLISHED_METHODOLOGY` is not touched).
4. **Public notice (recommended, not strictly required).** Even
   though no number changes, the Committee may elect to write a short
   `methodology_changes` row with `change_type = 'disclosure_clarification'`
   and a `notes` field pointing at the merged PR, so that the audit
   trail records *why* the page was updated. Optional, but it
   exercises the change-notice plumbing ahead of any real
   methodology change and converts P12's "compliant in design,
   untested" into "compliant in design, exercised on a no-number
   change". This is the dry-run benefit also flagged in queue item
   P1-10 of the gap matrix.
5. **Post-merge.** Vercel ISR refreshes `/methodology` within 5
   minutes. Update `docs/research/gaps/iosco-principles.md` row P7
   (status: `partial / structurally weak` → `partial / disclosed`,
   action: "Track A done; Track B/C remain") and row P8 (status:
   `partial` → `compliant`, action: hierarchy now published). Update
   `docs/decisions.md` with a one-paragraph entry describing the
   classification choice and the reasoning.
6. **Rollback.** If the disclosure is materially objected to after
   ship, the page edit is git-revertible. No data, no schema, no
   index value is affected. The 5-minute ISR window bounds maximum
   exposure.

## Committee deliberation prompt (recommended even though this is
docs-class, because the page is a hard-limit surface)

> "We are publishing on `/methodology` that CTI v1.0 is a
> **published-quote benchmark** whose inputs are firm, click-executable
> on-demand list prices — not observed trades — and that on-demand
> compute has no public consolidated transaction tape. We are publishing
> the deterministic six-stage hierarchy of data inputs (capture →
> normalise → outlier-classify → eligibility-gate → quorum-gate →
> aggregate) and stating explicitly that no expert judgment is exercised
> in the published-number path. This addresses IOSCO Principles 7 and 8
> and EU BMR Article 11(1)(c) / 11(3)(d). It changes no formula, no
> constant, and no published number. The trade-off accepted: future
> flexibility to introduce a hidden expert-judgment override is
> permanently removed, in exchange for a publicly defensible disclosure
> position ahead of the first auditor / regulator / licensee
> conversation. Voted: <yes / no>, Carlos Galindo Dumitrescu, on
> 2026-05-XX."

## Closing

After this proposal is approved (PR merged):

- Update `docs/research/gaps/iosco-principles.md` row **P7** to
  `partial / disclosed` (Track A done — note the merged PR — Track B
  invoice anchor + reconciliation report and Track C scaled quorum
  remain P1).
- Update `docs/research/gaps/iosco-principles.md` row **P8** to
  `compliant` (hierarchy published) — note the merged PR.
- Update `docs/research/gaps/iosco-principles.md` priority queue: P0
  item 4 closed; P1 item 7 (hierarchy bundle) closed.
- Add a new entry to `docs/decisions.md` under a heading like *"CTI
  v1.0 self-classified as a published-quote benchmark (added
  2026-05-XX)"* recording the classification choice and pointing at
  this proposal and at the listings-vs-transactions note.
- (Optional, recommended) write a `methodology_changes` row with
  `change_type = 'disclosure_clarification'` and a `notes` field
  pointing at this PR, to exercise the change-notice path on a
  zero-number-impact change before any real methodology change uses
  it.

---

*Companion files in this dossier:*
- Companion research note (depth): [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
- Foundational IOSCO mapping: [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md)
- Gap matrix (rows P7, P8): [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md)
- Proposal template: [`docs/research/proposals/_TEMPLATE.md`](_TEMPLATE.md)

*Source-fetch caveat (consistent with prior runs): direct WebFetch of
`ioscopd415.pdf`, the EUR-Lex consolidated BMR text
(`CELEX:02016R1011-20210213`), the ESMA interactive rulebook entry for
Art. 11, and `legislation.gov.uk/eur/2016/1011` was blocked HTTP 403
from this session's egress, same as the 2026-05-10 and 2026-05-12 runs.
Quoted text of IOSCO P7 ("anchored by observable transactions entered
into at arm's length between buyers and sellers...") and BMR Art
11(1)(c) ("input data shall be transaction data, if available and
appropriate ... including estimated prices, quotes and committed
quotes, or other values") above is reconstructed from search-snippet
verbatim and from the construction of the 2026-05-12 note; future
sessions from an environment with PDF egress should pull the canonical
PDFs into an in-repo research-only artifact and reconcile.*
