import { describe, it, expect } from 'vitest';
import {
  RequirementsEngineerPlanner,
  createMockBundleOutput,
  type RequirementsPlannerInput,
} from './requirements-engineer-planner.js';
import { InMemoryStrapiProvider } from './contracts/business-architect-agent.js';
import { MockLLMAdapter } from './mock-llm.js';
import type { LLMAdapter, LLMCompletionParams, LLMCompletionResult } from './types.js';

function createTestInput(overrides: Partial<RequirementsPlannerInput> = {}): RequirementsPlannerInput {
  return {
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    factsSnapshot: {
      summary: ['Target audience: SaaS founders', 'Budget: £3,000/month'],
      structuredAnswers: [
        { key: 'budget', value: 3000 },
        { key: 'goal', value: 'Lead generation' },
      ],
    },
    ...overrides,
  };
}

/** LLM adapter that captures prompts for assertion */
class CapturingLLMAdapter implements LLMAdapter {
  readonly name = 'capturing-mock';
  public lastPrompt = '';
  private response: string;

  constructor(response: string) {
    this.response = response;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    this.lastPrompt = params.prompt;
    return {
      content: this.response,
      inputTokens: 100,
      outputTokens: 50,
      model: 'mock',
    };
  }
}

/** LLM adapter that always throws */
class FailingLLMAdapter implements LLMAdapter {
  readonly name = 'failing-mock';

  async complete(): Promise<LLMCompletionResult> {
    throw new Error('LLM service unavailable');
  }
}

function createDefaultOutput(): string {
  return JSON.stringify({
    result: createMockBundleOutput(),
    assumptions: ['Minimal design preferred'],
    unknowns: ['Brand color palette'],
    next_actions: ['Generate build plan'],
  });
}

describe('RequirementsEngineerPlanner', () => {
  it('returns STRAPI_UNAVAILABLE when Strapi is down', async () => {
    const strapi = new InMemoryStrapiProvider({ available: false });
    const llm = new MockLLMAdapter();
    const planner = new RequirementsEngineerPlanner({ strapi, llm });

    const result = await planner.generate(createTestInput());

    expect(result.success).toBe(false);
    expect(result.error).toBe('STRAPI_UNAVAILABLE');
    expect(result.strapiAvailable).toBe(false);
  });

  it('returns STRAPI_FETCH_FAILED when template fetch throws', async () => {
    const strapi = new InMemoryStrapiProvider({ available: true });
    strapi.fetchTemplates = async () => {
      throw new Error('Connection refused');
    };

    const llm = new MockLLMAdapter();
    const planner = new RequirementsEngineerPlanner({ strapi, llm });
    const result = await planner.generate(createTestInput());

    expect(result.success).toBe(false);
    expect(result.error).toBe('STRAPI_FETCH_FAILED');
    expect(result.strapiAvailable).toBe(true);
  });

  it('generates a valid requirements bundle', async () => {
    const strapi = new InMemoryStrapiProvider({ available: true });
    strapi.addTemplates('requirements-rubric', []);
    const llm = new MockLLMAdapter();
    llm.registerResponse('requirements-engineer-agent', createDefaultOutput());

    const planner = new RequirementsEngineerPlanner({ strapi, llm });
    const result = await planner.generate(createTestInput());

    expect(result.success).toBe(true);
    expect(result.bundle).toBeDefined();
    expect(result.bundle!.requirements.length).toBeGreaterThan(0);
    expect(result.bundle!.assumptions.length).toBeGreaterThan(0);
  });

  it('requirements have MoSCoW priorities', async () => {
    const strapi = new InMemoryStrapiProvider({ available: true });
    strapi.addTemplates('requirements-rubric', []);
    const llm = new MockLLMAdapter();
    llm.registerResponse('requirements-engineer-agent', createDefaultOutput());

    const planner = new RequirementsEngineerPlanner({ strapi, llm });
    const result = await planner.generate(createTestInput());

    expect(result.success).toBe(true);
    const priorities = result.bundle!.requirements.map((r) => r.priority);
    expect(priorities).toContain('MUST');
    expect(priorities).toContain('SHOULD');
    expect(priorities).toContain('COULD');
  });

  it('assumptions are included in the bundle', async () => {
    const strapi = new InMemoryStrapiProvider({ available: true });
    strapi.addTemplates('requirements-rubric', []);
    const llm = new MockLLMAdapter();
    llm.registerResponse('requirements-engineer-agent', createDefaultOutput());

    const planner = new RequirementsEngineerPlanner({ strapi, llm });
    const result = await planner.generate(createTestInput());

    expect(result.success).toBe(true);
    for (const a of result.bundle!.assumptions) {
      expect(a.statement).toBeDefined();
      expect(a.reason).toBeDefined();
    }
  });

  it('includes change requests in prompt when provided', async () => {
    const strapi = new InMemoryStrapiProvider({ available: true });
    strapi.addTemplates('requirements-rubric', []);
    const capturing = new CapturingLLMAdapter(createDefaultOutput());

    const planner = new RequirementsEngineerPlanner({ strapi, llm: capturing });
    await planner.generate(
      createTestInput({
        changeRequests: [
          { type: 'requirement', itemId: 'req-1', notes: 'Needs more detail on CTA' },
        ],
      })
    );

    expect(capturing.lastPrompt).toContain('Change Requests');
    expect(capturing.lastPrompt).toContain('req-1');
    expect(capturing.lastPrompt).toContain('Needs more detail on CTA');
  });

  it('includes prior version in prompt when provided', async () => {
    const strapi = new InMemoryStrapiProvider({ available: true });
    strapi.addTemplates('requirements-rubric', []);
    const capturing = new CapturingLLMAdapter(createDefaultOutput());

    const planner = new RequirementsEngineerPlanner({ strapi, llm: capturing });
    await planner.generate(
      createTestInput({
        priorVersion: {
          versionNumber: 1,
          requirements: [{ id: 'req-1', title: 'Old req' }],
          assumptions: [{ id: 'asn-1', statement: 'Old assumption' }],
        },
      })
    );

    expect(capturing.lastPrompt).toContain('Prior Version');
    expect(capturing.lastPrompt).toContain('Version: 1');
  });

  it('handles invalid JSON from LLM', async () => {
    const strapi = new InMemoryStrapiProvider({ available: true });
    strapi.addTemplates('requirements-rubric', []);
    const llm = new MockLLMAdapter();
    llm.registerResponse('requirements-engineer-agent', 'not json at all');

    const planner = new RequirementsEngineerPlanner({ strapi, llm });
    const result = await planner.generate(createTestInput());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to parse LLM response as JSON');
  });

  it('handles malformed output that fails schema validation', async () => {
    const strapi = new InMemoryStrapiProvider({ available: true });
    strapi.addTemplates('requirements-rubric', []);
    const llm = new MockLLMAdapter();
    llm.registerResponse(
      'requirements-engineer-agent',
      JSON.stringify({ result: { requirements: 'not an array' } })
    );

    const planner = new RequirementsEngineerPlanner({ strapi, llm });
    const result = await planner.generate(createTestInput());

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid agent output');
  });

  it('handles LLM call failure', async () => {
    const strapi = new InMemoryStrapiProvider({ available: true });
    strapi.addTemplates('requirements-rubric', []);
    const llm = new FailingLLMAdapter();

    const planner = new RequirementsEngineerPlanner({ strapi, llm });
    const result = await planner.generate(createTestInput());

    expect(result.success).toBe(false);
    expect(result.error).toContain('LLM call failed');
  });

  it('accepts direct bundle output without agent wrapper', async () => {
    const strapi = new InMemoryStrapiProvider({ available: true });
    strapi.addTemplates('requirements-rubric', []);
    const llm = new MockLLMAdapter();
    llm.registerResponse(
      'requirements-engineer-agent',
      JSON.stringify(createMockBundleOutput())
    );

    const planner = new RequirementsEngineerPlanner({ strapi, llm });
    const result = await planner.generate(createTestInput());

    expect(result.success).toBe(true);
    expect(result.bundle).toBeDefined();
  });

  it('rubric is returned in result', async () => {
    const strapi = new InMemoryStrapiProvider({ available: true });
    strapi.addTemplates('requirements-rubric', [
      { id: 'rubric-1', type: 'rubric', title: 'MoSCoW', body: 'Prioritize', tags: [] },
    ]);
    const llm = new MockLLMAdapter();
    llm.registerResponse('requirements-engineer-agent', createDefaultOutput());

    const planner = new RequirementsEngineerPlanner({ strapi, llm });
    const result = await planner.generate(createTestInput());

    expect(result.rubric).toHaveLength(1);
    expect(result.rubric[0]!.id).toBe('rubric-1');
  });

  it('uses custom Strapi category when configured', async () => {
    const strapi = new InMemoryStrapiProvider({ available: true });
    strapi.addTemplates('custom-rubric', [
      { id: 'custom-1', type: 'rubric', title: 'Custom', body: 'Body', tags: [] },
    ]);
    const llm = new MockLLMAdapter();
    llm.registerResponse('requirements-engineer-agent', createDefaultOutput());

    const planner = new RequirementsEngineerPlanner({
      strapi,
      llm,
      strapiCategory: 'custom-rubric',
    });
    const result = await planner.generate(createTestInput());

    expect(result.success).toBe(true);
    expect(result.rubric).toHaveLength(1);
    expect(result.rubric[0]!.id).toBe('custom-1');
  });

  it('includes constraints in prompt when provided', async () => {
    const strapi = new InMemoryStrapiProvider({ available: true });
    strapi.addTemplates('requirements-rubric', []);
    const capturing = new CapturingLLMAdapter(createDefaultOutput());

    const planner = new RequirementsEngineerPlanner({ strapi, llm: capturing });
    await planner.generate(
      createTestInput({
        constraints: { maxPages: 3, mustInclude: 'testimonials' },
      })
    );

    expect(capturing.lastPrompt).toContain('Constraints');
    expect(capturing.lastPrompt).toContain('maxPages');
  });
});

describe('createMockBundleOutput', () => {
  it('returns valid bundle with defaults', () => {
    const bundle = createMockBundleOutput();
    expect(bundle.requirements.length).toBeGreaterThan(0);
    expect(bundle.assumptions.length).toBeGreaterThan(0);
  });

  it('accepts overrides', () => {
    const bundle = createMockBundleOutput({
      openQuestions: ['Custom question'],
    });
    expect(bundle.openQuestions).toEqual(['Custom question']);
  });
});
