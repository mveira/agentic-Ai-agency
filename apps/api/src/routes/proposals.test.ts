import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { proposalRouter, publicProposalRouter, proposalStore } from './proposals.js';

const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_REVIEWER_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const TEST_CLIENT_USER_ID = 'c1d2e3f4-a5b6-7890-abcd-ef9876543210';

// Clear shared store between tests to prevent state leakage
beforeEach(() => {
  proposalStore.clear();
});

function createTestApp() {
  const app = new Hono();
  app.route('/api/projects', proposalRouter);
  app.route('/api/p', publicProposalRouter);
  return app;
}

/**
 * Helper: generate a proposal and return the response body.
 */
async function generateProposal(app: Hono) {
  const res = await app.request(
    `/api/projects/${TEST_PROJECT_ID}/proposals/generate?requirementsVersionId=v1.0`,
    { method: 'POST' }
  );
  return { res, body: await res.json() };
}

/**
 * Helper: get proposals list and return first proposal ID.
 */
async function getFirstProposalId(app: Hono): Promise<string> {
  const res = await app.request(
    `/api/projects/${TEST_PROJECT_ID}/proposals`
  );
  const body = await res.json() as { proposals: Array<{ id: string }> };
  return body.proposals[0]!.id;
}

/**
 * Helper: move proposal through DRAFT -> IN_REVIEW -> APPROVED review -> SENT.
 * Returns the proposal ID.
 */
async function moveToSent(app: Hono): Promise<string> {
  await generateProposal(app);
  const proposalId = await getFirstProposalId(app);

  // Request review
  await app.request(
    `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/request-review`,
    { method: 'POST' }
  );

  // Approve review
  await app.request(
    `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/review/approve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewerUserId: TEST_REVIEWER_USER_ID,
      }),
    }
  );

  // Mark sent
  await app.request(
    `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/mark-sent`,
    { method: 'POST' }
  );

  return proposalId;
}

// ─── Generate ────────────────────────────────────────────────────────────────

describe('POST /api/projects/:id/proposals/generate', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns success with proposalJson and proposalUiSpecJson', async () => {
    const { res, body } = await generateProposal(app);

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.proposalJson).toBeDefined();
    expect(body.proposalJson.meta).toBeDefined();
    expect(body.proposalJson.scope).toBeDefined();
    expect(body.proposalJson.pricing).toBeDefined();
    expect(body.proposalJson.compliance).toBeDefined();
    expect(body.proposalUiSpecJson).toBeDefined();
    expect(body.proposalUiSpecJson.layout).toBeDefined();
    expect(body.proposalUiSpecJson.sections).toBeDefined();
    expect(body.proposalUiSpecJson.stickyCta).toBe(true);
    expect(body.publicId).toBeDefined();
    expect(typeof body.publicId).toBe('string');
  });

  it('returns error if requirements not approved', async () => {
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/generate?requirementsVersionId=nonexistent`,
      { method: 'POST' }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.status).toBe('error');
    expect(body.error).toContain('Requirements not found');
  });
});

// ─── List ────────────────────────────────────────────────────────────────────

describe('GET /api/projects/:id/proposals', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns list of proposals for project', async () => {
    // Generate a proposal first
    await generateProposal(app);

    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals`
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.proposals).toBeDefined();
    expect(Array.isArray(body.proposals)).toBe(true);
    expect(body.proposals.length).toBeGreaterThanOrEqual(1);
    expect(body.proposals[0].projectId).toBe(TEST_PROJECT_ID);
    expect(body.proposals[0].status).toBe('DRAFT');
    expect(body.proposals[0].id).toBeDefined();
    expect(body.proposals[0].publicId).toBeDefined();
  });
});

// ─── Get ─────────────────────────────────────────────────────────────────────

describe('GET /api/projects/:id/proposals/:proposalVersionId', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns specific proposal', async () => {
    await generateProposal(app);
    const proposalId = await getFirstProposalId(app);

    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}`
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.proposal).toBeDefined();
    expect(body.proposal.id).toBe(proposalId);
    expect(body.proposal.projectId).toBe(TEST_PROJECT_ID);
    expect(body.proposal.proposalJson).toBeDefined();
    expect(body.proposal.proposalUiSpecJson).toBeDefined();
  });
});

// ─── Request Review ──────────────────────────────────────────────────────────

describe('POST /api/projects/:id/proposals/:proposalVersionId/request-review', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('sets status to IN_REVIEW', async () => {
    await generateProposal(app);
    const proposalId = await getFirstProposalId(app);

    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/request-review`,
      { method: 'POST' }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.proposal.status).toBe('IN_REVIEW');
  });

  it('fails if not DRAFT', async () => {
    await generateProposal(app);
    const proposalId = await getFirstProposalId(app);

    // First request review
    await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/request-review`,
      { method: 'POST' }
    );

    // Try again — should fail since it's now IN_REVIEW
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/request-review`,
      { method: 'POST' }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('IN_REVIEW');
    expect(body.error).toContain('expected DRAFT');
  });
});

// ─── Review Approve ──────────────────────────────────────────────────────────

describe('POST /api/projects/:id/proposals/:proposalVersionId/review/approve', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('creates approved review', async () => {
    await generateProposal(app);
    const proposalId = await getFirstProposalId(app);

    // Move to IN_REVIEW
    await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/request-review`,
      { method: 'POST' }
    );

    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/review/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: 'Looks great, approved.',
          reviewerUserId: TEST_REVIEWER_USER_ID,
        }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.review.status).toBe('APPROVED');
    expect(body.review.proposalVersionId).toBe(proposalId);
  });
});

// ─── Review Request Changes ──────────────────────────────────────────────────

describe('POST /api/projects/:id/proposals/:proposalVersionId/review/request-changes', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('creates changes_requested review and returns to DRAFT', async () => {
    await generateProposal(app);
    const proposalId = await getFirstProposalId(app);

    // Move to IN_REVIEW
    await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/request-review`,
      { method: 'POST' }
    );

    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/review/request-changes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: 'Please revise the pricing section.',
          reviewerUserId: TEST_REVIEWER_USER_ID,
        }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.review.status).toBe('CHANGES_REQUESTED');
    expect(body.review.notes).toBe('Please revise the pricing section.');
    expect(body.proposalStatus).toBe('DRAFT');

    // Verify the proposal is back to DRAFT by fetching it
    const getRes = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}`
    );
    const getBody = await getRes.json();
    expect(getBody.proposal.status).toBe('DRAFT');
  });
});

// ─── Mark Sent ───────────────────────────────────────────────────────────────

describe('POST /api/projects/:id/proposals/:proposalVersionId/mark-sent', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('requires review APPROVED, sets SENT', async () => {
    await generateProposal(app);
    const proposalId = await getFirstProposalId(app);

    // Request review
    await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/request-review`,
      { method: 'POST' }
    );

    // Approve review
    await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/review/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerUserId: TEST_REVIEWER_USER_ID,
        }),
      }
    );

    // Mark sent
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/mark-sent`,
      { method: 'POST' }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.proposalStatus).toBe('SENT');
    expect(body.pipelineContract).toBeDefined();
    expect(body.pipelineContract.projectId).toBe(TEST_PROJECT_ID);
    expect(body.pipelineContract.targetStage).toBe('PROPOSAL_SENT');
    expect(body.pipelineContract.actionType).toBe('MOVE_STAGE');
    expect(body.pipelineContract.internalReason.eventType).toBe('PROPOSAL_MARKED_SENT');
    expect(body.pipelineContract.internalReason.relatedIds.proposalVersionId).toBe(proposalId);
  });

  it('fails without approved review', async () => {
    await generateProposal(app);
    const proposalId = await getFirstProposalId(app);

    // Try to mark sent without any review
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/mark-sent`,
      { method: 'POST' }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('latest review must be APPROVED');
  });
});

// ─── Client Approve ──────────────────────────────────────────────────────────

describe('POST /api/projects/:id/proposals/:proposalVersionId/approve', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('requires SENT status, sets APPROVED, returns CRM action', async () => {
    const proposalId = await moveToSent(app);

    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientUserId: TEST_CLIENT_USER_ID,
        }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.proposalStatus).toBe('APPROVED');
    expect(body.pipelineContract).toBeDefined();
    expect(body.pipelineContract.projectId).toBe(TEST_PROJECT_ID);
    expect(body.pipelineContract.targetStage).toBe('WON');
    expect(body.pipelineContract.actionType).toBe('MOVE_STAGE');
    expect(body.pipelineContract.internalReason.eventType).toBe('PROPOSAL_CLIENT_APPROVED');
    expect(body.pipelineContract.internalReason.relatedIds.proposalVersionId).toBe(proposalId);
    expect(body.pipelineContract.internalReason.relatedIds.clientUserId).toBe(TEST_CLIENT_USER_ID);
  });

  it('requires clientUserId (authentication check)', async () => {
    const proposalId = await moveToSent(app);

    // Try without clientUserId
    const res = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals/${proposalId}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    );

    expect(res.status).toBe(400);
  });
});

// ─── Public Proposal ─────────────────────────────────────────────────────────

describe('GET /api/p/:publicId', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('returns read-only proposal and records VIEWED action', async () => {
    const { body: genBody } = await generateProposal(app);
    const publicId = genBody.publicId;

    const res = await app.request(`/api/p/${publicId}`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.proposal).toBeDefined();
    expect(body.proposal.publicId).toBe(publicId);
    expect(body.proposal.status).toBeDefined();
    expect(body.proposal.proposalJson).toBeDefined();
    expect(body.proposal.proposalUiSpecJson).toBeDefined();
    expect(body.proposal.createdAt).toBeDefined();

    // Verify VIEWED action was recorded by fetching the proposal ID
    // and checking actions via the store (we exported proposalStore)
    const listRes = await app.request(
      `/api/projects/${TEST_PROJECT_ID}/proposals`
    );
    const listBody = await listRes.json() as { proposals: Array<{ id: string }> };
    const proposalId = listBody.proposals.find(
      (p: { id: string }) => proposalStore.getById(p.id)?.publicId === publicId
    )?.id;

    expect(proposalId).toBeDefined();
    const actions = proposalStore.getActions(proposalId!);
    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(actions.some((a) => a.action === 'VIEWED')).toBe(true);
  });
});
