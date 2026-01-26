/**
 * Agent Contracts
 *
 * Each agent has:
 * - Contract: Defines purpose, capabilities, constraints
 * - Input Schema: Required inputs with validation
 * - Output Schema: Expected output structure
 * - Frameworks: Which framework blocks to inject
 * - Model: Preferred LLM for this agent
 * - Cost Cap: Maximum cost per execution (GBP)
 */

// Research Agent
export {
  RESEARCH_AGENT_CONTRACT,
  ResearchAgentInputSchema,
  ResearchAgentOutputSchema,
  RESEARCH_AGENT_FRAMEWORKS,
  RESEARCH_AGENT_MODEL,
  RESEARCH_AGENT_COST_CAP,
} from './research-agent.js';
export type {
  ResearchAgentInput,
  ResearchAgentOutput,
} from './research-agent.js';

// Strategy Funnel Agent
export {
  STRATEGY_FUNNEL_AGENT_CONTRACT,
  StrategyFunnelAgentInputSchema,
  StrategyFunnelAgentOutputSchema,
  STRATEGY_FUNNEL_AGENT_FRAMEWORKS,
  STRATEGY_FUNNEL_AGENT_MODEL,
  STRATEGY_FUNNEL_AGENT_COST_CAP,
} from './strategy-funnel-agent.js';
export type {
  StrategyFunnelAgentInput,
  StrategyFunnelAgentOutput,
} from './strategy-funnel-agent.js';

// Copy Messaging Agent
export {
  COPY_MESSAGING_AGENT_CONTRACT,
  CopyMessagingAgentInputSchema,
  CopyMessagingAgentOutputSchema,
  COPY_MESSAGING_AGENT_FRAMEWORKS,
  COPY_MESSAGING_AGENT_MODEL,
  COPY_MESSAGING_AGENT_COST_CAP,
} from './copy-messaging-agent.js';
export type {
  CopyMessagingAgentInput,
  CopyMessagingAgentOutput,
} from './copy-messaging-agent.js';

// Automation CRM Agent
export {
  AUTOMATION_CRM_AGENT_CONTRACT,
  AutomationCRMAgentInputSchema,
  AutomationCRMAgentOutputSchema,
  AUTOMATION_CRM_AGENT_FRAMEWORKS,
  AUTOMATION_CRM_AGENT_MODEL,
  AUTOMATION_CRM_AGENT_COST_CAP,
} from './automation-crm-agent.js';
export type {
  AutomationCRMAgentInput,
  AutomationCRMAgentOutput,
} from './automation-crm-agent.js';

// UX Design Agent
export {
  UX_DESIGN_AGENT_CONTRACT,
  UXDesignAgentInputSchema,
  UXDesignAgentOutputSchema,
  UX_DESIGN_AGENT_FRAMEWORKS,
  UX_DESIGN_AGENT_MODEL,
  UX_DESIGN_AGENT_COST_CAP,
} from './ux-design-agent.js';
export type {
  UXDesignAgentInput,
  UXDesignAgentOutput,
} from './ux-design-agent.js';

// Quality Control Agent
export {
  QUALITY_CONTROL_AGENT_CONTRACT,
  QualityControlAgentInputSchema,
  QualityControlAgentOutputSchema,
  QUALITY_CONTROL_AGENT_FRAMEWORKS,
  QUALITY_CONTROL_AGENT_MODEL,
  QUALITY_CONTROL_AGENT_COST_CAP,
  ViolationSeverity,
  shouldBlock,
} from './quality-control-agent.js';
export type {
  QualityControlAgentInput,
  QualityControlAgentOutput,
  ViolationSeverityType,
} from './quality-control-agent.js';

// Business Architect Agent
export {
  BUSINESS_ARCHITECT_AGENT_CONTRACT,
  BusinessArchitectAgentInputSchema,
  BusinessArchitectAgentOutputSchema,
  ClarificationQuestionSchema,
  ClarificationResultSchema,
  ClarificationInputType,
  Readiness,
  MissingSlotsSchema,
  ApprovedQuestionSetSchema,
  BUSINESS_ARCHITECT_AGENT_FRAMEWORKS,
  BUSINESS_ARCHITECT_AGENT_MODEL,
  BUSINESS_ARCHITECT_AGENT_COST_CAP,
  InMemoryStrapiProvider,
} from './business-architect-agent.js';
export type {
  BusinessArchitectAgentInput,
  BusinessArchitectAgentOutput,
  ClarificationQuestion,
  ClarificationResult,
  MissingSlots,
  ApprovedQuestionSet,
  StrapiProvider,
  StrapiContentItem,
} from './business-architect-agent.js';

// Requirements Engineer Agent
export {
  REQUIREMENTS_ENGINEER_AGENT_CONTRACT,
  RequirementsEngineerAgentInputSchema,
  RequirementsEngineerAgentOutputSchema,
  REQUIREMENTS_ENGINEER_AGENT_FRAMEWORKS,
  REQUIREMENTS_ENGINEER_AGENT_MODEL,
  REQUIREMENTS_ENGINEER_AGENT_COST_CAP,
} from './requirements-engineer-agent.js';
export type {
  RequirementsEngineerAgentInput,
  RequirementsEngineerAgentOutput,
} from './requirements-engineer-agent.js';

import type { AgentContract } from '../types.js';
import { RESEARCH_AGENT_CONTRACT } from './research-agent.js';
import { STRATEGY_FUNNEL_AGENT_CONTRACT } from './strategy-funnel-agent.js';
import { COPY_MESSAGING_AGENT_CONTRACT } from './copy-messaging-agent.js';
import { AUTOMATION_CRM_AGENT_CONTRACT } from './automation-crm-agent.js';
import { UX_DESIGN_AGENT_CONTRACT } from './ux-design-agent.js';
import { QUALITY_CONTROL_AGENT_CONTRACT } from './quality-control-agent.js';
import { BUSINESS_ARCHITECT_AGENT_CONTRACT } from './business-architect-agent.js';
import { REQUIREMENTS_ENGINEER_AGENT_CONTRACT } from './requirements-engineer-agent.js';

/**
 * All agent contracts by ID
 */
export const ALL_AGENT_CONTRACTS: Record<string, AgentContract> = {
  'research-agent': RESEARCH_AGENT_CONTRACT,
  'strategy-funnel-agent': STRATEGY_FUNNEL_AGENT_CONTRACT,
  'copy-messaging-agent': COPY_MESSAGING_AGENT_CONTRACT,
  'automation-crm-agent': AUTOMATION_CRM_AGENT_CONTRACT,
  'ux-design-agent': UX_DESIGN_AGENT_CONTRACT,
  'quality-control-agent': QUALITY_CONTROL_AGENT_CONTRACT,
  'business-architect-agent': BUSINESS_ARCHITECT_AGENT_CONTRACT,
  'requirements-engineer-agent': REQUIREMENTS_ENGINEER_AGENT_CONTRACT,
};

/**
 * Get agent contract by ID
 */
export function getAgentContract(agentId: string): AgentContract | undefined {
  return ALL_AGENT_CONTRACTS[agentId];
}

/**
 * LLM routing map by agent
 */
export const AGENT_MODEL_ROUTING: Record<string, string> = {
  'research-agent': 'claude-3-sonnet',
  'strategy-funnel-agent': 'claude-3-sonnet',
  'copy-messaging-agent': 'gpt-4',
  'automation-crm-agent': 'gpt-4o-mini',
  'ux-design-agent': 'claude-3-sonnet',
  'quality-control-agent': 'claude-3-sonnet',
  'business-architect-agent': 'claude-3-sonnet',
  'requirements-engineer-agent': 'claude-3-sonnet',
};

/**
 * Cost caps by agent (GBP)
 */
export const AGENT_COST_CAPS: Record<string, number> = {
  'research-agent': 0.50,
  'strategy-funnel-agent': 0.75,
  'copy-messaging-agent': 1.00,
  'automation-crm-agent': 0.25,
  'ux-design-agent': 0.75,
  'quality-control-agent': 0.50,
  'business-architect-agent': 0.50,
  'requirements-engineer-agent': 0.75,
};

/**
 * Framework requirements by agent
 */
export const AGENT_FRAMEWORK_REQUIREMENTS: Record<string, string[]> = {
  'research-agent': ['market-awareness'],
  'strategy-funnel-agent': ['offer-economics', 'market-awareness', 'funnel-design'],
  'copy-messaging-agent': ['persuasion', 'market-awareness'],
  'automation-crm-agent': ['funnel-design'],
  'ux-design-agent': ['funnel-design'],
  'quality-control-agent': ['offer-economics', 'market-awareness', 'persuasion', 'funnel-design'],
  'business-architect-agent': ['market-awareness', 'offer-economics'],
  'requirements-engineer-agent': ['market-awareness', 'offer-economics'],
};
