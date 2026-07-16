# Proposal: publish CTI's input-data classification and hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-07-16 |
| **Author** | index-architect |
| **Risk class** | docs (edits a hard-limit surface: the published `/methodology` page) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` — new `<section>` between the existing "Formula" and "Index Committee" sections. **No change to `packages/shared/src/methodology.ts`, no change to any published number, no new migration.** |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole Index Committee member of record; also owner of the hard-limit page under `.github/CODEOWNERS`) |
| **Effective date if approved** | On merge. This is a disclosure edit; the formula, constants, calculator, and audit tables are untouched. The 30-day pre-effective-date notice under `/methodology` Steps 3–4 applies to changes in the published number and is **not** triggered by this edit. See §Migration below. |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency); Principle 8 (Hierarchy of Data Inputs); IOSCO Guidance IOSCOPD549 (Jan 2018). EU Benchmarks Regulation (Regulation (EU) 2016/1011) Article 11(1)(c) (input-data hierarchy — "transaction data if available and appropriate … otherwise … estimated prices, quotes and committed quotes"), Article 11(3)(d) (obligation to "draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data"). Prior research: [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md); gap-matrix rows P7 and P8 in [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md). Primary URLs: `https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf`, `https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf`, `https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng`. |

## Problem

The gap matrix at [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md)
carries two P0 rows — **P7 (Data Sufficiency)** and **P8 (Hierarchy of Data
Inputs)** — that share a single root cause: `/methodology` publishes CTI's
*formula* in full but says nothing about the *class* of data it consumes.

The concrete gap has two faces:

1. **P7.** IOSCO Principle 7 requires benchmarks to be "anchored by observable
   transactions entered into at arm's length between buyers and sellers." Every
   `price_snapshots` row today is a scraped provider *listing* — a firm
   executable ask, not an observed trade. On-demand GPU compute has no public
   consolidated transaction tape, so listings are the strongest input class the
   underlying market currently emits. A strict IOSCO reviewer who reads
   `/methodology` today would find no acknowledgment of this and could
   reasonably read the page as an implicit — and unfounded — claim of
   transaction anchoring. The
   [2026-05-12 note](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
   established that CTI's inputs are substantively **committed quotes** in the
   BMR Article 11(1)(c) sense — firm, executable, published — and that
   IOSCO-compliant benchmarks of tape-less markets (Baltic freight indices, oil
   PRAs, NCREIF appraisal-based property indices) survive review on the
   strength of *stated* input classification plus disciplined governance
   around ingestion, not on transaction purity.
2. **P8.** IOSCO Principle 8 and BMR Article 11(3)(d) require the
   administrator to publish the *hierarchy* of input-data types it uses and
   the rule that governs which one wins on any given determination. CTI's
   hierarchy is fully implemented in code (rule-based catalog match → alias →
   fuzzy → Claude ≥ 0.95 auto-resolve → Claude 0.70–0.95 human queue → outlier
   check → eligibility check → VWAP) and is entirely deterministic in the
   published-number path, but is nowhere published.

Both faces are the *same edit* to `/methodology`. Bundling closes 2 of the 4
P0 items in the current queue at once, keeps the change surface small, and
prevents an inevitable second-round edit if we ship them separately.

Nothing in this proposal changes what number gets written to
`index_values_daily.vwap`. This is a **disclosure** upgrade to the
already-locked v1.0 methodology.

## Proposed change

Add one new `<section>` to `apps/web/app/methodology/page.tsx`, placed
immediately after the existing "Formula" section (after the "Quorum" `<h3>` on
line 133) and before the "Index Committee" section (which currently starts on
line 137). The new section has a stable heading anchor for external linking
and contains three subsections.

### Section skeleton (JSX-shape, not final copy)

```tsx
{/* ─── Input data classification & hierarchy ─── */}
<section id="input-data" className="mt-16">
  <h2 className="display text-2xl">Input data</h2>

  <h3 className="display mt-8 text-xl">Classification</h3>
  <p className="mt-3 text-ink-secondary">
    CTI is a <em>published-quote benchmark</em>. Its inputs are firm,
    executable on-demand list prices captured directly from provider
    endpoints. On-demand GPU compute has no public consolidated transaction
    tape; the strongest observable market signal is a provider's live,
    click-executable ask for a specific GPU configuration. These inputs are
    treated as <span className="mono">committed quotes</span> in the sense of
    EU BMR Regulation (EU) 2016/1011 Article 11(1)(c). Per the hierarchy
    below, transaction data is preferred where available; executable quotes
    are used otherwise. The benchmark is anchored in a genuine arms-length
    cash market for GPU-hours. The published value is computed with no expert
    judgment.
  </p>

  <h3 className="display mt-8 text-xl">Hierarchy of data inputs</h3>
  <p className="mt-3 text-ink-secondary">
    On each determination the calculator applies the following stages in
    order. The first stage that produces a value for a given offer wins;
    later stages are only consulted when earlier stages abstain. The rules
    are deterministic — there is no expert-judgment override at any stage.
  </p>
  <ol className="mt-6 space-y-3 text-ink-secondary">
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 1 · Transaction data (invoice observations)</span>
      <div className="mt-1">
        Where an anonymised real-paid invoice record exists for the same
        <span className="mono"> (provider, gpu_model, contract_type)</span>
        within the determination window, it is preferred over any quote.
        <em> Status: schema in place (<span className="mono">invoice_observations</span>,
        migration 011); ingest pipeline unbuilt. This stage abstains at v1.0
        until the pipeline ships, and the benchmark falls through to Stage 2
        for every determination.</em>
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 2 · Committed quotes (published list prices)</span>
      <div className="mt-1">
        Firm, executable list prices captured from provider REST/GraphQL
        endpoints or their public pricing pages. Each row is schema-validated
        against a Zod parser; rows that do not conform are dropped, not
        coerced. This is the sole input class populating <span className="mono">price_snapshots</span> at v1.0.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 3 · Catalog resolution</span>
      <div className="mt-1">
        Each incoming offer's raw GPU string is mapped to a canonical
        <span className="mono"> gpu_model</span> via, in order: (a) an exact
        rule in <span className="mono">normalization_rules</span>, (b) an
        alias, (c) a fuzzy match above a confidence threshold, (d) a Claude
        classification with confidence ≥ 0.95 which auto-creates a rule and
        back-fills prior snapshots. Ambiguous strings (0.70–0.95 confidence)
        are queued for one-click human approval at <span className="mono">/admin/unmatched</span>
        and do <em>not</em> flow into a published determination until resolved.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 4 · Outlier flag</span>
      <div className="mt-1">
        The MAD-3σ rule above marks each snapshot with
        <span className="mono"> is_outlier</span>. Flagged rows are excluded
        from the eligible set <span className="mono">E_t</span> but retained
        in <span className="mono">price_snapshots</span> for audit.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 5 · Eligibility</span>
      <div className="mt-1">
        Providers with <span className="mono">reliability_score &lt; 0.5</span>
        are excluded. Reliability is deterministic (scrape success rate ×
        outlier ratio) with no manual override.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 6 · Quorum & publication</span>
      <div className="mt-1">
        If <span className="mono">|E_t| &lt; 5</span> for a given index, no
        value is published for that day; an <span className="mono">index_value_skipped</span>
        event is recorded instead. Otherwise the filtered VWAP above is
        computed and written to <span className="mono">index_values_daily.vwap</span>,
        version-stamped with the methodology version in force at
        determination time.
      </div>
    </li>
  </ol>

  <h3 className="display mt-8 text-xl">Non-transaction anchoring</h3>
  <p className="mt-3 text-ink-secondary">
    A published-quote benchmark under BMR Art. 11 must remain "anchored" in
    the underlying transactional market even when its individual inputs are
    quotes. CTI's anchoring rests on four facts, all reproducible from the
    open code and the version-stamped audit tables:
  </p>
  <ol className="mt-4 space-y-2 text-ink-secondary text-sm list-decimal pl-6">
    <li>The underlying market — arms-length rental of on-demand GPU-hours —
      is a live, competitive cash market with continuously transacting
      counterparties (Vast.ai, RunPod, Lambda, hyperscalers).</li>
    <li>Every input is a firm executable price at the moment of capture:
      clicking the offer transacts at that price. This is the definitional
      test IOSCO uses to distinguish committed quotes from indicative
      submissions.</li>
    <li>Inputs are captured mechanically from provider endpoints, with no
      human submission step and no expert-judgment weighting; the ingestion
      audit trail (Zod parse, outlier flag, reliability score) is retained
      per snapshot.</li>
    <li>A reconciliation of the published index against observed effective
      prices from <span className="mono">invoice_observations</span> will be
      published on a rolling basis once the invoice-ingest pipeline lands
      (queued under Track B of the P7 research note).</li>
  </ol>
  <p className="mt-4 text-sm text-ink-muted">
    Reference: EU BMR Art. 11(1)(c); IOSCO Principle 7 (Data Sufficiency);
    IOSCO Principle 8 (Hierarchy of Data Inputs). Comparable published-quote
    or hybrid benchmarks: LBMA Gold/Silver (auction fix, ICE), Baltic Dry
    Index family (panel assessments, BEISL), Platts / Argus oil PRAs
    (Market-on-Close windows blending bids, offers, and prints).
  </p>
</section>
```

### What this proposal explicitly does NOT change

- No edit to `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY`,
  `PUBLISHED_METHODOLOGY_VERSION`, all constants stay bit-identical.
- No edit to `apps/workers/src/functions/index-calculator.ts`,
  `outlier-detector.ts`, or `methodology.test.ts`.
- No new migration; `methodology_versions` gets no new row and
  `methodology_changes` gets no new row (this is not a determination-affecting
  change).
- No edit to any other page. The `/api/health` and `/admin/*` surfaces are
  untouched.

### What still needs the Committee's separate approval later

The stage-1 statement above says the invoice-ingest pipeline is not yet built.
Standing that stage up — and eventually admitting invoice observations as a
*weighted* input class in the calculator, above listings — is a **future
methodology change** and requires its own proposal, 90-day backtest, 30-day
public notice, and version bump. This proposal *reserves the shape* by naming
stage 1 in the published hierarchy; it does not activate it.

## Why this is the right shape (vs. alternatives)

Three alternatives were considered.

**A. Ship P7 self-classification only; queue P8 hierarchy separately.**
Rejected. Both edits land in the same paragraph range on the same page and
address the same underlying complaint from a reviewer ("what class of data is
this and how is it prioritised?"). Splitting doubles the review load, doubles
the risk of merge order surprises, and creates a temporary state where
`/methodology` classifies its inputs without publishing the hierarchy that
justifies the classification — the strictly-worse ordering.

**B. Ship the disclosure as a linked companion doc (`docs/methodology-inputs.md`),
not on `/methodology` itself.** Rejected. IOSCO Principle 8 and BMR Art. 11(3)(d)
require the hierarchy to be *published as part of the methodology*, not merely
linked from adjacent documentation. The `/methodology` page is the citation
surface external counsel will read; anything not on that surface is not
"published" in the regulatory sense. A companion doc is fine as a longer-form
explainer but does not close the gap.

**C. Rewrite the "Formula" section to fold the hierarchy inline into the
existing pseudocode block.** Rejected. The Formula section is dense
pseudocode; adding six sequential prose stages inside it hurts readability and
mixes two audiences (a quant reading the definition of `E_t` versus an
auditor reading the input-class disclosure). The proposed shape — a distinct
top-level `<section>` between Formula and Index Committee — puts each
audience's information at the altitude they need it, and keeps the change
surgical.

The chosen shape (option C in `/methodology`'s current structure, effectively
option A across our three considered alternatives — new section, both P7 and
P8 in one edit) is also the shape [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
§4 recommended after the survey of Baltic / PRA / LBMA precedents.

## Empirical impact

This is a disclosure change, not a methodology change, so the "backtest under
new methodology" section of the template is n/a. The empirical questions that
matter are:

- **Does the published number change on any historical day?** No. The
  calculator is untouched. A byte-for-byte re-run of `pnpm test` on
  `apps/workers/src/functions/methodology.test.ts` (the lock test) must pass
  before merge, and passing is the empirical proof of no drift.
- **Does the JSX render match the design system on `/methodology`?**
  Visually verified during PR preview against the existing "Index Committee"
  and "AI orchestration" sections, both of which use the same
  `mt-16 · display · text-2xl · border-l-2` pattern.
- **Does any downstream reader break?** The section is additive and uses an
  `id="input-data"` anchor that did not previously exist; no existing anchor
  or link is removed. `document_url` values in `methodology_versions` continue
  to point to `/methodology` and are unaffected.
- **Does it change what an auditor sees per row of `index_values_daily`?**
  No. `methodology_version` continues to stamp v1.0. The audit-trail
  interpretation is *strengthened* (the row now points at a document that
  states its input class) but the row bits do not change.
- **Does the language claim more than the underlying evidence supports?**
  The proposed prose explicitly names the stage-1 (transaction) input as
  *unbuilt at v1.0* and explicitly says the benchmark falls through to stage
  2 today. Every other stated fact is directly verifiable in the code paths
  cited: schema-validated Zod parse (scrapers), MAD-3σ (outlier-detector),
  reliability floor 0.5 (methodology.ts:120), quorum 5 (methodology.ts:117),
  version stamping (index-calculator.ts, `index_values_daily.methodology_version`).

## Risks

**Immediate.** None substantive. Docs-only edit to a Server Component; no
runtime state, no API surface changed, no test moved. Lock test on
`packages/shared/src/methodology.ts` must remain green (verify with
`pnpm test` in `apps/workers`).

**Reduces auditor trust — inverse risk.** Publishing the hierarchy invites
the specific external question "why is your invoice pipeline empty?". The
proposal answers preemptively — stage 1 is named, marked unbuilt, and
committed as a P1 workstream. This is the same "own the limitation" posture
LBMA/Baltic/PRAs use. A reviewer who finds the page and no acknowledgment of
the transaction gap is worse than one who finds the acknowledgment plus a
roadmap.

**Breaks downstream licensee assumptions.** No live licensee references
anything on `/methodology` other than the version constant and the formula
block, both untouched. The `id="input-data"` anchor is new, so no existing
link can be broken by it.

**Narrows the legal defensibility of the v1.0 lock.** The opposite —
publishing that CTI classifies inputs as committed quotes and publishes its
hierarchy *strengthens* the "we followed a documented, disciplined process"
argument that is the load-bearing part of the v1.0 lock's licensability
story.

**Second-order — commits future work.** Stage 1's "will publish reconciliation
once the invoice pipeline lands" is a soft commitment. Track B of the P7 note
is already the intended workstream, so the commitment matches existing
intent, but it does move the invoice pipeline from "roadmap item we might
sequence" to "disclosure we have made". This is intended: it is exactly the
kind of pre-commitment that makes P1 roadmap items less optional.

## Migration / rollout plan

**This is not a methodology change.** The 30-day pre-effective-date notice on
`/methodology` Steps 3–4 applies to changes in the published index value or
the formula that produces it. The disclosure edit here changes neither.
Precedent: every prior copy edit to `/methodology` in this repo (5f31fbb,
0108309, 243a2da) landed as an ordinary PR on the merge date, and the lock
test guards the actual determination surface.

Rollout is the ordinary PR flow:

1. Branch `index-architect/2026-07-16-p7-p8-published-quote-proposal` opens
   this proposal and updates the gap matrix rows (P7, P8) to reference it.
   The proposal PR does **not** edit `apps/web/app/methodology/page.tsx`.
2. On merge of the proposal, a *separate* implementation PR opened by
   @CarlosGalindo2807 (or index-architect, at @CarlosGalindo2807's option)
   makes the JSX edit above. That PR runs `pnpm -r typecheck` and
   `pnpm --filter @compute-terminal/workers test` before push; both must be
   green.
3. On merge of the implementation PR, the gap matrix P7 and P8 rows move
   from `partial` to `partial` (P7 — Track A closed, Tracks B and C
   remaining) and `compliant` (P8 — hierarchy now published on the same
   surface as the formula).
4. `docs/decisions.md` gets a new entry "Published-quote self-classification
   + input hierarchy on /methodology (2026-07-16)" summarising the decision
   and linking the two merged PRs.

**Rollback.** Revert of the implementation PR. Docs-only, no data migration
side effect.

**What to monitor after merge.** Nothing in `system_events`. This is a static
render change; the interesting signal is whether the first external reviewer
(licensee counsel, auditor scoping conversation) references the input-data
section — record any such reference in `docs/research/notes/`.

## Committee deliberation prompt (methodology only)

This proposal is disclosure-class, not methodology-class, so the prompt below
is provided for form and to seed the deliberation record when the
implementation PR merges — not because the trade-off is genuinely contested.

> *We are publishing on `/methodology` that CTI is a "published-quote
> benchmark" whose inputs are firm executable list prices (committed quotes
> in the BMR Art. 11(1)(c) sense), and we are publishing the deterministic
> six-stage hierarchy by which those inputs enter a published determination.
> We accept the consequence that we have now publicly named an
> invoice-observation input stage that is unbuilt at v1.0 and committed to
> standing up its ingest pipeline as a P1 workstream. We prefer this to
> either (a) silence on the input class, which reads as an implicit and
> unfounded claim of transaction anchoring; or (b) a separately-linked
> disclosure document, which is not "published methodology" in the
> BMR Art. 11(3)(d) sense. Voted: <yes/no>, Carlos Galindo Dumitrescu,
> founding Index Committee member, on YYYY-MM-DD.*

## Closing

After the implementation PR merges: (a) mark
`docs/research/gaps/iosco-principles.md` row P7 as Track A closed and row P8
as `compliant`; (b) add the decisions.md entry above; (c) link both merged
PRs (this proposal's PR and the implementation PR) in this proposal's footer;
(d) open the follow-on stub `docs/research/notes/YYYY-MM-DD-invoice-ingest-scoping.md`
so Track B has a documented starting point at the next session.

---

*Proposal PR: `<pending — link on merge>`.*
*Implementation PR: `<pending — opens after this proposal merges>`.*
