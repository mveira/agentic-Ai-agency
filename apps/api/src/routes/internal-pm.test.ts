import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { internalPMRouter, knowledgeStore, proposalStore } from './internal-pm.js';

const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

function createTestApp() {
  const app = new Hono();
  app.route('/api/internal/projects', internalPMRouter);
  return app;
}

// Clear shared stores between tests to prevent state leakage
beforeEach(() => {
  knowledgeStore.clear();
  proposalStore.clear();
});

// ─── Readiness ────────────────────────────────────────────────────────────────

describe('GET /api/internal/projects/:projectId/readiness', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns ProjectReadinessReport with valid structure', async () => {
    const res = await app.request(
      `/api/internal/projects/${TEST_PROJECT_ID}/readiness?phase=INTAKE`
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.projectId).toBe(TEST_PROJECT_ID);
    expect(body.phase).toBe('INTAKE');
    expect(body.status).toBeDefined();
    expect(body.reasons).toBeDefined();
    expect(Array.isArray(body.reasons)).toBe(true);
    expect(body.gates).toBeDefined();
    expect(body.nextAllowedActions).toBeDefined();
    expect(Array.isArray(body.nextAllowedActions)).toBe(true);
    expect(body.suggestedAutomations).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it('returns BLOCKED for phase=PROPOSAL when no requirements (empty KB store)', async () => {
    const res = await app.request(
      `/api/internal/projects/${TEST_PROJECT_ID}/readiness?phase=PROPOSAL`
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.phase).toBe('PROPOSAL');
    expect(body.status).toBe('BLOCKED');
    expect(body.reasons.length).toBeGreaterThan(0);
    expect(body.reasons.some((r: string) => r.includes('Requirements'))).toBe(true);
  });

  it('returns READY for phase=INTAKE regardless', async () => {
    const res = await app.request(
      `/api/internal/projects/${TEST_PROJECT_ID}/readiness?phase=INTAKE`
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.phase).toBe('INTAKE');
    expect(body.status).toBe('READY');
  });

  it('validates phase param (rejects invalid phase)', async () => {
    const res = await app.request(
      `/api/internal/projects/${TEST_PROJECT_ID}/readiness?phase=INVALID_PHASE`
    );

    expect(res.status).toBe(400);
  });
});

// ─── Ops Summary ──────────────────────────────────────────────────────────────

describe('GET /api/internal/projects/:projectId/ops', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns ProjectOpsSummary with valid structure', async () => {
    const res = await app.request(
      `/api/internal/projects/${TEST_PROJECT_ID}/ops?phase=PROPOSAL`
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.projectId).toBe(TEST_PROJECT_ID);
    expect(body.phase).toBe('PROPOSAL');
    expect(body.completion).toBeDefined();
    expect(body.completion.percent).toBeDefined();
    expect(body.completion.completedTasks).toBeDefined();
    expect(body.completion.totalTasks).toBeDefined();
    expect(body.costs).toBeDefined();
    expect(body.costs.totalUsd).toBeDefined();
    expect(body.health).toBeDefined();
    expect(body.health.queueDepth).toBeDefined();
    expect(body.health.errorRate).toBeDefined();
    expect(body.topBlockers).toBeDefined();
    expect(Array.isArray(body.topBlockers)).toBe(true);
  });
});

// ─── Blockers ─────────────────────────────────────────────────────────────────

describe('GET /api/internal/projects/:projectId/blockers', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns array of blockers', async () => {
    const res = await app.request(
      `/api/internal/projects/${TEST_PROJECT_ID}/blockers`
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.blockers).toBeDefined();
    expect(Array.isArray(body.blockers)).toBe(true);
  });

  it('returns MISSING_APPROVAL when no approved requirements', async () => {
    const res = await app.request(
      `/api/internal/projects/${TEST_PROJECT_ID}/blockers`
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.blockers.length).toBeGreaterThan(0);
    expect(body.blockers.some((b: { type: string }) => b.type === 'MISSING_APPROVAL')).toBe(true);
    expect(
      body.blockers.some(
        (b: { type: string; message: string }) =>
          b.type === 'MISSING_APPROVAL' && b.message.includes('approved requirements')
      )
    ).toBe(true);
  });
});

// ─── Next Actions ─────────────────────────────────────────────────────────────

describe('POST /api/internal/projects/:projectId/next-actions', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns nextAllowedActions for given phase', async () => {
    const res = await app.request(
      `/api/internal/projects/${TEST_PROJECT_ID}/next-actions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'INTAKE' }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.nextAllowedActions).toBeDefined();
    expect(Array.isArray(body.nextAllowedActions)).toBe(true);
    expect(body.nextAllowedActions.length).toBeGreaterThan(0);

    const action = body.nextAllowedActions[0];
    expect(action.action).toBeDefined();
    expect(action.owner).toBeDefined();
    expect(['agent', 'human']).toContain(action.owner);
  });

  it('returns human review action for REQUIREMENTS when no approved requirements', async () => {
    const res = await app.request(
      `/api/internal/projects/${TEST_PROJECT_ID}/next-actions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'REQUIREMENTS' }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.nextAllowedActions).toBeDefined();
    expect(body.nextAllowedActions.length).toBeGreaterThan(0);
    expect(
      body.nextAllowedActions.some(
        (a: { owner: string }) => a.owner === 'human'
      )
    ).toBe(true);
  });
});
