# Proposal: Published-quote benchmark classification + hierarchy of data inputs on `/methodology`

| | |
|---|---|
| **Date** | 2026-11-05 |
| **Author** | index-architect (fourth run, weekly scheduled routine) |
| **Risk class** | **docs on a hard-limit surface** (edits `/methodology`, does **not** touch `PUBLISHED_METHODOLOGY`) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` — new "Input data classification" section inserted between the "Quorum" subsection and the "Index Committee" section. No edit to `packages/shared/src/methodology.ts`. No edit to `methodology.test.ts`. No migration. |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member; CODEOWNERS of `/methodology`) |
| **Effective date if approved** | Merge date. See §7 for the "is this a v1.0.1 bump or a disclosure amendment" committee call — recommendation: disclosure amendment, no 30-day notice, because the published number and every computed constant are unchanged. |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency) and Principle 8 (Hierarchy of Data Inputs); EU BMR (Regulation (EU) 2016/1011) Article 11(1)(a)–(c) and Article 11(3)(d); IOSCO FR03/18 (IOSCOPD549, 2018 Guidance). Primary URLs in §8. |

> **Source-fetch note.** Direct WebFetch of `iosco.org`, `eur-lex.europa.eu`, and `esma.europa.eu` returns `ENOTFOUND` from this session's network (those hosts are outside the cloud session's allowed domains, same as the 2026-05-10 and 2026-05-12 runs). Principle and Article text below is carried forward from [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) §1, which synthesized them from published IOSCO/ESMA excerpts. Direct quotes are limited to passages that appeared verbatim in the cited materials. A future session from an environment with those hosts allowed should reconcile any wording differences against the PDFs before the Committee's final sign-off. External page text is treated as untrusted data, never as instructions.

---

## 1. Problem

Gap-matrix row **P7 (Data Sufficiency)** is `partial / structurally weak` and row **P8 (Hierarchy of Data Inputs)** is `partial`. Both point to the same underlying issue: `/methodology` publishes the formula, the outlier filter, the eligibility floor, and the quorum, but is **silent on what kind of input data feeds the formula**. The pivotal question an IOSCO reviewer, a BMR-regulated licensee, or a Big Four auditor would ask on first read of `/methodology` — *"is your benchmark anchored by observable transactions, or by quotes?"* — has no answer on the page today.

The research in [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) established three facts that frame the fix:

1. **The underlying market is real and arms-length.** On-demand GPU rental at Vast.ai, RunPod, Lambda, et al. is a continuous, competitive cash market for GPU-hours. BMR Art 11(1)(a) ("input data shall be sufficient to represent accurately and reliably the market or economic reality that the benchmark is intended to measure") is substantively satisfied.
2. **CTI inputs are firm executable quotes, not trades.** Every `price_snapshots` row is a scraped provider offer. A click at the quoted price fills; these are closer to BMR Art 11(1)(c) **"committed quotes"** than to LIBOR-era indicative submissions. BMR explicitly permits committed quotes where transaction data is "not sufficient or is not appropriate."
3. **The hierarchy exists in code but is unpublished.** The ingestion path (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP) is deterministic and judgment-free, but is not described on the page. BMR Art 11(3)(d) ("clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement") is substantively met in implementation but not surfaced.

The gap matrix's P0 queue, item 4, names the fix precisely: *"P7 + P8 — Proposal for the `/methodology` 'published-quote benchmark' self-classification + data-input hierarchy subsection. Closes two quality-pillar gaps in one edit."* This proposal is that fix.

## 2. Proposed change

**One** docs edit to `apps/web/app/methodology/page.tsx`. A new section titled **"Input data classification"** is inserted between the existing "Quorum" subsection (ends at page.tsx:134) and the existing "Index Committee" section (begins at page.tsx:137). It has four parts (§2.1–§2.4). No other file changes.

Suggested rendered text — reviewer may wordsmith:

### 2.1 Classification statement

> **CTI is a published-quote benchmark.** Its inputs are firm, executable on-demand list prices captured directly from provider endpoints — in substance, committed quotes under EU BMR Article 11(1)(c). On-demand compute has no public consolidated transaction tape, so no benchmark of this market can today be built from observed trades without a central venue. Per the hierarchy below, transaction data is preferred where it becomes available (see roadmap item on `invoice_observations` ingest); executable quotes are used otherwise. The benchmark is anchored in a genuine arms-length cash market for GPU-hours, and the published number is computed with zero expert judgment.

### 2.2 Hierarchy of data inputs (priority order, highest first)

The published value for every index on every day is produced by this fixed pipeline. Each stage has a deterministic acceptance rule; no stage takes expert judgment:

1. **Firm executable quotes** (used today). A scraper reads a provider endpoint and emits a `price_snapshot` row with `{provider, gpu_model_raw, price_per_hour_usd, num_gpus, captured_at}`. Validation: Zod schema at ingestion; rows that fail the schema are dropped and emit a dead-letter event, never silently coerced.
2. **Normalization — deterministic rules** (used today). `gpu_model_raw` resolves against the catalog via (a) exact rule, then (b) alias, then (c) fuzzy match on normalized string. Successful resolution writes `price_snapshots.gpu_model_id` and is reproducible.
3. **Normalization — LLM assist with confidence floors** (used today, for strings that fail steps 1–3 above). Unmatched strings drain hourly through a Claude batch. Confidence ≥ 0.95 auto-resolves and back-fills; confidence 0.70–0.95 is queued at `/admin/unmatched` for one-click human approval; confidence &lt; 0.70 is rejected and the snapshot is not used. The LLM never touches prices — only the mapping from a free-text GPU string to a catalog model ID.
4. **Outlier screen — MAD-3σ** (used today). An offer with price more than three median-absolute-deviations from the per-model one-hour median is flagged `is_outlier = true` and excluded from `E_t`. The flag is persisted per-snapshot; audit reproducibility requires no re-running of the filter.
5. **Eligibility screen — provider reliability** (used today). Snapshots from a provider with `reliability_score &lt; 0.5` are excluded. Reliability is computed from observed scrape-success rate and outlier ratio; there is no manual override.
6. **Quorum** (used today). If fewer than 5 eligible snapshots remain for an index on a day, no value is published for that day. We do not extrapolate, carry forward, or fall back to a different formula; an `index_value_skipped` event is recorded instead.
7. **Observed transactions — `invoice_observations`** (reserved; schema exists, pipeline not yet live). When the invoice-observation redaction/ingest pipeline is live, observed effective prices become the preferred input class for the per-provider calibration path, and a trailing reconciliation report is published alongside each daily value. Admission of invoice data as a *weighted VWAP input* (i.e. a methodology change above the quote inputs in the hierarchy) is a separate future v1.x proposal with the full 30-day notice and backtest; the schema's presence does not itself change the published number.

### 2.3 Expert judgment

**None, in the published-number path.** There is no human step and no model step between an accepted snapshot and the formula in §"Formula". Every parameter in `E_t` and `W_t` is a persisted database value produced by rules (1)–(6) above.

Expert judgment is exercised in exactly three places elsewhere in the system, none of which touch the published number for a given day:

- **Catalog admission.** A human approves or rejects Claude's 0.70–0.95-confidence normalization proposals and new-GPU admissions (`provider_candidates`, `is_new_hardware`). This affects *which* indices exist and *which* snapshots they draw from on *future* days, never the value of an existing index on the day the judgment is exercised.
- **Methodology change.** The Index Committee may approve a methodology version change (the published formula). Procedure is published separately in §"Index Committee" and requires 30-day public notice; see §"Version history" for the audit record.
- **Provider admission to the universe.** A new provider enters the discovery pipeline only via `provider_candidates` and only becomes eligible after human sign-off; see the "Discovery agent" card in §"AI orchestration".

### 2.4 Known structural limitation and mitigations

CTI is anchored by firm executable quotes, not by a tape of observed trades, because on-demand compute today has no central transaction venue. This is a known structural limitation of any benchmark of this market, recognized under BMR Art 11(1)(c) and consistent with the input shape of several IOSCO-compliant benchmarks that lack a public trade tape (Baltic freight assessments; crude PRAs' Market-on-Close bid/offer windows; appraisal-based private-market real-estate indices). Three mitigations are in force or on the roadmap:

- **Mitigation A — breadth over depth.** Filtered VWAP over a 24-hour window across ≥ 5 eligible snapshots per index-day, from multiple providers wherever available, substitutes competitive-offer breadth for transaction depth.
- **Mitigation B — latent transaction anchor.** `invoice_observations` (migration 011) is reserved for anonymised real-paid prices by `(provider, gpu_model, customer_spend_band, contract_type)`. When ingest is live, a list-price-vs-observed-effective-price reconciliation is published alongside each daily value — see the hierarchy's item 7.
- **Mitigation C — committee-reviewed thin-tape suppression.** The current flat `minObservations = 5` is a floor. A future methodology version may introduce a provider-count-scaled quorum that suppresses the published number earlier on GPU models with few competing providers; this is a methodology-class change requiring its own proposal, backtest, and 30-day notice.

---

### Insertion mechanics

Concretely, the diff in `apps/web/app/methodology/page.tsx`:

- Insert a new JSX `<section className="mt-16">` block containing the above four parts (as `<h2>` + prose + ordered list) between the current close of the "Quorum" paragraph (`</p>` ending at line 133, inside the `{/* ─── Formula ─── */}` section) and the opening of the `{/* ─── Index Committee ─── */}` section at line 136.
- No change to any existing text, hex value, prop name, Tailwind class, or data fetch. No new imports. No change to `PUBLISHED_METHODOLOGY` interface shape or values.
- Follow the existing page's typographic conventions: `<h2 className="display text-2xl">` for the section header, `<h3 className="display mt-10 text-xl">` for §2.2–§2.4 subheads, `<p className="mt-3 text-ink-secondary">` for body prose, `<ol className="mt-6 space-y-4 text-ink-secondary">` and `<li className="border-l-2 border-bg-border pl-4">` for the hierarchy list to mirror the Index Committee ordered list at lines 144–184.

The resulting page gains ~1 screen of scroll and loses nothing. No change to SSR fetch (`loadVersionHistory()` is untouched). No change to any env var, feature flag, route, or API.

## 3. Why this is the right shape (vs. alternatives)

Three shapes were weighed. Only the recommended one closes P7 and P8 at the same time without either overclaiming or understating.

**Alternative 1 — Do nothing; wait until `invoice_observations` ingest is live before any public statement on input classification.** *Rejected.* The gap is present today and visible to anyone who reads `/methodology` against the IOSCO/BMR checklist; a licensee conversation will reach this question before the invoice pipeline does. Delay converts a correctable omission into an audit finding. The reconciliation layer described in §2.4 Mitigation B is strictly additive to the disclosure here — publishing the classification does not block or complicate it.

**Alternative 2 — Claim P7 compliance outright, on the basis that the underlying market is real, inputs are firm/executable, and the formula is judgment-free.** *Rejected.* P7's "anchored by observable transactions" clause is explicit, and IOSCO's 2018 Guidance (IOSCOPD549) states that "the requirement in Principle 7 that a Benchmark must be anchored in an active market having observable, Arm's-length Transactions is not affected by the concept of proportionality." A strict reviewer will not accept quotes as substitutes for transactions when no transaction layer exists at all. Overclaiming now cheapens a later, more defensible claim once the invoice reconciliation is in place.

**Alternative 3 — Recommended. Self-classify as a published-quote benchmark; publish the hierarchy; name the structural limitation and the three mitigations.** *Chosen.* This is the pattern followed by Baltic Exchange (assessment-based, no trade tape, EU-BMR-compliant), crude PRAs (MOC bid/offer windows, IOSCO-aligned under IOSCOPD364), and MSCI/IPD and NCREIF for direct real estate (appraisal-based, no tape, widely licensed). The common move is to **own the limitation** precisely rather than to hide it or overclaim against it. It also satisfies BMR Art 11(3)(d) directly: the regulation requires publication of "the types of input data, the priority of use of the different types of input data and the exercise of expert judgement," which §2.2 and §2.3 above do line for line. Finally, it is strictly honest: the page now says what the benchmark actually is.

## 4. Empirical impact

**Published numbers are unchanged.** This proposal does not alter `PUBLISHED_METHODOLOGY`, `methodology.test.ts`, `index-calculator.ts`, `outlier-detector.ts`, or any migration. Every value in `index_values_daily` on the day before merge equals every value on the day after merge, for every index. No backtest is required because no input to the formula changes — the diff is pure disclosure.

The empirical signal that says "this works" is negative confirmation:

- `pnpm -r typecheck` passes on the branch (the page adds JSX only; no new types, props, or imports).
- `pnpm -C apps/workers test` passes on the branch — including `apps/workers/src/functions/methodology.test.ts`, the lock test. If the lock test *fails*, the proposal has accidentally modified a hard-limit file and must be rejected.
- `pnpm -C apps/web build` succeeds; the page renders at `/methodology` in both light and dark themes without horizontal scroll at phone width.
- A grep across `packages/shared/src/methodology.ts`, `apps/workers/src/functions/index-calculator.ts`, `apps/workers/src/functions/outlier-detector.ts`, and `packages/db/migrations/` shows **zero** diff lines. Only `apps/web/app/methodology/page.tsx` and `docs/research/proposals/2026-11-05-published-quote-benchmark-classification.md` change.

## 5. Risks

**Immediate risks.**
- *JSX regression.* A typo in the inserted block could break the SSR render. Mitigation: typecheck + a manual `pnpm -C apps/web dev` + browse to `/methodology` before merge. Blast radius is one public page; rollback is one `git revert`.
- *Wording drift.* The classification statement and the hierarchy are themselves part of the published spec once merged. Later edits to the prose that change *substance* (e.g. demoting items in the hierarchy, removing the "zero expert judgment" claim) would themselves be P8 revisions requiring a fresh proposal. Non-substantive copy-edits are fine.

**Second-order risks.**
- *Overclaim risk is unchanged.* The statement is calibrated — "published-quote benchmark," "committed quotes under Art 11(1)(c)," "no claim of P7 compliance pending invoice anchor." A licensee who reads this cannot later claim CTI oversold its transaction anchoring.
- *Undercutting licensability.* The "known structural limitation" paragraph is explicit about the P7 limitation. Some early sales conversations may read this as weakening the position. Mitigation: pair it with §2.4's three mitigations and the committee-reviewed path to Mitigation B (observed-transaction reconciliation). The honest framing is a *net positive* for institutional licensees whose own compliance teams will diligence this exact question; it is a negative only for licensees who would not have read the page carefully, i.e. not the audience we are selling into.
- *Legal defensibility of the v1.0 lock.* **None.** The lock defends the *formula and parameters*, which are untouched. The lock does not promise that `/methodology` prose will never grow.

**Hard-limit guardrail the reviewer should confirm.** The PR diff touches exactly two paths: `apps/web/app/methodology/page.tsx` (additive JSX) and `docs/research/proposals/2026-11-05-published-quote-benchmark-classification.md` (this file). If the diff touches `packages/shared/src/methodology.ts`, `apps/workers/src/functions/methodology.test.ts`, `apps/workers/src/functions/index-calculator.ts`, `apps/workers/src/functions/outlier-detector.ts`, or any file under `packages/db/migrations/`, the reviewer must reject.

## 6. Migration / rollout plan

This is a docs change, not a methodology change. There is no `methodology_versions` row, no `methodology_changes` row, no new `effective_from`, no backdate. Rollout steps:

1. PR is reviewed by @CarlosGalindo2807 (CODEOWNERS already enforces this on `/methodology`).
2. On approval and merge:
   - `pnpm -r typecheck` + `pnpm -C apps/workers test` on the merge commit (CI).
   - Vercel deploys the new `/methodology` page.
   - The gap matrix [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) is updated **in the same merge** to mark rows P7 and P8 with their new post-disclosure status, plus the "Latest revision" date bumped.
3. No `system_events` monitoring is needed — this is a static-prose change. If the committee chooses to treat it as a v1.0.1 bump (§7), a `methodology_versions` INSERT is added; see §7 for the decision frame.
4. Rollback is `git revert` on the merge commit if the committee later changes its mind. The published formula is unaffected either way.

## 7. Committee deliberation prompt

The Committee has one substantive call to make and may paste its decision into a minutes record under `docs/committee-minutes/`.

**The call.** This proposal publishes disclosure text that describes the current methodology without changing any formula, parameter, filter, or quorum. Two readings of the Committee charter's "30-day public notice" procedure are both defensible:

- **Reading A — Disclosure amendment (recommended).** The 30-day notice is a protection for *users of the published number* against silent changes in that number's calculation. Since the computed value, the formula constants, the outlier filter, and the eligibility floor are all unchanged, no user can be adversely surprised by this edit. It is a clarifying amendment, closest in spirit to fixing a typo on the page, and is appropriately merged on approval without a notice period. The `methodology_versions` table and `PUBLISHED_METHODOLOGY_VERSION` remain at `v1.0`.
- **Reading B — Versioned patch (v1.0.1).** The 30-day notice protects the *published spec text* as much as the number, because licensees may cite the spec by version. Under this reading, this edit bumps `PUBLISHED_METHODOLOGY_VERSION` to `v1.0.1`, adds a `methodology_versions` row dated 30 days after merge, and the new section appears on `/methodology` on the effective date (merged as drafted today, rendered as published on `effective_from`). This creates a precedent for every future disclosure edit to also enter the 30-day cycle. Cost: a month of delay on every future prose fix, including typos. Benefit: a single, uniform change-control mechanism with no reading-A vs. reading-B ambiguity in the future.

Recommendation: **Reading A.** The benchmark number is unchanged; the Committee's responsibility to licensees on this proposal is honest and clear disclosure, which Reading A delivers faster. The cost of Reading B — slow prose maintenance under a ceremonial notice period — is real and compounds across every future minor doc fix. A future *material* methodology change (admitting invoice observations as a weighted input, scaling the quorum per provider count, changing the window, etc.) still goes through the full 30-day procedure as designed.

**Suggested minutes paragraph (Reading A, for paste if approved):**

> "We are publishing a classification statement and data-input hierarchy on `/methodology` to close gap-matrix rows P7 and P8. The published index value, formula, outlier filter, eligibility floor, and quorum are all unchanged; no `methodology_versions` row is added and `PUBLISHED_METHODOLOGY_VERSION` remains `v1.0`. Under the Committee charter, we treat this as a non-material disclosure amendment outside the 30-day public-notice cycle, which is reserved for changes to the published number. Material changes contemplated downstream (observed-transaction admission as a weighted input, provider-count-scaled quorum) will each enter the full 30-day cycle. Voted: &lt;yes/no&gt;, Carlos Galindo Dumitrescu, on YYYY-MM-DD."

## 8. Closing

After this proposal is approved (PR merged):

- `docs/research/gaps/iosco-principles.md` row **P7** moves from `partial / structurally weak` to `partial (disclosure published; invoice reconciliation pending)` and row **P8** moves from `partial` to `compliant`. The `/methodology` link in each row's evidence column points at the relevant subsection. "Latest revision" date and revision-log entry are updated in the same merge.
- `docs/decisions.md` gains a new entry under "Published-quote benchmark classification (2026-11-05)" with the rationale: *committed quotes under BMR Art 11(1)(c), hierarchy publication closes P8, invoice anchor reserved as a future methodology-class change*. This is the audit-trail hook for any future question of "when did we start claiming the published-quote classification?"
- `docs/research/proposals/_INDEX.md` (not yet existing) is created as an appendix listing proposals and their outcome, with this file as entry #1. (Optional; can defer to the next run.)
- The merged-PR URL is appended below as a footer.

### Sources

Primary regulatory texts (referenced; direct PDF/HTML fetch blocked by cloud session network policy this run, as in prior runs — see §0 source-fetch note):

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13 (IOSCOPD415), July 2013. https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, FR03/18 (IOSCOPD549), January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, IOSCOPD364, October 2012. https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data). EUR-Lex CELEX 32016R1011. https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng ; ESMA Interactive Single Rulebook, Art. 11. https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data

Internal references:

- [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) — full prose on which this proposal rests. §3's case studies (Baltic / PRA / LBMA / appraisal-based) motivate Alternative 3.
- [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md) — §B, P7 and P8 first-pass analysis.
- [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) — rows P7, P8; priority queue P0 item 4.
- `apps/web/app/methodology/page.tsx` — target file. Insertion point: between line 134 (close of "Quorum" subsection) and line 136 (opening of "Index Committee" section).
- `packages/shared/src/methodology.ts` — **not touched**. `PUBLISHED_METHODOLOGY` stays at `v1.0`.
- `apps/workers/src/functions/methodology.test.ts` — **not touched**. Lock test continues to defend.
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` schema, referenced in §2.2 item 7 and §2.4 Mitigation B as the home of the future transaction anchor.
- `docs/decisions.md` — "Five-methodology A/B → Locked methodology v1.0" entry (2026-05-09) establishes the lock the hierarchy publication rides on.

---

*Merged PR: (to be filled on merge)*
