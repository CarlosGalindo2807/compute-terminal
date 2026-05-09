import { Nav } from '@/components/nav';
import { getServiceClient } from '@/lib/supabase-server';
import { PUBLISHED_METHODOLOGY, PUBLISHED_METHODOLOGY_VERSION } from '@compute-terminal/shared/methodology';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface Version {
  version: string;
  formula_id: string;
  formula_params: Record<string, unknown> | null;
  effective_from: string;
  effective_to: string | null;
  rationale: string | null;
  approved_by: string | null;
  approved_at: string | null;
  document_url: string | null;
}

async function loadVersionHistory(): Promise<Version[]> {
  const sb = getServiceClient();
  const { data } = await sb
    .from('methodology_versions')
    .select('version, formula_id, formula_params, effective_from, effective_to, rationale, approved_by, approved_at, document_url')
    .order('effective_from', { ascending: false });
  return (data ?? []) as Version[];
}

export default async function MethodologyPage() {
  const versions = await loadVersionHistory();
  const current = versions.find((v) => v.version === PUBLISHED_METHODOLOGY_VERSION) ?? null;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="mono text-2xs uppercase tracking-[0.2em] text-ink-muted">
          Index Methodology · published spec
        </p>
        <h1 className="display mt-3 text-5xl leading-[0.95] tracking-tight">
          The formula behind <span className="italic text-accent">CTI</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-secondary">
          The Compute Terminal Index (CTI) is computed from a deterministic
          formula. The formula is published here, version-controlled, and only
          changes through review by the Index Committee. No model picks the
          formula — humans do, on a scheduled cadence, against documented
          criteria.
        </p>

        {/* ─── Active version banner ─── */}
        <section className="mt-12 rounded border border-bg-border bg-bg-surface p-6">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="mono text-2xs uppercase tracking-widest text-ink-muted">
                Currently in force
              </div>
              <div className="display mt-1 text-3xl">
                Methodology {PUBLISHED_METHODOLOGY_VERSION}
              </div>
              <div className="mono mt-1 text-sm text-accent">
                {PUBLISHED_METHODOLOGY.formulaId} · filtered VWAP, 24h window
              </div>
            </div>
            <div className="text-right">
              <div className="mono text-2xs uppercase tracking-widest text-ink-muted">
                Effective from
              </div>
              <div className="mono mt-1 text-lg">
                {current?.effective_from ?? '—'}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Formula ─── */}
        <section className="mt-12">
          <h2 className="display text-2xl">Formula</h2>
          <p className="mt-3 text-ink-secondary">
            For each compute index <span className="mono">I</span>, the published
            value at day <span className="mono">t</span> is a volume-weighted
            average price across all eligible offers in the last 24 hours,
            filtered to remove statistical outliers:
          </p>

          <div className="mono mt-6 overflow-x-auto rounded border border-bg-border bg-bg-surface p-6 text-sm leading-relaxed">
            <div>{`Index_I,t  =  Σ (p_i · q_i)  /  Σ q_i        for i ∈ E_t`}</div>
            <div className="mt-4 text-ink-muted">where</div>
            <div className="mt-2">{`  p_i  =  price per GPU-hour, USD, of offer i`}</div>
            <div>{`  q_i  =  num_gpus of offer i (volume weight)`}</div>
            <div>{`  E_t  =  { i  :  i ∈ W_t  ∧  is_normalized(i)  ∧  ¬is_outlier(i)`}</div>
            <div>{`                 ∧  reliability(provider_i) ≥ ${PUBLISHED_METHODOLOGY.reliabilityFloor}`}</div>
            <div>{`                 ∧  gpu_model(i) ∈ I.universe }`}</div>
            <div>{`  W_t  =  observations captured in [t − ${PUBLISHED_METHODOLOGY.windowHours}h, t)`}</div>
          </div>

          <h3 className="display mt-10 text-xl">Outlier filter (MAD-3σ)</h3>
          <p className="mt-3 text-ink-secondary">
            An offer <span className="mono">i</span> is flagged as an outlier
            and excluded from <span className="mono">E_t</span> if its price
            deviates from the per-GPU-model median by more than three median
            absolute deviations:
          </p>
          <div className="mono mt-4 rounded border border-bg-border bg-bg-surface p-6 text-sm">
            <div>{`is_outlier(i)  ⇔  | p_i − median(P_g) |  >  3 · MAD(P_g)`}</div>
            <div className="mt-3 text-ink-muted">where</div>
            <div className="mt-1">{`  P_g  =  prices for the same gpu_model g, last 1 hour`}</div>
            <div>{`  MAD(X) = median( | x − median(X) | )`}</div>
          </div>
          <p className="mt-3 text-sm text-ink-muted">
            This is the same robust dispersion estimator used by S&amp;P GSCI
            and ICE settlement procedures. Outlier flags are written back to{' '}
            <span className="mono">price_snapshots.is_outlier</span> and are
            auditable per-snapshot.
          </p>

          <h3 className="display mt-10 text-xl">Eligibility floor</h3>
          <p className="mt-3 text-ink-secondary">
            Providers with <span className="mono">reliability_score &lt; {PUBLISHED_METHODOLOGY.reliabilityFloor}</span> are
            excluded entirely. Reliability is computed from observed scrape
            success rate and outlier ratio; it has no manual override. The
            current scores are visible at{' '}
            <a className="text-accent hover:underline" href="/admin/health">/admin/health</a>.
          </p>

          <h3 className="display mt-10 text-xl">Quorum</h3>
          <p className="mt-3 text-ink-secondary">
            If <span className="mono">|E_t| &lt; {PUBLISHED_METHODOLOGY.minObservations}</span>{' '}
            for a given index, no value is published for that day. We never
            extrapolate, never carry forward, and never fall back to a different
            formula. A <span className="mono">index_value_skipped</span> event is
            recorded instead.
          </p>
        </section>

        {/* ─── Index Committee ─── */}
        <section className="mt-16">
          <h2 className="display text-2xl">Index Committee</h2>
          <p className="mt-3 text-ink-secondary">
            The methodology above is locked. It can only change through a
            written decision of the Index Committee. The committee meets on a
            fixed schedule and follows this procedure:
          </p>
          <ol className="mt-6 space-y-4 text-ink-secondary">
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Step 1 · Research</span>
              <div className="mt-1">
                Five candidate formulas (simple VWAP, filtered VWAP, trimmed
                mean, reliability-weighted median, time-decay VWAP) are computed
                in parallel every night and stored in{' '}
                <span className="mono">index_methodology_experiments</span>.
                These results are research only. They never change the
                published value.
              </div>
            </li>
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Step 2 · Quarterly review</span>
              <div className="mt-1">
                Once per calendar quarter, the committee reviews 90 days of
                research output. A formula change is considered only if a
                non-published candidate beats the published one on a
                pre-registered composite score (consistency, volatility,
                coverage) by a sustained margin over the full window.
              </div>
            </li>
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Step 3 · Public notice</span>
              <div className="mt-1">
                If the committee proposes a change, the new version is
                published on this page with at least 30 days&apos; notice before
                taking effect. Settlement contracts referencing CTI are written
                against a specific version.
              </div>
            </li>
            <li className="border-l-2 border-bg-border pl-4">
              <span className="mono text-xs uppercase tracking-widest text-ink-muted">Step 4 · Effective date</span>
              <div className="mt-1">
                On the announced effective date, the new version becomes the
                published methodology. The version field on every{' '}
                <span className="mono">index_values_daily</span> row is
                version-stamped, so historical values remain reproducible.
              </div>
            </li>
          </ol>
          <p className="mt-6 text-sm text-ink-muted">
            Emergency changes (a discovered defect in the formula or a market
            regime shift requiring suspension) bypass the quarterly cadence but
            still require unanimous committee sign-off and a public notice on
            the day of the change.
          </p>
        </section>

        {/* ─── AI orchestration ─── */}
        <section className="mt-16">
          <h2 className="display text-2xl">AI orchestration</h2>
          <p className="mt-3 text-ink-secondary">
            The published formula is deterministic. Everything around it that
            keeps the data clean and current is run by autonomous agents. Each
            agent has a narrow job, an audit trail, and a circuit breaker:
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <AgentCard
              tag="Scraping agents"
              title="Per-marketplace scrapers"
              points={[
                'TypeScript-native scrapers run on Vercel Functions every 5 min, plus Python scrapers for HTML-heavy sources.',
                'Each run is wrapped in Inngest steps with automatic retry + exponential backoff and a per-provider dead-letter event on persistent failure.',
                'Schema-validated against a Zod parser; offers that don’t match the contract are dropped, not silently coerced.',
              ]}
            />
            <AgentCard
              tag="Quality control"
              title="Outlier detector + reliability scorer"
              points={[
                'Every 15 minutes, MAD-3σ outlier detection per GPU model writes is_outlier flags to price_snapshots.',
                'Provider reliability_score auto-decays on outlier ratio > 30%, recovers when stable for 7 days. No human edit.',
                'All adjustments emit provider_quality_degraded events with the ratio and new score that triggered the change.',
              ]}
            />
            <AgentCard
              tag="Normalization agent"
              title="Claude self-learning catalog"
              points={[
                'Unmatched GPU strings drain hourly through a Claude (Sonnet 4.6) batch with prompt caching.',
                'Confidence ≥ 0.95 → auto-resolves into a normalization_rule and back-fills snapshots.',
                '0.70 – 0.95 → queued at /admin/unmatched for one-click human approval.',
                'is_new_hardware flag triggers catalog expansion review.',
              ]}
            />
            <AgentCard
              tag="Discovery agent"
              title="Provider universe expander"
              points={[
                'Nightly Brave Search + Claude Opus assessment proposes new providers into provider_candidates.',
                'No new provider enters the index without admin approval. Discovery is autonomous; promotion is not.',
              ]}
            />
            <AgentCard
              tag="DevOps agent"
              title="System health + content publisher"
              points={[
                'Hourly system_health_metrics snapshot of snapshots_per_hour, unmatched_pending, outliers_per_hour, avg_provider_reliability.',
                'Daily brief generator drafts the post; publisher promotes it if not rejected within an hour. Engagement metrics flow back as priors.',
              ]}
            />
            <AgentCard
              tag="Index calculator"
              title="Locked-formula publisher"
              points={[
                'At 00:30 UTC every night, computes the published index using the locked formula above.',
                'In parallel, runs the 5-way A/B as research input only — never overrides what is published.',
                'If quorum is not met, publishes nothing. No fallback.',
              ]}
            />
          </div>
        </section>

        {/* ─── Version history ─── */}
        <section className="mt-16">
          <h2 className="display text-2xl">Version history</h2>
          {versions.length === 0 ? (
            <p className="mt-4 text-ink-muted">No versions recorded yet. Run migration 009.</p>
          ) : (
            <div className="mt-6 overflow-hidden rounded border border-bg-border">
              <table className="w-full text-sm tabular">
                <thead className="bg-bg-surface text-2xs uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Version</th>
                    <th className="px-4 py-3 text-left font-medium">Formula</th>
                    <th className="px-4 py-3 text-left font-medium">Effective</th>
                    <th className="px-4 py-3 text-left font-medium">Approved by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-border bg-bg-base">
                  {versions.map((v) => (
                    <tr key={v.version} className="align-top">
                      <td className="px-4 py-3 mono text-accent">{v.version}</td>
                      <td className="px-4 py-3 mono">{v.formula_id}</td>
                      <td className="px-4 py-3 mono">
                        {v.effective_from} {v.effective_to ? `→ ${v.effective_to}` : '→ present'}
                      </td>
                      <td className="px-4 py-3 text-ink-secondary">{v.approved_by ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-16 text-xs text-ink-muted">
          The methodology source is open: the formula lives in{' '}
          <span className="mono">packages/shared/src/methodology.ts</span> and the
          index calculator in{' '}
          <span className="mono">apps/workers/src/functions/index-calculator.ts</span>.
          Every published value is version-stamped in{' '}
          <span className="mono">index_values_daily.methodology_version</span>.
        </p>
      </main>
    </>
  );
}

function AgentCard({ tag, title, points }: { tag: string; title: string; points: string[] }) {
  return (
    <div className="rounded border border-bg-border bg-bg-surface p-5">
      <div className="mono text-2xs uppercase tracking-widest text-accent">{tag}</div>
      <div className="display mt-1 text-lg">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
        {points.map((p, i) => (
          <li key={i} className="leading-relaxed">{p}</li>
        ))}
      </ul>
    </div>
  );
}
