import { describe, it, expect } from 'vitest';
import {
  ClarificationQuestionSchema,
  ClarificationResultSchema,
  BusinessArchitectAgentInputSchema,
  BusinessArchitectAgentOutputSchema,
  MissingSlotsSchema,
  ApprovedQuestionSetSchema,
  InMemoryStrapiProvider,
  BUSINESS_ARCHITECT_AGENT_CONTRACT,
} from './contracts/business-architect-agent.js';

// ─── ClarificationQuestionSchema ──────────────────────────────────────────────

describe('ClarificationQuestionSchema', () => {
  it('validates a minimal short_text question', () => {
    const q = {
      key: 'target_audience',
      text: 'Who is your primary target audience?',
      inputType: 'short_text',
      required: true,
    };
    expect(ClarificationQuestionSchema.safeParse(q).success).toBe(true);
  });

  it('validates a single_select question with options and helpText', () => {
    const q = {
      key: 'project_goal',
      text: 'What is the primary goal?',
      inputType: 'single_select',
      options: ['Lead Generation', 'Brand Awareness', 'Direct Sales'],
      required: true,
      helpText: 'Pick the one that best matches your business objective.',
    };
    const result = ClarificationQuestionSchema.safeParse(q);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toHaveLength(3);
      expect(result.data.helpText).toBeDefined();
    }
  });

  it('validates a question with validation rules', () => {
    const q = {
      key: 'budget',
      text: 'Monthly marketing budget?',
      inputType: 'number',
      required: true,
      validation: { min: 100, max: 100000, message: 'Budget must be between 100 and 100,000' },
    };
    const result = ClarificationQuestionSchema.safeParse(q);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.validation?.min).toBe(100);
    }
  });

  it('rejects missing key', () => {
    const q = { text: 'Question?', inputType: 'short_text', required: true };
    expect(ClarificationQuestionSchema.safeParse(q).success).toBe(false);
  });

  it('rejects invalid inputType', () => {
    const q = { key: 'k', text: 'Q?', inputType: 'checkbox', required: true };
    expect(ClarificationQuestionSchema.safeParse(q).success).toBe(false);
  });

  it('defaults required to true', () => {
    const q = { key: 'k', text: 'Q?', inputType: 'short_text' };
    const result = ClarificationQuestionSchema.safeParse(q);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.required).toBe(true);
    }
  });

  it('accepts all 6 input types', () => {
    const types = ['short_text', 'long_text', 'single_select', 'multi_select', 'number', 'date'];
    for (const inputType of types) {
      const q = { key: `k-${inputType}`, text: 'Q?', inputType, required: true };
      expect(ClarificationQuestionSchema.safeParse(q).success).toBe(true);
    }
  });
});

// ─── ClarificationResultSchema ────────────────────────────────────────────────

describe('ClarificationResultSchema', () => {
  it('validates NEEDS_MORE_INFO result with questions', () => {
    const result = {
      readiness: 'NEEDS_MORE_INFO',
      summary: ['Target audience: SaaS founders', 'Budget: £2k-5k'],
      questions: [
        { key: 'timeline', text: 'Launch date?', inputType: 'date', required: true },
      ],
      blockReason: null,
      missingSlots: { budget: false, timeline: true, offer: true, channel: false, goals: false, conflicts: false },
    };
    expect(ClarificationResultSchema.safeParse(result).success).toBe(true);
  });

  it('validates READY_FOR_REQUIREMENTS with no questions', () => {
    const result = {
      readiness: 'READY_FOR_REQUIREMENTS',
      summary: ['All slots filled', 'Ready for requirements generation'],
      questions: [],
      blockReason: null,
    };
    const parsed = ClarificationResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.readiness).toBe('READY_FOR_REQUIREMENTS');
      expect(parsed.data.questions).toHaveLength(0);
    }
  });

  it('validates a BLOCKED result', () => {
    const result = {
      readiness: 'BLOCKED',
      summary: [],
      questions: [],
      blockReason: 'STRAPI_UNAVAILABLE',
    };
    const parsed = ClarificationResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.readiness).toBe('BLOCKED');
      expect(parsed.data.blockReason).toBe('STRAPI_UNAVAILABLE');
    }
  });

  it('rejects invalid readiness value', () => {
    const result = { readiness: 'UNKNOWN_STATE', summary: [], questions: [], blockReason: null };
    expect(ClarificationResultSchema.safeParse(result).success).toBe(false);
  });

  it('rejects numeric readiness (old format)', () => {
    const result = { readiness: 0.5, summary: [], questions: [], blockReason: null };
    expect(ClarificationResultSchema.safeParse(result).success).toBe(false);
  });
});

// ─── MissingSlotsSchema ───────────────────────────────────────────────────────

describe('MissingSlotsSchema', () => {
  it('validates all slots as booleans', () => {
    const slots = { budget: true, timeline: false, offer: true, channel: false, goals: true, conflicts: false };
    const result = MissingSlotsSchema.safeParse(slots);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.budget).toBe(true);
      expect(result.data.timeline).toBe(false);
    }
  });

  it('defaults all slots to false', () => {
    const result = MissingSlotsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.budget).toBe(false);
      expect(result.data.goals).toBe(false);
    }
  });
});

// ─── ApprovedQuestionSetSchema ────────────────────────────────────────────────

describe('ApprovedQuestionSetSchema', () => {
  it('validates an approved question set', () => {
    const qs = {
      approvedBy: 'agency-user-001',
      approvedAt: '2026-01-26T12:00:00Z',
      questions: [
        { key: 'budget', text: 'What is your budget?', inputType: 'number', required: true },
      ],
      summary: ['Budget question approved'],
      readiness: 'NEEDS_MORE_INFO',
    };
    expect(ApprovedQuestionSetSchema.safeParse(qs).success).toBe(true);
  });

  it('rejects missing approvedBy', () => {
    const qs = {
      approvedAt: '2026-01-26T12:00:00Z',
      questions: [],
      summary: [],
      readiness: 'NEEDS_MORE_INFO',
    };
    expect(ApprovedQuestionSetSchema.safeParse(qs).success).toBe(false);
  });

  it('rejects invalid approvedAt datetime', () => {
    const qs = {
      approvedBy: 'user-1',
      approvedAt: 'not-a-date',
      questions: [],
      summary: [],
      readiness: 'NEEDS_MORE_INFO',
    };
    expect(ApprovedQuestionSetSchema.safeParse(qs).success).toBe(false);
  });
});

// ─── BusinessArchitectAgentInputSchema ────────────────────────────────────────

describe('BusinessArchitectAgentInputSchema', () => {
  const validInput = {
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    sessionId: 'session-001',
    round: 1,
    intakeData: { businessName: 'Acme Corp', website: 'https://acme.com' },
    priorAnswers: [],
    strapiTemplates: [],
  };

  it('validates correct input', () => {
    expect(BusinessArchitectAgentInputSchema.safeParse(validInput).success).toBe(true);
  });

  it('validates round 2 with prior answers and missingSlots', () => {
    const round2 = {
      ...validInput,
      round: 2,
      priorAnswers: [
        { key: 'target_audience', value: 'SaaS founders' },
        { key: 'services', value: ['SEO', 'PPC'] },
        { key: 'budget', value: 3000 },
      ],
      missingSlots: { budget: false, timeline: true, offer: false, channel: false, goals: false, conflicts: false },
      currentSummary: ['Target audience identified', 'Budget confirmed'],
    };
    expect(BusinessArchitectAgentInputSchema.safeParse(round2).success).toBe(true);
  });

  it('rejects invalid projectId', () => {
    const invalid = { ...validInput, projectId: 'not-a-uuid' };
    expect(BusinessArchitectAgentInputSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects round 0', () => {
    const invalid = { ...validInput, round: 0 };
    expect(BusinessArchitectAgentInputSchema.safeParse(invalid).success).toBe(false);
  });

  it('defaults priorAnswers to empty array', () => {
    const { priorAnswers: _, ...withoutPrior } = validInput;
    const result = BusinessArchitectAgentInputSchema.safeParse(withoutPrior);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priorAnswers).toEqual([]);
    }
  });

  it('defaults currentSummary to empty array', () => {
    const result = BusinessArchitectAgentInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentSummary).toEqual([]);
    }
  });
});

// ─── BusinessArchitectAgentOutputSchema ───────────────────────────────────────

describe('BusinessArchitectAgentOutputSchema', () => {
  it('validates a full agent output with NEEDS_MORE_INFO', () => {
    const output = {
      result: {
        readiness: 'NEEDS_MORE_INFO',
        summary: ['Understood target audience', 'Budget range confirmed'],
        questions: [
          {
            key: 'design_pref',
            text: 'What design style do you prefer?',
            inputType: 'single_select',
            options: ['Modern', 'Classic', 'Bold'],
            required: true,
            helpText: 'This guides the visual direction of your project.',
          },
        ],
        blockReason: null,
        missingSlots: { budget: false, timeline: true, offer: false, channel: false, goals: false, conflicts: false },
      },
      assumptions: ['Client prefers modern aesthetic based on website analysis'],
      unknowns: ['Competitor pricing not yet known'],
      next_actions: ['Complete round 2 clarification', 'Fetch competitor data'],
    };
    expect(BusinessArchitectAgentOutputSchema.safeParse(output).success).toBe(true);
  });

  it('rejects output with invalid readiness', () => {
    const output = {
      result: {
        readiness: 0.6,
        summary: [],
        questions: [],
        blockReason: null,
      },
      assumptions: [],
      unknowns: [],
      next_actions: [],
    };
    expect(BusinessArchitectAgentOutputSchema.safeParse(output).success).toBe(false);
  });
});

// ─── InMemoryStrapiProvider ───────────────────────────────────────────────────

describe('InMemoryStrapiProvider', () => {
  it('reports available by default', async () => {
    const provider = new InMemoryStrapiProvider();
    expect(await provider.available()).toBe(true);
  });

  it('reports unavailable when set', async () => {
    const provider = new InMemoryStrapiProvider({ available: false });
    expect(await provider.available()).toBe(false);
  });

  it('returns empty templates for unknown category', async () => {
    const provider = new InMemoryStrapiProvider();
    const result = await provider.fetchTemplates('unknown');
    expect(result).toEqual([]);
  });

  it('returns added templates', async () => {
    const provider = new InMemoryStrapiProvider();
    provider.addTemplates('questions', [
      { id: 't1', type: 'question_template', title: 'Budget Q', body: 'What is your budget?', tags: ['budget'] },
    ]);
    const result = await provider.fetchTemplates('questions');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Budget Q');
  });

  it('throws when fetching from unavailable Strapi', async () => {
    const provider = new InMemoryStrapiProvider({ available: false });
    await expect(provider.fetchTemplates('questions')).rejects.toThrow('Strapi is unavailable');
  });

  it('can toggle availability', async () => {
    const provider = new InMemoryStrapiProvider();
    expect(await provider.available()).toBe(true);
    provider.setAvailable(false);
    expect(await provider.available()).toBe(false);
  });
});

// ─── Contract ─────────────────────────────────────────────────────────────────

describe('BusinessArchitectAgent Contract', () => {
  it('has correct agentId', () => {
    expect(BUSINESS_ARCHITECT_AGENT_CONTRACT.agentId).toBe('business-architect-agent');
  });

  it('does NOT generate requirements (constraint)', () => {
    const constraints = BUSINESS_ARCHITECT_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('not');
    expect(constraints).toContain('requirements');
  });

  it('must not write to Strapi', () => {
    const constraints = BUSINESS_ARCHITECT_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('read-only');
  });

  it('must block if Strapi unavailable', () => {
    const constraints = BUSINESS_ARCHITECT_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('block');
  });
});
