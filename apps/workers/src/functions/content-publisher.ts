// Hourly: promote any approved or untouched draft past its scheduled_for to
// 'published'. Auto-publish only happens for items still in 'draft' status —
// admin can flip to 'rejected' before the time hits to block.

import { getServiceClient } from '@compute-terminal/db';
import { inngest } from '../inngest/client.js';
import { publishEvent } from '../inngest/publish-event.js';

export const contentPublisher = inngest.createFunction(
  { id: 'content-publisher', name: 'Publish scheduled content' },
  { cron: '5 * * * *' },
  async () => {
    const sb = getServiceClient();
    const nowIso = new Date().toISOString();

    const { data: due } = await sb
      .from('generated_content')
      .select('id, content_type, channels, body, title')
      .in('status', ['draft', 'approved'])
      .lte('scheduled_for', nowIso)
      .limit(20);

    if (!due || due.length === 0) return { published: 0 };

    let published = 0;
    for (const item of due) {
      // Real channel pushes (Twitter, LinkedIn, Resend) are wired in apps/workers/src/channels/.
      // For v0 we just mark published — the UI surfaces /blog drafts immediately.
      await sb
        .from('generated_content')
        .update({ status: 'published', published_at: nowIso })
        .eq('id', item.id);
      await publishEvent({
        event_type: 'content_published',
        entity_type: 'generated_content',
        entity_id: item.id,
        payload: { type: item.content_type, channels: item.channels, title: item.title },
        source: 'worker:content-publisher',
      });
      published++;
    }
    return { published };
  },
);
