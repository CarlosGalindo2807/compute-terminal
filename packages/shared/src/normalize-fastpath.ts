// Synchronous fast-path normalizer (TS port of apps/scrapers/core/normalizer.py).
// Tried in order: exact rule → alias array contains → fuzzy slug ilike.
// Fall-through: insert into unmatched_listings; the hourly Claude job picks it up.

import type { SupabaseClient } from '@supabase/supabase-js';

export async function normalizeGpuString(
  sb: SupabaseClient,
  raw: string,
  opts: { providerId: string | null; rawPayload?: Record<string, unknown> | null },
): Promise<string | null> {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  // 1. Exact rule
  const { data: ruleHit } = await sb
    .from('normalization_rules')
    .select('id, gpu_model_id, hit_count')
    .eq('pattern_type', 'exact')
    .eq('pattern', cleaned)
    .order('confidence', { ascending: false })
    .limit(1);
  if (ruleHit?.[0]) {
    const r = ruleHit[0];
    void sb
      .from('normalization_rules')
      .update({ hit_count: (r.hit_count ?? 0) + 1, last_hit_at: new Date().toISOString() })
      .eq('id', r.id);
    return r.gpu_model_id;
  }

  // 2. Alias array contains
  const { data: aliasHit } = await sb
    .from('gpu_models')
    .select('id, slug')
    .contains('aliases', [cleaned])
    .limit(1);
  if (aliasHit?.[0]) {
    const id = aliasHit[0].id;
    void sb
      .from('normalization_rules')
      .upsert(
        {
          pattern: cleaned,
          pattern_type: 'exact',
          gpu_model_id: id,
          source: 'rule_based',
          confidence: 1.0,
          hit_count: 1,
          last_hit_at: new Date().toISOString(),
        },
        { onConflict: 'pattern,pattern_type,gpu_model_id' },
      );
    return id;
  }

  // 3. Fuzzy slug ilike
  const slugified = slugify(cleaned);
  if (slugified.length >= 4) {
    const { data: fuzzyHit } = await sb
      .from('gpu_models')
      .select('id, slug')
      .ilike('slug', `%${slugified}%`)
      .limit(1);
    if (fuzzyHit?.[0]) {
      const id = fuzzyHit[0].id;
      void sb
        .from('normalization_rules')
        .upsert(
          {
            pattern: cleaned,
            pattern_type: 'fuzzy',
            gpu_model_id: id,
            source: 'rule_based',
            confidence: 0.8,
            hit_count: 1,
            last_hit_at: new Date().toISOString(),
          },
          { onConflict: 'pattern,pattern_type,gpu_model_id' },
        );
      return id;
    }
  }

  // 4. Unmatched — upsert + occurrence bump
  const { data: existing } = await sb
    .from('unmatched_listings')
    .select('id, occurrence_count')
    .eq('raw_string', cleaned)
    .eq('provider_id', opts.providerId)
    .limit(1);
  if (existing?.[0]) {
    void sb
      .from('unmatched_listings')
      .update({ occurrence_count: (existing[0].occurrence_count ?? 0) + 1 })
      .eq('id', existing[0].id);
  } else {
    void sb.from('unmatched_listings').insert({
      raw_string: cleaned,
      raw_payload: opts.rawPayload ?? {},
      provider_id: opts.providerId,
    });
  }
  return null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
