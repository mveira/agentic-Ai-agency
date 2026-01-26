import Link from 'next/link';
import type { LeadIntake } from '@/types/portal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  params: { id: string; leadIntakeId: string };
}

async function getIntake(projectId: string, leadIntakeId: string): Promise<LeadIntake> {
  const res = await fetch(
    `${API_URL}/api/projects/${projectId}/intakes/${leadIntakeId}`,
    { cache: 'no-store' }
  );
  return res.json();
}

export default async function IntakePage({ params }: Props) {
  const intake = await getIntake(params.id, params.leadIntakeId);

  const statusColors: Record<string, string> = {
    received: '#3182ce',
    in_review: '#d69e2e',
    processed: '#38a169',
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <nav style={{ marginBottom: '1rem' }}>
        <Link href={`/projects/${params.id}/proposal`}>← Back to Project</Link>
      </nav>

      <h1 style={{ marginBottom: '0.5rem' }}>Discovery Received</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Lead intake from <strong>{intake.source}</strong>
      </p>

      <div
        style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '12px',
          backgroundColor: statusColors[intake.status] || '#718096',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
        }}
      >
        {intake.status.replace('_', ' ')}
      </div>

      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f7fafc' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: '14px' }}>
                Field
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: '14px' }}>
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {intake.fields.map((field, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 16px', fontWeight: 500, fontSize: '14px', color: '#4a5568' }}>
                  {field.label}
                </td>
                <td style={{ padding: '10px 16px', fontSize: '14px' }}>
                  {field.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ color: '#a0aec0', fontSize: '12px', marginTop: '1rem' }}>
        Submitted: {new Date(intake.submittedAt).toLocaleString()}
      </p>

      <div style={{ marginTop: '2rem' }}>
        <Link
          href={`/projects/${params.id}/clarification/session-001`}
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#3182ce',
            color: '#fff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Start Clarification Interview →
        </Link>
      </div>
    </main>
  );
}
