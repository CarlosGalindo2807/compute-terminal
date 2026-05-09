import Link from 'next/link';
import { Nav } from '@/components/nav';
import { getServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function BlogPage() {
  const sb = getServiceClient();
  const { data: posts } = await sb
    .from('generated_content')
    .select('id, title, body, published_at, content_type')
    .eq('status', 'published')
    .in('content_type', ['daily_brief', 'blog_post'])
    .order('published_at', { ascending: false })
    .limit(40);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="display text-4xl">The Brief</h1>
        <p className="mt-1 text-ink-secondary">Daily compute-market notes.</p>
        <div className="mt-8 space-y-10">
          {(posts ?? []).map((p) => (
            <article key={p.id} className="border-b border-bg-border pb-8">
              <p className="mono text-2xs uppercase tracking-widest text-ink-muted">
                {p.published_at?.slice(0, 10)}
              </p>
              <h2 className="display mt-1 text-2xl">{p.title}</h2>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-primary">{p.body}</div>
            </article>
          ))}
          {!posts?.length && (
            <p className="text-ink-secondary">No posts yet — first daily brief lands at 09:00 UTC.</p>
          )}
        </div>
      </main>
    </>
  );
}
