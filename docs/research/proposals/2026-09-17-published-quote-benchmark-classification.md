# Proposal: Self-classify CTI as a "published-quote benchmark" and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-09-17 |
| **Author** | index-architect (fourth run) |
| **Risk class** | methodology-adjacent / docs (hard-limit surface, no change to `PUBLISHED_METHODOLOGY`) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member) |
| **Effective date if approved** | Merge date. No 30-day pre-publication notice — see §"Migration / rollout plan". |
| **References** | IOSCO FR07/13 Principles 7 (Data Sufficiency) and 8 (Hierarchy of Data Inputs); EU BMR (Regulation (EU) 2016/1011) Article 11(1)(a), 11(1)(c), 11(3)(d); gap-matrix rows P7, P8 |

## Problem

The IOSCO gap matrix has two open rows in the "Quality of the Benchmark" pillar
that share a single fix:

- **Row P7 (Data Sufficiency).** IOSCO Principle 7 requires benchmarks to be
  "anchored by observable transactions." CTI's inputs are firm, executable
  provider list prices — closer to BMR "committed quotes" than to indicative
  submissions, but explicitly **not** trades. Today `/methodology` does not
  name this. A strict IOSCO reviewer can reasonably press on the omission.
- **Row P8 (Hierarchy of Data Inputs).** The hierarchy exists in code
  (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue →
  outlier check → eligibility check → VWAP) but is not published. BMR Article
  11(3)(d) requires administrators to "draw up and publish clear guidelines
  regarding the types of input data, the priority of use of the different
  types of input data and the exercise of expert judgement."

Both rows are P0 in the gap matrix rolling queue as of the 2026-05-12 revision.
The 2026-05-12 research note
[`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
mapped the response into three tracks. Track A — self-classify precisely and
publish the hierarchy — is a single edit to `/methodology` that closes both P7
and P8 without changing any published number. This proposal is that edit.

The 2026-05-10 companion note
[`notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md)
§B flagged P7 as "the single most important methodological exposure." The
present proposal converts the exposure into a stated design position — the same
move LBMA, Baltic Exchange, and the oil PRAs each made under their respective
IOSCO-aligned methodologies.

## Proposed change

Two additions to `apps/web/app/methodology/page.tsx`. Both are text-only; no
change to `PUBLISHED_METHODOLOGY`, the calculator, the outlier detector, any
database migration, or the lock test. Both slot into the existing page
structure between the "Quorum" subsection and the "Index Committee" section, in
a new `<section>` titled **"Data inputs"**.

### Addition 1 — self-classification paragraph

> ### Data inputs
>
> CTI is a **published-quote benchmark**. Its inputs are firm, executable
> on-demand list prices, captured directly from provider endpoints (Vast.ai,
> RunPod, and — when the Cloudflare-bypass path is live — Lambda / hyperscaler
> pricing pages). We observe what providers *will* transact at, not what
> customers paid.
>
> The economic reality CTI measures — the prevailing on-demand $/GPU-hour a
> buyer faces — is anchored in a genuine arms-length cash market. On-demand
> compute has no public consolidated transaction tape today, so no benchmark
> of the segment can be built purely from trades. Under EU BMR Article
> 11(1)(c), executable "committed quotes" are an accepted input class where
> transaction data is not available or not appropriate; under IOSCO Principle
> 7, benchmarks may be constructed from non-transactional data provided the
> underlying market is transactional and the methodology and hierarchy are
> published. CTI operates on that basis, with no expert judgment applied to
> the published number.
>
> A latent transaction layer is on the roadmap. The `invoice_observations`
> schema (migration `011_pivot_v2_schema.sql`) is designed to hold anonymised
> real-paid prices from buyer counterparties. Once populated, it will feed a
> periodic **list-price vs. observed-effective-price reconciliation report**
> published alongside the index. A future methodology version could — subject
> to Committee approval and 30-day public notice — admit invoice observations
> as an input class ranked above list quotes in the hierarchy below.

### Addition 2 — data-input hierarchy subsection

> #### Hierarchy of data inputs
>
> Each observation entering the published number passes through a fixed,
> deterministic sequence. Higher-ranked stages take precedence; no stage
> applies human judgment to individual values.
>
> | Rank | Stage | Source | Deterministic? |
> |---|---|---|---|
> | 1 | **Observed transactions** (future) | `invoice_observations` — anonymised, buyer-submitted | Yes, when populated. Empty today; not currently in the published number. |
> | 2 | **Firm executable quotes** | Scraped provider list prices → `price_snapshots` | Yes. Schema-validated, timestamped, immutable per row. |
> | 3 | **Normalization** | Rule → alias → fuzzy match → Claude (Sonnet 4.6) at confidence ≥ 0.95 | Rule / alias / fuzzy: yes. Claude: bounded by confidence gate + admin queue for 0.70–0.95 (never enters the published number without human approval). |
> | 4 | **Reliability filter** | `providers.reliability_score ≥ 0.5` | Yes. Score auto-decays on outlier ratio > 30%, auto-recovers on 7-day stability. No manual override. |
> | 5 | **Outlier filter** | MAD-3σ per GPU model over trailing 1h | Yes. Flags written back to `price_snapshots.is_outlier`. |
> | 6 | **Quorum check** | `|E_t| ≥ 5` | Yes. If quorum fails, no value is published; an `index_value_skipped` event is written. |
> | 7 | **Aggregation** | `num_gpus`-weighted VWAP over the 24h window | Yes. Formula published in full above. |
>
> **Expert judgment.** None is applied to individual determinations. The only
> expert-judgment surface is the Index Committee's quarterly review of the
> published formula (see below), which changes the methodology — not the day's
> input data — and only via 30-day public notice.
>
> **Missing or insufficient data.** If Stage 6 quorum fails, no value is
> published for that index on that day. We never extrapolate, never carry
> forward, and never fall back to a lower-rank stage or a different formula.
> The audit trail is one `index_value_skipped` row in `system_events` per
> failed quorum.

The two additions are contiguous — one `<section>` block, two subsections. The
existing "Formula", "Outlier filter", "Eligibility floor", and "Quorum"
subsections are unchanged; the new "Data inputs" section sits between "Quorum"
and "Index Committee".

## Why this is the right shape (vs. alternatives)

Three shapes were weighed against each other.

**Chosen — "own the limitation" (LBMA / Baltic pattern).** State the input
class precisely (published quotes, not trades), name the regulatory basis for
that class being acceptable (BMR Art 11(1)(c)), and publish the hierarchy so a
reviewer can see the full ingest path. Cost: two paragraphs and a small table.
Benefit: closes P7 and P8 in one page edit, converts CTI's most-pressed-on
weakness into a stated design position, matches the well-trodden path of
IOSCO-compliant benchmarks over tapeless markets (LBMA Gold Price FAQs;
Baltic Exchange *Guide to Market Benchmarks* v8.3; oil PRA MOC methodologies
per IOSCOPD364).

**Alternative A — claim unqualified IOSCO-P7 compliance.** Rejected. The
inputs are not transactions and a strict reading (IOSCOPD549, 2018 Guidance)
does not let proportionality relax the transaction-anchor requirement.
Overclaiming would be discovered on first serious diligence, and would
retroactively taint any prior CTI licensee conversation.

**Alternative B — defer the disclosure until `invoice_observations` is
populated.** Rejected. The transaction-layer build is a separate infra
workstream (REFRAME_v2 §3 / variable 8) with no committed timeline. Waiting
means every current external conversation happens without the disclosure the
regulation wants, and any external reviewer would raise the missing hierarchy
before we could show them the invoice work. The disclosure is worth more when
made early; when the invoice layer lands, this page edit narrows to a
single-cell rank-1 status change ("Empty today" → "Live from N invoices/mo").

## Empirical impact

**Numerical impact on the published index: none.** This proposal is a
narrative addition to `/methodology`. `PUBLISHED_METHODOLOGY` is untouched.
`index_values_daily` rows written after merge will carry the same
`methodology_version = 'v1.0'` stamp as rows written before merge. The
methodology lock test in `apps/workers/src/functions/methodology.test.ts`
will pass unchanged (verified as part of the pre-push checklist in §Migration).

**Signal that says "this works":**
1. `pnpm -r typecheck` green after the edit — the change is text only, JSX
   nesting only, no import changes, no type surface.
2. `pnpm test` green — no unit under test asserts on the DOM of
   `/methodology`; the lock test asserts on the constant, which is unchanged.
3. Committee-review record: after merge, the disclosure is quotable in any
   external conversation. The empirical measure of "this works" is that a
   fund/exchange/auditor conversation is no longer *stopped* by the P7
   question. That signal only surfaces in real conversations post-merge and
   is not testable in CI.

**Coverage impact:** none. Universe unchanged, cadence unchanged, publication
predicate unchanged.

## Risks

**Immediate:**
- *False sense of full P7 compliance.* Adding the disclosure narrows one
  reviewer angle but does not fully satisfy IOSCO P7's "anchored by observable
  transactions" reading. The invoice layer (Track B in the 2026-05-12 note) is
  still the durable answer. Mitigation: the disclosure explicitly names the
  invoice roadmap and does not claim P7 unqualified compliance.
- *Committee-scope creep.* This proposal is docs-adjacent to the hard-limit
  page, not a methodology change. Approving it should not be treated as
  precedent for later methodology-parameter edits without full committee
  process. Mitigation: the "Committee deliberation prompt" below makes the
  scope explicit; the "Migration / rollout plan" separates it from the
  30-day-notice workflow.

**Second-order:**
- *Downstream licensee assumption drift.* A licensee reading the new page
  might infer that invoice observations will imminently feed the number. They
  will not — Track B is a separate methodology-class change requiring
  Committee approval and 30-day notice. Mitigation: the addition explicitly
  says "subject to Committee approval and 30-day public notice" for any
  future promotion of invoice observations to a ranked input class.
- *Audit trail expectation.* Publishing the hierarchy sets an expectation that
  every ranked stage is auditable per-row. It is today (schema-validated
  Zod parses, `is_outlier` flags, `provider_reliability_score` snapshots,
  `system_events` audit rows, RLS-locked internal tables per migration 010),
  but any future weakening of that audit chain is now a *public* regression.
  This is a feature: the pressure keeps the audit surface honest. Log this
  as a note in the eventual retention-policy doc (gap-matrix P15).
- *Regulatory drift.* IOSCO / ESMA guidance can update. This proposal cites
  the 2013 FR07/13 principles, the 2018 IOSCOPD549 guidance, and the 2016
  BMR text. Any subsequent guidance (e.g. an ESMA Q&A revision) would need to
  be reconciled at the next quarterly Committee review. Mitigation: the
  gap-matrix "How to maintain this file" section already prescribes this
  reconciliation cadence.

## Migration / rollout plan

**This is a docs-surface change to a hard-limit page. It is not a change to
`PUBLISHED_METHODOLOGY` and does not require a 30-day pre-publication notice
under the Committee charter.** The charter's Steps 1–4 (Research → Quarterly
review → Public notice → Effective date) apply to *methodology* changes —
edits to the formula, its parameters, or the universe. This proposal edits
only surrounding disclosure text. The Committee decision to distinguish
"methodology change" from "disclosure edit" should be made explicitly in the
review of this proposal (see the deliberation prompt below).

Concretely, on approval:

1. **Follow-up PR** edits `apps/web/app/methodology/page.tsx` with the two
   additions in §"Proposed change" verbatim. Title prefix: `index-architect:`.
   Runs `pnpm -r typecheck` before push.
2. **No migration.** `methodology_versions`, `methodology_changes`, and
   `index_values_daily` are untouched.
3. **No new row in `methodology_changes`.** `methodology_changes` records
   *changes to the formula*. A disclosure edit does not create such a row.
4. **`docs/decisions.md`** gains a new entry naming the decision and its
   rationale (link to this proposal and the merged PR).
5. **`docs/research/gaps/iosco-principles.md`** flips rows P7 and P8 from
   `partial` to `partial (disclosure shipped; invoice anchor still pending)`
   in the same follow-up PR, and updates the rolling priority queue: P0 item
   4 becomes closed, P1 items 5–15 renumber up. Revision-log entry.
6. **Rollback plan.** Revert the follow-up PR. No data or schema state is
   affected; the revert restores `/methodology` to its pre-edit content.
   Nothing downstream (licensees, workers, calculators) depends on the
   presence or absence of the "Data inputs" section.
7. **Monitor after merge.** `system_events` for any unexpected
   `methodology_changed` writes (there should be none — this edit does not
   touch that event class). `/api/health` for typical response profile. No
   change is expected on either.

## Committee deliberation prompt (methodology only)

> "The Committee is asked to decide whether the addition of a self-classification
> paragraph ('CTI is a published-quote benchmark') and a data-input hierarchy
> table to `/methodology` — with no change to `PUBLISHED_METHODOLOGY`, the
> calculator, or the lock test — is a **methodology change** requiring the
> Steps 1–4 30-day public notice, or a **disclosure edit** merging on approval.
>
> The proposal argues (§Migration/rollout) it is the latter: the number
> published for any given day, under any given quorum, is identical before and
> after this edit. The change is narrative, not numerical.
>
> The Committee is further asked to accept that the disclosure closes the
> matrix-P0 gap on Principle 7 disclosure and Principle 8 (Hierarchy of Data
> Inputs) *for the published-quote posture*, while explicitly reserving that
> full P7 anchoring in observable transactions remains a Track B roadmap item
> gated on the `invoice_observations` ingest pipeline.
>
> Voted: <yes/no>, Carlos Galindo Dumitrescu, sole founding member of the
> Compute Terminal Index Committee, on YYYY-MM-DD."

## Closing

After this proposal is approved (this PR merged):
- Open the follow-up PR that edits `apps/web/app/methodology/page.tsx` with
  the two additions verbatim.
- Update `docs/research/gaps/iosco-principles.md`: rows P7, P8 → `partial
  (disclosure shipped; invoice anchor still pending)`; revision-log entry.
- Update `docs/decisions.md` with a new "Published-quote benchmark
  self-classification" entry linking this proposal + the follow-up PR.
- Set the calendar reminder for the first quarterly Committee review
  (2026-07-29 or later) to include a P7-anchor progress check on
  `invoice_observations` (Track B).

---

## Sources

Primary regulatory texts (network egress to iosco.org, eur-lex.europa.eu,
esma.europa.eu, and msci.com is blocked at the proxy in this sandbox — same
condition as the 2026-05-10 and 2026-05-12 sessions. Quotations below match
the wording relied on in the two research notes cited above, sourced from
IOSCO- and ESMA-published excerpts at the time of writing):

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13
  (IOSCOPD415), July 2013.
  https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf — Principle 7 (Data
  Sufficiency), Principle 8 (Hierarchy of Data Inputs).
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*,
  IOSCOPD549, January 2018.
  https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf — clarifies that
  proportionality does not relax P7's transaction-anchor requirement.
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data).
  https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng — 11(1)(a)
  representativeness; 11(1)(c) transaction-data priority + committed-quote
  fallback; 11(3)(d) publish-the-hierarchy obligation.
- IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, IOSCOPD364,
  October 2012. https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf —
  precedent for benchmarks over bids/offers where trades are sparse.

Comparable-benchmark methodologies (unchanged from the 2026-05-12 note):

- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026.
  https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf
- ICE Benchmark Administration / LBMA Gold Price FAQs.
  https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price
- MSCI IOSCO compliance hub.
  https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco

Internal references:

- `apps/web/app/methodology/page.tsx` — the hard-limit page this proposal
  proposes editing.
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant,
  **unchanged** by this proposal.
- `apps/workers/src/functions/methodology.test.ts` — the lock test,
  **unchanged** by this proposal.
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations`
  table (Track B target).
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — the
  research note this proposal derives from (§4 Track A).
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — §B
  original P7 flag.
- `docs/research/gaps/iosco-principles.md` — rows P7, P8 (status owner of
  record).
- `docs/decisions.md` — "Five-methodology A/B → Locked methodology v1.0"
  entry, which established the lock this proposal preserves.

*After merge, add the merged PR link here.*
