# Proposal — self-classify CTI as a *published-quote benchmark* on `/methodology` and publish the data-input hierarchy

| | |
|---|---|
| **Date** | 2026-06-08 |
| **Author** | index-architect (fourth run) |
| **Risk class** | governance / docs (disclosure refinement on a hard-limit page; **no** change to `PUBLISHED_METHODOLOGY`, the index calculator, the outlier detector, or any past or future `index_values_daily.vwap` value) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit). No code/constant/migration changes. |
| **Required reviewer(s)** | @CarlosGalindo2807 (Index Committee, sole founding member; also page maintainer per CODEOWNERS) |
| **Effective date if approved** | Recommended **same-day as merge** (editorial disclosure of existing state — see §6). Committee may instead apply the 30-day notice period; either is defensible. Charter default is 30 days. |
| **References** | IOSCO FR07/13 Principles **7** (Data Sufficiency) and **8** (Hierarchy of Data Inputs); IOSCO/IEA/IEF/OPEC PRA Principles (IOSCOPD364) §V (data hierarchy); EU BMR (Reg (EU) 2016/1011) **Article 11(1)(c)** (transaction-data preference, committed-quotes fallback) and **Article 11(3)(d)** (publish guidelines on the priority of input types). URLs in §8. Internal: gap-matrix rows **P7** + **P8** (`docs/research/gaps/iosco-principles.md`); research note [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md). |

---

## 1. Problem

The current `/methodology` page publishes the formula, eligibility floor, outlier
filter, quorum and universe definition with full precision — strong on IOSCO
P11 (Content of Methodology). It does **not** state, in the page itself:

1. What **class** of input data CTI uses, in IOSCO/BMR terms.
   `price_snapshots` rows are firm executable list prices captured from provider
   endpoints — i.e. **committed quotes** in the BMR Art 11(1)(c) sense — but
   the page never names this. A licensee, auditor, or regulator reading the page
   today must infer it from the formula and the code.

2. The **hierarchy** of input data that the methodology recognises.
   IOSCO P8 and BMR Art 11(3)(d) require an administrator to "draw up and
   publish clear guidelines regarding the types of input data, the priority of
   use of the different types of input data and the exercise of expert
   judgement." The CTI hierarchy *exists in code* (rule → alias → fuzzy →
   Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check →
   eligibility check → VWAP) but it is *implicit*, not published.

These are the gap-matrix's two highest-priority unresolved quality-pillar items
(P7 Track A, P8) and they share the same page edit. The companion research note
`notes/2026-05-12-listings-vs-transactions-iosco-p7.md` ends with:

> "Recommended single next deliverable: the `/methodology` self-classification
> + data-input-hierarchy proposal (Track A). It closes the two highest-leverage
> quality-pillar gaps (P7, P8) at once, is a contained docs/page change, and
> turns CTI's most-pressed-on weakness into a stated design position before any
> external licensee conversation surfaces it."

This proposal is that deliverable.

> **Why the timing is now and not later.** A strict IOSCO reviewer can press on
> P7 the moment a licensee conversation starts. The defensible answer
> (CTI inputs are firm executable quotes from a real arms-length transactional
> market, used as committed quotes under BMR Art 11(1)(c)'s explicit fallback,
> with the transaction layer designed for and `invoice_observations` already
> migrated) is *strong* — but only if it is **published** before being asked.
> Stating it pre-emptively is the LBMA-fixing / Baltic-assessment / oil-PRA
> pattern: *own the classification, publish the hierarchy*. Stating it
> reactively, after a reviewer flags the absence, is the LIBOR-era pattern.

## 2. Proposed change

Two new `<section>` blocks added to `apps/web/app/methodology/page.tsx`,
inserted **between** the existing "Formula" section (which ends after the
"Quorum" subsection at the current file `</section>` closing line) and the
"Index Committee" section. No other change to the page; no change to any
constant, calculator, test, migration, or stored value.

**§ Data inputs — what we measure** (new section, ~12 lines of JSX):

> ## Data inputs
>
> CTI is a **published-quote benchmark**. Each row in `price_snapshots` —
> the only input class to the published number — is a *firm executable list
> price* captured directly from a provider's price endpoint (API or rendered
> page). A buyer can purchase at that price by clicking through; we record
> the headline rate, the provider, the GPU configuration and the capture
> timestamp, with no transformation other than the unit-normalisation
> documented in the universe definition.
>
> Under the EU Benchmarks Regulation (Regulation (EU) 2016/1011,
> [Article 11(1)(c)](https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng)),
> these inputs are **"committed quotes"** — the regulation's explicit
> permitted input class when transaction data is not available or
> appropriate. They are not estimated prices, indicative submissions, or
> expert assessments.
>
> The underlying interest CTI measures — the prevailing on-demand
> $/GPU-hour for a given GPU model — is a real arms-length cash market:
> Vast.ai, RunPod, Lambda, CoreWeave and the hyperscalers transact GPU-hours
> continuously and competitively. There is no public consolidated
> transaction tape for on-demand compute. The roadmap entry for
> `invoice_observations` (anonymised real-paid prices, schema landed in
> migration 011) is the designed home for a future transaction-anchor
> layer; until that pipeline is built and a methodology change is proposed
> through the Index Committee, the published number rests entirely on
> committed quotes.
>
> CTI is anchored in observable transactional activity (the underlying
> market) and computed from committed quotes (the input class). The
> distinction matters for IOSCO Principle 7 (Data Sufficiency) and is made
> here so it is not silently inferred.

**§ Hierarchy of data inputs** (new section, ~20 lines of JSX):

> ## Hierarchy of data inputs
>
> The Committee recognises the following hierarchy. Where multiple classes
> are available for a given (GPU, hour), the higher class takes priority.
> The published number today rests on class **2** only; classes **1** and
> **3** are reserved for future methodology versions, which would require
> Committee approval and 30 days' public notice.
>
> | Rank | Class | Used in v1.0? | Source |
> |---|---|---|---|
> | 1 | **Concluded arm's-length transactions** in compute-hours, anonymised by `(provider, gpu_model, customer_spend_band, contract_type)` | No (table exists, ingest pipeline unbuilt) | `invoice_observations` (migration 011) |
> | 2 | **Committed quotes** — firm executable list prices captured from provider endpoints, schema-validated, num-GPU-weighted, MAD-3σ-filtered | **Yes — sole input class** | `price_snapshots` |
> | 3 | Indicative quotes, forward listings, reserved-instance schedules | No | Reserved for future expansion |
> | 4 | Expert judgment / discretionary adjustment | **Never** used in the published-number path | — |
>
> Within class 2, every row passes through the same deterministic
> ingestion pipeline before it can enter the eligible set $E_t$:
>
> 1. **Scrape** — Inngest function fetches the provider endpoint on a 5-min
>    schedule (see the [DevOps section](#) below) and parses with a
>    Zod schema. Rows that fail the schema are discarded, not coerced.
> 2. **Normalise** — the GPU string is resolved against the catalogue via
>    deterministic rules + aliases + fuzzy match. Unmatched strings go to
>    an hourly Claude batch; resolutions with confidence ≥ 0.95 auto-promote
>    to permanent rules, 0.70 – 0.95 enter `/admin/unmatched` for human
>    one-click approval. No row enters `price_snapshots` until its GPU
>    string is resolved.
> 3. **Outlier check** — MAD-3σ flag (see Outlier filter above) writes
>    `is_outlier` per snapshot.
> 4. **Eligibility check** — provider `reliability_score ≥ 0.5`, GPU model
>    in the index universe, captured in the 24-hour window.
> 5. **VWAP** — the locked formula above.
>
> **Expert judgment is excluded from the published-number path by
> construction.** The index calculator does not accept manual overrides;
> the formula is fixed; the outlier filter is deterministic; the
> reliability decay is mechanical. This is a deliberate choice — it
> sacrifices the responsiveness available to a benchmark with a Submitter
> panel in exchange for full reproducibility from open code and open data.

### Exact placement in the file

In `apps/web/app/methodology/page.tsx`, insert the two sections between the
current line `</section>` that closes the Quorum block (around line 134) and
the `<section className="mt-16">` that opens "Index Committee" (around
line 136). No other lines change.

### Word counts and load impact

Combined ~280 words of body copy + a 4-row table + a 5-step ordered list. No
new client-side dependencies, no React Server Component changes, no new data
fetches. Page first-load impact: undetectable.

## 3. Why this shape (vs. alternatives)

Three alternatives were considered before settling on this one:

| Alternative | What it would look like | Why rejected |
|---|---|---|
| **A. Claim unqualified IOSCO P7 compliance.** | Add a "We comply with IOSCO Principle 7" line to `/methodology`. No data-class disclosure. | Overclaim. Inputs are not observed trades. A reviewer who notices will downgrade trust in *every* other claim on the page. The Baltic Exchange, the oil PRAs and ICE/LBMA explicitly *own* their input classification — they do not paper over it. Following that pattern is structurally more credible. |
| **B. Disclose the gap as a weakness, no classification.** | Add "Note: our inputs are scraped offers, not transactions. We are not currently IOSCO-aligned on P7." | Honest but defeatist. Mischaracterises the actual position: CTI inputs are firm executable quotes from a real cash market — substantively closer to LME firm quotes than to LIBOR submissions. BMR Art 11(1)(c) explicitly permits committed quotes. Stating "we are not aligned" understates a defensible position and discourages licensee conversation. |
| **C. Bump `PUBLISHED_METHODOLOGY_VERSION` to `v1.1` and treat as a methodology change.** | New row in `methodology_versions`; 30-day notice; backtest. | Wrong category. The version number identifies the calculation, not the documentation. No formula, parameter, or computed value changes. Bumping the version would (a) cause licensees who reference `v1.0` in settlement contracts to question what changed, and (b) cause `index_values_daily.methodology_version` to flip mid-stream for no computational reason. The audit-trail principle is "published numbers are immutable" — incrementing the version on a docs change pollutes that signal. |
| **D (chosen). Self-classify as published-quote, publish the hierarchy, hold the version.** | Two new docs sections; no version bump; no number changes. | Matches the substance of the change (docs only). Closes P7 (Track A) + P8 simultaneously. Mirrors how MSCI/IPD self-classifies its appraisal-based real-estate indexes, how the Baltic Exchange self-classifies its assessment indices, and how the oil PRAs publish their concluded-transactions → bids/offers → other-market-information hierarchy under IOSCOPD364. |

The chosen shape also forward-secures the v1.x methodology path. When
`invoice_observations` is ingested and the Committee elevates real-paid
prices to class 1, the change is *promoting a class within the published
hierarchy* — exactly the BMR-compliant motion the regulation contemplates.
Without the hierarchy published today, that future change would have to be
framed as "introducing a new input type", which is a much heavier consultation.

## 4. Empirical impact

**Computed values.** This proposal changes **zero** `index_values_daily.vwap`
rows, past or future. Verification:

- No edit to `packages/shared/src/methodology.ts` (the `PUBLISHED_METHODOLOGY`
  constant is untouched).
- No edit to `apps/workers/src/functions/index-calculator.ts` (the function
  that writes `vwap`).
- No edit to `apps/workers/src/functions/outlier-detector.ts`.
- No edit to `apps/workers/src/functions/methodology.test.ts` (the lock test
  remains green and is not weakened).
- No new migration. No change to `methodology_versions` or
  `methodology_changes`.

A grep for the changed file path will return only `apps/web/app/methodology/page.tsx`.

**Reviewer-facing impact.** A licensee, auditor, or regulator reading the page
on the merge date sees:

1. A named **data-input classification** ("published-quote benchmark") that
   maps cleanly to BMR Art 11(1)(c).
2. A published **hierarchy** that satisfies the IOSCO P8 / BMR Art 11(3)(d)
   "draw up and publish" requirement.
3. An explicit **declaration that expert judgment is excluded** from the
   published-number path — a stronger statement than most IOSCO-aligned
   administrators can make.

The gap-matrix rows P7 (Track A) and P8 transition from `partial` to
`compliant for the published-quote regime, Track B / C remain open` in the
revision log entry that accompanies the merge.

**Page rendering impact.** Manual smoke test on local Next.js dev server
recommended pre-merge:
- Page renders without React hydration warnings.
- Table is responsive at ≤640 px (use the existing `overflow-x-auto` pattern
  visible on the formula block at line 86).
- No new `dangerouslySetInnerHTML`; all copy is JSX text.

## 5. Risks

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Licensee reads "published-quote benchmark" as a downgrade vs. "transaction-anchored". | Medium | Low | Companion landing-page / sales-deck copy frames it as the LBMA/Baltic/PRA standard. The classification is what every comparable benchmark has *also* published; not having published it is the weaker position. |
| Future methodology change to elevate `invoice_observations` to class 1 is read as a fundamental redesign. | Low | Medium | The hierarchy makes the future motion small ("promote class 1 from designed to active"), not large ("introduce a new input type"). Risk decreases over time. |
| Regulator (ESMA, FCA) at first contact requests a fuller statement of compliance covering all 19 principles. | Medium | Low | Gap-matrix and the IOSCO-principles note are the skeleton of that statement. The Committee can convert them into a formal Statement of Compliance in a subsequent PR. This proposal is one of the building blocks. |
| Committee approves text differently from the verbatim above. | Medium | None | Expected and welcomed. The exact copy is the proposal's substance; iterating in PR review is the design intent. |
| The 30-day notice question is contested at merge time. | Medium | Low | §6 lays out both options. Either path is defensible. Same-day-merge is the recommendation; 30-day-notice is the conservative fallback. |

No risk to `vwap`, no risk to historical reproducibility, no risk to the
methodology lock test, no risk to licensee settlement contracts referencing
v1.0 — because none of these things change.

## 6. Migration / rollout plan

This is a **disclosure refinement on a hard-limit page**, not a methodology
change. The two natural options:

**Option A (recommended) — same-day effective, no version bump.**
- The Committee charter's 30-day public notice in `/methodology` Step 3
  applies to *methodology changes that take effect on the announced effective
  date*. This proposal changes **no computation**; the disclosure describes
  current state more precisely. Same-day effectiveness preserves the rule
  while not invoking it.
- Merge → `/methodology` rendered with the two new sections immediately.
- A one-line note added to the existing "Currently in force" banner:
  *"Disclosure refined 2026-06-DD — published-quote classification +
  data-input hierarchy added. No formula change."*
- Revision-log entry in `docs/research/gaps/iosco-principles.md` records the
  P7 / P8 status transition.

**Option B (conservative fallback) — 30-day notice anyway.**
- Treat the disclosure as a quasi-methodology change.
- PR merged, but the two sections gated behind a `effectiveFrom` date 30
  days out. Until that date, a "Proposed disclosure refinement, effective
  YYYY-MM-DD" notice surface (gap-matrix B8) renders the same copy as a
  preview.
- This costs a render-gating block + the B8 notice surface (which we want
  anyway for future methodology changes).
- Committee may prefer this purely for institutional discipline — "every
  change to the methodology page goes through the same procedure" is a
  cleaner principle than "some do, some don't".

**Either option** preserves the audit trail:
- The new copy lives in version control with the merge commit as evidence.
- The gap-matrix revision-log records the date and the principle resolved.
- Future Statement of Compliance can cite the merge commit hash as evidence
  for P7/P8 compliance dating from that date.

**Rollback plan (Option A or B).** A single `git revert <merge-commit>` removes
the two sections, with no data implications. The proposed text is purely
additive; nothing it adds is depended on by any other file in the repo.

## 7. Committee deliberation prompt

> "We are publishing on `/methodology` the explicit self-classification of
> CTI as a published-quote benchmark whose inputs are committed quotes under
> BMR Art 11(1)(c), and we are publishing the four-rank hierarchy of data
> inputs that the methodology recognises (concluded transactions →
> committed quotes → indicative quotes → expert judgment) along with the
> deterministic 5-step pipeline by which class-2 inputs enter the eligible
> set. The published number does not change. The published version does
> not change. We are choosing to own this classification now, in a
> contained docs-only edit, rather than have it surfaced reactively in a
> first licensee or auditor conversation. We are accepting that some
> licensees may at first read 'committed quotes' as weaker than
> 'transactions' — and we are relying on the published hierarchy, the
> documented exclusion of expert judgment, and the `invoice_observations`
> roadmap entry to make clear that this is the design pattern of every
> comparable benchmark of a tape-less market (Baltic Exchange, oil PRAs,
> MSCI/IPD real estate). We adopt **Option A (same-day effective, no
> version bump)** / **Option B (30-day notice)**: voted YES / NO,
> Carlos Galindo Dumitrescu, on 2026-MM-DD."

## 8. Sources

Primary regulatory texts (verbatim language for IOSCO P7, P8 and BMR Art 11(1)(c)
quoted in §2 is taken from these documents; **direct PDF/HTML fetch from this
environment returned HTTP 403** for `iosco.org`, `eur-lex.europa.eu`, and
`esma.europa.eu` in both 2026-05-10 and 2026-06-08 sessions, so quoted passages
are reconstructed from publisher-published search excerpts and from the
benchmark-administrator statements that quote them. A future session with PDF
egress should download all three and reconcile — but the language reproduced
is consistent across all four secondary sources consulted):

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13
  (IOSCOPD415), July 2013 — Principle 7 (Data Sufficiency), Principle 8
  (Hierarchy of Data Inputs).
  https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*,
  IOSCOPD549, January 2018 (proportionality / transaction-anchoring
  interaction).
  https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, IOSCOPD364,
  October 2012 (the published *concluded transactions → bids/offers → other
  market information* hierarchy referenced in the proposed copy).
  https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11
  (Input data) — paragraphs 1(a), 1(c), 3(d).
  EUR-Lex CELEX 32016R1011.
  https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng
- ESMA Interactive Single Rulebook, Article 11.
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data

Comparable-administrator IOSCO statements consulted for shape/structure of the
proposed copy:

- MSCI, *IOSCO Principles for Financial Benchmarks* (statement of compliance
  hub).
  https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco
- MSCI/IPD, *Indexes and Benchmarks — IOSCO Report 2016*.
  https://www.msci.com/documents/10199/3252826/MSCI+IPD+Indexes+and+Benchmarks+-+IOSCO+Report+2016+-+11+July+2016.pdf
- Argus Media, *Argus Completes IOSCO Benchmark Review & Audit* (press
  release).
  https://www.argusmedia.com/en/about-argus/media-centre/press-releases/argus-iosco-benchmark-review-compliance
- Argus Media response to IOSCO consultation (IOSCOPD399).
  https://www.iosco.org/library/pubdocs/399/pdf/Argus%20Media.pdf
- Platts response to IOSCO consultation (IOSCOPD399).
  https://www.iosco.org/library/pubdocs/399/pdf/Platts.pdf
- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026.
  https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf
- ICE Benchmark Administration, *LBMA Precious Metals — Methodology*.
  https://www.ice.com/iba/lbma-precious-metals
- New York Fed, *Statement of Compliance with the IOSCO Principles for
  Financial Benchmarks*, July 2025 (worked example of disclosure shape).
  https://www.newyorkfed.org/medialibrary/media/markets/IOSCO-statement-of-compliance-jul2025

Internal references:

- `apps/web/app/methodology/page.tsx` — target file (hard-limit).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant
  (NOT modified by this proposal).
- `apps/workers/src/functions/methodology.test.ts` — lock test (NOT modified).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations`
  schema (referenced in proposed copy).
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` —
  prior session's research; this proposal is its recommended deliverable.
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — §B
  P7 / P8 / P11.
- `docs/research/gaps/iosco-principles.md` — rows P7 and P8 (status owner
  of record; revision-log entry to be added on merge).
- `docs/decisions.md` — "Pivot to 'Bloomberg for buyers'" (variable 8 =
  behavioral / invoice pricing); "Five-methodology A/B → Locked methodology
  v1.0".
- `docs/roadmap.md` — B7 (Committee naming), B8 (notice surface — required
  only under Option B above), B9 (compliance pack PDF — downstream P9 work).

## Closing

After this proposal is approved (PR merged):

1. The follow-up PR translates §2 into the actual JSX edit on
   `apps/web/app/methodology/page.tsx`. That PR's diff is the proposal
   section §2 copied into the file at the insertion point identified above,
   plus the one-line banner note from §6 Option A (or the gated-render
   scaffolding from §6 Option B, per Committee choice).
2. `docs/research/gaps/iosco-principles.md` is updated in place: rows
   **P7** and **P8** transition status, a revision-log entry dated to the
   merge of the follow-up PR is added.
3. `docs/decisions.md` gains a new entry "Self-classified as published-quote
   benchmark, published the input hierarchy (2026-MM-DD)" recording the
   rationale and the linked PRs.
4. This file gains a footer linking to the proposal PR and the follow-up PR.
5. The next index-architect session can move to the next P0 gap-matrix item
   (P3 / P5 — Conflict-of-interest disclosure and single-administrator
   declaration on `/methodology`).

---

*This proposal touches a hard-limit file in its follow-up PR. Per the
charter, that PR requires explicit @CarlosGalindo2807 approval before merge
and may, at the Committee's choice, follow the 30-day public-notice
procedure (Option B, §6). This proposal PR itself touches only files under
`docs/research/`; no hard-limit file is modified by merging this proposal.*
