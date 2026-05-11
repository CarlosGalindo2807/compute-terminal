// Single Anthropic client. Sonnet by default for cost; the daily content job
// can override to Opus for higher-quality writing.
//
// When AI_GATEWAY_API_KEY is set the client routes through Vercel AI Gateway,
// which gives us unified billing, observability per endpoint, and automatic
// fallbacks. The gateway is a drop-in Anthropic Messages API (cache_control,
// adaptive thinking, system blocks all native) — only the base URL, auth key,
// and model identifier prefix change. When the gateway env var is absent the
// client falls back to direct Anthropic, so local dev keeps working with
// ANTHROPIC_API_KEY alone.

import Anthropic from '@anthropic-ai/sdk';

const USE_GATEWAY = !!process.env.AI_GATEWAY_API_KEY;
const MODEL_PREFIX = USE_GATEWAY ? 'anthropic/' : '';

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (_client) return _client;
  if (USE_GATEWAY) {
    _client = new Anthropic({
      apiKey: process.env.AI_GATEWAY_API_KEY,
      baseURL: 'https://ai-gateway.vercel.sh',
    });
  } else {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// True when LLM calls are routed through Vercel AI Gateway. Lets callers add
// observability tags or pick gateway-only features if needed.
export const IS_GATEWAY = USE_GATEWAY;

// Model identifiers. When routed through the gateway every identifier carries
// the `anthropic/` provider prefix; direct Anthropic calls use the raw ID.
export const DEFAULT_MODEL = `${MODEL_PREFIX}${process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'}`;
export const HIGH_QUALITY_MODEL = `${MODEL_PREFIX}claude-opus-4-7`;
export const FALLBACK_MODEL = `${MODEL_PREFIX}${process.env.ANTHROPIC_MODEL_FALLBACK ?? 'claude-haiku-4-5-20251001'}`;

export * from './normalize';
export * from './assess-provider';
export * from './content';
