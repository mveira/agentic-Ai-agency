/**
 * RequirementsEngineerPlanner
 *
 * Orchestrates the RequirementsEngineerAgent:
 * 1. Checks Strapi availability → BLOCKED if unavailable
 * 2. Fetches rubric templates from Strapi
 * 3. Builds agent input with facts, prior version, change requests
 * 4. Calls agent via LLM adapter
 * 5. Validates output against RequirementsBundleSchema
 * 6. Returns typed RequirementsBundle
 */

import type { LLMAdapter } from './types.js';
import type { StrapiProvider, StrapiContentItem } from './contracts/business-architect-agent.js';
import {
  RequirementsBundleSchema,
  type RequirementsBundle,
  type ChangeRequest,
} from './requirements-schemas.js';
import {
  RequirementsEngineerAgentOutputSchema,
  REQUIREMENTS_ENGINEER_AGENT_CONTRACT,
} from './contracts/requirements-engineer-agent.js';

// ─── Planner Input ────────────────────────────────────────────────────────────

export interface RequirementsPlannerInput {
  projectId: string;
  factsSnapshot: {
    summary: string[];
    structuredAnswers: Array<{ key: string; value: string | string[] | number }>;
  };
  constraints?: Record<string, unknown>;
  priorVersion?: {
    versionNumber: number;
    requirements: unknown[];
    assumptions: unknown[];
  };
  changeRequests?: ChangeRequest[];
}

// ─── Planner Result ───────────────────────────────────────────────────────────

export interface RequirementsPlannerResult {
  success: boolean;
  bundle?: RequirementsBundle;
  error?: string;
  strapiAvailable: boolean;
  rubric: StrapiContentItem[];
}

// ─── Planner Config ───────────────────────────────────────────────────────────

export interface RequirementsPlannerConfig {
  strapi: StrapiProvider;
  llm: LLMAdapter;
  model?: string;
  strapiCategory?: string;
}

// ─── RequirementsEngineerPlanner ──────────────────────────────────────────────

export class RequirementsEngineerPlanner {
  private config: RequirementsPlannerConfig;

  constructor(config: RequirementsPlannerConfig) {
    this.config = config;
  }

  async generate(input: RequirementsPlannerInput): Promise<RequirementsPlannerResult> {
    // 1. Check Strapi availability
    const strapiAvailable = await this.config.strapi.available();

    if (!strapiAvailable) {
      return {
        success: false,
        error: 'STRAPI_UNAVAILABLE',
        strapiAvailable: false,
        rubric: [],
      };
    }

    // 2. Fetch rubric from Strapi
    let rubric: StrapiContentItem[] = [];
    try {
      rubric = await this.config.strapi.fetchTemplates(
        this.config.strapiCategory ?? 'requirements-rubric'
      );
    } catch {
      return {
        success: false,
        error: 'STRAPI_FETCH_FAILED',
        strapiAvailable: true,
        rubric: [],
      };
    }

    // 3. Build agent prompt
    const prompt = this.buildPrompt(input, rubric);

    // 4. Call LLM
    const model = this.config.model ?? 'claude-3-sonnet';
    let llmResult;
    try {
      llmResult = await this.config.llm.complete({
        prompt,
        maxTokens: REQUIREMENTS_ENGINEER_AGENT_CONTRACT.maxOutputTokens,
        model,
      });
    } catch (err) {
      return {
        success: false,
        error: `LLM call failed: ${err instanceof Error ? err.message : String(err)}`,
        strapiAvailable: true,
        rubric,
      };
    }

    // 5. Parse and validate output
    let parsed;
    try {
      parsed = JSON.parse(llmResult.text);
    } catch {
      return {
        success: false,
        error: 'Failed to parse LLM response as JSON',
        strapiAvailable: true,
        rubric,
      };
    }

    // Try full agent output schema first
    const agentResult = RequirementsEngineerAgentOutputSchema.safeParse(parsed);
    if (agentResult.success) {
      return {
        success: true,
        bundle: agentResult.data.result,
        strapiAvailable: true,
        rubric,
      };
    }

    // Try just the bundle schema (in case LLM returned only the result)
    const directResult = RequirementsBundleSchema.safeParse(parsed);
    if (directResult.success) {
      return {
        success: true,
        bundle: directResult.data,
        strapiAvailable: true,
        rubric,
      };
    }

    return {
      success: false,
      error: `Invalid agent output: ${agentResult.error.message}`,
      strapiAvailable: true,
      rubric,
    };
  }

  private buildPrompt(input: RequirementsPlannerInput, rubric: StrapiContentItem[]): string {
    const parts: string[] = [];

    parts.push(`Agent: ${REQUIREMENTS_ENGINEER_AGENT_CONTRACT.agentId}`);
    parts.push(`Project: ${input.projectId}`);

    parts.push('\n## Facts Snapshot');
    if (input.factsSnapshot.summary.length > 0) {
      parts.push('### Summary');
      for (const s of input.factsSnapshot.summary) {
        parts.push(`- ${s}`);
      }
    }
    if (input.factsSnapshot.structuredAnswers.length > 0) {
      parts.push('### Structured Answers');
      for (const a of input.factsSnapshot.structuredAnswers) {
        parts.push(`- ${a.key}: ${JSON.stringify(a.value)}`);
      }
    }

    if (input.constraints) {
      parts.push('\n## Constraints');
      parts.push(JSON.stringify(input.constraints, null, 2));
    }

    if (input.priorVersion) {
      parts.push('\n## Prior Version');
      parts.push(`Version: ${input.priorVersion.versionNumber}`);
      parts.push(`Requirements count: ${input.priorVersion.requirements.length}`);
      parts.push(`Assumptions count: ${input.priorVersion.assumptions.length}`);
      parts.push(JSON.stringify(input.priorVersion, null, 2));
    }

    if (input.changeRequests && input.changeRequests.length > 0) {
      parts.push('\n## Change Requests');
      for (const cr of input.changeRequests) {
        parts.push(`- [${cr.type}] ${cr.itemId}: ${cr.notes}`);
      }
    }

    if (rubric.length > 0) {
      parts.push('\n## Rubric');
      for (const r of rubric) {
        parts.push(`- [${r.id}] ${r.title}: ${r.body}`);
      }
    }

    parts.push('\n## Instructions');
    parts.push('Respond with strict JSON matching RequirementsBundleSchema.');
    parts.push('Each requirement MUST have a MoSCoW priority: MUST, SHOULD, or COULD.');
    parts.push('Each assumption MUST have a statement and a reason.');
    parts.push('Include openQuestions for any unresolved items.');
    parts.push('Do NOT override confirmed requirements from prior versions.');

    return parts.join('\n');
  }
}

// ─── Mock Helper ──────────────────────────────────────────────────────────────

/**
 * Create mock bundle output for testing.
 */
export function createMockBundleOutput(
  overrides: Partial<RequirementsBundle> = {}
): RequirementsBundle {
  return {
    requirements: [
      {
        id: 'req-1',
        title: 'Landing page with hero section',
        details: 'Must include CTA above the fold',
        priority: 'MUST',
        category: 'design',
      },
      {
        id: 'req-2',
        title: 'Social proof section',
        details: 'Testimonials and trust badges',
        priority: 'SHOULD',
        category: 'design',
      },
      {
        id: 'req-3',
        title: 'Exit-intent popup',
        details: 'Popup with discount offer on exit',
        priority: 'COULD',
        category: 'enhancement',
      },
    ],
    assumptions: [
      {
        id: 'asn-1',
        statement: 'Client wants a modern, minimal design aesthetic',
        reason: 'Based on intake form preferences and industry norms',
      },
      {
        id: 'asn-2',
        statement: 'Primary conversion goal is email signup',
        reason: 'Intake form specified lead generation as primary goal',
      },
    ],
    openQuestions: ['What is the preferred brand color palette?'],
    ...overrides,
  };
}
