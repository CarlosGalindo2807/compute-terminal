import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdmin();
  return (
    <div className="min-h-screen bg-bg-base">
      <header className="border-b border-bg-border bg-bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="display text-xl">Admin</Link>
            <nav className="flex gap-5 mono text-2xs uppercase tracking-wider text-ink-secondary">
              <Link href="/admin" className="hover:text-ink-primary">Overview</Link>
              <Link href="/admin/unmatched" className="hover:text-ink-primary">Unmatched</Link>
              <Link href="/admin/providers" className="hover:text-ink-primary">Providers</Link>
              <Link href="/admin/content" className="hover:text-ink-primary">Content</Link>
              <Link href="/admin/events" className="hover:text-ink-primary">Events</Link>
              <Link href="/admin/health" className="hover:text-ink-primary">Health</Link>
            </nav>
          </div>
          <div className="mono text-2xs text-ink-muted">{email}</div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
