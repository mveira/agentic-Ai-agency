/**
 * Proposal Pipeline Mocks
 *
 * Factory functions producing mock agent outputs that match the proposal schemas.
 * Used in tests for the ProposalOrchestrator pipeline.
 */

import type { AgentOutput } from './types.js';
import type { ProposalJson, ProposalUiSpecJson } from './proposal-schemas.js';
import type { MockLLMAdapter } from './mock-llm.js';

/**
 * Creates a valid ProposalJson with scope items, compliance flags, and pricing.
 */
export function createMockProposalJsonOutput(): AgentOutput {
  const proposalJson: ProposalJson = {
    meta: {
      recommendedPlanId: 'plan-growth-001',
      recommendationReasons: [
        'Client budget aligns with Growth tier pricing',
        'Scope requires multi-page build with CRM integration',
        'Timeline fits Growth tier delivery window',
      ],
    },
    scope: {
      included: [
        {
          requirementId: 'req-landing-page',
          title: 'Custom Landing Page',
          description: 'Responsive landing page with hero, social proof, and CTA sections',
        },
        {
          requirementId: 'req-crm-integration',
          title: 'CRM Integration',
          description: 'HubSpot integration with automated lead capture and tagging',
        },
        {
          requirementId: 'req-analytics',
          title: 'Analytics Dashboard',
          description: 'GA4 setup with custom conversion tracking and reporting',
        },
      ],
    },
    optionalAddons: [
      {
        addOnId: 'addon-chatbot',
        title: 'AI Chatbot Widget',
        description: 'Conversational AI widget for visitor engagement and lead qualification',
        price: '500',
      },
      {
        addOnId: 'addon-ab-testing',
        title: 'A/B Testing Setup',
        description: 'Split testing framework for headline and CTA optimisation',
      },
    ],
    pricing: {
      planId: 'plan-growth-001',
      planName: 'Growth',
      amount: '4500',
      currency: 'GBP',
    },
    timeline: {
      estimatedWeeks: 6,
      phases: [
        { name: 'Discovery & Strategy', durationWeeks: 1 },
        { name: 'Design & UX', durationWeeks: 2 },
        { name: 'Development & Integration', durationWeeks: 2 },
        { name: 'QA & Launch', durationWeeks: 1 },
      ],
    },
    compliance: {
      scopeLocked: true,
      noInventedProof: true,
      noOutcomePromises: true,
    },
  };

  return {
    result: proposalJson,
    assumptions: ['Client requirements have been approved through assumption gate'],
    unknowns: ['Client preference for specific CRM platform beyond HubSpot'],
    next_actions: ['Pass proposal JSON to UX design agent for UI spec conversion'],
  };
}

/**
 * Creates a valid ProposalUiSpecJson with multi-section layout.
 */
export function createMockProposalUiSpecOutput(): AgentOutput {
  const uiSpec: ProposalUiSpecJson = {
    layout: 'multi-section',
    sections: [
      { sectionId: 'sec-hero', type: 'hero', order: 1 },
      { sectionId: 'sec-problem', type: 'problem', order: 2 },
      { sectionId: 'sec-solution', type: 'solution', order: 3 },
      { sectionId: 'sec-scope', type: 'scope', order: 4, config: { showRequirementIds: true } },
      { sectionId: 'sec-pricing', type: 'pricing', order: 5, config: { highlightRecommended: true } },
      { sectionId: 'sec-timeline', type: 'timeline', order: 6 },
      { sectionId: 'sec-proof', type: 'social-proof', order: 7 },
      { sectionId: 'sec-addons', type: 'addons', order: 8 },
      { sectionId: 'sec-faq', type: 'faq', order: 9 },
      { sectionId: 'sec-cta', type: 'cta', order: 10, config: { buttonText: 'Approve Proposal' } },
    ],
    recommendedPlanHighlighted: true,
    stickyCta: true,
    progressiveDisclosureForAddons: true,
    ctaRequiresLogin: true,
  };

  return {
    result: uiSpec,
    assumptions: ['Multi-section layout is optimal for proposal complexity'],
    unknowns: [],
    next_actions: ['Render proposal UI for client review'],
  };
}

/**
 * Creates an approved QC report for the proposal pipeline.
 */
export function createMockProposalQCPassOutput(): AgentOutput {
  return {
    result: {
      approved: true,
      violations: [],
    },
    assumptions: ['All compliance flags verified against proposal content'],
    unknowns: [],
    next_actions: ['Proposal is ready to send to client'],
  };
}

/**
 * Creates a blocked QC report with a compliance violation.
 */
export function createMockProposalQCBlockOutput(): AgentOutput {
  return {
    result: {
      approved: false,
      violations: [
        {
          severity: 'critical',
          description: 'Proposal contains outcome promise: "guaranteed 3x ROI"',
          location: 'proposalJson.scope.included[1].description',
        },
      ],
      blockReason: 'Compliance violation: noOutcomePromises flag breached',
    },
    assumptions: [],
    unknowns: [],
    next_actions: ['Remove outcome promise language and re-run QC'],
  };
}

/**
 * Registers all proposal mock responses on a MockLLMAdapter.
 * Uses agent ID as the pattern key for matching.
 */
export function registerProposalMocks(adapter: MockLLMAdapter): void {
  adapter.registerResponse(
    'proposal-strategist-agent',
    JSON.stringify(createMockProposalJsonOutput())
  );
  adapter.registerResponse(
    'proposal-ux-agent',
    JSON.stringify(createMockProposalUiSpecOutput())
  );
  adapter.registerResponse(
    'proposal-qc-agent',
    JSON.stringify(createMockProposalQCPassOutput())
  );
}
