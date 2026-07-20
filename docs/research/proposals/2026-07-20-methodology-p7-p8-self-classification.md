# Proposal: Self-classify CTI as a *published-quote benchmark* on `/methodology`, and publish an explicit Data-input hierarchy

| | |
|---|---|
| **Date** | 2026-07-20 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (touches a hard-limit page: `apps/web/app/methodology/page.tsx`) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` — text-only additions, no changes to formula, constants, or computation |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member) |
| **Effective date if approved** | Same-day on merge. **No 30-day public notice required** — the change adds classification prose and publishes an existing (in-code) hierarchy; it does not alter any input, weight, filter, quorum, or output of the published number. See §*Migration / rollout plan* below for the reasoning. |
| **References** | IOSCO FR07/13 Principles [7](https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf) (Data Sufficiency) and [8](https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf) (Hierarchy of Data Inputs); IOSCO Guidance [IOSCOPD549](https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf) (Jan 2018); [EU BMR (Regulation (EU) 2016/1011)](https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng) Article 11(1)(a)/(c) and Article 11(3)(d) (published guidelines on input hierarchy); [ESMA Interactive Single Rulebook, Art. 11](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data). Companion research: [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md); gap-matrix rows [P7 and P8](../gaps/iosco-principles.md). |

## Problem

Gap-matrix rows **P7** (*Data Sufficiency*) and **P8** (*Hierarchy of Data Inputs*)
are the top-priority items on the IOSCO queue and the single most-pressed-on
weakness a serious external reviewer will surface. Concretely:

- **P7.** Every CTI input is a scraped *listing* (a firm executable on-demand
  ask), not an observed trade. IOSCO Principle 7 requires a benchmark to be
  "anchored by observable transactions"; EU BMR Art 11(1)(c) requires
  administrators to *prefer* transaction data where available and, where it
  isn't, to use "estimated prices, quotes and **committed quotes**". CTI's
  inputs are structurally in the *committed-quotes* fallback class, but the
  published page never says so — the exposure is currently hidden rather than
  disclosed.
- **P8.** A hierarchy of data inputs exists in code (rule → alias → fuzzy →
  Claude ≥ 0.95 → Claude 0.70–0.95 admin queue → outlier check → eligibility
  floor → quorum → VWAP) with zero expert judgment on the published-number
  path. BMR Art 11(3)(d) requires this hierarchy to be *published*; today it's
  implicit.

The full analysis and precedent survey (Baltic Exchange assessment indices, oil
PRAs' Market-on-Close, LBMA auction fixes, MSCI/NCREIF appraisal indices) lives
in [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md).
The note's recommended single next deliverable is exactly this proposal:
self-classify precisely and publish the hierarchy in one edit to `/methodology`.

Closing both rows in the same edit is cheaper (one Committee action, one page
diff) and legally cleaner (a reviewer sees the classification *and* the
hierarchy it slots into as one coherent statement).

## Proposed change

Add **two new subsections** to `apps/web/app/methodology/page.tsx`, sequenced
immediately after the existing "Quorum" subsection and before the "Index
Committee" section. **No changes to any existing subsection**, no changes to
the formula block, no changes to `PUBLISHED_METHODOLOGY`, no changes to any
constant, no schema changes, no test changes.

### Subsection 1 — "Classification: published-quote benchmark"

Rendered near-verbatim from the following text. Wording is deliberately
conservative — states the design choice, cites the regulatory basis, and does
**not** claim IOSCO or BMR *compliance* (which requires steps beyond this
change: named Committee, COI disclosure, complaints procedure, external audit).

> ### Classification
>
> CTI is a **published-quote benchmark**. Its inputs are *firm, executable
> on-demand list prices* captured mechanically from provider endpoints — the
> same prices a buyer would pay if they clicked "rent" at capture time. They
> are not indicative submissions and not estimated prices.
>
> On-demand compute has no public consolidated transaction tape. There is no
> exchange print, no clearing venue, and no regulator-mandated trade
> reporting. Under EU BMR Article 11(1)(c), administrators facing this
> condition may use *"estimated prices, quotes and committed quotes"* as
> inputs, provided (i) transaction data is preferred where available and
> (ii) the hierarchy is published. CTI's inputs fall in the *committed-quotes*
> class of that fallback.
>
> The interest measured — the prevailing on-demand $/GPU-hour for a given
> GPU model in a rolling 24-hour window — is anchored in a genuine arms-length
> cash market for GPU-hours. The published number is computed with **no expert
> judgment** on the calculation path (see hierarchy below). A separate
> workstream stands up the `invoice_observations` table (schema present since
> migration 011) as a validation anchor — a periodic reconciliation of the
> published list-price index against anonymised observed effective prices.
> That reconciliation, when it ships, does not change the locked formula; it
> is an audit artifact.

### Subsection 2 — "Hierarchy of data inputs"

Rendered near-verbatim from the following. Structure mirrors how MSCI and
Bloomberg publish their input hierarchies — an ordered stage list, with the
deterministic rule that applies at each stage and the failure disposition.

> ### Hierarchy of data inputs
>
> Per EU BMR Article 11(3)(d), the priority order in which inputs are treated,
> and the point at which expert judgment could enter (it does not), is
> published below. Every stage is deterministic; every rejection is
> event-logged; nothing on the published-number path is discretionary.
>
> | # | Stage | Rule | On failure |
> |---|---|---|---|
> | 1 | **Scrape** | Provider REST/GraphQL/HTML endpoint parsed into a typed offer record (`{price_per_hour, num_gpus, gpu_model_string, captured_at, provider_id}`). | Zod schema mismatch → dropped; not silently coerced. Persistent failure → `scraper_run_failed` event, provider reliability decays. |
> | 2 | **Normalize (deterministic)** | `gpu_model_string` matched to the catalog via (a) exact rule, (b) alias, (c) fuzzy. | If none match → row goes to `unmatched_listings` and does *not* enter any published number until resolved. |
> | 3 | **Normalize (LLM-assisted)** | Unmatched strings drain hourly through a Claude batch (Sonnet 4.6). Confidence ≥ 0.95 auto-resolves into a `normalization_rule` and back-fills snapshots; 0.70–0.95 goes to `/admin/unmatched` for one-click human approval; < 0.70 is queued for review. | Below 0.70 → snapshot stays out of the index. |
> | 4 | **Outlier filter** | MAD-3σ per-GPU-model on prices in the last 1 hour. Flag written to `price_snapshots.is_outlier`. | Flagged rows excluded from `E_t`. |
> | 5 | **Provider eligibility** | `provider.reliability_score ≥ 0.5`. Reliability is computed from observed scrape success rate and outlier ratio, decays automatically, and has no manual override. | Below floor → all rows from that provider excluded. |
> | 6 | **Universe** | `gpu_model ∈ I.universe` for the specific index being computed. | Outside universe → excluded from that index (may enter another). |
> | 7 | **Quorum** | `|E_t| ≥ 5`. | Below quorum → **no value is published for that index-day**. No fallback, no carry-forward, no extrapolation. An `index_value_skipped` event is recorded. |
> | 8 | **Calculation** | Filtered VWAP weighted by `num_gpus` over `E_t`. | Deterministic — no failure mode below the input level. |
>
> **Expert judgment.** There is none in the calculation path. Human judgment is
> confined to (a) approving 0.70–0.95-confidence normalization matches
> (structural — affects which snapshots exist, not how they are weighted), and
> (b) quarterly Index Committee review of the methodology itself (procedural —
> governed by the change-control policy below). No human overrides the daily
> published value; if inputs are insufficient, the day is skipped.
>
> **Preference for transaction data.** Where transaction data becomes available
> and appropriate for a specific slice (e.g. anonymised invoice observations
> under the `invoice_observations` schema), the Committee's stated preference —
> per BMR Art 11(1)(c) — is to admit it as a higher-priority input class than
> executable quotes. Doing so is a methodology change and follows the full
> committee procedure and 30-day public notice below.

### Concrete JSX layout

Insert one JSX `<section>` element for each subsection into
`apps/web/app/methodology/page.tsx` between the current "Quorum" block (line
127) and the "Index Committee" `<section className="mt-16">` block (line 137).
Both use existing utility classes on the page — `display text-xl` for the
subsection heading, `text-ink-secondary` for prose, `mono …` inline styles for
constants and column-header formatting on the table. No new components, no new
imports, no state, no client hooks. The table is a plain `<table>` styled to
match the existing "Version history" table on the same page (uses `bg-bg-surface`
header, `divide-y divide-bg-border` rows).

## Why this is the right shape (vs. alternatives)

**Alternative A — Do nothing; wait until we have `invoice_observations` data.**
Rejected. The exposure is present today; the classification is what turns it
from *hidden weakness* into *stated design position*. A reviewer who reads
`/methodology` today would justifiably note the absence of the classification
and hierarchy as gaps against BMR Art 11(3)(d) and IOSCO P8. Waiting on the
invoice ingest pipeline (weeks/months) leaves those gaps open when a docs-only
edit closes both today. Once the pipeline ships, the reconciliation report is
an *additive* audit artifact that strengthens the same claim.

**Alternative B — Claim IOSCO-aligned status.** Rejected as overclaim. This
proposal only closes P7 and P8. P3 (COI disclosure), P5 (single-administrator
governance), P16 (complaints procedure), P17 (external audit), and others remain
open. Claiming full alignment before those close would be defensible only in
the sense that "we are working towards it" — which is not what the phrase
"IOSCO-aligned" means to a Big Four auditor or a fund lawyer. The proposal
therefore states the classification without labelling CTI as *compliant* or
*aligned* with either framework.

**Alternative C — Publish the hierarchy but not the classification.** Rejected
as incoherent. The hierarchy is meaningful only once the reader knows what
class of benchmark it belongs to. A hierarchy without a classification reads
like an implementation note; the classification without a hierarchy reads like
marketing. Bundling both is the pattern MSCI, Bloomberg BSBY, and ICE follow on
their own methodology pages (see [MSCI IOSCO hub](https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco);
[ICE Precious Metals Methodology](https://www.ice.com/iba/lbma-precious-metals)).

**Alternative D — Ship it as a v1.1 methodology bump with 30-day notice.**
Rejected. The 30-day-notice discipline is a contract about *changes to the
published number*. No number changes. The change is a public disclosure about
what the number already is. Applying the notice period to disclosure edits
would (a) devalue the notice signal — licensees would learn to ignore v1.x
bumps that don't actually change anything, and (b) delay a defensive disclosure
by a month for no protective benefit. **Committee approval is still required**
via CODEOWNERS on the target file; the 30-day period is not.

## Empirical impact

Not a methodology change: no formula, constant, filter parameter, weight, or
universe changes. **The last 90 days of `index_values_daily.vwap` are
identical before and after this proposal by construction** — the code path is
untouched, and the methodology lock test (`apps/workers/src/functions/methodology.test.ts`)
continues to guard `PUBLISHED_METHODOLOGY` byte-for-byte.

The empirical claim underneath the change *is* verified: every stage in the
published hierarchy above corresponds 1:1 to an existing code path or database
constraint. Cross-references for the Committee to spot-check:

| Hierarchy stage | Guaranteed by |
|---|---|
| 1 · Scrape (Zod schema) | `apps/workers/src/functions/scrapers.ts` — schema-validation + drop; `scraper_run_failed` event on persistent failure |
| 2 · Normalize (deterministic) | `apps/scrapers/core/normalizer.py` — rule/alias/fuzzy fast path; `apps/workers/src/functions/normalize-unmatched.ts` — TS analog |
| 3 · Normalize (LLM) | `apps/workers/src/functions/normalize-unmatched.ts` (confidence gate); `/admin/unmatched` page |
| 4 · Outlier filter | `apps/workers/src/functions/outlier-detector.ts` (MAD-3σ, 1h window per GPU) + `packages/shared/src/methodology.ts:mad` |
| 5 · Provider eligibility | `apps/workers/src/functions/index-calculator.ts` — `reliability ≥ PUBLISHED_METHODOLOGY.reliabilityFloor` filter |
| 6 · Universe | `compute_indices.methodology.gpu_models` — enforced in `index-calculator.ts` |
| 7 · Quorum | `PUBLISHED_METHODOLOGY.minObservations` = 5; skipped with `index_value_skipped` event when below |
| 8 · Calculation | `packages/shared/src/methodology.ts:filtered_vwap` |

Any discrepancy between the published page and one of these files would be a
factual error in the disclosure — the sole failure mode of this proposal — and
is the point of the Committee spot-check.

## Risks

**Immediate:**
- *None to computation.* No code changes to any file that writes
  `index_values_daily`; methodology lock test unaffected; typecheck and test
  suite unchanged.
- *Factual drift.* If the published page describes the hierarchy differently
  from what the code does, the disclosure becomes worse than silence. Mitigant:
  the mapping table above; the Committee spot-check; and a follow-up test —
  proposed for a subsequent PR, not this one — that snapshots the published
  hierarchy against the constants it references.

**Second-order:**
- *Perception of overclaim.* The proposal is worded to state a design position,
  not to claim compliance. If external readers nonetheless read the addition as
  "CTI is BMR-compliant", that is a communications risk on the specific
  wording. Mitigant: the proposed text uses "may use" / "class of that
  fallback" / "the Committee's stated preference" — regulator-adjacent
  language, not marketing language — and explicitly separates classification
  from compliance.
- *Perception of underclaim.* A licensee looking for a compliance statement may
  read the classification as "not yet compliant". This is accurate: we are not
  yet compliant with IOSCO on P3/P5/P16/P17. The proposal is a step on that
  path, not a substitute for it. Roadmap items B7 (name Committee), a
  forthcoming COI proposal (P3), and B9 (compliance pack) chip at the remainder.
- *Locking in a wrong classification.* The "published-quote benchmark" phrase
  is a design choice, not a regulator-conferred category. If a future EU BMR
  amendment or IOSCO guidance uses a different term of art for this class, the
  page can be re-worded in a subsequent proposal — the underlying substance
  (executable quotes, no expert judgment, no transaction anchor yet) is what
  is being disclosed, and the phrasing is defensible today.

## Migration / rollout plan

This is a docs / disclosure change to a hard-limit page. It does **not** touch
the published number, the methodology constant, the version tag, or any
computed output. Rollout is therefore:

1. **Committee approval.** PR reviewed and approved by @CarlosGalindo2807
   (sole founding Committee member); CODEOWNERS on
   `apps/web/app/methodology/page.tsx` enforces the gate. Approval doubles as
   the Committee minute for this decision (see the deliberation prompt below);
   the PR link goes into the forthcoming `docs/committee-minutes/` directory
   when it lands (P18 follow-up).
2. **No 30-day notice.** The 30-day public-notice procedure applies to
   *changes to the methodology itself* — the formula, constants, universe,
   filter parameters, or the meaning of the published number. This proposal
   changes none of those. It adds a public statement about how those inputs are
   currently sourced and how they flow. Precedent: MSCI and S&P routinely
   update methodology-page prose (adding disclosures, clarifying language)
   between formal methodology reviews without triggering the reconstitution /
   effective-date discipline, which is reserved for material changes to
   constituents, weights, or calculation.
3. **Deploy.** Merge to `main` → automatic Vercel deploy → new page live on
   `/methodology` within the standard ISR window (`revalidate = 300`).
4. **Gap-matrix update.** Immediately after merge, edit
   `docs/research/gaps/iosco-principles.md`:
   - Row P7: status `partial / structurally weak` → `partial (disclosed;
     Track B outstanding)`; evidence adds "self-classification live at
     `/methodology`, this PR"; priority stays P0 until Track B (invoice anchor
     + reconciliation) ships.
   - Row P8: status `partial` → `compliant`; evidence adds "Hierarchy-of-data-
     inputs section live at `/methodology`, this PR"; drop from the priority
     queue.
   - Revision log: date-stamped entry noting the P7/P8 disclosure landed.
5. **Roadmap update.** No roadmap entry existed for this item; the
   gap-matrix update above is the tracking. A stub note in `docs/roadmap.md`
   pointing to Track B (invoice anchor + reconciliation) is appropriate as a
   follow-up PR.
6. **Monitoring.** None new. `system_events` and existing observability are
   unchanged.
7. **Rollback.** `git revert` on this commit fully reverses the change. No
   data is written by this PR, so there is nothing to migrate back.

## Committee deliberation prompt (methodology only)

The Committee should paste the following (with edits) into its decision record.
Not strictly required for a docs disclosure, but recorded here because the
change touches a hard-limit surface and the record-keeping discipline is what
distinguishes this project from an unregulated data feed.

> "We approve the classification of CTI as a *published-quote benchmark* on
> `/methodology`, and the publication of the eight-stage data-input hierarchy,
> effective on merge. Neither change alters the published methodology, the
> constant `PUBLISHED_METHODOLOGY`, or any computed value in
> `index_values_daily`; the last 90 days of published numbers are unchanged by
> construction. The classification aligns CTI's disclosure with IOSCO
> Principles 7 and 8 and with EU BMR Article 11(3)(d)'s requirement to publish
> a hierarchy of data inputs. We are not claiming IOSCO or BMR *compliance* —
> that requires closing separately-tracked P3/P5/P16/P17 items — only
> disclosing the classification honestly. We accept the second-order
> communications risk of the classification being read as overclaim, and note
> that the wording is deliberately conservative. Track B (invoice anchor +
> reconciliation) remains queued as a subsequent workstream; this proposal is
> not a substitute for it.
> Voted: <yes/no>, Carlos Galindo Dumitrescu, on 2026-<MM>-<DD>."

## Closing

After this proposal is approved (PR merged):
1. Edit `docs/research/gaps/iosco-principles.md` per §*Migration / rollout
   plan* step 4 above.
2. Update this proposal's footer with the merged PR link and the merge date.
3. Update `docs/decisions.md` with a new entry: *"P7/P8 disclosure — CTI
   self-classified as a published-quote benchmark; input hierarchy published"*
   with the "why we chose this shape / reconsider when" fields.
4. Open the follow-up issue for **Track B** (invoice-observation ingest +
   reconciliation report) with a clear link back to this proposal and to
   [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
   §4.B, so the P7 track continues without losing context.

---

*Merged PR: <fill in on merge>. Merge date: <fill in on merge>.*
