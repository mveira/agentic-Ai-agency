import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  BuildOrchestrator,
  BuildRequestSchema,
  InMemoryRequirementsProvider,
  StoreBackedRequirementsProvider,
  createMockRouter,
  registerBuildMocks,
} from '@agency/agent-core';
import type { MockLLMAdapter, RequirementsProvider } from '@agency/agent-core';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requirementsVersionStore } from './requirements-v2.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS_PATH = join(__dirname, '../../../../../agency-questions/questions');

const buildRouter = new Hono();

/**
 * In-memory stores (replaced by DB in production)
 *
 * Uses StoreBackedRequirementsProvider wrapping the shared requirementsVersionStore
 * from requirements-v2. Falls back to InMemoryRequirementsProvider for pre-populated
 * test data.
 */
const legacyProvider = new InMemoryRequirementsProvider();
const storeBackedProvider = new StoreBackedRequirementsProvider(requirementsVersionStore);

/**
 * Combined provider: tries StoreBackedRequirementsProvider first,
 * falls back to legacyProvider for backward compatibility.
 */
const requirementsProvider: RequirementsProvider = {
  async getRequirements(projectId: string, versionId: string) {
    const storeResult = await storeBackedProvider.getRequirements(projectId, versionId);
    if (storeResult.exists) return storeResult;
    return legacyProvider.getRequirements(projectId, versionId);
  },
};

const enhancementApprovals = new Map<string, Map<string, 'pending' | 'approved' | 'rejected'>>();

// Pre-populate a test project for development (legacy fallback)
legacyProvider.set(
  '550e8400-e29b-41d4-a716-446655440000',
  'v1.0',
  { exists: true, assumptionsApproved: true, data: {} }
);

/**
 * Create orchestrator with mock router
 */
function createOrchestratorInstance(): BuildOrchestrator {
  const router = createMockRouter();
  const routed = router.route({
    agentId: 'strategy-funnel-agent',
    estimatedInputTokens: 100,
    estimatedOutputTokens: 100,
  });
  registerBuildMocks(routed.adapter as MockLLMAdapter);

  return new BuildOrchestrator({
    runnerConfig: {
      questionsPath: QUESTIONS_PATH,
      globalRules: [],
      router,
      enforceQC: false,
    },
    requirements: requirementsProvider,
  });
}

/**
 * POST /api/projects/:id/build/plan
 *
 * Executes the full build pipeline:
 * Marketing → UX → Copy → QC → BuildPlan
 */
const BuildPlanRequestSchema = z.object({
  requirementsVersionId: z.string(),
  buildRequest: BuildRequestSchema,
});

buildRouter.post(
  '/:id/build/plan',
  zValidator('json', BuildPlanRequestSchema),
  async (c) => {
    const projectId = c.req.param('id');
    const body = c.req.valid('json');

    const orchestrator = createOrchestratorInstance();

    try {
      const result = await orchestrator.execute({
        projectId,
        requirementsVersionId: body.requirementsVersionId,
        buildRequest: body.buildRequest,
      });

      if (result.status === 'error') {
        return c.json(
          {
            status: 'error',
            error: result.error,
            telemetry: result.telemetry,
          },
          400
        );
      }

      if (result.status === 'blocked') {
        return c.json(
          {
            status: 'blocked',
            blockReason: result.blockReason,
            telemetry: result.telemetry,
          },
          422
        );
      }

      // Store enhancement approvals for this project
      if (result.buildPlan) {
        const approvals = new Map<string, 'pending' | 'approved' | 'rejected'>();
        for (const item of result.buildPlan.approvalsNeeded) {
          approvals.set(item.enhancementId, item.status);
        }
        enhancementApprovals.set(projectId, approvals);
      }

      return c.json({
        status: 'success',
        buildPlan: result.buildPlan,
        telemetry: result.telemetry,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json(
        {
          status: 'error',
          error: message,
          telemetry: [],
        },
        500
      );
    }
  }
);

/**
 * POST /api/projects/:id/build/approve-enhancement
 *
 * Approve or reject an optional enhancement.
 */
const ApproveEnhancementSchema = z.object({
  enhancementId: z.string(),
  approved: z.boolean(),
});

buildRouter.post(
  '/:id/build/approve-enhancement',
  zValidator('json', ApproveEnhancementSchema),
  async (c) => {
    const projectId = c.req.param('id');
    const { enhancementId, approved } = c.req.valid('json');

    const approvals = enhancementApprovals.get(projectId);
    if (!approvals) {
      return c.json(
        {
          success: false,
          error: `No build plan found for project ${projectId}`,
        },
        404
      );
    }

    if (!approvals.has(enhancementId)) {
      return c.json(
        {
          success: false,
          error: `Enhancement ${enhancementId} not found in build plan`,
        },
        404
      );
    }

    const status = approved ? 'approved' : 'rejected';
    approvals.set(enhancementId, status);

    return c.json({
      success: true,
      enhancementId,
      status,
    });
  }
);

export { buildRouter };
