import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ProjectConfigSchema, MockGHLAdapter } from '@agency/agent-core';
import type { ProjectConfig, GHLPipeline } from '@agency/agent-core';

const projectConfigRouter = new Hono();

/**
 * In-memory store for project configs (replaced by DB in production)
 */
const projectConfigs = new Map<string, ProjectConfig>();
const syncedPipelines = new Map<string, GHLPipeline[]>();
const syncedWorkflows = new Map<string, string[]>();

// Default GHL adapter (mock for now)
const ghlAdapter = new MockGHLAdapter();

/**
 * GET /api/projects/:id/config
 *
 * Returns the project configuration including allowlists and dryRun status.
 */
projectConfigRouter.get('/:id/config', async (c) => {
  const projectId = c.req.param('id');
  const config = projectConfigs.get(projectId);

  if (!config) {
    return c.json({
      projectId,
      dryRun: false,
      enabledAgents: [],
      enabledActions: [],
      allowlists: { pipelineStages: [], workflowIds: [] },
      pipelines: syncedPipelines.get(projectId) ?? [],
      workflows: syncedWorkflows.get(projectId) ?? [],
    });
  }

  return c.json({
    ...config,
    pipelines: syncedPipelines.get(projectId) ?? [],
    workflows: syncedWorkflows.get(projectId) ?? [],
  });
});

/**
 * PUT /api/projects/:id/config
 *
 * Update project configuration.
 */
const UpdateConfigSchema = ProjectConfigSchema.partial().required({ projectId: true });

projectConfigRouter.put(
  '/:id/config',
  zValidator('json', UpdateConfigSchema.omit({ projectId: true })),
  async (c) => {
    const projectId = c.req.param('id');
    const body = c.req.valid('json');

    const existing = projectConfigs.get(projectId) ?? {
      projectId,
      dryRun: false,
      enabledAgents: [],
      enabledActions: [],
      allowlists: { pipelineStages: [], workflowIds: [] },
    };

    const updated: ProjectConfig = {
      ...existing,
      ...body,
      projectId,
    };

    projectConfigs.set(projectId, updated);

    return c.json({ success: true, config: updated });
  }
);

/**
 * POST /api/projects/:id/sync/pipelines
 *
 * Fetch pipeline and stage IDs from GHL and store them.
 */
projectConfigRouter.post('/:id/sync/pipelines', async (c) => {
  const projectId = c.req.param('id');

  const pipelines = await ghlAdapter.getPipelines();
  syncedPipelines.set(projectId, pipelines);

  return c.json({
    success: true,
    projectId,
    pipelines,
  });
});

/**
 * POST /api/projects/:id/sync/workflows
 *
 * Store workflow IDs for a project.
 */
const SyncWorkflowsSchema = z.object({
  workflowIds: z.array(z.string()),
});

projectConfigRouter.post(
  '/:id/sync/workflows',
  zValidator('json', SyncWorkflowsSchema),
  async (c) => {
    const projectId = c.req.param('id');
    const { workflowIds } = c.req.valid('json');

    syncedWorkflows.set(projectId, workflowIds);

    return c.json({
      success: true,
      projectId,
      workflowIds,
    });
  }
);

export { projectConfigRouter };
