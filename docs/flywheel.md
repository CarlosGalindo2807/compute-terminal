# The Flywheel

Architectural non-negotiable: **every component must answer "how does this make the system smarter tomorrow without human intervention?"**

There are five independent learning loops. They feed each other but each is useful on its own.

## 1. Normalization improves itself

```
new_raw_string → unmatched_listings (occurrence_count++)
                              ↓
                  Claude (hourly batch)
                              ↓
        confidence ≥ 0.95 → normalization_rules + back-fill snapshots
        0.70–0.95          → suggested for /admin/unmatched (1-click)
        is_new_hardware    → flagged for catalog expansion
```

After 24h, the catalog covers more aliases than it did this morning, and the back-fill means historical snapshots gain a `gpu_model_id` retroactively. **No human edits the catalog.**

State that grows: `normalization_rules` (with `hit_count` tracking which rules matter most), `gpu_models.aliases` (when admin promotes a frequent unmatched).

## 2. Provider reliability is computed, not configured

Every scrape success or failure adjusts `providers.reliability_score`:
- 3 consecutive failures → drop to 0.95×
- >30% outlier rate over an hour → drop to 0.95×
- 7 days of <5% outliers → drift back toward 1.0

The index calculator weights snapshots by reliability, so a flaky provider's data dilutes itself out of the benchmark automatically.

## 3. Index methodology research runs nightly — published formula is locked

The published index uses one fixed methodology (currently `filtered_vwap` v1.0) — see `/methodology` for the spec. The formula does not auto-change. Changing it is a committee decision.

What's still autonomous is the *research input* the committee reads:
`index-calculator` runs five methodologies against each compute_index every night and writes the results to `index_methodology_experiments`:
- simple_vwap
- filtered_vwap (the published one)
- trimmed_mean_10
- median_weighted (by provider reliability)
- time_decay_vwap

Each methodology is scored on `volatility` (vs yesterday), `consistency` (vs the published value), and `coverage` (provider count). Composite = `0.5*consistency + 0.3*(1-volatility) + 0.2*coverage`. The top-of-research is logged with `was_champion=true` but does not override the published value.

The committee reviews 90 days of research output every quarter. If a non-published candidate sustains a margin against the published one, the committee can propose a version bump (v1.0 → v1.1) — published with 30 days notice via `/methodology`.

The index becomes *more defensible* over time because every methodology comparison is logged, every published value is version-stamped (`index_values_daily.methodology_version`), and the formula is reproducible from open code.

## 4. Provider universe expands automatically

Daily Brave Search → Claude assessment → `provider_candidates`. Admin reviews in /admin/providers (1-click approve). Approved candidates become real `providers` rows; integrations are still human-built but the *discovery* is autonomous.

After six months we expect 30+ providers tracked — none of them found manually.

## 5. Content compounds reach without compounding cost

Daily-brief generator drops a markdown post + tweet + LinkedIn post in `generated_content` at 07:00. If untouched, hourly publisher promotes them at 09:00. Engagement metrics flow back into `generated_content.metrics`, eventually feeding a "what kind of post performs" signal Claude can use as few-shot priors.

## Event sourcing as the substrate

`system_events` records *every* state change. This means:
- We can re-derive the index at any historical point by replaying the events.
- A bug found in normalization can be fixed by re-running the affected events.
- Audits ("why did CTI-H100 jump 11% on March 4?") have a paper trail that includes which methodology was champion that day, which providers had degraded reliability, and which snapshots were marked outliers.

The flywheel doesn't just produce data — it produces a *defensible* benchmark, which is the whole bet.
