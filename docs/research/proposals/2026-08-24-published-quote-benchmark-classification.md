# Proposal: Self-classify CTI as a *published-quote benchmark* on `/methodology` and publish the hierarchy of data inputs

| | |
|---|---|
| **Date** | 2026-08-24 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (hard-limit surface — `/methodology` page copy) |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` |
| **Required reviewer(s)** | @CarlosGalindo2807 (sole founding Index Committee member) |
| **Effective date if approved** | 30 days after PR merge (per Index Committee Step 3, published on `/methodology`) — earliest 2026-09-23 assuming a same-week merge |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs); IOSCO FR03/18 (IOSCOPD549) 2018 Guidance; Regulation (EU) 2016/1011 Art. 3(1)(14)–(16), Art. 11(1)(a)–(c), Art. 13(1)(b); IOSCO 2015 Review IOSCOPD474. Primary URLs at the foot of this file. |
| **Companion research** | [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md); [`gaps/iosco-principles.md`](../gaps/iosco-principles.md) rows P7 + P8. |

---

## Problem

The gap matrix has two open P0/P1 rows against the *Quality of the Benchmark* pillar that the current `/methodology` page does not address:

- **P7 (Data Sufficiency).** IOSCO FR07/13, Principle 7 states that a benchmark should be *"based on prices, rates, indices or values that have been formed by the competitive forces of supply and demand and anchored by observable transactions entered into at arm's length between buyers and sellers in such an active market"* [IOSCO 2013; excerpted verbatim in IOSCOPD474 §II.7]. Every CTI input today is a scraped *executable listing* from a provider endpoint, not an observed trade — on-demand GPU compute has no public consolidated tape. The `/methodology` page is silent on this. A serious reviewer arriving at the page today has no way to know that CTI has *thought about* Principle 7, let alone how it addresses it. The gap-matrix row P7 is `partial / structurally weak` for exactly this reason. The 2026-05-12 companion note diagnosed the exposure in full and pre-registered "Track A — self-classify + publish the hierarchy" as this session's deliverable.

- **P8 (Hierarchy of Data Inputs).** IOSCO Principle 8: *"An Administrator should establish and Publish or Make Available clear guidelines regarding the hierarchy of data inputs and exercise of Expert Judgment used for the determination of Benchmarks."* EU BMR Art. 11(3)(d) codifies the same duty for administrators of regulated benchmarks. CTI's hierarchy is *implemented* in code — rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP — but it is not *published*. Zero expert judgment sits on the published-number path, which is a defensible stance worth stating explicitly. The gap-matrix P8 row is `partial` with the same "publish the hierarchy" fix.

Both rows have the same target file (`/methodology`), the same audience (a reviewer, a licensee counsel, or an auditor), and the same natural place in the page (before the Formula, after the active-version banner). Bundling them into one edit — one proposal, one PR, one 30-day notice period — is strictly cheaper than shipping them serially and produces a single self-contained disclosure that answers *"how does CTI think about its inputs?"* on first read.

## Proposed change

Insert **two new sections** into `apps/web/app/methodology/page.tsx`, both above the existing `{/* ─── Index Committee ─── */}` section. No changes to any locked constant, formula, filter, quorum, floor, or version number. Version stays **v1.0**.

Copy is finalised below. Section headings match the visual grammar the page already uses (`<h2 className="display text-2xl">` / `<h3 className="display mt-10 text-xl">`).

### Section 1 — "Nature of the inputs" (inserted **before** the Formula section, at what is currently line 76)

```tsx
{/* ─── Nature of the inputs ─── */}
<section className="mt-16">
  <h2 className="display text-2xl">Nature of the inputs</h2>
  <p className="mt-3 text-ink-secondary">
    CTI is a <span className="italic">published-quote benchmark</span>.
    Its inputs are firm, executable on-demand list prices captured directly
    from provider endpoints — the same price a buyer would pay if they clicked
    <em> Rent</em> in the moment the snapshot was taken. Inputs are neither
    submissions in the LIBOR sense nor observed cleared transactions.
  </p>
  <p className="mt-3 text-ink-secondary">
    On-demand GPU compute has no public consolidated transaction tape.
    Per IOSCO Principle&nbsp;7 the underlying interest is required to be
    <em> anchored by observable arm&apos;s-length transactions in an active
    market</em>; on-demand cloud compute is unambiguously such a market —
    Vast.ai, RunPod, Lambda and the hyperscalers transact GPU-hours
    continuously between unaffiliated counterparties at arm&apos;s length.
    What is absent is a public tape of prints, not the market itself.
    Consistent with EU BMR Art.&nbsp;11(1)(c), where transaction data is not
    available or not appropriate, executable quotes are used, with the
    hierarchy below governing what feeds the published value.
  </p>
  <p className="mt-3 text-ink-secondary">
    The published number is computed with zero expert judgment: the formula is
    the same for every day, every GPU model, and every provider, and appears
    in full in the next section.
  </p>
</section>
```

### Section 2 — "Hierarchy of data inputs" (inserted **after** the Quorum subsection, at what is currently line 134, still inside the Formula `<section>`)

```tsx
<h3 className="display mt-10 text-xl">Hierarchy of data inputs</h3>
<p className="mt-3 text-ink-secondary">
  Every value in <span className="mono">index_values_daily</span> descends from
  a single deterministic pipeline. Each stage has one job and one rule. No
  stage exercises discretion over the published number.
</p>
<ol className="mt-6 space-y-4 text-ink-secondary">
  <li className="border-l-2 border-bg-border pl-4">
    <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 1 · Capture</span>
    <div className="mt-1">
      Per-marketplace scraper reads the provider&apos;s public listing endpoint on a
      fixed schedule (TypeScript-native every 5&nbsp;min; Python fallback for
      HTML-heavy sources). Each observation is parsed against a Zod schema and
      rejected on parse failure. No silent coercion.
    </div>
  </li>
  <li className="border-l-2 border-bg-border pl-4">
    <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 2 · Normalization</span>
    <div className="mt-1">
      Free-text hardware strings resolve to catalog GPU models in this
      preference order: (i)&nbsp;deterministic <span className="mono">normalization_rule</span>
      match, (ii)&nbsp;alias table, (iii)&nbsp;fuzzy match ≥&nbsp;0.90.
      Unresolved strings drain hourly through a Claude batch; a match with
      confidence ≥&nbsp;0.95 is auto-promoted into a rule and back-fills prior
      snapshots, a match at 0.70–0.95 is queued at
      <span className="mono"> /admin/unmatched</span> for one-click human
      approval, below 0.70 is discarded. The published number never depends on
      a pending queued match.
    </div>
  </li>
  <li className="border-l-2 border-bg-border pl-4">
    <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 3 · Outlier flag</span>
    <div className="mt-1">
      Every 15&nbsp;min the MAD-3σ detector defined above writes
      <span className="mono"> is_outlier</span> back to
      <span className="mono"> price_snapshots</span>. Flags are per-row,
      per-GPU-model, and auditable in place.
    </div>
  </li>
  <li className="border-l-2 border-bg-border pl-4">
    <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 4 · Eligibility</span>
    <div className="mt-1">
      A snapshot enters <span className="mono">E_t</span> only if it is
      normalized, unflagged, within the 24-hour window, and the source
      provider&apos;s <span className="mono">reliability_score</span> meets the
      floor above. Reliability is a decayed function of scrape success and
      outlier ratio; it has no manual override.
    </div>
  </li>
  <li className="border-l-2 border-bg-border pl-4">
    <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 5 · Aggregation</span>
    <div className="mt-1">
      Eligible snapshots are combined by the filtered-VWAP formula above,
      weighted by <span className="mono">num_gpus</span>. If quorum is not met,
      no value is published for the day and an
      <span className="mono"> index_value_skipped</span> event is recorded.
      There is no fallback formula, no expert override, and no forward-fill.
    </div>
  </li>
</ol>
<p className="mt-6 text-sm text-ink-muted">
  Where transaction data becomes available — either through direct provider
  disclosure or via anonymised invoice observations submitted by index
  licensees — a future version may admit it as a higher-priority input class
  in this hierarchy. Any such change is a methodology-class change and follows
  the four-step Index Committee procedure below.
</p>
```

Nothing else on the page changes. In particular:

- The formula block, MAD-3σ outlier filter, eligibility floor, quorum rule, Index Committee procedure, AI-orchestration cards, and version-history table are all untouched.
- `packages/shared/src/methodology.ts` (`PUBLISHED_METHODOLOGY`, `PUBLISHED_METHODOLOGY_VERSION`) is untouched.
- `apps/workers/src/functions/methodology.test.ts` (lock test) is untouched and must keep passing.
- `apps/workers/src/functions/index-calculator.ts` is untouched. No `index_values_daily` row changes value under this proposal.

Because the version number does not move, no new row is inserted in `methodology_versions`. This proposal is a **disclosure change**, not a **methodology change** — it makes the existing v1.0 easier to defend, not different.

## Why this is the right shape (vs. alternatives)

Three alternatives were weighed against the proposed *"disclose, don't reshape"* choice.

**Alternative A — Do nothing, wait for a licensee to press on P7.** This is the current state. It costs nothing today and everything the day a fund's benchmark counsel opens `/methodology`, sees no acknowledgement that CTI's inputs are quotes rather than trades, and concludes that CTI has not thought about IOSCO. The gap-matrix note *"the single most important methodological exposure"* is unaddressed. Rejected: the point of an index-architect run is to close the highest-leverage disclosure gap *before* the conversation, not after.

**Alternative B — Weight or admit invoice observations as an input class now.** This is Track B from the 2026-05-12 note. It is the correct long-term shape (transaction data preferred over quotes, matching IOSCO's hierarchy verbatim), but it is a **methodology change** — it moves numbers in `index_values_daily`, requires a v1.x bump, needs a 90-day backtest, and is blocked on the `invoice_observations` ingest pipeline which is empty today (migration 011 defined the table; no data flows into it). Doing this at v1.0 is impossible; queuing it *before* the disclosure fix inverts the audit order — the reviewer would ask "why did you change your input class before you told anyone what your input class was?" Rejected as premature; queued explicitly at the foot of Section 2 as a future methodology-class evolution.

**Alternative C — Reclassify CTI as a "listed-price index" without the hierarchy.** Shorter to write; less credible. Publishing only the *label* satisfies neither P7's transparency intent nor P8's explicit "clear guidelines" requirement. Rejected in favour of bundling both principles' fixes into one page edit — same reader arriving on the same page gets both answers at once.

The chosen shape matches the enforcement pattern the Baltic Exchange and the oil PRAs use to satisfy Principles 7/8 without a public tape: **name the input class, name the market, publish the hierarchy, own the limitation**. See the 2026-05-12 note §3 for the three-way comparison (Baltic panel, PRA MOC, LBMA auction). This proposal ports that pattern to CTI, adapted to the fact that our "submitters" are the providers' own machine-readable price endpoints, captured without a submission step.

## Empirical impact

This is a disclosure-only change. There is **no numeric impact** on any published value.

Required checks before merge (all mechanical, all pass or the PR does not ship):

1. `apps/workers/src/functions/methodology.test.ts` — the methodology-lock test must continue to pass. It reads `PUBLISHED_METHODOLOGY` from `packages/shared/src/methodology.ts`; that file is not touched by this PR.
2. `pnpm -r typecheck` — the two new JSX blocks must compile. They reference no new imports and no new symbols; every className used already appears elsewhere in `page.tsx`.
3. `pnpm test` — full test suite green.
4. Manual read: render `/methodology` locally and confirm the new sections land in the intended positions (before Formula, and after Quorum), and the "Currently in force" banner still reads `v1.0`.
5. Diff of a *dry* index-calculator run against the last 7 days of `index_values_daily` before/after merge: expected zero rows changed. If any row moves, revert immediately — the change has escaped its declared scope.

The 2026-05-12 note is the empirical justification for the *shape* of the disclosure (Section 3 of that note compares four analogous benchmark regimes). This proposal does not re-litigate that; the note is the citable prior work.

## Risks

**Immediate (this PR).**

- *Copy inaccuracy.* The new text asserts several facts about the pipeline (5-minute cadence, Zod validation, MAD-3σ frequency, reliability decay function shape). Each assertion above is cross-checked against the AI-orchestration cards already on the same page and against `docs/decisions.md`. If any of those change in a future PR, the new copy must move in lockstep — the same discipline the version-history table already lives under. Mitigation: reviewer checklist below.
- *Regression on typecheck / lock test.* Non-substantive given the change is JSX-only, but non-zero. Mitigation: run both locally before pushing.

**Second-order (after merge).**

- *Reduces flexibility to later "quietly" admit invoice data.* Once the page names the hierarchy explicitly, promoting invoice observations into a higher priority tier becomes visibly a methodology change. This is a *feature*, not a risk — Alternative B above requires exactly this discipline anyway — but worth naming so the committee decides deliberately.
- *Creates a defensible target for critique.* Publishing the input classification invites external comment on it. This is the intended IOSCO-alignment posture (`transparency of methodology`, BMR Art. 13(1)(b)); the alternative (invisible weakness) is strictly worse. No mitigation needed.
- *Narrowly reduces the legal defensibility of a future "we always considered our inputs to be transaction data" argument.* Deliberate: that argument is not defensible today, would not survive a Big Four review, and pretending otherwise costs more than owning it. This proposal forecloses the option in favour of an honest posture.
- *30-day notice period tension with the "disclosure-only" framing.* The Committee charter's Step 3 requires 30 days' public notice for changes to `/methodology`. This PR sits under that rule because it edits the page, even though it changes no number. Rolling out under the full notice period is the right call — it (a) trains the muscle for a real change, (b) gives any early licensee time to review, and (c) satisfies P12 dry-run testing (gap-matrix row P12).

## Migration / rollout plan

This is a docs-surface change on a hard-limit page. Following the Committee charter:

- **T + 0 (PR merge, after @CarlosGalindo2807 review):** the merged commit becomes the announced version of the change. A `methodology_change` row is inserted with `effective_from = T + 30 days` and `rationale = 'Disclosure: self-classify as published-quote benchmark; publish Stage 1–5 hierarchy of data inputs. No formula change, no version bump. See PR #<num> and docs/research/proposals/2026-08-24-published-quote-benchmark-classification.md.'`.
- **T + 0 → T + 30 (notice window):** the new page copy is *not* yet rendered publicly. Roadmap B8 (public notice surface listing future `methodology_changes` rows) is the natural surface for this; if B8 has not shipped by merge time, the notice is instead pinned as a Committee-signed comment in the `methodology_changes` row and linked from the PR — the notice period runs on the row, not the page.
- **T + 30 (effective date):** the copy goes live via a follow-up trivial PR that flips the render behind `effective_from`. Zero code moves at this cutover other than the render flag.
- **Historical values:** untouched. No row in `index_values_daily` changes. This is the audit-principle norm (published numbers are immutable) and is trivially satisfied here because no number changes at all.
- **Rollback plan:** revert the page-copy PR. The `methodology_changes` row is left in place with a `superseded_at = <revert timestamp>` and a follow-up committee note explaining. No data restoration required — nothing downstream depends on the copy.
- **Monitoring after cutover:** watch `system_events` for any `methodology_changed` event over the 24 hours following T+30. Roadmap C15 (webhook on `methodology_changed`) is the operational belt-and-braces here; even in its absence, `system_events` is queryable manually.

**Reviewer (@CarlosGalindo2807) checklist:**

- [ ] Wording of "Nature of the inputs" reflects a claim you're willing to defend at a licensee meeting.
- [ ] Each of Stages 1–5 in the hierarchy matches your understanding of `apps/workers/src/functions/index-calculator.ts` behaviour today. Any drift is grounds to send this back rather than merge partially correct copy.
- [ ] You are content that the phrase *"a future version may admit [transaction data] as a higher-priority input class"* commits nothing but signals the intended direction.
- [ ] The 30-day notice framing is acceptable even though this is a disclosure-only change. (If not: propose in review to short-circuit under the "emergency change" clause of the charter with your reasoning; this proposal defaults to the full window.)

## Committee deliberation prompt (methodology only — this row applies because `/methodology` is a hard-limit surface even though no locked constant moves)

> "We are converting CTI's silence on IOSCO Principle 7 (Data Sufficiency) into an explicit self-classification as a *published-quote benchmark*, and publishing the Stage 1–5 hierarchy of data inputs to satisfy Principle 8. No constant in `PUBLISHED_METHODOLOGY` moves; no `index_values_daily` row changes value; the methodology-lock test continues to pass. The trade-off is: we forfeit any future ability to argue that our inputs are transaction data, in exchange for a defensible, primary-source-grounded posture on the two quality-pillar gaps most likely to be pressed on in a licensee, auditor, or regulator conversation. Voted: <yes / no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD, in role as sole founding Index Committee member."

## Closing

If approved and merged:

- Update `docs/research/gaps/iosco-principles.md`: row P7 status moves from `partial / structurally weak` → `partial` (Track A closed; Tracks B and C remain). Row P8 status moves from `partial` → `compliant` (the hierarchy is now published in the sense IOSCO Principle 8 requires; expert-judgment guidelines are covered by the "zero expert judgment" statement in Section 1). Priority-queue P0 item 4 is struck; P1 item 7 is struck.
- Update `docs/decisions.md` with a new entry titled *"Self-classify CTI as a published-quote benchmark (2026-08-24)"* citing this proposal and the merged PR.
- Link the merged PR at the foot of this proposal.

Deliberately **not** promised by this proposal (queued as future work, in priority order):

1. Track B — invoice-observations ingest + reconciliation report (gap-matrix P7 track B, P1, infrastructure — no hard-limit file). Requires the redaction pipeline for migration `011_pivot_v2_schema.sql`'s `invoice_observations` table to be stood up. This is the natural next-quarter deliverable.
2. Track C — provider-count-scaled quorum backtest (gap-matrix P7 track C, P1, research). A read-only backtest against `index_values_daily` and `price_snapshots` sized against thresholds; feeds a future methodology-class proposal.
3. n/a-declaration copy for P14 (Submitter Code of Conduct) and P19 (Cooperation with regulatory authorities). Gap-matrix P1 rows. Deliberately excluded from this proposal to keep the committee deliberation focused; a separate proposal folds both into one paragraph at the foot of `/methodology`.

---

## Sources

Primary regulatory and standards texts (verbatim excerpts confirmed via ESMA and IOSCO public search snippets this session — direct WebFetch of `iosco.org`, `eur-lex.europa.eu`, `esma.europa.eu`, and `lexparency.org` was blocked at the network egress proxy, as in prior sessions):

- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13 / IOSCOPD415, July 2013 — Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs). <https://www.iosco.org/library/pubdocs/pdf/IOSCOPD415.pdf>
- IOSCO, *Report on Guidance on the IOSCO Principles for Financial Benchmarks*, FR03/18 / IOSCOPD549, January 2018 — reiterates the "anchored by observable transactions" language and the proportionality carve-out. <https://www.iosco.org/library/pubdocs/pdf/ioscopd549.pdf>
- IOSCO, *Second Review of the Implementation of IOSCO's Principles for Financial Benchmarks*, IOSCOPD474 / IOSCOPD526 — Principle 7 excerpted verbatim (see §II.7). <https://www.iosco.org/library/pubdocs/pdf/ioscopd474.pdf>; <https://www.iosco.org/library/pubdocs/pdf/ioscopd526.pdf>
- Regulation (EU) 2016/1011 (Benchmarks Regulation), consolidated text as of 2025-01-17 — Article 3 definitions (`input data`, `transaction data`), Article 11 (Input data), Article 13 (Transparency of methodology). EUR-Lex CELEX 02016R1011-20250117. <https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R1011-20250117>
- ESMA Interactive Single Rulebook — Benchmarks Regulation, Article 11 (Input data). <https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data>
- Reserve Bank of Australia, *Compliance with IOSCO Principles — Cash Rate Methodology* — worked example of a published-quote-adjacent benchmark that adopts the IOSCO wording verbatim. <https://www.rba.gov.au/mkt-operations/resources/cash-rate-methodology/compliance.html>

Comparable-benchmark precedents cited (full analysis lives in the 2026-05-12 companion note):

- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026 — panel-assessment benchmark with no public trade tape, EU-BMR-compliant. <https://www.balticexchange.com/en/data-services/Methodology.html>
- IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, IOSCOPD364, October 2012 — MOC methodology blending bids, offers, transactions. <https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf>
- ICE Benchmark Administration / LBMA, *LBMA Gold Price FAQs* — contrast case where the fix is the transaction. <https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price>
- MSCI, *IOSCO Principles for Financial Benchmarks* — statement of compliance hub, structural reference for how a large administrator presents input-class disclosures. <https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco>

Internal references:

- `apps/web/app/methodology/page.tsx` — target file (hard-limit).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant (hard-limit; untouched by this proposal).
- `apps/workers/src/functions/methodology.test.ts` — methodology-lock test (untouched; must remain green).
- `packages/db/migrations/009_methodology_v1.sql` — `methodology_versions`, `methodology_changes` schema.
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` schema (Track B dependency).
- `docs/decisions.md` — 2026-05-09 methodology-lock entry; RLS hardening entry.
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — full IOSCO map (P7 diagnosed in §B).
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — companion note (this proposal is Track A from §4).
- `docs/research/gaps/iosco-principles.md` — gap matrix, rows P7 and P8.
- `docs/roadmap.md` — B7 (Committee membership), B8 (notice surface), B9 (compliance pack), C13 (Supabase Pro / PITR), C15 (`methodology_changed` webhook).

*Merged PR: TBD — filled in on merge.*
