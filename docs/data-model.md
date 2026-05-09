# Data Model

Authoritative schema lives in `packages/db/migrations/001_*.sql` through `007_*.sql`. This file is the why behind each table.

## Catalogs (migration 001)

### `providers`
One row per marketplace/cloud. `reliability_score` is the live trust metric the index calculator weights by; `consecutive_failures` is the circuit-breaker counter the scrapers update.

### `gpu_models`
One row per *normalized* hardware SKU (manufacturer + model + variant + VRAM). `aliases text[]` carries every known marketing string for the SKU; the GIN index on it powers the synchronous "alias match" step in `core/normalizer.py`.

## The hot table (migration 002)

### `price_snapshots`
TimescaleDB hypertable, `chunk_time_interval = 1 day`. Compression policy at 7 days segments by `gpu_model_id, provider_id` — cardinality is low (10 providers × ~10 GPUs = 100 segments) so compression ratios are excellent.

`gpu_model_id` is nullable on insert: if normalization can't resolve the string at write time, the row still lands (with `is_normalized=false`) so we don't lose data. Worker re-processes those after Claude resolves.

`raw_payload jsonb` stores the original API/HTML response — non-negotiable for debuggability and because we may want to re-extract fields we didn't think to capture.

`is_outlier` is set by the outlier detector and respected by every downstream view (markets table, gpu detail, index calculator). Outliers stay in the table — we just don't price off them.

## Indices (migration 003)

### `compute_indices`
Index *definitions*: which GPUs are constituents, weighting scheme, exclusion rules. The `methodology jsonb` is read by the calculator at runtime.

### `index_values_daily`
Per-index, per-day computed values. `methodology_used` records the *winning* methodology for that day — not necessarily the same as the index's default, since the calculator A/B-tests. `confidence_score` ∈ [0,1].

### `index_methodology_experiments`
Every alternative methodology Claude tries gets logged here. Lets us compare champions over time and explain regime shifts.

## Self-learning queue (migration 004)

### `unmatched_listings`
The "I haven't seen this string before" queue. Unique on `(provider_id, raw_string)` — repeat sightings just bump `occurrence_count`. Status FSM: `pending → auto_resolved | manual_resolved | ignored | new_hardware`.

### `normalization_rules`
The learned dictionary. `pattern_type ∈ {exact, regex, contains, fuzzy}`. `hit_count` lets us prune: rules that never fire again can be archived.

### `provider_candidates`
Output of the discovery worker. `signals` and `llm_assessment` carry the evidence; admin reviews in /admin/providers.

## Event sourcing (migration 005)

### `system_events`
Append-only log. Every meaningful state change goes here. Indexed on `(event_type, occurred_at)` and `(entity_type, entity_id, occurred_at)` so the admin event browser is fast.

### `system_health_metrics`
TimescaleDB hypertable, hourly snapshots written by `record-system-metrics`. Powers `/admin/health` sparklines.

## Users / alerts / content (migration 006)

### `user_profiles`
Mirrors `auth.users`. `signals jsonb` is the bucket where we'll accumulate behavioral data (which GPUs they view, what alerts they set) for product analytics.

### `alerts`
Conditions live as `(condition, threshold)` so we can later add new condition types without schema changes.

### `generated_content`
The output of the content generator + the channel publisher's queue. `metadata jsonb` carries chart references; `metrics jsonb` is filled post-publish with engagement.

## RLS (migration 007)

Public tables (`providers`, `gpu_models`, `price_snapshots`, `compute_indices`, `index_values_daily`, published `generated_content`) have RLS off — reads happen server-side via the service-role client. User-scoped tables (`user_profiles`, `user_actions`, `alerts`, `data_flags`) are RLS'd to `auth.uid() = user_id`.

If/when we expose PostgREST or anon-key reads, enable RLS on the public tables with a "select-only for everyone" policy.
