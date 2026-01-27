import { describe, it, expect } from 'vitest';
import {
  getAgentContract,
  ALL_AGENT_CONTRACTS,
  AGENT_MODEL_ROUTING,
  AGENT_COST_CAPS,
  AGENT_FRAMEWORK_REQUIREMENTS,
  RESEARCH_AGENT_CONTRACT,
  STRATEGY_FUNNEL_AGENT_CONTRACT,
  COPY_MESSAGING_AGENT_CONTRACT,
  AUTOMATION_CRM_AGENT_CONTRACT,
  UX_DESIGN_AGENT_CONTRACT,
  QUALITY_CONTROL_AGENT_CONTRACT,
  BUSINESS_ARCHITECT_AGENT_CONTRACT,
  REQUIREMENTS_ENGINEER_AGENT_CONTRACT,
  PROPOSAL_STRATEGIST_AGENT_CONTRACT,
  ResearchAgentInputSchema,
  UXDesignAgentInputSchema,
  BusinessArchitectAgentInputSchema,
  RequirementsEngineerAgentInputSchema,
  ProposalStrategistAgentInputSchema,
  shouldBlock,
} from './contracts/index.js';

describe('Agent Contracts', () => {
  it('has all 9 required agents defined', () => {
    expect(Object.keys(ALL_AGENT_CONTRACTS)).toHaveLength(9);
    expect(ALL_AGENT_CONTRACTS['research-agent']).toBeDefined();
    expect(ALL_AGENT_CONTRACTS['strategy-funnel-agent']).toBeDefined();
    expect(ALL_AGENT_CONTRACTS['copy-messaging-agent']).toBeDefined();
    expect(ALL_AGENT_CONTRACTS['automation-crm-agent']).toBeDefined();
    expect(ALL_AGENT_CONTRACTS['ux-design-agent']).toBeDefined();
    expect(ALL_AGENT_CONTRACTS['quality-control-agent']).toBeDefined();
    expect(ALL_AGENT_CONTRACTS['business-architect-agent']).toBeDefined();
    expect(ALL_AGENT_CONTRACTS['requirements-engineer-agent']).toBeDefined();
    expect(ALL_AGENT_CONTRACTS['proposal-strategist-agent']).toBeDefined();
  });

  it('getAgentContract returns correct contract', () => {
    const contract = getAgentContract('research-agent');
    expect(contract).toBe(RESEARCH_AGENT_CONTRACT);
    expect(contract?.agentId).toBe('research-agent');
  });

  it('getAgentContract returns undefined for unknown agent', () => {
    const contract = getAgentContract('unknown-agent');
    expect(contract).toBeUndefined();
  });

  describe('Contract Structure', () => {
    const contracts = [
      RESEARCH_AGENT_CONTRACT,
      STRATEGY_FUNNEL_AGENT_CONTRACT,
      COPY_MESSAGING_AGENT_CONTRACT,
      AUTOMATION_CRM_AGENT_CONTRACT,
      UX_DESIGN_AGENT_CONTRACT,
      QUALITY_CONTROL_AGENT_CONTRACT,
      BUSINESS_ARCHITECT_AGENT_CONTRACT,
      REQUIREMENTS_ENGINEER_AGENT_CONTRACT,
      PROPOSAL_STRATEGIST_AGENT_CONTRACT,
    ];

    it.each(contracts)('$agentId has required fields', (contract) => {
      expect(contract.agentId).toBeDefined();
      expect(contract.name).toBeDefined();
      expect(contract.description).toBeDefined();
      expect(contract.capabilities).toBeInstanceOf(Array);
      expect(contract.capabilities.length).toBeGreaterThan(0);
      expect(contract.constraints).toBeInstanceOf(Array);
      expect(contract.constraints.length).toBeGreaterThan(0);
      expect(contract.maxOutputTokens).toBeGreaterThan(0);
    });
  });

  describe('No Overlapping Responsibilities', () => {
    it('Research agent does NOT create strategy', () => {
      const constraints = RESEARCH_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
      expect(constraints).toContain('not');
      expect(constraints).toContain('strategy');
    });

    it('Strategy agent does NOT write copy', () => {
      const constraints = STRATEGY_FUNNEL_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
      expect(constraints).toContain('not');
      expect(constraints).toContain('copy');
    });

    it('Copy agent does NOT make strategic decisions', () => {
      const constraints = COPY_MESSAGING_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
      expect(constraints).toContain('not');
      expect(constraints).toContain('strateg');
    });

    it('Automation agent does NOT execute automations', () => {
      const constraints = AUTOMATION_CRM_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
      expect(constraints).toContain('not');
      expect(constraints).toContain('execute');
    });

    it('QC agent does NOT modify content', () => {
      const constraints = QUALITY_CONTROL_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
      expect(constraints).toContain('not');
      expect(constraints).toContain('modify');
    });
  });
});

describe('LLM Routing', () => {
  it('all agents have model routing defined', () => {
    for (const agentId of Object.keys(ALL_AGENT_CONTRACTS)) {
      expect(AGENT_MODEL_ROUTING[agentId]).toBeDefined();
    }
  });

  it('routes Research/Strategy/UX/QC to Claude Sonnet', () => {
    expect(AGENT_MODEL_ROUTING['research-agent']).toBe('claude-3-sonnet');
    expect(AGENT_MODEL_ROUTING['strategy-funnel-agent']).toBe('claude-3-sonnet');
    expect(AGENT_MODEL_ROUTING['ux-design-agent']).toBe('claude-3-sonnet');
    expect(AGENT_MODEL_ROUTING['quality-control-agent']).toBe('claude-3-sonnet');
  });

  it('routes Copy to GPT-4', () => {
    expect(AGENT_MODEL_ROUTING['copy-messaging-agent']).toBe('gpt-4');
  });

  it('routes Automation to GPT-4o-mini', () => {
    expect(AGENT_MODEL_ROUTING['automation-crm-agent']).toBe('gpt-4o-mini');
  });
});

describe('Cost Caps', () => {
  it('all agents have cost caps defined', () => {
    for (const agentId of Object.keys(ALL_AGENT_CONTRACTS)) {
      expect(AGENT_COST_CAPS[agentId]).toBeDefined();
      expect(AGENT_COST_CAPS[agentId]).toBeGreaterThan(0);
    }
  });

  it('Automation agent has lowest cost cap (fast model)', () => {
    const automationCap = AGENT_COST_CAPS['automation-crm-agent']!;
    const copyCap = AGENT_COST_CAPS['copy-messaging-agent']!;
    expect(automationCap).toBeLessThan(copyCap);
  });
});

describe('Framework Requirements', () => {
  it('all agents have framework requirements defined', () => {
    for (const agentId of Object.keys(ALL_AGENT_CONTRACTS)) {
      expect(AGENT_FRAMEWORK_REQUIREMENTS[agentId]).toBeDefined();
      expect(AGENT_FRAMEWORK_REQUIREMENTS[agentId]!.length).toBeGreaterThan(0);
    }
  });

  it('Strategy agent requires offer-economics framework', () => {
    expect(AGENT_FRAMEWORK_REQUIREMENTS['strategy-funnel-agent']).toContain('offer-economics');
  });

  it('Copy agent requires persuasion framework', () => {
    expect(AGENT_FRAMEWORK_REQUIREMENTS['copy-messaging-agent']).toContain('persuasion');
  });

  it('QC agent has access to all frameworks', () => {
    const qcFrameworks = AGENT_FRAMEWORK_REQUIREMENTS['quality-control-agent']!;
    expect(qcFrameworks).toContain('offer-economics');
    expect(qcFrameworks).toContain('market-awareness');
    expect(qcFrameworks).toContain('persuasion');
    expect(qcFrameworks).toContain('funnel-design');
  });
});

describe('Input Validation', () => {
  it('ResearchAgentInputSchema validates correct input', () => {
    const validInput = {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      researchType: 'competitor-analysis',
      subject: 'Acme Corp',
      depth: 'standard',
    };

    const result = ResearchAgentInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('ResearchAgentInputSchema rejects invalid projectId', () => {
    const invalidInput = {
      projectId: 'not-a-uuid',
      researchType: 'competitor-analysis',
      subject: 'Acme Corp',
    };

    const result = ResearchAgentInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('ResearchAgentInputSchema rejects invalid researchType', () => {
    const invalidInput = {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      researchType: 'invalid-type',
      subject: 'Acme Corp',
    };

    const result = ResearchAgentInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});

describe('UX Design Agent', () => {
  it('does NOT write copy', () => {
    const constraints = UX_DESIGN_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('not');
    expect(constraints).toContain('copy');
  });

  it('must consume blueprint', () => {
    const constraints = UX_DESIGN_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('blueprint');
  });

  it('must not skip accessibility', () => {
    const constraints = UX_DESIGN_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('accessibility');
  });

  it('has funnel-design framework requirement', () => {
    expect(AGENT_FRAMEWORK_REQUIREMENTS['ux-design-agent']).toContain('funnel-design');
  });

  it('has cost cap of 0.75', () => {
    expect(AGENT_COST_CAPS['ux-design-agent']).toBe(0.75);
  });

  it('UXDesignAgentInputSchema validates correct input', () => {
    const validInput = {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      blueprint: {
        goal: 'Generate leads',
        audience: 'SaaS founders',
        funnelSteps: [
          {
            stepId: 'step-1',
            name: 'Landing',
            funnelPosition: 'tofu',
            awarenessLevel: 'problem-aware',
            goal: 'Capture leads',
            contentType: 'landing-page',
            cta: 'Sign up',
          },
        ],
        sectionsNeeded: { '/landing': ['hero', 'cta'] },
      },
    };
    expect(UXDesignAgentInputSchema.safeParse(validInput).success).toBe(true);
  });

  it('UXDesignAgentInputSchema rejects invalid projectId', () => {
    const invalidInput = {
      projectId: 'not-a-uuid',
      blueprint: {
        goal: 'Generate leads',
        audience: 'SaaS founders',
        funnelSteps: [],
        sectionsNeeded: {},
      },
    };
    expect(UXDesignAgentInputSchema.safeParse(invalidInput).success).toBe(false);
  });

  it('UXDesignAgentInputSchema rejects missing blueprint', () => {
    const invalidInput = {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
    };
    expect(UXDesignAgentInputSchema.safeParse(invalidInput).success).toBe(false);
  });

  it('getAgentContract returns UX contract', () => {
    const contract = getAgentContract('ux-design-agent');
    expect(contract).toBe(UX_DESIGN_AGENT_CONTRACT);
    expect(contract?.agentId).toBe('ux-design-agent');
  });
});

describe('Business Architect Agent', () => {
  it('does NOT generate requirements (constraint)', () => {
    const constraints = BUSINESS_ARCHITECT_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('not');
    expect(constraints).toContain('requirements');
  });

  it('read-only Strapi access', () => {
    const constraints = BUSINESS_ARCHITECT_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('read-only');
  });

  it('has market-awareness and offer-economics frameworks', () => {
    expect(AGENT_FRAMEWORK_REQUIREMENTS['business-architect-agent']).toContain('market-awareness');
    expect(AGENT_FRAMEWORK_REQUIREMENTS['business-architect-agent']).toContain('offer-economics');
  });

  it('has cost cap of 0.50', () => {
    expect(AGENT_COST_CAPS['business-architect-agent']).toBe(0.50);
  });

  it('routes to claude-3-sonnet', () => {
    expect(AGENT_MODEL_ROUTING['business-architect-agent']).toBe('claude-3-sonnet');
  });

  it('BusinessArchitectAgentInputSchema validates correct input', () => {
    const validInput = {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      sessionId: 'session-001',
      round: 1,
      intakeData: { businessName: 'Acme Corp' },
    };
    expect(BusinessArchitectAgentInputSchema.safeParse(validInput).success).toBe(true);
  });

  it('BusinessArchitectAgentInputSchema rejects invalid projectId', () => {
    const invalid = {
      projectId: 'not-a-uuid',
      sessionId: 'session-001',
      round: 1,
      intakeData: {},
    };
    expect(BusinessArchitectAgentInputSchema.safeParse(invalid).success).toBe(false);
  });

  it('getAgentContract returns Business Architect contract', () => {
    const contract = getAgentContract('business-architect-agent');
    expect(contract).toBe(BUSINESS_ARCHITECT_AGENT_CONTRACT);
    expect(contract?.agentId).toBe('business-architect-agent');
  });
});

describe('Requirements Engineer Agent', () => {
  it('does NOT gather information (constraint)', () => {
    const constraints = REQUIREMENTS_ENGINEER_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('not');
    expect(constraints).toContain('gather');
  });

  it('does NOT skip assumptions (constraint)', () => {
    const constraints = REQUIREMENTS_ENGINEER_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('not');
    expect(constraints).toContain('assumptions');
  });

  it('read-only Strapi access', () => {
    const constraints = REQUIREMENTS_ENGINEER_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('read-only');
  });

  it('has market-awareness and offer-economics frameworks', () => {
    expect(AGENT_FRAMEWORK_REQUIREMENTS['requirements-engineer-agent']).toContain('market-awareness');
    expect(AGENT_FRAMEWORK_REQUIREMENTS['requirements-engineer-agent']).toContain('offer-economics');
  });

  it('has cost cap of 0.75', () => {
    expect(AGENT_COST_CAPS['requirements-engineer-agent']).toBe(0.75);
  });

  it('routes to claude-3-sonnet', () => {
    expect(AGENT_MODEL_ROUTING['requirements-engineer-agent']).toBe('claude-3-sonnet');
  });

  it('RequirementsEngineerAgentInputSchema validates correct input', () => {
    const validInput = {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      factsSnapshot: {
        summary: ['Target audience: SaaS founders'],
        structuredAnswers: [{ key: 'budget', value: 3000 }],
      },
    };
    expect(RequirementsEngineerAgentInputSchema.safeParse(validInput).success).toBe(true);
  });

  it('RequirementsEngineerAgentInputSchema rejects invalid projectId', () => {
    const invalid = {
      projectId: 'not-a-uuid',
      factsSnapshot: {
        summary: [],
        structuredAnswers: [],
      },
    };
    expect(RequirementsEngineerAgentInputSchema.safeParse(invalid).success).toBe(false);
  });

  it('getAgentContract returns Requirements Engineer contract', () => {
    const contract = getAgentContract('requirements-engineer-agent');
    expect(contract).toBe(REQUIREMENTS_ENGINEER_AGENT_CONTRACT);
    expect(contract?.agentId).toBe('requirements-engineer-agent');
  });
});

describe('Proposal Strategist Agent', () => {
  it('MUST NOT add scope (constraint)', () => {
    const constraints = PROPOSAL_STRATEGIST_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('must not');
    expect(constraints).toContain('scope');
  });

  it('MUST NOT invent proof (constraint)', () => {
    const constraints = PROPOSAL_STRATEGIST_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('must not');
    expect(constraints).toContain('proof');
  });

  it('MUST NOT alter pricing (constraint)', () => {
    const constraints = PROPOSAL_STRATEGIST_AGENT_CONTRACT.constraints.join(' ').toLowerCase();
    expect(constraints).toContain('must not');
    expect(constraints).toContain('pricing');
  });

  it('has offer-economics, market-awareness, and persuasion frameworks', () => {
    expect(AGENT_FRAMEWORK_REQUIREMENTS['proposal-strategist-agent']).toContain('offer-economics');
    expect(AGENT_FRAMEWORK_REQUIREMENTS['proposal-strategist-agent']).toContain('market-awareness');
    expect(AGENT_FRAMEWORK_REQUIREMENTS['proposal-strategist-agent']).toContain('persuasion');
  });

  it('has cost cap of 0.75', () => {
    expect(AGENT_COST_CAPS['proposal-strategist-agent']).toBe(0.75);
  });

  it('routes to claude-3-sonnet', () => {
    expect(AGENT_MODEL_ROUTING['proposal-strategist-agent']).toBe('claude-3-sonnet');
  });

  it('ProposalStrategistAgentInputSchema validates correct input', () => {
    const validInput = {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      requirementsVersionId: '550e8400-e29b-41d4-a716-446655440001',
      approvedRequirements: [
        { id: 'req-1', contentJson: { title: 'Landing page' }, createdAt: '2026-01-27T00:00:00Z' },
      ],
      approvedAssumptions: [],
      strapiContent: {
        pricingPackages: [
          { id: 'pkg-1', name: 'Starter', tier: 'starter', price: '2500', currency: 'GBP', features: ['Landing page'] },
        ],
        proposalTemplates: [
          { id: 'tpl-1', name: 'Default', sectionOrder: ['hero'], defaults: {} },
        ],
        persuasionFrameworks: [
          { id: 'fw-1', name: 'Ethical', principles: ['Transparency'], ethicalOnly: true },
        ],
        hormoziFramework: { id: 'hz-1', name: 'Value Equation', offerFramingRules: ['Rule 1'] },
        timelineRules: [
          { id: 'tr-1', scopeType: 'landing-page', estimatedWeeks: 2 },
        ],
      },
    };
    expect(ProposalStrategistAgentInputSchema.safeParse(validInput).success).toBe(true);
  });

  it('ProposalStrategistAgentInputSchema rejects invalid projectId', () => {
    const invalid = {
      projectId: 'not-a-uuid',
      requirementsVersionId: '550e8400-e29b-41d4-a716-446655440001',
      approvedRequirements: [],
      approvedAssumptions: [],
      strapiContent: {
        pricingPackages: [],
        proposalTemplates: [],
        persuasionFrameworks: [],
        hormoziFramework: { id: 'hz-1', name: 'V', offerFramingRules: [] },
        timelineRules: [],
      },
    };
    expect(ProposalStrategistAgentInputSchema.safeParse(invalid).success).toBe(false);
  });

  it('getAgentContract returns Proposal Strategist contract', () => {
    const contract = getAgentContract('proposal-strategist-agent');
    expect(contract).toBe(PROPOSAL_STRATEGIST_AGENT_CONTRACT);
    expect(contract?.agentId).toBe('proposal-strategist-agent');
  });
});

describe('QC Blocking Logic', () => {
  it('blocks on critical violations', () => {
    const violations = [{ severity: 'critical' as const }];
    expect(shouldBlock(violations, false)).toBe(true);
    expect(shouldBlock(violations, true)).toBe(true);
  });

  it('blocks on major violations in strict mode', () => {
    const violations = [{ severity: 'major' as const }];
    expect(shouldBlock(violations, true)).toBe(true);
    expect(shouldBlock(violations, false)).toBe(false);
  });

  it('does not block on minor violations', () => {
    const violations = [{ severity: 'minor' as const }];
    expect(shouldBlock(violations, false)).toBe(false);
    expect(shouldBlock(violations, true)).toBe(false);
  });

  it('does not block on suggestions', () => {
    const violations = [{ severity: 'suggestion' as const }];
    expect(shouldBlock(violations, true)).toBe(false);
  });
});
