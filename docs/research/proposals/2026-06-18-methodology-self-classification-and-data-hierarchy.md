# Proposal: classify CTI as a *published-quote benchmark* and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-06-18 |
| **Author** | index-architect (fourth run) |
| **Risk class** | governance / docs (edits a hard-limit surface, but changes **no** locked methodology constant and **no** published number) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit) — adds two new sections. **Not touched:** `packages/shared/src/methodology.ts`, `apps/workers/src/functions/methodology.test.ts`, `apps/workers/src/functions/index-calculator.ts`, `apps/workers/src/functions/outlier-detector.ts`, any migration. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member). Because no published number changes, the Committee may waive the 30-day public-notice clock at its discretion — see *Migration / rollout plan*. |
| **Effective date if approved** | Immediately on merge (docs clarification, not a methodology change). Optional: a 30-day notice window for parity with future material changes. |
| **References** | IOSCO Principles for Financial Benchmarks (FR07/13, July 2013), **Principle 7** (Data Sufficiency) and **Principle 8** (Hierarchy of Data Inputs). EU Benchmarks Regulation (Regulation (EU) 2016/1011), **Article 11** (Input data) paragraphs (1)(a)–(c) and (3)(d). Companion research: [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md); gap matrix [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) rows **P7**, **P8**. |

---

## Problem

Two of the most-pressed-on rows of the IOSCO gap matrix are both about what we say
on `/methodology`, not about anything we compute:

* **Row P7 — Data Sufficiency.** Every CTI input today is a scraped *listing* (an
  ask), not an observed trade. IOSCO Principle 7 requires that a benchmark be
  "anchored by observable transactions entered into at arm's length between buyers
  and sellers." [IOSCO FR07/13](https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf)
  A strict reviewer reading `/methodology` today cannot tell whether we are
  claiming P7 compliance, ignoring P7, or self-classifying as something P7 doesn't
  fully apply to. The page is silent on its own input type. The May 12 research
  note ([`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md))
  concludes that CTI's inputs are firm, executable list prices — much closer to
  EU BMR Art 11(1)(c)'s "committed quotes" than to LIBOR-style indicative
  submissions — and that comparable benchmarks (Baltic Exchange freight indices;
  Platts/Argus oil PRAs; MSCI/IPD appraisal-based real-estate indices) run on
  non-transactional inputs while remaining IOSCO/BMR-compliant **by virtue of
  owning the limitation in writing**. We have done the analysis; we have not done
  the disclosure.

* **Row P8 — Hierarchy of Data Inputs.** EU BMR Article 11(3)(d) requires the
  administrator to "draw up and publish clear guidelines regarding the types of
  input data, the priority of use of the different types of input data and the
  exercise of expert judgement." Our hierarchy exists in code — scraper → Zod
  schema → normalizer (rules → aliases → fuzzy → Claude ≥ 0.95 auto → Claude
  0.70–0.95 admin queue) → outlier filter → reliability floor → quorum → VWAP —
  but it is nowhere published. We have a stronger story than most administrators
  do on this point (the published-number path contains **zero expert judgment**)
  and we currently get no credit for it.

These are the two highest-leverage P0 items on the gap matrix and they happen to
collapse into a single edit to the same page. This proposal is that edit.

The proposal touches a hard-limit file (`/methodology` page) for the explicit
reason that the charter (`.claude/agents/index-architect.md`) requires: even when
the edit changes no published number, the page text *is* the public contract and
any change to it flows through the proposal route.

## Proposed change

Two new sections added to `apps/web/app/methodology/page.tsx`, placed **between**
the "Currently in force" banner and the existing "Formula" section. No existing
section is removed or reworded. No methodology constant changes. No version row
in `methodology_versions` is added. The page's `PUBLISHED_METHODOLOGY_VERSION`
reference and version-history table are untouched.

### Section A — "Benchmark classification" (new H2)

Renders as a single explanatory block. Proposed copy (verbatim, ready to paste
into JSX):

> **CTI is a published-quote benchmark.**
>
> The Compute Terminal Index measures the prevailing on-demand US-dollar price
> per GPU-hour for a given GPU model. Its inputs are firm, executable list
> prices captured directly from each provider's published price endpoint — what
> a buyer would actually pay if they pressed *rent* in the next minute. They are
> not anonymous "indications" and they are not modelled estimates: each input
> is a price the provider is currently committing to honour to anyone who clicks.
>
> On-demand GPU compute is a genuine arms-length cash market — Vast.ai, RunPod,
> Lambda Labs and the hyperscalers transact GPU-hours continuously and
> competitively — but it has no public consolidated transaction tape. No single
> venue prints every fill. The substance of an executable list price is closer
> to the "committed quote" class that the EU Benchmarks Regulation
> (Regulation (EU) 2016/1011, Article 11(1)(c)) expressly admits as an
> acceptable input when transaction data is not available, than it is to a
> LIBOR-style submitted opinion. CTI is constructed entirely from this class
> of input.
>
> Several established benchmarks of real but tape-less markets are
> regulator-recognised on the same footing — the Baltic Dry Index family
> (panellist assessments; settles cleared freight derivatives at SGX/EEX/LCH),
> Platts and Argus oil price assessments (bid/offer/transaction blends published
> by Price Reporting Agencies under IOSCOPD364), and the MSCI/IPD and NCREIF
> property indices (independent professional appraisals of constituent assets).
> CTI is in this family.
>
> **Stated limitation.** Until the invoice-observation layer below ships and
> reaches sample sufficiency, the published CTI value reflects what providers
> currently offer, not the discounts a specific buyer may negotiate
> bilaterally. The reconciliation between the two will be published as a
> separate diagnostic report once the data exists; it will not change the
> published index value, which remains a function of the locked formula.

### Section B — "Hierarchy of data inputs" (new H2)

Renders as an ordered list of pipeline stages, then a single emphasised line
about expert judgment. Proposed copy:

> Every published value is the output of the same deterministic pipeline. Each
> stage applies a named, code-defined rule; nothing in the path requires human
> discretion at runtime.
>
> 1. **Capture.** Scraper functions pull the provider's current published price
>    endpoint and validate the response against a Zod schema. Rows that don't
>    match the contract are dropped, not coerced. Surviving rows land in
>    `price_snapshots` with the source URL and capture timestamp.
> 2. **Normalisation.** Each row's free-text GPU string is resolved against a
>    cascade: deterministic rule → alias table → fuzzy match → Claude
>    (Sonnet 4.6) with confidence ≥ 0.95 (auto-applied) → Claude with confidence
>    0.70–0.95 (queued in `unmatched_listings` for one-click human review).
>    Strings that don't clear any stage are excluded from the published
>    universe until resolved.
> 3. **Outlier filter.** For each `gpu_model` and each trailing 1-hour window,
>    prices outside three median-absolute-deviations of the per-model median are
>    flagged as outliers (`price_snapshots.is_outlier = true`). Outlier flags
>    are written back and auditable per snapshot.
> 4. **Eligibility floor.** A row is eligible for the index only if its
>    provider's `reliability_score` is ≥ 0.5 and its `gpu_model_id` belongs to
>    the index universe declared in `compute_indices.methodology.gpu_models`.
> 5. **Quorum check.** If fewer than 5 eligible rows remain in the trailing
>    24-hour window for a given index, no value is published for that day and
>    an `index_value_skipped` event is recorded.
> 6. **Aggregation.** The surviving rows are aggregated by the locked formula
>    (filtered VWAP weighted by `num_gpus`, currently methodology v1.0). The
>    result is written to `index_values_daily.vwap` with the methodology
>    version stamp.
>
> **No expert judgment is exercised at any stage of the published-number path.**
> All human input — provider onboarding, normalisation-confidence reviews,
> outlier post-mortems — sits *upstream* of the pipeline, never *inside* a daily
> calculation. The methodology version that produced a given published value is
> stamped on the row and is immutable.

### Implementation notes

The JSX edit is mechanical: two new `<section className="mt-12">` blocks in
`apps/web/app/methodology/page.tsx`, structurally identical to the existing
"Formula" and "Index Committee" sections. No new components, no new data
fetch, no new schema dependency. ISR (`revalidate = 300`) already on the page
makes the change visible within five minutes of merge.

Optional but recommended in the same PR: a one-line entry in `docs/decisions.md`
under a new heading "Self-classification: published-quote benchmark
(2026-06-18)" pointing back to this proposal and the May 12 note. This keeps
the proposal-to-decision audit trail dense.

## Why this is the right shape (vs. alternatives)

The May 12 note frames the response space as three tracks; this proposal is
Track A. Two alternatives the Committee should see weighed:

**Alternative 1 — claim unqualified P7 compliance.** Reject. The IOSCO
Principle 7 floor includes the words "anchored by observable transactions";
on a literal read of those words our inputs are not transactions. Quietly
claiming compliance invites a reviewer to discover the gap themselves and rate
us harder than if we had self-classified. (This is the LIBOR-era mistake. The
LBMA, Baltic Exchange and oil-PRA precedents all point the other way: own the
limitation in writing, defend the substance.)

**Alternative 2 — defer all disclosure until the `invoice_observations`
pipeline ships and we have real transaction data.** Reject. The pipeline is in
the pivot-v2 schema (migration 011) but unbuilt; reaching sample sufficiency
across spend bands is likely a 2027 deliverable. Until then, P7 silence on
`/methodology` is the riskiest posture — a published spec that omits the most
obvious question a regulator-trained reviewer will ask. Better to publish the
honest classification now and add the transaction-anchor reconciliation as a
separate diagnostic when the data exists.

**This proposal (Track A) — self-classify, publish the hierarchy, ship the
two as one page edit.** Chosen for three reasons. (1) It closes two P0
gap-matrix rows in one merge. (2) It commits to a position we can defend with
existing precedent (LBMA, Baltic, Platts/Argus, MSCI/IPD), not one we have to
invent. (3) It does not pretend to be more than v1.0 actually is — and IOSCO
reviewers reward calibrated self-assessment over inflated claims (this is
visible across the New York Fed, Morgan Stanley, RBA and MSCI public IOSCO
statements of compliance, all of which carve out non-applicable principles
rather than claim universal coverage).

## Empirical impact

This is a docs change. No methodology constant moves. No published number
changes. The empirical claim is "the new sections accurately describe what the
pipeline already does today."

Verification of each claim made in the new copy:

| Claim in new copy | Evidence file |
|---|---|
| "Inputs are firm, executable list prices" | `apps/workers/src/functions/scrapers.ts` — each scraper reads the provider's currently advertised price; e.g. `scrape-vast` calls the public REST endpoint and `scrape-runpod` posts to GraphQL, both returning prices a buyer can transact on immediately. |
| "Validated against a Zod schema; non-matching rows are dropped" | `apps/workers/src/functions/scrapers.ts` (parser blocks), `packages/shared/src/schemas/*` (Zod definitions). |
| "Normalisation cascade ends in `unmatched_listings` for 0.70–0.95 confidence" | `apps/workers/src/functions/normalize-unmatched.ts`; admin surface `apps/web/app/admin/unmatched/`. |
| "MAD-3σ outlier filter on the trailing 1-hour window per `gpu_model`" | `apps/workers/src/functions/outlier-detector.ts`; mirrored in the existing `/methodology` "Outlier filter (MAD-3σ)" section. |
| "Eligibility floor `reliability_score ≥ 0.5`; quorum `|E_t| ≥ 5`" | `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY.reliabilityFloor = 0.5`, `minObservations = 5`. Already rendered on `/methodology`. |
| "Quorum failure produces `index_value_skipped` event, no fallback" | `apps/workers/src/functions/index-calculator.ts`. |
| "No expert judgment at any stage of the published-number path" | Source code is open; the calculator is pure; there is no manual-override surface for daily values. The methodology-lock test (`apps/workers/src/functions/methodology.test.ts`) enforces this by failing CI if the published constant drifts. |

The "stated limitation" line — that the published value does not reflect
bilaterally-negotiated buyer discounts — is true by construction (we do not
observe those today) and aligns with what the May 12 note documents about
`invoice_observations`.

The "comparable-benchmark family" examples (Baltic, Platts/Argus, MSCI/IPD,
NCREIF) are sourced in the May 12 note §3; not re-litigated here.

## Risks

Three things could go wrong if this ships, ordered by likelihood:

1. **Wording precision.** The phrase "committed quote" is a regulatory term of
   art under EU BMR. We are using it analogically — Vast.ai's published price is
   not the same animal as an ICAP committed quote on a swap line. The
   proposed copy hedges with "the substance of an executable list price is
   closer to … than to …", but a regulator might press on the word choice. *Mitigation:*
   if Committee review prefers stricter wording, switch "closer to the committed
   quote class" to "closer in substance to the committed quote class than to
   indicative submissions, without claiming equivalence." Add to the page if
   the Committee opts for that.
2. **Premature commitment to the `invoice_observations` reconciliation.** The
   new copy promises a future reconciliation report. If that pipeline never
   ships, the promise ages badly. *Mitigation:* the language is "until [it]
   ships and reaches sample sufficiency" — a conditional, not a deadline. If
   the Committee later decides not to pursue invoice ingest, this line is
   updated through the same proposal route.
3. **Inviting a P7 challenge sooner.** Publishing "we are a published-quote
   benchmark, not a transaction benchmark" is more visible than saying nothing.
   A licensee or reviewer could read it and decline to engage where they would
   otherwise have asked. *Mitigation:* this is the desired outcome —
   counterparties who would reject a non-transaction benchmark are not in our
   addressable market in v1.0. Better to surface that early than to consume
   their evaluation cycle and lose at the end.

No code-path risk. No data-corruption risk. No published-number risk. The
methodology lock test continues to pass unchanged.

## Migration / rollout plan

This is a docs-only change to a hard-limit surface. The rollout is one PR
merge, no schema migration, no event, no cron change.

* **Pre-merge.** Committee reviewer (@CarlosGalindo2807) reviews this proposal
  and the accompanying page-edit PR. Run `pnpm -r typecheck` before merge.
  No `pnpm test` deltas expected; run anyway for completeness.
* **Notice window.** The 30-day public-notice clock in the Committee charter
  (`/methodology` Step 3) exists to protect downstream licensees from
  semantic changes to the published number. This proposal changes **no
  semantics and no number**. Recommendation: the Committee may merge
  immediately on approval and treat the page diff as a clarification. If the
  Committee prefers parity with all future page edits regardless of materiality,
  the alternative is to merge with `effective_from = merge_date + 30 days` and
  hold the page edit behind a feature flag for 30 days. The author recommends
  the immediate option — the present text is silent, and a *more* accurate
  silent text → *correctly* accurate text is strictly an improvement at every
  moment of the window.
* **Post-merge.** Update gap matrix rows P7 and P8 to status `compliant`
  (P8) and `partial — stated limitation, anchor pipeline tracked` (P7).
  Add a one-line entry to `docs/decisions.md` under "Self-classification:
  published-quote benchmark (2026-06-18)". Link the merged PR back into this
  proposal's footer.
* **Monitoring.** Watch `system_events` for the next 7 days for any anomalous
  `methodology_*` event (none expected — nothing in code changes). Watch
  `/methodology` page-error rate; the ISR cache will warm within 5 minutes.
* **Rollback.** Revert the PR. No data state to undo.

## Committee deliberation prompt

> "We are publishing two new sections on `/methodology` that self-classify the
> Compute Terminal Index as a published-quote benchmark — its inputs are firm,
> executable list prices captured from provider endpoints, not observed trades
> — and that publish the deterministic data-input hierarchy that produces every
> daily value. No published number changes. No methodology constant changes.
> No locked file in `packages/shared/src/methodology.ts` is touched. The
> classification matches the substance of EU BMR Article 11(1)(c) (committed
> quotes admitted as input when transaction data is not available), aligns
> CTI's posture with the Baltic Exchange / Platts–Argus / MSCI-IPD precedent of
> documented non-transaction benchmarks, and closes IOSCO Principle 7 and
> Principle 8 gap-matrix rows that are otherwise unaddressed. Voted: <yes/no>,
> Carlos Galindo Dumitrescu (sole founding Index Committee member),
> on YYYY-MM-DD."

## Closing

After this proposal is approved (PR merged):

1. Mark `docs/research/gaps/iosco-principles.md` row **P8** as `compliant`.
2. Update row **P7** to `partial — published-quote classification stated;
   invoice-observation anchor tracked as Track B`. Drop it from the P0 queue;
   add Track B (invoice ingest + reconciliation report) to the P1 queue with
   a forward reference to the eventual reconciliation-report PR.
3. Add a one-line entry to `docs/decisions.md`: "Self-classification:
   published-quote benchmark (2026-06-18). Per [`proposals/2026-06-18-…`]
   and [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`]. No
   methodology constant change."
4. Link the merged PR URL in this proposal's footer (below).

---

*Merged PR:* _(to be filled in on merge)_

*Companion note:* [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)

*Gap matrix rows closed/updated:* P7, P8 — [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md)

*Primary regulatory sources cited (direct PDF fetch blocked HTTP 403 from this
session's network, as in the 2026-05-10 and 2026-05-12 runs — URLs provided so
a reviewer can pull them from an environment with PDF egress):*

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13
  (IOSCOPD415), July 2013. Principle 7 (Data Sufficiency), Principle 8
  (Hierarchy of Data Inputs).
  https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, IOSCOPD549,
  January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, IOSCOPD364, October 2012
  (cited for the Platts/Argus assessment-benchmark precedent).
  https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data),
  paragraphs (1)(a)–(c) and (3)(d). EUR-Lex CELEX 32016R1011.
  https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng — ESMA Interactive Single
  Rulebook entry for Article 11:
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data
- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026; "Operational
  Benching" June 2025 update (cited for the panel-assessment precedent).
  https://www.balticexchange.com/en/data-services/Methodology.html
- ICE Benchmark Administration / LBMA, *LBMA Gold/Silver Price* methodology
  (cited as the auction-fix counter-example).
  https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price
- MSCI, *IOSCO Principles for Financial Benchmarks* statement-of-compliance hub
  (cited for the IPD/property-index appraisal precedent and as the structural
  template for our own future statement of compliance).
  https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco
- New York Fed, *Statement of Compliance with the IOSCO Principles for Financial
  Benchmarks*, July 2025 (cited as the structural template for principle-by-principle
  self-attestation).
  https://www.newyorkfed.org/medialibrary/media/markets/IOSCO-statement-of-compliance-jul2025
