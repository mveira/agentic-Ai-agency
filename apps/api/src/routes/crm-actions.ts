import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { InMemoryCRMContractStore } from '@agency/agent-core';

const store = new InMemoryCRMContractStore();

export { store as crmContractStore };

export const crmActionsRouter = new Hono();

// GET /api/internal/projects/:projectId/crm-actions — list by project
crmActionsRouter.get('/:projectId/crm-actions', async (c) => {
  const projectId = c.req.param('projectId');
  const records = store.findByProject(projectId);
  return c.json({ actions: records });
});

// POST /api/internal/crm-actions/:id/apply — mark APPLIED
crmActionsRouter.post(
  '/crm-actions/:id/apply',
  async (c) => {
    const id = c.req.param('id');
    store.updateStatus(id, 'APPLIED');
    return c.json({ success: true, id, status: 'APPLIED' });
  },
);

// POST /api/internal/crm-actions/:id/mark-failed — mark FAILED with reason
crmActionsRouter.post(
  '/crm-actions/:id/mark-failed',
  zValidator('json', z.object({ reason: z.string() })),
  async (c) => {
    const id = c.req.param('id');
    const { reason } = c.req.valid('json');
    store.updateStatus(id, 'FAILED', reason);
    return c.json({ success: true, id, status: 'FAILED', reason });
  },
);
