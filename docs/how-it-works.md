# How Compute Terminal Works

A plain-English walk-through of what this project actually does, who does
what (humans, scrapers, AI agents), and why we built it the way we did.
No jargon, no code. Read top to bottom in 5 minutes.

---

## In one sentence

Compute Terminal is a Bloomberg-style price tracker for renting GPU
computing power, and we're building it to become the world's reference
benchmark for the price of compute — the same way MSCI is the reference
for stocks.

---

## The big picture

```
                  ┌────────────────────────────────────────┐
                  │      THE WORLD                         │
                  │  Hundreds of GPU rental marketplaces   │
                  │  (Vast.ai, RunPod, Lambda, AWS, ...)   │
                  └────────────┬───────────────────────────┘
                               │
                               │  prices change every minute
                               ▼
              ┌────────────────────────────────────┐
              │   1. SCRAPERS (every 5 min)        │
              │   ──────────────────────────       │
              │   Visit each marketplace,          │
              │   read prices, save to database.   │
              └────────────┬───────────────────────┘
                           │
                           ▼
              ┌────────────────────────────────────┐
              │   2. DATABASE                      │
              │   ──────────────────────────       │
              │   Every price ever seen, with a    │
              │   timestamp. ~10,000 new rows/day. │
              └────────────┬───────────────────────┘
                           │
                           ▼
              ┌────────────────────────────────────┐
              │   3. THE INDEX (daily at 00:30 UTC)│
              │   ──────────────────────────       │
              │   A formula reads the day's prices │
              │   and produces ONE number per GPU  │
              │   model. That number is the index. │
              └────────────┬───────────────────────┘
                           │
                           ▼
              ┌────────────────────────────────────┐
              │   4. THE WEBSITE                   │
              │   ──────────────────────────       │
              │   computeterminal.io               │
              │   Shows the index, charts,         │
              │   provider breakdown, history.     │
              └────────────────────────────────────┘
```

That's the day-to-day data flow. It runs 24/7 without anyone touching it.

---

## Why "the index" matters

A single GPU rental price isn't useful — different marketplaces, regions,
and providers all charge different amounts at different times. **The
index is one trustworthy number** that summarizes the whole market.

```
Vast.ai      H100 → $2.10/h    ┐
RunPod       H100 → $2.49/h    │
Lambda       H100 → $2.99/h    ├──► INDEX → $2.41/h
Together     H100 → $2.80/h    │
Hyperbolic   H100 → $1.95/h    ┘    (one trustworthy number)
```

The formula that turns the left side into the right side is called
**the methodology**. It looks like this:

> "Take all H100 prices from the last 24 hours. Throw out the obvious
> outliers. Weight each price by how many GPUs that listing offered. Take
> the average. That's the index."

(Slightly more math than that, but you get the idea.)

---

## Why the methodology is locked

If we changed the formula whenever we felt like it, nobody could trust
the index. Imagine if the kilogram weighed something different each year.

So **the formula is locked** in code as version 1.0. Changing it requires:

```
       ┌────────────────────────────────────────┐
       │  Index Committee (humans)              │
       │  ──────────────────────                │
       │  1. Researches a proposed change       │
       │  2. Publishes a 30-day public notice   │
       │  3. Votes on the change                │
       │  4. The change becomes effective       │
       │     30 days after the notice           │
       └────────────────────────────────────────┘
```

This is the same process MSCI, S&P, and FTSE Russell use for their
indices. It's slow on purpose — the slowness IS the value. Customers
who license the index are paying for "you won't surprise me".

---

## The two improvement loops

The project gets better over time through two independent loops. They
work in parallel and never cross — that's important.

### Loop A — automatic, no human needed

```
   Scraper finds a new GPU model name we don't recognize ("H100 NVL 94GB")
              │
              ▼
   AI looks it up, decides if it's a real GPU, suggests a match
              │
              ▼
   System remembers: "next time we see 'H100 NVL 94GB', it means H100."
              │
              ▼
   Next scrape, the same string is recognized instantly.
```

No human approval needed because this loop is invisible to the index.
It only changes how we *recognize* GPUs, not how we *price* them.

### Loop B — human approval required

```
   Index Architect agent (every Monday)
              │
              ▼
   Reads MSCI methodology PDFs, IOSCO compliance docs, etc.
              │
              ▼
   Writes a research note OR proposal in docs/research/
              │
              ▼
   Opens a Pull Request asking Carlos to review
              │
              ▼
   Carlos reads it, approves or rejects
              │
        ┌─────┴─────┐
   approve        reject
        │             │
        ▼             ▼
   Merged        Comments stay in the repo;
   into main     next week's run reads them
   (becomes      and adjusts.
   permanent
   reference)
```

This loop is how the project's intellectual rigor improves over time
— more research, better governance docs, better audit trails — without
ever bypassing the human decision on methodology.

---

## Who does what — the actor map

```
   ┌─────────────────────────────────────────────────────────────────┐
   │                                                                 │
   │   AUTONOMOUS (no human in the loop)                             │
   │   ──────────────────────────────                                │
   │   • Scrapers (every 5 min)                                      │
   │   • Outlier detection (every 15 min)                            │
   │   • GPU name normalization (Loop A above)                       │
   │   • Daily index calculation (00:30 UTC)                         │
   │   • System health metrics                                       │
   │                                                                 │
   ├─────────────────────────────────────────────────────────────────┤
   │                                                                 │
   │   AUTONOMOUS, BUT QUEUE A HUMAN DECISION                        │
   │   ────────────────────────────────────                          │
   │   • Provider discovery (proposes new marketplaces)              │
   │   • Daily content drafts (Twitter, LinkedIn, brief)             │
   │   • Index Architect agent (proposes everything in Loop B)       │
   │                                                                 │
   ├─────────────────────────────────────────────────────────────────┤
   │                                                                 │
   │   ALWAYS REQUIRES A HUMAN                                       │
   │   ───────────────────────                                       │
   │   • Methodology changes (Index Committee, 30-day notice)        │
   │   • Onboarding a newly-discovered provider as a real scraper    │
   │   • Approving a content draft to publish                        │
   │   • Merging anything that touches the index calculation         │
   │                                                                 │
   └─────────────────────────────────────────────────────────────────┘
```

---

## Why this design is the point, not the plumbing

A simpler version of this project would be: scrape prices, dump them on
a website, call it done. That works for a hobby site.

The version we built has three properties that turn it into a
**licensable benchmark**:

```
   ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
   │  Reproducible       │    │  Governed           │    │  Open               │
   │  ──────────         │    │  ────────           │    │  ────               │
   │  Anyone can take    │    │  The formula        │    │  The code is        │
   │  the published      │    │  changes only       │    │  public on GitHub.  │
   │  formula and the    │    │  via a documented   │    │  Anyone can audit   │
   │  raw price data     │    │  committee process  │    │  exactly how the    │
   │  and re-derive the  │    │  with public        │    │  index is computed. │
   │  same index value.  │    │  notice.            │    │                     │
   └─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

These three properties together are what makes a financial benchmark
licensable to a regulated entity — a fund, an exchange, a derivatives
contract. Any of them missing and the index is just a website.

---

## The Index Architect agent — what is it really?

The Index Architect is an AI agent that runs in the cloud once a week.
Its job is to push the project closer to MSCI-grade rigor by doing
research humans don't have time for.

```
       Every Monday 06:00 UTC
                │
                ▼
   ┌────────────────────────────────────────────┐
   │ Wakes up in Anthropic's cloud              │
   │                                            │
   │ Reads the project's "charter" file —       │
   │ the document that tells it what it can     │
   │ and can't do.                              │
   │                                            │
   │ Reads everything in docs/research/         │
   │ to know what's already been studied.       │
   │                                            │
   │ Decides on ONE focused piece of work       │
   │ for this week.                             │
   │                                            │
   │ Searches the web for primary sources       │
   │ (MSCI methodology PDFs, IOSCO principles,  │
   │ EU regulatory texts).                      │
   │                                            │
   │ Writes a markdown file with what it        │
   │ found and what we should consider.         │
   │                                            │
   │ Opens a Pull Request asking Carlos to      │
   │ review.                                    │
   │                                            │
   │ Goes back to sleep.                        │
   └────────────────────────────────────────────┘
                │
                ▼
   The PR sits in GitHub until Carlos reviews it.
   If approved, the markdown becomes part of the
   project's permanent dossier. If rejected, the
   comments Carlos leaves stay in the repo and
   the agent reads them next week.
```

**What the agent CAN do without asking:**
- Read everything in the repo
- Search the web
- Write new documentation
- Add tests
- Build new monitoring or compliance tooling
- Open PRs for any of the above

**What the agent CANNOT do, ever:**
- Push directly to the main branch
- Approve or merge its own PRs
- Change the index formula (the locked methodology)
- Touch the database directly
- Access any production secrets or environment variables

These limits are enforced in three layers:

```
   Layer 1 (soft) — the charter file tells the agent the rules
   Layer 2 (hard) — GitHub branch protection blocks unauthorized merges
   Layer 3 (hard) — CODEOWNERS file routes methodology files to Carlos
                    automatically, refusing merge until he approves
```

Even if the agent ignored its charter (it doesn't — it's been told to
respect it), Layers 2 and 3 still hold. The agent has no way to merge
anything to main on its own.

---

## What does Carlos actually do?

Roughly:

```
   ┌──────────────────────────────────────────────────┐
   │ Day-to-day                                       │
   │ ──────────                                       │
   │ • Watch the dashboard for unusual prices         │
   │ • Review daily content drafts (5 min)            │
   │ • Approve or reject new providers found by       │
   │   the discovery agent (a few times per month)    │
   ├──────────────────────────────────────────────────┤
   │ Weekly                                           │
   │ ──────                                           │
   │ • Review the Index Architect's PR (15-30 min)    │
   │ • Either merge it or leave a comment for next    │
   │   week's run                                     │
   ├──────────────────────────────────────────────────┤
   │ Quarterly                                        │
   │ ─────────                                        │
   │ • Convene the Index Committee to consider any    │
   │   accumulated methodology proposals              │
   │ • Decide which (if any) to put on a 30-day       │
   │   public notice                                  │
   ├──────────────────────────────────────────────────┤
   │ As-needed                                        │
   │ ─────────                                        │
   │ • Talk to potential institutional consumers      │
   │   (funds, exchanges) about licensing             │
   └──────────────────────────────────────────────────┘
```

Everything else runs itself.

---

## Where this is going

```
         Today                          Goal
         ─────                          ────

   ┌────────────────┐            ┌──────────────────────┐
   │ Live website   │            │ Licensed benchmark   │
   │ with index     │            │ used in derivatives  │
   │ values, locked │     ──►    │ contracts, fund      │
   │ methodology,   │            │ pricing, and         │
   │ public         │            │ regulated reporting. │
   │ governance     │            │                      │
   └────────────────┘            └──────────────────────┘

   We have:                       To get there we need:
   • The formula                  • 30+ days of clean
   • The lock                       data history
   • The committee process        • IOSCO compliance
   • Public + open code             paperwork
   • Auto-improving research      • Audit-ready
                                    documentation
                                  • Licensee API
                                  • Conversations with
                                    institutional buyers
```

The Index Architect agent is the engine that produces the middle column
— the IOSCO compliance work, the audit documentation, the governance
hardening. It works on it every week so we don't have to think about
it manually.

---

## TL;DR

- **Scrapers** read prices from GPU marketplaces every 5 minutes.
- **The index** is one trustworthy number computed daily from all those
  prices using a locked formula.
- **The locked formula** can only change via a human committee with 30
  days of public notice — same as MSCI / S&P / FTSE.
- **Two improvement loops** run in parallel: an automatic one for
  recognizing GPU names, and a human-gated one for everything that
  touches the index or governance.
- **The Index Architect agent** does research and proposal work every
  Monday, pushes Pull Requests for Carlos to review. It has no power to
  merge anything by itself.
- The combination of locked methodology + public governance + open code
  is what makes the index licensable — that's the whole product, not the
  website.
