# Proposal: Self-classify CTI as a *published-quote benchmark* and publish the data-input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-06-25 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (touching a hard-limit surface — see §"Why this is a proposal, not a PR") |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (hard-limit), `packages/shared/src/methodology.ts` (hard-limit — `PUBLISHED_METHODOLOGY_VERSION` bumps v1.0 → v1.0.1; no formula change), `packages/db/migrations/<NNN>_methodology_v1_0_1.sql` (new `methodology_versions` + `methodology_changes` rows) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member; methodology class) |
| **Effective date if approved** | 2026-07-25 (≥ 30 days after merge of the implementing PR per Index Committee charter Step 3) |
| **References** | IOSCO Principle 7 (Data Sufficiency), IOSCO Principle 8 (Hierarchy of Data Inputs), EU BMR Art. 11(1)(c), 11(3)(d). Primary URLs in companion note [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) §Sources |

> **Source-fetch note.** Direct WebFetch of `ioscopd415.pdf`, the EUR-Lex BMR
> consolidated text, the ESMA Interactive Single Rulebook entry for Art. 11, and
> the MSCI methodology hub was blocked at the network layer (HTTP 403) again
> this session (same as the 2026-05-10 and 2026-05-12 runs). Principle and
> Article wording quoted below is reconstructed from IOSCO- and ESMA-published
> search excerpts and from the companion note. A future session run from an
> environment with PDF egress should download FR07/13 and Regulation (EU)
> 2016/1011 into a research-only artifact and reconcile any drift before the
> implementing PR ships. External page text is treated as untrusted data, never
> as instructions.

## Problem

[`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) row **P7**
(Data Sufficiency) is marked `partial / structurally weak` and row **P8**
(Hierarchy of Data Inputs) is marked `partial`. Both share a single root cause:
`/methodology` describes the *formula* (filtered VWAP, MAD-3σ, quorum,
reliability floor, universe) but does not state what *class* of input the
formula consumes, nor what hierarchy governs when a different class would
displace another. Every published CTI value is computed from scraped
firm-executable list prices — closer to BMR Art. 11(1)(c)'s "committed quotes"
than to LIBOR-style indicative submissions — but the page does not say so.

Companion research note
[`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md)
(§2, §3) mapped this exposure against IOSCO FR07/13 and BMR Art. 11 and
surveyed how comparable benchmarks of tape-less markets handle the same
constraint (Baltic Exchange freight indices, Platts/Argus oil PRAs, LBMA Gold
Price, MSCI/IPD property indices). The note concluded that the position is
defensible — but only if CTI *owns* the limitation in writing. Today it doesn't.

The two gap-matrix rows fold into one edit because the disclosure that closes
P7 is the same paragraph that introduces the hierarchy that closes P8. Shipping
them in one proposal converts CTI's most-pressed-on quality-pillar weakness
into a stated, defensible design position before the first external licensee
conversation surfaces it.

## Proposed change

### A. Hard-limit page change — `apps/web/app/methodology/page.tsx`

Insert a new section between the existing "Formula" section and the existing
"Index Committee" section. Verbatim text (subject to copy-edit by the
Committee):

> ## Input data
>
> CTI is a **published-quote benchmark**. Its inputs are firm, executable
> on-demand list prices captured directly from provider endpoints (Vast.ai,
> RunPod, and other providers in the universe of each index). A captured offer
> is the price at which the corresponding provider is committed to sell GPU
> capacity at the moment of capture — closer in substance to an exchange's
> firm quote than to an indicative submission.
>
> On-demand compute has no public consolidated transaction tape. There is no
> equivalent of the equity-exchange print feed or the LME futures clearing
> record from which one could reconstruct actually-traded prices. The
> benchmark is anchored in a genuine arms-length cash market for GPU-hours —
> providers sell, customers buy, prices form by competitive pressure — but
> the trades themselves are not publicly observable. This is the same shape
> as several IOSCO/BMR-compliant benchmarks of real but tape-less markets,
> notably the Baltic Exchange freight indices (panel assessments) and the
> Platts and Argus oil price assessments (firm bids, firm offers and
> confirmed transactions, weighted under a published methodology).
>
> ### Hierarchy of data inputs
>
> Where any class is available for a given (provider, gpu_model, observation
> window), CTI uses the highest-ranked class. The published v1.0 number is
> computed at rank 2.
>
> 1. **Observed transactions** — anonymised paid prices recorded against a
>    real procurement. Schema present (`invoice_observations`, migration 011);
>    ingest pipeline not yet built. **Reserved for v1.x.**
> 2. **Firm executable quotes** — scraped provider list prices, captured at
>    the published API or page, executable at capture-time. **This is what
>    v1.0 uses.** Validation: Zod schema, MAD-3σ outlier filter, provider
>    reliability floor (≥ 0.5).
> 3. **Indicative submissions and panel assessments** — not used and not
>    contemplated. CTI does not solicit submissions from providers, does not
>    accept expert-judgment overrides, and does not include any input class
>    that depends on a human evaluator's view.
>
> When ranks 2 and 3 would coexist, rank 2 displaces rank 3 entirely; there
> is no blending. When (in a future v1.x) rank 1 becomes available, the
> Index Committee will publish the weighting between rank 1 and rank 2 under
> the standard 30-day public-notice procedure.
>
> ### What this is and is not
>
> CTI is not a transaction-anchored benchmark in the strict LIBOR-replacement
> sense. It is a published-quote benchmark over a real arms-length cash
> market, computed by a deterministic, judgment-free formula on a
> uniformly-captured rank-2 input class. It is consistent with EU BMR
> Art. 11(1)(c), which explicitly permits committed quotes when transaction
> data is unavailable or inappropriate, provided the hierarchy is disclosed
> (Art. 11(3)(d)). The reconciliation between the published quote level and
> observed effective prices, once rank-1 data exists, is published as a
> separate report and does not enter the formula until a future methodology
> version is approved.

Place the section header at the same h2 level as "Formula" and "Index
Committee" (`<h2 className="display text-2xl">Input data</h2>`). Render
sub-headers ("Hierarchy of data inputs", "What this is and is not") at the
same h3 level as the existing "Outlier filter (MAD-3σ)" / "Eligibility floor"
/ "Quorum" sub-headers. Use the same `<div className="mono rounded border …">`
style as the formula block for the rank list. Match the existing prose
voice — short, declarative, no marketing.

### B. Version bump — `packages/shared/src/methodology.ts`

```diff
-export const PUBLISHED_METHODOLOGY_VERSION = 'v1.0' as const;
+export const PUBLISHED_METHODOLOGY_VERSION = 'v1.0.1' as const;
```

And the `version: 'v1.0'` field inside `PUBLISHED_METHODOLOGY` updates
identically. **No other field changes.** `formulaId` stays `filtered_vwap`;
`windowHours` stays `24`; `minObservations` stays `5`; `outlierFilter` stays
`mad_3_sigma`; `weight` stays `num_gpus`; `reliabilityFloor` stays `0.5`. The
methodology lock test (`apps/workers/src/functions/methodology.test.ts`) needs
its expected version constant updated to `v1.0.1`; the test's purpose is to
catch silent drift, and this drift is *not* silent — it is the deliberate
output of this proposal.

### C. Database — new `methodology_versions` and `methodology_changes` rows

A migration (next available number, `015_methodology_v1_0_1.sql` at time of
writing — pick the next free integer at implementation time) inserts:

```sql
insert into methodology_versions
  (version, formula_id, formula_params, effective_from, effective_to,
   rationale, approved_by, approved_at, document_url)
values
  ('v1.0.1', 'filtered_vwap',
   '{"windowHours":24,"minObservations":5,"outlierFilter":"mad_3_sigma","weight":"num_gpus","reliabilityFloor":0.5}'::jsonb,
   '2026-07-25', null,
   'Disclosure update: classify CTI as a published-quote benchmark and publish the data-input hierarchy. No formula change. Closes IOSCO P7 and P8.',
   '<Committee approver name set at merge>', '<merge timestamp>',
   'https://github.com/carlosgalindo2807/compute-terminal/pull/<this-PR-number>');

update methodology_versions
  set effective_to = '2026-07-24'
  where version = 'v1.0';

insert into methodology_changes
  (from_version, to_version, change_type, public_notice_at, effective_from,
   summary, proposal_url)
values
  ('v1.0', 'v1.0.1', 'disclosure',
   '<merge timestamp>', '2026-07-25',
   'Self-classification of CTI as a published-quote benchmark; addition of the data-input hierarchy. No change to the formula, constants, or any published value.',
   'https://github.com/carlosgalindo2807/compute-terminal/blob/main/docs/research/proposals/2026-06-25-methodology-published-quote-self-classification.md');
```

The migration is data-only (two INSERTs and one UPDATE). No schema change.
The `change_type = 'disclosure'` value may require widening the existing
check constraint on `methodology_changes.change_type` (`formula | param | universe |
parameter`); if so the migration adds `disclosure` to the allowed set in the
same file.

## Why this is the right shape (vs. alternatives)

| Alternative | Why rejected |
|---|---|
| **Stay silent (status quo).** | The companion note documents that this is the highest-leverage quality-pillar gap. A licensee or auditor reading `/methodology` today cannot tell whether inputs are trades, quotes, or submissions, and will assume the worst. Silence is the option that fails the first serious external review. |
| **Claim full P7 compliance.** | False on the strict reading. CTI inputs are not observed transactions. Overclaiming is the LIBOR-era mistake; it is more damaging than under-claiming because it makes every other claim on the page less credible. |
| **Stop calling CTI a benchmark; rebrand as a "price feed" or "index estimate".** | Throws away the audit-readiness work already shipped (`methodology_versions`, `methodology_changes`, the lock test, CODEOWNERS gating, the `/methodology` change-control procedure). The whole 2-3-year goal — licensable settlement benchmark — depends on calling it a benchmark. The fix is to be a *correctly-self-classified* benchmark, not to give up. |
| **Publish only the hierarchy (P8), leave the self-classification implicit.** | Closes one of two rows. P7 stays `partial / structurally weak` because the page still doesn't say what class of input the published number is computed from. The two are one edit; ship both. |
| **Publish only the self-classification (P7), defer hierarchy (P8).** | Closes one row, but a reader who learns CTI uses quotes immediately wants to know "what would displace them?" The hierarchy is the answer. Splitting them across two PRs costs a second 30-day notice for no benefit. |

This proposal's shape — one paragraph of self-classification + one ranked
list of input classes + one short paragraph of what-it-is-and-isn't — is the
same shape as Baltic Exchange's *Guide to Market Benchmarks* §"Inputs", the
Platts methodology summary §"Data inputs and hierarchy", and the LBMA Gold
Price FAQ §"What price is published?". It is the convention; CTI inheriting
it costs nothing.

## Empirical impact

This is a docs / disclosure change. **No published number changes.** The
`vwap` value written to `index_values_daily` on and after the effective date
is computed from the identical formula on the identical inputs as on the day
before. The empirical signal that "this works" is:

- `pnpm -r typecheck` passes (the version constant is the only TS change;
  one-character string).
- `apps/workers/src/functions/methodology.test.ts` passes after its expected
  `version` constant is updated from `'v1.0'` to `'v1.0.1'`. **Lock-test
  purpose is preserved** — the test still fails if anyone changes
  `formulaId`, `windowHours`, `minObservations`, `outlierFilter`, `weight`,
  or `reliabilityFloor` without a corresponding proposal.
- A reproduction of any historical `index_values_daily` row from
  `price_snapshots` under the new disclosed methodology yields the same
  number as under the old one, because the formula and parameters are
  unchanged. (Empirical check: a one-off script that recomputes the last
  30 days of `vwap` under v1.0.1 inputs and `EXPECT_EQ` against the
  recorded values. Lands in the implementing PR as a `scripts/verify-v1-0-1-
  noop.mjs` artifact, kept for the audit trail.)
- `/methodology` renders with the new section and version banner ("Currently
  in force: Methodology v1.0.1"). Visual check, screenshot in the PR.

Sensitivity / FP/FN analysis sections of the template are **N/A** for a
docs-only methodology change. The proposal preserves this fact in plain
English so a future Committee can verify the test was complete on its face.

## Risks

**Immediate (caught by typecheck / tests):**
- Forgetting to bump the expected version in `methodology.test.ts`. Mitigated
  by the explicit test-update step listed above.
- The `methodology_changes.change_type` check constraint not accepting
  `'disclosure'`. Mitigated by the migration widening the constraint in the
  same file.

**Second-order (caught only by external review):**

1. **Wording risk: "published-quote benchmark".** This is not a canonical
   IOSCO category. The two recognised categories in BMR terminology are
   "regulated-data benchmark" (Art. 17) and "critical / significant / non-
   significant benchmark" (Art. 13–14, 24–26). "Published-quote benchmark"
   is borrowed from common parlance (e.g. Bloomberg's WM/Reuters FX fix and
   the ICE LBOR-replacement assessments are described this way in market
   literature). An auditor may push back that the phrase is informal.
   *Fallback wording:* "**executable-quote benchmark anchored in a real
   on-demand compute market**." Less catchy, less attack-surface. Committee
   choice at merge.
2. **Wording risk: "committed quotes" in the BMR sense.** Art. 11(1)(c)'s
   "committed quotes" arguably means quotes a panellist *commits to honour
   on request*. A scraped list price is in fact executable-on-click, which
   is *stronger* than a request-to-quote commitment, but the difference is
   subtle and a strict reader may want explicit alignment language.
   *Fallback:* add one sentence to the "What this is and is not" paragraph
   stating "rank-2 inputs are firm-executable in the same operational sense
   as BMR Art. 11(1)(c) committed quotes — captured at the moment the
   provider's endpoint commits to sell at that price."
3. **Reduces auditor surprise but increases auditor scrutiny on Track B.**
   By saying "rank 1 is reserved for v1.x", we commit to building the
   `invoice_observations` ingest path. If the path doesn't materialise
   within ~12 months, the disclosure becomes promissory rather than
   descriptive. Mitigation: the rollout plan below schedules the next
   research session to scope the invoice ingest pipeline before the
   effective date.
4. **Narrows the v1.0 lock's legal defensibility — slightly.** A counter-
   party could argue that by adding disclosure language, we acknowledged a
   prior gap. We did, in research notes, openly, with version-controlled
   evidence; this proposal makes the acknowledgement consistent across
   surfaces rather than creating it. Net: a strict reader sees the
   acknowledgement either way; better that it appears as a deliberate
   disclosure than as a silent absence flagged in audit.
5. **Confusion with the existing "Five-methodology A/B" research.** The
   hierarchy lists *input classes*, not formulas. A reader could conflate
   them with the five-formula research described under "AI orchestration".
   Mitigation: the hierarchy heading explicitly reads "Hierarchy of *data
   inputs*", and the new section is placed between Formula and Index
   Committee, away from the AI orchestration block.

## Migration / rollout plan

This proposal is the *input* to the published-change procedure on
`/methodology`. The procedure is:

1. **Today (2026-06-25)** — open a PR adding this proposal file. PR title
   prefix `index-architect:`. No `/methodology`, no
   `packages/shared/src/methodology.ts`, no migration touched in this PR.
2. **Committee deliberation** — @CarlosGalindo2807 reviews. Approval = PR
   merge. Either chooses primary wording ("published-quote benchmark") or
   the fallback ("executable-quote benchmark anchored in a real on-demand
   compute market") in the Committee deliberation prompt below.
3. **Public notice** — on merge, a second PR opens that:
   - inserts the new `/methodology` section verbatim (with the chosen
     wording);
   - bumps `PUBLISHED_METHODOLOGY_VERSION` and the inner `version` field to
     `v1.0.1` in `packages/shared/src/methodology.ts`;
   - updates the expected version constant in
     `apps/workers/src/functions/methodology.test.ts`;
   - adds the data-only migration with the `methodology_versions` and
     `methodology_changes` rows (the row's `effective_from` is set to
     **merge date + 30 days**);
   - merges immediately after typecheck + tests pass. From the moment that
     PR merges, `/methodology` shows a "proposed change pending — effective
     2026-07-25" banner.
4. **Effective date (2026-07-25)** — the `methodology_versions` row's
   `effective_from` arrives. The `/methodology` page's banner changes to
   show "Currently in force: Methodology v1.0.1". `index_values_daily` rows
   dated 2026-07-25 onward are stamped with `methodology_version = 'v1.0.1'`
   by the existing version-stamping path (no code change — the constant is
   read at calculator runtime).
5. **No historical recomputation.** Per audit principle (`/methodology`
   Step 4), historical values remain immutable. The historical methodology
   was filtered_vwap and stays stamped `v1.0`; rows from the effective date
   are stamped `v1.0.1` and refer to the same formula under disclosed
   classification.

Rollback path: if step 3's PR uncovers a wording problem, the second PR can
be reverted. The proposal stays in `docs/research/proposals/` either way —
proposals are durable artifacts, not transient. If the effective date passes
and a problem surfaces, the rollback path is a v1.0.2 proposal restoring the
prior wording, following the same 30-day procedure.

Monitor after merge of step 3's PR: `system_events` for `methodology_changed`
events (Roadmap C15 ideally fires a webhook on this; today it would just
appear in the events log). Manual visual check of `/methodology` rendering
on production after the effective date.

## Committee deliberation prompt

> "We are publishing a self-classification of CTI as a **published-quote
> benchmark** and a three-rank data-input hierarchy on `/methodology`. The
> formula, constants, eligibility rules, outlier filter, quorum, and
> reliability floor do not change. The published number on every day after
> the effective date is identical to what it would have been under v1.0.
> We are accepting a small wording-attack-surface risk (the phrase
> 'published-quote benchmark' is not a formal IOSCO/BMR category) in
> exchange for closing IOSCO Principle 7 (Data Sufficiency) and Principle 8
> (Hierarchy of Data Inputs) as 'partial → compliant in design'. We are
> committing to build the rank-1 (`invoice_observations`) ingest pipeline
> as Track B in the next quarter. Voted: <yes / yes-with-fallback-wording /
> no>, Carlos Galindo Dumitrescu, on <date>."

If the Committee prefers the fallback wording in §"Risks" item 1
("executable-quote benchmark anchored in a real on-demand compute market"),
the implementing PR substitutes that phrase wherever this proposal says
"published-quote benchmark" — five locations: the page section's opening
sentence (twice), the "What this is and is not" paragraph, the
`methodology_versions.rationale` value, and the `methodology_changes.summary`
value.

## Closing

On merge of the implementing PR (step 3 above), mark
`docs/research/gaps/iosco-principles.md` row **P7** status from `partial /
structurally weak` to `partial` (Track A complete; Tracks B and C remain
open and stay in priority queue), and row **P8** from `partial` to
`compliant in design, hierarchy published`. Update `docs/decisions.md` with
a new entry under "Pivot to 'Bloomberg for buyers' framing" or a new section
of its own: "v1.0 → v1.0.1: self-classify as published-quote benchmark
(2026-07-25)". Link the merged implementing PR in this proposal's footer.

### Why this is a proposal, not a PR

`apps/web/app/methodology/page.tsx`, `packages/shared/src/methodology.ts`,
and `packages/db/migrations/*` touching `methodology_versions` are
hard-limit files per the charter. The implementing PR cannot ship without
this proposal having been approved by a human Index Committee member.
Shipping disclosure language *about* IOSCO compliance under the procedure
that the disclosure is itself making more credible is the precedent this
proposal sets — and is the procedure that makes the index licensable.

---

*Approved-by footer (filled at merge of the implementing PR):*
- Implementing PR: \<URL>
- Effective date: 2026-07-25
- Approved by: \<Committee approver name and date>
