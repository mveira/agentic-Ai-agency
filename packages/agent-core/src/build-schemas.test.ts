import { describe, it, expect } from 'vitest';
import {
  FunnelStepSchema,
  ScreenSchema,
  ComponentSchema,
  LayoutBlockSchema,
  AccessibilityRuleSchema,
  ScreenStateSchema,
  ScreenCopySchema,
  MarketingBlueprintSchema,
  UXUISpecSchema,
  CopyPackSchema,
  BuildTaskSchema,
  BuildPlanSchema,
  QCReportSchema,
} from './build-schemas.js';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const validFunnelStep = {
  stepId: 'step-1',
  name: 'Landing Page',
  funnelPosition: 'tofu' as const,
  awarenessLevel: 'problem-aware' as const,
  goal: 'Capture leads',
  contentType: 'landing-page',
  cta: 'Sign up free',
};

const validComponent = {
  componentId: 'hero-1',
  type: 'hero',
  props: { variant: 'centered' },
  slots: ['headline', 'subheadline', 'cta-text'],
};

const validLayoutBlock = {
  blockId: 'block-1',
  type: 'section',
  order: 1,
  components: ['hero-1'],
};

const validScreen = {
  screenId: 'screen-landing',
  route: '/landing',
  name: 'Landing Page',
  layoutBlocks: [validLayoutBlock],
  components: [validComponent],
  slots: ['headline', 'subheadline', 'cta-text'],
};

const validBlueprint = {
  goal: 'Generate 100 leads per month',
  audience: 'SaaS founders',
  funnelSteps: [validFunnelStep],
  sectionsNeeded: { '/landing': ['hero', 'social-proof', 'cta'] },
  proofAssets: ['testimonial-1', 'case-study-1'],
  successCriteria: ['100 leads/month', '>3% conversion rate'],
  optionalEnhancements: [
    {
      enhancementId: 'enh-1',
      title: 'Video testimonial section',
      description: 'Add embedded video testimonials',
      impact: 'medium' as const,
    },
  ],
};

const validUXUISpec = {
  routes: ['/landing'],
  screens: [validScreen],
  states: [
    {
      stateId: 'state-1',
      screenId: 'screen-landing',
      name: 'loading',
      trigger: 'page-load',
      changes: { showSpinner: true },
    },
  ],
  accessibility: [
    {
      ruleId: 'a11y-1',
      level: 'AA' as const,
      description: 'All images must have alt text',
      applies: ['screen-landing'],
    },
  ],
  optionalDesigns: [
    {
      designId: 'design-1',
      enhancementId: 'enh-1',
      screenId: 'screen-landing',
      description: 'Video testimonial block',
    },
  ],
};

const validCopyPack = {
  screens: [
    {
      screenId: 'screen-landing',
      copies: [
        { slotId: 'headline', componentId: 'hero-1', copy: 'Grow Your SaaS' },
        { slotId: 'subheadline', componentId: 'hero-1', copy: 'The smart way' },
      ],
    },
  ],
  optionalCopy: [
    {
      enhancementId: 'enh-1',
      screenId: 'screen-landing',
      copies: [
        { slotId: 'video-title', componentId: 'video-1', copy: 'Hear from our users' },
      ],
    },
  ],
};

// ─── Sub-Schema Tests ───────────────────────────────────────────────────────

describe('Build Sub-Schemas', () => {
  it('FunnelStepSchema validates correct data', () => {
    expect(FunnelStepSchema.safeParse(validFunnelStep).success).toBe(true);
  });

  it('FunnelStepSchema rejects invalid funnelPosition', () => {
    const result = FunnelStepSchema.safeParse({ ...validFunnelStep, funnelPosition: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('ComponentSchema validates correct data', () => {
    expect(ComponentSchema.safeParse(validComponent).success).toBe(true);
  });

  it('LayoutBlockSchema validates correct data', () => {
    expect(LayoutBlockSchema.safeParse(validLayoutBlock).success).toBe(true);
  });

  it('ScreenSchema validates correct data', () => {
    expect(ScreenSchema.safeParse(validScreen).success).toBe(true);
  });

  it('AccessibilityRuleSchema validates correct data', () => {
    expect(
      AccessibilityRuleSchema.safeParse({
        ruleId: 'a11y-1',
        level: 'AA',
        description: 'Alt text required',
        applies: ['screen-1'],
      }).success
    ).toBe(true);
  });

  it('ScreenStateSchema validates correct data', () => {
    expect(
      ScreenStateSchema.safeParse({
        stateId: 'state-1',
        screenId: 'screen-1',
        name: 'loading',
        trigger: 'page-load',
        changes: { showSpinner: true },
      }).success
    ).toBe(true);
  });

  it('ScreenCopySchema validates correct data', () => {
    expect(
      ScreenCopySchema.safeParse({
        screenId: 'screen-1',
        copies: [{ slotId: 'headline', componentId: 'hero-1', copy: 'Hello' }],
      }).success
    ).toBe(true);
  });
});

// ─── Pipeline Handoff Schema Tests ──────────────────────────────────────────

describe('MarketingBlueprintSchema', () => {
  it('validates correct blueprint', () => {
    expect(MarketingBlueprintSchema.safeParse(validBlueprint).success).toBe(true);
  });

  it('requires at least one funnel step', () => {
    const result = MarketingBlueprintSchema.safeParse({ ...validBlueprint, funnelSteps: [] });
    expect(result.success).toBe(false);
  });

  it('requires at least one success criterion', () => {
    const result = MarketingBlueprintSchema.safeParse({ ...validBlueprint, successCriteria: [] });
    expect(result.success).toBe(false);
  });
});

describe('UXUISpecSchema', () => {
  it('validates correct spec', () => {
    expect(UXUISpecSchema.safeParse(validUXUISpec).success).toBe(true);
  });

  it('requires at least one route', () => {
    const result = UXUISpecSchema.safeParse({ ...validUXUISpec, routes: [] });
    expect(result.success).toBe(false);
  });

  it('requires at least one screen', () => {
    const result = UXUISpecSchema.safeParse({ ...validUXUISpec, screens: [] });
    expect(result.success).toBe(false);
  });
});

describe('CopyPackSchema', () => {
  it('validates correct copy pack', () => {
    expect(CopyPackSchema.safeParse(validCopyPack).success).toBe(true);
  });

  it('requires at least one screen with copy', () => {
    const result = CopyPackSchema.safeParse({ ...validCopyPack, screens: [] });
    expect(result.success).toBe(false);
  });
});

describe('BuildTaskSchema', () => {
  it('validates correct task', () => {
    const task = {
      taskId: 'task-1',
      title: 'Build landing page',
      description: 'Implement the landing page component',
      type: 'page',
      acceptanceCriteria: ['Page renders correctly'],
      testNotes: ['Check responsive layout'],
      dependencies: [],
    };
    expect(BuildTaskSchema.safeParse(task).success).toBe(true);
  });

  it('requires at least one acceptance criterion', () => {
    const task = {
      taskId: 'task-1',
      title: 'Build landing page',
      description: 'Implement it',
      type: 'page',
      acceptanceCriteria: [],
      testNotes: [],
      dependencies: [],
    };
    expect(BuildTaskSchema.safeParse(task).success).toBe(false);
  });
});

describe('QCReportSchema', () => {
  it('validates approved report', () => {
    expect(QCReportSchema.safeParse({ approved: true, violations: [] }).success).toBe(true);
  });

  it('validates blocked report with reason', () => {
    const report = {
      approved: false,
      violations: [{ severity: 'critical', description: 'Optional in core', location: 'copyPack' }],
      blockReason: 'Optional content leaked into core',
    };
    expect(QCReportSchema.safeParse(report).success).toBe(true);
  });
});

describe('BuildPlanSchema', () => {
  it('validates a complete build plan', () => {
    const plan = {
      projectId: 'proj-1',
      requirementsVersion: 'v1.0',
      status: 'draft',
      core: {
        blueprint: validBlueprint,
        uiSpec: validUXUISpec,
        copyPack: { screens: validCopyPack.screens, optionalCopy: [] },
      },
      optional: {
        enhancements: validBlueprint.optionalEnhancements,
        designs: validUXUISpec.optionalDesigns,
        copy: validCopyPack.optionalCopy,
      },
      tasks: [
        {
          taskId: 'task-1',
          title: 'Build landing page',
          description: 'Implement landing page',
          type: 'page',
          acceptanceCriteria: ['Renders correctly'],
          testNotes: ['Visual regression test'],
          dependencies: [],
        },
      ],
      approvalsNeeded: [
        { enhancementId: 'enh-1', title: 'Video testimonial section', status: 'pending' },
      ],
      qcReport: { approved: true, violations: [] },
      telemetry: [
        {
          step: 'marketing',
          agentId: 'strategy-funnel-agent',
          durationMs: 1200,
          inputTokens: 500,
          outputTokens: 800,
          cost: 0.02,
          model: 'claude-3-sonnet',
        },
      ],
    };
    expect(BuildPlanSchema.safeParse(plan).success).toBe(true);
  });
});
