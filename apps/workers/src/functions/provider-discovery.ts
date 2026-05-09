// Daily 04:00 UTC: discover new compute marketplaces via web search,
// have Claude assess each, queue to provider_candidates for admin review.

import { getServiceClient } from '@compute-terminal/db';
import { assessProvider } from '@compute-terminal/llm';
import { inngest } from '../inngest/client';
import { publishEvent } from '../inngest/publish-event';

const SEARCH_QUERIES = [
  'gpu rental marketplace 2026',
  'rent H100 hourly',
  'compute marketplace startup',
  'alternative to vast.ai',
  'cheap b200 cloud rental',
];

interface BraveResult { title: string; url: string; description?: string }

async function braveSearch(q: string): Promise<BraveResult[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=10`, {
    headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { web?: { results?: BraveResult[] } };
  return json.web?.results ?? [];
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ComputeTerminalDiscovery/0.1' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return '';
  const html = await res.text();
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 12000);
}

export const providerDiscovery = inngest.createFunction(
  { id: 'provider-discovery', name: 'Discover new compute marketplaces' },
  { cron: '0 4 * * *' },
  async ({ step }) => {
    const sb = getServiceClient();

    const allResults = await step.run('search', async () => {
      const out: BraveResult[] = [];
      for (const q of SEARCH_QUERIES) out.push(...(await braveSearch(q)));
      return out;
    });

    const seen = new Set<string>();
    const candidates = allResults.filter((r) => {
      try {
        const u = new URL(r.url);
        const key = u.host;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      } catch { return false; }
    });

    const { data: known } = await sb.from('providers').select('base_url');
    const { data: alreadySeen } = await sb.from('provider_candidates').select('url');
    const knownHosts = new Set([
      ...(known ?? []).map((p) => { try { return new URL(p.base_url ?? '').host; } catch { return ''; } }),
      ...(alreadySeen ?? []).map((p) => { try { return new URL(p.url).host; } catch { return ''; } }),
    ].filter(Boolean));

    const fresh = candidates.filter((c) => {
      try { return !knownHosts.has(new URL(c.url).host); } catch { return false; }
    }).slice(0, 12);

    let added = 0;
    for (const c of fresh) {
      const text = await step.run(`fetch-${c.url}`, async () => fetchPage(c.url));
      if (!text) continue;
      const assessment = await step.run(`assess-${c.url}`, async () =>
        assessProvider({ url: c.url, name: c.title, pageText: text }),
      );
      if (
        assessment.is_compute_marketplace &&
        assessment.quality_assessment !== 'spam' &&
        assessment.quality_assessment !== 'low'
      ) {
        await sb.from('provider_candidates').upsert(
          {
            name: c.title,
            url: c.url,
            source: 'brave_search',
            signals: { description: c.description ?? '' },
            llm_assessment: assessment,
          },
          { onConflict: 'url' },
        );
        await publishEvent({
          event_type: 'provider_candidate_discovered',
          entity_type: 'provider_candidate',
          entity_id: c.url,
          payload: { name: c.title, priority: assessment.priority_score, quality: assessment.quality_assessment },
          source: 'worker:provider-discovery',
        });
        added++;
      }
    }

    return { searched: allResults.length, considered: fresh.length, added };
  },
);
