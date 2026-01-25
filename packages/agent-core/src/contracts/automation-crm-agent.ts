/**
 * Automation CRM Agent Contract
 *
 * Purpose: Generate automation workflows and CRM configurations.
 * Does NOT execute automations - generates specifications only.
 */

import type { AgentContract } from '../types.js';
import { z } from 'zod';

export const AUTOMATION_CRM_AGENT_CONTRACT: AgentContract = {
  agentId: 'automation-crm-agent',
  name: 'Automation CRM Agent',
  description:
    'Generates automation workflow specifications and CRM configurations. ' +
    'Creates trigger-action sequences, lead scoring rules, and pipeline definitions.',
  capabilities: [
    'Design email automation sequences',
    'Create lead scoring criteria',
    'Define pipeline stages and transitions',
    'Generate trigger-action workflows',
    'Specify tag and segment rules',
    'Create follow-up task sequences',
  ],
  constraints: [
    'Do NOT execute or deploy automations',
    'Do NOT access live CRM data',
    'Do NOT modify existing automations',
    'Must specify exact trigger conditions',
    'Must include error handling in workflows',
    'Must define success/failure criteria',
    'Do NOT assume CRM capabilities - specify requirements',
  ],
  maxOutputTokens: 4096,
};

/**
 * Required inputs for the Automation CRM Agent
 */
export const AutomationCRMAgentInputSchema = z.object({
  projectId: z.string().uuid(),
  automationType: z.enum([
    'email-sequence',
    'lead-scoring',
    'pipeline-definition',
    'trigger-workflow',
    'segment-rules',
    'task-automation',
  ]),
  funnelContext: z.object({
    stages: z.array(z.string()),
    conversionGoal: z.string(),
    entryPoints: z.array(z.string()),
  }),
  crmPlatform: z
    .enum(['ghl', 'hubspot', 'activecampaign', 'generic'])
    .default('generic'),
  existingAutomations: z.array(z.string()).optional().describe('Names of existing automations to avoid conflicts'),
  constraints: z
    .object({
      maxEmailsPerSequence: z.number().optional(),
      delayRules: z.string().optional(),
      complianceRequirements: z.array(z.string()).optional(),
    })
    .optional(),
});

export type AutomationCRMAgentInput = z.infer<typeof AutomationCRMAgentInputSchema>;

/**
 * Output schema for the Automation CRM Agent
 */
export const AutomationCRMAgentOutputSchema = z.object({
  result: z.object({
    workflow: z.object({
      name: z.string(),
      description: z.string(),
      trigger: z.object({
        type: z.string(),
        conditions: z.array(z.string()),
      }),
      steps: z.array(
        z.object({
          order: z.number(),
          action: z.string(),
          config: z.record(z.unknown()),
          delay: z.string().optional(),
          conditions: z.array(z.string()).optional(),
          onFailure: z.string().optional(),
        })
      ),
      exitConditions: z.array(z.string()),
    }),
    leadScoring: z
      .object({
        rules: z.array(
          z.object({
            action: z.string(),
            points: z.number(),
            decay: z.string().optional(),
          })
        ),
        thresholds: z.array(
          z.object({
            score: z.number(),
            segment: z.string(),
            action: z.string(),
          })
        ),
      })
      .optional(),
    pipelineDefinition: z
      .object({
        stages: z.array(
          z.object({
            name: z.string(),
            order: z.number(),
            entryConditions: z.array(z.string()),
            exitConditions: z.array(z.string()),
            automatedActions: z.array(z.string()),
            slaHours: z.number().optional(),
          })
        ),
      })
      .optional(),
    crmRequirements: z.array(z.string()).describe('Features required from the CRM platform'),
    implementationNotes: z.array(z.string()),
  }),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  next_actions: z.array(z.string()),
});

export type AutomationCRMAgentOutput = z.infer<typeof AutomationCRMAgentOutputSchema>;

/**
 * Frameworks required by this agent
 */
export const AUTOMATION_CRM_AGENT_FRAMEWORKS: string[] = ['funnel-design'];

/**
 * LLM routing preference - GPT-4o-mini for structured output
 */
export const AUTOMATION_CRM_AGENT_MODEL = 'gpt-4o-mini';

/**
 * Per-agent cost cap (GBP)
 */
export const AUTOMATION_CRM_AGENT_COST_CAP = 0.25;
