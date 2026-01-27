/**
 * Proposal Routes
 *
 * Hono routes for the proposal lifecycle:
 * - Generate (POST /:id/proposals/generate)
 * - List (GET /:id/proposals)
 * - Get (GET /:id/proposals/:proposalVersionId)
 * - Request Review (POST /:id/proposals/:proposalVersionId/request-review)
 * - Review Approve (POST /:id/proposals/:proposalVersionId/review/approve)
 * - Review Request Changes (POST /:id/proposals/:proposalVersionId/review/request-changes)
 * - Mark Sent (POST /:id/proposals/:proposalVersionId/mark-sent)
 * - Client Approve (POST /:id/proposals/:proposalVersionId/approve)
 *
 * Public routes (separate router, mounted at /api/p):
 * - Get Public (GET /:publicId)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  ProposalOrchestrator,
  InMemoryProposalStore,
  InMemoryProposalStrapiProvider,
  InMemoryRequirementsProvider,
  buildProposalSentCRMAction,
  buildProposalApprovedCRMAction,
  createMockRouter,
} from '@agency/agent-core';
import type { MockLLMAdapter } from '@agency/agent-core';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS_PATH = join(__dirname, '../../../../../agency-questions/questions');

// ─── Shared Stores ───────────────────────────────────────────────────────────

const requirementsProvider = new InMemoryRequirementsProvider();
export const proposalStore = new InMemoryProposalStore();
const strapiProvider = new InMemoryProposalStrapiProvider();

// Pre-populate a test project for development
requirementsProvider.set(
  '550e8400-e29b-41d4-a716-446655440000',
  'v1.0',
  { exists: true, assumptionsApproved: true, data: {} }
);

// ─── Mock Proposal Responses ─────────────────────────────────────────────────

function registerProposalMocks(adapter: MockLLMAdapter): void {
  const proposalJson = {
    result: {
      meta: {
        recommendedPlanId: 'pkg-growth',
        recommendationReasons: ['Best fit for stated growth goals', 'Includes CRM and analytics'],
      },
      scope: {
        included: [
          {
            requirementId: 'req-001',
            title: 'Landing Page',
            description: 'Conversion-optimized landing page',
          },
          {
            requirementId: 'req-002',
            title: 'Email Funnel',
            description: 'Automated email nurture sequence',
          },
        ],
      },
      optionalAddons: [
        {
          addOnId: 'addon-chatbot',
          title: 'AI Chatbot',
          description: 'Live chat for visitor engagement',
          price: '500',
        },
      ],
      pricing: {
        planId: 'pkg-growth',
        planName: 'Growth',
        amount: '5000',
        currency: 'GBP',
      },
      timeline: {
        estimatedWeeks: 4,
        phases: [
          { name: 'Discovery & Strategy', durationWeeks: 1 },
          { name: 'Design & Build', durationWeeks: 2 },
          { name: 'Launch & Optimize', durationWeeks: 1 },
        ],
      },
      compliance: {
        scopeLocked: true,
        noInventedProof: true,
        noOutcomePromises: true,
      },
    },
    assumptions: ['Client budget aligns with Growth tier'],
    unknowns: [],
    next_actions: ['Send to UX for conversion spec'],
  };

  const proposalUiSpecJson = {
    result: {
      layout: 'single-page',
      sections: [
        { sectionId: 'sec-hero', type: 'hero', order: 1 },
        { sectionId: 'sec-problem', type: 'problem', order: 2 },
        { sectionId: 'sec-solution', type: 'solution', order: 3 },
        { sectionId: 'sec-scope', type: 'scope', order: 4 },
        { sectionId: 'sec-pricing', type: 'pricing', order: 5 },
        { sectionId: 'sec-timeline', type: 'timeline', order: 6 },
        { sectionId: 'sec-cta', type: 'cta', order: 7 },
      ],
      recommendedPlanHighlighted: true,
      stickyCta: true,
      progressiveDisclosureForAddons: true,
      ctaRequiresLogin: true,
    },
    assumptions: ['Single-page layout optimal for this proposal size'],
    unknowns: [],
    next_actions: ['Validate via QC'],
  };

  const qcPassResult = {
    result: {
      approved: true,
      blockReason: null,
    },
    assumptions: ['All checks passed'],
    unknowns: [],
    next_actions: ['Proposal ready for review'],
  };

  adapter.registerResponse('proposal-strategist-agent', JSON.stringify(proposalJson));
  adapter.registerResponse('ux-design-agent', JSON.stringify(proposalUiSpecJson));
  adapter.registerResponse('quality-control-agent', JSON.stringify(qcPassResult));
}

// ─── Orchestrator Factory ────────────────────────────────────────────────────

function createProposalOrchestrator(): ProposalOrchestrator {
  const router = createMockRouter();
  const routed = router.route({
    agentId: 'proposal-strategist-agent',
    estimatedInputTokens: 100,
    estimatedOutputTokens: 100,
  });
  registerProposalMocks(routed.adapter as MockLLMAdapter);

  return new ProposalOrchestrator({
    runnerConfig: {
      questionsPath: QUESTIONS_PATH,
      globalRules: [],
      router,
      enforceQC: false,
    },
    requirements: requirementsProvider,
    strapiProvider,
    proposalStore,
  });
}

// ─── Validation Schemas ──────────────────────────────────────────────────────

const GenerateQuerySchema = z.object({
  requirementsVersionId: z.string().min(1),
});

const ReviewApproveBodySchema = z.object({
  notes: z.string().optional(),
  reviewerUserId: z.string().uuid(),
});

const ReviewRequestChangesBodySchema = z.object({
  notes: z.string().min(1),
  reviewerUserId: z.string().uuid(),
});

const ClientApproveBodySchema = z.object({
  clientUserId: z.string().uuid(),
});

// ─── Proposal Router (project-scoped) ────────────────────────────────────────

const proposalRouter = new Hono();

/**
 * POST /api/projects/:id/proposals/generate
 *
 * Generate a proposal for a project. Requires approved requirements and assumptions.
 */
proposalRouter.post(
  '/:id/proposals/generate',
  zValidator('query', GenerateQuerySchema),
  async (c) => {
    const projectId = c.req.param('id');
    const { requirementsVersionId } = c.req.valid('query');

    const orchestrator = createProposalOrchestrator();

    try {
      const result = await orchestrator.generate({
        projectId,
        requirementsVersionId,
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

      return c.json({
        status: 'success',
        proposalJson: result.proposalJson,
        proposalUiSpecJson: result.proposalUiSpecJson,
        publicId: result.publicId,
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
 * GET /api/projects/:id/proposals
 *
 * List all proposals for a project.
 */
proposalRouter.get('/:id/proposals', async (c) => {
  const projectId = c.req.param('id');
  const proposals = proposalStore.getByProject(projectId);

  return c.json({
    proposals: proposals.map((p) => ({
      id: p.id,
      projectId: p.projectId,
      versionNumber: p.versionNumber,
      status: p.status,
      publicId: p.publicId,
      createdAt: p.createdAt,
    })),
  });
});

/**
 * GET /api/projects/:id/proposals/:proposalVersionId
 *
 * Get a specific proposal by ID.
 */
proposalRouter.get('/:id/proposals/:proposalVersionId', async (c) => {
  const proposalVersionId = c.req.param('proposalVersionId');
  const proposal = proposalStore.getById(proposalVersionId);

  if (!proposal) {
    return c.json({ error: 'Proposal not found' }, 404);
  }

  return c.json({ proposal });
});

/**
 * POST /api/projects/:id/proposals/:proposalVersionId/request-review
 *
 * Move a proposal from DRAFT to IN_REVIEW.
 */
proposalRouter.post('/:id/proposals/:proposalVersionId/request-review', async (c) => {
  const proposalVersionId = c.req.param('proposalVersionId');
  const proposal = proposalStore.getById(proposalVersionId);

  if (!proposal) {
    return c.json({ error: 'Proposal not found' }, 404);
  }

  if (proposal.status !== 'DRAFT') {
    return c.json(
      {
        error: `Cannot request review: proposal status is ${proposal.status}, expected DRAFT`,
      },
      400
    );
  }

  const updated = proposalStore.updateStatus(proposalVersionId, 'IN_REVIEW');

  return c.json({
    status: 'success',
    proposal: {
      id: updated!.id,
      status: updated!.status,
    },
  });
});

/**
 * POST /api/projects/:id/proposals/:proposalVersionId/review/approve
 *
 * Approve a proposal review.
 */
proposalRouter.post(
  '/:id/proposals/:proposalVersionId/review/approve',
  zValidator('json', ReviewApproveBodySchema),
  async (c) => {
    const proposalVersionId = c.req.param('proposalVersionId');
    const body = c.req.valid('json');

    const proposal = proposalStore.getById(proposalVersionId);
    if (!proposal) {
      return c.json({ error: 'Proposal not found' }, 404);
    }

    if (proposal.status !== 'IN_REVIEW') {
      return c.json(
        {
          error: `Cannot review: proposal status is ${proposal.status}, expected IN_REVIEW`,
        },
        400
      );
    }

    const review = proposalStore.addReview({
      proposalVersionId,
      status: 'APPROVED',
      notes: body.notes,
      reviewerUserId: body.reviewerUserId,
    });

    return c.json({
      status: 'success',
      review: {
        id: review.id,
        status: review.status,
        proposalVersionId: review.proposalVersionId,
      },
    });
  }
);

/**
 * POST /api/projects/:id/proposals/:proposalVersionId/review/request-changes
 *
 * Request changes on a proposal. Returns status to DRAFT.
 */
proposalRouter.post(
  '/:id/proposals/:proposalVersionId/review/request-changes',
  zValidator('json', ReviewRequestChangesBodySchema),
  async (c) => {
    const proposalVersionId = c.req.param('proposalVersionId');
    const body = c.req.valid('json');

    const proposal = proposalStore.getById(proposalVersionId);
    if (!proposal) {
      return c.json({ error: 'Proposal not found' }, 404);
    }

    if (proposal.status !== 'IN_REVIEW') {
      return c.json(
        {
          error: `Cannot review: proposal status is ${proposal.status}, expected IN_REVIEW`,
        },
        400
      );
    }

    const review = proposalStore.addReview({
      proposalVersionId,
      status: 'CHANGES_REQUESTED',
      notes: body.notes,
      reviewerUserId: body.reviewerUserId,
    });

    // Return status to DRAFT
    proposalStore.updateStatus(proposalVersionId, 'DRAFT');

    return c.json({
      status: 'success',
      review: {
        id: review.id,
        status: review.status,
        proposalVersionId: review.proposalVersionId,
        notes: review.notes,
      },
      proposalStatus: 'DRAFT',
    });
  }
);

/**
 * POST /api/projects/:id/proposals/:proposalVersionId/mark-sent
 *
 * Mark a proposal as SENT. Requires latest review to be APPROVED.
 * Returns CRM action contract (emit, don't execute).
 */
proposalRouter.post('/:id/proposals/:proposalVersionId/mark-sent', async (c) => {
  const projectId = c.req.param('id');
  const proposalVersionId = c.req.param('proposalVersionId');
  const proposal = proposalStore.getById(proposalVersionId);

  if (!proposal) {
    return c.json({ error: 'Proposal not found' }, 404);
  }

  const latestReview = proposalStore.getLatestReview(proposalVersionId);
  if (!latestReview || latestReview.status !== 'APPROVED') {
    return c.json(
      {
        error: 'Cannot mark as sent: latest review must be APPROVED',
      },
      400
    );
  }

  proposalStore.updateStatus(proposalVersionId, 'SENT');

  // Record SENT action
  proposalStore.addAction({
    proposalVersionId,
    action: 'SENT',
  });

  // Build CRM action contract (emit, don't execute)
  const crmAction = buildProposalSentCRMAction(projectId, proposalVersionId);

  return c.json({
    status: 'success',
    proposalStatus: 'SENT',
    crmAction,
  });
});

/**
 * POST /api/projects/:id/proposals/:proposalVersionId/approve
 *
 * Client approves a proposal. Requires SENT status and clientUserId.
 * Returns CRM action contract (emit, don't execute).
 */
proposalRouter.post(
  '/:id/proposals/:proposalVersionId/approve',
  zValidator('json', ClientApproveBodySchema),
  async (c) => {
    const projectId = c.req.param('id');
    const proposalVersionId = c.req.param('proposalVersionId');
    const body = c.req.valid('json');

    const proposal = proposalStore.getById(proposalVersionId);
    if (!proposal) {
      return c.json({ error: 'Proposal not found' }, 404);
    }

    if (proposal.status !== 'SENT') {
      return c.json(
        {
          error: `Cannot approve: proposal status is ${proposal.status}, expected SENT`,
        },
        400
      );
    }

    proposalStore.updateStatus(proposalVersionId, 'APPROVED');

    // Record APPROVED action
    proposalStore.addAction({
      proposalVersionId,
      action: 'APPROVED',
      metaJson: { clientUserId: body.clientUserId },
    });

    // Build CRM action contract (emit, don't execute)
    const crmAction = buildProposalApprovedCRMAction(projectId, proposalVersionId);

    return c.json({
      status: 'success',
      proposalStatus: 'APPROVED',
      crmAction,
    });
  }
);

// ─── Public Proposal Router (mounted at /api/p) ─────────────────────────────

const publicProposalRouter = new Hono();

/**
 * GET /api/p/:publicId
 *
 * Public read-only access to a proposal. Records a VIEWED action.
 */
publicProposalRouter.get('/:publicId', async (c) => {
  const publicId = c.req.param('publicId');
  const proposal = proposalStore.getByPublicId(publicId);

  if (!proposal) {
    return c.json({ error: 'Proposal not found' }, 404);
  }

  // Record VIEWED action
  proposalStore.addAction({
    proposalVersionId: proposal.id,
    action: 'VIEWED',
  });

  return c.json({
    proposal: {
      publicId: proposal.publicId,
      status: proposal.status,
      proposalJson: proposal.proposalJson,
      proposalUiSpecJson: proposal.proposalUiSpecJson,
      createdAt: proposal.createdAt,
    },
  });
});

export { proposalRouter, publicProposalRouter };
