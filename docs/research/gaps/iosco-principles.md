# Gap matrix — IOSCO Principles for Financial Benchmarks vs CTI v1.0

**Living document.** Updated in place as our state changes. Latest revision:
2026-11-26 (P0 item 4 proposal filed — P7/P8 pointer flipped from "write proposal" to "review proposal"; P14/P19/P12 folded into the same PR; P1 queue trimmed accordingly).

**Companion note:** [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](../notes/2026-05-10-iosco-principles-applied-to-cti.md)
— full prose, citations, and reasoning behind every row below.

**Status legend:**
- `compliant` — claim is defensible to a serious external reviewer today, with named evidence in-repo.
- `partial` — substantively in place, with a specific named gap to close.
- `gap` — not yet addressed; written work or code required.
- `n/a` — does not apply to CTI; reason documented in the companion note.

**Priority legend:**
- `P0` — blocks any "we are IOSCO-aligned" claim. Do first.
- `P1` — blocks audit-readiness conversation, but not a public-claim blocker.
- `P2` — closes a long-tail gap; needed before regulator-registration phase.
- `—` — n/a row, no priority.

---

## A. Governance of the Administrator

| # | Principle | CTI status | Evidence today | Specific gap | Priority | Owner / Action |
|---|---|---|---|---|---|---|
| P1 | Overall responsibility of the Administrator | partial | `/methodology` names "Index Committee" as responsible body; `methodology_versions.approved_by` set; `PUBLISHED_METHODOLOGY` constant locked. | Committee not formally constituted — `approved_by` is "Index Committee — founding charter" rather than named members. | P0 | Roadmap B7 — UPDATE statement to set `approved_by` to "Carlos Galindo Dumitrescu, sole founding committee member". |
| P2 | Oversight of third parties | partial | Inngest, Supabase, Vercel, Brave, scrapers all behave through code we wrote; no third party submits inputs that bypass our pipeline. | No documented third-party dependency map or failure-mode register. | P1 | Write `docs/research/notes/<date>-third-party-map.md`. |
| P3 | Conflicts of interest for Administrators | gap | None published. | No COI policy exists. Sole administrator is also operator and could in principle transact on indexed providers. | P0 | One-page COI disclosure on `/methodology` — does/doesn't transact, recusal rules, materiality threshold. |
| P4 | Control framework for Administrators | partial | Outlier detector, reliability decay, methodology lock test, Zod schema validation, CODEOWNERS gating, RLS on all 19 public tables, SSRF-hardened discovery. | No single document names each control and maps it to the principle it addresses. | P1 | `docs/control-framework.md` — table of (control, principle addressed, file, owner). |
| P5 | Internal oversight | gap | None. | Single-person Committee is structurally incapable of "separate oversight". | P0 | Either (a) recruit a second voting member, or (b) document v1.0 as single-administrator with a chartered date for adding the second member. Both are P0 disclosures, not P0 code. |

## B. Quality of the Benchmark

| # | Principle | CTI status | Evidence today | Specific gap | Priority | Owner / Action |
|---|---|---|---|---|---|---|
| P6 | Benchmark design | compliant | Filtered VWAP weighted by `num_gpus`, MAD-3σ outlier filter, eligibility floor (`reliability_score ≥ 0.5`), quorum (`min_observations ≥ 5`), all on `/methodology` and locked in `packages/shared/src/methodology.ts`. No expert judgment. | None substantive — design is defensible. | — | Maintain. Re-evaluate at each quarterly review (P10). |
| P7 | Data sufficiency | partial / **structurally weak** — **Track A proposal filed 2026-11-26, awaiting Committee review** | All inputs anchored in a genuine arms-length cash market for GPU-hours; inputs are **firm executable list prices** (closer to BMR "committed quotes" than to indicative submissions). 24h rolling window, ≥ 6 providers when fully ramped. `invoice_observations` table exists (migration 011) as the latent transaction layer — empty today. | Inputs are executable **listings**, not observed trades. Strict P7 reading requires "anchored by observable transactions". On-demand compute has no public consolidated tape. Path now mapped (see note): **Track A** — self-classify as a *published-quote benchmark* + publish data-input hierarchy on `/methodology` (P0, **proposal filed**, awaiting Committee approval; folds in P8). **Track B** — stand up `invoice_observations` ingest, then publish a list-price-vs-observed-effective-price reconciliation report (P1, infra, no hard-limit file). **Track C** — provider-count-scaled quorum so thin-GPU indices suppress earlier (P1, methodology-class → proposal + committee). | P0 (Track A — now awaiting review) / P1 (B, C) | Note: [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md). **Track A proposal:** [`proposals/2026-11-26-methodology-published-quote-self-classification.md`](../proposals/2026-11-26-methodology-published-quote-self-classification.md). Next: @CarlosGalindo2807 reviews proposal, merges, 30-day notice runs, effective 2026-12-27. |
| P8 | Hierarchy of data inputs | partial — **publication subsection drafted in Track A proposal 2026-11-26** | Hierarchy exists in code (rule → alias → fuzzy → Claude ≥ 0.95 auto → Claude 0.70–0.95 admin queue → outlier check → eligibility check → VWAP). Zero expert judgment in published-number path. | Hierarchy is implicit, not published. Draft wording of the "Hierarchy of data inputs" subsection is in [`proposals/2026-11-26-methodology-published-quote-self-classification.md`](../proposals/2026-11-26-methodology-published-quote-self-classification.md) §2a and ships in the same PR as the P7 self-classification. | P1 (bundled with P0 Track A — same proposal, same page edit) | Review the proposal. Flips to `compliant` on merge + effective date 2026-12-27. |
| P9 | Transparency of benchmark determinations | partial | `/index/[slug]` shows daily values; `index_values_daily` carries `methodology_version`; provenance is reproducible from `price_snapshots`. | Per-day diagnostics (`numObservations`, providers contributing, outliers excluded, reliability scores) not surfaced on the public page. | P1 | Roadmap B9 — compliance-pack PDF; per-day audit card. |
| P10 | Periodic review | partial | Charter on `/methodology` mandates quarterly Committee review of 90 days of research output. | First review not yet executed (due ~2026-07-29). No template defined. | P1 | Define `docs/research/reviews/<period>.md` template before the first review. |

## C. Quality of the Methodology

| # | Principle | CTI status | Evidence today | Specific gap | Priority | Owner / Action |
|---|---|---|---|---|---|---|
| P11 | Content of the methodology | compliant | `/methodology` publishes formula, eligibility, outlier filter, quorum, reliability floor, universe; `PUBLISHED_METHODOLOGY` is open-source. | None substantive. | — | Maintain. Re-render any change as a single PR that updates page + constant + version row. |
| P12 | Changes to the methodology | compliant in design, untested — **dry-run via inert docs-only v1.0.1 bump bundled in Track A proposal** | 30-day public-notice procedure on `/methodology` Steps 1–4; `methodology_changes` table; CODEOWNERS gates hard-limit files; methodology lock test. | No change has yet been processed end-to-end. The Track A proposal is structured as an inert v1.0 → v1.0.1 docs-only bump that exercises Steps 1–4 with zero numeric impact — see [`proposals/2026-11-26-methodology-published-quote-self-classification.md`](../proposals/2026-11-26-methodology-published-quote-self-classification.md) §2c and §6. | P1 (de-risked on merge of Track A; fully `compliant` once effective 2026-12-27) | Review and merge the Track A proposal — closes P12 "untested" and P7/P8 in the same PR. |
| P13 | Transition (cessation) | gap | None. | No written cessation policy. CTI has obvious cessation triggers (NVIDIA EOLs a generation, providers stop publishing prices, scraper sources collapse) that need a documented response. | P1 | Proposal `proposals/<date>-cessation-policy.md`: trigger indicators, public-notice period, data-availability commitment to legacy users. |
| P14 | Submitter Code of Conduct | n/a — **scope-note wording drafted in Track A proposal 2026-11-26** | Inputs are scraped, not submitted. No Submitters in the LIBOR sense. | Non-applicability not yet documented as such. | — (closes on merge of Track A) | One-paragraph scope note on `/methodology` declaring P14 n/a bundled into [`proposals/2026-11-26-methodology-published-quote-self-classification.md`](../proposals/2026-11-26-methodology-published-quote-self-classification.md) §2b. |
| P15 | Internal controls over data collection | partial | Zod schema validation, dead-letter event, automatic outlier flagging, reliability decay, `system_events` audit trail (RLS-locked, service-role-only writes), 010 RLS hardening. | Audit log is not hash-chained / signed. No documented retention policy. | P1 | (a) Document retention policy (≥ 5 years per IOSCO). (b) Investigate hash-chained signing of `system_events` rows — research-note territory first, then proposal. |

## D. Accountability

| # | Principle | CTI status | Evidence today | Specific gap | Priority | Owner / Action |
|---|---|---|---|---|---|---|
| P16 | Complaints procedures | gap | None. | No complaints process. | P0 | Public email + 30-day-response SLA published on `/methodology`. |
| P17 | Audits | partial | Data retained: `price_snapshots`, `index_values_daily`, `system_events` are permanent and version-stamped. | No external audit (Big Four or equivalent) yet engaged. PITR not enabled (Supabase free tier). | P2 | (a) Roadmap C13 — Supabase Pro for PITR. (b) External audit engagement deferred until ≥ 12 months of data — set calendar reminder for 2027-04-29. |
| P18 | Audit trail | partial | `methodology_versions` and `methodology_changes` log methodology decisions; `index_values_daily.methodology_version` stamps every published value; per-snapshot `is_outlier` and `provider_reliability_score` retained. | No durable record of *Committee deliberations* — minutes that explain why a methodology change was approved or rejected. | P1 | `docs/committee-minutes/` directory; commit-on-decision discipline; proposal template's "Committee deliberation prompt" already feeds into this. |
| P19 | Cooperation with regulatory authorities | n/a until regulated — **scope-note wording drafted in Track A proposal 2026-11-26** | CTI is not an ESMA-registered or FCA-supervised benchmark today. | Non-applicability not yet documented. | — (closes on merge of Track A) | One-paragraph scope note on `/methodology` stating regulatory status + conditional cooperation commitment bundled into [`proposals/2026-11-26-methodology-published-quote-self-classification.md`](../proposals/2026-11-26-methodology-published-quote-self-classification.md) §2b. |

---

## Rolling priority queue (P0 → P2)

Ordered by effort × leverage. P0 first, then P1, with the dependent items grouped.

**P0 (do these before any external "we are IOSCO-aligned" claim):**
1. P3 / P5 — Conflict-of-interest disclosure + single-administrator declaration on `/methodology`. *Half-day docs work.* **Next session's candidate.**
2. P1 — Name the founding Committee member (Roadmap B7). *Five-minute UPDATE.*
3. P16 — Publish complaints email + SLA on `/methodology`. *Half-day docs work, dependent on email mailbox.*
4. ~~P7 + P8~~ — **Proposal filed 2026-11-26** at [`proposals/2026-11-26-methodology-published-quote-self-classification.md`](../proposals/2026-11-26-methodology-published-quote-self-classification.md). Awaiting @CarlosGalindo2807 review; bundles P12 dry-run + P14/P19 scope notes in the same PR. Effective 2026-12-27 after 30-day notice.

**P1 (do these before audit-readiness conversation):**
5. P2 — Third-party dependency map.
6. P4 — Control-framework document mapping each control to a principle.
7. ~~P8~~ — **bundled into P0 item 4 proposal (2026-11-26); closes on merge.**
8. P9 — Per-day audit card / compliance-pack PDF (Roadmap B9).
9. P10 — Quarterly-review template (before 2026-07-29).
10. ~~P12~~ — **dry-run via inert v1.0.1 bump bundled into P0 item 4 proposal (2026-11-26); fully exercised on effective date 2026-12-27.**
11. P13 — Cessation policy proposal.
12. ~~P14~~ — **bundled into P0 item 4 proposal (2026-11-26); closes on merge.**
13. P15 — Retention policy doc; hash-chained `system_events` research note.
14. P18 — `committee-minutes/` directory + commit discipline.
15. ~~P19~~ — **bundled into P0 item 4 proposal (2026-11-26); closes on merge.**

**P2 (long tail, registration-phase):**
16. P17 — Supabase Pro for PITR (Roadmap C13); external audit engagement at the 12-month mark.

**Items closed by merging the 2026-11-26 Track A proposal:** P7 (Track A), P8, P12 (now exercised once end-to-end), P14, P19. Remaining P0 queue after merge: items 1–3 above (P1/P3/P5/P16).

---

## How to maintain this file

This is a *living document*. Update in place when:
- A `compliant` row's evidence file moves or changes — update the cell.
- A `partial` or `gap` row gets closed by a merged PR — change status, add merged PR link, update the priority queue.
- A new principle interpretation is published by IOSCO (e.g. an updated guidance document) — update the row's principle text and reassess.
- The benchmark itself materially changes — IOSCO compliance is per-version; if v1.x ships, the matrix needs a per-version review.

When updating, change the "Latest revision" date at the top of the file and add
a one-line entry below describing the change. Do **not** date-stamp this file's
filename — it should always be the current state of the matrix.

### Revision log

- **2026-05-10** — Initial population. 19 rows × 4 categories. 5 rows P0, 11 rows P1, 1 row P2, 2 rows n/a. One row each (P11, P6) `compliant`. (index-architect first run.)
- **2026-05-12** — P7 row rewritten after [`notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](../notes/2026-05-12-listings-vs-transactions-iosco-p7.md): inputs reclassified as firm executable quotes (≈ BMR "committed quotes"), three-track response mapped (A: self-classify + hierarchy on `/methodology` — P0, needs proposal; B: invoice anchor + reconciliation — P1, infra; C: scaled quorum — P1, methodology-class). P8 action bundled into the same `/methodology` proposal. Priority-queue P0 item 4 updated from "write the research note" to "write the proposal". (index-architect third run.)
- **2026-11-26** — Track A proposal filed at [`proposals/2026-11-26-methodology-published-quote-self-classification.md`](../proposals/2026-11-26-methodology-published-quote-self-classification.md). The proposal bundles five gap-matrix rows into one PR against the hard-limit `/methodology` page: **P7** (self-classification as *published-quote benchmark*), **P8** (publication of the six-stage data-input hierarchy), **P12** (dry-run of the Committee change procedure via an inert docs-only `v1.0 → v1.0.1` version bump — zero numeric impact), **P14** (scope note: no Submitters, n/a), **P19** (scope note: not yet regulated, conditional-cooperation commitment). Priority-queue updated: P0 item 4 marked filed-awaiting-review; P1 items 7, 10, 12, 15 marked bundled-into-item-4. Next P0 candidate for the fifth-run session: P3/P5 conflict-of-interest disclosure + single-administrator declaration. (index-architect fourth run.)
