-- Seed 001: providers, GPU catalog, indices, normalization rules
-- Idempotent via on conflict.

-- ─── Providers ──────────────────────────────────────────────
insert into providers (slug, name, type, base_url, api_endpoint, scrape_strategy, has_api) values
  ('vast',           'Vast.ai',          'marketplace', 'https://vast.ai',                'https://console.vast.ai/api/v0/bundles/', 'api',      true),
  ('runpod',         'RunPod',           'marketplace', 'https://runpod.io',              'https://api.runpod.io/graphql',           'api',      true),
  ('lambda',         'Lambda Labs',      'cloud',       'https://lambdalabs.com',         null,                                       'html',     false),
  ('together',       'Together AI',      'cloud',       'https://together.ai',            'https://api.together.xyz/v1/models',       'api',      true),
  ('hyperbolic',     'Hyperbolic',       'marketplace', 'https://hyperbolic.xyz',         null,                                       'html',     false),
  ('prime_intellect','Prime Intellect',  'marketplace', 'https://primeintellect.ai',      null,                                       'html',     false),
  ('coreweave',      'CoreWeave',        'cloud',       'https://coreweave.com',          null,                                       'manual',   false),
  ('aws',            'AWS EC2',          'cloud',       'https://aws.amazon.com/ec2',     null,                                       'api',      true),
  ('gcp',            'GCP',              'cloud',       'https://cloud.google.com',       null,                                       'api',      true),
  ('azure',          'Azure',            'cloud',       'https://azure.microsoft.com',    null,                                       'api',      true)
on conflict (slug) do update set
  name = excluded.name,
  base_url = excluded.base_url,
  api_endpoint = excluded.api_endpoint;

-- ─── GPU catalog ────────────────────────────────────────────
insert into gpu_models (slug, manufacturer, model, variant, vram_gb, fp16_tflops, fp8_tflops, memory_bandwidth_gb_s, release_year, generation, reference_price_per_hour, aliases) values
  ('h100-sxm-80',    'nvidia', 'H100', 'SXM',   80, 989,  1979, 3350, 2022, 'Hopper',
    2.40, array['H100 SXM 80GB','H100-SXM5','h100sxm','NVIDIA H100 80GB SXM','H100-SXM5-80GB','H100 80GB SXM5','HGX H100']),
  ('h100-pcie-80',   'nvidia', 'H100', 'PCIe',  80, 756,  1513, 2000, 2022, 'Hopper',
    2.10, array['H100 PCIe 80GB','H100-PCIe','h100pcie','NVIDIA H100 80GB PCIe','H100 80GB PCIe','H100 NVL']),
  ('h200-sxm-141',   'nvidia', 'H200', 'SXM',  141, 989,  1979, 4800, 2024, 'Hopper',
    3.60, array['H200 SXM 141GB','H200','h200sxm','NVIDIA H200 141GB','H200 141GB']),
  ('b200-sxm-192',   'nvidia', 'B200', 'SXM',  192, 2250, 4500, 8000, 2025, 'Blackwell',
    5.50, array['B200','B200 192GB','NVIDIA B200','B200 SXM','HGX B200']),
  ('a100-sxm-80',    'nvidia', 'A100', 'SXM',   80, 312,  null, 2039, 2020, 'Ampere',
    1.40, array['A100 SXM 80GB','A100-SXM4-80GB','a100-80gb','NVIDIA A100 80GB','A100 80GB SXM4']),
  ('a100-sxm-40',    'nvidia', 'A100', 'SXM',   40, 312,  null, 1555, 2020, 'Ampere',
    0.95, array['A100 SXM 40GB','A100-SXM4-40GB','a100-40gb','A100 40GB','NVIDIA A100 40GB']),
  ('a6000-pcie',     'nvidia', 'RTX A6000', 'PCIe', 48, 309, null, 768, 2020, 'Ampere',
    0.55, array['RTX A6000','A6000','NVIDIA A6000','A6000 48GB']),
  ('l40s-pcie-48',   'nvidia', 'L40S', 'PCIe',   48, 362,  733,  864, 2023, 'Ada Lovelace',
    1.10, array['L40S','L40S 48GB','NVIDIA L40S']),
  ('mi300x-oam-192', 'amd',    'MI300X', 'OAM', 192, 1300, 2614, 5300, 2023, 'CDNA3',
    3.20, array['MI300X','AMD MI300X','MI300X 192GB','Instinct MI300X']),
  ('gb200-nvl72',    'nvidia', 'GB200', 'NVL72', 192, 5000, 10000, 8000, 2025, 'Blackwell',
    8.00, array['GB200','GB200 NVL72','Grace Blackwell','GB200 Superchip'])
on conflict (slug) do update set
  aliases = excluded.aliases,
  reference_price_per_hour = excluded.reference_price_per_hour;

-- ─── Compute indices ────────────────────────────────────────
insert into compute_indices (slug, name, description, methodology) values
  ('cti-h100', 'CTI-H100',
    'Compute Index — H100 family (SXM + PCIe, 80GB)',
    jsonb_build_object(
      'gpu_models', jsonb_build_array('h100-sxm-80','h100-pcie-80'),
      'method', 'filtered_vwap',
      'window', '24h',
      'exclude_outliers', true,
      'min_observations_per_provider', 5
    )),
  ('cti-blackwell', 'CTI-Blackwell',
    'Compute Index — Blackwell generation (B200, GB200)',
    jsonb_build_object(
      'gpu_models', jsonb_build_array('b200-sxm-192','gb200-nvl72'),
      'method', 'filtered_vwap',
      'window', '24h',
      'exclude_outliers', true,
      'min_observations_per_provider', 3
    )),
  ('cti-composite', 'CTI-Composite',
    'Composite compute index — weighted by reference price relevance',
    jsonb_build_object(
      'method', 'time_decay_vwap',
      'gpu_weights', jsonb_build_object(
        'h100-sxm-80', 0.30,
        'h200-sxm-141', 0.20,
        'b200-sxm-192', 0.20,
        'a100-sxm-80', 0.15,
        'mi300x-oam-192', 0.10,
        'gb200-nvl72', 0.05
      ),
      'window', '24h',
      'exclude_outliers', true
    ))
on conflict (slug) do update set
  methodology = excluded.methodology,
  description = excluded.description;

-- ─── Seed normalization rules (exact-match shortcuts for known aliases) ──
-- For each gpu_model, register every alias as an exact rule with confidence=1.0, source='seed'.
insert into normalization_rules (pattern, pattern_type, gpu_model_id, confidence, source)
select alias, 'exact', g.id, 1.0, 'seed'
from gpu_models g, unnest(g.aliases) as alias
on conflict (pattern, pattern_type, gpu_model_id) do nothing;

-- Also register the slug itself.
insert into normalization_rules (pattern, pattern_type, gpu_model_id, confidence, source)
select slug, 'exact', id, 1.0, 'seed'
from gpu_models
on conflict (pattern, pattern_type, gpu_model_id) do nothing;
