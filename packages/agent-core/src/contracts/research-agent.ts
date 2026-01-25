/**
 * Research Agent Contract
 *
 * Purpose: Gather and synthesize market intelligence, competitor analysis,
 * and audience insights. Does NOT create strategy or content.
 */

import type { AgentContract } from '../types.js';
import { z } from 'zod';

export const RESEARCH_AGENT_CONTRACT: AgentContract = {
  agentId: 'research-agent',
  name: 'Research Agent',
  description:
    'Gathers and synthesizes market intelligence, competitor analysis, and audience insights. ' +
    'Provides raw research findings for strategy agents to interpret.',
  capabilities: [
    'Analyze competitor positioning and messaging',
    'Identify target audience pain points and desires',
    'Research market trends and opportunities',
    'Compile industry benchmarks and statistics',
    'Summarize customer reviews and feedback',
    'Map competitor offer structures',
  ],
  constraints: [
    'Do NOT create strategy recommendations',
    'Do NOT write marketing copy',
    'Do NOT make business decisions',
    'Do NOT assume data that was not provided',
    'Do NOT extrapolate beyond the evidence',
    'Flag gaps in research as unknowns',
  ],
  maxOutputTokens: 4096,
};

/**
 * Required inputs for the Research Agent
 */
export const ResearchAgentInputSchema = z.object({
  projectId: z.string().uuid(),
  researchType: z.enum([
    'competitor-analysis',
    'audience-research',
    'market-trends',
    'offer-teardown',
    'review-analysis',
  ]),
  subject: z.string().describe('What to research (company name, market, product, etc.)'),
  context: z
    .object({
      industry: z.string().optional(),
      targetMarket: z.string().optional(),
      existingData: z.array(z.string()).optional(),
    })
    .optional(),
  depth: z.enum(['surface', 'standard', 'deep']).default('standard'),
});

export type ResearchAgentInput = z.infer<typeof ResearchAgentInputSchema>;

/**
 * Output schema for the Research Agent
 */
export const ResearchAgentOutputSchema = z.object({
  result: z.object({
    summary: z.string().describe('Executive summary of findings'),
    findings: z.array(
      z.object({
        category: z.string(),
        insight: z.string(),
        confidence: z.enum(['high', 'medium', 'low']),
        sources: z.array(z.string()).optional(),
      })
    ),
    dataPoints: z
      .array(
        z.object({
          metric: z.string(),
          value: z.string(),
          source: z.string().optional(),
        })
      )
      .optional(),
    gaps: z.array(z.string()).describe('Information that could not be found'),
  }),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  next_actions: z.array(z.string()),
});

export type ResearchAgentOutput = z.infer<typeof ResearchAgentOutputSchema>;

/**
 * Frameworks required by this agent
 */
export const RESEARCH_AGENT_FRAMEWORKS: string[] = ['market-awareness'];

/**
 * LLM routing preference
 */
export const RESEARCH_AGENT_MODEL = 'claude-3-sonnet';

/**
 * Per-agent cost cap (GBP)
 */
export const RESEARCH_AGENT_COST_CAP = 0.50;
