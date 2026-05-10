# Proposal: <one-line title>

| | |
|---|---|
| **Date** | YYYY-MM-DD |
| **Author** | index-architect (or human name) |
| **Risk class** | methodology / infrastructure / governance / docs |
| **Target file(s)** | e.g. `packages/shared/src/methodology.ts`, `docs/methodology` |
| **Required reviewer(s)** | @CarlosGalindo2807 (always for methodology) — additional Committee members listed by name |
| **Effective date if approved** | YYYY-MM-DD (≥ 30 days after merge for methodology changes per Committee charter) |
| **References** | IOSCO Principle <N>, MSCI Methodology Section <N>, EU BMR Article <N>, primary URL(s) |

## Problem

What's broken or missing? Cite the specific gap from `docs/research/gaps/<file>.md`
or, if no gap doc exists yet, describe the gap in 1–2 paragraphs and propose
adding it to `gaps/`.

## Proposed change

What exactly changes. If a methodology change: include the *new* values of every
affected constant, the *old* values, and the diff in plain English. If an
infrastructure change: include the file paths, the new/changed signatures, and
which existing tests guard the change.

## Why this is the right shape (vs. alternatives)

What other shapes did you consider? Why did you pick this one? An MSCI methodology
revision committee would want to see at least two alternatives weighed against the
chosen design.

## Empirical impact

For methodology changes — REQUIRED:

- Backtest of the *new* methodology against the last 90 (or as many as exist) days
  of `price_snapshots`. Show the daily VWAP series under old vs. new side by side.
- Sensitivity analysis: how does the new value move under ±10% of the parameter
  you're changing?
- False-positive / false-negative rate on outlier filter changes.
- Coverage impact: how many provider-days are affected?

For infrastructure / governance / docs — describe the empirical signal that says
"this works" or "this doesn't change anything that shouldn't change".

## Risks

What could go wrong if this ships. Include both immediate risks (test failures,
data corruption) and second-order risks (reduces auditor trust, breaks downstream
licensee assumptions, narrows the legal defensibility of the v1.0 lock).

## Migration / rollout plan

For methodology changes — REQUIRED:

- The 30-day public-notice period starts on \<merge date>.
- The new value first appears in `index_values_daily` rows dated \<effective date>.
- Historical values are NOT recomputed (audit principle: published numbers are immutable).
- A new row is added to `methodology_versions` with a new semver bump.
- The Index Committee charter on `/methodology` is updated to list the change in version history.

For infrastructure changes — list the deploy steps, rollback steps, and what to
monitor in `system_events` after the merge.

## Committee deliberation prompt (methodology only)

A short paragraph the Index Committee can paste into their decision record. Frames
the trade-off in plain English so the decision is documented as a deliberate
choice, not a rubber-stamp. Example:

> "We are accepting an X% increase in mean composite VWAP volatility in exchange
> for a Y% reduction in outlier-induced spikes during scraper outages. The
> trade-off favors stability for licensees over responsiveness during partial
> data loss. Voted: <yes/no>, Carlos Galindo Dumitrescu, on YYYY-MM-DD."

## Closing

After this proposal is approved (PR merged): mark the relevant `gaps/<file>.md`
row as resolved, update `docs/decisions.md` with the new locked-in decision and
its rationale, and link the merged PR in this proposal's footer.

---

*This template lives at `docs/research/proposals/_TEMPLATE.md`. Copy it to a new
date-stamped file, fill in every section, and open a PR. Sections marked REQUIRED
are non-negotiable for methodology changes — the Committee will not consider a
proposal that omits them.*
