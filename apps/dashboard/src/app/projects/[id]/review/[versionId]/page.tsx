import Link from 'next/link';
import type { ReviewStatus } from '@/types/portal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  params: { id: string; versionId: string };
}

async function getReview(versionId: string): Promise<ReviewStatus> {
  const res = await fetch(`${API_URL}/api/reviews/${versionId}`, {
    cache: 'no-store',
  });
  return res.json();
}

export default async function ReviewPage({ params }: Props) {
  const review = await getReview(params.versionId);

  const statusColors: Record<string, string> = {
    in_review: '#d69e2e',
    approved: '#38a169',
    changes_requested: '#e53e3e',
  };

  const timelineStatusColors: Record<string, string> = {
    done: '#38a169',
    in_progress: '#3182ce',
    pending: '#a0aec0',
  };

  const reqPercent =
    review.requirementsTotal > 0
      ? Math.round((review.requirementsConfirmed / review.requirementsTotal) * 100)
      : 0;

  const asnPercent =
    review.assumptionsTotal > 0
      ? Math.round((review.assumptionsApproved / review.assumptionsTotal) * 100)
      : 0;

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <nav style={{ marginBottom: '1rem' }}>
        <Link href={`/projects/${params.id}/proposal`}>← Back to Project</Link>
      </nav>

      <h1 style={{ marginBottom: '0.5rem' }}>Review Status</h1>
      <div
        style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '12px',
          backgroundColor: statusColors[review.status] || '#718096',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
        }}
      >
        {review.status.replace(/_/g, ' ')}
      </div>

      {/* Progress cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div
          style={{
            flex: 1,
            padding: '16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px', fontWeight: 600 }}>
            REQUIREMENTS
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>
            {review.requirementsConfirmed}/{review.requirementsTotal}
          </div>
          <div
            style={{
              marginTop: '8px',
              height: '6px',
              backgroundColor: '#e2e8f0',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${reqPercent}%`,
                backgroundColor: '#38a169',
                borderRadius: '3px',
              }}
            />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            padding: '16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px', fontWeight: 600 }}>
            ASSUMPTIONS
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>
            {review.assumptionsApproved}/{review.assumptionsTotal}
          </div>
          <div
            style={{
              marginTop: '8px',
              height: '6px',
              backgroundColor: '#e2e8f0',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${asnPercent}%`,
                backgroundColor: '#3182ce',
                borderRadius: '3px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Blockers */}
      {review.blockers.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fff5f5',
            border: '1px solid #fed7d7',
            borderRadius: '8px',
            marginBottom: '2rem',
          }}
        >
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: '#e53e3e' }}>
            Blockers
          </h3>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px' }}>
            {review.blockers.map((blocker, i) => (
              <li key={i}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Timeline */}
      <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Timeline</h2>
      <div style={{ position: 'relative', paddingLeft: '24px' }}>
        {review.timeline.map((event, i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              paddingBottom: i < review.timeline.length - 1 ? '24px' : '0',
              paddingLeft: '16px',
              borderLeft:
                i < review.timeline.length - 1
                  ? '2px solid #e2e8f0'
                  : '2px solid transparent',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '-7px',
                top: '2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: timelineStatusColors[event.status] || '#a0aec0',
                border: '2px solid #fff',
              }}
            />
            <div style={{ fontSize: '14px', fontWeight: 500 }}>{event.event}</div>
            {event.timestamp && (
              <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>
                {new Date(event.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '12px' }}>
        <Link
          href={`/projects/${params.id}/requirements/${params.versionId}/confirm`}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3182ce',
            color: '#fff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          Edit Confirmations
        </Link>
      </div>
    </main>
  );
}
