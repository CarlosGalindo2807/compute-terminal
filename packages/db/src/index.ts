import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type { Database, Tables, Enums } from './types.js';

let serviceClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

export function getAnonClient(): SupabaseClient {
  if (anonClient) return anonClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY');
  anonClient = createClient(url, key);
  return anonClient;
}
