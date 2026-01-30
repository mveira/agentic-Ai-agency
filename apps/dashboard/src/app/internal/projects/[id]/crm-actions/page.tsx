'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Props {
  params: { id: string };
}

interface CRMAction {
  id: string;
  projectId: string;
  contactId: string;
  actionType: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'APPLIED' | 'FAILED';
  reason: string;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPLIED: '#22c55e',
  FAILED: '#ef4444',
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  MOVE_STAGE: 'Move Stage',
  TRIGGER_WORKFLOW: 'Trigger Workflow',
  ADD_NOTE: 'Add Note',
};

export default function CRMActionsPage({ params }: Props) {
  const projectId = params.id;
  const [actions, setActions] = useState<CRMAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/internal/projects/${projectId}/crm-actions`);
        if (res.ok) {
          const data = await res.json();
          setActions(data.actions ?? []);
        } else {
          setError(`Failed to load: ${res.status}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [projectId]);

  return (
    <main style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <nav style={{ marginBottom: '1.5rem' }}>
        <Link href={`/internal/projects/${projectId}/ops`} style={{ color: '#6366f1', textDecoration: 'none' }}>
          &larr; Back to ops
        </Link>
      </nav>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        CRM Action Contracts
      </h1>
      <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Pending CRM actions produced by the pipeline router — agency only
      </p>

      {loading && <p style={{ color: '#888' }}>Loading...</p>}
      {error && <p style={{ color: '#ef4444' }}>Error: {error}</p>}

      {!loading && !error && actions.length === 0 && (
        <p style={{ color: '#888', fontSize: '0.875rem' }}>No CRM action contracts found.</p>
      )}

      {!loading && !error && actions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {actions.map((action) => (
            <section key={action.id} style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#fff',
                  backgroundColor: STATUS_COLORS[action.status] ?? '#6b7280',
                }}>
                  {action.status}
                </span>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {ACTION_TYPE_LABELS[action.actionType] ?? action.actionType}
                </span>
                {'targetStage' in action.payload && (
                  <span style={{ fontSize: '0.875rem', color: '#6366f1' }}>
                    → {String(action.payload.targetStage)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#444', marginBottom: '0.25rem' }}>
                {action.reason}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>
                {new Date(action.createdAt).toLocaleString()}
              </div>
            </section>
          ))}
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
