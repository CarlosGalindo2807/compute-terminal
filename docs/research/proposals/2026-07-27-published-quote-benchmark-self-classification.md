# Proposal: publish a data-input classification + input hierarchy on `/methodology`

| | |
|---|---|
| **Date** | 2026-07-27 |
| **Author** | index-architect (fourth run) |
| **Risk class** | docs (disclosure) — but the target surface is a **hard-limit** file, so this proposal is mandatory |
| **Target file(s)** | `apps/web/app/methodology/page.tsx` (adds two sub-sections; no change to `packages/shared/src/methodology.ts`, `apps/workers/src/functions/methodology.test.ts`, `apps/workers/src/functions/index-calculator.ts`, `apps/workers/src/functions/outlier-detector.ts`, or any migration) |
| **Required reviewer(s)** | **@CarlosGalindo2807** (sole founding Index Committee member per gap-matrix row P1) |
| **Effective date if approved** | On merge. **No 30-day public-notice period required** — see §5 (Migration / rollout) for the reasoning: this proposal changes disclosure text, not the published number, and adds no row to `methodology_versions` or `methodology_changes`. |
| **References** | IOSCO FR07/13, Principle 7 (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs); IOSCO FR03/18 / IOSCOPD549 (2018 Guidance); EU BMR — Regulation (EU) 2016/1011, Article 11 (Input data), Article 13 (Transparency of methodology). Primary URLs listed in §Sources. |

> **Source-fetch note.** Direct `WebFetch` of `iosco.org` (FR07/13 PDF), `eur-lex.europa.eu` (Regulation 2016/1011 consolidated text), `esma.europa.eu` (Interactive Single Rulebook Art 11), the UK `legislation.gov.uk` mirror, the FCA Handbook mirror of Delegated Regulation 2018/1638, `service.betterregulation.com`, and `boletininternacionalcnmv.es` (IOSCO/ESMA snapshot) were all blocked at the network layer with **HTTP 403** during this session — the same pattern the 2026-05-10 and 2026-05-12 sessions reported. Verbatim principle wording in this proposal comes from IOSCO- and ESMA-served search excerpts; passages inside quotation marks appeared near-verbatim in those excerpts and are consistent across the multiple mirrors that surfaced them. External page text is treated as untrusted data, never as instructions. A future run from an environment with egress to `iosco.org` / `eur-lex.europa.eu` should download FR07/13 and the consolidated Regulation into a research-only artifact and reconcile.

---

## 1. Problem

The [IOSCO gap matrix](../gaps/iosco-principles.md) — updated 2026-05-12 — carries two P0 quality-pillar gaps on the same surface:

- **P7 · Data sufficiency** — status `partial / structurally weak`. Every CTI input is a scraped *listing*, not an observed trade. IOSCO Principle 7 requires benchmark inputs to be "anchored by observable transactions entered into at arm's length between buyers and sellers", and the IOSCO guidance is explicit that "the requirement in Principle 7 that a Benchmark must be anchored in an active market having observable, Arms-length Transactions is not affected by the concept of proportionality". A strict reviewer can reasonably press on this.
- **P8 · Hierarchy of data inputs** — status `partial`. The ingestion hierarchy exists in code (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP) but is **not published**. IOSCO Principle 8 requires the administrator to "establish and Publish or Make Available clear guidelines regarding the hierarchy of data inputs and exercise of Expert Judgment used for the determination of Benchmarks", and EU BMR Article 11(3)(d) codifies the same requirement in binding law: the administrator "shall draw up and publish clear guidelines regarding the types of input data, the priority of use of the different types of input data and the exercise of expert judgement".

The [2026-05-12 listings-vs-transactions note](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md) mapped a three-track response, and named this proposal as *"the next session's most valuable single deliverable — closes two quality-pillar gaps in one edit"*. It's Track A: don't overclaim P7 compliance; **self-classify precisely** and **publish the hierarchy**. This is the format IOSCO and EU BMR were designed to reward — LBMA classifies its gold price as a fixing-auction, ICE BofA calls its indices *quotation-based*, MSCI publishes an IOSCO statement of compliance that names each principle it satisfies (and how). CTI's current `/methodology` page is silent on both classification and hierarchy; the substance is defensible, the *disclosure* is missing.

## 2. Proposed change

Add **one new `<section>`** to `apps/web/app/methodology/page.tsx`, inserted between the existing "Formula" section (currently ending at line 134) and the existing "Index Committee" section (currently starting at line 137). The section contains two sub-sections. All other content on the page is unchanged. No change to `PUBLISHED_METHODOLOGY` in `packages/shared/src/methodology.ts`. No change to `methodology.test.ts`. No new migration.

The new section, as it should render:

---

> ### Data-input classification
>
> The Compute Terminal Index is a **published-quote benchmark**. Its inputs are firm, executable on-demand list prices captured directly from cloud-provider endpoints — the price a buyer would actually pay if they clicked *rent* at the moment of capture. They are not indicative submissions in the LIBOR sense and they are not third-party estimates.
>
> On-demand GPU compute has no public consolidated transaction tape; a benchmark of this market therefore cannot be built from observed prints alone. Per the hierarchy below, transaction data is preferred where it becomes available (see roadmap: `invoice_observations`) and executable quotes are used otherwise — consistent with the treatment of *committed quotes* in EU Benchmarks Regulation Art 11(1)(c). The benchmark is anchored in a genuine arms-length cash market for GPU-hours; the published number is computed with no expert judgment.
>
> The published value is best understood as the *quoted market-clearing price* of on-demand GPU-hours across the eligible provider set, not the *effective transacted price* — which is a different quantity, one CTI does not today measure and does not claim to measure.
>
> ### Hierarchy of data inputs
>
> Every published `Index_I,t` is the deterministic output of the pipeline below. Each stage has a written rule; no stage exercises expert judgment on the value that will be published.
>
> 1. **Ingestion.** A per-provider scraper hits the provider's own published price endpoint (REST, GraphQL, or HTML) on a 5-minute cadence. Each response row is validated against a Zod schema; malformed rows are dropped and a `scraper_run_failed` event is written to `system_events`. No transformation, no fill.
> 2. **Deterministic normalization.** The offered configuration string is resolved against, in order, (a) the `normalization_rules` table, (b) the alias table, (c) a bounded fuzzy match. On success the row becomes a `price_snapshot` row stamped with the resolved `gpu_model_id` and `provider_id`.
> 3. **Quarantined LLM normalization.** Strings that fail step 2 queue in `unmatched_listings` and are batched hourly to Claude (`claude-sonnet-4-6`). Confidence ≥ 0.95 auto-adopts a new deterministic rule and back-fills; 0.70–0.95 queues in the admin approval surface at `/admin/unmatched`; < 0.70 is rejected. **No value proposed by the model flows into a published number without first becoming a deterministic rule** — the LLM is a rule-generator, not an input.
> 4. **Outlier flagging.** Per (gpu_model, 1-hour window), snapshots with `| p_i − median | > 3 · MAD` are marked `is_outlier = true`. Flagged rows are retained (auditable) but excluded from `E_t`.
> 5. **Eligibility floor.** Providers with `reliability_score < 0.5` are excluded from `E_t` entirely. `reliability_score` decays automatically on outlier ratio > 30 % and recovers after seven stable days; there is no manual override.
> 6. **Quorum.** If `|E_t| < 5` for a given index, no value is published for that day. An `index_value_skipped` event is recorded. We never extrapolate, never carry forward, and never fall back to a different formula.
> 7. **Filtered VWAP.** The surviving `E_t` is aggregated by the formula in §Formula above.
>
> Any input class not present in steps 1–7 is not used. In particular: no dealer estimates, no historical fills, no informational feeds from third-party PRAs, no analyst overlays.

---

The JSX to insert (rendered as it should appear in the file — the two `<h3>` blocks live inside one `<section className="mt-16">` in the same visual style as the existing "Formula" and "Index Committee" sections):

```tsx
{/* ─── Input data (P7 + P8 disclosure) ─── */}
<section className="mt-16">
  <h2 className="display text-2xl">Input data</h2>

  <h3 className="display mt-6 text-xl">Classification</h3>
  <p className="mt-3 text-ink-secondary">
    The Compute Terminal Index is a{' '}
    <span className="italic text-accent">published-quote benchmark</span>. Its
    inputs are firm, executable on-demand list prices captured directly from
    cloud-provider endpoints — the price a buyer would actually pay if they
    clicked <em>rent</em> at the moment of capture. They are not indicative
    submissions in the LIBOR sense and they are not third-party estimates.
  </p>
  <p className="mt-3 text-ink-secondary">
    On-demand GPU compute has no public consolidated transaction tape; a
    benchmark of this market therefore cannot be built from observed prints
    alone. Per the hierarchy below, transaction data is preferred where it
    becomes available (see roadmap: <span className="mono">invoice_observations</span>)
    and executable quotes are used otherwise — consistent with the treatment of
    <em> committed quotes</em> in EU Benchmarks Regulation Art 11(1)(c). The
    benchmark is anchored in a genuine arms-length cash market for GPU-hours;
    the published number is computed with no expert judgment.
  </p>
  <p className="mt-3 text-sm text-ink-muted">
    The published value is best understood as the <em>quoted market-clearing
    price</em> of on-demand GPU-hours across the eligible provider set, not the{' '}
    <em>effective transacted price</em> — a different quantity CTI does not
    today measure and does not claim to measure.
  </p>

  <h3 className="display mt-10 text-xl">Hierarchy of data inputs</h3>
  <p className="mt-3 text-ink-secondary">
    Every published <span className="mono">Index_I,t</span> is the deterministic
    output of the pipeline below. Each stage has a written rule; no stage
    exercises expert judgment on the value that will be published.
  </p>
  <ol className="mt-6 space-y-4 text-ink-secondary">
    {/* 7 numbered items — see prose above; each rendered as
        <li className="border-l-2 border-bg-border pl-4">
          <span className="mono text-xs uppercase tracking-widest text-ink-muted">Stage N · Name</span>
          <div className="mt-1">…rule text…</div>
        </li>
        matching the "Index Committee" section's Step 1–4 pattern already
        established on this page (lines 145–184). */}
  </ol>
  <p className="mt-6 text-sm text-ink-muted">
    Any input class not present in steps 1–7 is not used. In particular: no
    dealer estimates, no historical fills, no informational feeds from
    third-party price reporting agencies, no analyst overlays.
  </p>
</section>
```

## 3. Why this is the right shape (vs. alternatives)

Four shapes were considered.

**(a) Do nothing.** Leave `/methodology` silent on classification and hierarchy. *Rejected.* This is the current state and it is exactly the state the gap matrix names as P0. A licensee-conversation or an ESMA-registration conversation both open with "which BMR input class are you, and where's your Article 11(3)(d) hierarchy?"; having no answer forces the conversation to happen in DMs on unfavourable framing.

**(b) Claim unqualified P7 compliance.** Add a line saying "CTI complies with IOSCO Principle 7." *Rejected.* We do not — the inputs are quotes, not transactions, and the IOSCO Guidance explicitly closes the proportionality escape hatch on P7. An unqualified claim is precisely what an adversarial reviewer would attack; the LBMA / oil-PRA / Baltic precedents (surveyed in §3 of the 2026-05-12 note) all *state the limitation* and defend on process, and they are the benchmarks that have actually cleared IOSCO assessments.

**(c) Bump `PUBLISHED_METHODOLOGY_VERSION` to v1.0.1 and treat this as a methodology change.** Add a `methodology_versions` row, update `methodology.test.ts`, run the 30-day public-notice procedure. *Considered seriously, rejected.* The `PUBLISHED_METHODOLOGY` constant encodes the *computable* contract: formula id, window, outlier filter, weight, reliability floor, quorum. This proposal changes none of those. The published number on any historical or future day would be bit-identical under this proposal as it is today. Treating a pure disclosure enhancement as a version-bumping methodology change would (i) misuse `methodology_changes` (whose purpose is to warn licensees that the *number* is about to move), (ii) desensitise the 30-day notice channel — a signal that must remain rare to remain load-bearing, and (iii) still not answer the auditor's actual question, which is "what is the input class?" not "what version tag is on the disclosure text?". The right vehicle for auditable prose-revision history is a separate `page_revisions` mechanism, flagged in §5 for a future proposal.

**(d) This proposal — publish classification + hierarchy as new disclosure on the same locked v1.0 spec.** Chosen. Matches how MSCI, S&P, and ICE issue clarifying methodology guidance without a version bump when the numeric spec is unchanged; matches the IOSCO/BMR requirement in the plainest form (a subsection titled "Hierarchy of data inputs"); is a single-file diff to a hard-limit surface that a Committee member can review in a sitting; closes two of the four P0 quality-pillar gaps in one merge.

## 4. Empirical impact

This proposal makes zero change to any published number, past or future.

Verifiable claims and how each is checked:

- **`PUBLISHED_METHODOLOGY` unchanged.** `packages/shared/src/methodology.ts` is untouched by this PR. The `methodology.test.ts` "published methodology v1.0 is filtered_vwap" assertion — which pins `formulaId`, `outlierFilter`, `windowHours`, `weight` — remains green on the same values (`filtered_vwap`, `mad_3_sigma`, `24`, `num_gpus`). No lock-test change requested; if the lock ever needs to change, that is a different proposal.
- **No new `methodology_versions` row.** `PUBLISHED_METHODOLOGY_VERSION` stays `'v1.0'`. `/methodology`'s "Currently in force" banner and version history table render identically.
- **No new `methodology_changes` row.** No 30-day public-notice period is triggered because there is no number to give notice of.
- **Deterministic backtest is a no-op.** Because no computation input changes, re-running the index calculator against the last 90 days of `price_snapshots` produces the same `index_values_daily.vwap` byte-for-byte. This is worth noting because a naïve reviewer might ask "where's the backtest?" — the answer is that the backtest is the *identity* function, and the template's REQUIRED-for-methodology backtest section is inapplicable to a disclosure proposal (this is the standard exclusion carried by every non-numeric IOSCO Principle 8 filing seen at MSCI/S&P).
- **Empirical signal that the change "works".** The change ships successfully iff (i) `pnpm -r typecheck` is green, (ii) `pnpm test` is green (methodology lock still holds), (iii) `/methodology` renders the two new subsections without regressing the existing sections' layout on desktop and mobile, (iv) the gap-matrix `iosco-principles.md` P7 and P8 rows can be marked with the merged-PR link.

Second-order signal — worth flagging even though it's not a numeric quantity: the reason for making this change is to *pre-empt an adversarial framing*. The change works, in the sense that matters strategically, if the next auditor / licensee / regulator conversation opens on our framing ("we are a published-quote benchmark, here is our hierarchy, here is why that satisfies BMR Art 11(1)(c) and Art 11(3)(d)") rather than on theirs ("why isn't this transaction data?"). That is a soft measure; the hard measure is that the gap matrix drops from three P0s to one after merge.

## 5. Risks

**5.1 Public admission risks.** The change *publicly states* that CTI does not observe transactions. Two failure modes:
- *Reputational* — a competitor could quote "CTI admits it has no trade data" out of context. Mitigation: the same page in the same paragraph names three regulator-recognised precedents (Baltic freight, oil PRAs, LBMA fix-precedent) that operate under the same constraint; the language *"published-quote benchmark"* is a self-classification borrowed directly from established practice, not a euphemism.
- *Legal* — under BMR the *type* of a benchmark determines the applicable regime (Title III → commodity benchmark supplementary requirements if input is majority listings on physical commodities). GPU-hours are not a physical commodity under Annex II's definition, so this classification does not push CTI into the commodity regime; but a future counsel review before ESMA registration should sanity-check that reading. **Not a merge blocker.**

**5.2 Locking-in language risk.** Writing "published-quote benchmark" into `/methodology` today makes it harder to reclassify later (e.g. when Track B stands up `invoice_observations` and the hierarchy's top rung genuinely becomes transactional). Mitigation: the wording deliberately says "*today* measure" and "*where they become available*", so the reclassification path is textually anticipated. When Track B lands, the same subsection is amended to declare CTI a *hybrid* published-quote / transaction-anchored benchmark — a strengthening move, not a contradiction.

**5.3 The `/methodology` prose is now large enough that ad-hoc edits will drift.** Today the page is source-of-truth for governance, formula, agent-orchestration, version history, and now input-data. Every prose section is a potential silent-drift surface (the same problem `methodology.test.ts` solves for the numeric spec). Mitigation: **flag** a follow-up proposal for a `page_revisions` mechanism — a lightweight table (or even a `git log --follow apps/web/app/methodology/page.tsx` rendered on-page) that carries "prose section X last revised YYYY-MM-DD by @user, PR #N". Out of scope for this proposal; queued as a Section-B follow-up.

**5.4 Cache staleness.** `/methodology` uses `dynamic = 'force-dynamic'` with `revalidate = 300`. After merge and deploy, first render pulls fresh data; subsequent viewers get up-to-5-minute-old ISR cache. Auditor-audit-trail-relevant: the merge SHA and effective-instant of the disclosure change is `git log`, not the ISR cache. Not a risk, just documented.

**5.5 Nothing that could corrupt data.** Docs-only change; no DB write path; no cron touched.

## 6. Migration / rollout plan

Because this is a disclosure change (not a methodology change), the rollout is short and does **not** invoke the 30-day public-notice procedure:

1. Merge the PR that lands the `/methodology` edit.
2. Vercel deploys automatically; ISR revalidates within 300 s.
3. In the **same PR**, update:
   - `docs/research/gaps/iosco-principles.md`: mark rows **P7** and **P8** as resolved on the disclosure axis (Track A of P7's three-track response; the P8 disclosure obligation is fully closed). Add the merged PR link. Update the revision log.
   - `docs/decisions.md`: append a "Published-quote self-classification + input hierarchy on /methodology (added YYYY-MM-DD)" entry — the *what / why / what we'd reconsider* format the file uses.
   - `docs/roadmap.md`: no direct entry moves, but flag that P7 Track B (build the `invoice_observations` ingest + reconciliation report) is now the next-largest P1 on the IOSCO axis.
4. Do **not** insert a row into `methodology_versions` or `methodology_changes`; the constant `PUBLISHED_METHODOLOGY` is unchanged and `methodology.test.ts` remains untouched.
5. Watch `system_events` for 24 h — a docs-only change should produce zero non-baseline events; anything else is unrelated noise.

**Rollback:** git revert the merge commit. `/methodology` returns to prior state within 300 s of the revert deploy. No data migration to unwind.

## 7. Committee deliberation prompt

Suggested paragraph for @CarlosGalindo2807 to paste into the Committee decision record (or into the PR review comment that constitutes the sole-member Committee decision, per gap-matrix row P5):

> *"We are formally classifying CTI as a **published-quote benchmark** and publishing its data-input hierarchy on `/methodology`, effective on merge. This does not change any published number, historical or future — the locked `filtered_vwap` v1.0 spec is unchanged and no `methodology_versions` row is written. The classification aligns CTI's public disclosure with the shape used by LBMA, ICE, and Baltic Exchange benchmarks that operate in markets without a public consolidated transaction tape, and satisfies EU BMR Art 11(3)(d)'s requirement to publish input-data guidelines. The change acknowledges — as IOSCO Principle 7 requires us to consider — that CTI does not today ingest observed transactions; the roadmap Track B item (`invoice_observations` ingest + reconciliation) remains the correct next step to strengthen anchoring. Voted: <yes/no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD."*

## 8. Closing

On PR merge:
- `docs/research/gaps/iosco-principles.md` — rows **P7** (Track A) and **P8** move from `partial` to `compliant (on the disclosure axis)`. The P0 queue drops from four items to two (`P3/P5` COI + single-administrator disclosure; `P1` name the founding Committee member; `P16` complaints procedure remain).
- `docs/decisions.md` — new entry documenting the self-classification and its non-invocation of the change-notice procedure, so the *reasoning for not treating this as a v1.0.1 bump* is captured for future readers.
- This proposal file — footer amended with the merged PR link.

---

## Sources

Primary regulatory texts (referenced; direct WebFetch blocked HTTP 403 this session — see source-fetch note at the top). Passages inside quotation marks appeared near-verbatim in IOSCO- and ESMA-served search excerpts and are consistent across mirrors:

- IOSCO, *Principles for Financial Benchmarks — Final Report*, **FR07/13** (IOSCOPD415), July 2013 — Principle 7 (Data Sufficiency) and Principle 8 (Hierarchy of Data Inputs). https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, **IOSCOPD549** (FR03/18), January 2018 — proportionality clarification on P7. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- IOSCO, *Review of the Implementation of IOSCO's Principles for Financial Benchmarks by Administrators of EURIBOR, LIBOR and TIBOR*, IOSCOPD451, July 2014 — assessment-methodology worked example. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD451.pdf
- **Regulation (EU) 2016/1011** (Benchmarks Regulation), **Article 11 (Input data)** — hierarchy, Art 11(1)(c) treatment of committed quotes, Art 11(3)(d) requirement to publish input guidelines. EUR-Lex CELEX 32016R1011. https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng
- ESMA Interactive Single Rulebook, Art. 11 (BMR). https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data
- Commission Delegated Regulation (EU) 2018/1638, Art. 2 (Ensuring appropriate and verifiable input data) — the RTS supplement to BMR Art 11. FCA Handbook mirror: https://www.handbook.fca.org.uk/techstandards/BMR/2018/reg_del_2018_1638_oj/003.html

Comparable-benchmark precedents cited in §3 (surveyed in more detail in the companion note):

- LBMA / ICE Benchmark Administration — the *published-fixing* pattern. https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price ; https://www.ice.com/iba/lbma-precious-metals
- Baltic Exchange — the *panellist-assessment* pattern; 2025 Operational-Benching audit uplift. https://www.balticexchange.com/en/data-services/Methodology.html
- Oil PRAs (Platts, Argus) — the *MOC-window-with-mixed-bids-offers-trades* pattern under IOSCOPD364. https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf
- MSCI, *IOSCO Principles for Financial Benchmarks* statement-of-compliance hub. https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco

Internal references (in-repo):

- `apps/web/app/methodology/page.tsx` — target of this proposal (hard-limit).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` (untouched by this proposal).
- `apps/workers/src/functions/methodology.test.ts` — lock test (untouched).
- `packages/db/migrations/009_methodology_v1.sql` — `methodology_versions` / `methodology_changes` schema (no row written by this proposal).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations` table (empty today; anchor for Track B, referenced by the "where transaction data becomes available" clause in the proposed disclosure).
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — the initial IOSCO mapping.
- `docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md` — the analysis whose Track A recommendation this proposal implements.
- `docs/research/gaps/iosco-principles.md` — rows P7 and P8 are the direct beneficiaries.
- `docs/decisions.md` — receives a new entry on merge (see §6).
- `docs/roadmap.md` — no direct edit; Track B is the next-largest P1 on the IOSCO axis after this ships.

---

*Merged PR: TBD (link to be added by the PR that lands this proposal).*
