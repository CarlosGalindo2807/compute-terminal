import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { getCurrentUserEmail } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const email = await getCurrentUserEmail();
  if (!email) redirect('/login?next=/dashboard');
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="display text-3xl">Dashboard</h1>
        <p className="mt-2 text-sm text-ink-secondary">Signed in as <span className="mono">{email}</span>.</p>
        <p className="mt-4 text-sm text-ink-muted">
          Alerts and saved markets land here in v0.2 — for now check <a className="text-accent" href="/markets">the terminal</a>.
        </p>
      </main>
    </>
  );
}
