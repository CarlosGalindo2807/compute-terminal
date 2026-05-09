-- Migration 008: catalog expansion based on what Vast.ai actually surfaces.
-- Two buckets:
--   • Datacenter SKUs we missed (V100, A100 PCIe, RTX PRO 6000 S/WS, RTX PRO 4500, RTX 4000 Ada)
--   • Consumer SKUs heavily used for ML on community marketplaces (RTX 3090, 4090, 5090, mid-range)
--
-- The default 3 indices (cti-h100, cti-blackwell, cti-composite) already filter by slug,
-- so adding consumer GPUs here does NOT pollute those benchmarks. They will surface in
-- /markets and become available for new specialty indices like cti-consumer or cti-blackwell-all.

-- ─── New datacenter SKUs ──────────────────────────────────
insert into gpu_models (slug, manufacturer, model, variant, vram_gb, fp16_tflops, fp8_tflops, memory_bandwidth_gb_s, release_year, generation, reference_price_per_hour, aliases) values
  ('v100-sxm2-32', 'nvidia', 'V100', 'SXM2', 32, 125, null, 900, 2018, 'Volta',
    0.50, array['Tesla V100','V100 32GB','V100-SXM2','Tesla V100 SXM2','NVIDIA V100']),
  ('v100-pcie-16', 'nvidia', 'V100', 'PCIe', 16, 112, null, 900, 2017, 'Volta',
    0.40, array['V100 16GB','V100 PCIe','Tesla V100 16GB','V100-PCIe-16']),
  ('a100-pcie-80', 'nvidia', 'A100', 'PCIe', 80, 312, null, 1935, 2021, 'Ampere',
    1.30, array['A100 PCIE','A100 PCIe 80GB','A100-PCIe-80','A100 80GB PCIe','NVIDIA A100 80GB PCIe']),
  ('a100-pcie-40', 'nvidia', 'A100', 'PCIe', 40, 312, null, 1555, 2020, 'Ampere',
    0.85, array['A100 40GB PCIe','A100-PCIe-40','A100 PCIe 40GB']),
  ('rtx-pro-6000-server-blackwell', 'nvidia', 'RTX PRO 6000', 'Blackwell Server', 96, 1680, 3380, 1792, 2025, 'Blackwell',
    3.20, array['RTX PRO 6000 S','RTX Pro 6000 Blackwell Server','RTX 6000 Pro Server','RTX PRO 6000 Server']),
  ('rtx-pro-6000-workstation-blackwell', 'nvidia', 'RTX PRO 6000', 'Blackwell WS', 96, 1680, 3380, 1792, 2025, 'Blackwell',
    2.90, array['RTX PRO 6000 WS','RTX Pro 6000 Blackwell','RTX PRO 6000 Workstation','RTX 6000 Pro WS']),
  ('rtx-pro-4500-blackwell', 'nvidia', 'RTX PRO 4500', 'Blackwell', 24, 320, 640, 672, 2025, 'Blackwell',
    1.20, array['RTX PRO 4500','RTX Pro 4500 Blackwell','RTX 4500 Pro Blackwell']),
  ('rtx-4000-ada', 'nvidia', 'RTX 4000', 'Ada Generation', 20, 26.7, null, 360, 2023, 'Ada Lovelace',
    0.45, array['RTX 4000Ada','RTX 4000 Ada','RTX 4000 Ada Generation','NVIDIA RTX 4000 Ada'])

on conflict (slug) do update set
  aliases = excluded.aliases,
  reference_price_per_hour = excluded.reference_price_per_hour;

-- ─── Consumer SKUs widely used for ML on community markets ──────────
insert into gpu_models (slug, manufacturer, model, variant, vram_gb, fp16_tflops, fp8_tflops, memory_bandwidth_gb_s, release_year, generation, reference_price_per_hour, aliases) values
  ('rtx-3090', 'nvidia', 'RTX 3090', null, 24, 35.6, null, 936, 2020, 'Ampere',
    0.30, array['RTX 3090','GeForce RTX 3090','NVIDIA RTX 3090','RTX 3090 24GB']),
  ('rtx-3090-ti', 'nvidia', 'RTX 3090 Ti', null, 24, 40, null, 1008, 2022, 'Ampere',
    0.35, array['RTX 3090 Ti','RTX 3090Ti','GeForce RTX 3090 Ti']),
  ('rtx-4090', 'nvidia', 'RTX 4090', null, 24, 82.6, null, 1008, 2022, 'Ada Lovelace',
    0.45, array['RTX 4090','GeForce RTX 4090','NVIDIA RTX 4090','RTX 4090 24GB']),
  ('rtx-4080-super', 'nvidia', 'RTX 4080 Super', null, 16, 52.2, null, 736, 2024, 'Ada Lovelace',
    0.30, array['RTX 4080S','RTX 4080 Super','RTX 4080S 16GB','GeForce RTX 4080 Super']),
  ('rtx-4070-ti-super', 'nvidia', 'RTX 4070 Ti Super', null, 16, 44.1, null, 672, 2024, 'Ada Lovelace',
    0.22, array['RTX 4070S Ti','RTX 4070 Ti Super','RTX 4070Ti Super','RTX 4070TiS']),
  ('rtx-4070-super', 'nvidia', 'RTX 4070 Super', null, 12, 35.5, null, 504, 2024, 'Ada Lovelace',
    0.18, array['RTX 4070S','RTX 4070 Super','RTX 4070Super','GeForce RTX 4070 Super']),
  ('rtx-5090', 'nvidia', 'RTX 5090', null, 32, 125, null, 1792, 2025, 'Blackwell',
    0.80, array['RTX 5090','GeForce RTX 5090','NVIDIA RTX 5090','RTX 5090 32GB']),
  ('rtx-5080', 'nvidia', 'RTX 5080', null, 16, 56.3, null, 960, 2025, 'Blackwell',
    0.45, array['RTX 5080','GeForce RTX 5080']),
  ('rtx-5070-ti', 'nvidia', 'RTX 5070 Ti', null, 16, 43.9, null, 896, 2025, 'Blackwell',
    0.32, array['RTX 5070 Ti','RTX 5070Ti','GeForce RTX 5070 Ti']),
  ('rtx-5060-ti', 'nvidia', 'RTX 5060 Ti', null, 16, 23.7, null, 448, 2025, 'Blackwell',
    0.20, array['RTX 5060 Ti','RTX 5060Ti','GeForce RTX 5060 Ti'])

on conflict (slug) do update set
  aliases = excluded.aliases,
  reference_price_per_hour = excluded.reference_price_per_hour;

-- ─── Refresh seed normalization rules so the synchronous fast path
--     in the Python scrapers picks up the new aliases on next scrape. ──
insert into normalization_rules (pattern, pattern_type, gpu_model_id, confidence, source)
select alias, 'exact', g.id, 1.0, 'seed'
from gpu_models g, unnest(g.aliases) as alias
on conflict (pattern, pattern_type, gpu_model_id) do nothing;

-- Also register slug as exact-match.
insert into normalization_rules (pattern, pattern_type, gpu_model_id, confidence, source)
select slug, 'exact', id, 1.0, 'seed'
from gpu_models
on conflict (pattern, pattern_type, gpu_model_id) do nothing;

-- ─── Promote any existing unmatched_listings whose raw_string now matches a rule.
--     Back-fill the corresponding price_snapshots in one pass. ─────────
with matched as (
  select u.id as unmatched_id, u.raw_string, u.provider_id, r.gpu_model_id
  from unmatched_listings u
  join normalization_rules r on r.pattern = u.raw_string and r.pattern_type = 'exact'
  where u.status = 'pending'
)
update unmatched_listings u
set status = 'manual_resolved',
    suggested_gpu_id = m.gpu_model_id,
    resolved_at = now(),
    resolved_by = 'migration:008'
from matched m
where u.id = m.unmatched_id;

-- Back-fill snapshots that referenced these strings.
update price_snapshots p
set gpu_model_id = r.gpu_model_id,
    is_normalized = true
from normalization_rules r
where r.pattern = p.raw_gpu_string
  and r.pattern_type = 'exact'
  and p.gpu_model_id is null;
