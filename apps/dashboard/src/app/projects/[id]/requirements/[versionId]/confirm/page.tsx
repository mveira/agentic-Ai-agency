'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { RequirementsVersion, Requirement, Assumption } from '@/types/portal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  params: { id: string; versionId: string };
}

export default function RequirementsConfirmPage({ params }: Props) {
  const [data, setData] = useState<RequirementsVersion | null>(null);
  const [reqDecisions, setReqDecisions] = useState<Record<string, { confirmed: boolean; changeNote: string }>>({});
  const [asnDecisions, setAsnDecisions] = useState<Record<string, { status: 'approved' | 'rejected'; comment: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: string } | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/requirements/${params.versionId}`)
      .then((res) => res.json())
      .then((d: RequirementsVersion) => setData(d));
  }, [params.versionId]);

  function handleReqDecision(reqId: string, confirmed: boolean) {
    setReqDecisions((prev) => ({
      ...prev,
      [reqId]: { confirmed, changeNote: prev[reqId]?.changeNote ?? '' },
    }));
  }

  function handleReqNote(reqId: string, changeNote: string) {
    setReqDecisions((prev) => ({
      ...prev,
      [reqId]: { confirmed: prev[reqId]?.confirmed ?? false, changeNote },
    }));
  }

  function handleAsnDecision(asnId: string, status: 'approved' | 'rejected') {
    setAsnDecisions((prev) => ({
      ...prev,
      [asnId]: { status, comment: prev[asnId]?.comment ?? '' },
    }));
  }

  function handleAsnComment(asnId: string, comment: string) {
    setAsnDecisions((prev) => ({
      ...prev,
      [asnId]: { status: prev[asnId]?.status ?? 'approved', comment },
    }));
  }

  async function handleSubmit() {
    if (!data) return;
    setSubmitting(true);

    const requirements = data.requirements.map((r) => ({
      id: r.id,
      confirmed: reqDecisions[r.id]?.confirmed ?? true,
      changeNote: reqDecisions[r.id]?.changeNote || undefined,
    }));

    const assumptions = data.assumptions.map((a) => ({
      id: a.id,
      status: asnDecisions[a.id]?.status ?? 'approved',
      comment: asnDecisions[a.id]?.comment || undefined,
    }));

    try {
      const res = await fetch(`${API_URL}/api/requirements/${params.versionId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements, assumptions }),
      });

      const body = await res.json();
      setResult({ status: body.status });
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) {
    return (
      <main style={{ padding: '2rem' }}>
        <p>Loading requirements...</p>
      </main>
    );
  }

  if (result?.status === 'regenerating') {
    return (
      <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Regenerating Requirements...</h1>
        <p style={{ color: '#666' }}>
          Some items were rejected. The system is generating updated requirements based on your feedback.
        </p>
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#f7fafc',
            borderRadius: '8px',
            marginTop: '1rem',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⟳</div>
          <p style={{ color: '#718096' }}>This may take a moment...</p>
        </div>
      </main>
    );
  }

  if (result?.status === 'confirmed') {
    return (
      <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Requirements Confirmed</h1>
        <p style={{ color: '#38a169', fontWeight: 600 }}>
          All requirements and assumptions have been approved.
        </p>
        <Link
          href={`/projects/${params.id}/review/${params.versionId}`}
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            padding: '10px 20px',
            backgroundColor: '#3182ce',
            color: '#fff',
            borderRadius: '6px',
            textDecoration: 'none',
          }}
        >
          View Review Status →
        </Link>
      </main>
    );
  }

  const priorityColors: Record<string, string> = {
    'must-have': '#e53e3e',
    'should-have': '#d69e2e',
    'nice-to-have': '#718096',
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <nav style={{ marginBottom: '1rem' }}>
        <Link href={`/projects/${params.id}/proposal`}>← Back to Project</Link>
      </nav>

      <h1 style={{ marginBottom: '0.5rem' }}>Review Requirements</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Confirm each requirement is correct, or flag items that need changes.
      </p>

      {/* Requirements checklist */}
      <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Requirements</h2>
      {data.requirements.map((req: Requirement) => {
        const decision = reqDecisions[req.id];
        return (
          <div
            key={req.id}
            style={{
              padding: '12px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              marginBottom: '8px',
              backgroundColor: decision?.confirmed === false ? '#fff5f5' : '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: priorityColors[req.priority] || '#718096',
                    color: '#fff',
                    marginBottom: '4px',
                  }}
                >
                  {req.priority}
                </span>
                <span
                  style={{
                    marginLeft: '8px',
                    fontSize: '11px',
                    color: '#a0aec0',
                    textTransform: 'uppercase',
                  }}
                >
                  {req.category}
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '14px' }}>{req.description}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                <button
                  onClick={() => handleReqDecision(req.id, true)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #38a169',
                    borderRadius: '4px',
                    backgroundColor: decision?.confirmed === true ? '#38a169' : '#fff',
                    color: decision?.confirmed === true ? '#fff' : '#38a169',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  Correct
                </button>
                <button
                  onClick={() => handleReqDecision(req.id, false)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #e53e3e',
                    borderRadius: '4px',
                    backgroundColor: decision?.confirmed === false ? '#e53e3e' : '#fff',
                    color: decision?.confirmed === false ? '#fff' : '#e53e3e',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  Needs Change
                </button>
              </div>
            </div>
            {decision?.confirmed === false && (
              <textarea
                placeholder="What needs to change?"
                value={decision.changeNote}
                onChange={(e) => handleReqNote(req.id, e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        );
      })}

      {/* Assumptions list */}
      <h2 style={{ fontSize: '18px', marginTop: '2rem', marginBottom: '12px' }}>Assumptions</h2>
      {data.assumptions.map((asn: Assumption) => {
        const decision = asnDecisions[asn.id];
        return (
          <div
            key={asn.id}
            style={{
              padding: '12px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              marginBottom: '8px',
              backgroundColor: decision?.status === 'rejected' ? '#fff5f5' : '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: '14px', flex: 1 }}>{asn.text}</p>
              <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                <button
                  onClick={() => handleAsnDecision(asn.id, 'approved')}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #38a169',
                    borderRadius: '4px',
                    backgroundColor: decision?.status === 'approved' ? '#38a169' : '#fff',
                    color: decision?.status === 'approved' ? '#fff' : '#38a169',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAsnDecision(asn.id, 'rejected')}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #e53e3e',
                    borderRadius: '4px',
                    backgroundColor: decision?.status === 'rejected' ? '#e53e3e' : '#fff',
                    color: decision?.status === 'rejected' ? '#fff' : '#e53e3e',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
            {decision?.status === 'rejected' && (
              <textarea
                placeholder="Why is this assumption incorrect?"
                value={decision.comment}
                onChange={(e) => handleAsnComment(asn.id, e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        );
      })}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          marginTop: '1.5rem',
          padding: '12px 24px',
          backgroundColor: submitting ? '#a0aec0' : '#3182ce',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? 'Submitting...' : 'Confirm Requirements'}
      </button>
    </main>
  );
}
