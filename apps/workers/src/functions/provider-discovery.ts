// Daily 04:00 UTC: discover new compute marketplaces via web search,
// have Claude assess each, queue to provider_candidates for admin review.
//
// Defense in depth (the LLM is one signal, not the gate — the gate is
// /admin/providers manual approval):
//   • TLD allowlist before we even fetch
//   • DNS lookup rejects private/reserved IPs (SSRF guard)
//   • redirect: 'manual' so a 3xx can't bounce us to a private IP
//   • candidate cap of 5/run keeps the surface tight
//   • assessProvider system prompt treats page text as untrusted

import { getServiceClient } from '@compute-terminal/db';
import { assessProvider } from '@compute-terminal/llm';
import { inngest } from '../inngest/client';
import { publishEvent } from '../inngest/publish-event';
import { isAllowedTld, safeFetch } from '../lib/url-safety';

const SEARCH_QUERIES = [
  'gpu rental marketplace 2026',
  'rent H100 hourly',
  'compute marketplace startup',
  'alternative to vast.ai',
  'cheap b200 cloud rental',
];

const CANDIDATE_CAP = 5;
const FETCH_USER_AGENT = 'ComputeTerminalDiscovery/0.1';

interface BraveResult { title: string; url: string; description?: string }

async function braveSearch(q: string): Promise<BraveResult[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=10`,
    {
      headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { web?: { results?: BraveResult[] } };
  return json.web?.results ?? [];
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 12_000);
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

    // Dedup by host, drop anything whose TLD isn't on the allowlist.
    const seen = new Set<string>();
    const tldRejected: string[] = [];
    const candidates = allResults.filter((r) => {
      try {
        const u = new URL(r.url);
        if (seen.has(u.host)) return false;
        seen.add(u.host);
        if (!isAllowedTld(u.host)) {
          tldRejected.push(u.host);
          return false;
        }
        return true;
      } catch {
        return false;
      }
    });

    // Drop anything we already know about (active providers + previously-seen candidates).
    const { data: known } = await sb.from('providers').select('base_url');
    const { data: alreadySeen } = await sb.from('provider_candidates').select('url');
    const knownHosts = new Set(
      [
        ...(known ?? []).map((p) => {
          try {
            return new URL(p.base_url ?? '').host;
          } catch {
            return '';
          }
        }),
        ...(alreadySeen ?? []).map((p) => {
          try {
            return new URL(p.url).host;
          } catch {
            return '';
          }
        }),
      ].filter(Boolean),
    );

    const fresh = candidates
      .filter((c) => {
        try {
          return !knownHosts.has(new URL(c.url).host);
        } catch {
          return false;
        }
      })
      .slice(0, CANDIDATE_CAP);

    let added = 0;
    const skipped: Array<{ url: string; reason: string }> = [];

    for (const c of fresh) {
      const fetched = await step.run(`fetch-${c.url}`, async () =>
        safeFetch(c.url, { userAgent: FETCH_USER_AGENT, timeoutMs: 15_000 }),
      );

      if (!fetched.ok) {
        skipped.push({ url: c.url, reason: fetched.reason });
        continue;
      }

      const text = stripHtml(fetched.text);
      if (!text) {
        skipped.push({ url: c.url, reason: 'empty_text' });
        continue;
      }

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
            signals: {
              description: c.description ?? '',
              resolved_ips: fetched.resolved_ips,
            },
            llm_assessment: assessment,
          },
          { onConflict: 'url' },
        );
        await publishEvent({
          event_type: 'provider_candidate_discovered',
          entity_type: 'provider_candidate',
          entity_id: c.url,
          payload: {
            name: c.title,
            priority: assessment.priority_score,
            quality: assessment.quality_assessment,
          },
          source: 'worker:provider-discovery',
        });
        added++;
      } else {
        skipped.push({ url: c.url, reason: `assessment_${assessment.quality_assessment}` });
      }
    }

    return {
      searched: allResults.length,
      considered: fresh.length,
      added,
      skipped,
      tld_rejected: tldRejected.length,
    };
  },
);
