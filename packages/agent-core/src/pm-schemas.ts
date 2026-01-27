/**
 * Project Management Agent — Domain Schemas
 *
 * Deterministic, internal-only schemas for readiness computation,
 * blocker detection, and ops reporting.
 */

import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────────────────────

export const ProjectPhaseSchema = z.enum([
  'INTAKE',
  'CLARIFICATION',
  'REQUIREMENTS',
  'PROPOSAL',
  'BUILD',
  'SUPPORT',
]);
export type ProjectPhase = z.infer<typeof ProjectPhaseSchema>;

export const ReadinessStatusSchema = z.enum([
  'READY',
  'BLOCKED',
  'NEEDS_HUMAN',
  'NOT_APPLICABLE',
]);
export type ReadinessStatus = z.infer<typeof ReadinessStatusSchema>;

export const BlockerTypeSchema = z.enum([
  'MISSING_APPROVAL',
  'BUDGET_EXCEEDED',
  'REPEATED_FAILURE',
  'INTEGRATION_DOWN',
  'STALE_QUEUE',
  'DATA_MISSING',
]);
export type BlockerType = z.infer<typeof BlockerTypeSchema>;

export const BlockerSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type BlockerSeverity = z.infer<typeof BlockerSeveritySchema>;

// ─── Blocker ────────────────────────────────────────────────────────────────

export const BlockerReferenceSchema = z.object({
  eventId: z.string().optional(),
  runId: z.string().optional(),
  versionId: z.string().optional(),
});
export type BlockerReference = z.infer<typeof BlockerReferenceSchema>;

export const BlockerSchema = z.object({
  type: BlockerTypeSchema,
  severity: BlockerSeveritySchema,
  message: z.string(),
  references: z.array(BlockerReferenceSchema).optional(),
});
export type Blocker = z.infer<typeof BlockerSchema>;

// ─── Gates ──────────────────────────────────────────────────────────────────

export const GatesSchema = z.object({
  requirementsApproved: z.boolean().optional(),
  assumptionsAllApproved: z.boolean().optional(),
  proposalExists: z.boolean().optional(),
  proposalReviewApproved: z.boolean().optional(),
  budgetOk: z.boolean().optional(),
  integrationsOk: z.boolean().optional(),
});
export type Gates = z.infer<typeof GatesSchema>;

// ─── Next Action ────────────────────────────────────────────────────────────

export const NextAllowedActionSchema = z.object({
  action: z.string(),
  owner: z.enum(['agent', 'human']),
  details: z.string().optional(),
});
export type NextAllowedAction = z.infer<typeof NextAllowedActionSchema>;

// ─── Suggested Automation ───────────────────────────────────────────────────

export const SuggestedAutomationSchema = z.object({
  action: z.string(),
  when: z.string(),
});
export type SuggestedAutomation = z.infer<typeof SuggestedAutomationSchema>;

// ─── Readiness Report ───────────────────────────────────────────────────────

export const ProjectReadinessReportSchema = z.object({
  projectId: z.string(),
  phase: ProjectPhaseSchema,
  status: ReadinessStatusSchema,
  reasons: z.array(z.string()),
  gates: GatesSchema,
  nextAllowedActions: z.array(NextAllowedActionSchema),
  suggestedAutomations: z.array(SuggestedAutomationSchema),
  updatedAt: z.string(),
});
export type ProjectReadinessReport = z.infer<typeof ProjectReadinessReportSchema>;

// ─── Ops Summary ────────────────────────────────────────────────────────────

export const CompletionSchema = z.object({
  percent: z.number().min(0).max(100),
  completedTasks: z.number().min(0),
  totalTasks: z.number().min(0),
});
export type Completion = z.infer<typeof CompletionSchema>;

export const CostsSchema = z.object({
  totalUsd: z.number().min(0),
  byPhase: z.record(z.string(), z.number()),
  last24hUsd: z.number().min(0).optional(),
});
export type Costs = z.infer<typeof CostsSchema>;

export const HealthSchema = z.object({
  queueDepth: z.number().min(0),
  lastProcessedAt: z.string(),
  errorRate: z.number().min(0).max(1),
});
export type Health = z.infer<typeof HealthSchema>;

export const ProjectOpsSummarySchema = z.object({
  projectId: z.string(),
  phase: ProjectPhaseSchema,
  completion: CompletionSchema,
  costs: CostsSchema,
  health: HealthSchema,
  topBlockers: z.array(BlockerSchema),
});
export type ProjectOpsSummary = z.infer<typeof ProjectOpsSummarySchema>;
