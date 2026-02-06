import { z } from 'zod';

// ─── Pipeline Event Types ────────────────────────────────────────────────────

export const PipelineEventType = {
  INTENT_RECEIVED: 'INTENT_RECEIVED',
  ACK_SENT: 'ACK_SENT',
  SAFETY_CHECK_COMPLETED: 'SAFETY_CHECK_COMPLETED',
  CLARIFICATION_SESSION_CREATED: 'CLARIFICATION_SESSION_CREATED',
  REQUIREMENTS_VERSION_CREATED: 'REQUIREMENTS_VERSION_CREATED',
  REQUIREMENTS_CONFIRMED: 'REQUIREMENTS_CONFIRMED',
  ASSUMPTIONS_APPROVED_ALL: 'ASSUMPTIONS_APPROVED_ALL',
  PROPOSAL_MARKED_SENT: 'PROPOSAL_MARKED_SENT',
  PROPOSAL_CLIENT_APPROVED: 'PROPOSAL_CLIENT_APPROVED',
  MARK_LOST: 'MARK_LOST',
  NOT_A_FIT: 'NOT_A_FIT',
} as const;

export const PipelineEventTypeSchema = z.enum([
  'INTENT_RECEIVED',
  'ACK_SENT',
  'SAFETY_CHECK_COMPLETED',
  'CLARIFICATION_SESSION_CREATED',
  'REQUIREMENTS_VERSION_CREATED',
  'REQUIREMENTS_CONFIRMED',
  'ASSUMPTIONS_APPROVED_ALL',
  'PROPOSAL_MARKED_SENT',
  'PROPOSAL_CLIENT_APPROVED',
  'MARK_LOST',
  'NOT_A_FIT',
]);

export type PipelineEventType = z.infer<typeof PipelineEventTypeSchema>;

// ─── Pipeline Router Input ───────────────────────────────────────────────────

export const PipelineRouterInputSchema = z.object({
  projectId: z.string(),
  eventId: z.string(),
  triggeringEvent: PipelineEventTypeSchema,
  relatedIds: z.record(z.string()).optional(),
});

export type PipelineRouterInput = z.infer<typeof PipelineRouterInputSchema>;
