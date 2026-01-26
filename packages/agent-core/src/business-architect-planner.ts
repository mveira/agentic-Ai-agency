/**
 * BusinessArchitectPlanner
 *
 * Orchestrates the BusinessArchitectAgent:
 * 1. Checks Strapi availability → BLOCKED if unavailable
 * 2. Fetches question templates from Strapi
 * 3. Builds agent input with normalized discovery, prior answers, missing slots
 * 4. Calls agent via LLM adapter
 * 5. Validates output against ClarificationResultSchema
 * 6. Returns typed ClarificationResult
 */

import type { LLMAdapter } from './types.js';
import type { StrapiProvider, StrapiContentItem } from './contracts/business-architect-agent.js';
import {
  ClarificationResultSchema,
  BusinessArchitectAgentOutputSchema,
  BUSINESS_ARCHITECT_AGENT_CONTRACT,
  type ClarificationResult,
  type ClarificationQuestion,
  type MissingSlots,
} from './contracts/business-architect-agent.js';

// ─── Planner Input ────────────────────────────────────────────────────────────

export interface PlannerInput {
  projectId: string;
  sessionId: string;
  round: number;
  intakeData: Record<string, unknown>;
  priorAnswers: Array<{ key: string; value: string | string[] | number }>;
  currentSummary: string[];
  missingSlots?: MissingSlots;
}

// ─── Planner Result ───────────────────────────────────────────────────────────

export interface PlannerResult {
  success: boolean;
  result?: ClarificationResult;
  error?: string;
  strapiAvailable: boolean;
  templates: StrapiContentItem[];
}

// ─── Planner Config ───────────────────────────────────────────────────────────

export interface PlannerConfig {
  strapi: StrapiProvider;
  llm: LLMAdapter;
  model?: string;
  strapiCategory?: string;
}

// ─── BusinessArchitectPlanner ─────────────────────────────────────────────────

export class BusinessArchitectPlanner {
  private config: PlannerConfig;

  constructor(config: PlannerConfig) {
    this.config = config;
  }

  async planNext(input: PlannerInput): Promise<PlannerResult> {
    // 1. Check Strapi availability
    const strapiAvailable = await this.config.strapi.available();

    if (!strapiAvailable) {
      return {
        success: true,
        result: {
          readiness: 'BLOCKED',
          summary: [],
          questions: [],
          blockReason: 'STRAPI_UNAVAILABLE',
        },
        strapiAvailable: false,
        templates: [],
      };
    }

    // 2. Fetch templates from Strapi
    let templates: StrapiContentItem[] = [];
    try {
      templates = await this.config.strapi.fetchTemplates(
        this.config.strapiCategory ?? 'question-packs'
      );
    } catch {
      return {
        success: true,
        result: {
          readiness: 'BLOCKED',
          summary: [],
          questions: [],
          blockReason: 'STRAPI_FETCH_FAILED',
        },
        strapiAvailable: true,
        templates: [],
      };
    }

    // 3. Build agent prompt
    const prompt = this.buildPrompt(input, templates);

    // 4. Call LLM
    const model = this.config.model ?? 'claude-3-sonnet';
    let llmResult;
    try {
      llmResult = await this.config.llm.complete({
        prompt,
        maxTokens: BUSINESS_ARCHITECT_AGENT_CONTRACT.maxOutputTokens,
        model,
      });
    } catch (err) {
      return {
        success: false,
        error: `LLM call failed: ${err instanceof Error ? err.message : String(err)}`,
        strapiAvailable: true,
        templates,
      };
    }

    // 5. Parse and validate output
    let parsed;
    try {
      parsed = JSON.parse(llmResult.content);
    } catch {
      return {
        success: false,
        error: 'Failed to parse LLM response as JSON',
        strapiAvailable: true,
        templates,
      };
    }

    // Try full agent output schema first
    const agentResult = BusinessArchitectAgentOutputSchema.safeParse(parsed);
    if (agentResult.success) {
      return {
        success: true,
        result: agentResult.data.result,
        strapiAvailable: true,
        templates,
      };
    }

    // Try just the result schema (in case LLM returned only the result)
    const directResult = ClarificationResultSchema.safeParse(parsed);
    if (directResult.success) {
      return {
        success: true,
        result: directResult.data,
        strapiAvailable: true,
        templates,
      };
    }

    return {
      success: false,
      error: `Invalid agent output: ${agentResult.error.message}`,
      strapiAvailable: true,
      templates,
    };
  }

  /**
   * Compute which slots are still missing based on intake + prior answers.
   */
  static computeMissingSlots(
    intakeData: Record<string, unknown>,
    priorAnswers: Array<{ key: string; value: string | string[] | number }>
  ): MissingSlots {
    const answeredKeys = new Set(priorAnswers.map((a) => a.key));
    const allData = { ...intakeData };
    for (const a of priorAnswers) {
      allData[a.key] = a.value;
    }

    const has = (keys: string[]): boolean =>
      keys.some((k) => answeredKeys.has(k) || (allData[k] !== undefined && allData[k] !== null && allData[k] !== ''));

    return {
      budget: !has(['budget', 'budgetRange', 'monthly_budget']),
      timeline: !has(['timeline', 'launch_date', 'deadline']),
      offer: !has(['offer', 'service', 'product', 'deliverables']),
      channel: !has(['channel', 'channels', 'marketing_channels']),
      goals: !has(['goals', 'goal', 'project_goal', 'primary_goal']),
      conflicts: false, // Conflicts are detected by the agent, not from slot presence
    };
  }

  private buildPrompt(input: PlannerInput, templates: StrapiContentItem[]): string {
    const parts: string[] = [];

    parts.push(`Agent: ${BUSINESS_ARCHITECT_AGENT_CONTRACT.agentId}`);
    parts.push(`Round: ${input.round}`);
    parts.push(`Project: ${input.projectId}`);
    parts.push(`Session: ${input.sessionId}`);

    parts.push('\n## Intake Data');
    parts.push(JSON.stringify(input.intakeData, null, 2));

    if (input.currentSummary.length > 0) {
      parts.push('\n## Current Understanding');
      for (const s of input.currentSummary) {
        parts.push(`- ${s}`);
      }
    }

    if (input.priorAnswers.length > 0) {
      parts.push('\n## Prior Answers');
      for (const a of input.priorAnswers) {
        parts.push(`- ${a.key}: ${JSON.stringify(a.value)}`);
      }
    }

    if (input.missingSlots) {
      const missing = Object.entries(input.missingSlots)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (missing.length > 0) {
        parts.push(`\n## Missing Slots: ${missing.join(', ')}`);
      }
    }

    if (templates.length > 0) {
      parts.push('\n## Question Templates');
      for (const t of templates) {
        parts.push(`- [${t.id}] ${t.title}: ${t.body}`);
      }
    }

    parts.push('\n## Instructions');
    parts.push('Respond with strict JSON matching ClarificationResultSchema.');
    parts.push('readiness must be one of: NEEDS_MORE_INFO, READY_FOR_REQUIREMENTS, BLOCKED');
    parts.push('Use guided choices (single_select/multi_select) where possible.');
    parts.push('Provide helpText for complex questions.');

    return parts.join('\n');
  }
}

/**
 * Create mock planner output for testing.
 */
export function createMockPlannerOutput(
  overrides: Partial<ClarificationResult> = {}
): ClarificationResult {
  return {
    readiness: 'NEEDS_MORE_INFO',
    summary: ['Target audience identified', 'Budget pending'],
    questions: [
      {
        key: 'budget',
        text: 'What is your monthly marketing budget?',
        inputType: 'number',
        required: true,
        helpText: 'In GBP.',
      },
      {
        key: 'timeline',
        text: 'When do you want to launch?',
        inputType: 'date',
        required: true,
      },
    ] as ClarificationQuestion[],
    blockReason: null,
    ...overrides,
  };
}
