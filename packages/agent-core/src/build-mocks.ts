/**
 * Build Pipeline Mocks
 *
 * Factory functions producing mock agent outputs that match the build schemas.
 * Used in tests for the BuildOrchestrator pipeline.
 */

import type { AgentOutput } from './types.js';
import type { MarketingBlueprint, UXUISpec, CopyPack, QCReport } from './build-schemas.js';
import type { MockLLMAdapter } from './mock-llm.js';

/**
 * Creates a valid MarketingBlueprint with 2 funnel steps and 2 optional enhancements.
 */
export function createMockBlueprintOutput(): AgentOutput {
  const blueprint: MarketingBlueprint = {
    goal: 'Generate 100 qualified leads per month',
    audience: 'SaaS founders with $10k+ MRR',
    funnelSteps: [
      {
        stepId: 'step-landing',
        name: 'Landing Page',
        funnelPosition: 'tofu',
        awarenessLevel: 'problem-aware',
        goal: 'Capture email signups',
        contentType: 'landing-page',
        cta: 'Start Free Trial',
      },
      {
        stepId: 'step-demo',
        name: 'Demo Page',
        funnelPosition: 'bofu',
        awarenessLevel: 'product-aware',
        goal: 'Book a demo call',
        contentType: 'demo-booking',
        cta: 'Book Your Demo',
      },
    ],
    sectionsNeeded: {
      '/landing': ['hero', 'social-proof', 'features', 'cta'],
      '/demo': ['calendar', 'testimonials', 'faq'],
    },
    proofAssets: ['testimonial-video-1', 'case-study-acme', 'metric-roi-chart'],
    successCriteria: ['100 leads/month', '>3% conversion rate', '<$50 CAC'],
    optionalEnhancements: [
      {
        enhancementId: 'enh-video',
        title: 'Video testimonial carousel',
        description: 'Auto-playing video testimonials on landing page',
        impact: 'high',
      },
      {
        enhancementId: 'enh-chatbot',
        title: 'Live chat widget',
        description: 'AI chatbot for immediate visitor engagement',
        impact: 'medium',
      },
    ],
  };

  return {
    result: blueprint,
    assumptions: ['Target audience has been validated via research'],
    unknowns: ['Exact CAC benchmark for this vertical'],
    next_actions: ['Pass blueprint to UX design agent'],
  };
}

/**
 * Creates a valid UXUISpec with 2 screens and optional designs.
 */
export function createMockUXUISpecOutput(): AgentOutput {
  const uiSpec: UXUISpec = {
    routes: ['/landing', '/demo'],
    screens: [
      {
        screenId: 'screen-landing',
        route: '/landing',
        name: 'Landing Page',
        layoutBlocks: [
          { blockId: 'block-hero', type: 'section', order: 1, components: ['hero-1'] },
          { blockId: 'block-proof', type: 'section', order: 2, components: ['proof-1'] },
          { blockId: 'block-cta', type: 'section', order: 3, components: ['cta-1'] },
        ],
        components: [
          { componentId: 'hero-1', type: 'hero', props: { variant: 'centered' }, slots: ['headline', 'subheadline', 'cta-text'] },
          { componentId: 'proof-1', type: 'social-proof', props: {}, slots: ['proof-heading'] },
          { componentId: 'cta-1', type: 'cta-block', props: {}, slots: ['cta-heading', 'cta-button'] },
        ],
        slots: ['headline', 'subheadline', 'cta-text', 'proof-heading', 'cta-heading', 'cta-button'],
      },
      {
        screenId: 'screen-demo',
        route: '/demo',
        name: 'Demo Booking',
        layoutBlocks: [
          { blockId: 'block-calendar', type: 'section', order: 1, components: ['calendar-1'] },
        ],
        components: [
          { componentId: 'calendar-1', type: 'calendar-embed', props: {}, slots: ['calendar-heading'] },
        ],
        slots: ['calendar-heading'],
      },
    ],
    states: [
      {
        stateId: 'state-form-submit',
        screenId: 'screen-landing',
        name: 'form-submitted',
        trigger: 'form-submit',
        changes: { showThankYou: true },
      },
    ],
    accessibility: [
      {
        ruleId: 'a11y-alt',
        level: 'AA',
        description: 'All images must have descriptive alt text',
        applies: ['screen-landing', 'screen-demo'],
      },
    ],
    optionalDesigns: [
      {
        designId: 'design-video',
        enhancementId: 'enh-video',
        screenId: 'screen-landing',
        description: 'Video testimonial carousel component',
      },
    ],
  };

  return {
    result: uiSpec,
    assumptions: ['Blueprint funnel steps map 1:1 to routes'],
    unknowns: [],
    next_actions: ['Pass UI spec to copy messaging agent'],
  };
}

/**
 * Creates a valid CopyPack with copy for all slots and optional copy.
 */
export function createMockCopyPackOutput(): AgentOutput {
  const copyPack: CopyPack = {
    screens: [
      {
        screenId: 'screen-landing',
        copies: [
          { slotId: 'headline', componentId: 'hero-1', copy: 'Scale Your SaaS to $100K MRR' },
          { slotId: 'subheadline', componentId: 'hero-1', copy: 'The proven system used by 500+ founders' },
          { slotId: 'cta-text', componentId: 'hero-1', copy: 'Start Free Trial' },
          { slotId: 'proof-heading', componentId: 'proof-1', copy: 'Trusted by Industry Leaders' },
          { slotId: 'cta-heading', componentId: 'cta-1', copy: 'Ready to Grow?' },
          { slotId: 'cta-button', componentId: 'cta-1', copy: 'Get Started Now' },
        ],
      },
      {
        screenId: 'screen-demo',
        copies: [
          { slotId: 'calendar-heading', componentId: 'calendar-1', copy: 'Book Your Free Strategy Call' },
        ],
      },
    ],
    optionalCopy: [
      {
        enhancementId: 'enh-video',
        screenId: 'screen-landing',
        copies: [
          { slotId: 'video-heading', componentId: 'video-carousel-1', copy: 'Hear From Our Founders' },
        ],
      },
    ],
  };

  return {
    result: copyPack,
    assumptions: ['Tone is professional but approachable'],
    unknowns: [],
    next_actions: ['Submit to QC for review'],
  };
}

/**
 * Creates an approved QC report.
 */
export function createMockQCPassOutput(): AgentOutput {
  const qcReport: QCReport = {
    approved: true,
    violations: [],
  };

  return {
    result: qcReport,
    assumptions: ['All framework rules were checked'],
    unknowns: [],
    next_actions: ['Assemble build plan'],
  };
}

/**
 * Creates a blocked QC report with a critical violation (optional leaked into core).
 */
export function createMockQCBlockOutput(): AgentOutput {
  const qcReport: QCReport = {
    approved: false,
    violations: [
      {
        severity: 'critical',
        description: 'Optional enhancement copy found in core copy pack',
        location: 'core.copyPack.screens[0]',
      },
    ],
    blockReason: 'Optional content leaked into core build plan',
  };

  return {
    result: qcReport,
    assumptions: [],
    unknowns: [],
    next_actions: ['Remove optional content from core and re-run QC'],
  };
}

/**
 * Registers all build mock responses on a MockLLMAdapter.
 * Uses agent ID as the pattern key for matching.
 */
export function registerBuildMocks(adapter: MockLLMAdapter): void {
  adapter.registerResponse(
    'strategy-funnel-agent',
    JSON.stringify(createMockBlueprintOutput())
  );
  adapter.registerResponse(
    'ux-design-agent',
    JSON.stringify(createMockUXUISpecOutput())
  );
  adapter.registerResponse(
    'copy-messaging-agent',
    JSON.stringify(createMockCopyPackOutput())
  );
  adapter.registerResponse(
    'quality-control-agent',
    JSON.stringify(createMockQCPassOutput())
  );
}
