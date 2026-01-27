/**
 * Internal PM Routes
 *
 * Agency-only endpoints for project management engine access:
 * - GET /:projectId/readiness   — ProjectReadinessReport
 * - GET /:projectId/ops         — ProjectOpsSummary
 * - GET /:projectId/blockers    — Blocker[]
 * - POST /:projectId/next-actions — NextAllowedAction[]
 *
 * These are deterministic, read-only computations from stored state.
 * No LLM calls involved.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  PMEngine,
  InMemoryKnowledgeStore,
  InMemoryProposalStore,
  ProjectPhaseSchema,
  withPMMetrics,
} from '@agency/agent-core';
import type { PMDataProvider } from '@agency/agent-core';

// TODO: Apply createAuthMiddleware + isAgencyUser check when auth is wired

// ─── Shared Stores ───────────────────────────────────────────────────────────

export const knowledgeStore = new InMemoryKnowledgeStore();
export const proposalStore = new InMemoryProposalStore();

// ─── Data Provider ───────────────────────────────────────────────────────────

/**
 * Creates a PMDataProvider that reads from in-memory stores.
 * In production, this would read from the database.
 */
function createMockPMDataProvider(): PMDataProvider {
  return {
    getApprovedRequirementsCount(projectId: string): number {
      return knowledgeStore.getByProjectTypeAndStatus(projectId, 'requirement', 'approved').length;
    },

    getApprovedAssumptionsCount(projectId: string): number {
      return knowledgeStore.getByProjectTypeAndStatus(projectId, 'assumption', 'approved').length;
    },

    getPendingAssumptionsCount(_projectId: string): number {
      // In-memory KB only stores approved/rejected/superseded.
      // "Pending" assumptions are those that exist but are not approved or rejected.
      // For the KB store, we count assumptions that are not in any terminal state.
      // Since KB only has approved/rejected/superseded statuses, pending = 0 if all are stored.
      // In a real implementation, we'd track pending separately.
      return 0;
    },

    hasDecisions(projectId: string): boolean {
      return knowledgeStore.getByProjectAndType(projectId, 'decision').length > 0;
    },

    hasProposal(projectId: string): boolean {
      return proposalStore.getByProject(projectId).length > 0;
    },

    isLatestProposalReviewApproved(projectId: string): boolean {
      const proposals = proposalStore.getByProject(projectId);
      if (proposals.length === 0) return false;

      const latest = proposals[proposals.length - 1]!;
      const review = proposalStore.getLatestReview(latest.id);
      return review?.status === 'APPROVED';
    },

    getBudgetStatus(_projectId: string) {
      // No wired telemetry stores in routes yet — return safe defaults
      return {
        configured: false,
        exceeded: false,
        totalSpend: 0,
        budgetLimit: null,
      };
    },

    getTaskRunStats(_projectId: string) {
      // No wired telemetry stores in routes yet — return safe defaults
      return {
        total: 0,
        completed: 0,
        failed: 0,
        totalCostUsd: 0,
        last24hCostUsd: 0,
        failedLast24h: [],
      };
    },

    getEventQueueHealth(_projectId: string) {
      // No wired telemetry stores in routes yet — return safe defaults
      return {
        pendingCount: 0,
        lastProcessedAt: null,
        failedCount: 0,
        totalCount: 0,
      };
    },

    areIntegrationsHealthy(): boolean {
      return true;
    },
  };
}

// ─── Engine Factory ──────────────────────────────────────────────────────────

function createPMEngine(): PMEngine {
  const provider = createMockPMDataProvider();
  return new PMEngine(provider);
}

// ─── Validation Schemas ──────────────────────────────────────────────────────

const PhaseQuerySchema = z.object({
  phase: ProjectPhaseSchema,
});

const NextActionsBodySchema = z.object({
  phase: ProjectPhaseSchema,
});

// ─── Internal PM Router ──────────────────────────────────────────────────────

const internalPMRouter = new Hono();

/**
 * GET /api/internal/projects/:projectId/readiness?phase=PROPOSAL
 *
 * Returns ProjectReadinessReport for the given project and phase.
 */
internalPMRouter.get(
  '/:projectId/readiness',
  zValidator('query', PhaseQuerySchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    const { phase } = c.req.valid('query');

    const engine = createPMEngine();
    const { result } = withPMMetrics(projectId, phase, () =>
      engine.computeReadiness(projectId, phase)
    );

    return c.json(result);
  }
);

/**
 * GET /api/internal/projects/:projectId/ops?phase=PROPOSAL
 *
 * Returns ProjectOpsSummary for the given project and phase.
 */
internalPMRouter.get(
  '/:projectId/ops',
  zValidator('query', PhaseQuerySchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    const { phase } = c.req.valid('query');

    const engine = createPMEngine();
    const { result } = withPMMetrics(projectId, phase, () =>
      engine.computeOpsSummary(projectId, phase)
    );

    return c.json(result);
  }
);

/**
 * GET /api/internal/projects/:projectId/blockers
 *
 * Returns Blocker[] for the given project.
 */
internalPMRouter.get('/:projectId/blockers', async (c) => {
  const projectId = c.req.param('projectId');

  const engine = createPMEngine();
  const blockers = engine.detectBlockers(projectId);

  return c.json({ blockers });
});

/**
 * POST /api/internal/projects/:projectId/next-actions
 *
 * Body: { phase: ProjectPhase }
 * Returns { nextAllowedActions: NextAllowedAction[] }
 */
internalPMRouter.post(
  '/:projectId/next-actions',
  zValidator('json', NextActionsBodySchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    const { phase } = c.req.valid('json');

    const engine = createPMEngine();
    const report = engine.computeReadiness(projectId, phase);

    return c.json({
      nextAllowedActions: report.nextAllowedActions,
    });
  }
);

export { internalPMRouter };
