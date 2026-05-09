// Daily-brief content generator. Higher-quality model for human-facing copy.

import { z } from 'zod';
import { HIGH_QUALITY_MODEL, getAnthropic } from './index.js';

export const DailyBriefSchema = z.object({
  brief_markdown: z.string(),
  tweet: z.string().max(280),
  linkedin_post: z.string(),
  hero_chart_caption: z.string(),
});
export type DailyBrief = z.infer<typeof DailyBriefSchema>;

const SYSTEM = `You write Compute Index Terminal's Daily Compute Brief.

Voice: precise, numerate, slightly dry — like a Bloomberg terminal note crossed with Matt Levine. No hype. No "game-changing". Show the move, name the providers, give the spread.

Outputs:
1. brief_markdown: 300–500 words, Markdown headings allowed. Lead with the most surprising stat. End with one sentence on what it implies.
2. tweet: ≤ 280 chars. One stat, one provider, one inference.
3. linkedin_post: 200–300 words. More context than the tweet, less than the brief. Plain prose, no hashtags.
4. hero_chart_caption: one sentence describing the headline chart you'd expect to accompany the post.

Never invent numbers. Use only the inputs provided.

Respond ONLY with a single JSON object, no markdown fences. Schema:
{"brief_markdown": string, "tweet": string, "linkedin_post": string, "hero_chart_caption": string}`;

function extractJson(text: string): string {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON in response');
  return stripped.slice(start, end + 1);
}

export interface BriefInputs {
  date: string;
  topMovers: Array<{ gpu: string; provider: string; from: number; to: number; change_pct: number }>;
  widestSpread: { gpu: string; min_provider: string; max_provider: string; min: number; max: number };
  newAth?: Array<{ gpu: string; provider: string; price: number }>;
  newAtl?: Array<{ gpu: string; provider: string; price: number }>;
  indexDelta: Record<string, number>;
}

export async function generateDailyBrief(inputs: BriefInputs): Promise<DailyBrief> {
  const resp = await getAnthropic().messages.create({
    model: HIGH_QUALITY_MODEL,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Generate the Daily Compute Brief for ${inputs.date}.\n\nData:\n${JSON.stringify(inputs, null, 2)}`,
      },
    ],
  });

  const text = resp.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return DailyBriefSchema.parse(JSON.parse(extractJson(text)));
}
