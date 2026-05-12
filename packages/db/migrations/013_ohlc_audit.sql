-- Migration 013: real OHLC + per-row audit of contributing GPU universe.
--
-- Context: index_values_daily has had open_price / close_price columns since
-- 003, but the calculator wrote them as min(prices) and max(prices) — i.e.
-- the daily range minimum and maximum, not real first-by-timestamp and
-- last-by-timestamp. The published value (vwap, methodology v1.0) was always
-- correct, but the OHLC columns were misleading: a single outlier rotated
-- close_price by tens of percent and made day-over-day deltas look
-- catastrophic. The 2026-05-12 ticker bug surfaced this — see
-- docs/decisions.md ("Open question — index_calculator daily delta volatility").
--
-- The calculator fix that pairs with this migration (apps/workers/.../
-- index-calculator.ts) sorts eligible snapshots by captured_at and writes
-- open_price = first observation, close_price = last observation. low_price
-- and high_price keep their min/max semantics but are now computed
-- separately from the price array rather than from the sorted-ascending
-- prices array (no behavior change, just decoupled).
--
-- Beyond the OHLC fix, the calculator now also stamps which GPU models
-- entered each daily print. compute_indices.methodology.gpu_models is the
-- declared universe, but on any given day a subset may have insufficient
-- observations to clear the methodology floor. Recording the actual
-- contributing set lets us audit universe-composition shifts as drivers of
-- index value changes (e.g., the cti-h100 went −43 % between 2026-05-09
-- and 2026-05-11 partly because the eligible H100 variants expanded from
-- 21 to 363 observations — that's data we can now read directly off the
-- row instead of joining back to price_snapshots).
--
-- No backfill: the new column defaults to null on historical rows. The
-- nightly calculator populates it from today onward. Anyone querying
-- contributing_gpu_ids on a pre-013 row gets null and should fall back to
-- compute_indices.methodology.gpu_models (the declared universe).

alter table index_values_daily
  add column if not exists contributing_gpu_ids uuid[];

comment on column index_values_daily.contributing_gpu_ids is
  'GPU model ids whose snapshots entered this index print after reliability + outlier filtering. Null on rows written before migration 013. Subset of compute_indices.methodology.gpu_models.';
