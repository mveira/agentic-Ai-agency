import type { ProjectConfig, ExecutionGuardResult, BlockedReason } from './project-config.js';

/**
 * Execution Guard
 *
 * Checks project configuration before allowing agent execution or actions.
 * Enables parallel rollout where agency and client projects behave differently.
 */

/**
 * Check if an agent is allowed to execute for a given project.
 */
export function checkAgentExecution(params: {
  config: ProjectConfig;
  agentId: string;
}): ExecutionGuardResult {
  const { config, agentId } = params;

  // Check if agent is enabled for this project
  if (config.enabledAgents.length > 0 && !config.enabledAgents.includes(agentId)) {
    return {
      allowed: false,
      dryRun: config.dryRun,
      blockedReason: 'agent-disabled',
      message: `Agent '${agentId}' is not enabled for project '${config.projectId}'`,
    };
  }

  // Check dry run mode
  if (config.dryRun) {
    return {
      allowed: false,
      dryRun: true,
      blockedReason: 'dry-run',
      message: `Dry run: agent '${agentId}' execution logged but not performed`,
    };
  }

  return {
    allowed: true,
    dryRun: false,
  };
}

/**
 * Check if a specific action is allowed for a given project.
 * Actions are external side effects (e.g., GHL API calls).
 */
export function checkActionExecution(params: {
  config: ProjectConfig;
  actionId: string;
}): ExecutionGuardResult {
  const { config, actionId } = params;

  // Check if action is enabled for this project
  if (config.enabledActions.length > 0 && !config.enabledActions.includes(actionId)) {
    return {
      allowed: false,
      dryRun: config.dryRun,
      blockedReason: 'action-disabled',
      message: `Action '${actionId}' is not enabled for project '${config.projectId}'`,
    };
  }

  // Check dry run mode
  if (config.dryRun) {
    return {
      allowed: false,
      dryRun: true,
      blockedReason: 'dry-run',
      message: `Dry run: action '${actionId}' logged but not executed`,
    };
  }

  return {
    allowed: true,
    dryRun: false,
  };
}

/**
 * Log an execution guard decision for telemetry.
 */
export function formatGuardLog(params: {
  projectId: string;
  agentId?: string;
  actionId?: string;
  result: ExecutionGuardResult;
}): {
  projectId: string;
  agentId?: string;
  actionId?: string;
  dryRun: boolean;
  allowed: boolean;
  blockedReason?: BlockedReason;
  message?: string;
  timestamp: string;
} {
  return {
    projectId: params.projectId,
    agentId: params.agentId,
    actionId: params.actionId,
    dryRun: params.result.dryRun,
    allowed: params.result.allowed,
    blockedReason: params.result.blockedReason,
    message: params.result.message,
    timestamp: new Date().toISOString(),
  };
}
