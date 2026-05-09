// Provider-discovery LLM call: given a candidate URL + page text, decide if
// it's a real compute marketplace worth integrating.

import { z } from 'zod';
import { DEFAULT_MODEL, getAnthropic } from './index.js';

export const ProviderAssessmentSchema = z.object({
  is_compute_marketplace: z.boolean(),
  has_public_pricing: z.boolean(),
  gpu_types_offered: z.array(z.string()),
  has_api: z.boolean(),
  quality_assessment: z.enum(['high', 'medium', 'low', 'spam']),
  priority_score: z.number().min(0).max(10),
  reasoning: z.string(),
});
export type ProviderAssessment = z.infer<typeof ProviderAssessmentSchema>;

const SYSTEM = `You evaluate whether a website is a legitimate GPU/compute marketplace worth integrating into a price-aggregation index.

Definition of "compute marketplace": offers on-demand or reserved GPU compute by the hour to anyone who can sign up. NOT: news sites, blogs, hardware reviews, exchanges of physical hardware, or aggregators that re-list other providers without their own inventory.

Quality scale:
- high: established or well-funded, verifiable inventory, clean docs
- medium: smaller but legit; inventory verifiable
- low: thin info, unclear legitimacy, looks experimental
- spam: scam, parked domain, unrelated

priority_score: 0–10 importance for a v1 price index. Big inventory + public pricing + API access → 9–10. Cloud reseller with no API → 4–6.

Respond ONLY with a single JSON object, no markdown fences. Schema:
{"is_compute_marketplace": boolean, "has_public_pricing": boolean, "gpu_types_offered": string[], "has_api": boolean, "quality_assessment": "high"|"medium"|"low"|"spam", "priority_score": number (0-10), "reasoning": string}`;

function extractJson(text: string): string {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`no JSON in response`);
  return stripped.slice(start, end + 1);
}

export async function assessProvider(opts: {
  url: string;
  name: string;
  pageText: string;
}): Promise<ProviderAssessment> {
  const truncated = opts.pageText.slice(0, 8000);
  const resp = await getAnthropic().messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `URL: ${opts.url}\nName: ${opts.name}\n\nLanding-page text (truncated):\n${truncated}`,
      },
    ],
  });

  const text = resp.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return ProviderAssessmentSchema.parse(JSON.parse(extractJson(text)));
}
