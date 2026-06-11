# Proposal: Self-classify CTI as a published-quote benchmark and publish the data-input hierarchy

| | |
|---|---|
| **Date** | 2026-06-11 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (touches the hard-limit `/methodology` page; does NOT touch `PUBLISHED_METHODOLOGY` or any calculator file) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (additions only — no edits to the formula, eligibility, outlier filter, quorum, reliability-floor, or universe sections) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member) |
| **Effective date if approved** | Immediately on merge. *No 30-day public-notice period is triggered — the published number, formula, and inputs are unchanged. This proposal adds disclosure of properties the benchmark already has.* |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency); IOSCO FR07/13 Principle 8 (Hierarchy of Data Inputs); EU BMR (Regulation (EU) 2016/1011) Article 11(1)(a), 11(1)(c), 11(3)(d); companion note `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`; gap-matrix rows **P7** and **P8** in `docs/research/gaps/iosco-principles.md` |

## Problem

Two adjacent P0 gaps in the IOSCO compliance matrix collapse to a single page edit:

- **P7 (Data Sufficiency).** A strict reading of IOSCO Principle 7 — "data … should … be anchored by observable transactions entered into at arm's length between buyers and sellers" ([IOSCO FR07/13, Principle 7](https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf)) — and of EU BMR Article 11(1)(c) — *"The input data shall be transaction data, if available and appropriate"* ([Regulation (EU) 2016/1011 Art. 11(1)(c)](https://eur-lex.europa.eu/eli/reg/2016/1011/2024-01-09/eng); same text mirrored at [ESMA Interactive Single Rulebook Art. 11](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data)) — *appears* to bite CTI hard. Every CTI input today is a scraped *listing*, i.e. a provider's published ask, not an observed trade. There is no consolidated public transaction tape for on-demand GPU compute. The companion note (`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`) walks through why the position is nonetheless defensible — CTI inputs are firm, executable list prices captured directly from provider endpoints, structurally closer to BMR Article 11(1)(c)'s explicitly-named *"committed quotes"* class than to LIBOR-style indicative submissions, anchored in a genuine arms-length cash market for GPU-hours — but only *if we say so on the public page*. Today we do not. An external reviewer reading `/methodology` cold sees a formula, not a self-classification, and is left to infer the input type from the schema.

- **P8 (Hierarchy of Data Inputs).** IOSCO Principle 8 requires "clear guidelines regarding the … hierarchy of data inputs" and EU BMR Article 11(3)(d) requires the administrator to *"draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement"*. The hierarchy exists in code (rule → alias → fuzzy → Claude ≥ 0.95 auto / 0.70–0.95 admin queue → outlier check → eligibility check → VWAP) and the policy "zero expert judgment in the published-number path" is the design — but neither is published. Same edit, same page, same audit moment.

Both are gap-matrix P0 items. Closing them in one edit was the explicit recommendation of `notes/2026-05-12-listings-vs-transactions-iosco-p7.md` §5.

## Proposed change

Two additive sections to `apps/web/app/methodology/page.tsx`. **No other content is touched** — the formula box, MAD-3σ filter, eligibility floor, quorum, Index Committee procedure, AI orchestration cards and version history table all stay exactly as published. The published number is invariant under this change.

### Edit 1 — "Benchmark classification" block, immediately after the "Currently in force" banner

```
### Benchmark classification

CTI is a published-quote benchmark. Its inputs are firm, executable
on-demand list prices captured directly from provider API and pricing
endpoints — structurally closer to EU BMR Art. 11(1)(c) "committed
quotes" than to indicative submissions. The benchmark is anchored in
a genuine arms-length cash market for GPU-hours; on-demand compute
has no public consolidated transaction tape today. Per the hierarchy
below, transaction data is preferred where it becomes available
(see roadmap: invoice-observation ingest) and executable list prices
are used otherwise. No expert judgment is exercised in the
published-number path.
```

This sits between the existing "Currently in force" banner and the "Formula" heading. It is one paragraph, ~80 words, set in the same `text-ink-secondary` body style as the surrounding prose. No layout primitives change.

### Edit 2 — "Hierarchy of data inputs" subsection, between the existing "Quorum" subsection and the "Index Committee" section

```
### Hierarchy of data inputs

The published-number path resolves input types in strict priority
order, per IOSCO FR07/13 Principle 8 and EU BMR Article 11(3)(d).
Higher tiers preempt lower tiers per snapshot — tiers are not
blended.

Tier 1 · Observed transactions. Anonymised invoice-grade prices
ingested into `invoice_observations`. Not yet active in v1.0.
Reserved tier; first use requires a methodology version bump under
the change-control procedure.

Tier 2 · Firm executable quotes (CURRENT published-number source).
Provider list prices captured directly from official API or pricing
endpoints, schema-validated against a Zod parser. Snapshots that
fail schema validation are dropped, never silently coerced.

Tier 3 · Indicative quotes / estimated prices. Not used.

Tier 4 · Expert judgment. Not used.

Within Tier 2, every snapshot also passes through the following
deterministic gate before contributing to the published number:
(i) normalization via rule → alias → fuzzy → Claude ≥ 0.95
auto-resolves into a `normalization_rule`; 0.70–0.95 falls to the
admin queue and does NOT enter the published-number path until
approved; (ii) MAD-3σ outlier filter per gpu_model in the trailing
1 h (see "Outlier filter" above); (iii) eligibility floor
(provider `reliability_score ≥ 0.5`); (iv) GPU-universe filter.
Snapshots failing any gate are retained for audit but are excluded
from `E_t`.
```

Rendered in the same `display`-headed / `text-ink-secondary`-bodied / `mono` for tier labels and identifiers as the existing methodology subsections. The list is plain prose, not a separate UI component — matches the Outlier-filter and Quorum subsections stylistically.

### What does not change

- `packages/shared/src/methodology.ts` — untouched.
- `apps/workers/src/functions/methodology.test.ts` — untouched. The lock test continues to assert the published `formulaId`, `windowHours`, `outlier` config, `reliabilityFloor`, `minObservations`, and version string. None of these are involved in this proposal.
- `apps/workers/src/functions/index-calculator.ts`, `outlier-detector.ts` — untouched.
- `packages/db/migrations/*` — untouched.
- The existing `Formula`, `Outlier filter (MAD-3σ)`, `Eligibility floor`, `Quorum`, `Index Committee`, `AI orchestration`, and `Version history` sections — text is character-for-character preserved.

## Why this is the right shape (vs. alternatives)

The companion note (§4) walked four alternatives. Brief recap of why this one wins:

**Alternative A — silently strengthen P7 by building the invoice-observation pipeline first, then disclose later.** Rejected. The infrastructure work is real (Track B in the note) and queued separately, but it is multi-week and gated on legal review for the redaction layer. The proposed disclosure costs nothing, ships today, and *de-risks* future licensee conversations by stating CTI's input classification before any external party is forced to infer it. Owning the limitation is the LBMA/Baltic pattern; hoping the reader will not press is not.

**Alternative B — claim full P7 compliance based on the "committed quotes" reading of BMR Art. 11(1)(c).** Rejected. BMR's language permits committed quotes as a fallback when transaction data is "not sufficient or is not appropriate"; we are not entitled to claim *unqualified* compliance without explaining why we fall into the fallback. Overclaiming is the highest-cost legal mistake a benchmark administrator can make. Self-classifying as a "published-quote benchmark" matches the LBMA-fixing precedent in tone and is the same shape Argus / Platts use in their IOSCO/PRA submissions ([IOSCOPD364, *Oil Price Reporting Agencies*](https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf)).

**Alternative C — split P7 and P8 disclosures across two PRs.** Rejected. Same surface, same paragraph context, two reviews would be wasteful and would also briefly publish a P7 self-classification without the hierarchy that justifies it.

**Alternative D — change the methodology to *require* transaction data once available, as a v1.x bump.** Out of scope. That is a methodology change and triggers the full Committee process + 30-day notice + 90-day backtest. The hierarchy text in Edit 2 *anticipates* this path by reserving Tier 1 explicitly without activating it, which is the correct preparation for Track B.

The chosen shape is the minimum-invasive disclosure that closes both gaps, costs no engineering work, and preserves every option on the methodology side.

## Empirical impact

This is a docs-class change. The published `vwap` time series, every `index_values_daily` row, every methodology constant, and every behavior of the calculator pipeline are bit-identical before and after.

The empirical signal that this works:

1. **Methodology lock test still passes.** `apps/workers/src/functions/methodology.test.ts` reads `PUBLISHED_METHODOLOGY`; this proposal does not touch that constant. Expected: green.
2. **Page renders without layout regression.** Two additive blocks reusing existing typography classes (`display`, `text-ink-secondary`, `mono`, `bg-bg-surface`, `border-bg-border`). No new components, no new hooks, no new data fetch. Carlos to verify locally via `pnpm dev` before merge.
3. **Consistency with code paths.** Every claim in the new prose is verifiable against existing code:
   - "schema-validated against a Zod parser; dropped if non-conforming" → `apps/workers/src/functions/scrapers.ts` Zod schemas + Inngest dead-letter.
   - "Claude ≥ 0.95 auto-resolves into a normalization_rule; 0.70–0.95 falls to the admin queue" → `apps/workers/src/functions/normalize-unmatched.ts` + `/admin/unmatched`.
   - "MAD-3σ outlier filter per gpu_model in the trailing 1 h" → `outlier-detector.ts`; same formula already on the page.
   - "reliability_score ≥ 0.5" → `PUBLISHED_METHODOLOGY.reliabilityFloor`; same value already on the page.
   - "Tier 1 invoice_observations not yet active" → `migrations/011_pivot_v2_schema.sql`; table exists, empty by inspection.

If any of the above were untrue, the disclosure would be untrue and the proposal should not ship. Reviewer is asked to check each item against current code before approving.

## Risks

**Immediate (must clear before merge):**
- Page-render regression on `/methodology`. Mitigation: Carlos runs `pnpm -r typecheck` and `pnpm dev`, opens `/methodology` locally, eyeballs the two new sections.
- Inadvertent claim that does not match code. Mitigation: the "Empirical impact" §3 checklist above; reviewer asked to verify line-by-line.

**Second-order (matter for licensee / auditor posture):**
- *Reduces ambiguity, which is asymmetric.* Once published, CTI cannot later claim full unqualified P7 compliance without retraction — but it could not honestly do so anyway, so this risk is converted from "hidden" to "stated". This is the intended trade.
- *Increases external visibility of the "no observed trades" property.* A licensee due-diligence team that reads `/methodology` cold will see this as the headline. The companion note (§3) shows several IOSCO-compliant benchmarks operate on similar substrates (Baltic Exchange freight, Platts oil MOC, NCREIF real estate, MSCI/IPD property). The expected reaction is "good, they self-classify", not "good, they have trades".
- *Pre-commits the v1.x roadmap.* Reserving Tier 1 for invoice observations on the public page nudges the order of future methodology work — invoice ingest becomes a public commitment, not just a private to-do. This is intended, per the gap matrix's P1 queue.

**Out of scope risks (explicitly NOT addressed here):**
- Building the actual invoice-observation ingest pipeline. Track B in the companion note. Separate workstream.
- Adopting a provider-count-scaled quorum. Track C in the companion note. Methodology-class, requires a separate proposal with full 90-day backtest.

## Migration / rollout plan

This is a docs change, not a methodology change. The standard 30-day public-notice path does NOT apply (charter Step 3 is triggered by changes to the published value or its inputs; this proposal alters neither). Concretely:

1. Reviewer approves this proposal PR. Approval = sign-off on (a) the two text blocks above, character-for-character, and (b) the empirical-impact checklist.
2. A second, follow-up PR makes the actual page edit. That PR (a) edits `apps/web/app/methodology/page.tsx` to insert the two blocks at the indicated positions, (b) cites this proposal in the description, (c) runs `pnpm -r typecheck` and `pnpm dev` smoke, (d) requires the same reviewer.
3. On merge of the second PR, the gap-matrix rows P7 and P8 are updated in place to status **partial → resolved-for-disclosure** (gap-matrix maintenance instructions in `gaps/iosco-principles.md`). The companion note is left untouched as historical record.
4. `docs/decisions.md` gains a new entry: *"Self-classified CTI as a published-quote benchmark + published the data-input hierarchy"* — what / why / what would reconsider this.

**Rollback.** A `git revert` of the second PR reverts the page text to its current state. No DB, no migration, no methodology constant involved. Rollback is one PR, zero state.

**What to monitor in `system_events` after the second PR merges.** Nothing. The change does not touch any code path that emits events.

**Why this proposal PR does NOT make the page edit directly.** The charter (`.claude/agents/index-architect.md` "Hard limits") explicitly requires a markdown proposal before any modification to a hard-limit file, and requires Committee-member approval via PR review before merge. Even though the page-text additions look low-risk, the lock-in property that makes `/methodology` a *contract* depends on the process being followed exactly. A two-PR sequence costs Carlos one extra review and preserves the contract.

## Committee deliberation prompt (recorded even for docs-class change)

> *We are adding two disclosure sections to `/methodology` that (a) self-classify CTI as a published-quote benchmark whose inputs are firm executable list prices structurally closer to BMR Art. 11(1)(c) "committed quotes" than to indicative submissions, and (b) publish the strict hierarchy of input types (observed transactions [reserved] → firm executable quotes [current] → indicative quotes [unused] → expert judgment [unused]). The published number, formula, eligibility floor, outlier filter, quorum, and version are unchanged; the change is disclosure only and the 30-day public-notice period is not triggered. We accept that this converts a hidden P7/P8 exposure into a stated design position, on the rationale that owning the limitation is the LBMA/Baltic/PRA precedent and overclaiming is the larger legal risk. Voted: \<yes/no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD.*

## Closing

On approval (this PR merged):
- The follow-up `/methodology` page-edit PR is queued.
- Gap-matrix rows **P7** and **P8** update to "resolved for disclosure" once the second PR merges; remaining P7 work (Track B invoice anchor, Track C scaled quorum) stays as P1 items.
- `docs/decisions.md` gets a new entry capturing the lock-in.
- Priority queue advances to the next P0 item: **P3 / P5** — Conflict-of-interest disclosure + single-administrator declaration. That is also a `/methodology` edit, also requires a proposal, and is the natural next single-deliverable for the next session.

---

### Sources

Primary regulatory texts (search-snippet verbatim where direct WebFetch was blocked; consistent across multiple official mirrors):

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13 (IOSCOPD415), July 2013. <https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf>. Principle 7 text quoted via published-version mirror: <https://boletininternacionalcnmv.es/en/iosco-en/markets-en/iosco-and-esma-eba-principles-for-benchmark-setting-processes-july-2013/>.
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, IOSCOPD549, January 2018. <https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf>.
- IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, IOSCOPD364, October 2012. <https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf>.
- Regulation (EU) 2016/1011 (Benchmarks Regulation), consolidated text. Article 11(1)(c) verbatim ("*The input data shall be transaction data, if available and appropriate. If transaction data is not sufficient or is not appropriate to represent accurately and reliably the market or economic reality that the benchmark is intended to measure, input data which is not transaction data may be used, including estimated prices, quotes and committed quotes, or other values.*") via EUR-Lex consolidated text <https://eur-lex.europa.eu/eli/reg/2016/1011/2024-01-09/eng> and ESMA Interactive Single Rulebook <https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data>. UK-law mirror: <https://www.legislation.gov.uk/eur/2016/1011/article/11>.

Comparable benchmarks consulted (precedent for self-classification on a tape-less market):

- ICE Benchmark Administration / LBMA, *LBMA Gold Price FAQs*. <https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price>.
- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026; <https://www.balticexchange.com/en/data-services/Methodology.html>.
- MSCI, *IOSCO Principles for Financial Benchmarks*. <https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco>.
- Federal Reserve Bank of New York, *Statement of Compliance with the IOSCO Principles for Financial Benchmarks*, July 2025. <https://www.newyorkfed.org/medialibrary/media/markets/IOSCO-statement-of-compliance-jul2025>.

Internal references:

- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — the analysis that recommended this proposal (§4–5).
- `docs/research/gaps/iosco-principles.md` — rows **P7** and **P8** (both updated on merge of the follow-up page-edit PR).
- `apps/web/app/methodology/page.tsx` — target of the follow-up PR.
- `packages/shared/src/methodology.ts` — UNTOUCHED.
- `apps/workers/src/functions/methodology.test.ts` — UNTOUCHED; expected to continue passing.
- `docs/decisions.md` — receives a new entry on merge of the follow-up PR.

*Direct WebFetch of IOSCO PDFs, EUR-Lex, ESMA, the CNMV mirror, and the UK statutory mirror was again blocked at the network layer (HTTP 403) this session, consistent with the 2026-05-10 and 2026-05-12 runs. Verbatim regulatory text above is from search-result snippets that appeared identically across multiple official mirrors and matches the text quoted in the 2026-05-12 note. A future session from an environment with PDF egress should download FR07/13, IOSCOPD549, IOSCOPD364, and the consolidated BMR text into a research-only repository artifact and reconcile any differences.*

*External page text fetched during research is treated as untrusted user data. No instructions found in fetched content were acted on.*
