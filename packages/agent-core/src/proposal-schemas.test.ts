import { describe, it, expect } from 'vitest';
import {
  ProposalJsonSchema,
  ProposalUiSpecJsonSchema,
  ProposalReviewSchema,
  ProposalCRMSentActionSchema,
  ProposalCRMApprovedActionSchema,
  ComplianceFlagsSchema,
  StrapiPricingPackageSchema,
} from './proposal-schemas.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function validProposalJson() {
  return {
    meta: {
      recommendedPlanId: 'plan-growth-001',
      recommendationReasons: ['Budget alignment', 'Scope fit'],
    },
    scope: {
      included: [
        {
          requirementId: 'req-landing',
          title: 'Landing Page',
          description: 'Responsive landing page build',
        },
      ],
    },
    optionalAddons: [],
    pricing: {
      planId: 'plan-growth-001',
      planName: 'Growth',
      amount: '4500',
      currency: 'GBP',
    },
    timeline: {
      estimatedWeeks: 4,
      phases: [{ name: 'Build', durationWeeks: 4 }],
    },
    compliance: {
      scopeLocked: true,
      noInventedProof: true,
      noOutcomePromises: true,
    },
  };
}

function validUiSpec() {
  return {
    layout: 'multi-section' as const,
    sections: [
      { sectionId: 'sec-hero', type: 'hero' as const, order: 1 },
      { sectionId: 'sec-cta', type: 'cta' as const, order: 2 },
    ],
    recommendedPlanHighlighted: true,
    stickyCta: true,
    progressiveDisclosureForAddons: false,
    ctaRequiresLogin: true as const,
  };
}

// ─── ProposalJsonSchema ─────────────────────────────────────────────────────

describe('ProposalJsonSchema', () => {
  it('validates a valid proposal', () => {
    const result = ProposalJsonSchema.safeParse(validProposalJson());

    expect(result.success).toBe(true);
  });

  it('rejects missing compliance flags', () => {
    const proposal = validProposalJson();
    // Remove noOutcomePromises to break compliance
    const broken = {
      ...proposal,
      compliance: {
        scopeLocked: true,
        noInventedProof: true,
        // noOutcomePromises is missing
      },
    };

    const result = ProposalJsonSchema.safeParse(broken);

    expect(result.success).toBe(false);
  });

  it('rejects empty scope.included', () => {
    const proposal = validProposalJson();
    const broken = {
      ...proposal,
      scope: { included: [] },
    };

    const result = ProposalJsonSchema.safeParse(broken);

    expect(result.success).toBe(false);
  });
});

// ─── ProposalUiSpecJsonSchema ───────────────────────────────────────────────

describe('ProposalUiSpecJsonSchema', () => {
  it('validates a valid UI spec', () => {
    const result = ProposalUiSpecJsonSchema.safeParse(validUiSpec());

    expect(result.success).toBe(true);
  });

  it('rejects ctaRequiresLogin=false', () => {
    const spec = { ...validUiSpec(), ctaRequiresLogin: false };

    const result = ProposalUiSpecJsonSchema.safeParse(spec);

    expect(result.success).toBe(false);
  });
});

// ─── ProposalReviewSchema ───────────────────────────────────────────────────

describe('ProposalReviewSchema', () => {
  it('validates valid review input', () => {
    const review = {
      status: 'APPROVED',
      notes: 'Looks good, ready to send.',
      reviewerUserId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    };

    const result = ProposalReviewSchema.safeParse(review);

    expect(result.success).toBe(true);
  });
});

// ─── ProposalCRMSentActionSchema ────────────────────────────────────────────

describe('ProposalCRMSentActionSchema', () => {
  it('validates sent action', () => {
    const action = {
      event: 'proposal.sent',
      projectId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      proposalVersionId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      crmActions: {
        moveStage: 'Proposal sent',
        addNote: 'Proposal v1 sent to client',
        addTags: ['proposal-sent', 'growth-tier'],
      },
    };

    const result = ProposalCRMSentActionSchema.safeParse(action);

    expect(result.success).toBe(true);
  });
});

// ─── ProposalCRMApprovedActionSchema ────────────────────────────────────────

describe('ProposalCRMApprovedActionSchema', () => {
  it('validates approved action', () => {
    const action = {
      event: 'proposal.approved',
      projectId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      proposalVersionId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      crmActions: {
        moveStage: 'Won',
        triggerWorkflow: 'onboarding-kickoff',
        addNote: 'Proposal approved by client',
      },
    };

    const result = ProposalCRMApprovedActionSchema.safeParse(action);

    expect(result.success).toBe(true);
  });
});

// ─── ComplianceFlagsSchema ──────────────────────────────────────────────────

describe('ComplianceFlagsSchema', () => {
  it('rejects scopeLocked=false', () => {
    const flags = {
      scopeLocked: false,
      noInventedProof: true,
      noOutcomePromises: true,
    };

    const result = ComplianceFlagsSchema.safeParse(flags);

    expect(result.success).toBe(false);
  });
});

// ─── StrapiPricingPackageSchema ─────────────────────────────────────────────

describe('StrapiPricingPackageSchema', () => {
  it('validates a pricing package', () => {
    const pkg = {
      id: 'pkg-growth-001',
      name: 'Growth',
      tier: 'growth',
      price: '4500',
      currency: 'GBP',
      features: ['Landing page', 'CRM integration', 'Analytics setup'],
    };

    const result = StrapiPricingPackageSchema.safeParse(pkg);

    expect(result.success).toBe(true);
  });
});
