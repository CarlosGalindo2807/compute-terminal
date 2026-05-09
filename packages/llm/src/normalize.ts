// LLM-driven normalization for unmatched GPU strings.
// Uses Claude with structured JSON output via output_config.format.

import { z } from 'zod';
import { DEFAULT_MODEL, getAnthropic } from './index';

const NormalizeSchema = z.object({
  gpu_model_slug: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  is_new_hardware: z.boolean(),
});
export type NormalizeResult = z.infer<typeof NormalizeSchema>;

export interface NormalizeContext {
  knownModels: Array<{
    slug: string;
    manufacturer: string;
    model: string;
    variant: string | null;
    vram_gb: number;
    aliases: string[];
  }>;
  fewShotExamples?: Array<{ raw: string; resolved: string; reasoning: string }>;
}

const RULES = `You are an expert in datacenter GPU hardware. Your job is to map raw marketplace listing strings to a canonical catalog.

Decision rules:
- Match the manufacturer + model + variant + VRAM. Two H100s with different VRAM are different rows.
- Be conservative. If you cannot confidently identify a match in the catalog, return gpu_model_slug=null with low confidence.
- Set is_new_hardware=true ONLY if the string clearly describes a real, current-or-future production GPU NOT in the catalog (e.g. RTX 6000 Ada, MI355X, B100). Do not set true for typos, gaming cards, or fictional SKUs.
- Confidence calibration: 0.95+ = certain, 0.80-0.94 = likely but ambiguous, <0.80 = guessing.
- reasoning must be one short sentence explaining the call.

Respond ONLY with a single JSON object. No markdown fences, no preamble, no commentary. Schema:
{"gpu_model_slug": string | null, "confidence": number (0-1), "reasoning": string, "is_new_hardware": boolean}`;

function extractJson(text: string): string {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`no JSON in response: ${text.slice(0, 200)}`);
  return stripped.slice(start, end + 1);
}

export async function normalizeWithLlm(
  rawString: string,
  ctx: NormalizeContext,
): Promise<NormalizeResult> {
  const examples = (ctx.fewShotExamples ?? []).slice(0, 5);

  // The catalog is identical across every call in a batch. Move it into the
  // system prompt with cache_control so calls 2..N read it from cache (~10%
  // of normal input cost). Min cacheable prefix on Sonnet 4.6 is 2048 tokens
  // — our system+catalog block clears that comfortably.
  const catalogBlock = [
    'Catalog of known GPUs (canonical):',
    JSON.stringify(ctx.knownModels, null, 2),
    examples.length > 0 ? '\nExamples of past resolutions:' : '',
    ...examples.map((e) => `  "${e.raw}" → ${e.resolved} (${e.reasoning})`),
  ].join('\n');

  const resp = await getAnthropic().messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    system: [
      { type: 'text', text: RULES },
      // Cache the heavy block; first call writes the cache, rest read from it.
      { type: 'text', text: catalogBlock, cache_control: { type: 'ephemeral' } },
    ] as never,
    messages: [{ role: 'user', content: `Resolve this raw GPU string: "${rawString}"` }],
  });

  const text = resp.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return NormalizeSchema.parse(JSON.parse(extractJson(text)));
}
