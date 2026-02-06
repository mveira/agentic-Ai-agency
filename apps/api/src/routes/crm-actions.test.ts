import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { crmActionsRouter, pipelineContractStore } from './crm-actions.js';
import { computePipelineAction } from '@agency/agent-core';

const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

function createTestApp() {
  const app = new Hono();
  app.route('/api/internal/projects', crmActionsRouter);
  app.route('/api/internal', crmActionsRouter);
  return app;
}

function insertTestContract(eventId = `evt-${crypto.randomUUID()}`) {
  const contract = computePipelineAction({
    projectId: TEST_PROJECT_ID,
    eventId,
    triggeringEvent: 'INTENT_RECEIVED',
  })!;
  return pipelineContractStore.insert(contract);
}

describe('CRM Actions API', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
    pipelineContractStore.clear();
  });

  describe('GET /api/internal/projects/:projectId/crm-actions', () => {
    it('returns empty array when no actions exist', async () => {
      const res = await app.request(`/api/internal/projects/${TEST_PROJECT_ID}/crm-actions`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.actions).toHaveLength(0);
    });

    it('returns contracts for a project', async () => {
      insertTestContract();
      insertTestContract();
      const res = await app.request(`/api/internal/projects/${TEST_PROJECT_ID}/crm-actions`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.actions).toHaveLength(2);
      expect(body.actions[0].actionType).toBe('MOVE_STAGE');
      expect(body.actions[0].humanReadableNote).toBeDefined();
      expect(body.actions[0].idempotencyKey).toBeDefined();
    });

    it('does not return contracts from other projects', async () => {
      // Insert via store directly for a different project
      const contract = computePipelineAction({
        projectId: 'other-project',
        eventId: 'evt-other',
        triggeringEvent: 'ACK_SENT',
      })!;
      pipelineContractStore.insert(contract);
      const res = await app.request(`/api/internal/projects/${TEST_PROJECT_ID}/crm-actions`);
      const body = await res.json();
      expect(body.actions).toHaveLength(0);
    });
  });

  describe('POST /api/internal/crm-actions/:id/apply', () => {
    it('marks a contract as APPLIED', async () => {
      const stored = insertTestContract();
      const res = await app.request(`/api/internal/crm-actions/${stored.contractId}/apply`, {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('APPLIED');

      const contracts = pipelineContractStore.findByProject(TEST_PROJECT_ID);
      expect(contracts[0].status).toBe('APPLIED');
    });
  });

  describe('POST /api/internal/crm-actions/:id/reject', () => {
    it('marks a contract as REJECTED with reason', async () => {
      const stored = insertTestContract();
      const res = await app.request(`/api/internal/crm-actions/${stored.contractId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Not appropriate at this time' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('REJECTED');
      expect(body.reason).toBe('Not appropriate at this time');
    });
  });
});
