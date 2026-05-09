// Service-role client for server-side reads (RLS off on public tables in v0).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _sb: SupabaseClient | null = null;
export function getServiceClient(): SupabaseClient {
  if (_sb) return _sb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env (URL or SERVICE_ROLE_KEY)');
  _sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _sb;
}
