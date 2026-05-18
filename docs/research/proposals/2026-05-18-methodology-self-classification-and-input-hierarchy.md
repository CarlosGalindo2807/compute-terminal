# Proposal: classify CTI as a *published-quote benchmark* and publish the data-input hierarchy

|                                |                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Date**                       | 2026-05-18                                                                                                                                                                                                                                                                               |
| **Author**                     | index-architect (fourth run)                                                                                                                                                                                                                                                             |
| **Risk class**                 | docs (hard-limit page — `/methodology`)                                                                                                                                                                                                                                                  |
| **Target file(s)**             | `apps/web/app/methodology/page.tsx`                                                                                                                                                                                                                                                      |
| **Required reviewer(s)**       | @CarlosGalindo2807 (sole founding Index Committee member at v1.0)                                                                                                                                                                                                                        |
| **Effective date if approved** | 30 days after the Committee approves the PR (e.g. merge 2026-05-18 → effective 2026-06-17)                                                                                                                                                                                               |
| **References**                 | IOSCO FR07/13 **Principle 7** (Data Sufficiency), **Principle 8** (Hierarchy of Data Inputs), **Principle 14** (Submitter Code of Conduct — non-applicability); EU BMR Regulation (EU) 2016/1011 **Article 11(1)(a)–(c)** (Input data), **Article 11(3)(d)** (published hierarchy guidance) |

## Problem

`docs/research/gaps/iosco-principles.md` lists four `P0` items that block any external "CTI is IOSCO-aligned" claim. Three are sub-day docs tasks (COI disclosure / committee constitution / complaints email). The fourth — `P0` item 4 — is this one, and is the only one that touches a hard-limit file, so it has been blocking on a proposal:

> *"P7 + P8 — Proposal for the `/methodology` "published-quote benchmark" self-classification + data-input hierarchy subsection. Research done; next step is the proposal-format doc, then a PR editing the hard-limit `/methodology` page. Closes two quality-pillar gaps in one edit."*

The full reasoning is in [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md). In short:

1. **Principle 7 problem.** IOSCO FR07/13 P7 requires benchmark data to "[b]e anchored by observable transactions entered into at arm's length between buyers and sellers in the market for the Interest the Benchmark measures." Every CTI input is a scraped *listing* — a provider's published ask — not a recorded trade. On-demand GPU rental has no public consolidated trade tape. Today `/methodology` does not acknowledge this; that silence is the single most-pressed-on quality-pillar weakness, and the matrix has it as `partial / structurally weak`.
2. **Principle 8 problem.** IOSCO P8 requires the administrator to "establish and Publish clear guidelines regarding the hierarchy of data inputs and exercise of Expert Judgment used for the determination of Benchmarks." EU BMR Article 11(3)(d) imports this requirement: the administrator must "draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement." CTI's data-input hierarchy is fully implemented in code (`rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility floor → VWAP`) and has *zero* expert judgment in the published-number path — both are strong claims worth stating publicly, and neither is currently on the page.

Both gaps live on the same surface (`/methodology`) and resolve with the same edit, so this proposal bundles them. The companion note classifies CTI's inputs as **firm executable list quotes** captured directly from provider endpoints — substantively closer to BMR Article 11(1)(c)'s "committed quotes" than to LIBOR-era indicative submissions — and recommends self-classifying CTI as a *published-quote benchmark* anchored in a real arms-length on-demand cash market, with transaction data preferred *if and when* the `invoice_observations` pipeline ships (migration `011` defined the schema; data is empty today).

This is **Track A** from the note. It is intentionally docs-only and changes no math.

## Proposed change

Insert a new subsection on `/methodology` **between** the existing *Quorum* block (ends at the `index_value_skipped` paragraph, around `apps/web/app/methodology/page.tsx:133`) and the existing *Index Committee* section (`apps/web/app/methodology/page.tsx:136`), titled **"Classification & data-input hierarchy"**. Suggested copy below — Committee may edit wording but should preserve the three structural claims (input class, hierarchy in priority order, zero expert judgment) and the regulatory-source citations:

> ### Classification & data-input hierarchy
>
> **CTI is a published-quote benchmark.** Its inputs are firm, executable on-demand list prices captured directly from provider endpoints (Vast.ai REST, RunPod GraphQL, Lambda HTML, hyperscaler price catalogues). At capture time, each listing is purchasable on-click at the quoted price; in substance these are *committed quotes* in the sense of EU BMR Article 11(1)(c), not indicative submissions.
>
> **There is a real transactional market beneath the benchmark.** On-demand GPU compute is a large, competitive cash market. The Interest CTI measures — the prevailing on-demand $/GPU-hour for a given GPU model — is unambiguously real, supplied competitively, and arms-length. What does not yet exist is a public consolidated trade tape; CTI is therefore built from the strongest substitute that *does* exist publicly: the executable offers contributing to that market.
>
> **Hierarchy of data inputs (highest priority first).** In line with IOSCO Principle 8 and EU BMR Article 11(3)(d):
>
> 1. **Observed arms-length transactions in the Interest measured.** Anonymised effective $/GPU-hour from invoices (`invoice_observations`, schema present, ingest in development). When this layer is populated, the Committee will revisit whether it can enter the published formula — that is a methodology-class change subject to the full 30-day notice procedure below.
> 2. **Committed quotes in the Interest measured.** *(Current source.)* Firm executable list prices from provider endpoints; one row in `price_snapshots` per provider × GPU × capture. Eligibility: matched to a canonical GPU via the normalization pipeline, `is_outlier = false` under the MAD-3σ filter, and `provider_reliability_score ≥ 0.5`. This is the only layer the published number rests on today.
> 3. **Indicative quotes and estimated prices.** *Not used.* Marketing-page price ranges, broker estimates, and any source where the asking party cannot be transacted with at the quoted price are excluded by the scraper contracts.
> 4. **Expert judgment.** *Not used.* The published value is computed by deterministic code from layer 2. No human can override a published value; no rule applies "in their judgment". Disagreement with a published value can only be resolved by a Committee-approved methodology change to v1.x with public notice — never an ad-hoc edit.
>
> **Principle 14 — Submitters.** Inputs are scraped, not submitted. CTI has no Submitters in the IOSCO P14 sense; a Submitter Code of Conduct is therefore not applicable to v1.0. Providers whose endpoints we scrape are *data sources*, not Submitters, and have no contractual relationship with the Administrator regarding the benchmark.
>
> **Why this matters to a licensee or auditor.** A regulator's first question on any unregulated benchmark is "where is the transactional anchor?" Our answer: the on-demand compute market is genuinely transactional; CTI ingests its publicly-observable surface (executable list quotes) rather than estimates or submissions, applies a deterministic outlier filter and reliability floor, and publishes the hierarchy above so the order of preference is explicit rather than implied. The roadmap to fold real transactions into layer 1 of the hierarchy is on file (`invoice_observations`, REFRAME_v2 variable 8); whether and how to upgrade them to a published input is a future Committee decision, not an Administrator one.

**Version handling.** Two defensible options; recommendation: **Option A.**

* **Option A (recommended) — keep `PUBLISHED_METHODOLOGY` at v1.0.** This change adds disclosure, not math. `PUBLISHED_METHODOLOGY.formulaId`, `windowHours`, `minObservations`, `outlierFilter`, `weight`, and `reliabilityFloor` are unchanged. The `methodology.test.ts` lock remains untouched (no formula drift to catch). The change's audit trail is: this proposal + the merged PR commit hash + a one-line entry in `docs/decisions.md` under a new heading *"Classification & data-input hierarchy disclosure (added 2026-MM-DD)"*. The 30-day public-notice clock still runs from merge: between merge and effective date, the new subsection is rendered on `/methodology` with a yellow `Pending — effective YYYY-MM-DD` banner above it (the same machinery roadmap item B8 specifies for future changes).
* **Option B — bump to v1.0.1 with identical formula params.** Treats every public methodology statement as semver-stamped. Adds a `methodology_versions` row for `v1.0.1` (same `formula_id`, same `formula_params`, new `rationale` referencing this proposal, new `document_url`), a `methodology_changes` row `from='v1.0' to='v1.0.1'` marked clarification-only, and updates `methodology.test.ts` to expect `v1.0.1`. Side benefit: exercises the P12 change procedure end-to-end for the first time and so closes the P12 *"compliant in design, untested"* gap on the matrix. Cost: touches two hard-limit files (constant + test) for a docs-only change; risks a future auditor reading the version log and assuming the math differs.

Option A is recommended because the change is genuinely formula-identical and the Option B audit-trail tax is high relative to the marginal credibility gain. If the Committee wants the P12 dry-run, propose a **separate**, deliberately inert clarification later (e.g. v1.0.2 fixing a typo) — keep the dry-run cause and effect uncoupled from this load-bearing disclosure.

## Why this is the right shape (vs. alternatives)

| Alternative                                                                                | Why it loses                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Silence.** Leave `/methodology` as-is.                                                   | Today's state. Hidden weakness on the single most-pressed-on principle. First serious external reviewer (auditor, lawyer for a licensee, regulator pre-discussion) opens with P7 and we have no published position. Indefensible by construction — IOSCO P8 / BMR Art 11(3)(d) *require* the hierarchy be published, so the gap is regulatory, not just diplomatic.                                                                                                     |
| **Claim full P7 compliance.**                                                              | Overclaim. CTI inputs are not transactions in the strict P7 sense, and overclaiming exposes us to the much worse criticism of misrepresenting the benchmark. Several compliant administrators (PRAs, Baltic Exchange, IPD/NCREIF, ICE LBMA Gold before the auction model) make this work without claiming pure-transaction inputs — they self-classify precisely. CTI should do the same.                                                                                |
| **Skip Track A; jump to Track B (invoice anchor + reconciliation).**                       | Track B is the correct *long* play and is already on the roadmap, but it is months of work — building the redaction pipeline, soliciting customer invoice consent, validating coverage. The published page is *materially weaker* in the interim, with no upside while we wait. Track A closes the disclosure gap *today* and *sets up* Track B by establishing layer 1 of the published hierarchy as the named home for invoice data when it lands.                    |
| **Propose a v1.1 methodology change that admits proxies for transactions (utilisation).**  | Methodology-class change. Requires a backtest, the Committee process end-to-end, and exposes us to "you changed the formula to dodge a regulator question". Disclosure-first is the right sequencing: state the position clearly under v1.0; then, if and when invoice data or utilisation proxies prove out empirically, change the formula on the merits with a clean record.                                                                                          |
| **Add the hierarchy but skip the self-classification.**                                    | Half the value. P8 closes on the hierarchy alone, but P7 stays open. The whole point of bundling is that the *same paragraph* on the same page resolves both rows on the matrix.                                                                                                                                                                                                                                                                                        |

The recommended shape is the disclosure-first / self-classify-precisely pattern used by oil PRAs (Platts, Argus → IOSCOPD364), the Baltic Exchange's freight indices, MSCI/IPD property, and ICE pre-electronic-auction Gold. Every one of those is an IOSCO-aligned benchmark of a real market without a public consolidated trade tape; every one resolves the same tension by stating its input class plainly and publishing its hierarchy.

## Empirical impact

This is a docs-only change to a hard-limit page. There is no math change, no `index_values_daily` rewrite, no `price_snapshots` reprocessing. The empirical signals that say "this works" are:

1. **Each disclosure claim is verifiable against code today.** Cross-check below should be re-run by the reviewer before merge:

   | Disclosure claim                                                                  | Verified against                                                                                                                                                                                                                                                                                                                          |
   | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | Inputs are firm and executable at capture time                                    | Vast.ai REST returns `min_bid` / `dph_total` for currently-available offers; RunPod GraphQL `gpuTypes` returns `securePrice`/`communityPrice` for live machines; both are *purchasable on click* by design. Lambda's marketing page lists current on-demand prices. Documented in `apps/workers/src/functions/scrapers.ts` ports.       |
   | Eligibility = `is_outlier = false` AND `provider_reliability_score ≥ 0.5`         | `apps/workers/src/functions/index-calculator.ts` (filter loop); `packages/shared/src/methodology.ts:PUBLISHED_METHODOLOGY.reliabilityFloor = 0.5`. Documented on `/methodology` already.                                                                                                                                                  |
   | Outlier filter is MAD-3σ on the per-GPU prior-1h window                           | `apps/workers/src/functions/outlier-detector.ts`. Documented on `/methodology` already.                                                                                                                                                                                                                                                   |
   | No expert judgment in the published-number path                                   | The full path is: scraper → Zod-validated row → normalization (rule/alias/fuzzy → Claude ≥ 0.95 auto / 0.70–0.95 admin queue) → outlier detector → reliability scorer → index calculator → `index_values_daily`. *Every* step is either deterministic code or operates on a Zod-validated schema. No human override hook exists, by design. |
   | `invoice_observations` exists in schema and is empty                              | `packages/db/migrations/011_pivot_v2_schema.sql` defines the table. `select count(*) from invoice_observations;` returns 0 (verified prior runs; reviewer should re-confirm).                                                                                                                                                          |
   | Inputs are scraped, not submitted (P14 n/a)                                       | No write path to `price_snapshots` exists except from the scraper Inngest functions; no provider-facing submission endpoint exists. Anonymous + authenticated writes are blocked by RLS (010_rls_public_tables.sql).                                                                                                                       |

2. **`pnpm -r typecheck` passes.** Only `apps/web/app/methodology/page.tsx` JSX changes, no type surface affected.

3. **`pnpm test` passes unchanged.** Methodology lock test is intentionally untouched under Option A. Option B would require an explicit lock-test edit; that's by-design contract enforcement.

4. **Visual diff on `/methodology`.** New subsection between *Quorum* and *Index Committee*; same `<section className="mt-16">` cadence as adjacent blocks. No layout regressions.

There is no backtest because the formula does not change. Were the Committee to choose Option B, the formula-identical bump would also have no backtest — every published value is bit-identical before and after.

## Risks

**Immediate (mostly low):**

* **Lock-in to the "published-quote benchmark" label.** Once on the page, walking it back is more public than not having published it. Mitigation: the label is descriptively accurate and matches comparable IOSCO-aligned precedents — it's a strong position, not a corner.
* **"Firm executable" claim about scraped quotes must hold.** If Vast.ai ever serves stale or non-executable listings (e.g. machine offline but listing visible), the substance of the disclosure weakens. Mitigation: the existing reliability scorer flags exactly that pattern; if the false-listing rate ever materially rises, the disclosure should be revised (a future proposal, not this one).
* **"No expert judgment" constrains future Committee discretion.** Stating that the published-number path is judgment-free precludes future ad-hoc tweaks — by design. Mitigation: this is a *feature*, not a bug; the v1.0 lock already implies it, and stating it publicly turns implicit discipline into a contractual commitment.

**Second-order (more important):**

* **Reduces optionality on a future "we are P7-compliant" claim.** Self-classifying as a published-quote benchmark is explicitly *not* a P7 compliance claim. That preserves room to make the stronger claim later, *after* invoice observations are ingested and reconciled. The risk is reversed if we stay silent now — silence on the gap reads as either ignorance or evasion to a sophisticated reviewer, both worse than a clear self-classification.
* **Sets the precedent that disclosure-only changes can skip a version bump.** Option A's "no semver, log in `docs/decisions.md` and the merged PR" approach is novel. If the Committee adopts it for this change, it should be applied consistently to future disclosure-only edits (otherwise the audit trail bifurcates). The Committee should explicitly approve the precedent or reject it in favour of Option B.
* **Surfaces, by stating it, the gap that `invoice_observations` is empty.** A reviewer reading layer 1 of the hierarchy sees that the highest-preference layer is unpopulated. Mitigation: the disclosure says so explicitly — "schema present, ingest in development". The truthful framing is stronger than the appearance of hiding it.

## Migration / rollout plan

Per the Index Committee charter (Steps 3–4 on `/methodology`), and absent a different decision recorded in committee minutes:

1. **T+0 (merge).** PR merges to `main`. The new *Classification & data-input hierarchy* subsection ships behind a server-rendered `Pending — effective YYYY-MM-DD` banner that hides the subsection's body until the effective date (or alternatively renders the body greyed-out with a `data-pending` attribute — implementation detail for the PR). The pending notice itself is visible from merge so users have the full 30-day window.
2. **T+0 to T+30 (notice window).** No other change. A `methodology_changes` row is *not* written under Option A — there is no version transition. Under Option B the row is written at T+0 with `decision_date = T+0` and `effective_from = T+30`. If roadmap item B8 (notice surface) ships in this window, the disclosure subsection appears in it; if not, the inline banner serves the same function.
3. **T+30 (effective date).** Banner removed; the subsection becomes the published `/methodology` content. `docs/decisions.md` gains a one-line entry under the proposed heading *"Classification & data-input hierarchy disclosure"* with the merge commit hash and the proposal link. `gaps/iosco-principles.md` rows P7, P8 (and P14, which gets an n/a paragraph) are updated to `compliant` for the disclosure-side of the row; P7 retains `partial / structurally weak` on the input-side until Track B lands.
4. **Rollback.** If a defect is found in the disclosure text *between* T+0 and T+30, an emergency Committee decision revises the pending text; the 30-day clock resets only if the revision changes the *substance* of the hierarchy or classification (per the charter, "emergency changes still require unanimous committee sign-off and a public notice on the day of the change"). A typo fix or rewording does not reset the clock; a change to the substance of any of the four hierarchy layers does.

**Monitoring after merge.** No `system_events` watch needed (no data path changes). The signal to watch is the inbound channel — does the first external conversation (licensee, auditor, journalist) about CTI's input quality go more smoothly with this disclosure on the page than without? That's a qualitative signal recorded in the Committee minutes for the next quarterly review (P10).

## Committee deliberation prompt

> *"We are publicly classifying CTI v1.0 as a 'published-quote benchmark' anchored in the on-demand GPU compute cash market, with inputs that are firm executable list quotes captured at provider endpoints. We are publishing the four-layer data-input hierarchy (observed transactions → committed quotes → indicative quotes → expert judgment) and stating that today's published number rests entirely on layer 2, with zero use of layer 3 or layer 4. We accept that this disclosure (a) closes IOSCO P7 / P8 / P14 gaps on the matrix without changing the formula, (b) sets a precedent that disclosure-only methodology-page changes ship under Option A (no semver bump, 30-day notice, audit trail via proposal + PR + `docs/decisions.md` entry), and (c) defers the stronger 'P7 compliant' claim until `invoice_observations` is populated and reconciled. Voted: <yes/no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD."*

If the Committee prefers Option B (semver-bump dry-run), substitute: *"… we ship this disclosure as methodology v1.0.1, a formula-identical clarification, exercising the P12 change procedure end-to-end for the first time. The `methodology.test.ts` lock is updated to expect v1.0.1 in the same PR; the version transition is logged in `methodology_changes`."*

## Closing

On approval:

* Open a follow-up PR titled `index-architect: /methodology — classification & hierarchy disclosure` that lands the page edit per Option A (or Option B if the Committee elects). That PR is **separate** from this proposal PR; the proposal must be merged first.
* Update `docs/research/gaps/iosco-principles.md`:
  * Row **P7** — `partial / structurally weak` → `partial — disclosure resolved; input-anchor pending Track B`. Cell links to the merged PR.
  * Row **P8** — `partial` → `compliant`. Cell links to the merged PR.
  * Row **P14** — `n/a, not documented` → `n/a, documented on /methodology`. Cell links to the merged PR.
  * Revision log: append a 2026-MM-DD entry describing the P7/P8/P14 closure and the disclosure-only precedent set by this proposal.
* Update `docs/decisions.md` with the new section *"Classification & data-input hierarchy disclosure"* per the rollout plan.
* Link the merged PR in this proposal's footer.

**Footer (filled on merge):** PR #__ merged YYYY-MM-DD; effective YYYY-MM-DD.

---

### Sources

Primary regulatory texts. Direct WebFetch of these URLs was blocked at the network layer (HTTP 403) again this session, same constraint as the 2026-05-10 and 2026-05-12 runs. Quoted text below appeared verbatim in web-search excerpts and matches training knowledge of the regulations. A future session in an environment with PDF egress should download FR07/13, IOSCOPD549, and the consolidated EUR-Lex text of 2016/1011 into a research artifact and reconcile.

* IOSCO, *Principles for Financial Benchmarks — Final Report*, **FR07/13**, July 2013. Principle 7 (Data Sufficiency): *"The data used to construct a Benchmark determination should be sufficient to represent accurately and reliably the Interest measured by the Benchmark and should: a) Be based on prices, rates, indices or values that have been formed by the competitive forces of supply and demand in order to provide confidence that the price discovery system is reliable; and b) Be anchored by observable transactions entered into at arm's length between buyers and sellers in the market for the Interest the Benchmark measures in order for it to function as a credible indicator of prices, rates, indices or values."* Principle 8 (Hierarchy of Data Inputs): *"An Administrator should establish and Publish clear guidelines regarding the hierarchy of data inputs and exercise of Expert Judgment used for the determination of Benchmarks."* — https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
* IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, **IOSCOPD549**, January 2018. — https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
* Regulation **(EU) 2016/1011** (Benchmarks Regulation), Article 11 *Input data*: *"the input data shall be transaction data, if available and appropriate"*; *"if transaction data is not sufficient or is not appropriate to represent accurately and reliably the market or economic reality that the benchmark is intended to measure, input data which is not transaction data may be used, including estimated prices, quotes and committed quotes, or other values"*. Article 11(3)(d): the administrator must *"draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement"*. — EUR-Lex CELEX 32016R1011: https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng ; ESMA Single Rulebook Art. 11: https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data
* MSCI, *IOSCO Principles for Financial Benchmarks* (statement of compliance hub). — https://www.msci.com/indexes/index-resources/iosco-principles
* Federal Reserve Bank of New York, *Statement of Compliance with the IOSCO Principles for Financial Benchmarks*, July 2025 (SOFR/EFFR/OBFR). — https://www.newyorkfed.org/medialibrary/media/markets/IOSCO-statement-of-compliance-jul2025
* Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026 (precedent: panel-assessed benchmark, BMR-compliant). — https://www.balticexchange.com/en/data-services/Methodology.html
* IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, **IOSCOPD364**, October 2012 (precedent: MOC-window benchmark mixing bids/offers/transactions). — https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf

### Internal references

* `apps/web/app/methodology/page.tsx` — published methodology page (hard-limit; this proposal's target).
* `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant (hard-limit; **not** modified under Option A).
* `apps/workers/src/functions/methodology.test.ts` — methodology lock test (hard-limit; **not** modified under Option A).
* `packages/db/migrations/009_methodology_v1.sql` — `methodology_versions` / `methodology_changes` schema.
* `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` schema (layer 1 of the hierarchy, empty today).
* `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — full prose reasoning.
* `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — §B, P7 and P8 origin.
* `docs/research/gaps/iosco-principles.md` — rows P7, P8, P14 (status owner of record; updated on merge).
* `docs/decisions.md` — to be updated with the disclosure precedent on merge.
* `docs/roadmap.md` — B7 (committee constitution), B8 (notice surface), B9 (compliance pack) — adjacent, this proposal is independent of them.
