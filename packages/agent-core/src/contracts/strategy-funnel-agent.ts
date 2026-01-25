/**
 * Strategy Funnel Agent Contract
 *
 * Purpose: Design funnel strategy, offer positioning, and conversion paths.
 * Consumes research output, produces strategy for copy agent.
 */

import type { AgentContract } from '../types.js';
import { z } from 'zod';

export const STRATEGY_FUNNEL_AGENT_CONTRACT: AgentContract = {
  agentId: 'strategy-funnel-agent',
  name: 'Strategy Funnel Agent',
  description:
    'Designs funnel strategy, offer positioning, and conversion paths based on research. ' +
    'Uses Hormozi value equation and awareness levels to create strategic recommendations.',
  capabilities: [
    'Design funnel architecture (TOFU/MOFU/BOFU)',
    'Position offers using the value equation',
    'Define target awareness levels per stage',
    'Create conversion path recommendations',
    'Identify key objections to address',
    'Recommend proof elements needed',
  ],
  constraints: [
    'Do NOT write actual copy or content',
    'Do NOT implement automations',
    'Do NOT skip research input validation',
    'Do NOT ignore awareness level requirements',
    'Must specify awareness level for every recommendation',
    'Must cite which research findings support each decision',
  ],
  maxOutputTokens: 4096,
};

/**
 * Required inputs for the Strategy Funnel Agent
 */
export const StrategyFunnelAgentInputSchema = z.object({
  projectId: z.string().uuid(),
  researchSummary: z.object({
    targetAudience: z.string(),
    painPoints: z.array(z.string()),
    competitors: z.array(z.string()).optional(),
    marketPosition: z.string().optional(),
  }),
  offer: z.object({
    name: z.string(),
    description: z.string(),
    price: z.string().optional(),
    deliverables: z.array(z.string()).optional(),
  }),
  goals: z.object({
    primaryConversion: z.string().describe('e.g., "Book a call", "Purchase", "Sign up"'),
    targetMetrics: z.record(z.string()).optional(),
  }),
  constraints: z
    .object({
      budget: z.string().optional(),
      timeline: z.string().optional(),
      channels: z.array(z.string()).optional(),
    })
    .optional(),
});

export type StrategyFunnelAgentInput = z.infer<typeof StrategyFunnelAgentInputSchema>;

/**
 * Output schema for the Strategy Funnel Agent
 */
export const StrategyFunnelAgentOutputSchema = z.object({
  result: z.object({
    funnelArchitecture: z.object({
      stages: z.array(
        z.object({
          name: z.string(),
          funnelPosition: z.enum(['tofu', 'mofu', 'bofu']),
          awarenessLevel: z.enum(['unaware', 'problem-aware', 'solution-aware', 'product-aware', 'most-aware']),
          goal: z.string(),
          contentType: z.string(),
          cta: z.string(),
        })
      ),
      conversionPath: z.array(z.string()).describe('Ordered steps from entry to conversion'),
    }),
    offerPositioning: z.object({
      valueEquation: z.object({
        dreamOutcome: z.string(),
        perceivedLikelihood: z.array(z.string()).describe('Proof elements'),
        timeDelay: z.string(),
        effortSacrifice: z.string(),
      }),
      priceAnchoring: z.string().optional(),
      guaranteeRecommendation: z.string().optional(),
    }),
    objectionHandling: z.array(
      z.object({
        objection: z.string(),
        strategy: z.string(),
        proofRequired: z.string(),
      })
    ),
    proofRequirements: z.array(
      z.object({
        type: z.string(),
        description: z.string(),
        priority: z.enum(['required', 'recommended', 'optional']),
      })
    ),
  }),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  next_actions: z.array(z.string()),
});

export type StrategyFunnelAgentOutput = z.infer<typeof StrategyFunnelAgentOutputSchema>;

/**
 * Frameworks required by this agent
 */
export const STRATEGY_FUNNEL_AGENT_FRAMEWORKS: string[] = [
  'offer-economics',
  'market-awareness',
  'funnel-design',
];

/**
 * LLM routing preference
 */
export const STRATEGY_FUNNEL_AGENT_MODEL = 'claude-3-sonnet';

/**
 * Per-agent cost cap (GBP)
 */
export const STRATEGY_FUNNEL_AGENT_COST_CAP = 0.75;
