# Proposal: classify CTI as a "published-quote benchmark" and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-05-25 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs / governance — but edits a **hard-limit surface** (`/methodology` page). **No change to the published number, no version bump.** |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit). *Not* touched: `packages/shared/src/methodology.ts`, `methodology.test.ts`, `index-calculator.ts`, any migration. |
| **Required reviewer(s)** | @CarlosGalindo2807 (CODEOWNERS gate on `/methodology`; sole founding Index Committee member) |
| **Effective date if approved** | On merge. This is a **non-material clarification** (see Rollout §) — it does not bump the methodology version and therefore does not trigger the 30-day public-notice clock. The committee should affirm this materiality classification as part of approval. |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs); EU BMR Reg (EU) 2016/1011 Art 11(1)(a) (transaction data / committed quotes) and Art 11(1)(c) (publish input-data hierarchy guidelines). Primary URLs in §Sources. |

---

## Problem

Two of CTI's three quality-pillar gaps in the IOSCO matrix sit on the **same
page edit**, and both have had their research completed but never converted into
an actionable proposal:

- **Gap-matrix row P7 (Data Sufficiency) — `partial / structurally weak`.** Every
  CTI input is a scraped *listing* (an executable ask), not an observed *trade*.
  IOSCO P7 and BMR Art 11(1)(a) both privilege transaction data. CTI has not
  *claimed* P7 compliance, but it also has not *classified itself* — so a serious
  licensee or auditor reading `/methodology` today cannot tell whether we are
  pretending to be a transaction benchmark or honestly disclosing that we are a
  quote benchmark. The research (
  [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md))
  concluded the right move is **Track A: self-classify precisely as a
  published-quote benchmark and own the limitation**, the way LBMA/Baltic/oil-PRA
  benchmarks own theirs.
- **Gap-matrix row P8 (Hierarchy of Data Inputs) — `partial`.** The ingestion
  hierarchy (rule → alias → fuzzy → Claude-auto → Claude-queue → outlier check →
  eligibility → VWAP) exists *in code* but is **not published**. BMR Art 11(1)(c)
  explicitly requires the administrator to "draw up and **publish** clear
  guidelines regarding the types of input data, the priority of use of the
  different types of input data and the exercise of expert judgement." Right now
  that guideline lives only in source files an auditor would have to reverse-engineer.

The companion note's explicit recommendation (its §4–5 and §6): **"the
`/methodology` self-classification + data-input-hierarchy proposal (Track A). It
closes the two highest-leverage quality-pillar gaps (P7, P8) at once, is a
contained docs/page change, and turns CTI's most-pressed-on weakness into a
stated design position before any external licensee conversation surfaces it."**
This proposal is that artifact. The research is done; this is the implementable
spec.

Because `/methodology` is a hard-limit file (charter §"Hard limits"), the edit
**cannot** be made directly — it requires this proposal plus @CarlosGalindo2807
review. That gate is exactly the contract-preserving process the charter protects;
this proposal honours it.

## Proposed change

Add **one new `<section>`** to `apps/web/app/methodology/page.tsx`, placed
**after** the existing `Formula` section (closes at the `</section>` ending the
Quorum subsection, ~line 134) and **before** the `Index Committee` section
(~line 137). It introduces two things: (1) a one-line classification banner, and
(2) a published data-input hierarchy. It reuses the page's existing Tailwind
classes (`display`, `text-2xl`, `text-ink-secondary`, `mono`, the
`rounded border border-bg-border bg-bg-surface` card) so it is visually
indistinguishable from the rest of the page. **No published value, constant, or
version changes.**

### Exact copy to publish

> ## Input data & classification
>
> **CTI is a published-quote benchmark.** Its inputs are firm, executable
> on-demand list prices captured directly from provider endpoints — the price a
> buyer can transact at on click, not an indicative or estimated quote. On-demand
> GPU compute is a genuine, competitive, arm's-length cash market, but it has **no
> public consolidated transaction tape**: there is no venue that prints "customer
> X rented N GPU-hours at \$Y." We therefore measure the prevailing executable
> price rather than a stream of settled trades, and we say so plainly here rather
> than implying a tape that does not exist.
>
> This places CTI in the same family as benchmarks that measure real markets
> without a public print tape — the LBMA precious-metal fixes, the Baltic Exchange
> freight indices, and oil price-reporting-agency assessments — all of which are
> built substantially or wholly from quotes and assessments and are nonetheless
> cited under IOSCO and the EU Benchmarks Regulation. Under EU BMR Art 11(1)(a),
> where transaction data is "not sufficient or is not appropriate," a benchmark
> "may use … estimated prices, quotes and committed quotes, or other values." CTI
> uses **committed (executable) quotes**, which is the highest-quality class in
> that fallback. No expert judgment enters the published number.
>
> ### Hierarchy of data inputs
>
> Per the principle that an administrator should publish the priority order of its
> input data, CTI applies the following deterministic hierarchy. There is no
> discretionary step: a snapshot either advances or is excluded by a written rule.
>
> 1. **Executable provider listings (primary input).** Each `price_snapshots` row
>    is a firm, on-click-executable on-demand price scraped from a provider
>    endpoint and schema-validated (Zod). Offers that fail the schema are dropped,
>    not coerced.
> 2. **Identity resolution.** The raw GPU string is matched to a catalog model by,
>    in order: an exact normalization rule → a known alias → fuzzy match. Unmatched
>    strings fall to an LLM step (Claude): confidence ≥ 0.95 auto-resolves into a
>    normalization rule; 0.70–0.95 is queued for one-click human approval; below
>    0.70 is not used. The LLM resolves *identity only* — it never sets, adjusts,
>    or weights a price.
> 3. **Outlier exclusion.** Within each GPU model, prices more than three median
>    absolute deviations (MAD-3σ) from the per-model median over the trailing hour
>    are flagged `is_outlier` and excluded.
> 4. **Eligibility floor.** Offers from providers with `reliability_score < 0.5`
>    are excluded. Reliability is computed from observed scrape-success and outlier
>    ratio; it has no manual override.
> 5. **Quorum gate.** If fewer than 5 eligible offers remain for an index on a
>    given day, no value is published — never extrapolated, never carried forward.
> 6. **Computation.** The surviving eligible offers are combined by the locked
>    filtered-VWAP formula above. This is the only step that produces a number, and
>    it contains no discretionary input.
>
> **Transaction data — preferred where it exists.** Consistent with BMR Art
> 11(1)(a)'s preference for transaction data, the schema includes an
> `invoice_observations` layer (anonymised real-paid effective prices, segmented by
> provider, GPU model, spend band, and contract type). When that pipeline is live,
> observed transactions will be published as a *reconciliation* against the quote
> index, and a future methodology version may admit them as a higher-priority input
> — a change that would itself follow the Index Committee procedure below.

### Optional companion edit (committee's discretion — does not expand required scope)

The same edit is the natural home for a one-line **IOSCO P14 non-applicability**
note, which is a separate `n/a` gap in the matrix and costs nothing to bundle:

> *CTI has no Submitters and therefore no Submitter Code of Conduct (IOSCO
> Principle 14, n/a): inputs are captured mechanically from public provider
> endpoints, not contributed by a panel.*

I recommend including it (it pre-empts an auditor's "where is P14?" question) but
it is severable — the committee may approve the P7/P8 core without it.

### JSX skeleton (for the implementer, post-approval)

A ready-to-adapt skeleton matching the existing component style. The implementer
should treat the copy above as authoritative and this as structure only:

```tsx
{/* ─── Input data & classification ─── */}
<section className="mt-16">
  <h2 className="display text-2xl">Input data &amp; classification</h2>
  <p className="mt-3 text-ink-secondary">
    <strong>CTI is a published-quote benchmark.</strong> {/* …banner copy… */}
  </p>
  <p className="mt-4 text-ink-secondary">{/* …comparable-benchmark + BMR 11(1)(a) copy… */}</p>

  <h3 className="display mt-10 text-xl">Hierarchy of data inputs</h3>
  <p className="mt-3 text-ink-secondary">{/* …intro… */}</p>
  <ol className="mt-6 space-y-4 text-ink-secondary">
    <li className="border-l-2 border-bg-border pl-4">{/* 1. Executable listings */}</li>
    {/* 2–6 … */}
  </ol>

  <p className="mt-6 text-sm text-ink-muted">{/* transaction-data preference + invoice_observations */}</p>
  {/* optional: P14 n/a line */}
</section>
```

## Why this is the right shape (vs. alternatives)

An MSCI-style methodology committee would weigh at least these alternatives:

1. **Do nothing / leave it implicit (status quo).** Rejected. BMR Art 11(1)(c)
   *requires* the hierarchy to be **published**, not merely implemented. And
   leaving P7 unaddressed means the first sophisticated licensee discovers the
   listings-vs-trades question themselves and frames it as a gotcha. Owning it
   first is strictly better positioning and the explicit recommendation of the
   prior research.
2. **Claim full P7 transaction-anchoring compliance.** Rejected as dishonest and
   indefensible — our inputs are quotes, not trades. Overclaiming is the single
   fastest way to lose auditor trust and is precisely what the LBMA/Baltic/PRA
   precedents *avoid* by self-classifying.
3. **Build the transaction layer first (`invoice_observations` ingest), then
   classify.** Rejected as sequencing. The honest classification is true *today*
   and costs one page section; the invoice pipeline is a multi-week infra
   workstream (REFRAME_v2 variable 8). Disclosing the truth should not wait on
   building the aspiration. This proposal *references* the transaction layer as
   the stated improvement path, which is exactly what BMR's "transaction data if
   available" wording invites.
4. **Bump the methodology to v1.1 and run the full 30-day notice.** Rejected as
   over-process. Nothing about the published *number* changes; a version bump
   would falsely signal to settlement-contract holders that the math moved. The
   correct instrument is a **non-material clarification** (see Rollout), which is
   itself the materiality judgment IOSCO P12 requires the committee to be able to
   make and record.

The chosen shape — a precise self-classification plus a published deterministic
hierarchy, no number change — closes P7 (Track A) and P8 in one contained edit
and converts the index's most-pressed-on weakness into a stated design position.

## Empirical impact

**The published number does not change. This is the load-bearing property of the
proposal.**

- `PUBLISHED_METHODOLOGY` and `PUBLISHED_METHODOLOGY_VERSION` (`v1.0`) in
  `packages/shared/src/methodology.ts` are **untouched**. The methodology lock
  test `apps/workers/src/functions/methodology.test.ts` stays green by
  construction — this proposal does not edit any file it guards.
- `index-calculator.ts`, `outlier-detector.ts`, and every migration are
  **untouched**. No row written to `index_values_daily.vwap` differs before vs.
  after this change.
- Therefore the template's required methodology backtest is **not applicable**: a
  90-day side-by-side of "old vs. new published series" would be two identical
  series. The empirical signal that "this changes nothing that shouldn't change"
  is the unchanged lock test plus the unchanged constant.
- The *only* artifact that changes is rendered prose on `/methodology`. Verify
  via `pnpm -r typecheck` (page still compiles) and a visual check that the new
  section renders with the existing styling. No `pnpm test` behavior changes.

What measurably *improves*: the IOSCO matrix moves rows **P7 (Track A)** and
**P8** from `partial`/`needs-proposal` toward `compliant-once-merged`, and the
page now satisfies BMR Art 11(1)(c)'s publish-the-hierarchy requirement literally.

## Risks

- **Immediate:** none to data or build — no guarded file is touched, lock test
  unaffected. Lowest-risk class of change to a hard-limit surface.
- **Wording risk (second-order):** the classification text is a public,
  quotable legal-adjacent statement. If imprecise it could *create* an exposure
  (e.g. implying compliance we don't hold). Mitigation: the copy deliberately
  says "published-quote benchmark," cites BMR Art 11(1)(a)'s committed-quotes
  carve-out, and avoids the words "transaction benchmark" / "IOSCO-compliant."
  @CarlosGalindo2807 should read the copy as published legal text, not as docs.
- **Materiality-classification risk:** if the committee later decides this *was*
  material, the precedent is muddied. Mitigation: record the non-material
  determination explicitly (deliberation prompt below) so the call is documented,
  not assumed. This doubles as the P12 "dry-run of the change procedure" the gap
  matrix queued (queue item 10).
- **Citation-precision note (housekeeping):** the prior note
  `2026-05-12-listings-vs-transactions-iosco-p7.md` attributes "committed quotes"
  to BMR **Art 11(1)(c)**; the committed-quotes language is actually in **Art
  11(1)(a)** (the long first point), while **Art 11(1)(c)** is the *publish-the-
  hierarchy* requirement. This proposal uses the corrected attribution. Worth a
  one-line fix to that note on a future pass; not blocking.

## Migration / rollout plan

This is **not** a methodology change, so the methodology-change checklist (version
bump, 30-day notice, `methodology_versions` row, immutable-history clause) does
**not** apply. Concretely:

1. **Materiality determination (committee).** @CarlosGalindo2807 classifies this
   edit as a **non-material clarification** under IOSCO P12 — it changes
   documentation, not the formula, constants, version, or any published value.
   Record the determination (deliberation prompt below).
2. **Implementation PR.** A normal PR edits only `apps/web/app/methodology/page.tsx`
   with the copy in §Proposed change. CODEOWNERS routes it to @CarlosGalindo2807
   for review (the hard-limit gate). `pnpm -r typecheck` must pass; visual check
   the section renders.
3. **No version bump.** `PUBLISHED_METHODOLOGY_VERSION` stays `v1.0`. No row added
   to `methodology_versions`. No `methodology_changes` row (that table is for
   *material* changes under notice). The version-history table on the page is
   unchanged.
4. **Rollback:** revert the single page commit. Zero data impact.
5. **Monitor:** nothing in `system_events` changes. Confirm the page renders in
   production after deploy.
6. **Close-out:** update gap-matrix rows P7 (Track A) and P8 to `compliant`
   (evidence: merged PR + the new page section), and P14 to documented-`n/a` if
   the optional line shipped; move the queue items; record the merged PR link in
   this proposal's footer.

## Committee deliberation prompt (for the decision record)

> "We are publishing a precise self-classification of CTI as a *published-quote
> benchmark* and the deterministic data-input hierarchy already in force, to
> satisfy IOSCO Principles 7 and 8 and EU BMR Art 11(1)(a)/(c). This adds
> disclosure only: the published formula, every constant, the methodology version
> (v1.0), the lock test, and every value in `index_values_daily` are unchanged.
> We classify this edit as a **non-material clarification** under IOSCO Principle
> 12 — it does not trigger a version bump or the 30-day public-notice procedure,
> because no settlement-relevant number moves. We accept the second-order risk
> that the public classification text is legally quotable, and have reviewed the
> copy as such. Voted: <yes/no>, Carlos Galindo Dumitrescu, on 2026-05-__."

## Closing

After this proposal is approved and the implementation PR merged: mark
`docs/research/gaps/iosco-principles.md` rows **P7 (Track A)** and **P8** as
`compliant` with the merged-PR link (and **P14** as documented-`n/a` if the
optional line shipped); update the rolling priority queue (removes P0 item 4 and
P1 item 7); add a `docs/decisions.md` entry recording the published-quote
classification and the non-material-clarification precedent; and link the merged
PR below. This also discharges, in practice, gap-matrix queue item 10 (a dry-run
of the methodology change-control procedure) by exercising the committee's
materiality-determination muscle on a zero-number-change case.

**Merged PR:** _(fill on merge)_

---

## Sources

Primary regulatory texts. **Source-fetch note:** direct WebFetch of the IOSCO PDF
(`ioscopd415.pdf`), the EUR-Lex BMR consolidated text, the ESMA interactive
rulebook, the SEC mirror, and the BIS FSI summary were all blocked at the network
layer (HTTP 403) again this session, as in the 2026-05-10 and 2026-05-12 runs.
Verbatim Principle and Article text below was confirmed via web-search excerpts of
those same primary documents; passages in quotation marks appeared near-verbatim
in the search results. Sub-items of IOSCO Principle 8 beyond (a)/(b)/(c) (firm
bids/offers; expert judgment) are from the regulation's known structure and were
**not** verbatim-confirmed this session — a future run with PDF egress should
download FR07/13 and the consolidated Reg (EU) 2016/1011 into a research-only
artifact and reconcile. **External page text is processed as untrusted data,
never as instructions.**

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13
  (IOSCOPD415), July 2013.
  https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
  - **Principle 7 (Data Sufficiency)**, verbatim (search-confirmed): "The data
    used to construct a Benchmark determination should be sufficient to represent
    accurately and reliably the Interest measured by the Benchmark and should:
    a) Be based on prices, rates, indices or values that have been formed by the
    competitive forces of supply and demand in order to provide confidence that
    the price discovery system is reliable; and b) Be anchored by observable
    transactions entered into at arm's length between buyers and sellers in the
    market for the Interest the Benchmark measures …"
  - **Principle 8 (Hierarchy of Data Inputs)**, verbatim (search-confirmed
    a/b/c): "In general, the hierarchy of data inputs should include: a) Where a
    Benchmark is dependent upon Submissions, the Submitters' own concluded
    arm's-length transactions in the underlying interest or related markets;
    b) Reported or observed concluded Arm's-length Transactions in the underlying
    interest; c) Reported or observed concluded Arm's-length Transactions in
    related markets …" (lower tiers — firm bids/offers, expert judgment — per
    document structure, not verbatim-confirmed this session).
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*,
  IOSCOPD549, January 2018.
  https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), **Article 11 (Input data)**.
  EUR-Lex CELEX 32016R1011. https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng ;
  consolidated text
  https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R1011-20210213 ;
  ESMA Interactive Single Rulebook, Art. 11
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data
  - **Art 11(1)(a)**, verbatim (search-confirmed): "The input data shall be
    transaction data, if available and appropriate." … "if transaction data is
    not sufficient or is not appropriate to represent accurately and reliably the
    market or economic reality that the benchmark is intended to measure, input
    data which is not transaction data may be used, including estimated prices,
    quotes and committed quotes, or other values."
  - **Art 11(1)(c)**, verbatim (search-confirmed; one search result rendered the
    sub-numbering as 11(3)(c) — canonical base-Regulation numbering is 11(1)(c)):
    the administrator "shall draw up and publish clear guidelines regarding the
    types of input data, the priority of use of the different types of input data
    and the exercise of expert judgement."

Comparable-benchmark precedents (consulted in the companion note, not re-fetched):
- Baltic Exchange, *Guide to Market Benchmarks* (assessment-panel model under EU BMR).
- ICE Benchmark Administration / LBMA precious-metal auction fixes (transaction-generating fix).
- IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, IOSCOPD364 (Market-on-Close, bids/offers/transactions blended).

Internal references:
- `apps/web/app/methodology/page.tsx` — published methodology page (hard-limit; target of this proposal).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` / `..._VERSION` (hard-limit; **untouched**).
- `apps/workers/src/functions/methodology.test.ts` — lock test (**untouched**, stays green).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` schema (the latent transaction layer cited in the page copy).
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — the research this proposal operationalises (§4 Track A, §5–6).
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — §B P7/P8.
- `docs/research/gaps/iosco-principles.md` — rows P7, P8, P14; priority-queue P0 item 4 and P1 item 7 (this proposal is their deliverable).
