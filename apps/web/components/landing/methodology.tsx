// "Methodology you can cite in a board deck." — the page-an-auditor-reads
// teaser. Formula box is static; version history is real, fetched from
// methodology_versions (public-read via migration 010 RLS policy).

import { getServiceClient } from '@/lib/supabase-server';

type VersionRow = {
  version: string;
  effective_from: string;
  effective_to: string | null;
  rationale: string | null;
  approved_at: string | null;
};

async function loadVersions(): Promise<VersionRow[]> {
  try {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from('methodology_versions')
      .select('version, effective_from, effective_to, rationale, approved_at')
      .order('effective_from', { ascending: false });
    if (error || !data) return [];
    return data as VersionRow[];
  } catch {
    return [];
  }
}

function statusForRow(r: VersionRow): string {
  if (r.effective_to === null) return 'locked';
  return 'superseded';
}

export async function Methodology() {
  const versions = await loadVersions();

  return (
    <section className="section" id="methodology">
      <div className="section-tag">03 · The page an auditor reads</div>
      <h2>
        Methodology you can
        <br />
        cite in a board deck.
      </h2>

      <div className="method-grid">
        <div>
          <p className="lede" style={{ marginBottom: 24 }}>
            A filtered volume-weighted average across distinct providers, weighted by num_gpus,
            with a minimum-breadth quorum. Version-locked. All changes pass a 30-day public
            comment period and are recorded on every chart that references the affected window.
          </p>

          <div className="formula-box">
            <div className="label">FORMULA · CTI v1.0</div>
            <div className="formula">
              <em>cti(t)</em> = Σᵢ ( pᵢ(t) · vᵢ(t) ) / Σᵢ vᵢ(t)
            </div>
            <div className="note">where i ∈ providers, |i| ≥ 3, pᵢ filtered for outliers (MAD &gt; 3σ)</div>
            <div className="params">
              <span>
                <span className="pk">outlier_filter</span> mad_3_sigma
              </span>
              <span>
                <span className="pk">window</span> 24h_trailing
              </span>
              <span>
                <span className="pk">weight</span> num_gpus
              </span>
              <span>
                <span className="pk">cadence</span> 5min
              </span>
            </div>
          </div>
        </div>

        <div className="versions-card">
          <div className="versions-head">
            <span>VERSION HISTORY</span>
            <span>
              {versions.length} {versions.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          {versions.length === 0 ? (
            <div className="versions-row">
              <div className="v-note" style={{ color: 'var(--ink-mute)' }}>
                Version history is currently unavailable. See <a href="/methodology" style={{ color: 'var(--accent)' }}>/methodology</a>{' '}
                for the live record.
              </div>
            </div>
          ) : (
            versions.map((v) => (
              <div key={v.version} className="versions-row">
                <div className="vr-head">
                  <span className="v-id">{v.version}</span>
                  <span className="v-meta">
                    {v.effective_from} · {statusForRow(v)}
                  </span>
                </div>
                <div className="v-note">{v.rationale ?? '—'}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
