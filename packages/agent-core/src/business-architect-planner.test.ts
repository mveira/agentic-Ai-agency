import { describe, it, expect, beforeEach } from 'vitest';
import { BusinessArchitectPlanner, createMockPlannerOutput } from './business-architect-planner.js';
import { InMemoryStrapiProvider } from './contracts/business-architect-agent.js';
import { MockLLMAdapter } from './mock-llm.js';
import type { PlannerInput } from './business-architect-planner.js';

// ─── Test Fixtures ────────────────────────────────────────────────────────────

function createBasicInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    sessionId: 'session-001',
    round: 1,
    intakeData: { businessName: 'Acme Corp', website: 'https://acme.com' },
    priorAnswers: [],
    currentSummary: [],
    ...overrides,
  };
}

function createNeedsMoreInfoResponse(): string {
  return JSON.stringify({
    result: {
      readiness: 'NEEDS_MORE_INFO',
      summary: ['Business name: Acme Corp', 'Website: acme.com'],
      questions: [
        {
          key: 'budget',
          text: 'What is your monthly marketing budget?',
          inputType: 'number',
          required: true,
          helpText: 'In GBP.',
        },
        {
          key: 'project_goal',
          text: 'What is the primary goal?',
          inputType: 'single_select',
          options: ['Lead Generation', 'Brand Awareness', 'Direct Sales'],
          required: true,
        },
      ],
      blockReason: null,
      missingSlots: { budget: true, timeline: true, offer: false, channel: false, goals: true, conflicts: false },
    },
    assumptions: ['Modern SaaS company based on website'],
    unknowns: ['Industry vertical'],
    next_actions: ['Gather budget and goals'],
  });
}

function createReadyResponse(): string {
  return JSON.stringify({
    result: {
      readiness: 'READY_FOR_REQUIREMENTS',
      summary: ['All slots filled', 'No conflicts detected'],
      questions: [],
      blockReason: null,
      missingSlots: { budget: false, timeline: false, offer: false, channel: false, goals: false, conflicts: false },
    },
    assumptions: ['Client wants lead generation focus'],
    unknowns: [],
    next_actions: ['Generate requirements'],
  });
}

// ─── BusinessArchitectPlanner ─────────────────────────────────────────────────

describe('BusinessArchitectPlanner', () => {
  let strapi: InMemoryStrapiProvider;
  let llm: MockLLMAdapter;
  let planner: BusinessArchitectPlanner;

  beforeEach(() => {
    strapi = new InMemoryStrapiProvider();
    strapi.addTemplates('question-packs', [
      { id: 'qp-1', type: 'question_pack', title: 'Generic Pack', body: 'budget,timeline,goals', tags: ['generic'] },
    ]);
    llm = new MockLLMAdapter();
    planner = new BusinessArchitectPlanner({ strapi, llm });
  });

  it('returns BLOCKED when Strapi is unavailable', async () => {
    strapi.setAvailable(false);

    const result = await planner.planNext(createBasicInput());

    expect(result.success).toBe(true);
    expect(result.result?.readiness).toBe('BLOCKED');
    expect(result.result?.blockReason).toBe('STRAPI_UNAVAILABLE');
    expect(result.strapiAvailable).toBe(false);
    expect(result.templates).toEqual([]);
  });

  it('returns NEEDS_MORE_INFO with questions on round 1', async () => {
    llm.registerResponse('business-architect-agent', createNeedsMoreInfoResponse());

    const result = await planner.planNext(createBasicInput());

    expect(result.success).toBe(true);
    expect(result.result?.readiness).toBe('NEEDS_MORE_INFO');
    expect(result.result?.questions.length).toBeGreaterThan(0);
    expect(result.result?.summary.length).toBeGreaterThan(0);
    expect(result.strapiAvailable).toBe(true);
    expect(result.templates.length).toBeGreaterThan(0);
  });

  it('returns READY_FOR_REQUIREMENTS when all slots filled', async () => {
    llm.registerResponse('business-architect-agent', createReadyResponse());

    const result = await planner.planNext(
      createBasicInput({
        round: 3,
        priorAnswers: [
          { key: 'budget', value: 3000 },
          { key: 'timeline', value: '2026-03-01' },
          { key: 'project_goal', value: 'Lead Generation' },
        ],
        currentSummary: ['Budget: £3k', 'Timeline: March 2026', 'Goal: Lead Gen'],
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.readiness).toBe('READY_FOR_REQUIREMENTS');
    expect(result.result?.questions).toHaveLength(0);
    expect(result.result?.blockReason).toBeNull();
  });

  it('includes missingSlots in result when provided by agent', async () => {
    llm.registerResponse('business-architect-agent', createNeedsMoreInfoResponse());

    const result = await planner.planNext(createBasicInput());

    expect(result.success).toBe(true);
    expect(result.result?.missingSlots).toBeDefined();
    expect(result.result?.missingSlots?.budget).toBe(true);
    expect(result.result?.missingSlots?.goals).toBe(true);
  });

  it('guided choices: questions use single_select/multi_select', async () => {
    llm.registerResponse('business-architect-agent', createNeedsMoreInfoResponse());

    const result = await planner.planNext(createBasicInput());
    const inputTypes = result.result?.questions.map((q) => q.inputType) ?? [];

    expect(inputTypes).toContain('single_select');
  });

  it('includes helpText on questions', async () => {
    llm.registerResponse('business-architect-agent', createNeedsMoreInfoResponse());

    const result = await planner.planNext(createBasicInput());
    const withHelp = result.result?.questions.filter((q) => q.helpText) ?? [];

    expect(withHelp.length).toBeGreaterThan(0);
  });

  it('fails gracefully on invalid LLM JSON', async () => {
    llm.registerResponse('business-architect-agent', 'not valid json {{{');

    const result = await planner.planNext(createBasicInput());

    expect(result.success).toBe(false);
    expect(result.error).toContain('parse');
  });

  it('fails gracefully on malformed agent output', async () => {
    llm.registerResponse(
      'business-architect-agent',
      JSON.stringify({
        result: {
          readiness: 'INVALID_STATUS',
          summary: [],
          questions: [],
          blockReason: null,
        },
        assumptions: [],
        unknowns: [],
        next_actions: [],
      })
    );

    const result = await planner.planNext(createBasicInput());

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid agent output');
  });

  it('fetches templates from configured Strapi category', async () => {
    const customStrapi = new InMemoryStrapiProvider();
    customStrapi.addTemplates('industry-saas', [
      { id: 'ind-1', type: 'industry_pack', title: 'SaaS Pack', body: 'churn,mrr,ltv', tags: ['saas'] },
    ]);

    const customPlanner = new BusinessArchitectPlanner({
      strapi: customStrapi,
      llm,
      strapiCategory: 'industry-saas',
    });

    llm.registerResponse('business-architect-agent', createNeedsMoreInfoResponse());

    const result = await customPlanner.planNext(createBasicInput());

    expect(result.success).toBe(true);
    expect(result.templates).toHaveLength(1);
    expect(result.templates[0].title).toBe('SaaS Pack');
  });

  it('passes prior answers and summary to LLM prompt', async () => {
    let capturedPrompt = '';
    const captureLlm = new MockLLMAdapter();
    captureLlm.registerResponse('business-architect-agent', createReadyResponse());

    // Override complete to capture prompt
    const origComplete = captureLlm.complete.bind(captureLlm);
    captureLlm.complete = async (params) => {
      capturedPrompt = params.prompt;
      return origComplete(params);
    };

    const customPlanner = new BusinessArchitectPlanner({ strapi, llm: captureLlm });

    await customPlanner.planNext(
      createBasicInput({
        round: 2,
        priorAnswers: [{ key: 'budget', value: 5000 }],
        currentSummary: ['Budget is £5k per month'],
      })
    );

    expect(capturedPrompt).toContain('budget');
    expect(capturedPrompt).toContain('5000');
    expect(capturedPrompt).toContain('Budget is £5k per month');
    expect(capturedPrompt).toContain('Round: 2');
  });
});

// ─── computeMissingSlots ──────────────────────────────────────────────────────

describe('computeMissingSlots', () => {
  it('all slots missing with empty data', () => {
    const slots = BusinessArchitectPlanner.computeMissingSlots({}, []);
    expect(slots.budget).toBe(true);
    expect(slots.timeline).toBe(true);
    expect(slots.offer).toBe(true);
    expect(slots.channel).toBe(true);
    expect(slots.goals).toBe(true);
    expect(slots.conflicts).toBe(false); // Always false (detected by agent)
  });

  it('budget not missing when intake has budgetRange', () => {
    const slots = BusinessArchitectPlanner.computeMissingSlots(
      { budgetRange: '£2k-5k' },
      []
    );
    expect(slots.budget).toBe(false);
  });

  it('goals not missing when priorAnswers has project_goal', () => {
    const slots = BusinessArchitectPlanner.computeMissingSlots(
      {},
      [{ key: 'project_goal', value: 'Lead Generation' }]
    );
    expect(slots.goals).toBe(false);
  });

  it('timeline not missing when intake has deadline', () => {
    const slots = BusinessArchitectPlanner.computeMissingSlots(
      { deadline: '2026-03-01' },
      []
    );
    expect(slots.timeline).toBe(false);
  });

  it('mixed: some from intake, some from answers', () => {
    const slots = BusinessArchitectPlanner.computeMissingSlots(
      { budgetRange: '£3k' },
      [
        { key: 'project_goal', value: 'Lead Generation' },
        { key: 'channels', value: ['SEO', 'PPC'] },
      ]
    );
    expect(slots.budget).toBe(false);
    expect(slots.goals).toBe(false);
    expect(slots.channel).toBe(false);
    expect(slots.timeline).toBe(true); // Still missing
    expect(slots.offer).toBe(true); // Still missing
  });
});

// ─── createMockPlannerOutput ──────────────────────────────────────────────────

describe('createMockPlannerOutput', () => {
  it('returns valid ClarificationResult', () => {
    const output = createMockPlannerOutput();
    expect(output.readiness).toBe('NEEDS_MORE_INFO');
    expect(output.questions.length).toBeGreaterThan(0);
    expect(output.blockReason).toBeNull();
  });

  it('accepts overrides', () => {
    const output = createMockPlannerOutput({
      readiness: 'READY_FOR_REQUIREMENTS',
      questions: [],
    });
    expect(output.readiness).toBe('READY_FOR_REQUIREMENTS');
    expect(output.questions).toHaveLength(0);
  });
});
