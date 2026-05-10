# Research

This is where the **Index Architect** agent (and humans, when they want to)
deposit work that informs how Compute Index Terminal evolves toward an
auditor-citable, fund-licensable, IOSCO-compliant reference index.

The agent's full charter, hard limits, and operating rules live in
`.claude/agents/index-architect.md`. Read that first if you want to
understand what the agent will and won't do.

## Layout

```
docs/research/
├── README.md            ← this file
├── notes/               ← deep dives into how others do it
│                          (MSCI, S&P, FTSE Russell, IOSCO, EU BMR)
│                          dated, never-modified-after-write
├── gaps/                ← running comparison matrices
│                          living documents, updated in place
└── proposals/           ← specific, actionable change requests
                           dated, follow proposals/_TEMPLATE.md
```

## What lives here

- **`notes/`** — primary-source research. "How does MSCI rebalance constituents?" "What does IOSCO Principle 6 actually require of administrators?" "How does S&P handle a corporate spin-off?" One question per note, with citations. **Notes are knowledge ingest, not action items.**

- **`gaps/`** — comparison matrices that translate notes into "where are we vs. where they are". One file per topic (e.g. `gaps/governance.md`, `gaps/data-integrity.md`, `gaps/audit-readiness.md`). Updated as our state changes. **Gaps are the agent's backlog of work.**

- **`proposals/`** — specific recommendations to act. Each proposal has a target (a file, a process, a doc), a risk class (methodology / infrastructure / docs), and identifies the reviewer required. **Proposals are what trigger PR conversations.**

## What does NOT live here

- Implementation code. If a proposal becomes code, the code goes in `apps/` or `packages/`. Proposals reference the PR that closed them.
- Personal opinions or speculation untethered from sources. The bar is "if an auditor reviewed this, would they consider it serious?".
- Anything covered by `docs/decisions.md` (technical calls already locked in) or `docs/roadmap.md` (forward-looking punch list).

## Why this is separate from `docs/decisions.md` and `docs/roadmap.md`

| File | Purpose | Tone |
|------|---------|------|
| `docs/roadmap.md` | Open work items, ordered by impact ÷ effort | Tactical, internal |
| `docs/decisions.md` | Locked-in non-obvious technical calls + why | Historical, authoritative |
| `docs/research/notes/` | How world-class indices actually work | Encyclopedic, sourced |
| `docs/research/gaps/` | Where we fall short, where we don't | Diagnostic, evolving |
| `docs/research/proposals/` | Specific changes the agent or humans propose | Actionable, time-stamped |

Think of `docs/research/` as the dossier a regulator's external counsel would build before recommending whether to license our index. It exists so the answer is short.
