// Hand-rolled domain types — replace with `pnpm --filter @compute-terminal/db generate-types`
// once a Supabase project is linked. Mirrors the migrations in packages/db/migrations/.

export type ProviderType = 'marketplace' | 'cloud' | 'reserved' | 'forward';
export type ScrapeStrategy = 'api' | 'html' | 'playwright' | 'manual';
export type Manufacturer = 'nvidia' | 'amd' | 'intel' | 'google' | 'aws';
export type UnmatchedStatus = 'pending' | 'auto_resolved' | 'manual_resolved' | 'ignored' | 'new_hardware';
export type RuleSource = 'seed' | 'llm_learned' | 'manual' | 'rule_based';
export type PatternType = 'exact' | 'regex' | 'contains' | 'fuzzy';
export type CandidateStatus = 'pending' | 'approved' | 'rejected' | 'integrated';
export type Plan = 'free' | 'pro' | 'team' | 'enterprise';
export type AlertCondition = 'above' | 'below' | 'change_pct_above' | 'change_pct_below';
export type AlertChannel = 'email' | 'telegram' | 'webhook';
export type ContentType = 'daily_brief' | 'social_post' | 'newsletter' | 'blog_post';
export type ContentStatus = 'draft' | 'approved' | 'published' | 'rejected';

export interface Provider {
  id: string;
  slug: string;
  name: string;
  type: ProviderType;
  base_url: string | null;
  api_endpoint: string | null;
  scrape_strategy: ScrapeStrategy | null;
  has_api: boolean;
  is_active: boolean;
  reliability_score: number;
  consecutive_failures: number;
  last_success_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GpuModel {
  id: string;
  slug: string;
  manufacturer: Manufacturer;
  model: string;
  variant: string | null;
  vram_gb: number;
  fp16_tflops: number | null;
  fp8_tflops: number | null;
  memory_bandwidth_gb_s: number | null;
  release_year: number | null;
  generation: string | null;
  reference_price_per_hour: number | null;
  is_active: boolean;
  aliases: string[];
  created_at: string;
}

export interface PriceSnapshot {
  id: number;
  provider_id: string;
  gpu_model_id: string | null;
  region: string | null;
  price_per_hour: number;
  currency: string;
  num_gpus: number;
  interconnect: string | null;
  availability_count: number | null;
  raw_payload: Record<string, unknown>;
  raw_gpu_string: string | null;
  is_outlier: boolean;
  outlier_reason: string | null;
  is_normalized: boolean;
  captured_at: string;
}

export interface ComputeIndex {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  methodology: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface IndexValueDaily {
  index_id: string;
  date: string;
  open_price: number | null;
  high_price: number | null;
  low_price: number | null;
  close_price: number | null;
  vwap: number | null;
  median_price: number | null;
  trimmed_mean: number | null;
  num_observations: number | null;
  num_providers: number | null;
  methodology_used: string | null;
  confidence_score: number | null;
}

export interface UnmatchedListing {
  id: string;
  raw_string: string;
  raw_payload: Record<string, unknown> | null;
  provider_id: string | null;
  occurrence_count: number;
  status: UnmatchedStatus;
  suggested_gpu_id: string | null;
  llm_confidence: number | null;
  llm_reasoning: string | null;
  llm_model: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NormalizationRule {
  id: string;
  pattern: string;
  pattern_type: PatternType;
  gpu_model_id: string;
  confidence: number;
  source: RuleSource;
  hit_count: number;
  last_hit_at: string | null;
  created_at: string;
}

export interface SystemEvent {
  id: number;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  source: string | null;
  occurred_at: string;
}

// Stub Database type for createClient<Database>() — replace with generated types once Supabase project is linked.
export type Database = {
  public: {
    Tables: Record<string, unknown>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

export type Tables<T extends string> = T extends 'providers' ? Provider
  : T extends 'gpu_models' ? GpuModel
  : T extends 'price_snapshots' ? PriceSnapshot
  : T extends 'compute_indices' ? ComputeIndex
  : T extends 'index_values_daily' ? IndexValueDaily
  : T extends 'unmatched_listings' ? UnmatchedListing
  : T extends 'normalization_rules' ? NormalizationRule
  : T extends 'system_events' ? SystemEvent
  : never;

export type Enums<T extends string> = unknown;
