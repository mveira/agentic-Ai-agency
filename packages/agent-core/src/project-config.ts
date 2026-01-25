import { z } from 'zod';

/**
 * Project configuration for parallel rollout controls.
 *
 * Allows agency and client CRMs to run the same agents
 * with different execution behavior.
 */
export const ProjectConfigSchema = z.object({
  projectId: z.string(),
  dryRun: z.boolean().default(false),
  enabledAgents: z.array(z.string()).default([]),
  enabledActions: z.array(z.string()).default([]),
  allowlists: z
    .object({
      pipelineStages: z
        .array(
          z.object({
            pipelineId: z.string(),
            stageId: z.string(),
          })
        )
        .default([]),
      workflowIds: z.array(z.string()).default([]),
    })
    .default({ pipelineStages: [], workflowIds: [] }),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/**
 * Blocked reason codes for telemetry
 */
export type BlockedReason =
  | 'dry-run'
  | 'agent-disabled'
  | 'action-disabled'
  | 'budget-exceeded'
  | 'stage-not-allowlisted'
  | 'workflow-not-allowlisted'
  | 'duplicate-execution';

/**
 * Result of an execution guard check
 */
export interface ExecutionGuardResult {
  allowed: boolean;
  dryRun: boolean;
  blockedReason?: BlockedReason;
  message?: string;
}
