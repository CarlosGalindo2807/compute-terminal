// Re-export every Inngest function from apps/workers via the Vercel-hosted /api/inngest endpoint.
// In dev, the standalone worker server (apps/workers/src/server.ts) hosts the same functions on :8787.

import { serve } from 'inngest/next';
import { functions, inngest } from '../../../../workers/src/inngest/config';

export const { GET, POST, PUT } = serve({ client: inngest, functions });
