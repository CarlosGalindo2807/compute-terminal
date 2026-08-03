# Proposal: Publish CTI's input-class self-classification and data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-08-03 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs / governance — clarifies the existing published spec without changing any computed value |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit surface). No change to `packages/shared/src/methodology.ts` or `apps/workers/src/functions/methodology.test.ts`. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Committee member, per gap-matrix row P1) |
| **Effective date if approved** | 7 calendar days after the implementation-PR merge, under the "administrative amendment" path proposed below (§Migration). Alternative: 30 days, if the Committee prefers Path B. |
| **References** | IOSCO FR07/13 Principles 6 (Benchmark Design), 7 (Data Sufficiency), 8 (Hierarchy of Data Inputs), 11 (Content of the Methodology); EU BMR (Reg. 2016/1011) Art. 11(1)(a)–(c), Art. 11(3)(d), Art. 13(1)(a). See §Sources for URLs and the source-fetch note. |

## Problem

The gap matrix rows [P7](../gaps/iosco-principles.md#b-quality-of-the-benchmark) and P8 (both `P0`, both queued as items 4 in the rolling priority queue) identify two positions the published `/methodology` page currently holds **implicitly** rather than in print:

1. **Input-class self-classification (P7).** Every CTI input is a firm, executable on-demand list price scraped from a provider endpoint — not an observed transaction. IOSCO Principle 7 requires benchmarks to be "anchored by observable transactions entered into at arm's length between buyers and sellers", and the same Principle states that this "does not preclude from using executable bids or offers … in an active market" (FR07/13). EU BMR Art. 11(1)(c) codifies the equivalent hierarchy: transaction data is preferred; where "not sufficient or not appropriate", other input types "including estimated prices, quotes and committed quotes, or other values" may be used. The prior research note [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) established that CTI's scraped listings are substantively closer to BMR "committed quotes" than to indicative submissions, and mapped a three-track response (A: docs self-classification; B: `invoice_observations` transaction anchor; C: scaled quorum). This proposal is **Track A**.

2. **Hierarchy of data inputs (P8).** BMR Art. 11(3)(d) obliges an administrator to "draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data, and the exercise of expert judgement." The hierarchy exists deterministically in code (scrape → normalize → outlier check → eligibility → aggregate); it is not published on `/methodology`.

Both gaps are hidden-not-absent: a technically-literate reader can *infer* the answer today from `packages/shared/src/methodology.ts` and the scraper source, but neither the input class nor the hierarchy is stated. That is exactly the "implicit position reads as 'not thought about'" failure mode the gap matrix flags. Closing both in the same page edit is the cheapest defensible action available today.

## Proposed change

Two new sections in `apps/web/app/methodology/page.tsx`, inserted between the existing "Formula" section (currently ending around line 134, after the "Quorum" subsection) and the existing "Index Committee" section (currently beginning around line 137). No text elsewhere on the page is edited. Copy is written in the existing page voice ("The formula is published here, version-controlled, and only changes through review by the Index Committee") and reuses the existing typographic components (`display`, `mono`, `text-ink-secondary`).

### (a) New section — "Input data"

> ### Input data
>
> CTI is a **published-quote benchmark**. Every input is a firm, executable
> on-demand list price captured directly from a provider's public endpoint —
> REST, GraphQL, or, where those are unavailable, the same public pricing
> HTML a buyer would see at checkout. We do not receive submissions from
> panellists; there is no expert judgment in the input path.
>
> On-demand GPU compute is a real, competitive, arm's-length cash market.
> Vast.ai, RunPod, Lambda and the hyperscalers transact GPU-hours
> continuously at their published prices. What the market does not have
> is a public consolidated transaction tape. In the absence of one, CTI
> takes the same substance-of-market approach used by comparable
> benchmarks: the LBMA precious metals fix (executable orders at a
> fixing auction), the Baltic Exchange freight indices (panel
> assessments in a market without a print tape), and the oil price
> reporting agencies (bids, offers and confirmed transactions blended
> in a Market-on-Close window). The benchmark is anchored in the
> market it measures; the input class is disclosed.
>
> IOSCO Principle 7 states that data anchoring "does not preclude from
> using executable bids or offers … in an active market", and EU
> Benchmarks Regulation Art. 11(1)(c) explicitly permits "committed
> quotes" where transaction data is not available or appropriate,
> provided the hierarchy is published (Art. 11(3)(d)).
>
> **Roadmap to a transaction anchor.** Migration
> `011_pivot_v2_schema.sql` reserves an `invoice_observations` table
> for anonymised real-paid prices per `(provider, gpu_model,
> spend_band, contract_type)`. When that table is populated we intend
> to publish a periodic reconciliation of the CTI list-price index
> against the median observed effective price — a validation anchor
> that does not alter the locked formula. Any future incorporation of
> transaction data as a *weighted input class* would be a v1.x
> methodology change under the standard 30-day procedure.

### (b) New section — "Hierarchy of data inputs"

Rendered as a table with the same border/spacing treatment used elsewhere on the page:

> ### Hierarchy of data inputs
>
> Every input flows through the same deterministic stages. No stage
> exercises human judgment on the published-number path. Any deviation
> — for example an emergency methodology change — requires unanimous
> Committee approval and a same-day public notice.
>
> | Stage | Deterministic rule | Auditable trace |
> |---|---|---|
> | 1 · Scrape | Schema-validated fetch (Zod). Parse failure → drop, emit `scraper_run_failed`. No coercion, no defaults. | `price_snapshots` insert or `system_events.scraper_run_failed`. |
> | 2 · Normalize | Rule → alias → fuzzy match against `normalization_rules`. Unmatched drain hourly to Claude (Sonnet 4.6): confidence ≥ 0.95 auto-adopts a new rule; 0.70–0.95 → admin approval queue; < 0.70 → discard. | `normalization_rule_id` per snapshot; audit row in `unmatched_listings`. |
> | 3 · Outlier check | `|p_i − median(P_g)| > 3 · MAD(P_g)` over the trailing 1 h of the same GPU model. Flagged rows are excluded from `E_t`. | `price_snapshots.is_outlier`. |
> | 4 · Eligibility | `provider_reliability_score ≥ 0.5` AND `gpu_model ∈ I.universe` AND `captured_at ∈ [t − 24 h, t)`. | Reconstructible from `price_snapshots` × `providers.reliability_score` history. |
> | 5 · Aggregate | `filtered_vwap` weighted by `num_gpus`. If `|E_t| < 5` publish nothing and emit `index_value_skipped`. | `index_values_daily.vwap`, `.methodology_version`, `.contributing_provider_ids`. |

### (c) No other change

- `PUBLISHED_METHODOLOGY` in `packages/shared/src/methodology.ts`: **unchanged**.
- `apps/workers/src/functions/methodology.test.ts` lock test: **unchanged** — every asserted constant remains equal.
- Formula, outlier filter, eligibility floor, quorum, universe: **unchanged**.
- Every past row in `index_values_daily`: **unchanged in value** (and future rows will continue to be computed identically).

## Why this is the right shape (vs. alternatives)

Three alternatives were considered:

1. **Do nothing.** Rely on the technically-literate reader inferring the input class from the constant. Rejected: the P0 status exists precisely because unstated positions read as "not thought about" to external reviewers. Cost of publishing the disclosure is one page edit; cost of not publishing is a first-conversation embarrassment.
2. **Inline the disclosure inside the existing "Formula" section**, no new section headers. Rejected: buries a hierarchy inside math prose. IOSCO Principle 8 wants a *published* hierarchy structured enough for an auditor to point at.
3. **Publish the disclosure but claim unqualified P7 compliance** — i.e. "CTI meets IOSCO Principle 7 (Data Sufficiency)". Rejected: the 2026-05-12 note makes the case that CTI is *P7-defensible-as-a-published-quote-benchmark*, not P7-compliant-in-the-strict-transaction sense. Overclaiming creates real reputational risk if pressed. The chosen shape borrows the LBMA / Baltic / PRA "own the input class" pattern: self-classify precisely, publish the hierarchy, disclose the roadmap to a stronger anchor.

The chosen shape (a + b together) is the smallest edit that (i) closes gap-matrix rows P7 and P8 in one merge, (ii) preserves the v1.0 formula lock and the reproducibility of every past `index_values_daily.vwap`, and (iii) gives the Committee a concrete, quotable position for the next licensee, auditor or ESMA case-handler conversation.

## Empirical impact

- **Values that change: zero.** No row in `index_values_daily` moves, past or future — verifiable by the unchanged `methodology.test.ts`.
- **Coverage impact: zero.** No provider-day added or removed.
- **Test suite: unchanged.** No test added, removed, or modified.
- **Page footprint:** approximately +80 lines of static JSX in a server-rendered page already served with `revalidate = 300`. No new data queries, no client bundle change.
- **Signal that the disclosure "works":** the next external reviewer or licensee conversation that references `/methodology` — the section headers give both sides an anchor to cite. Concretely, on merge day, an interested reader can point at "§ Input data" instead of at inferences from source code.

## Risks

**Immediate (this PR, this session).** None to the published numbers by construction; no constant, formula or data path changes. The only substantive risk is copy fit — the page has a specific voice, and Carlos may want to edit the proposed copy lightly for consistency. That is not a methodology risk; it is normal editorial review.

**Second-order (post-merge).**

- *Anchoring effect on future methodology decisions.* Publishing "no expert judgment on the published-number path" narrows our ability to later admit a controlled expert-judgment input (e.g. an outage-day fallback). This is deliberate: reducing our future discretionary space is the *point* of a published methodology. The escape valve — "any deviation requires unanimous Committee approval and a same-day public notice" — is stated in the disclosure itself, so no future change is precluded, merely gated.
- *"Committed quotes" auditor challenge.* A strict reviewer may ask us to demonstrate that a scraped listing is genuinely executable at the posted price without material re-quote at checkout. We should keep a short evidence file (screenshot / API response) for the top-N GPU models per provider, refreshed quarterly. That is a future operational task, not a blocker for this PR.
- *Downstream licensee assumption.* If a licensee has silently assumed CTI is a transaction benchmark — unlikely, since no marketing has claimed it — this disclosure narrows their assumption. That is the right direction of drift.
- *Charter contract with the 30-day notice period.* The Committee charter on `/methodology` says "at least 30 days' notice before taking effect" for methodology changes. Whether a disclosure-only amendment that changes zero values triggers the 30-day clock is a Committee interpretation. See §Migration for both paths.

## Migration / rollout plan

This is a **disclosure / administrative amendment**, not a formula change. `PUBLISHED_METHODOLOGY` is unchanged, so `methodology_versions` does **not** get a new row. The change is recorded as a `methodology_changes` row with `change_type = 'administrative_amendment'` linked to the effective version `v1.0`.

Two paths for the Committee to choose between:

- **Path A — administrative-amendment notice, 7 days (recommended).** MSCI, S&P and FTSE Russell all distinguish "material methodology change" (public consultation + effective-date lead) from "clarification / editorial change" (short notice or immediate publication with a change note). Since no computed value moves, treating this as administrative is defensible and matches industry practice. The `/methodology` page banner would carry a "Change notice: 2026-08-DD" line during the notice window. Also codifies a lightweight precedent for future disclosure-only edits so obvious clarifications don't wait a month.
- **Path B — full 30-day notice.** If the Committee prefers to establish that *any* `/methodology` edit goes through the full window regardless of impact, that is also defensible. It strengthens the "changes only through review" contract at the cost of a longer lead on obviously-harmless edits.

**Recommendation:** Path A for this edit; adopt Path A as the default for administrative amendments going forward and codify the material-vs-administrative distinction in a follow-up proposal (out of scope here).

Rollout steps (same under either path):

1. Merge this proposal PR (docs-only, no code change).
2. Committee (Carlos) records approval as a comment on the merged proposal referencing the deliberation prompt below; commits the minutes to `docs/committee-minutes/<date>.md` (or opens a follow-up if that directory doesn't yet exist — gap-matrix row P18).
3. Insert a `methodology_changes` row: `change_type='administrative_amendment'`, `effective_from='<merge date + 7d>'` (Path A) or `+30d` (Path B), `document_url=<this PR URL>`, `rationale='Publish input-class self-classification and data-input hierarchy per IOSCO P7/P8 and BMR Art 11(3)(d). No computed value changes.'`.
4. Open the implementation PR editing `apps/web/app/methodology/page.tsx` with the two new sections (copy in §Proposed change). Merge no earlier than the `effective_from` date.
5. Update `docs/research/gaps/iosco-principles.md`: mark P7 and P8 as **compliant** (with named evidence pointing at the merged page), and remove them from the P0 queue.
6. Update `docs/decisions.md` with a new entry summarising the self-classification and the administrative-amendment precedent.
7. Monitor `system_events` for one week after the implementation merge for any unexpected `methodology_changed` events — there should be none, because no formula change is emitted.

**Rollback.** If the disclosure copy is found to be materially incorrect (not merely stylistically off), revert the implementation PR and open a corrective proposal. The `methodology_changes` row is retained with a follow-up row explaining the revert — audit-trail principle: changes are additive, not overwritten.

## Committee deliberation prompt

> "This amendment does not change any published index value, past or future.
> It publishes the input class ('firm, executable on-demand list prices') and
> the deterministic hierarchy of ingestion stages already present in the code
> path, closing gap-matrix rows P7 (Data Sufficiency) and P8 (Hierarchy of
> Data Inputs). We are accepting the reputational and operational
> commitment of a stated 'no expert judgment' position in exchange for a
> defensible IOSCO P7/P8 disclosure that a licensee, auditor or ESMA case
> handler can cite. The v1.0 formula, its parameters, and every historical
> value in `index_values_daily` remain unchanged and remain protected by
> `methodology.test.ts`. Adopted as an administrative amendment with 7-day
> notice under Path A / with 30-day notice under Path B. Voted: <yes/no>,
> Carlos Galindo Dumitrescu, on YYYY-MM-DD."

## Closing

Upon approval this proposal will:

1. Reclassify gap-matrix rows P7 (Data Sufficiency) and P8 (Hierarchy of Data Inputs) as **compliant** with named evidence.
2. Establish an "administrative amendment" precedent (Path A) with a lightweight notice window, distinct from the standard 30-day methodology-change procedure. If Committee prefers Path B, that decision is captured verbatim in the minutes and the precedent is deferred.
3. Tie the 2026-05-12 research note's Track A recommendation to a concrete page edit.

The implementation PR is expected to be one file changed (`apps/web/app/methodology/page.tsx`), roughly +80 net lines, no test changes, no runtime code changes.

---

## Sources

**Source-fetch note.** WebFetch of the IOSCO PDF (`ioscopd415.pdf`), the FSB PRA review, the EUR-Lex BMR text, the CNMV mirror and the Centre for Financial Stability commentary all returned HTTP 403 from this session's network policy — the same block reported in [`notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md) and [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md). One useful upgrade this session: WebSearch returned verbatim IOSCO P7 language via the search-engine snippet path, including the "does not preclude from using executable bids or offers … in an active market" clause that the prior notes had reconstructed from training knowledge. That quoted clause is what makes the "published-quote benchmark" self-classification a P7-defensible position and is why it appears directly in the proposed page copy above. A future session run from an environment with PDF egress should download FR07/13 and IOSCOPD549 into a research-only artifact and reconcile any residual gaps against this proposal.

Primary regulatory texts (referenced; direct fetch blocked, see note above):

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13 (IOSCOPD415), July 2013. Principles 6 (Benchmark Design), 7 (Data Sufficiency), 8 (Hierarchy of Data Inputs), 11 (Content of the Methodology), 12 (Changes to the Methodology). https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, IOSCOPD549, January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- IOSCO, *Second Review of the Implementation of IOSCO's Principles for Financial Benchmarks*, IOSCOPD553. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD553.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Art. 11 (Input data), Art. 12 (Methodology), Art. 13 (Transparency of methodology). EUR-Lex CELEX 32016R1011. https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng
- ESMA Interactive Single Rulebook, BMR Art. 11. https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data

Comparable-benchmark precedents cited in the proposed copy (context via the 2026-05-12 note):

- LBMA / ICE Benchmark Administration, *LBMA Gold Price FAQs* (auction-clearing model). https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price
- Baltic Exchange, *Guide to Market Benchmarks* v8.3, April 2026 (panel-assessment model). https://www.balticexchange.com/en/data-services/Methodology.html
- IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, IOSCOPD364, October 2012 (Market-on-Close blended bids/offers/transactions). https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf

Internal references:

- `apps/web/app/methodology/page.tsx` — the file this proposal proposes editing (hard-limit).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant. **Unchanged** by this proposal.
- `apps/workers/src/functions/methodology.test.ts` — methodology lock test. **Unchanged** by this proposal.
- `packages/db/migrations/009_methodology_v1.sql` — `methodology_versions`, `methodology_changes` schema (the `methodology_changes` row created on rollout uses this schema).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` table (the transaction-anchor roadmap the proposed copy commits us to).
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — the IOSCO principle map that first flagged P7 as "the single most important methodological exposure".
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — the Track A / B / C analysis this proposal implements Track A of.
- `docs/research/gaps/iosco-principles.md` — the P7 and P8 rows this proposal is designed to close.
- `docs/decisions.md` — "Five-methodology A/B → Locked methodology v1.0" entry (the design contract this proposal sits inside of).

*Merged PR link:* _to be added on merge._
