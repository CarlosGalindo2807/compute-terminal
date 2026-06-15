# Proposal: self-classify CTI as a *published-quote benchmark* and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-06-15 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (touches a hard-limit surface: `apps/web/app/methodology/page.tsx`) — **not** a methodology change. `PUBLISHED_METHODOLOGY` is byte-identical pre/post. No `index_values_daily` row, past or future, changes value. |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (add two sections: "Input data classification" and "Hierarchy of data inputs"). No edits to `packages/shared/src/methodology.ts`, `apps/workers/src/functions/index-calculator.ts`, `apps/workers/src/functions/outlier-detector.ts`, `apps/workers/src/functions/methodology.test.ts`, or any `packages/db/migrations/*` file. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member). |
| **Effective date if approved** | Immediately on merge. **No 30-day notice required** because the published value is unchanged and the constant is unchanged — this is a *clarifying disclosure* per IOSCO Guidance IOSCOPD549 §C (non-material amendment), not a methodology change under the v1.0 committee charter Steps 1–4. The committee should explicitly classify it as non-material in the deliberation record (see §8 below). |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs and Expert Judgment), Principle 11 (Content of the Methodology). EU BMR Regulation (EU) 2016/1011, Article 11(1)(a)–(c) (Input data) and Article 13(1)(a) (transparency of methodology). See §9 for URLs and prior research. |

## 1. Problem

`docs/research/gaps/iosco-principles.md` carries two open **P0** rows that resolve to the same edit of the same page:

- **P7 (Data Sufficiency).** Strict reading of IOSCO Principle 7 requires the benchmark to be "anchored by observable transactions entered into at arm's length between buyers and sellers in the market for the Interest the Benchmark measures." Every `price_snapshots` row is a scraped *offer* — a provider's executable list price. We observe what providers will sell at, not what customers paid. On-demand cloud compute has no public consolidated transaction tape, so this is structural, not a temporary gap. The 2026-05-12 note (`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`) mapped the response in three tracks. **Track A** — the docs deliverable — is "self-classify precisely and publish the hierarchy", and that note flagged it as "the most valuable single deliverable" for the next session.

- **P8 (Hierarchy of Data Inputs).** Principle 8 requires that "an Administrator should establish and Publish or Make Available clear guidelines regarding the hierarchy of data inputs and exercise of Expert Judgment." CTI's hierarchy exists in code (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → reliability-floor check → VWAP), with zero expert judgment in the published-number path. **It is not published.** A reader of `/methodology` today cannot tell that the formula path is judgment-free, nor can they tell which ingestion stages are deterministic vs. model-assisted.

Closing P7 (Track A) and P8 in two separate edits would be ad-hoc; the two paragraphs belong on the same page section. This proposal lands them together as a coherent "Input data" panel positioned between the existing "Formula" section and the existing "Index Committee" section on `/methodology`.

## 2. Proposed change

Add two new sections to `apps/web/app/methodology/page.tsx`, immediately after the existing "Quorum" `<h3>` and before the "Index Committee" `<section>`. The constant `PUBLISHED_METHODOLOGY` is not touched. The lock test (`apps/workers/src/functions/methodology.test.ts`) passes unchanged. The version history table is not touched.

### 2.1 New `<h2>` section: **"Input data"**

```
<section className="mt-16">
  <h2 className="display text-2xl">Input data</h2>

  <h3 className="display mt-6 text-xl">Classification</h3>
  <p className="mt-3 text-ink-secondary">
    CTI is a <span className="italic">published-quote benchmark</span>. Every
    input is a firm, executable on-demand list price captured directly from a
    provider's published endpoint. On-demand GPU compute has no public
    consolidated transaction tape; per the hierarchy below, transaction data
    is preferred where available and executable quotes are used otherwise.
    This is consistent with EU BMR Art 11(1)(c)'s treatment of committed
    quotes ("input data which is not transaction data may be used, including
    estimated prices, quotes and committed quotes, or other values") and
    parallels how benchmarks of other tape-less markets are constructed —
    e.g. Baltic Exchange freight assessments and oil PRAs blend bids, offers
    and transactions under documented hierarchies.
  </p>
  <p className="mt-3 text-ink-secondary">
    The benchmark is anchored in a genuine arms-length cash market for
    GPU-hours: providers list and customers transact continuously at the
    quoted prices. The published number is computed with{' '}
    <span className="italic">no expert judgment</span> — the path from
    captured snapshot to published VWAP is deterministic code.
  </p>

  <h3 className="display mt-10 text-xl">Hierarchy of data inputs</h3>
  <p className="mt-3 text-ink-secondary">
    Per IOSCO Principle 8 and EU BMR Art 11(3)(d), the priority of input
    types used to determine the published value is:
  </p>
  <ol className="mt-4 space-y-3 text-ink-secondary">
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">
        Tier 1 · Observed transactions
      </span>
      <div className="mt-1">
        Anonymised real-paid prices submitted by licensees, redacted by
        spend-band. <span className="italic">Not yet ingested in v1.0</span> —
        the schema exists (<span className="mono">invoice_observations</span>,
        migration 011) but the ingest pipeline is not built. When live, this
        tier supersedes Tier 2 in priority but is not yet used in any
        published number.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">
        Tier 2 · Firm executable quotes (current basis)
      </span>
      <div className="mt-1">
        Provider on-demand list prices captured directly from public
        endpoints. Executable on click at the quoted price. Schema-validated
        on ingest; rows that fail validation are dropped, not coerced. This
        is the basis of every published value under v1.0.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">
        Tier 3 · Estimated prices · expert judgment
      </span>
      <div className="mt-1">
        Not used. CTI does not extrapolate, does not carry forward, does not
        substitute another provider's price for a missing one, and does not
        apply human adjustment to the published number. When quorum is not
        met an{' '}
        <span className="mono">index_value_skipped</span> event is recorded
        and no value is published for that day.
      </div>
    </li>
  </ol>

  <h3 className="display mt-10 text-xl">Ingestion pipeline</h3>
  <p className="mt-3 text-ink-secondary">
    Each captured snapshot passes through deterministic stages. The pipeline
    is open and reproducible from the code:
  </p>
  <ol className="mt-4 space-y-3 text-ink-secondary">
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">
        1 · Scrape
      </span>
      <div className="mt-1">
        Per-provider scraper writes a raw row to{' '}
        <span className="mono">price_snapshots</span> with{' '}
        <span className="mono">provider_id</span>,{' '}
        <span className="mono">raw_gpu_string</span>,{' '}
        <span className="mono">price_per_hour</span>,{' '}
        <span className="mono">num_gpus</span>,{' '}
        <span className="mono">captured_at</span>. Schema-validated by Zod.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">
        2 · Normalize (rule → alias → fuzzy)
      </span>
      <div className="mt-1">
        Deterministic mapping from{' '}
        <span className="mono">raw_gpu_string</span> to{' '}
        <span className="mono">gpu_model_id</span> via the published
        normalization rules and alias table. ~95% of strings resolve here.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">
        3 · Normalize (model-assisted, gated)
      </span>
      <div className="mt-1">
        Unmatched strings drain hourly through a Claude batch.{' '}
        <span className="italic">Confidence ≥ 0.95</span> auto-resolves and{' '}
        writes a new normalization rule for future-determinism;{' '}
        <span className="italic">0.70 – 0.95</span> queues at{' '}
        <span className="mono">/admin/unmatched</span> for one-click human
        approval; <span className="italic">&lt; 0.70</span> is rejected.
        This is the only model-assisted stage and it operates on{' '}
        <span className="italic">identification</span>, not on prices.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">
        4 · Outlier check
      </span>
      <div className="mt-1">
        MAD-3σ rule per GPU model writes the boolean{' '}
        <span className="mono">is_outlier</span> back to the snapshot. The
        flag is auditable.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">
        5 · Eligibility check
      </span>
      <div className="mt-1">
        Snapshot is eligible iff{' '}
        <span className="mono">is_outlier = false</span>,{' '}
        <span className="mono">
          reliability(provider) ≥ {PUBLISHED_METHODOLOGY.reliabilityFloor}
        </span>
        , and{' '}
        <span className="mono">gpu_model ∈ index.universe</span>.
      </div>
    </li>
    <li className="border-l-2 border-bg-border pl-4">
      <span className="mono text-xs uppercase tracking-widest text-ink-muted">
        6 · Determination
      </span>
      <div className="mt-1">
        If <span className="mono">|E_t| ≥ {PUBLISHED_METHODOLOGY.minObservations}</span>,
        compute filtered VWAP per the formula above and write a row to{' '}
        <span className="mono">index_values_daily</span> stamped with{' '}
        <span className="mono">methodology_version</span>. Otherwise no value
        is published.
      </div>
    </li>
  </ol>

  <p className="mt-6 text-sm text-ink-muted">
    Stages 1 – 2 and 4 – 6 are fully deterministic. Stage 3 is the only
    model-assisted step and it is upstream of price: a Claude call can change
    which <span className="mono">gpu_model_id</span> a string maps to (subject
    to confidence gating and a back-fillable rule write), but it cannot change
    a price, weight, eligibility flag, or VWAP output.
  </p>
</section>
```

### 2.2 Diff summary

- One new `<section>` (~140 lines of JSX) added between the existing "Quorum" `<h3>` and the existing "Index Committee" `<section>`.
- Imports: none new. `PUBLISHED_METHODOLOGY` is already imported.
- Constants used: `PUBLISHED_METHODOLOGY.reliabilityFloor`, `PUBLISHED_METHODOLOGY.minObservations` (already in scope).
- No changes to `loadVersionHistory`, the version-history `<section>`, or any data-fetch path.
- No changes to `dynamic`, `revalidate`, or any page metadata.

### 2.3 What this is **not**

- **Not** a change to `PUBLISHED_METHODOLOGY`. The constant is byte-identical pre/post.
- **Not** a change to `index_values_daily`. No past row is recomputed; no future row will compute differently.
- **Not** a version bump. `PUBLISHED_METHODOLOGY_VERSION` stays `v1.0`. No new `methodology_versions` row.
- **Not** a methodology lock test edit. `methodology.test.ts` passes unchanged.
- **Not** a CODEOWNERS-protected hard-limit change to calculator/outlier/migrations. The only hard-limit surface touched is the rendered `/methodology` page — the disclosure surface itself.

## 3. Why this shape (vs. alternatives)

Three alternatives were considered.

### Alt-A: Add the disclosure to a *separate* page (`/methodology/inputs` or `docs/`)

Pros: leaves the hard-limit page untouched.
Cons: defeats the point. The IOSCO test for P11 is whether a reader of the *published methodology* can assess representativeness. Splitting the disclosure across pages makes it discoverable only to a reader who already knows to look — i.e. the opposite of "made available." LBMA, MSCI, and S&P all put their input-data discussion on the same page (or PDF) as the formula. **Rejected.**

### Alt-B: Reframe more aggressively — drop the word "benchmark" and call CTI a "reference rate" or "price tracker"

Pros: lowers the regulatory bar.
Cons: also lowers every commercial conversation we want to have. The whole charter mission ("what MSCI is to global equities") presupposes that this *is* a benchmark. EU BMR Art 3(1)(3) defines "benchmark" broadly enough that calling CTI by another name does not exit BMR scope — it just removes our standing to invoke BMR's own categories (like Art 11(1)(c) on committed quotes) as defensive language. **Rejected as a category error.**

### Alt-C: Treat this as a *material* methodology amendment and run the full 30-day notice

Pros: maximally conservative; over-discloses; over-procedurally-correct.
Cons: precedent risk. The first material amendment we run through the v1.0 charter should be a *real* methodology change (Track C scaled quorum is the likely candidate next quarter), not a disclosure clarification. Reserving the 30-day clock for non-material disclosure dilutes the meaning of the procedure and trains future readers to expect zero-impact "amendments" every quarter. IOSCO Guidance IOSCOPD549 §C explicitly distinguishes material from non-material amendments. **Rejected, but with a caveat:** the committee should *explicitly* classify this as non-material in the deliberation record (§8) so the precedent is on the record.

The chosen path (proposal + committee classification of "non-material clarifying disclosure" + immediate effect on merge) preserves the 30-day clock for changes that actually move the published number.

## 4. Empirical impact

This proposal does not change any number. The empirical signal is the *absence* of change:

| Signal | Expected pre/post |
|---|---|
| `PUBLISHED_METHODOLOGY` constant value | byte-identical |
| `apps/workers/src/functions/methodology.test.ts` | passes unchanged |
| `index_values_daily.vwap` for any historical row | unchanged |
| `index_values_daily.methodology_version` distribution | unchanged (still v1.0 only) |
| Next nightly `index-calculator` run output | identical to what it would have produced absent this PR |
| `pnpm -r typecheck` | green |
| `pnpm test` | green |

The CI verification path is therefore: `pnpm -r typecheck` and `pnpm test` before pushing. If either fails, the PR is held. There is no backtest because there is no formula change.

The *qualitative* signal is the resolution of two P0 gap-matrix rows:

| Row | Pre | Post |
|---|---|---|
| P7 | `partial / structurally weak` — exposure mapped in 2026-05-12 note, undisclosed on `/methodology` | `partial / disclosed` — Track A complete; Tracks B and C remain open and tracked separately |
| P8 | `partial` — hierarchy implicit in code, not published | `compliant` — hierarchy explicitly published with each tier and each ingestion stage named |

## 5. Risks

### 5.1 Immediate

- **Page render failure / typecheck regression.** Mitigated by running `pnpm -r typecheck` and a local `pnpm dev` smoke test against `/methodology` before pushing. The patch is JSX with no new imports.
- **Wording drift from the locked spec.** The new section refers to constants (`reliabilityFloor`, `minObservations`) via `PUBLISHED_METHODOLOGY`, so a future bump moves the page automatically. Hard-coded numbers in the prose are deliberately avoided.

### 5.2 Second-order

- **Auditor reads "Tier 1 not yet ingested" as a methodology gap.** This is the honest read and the right disclosure. A future reader who sees Tier 1 referenced but absent should be able to find the receipt: this proposal explicitly states that fact, the gap-matrix row P7 explicitly tracks it (Track B), and migration 011 explicitly seeds the schema. The honest disclosure is *less* damaging than a discovered omission.
- **Licensee reads "judgment-free" as overclaim.** The model-assisted stage (3) is described and gated. The disclosure explicitly states that the model touches *identification*, not price, weight, eligibility, or VWAP. That is verifiable from the code. The risk is a licensee whose counsel wants belt-and-braces; mitigation is a follow-up FAQ entry, not a wording softening.
- **Setting precedent for "non-material amendment fast-paths".** Addressed by the committee deliberation prompt (§8) requiring explicit classification. Future fast-path uses should be challenged against this proposal's reasoning.
- **External party quotes the disclosure out of context.** Mitigated by anchoring every claim to the formula on the same page and to in-repo file paths the reader can verify.

### 5.3 What is **not** a risk

- This proposal does **not** weaken the methodology lock test. The test is unchanged.
- This proposal does **not** change CODEOWNERS gating. The hard-limit files remain protected.
- This proposal does **not** introduce any new authority for the agent to edit numeric inputs to the published value.

## 6. Migration / rollout plan

This is a docs-class change with no numeric impact, so the methodology-change migration template does not apply. The deploy steps are:

1. **PR opened** on branch `index-architect/2026-06-15-published-quote-self-classification`. Title prefix `index-architect:`. Body links this proposal, the prior research note (2026-05-12), and the gap-matrix rows P7 + P8.
2. **Pre-push CI:** `pnpm -r typecheck` and `pnpm test` run locally; PR is held if either fails.
3. **Reviewer:** @CarlosGalindo2807 reviews and either (a) approves with the non-material classification recorded in the PR description, (b) requests wording changes, or (c) escalates to the 30-day-notice path (in which case this proposal is held for the public-notice window).
4. **Merge:** on approval, merge to `main`. Vercel deploys the rendered `/methodology` page automatically.
5. **Post-merge:**
   - Update `docs/research/gaps/iosco-principles.md`: P7 row → `partial / disclosed`, P8 row → `compliant`. Move both off the P0 queue. (Done in a follow-up PR or in the same PR; the gap-matrix file is not hard-limit.)
   - Update `docs/decisions.md` with a new entry: "Input-data classification published on `/methodology` (2026-06-15)" explaining the non-material classification choice. (Same PR.)
   - Append a one-line entry to the gap-matrix revision log.

### Rollback

If a defect is discovered post-merge (typo, broken render), revert the merge commit. There is no data state to roll back — no migration, no constant, no `index_values_daily` row was touched.

### Monitoring

- Vercel build status on the deploy.
- `/methodology` renders without console errors on first visit after deploy.
- `system_events` for any unexpected event in the 24h post-merge (none expected — the change is page-only).

## 7. Committee deliberation prompt

> *On 2026-06-15 the Index Committee considered a proposal to add an "Input data" section to `/methodology` containing (a) a self-classification of CTI as a published-quote benchmark and (b) a published hierarchy of data inputs and ingestion stages. The proposal does not modify `PUBLISHED_METHODOLOGY`, does not change any published `index_values_daily` value past or future, and does not amend the methodology lock test. The committee classifies this amendment as **non-material** per IOSCO Guidance IOSCOPD549 §C: the purpose is to publish a more complete description of the existing methodology, not to alter it. The 30-day public-notice period under the v1.0 charter Step 3 therefore does not apply; the disclosure takes effect on merge. The committee acknowledges that future material methodology amendments (e.g. a scaled-quorum change of the kind queued as gap-matrix Track C) will continue to require the full 30-day notice. Voted: <yes/no>, Carlos Galindo Dumitrescu, on 2026-06-15.*

## 8. Closing

After this proposal is approved and the PR merges:

- Mark `docs/research/gaps/iosco-principles.md` rows **P7** → `partial / disclosed` and **P8** → `compliant`. Update the priority queue: remove the P0 entry for "P7 + P8 — Proposal for the `/methodology` self-classification + data-input hierarchy"; verify Tracks B and C remain queued as P1.
- Add an entry to `docs/decisions.md` titled "Input-data classification + hierarchy published on `/methodology` (2026-06-15)" with the non-material classification rationale.
- Append a one-line entry to the gap-matrix revision log.
- Link the merged PR in this proposal's footer.

The next-quarter follow-ups (out of scope for this proposal, queued by gap matrix):

- **Track B (P1, infra).** Invoice-observation ingest + redaction pipeline; subsequent list-price-vs-observed-effective-price reconciliation report. Reads `invoice_observations`, writes to `docs/research/`. No hard-limit file touched.
- **Track C (P1, methodology-class).** Provider-count-scaled quorum proposal. This *would* be a material amendment and *would* run the 30-day notice — the proper use of the v1.0 charter's Step 3, contrasted with the non-material classification of this disclosure.

## 9. Sources

Primary regulatory texts (referenced; direct PDF/HTML fetch of `iosco.org`, `eur-lex.europa.eu`, `esma.europa.eu`, `legislation.gov.uk`, `newyorkfed.org` returned HTTP 403 from this session's network policy, matching the source-fetch note in the two prior research notes. Verbatim passages below are reconstructed from IOSCO- and ESMA-published search excerpts).

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13 / IOSCOPD415, July 2013 — Principle 7 (Data Sufficiency); Principle 8 (Hierarchy of Data Inputs and Expert Judgment); Principle 11 (Content of the Methodology). https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
  - Principle 7 verbatim: *"The data used to construct a Benchmark determination should be sufficient to represent accurately and reliably the Interest measured by the Benchmark and should: a) Be based on prices, rates, indices or values that have been formed by the competitive forces of supply and demand in order to provide confidence that the price discovery system is reliable; and b) Be anchored by observable transactions entered into at arm's length between buyers and sellers in the market for the Interest the Benchmark measures …"*
  - Principle 8 verbatim: *"An Administrator should establish and Publish or Make Available clear guidelines regarding the hierarchy of data inputs and exercise of Expert Judgment used for the determination of Benchmarks."*
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, IOSCOPD549, January 2018 — §C on material vs. non-material amendments. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- Regulation (EU) 2016/1011 (EU Benchmarks Regulation), Article 11 (Input data), Article 13 (Transparency of methodology). EUR-Lex CELEX 32016R1011. https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng
  - Art 11(1)(c) verbatim (from ESMA Single Rulebook search excerpt): *"The input data shall be transaction data, if available and appropriate. If transaction data is not sufficient or is not appropriate to represent accurately and reliably the market or economic reality that the benchmark is intended to measure, input data which is not transaction data may be used, including estimated prices, quotes and committed quotes, or other values."*
- ESMA, *Interactive Single Rulebook — Article 11 Input data*. https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data

Comparable-benchmark methodologies referenced for the "tape-less market" precedent set (full discussion in the 2026-05-12 note):

- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026. https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf
- IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, IOSCOPD364, October 2012. https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf
- ICE Benchmark Administration / LBMA, *LBMA Gold Price FAQs*. https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price
- MSCI, *IOSCO Principles for Financial Benchmarks*. https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco

Prior internal research this proposal builds on:

- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — three-track response analysis. §4 "Track A (now, docs-only)" maps directly to this proposal.
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — §B P7, §B P8.
- `docs/research/gaps/iosco-principles.md` — P7 row, P8 row, P0 priority-queue items 4 and bundled P1 item 7.

Internal references:

- `apps/web/app/methodology/page.tsx` — target file (hard-limit).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant (hard-limit, **not** modified).
- `apps/workers/src/functions/methodology.test.ts` — lock test (hard-limit, **not** modified).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` schema (referenced in §2.1 Tier 1).
- `docs/decisions.md` — v1.0 lock entry; pivot-v2 entry (variable 8 = invoice observations).

---

*Merged PR: <to be linked on close>.*
