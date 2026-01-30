import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { crmActionsRouter, crmContractStore } from './crm-actions.js';

const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

function createTestApp() {
  const app = new Hono();
  app.route('/api/internal/projects', crmActionsRouter);
  app.route('/api/internal', crmActionsRouter);
  return app;
}

function insertTestRecord(overrides: Record<string, unknown> = {}) {
  const record = {
    id: crypto.randomUUID(),
    projectId: TEST_PROJECT_ID,
    contactId: 'contact-1',
    actionType: 'MOVE_STAGE',
    payload: { targetStage: 'NEW_LEAD' },
    status: 'PENDING' as const,
    reason: 'Test reason',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
  crmContractStore.insert(record);
  return record;
}

describe('CRM Actions API', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
    crmContractStore.clear();
  });

  describe('GET /api/internal/projects/:projectId/crm-actions', () => {
    it('returns empty array when no actions exist', async () => {
      const res = await app.request(`/api/internal/projects/${TEST_PROJECT_ID}/crm-actions`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.actions).toHaveLength(0);
    });

    it('returns actions for a project', async () => {
      insertTestRecord();
      insertTestRecord({ actionType: 'ADD_NOTE', payload: { note: 'hello' } });
      const res = await app.request(`/api/internal/projects/${TEST_PROJECT_ID}/crm-actions`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.actions).toHaveLength(2);
    });

    it('does not return actions from other projects', async () => {
      insertTestRecord({ projectId: 'other-project' });
      const res = await app.request(`/api/internal/projects/${TEST_PROJECT_ID}/crm-actions`);
      const body = await res.json();
      expect(body.actions).toHaveLength(0);
    });
  });

  describe('POST /api/internal/crm-actions/:id/apply', () => {
    it('marks an action as APPLIED', async () => {
      const record = insertTestRecord();
      const res = await app.request(`/api/internal/crm-actions/${record.id}/apply`, {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('APPLIED');

      const actions = crmContractStore.findByProject(TEST_PROJECT_ID);
      expect(actions[0].status).toBe('APPLIED');
    });
  });

  describe('POST /api/internal/crm-actions/:id/mark-failed', () => {
    it('marks an action as FAILED with reason', async () => {
      const record = insertTestRecord();
      const res = await app.request(`/api/internal/crm-actions/${record.id}/mark-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'GHL API timeout' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('FAILED');
      expect(body.reason).toBe('GHL API timeout');
    });
  });
});
