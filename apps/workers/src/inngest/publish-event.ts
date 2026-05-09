// Persist a row in system_events. Service-role Supabase client.

import { getServiceClient } from '@compute-terminal/db';
import type { EventType } from '@compute-terminal/shared/events';

export async function publishEvent(opts: {
  event_type: EventType;
  entity_type?: string;
  entity_id?: string;
  payload?: Record<string, unknown>;
  source: string;
}): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from('system_events').insert({
    event_type: opts.event_type,
    entity_type: opts.entity_type ?? null,
    entity_id: opts.entity_id ?? null,
    payload: opts.payload ?? {},
    source: opts.source,
  });
  if (error) console.error(JSON.stringify({ level: 'warn', msg: 'event_publish_failed', error: error.message }));
}
