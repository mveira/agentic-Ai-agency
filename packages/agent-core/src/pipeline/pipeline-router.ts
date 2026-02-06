import { z } from 'zod';
import type { PipelineRouterInput } from './pipeline-events.js';
import { PipelineStageNameSchema, type PipelineStageName } from './pipeline-stages.js';

// ─── Pipeline Action Contract ────────────────────────────────────────────────

export const PipelineActionContractSchema = z.object({
  contractId: z.string().uuid(),
  projectId: z.string(),
  targetStage: PipelineStageNameSchema,
  actionType: z.literal('MOVE_STAGE'),
  humanReadableNote: z.string(),
  internalReason: z.object({
    eventType: z.string(),
    eventId: z.string(),
    relatedIds: z.record(z.string()).optional(),
  }),
  idempotencyKey: z.string(),
  createdAt: z.string(),
});

export type PipelineActionContract = z.infer<typeof PipelineActionContractSchema>;

// ─── Stage-Moving Event Map ──────────────────────────────────────────────────
// Only these events produce contracts. All others are silently ignored.

interface StageMapping {
  targetStage: PipelineStageName;
  humanReadableNote: string;
}

const STAGE_MAPPINGS: Record<string, StageMapping> = {
  INTENT_RECEIVED: {
    targetStage: 'NEW_LEAD',
    humanReadableNote: 'New enquiry received and logged.',
  },
  ACK_SENT: {
    targetStage: 'IN_REVIEW',
    humanReadableNote: 'Acknowledgement sent — reviewing your information.',
  },
  CLARIFICATION_SESSION_CREATED: {
    targetStage: 'CLARIFICATION',
    humanReadableNote: 'We\'re asking a few focused questions to better understand your needs.',
  },
  REQUIREMENTS_VERSION_CREATED: {
    targetStage: 'REQUIREMENTS_REVIEW',
    humanReadableNote: 'Draft requirements prepared for your review.',
  },
  PROPOSAL_MARKED_SENT: {
    targetStage: 'PROPOSAL_SENT',
    humanReadableNote: 'Proposal prepared and sent.',
  },
  PROPOSAL_CLIENT_APPROVED: {
    targetStage: 'WON',
    humanReadableNote: 'Proposal approved — moving forward.',
  },
  MARK_LOST: {
    targetStage: 'LOST',
    humanReadableNote: 'Not the right fit at this time.',
  },
  NOT_A_FIT: {
    targetStage: 'LOST',
    humanReadableNote: 'Not the right fit at this time.',
  },
};

// ─── Pipeline Router (Pure, Deterministic) ───────────────────────────────────

/**
 * Computes a PipelineActionContract from a router input, or returns null
 * if the event does not produce a stage move.
 *
 * Rules:
 * - Only explicit stage-moving events produce contracts
 * - SAFETY_CHECK_COMPLETED, REQUIREMENTS_CONFIRMED, ASSUMPTIONS_APPROVED_ALL
 *   do NOT move stages
 * - Every contract includes humanReadableNote + internalReason + idempotencyKey
 */
export function computePipelineAction(input: PipelineRouterInput): PipelineActionContract | null {
  const mapping = STAGE_MAPPINGS[input.triggeringEvent];
  if (!mapping) {
    return null;
  }

  return {
    contractId: crypto.randomUUID(),
    projectId: input.projectId,
    targetStage: mapping.targetStage,
    actionType: 'MOVE_STAGE',
    humanReadableNote: mapping.humanReadableNote,
    internalReason: {
      eventType: input.triggeringEvent,
      eventId: input.eventId,
      relatedIds: input.relatedIds,
    },
    idempotencyKey: `${input.eventId}:MOVE_STAGE`,
    createdAt: new Date().toISOString(),
  };
}
