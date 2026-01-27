/**
 * Agent–KB Integration
 *
 * Defines which KB tools each agent can access and provides
 * a pre-load function to inject KB data into agent task context.
 */

import type { KnowledgeStore } from './knowledge-store.js';
import { KB_TOOL_REGISTRY } from './knowledge-tools.js';
import type { KBToolResult } from './knowledge-tools.js';

// ─── Per-Agent Tool Access ───────────────────────────────────────────────────

export const AGENT_KB_TOOL_ACCESS: Record<string, string[]> = {
  'research-agent': [],
  'business-architect-agent': ['getDecisions', 'getDesignRules'],
  'requirements-engineer-agent': ['getApprovedRequirements', 'getRejectedAssumptions'],
  'strategy-funnel-agent': ['getDesignRules', 'getDecisions'],
  'copy-messaging-agent': ['getDesignRules'],
  'automation-crm-agent': ['getDesignRules'],
  'ux-design-agent': ['getDesignRules'],
  'quality-control-agent': [
    'getApprovedRequirements',
    'getApprovedAssumptions',
    'getDecisions',
    'getDesignRules',
    'getReviews',
  ],
  'proposal-strategist-agent': [
    'getApprovedRequirements',
    'getApprovedAssumptions',
  ],
};

// ─── Load Result ─────────────────────────────────────────────────────────────

export interface KBLoadResult {
  success: boolean;
  blockReason?: string;
  data: Record<string, KBToolResult>;
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export function loadKBForAgent(
  store: KnowledgeStore,
  agentId: string,
  projectId: string
): KBLoadResult {
  const toolNames = AGENT_KB_TOOL_ACCESS[agentId];

  // Agents without KB access (or with empty tool list) succeed with empty data
  if (!toolNames || toolNames.length === 0) {
    return { success: true, data: {} };
  }

  const data: Record<string, KBToolResult> = {};

  for (const toolName of toolNames) {
    const toolFn = KB_TOOL_REGISTRY[toolName];
    if (toolFn) {
      data[toolName] = toolFn(store, projectId);
    }
  }

  // Agents that require KB data BLOCK if their required tools return empty
  const agentsRequiringData: Record<string, string[]> = {
    'requirements-engineer-agent': ['getApprovedRequirements'],
    'quality-control-agent': ['getApprovedRequirements'],
  };

  const requiredTools = agentsRequiringData[agentId];
  if (requiredTools) {
    for (const requiredTool of requiredTools) {
      const result = data[requiredTool];
      if (!result || result.count === 0) {
        return {
          success: false,
          blockReason: `Missing required KB data from ${requiredTool}. Agent ${agentId} cannot proceed.`,
          data,
        };
      }
    }
  }

  return { success: true, data };
}
