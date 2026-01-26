/**
 * Business Architect Agent Contract
 *
 * Purpose: Drive multi-round clarification interviews to gather business requirements.
 * Analyzes intake data, identifies missing slots, generates targeted questions,
 * and assesses readiness to proceed to requirements generation.
 *
 * Strapi integration: reads existing content/templates if available, BLOCKED if not.
 */

import type { AgentContract } from '../types.js';
import { z } from 'zod';

// ─── Input Type Discriminator ─────────────────────────────────────────────────

export const ClarificationInputType = z.enum([
  'short_text',
  'long_text',
  'single_select',
  'multi_select',
  'number',
  'date',
]);

export type ClarificationInputType = z.infer<typeof ClarificationInputType>;

// ─── Question Schema ──────────────────────────────────────────────────────────

export const ClarificationQuestionSchema = z.object({
  key: z.string().describe('Unique identifier for this question slot'),
  text: z.string().describe('The question to display to the user'),
  inputType: ClarificationInputType,
  options: z.array(z.string()).optional().describe('Options for single_select / multi_select'),
  required: z.boolean().default(true),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      message: z.string().optional(),
    })
    .optional()
    .describe('Optional validation rules'),
  helpText: z.string().optional().describe('Contextual help shown below the question'),
});

export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;

// ─── Agent Result Schema ──────────────────────────────────────────────────────

export const ClarificationResultSchema = z.object({
  readiness: z
    .number()
    .min(0)
    .max(1)
    .describe('0–1 score: 1 = ready to generate requirements'),
  summary: z.array(z.string()).describe('What the agent understands so far'),
  questions: z
    .array(ClarificationQuestionSchema)
    .describe('Next batch of questions targeting missing slots'),
  blockReason: z
    .string()
    .nullable()
    .describe('Non-null if the agent cannot proceed (e.g. Strapi unavailable)'),
});

export type ClarificationResult = z.infer<typeof ClarificationResultSchema>;

// ─── Strapi Provider Interface ────────────────────────────────────────────────

export interface StrapiContentItem {
  id: string;
  type: string;
  title: string;
  body: string;
  tags: string[];
}

export interface StrapiProvider {
  available(): Promise<boolean>;
  fetchTemplates(category: string): Promise<StrapiContentItem[]>;
}

/**
 * In-memory Strapi provider for testing.
 */
export class InMemoryStrapiProvider implements StrapiProvider {
  private _available: boolean;
  private templates: Map<string, StrapiContentItem[]> = new Map();

  constructor(opts: { available?: boolean } = {}) {
    this._available = opts.available ?? true;
  }

  async available(): Promise<boolean> {
    return this._available;
  }

  setAvailable(v: boolean): void {
    this._available = v;
  }

  addTemplates(category: string, items: StrapiContentItem[]): void {
    this.templates.set(category, items);
  }

  async fetchTemplates(category: string): Promise<StrapiContentItem[]> {
    if (!this._available) {
      throw new Error('Strapi is unavailable');
    }
    return this.templates.get(category) ?? [];
  }
}

// ─── Agent Contract ───────────────────────────────────────────────────────────

export const BUSINESS_ARCHITECT_AGENT_CONTRACT: AgentContract = {
  agentId: 'business-architect-agent',
  name: 'Business Architect Agent',
  description:
    'Drives multi-round clarification interviews to understand business requirements. ' +
    'Analyzes intake data and prior answers to identify missing information slots, ' +
    'generates targeted questions with guided choices, and assesses readiness for requirements generation. ' +
    'Reads from Strapi for templates/content when available.',
  capabilities: [
    'Analyze intake data and identify information gaps',
    'Generate targeted clarification questions per round',
    'Assess readiness score (0–1) for requirements generation',
    'Summarize current understanding after each round',
    'Adapt question strategy based on previous answers',
    'Read templates from Strapi CMS (when available)',
  ],
  constraints: [
    'Do NOT generate requirements — only gather information',
    'Do NOT skip readiness assessment',
    'Do NOT ask questions already answered in prior rounds',
    'Do NOT write to Strapi — read-only access',
    'Must BLOCK with logged reason if Strapi is required but unavailable',
    'Must provide helpText for complex questions',
    'Must use guided choices (single_select/multi_select) where possible',
  ],
  maxOutputTokens: 4096,
};

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const BusinessArchitectAgentInputSchema = z.object({
  projectId: z.string().uuid(),
  sessionId: z.string(),
  round: z.number().int().min(1).describe('Current clarification round number'),
  intakeData: z
    .record(z.unknown())
    .describe('Initial intake form data'),
  priorAnswers: z
    .array(
      z.object({
        key: z.string(),
        value: z.union([z.string(), z.array(z.string()), z.number()]),
      })
    )
    .default([])
    .describe('Answers from previous rounds'),
  strapiTemplates: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        title: z.string(),
        body: z.string(),
        tags: z.array(z.string()),
      })
    )
    .default([])
    .describe('Templates fetched from Strapi (empty if unavailable)'),
});

export type BusinessArchitectAgentInput = z.infer<typeof BusinessArchitectAgentInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

export const BusinessArchitectAgentOutputSchema = z.object({
  result: ClarificationResultSchema,
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  next_actions: z.array(z.string()),
});

export type BusinessArchitectAgentOutput = z.infer<typeof BusinessArchitectAgentOutputSchema>;

// ─── Routing / Cost / Frameworks ──────────────────────────────────────────────

export const BUSINESS_ARCHITECT_AGENT_FRAMEWORKS: string[] = [
  'market-awareness',
  'offer-economics',
];

export const BUSINESS_ARCHITECT_AGENT_MODEL = 'claude-3-sonnet';

export const BUSINESS_ARCHITECT_AGENT_COST_CAP = 0.50;
