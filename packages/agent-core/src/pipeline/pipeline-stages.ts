import { z } from 'zod';

// ─── Pipeline Stage Names ────────────────────────────────────────────────────

export const PipelineStageNameSchema = z.enum([
  'NEW_LEAD',
  'IN_REVIEW',
  'CLARIFICATION',
  'REQUIREMENTS_REVIEW',
  'PROPOSAL_SENT',
  'WON',
  'LOST',
]);

export type PipelineStageName = z.infer<typeof PipelineStageNameSchema>;

// ─── Pipeline Stage Config ───────────────────────────────────────────────────

export const PipelineStageConfigSchema = z.object({
  stageIdByName: z.record(PipelineStageNameSchema, z.string()),
  workflowIdByName: z.record(z.string(), z.string()).optional(),
});

export type PipelineStageConfig = z.infer<typeof PipelineStageConfigSchema>;
