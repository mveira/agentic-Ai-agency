import { Hono } from 'hono';
import { getProjectSpend } from '@agency/telemetry';

const spendRouter = new Hono();

/**
 * GET /api/projects/:projectId/spend
 *
 * Returns spend summary for a project including:
 * - Daily spend
 * - Monthly spend
 * - Total spend
 * - Task count
 */
spendRouter.get('/:projectId/spend', async (c) => {
  const projectId = c.req.param('projectId');

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(projectId)) {
    return c.json(
      {
        error: 'Invalid project ID format. Must be a valid UUID.',
      },
      400
    );
  }

  try {
    const spend = await getProjectSpend({ projectId });

    return c.json({
      projectId: spend.projectId,
      daily: {
        spend: spend.dailySpend,
        currency: 'GBP',
      },
      monthly: {
        spend: spend.monthlySpend,
        currency: 'GBP',
      },
      total: {
        spend: spend.totalSpend,
        currency: 'GBP',
      },
      taskCount: spend.taskCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      {
        error: message,
      },
      500
    );
  }
});

export { spendRouter };
