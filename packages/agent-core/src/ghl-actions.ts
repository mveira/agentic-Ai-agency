import { z } from 'zod';
import type { ProjectConfig, ExecutionGuardResult, BlockedReason } from './project-config.js';

/**
 * GHL Action Schemas
 */

export const MoveStageActionSchema = z.object({
  action: z.literal('move_stage'),
  opportunityId: z.string(),
  pipelineId: z.string(),
  stageId: z.string(),
  reason: z.string(),
});

export type MoveStageAction = z.infer<typeof MoveStageActionSchema>;

export const TriggerWorkflowActionSchema = z.object({
  action: z.literal('trigger_workflow'),
  contactId: z.string(),
  workflowId: z.string(),
  reason: z.string(),
});

export type TriggerWorkflowAction = z.infer<typeof TriggerWorkflowActionSchema>;

export const GHLActionSchema = z.discriminatedUnion('action', [
  MoveStageActionSchema,
  TriggerWorkflowActionSchema,
]);

export type GHLAction = z.infer<typeof GHLActionSchema>;

/**
 * GHL Pipeline/Stage data
 */
export interface GHLPipeline {
  id: string;
  name: string;
  stages: Array<{
    id: string;
    name: string;
    position: number;
  }>;
}

/**
 * GHL Adapter Interface
 *
 * Abstracts GHL API calls for testability.
 */
export interface GHLAdapter {
  getPipelines(): Promise<GHLPipeline[]>;
  updateOpportunityStage(
    opportunityId: string,
    pipelineId: string,
    stageId: string
  ): Promise<{ success: boolean; error?: string }>;
  addContactToWorkflow(
    contactId: string,
    workflowId: string
  ): Promise<{ success: boolean; error?: string }>;
}

/**
 * Execution result for a GHL action
 */
export interface ActionExecutionResult {
  action: GHLAction;
  executed: boolean;
  dryRun: boolean;
  blocked: boolean;
  blockedReason?: BlockedReason;
  message: string;
  payloadHash: string;
}

/**
 * Generate a deterministic hash for idempotency checks
 */
export function computePayloadHash(action: GHLAction): string {
  if (action.action === 'move_stage') {
    return `move_stage:${action.opportunityId}:${action.pipelineId}:${action.stageId}`;
  }
  return `trigger_workflow:${action.contactId}:${action.workflowId}`;
}

/**
 * Check if a move_stage action is allowlisted
 */
function checkStageAllowlist(
  config: ProjectConfig,
  pipelineId: string,
  stageId: string
): ExecutionGuardResult {
  const stages = config.allowlists.pipelineStages;
  if (stages.length === 0) {
    return { allowed: true, dryRun: config.dryRun };
  }
  const found = stages.some((s) => s.pipelineId === pipelineId && s.stageId === stageId);
  if (!found) {
    return {
      allowed: false,
      dryRun: config.dryRun,
      blockedReason: 'stage-not-allowlisted',
      message: `Pipeline ${pipelineId} / stage ${stageId} is not allowlisted for project ${config.projectId}`,
    };
  }
  return { allowed: true, dryRun: config.dryRun };
}

/**
 * Check if a trigger_workflow action is allowlisted
 */
function checkWorkflowAllowlist(
  config: ProjectConfig,
  workflowId: string
): ExecutionGuardResult {
  const workflows = config.allowlists.workflowIds;
  if (workflows.length === 0) {
    return { allowed: true, dryRun: config.dryRun };
  }
  if (!workflows.includes(workflowId)) {
    return {
      allowed: false,
      dryRun: config.dryRun,
      blockedReason: 'workflow-not-allowlisted',
      message: `Workflow ${workflowId} is not allowlisted for project ${config.projectId}`,
    };
  }
  return { allowed: true, dryRun: config.dryRun };
}

/**
 * Action Executor
 *
 * Executes GHL actions with full guard checks:
 * - dryRun mode
 * - allowlist enforcement
 * - idempotency via payloadHash tracking
 */
export class ActionExecutor {
  private adapter: GHLAdapter;
  private executedHashes: Set<string> = new Set();

  constructor(adapter: GHLAdapter) {
    this.adapter = adapter;
  }

  /**
   * Execute a GHL action with all guards applied
   */
  async execute(params: {
    action: GHLAction;
    config: ProjectConfig;
  }): Promise<ActionExecutionResult> {
    const { action, config } = params;
    const payloadHash = computePayloadHash(action);

    // 1. Check idempotency
    if (this.executedHashes.has(payloadHash)) {
      return {
        action,
        executed: false,
        dryRun: config.dryRun,
        blocked: true,
        blockedReason: 'duplicate-execution',
        message: `Duplicate action blocked: ${payloadHash}`,
        payloadHash,
      };
    }

    // 2. Check action-level enablement
    if (config.enabledActions.length > 0 && !config.enabledActions.includes(action.action)) {
      return {
        action,
        executed: false,
        dryRun: config.dryRun,
        blocked: true,
        blockedReason: 'action-disabled',
        message: `Action '${action.action}' is not enabled for project '${config.projectId}'`,
        payloadHash,
      };
    }

    // 3. Check allowlists
    if (action.action === 'move_stage') {
      const stageCheck = checkStageAllowlist(config, action.pipelineId, action.stageId);
      if (!stageCheck.allowed) {
        return {
          action,
          executed: false,
          dryRun: config.dryRun,
          blocked: true,
          blockedReason: stageCheck.blockedReason,
          message: stageCheck.message!,
          payloadHash,
        };
      }
    } else if (action.action === 'trigger_workflow') {
      const wfCheck = checkWorkflowAllowlist(config, action.workflowId);
      if (!wfCheck.allowed) {
        return {
          action,
          executed: false,
          dryRun: config.dryRun,
          blocked: true,
          blockedReason: wfCheck.blockedReason,
          message: wfCheck.message!,
          payloadHash,
        };
      }
    }

    // 4. Check dryRun
    if (config.dryRun) {
      this.executedHashes.add(payloadHash);
      return {
        action,
        executed: false,
        dryRun: true,
        blocked: false,
        message: `Dry run: ${action.action} logged but not executed`,
        payloadHash,
      };
    }

    // 5. Execute the action
    const result = await this.callAdapter(action);

    if (result.success) {
      this.executedHashes.add(payloadHash);
    }

    return {
      action,
      executed: result.success,
      dryRun: false,
      blocked: !result.success,
      blockedReason: result.success ? undefined : undefined,
      message: result.success
        ? `${action.action} executed successfully`
        : `${action.action} failed: ${result.error}`,
      payloadHash,
    };
  }

  private async callAdapter(action: GHLAction): Promise<{ success: boolean; error?: string }> {
    if (action.action === 'move_stage') {
      return this.adapter.updateOpportunityStage(
        action.opportunityId,
        action.pipelineId,
        action.stageId
      );
    }
    return this.adapter.addContactToWorkflow(action.contactId, action.workflowId);
  }

  /**
   * Check if a payload hash has already been executed
   */
  hasExecuted(payloadHash: string): boolean {
    return this.executedHashes.has(payloadHash);
  }

  /**
   * Clear executed hashes (for testing)
   */
  clearHistory(): void {
    this.executedHashes.clear();
  }
}

/**
 * Mock GHL adapter for testing
 */
export class MockGHLAdapter implements GHLAdapter {
  public calls: Array<{ method: string; args: unknown[] }> = [];
  public shouldFail = false;

  async getPipelines(): Promise<GHLPipeline[]> {
    this.calls.push({ method: 'getPipelines', args: [] });
    return [
      {
        id: 'pipe-001',
        name: 'Sales Pipeline',
        stages: [
          { id: 'stage-new', name: 'New Lead', position: 0 },
          { id: 'stage-qual', name: 'Qualified', position: 1 },
          { id: 'stage-closed', name: 'Closed Won', position: 2 },
        ],
      },
    ];
  }

  async updateOpportunityStage(
    opportunityId: string,
    pipelineId: string,
    stageId: string
  ): Promise<{ success: boolean; error?: string }> {
    this.calls.push({
      method: 'updateOpportunityStage',
      args: [opportunityId, pipelineId, stageId],
    });
    if (this.shouldFail) {
      return { success: false, error: 'Mock failure' };
    }
    return { success: true };
  }

  async addContactToWorkflow(
    contactId: string,
    workflowId: string
  ): Promise<{ success: boolean; error?: string }> {
    this.calls.push({
      method: 'addContactToWorkflow',
      args: [contactId, workflowId],
    });
    if (this.shouldFail) {
      return { success: false, error: 'Mock failure' };
    }
    return { success: true };
  }
}
