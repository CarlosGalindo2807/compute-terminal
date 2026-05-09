// Single Anthropic client. Sonnet by default for cost; the daily content job
// can override to Opus for higher-quality writing.

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  _client = new Anthropic({ apiKey });
  return _client;
}

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
export const HIGH_QUALITY_MODEL = 'claude-opus-4-7';
export const FALLBACK_MODEL = process.env.ANTHROPIC_MODEL_FALLBACK ?? 'claude-haiku-4-5-20251001';

export * from './normalize.js';
export * from './assess-provider.js';
export * from './content.js';
