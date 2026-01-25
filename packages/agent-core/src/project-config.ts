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
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/**
 * Blocked reason codes for telemetry
 */
export type BlockedReason = 'dry-run' | 'agent-disabled' | 'action-disabled' | 'budget-exceeded';

/**
 * Result of an execution guard check
 */
export interface ExecutionGuardResult {
  allowed: boolean;
  dryRun: boolean;
  blockedReason?: BlockedReason;
  message?: string;
}
