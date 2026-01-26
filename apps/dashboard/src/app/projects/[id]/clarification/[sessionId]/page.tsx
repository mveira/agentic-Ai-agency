'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { QuestionField } from '@/components/QuestionField';
import type { ClarificationSession, UnderstandingSummary, AnswerPayload } from '@/types/portal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  params: { id: string; sessionId: string };
}

export default function ClarificationPage({ params }: Props) {
  const [session, setSession] = useState<ClarificationSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [understanding, setUnderstanding] = useState<UnderstandingSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/clarification/sessions/${params.sessionId}`)
      .then((res) => res.json())
      .then((data: ClarificationSession) => {
        setSession(data);
        // Pre-populate answers from existing data
        const existing: Record<string, string | string[] | number> = {};
        for (const q of data.questions) {
          if (q.answer !== null) {
            existing[q.id] = q.answer as string | string[] | number;
          }
        }
        setAnswers(existing);
        if (data.understanding) {
          setUnderstanding(data.understanding);
        }
      });
  }, [params.sessionId]);

  function handleChange(questionId: string, value: string | string[] | number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // Clear error when user provides answer
    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  }

  async function handleSubmit() {
    if (!session) return;

    // Validate required fields
    const newErrors: Record<string, string> = {};
    for (const q of session.questions) {
      if (!q.required) continue;
      const val = answers[q.id];
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        newErrors[q.id] = 'This field is required';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const payload: AnswerPayload[] = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }));

    try {
      const res = await fetch(
        `${API_URL}/api/clarification/sessions/${params.sessionId}/answers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: payload }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to submit answers');
        return;
      }

      if (data.understanding) {
        setUnderstanding(data.understanding);
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) {
    return (
      <main style={{ padding: '2rem' }}>
        <p>Loading session...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <nav style={{ marginBottom: '1rem' }}>
        <Link href={`/projects/${params.id}/proposal`}>← Back to Project</Link>
      </nav>

      <h1 style={{ marginBottom: '0.5rem' }}>Clarification Interview</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Answer the questions below to help us understand your requirements.
      </p>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Questions timeline */}
        <div style={{ flex: 2 }}>
          {session.questions.map((question, i) => (
            <div key={question.id} style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor:
                    answers[question.id] !== undefined ? '#38a169' : '#e2e8f0',
                  color: answers[question.id] !== undefined ? '#fff' : '#718096',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  flexShrink: 0,
                  marginTop: '12px',
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <QuestionField
                  question={question}
                  value={answers[question.id] ?? null}
                  onChange={handleChange}
                  error={errors[question.id]}
                />
              </div>
            </div>
          ))}

          {submitError && (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#fed7d7',
                color: '#9b2c2c',
                borderRadius: '6px',
                marginBottom: '1rem',
                fontSize: '14px',
              }}
            >
              {submitError}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
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
            {submitting ? 'Submitting...' : 'Submit Answers'}
          </button>
        </div>

        {/* Understanding summary panel */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              position: 'sticky',
              top: '2rem',
              padding: '16px',
              backgroundColor: '#f7fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>
              Understanding Summary
            </h3>

            {understanding ? (
              <>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', lineHeight: '1.6' }}>
                  {understanding.summary.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#718096' }}>
                  Confidence: {Math.round(understanding.confidence * 100)}%
                </div>
                {understanding.followUpNeeded && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: '#fefcbf',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    Follow-up questions may be needed
                  </div>
                )}
                <div style={{ marginTop: '1rem' }}>
                  <Link
                    href={`/projects/${params.id}/requirements/v1.0/confirm`}
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      backgroundColor: '#38a169',
                      color: '#fff',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    Continue to Requirements →
                  </Link>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: '#a0aec0' }}>
                Submit your answers to see the understanding summary.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
