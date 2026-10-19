# Proposal: Classify CTI as a "published-quote benchmark" and publish the hierarchy of data inputs on `/methodology`

| | |
|---|---|
| **Date** | 2026-10-19 |
| **Author** | index-architect (cloud routine, Monday 2026-10-19) |
| **Risk class** | docs (hard-limit page, no change to any published number) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (new sections only — no edits to `PUBLISHED_METHODOLOGY` constant or any formula) |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member — hard-limit page requires Committee review per `.github/CODEOWNERS`) |
| **Effective date if approved** | On merge. See §Rollout — this is a **disclosure addition, not a methodology change**: no row of `index_values_daily` becomes different, no formula or parameter in `PUBLISHED_METHODOLOGY` moves, no `methodology_versions` row is written. 30-day public notice therefore does not apply (the Committee charter reserves it for formula changes; see `/methodology` Step 3). The Committee may still elect a shorter voluntary notice window for licensee cordiality. |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency), Principle 8 (Hierarchy and Transparency of Data Inputs); EU BMR Regulation 2016/1011 Article 11(1)(a)(c), Article 11(3)(d); IOSCOPD549 (2018 Guidance); Baltic Exchange *Guide to Market Benchmarks* v8.3; ICE/LBMA *Precious Metals Methodology*; Platts/Argus IOSCOPD399. Companion research: [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) (full citations and prose). |

---

## Problem

CTI's `/methodology` page publishes the formula, outlier filter, eligibility
floor, quorum, universe, and Index Committee procedure. It does **not** publish:

1. **The input-type classification.** The page does not say what *kind* of
   observation each `price_snapshots` row is — i.e. that CTI's inputs are *firm,
   executable list prices scraped directly from provider endpoints*, not
   transaction prints, not committee submissions, not analyst assessments.
2. **The hierarchy of data inputs.** The page does not state which input classes
   would be preferred over which, nor the deterministic rule used to resolve each
   stage from raw provider HTML/JSON to a value in the published VWAP.

These are not stylistic omissions. They are the two load-bearing disclosure
requirements under:

- **IOSCO Principle 7 (Data Sufficiency).** The data must be *"anchored by
  observable transactions entered into at arm's length between buyers and
  sellers."* IOSCO permits non-transactional data (offers, bids, expert
  judgment) as an adjunct, but requires the input class to be stated and the
  anchoring argument to be made.
- **IOSCO Principle 8 (Hierarchy of Data Inputs).** The administrator must
  publish *"clear guidelines on the appropriate exercise of judgement and the
  priority given to different types of data"*, and the hierarchy itself.
- **EU BMR Article 11(1)(c).** Transaction data is preferred *"if available and
  appropriate"*; otherwise *"input data which is not transaction data may be
  used, including estimated prices, quotes and committed quotes."*
- **EU BMR Article 11(3)(d).** Administrators must *"draw up and publish clear
  guidelines regarding the types of input data, the priority of use of the
  different types of input data and the exercise of expert judgement."*

Today a reviewer reading `/methodology` can derive the input-type classification
by inference (the open-source scrapers write to `price_snapshots`, which the
calculator reads deterministically). An IOSCO/BMR reviewer should not have to
infer it. The disclosure is cheap, and withholding it is the single highest
unforced-error gap in the published package.

This proposal closes rows **P7** and **P8** of
[`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) in one
edit, as flagged in that file's rolling priority queue (P0 item 4).

## Proposed change

Insert two new sibling sections into `apps/web/app/methodology/page.tsx`, between
the existing *Formula* section and the existing *Index Committee* section (i.e.
after the `Quorum` subsection ending around line 134, before the
`Index Committee` heading at line 138):

### Section A — "Input data classification"

Place this as an `<h2 className="display text-2xl">` with the first paragraph
copy below. The second paragraph is a short honesty statement that mirrors the
Baltic Exchange / Oil PRA pattern of owning the limitation.

> **CTI is a published-quote benchmark.** Every observation underlying a
> published value is a *firm, executable list price* captured directly from a
> provider's public pricing endpoint (REST, GraphQL, or published HTML). The
> scrapers are mechanical, schema-validated, and open-source
> (`apps/workers/src/functions/scrapers.ts`); there is no human submission step,
> no expert judgment, and no third-party panel.
>
> On-demand compute has no public consolidated transaction tape. Per EU BMR
> Article 11(1)(c), executable quotes are a permitted input class where
> transaction data is unavailable or inappropriate. CTI is anchored in a genuine
> arms-length cash market for GPU-hours — the on-demand compute market is deep,
> continuous, and competitive — but the published number is computed from offers,
> not prints. We state this plainly because the disclosure is itself the
> methodology.

### Section B — "Hierarchy of data inputs"

Place this as an `<h2 className="display text-2xl">` with the lead paragraph
below, followed by an ordered list rendered in the same style as the Index
Committee's `Step 1 / Step 2 / Step 3 / Step 4` ordered list (lines 144–184).
The list is **the deterministic resolution pipeline, published**.

> The input data flowing into every published value is resolved through the
> following strict hierarchy. The ordering is fixed: a later tier is used only
> if every earlier tier yields no datum for the observation in question. There
> is no discretion between tiers.

1. **Observed transactions — reserved tier (not yet active).**
   The schema `invoice_observations` (migration 011) is designed to carry
   anonymised real paid prices, redacted by `(provider, gpu_model,
   customer_spend_band, contract_type)`. **This tier is empty in v1.0.** When it
   is active, it will be preferred over all quoted inputs for the segments it
   covers, in line with BMR Article 11(1)(c). Until then the published value
   relies entirely on tier 2.

2. **Firm executable quotes — the active input class.**
   Every row in `price_snapshots` where `is_normalized = true`,
   `is_outlier = false`, and `reliability_score ≥ 0.5` (per the eligibility
   rules above). These are the firm executable list prices described in the
   previous section. This is the sole input class used by the published formula
   today.

3. **Indicative quotes — not used.**
   CTI does not accept indicative, non-executable, or advisory prices. If a
   provider publishes a "starting from" or "contact sales" field without a
   firm per-hour price, that datum is dropped at the scraper layer and never
   enters `price_snapshots`.

4. **Expert judgment — not used.**
   The published number applies no human adjustment. The MAD-3σ outlier filter,
   the per-provider `reliability_score`, the `num_gpus` weight, and the
   `min_observations` quorum are deterministic rules — not judgment calls — and
   are enumerated in the `Formula` and `Outlier filter` sections above. The
   `/admin/unmatched` queue applies judgment to *catalogue normalisation* (which
   GPU string maps to which `gpu_model_id`), **not** to the inclusion, exclusion,
   or weighting of any price observation.

> The hierarchy is enforced in code: no step of the index calculator
> (`apps/workers/src/functions/index-calculator.ts`) opens a path from tiers 3
> or 4 into the published VWAP. The methodology-lock test
> (`apps/workers/src/functions/methodology.test.ts`) prevents silent drift.

The implementation PR that follows an approval of this proposal will:

- Add exactly these two sections to `apps/web/app/methodology/page.tsx`, using
  the page's existing typography primitives (`display text-2xl`,
  `mono text-2xs uppercase`, `border-l-2 border-bg-border`), no new components.
- Not touch `PUBLISHED_METHODOLOGY`, `methodology.test.ts`, `index-calculator.ts`,
  `outlier-detector.ts`, or any `packages/db/migrations/*` file.
- Not create a new `methodology_versions` row (the published formula does not
  change; v1.0 continues).
- Update `docs/research/gaps/iosco-principles.md` rows P7 and P8 to
  `compliant / disclosure complete` with a link back to the merged PR, and
  update the revision log.
- Add a short entry to `docs/decisions.md` under the "Pivot to 'Bloomberg for
  buyers'" neighbourhood: *"Published-quote-benchmark self-classification + data
  input hierarchy on `/methodology` (added YYYY-MM-DD)"*.

The implementation PR is intentionally a separate PR so that the Committee's
approval of **the exact disclosure text** is recorded as a reviewable artifact
(this proposal) and the implementation can be reviewed on code-quality grounds
only, with the content already decided.

## Why this is the right shape (vs. alternatives)

The research note on P7 ([`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md))
weighed three tracks against each other; this proposal is Track A. The others
are either slower, more expensive, or methodology-changing. Specifically:

**Alternative 1 — Build the transaction anchor first (Track B of the P7 note).**
Stand up the `invoice_observations` ingest pipeline, collect ≥90 days of real
paid prices, then publish a reconciliation report "CTI list-price index vs.
observed effective price by spend band." This genuinely strengthens the P7
anchoring argument because it adds transaction data, not just a disclosure. But
it is weeks of infrastructure work (redaction schema, ingest API, licensee
agreement, 90-day accrual) and does **not** eliminate the P8 disclosure gap —
the hierarchy must still be published either way. Doing Track A first costs
nothing and makes Track B straightforwardly land as "tier 1 goes live".

**Alternative 2 — Change the methodology (admit a scaled-quorum / utilisation
weight that is argued to approximate transaction density).**
This is Track C of the research note. It is a methodology-class change: 30-day
public notice, backtest over the full history, Committee vote. Even if valuable
in the long run, it does not substitute for the P8 hierarchy publication, and
the research note explicitly scopes it out of the current proposal.

**Alternative 3 — Say nothing. Rely on the open-source code as self-disclosure.**
A reader with the inclination can derive the input-type classification by
reading `scrapers.ts` and the schema. This is the status quo. It is defensible
on paper and genuinely weak in practice: IOSCO and BMR require *published*
guidelines on input types (Art 11(3)(d) uses the word "publish" directly), and
"read our source code" is not a published guideline. More importantly, the
first licensee compliance review will press this exact point; owning the
disclosure in writing before that conversation is strictly cheaper than
discovering it mid-diligence.

**Alternative 4 — Publish the classification but not the hierarchy, or vice
versa.** Half-measures. P7 and P8 are structurally joined — the "we are an
executable-quote benchmark" statement is only credible if accompanied by "and
here is the exact resolution order from raw datum to published value." The
research note arrived at this coupling specifically; splitting the proposal
doubles the Committee review surface for no benefit.

The chosen shape (Track A) wins because:

- It converts CTI's single most-pressed-on IOSCO weakness (P7) into a stated,
  defensible design position **today**, before the first external licensee
  conversation.
- It discharges the explicit publishing requirement in P8 / BMR Art 11(3)(d)
  **today**, with no code change beyond the page copy.
- It is strictly additive to the existing `/methodology` page — nothing is
  deleted, no formula or parameter is moved — so the lock-in property that
  makes CTI licensable is preserved to the character.
- It leaves the Track B and Track C paths fully open and clearly scoped as
  separate workstreams.

## Empirical impact

This is a disclosure addition, not a methodology change. The "empirical signal
that says this works" is therefore not a backtest; it is a diff of **what a
reviewer could verify** about CTI before vs. after the change.

| Reviewer-verifiable claim | Before (v1.0, today) | After (this proposal merged) |
|---|---|---|
| CTI's inputs are firm executable list prices, not transactions | Derivable by reading `scrapers.ts` + schema (~15 min work) | **Stated on `/methodology` in two sentences** |
| CTI's input hierarchy and the deterministic resolution rules | Derivable by reading `index-calculator.ts` (~45 min work) | **Published as an ordered list on `/methodology`** |
| CTI acknowledges the absence of a public trade tape as an input-class choice, not an oversight | Not stated | **Stated** |
| CTI has reserved a transaction tier for future use and names it | Implicit in migration 011 | **Named: `invoice_observations`, tier 1, currently empty** |
| CTI uses no expert judgment on price observations | True in code | True in code **and stated as tier 4 of the hierarchy** |
| Rows P7 and P8 of the IOSCO gap matrix | `partial / structurally weak` and `partial` | **`compliant / disclosure complete`** on both rows |

Verification check performed as part of writing this proposal:

- Searched `apps/web/app/methodology/page.tsx` for the strings `"transaction"`,
  `"quote"`, `"hierarchy"`, `"input data"`, `"listing"`, `"executable"` — none
  present. Confirms the disclosures are genuinely new, not a duplication.
- Re-read `packages/shared/src/methodology.ts` and confirmed that
  `PUBLISHED_METHODOLOGY` is untouched by this proposal — no field changes, no
  version bump, no change to the type signature. The methodology-lock test
  continues to pass by construction.
- Confirmed that `apps/workers/src/functions/index-calculator.ts` has no code
  path that reads from `invoice_observations` today — the reserved tier is
  truthfully empty, consistent with the proposed text.
- Confirmed that `migration 011` (`011_pivot_v2_schema.sql`) defines
  `invoice_observations` with the columns the proposal references
  (`provider_id`, `gpu_model_id`, `customer_spend_band`, `contract_type`) — the
  tier-1 description does not forward-promise a schema that does not exist.

No price observation is reweighted, excluded, or admitted that was not already
reweighted / excluded / admitted under v1.0. Every row in `index_values_daily`
is identical before and after. The lock-in property is preserved; the
reader-visibility property is strictly improved.

## Risks

**Immediate risks (merge-time):**

- *Typo in the published copy becomes a reproducibility question.* Mitigation:
  the implementation PR is reviewed by the Committee; the copy is verbatim
  from this proposal, so review attention goes to the text, not to code.
- *Phrasing in Section A over-claims arms-length transactional depth.* The copy
  says the on-demand compute market is *"deep, continuous, and competitive"*.
  This is defensible (Vast.ai + RunPod + Lambda + hyperscalers transact
  continuously; our scraper writes ~10k snapshots/day across providers), but a
  licensee compliance reviewer may ask for a count. Mitigation: the compliance
  pack PDF (Roadmap B9) will include trailing-24h snapshot counts per provider,
  which quantifies the claim. No change to this proposal needed; flagged for
  B9's content template.
- *The tier-1 "reserved" line could be read as a promise with no deadline.*
  Mitigation: wording is "reserved tier (not yet active)" without a date. The
  Track B workstream (invoice ingest) has its own roadmap entry and
  deliverables; this proposal does not commit a date.

**Second-order risks:**

- *A future methodology change could obsolete the hierarchy copy.* If and when
  invoice observations become an admitted input (Track B tier promotion, future
  v1.x), the hierarchy section will need to be edited in the same PR as the
  methodology-version bump. That is natural: the version-controlled page is the
  single source of truth for both the formula and the hierarchy, so they move
  together. No orphan-copy risk.
- *Licensees may construe "published-quote benchmark" as a classification
  with legal implications under BMR.* BMR distinguishes a "regulated-data
  benchmark" (Art. 17), a "commodity benchmark" (Annex II), an "interest rate
  benchmark" (Annex I), and the implied residual (everything else — which
  CTI is until registered). "Published-quote benchmark" is not a BMR legal
  category; it is a self-descriptive input-class statement that uses the
  same word BMR Art 11(1)(c) uses ("committed quotes"). The proposal copy
  deliberately avoids any claim of BMR registration, which would be false
  today. Mitigation: Committee may want to add a one-line footnote stating
  CTI is not currently an ESMA-registered benchmark — this would also
  discharge gap row P19 (currently `n/a until regulated` but undocumented).
  Recommended as an optional sibling edit in the same implementation PR.
- *Auditor trust risk.* Stating the hierarchy with a tier 1 that is empty could
  invite a skeptical read of "they're disclosing an empty box". Mitigation: the
  copy names the empty tier explicitly ("empty in v1.0") and the roadmap link
  can be referenced in the compliance pack. The alternative — not naming
  tier 1 — makes a future tier-1 activation feel surprising. The disclosure
  pattern used here mirrors how MSCI documents reserved index-member slots
  ahead of eligibility events; it is a known, trusted shape.

**What this proposal does not de-risk:** none of the P7 methodology-class
options (scaled quorum, utilisation weighting, invoice-anchored input tier).
Those remain future proposals. This proposal is strictly the disclosure layer.

## Migration / rollout plan

This is a docs change, not a methodology change — but the target page is a
hard-limit surface, so the rollout mirrors the methodology-change playbook with
one explicit relaxation (no 30-day notice).

**Steps:**

1. **Committee approval of this proposal** via PR review. The PR body for the
   implementation PR (step 2) will cite this proposal's path as the approved
   content.
2. **Implementation PR** opens on branch `index-architect/<date>-publish-quote-hierarchy-on-methodology`.
   It contains only:
   - the two new sections in `apps/web/app/methodology/page.tsx`;
   - the gap-matrix row updates in `docs/research/gaps/iosco-principles.md`;
   - the `docs/decisions.md` short entry.
   It does **not** touch `PUBLISHED_METHODOLOGY`, `methodology.test.ts`,
   `index-calculator.ts`, `outlier-detector.ts`, or any migration file. The
   `methodology.test.ts` lock test continues to pass unchanged.
3. **CI gates:** `pnpm -r typecheck` must pass. The methodology-lock test must
   pass (and will, trivially — no change to the locked constant). No new tests
   are required for a text addition, but the implementation PR will add a tiny
   snapshot-ish test if the Committee prefers (not needed in index-architect's
   view — the typography primitives are already covered by existing render
   tests).
4. **No 30-day notice.** The Committee charter (`/methodology` Step 3) reserves
   30-day public notice for *proposed changes to the formula or published
   numbers*. This proposal changes neither; it discloses facts about v1.0 that
   are already true in code. The Committee may still elect a voluntary
   shorter notice window — e.g. a 7-day pre-announcement in a changelog entry —
   as a courtesy to any outside readers who have cached `/methodology`.
5. **Effective on merge.** The implementation PR landing updates the page; the
   gap matrix flips P7 and P8 to `compliant / disclosure complete`; the next
   compliance pack PDF (Roadmap B9) picks up the new sections automatically if
   it renders from the page content.

**Rollback plan.** If the Committee finds the Section A phrasing misstates the
input class or the Section B hierarchy misstates the resolution order, revert
the implementation PR; the gap matrix flips P7 and P8 back to their prior
state; no data correction is needed because no published value changed.

**What to monitor after merge:**

- `system_events` for `methodology_changed` events — there should be *none*,
  because this is not a methodology change. If one fires, something touched the
  wrong path.
- `index_values_daily` row deltas for the next 7 days — should be identical to
  the counterfactual (no deltas attributable to this change).
- The next licensee or compliance conversation — primary success metric is
  "reviewer stops asking about input-type classification" and "reviewer no
  longer asks for a written hierarchy".

## Committee deliberation prompt (optional — this is a docs change)

The template's Committee prompt is intended for methodology changes, where the
Committee trades off numeric properties. For a disclosure proposal, the
equivalent framing is simpler:

> "We are stating in writing what has been true in code since v1.0: that CTI's
> inputs are firm executable list prices scraped from provider endpoints, and
> that the deterministic resolution order from raw datum to published value is
> as published on `/methodology`. We are converting an implicit (code-derivable)
> design choice into an explicit (page-published) design choice. No formula
> parameter moves. No row of `index_values_daily` becomes different. The
> trade-off is: today a diligent IOSCO reviewer must *infer* our input-class
> classification; after this change, they *read* it. The alternative — relying
> on the open-source code as the disclosure — fails BMR Art 11(3)(d)'s explicit
> publish requirement. Voted: <yes/no>, Carlos Galindo Dumitrescu, on
> YYYY-MM-DD."

## Closing

**Checklist for after this proposal is approved and the implementation PR is
merged:**

- [ ] `docs/research/gaps/iosco-principles.md` rows **P7** and **P8** flipped
      from `partial / structurally weak` and `partial` to
      `compliant / disclosure complete`; priority-queue item P0#4 removed; a
      revision-log entry added at the bottom of the gap matrix.
- [ ] `docs/decisions.md` entry added summarising the disclosure addition.
- [ ] This proposal's footer updated with the merged implementation-PR link
      and an `Approved by` row.
- [ ] A line in next week's index-architect run notes: *"P7+P8 disclosure
      landed; next up on the P0 queue — P3 conflict-of-interest disclosure
      (another `/methodology` addition — can be bundled with a P16 complaints
      line and P14/P19 n/a declarations for a single-edit multi-row close)."*

---

*Footer (filled on merge).*

- **Approved by:** _(pending Committee review)_
- **Merged in PR:** _(pending)_
- **Gap-matrix revision entry:** _(pending)_
