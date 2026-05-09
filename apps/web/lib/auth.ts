// Tiny admin gate — env-listed emails only. Sufficient for v0.
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function getCurrentUserEmail(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

export function isAdmin(email: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}

export async function requireAdmin(): Promise<string> {
  const email = await getCurrentUserEmail();
  if (!isAdmin(email)) redirect('/login?next=/admin');
  return email!;
}
