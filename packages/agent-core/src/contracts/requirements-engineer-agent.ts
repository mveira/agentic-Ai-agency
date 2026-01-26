/**
 * Requirements Engineer Agent Contract
 *
 * Purpose: Generate requirements + assumptions from clarification facts.
 * Uses MoSCoW prioritization, incorporates change requests from prior versions,
 * and applies rubrics fetched from Strapi.
 *
 * Strapi integration: reads rubrics/templates if available, BLOCKED if not.
 */

import type { AgentContract } from '../types.js';
import { z } from 'zod';
import { RequirementsBundleSchema } from '../requirements-schemas.js';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const RequirementsEngineerAgentInputSchema = z.object({
  projectId: z.string().uuid(),
  factsSnapshot: z.object({
    summary: z.array(z.string()),
    structuredAnswers: z.array(
      z.object({
        key: z.string(),
        value: z.union([z.string(), z.array(z.string()), z.number()]),
      })
    ),
  }),
  constraints: z.record(z.unknown()).optional(),
  rubric: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        title: z.string(),
        body: z.string(),
        tags: z.array(z.string()),
      })
    )
    .optional()
    .describe('Rubric items fetched from Strapi'),
  priorVersion: z
    .object({
      versionNumber: z.number(),
      requirements: z.array(z.unknown()),
      assumptions: z.array(z.unknown()),
    })
    .optional()
    .describe('Previous version for regeneration context'),
  changeRequests: z
    .array(
      z.object({
        type: z.enum(['requirement', 'assumption']),
        itemId: z.string(),
        notes: z.string(),
      })
    )
    .optional()
    .describe('Change requests from rejected items'),
});

export type RequirementsEngineerAgentInput = z.infer<typeof RequirementsEngineerAgentInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

export const RequirementsEngineerAgentOutputSchema = z.object({
  result: RequirementsBundleSchema,
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  next_actions: z.array(z.string()),
});

export type RequirementsEngineerAgentOutput = z.infer<typeof RequirementsEngineerAgentOutputSchema>;

// ─── Agent Contract ───────────────────────────────────────────────────────────

export const REQUIREMENTS_ENGINEER_AGENT_CONTRACT: AgentContract = {
  agentId: 'requirements-engineer-agent',
  name: 'Requirements Engineer Agent',
  description:
    'Generates structured requirements and assumptions from clarification facts. ' +
    'Uses MoSCoW prioritization (MUST/SHOULD/COULD), incorporates change requests ' +
    'from rejected items in prior versions, and applies rubrics from Strapi CMS. ' +
    'Reads from Strapi for rubrics/templates when available.',
  capabilities: [
    'Generate requirements from facts with MoSCoW prioritization',
    'Generate assumptions with supporting reasons',
    'Incorporate change requests from rejected items',
    'Apply rubrics from Strapi CMS',
    'Produce open questions for unresolved items',
    'Reference prior version context during regeneration',
  ],
  constraints: [
    'Do NOT gather information — only generate requirements from provided facts',
    'Do NOT skip assumptions — every version must include assumptions',
    'Do NOT override confirmed requirements from prior versions',
    'Do NOT write to Strapi — read-only access',
    'Must BLOCK with logged reason if Strapi is required but unavailable',
    'Must use MoSCoW prioritization for all requirements',
  ],
  maxOutputTokens: 4096,
};

// ─── Routing / Cost / Frameworks ──────────────────────────────────────────────

export const REQUIREMENTS_ENGINEER_AGENT_FRAMEWORKS: string[] = [
  'market-awareness',
  'offer-economics',
];

export const REQUIREMENTS_ENGINEER_AGENT_MODEL = 'claude-3-sonnet';

export const REQUIREMENTS_ENGINEER_AGENT_COST_CAP = 0.75;
