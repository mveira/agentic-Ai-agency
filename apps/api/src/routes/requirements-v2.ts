/**
 * Requirements V2 Routes
 *
 * Project-scoped endpoints for requirements generation, confirmation,
 * auto-regeneration on rejection, and review handoff.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  InMemoryRequirementsVersionStore,
  InMemoryKnowledgeStore,
  ConfirmPayloadSchema,
  RequirementsEngineerPlanner,
  createMockBundleOutput,
  InMemoryStrapiProvider,
  MockLLMAdapter,
  populateKBFromConfirmation,
} from '@agency/agent-core';
import type {
  RequirementsVersionRecord,
  ChangeRequest,
} from '@agency/agent-core';

// ─── Shared Stores ───────────────────────────────────────────────────────────

export const requirementsVersionStore = new InMemoryRequirementsVersionStore();
export const knowledgeStore = new InMemoryKnowledgeStore();

// ─── Mock Planner Setup ──────────────────────────────────────────────────────

function createDefaultPlanner(): RequirementsEngineerPlanner {
  const strapi = new InMemoryStrapiProvider({ available: true });
  strapi.addTemplates('requirements-rubric', []);

  const llm = new MockLLMAdapter();
  const bundle = createMockBundleOutput();
  llm.registerResponse(
    'requirements-engineer-agent',
    JSON.stringify({
      result: bundle,
      assumptions: [],
      unknowns: [],
      next_actions: [],
    })
  );

  return new RequirementsEngineerPlanner({ strapi, llm });
}

let plannerInstance: RequirementsEngineerPlanner = createDefaultPlanner();

/**
 * Allow tests to inject a custom planner.
 */
export function setPlanner(planner: RequirementsEngineerPlanner): void {
  plannerInstance = planner;
}

export function resetPlanner(): void {
  plannerInstance = createDefaultPlanner();
}

// ─── Generate Schema ─────────────────────────────────────────────────────────

const GenerateSchema = z.object({
  factsSnapshot: z.object({
    summary: z.array(z.string()),
    structuredAnswers: z.array(
      z.object({
        key: z.string(),
        value: z.union([z.string(), z.array(z.string()), z.number()]),
      })
    ),
  }),
  constraints: z.record(z.unknown()).optional(),
});

// ─── Review Schemas ──────────────────────────────────────────────────────────

const ReviewDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().optional(),
});

// ─── Router ──────────────────────────────────────────────────────────────────

const requirementsV2Router = new Hono();

/**
 * POST /api/projects/:projectId/requirements/generate
 *
 * Generates v1 (or vN+1) from facts snapshot, returns versionId.
 */
requirementsV2Router.post(
  '/:projectId/requirements/generate',
  zValidator('json', GenerateSchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    const body = c.req.valid('json');

    // Determine version number
    const latest = await requirementsVersionStore.getLatest(projectId);
    const versionNumber = latest ? latest.versionNumber + 1 : 1;
    const versionId = `v${versionNumber}`;

    // Call planner
    const plannerResult = await plannerInstance.generate({
      projectId,
      factsSnapshot: body.factsSnapshot,
      constraints: body.constraints,
    });

    if (!plannerResult.success || !plannerResult.bundle) {
      return c.json(
        {
          success: false,
          error: plannerResult.error ?? 'Failed to generate requirements',
        },
        422
      );
    }

    // Build version
    const version: RequirementsVersionRecord = {
      versionId,
      projectId,
      versionNumber,
      status: 'pending_confirmation',
      requirements: plannerResult.bundle.requirements.map((r) => ({
        ...r,
        confirmed: null,
      })),
      assumptions: plannerResult.bundle.assumptions.map((a) => ({
        ...a,
        status: 'pending' as const,
      })),
      factsSnapshot: body.factsSnapshot,
      changeRequests: [],
      createdAt: new Date().toISOString(),
    };

    await requirementsVersionStore.store(version);

    return c.json({
      success: true,
      versionId,
      versionNumber,
      status: 'pending_confirmation',
    });
  }
);

/**
 * GET /api/projects/:projectId/requirements/latest
 *
 * Returns the latest version.
 */
requirementsV2Router.get('/:projectId/requirements/latest', async (c) => {
  const projectId = c.req.param('projectId');
  const version = await requirementsVersionStore.getLatest(projectId);

  if (!version) {
    return c.json({ error: 'No requirements versions found' }, 404);
  }

  return c.json(version);
});

/**
 * GET /api/projects/:projectId/requirements
 *
 * Lists all versions for a project.
 */
requirementsV2Router.get('/:projectId/requirements', async (c) => {
  const projectId = c.req.param('projectId');
  const versions = await requirementsVersionStore.listVersions(projectId);
  return c.json({ versions });
});

/**
 * GET /api/projects/:projectId/requirements/:versionId
 *
 * Returns a specific version.
 */
requirementsV2Router.get('/:projectId/requirements/:versionId', async (c) => {
  const projectId = c.req.param('projectId');
  const versionId = c.req.param('versionId');

  const version = await requirementsVersionStore.get(projectId, versionId);

  if (!version) {
    return c.json({ error: 'Version not found' }, 404);
  }

  return c.json(version);
});

/**
 * POST /api/projects/:projectId/requirements/:versionId/confirm
 *
 * Persists decisions. If ANY rejection → auto-regenerate new version.
 */
requirementsV2Router.post(
  '/:projectId/requirements/:versionId/confirm',
  zValidator('json', ConfirmPayloadSchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    const versionId = c.req.param('versionId');
    const body = c.req.valid('json');

    // 1. Load version
    const version = await requirementsVersionStore.get(projectId, versionId);
    if (!version) {
      return c.json({ error: 'Version not found' }, 404);
    }

    // 2. Reject if already confirmed
    if (version.status === 'confirmed') {
      return c.json({ error: 'Version already confirmed' }, 409);
    }

    // 3. Apply decisions
    for (const rd of body.requirements) {
      const req = version.requirements.find((r) => r.id === rd.id);
      if (req) {
        req.confirmed = rd.confirmed;
        if (rd.changeNote) req.changeNote = rd.changeNote;
      }
    }

    for (const ad of body.assumptions) {
      const asn = version.assumptions.find((a) => a.id === ad.id);
      if (asn) {
        asn.status = ad.status;
        if (ad.comment) asn.comment = ad.comment;
      }
    }

    // 4. Check for rejections
    const hasRejectedRequirements = body.requirements.some((r) => !r.confirmed);
    const hasRejectedAssumptions = body.assumptions.some((a) => a.status === 'rejected');
    const hasRejections = hasRejectedRequirements || hasRejectedAssumptions;

    if (!hasRejections) {
      // All confirmed
      version.status = 'confirmed';
      await requirementsVersionStore.store(version);

      // Populate KB from confirmed version
      populateKBFromConfirmation(knowledgeStore, version);

      return c.json({
        success: true,
        versionId,
        status: 'confirmed',
        confirmedCount: body.requirements.filter((r) => r.confirmed).length,
        totalCount: body.requirements.length,
      });
    }

    // 5. Rejections found → regenerate
    version.status = 'regenerating';

    // Build change requests from rejections
    const changeRequests: ChangeRequest[] = [];

    for (const rd of body.requirements) {
      if (!rd.confirmed) {
        changeRequests.push({
          type: 'requirement',
          itemId: rd.id,
          notes: rd.changeNote ?? 'Requirement rejected',
        });
      }
    }

    for (const ad of body.assumptions) {
      if (ad.status === 'rejected') {
        changeRequests.push({
          type: 'assumption',
          itemId: ad.id,
          notes: ad.comment ?? 'Assumption rejected',
        });
      }
    }

    version.changeRequests = changeRequests;
    await requirementsVersionStore.store(version);

    // Call planner to regenerate
    const newVersionNumber = version.versionNumber + 1;
    const newVersionId = `v${newVersionNumber}`;

    const plannerResult = await plannerInstance.generate({
      projectId,
      factsSnapshot: version.factsSnapshot,
      priorVersion: {
        versionNumber: version.versionNumber,
        requirements: version.requirements,
        assumptions: version.assumptions,
      },
      changeRequests,
    });

    if (!plannerResult.success || !plannerResult.bundle) {
      return c.json(
        {
          success: false,
          versionId,
          status: 'regenerating',
          error: plannerResult.error ?? 'Failed to regenerate',
        },
        422
      );
    }

    // Store new version
    const newVersion: RequirementsVersionRecord = {
      versionId: newVersionId,
      projectId,
      versionNumber: newVersionNumber,
      status: 'pending_confirmation',
      requirements: plannerResult.bundle.requirements.map((r) => ({
        ...r,
        confirmed: null,
      })),
      assumptions: plannerResult.bundle.assumptions.map((a) => ({
        ...a,
        status: 'pending' as const,
      })),
      factsSnapshot: version.factsSnapshot,
      changeRequests: [],
      createdAt: new Date().toISOString(),
    };

    await requirementsVersionStore.store(newVersion);

    return c.json({
      success: true,
      versionId,
      status: 'regenerating',
      newVersionId,
      newVersionNumber,
      confirmedCount: body.requirements.filter((r) => r.confirmed).length,
      totalCount: body.requirements.length,
    });
  }
);

// ─── Review Handoff ──────────────────────────────────────────────────────────

/**
 * POST /api/projects/:projectId/requirements/:versionId/review/suggest
 *
 * LLM review stub returns APPROVED|NEEDS_CLARIFICATION|NOT_A_FIT with reasoning.
 */
requirementsV2Router.post(
  '/:projectId/requirements/:versionId/review/suggest',
  async (c) => {
    const projectId = c.req.param('projectId');
    const versionId = c.req.param('versionId');

    const version = await requirementsVersionStore.get(projectId, versionId);
    if (!version) {
      return c.json({ error: 'Version not found' }, 404);
    }

    const allConfirmed = version.requirements.every((r) => r.confirmed === true);
    const allAssumptionsApproved = version.assumptions.every((a) => a.status === 'approved');

    let suggestion: 'APPROVED' | 'NEEDS_CLARIFICATION' | 'NOT_A_FIT';
    let reasoning: string;
    let clarificationTargets: string[] | undefined;

    if (version.status === 'confirmed' && allConfirmed && allAssumptionsApproved) {
      suggestion = 'APPROVED';
      reasoning = 'All requirements confirmed and all assumptions approved. Ready for build.';
    } else if (version.status === 'pending_confirmation') {
      suggestion = 'NEEDS_CLARIFICATION';
      reasoning = 'Requirements have not been confirmed by the client yet.';
      clarificationTargets = version.requirements
        .filter((r) => r.confirmed === null)
        .map((r) => r.id);
    } else {
      suggestion = 'NEEDS_CLARIFICATION';
      reasoning = 'Some requirements or assumptions were rejected.';
      clarificationTargets = [
        ...version.requirements.filter((r) => r.confirmed === false).map((r) => r.id),
        ...version.assumptions.filter((a) => a.status === 'rejected').map((a) => a.id),
      ];
    }

    return c.json({
      versionId,
      suggestion,
      reasoning,
      ...(clarificationTargets ? { clarificationTargets } : {}),
    });
  }
);

/**
 * POST /api/projects/:projectId/requirements/:versionId/review/decide
 *
 * Human final decision (APPROVED|REJECTED + notes).
 */
requirementsV2Router.post(
  '/:projectId/requirements/:versionId/review/decide',
  zValidator('json', ReviewDecisionSchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    const versionId = c.req.param('versionId');
    const body = c.req.valid('json');

    const version = await requirementsVersionStore.get(projectId, versionId);
    if (!version) {
      return c.json({ error: 'Version not found' }, 404);
    }

    return c.json({
      versionId,
      decision: body.decision,
      notes: body.notes ?? null,
      status: body.decision === 'APPROVED' ? 'build_ready' : 'rejected',
    });
  }
);

export { requirementsV2Router };
