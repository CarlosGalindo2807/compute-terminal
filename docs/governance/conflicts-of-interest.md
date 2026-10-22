# Compute Terminal Index — Administrator Structure & Conflicts of Interest

| | |
|---|---|
| **Document class** | Governance policy — Index Committee adoption record |
| **Covers** | IOSCO FR07/13 Principle 3 (Conflicts of Interest) and Principle 5 (Internal Oversight); EU BMR Reg. (EU) 2016/1011 Art 4(2), 4(6), 5. |
| **Status** | **Draft for Committee adoption.** Not in force until merged. On merge, the version table at the bottom gains its first row and the policy is in force from that commit's date. |
| **Supersedes** | Nothing (first version). |
| **Reviewed every** | Quarter, alongside the IOSCO periodic benchmark review required by charter / Principle 10. |
| **Changes to this document** | Via PR review by the Index Committee. This is a non-hard-limit path (no `CODEOWNERS` auto-gate); the Committee still reviews each amendment on principle. |
| **Companion files** | [`docs/research/gaps/iosco-principles.md`](../research/gaps/iosco-principles.md) rows P3, P5; [`apps/web/app/methodology/page.tsx`](../../apps/web/app/methodology/page.tsx) (where a public excerpt will be surfaced via a separate hard-limit-page proposal after this policy is adopted). |

> **Primary-source note.** As in prior index-architect sessions, direct network access to `iosco.org`, `eur-lex.europa.eu`, `esma.europa.eu`, and `legislation.gov.uk` returns HTTP 403 from this environment's egress proxy. The regulatory language this policy references is drawn from search-engine excerpts of those sources (Principle 3 "identify, disclose, manage, mitigate or avoid"; Principle 5 "oversight function that is independent of the determination process") and from training knowledge of the regulations. A future session with unrestricted PDF egress should download FR07/13 (IOSCOPD415) and the consolidated Regulation (EU) 2016/1011 and reconcile any phrasing. The substance claims below — the four-prong COI test, the recusal procedure, and the compensating-controls argument for single-administrator operation — are structurally stable across these sources.

---

## 1. Administrator identity (IOSCO Principle 5 / EU BMR Art 4(6))

**The Administrator of the Compute Terminal Index is Carlos Galindo Dumitrescu**, operating as sole founding member of the Index Committee under the Committee charter published at `/methodology`.

### 1.1 Single-administrator declaration

The v1.0 benchmark is administered by a single natural person. The Committee is aware this is structurally weaker than the two-of-three or odd-numbered committees that MSCI, S&P Dow Jones Indices, FTSE Russell, and ICE Benchmark Administration operate. The decision to launch v1.0 under single-administrator governance is deliberate: the alternative — delaying v1.0 publication until a second voting member is recruited — would have left the benchmark unlaunched during a period of high market interest, with no compounding of real-time history (the asset the index needs most). The Committee treats single-administrator operation as a time-boxed state, not a terminal one. See §1.2 for the committed resolution timeline.

### 1.2 Second voting member — committed timeline

The Administrator commits to adding a second voting Committee member by **2027-05-12** (12 months after v1.0's locked-methodology effective date), subject to the integrity constraints below. "Second voting member" means a person who:

1. Is independent of the Administrator (not an employee, direct report, close family member, or holder of a material financial interest in the Administrator or in any provider the benchmark references).
2. Has reviewable technical or governance competence relevant to a quantitative benchmark (prior exchange/benchmark-administrator work, quantitative-research publication record, academic position in a related field, or demonstrable equivalent).
3. Executes the same conflict-of-interest disclosure required of the Administrator (§3), with the same recusal obligations.

If the Administrator has not recruited such a person by the committed date, the Committee **shall** either:
- Publish an extended timeline (not more than +6 months) on `/methodology` with reasoning and the specific blockers that justify extension, **or**
- Suspend new-licensee onboarding until the second member is seated (publication of the benchmark itself continues; only licensing commitments are frozen).

A silent slip past 2027-05-12 is a Committee failure and should be flagged in the next quarterly review minutes as such.

### 1.3 What single-administrator means operationally

While single-administrator operation is in force:

- Any decision formally labelled "Committee decision" (methodology changes, cessation triggers, change-notice approvals, this policy's amendments) is a decision of the sole administrator alone. The record of such a decision is nonetheless written in the first person plural ("the Committee resolved …") as a signal to future readers that the decision was taken under Committee authority and is binding on future Committees.
- The Administrator cannot "overrule" himself. Every Committee action is subject to the same written-record discipline the Committee charter requires once a second member is seated.
- The compensating controls in §4 below are what carry oversight weight in the absence of a second voting member.

## 2. Conflict-of-interest scope and definitions (IOSCO Principle 3)

A **conflict of interest** for the purposes of this policy means any circumstance in which the Administrator's financial, commercial, personal, or reputational interests could reasonably be understood to influence a Committee decision about the benchmark's methodology, universe, or published values. The four prongs the Committee tests against for each candidate conflict:

1. **Interest in a benchmark constituent** — ownership, employment, consulting, directorship, advisory role, or financial position (long or short, directly or via a related party) in any provider on CTI's eligible universe or on the provider-candidates list.
2. **Interest in a user of the benchmark** — the same, in any entity that has signed, is negotiating, or has expressed a licensable interest in a commercial relationship with CTI as a benchmark consumer.
3. **Interest in a market the benchmark influences** — the same, in any instrument whose price is affected by CTI, now or on a reasonable near-term projection (e.g. GPU-hour futures, compute-indexed debt, basis instruments).
4. **Interest in a decision the Committee is weighing** — gifts, hospitality, travel, speaking fees, side payments, or other inducements from or related to any party that stands to benefit from a specific Committee decision under consideration.

A **material** interest means one that a reasonable, informed third party could regard as potentially influencing the Administrator's judgment. The materiality threshold used for disclosure is:

- Any ownership stake, direct or beneficial, exceeding **US$5,000** in market value in a provider on the eligible universe or provider-candidates list.
- Any paid relationship (employment, consulting, advisory, speaking) with such a provider, regardless of amount.
- Any gift or hospitality item exceeding **US$250** in value from any party in categories (1)–(3) above, aggregated per party per calendar year.
- Any transactional relationship on CTI's own benchmark output (e.g. holding a position in a GPU-hour future indexed to CTI) above **US$10,000** notional.

Below these thresholds, interests are not required to be publicly disclosed. The Administrator still records them in the private register (§3.3) and the Committee reviews that register quarterly for pattern-level concerns.

## 3. The Administrator's current disclosure

> **To be completed by @CarlosGalindo2807 before this policy is adopted.** The four fields below are the only variables; the policy framework around them is complete.

### 3.1 Positive disclosure — provider relationships

For each eligible-universe provider (Vast.ai, RunPod, Lambda Labs, CoreWeave, AWS, GCP, Azure, and any entity added by Committee action) and each provider-candidate above the discovery threshold, the Administrator discloses:

- Does the Administrator **currently rent** compute from this provider for personal, research, or Compute Terminal operational purposes? If yes, name the provider and the approximate monthly spend band (<$100, $100–1,000, $1,000–10,000, >$10,000).
- Does the Administrator hold **any equity, debt, option, or token position** in this provider or its parent? If yes, name the provider and the approximate position value band (as per §2 materiality).
- Does the Administrator hold **any paid relationship** (employee, consultant, advisor, affiliate, revenue share) with this provider? If yes, name the provider and the nature of the relationship.

**Administrator's current declaration:**

> _[TO BE COMPLETED BY ADMINISTRATOR — do not merge this policy with the placeholder in place. If the honest answer is "none in any category", say so explicitly here. If any item is yes, name it. The declaration can be as short as one line ("None in any category as of 2026-__-__") or as long as needed to be truthful; brevity is not evidence of care, but neither is length. The question is "what would a serious reader need to know in order to trust the Committee's judgment on a methodology decision affecting the named provider?"]_

### 3.2 Positive disclosure — downstream relationships

- Does the Administrator have **any commercial, employment, or advisory relationship** with an actual or prospective licensee of the benchmark, with a party trading an instrument indexed to CTI, or with a party whose published research or product references CTI?
- Has the Administrator received **gifts, hospitality, speaking fees, travel, or similar inducements** above the §2 threshold in the trailing 12 months from any party in §2 prongs (1)–(3)?

**Administrator's current declaration:**

> _[TO BE COMPLETED BY ADMINISTRATOR — same discipline as §3.1. "None" is a valid and preferred answer where honest.]_

### 3.3 Non-public register

The Administrator maintains a private, dated register of all interests above the de-minimis level of US$500 (below the §2 public threshold) in a durable store under version control. The register is not published, but a hash of its current contents is published quarterly in the next Committee minutes under `docs/committee-minutes/` (dependency: gap matrix row P18, which creates that directory). The hash lets a future reviewer verify the register has not been retroactively edited.

Until the `committee-minutes/` directory exists, the Administrator maintains the register in a local vault; the hash-chain discipline begins on the first committee-minute entry.

## 4. Compensating controls (what oversight means while P5 is not fully satisfied)

The Committee acknowledges that a sole administrator cannot provide the "oversight function independent of the determination process" that IOSCO Principle 5 contemplates for a mature benchmark. Until a second voting member is seated per §1.2, the following five controls carry the oversight weight:

1. **Methodology lock in code.** `packages/shared/src/methodology.ts` exports `PUBLISHED_METHODOLOGY` as a frozen constant; `apps/workers/src/functions/methodology.test.ts` asserts its fields on every CI run; `.github/CODEOWNERS` requires @CarlosGalindo2807's review before any PR can modify either file. The Administrator cannot silently drift the published methodology without visibly editing both the constant and the lock test — a change signal visible to any downstream reviewer in the Git history.
2. **30-day public-notice procedure.** The Committee charter published on `/methodology` requires 30 calendar days of public notice before any methodology change takes effect. During that window any observer (licensee, auditor, counter-party, member of the public) can raise an objection, which the Administrator must address in writing before the change effects.
3. **Open-source, reproducible computation.** The entire index-calculator pipeline (`apps/workers/src/functions/index-calculator.ts`), the outlier filter (`outlier-detector.ts`), the formula definitions (`methodology.ts`), and the full snapshot history are published on GitHub under permissive terms. Any observer can independently recompute every published daily value from the raw inputs and compare to `index_values_daily`. Any discrepancy is a public, verifiable error.
4. **Immutable audit trail.** `methodology_versions`, `methodology_changes`, `system_events`, and the `is_outlier` / `provider_reliability_score` columns on `price_snapshots` are all permanent and version-stamped; `system_events` is RLS-locked to service-role writes only (migration `010_rls_hardening.sql`). The Administrator cannot retroactively alter a historical published value without leaving an auditable trace.
5. **Committee-minutes discipline.** Every formal Committee decision — this policy's adoption, each future amendment, each methodology-version decision, each cessation decision — is recorded as a commit to `docs/committee-minutes/<YYYY-MM-DD>-<slug>.md` with the Administrator's commit signature. The record cannot be edited without producing a new commit, visible to any observer with access to the Git history. (This directory is still to be created; gap matrix row P18 tracks it. Until it exists, Committee decisions are recorded in the `methodology_versions.rationale` and `methodology_changes.reason` database columns and in the merged-PR descriptions, all of which carry the same immutability property.)

The Committee commits to re-evaluating this list quarterly. If a sixth or seventh control becomes practical — for example, an external pre-publication reviewer who reads each proposed methodology change — it will be added here with a new revision log entry.

## 5. Recusal procedure

Where a Committee decision is reasonably affected by a disclosed interest from §3, the Administrator **recuses** from the decision. Operationally, until a second voting member is seated:

- The decision is deferred to the next quarterly Committee review, at which point either (a) the second member is seated and takes the decision alone, (b) an external pre-publication reviewer is engaged ad-hoc for this decision, or (c) the Administrator publishes a written explanation on `/methodology` of why the decision cannot be deferred and takes it with full written reasoning, including the conflict and the reason the alternative paths were unavailable.
- Option (c) is a last resort and triggers a re-review in the following quarter. More than one option (c) decision per calendar year is a signal that the single-administrator state is no longer tenable and the §1.2 timeline should be accelerated.

Where an **external party** reasonably alleges a conflict the Administrator did not self-disclose, the Administrator shall:
1. Acknowledge the allegation in writing within 72 hours of receipt, on `/methodology` or via the complaints channel (gap matrix row P16, pending).
2. Investigate within 30 days and either amend §3 to disclose the matter and apply the recusal procedure retroactively to any affected decision, **or** publish a written finding on `/methodology` explaining why the alleged interest does not meet the §2 materiality test.
3. If the finding is that no conflict exists, the complainant retains the right to escalate to the complaints procedure (P16) once that channel is live.

## 6. Review cadence

This policy is reviewed:
- **Each quarter**, alongside the IOSCO Principle 10 periodic benchmark review the Committee charter already schedules. The quarterly review verifies §3 is still accurate and that the §4 compensating controls remain in force.
- **Immediately upon** any of: a change in the Administrator's provider relationships, a change in CTI's eligible universe that creates a new potential conflict, a change in the Administrator's downstream engagements, or the seating of a second voting member.
- **No later than** 2027-05-12 — the §1.2 committed date — at which point either the second-member transition is in force and this policy is re-adopted by the two-member Committee, or the §1.2 extension-or-suspension clause triggers.

## 7. Amendment procedure

Amendments to this document are:
- Drafted as a PR against `docs/governance/conflicts-of-interest.md`.
- Reviewed by the Index Committee as a governance decision (not a methodology change — the 30-day public-notice period does not apply unless the amendment materially expands the Administrator's permitted conflicts).
- Merged with a signed commit from the Administrator; on merge, the revision log at §8 gains an entry.

A **material** amendment (one that would allow the Administrator a conflict previously prohibited, raise a materiality threshold by more than 50%, or extend the §1.2 deadline by more than 6 months) requires a 30-day public-notice window on the forthcoming notice page (gap matrix row B8 / P8-adjacent). Non-material amendments (typo fixes, cross-reference updates, clarifying rewrites that do not change substance) merge on normal PR review.

## 8. Revision log

| Date | Author | Change |
|---|---|---|
| _TBD on merge_ | Carlos Galindo Dumitrescu (sole founding Administrator) | **v1 — Initial adoption.** Establishes administrator identity, §1.2 2027-05-12 committed-second-member date, §2 four-prong materiality test with US$5,000 / US$250 / US$10,000 thresholds, §3 current disclosure (completed before merge), §4 five-control oversight substitute, §5 recusal procedure, §6 quarterly review cadence, §7 amendment procedure. |

---

*Policy source lives at `docs/governance/conflicts-of-interest.md`. A public excerpt (likely §1.1, §1.2 committed date, §2 four-prong framework, and the current §3 declaration) will be surfaced on `/methodology` via a separate proposal under `docs/research/proposals/`, following the hard-limit-page-edit procedure.*
