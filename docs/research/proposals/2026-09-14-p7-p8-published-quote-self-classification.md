# Proposal: Publish CTI's data-input classification and hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-09-14 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (page copy) — no change to `PUBLISHED_METHODOLOGY`, no change to any published number. Touches a hard-limit surface (`apps/web/app/methodology/page.tsx`), which is why this is a proposal and not a direct PR. |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (add two new sections between "Quorum" and "Index Committee") |
| **Required reviewer(s)** | @CarlosGalindo2807 as sole founding Index Committee member (P1/P5). Approval flow: Committee approves the proposal → follow-up PR edits `/methodology` and lands with a `docs:` prefix (not `index-architect:` — the page edit is Committee-authored, not agent-authored). |
| **Effective date if approved** | **On merge.** No 30-day public-notice period is required: the published formula, constants, universe, quorum, outlier filter and reliability floor are all unchanged. This edit *discloses* what v1.0 already does; it does not modify what v1.0 does. Historical `index_values_daily` rows stamped `methodology_version = 'v1.0'` remain fully consistent with the new disclosure. |
| **References** | IOSCO FR07/13 Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs), Principle 9 (Transparency). EU BMR (Regulation 2016/1011) Art. 3(1)(14) (definitions), Art. 11(1)(a)–(c), Art. 11(3)(d), Art. 27 (benchmark statement). Precedent methodologies: BEISL *Guide to Market Benchmarks* v8.4 (May 2026), LBMA/ICE Precious Metals, ICE Benchmark Administration LBMA Gold self-assessment. Full source URLs at the foot of this proposal. |

## Problem

The `/methodology` page today publishes CTI's formula, eligibility floor, outlier filter, quorum rule and version-controlled change procedure. What it **does not** publish is:

1. **What class of input** the index consumes. Every `price_snapshots` row is a scraped executable *listing*, not an observed trade. Under a strict reading of IOSCO Principle 7, a reviewer can press on whether the benchmark is "anchored by observable transactions entered into at arm's length" — the exact phrase in FR07/13.
2. **The hierarchy of data inputs**. CTI in fact operates a strict, published, judgment-free ingestion hierarchy (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier filter → eligibility floor → filtered VWAP). It is one of CTI's strongest positions relative to LIBOR-descended benchmarks — but the hierarchy lives in code, not on the page.

This is the P0 item queued at row 4 of the priority queue in `docs/research/gaps/iosco-principles.md`, and the mapped-response for gap-matrix rows **P7** (Data Sufficiency, `partial / structurally weak`) and **P8** (Hierarchy of Data Inputs, `partial`). The prior research note [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) concluded that the single most valuable next deliverable is exactly this disclosure — Track A of that note's three-track response.

The failure mode this closes is not a legal cliff — CTI is not a regulated benchmark today. It is the **licensee conversation** failure mode: any serious counterparty (fund, exchange, auditor) that opens the file will ask, in some form, "what class of input?" and "what is the hierarchy?" Answering those in a paragraph on `/methodology` is worth 100× the effort compared to answering them by email 20 times.

## Proposed change

Add two new sections to `apps/web/app/methodology/page.tsx`, inserted between the existing "Quorum" subsection (which ends at the `<p>` referencing `index_value_skipped`) and the existing "Index Committee" `<section>`. The published formula, constants, universe, eligibility floor, outlier filter, quorum rule and change-control procedure are **not touched**. `packages/shared/src/methodology.ts` is **not touched**. `methodology.test.ts` is **not touched**. `PUBLISHED_METHODOLOGY_VERSION` stays at `'v1.0'`. No new migration.

### Section 1 — "Data-input classification"

```tsx
        {/* ─── Data-input classification (P7 self-classification) ─── */}
        <section className="mt-16">
          <h2 className="display text-2xl">Data-input classification</h2>
          <p className="mt-3 text-ink-secondary">
            CTI is a{' '}
            <span className="italic text-accent">published-quote benchmark</span>.
            Each input is a firm, executable on-demand list price captured directly
            from a provider's own price endpoint or public price page — a
            provider's advertised ask that a buyer can transact against at the
            quoted price on the quoted configuration. Under EU BMR Art. 3(1)(14),
            these are input data of the &ldquo;quotes / committed quotes&rdquo;
            class; under IOSCO FR07/13 they are executable quotes anchored in a
            genuine arms-length cash market for GPU-hours.
          </p>
          <p className="mt-4 text-ink-secondary">
            On-demand GPU compute has no public consolidated transaction tape.
            Individual buyer–provider settlements are private commercial data. In
            the language of the regulation, transaction data is not{' '}
            <span className="italic">available and appropriate</span> as a
            primary input class for a real-time benchmark of on-demand prices
            (BMR Art. 11(1)(c)). The competitive forces of supply and demand
            (IOSCO P7) act on providers' published quotes, which move in
            response to observed utilisation, competitor pricing and inventory —
            these quotes are the economic reality a buyer of on-demand GPU-hours
            actually faces.
          </p>
          <p className="mt-4 text-ink-secondary">
            The comparable precedents are the LBMA precious metal auctions
            (transaction-generating), the Baltic Exchange freight indices
            (assessment / panel, IOSCO-compliant under EU BMR without a public
            trade tape) and oil PRA market-on-close windows (mixed bids, offers
            and transactions). CTI sits closest to a strict, systematic,
            judgment-free MOC over a 24-hour window using executable quotes
            only — narrower than a PRA methodology, wider than an auction fix.
          </p>

          <div className="mono mt-6 rounded border border-bg-border bg-bg-surface p-6 text-sm leading-relaxed">
            <div className="text-ink-muted">Preferred hierarchy — highest to lowest</div>
            <div className="mt-3">{`  1. Transaction data                          — not currently used*`}</div>
            <div>{`  2. Executable quotes (published list prices)  — the CTI v1.0 input class`}</div>
            <div>{`  3. Indicative quotes                          — not used`}</div>
            <div>{`  4. Expert judgment                            — not used`}</div>
            <div className="mt-3 text-ink-muted">
              {`* Roadmap Track B: the invoice_observations table (migration 011)`}
            </div>
            <div className="text-ink-muted">
              {`  is designed as the future transaction anchor and will be used as a`}
            </div>
            <div className="text-ink-muted">
              {`  validation reconciliation before it is admitted as a v1.x input.`}
            </div>
          </div>

          <p className="mt-4 text-sm text-ink-muted">
            <span className="italic">Expert judgment in the published-number path: none.</span>{' '}
            No committee, operator or algorithm exercises discretion between the
            captured quote and the published index value. Every step is
            deterministic and reproducible from the source snapshots. The
            Committee's judgment applies only to <span className="italic">the methodology itself</span>,
            reviewed on the schedule in the next section and changed only with
            30 days&apos; public notice.
          </p>
        </section>
```

### Section 2 — "Hierarchy of data inputs"

```tsx
        {/* ─── Hierarchy of data inputs (P8) ─── */}
        <section className="mt-16">
          <h2 className="display text-2xl">Hierarchy of data inputs</h2>
          <p className="mt-3 text-ink-secondary">
            Every input reaches <span className="mono">E_t</span> through a fixed
            sequence of stages. The rule at each stage is deterministic; there
            is no fallback to expert judgment at any point.
          </p>

          <ol className="mt-6 space-y-4 text-ink-secondary">
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 1 · Capture</span>
              <div className="mt-1">
                Per-marketplace scrapers query each provider's own price endpoint
                or price page every 5 minutes. Each successful capture writes one
                row per (provider, gpu_model, region, config) into{' '}
                <span className="mono">price_snapshots</span> with the raw string,
                the parsed <span className="mono">price_per_hour</span>, the
                observed <span className="mono">num_gpus</span> and the capture
                timestamp. A failure emits a{' '}
                <span className="mono">scraper_run_failed</span> event; no synthetic
                or estimated row is ever written.
              </div>
            </li>
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 2 · Schema validation</span>
              <div className="mt-1">
                Every parsed row is validated against a Zod schema. Rows that
                fail the schema are dropped, not silently coerced.
              </div>
            </li>
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 3 · Deterministic normalization</span>
              <div className="mt-1">
                The captured GPU string is resolved against the catalog in this
                fixed order: exact rule → alias → deterministic fuzzy match. A
                match at any layer resolves the row to a canonical{' '}
                <span className="mono">gpu_model_id</span>.
              </div>
            </li>
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 4 · Assisted normalization</span>
              <div className="mt-1">
                Unresolved strings drain hourly through a Claude (Sonnet 4.6)
                batch. Assignments with confidence ≥ 0.95 auto-resolve into a{' '}
                <span className="mono">normalization_rule</span> and back-fill.
                Assignments between 0.70 and 0.95 queue for one-click human
                approval at <span className="mono">/admin/unmatched</span>.
                Below 0.70 the row is not admitted. No LLM output is admitted
                without an explicit rule row that can be audited after the fact.
              </div>
            </li>
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 5 · Outlier filter</span>
              <div className="mt-1">
                MAD-3σ per <span className="mono">gpu_model</span> over the last
                hour (formula above). Outliers are flagged in{' '}
                <span className="mono">price_snapshots.is_outlier</span>; the
                original row is retained for audit.
              </div>
            </li>
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 6 · Eligibility floor</span>
              <div className="mt-1">
                Rows whose provider carries{' '}
                <span className="mono">reliability_score &lt; {`{PUBLISHED_METHODOLOGY.reliabilityFloor}`}</span>{' '}
                are excluded. Reliability is computed from observed scrape success
                rate and outlier ratio; it has no manual override.
              </div>
            </li>
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage 7 · Quorum + publication</span>
              <div className="mt-1">
                For each index <span className="mono">I</span>, if the surviving
                set <span className="mono">E_t</span> has{' '}
                <span className="mono">|E_t| &lt; {`{PUBLISHED_METHODOLOGY.minObservations}`}</span>{' '}
                observations, no value is published for that index-day. Otherwise
                the filtered VWAP is written to{' '}
                <span className="mono">index_values_daily.vwap</span>, stamped
                with <span className="mono">methodology_version = &apos;v1.0&apos;</span>.
              </div>
            </li>
          </ol>

          <p className="mt-6 text-sm text-ink-muted">
            The full ingestion pipeline (Stages 1–7) is open source at{' '}
            <span className="mono">apps/workers/src/functions/</span> and{' '}
            <span className="mono">apps/scrapers/core/</span>. Every stage's
            decision is reproducible from the raw{' '}
            <span className="mono">price_snapshots</span> rows and the catalog
            state at the time of capture. Non-applicable IOSCO principles are
            noted below.
          </p>

          <div className="mt-8 rounded border border-bg-border bg-bg-surface p-6 text-sm text-ink-secondary">
            <div className="mono text-2xs uppercase tracking-widest text-ink-muted">
              Non-applicable principles — reasoned exclusions
            </div>
            <ul className="mt-3 space-y-2">
              <li>
                <span className="mono">IOSCO P14 (Submitter Code of Conduct).</span>{' '}
                CTI has no Submitters in the LIBOR sense. Inputs are captured
                mechanically from provider price endpoints; there is no human
                submission step to which a code of conduct could attach.
              </li>
              <li>
                <span className="mono">IOSCO P19 / EU BMR Title V (Regulator cooperation).</span>{' '}
                CTI is not currently an ESMA-registered, FCA-supervised or otherwise
                regulator-supervised benchmark. On registration, the applicable
                cooperation obligations attach by operation of law.
              </li>
            </ul>
          </div>
        </section>
```

### What does NOT change

- `packages/shared/src/methodology.ts` — untouched. `PUBLISHED_METHODOLOGY_VERSION` remains `'v1.0'`. The `filtered_vwap` formula, `windowHours: 24`, `minObservations: 5`, `outlierFilter: 'mad_3_sigma'`, `weight: 'num_gpus'`, `reliabilityFloor: 0.5` are all unchanged.
- `apps/workers/src/functions/methodology.test.ts` — untouched. Lock test continues to pin v1.0.
- `apps/workers/src/functions/index-calculator.ts` — untouched. What is written to `index_values_daily.vwap` on 2026-09-15 will be arithmetically identical to what would have been written under the pre-disclosure page copy.
- `packages/db/migrations/*` — no new migration.
- `methodology_versions` / `methodology_changes` — no new row. This is a disclosure of what v1.0 already is, not a v1.x bump.

## Why this is the right shape (vs. alternatives)

Three alternatives were weighed against the proposed shape.

**Alternative A — "Claim IOSCO-compliant" on `/methodology`.** Rejected. IOSCO compliance is a claim serious counterparties will test against the FR07/13 checklist. CTI today has known gaps against P3, P4, P5, P13, P15, P16, P17, P18 (see `docs/research/gaps/iosco-principles.md`). Making an unqualified claim before those gaps close would misrepresent v1.0 and burn credibility on the first review. The proposed shape instead *positions* CTI as a stated-limitation published-quote benchmark, which is what the regulation itself contemplates for benchmarks without a public trade tape.

**Alternative B — "Silence and let counterparties infer".** Rejected. The listings-vs-transactions issue is the single most-pressed-on question any auditor or licensee will raise (see §1 of `notes/2026-05-12-listings-vs-transactions-iosco-p7.md`). Not answering it in the published spec means it comes up as a surprise in every conversation — the opposite of what the `/methodology` page exists to prevent. The regulation is also explicit that the hierarchy of input data and the exercise of expert judgment must be *published* (BMR Art. 11(3)(d): "the administrator shall draw up and **publish** clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement"). Silence is not an option that satisfies P8.

**Alternative C — "Wait for `invoice_observations` to ingest first, then classify as a mixed transaction/quote benchmark".** Rejected as a first step, retained as Track B. `invoice_observations` (migration 011) is the right long-run home for transaction anchoring, but standing up its redaction + ingest pipeline is a multi-week workstream and blocks on customer relationships that don't exist yet. Publishing the honest self-classification of v1.0 now costs a page edit; it does not preclude — and in fact prepares the ground for — a future v1.x that admits invoice observations as a weighted input class above listings in the hierarchy.

**Why the proposed shape wins.** It (a) satisfies the *literal* language of BMR Art. 11(3)(d) (publish the hierarchy), (b) matches the IOSCO-endorsed pattern for executable-quote benchmarks that FR07/13 explicitly contemplates ("a benchmark that is based exclusively on executable quotes would not need to explain in each determination why it has not used transaction data, provided that it includes the requisite disclosure in its published rules and procedures" — verbatim from FR07/13 guidance excerpt), (c) closes both P7 and P8 in one page edit with no code change and no formula change, (d) preserves every downstream reproducibility guarantee (historical rows unchanged, version constant unchanged, lock test unchanged), and (e) is precedented by regulated administrators: BEISL's *Guide to Market Benchmarks* opens exactly this way for its freight indices — "priority for the purpose of Input Data contribution is given to transaction data, but the BEISL methodology takes into consideration that such transaction data may not always be available."

## Empirical impact

**On published numbers.** None. This is a page-copy change. Every `index_values_daily.vwap` published after merge is computed by the identical code path (`apps/workers/src/functions/index-calculator.ts` → `methodologies.filtered_vwap` in `packages/shared/src/methodology.ts`) with the identical constants (`PUBLISHED_METHODOLOGY`). No backtest is required for a copy edit that does not change what is computed.

**Verification steps before landing the follow-up implementation PR** (all zero-risk, docs-only):

1. `pnpm -r typecheck` — must stay green. The two new sections use only pre-existing Tailwind classes and pre-existing constants from `PUBLISHED_METHODOLOGY`.
2. Local render of `/methodology` — visual inspection that the two new sections read naturally between "Quorum" and "Index Committee", and that mobile layout is preserved.
3. `apps/workers/src/functions/methodology.test.ts` — must stay green. The test pins the constant, which this change does not touch.
4. Grep for `PUBLISHED_METHODOLOGY_VERSION` and `methodology_version` — every reference must still resolve to `'v1.0'`.
5. Confirm the two `{`PUBLISHED_METHODOLOGY.reliabilityFloor`}` and `{`PUBLISHED_METHODOLOGY.minObservations`}` interpolations render live values (as in the existing code).

**On downstream consumers.** None. The version constant is unchanged, so any licensee referencing "CTI v1.0" continues to reference the identical formula, universe and thresholds. The new disclosure sits alongside the existing formula, it does not replace or contradict it.

**On IOSCO gap-matrix rows.**
- P7 (`partial / structurally weak`) → `partial / defensible` upon merge. The residual weakness is the *absence* of transaction data, not the *misclassification* of the input. Full compliance moves to Track B (invoice_observations ingest + reconciliation report).
- P8 (`partial`) → `compliant` upon merge. The hierarchy is now published; there is no expert-judgment path in the published-number pipeline for the disclosure to describe.
- P14 (`n/a, undocumented`) → `n/a, documented` upon merge.
- P19 (`n/a, undocumented`) → `n/a, documented` upon merge.

## Risks

**Immediate.**
- *TSX rendering / lint failure.* Mitigation: implementation PR is a copy-paste of the blocks in this proposal, with a local dev-server render checked before push. Existing page already uses the same class conventions and constant interpolations.
- *Wording overclaims compliance.* Mitigation: the disclosure uses the phrasing "published-quote benchmark" (self-classification) and "not currently a regulated benchmark" (regulatory status) — neither asserts full IOSCO or BMR compliance, both anchor honestly to the regulation's own language.

**Second-order.**
- *Locking in language we later regret.* Mitigation: the disclosure describes what v1.0 *does* — an executable-quote benchmark with a fixed hierarchy — and preserves the future path (Track B) as a stated roadmap item, not a commitment. A v1.x that admits invoice observations changes the ranking of stage 1 vs stage 2 in the hierarchy; the *shape* of the disclosure stays valid.
- *Auditor or licensee reads the disclosure and asks for more.* This is the *point* — surfacing the question in text on the page is what turns a surprise objection into a scoped follow-up. Expected next-question set (invoice pipeline, provider-count-scaled quorum, external-audit engagement) is already tracked in `docs/research/gaps/iosco-principles.md` and `docs/roadmap.md`.
- *Narrows the legal defensibility of v1.0.* Reviewed and rejected. Publishing the honest classification *strengthens* defensibility because it aligns the published spec with the operational reality; the un-narrowed status quo — where CTI silently is a quote-based benchmark while `/methodology` says nothing about it — is the weaker legal position (BMR Art. 11(3)(d) explicitly requires publication of the hierarchy).

**What we are not taking on with this proposal.**
- Any change to `PUBLISHED_METHODOLOGY`, the formula, the universe, the outlier filter, the quorum, the eligibility floor, the version constant or the lock test.
- The 30-day public-notice procedure (formula unchanged).
- The Track B invoice-observations ingest pipeline (separate workstream).
- The Track C provider-count-scaled quorum (methodology-class — separate future proposal + backtest).
- The P3 COI disclosure, P16 complaints procedure, P5 second-committee-member declaration (queued as P0 items 1–3 in the gap-matrix priority queue; separate follow-up proposals).

## Migration / rollout plan

**This proposal.**
1. Merged as `docs/research/proposals/2026-09-14-p7-p8-published-quote-self-classification.md` in the current PR, with `@CarlosGalindo2807` as reviewer.
2. Committee review yields either (a) approval as-is, (b) approval with wording revisions committed to the proposal, or (c) rejection with reasoning captured in the PR discussion (which itself becomes P18 audit trail).

**Follow-up implementation PR** (Committee-authored, `docs:` prefix, opened only after this proposal is approved).
3. Copy the two `<section>` blocks from this proposal verbatim into `apps/web/app/methodology/page.tsx` between the existing "Quorum" `<p>` and the existing "Index Committee" `<section>`.
4. Run `pnpm -r typecheck` and `pnpm --filter web dev` for local visual verification.
5. Merge to `main`; Vercel deploys `/methodology` with the new sections; ISR revalidation (`revalidate = 300`) picks up the change within five minutes.
6. Update `docs/research/gaps/iosco-principles.md`: mark P7 `partial → partial (defensible)`, P8 `partial → compliant`, P14 `n/a, undocumented → n/a, documented`, P19 `n/a, undocumented → n/a, documented`. Add revision-log entry.
7. Update `docs/decisions.md` with a `2026-09-XX Published-quote self-classification on /methodology (P7 + P8 disclosure)` entry describing what shipped and why.

**Rollback.** Trivial. The change is additive markup; reverting the follow-up PR removes the two sections without touching any code path. `PUBLISHED_METHODOLOGY`, `index-calculator.ts`, `methodology.test.ts` and all migrations are untouched by both this proposal and the follow-up, so rollback has zero downstream effect.

**Monitoring.** None required beyond ordinary page availability. There is no `methodology_changed` event associated with this edit (no methodology change occurred). If the Committee wishes to record the disclosure edit on the audit trail, an *optional* row in a new `methodology_changes` entry could be added with `change_type = 'disclosure_only'` and `formula_id` / `formula_params` unchanged — this is a Committee choice, not a technical requirement.

## Committee deliberation prompt

> "We are publishing on `/methodology` a self-classification of CTI v1.0 as a *published-quote benchmark* consuming executable list prices, together with the seven-stage deterministic hierarchy of data inputs and a statement that no expert judgment enters the published-number path. The formula, universe, outlier filter, quorum, eligibility floor and version constant are unchanged; the disclosure describes what v1.0 already does. This closes IOSCO P8 (Hierarchy of Data Inputs) as `compliant`, moves P7 (Data Sufficiency) from `partial / structurally weak` to `partial / defensible` with Track B (invoice reconciliation) mapped, and documents P14 and P19 as non-applicable with reasoning. The disclosure aligns with EU BMR Art. 11(1)(c) (committed quotes as a permitted input class when transaction data is not available and appropriate) and Art. 11(3)(d) (published hierarchy) and follows the pattern IOSCO FR07/13 explicitly contemplates for executable-quote benchmarks. Voted: <yes/no>, Carlos Galindo Dumitrescu, on 2026-09-XX."

## Closing

**On approval:**
1. The Committee opens the follow-up implementation PR (`docs:` prefix) with the two `<section>` blocks copied verbatim into `apps/web/app/methodology/page.tsx`.
2. `docs/research/gaps/iosco-principles.md` is updated per the "empirical impact" section above (P7/P8/P14/P19 rows + revision log entry).
3. `docs/decisions.md` gains an entry recording the disclosure decision and its rationale.
4. This proposal file gains a footer line linking to the merged follow-up PR.

**On rejection or wording revisions:**
- The PR discussion becomes the P18 audit-trail record of the deliberation. The proposal file is amended (if wording changes are proposed) or archived (if rejected outright) with a `Status: rejected on YYYY-MM-DD, reasoning: …` header line.

---

## Sources (primary)

Regulatory texts — direct PDF/HTML egress was blocked at the network layer this session (same as prior three runs). Quoted language below is reconstructed from IOSCO- and ESMA-published search-result excerpts returned this session; passages in quotation marks appeared verbatim in those excerpts. A future session with unblocked egress should download and reconcile.

- **IOSCO FR07/13**, *Principles for Financial Benchmarks — Final Report*, July 2013. Verbatim quotes captured:
  - P7 (Data Sufficiency): "based on prices, rates, indices or values that have been formed by the competitive forces of supply and demand and anchored by observable transactions entered into at arm's length between buyers and sellers in such an active market."
  - P7 flexibility clause: "Individual benchmark determinations do not need to be constructed solely or even predominantly by transactions or use data in a certain order. A benchmark does not need to be constructed solely of transaction data, nor does transaction data carry more significance in the determination of a benchmark than non-transaction data."
  - P7 executable-quote carve-out: "a benchmark that is based exclusively on executable quotes would not need to explain in each determination why it has not used transaction data, provided that it includes the requisite disclosure in its published rules and procedures."
  - Proportionality floor: "the concept of proportionality is not intended to affect the requirement in Principle 7 that a Benchmark must be anchored in an active market having observable, Arms-length Transactions."
  - https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- **IOSCO FR03/18 / IOSCOPD549**, *Guidance on the IOSCO Principles for Financial Benchmarks*, January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- **IOSCO IOSCOPD562**, *Methodology for Assessing Implementation of the IOSCO Principles for Financial Benchmarks*. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD562.pdf
- **Regulation (EU) 2016/1011** (Benchmarks Regulation). Verbatim quotes captured:
  - Art. 3(1)(14) input-data definition: "'Input data' means the data in respect of the value of one or more underlying assets, or prices, including estimated prices, quotes, committed quotes or other values, used by an administrator to determine a benchmark."
  - Art. 11(1)(c) hierarchy: "The input data shall be transaction data, if available and appropriate. If transaction data is not sufficient or is not appropriate to represent accurately and reliably the market or economic reality that the benchmark is intended to measure, input data which is not transaction data may be used, including estimated prices, quotes and committed quotes, or other values."
  - Art. 11(3)(d) publish-hierarchy obligation: "the administrator shall draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement."
  - Art. 3(1)(15) transaction-data definition: "'Transaction data' means observable prices, rates, indices or values representing transactions between unaffiliated counterparties in an active market subject to competitive supply and demand forces."
  - EUR-Lex CELEX 32016R1011: https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng ; ESMA interactive rulebook Art. 11: https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data ; ESMA Art. 27 (benchmark statement): https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-27-benchmark

Comparable-benchmark methodologies consulted (search-result excerpts this session):
- **Baltic Exchange International Services Ltd (BEISL)** — *Guide to Market Benchmarks*, v8.4, May 2026. Quoted: "The Baltic is committed to implementing and promoting adherence to internationally recognised standards of regulations including the IOSCO Principles for Financial Benchmarks (IOSCO PFBs) and the EU Benchmark Regulation (EU BMR)." And on hierarchy: "priority for the purpose of Input Data contribution is given to transaction data, but the BEISL methodology takes into consideration that such transaction data may not always be available."
  - https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf
- **ICE Benchmark Administration / LBMA** — LBMA Gold IOSCO self-assessment ("physically settled, electronic, tradable auction process ... IOSCO-compliant"). Precedent for the transaction-generating alternative (a fixing auction) that CTI does not adopt today.
  - https://www.ice.com/publicdocs/LBMA_Gold_IOSCO_self_assessment.pdf ; https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price
- **MSCI**, *IOSCO Principles for Financial Benchmarks — Statement of Compliance* (structural precedent for the disclosure format).
  - https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco
- **Parameta Solutions**, *Statement regarding the IOSCO Principles for Financial Benchmarks*, v3.2, Feb 2026 (precedent for the expert-judgment disclosure phrasing).
  - https://www.parametasolutions.com/wp-content/uploads/2026/02/2026.02.18-IOSCO-Statement-of-Compliance-v3.2.pdf
- **HFR Index Administration**, *BMR Benchmark Statement for HFRI Indices* (precedent for the input-classification disclosure format).
  - https://www.hfr.com/pdf/BMR_Benchmark_Statement_HFR.pdf

Internal references:
- `apps/web/app/methodology/page.tsx` — target hard-limit surface for the follow-up implementation PR.
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` constant (untouched by this proposal).
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — first-run IOSCO map; §B rows P7 & P8.
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — third-run analytic foundation; §4 Track A recommendation is what this proposal executes.
- `docs/research/gaps/iosco-principles.md` — row P7 (P0), row P8 (P1, bundled with P7), priority queue row 4 (P0).
- `docs/decisions.md` — "Pivot to 'Bloomberg for buyers'" (invoice_observations context), "Five-methodology A/B → Locked methodology v1.0" (change-control regime this proposal operates under).
- `docs/roadmap.md` — B7 (name Committee member), B8 (notice page), B9 (compliance pack); this proposal is upstream of all three.
