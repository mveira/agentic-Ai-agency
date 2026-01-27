import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { requirementsV2Router, requirementsVersionStore, knowledgeStore, resetPlanner } from './requirements-v2.js';

const TEST_PROJECT_ID = 'proj-test-1';

function createTestApp() {
  const app = new Hono();
  app.route('/api/projects', requirementsV2Router);
  return app;
}

const factsSnapshot = {
  summary: ['Target audience: SaaS founders'],
  structuredAnswers: [{ key: 'budget', value: 3000 }],
};

async function generateVersion(app: Hono, projectId = TEST_PROJECT_ID) {
  const res = await app.request(
    `/api/projects/${projectId}/requirements/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factsSnapshot }),
    }
  );
  return res.json();
}

describe('POST /api/projects/:projectId/requirements/generate', () => {
  let app: Hono;

  beforeEach(() => {
    requirementsVersionStore.clear();
    resetPlanner();
    app = createTestApp();
  });

  it('generates v1 requirements from facts snapshot', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factsSnapshot }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.versionId).toBe('v1');
    expect(body.versionNumber).toBe(1);
    expect(body.status).toBe('pending_confirmation');
  });

  it('generates v2 when v1 already exists', async () => {
    await generateVersion(app);

    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factsSnapshot }),
      }
    );

    const body = await res.json();
    expect(body.versionId).toBe('v2');
    expect(body.versionNumber).toBe(2);
  });

  it('returns 400 for invalid body', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: true }),
      }
    );

    expect(res.status).toBe(400);
  });
});

describe('GET /api/projects/:projectId/requirements/:versionId', () => {
  let app: Hono;

  beforeEach(async () => {
    requirementsVersionStore.clear();
    resetPlanner();
    app = createTestApp();
    await generateVersion(app);
  });

  it('returns a specific version', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1`
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.versionId).toBe('v1');
    expect(body.projectId).toBe(TEST_PROJECT_ID);
    expect(body.requirements.length).toBeGreaterThan(0);
    expect(body.assumptions.length).toBeGreaterThan(0);
  });

  it('returns 404 for unknown version', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v999`
    );

    expect(res.status).toBe(404);
  });
});

describe('GET /api/projects/:projectId/requirements/latest', () => {
  let app: Hono;

  beforeEach(async () => {
    requirementsVersionStore.clear();
    resetPlanner();
    app = createTestApp();
  });

  it('returns the latest version', async () => {
    await generateVersion(app);
    await generateVersion(app);

    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/latest`
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.versionNumber).toBe(2);
  });

  it('returns 404 when no versions exist', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/latest`
    );

    expect(res.status).toBe(404);
  });
});

describe('GET /api/projects/:projectId/requirements', () => {
  let app: Hono;

  beforeEach(async () => {
    requirementsVersionStore.clear();
    resetPlanner();
    app = createTestApp();
  });

  it('lists all versions for a project', async () => {
    await generateVersion(app);
    await generateVersion(app);

    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements`
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.versions).toHaveLength(2);
  });
});

describe('POST /api/projects/:projectId/requirements/:versionId/confirm', () => {
  let app: Hono;

  beforeEach(async () => {
    requirementsVersionStore.clear();
    knowledgeStore.clear();
    resetPlanner();
    app = createTestApp();
    await generateVersion(app);
  });

  it('confirms all requirements successfully', async () => {
    // Get version to know requirement/assumption IDs
    const getRes = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1`
    );
    const version = await getRes.json();

    const confirmBody = {
      requirements: version.requirements.map((r: { id: string }) => ({
        id: r.id,
        confirmed: true,
      })),
      assumptions: version.assumptions.map((a: { id: string }) => ({
        id: a.id,
        status: 'approved',
      })),
    };

    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmBody),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('confirmed');
  });

  it('auto-regenerates when requirements are rejected', async () => {
    const getRes = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1`
    );
    const version = await getRes.json();

    const confirmBody = {
      requirements: [
        { id: version.requirements[0].id, confirmed: false, changeNote: 'Needs more detail' },
        ...version.requirements.slice(1).map((r: { id: string }) => ({
          id: r.id,
          confirmed: true,
        })),
      ],
      assumptions: version.assumptions.map((a: { id: string }) => ({
        id: a.id,
        status: 'approved',
      })),
    };

    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmBody),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('regenerating');
    expect(body.newVersionId).toBe('v2');
    expect(body.newVersionNumber).toBe(2);
  });

  it('auto-regenerates when assumptions are rejected', async () => {
    const getRes = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1`
    );
    const version = await getRes.json();

    const confirmBody = {
      requirements: version.requirements.map((r: { id: string }) => ({
        id: r.id,
        confirmed: true,
      })),
      assumptions: [
        { id: version.assumptions[0].id, status: 'rejected', comment: 'Not accurate' },
        ...version.assumptions.slice(1).map((a: { id: string }) => ({
          id: a.id,
          status: 'approved',
        })),
      ],
    };

    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmBody),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('regenerating');
    expect(body.newVersionId).toBeDefined();
  });

  it('returns 404 for unknown version', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v999/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements: [], assumptions: [] }),
      }
    );

    expect(res.status).toBe(404);
  });

  it('returns 409 when confirming an already confirmed version', async () => {
    const getRes = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1`
    );
    const version = await getRes.json();

    const confirmBody = {
      requirements: version.requirements.map((r: { id: string }) => ({
        id: r.id,
        confirmed: true,
      })),
      assumptions: version.assumptions.map((a: { id: string }) => ({
        id: a.id,
        status: 'approved',
      })),
    };

    // First confirm
    await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmBody),
      }
    );

    // Second confirm → 409
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmBody),
      }
    );

    expect(res.status).toBe(409);
  });

  it('new version from regeneration is pending_confirmation', async () => {
    const getRes = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1`
    );
    const version = await getRes.json();

    const confirmBody = {
      requirements: [
        { id: version.requirements[0].id, confirmed: false, changeNote: 'Change this' },
      ],
      assumptions: version.assumptions.map((a: { id: string }) => ({
        id: a.id,
        status: 'approved',
      })),
    };

    const confirmRes = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmBody),
      }
    );
    const confirmBody2 = await confirmRes.json();

    // Check new version status
    const newRes = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/${confirmBody2.newVersionId}`
    );
    const newVersion = await newRes.json();
    expect(newVersion.status).toBe('pending_confirmation');
  });
});

describe('POST /api/projects/:projectId/requirements/:versionId/review/suggest', () => {
  let app: Hono;

  beforeEach(async () => {
    requirementsVersionStore.clear();
    resetPlanner();
    app = createTestApp();
    await generateVersion(app);
  });

  it('returns NEEDS_CLARIFICATION for pending version', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1/review/suggest`,
      { method: 'POST' }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestion).toBe('NEEDS_CLARIFICATION');
    expect(body.clarificationTargets).toBeDefined();
  });

  it('returns APPROVED for fully confirmed version', async () => {
    // Get and confirm version
    const getRes = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1`
    );
    const version = await getRes.json();

    await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements: version.requirements.map((r: { id: string }) => ({
            id: r.id,
            confirmed: true,
          })),
          assumptions: version.assumptions.map((a: { id: string }) => ({
            id: a.id,
            status: 'approved',
          })),
        }),
      }
    );

    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1/review/suggest`,
      { method: 'POST' }
    );

    const body = await res.json();
    expect(body.suggestion).toBe('APPROVED');
  });

  it('returns 404 for unknown version', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v999/review/suggest`,
      { method: 'POST' }
    );

    expect(res.status).toBe(404);
  });
});

describe('POST /api/projects/:projectId/requirements/:versionId/review/decide', () => {
  let app: Hono;

  beforeEach(async () => {
    requirementsVersionStore.clear();
    resetPlanner();
    app = createTestApp();
    await generateVersion(app);
  });

  it('returns build_ready for APPROVED decision', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1/review/decide`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'APPROVED', notes: 'Good to go' }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decision).toBe('APPROVED');
    expect(body.status).toBe('build_ready');
    expect(body.notes).toBe('Good to go');
  });

  it('returns rejected for REJECTED decision', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1/review/decide`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'REJECTED' }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decision).toBe('REJECTED');
    expect(body.status).toBe('rejected');
  });
});

describe('KB auto-populate on confirm', () => {
  let app: Hono;

  beforeEach(async () => {
    requirementsVersionStore.clear();
    knowledgeStore.clear();
    resetPlanner();
    app = createTestApp();
    await generateVersion(app);
  });

  async function confirmAll() {
    const getRes = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1`
    );
    const version = await getRes.json();

    const confirmBody = {
      requirements: version.requirements.map((r: { id: string }) => ({
        id: r.id,
        confirmed: true,
      })),
      assumptions: version.assumptions.map((a: { id: string }) => ({
        id: a.id,
        status: 'approved',
      })),
    };

    return app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmBody),
      }
    );
  }

  it('populates KB with requirement entries on confirm', async () => {
    await confirmAll();

    const entries = knowledgeStore.getByProjectAndType(TEST_PROJECT_ID, 'requirement');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]!.status).toBe('approved');
    expect(entries[0]!.type).toBe('requirement');
  });

  it('populates KB with approved assumption entries on confirm', async () => {
    await confirmAll();

    const entries = knowledgeStore.getByProjectTypeAndStatus(TEST_PROJECT_ID, 'assumption', 'approved');
    expect(entries.length).toBeGreaterThan(0);
  });

  it('does NOT populate KB on regeneration (rejected)', async () => {
    const getRes = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1`
    );
    const version = await getRes.json();

    const confirmBody = {
      requirements: [
        { id: version.requirements[0].id, confirmed: false, changeNote: 'Bad' },
      ],
      assumptions: version.assumptions.map((a: { id: string }) => ({
        id: a.id,
        status: 'approved',
      })),
    };

    await app.request(
      `/api/projects/${TEST_PROJECT_ID}/requirements/v1/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmBody),
      }
    );

    // KB should be empty since regeneration happened (not confirmed)
    const entries = knowledgeStore.getByProject(TEST_PROJECT_ID);
    expect(entries).toHaveLength(0);
  });

  it('contentJson contains requirement data', async () => {
    await confirmAll();

    const entries = knowledgeStore.getByProjectAndType(TEST_PROJECT_ID, 'requirement');
    const entry = entries[0]!;
    expect(entry.contentJson).toBeDefined();
    expect(entry.contentJson.title).toBeDefined();
    expect(entry.contentJson.priority).toBeDefined();
  });

  it('versionRef matches the confirmed version', async () => {
    await confirmAll();

    const entries = knowledgeStore.getByProject(TEST_PROJECT_ID);
    entries.forEach((e) => expect(e.versionRef).toBe('v1'));
  });
});
