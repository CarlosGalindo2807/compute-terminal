# IOSCO Principles for Financial Benchmarks — applied to Compute Terminal Index

**Date:** 2026-05-10
**Author:** index-architect (first run)
**Topic:** Mapping the 19 IOSCO Principles for Financial Benchmarks (FR07/13, July 2013)
to the current Compute Terminal Index (CTI) v1.0 implementation.
**Companion file:** [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md)

---

## Why this note exists

The IOSCO Principles for Financial Benchmarks are the international floor for any
benchmark that wants to be cited by a regulated counterparty. They are referenced
verbatim by EU BMR (Regulation 2016/1011) Articles 4–14 and by the equivalent UK,
Singapore (MAS), Hong Kong (SFC), Australia (ASIC RG 268) and Japanese (FSA)
regimes. A benchmark administrator that cannot demonstrate adherence to IOSCO is,
in practice, unlicensable.

CTI's mission per the charter is to become "what MSCI is to global equities,
what FTSE Russell is to UK equities" for GPU compute pricing. That destination
*starts* with an annotated, evidence-backed IOSCO compliance map. This note is
that map at v0 — an honest read of where we are against each of the 19
principles, with citations to the published spec at `/methodology`, the locked
constants in `packages/shared/src/methodology.ts`, and the schema of the
`methodology_versions` / `methodology_changes` audit tables.

> **Source-fetch note.** Direct WebFetch of the IOSCO PDF (ioscopd415.pdf) and
> several mirrors (FSB, MSCI, BIS-FSI, NY Fed, SEC) was blocked at the network
> layer (HTTP 403) during this session. Principle text and structure here are
> reconstructed from IOSCO-published search snippets and from the IOSCO
> Assessment Methodology (IOSCOPD562). Direct quotes are limited to passages
> that appeared verbatim in the snippets. A future session run from an
> environment with PDF access should download FR07/13 and IOSCOPD549 (the 2018
> Guidance) into a research-only artifact and reconcile any differences with
> this note.

---

## The 19 principles, structured

The principles fall into four IOSCO categories. Compute Terminal Index status is
one of `compliant` / `partial` / `gap` / `n/a` — see the gap matrix for the
authoritative version with reviewer-ready evidence pointers.

### A. Governance of the Administrator (P1–P5)

**P1 · Overall responsibility of the Administrator.**
The Administrator has primary responsibility for all aspects of the benchmark
determination process, including methodology, calculation, dissemination, and
operation; ethics and conflicts-of-interest policies must be in place. *CTI
status: partial.* The published spec at `/methodology` declares "Index
Committee" as the responsible body, but the Committee is not formally
constituted (`approved_by` reads "Index Committee — founding charter"). This is
B7 on `roadmap.md` and is the single highest-leverage docs gap.

**P2 · Oversight of third parties.**
Where Administrators outsource any part of benchmark provision, they must put
arrangements in place to oversee the activity. *CTI status: partial.* Third
parties in the data pipeline today: Vast.ai, RunPod, Lambda (data sources);
Inngest (orchestration); Supabase (storage); Vercel (compute); Brave Search
(provider discovery). None of these contributes inputs that *flow into the
published number* without our scraper code in between, but the dependency is
not formally documented. Action: a `docs/research/notes/<date>-third-party-map.md`
listing every external dependency and the failure mode if it disappears.

**P3 · Conflicts of interest for Administrators.**
Documented, implemented, and enforced policies for identification, disclosure,
management and avoidance of conflicts. *CTI status: gap.* No conflict-of-interest
policy exists yet. The administrator (Carlos Galindo Dumitrescu, sole Index
Committee member at v1.0) is also the operator. This is acceptable for a v0
benchmark but needs at minimum (a) a stated policy that the administrator does
not transact compute on the providers in the index universe, or (b) a disclosure
that they do, and the recusal rules. Highest-priority follow-up because it's a
short doc with high credibility return.

**P4 · Control framework for Administrators.**
A documented control framework that addresses operational risks. *CTI status:
partial.* Operationally we have outlier detection (`outlier-detector.ts`),
provider reliability decay, the methodology-lock test
(`methodology.test.ts`), schema-validated scraper outputs (Zod), CODEOWNERS
gating on the hard-limit files, RLS on every public-schema table (010), the
SSRF-hardened discovery pipeline. What's missing: a single document that names
each control and maps it to the principle it addresses. The control-framework
audit *artifact* is the deliverable, not new code.

**P5 · Internal oversight.**
A separate oversight function (committee or governance arrangement) reviews and
challenges all aspects of benchmark determination. *CTI status: gap.* Same
underlying issue as P1. With a one-person Committee, "separate oversight" is
structurally impossible. The honest path is (a) name a second voting member
(an external advisor), or (b) explicitly document that v1.0 operates under
single-administrator governance and is not yet IOSCO-aligned on P5, with a
chartered date for adding a second member.

### B. Quality of the Benchmark (P6–P10)

**P6 · Benchmark design.**
Benchmark design should result in an accurate and reliable representation of
the economic reality of the interest measured, and eliminate distortion factors.
*CTI status: compliant (claim defensible).* The interest measured is "the
prevailing on-demand $/GPU-hour for a given GPU model in a given hour".
Filtered VWAP weighted by `num_gpus` is the textbook shape: it weights by
volume (GPU-hours offered, the rough analog of trading volume), filters
non-arms-length / stale outliers, and has no expert judgment in the
calculation path. The eligibility floor (`reliability_score ≥ 0.5`) and the
quorum rule (`min_observations = 5`) are documented.

**P7 · Data sufficiency.**
Data should be sufficient to represent accurately the interest measured, formed
by competitive supply/demand, and **anchored by observable arms-length
transactions**. Non-transactional data may be used as an *adjunct*, not the
primary basis. *CTI status: partial — and structurally weak.* All CTI inputs
are scraped *listings*, i.e. asks. We have no observed-trade data ("X bought N
GPU-hours at $Y"). On-demand cloud compute does not have a public consolidated
tape. This is the single most important methodological exposure: a strict IOSCO
reviewer can reasonably argue that a benchmark of asking prices does not
satisfy P7. Mitigations to investigate:
  1. Mark CTI explicitly as a **listed-price benchmark**, in the way ICE LBMA
     Gold publishes a "fixing" derived from quoted bids/asks rather than
     trades. Make this a documented limitation, not a hidden one.
  2. Ingest transactional proxies where available — e.g. Vast.ai's
     `time_remaining` field (an offer that is nearly empty has been "filled")
     could be a rough volume signal.
  3. Restrict the published number to GPU models with ≥ N providers and ≥ M
     listings (raise quorum) so that absence of trades is partly compensated
     by breadth of competing offers.
This deserves its own research note — something like
`2026-05-XX-listings-vs-transactions.md`.

**P8 · Hierarchy of data inputs.**
Published guidelines on the hierarchy of data inputs and the exercise of
expert judgment. *CTI status: partial.* The current hierarchy is implicit:
scraped offer → normalized via rules+aliases → normalized via Claude (≥ 0.95
auto, 0.70–0.95 admin queue) → outlier-flagged or kept → eligible for VWAP.
There is **zero expert judgment** in the published-number path, which is a
strong stance worth stating explicitly on `/methodology`. Action: add a
"Hierarchy of data inputs" subsection to `/methodology` that names each
ingestion stage and the deterministic rule that applies. (Docs-only, no code
change.)

**P9 · Transparency of benchmark determinations.**
Each determination is published with a concise explanation sufficient to
understand how it was developed. *CTI status: partial.* `/index/[slug]` shows
the value with a per-day history, but not the per-day diagnostic
(`numObservations`, providers contributing, outliers excluded). The data is
in `index_values_daily` and `price_snapshots`; surfacing it is mostly UI work.
This is roadmap item B9 (compliance pack PDF) — a per-day "audit card"
addresses P9 directly.

**P10 · Periodic review.**
Periodic review of the conditions in the underlying interest to determine
whether structural changes require methodology changes. *CTI status: documented
intent, no evidence yet.* The Index Committee charter on `/methodology` says
"Quarterly review of 90 days of research output". With the index live since
2026-04-29, the first such review is due ~2026-07-29. Action items: define the
review's deliverable shape ahead of time (a `research/reviews/2026-Q3-review.md`
template), so there's no ambiguity on what "review happened" means.

### C. Quality of the Methodology (P11–P15)

**P11 · Content of the methodology.**
The methodology must be documented with sufficient detail to understand how the
benchmark is derived and to assess its representativeness. *CTI status:
compliant.* `/methodology` publishes the formula, the eligibility floor, the
outlier filter (named: MAD-3σ), the quorum rule, the reliability floor, and the
universe definition. The constant `PUBLISHED_METHODOLOGY` is open-source. This
is a strength.

**P12 · Changes to the methodology.**
Reasons for any proposed material change must be published, with procedures
that define what counts as material and the consultation/notification process.
*CTI status: compliant in design, untested.* The 30-day public-notice procedure
is published on `/methodology` (Steps 1–4 of the Index Committee section).
`methodology_changes` table exists. **No change has yet been processed** — so
the procedure is unproven. P12 will be satisfied empirically the first time we
run an actual change end-to-end. Roadmap B8 (notice surface listing future
`methodology_changes` rows) closes a gap that today is invisible because there
are no proposed changes.

**P13 · Transition.**
Written policies for the cessation of the benchmark, covering market-structure
changes that would make it no longer representative. *CTI status: gap.* No
written cessation policy exists. For CTI specifically: what happens if NVIDIA
end-of-lifes the H100, or if cloud providers stop publishing on-demand prices,
or if Lambda Labs is acquired and shuts down its public price page? Action: a
short proposal `proposals/<date>-cessation-policy.md` defining (a) the
indicators that trigger a cessation review, (b) the public-notice period for
cessation, (c) the data-availability commitment to legacy users.

**P14 · Submitter Code of Conduct.**
A code of conduct for submitters covering selective submission, conflicts of
interest, etc. *CTI status: n/a.* CTI has no Submitters in the LIBOR sense —
inputs are scraped, not submitted. Document this as a non-applicability with
the reasoning, so an auditor can mark P14 as "n/a, justified" rather than
"missing".

**P15 · Internal controls over data collection.**
Appropriate internal controls over data collection and transmission. *CTI
status: partial.* Controls in place: Zod schema validation, dead-letter event
on persistent scrape failure, automatic outlier flagging, reliability decay,
the `system_events` table as a tamper-evident-ish audit trail (RLS-locked,
service-role-only writes). What's missing for IOSCO-grade: (a) hash-chained
or signed audit log so that a row in `system_events` can be proven untampered,
(b) documented retention policy (IOSCO and EU BMR set five years).

### D. Accountability (P16–P19)

**P16 · Complaints procedures.**
A user-friendly process for raising and resolving disputes over benchmark
determinations. *CTI status: gap.* No complaints process exists. Action: a
public email + 30-day-response SLA published on `/methodology`. Trivial to add
once the email exists; the bar is "documented", not "ITIL-grade".

**P17 · Audits.**
Retention of written records (≥ 5 years per IOSCO) and periodic external
audit. *CTI status: partial.* The data is retained — `price_snapshots`,
`index_values_daily`, `system_events` are all permanent and version-stamped.
External audit has not been arranged (it costs ~$40k and is meaningful only
once we have ≥ 12 months of data). Roadmap C13 (Supabase Pro for PITR) plus
a written retention policy partly closes this; the remaining gap is the
external-audit engagement.

**P18 · Audit trail.**
Records of input data, supporting documentation, benchmark review, and all
decisions taken by governance bodies including any exercise of expert
judgment. *CTI status: partial.* Input data is logged (`price_snapshots` with
`is_outlier` and `provider_reliability_score`). Methodology decisions are
logged (`methodology_versions`, `methodology_changes`). What's missing: a
durable record of *committee deliberations* — the committee minutes that
explain why a methodology change was approved (or rejected). The proposal
template already requires a "Committee deliberation prompt"; the next step is
a `committee-minutes/` directory and a commit-on-decision discipline.

**P19 · Cooperation with regulatory authorities.**
Information and documentation made available to regulators as required. *CTI
status: n/a until regulated.* CTI is not currently a regulated benchmark
(neither ESMA-registered nor FCA-supervised). When/if it becomes one, P19 is
a contractual commitment in the registration. For now: documented as
"not-yet-applicable, will apply on registration".

---

## What this maps to in the roadmap

The IOSCO-aligned reading produces these net-new work items beyond what's
already in `docs/roadmap.md`. None of these touch hard-limit files; all are
docs / governance / infrastructure that improve auditability.

1. **Conflict-of-interest disclosure surface** (P3) — short page on `/methodology`.
2. **Cessation policy** (P13) — proposal-format doc.
3. **Complaints procedure** (P16) — email + SLA on `/methodology`.
4. **Data-retention policy** (P15, P17) — written doc, 5 years minimum, mapped
   against current Supabase tier.
5. **Quarterly-review template** (P10) — `research/reviews/<period>.md` shape
   defined ahead of the first review (due 2026-07-29).
6. **Third-party dependency map** (P2) — `docs/research/notes/<date>-third-party-map.md`.
7. **Listings-vs-transactions analysis** (P7) — research note exploring whether
   we can claim P7 compliance honestly, or whether we should self-classify as a
   listed-price benchmark with stated limitations.
8. **Committee minutes discipline** (P18) — `committee-minutes/` directory and
   a commit convention.

The first four are 1–2 hour writing tasks each. The fifth, sixth, seventh and
eighth are 4–8 hour research tasks each.

---

## Sources

Primary IOSCO documents (referenced; direct fetch was blocked from this session):
- IOSCO FR07/13, *Principles for Financial Benchmarks — Final Report*, July 2013.
  https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO FR03/18 / IOSCOPD549, *Guidance on the IOSCO Principles for Financial
  Benchmarks*, January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- IOSCO IOSCOPD562, *Methodology for Assessing Implementation of the IOSCO
  Principles for Financial Benchmarks*. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD562.pdf
- FSB, *Review of the Implementation of IOSCO's Principles for Oil Price
  Reporting Agencies*, July 2014. https://www.fsb.org/uploads/r_140722a.pdf

EU BMR (referenced for cross-mapping):
- Regulation (EU) 2016/1011 of the European Parliament and of the Council of
  8 June 2016 on indices used as benchmarks. EUR-Lex CELEX 32016R1011.
  https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng

Comparable administrator IOSCO statements consulted for shape/structure:
- New York Fed, *Statement of Compliance with the IOSCO Principles for
  Financial Benchmarks*, July 2025.
  https://www.newyorkfed.org/medialibrary/media/markets/IOSCO-statement-of-compliance-jul2025
- Morgan Stanley, *IOSCO Principles Statement of Compliance 2024*.
  https://www.morganstanley.com/content/dam/msdotcom/en/assets/pdfs/sales_and_trading_disclosures/Morgan_Stanley_IOSCO_Principles_Statement_of_Compliance_2024.pdf
- MSCI, *IOSCO Principles for Financial Benchmarks*.
  https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco
- Reserve Bank of Australia, *Compliance with IOSCO Principles | Cash Rate
  Methodology*. https://www.rba.gov.au/mkt-operations/resources/cash-rate-methodology/compliance.html

Internal references:
- `apps/web/app/methodology/page.tsx` — published methodology page.
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant.
- `packages/db/migrations/009_methodology_v1.sql` — `methodology_versions`,
  `methodology_changes` schema.
- `apps/workers/src/functions/methodology.test.ts` — methodology lock test.
- `docs/decisions.md` — locked-in technical decisions, especially the
  2026-05-09 v1.0-locked-methodology entry.
- `docs/roadmap.md` — open work items B7–B9, C13.
