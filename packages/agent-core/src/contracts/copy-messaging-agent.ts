/**
 * Copy Messaging Agent Contract
 *
 * Purpose: Write persuasive copy based on strategy. Does NOT make
 * strategic decisions - executes the strategy provided.
 */

import type { AgentContract } from '../types.js';
import { z } from 'zod';

export const COPY_MESSAGING_AGENT_CONTRACT: AgentContract = {
  agentId: 'copy-messaging-agent',
  name: 'Copy Messaging Agent',
  description:
    'Writes persuasive marketing copy based on provided strategy. ' +
    'Executes PAS/AIDA frameworks, matches awareness levels, and creates conversion-focused content.',
  capabilities: [
    'Write headlines and hooks',
    'Create landing page copy',
    'Write email sequences',
    'Craft ad copy (social, search)',
    'Write sales page sections',
    'Create CTAs and button copy',
  ],
  constraints: [
    'Do NOT deviate from the provided strategy',
    'Do NOT change awareness level targeting',
    'Do NOT modify the offer structure',
    'Do NOT skip proof elements specified in strategy',
    'Must match the specified persuasion framework (PAS/AIDA)',
    'Must address objections specified in strategy',
    'Do NOT make strategic decisions - execute only',
  ],
  maxOutputTokens: 8192,
};

/**
 * Required inputs for the Copy Messaging Agent
 */
export const CopyMessagingAgentInputSchema = z.object({
  projectId: z.string().uuid(),
  strategy: z.object({
    awarenessLevel: z.enum(['unaware', 'problem-aware', 'solution-aware', 'product-aware', 'most-aware']),
    persuasionFramework: z.enum(['pas', 'aida']),
    valueEquation: z.object({
      dreamOutcome: z.string(),
      proofElements: z.array(z.string()),
      timeToResult: z.string(),
      effortRequired: z.string(),
    }),
    objections: z.array(z.string()),
    cta: z.string(),
  }),
  copyType: z.enum([
    'headline',
    'landing-page',
    'email-sequence',
    'ad-copy',
    'sales-page',
    'cta-buttons',
  ]),
  toneOfVoice: z
    .object({
      style: z.string().describe('e.g., "professional", "casual", "urgent"'),
      brandGuidelines: z.string().optional(),
    })
    .optional(),
  constraints: z
    .object({
      maxLength: z.number().optional(),
      requiredKeywords: z.array(z.string()).optional(),
      forbiddenWords: z.array(z.string()).optional(),
    })
    .optional(),
});

export type CopyMessagingAgentInput = z.infer<typeof CopyMessagingAgentInputSchema>;

/**
 * Output schema for the Copy Messaging Agent
 */
export const CopyMessagingAgentOutputSchema = z.object({
  result: z.object({
    copy: z.union([
      // Headline output
      z.object({
        type: z.literal('headline'),
        primary: z.string(),
        alternatives: z.array(z.string()),
        subheadline: z.string().optional(),
      }),
      // Landing page output
      z.object({
        type: z.literal('landing-page'),
        sections: z.array(
          z.object({
            name: z.string(),
            content: z.string(),
            notes: z.string().optional(),
          })
        ),
      }),
      // Email sequence output
      z.object({
        type: z.literal('email-sequence'),
        emails: z.array(
          z.object({
            subject: z.string(),
            preheader: z.string().optional(),
            body: z.string(),
            cta: z.string(),
            sendTiming: z.string().optional(),
          })
        ),
      }),
      // Ad copy output
      z.object({
        type: z.literal('ad-copy'),
        variations: z.array(
          z.object({
            headline: z.string(),
            body: z.string(),
            cta: z.string(),
            platform: z.string().optional(),
          })
        ),
      }),
      // Generic copy output
      z.object({
        type: z.string(),
        content: z.string(),
        metadata: z.record(z.unknown()).optional(),
      }),
    ]),
    frameworkApplication: z.object({
      framework: z.enum(['pas', 'aida']),
      breakdown: z.record(z.string()).describe('How each framework element was applied'),
    }),
    proofElementsUsed: z.array(z.string()),
    objectionsAddressed: z.array(z.string()),
  }),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  next_actions: z.array(z.string()),
});

export type CopyMessagingAgentOutput = z.infer<typeof CopyMessagingAgentOutputSchema>;

/**
 * Frameworks required by this agent
 */
export const COPY_MESSAGING_AGENT_FRAMEWORKS: string[] = [
  'persuasion',
  'market-awareness',
];

/**
 * LLM routing preference - GPT-4 for creative copy
 */
export const COPY_MESSAGING_AGENT_MODEL = 'gpt-4';

/**
 * Per-agent cost cap (GBP)
 */
export const COPY_MESSAGING_AGENT_COST_CAP = 1.00;
