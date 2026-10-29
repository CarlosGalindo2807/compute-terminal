# Proposal: classify CTI as a "published-quote benchmark" on `/methodology` and publish the data-input hierarchy

| | |
|---|---|
| **Date** | 2026-10-29 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (hard-limit surface — adds disclosure, does not change the published number) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` |
| **Required reviewer(s)** | @CarlosGalindo2807 (hard-limit, CODEOWNERS-gated) |
| **Effective date if approved** | On merge. No 30-day notice required (see §6). |
| **References** | IOSCO [FR07/13](https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf) — Principles 7 (Data Sufficiency) and 8 (Hierarchy of Data Inputs); IOSCO [IOSCOPD549](https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf) — 2018 Guidance; EU BMR [Regulation (EU) 2016/1011](https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng), Article 11(1)(c), 11(3)(d); companion research note [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md); gap-matrix rows P7 and P8 in [`gaps/iosco-principles.md`](../gaps/iosco-principles.md). |

## 1. Problem

Two of the five highest-leverage IOSCO gaps in [`gaps/iosco-principles.md`](../gaps/iosco-principles.md) — row **P7 (Data Sufficiency)** and row **P8 (Hierarchy of Data Inputs)** — are open on the same surface: `/methodology` does not state what *kind* of input the published number is computed from, and does not publish the deterministic hierarchy that ingested data flows through.

The companion research note [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) establishes three facts:

1. CTI inputs are scraped firm-executable list prices — closer in substance to BMR Art 11(1)(c)'s "committed quotes" than to indicative panel submissions or trade prints.
2. On-demand compute has no public consolidated transaction tape, so a listings-based benchmark is the state of the art for this market (precedents: Baltic Exchange assessments, oil PRA MOC windows, LBMA-style auction fixes are the long-horizon alternative).
3. The *defensible* position is to self-classify precisely and publish the hierarchy — the LBMA / Baltic pattern of **owning the limitation** — rather than either (a) claim unqualified P7 compliance, which overclaims, or (b) stay silent, which lets a future reviewer frame the gap for us.

This proposal closes both gaps in a single `/methodology` edit. No published number changes; `PUBLISHED_METHODOLOGY` (`packages/shared/src/methodology.ts`) is untouched.

## 2. Proposed change

Two additions to `apps/web/app/methodology/page.tsx`. Exact text in §2.1 and §2.2 below. No other file is touched by this proposal's implementation PR.

### 2.1 Preamble — classification sentence

**Where:** inside `<section className="mt-12 rounded border border-bg-border bg-bg-surface p-6">` (the "Currently in force" banner), appended as a new paragraph **immediately after** the existing closing `</div>` of the right-hand "Effective from" column, before the section's closing `</section>`. Alternatively, as a sibling paragraph after the current intro paragraph (`<p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-secondary">`) — the implementing PR will pick whichever reads better in review.

**Text to add (verbatim, mono-tone chosen to match the existing page):**

> **CTI is a published-quote benchmark.** Its inputs are firm, executable on-demand list prices captured directly from provider endpoints — in substance, "committed quotes" under EU Benchmarks Regulation Article 11(1)(c). On-demand compute has no public consolidated transaction tape; per the hierarchy below, transaction data is preferred where available and executable quotes are used otherwise. The benchmark is anchored in a genuine arms-length cash market for GPU-hours; the published number is computed with no expert judgment.

Three sentences, no code change. Links out to the companion note's path on the public site are not required for the IOSCO disclosure to be sufficient; the implementing PR may optionally add a trailing `<a>` to the GitHub-rendered note.

### 2.2 New section — "Data input hierarchy"

**Where:** a new `<section className="mt-16">` inserted **between** the existing "Quorum" paragraph (ending at line 133 of the current file) and the "Index Committee" section (starting at line 137). It is the natural place: the formula + eligibility + outlier + quorum block establishes *how* a value is computed from the eligible set; the hierarchy section establishes *how an input earns a place in that eligible set*.

**Text to add (verbatim), styled to match the Index Committee's `<ol>` numbered-list treatment:**

> ## Data input hierarchy
>
> Every observation that contributes to a published value passes through the following deterministic stages, in order. There is no expert-judgment path and no manual override. Per BMR Article 11(3)(d), administrators must publish the priority of use of the different types of input data; this is CTI's.
>
> **Stage 1 · Capture.** Firm executable list prices are scraped from provider endpoints every five minutes and written to `price_snapshots`. Zod schema validation rejects malformed rows at ingest; the dropped-row count is auditable in `system_events`. No row is silently coerced.
>
> **Stage 2 · GPU-model normalization.** Each raw GPU string resolves against a published catalog via a strict priority order: (a) exact rule match, (b) alias match, (c) fuzzy match above a fixed similarity threshold, (d) Claude Sonnet 4.6 classification with confidence ≥ 0.95 auto-promotes to a persisted `normalization_rule`, (e) Claude confidence 0.70 – 0.95 queues at `/admin/unmatched` for one-click human approval, (f) below 0.70 is discarded. Stages (a) – (c) are the deterministic fast path and account for ~ 95% of volume once the catalog has matured.
>
> **Stage 3 · Statistical validation.** Per-GPU-model MAD-3σ outlier detection runs every 15 minutes and writes `is_outlier` back to `price_snapshots`. Outlier flags are permanent per-row and auditable; a flag is never cleared retroactively. This is Principle 7's internal-controls safeguard operationalised: the input class may be quotes, but the quote cannot persist as evidence after it is shown to be a dispersion outlier.
>
> **Stage 4 · Eligibility.** An observation is admitted to the eligible set `E_t` only if its provider's `reliability_score` is at or above the published floor. Reliability auto-decays on sustained outlier ratio and auto-recovers on sustained stability. There is no manual reliability edit; current scores are visible at `/admin/health`.
>
> **Stage 5 · Quorum.** If `|E_t|` is below the published minimum, no value is published for that day. There is no fallback formula, no carried-forward value, and no extrapolation. An `index_value_skipped` event is recorded instead.
>
> **Stage 6 · Aggregation.** The locked formula (num_gpus-weighted mean on the surviving set, see "Formula" above) is applied. The result is version-stamped on write to `index_values_daily.methodology_version`.
>
> **A note on transaction data.** The `invoice_observations` schema (introduced by migration 011) is CTI's planned path for anonymised real-paid prices. Where that data becomes available at sufficient coverage, it will be published as a reconciliation report against the list-price index, and — only through a full Committee process with 30-day notice — may be considered as an input class above listings in a future methodology version. Until then, the published value is a committed-quote benchmark and is disclosed as such.

Six numbered stages plus a transition note. Mirrors the deliberate, imperative-mood house style of the existing page.

### 2.3 What this proposal does NOT change

- `PUBLISHED_METHODOLOGY` constant (`packages/shared/src/methodology.ts`): unchanged.
- `PUBLISHED_METHODOLOGY_VERSION`: stays at `v1.0`. This is a disclosure improvement to the already-published v1.0 methodology, not a new version.
- Any value written to `index_values_daily.vwap`: identical by construction.
- The methodology lock test (`apps/workers/src/functions/methodology.test.ts`): unchanged, still green.
- The 30-day public-notice procedure for *methodology* changes: unchanged, still applies to any future version bump.

## 3. Why this shape (vs. alternatives)

| Alternative | Why not |
|---|---|
| **A. Do nothing; wait for a licensee or auditor to raise P7.** | Lets the counterparty frame the gap. The LBMA / Baltic lesson is explicit: own the limitation on your own page before it is pointed out, or the conversation shifts from "sophisticated methodology choice" to "undisclosed structural weakness." The research note elaborates this precedent at §3a and §3c. |
| **B. Claim unqualified IOSCO P7 compliance.** | Overclaims. P7 explicitly requires "anchored by observable transactions" and IOSCO 2018 Guidance confirms proportionality does not relax that requirement. A listings-only benchmark cannot claim P7-full today; a reviewer would mark the claim down and would be right. |
| **C. Wait for invoice-observations ingest (Track B) to land first, then self-classify.** | Order of operations reversed. The classification is a *statement of what we are*, independent of whether the transaction anchor exists yet. Shipping the disclosure now closes the P0 queue item while Track B remains an open P1 infrastructure workstream. The classification language in §2.1 already references Track B ("transaction data is preferred where available") so no re-edit is required when Track B ships. |
| **D. Build the hierarchy section but not the self-classification.** | Closes P8 but leaves P7 open. The self-classification is the sentence that converts P7 from "structurally weak" to "stated design position"; without it the hierarchy section is procedurally clean but silent on the core question. The two gaps are naturally paired on one page edit. |
| **E (chosen). Ship §2.1 + §2.2 as a single `/methodology` edit, with this proposal as the deliberation record.** | Closes P7 (self-classification) and P8 (published hierarchy) in one page diff. No published number changes; no 30-day notice required. The CODEOWNERS gate on `apps/web/app/methodology/` keeps the human review requirement intact. |

Precedents consulted (from the companion note): **Baltic Exchange** operates a BMR-compliant benchmark on panellist assessments with no public trade tape, through published input governance ([Guide to Market Benchmarks v8.3](https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf)). **Oil PRAs** (Platts, Argus) publish prices computed on blended bids/offers/trades under a sibling IOSCO framework ([IOSCOPD364](https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf)). **LBMA Gold/Silver** take the opposite route — the fix *is* a transaction via an auction. CTI shape (A/B) today, horizon (D) long term.

## 4. Empirical impact

**Published value impact: zero.** This proposal does not alter the computation path. `index_values_daily.vwap` for any date before, on, or after the effective date is identical to what the locked `filtered_vwap` v1.0 formula produces.

**Verification before the implementation PR is opened:**

- `pnpm -r typecheck` — passes (TSX text additions, no API changes).
- `pnpm test` across `apps/workers/` — the methodology lock test continues to pin `PUBLISHED_METHODOLOGY` to the exact v1.0 shape. No test needs updating.
- The `/methodology` page continues to render; the two additions are plain prose inside the same `<main>` container.

**Observable signal that "nothing changed that shouldn't":**

- After merge, the next three nightly `index-calculator` runs continue to write `methodology_version = 'v1.0'` and the vwap values differ from the pre-merge values only by whatever natural market movement occurred, bounded by the historical day-over-day deltas visible on `/index/[slug]`.
- `methodology.test.ts` remains green on every CI run.

## 5. Risks

**Immediate (low):** none mechanical. The edit is TSX text inside an existing server component. Typecheck + unit tests cover the change.

**Second-order (low → medium):**

- *A future licensee reads "committed quotes" and expects a strict BMR Art 11(1)(c) legal mapping.* Mitigation: the classification language intentionally uses "in substance" rather than claiming formal regulated-benchmark status. CTI is not an ESMA-registered administrator (gap-matrix row P19 is explicitly `n/a until regulated`). The implementing PR should keep that phrasing exactly.
- *The hierarchy section implicitly commits future proposals to use the same framing.* This is intended — publishing a hierarchy means the ingestion pipeline cannot silently acquire a seventh stage without a methodology-class disclosure update. That is a desirable constraint, not a cost.
- *An auditor cites the published hierarchy against a future bug that bypassed Stage 3 or 4.* Also intended, and already true in substance: `methodology.test.ts` already locks the formula; this proposal makes the ingestion-stage promise equally public. Any future bypass is a defect disclosable under the same emergency-change clause already on `/methodology`.

**No risk of narrowing the v1.0 legal defensibility:** the proposal strictly adds disclosure. The locked `PUBLISHED_METHODOLOGY` constant and the version-stamp chain stay identical.

## 6. Migration / rollout plan

**30-day public notice is not required for this change.** The 30-day notice policy on `/methodology` applies to changes to the methodology — "the committee proposes a change" to the formula, parameters, or eligibility. This proposal changes none of those; it discloses, in deliberate language, policy that is already in force. Settlement contracts written against CTI v1.0 are unaffected: `methodology_version` on every `index_values_daily` row is still `v1.0`, pointing to a `PUBLISHED_METHODOLOGY` constant that is byte-identical before and after. A reader who downloads v1.0 today and v1.0 after merge gets the same formula, the same floors, the same quorum.

**Steps:**

1. This proposal lands as its own PR (`index-architect/2026-10-29-published-quote-classification`) touching only `docs/research/proposals/` and the gap matrix revision log.
2. Carlos reviews on the PR. Approvals, rejections, or amendment requests are captured in review comments as the Committee deliberation record.
3. On proposal approval, a *second* PR is opened against `apps/web/app/methodology/page.tsx` carrying the exact §2.1 and §2.2 edits. That PR hits the CODEOWNERS gate on `/apps/web/app/methodology/` and requires Carlos's second review as the implementing merger. The implementing PR cross-links back to this proposal.
4. On merge of the implementing PR, the gap matrix rows P7 and P8 are updated in place: P7 moves `partial / structurally weak` → `partial` with new specific gap "Track B invoice-observation ingest + reconciliation report not yet built"; P8 moves `partial` → `compliant` with evidence pointing at the merged commit. The matrix revision log gets a new entry.
5. No `methodology_versions` row is added, no `methodology_changes` row is added, and no `system_events` event is written for this change — because the published methodology itself does not change. The audit trail is the two merged PRs plus this proposal file.

**Rollback:** revert the implementing PR. Rolling back has no number-level effect; it only re-opens the disclosure gap. Low cost either way.

**What to monitor after merge of the implementing PR:** nothing new. Existing `system_events` streams (snapshot volume, outlier ratio, index-calculator skip events) are the operational signal that the ingestion pipeline continues to behave; this proposal does not add a new monitoring surface.

## 7. Committee deliberation prompt

> *The Index Committee considers whether to add two disclosures to `/methodology`: (1) a self-classification of CTI as a "published-quote benchmark" with inputs that are, in substance, EU BMR Art 11(1)(c) committed quotes; (2) a numbered publication of the deterministic data-input hierarchy already implemented in code. The committee notes that no published number changes under this proposal, that `PUBLISHED_METHODOLOGY` is untouched, and that the 30-day notice policy therefore does not apply. The committee further notes that the alternative of silence lets a future reviewer frame the P7 / P8 gaps against CTI rather than CTI framing them deliberately. Voted: <yes/no>, Carlos Galindo Dumitrescu, on 2026-10-29.*

## 8. Closing

On approval and merge of the implementing `/methodology` PR:

- Mark `gaps/iosco-principles.md` row **P8** `partial → compliant`.
- Mark row **P7** `partial / structurally weak → partial` with the new specific gap being Track B (invoice-observation ingest), already an open P1 item.
- Add an entry to the gap matrix revision log describing the status change and linking the merged PR.
- Update `docs/decisions.md` with a new entry: *"CTI self-classified as a published-quote benchmark on `/methodology` (2026-10-29) — rationale and references in proposal file."* No decision in `docs/decisions.md` is reversed.
- The research-note / proposal / implementing-PR triad becomes the complete audit record for how P7 and P8 were addressed on CTI v1.0.

Rolling priority queue effect: P0 item 4 (the P7 + P8 proposal) is closed. P1 item 7 is folded into the same closure. The next-highest P0 item becomes item 1 (P1 — name the founding Committee member) or item 2 (P3 / P5 — COI + single-administrator disclosure) depending on which fits the next session's time budget.

---

*Footer on merge:* implementing PR link to be added here.
