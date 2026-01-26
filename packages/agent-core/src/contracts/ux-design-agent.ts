/**
 * UX Design Agent Contract
 *
 * Purpose: Transform a MarketingBlueprint into a UX/UI specification.
 * Consumes blueprint, produces screen layouts, component specs, slot mapping, accessibility.
 */

import type { AgentContract } from '../types.js';
import { z } from 'zod';

export const UX_DESIGN_AGENT_CONTRACT: AgentContract = {
  agentId: 'ux-design-agent',
  name: 'UX Design Agent',
  description:
    'Transforms a marketing blueprint into a complete UX/UI specification. ' +
    'Defines routes, screen layouts, component specs, content slots, and accessibility rules. ' +
    'Does NOT write copy or modify the marketing strategy.',
  capabilities: [
    'Define route structure from funnel steps',
    'Design screen layouts with component blocks',
    'Specify component types and props',
    'Map content slots for copy injection',
    'Define screen states and transitions',
    'Apply accessibility rules (WCAG)',
    'Separate optional designs from core screens',
  ],
  constraints: [
    'Do NOT write copy or content text',
    'Do NOT modify the marketing strategy or funnel steps',
    'Do NOT skip accessibility requirements',
    'Must consume and reference the marketing blueprint',
    'Must map every funnel step to at least one screen',
    'Must define slots for every component that requires copy',
  ],
  maxOutputTokens: 4096,
};

/**
 * Required inputs for the UX Design Agent
 */
export const UXDesignAgentInputSchema = z.object({
  projectId: z.string().uuid(),
  blueprint: z.object({
    goal: z.string(),
    audience: z.string(),
    funnelSteps: z.array(
      z.object({
        stepId: z.string(),
        name: z.string(),
        funnelPosition: z.enum(['tofu', 'mofu', 'bofu']),
        awarenessLevel: z.enum([
          'unaware',
          'problem-aware',
          'solution-aware',
          'product-aware',
          'most-aware',
        ]),
        goal: z.string(),
        contentType: z.string(),
        cta: z.string(),
      })
    ),
    sectionsNeeded: z.record(z.array(z.string())),
    optionalEnhancements: z.array(
      z.object({
        enhancementId: z.string(),
        title: z.string(),
        description: z.string(),
      })
    ).optional(),
  }),
  constraints: z
    .object({
      maxScreens: z.number().int().positive().optional(),
      targetDevices: z.array(z.string()).optional(),
      accessibilityLevel: z.enum(['A', 'AA', 'AAA']).optional(),
    })
    .optional(),
});

export type UXDesignAgentInput = z.infer<typeof UXDesignAgentInputSchema>;

/**
 * Output schema for the UX Design Agent
 */
export const UXDesignAgentOutputSchema = z.object({
  result: z.object({
    routes: z.array(z.string()).min(1),
    screens: z.array(
      z.object({
        screenId: z.string(),
        route: z.string(),
        name: z.string(),
        layoutBlocks: z.array(
          z.object({
            blockId: z.string(),
            type: z.string(),
            order: z.number().int(),
            components: z.array(z.string()),
          })
        ),
        components: z.array(
          z.object({
            componentId: z.string(),
            type: z.string(),
            props: z.record(z.unknown()).optional(),
            slots: z.array(z.string()).default([]),
          })
        ),
        slots: z.array(z.string()),
      })
    ).min(1),
    states: z.array(
      z.object({
        stateId: z.string(),
        screenId: z.string(),
        name: z.string(),
        trigger: z.string(),
        changes: z.record(z.unknown()),
      })
    ),
    accessibility: z.array(
      z.object({
        ruleId: z.string(),
        level: z.enum(['A', 'AA', 'AAA']),
        description: z.string(),
        applies: z.array(z.string()),
      })
    ),
    optionalDesigns: z.array(
      z.object({
        designId: z.string(),
        enhancementId: z.string(),
        screenId: z.string(),
        description: z.string(),
      })
    ),
  }),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  next_actions: z.array(z.string()),
});

export type UXDesignAgentOutput = z.infer<typeof UXDesignAgentOutputSchema>;

/**
 * Frameworks required by this agent
 */
export const UX_DESIGN_AGENT_FRAMEWORKS: string[] = ['funnel-design'];

/**
 * LLM routing preference
 */
export const UX_DESIGN_AGENT_MODEL = 'claude-3-sonnet';

/**
 * Per-agent cost cap (GBP)
 */
export const UX_DESIGN_AGENT_COST_CAP = 0.75;
