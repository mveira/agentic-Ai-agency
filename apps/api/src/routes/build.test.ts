import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { buildRouter } from './build.js';

function createTestApp() {
  const app = new Hono();
  app.route('/api/projects', buildRouter);
  return app;
}

const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('POST /api/projects/:id/build/plan', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns success with a valid build plan', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/build/plan`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementsVersionId: 'v1.0',
          buildRequest: {
            type: 'landing-page',
            goal: 'Generate leads',
          },
        }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.buildPlan).toBeDefined();
    expect(body.buildPlan.projectId).toBe(TEST_PROJECT_ID);
    expect(body.buildPlan.tasks.length).toBeGreaterThan(0);
    expect(body.telemetry.length).toBe(4);
  });

  it('returns error for missing requirements', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/build/plan`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementsVersionId: 'nonexistent',
          buildRequest: {
            type: 'landing-page',
            goal: 'Generate leads',
          },
        }),
      }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.status).toBe('error');
    expect(body.error).toContain('Requirements not found');
  });

  it('returns 400 for invalid request body', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/build/plan`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: true }),
      }
    );

    expect(res.status).toBe(400);
  });

  it('build plan has Mode B enforcement (optional separated from core)', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/build/plan`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementsVersionId: 'v1.0',
          buildRequest: {
            type: 'landing-page',
            goal: 'Generate leads',
          },
        }),
      }
    );

    const body = await res.json();
    expect(body.buildPlan.core.blueprint.optionalEnhancements).toHaveLength(0);
    expect(body.buildPlan.core.copyPack.optionalCopy).toHaveLength(0);
    expect(body.buildPlan.optional.enhancements.length).toBeGreaterThan(0);
    expect(body.buildPlan.approvalsNeeded.length).toBeGreaterThan(0);
    expect(body.buildPlan.approvalsNeeded[0].status).toBe('pending');
  });

  it('telemetry records all 4 pipeline steps', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/build/plan`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementsVersionId: 'v1.0',
          buildRequest: {
            type: 'landing-page',
            goal: 'Generate leads',
          },
        }),
      }
    );

    const body = await res.json();
    const steps = body.telemetry.map((t: { step: string }) => t.step);
    expect(steps).toEqual(['marketing', 'ux-design', 'copy', 'qc']);
  });
});

describe('POST /api/projects/:id/build/approve-enhancement', () => {
  let app: Hono;

  beforeEach(async () => {
    app = createTestApp();

    // First create a build plan to have enhancements to approve
    await app.request(
      `/api/projects/${TEST_PROJECT_ID}/build/plan`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementsVersionId: 'v1.0',
          buildRequest: {
            type: 'landing-page',
            goal: 'Generate leads',
          },
        }),
      }
    );
  });

  it('approves an enhancement', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/build/approve-enhancement`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enhancementId: 'enh-video',
          approved: true,
        }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('approved');
  });

  it('rejects an enhancement', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/build/approve-enhancement`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enhancementId: 'enh-chatbot',
          approved: false,
        }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('rejected');
  });

  it('returns 404 for unknown project', async () => {
    const res = await app.request(
      '/api/projects/unknown-project/build/approve-enhancement',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enhancementId: 'enh-video',
          approved: true,
        }),
      }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
