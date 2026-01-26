import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  portalRouter,
  clarificationRouter,
  requirementsRouter,
  reviewsRouter,
} from './portal.js';
import type {
  LeadIntake,
  ClarificationSession,
  RequirementsVersion,
  ReviewStatus,
  UnderstandingSummary,
} from './portal.js';

const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

function createTestApp() {
  const app = new Hono();
  app.route('/api/projects', portalRouter);
  app.route('/api/clarification', clarificationRouter);
  app.route('/api/requirements', requirementsRouter);
  app.route('/api/reviews', reviewsRouter);
  return app;
}

describe('GET /api/projects/:id/intakes/:leadIntakeId', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns intake with correct shape', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/intakes/intake-001`
    );

    expect(res.status).toBe(200);
    const body: LeadIntake = await res.json();
    expect(body.id).toBe('intake-001');
    expect(body.projectId).toBe(TEST_PROJECT_ID);
    expect(body.source).toBeDefined();
    expect(body.submittedAt).toBeDefined();
    expect(body.fields.length).toBeGreaterThan(0);
    expect(body.fields[0]).toHaveProperty('label');
    expect(body.fields[0]).toHaveProperty('value');
    expect(body.status).toBe('received');
  });
});

describe('GET /api/clarification/sessions/:sessionId', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns session with all input types', async () => {
    const res = await app.request('/api/clarification/sessions/session-001');

    expect(res.status).toBe(200);
    const body: ClarificationSession = await res.json();
    expect(body.id).toBe('session-001');
    expect(body.status).toBe('in_progress');
    expect(body.questions.length).toBeGreaterThan(0);

    const inputTypes = body.questions.map((q) => q.inputType);
    expect(inputTypes).toContain('short_text');
    expect(inputTypes).toContain('multi_select');
    expect(inputTypes).toContain('single_select');
    expect(inputTypes).toContain('long_text');
    expect(inputTypes).toContain('number');
    expect(inputTypes).toContain('date');
  });

  it('questions have required fields', async () => {
    const res = await app.request('/api/clarification/sessions/session-001');
    const body: ClarificationSession = await res.json();

    for (const q of body.questions) {
      expect(q.id).toBeDefined();
      expect(q.text).toBeDefined();
      expect(q.inputType).toBeDefined();
      expect(typeof q.required).toBe('boolean');
    }
  });

  it('multi_select and single_select have options', async () => {
    const res = await app.request('/api/clarification/sessions/session-001');
    const body: ClarificationSession = await res.json();

    const selectQuestions = body.questions.filter(
      (q) => q.inputType === 'multi_select' || q.inputType === 'single_select'
    );

    for (const q of selectQuestions) {
      expect(q.options).toBeDefined();
      expect(q.options!.length).toBeGreaterThan(0);
    }
  });
});

describe('POST /api/clarification/sessions/:sessionId/answers', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns understanding summary on valid answers', async () => {
    const res = await app.request(
      '/api/clarification/sessions/session-001/answers',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: [
            { questionId: 'q-1', value: 'Small business owners' },
            { questionId: 'q-2', value: ['SEO', 'PPC Advertising'] },
            { questionId: 'q-3', value: 'Lead Generation' },
            { questionId: 'q-5', value: 3000 },
            { questionId: 'q-6', value: '2026-02-15' },
          ],
        }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; understanding: UnderstandingSummary };
    expect(body.success).toBe(true);
    expect(body.understanding).toBeDefined();
    expect(body.understanding.summary.length).toBeGreaterThan(0);
    expect(typeof body.understanding.confidence).toBe('number');
    expect(typeof body.understanding.followUpNeeded).toBe('boolean');
  });

  it('rejects when required answers missing', async () => {
    const res = await app.request(
      '/api/clarification/sessions/session-001/answers',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: [
            { questionId: 'q-1', value: 'Test' },
            // Missing q-2, q-3, q-5, q-6 which are required
          ],
        }),
      }
    );

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; missingQuestions: string[] };
    expect(body.success).toBe(false);
    expect(body.missingQuestions.length).toBeGreaterThan(0);
  });
});

describe('GET /api/requirements/:versionId', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns requirements with correct shape', async () => {
    const res = await app.request('/api/requirements/v1.0');

    expect(res.status).toBe(200);
    const body: RequirementsVersion = await res.json();
    expect(body.versionId).toBe('v1.0');
    expect(body.status).toBe('pending_confirmation');
    expect(body.requirements.length).toBeGreaterThan(0);
    expect(body.assumptions.length).toBeGreaterThan(0);
  });

  it('requirements have expected fields', async () => {
    const res = await app.request('/api/requirements/v1.0');
    const body: RequirementsVersion = await res.json();

    for (const req of body.requirements) {
      expect(req.id).toBeDefined();
      expect(req.category).toBeDefined();
      expect(req.description).toBeDefined();
      expect(['must-have', 'should-have', 'nice-to-have']).toContain(req.priority);
    }
  });

  it('assumptions have expected fields', async () => {
    const res = await app.request('/api/requirements/v1.0');
    const body: RequirementsVersion = await res.json();

    for (const asn of body.assumptions) {
      expect(asn.id).toBeDefined();
      expect(asn.text).toBeDefined();
      expect(['pending', 'approved', 'rejected']).toContain(asn.status);
    }
  });
});

describe('POST /api/requirements/:versionId/confirm', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns confirmed when all approved', async () => {
    const res = await app.request('/api/requirements/v1.0/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirements: [
          { id: 'req-1', confirmed: true },
          { id: 'req-2', confirmed: true },
        ],
        assumptions: [
          { id: 'asn-1', status: 'approved' },
          { id: 'asn-2', status: 'approved' },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; status: string; confirmedCount: number };
    expect(body.success).toBe(true);
    expect(body.status).toBe('confirmed');
    expect(body.confirmedCount).toBe(2);
  });

  it('returns regenerating when requirements rejected', async () => {
    const res = await app.request('/api/requirements/v1.0/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirements: [
          { id: 'req-1', confirmed: true },
          { id: 'req-2', confirmed: false, changeNote: 'Need different layout' },
        ],
        assumptions: [
          { id: 'asn-1', status: 'approved' },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; status: string };
    expect(body.success).toBe(true);
    expect(body.status).toBe('regenerating');
  });

  it('returns regenerating when assumptions rejected', async () => {
    const res = await app.request('/api/requirements/v1.0/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirements: [{ id: 'req-1', confirmed: true }],
        assumptions: [
          { id: 'asn-1', status: 'rejected', comment: 'Not minimal, want bold design' },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; status: string };
    expect(body.status).toBe('regenerating');
  });
});

describe('GET /api/reviews/:versionId', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns review status with correct shape', async () => {
    const res = await app.request('/api/reviews/v1.0');

    expect(res.status).toBe(200);
    const body: ReviewStatus = await res.json();
    expect(body.versionId).toBe('v1.0');
    expect(body.status).toBe('in_review');
    expect(typeof body.requirementsConfirmed).toBe('number');
    expect(typeof body.requirementsTotal).toBe('number');
    expect(typeof body.assumptionsApproved).toBe('number');
    expect(typeof body.assumptionsTotal).toBe('number');
    expect(Array.isArray(body.blockers)).toBe(true);
    expect(body.timeline.length).toBeGreaterThan(0);
  });

  it('timeline events have expected fields', async () => {
    const res = await app.request('/api/reviews/v1.0');
    const body: ReviewStatus = await res.json();

    for (const event of body.timeline) {
      expect(event.event).toBeDefined();
      expect(['done', 'in_progress', 'pending']).toContain(event.status);
    }
  });
});
