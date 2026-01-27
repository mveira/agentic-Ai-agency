/**
 * Proposal Strategist Agent Contract
 *
 * Purpose: Generate scope-locked, ethical, persuasive proposals from
 * approved requirements. Consumes KB data and Strapi content to produce
 * proposalJson with compliance flags.
 *
 * This agent is part of Step 5 — Proposal System.
 */

import type { AgentContract } from '../types.js';
import { z } from 'zod';
import {
  ProposalJsonSchema,
  StrapiPricingPackageSchema,
  StrapiProposalTemplateSchema,
  StrapiPersuasionFrameworkSchema,
  StrapiHormoziFrameworkSchema,
  StrapiTimelineRuleSchema,
} from '../proposal-schemas.js';

export const PROPOSAL_STRATEGIST_AGENT_CONTRACT: AgentContract = {
  agentId: 'proposal-strategist-agent',
  name: 'Proposal Strategist Agent',
  description:
    'Generates scope-locked, ethical, persuasive proposals from approved requirements. ' +
    'Uses KB data, pricing packages, and persuasion frameworks to produce proposalJson. ' +
    'MUST NOT add scope, alter pricing, invent proof, or promise outcomes.',
  capabilities: [
    'Read approved requirements and assumptions from KB',
    'Select and recommend a pricing plan',
    'Frame the offer using Hormozi principles (ethical only)',
    'Map requirements to scope items with requirementId references',
    'Separate optional add-ons from core scope',
    'Estimate timelines from scope using timeline rules',
    'Set compliance flags (scopeLocked, noInventedProof, noOutcomePromises)',
  ],
  constraints: [
    'MUST NOT add or change scope beyond approved requirements',
    'MUST NOT alter pricing rules from Strapi packages',
    'MUST NOT invent proof, testimonials, or outcomes',
    'MUST NOT promise specific results or guarantees',
    'Every included scope item MUST reference a requirementId',
    'Optional add-ons MUST appear only in optionalAddons array',
    'Compliance flags MUST all be true',
  ],
  maxOutputTokens: 4096,
};

/**
 * Required inputs for the Proposal Strategist Agent
 */
export const ProposalStrategistAgentInputSchema = z.object({
  projectId: z.string().uuid(),
  requirementsVersionId: z.string().uuid(),
  approvedRequirements: z.array(
    z.object({
      id: z.string(),
      contentJson: z.record(z.unknown()),
      createdAt: z.string(),
    })
  ),
  approvedAssumptions: z.array(
    z.object({
      id: z.string(),
      contentJson: z.record(z.unknown()),
      createdAt: z.string(),
    })
  ),
  clientContext: z
    .object({
      industry: z.string().optional(),
      goal: z.string().optional(),
      companySize: z.string().optional(),
    })
    .optional(),
  strapiContent: z.object({
    pricingPackages: z.array(StrapiPricingPackageSchema),
    proposalTemplates: z.array(StrapiProposalTemplateSchema),
    persuasionFrameworks: z.array(StrapiPersuasionFrameworkSchema),
    hormoziFramework: StrapiHormoziFrameworkSchema,
    timelineRules: z.array(StrapiTimelineRuleSchema),
  }),
});

export type ProposalStrategistAgentInput = z.infer<typeof ProposalStrategistAgentInputSchema>;

/**
 * Output schema for the Proposal Strategist Agent
 */
export const ProposalStrategistAgentOutputSchema = z.object({
  result: ProposalJsonSchema,
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  next_actions: z.array(z.string()),
});

export type ProposalStrategistAgentOutput = z.infer<typeof ProposalStrategistAgentOutputSchema>;

/**
 * Frameworks required by this agent
 */
export const PROPOSAL_STRATEGIST_AGENT_FRAMEWORKS: string[] = [
  'offer-economics',
  'market-awareness',
  'persuasion',
];

/**
 * LLM routing preference — Claude Sonnet for strategic reasoning
 */
export const PROPOSAL_STRATEGIST_AGENT_MODEL = 'claude-3-sonnet';

/**
 * Per-agent cost cap (GBP)
 */
export const PROPOSAL_STRATEGIST_AGENT_COST_CAP = 0.75;
