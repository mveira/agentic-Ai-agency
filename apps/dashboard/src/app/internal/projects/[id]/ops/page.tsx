'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Props {
  params: { id: string };
}

interface ReadinessReport {
  projectId: string;
  phase: string;
  status: 'READY' | 'BLOCKED' | 'NEEDS_HUMAN' | 'NOT_APPLICABLE';
  reasons: string[];
  gates: {
    requirementsApproved?: boolean;
    assumptionsAllApproved?: boolean;
    proposalExists?: boolean;
    proposalReviewApproved?: boolean;
    budgetOk?: boolean;
    integrationsOk?: boolean;
  };
  nextAllowedActions: { action: string; owner: 'agent' | 'human'; details?: string }[];
  suggestedAutomations: { action: string; when: string }[];
  updatedAt: string;
}

interface Blocker {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

interface OpsSummary {
  projectId: string;
  phase: string;
  completion: { percent: number; completedTasks: number; totalTasks: number };
  costs: { totalUsd: number; last24hUsd?: number };
  health: { queueDepth: number; lastProcessedAt: string; errorRate: number };
  topBlockers: Blocker[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STATUS_COLORS: Record<string, string> = {
  READY: '#22c55e',
  BLOCKED: '#ef4444',
  NEEDS_HUMAN: '#f59e0b',
  NOT_APPLICABLE: '#6b7280',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export default function OpsPage({ params }: Props) {
  const projectId = params.id;
  const [phase, setPhase] = useState<string>('PROPOSAL');
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [ops, setOps] = useState<OpsSummary | null>(null);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [readinessRes, opsRes, blockersRes] = await Promise.all([
          fetch(`${API_BASE}/api/internal/projects/${projectId}/readiness?phase=${phase}`),
          fetch(`${API_BASE}/api/internal/projects/${projectId}/ops?phase=${phase}`),
          fetch(`${API_BASE}/api/internal/projects/${projectId}/blockers`),
        ]);

        if (readinessRes.ok) setReadiness(await readinessRes.json());
        if (opsRes.ok) setOps(await opsRes.json());
        if (blockersRes.ok) {
          const data = await blockersRes.json();
          setBlockers(data.blockers ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [projectId, phase]);

  const phases = ['INTAKE', 'CLARIFICATION', 'REQUIREMENTS', 'PROPOSAL', 'BUILD', 'SUPPORT'];

  return (
    <main style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <nav style={{ marginBottom: '1.5rem' }}>
        <Link href={`/projects/${projectId}`} style={{ color: '#6366f1', textDecoration: 'none' }}>
          &larr; Back to project
        </Link>
      </nav>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Project Operations
      </h1>
      <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Internal readiness, blockers, and health — agency only
      </p>

      {/* Phase Selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 600, marginRight: '0.5rem' }}>
          Phase:
        </label>
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          style={{
            padding: '0.375rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}
        >
          {phases.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {loading && <p style={{ color: '#888' }}>Loading...</p>}
      {error && <p style={{ color: '#ef4444' }}>Error: {error}</p>}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Readiness Badge */}
          {readiness && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Readiness</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#fff',
                  backgroundColor: STATUS_COLORS[readiness.status] ?? '#6b7280',
                }}>
                  {readiness.status}
                </span>
                <span style={{ color: '#666', fontSize: '0.875rem' }}>
                  Phase: {readiness.phase}
                </span>
              </div>
              {readiness.reasons.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#444', fontSize: '0.875rem' }}>
                  {readiness.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </section>
          )}

          {/* Gates Checklist */}
          {readiness && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Gates</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {Object.entries(readiness.gates).map(([gate, value]) => (
                  <div key={gate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ color: value ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                      {value ? '✓' : '✗'}
                    </span>
                    <span>{formatGateName(gate)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Blockers */}
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Blockers ({blockers.length})</h2>
            {blockers.length === 0 ? (
              <p style={{ color: '#888', fontSize: '0.875rem' }}>No blockers detected.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {blockers.map((b, i) => (
                  <div key={i} style={{
                    padding: '0.5rem 0.75rem',
                    borderLeft: `3px solid ${SEVERITY_COLORS[b.severity] ?? '#6b7280'}`,
                    backgroundColor: '#f9fafb',
                    borderRadius: '0 4px 4px 0',
                    fontSize: '0.875rem',
                  }}>
                    <span style={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: SEVERITY_COLORS[b.severity] ?? '#6b7280',
                      textTransform: 'uppercase',
                      marginRight: '0.5rem',
                    }}>
                      {b.severity}
                    </span>
                    <span style={{ color: '#444' }}>{b.message}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Next Actions */}
          {readiness && readiness.nextAllowedActions.length > 0 && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Next Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {readiness.nextAllowedActions.map((a, i) => (
                  <div key={i} style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: a.owner === 'human' ? '#fef3c7' : '#dbeafe',
                      color: a.owner === 'human' ? '#92400e' : '#1e40af',
                    }}>
                      {a.owner}
                    </span>
                    <span>{a.action}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Costs */}
          {ops && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Costs</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Total</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>${ops.costs.totalUsd.toFixed(2)}</div>
                </div>
                {ops.costs.last24hUsd !== undefined && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Last 24h</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>${ops.costs.last24hUsd.toFixed(2)}</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Health */}
          {ops && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Health</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Queue Depth</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{ops.health.queueDepth}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Error Rate</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {(ops.health.errorRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>Completion</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {ops.completion.percent}% ({ops.completion.completedTasks}/{ops.completion.totalTasks})
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

const sectionStyle: React.CSSProperties = {
  padding: '1rem',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  backgroundColor: '#fff',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 700,
  marginBottom: '0.75rem',
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

function formatGateName(gate: string): string {
  return gate
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
