/**
 * Requirements Milestone Hooks
 *
 * Generates GHL action payloads for milestone transitions
 * in the requirements confirmation flow.
 */

import type { GHLAction, MoveStageAction, TriggerWorkflowAction } from './ghl-actions.js';

// ─── Hook Types ──────────────────────────────────────────────────────────────

export interface MilestoneHook {
  milestone: string;
  actions: GHLAction[];
}

export interface GenerateHookParams {
  opportunityId: string;
  pipelineId: string;
  stageId: string;
  projectId: string;
}

export interface ReviewApprovedHookParams {
  opportunityId: string;
  pipelineId: string;
  stageId: string;
  contactId: string;
  workflowId: string;
  projectId: string;
}

// ─── Hook Builders ───────────────────────────────────────────────────────────

/**
 * Build hooks for when requirements are generated.
 * Moves the GHL opportunity to 'Requirements Review' stage.
 */
export function buildGenerateHooks(params: GenerateHookParams): MilestoneHook {
  const moveAction: MoveStageAction = {
    action: 'move_stage',
    opportunityId: params.opportunityId,
    pipelineId: params.pipelineId,
    stageId: params.stageId,
    reason: `Requirements generated for project ${params.projectId}. Moving to Requirements Review.`,
  };

  return {
    milestone: 'requirements_generated',
    actions: [moveAction],
  };
}

/**
 * Build hooks for when review is approved.
 * Moves the GHL opportunity to 'Build Ready' stage
 * and triggers a notification workflow.
 */
export function buildReviewApprovedHooks(params: ReviewApprovedHookParams): MilestoneHook {
  const moveAction: MoveStageAction = {
    action: 'move_stage',
    opportunityId: params.opportunityId,
    pipelineId: params.pipelineId,
    stageId: params.stageId,
    reason: `Review approved for project ${params.projectId}. Moving to Build Ready.`,
  };

  const workflowAction: TriggerWorkflowAction = {
    action: 'trigger_workflow',
    contactId: params.contactId,
    workflowId: params.workflowId,
    reason: `Review approved for project ${params.projectId}. Sending notification.`,
  };

  return {
    milestone: 'review_approved',
    actions: [moveAction, workflowAction],
  };
}
