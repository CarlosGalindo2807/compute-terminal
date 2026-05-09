import { Nav } from '@/components/nav';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function sendMagicLink(formData: FormData) {
  'use server';
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase env missing');

  const cookieStore = await cookies();
  const h = await headers();
  const origin = h.get('origin') ?? `http://localhost:3000`;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet: { name: string; value: string; options?: Record<string, unknown> }[]) =>
        toSet.forEach((c) => cookieStore.set(c.name, c.value, c.options)),
    },
  });
  await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/dashboard` },
  });
  redirect(`/login?sent=${encodeURIComponent(email)}`);
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md px-6 py-20">
        <h1 className="display text-3xl">Sign in</h1>
        <p className="mt-2 text-sm text-ink-secondary">A magic link will be emailed to you.</p>
        <form action={sendMagicLink} className="mt-6 space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="you@company.com"
            className="w-full rounded border border-bg-border bg-bg-surface px-3 py-2 mono text-sm"
          />
          <button type="submit" className="w-full rounded border border-accent bg-accent py-2 text-bg-base hover:opacity-90">
            Send magic link
          </button>
        </form>
        {sp.sent && <p className="mt-4 text-sm text-signal-pos">Check {sp.sent} for a sign-in link.</p>}
      </main>
    </>
  );
}
