import { z } from 'zod';
import { PipelineStageNameSchema } from './pipeline-stages.js';

// ─── Pipeline Event Types ────────────────────────────────────────────────────

export const PipelineEventType = {
  INTENT_RECEIVED: 'INTENT_RECEIVED',
  ACK_SENT: 'ACK_SENT',
  SAFETY_CHECK_COMPLETED: 'SAFETY_CHECK_COMPLETED',
  CLARIFICATION_SESSION_CREATED: 'CLARIFICATION_SESSION_CREATED',
  REQUIREMENTS_VERSION_CREATED: 'REQUIREMENTS_VERSION_CREATED',
  ASSUMPTIONS_ALL_APPROVED: 'ASSUMPTIONS_ALL_APPROVED',
  PROPOSAL_MARKED_SENT: 'PROPOSAL_MARKED_SENT',
  PROPOSAL_CLIENT_APPROVED: 'PROPOSAL_CLIENT_APPROVED',
  NOT_A_FIT: 'NOT_A_FIT',
} as const;

export const PipelineEventTypeSchema = z.enum([
  'INTENT_RECEIVED',
  'ACK_SENT',
  'SAFETY_CHECK_COMPLETED',
  'CLARIFICATION_SESSION_CREATED',
  'REQUIREMENTS_VERSION_CREATED',
  'ASSUMPTIONS_ALL_APPROVED',
  'PROPOSAL_MARKED_SENT',
  'PROPOSAL_CLIENT_APPROVED',
  'NOT_A_FIT',
]);

export type PipelineEventType = z.infer<typeof PipelineEventTypeSchema>;

// ─── Gate State Snapshot ─────────────────────────────────────────────────────

export const GateStateSnapshotSchema = z.object({
  safetyCheck: z.enum(['pending', 'passed', 'failed']).default('pending'),
  clarification: z.enum(['pending', 'needed', 'complete']).default('pending'),
  requirements: z.enum(['pending', 'draft', 'confirmed']).default('pending'),
  assumptions: z.enum(['pending', 'some_approved', 'all_approved']).default('pending'),
  proposal: z.enum(['pending', 'draft', 'in_review', 'sent', 'approved', 'expired']).default('pending'),
  proposalReview: z.enum(['pending', 'approved', 'changes_requested']).default('pending'),
  fitDecision: z.enum(['pending', 'fit', 'not_a_fit']).default('pending'),
});

export type GateStateSnapshot = z.infer<typeof GateStateSnapshotSchema>;

// ─── Pipeline Router Input ───────────────────────────────────────────────────

export const PipelineRouterInputSchema = z.object({
  projectId: z.string(),
  contactId: z.string(),
  currentStage: PipelineStageNameSchema.optional(),
  triggeringEvent: PipelineEventTypeSchema,
  gateState: GateStateSnapshotSchema,
});

export type PipelineRouterInput = z.infer<typeof PipelineRouterInputSchema>;
