# The P7/P8 proposal pile-up — a routine-drift diagnosis

**Date:** 2026-09-21
**Author:** index-architect (weekly scheduled run)
**Topic:** Since 2026-05-14 the index-architect routine has drafted the same
IOSCO P7 + P8 `/methodology` self-classification proposal 30+ times, each on a
fresh branch, each opened as a fresh PR against `main`. None has merged. `main`
is unchanged since 2026-05-12. This note diagnoses why, quantifies the drift,
and proposes concrete fixes — routine-level and repository-level — so the next
session does not silently add PR #39.
**Companion files:** [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md)
(row P0 item 4 updated in the same PR as this note); [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](2026-05-12-listings-vs-transactions-iosco-p7.md)
(the analytic foundation every duplicate proposal cites).

---

## 1. What is on the remote

`git ls-remote --heads origin` on 2026-09-21 shows **37 branches** matching
`index-architect/*`, spanning 2026-05-14 → 2026-09-17. Of the 37:

- **30 open PRs** on GitHub (PR numbers roughly #8–#38, contiguous within
  index-architect authorship).
- **0 merged.** `main` sits at `1e55085`, dated 2026-05-12, authored by
  Carlos Galindo Dumitrescu (the `markets: data-sufficiency gate on Δ column
  (IOSCO P7)` commit).
- **All but 2** of the branches touch `docs/research/proposals/` with a new
  file whose slug is a variant of `p7-p8`, `published-quote-self-classification`,
  `methodology-data-hierarchy`, `input-classification`, or synonyms. Sampled
  diffs (PR #24 at 2026-08-03, PR #33 at 2026-09-03, PR #37 at 2026-09-14, PR
  #38 at 2026-09-17) confirm the proposals are substantively identical:
  - Same target file: `apps/web/app/methodology/page.tsx` (hard-limit).
  - Same argument: self-classify CTI as a "published-quote benchmark"; publish
    the deterministic 7- or 8-stage ingestion hierarchy on `/methodology`.
  - Same regulatory footing: IOSCO FR07/13 P7 + P8, EU BMR Art. 11(1)(c) +
    11(3)(d).
  - Same comparables: LBMA / Baltic Exchange / oil PRAs / MSCI IOSCO statement.
  - Same source-fetch caveat: egress to `iosco.org`, `eur-lex.europa.eu`,
    `esma.europa.eu`, `msci.com` blocked in the routine's sandbox.
  - Same reviewer ask: @CarlosGalindo2807 to (a) approve as-is or with
    wording revisions, and (b) rule on whether this counts as an
    "administrative amendment" (7-day notice) or a full methodology change
    (30-day notice).
- The 2 exceptions:
  - `index-architect/2026-09-10-gitignore-tsbuildinfo` (PR #36): a genuine
    small unrelated fix (add `*.tsbuildinfo` to `.gitignore`). Still open,
    unreviewed.
  - `index-architect/2026-06-29-p7-p8-v1-0-1-disclosure-proposal`: a Path-B
    variant that mints `v1.0.1` in `PUBLISHED_METHODOLOGY_VERSION`. Still
    open, unreviewed.

No `@CarlosGalindo2807` review, comment or reaction is recorded on any of the
30 open PRs — verified by `mcp__github__pull_request_read (get_reviews,
get_comments)` on PR #38, and consistent with `mergeable_state: blocked` on
every one (CODEOWNERS requires human review before merge). The only human-side
signal is that PR #38's Vercel deployment check errored, and a prior session
(2026-09-17) itself posted the "standing-down, need you to check the Vercel
dashboard" comment. The Vercel error appears identically on every recent PR
regardless of diff scope — consistent with a base-branch regression rather
than a per-PR issue.

## 2. Why the loop happens

Each of these components is fine in isolation. Their composition is the drift.

1. **Every session reads main, not the remote.** The charter's "resume
   context" checklist has the session read `docs/research/gaps/`,
   `docs/research/notes/`, `docs/research/proposals/`, `docs/roadmap.md`, and
   the most-recent commit on `main`. `main` is frozen at 2026-05-12, so every
   session sees a state in which:
   - The 2026-05-12 note recommends "the single next deliverable" is a
     Track-A proposal editing `/methodology`.
   - The gap matrix's rolling priority queue lists that proposal as P0
     item 4, action: "write the proposal".
   - No proposal file exists in `docs/research/proposals/` yet (only
     `_TEMPLATE.md`).
   The routine correctly identifies "P0 item 4, undone" as the highest-value
   task on its plate — because on the branch it can see, that is the truth.
2. **The routine has no memory across sessions.** It cannot see the 30 open
   PRs unless it explicitly lists them. The charter's checklist does not
   include "list open index-architect PRs" (fixable — see §4).
3. **The gap matrix's P0 item 4 has ossified as a redraft trigger.** Each
   session's own PR updates the local branch's copy of the matrix to say
   "proposal drafted, awaiting review", but that update never lands on main.
   The main copy still says "next step is the proposal-format doc". The item
   is *self-perpetuating*: it will keep firing until it is closed on main.
4. **The proposal targets a hard-limit surface, which correctly blocks the
   routine from self-merging.** That gate is doing its job. The failure is
   upstream: the routine keeps proposing rather than either (a) recognising
   the pile-up or (b) picking a different, non-hard-limit deliverable.
5. **The user is not on the routine's notification loop for these PRs.** The
   sessions push to GitHub, close their transcript, and disappear. Nothing
   pings a phone or an inbox. From the owner's vantage, PRs #24–#38 look like
   ordinary background noise; from the routine's vantage, each session's work
   ended in a well-formed PR and is therefore "done".

## 3. What the drift has cost

- **~30 PRs of duplicate work, roughly weekly for four months.** Each
  proposal is 200–345 lines of Markdown; total drafted content is well past
  6,000 lines with a distinct-content fraction that is very close to zero.
- **Repository entropy.** 37 stale index-architect branches. Any human trying
  to understand "what work is open?" from `git branch --list` gets a
  misleading answer.
- **Attention debt for the owner.** 30 open PRs, each with an ask ending in
  "@CarlosGalindo2807 …". Batch-triaging them is expensive precisely because
  each looks almost, but not quite, like the previous one.
- **The gap matrix has drifted out of date.** The 2026-05-12 revision-log
  entry is still the last one on main. The matrix says "next step: write the
  proposal"; the actual state is "the proposal has been written 30 times and
  awaits your review."
- **Real P0/P1 items have been starved.** In the same four months, no session
  has produced the P0 P3/P5 COI + single-administrator disclosure (item 1);
  no P16 complaints-procedure disclosure (item 3); no P2 third-party
  dependency map (item 5); no P4 control-framework document (item 6); no
  quarterly-review template (item 9, which was due for its first use on
  2026-07-29 and has now slipped ~54 days).

## 4. Concrete fixes

Grouped by owner and cost.

### 4a. Zero-cost, this session, this PR

- **Add a STOP-annotation to gap-matrix P0 item 4** naming the 30 open PRs,
  linking to the newest (#38) as the canonical instance, and instructing the
  next routine session: *do not draft another P7/P8 proposal. Pick a
  different item from the P0/P1 queue.*
- **Revision-log entry for 2026-09-21** recording the pile-up and pointing
  at this note.
- **This note itself**, so future sessions see the diagnosis when they read
  `docs/research/notes/` in reverse-chronological order.

### 4b. Charter-level, next time the human edits `.claude/agents/index-architect.md`

- **Add a resume-context step: "list open `index-architect/*` PRs on the
  remote before starting."** One `mcp__github__list_pull_requests` call gates
  the whole failure mode. If any P0 item's proposal already exists as an
  open PR, the session must either (a) not redraft it, or (b) push a
  substantive change to the existing branch, not open a new one.
- **Add a rule: "if the top P0 queue item is 'write a proposal for X' and an
  open PR authored by index-architect already exists for X, treat that item
  as 'awaiting Committee review, not actionable this session' and move to
  the next item."** This is the invariant the current drift violates.
- **Add a rule for pileup detection: "if ≥ 2 open PRs by index-architect
  target the same file(s) or same gap-matrix rows, that is a signal to
  write a diagnosis note and PushNotification the owner, not to open a
  third."** This session is the first to run under such a rule; adopting
  it in the charter makes the behavior sticky.

### 4c. Owner-level, requires @CarlosGalindo2807

- **Close 29 of the 30 duplicate PRs, keeping the newest (#38) as canonical
  to review or reject.** Bulk `gh pr close` acceptable; each closed PR
  automatically leaves a link back to #38 as "superseded". The routine will
  not do this unilaterally — closing a PR is destructive to its author's
  work, and while each of these was authored *by* index-architect, they
  represent hours of Claude Code compute the owner paid for and should
  decide the fate of.
- **Actually review #38, or explicitly reject it.** Either outcome closes
  P0 item 4 on main and unblocks the queue. The proposal itself is sound
  (30 versions of it converge on the same substance for a reason); the
  question is whether the owner wants to (a) approve as an "administrative
  amendment" and land the follow-up page edit, (b) reject with reasoning,
  or (c) re-scope. All three unblock the loop.
- **Investigate the Vercel deployment error on main.** The 2026-09-17
  session established that the Vercel build fails identically on multiple
  independent PRs, none of which touch `apps/web/`, and that the same error
  is present pre-any-index-architect-PR. This is almost certainly a
  base-branch regression (candidates: BOM-contaminated env var, framework
  version drift, deleted-project on Vercel side). While it stays red, every
  index-architect PR will look "blocked" from CI, further hiding the
  substantive review question. Fix belongs on `main`, not on any PR.

## 5. What this session shipped instead of PR #39

Rather than draft the 31st P7 + P8 proposal, this session:

1. **Wrote this diagnosis note** (`docs/research/notes/2026-09-21-p7-p8-proposal-pileup-and-routine-drift.md`).
2. **Updated the gap matrix's P0 item 4** with a STOP-annotation pointing
   at #38 and this note. The revision log gains a 2026-09-21 entry.
3. **Notified @CarlosGalindo2807** via PushNotification with the concrete
   state and a single specific ask: review-or-reject #38 to unblock the
   loop.

No hard-limit file is touched. No proposal is added. No existing PR is
closed. The routine's default of "produce ONE research note OR gap-analysis
update OR proposal — whichever is most under-supplied" applies straight-
forwardly: the most under-supplied artifact right now is a note that
*reduces future drafting*, not another draft.

## 6. What the next session should do

Read this note first. If PR #38 is still open on main-day-N:

- **Do not draft another P7/P8 proposal.** The 30 existing ones exhaust the
  design space; a 31st adds noise, not signal.
- **Pick P0 item 1, 2, 3, 5, or 6 from the priority queue.** All are docs
  or governance work on non-hard-limit surfaces and are genuinely
  under-supplied:
  - P3 / P5 — one-page COI + single-administrator disclosure. Add it to
    `docs/` (not to `/methodology`, since that page is hard-limit) as
    `docs/governance/conflicts-of-interest.md`, and open a docs-only PR.
  - P1 / Roadmap B7 — a single-line PR that changes the seed for
    `methodology_versions.approved_by`. Requires no methodology change; the
    string that ships in `apps/workers/src/functions/index-calculator.ts`
    or wherever it is written is not the `PUBLISHED_METHODOLOGY` constant
    and is not a hard-limit surface. Verify first before committing.
  - P2 — `docs/research/notes/<date>-third-party-map.md`. 2–3 hours of
    read-and-write against the Inngest / Supabase / Vercel / Brave / Vast /
    RunPod / Lambda surface.
  - P4 — `docs/control-framework.md` mapping each control (outlier
    detector, reliability decay, methodology-lock test, Zod schemas,
    CODEOWNERS, RLS, SSRF hardening) to the IOSCO principle it addresses.
  - P10 — `docs/research/reviews/_TEMPLATE.md` for the quarterly-review
    format, ~55 days overdue.
- **If PR #38 has been merged or closed:** re-read the gap matrix on main
  and pick the newly-highest P0 item.
- **In either case, run `mcp__github__list_pull_requests` with
  `head=index-architect/` before drafting anything new.** That single call
  would have prevented the drift.

## 7. Sources

Verified this session:

- `git ls-remote --heads origin` (2026-09-21) — 37 `index-architect/*`
  branch refs.
- `mcp__github__list_pull_requests(state=all, sort=created, direction=desc)`
  for `CarlosGalindo2807/compute-terminal` — 30 open PRs authored by
  `CarlosGalindo2807` under this routine (index-architect signature),
  spanning PR #8 (~2026-05-14) through PR #38 (2026-09-17). Note: the
  routine posts PRs under the `@CarlosGalindo2807` account because that is
  the account the sandbox is authenticated as; the `index-architect:` title
  prefix is the disambiguator.
- `mcp__github__pull_request_read(#38, method=get)` — mergeable_state
  `blocked`; body is a duplicate of the substance in this session's
  research-note archive.
- `mcp__github__pull_request_read(#38, method=get_reviews)` — empty (`[]`).
- `mcp__github__pull_request_read(#38, method=get_comments)` — one vercel
  bot deployment comment (Error), one routine-authored standing-down
  diagnostic from 2026-09-17. No owner-side interaction.
- Diff samples across PR #37 (2026-09-14), #33 (2026-09-03), #24
  (2026-08-03) — proposal bodies substantively identical modulo prose
  polish and section-order variations.

Internal references:

- [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md) —
  gap matrix; P0 item 4 is the ossified redraft trigger.
- [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](2026-05-10-iosco-principles-applied-to-cti.md) — first-run IOSCO map.
- [`docs/research/notes/2026-05-12-listings-vs-transactions-iosco-p7.md`](2026-05-12-listings-vs-transactions-iosco-p7.md) — the analytic foundation every duplicate proposal cites.
- [`.claude/agents/index-architect.md`](../../../.claude/agents/index-architect.md) — routine charter; the natural home for the resume-context fix in §4b.
- `main` @ `1e55085` (2026-05-12) — the frozen state every session reads.
