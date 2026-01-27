/**
 * Proposal Domain Schemas
 *
 * Zod schemas for the proposal system: strategist output (proposalJson),
 * UX conversion spec (proposalUiSpecJson), review, actions, and CRM contracts.
 */

import { z } from 'zod';

// ─── Proposal Status ────────────────────────────────────────────────────────

export const ProposalStatusSchema = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'SENT',
  'APPROVED',
  'EXPIRED',
]);

export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

// ─── Scope Items ────────────────────────────────────────────────────────────

export const ProposalScopeItemSchema = z.object({
  requirementId: z.string().describe('Must reference a valid approved requirement'),
  title: z.string(),
  description: z.string(),
});

export type ProposalScopeItem = z.infer<typeof ProposalScopeItemSchema>;

export const ProposalAddOnSchema = z.object({
  addOnId: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.string().optional(),
});

export type ProposalAddOn = z.infer<typeof ProposalAddOnSchema>;

// ─── Compliance Flags ───────────────────────────────────────────────────────

export const ComplianceFlagsSchema = z.object({
  scopeLocked: z.literal(true),
  noInventedProof: z.literal(true),
  noOutcomePromises: z.literal(true),
});

export type ComplianceFlags = z.infer<typeof ComplianceFlagsSchema>;

// ─── Proposal JSON (Strategist Output) ──────────────────────────────────────

export const ProposalJsonSchema = z.object({
  meta: z.object({
    recommendedPlanId: z.string(),
    recommendationReasons: z.array(z.string()).min(1),
  }),
  scope: z.object({
    included: z.array(ProposalScopeItemSchema).min(1),
  }),
  optionalAddons: z.array(ProposalAddOnSchema),
  pricing: z.object({
    planId: z.string(),
    planName: z.string(),
    amount: z.string(),
    currency: z.string().default('GBP'),
  }),
  timeline: z.object({
    estimatedWeeks: z.number().int().positive(),
    phases: z.array(
      z.object({
        name: z.string(),
        durationWeeks: z.number().int().positive(),
      })
    ),
  }),
  compliance: ComplianceFlagsSchema,
});

export type ProposalJson = z.infer<typeof ProposalJsonSchema>;

// ─── Proposal UI Spec (UXDesignAgent Conversion Output) ─────────────────────

export const ProposalUiSpecJsonSchema = z.object({
  layout: z.enum(['single-page', 'multi-section', 'progressive']),
  sections: z.array(
    z.object({
      sectionId: z.string(),
      type: z.enum([
        'hero',
        'problem',
        'solution',
        'scope',
        'pricing',
        'timeline',
        'social-proof',
        'addons',
        'cta',
        'faq',
      ]),
      order: z.number().int(),
      config: z.record(z.unknown()).optional(),
    })
  ),
  recommendedPlanHighlighted: z.boolean(),
  stickyCta: z.boolean(),
  progressiveDisclosureForAddons: z.boolean(),
  ctaRequiresLogin: z.literal(true),
});

export type ProposalUiSpecJson = z.infer<typeof ProposalUiSpecJsonSchema>;

// ─── Review ─────────────────────────────────────────────────────────────────

export const ProposalReviewStatusSchema = z.enum(['APPROVED', 'CHANGES_REQUESTED']);
export type ProposalReviewStatus = z.infer<typeof ProposalReviewStatusSchema>;

export const ProposalReviewSchema = z.object({
  status: ProposalReviewStatusSchema,
  notes: z.string().optional(),
  reviewerUserId: z.string().uuid(),
});

export type ProposalReviewInput = z.infer<typeof ProposalReviewSchema>;

// ─── Actions ────────────────────────────────────────────────────────────────

export const ProposalActionTypeSchema = z.enum(['SENT', 'VIEWED', 'APPROVED']);
export type ProposalActionType = z.infer<typeof ProposalActionTypeSchema>;

// ─── Strapi Content Interfaces (Read-Only) ──────────────────────────────────

export const StrapiPricingPackageSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.enum(['starter', 'growth', 'scale']),
  price: z.string(),
  currency: z.string().default('GBP'),
  features: z.array(z.string()),
});

export type StrapiPricingPackage = z.infer<typeof StrapiPricingPackageSchema>;

export const StrapiProposalTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  sectionOrder: z.array(z.string()),
  defaults: z.record(z.unknown()),
});

export type StrapiProposalTemplate = z.infer<typeof StrapiProposalTemplateSchema>;

export const StrapiPersuasionFrameworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  principles: z.array(z.string()),
  ethicalOnly: z.literal(true),
});

export type StrapiPersuasionFramework = z.infer<typeof StrapiPersuasionFrameworkSchema>;

export const StrapiHormoziFrameworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  offerFramingRules: z.array(z.string()),
});

export type StrapiHormoziFramework = z.infer<typeof StrapiHormoziFrameworkSchema>;

export const StrapiTimelineRuleSchema = z.object({
  id: z.string(),
  scopeType: z.string(),
  estimatedWeeks: z.number().int().positive(),
});

export type StrapiTimelineRule = z.infer<typeof StrapiTimelineRuleSchema>;

/**
 * Interface for reading Strapi proposal content.
 * Agents consume via this interface; never call Strapi directly.
 */
export interface ProposalStrapiProvider {
  getPricingPackages(): Promise<StrapiPricingPackage[]>;
  getProposalTemplates(): Promise<StrapiProposalTemplate[]>;
  getPersuasionFrameworks(): Promise<StrapiPersuasionFramework[]>;
  getHormoziFramework(): Promise<StrapiHormoziFramework>;
  getTimelineRules(): Promise<StrapiTimelineRule[]>;
}

// ─── CRM Action Contracts ───────────────────────────────────────────────────

export const ProposalCRMSentActionSchema = z.object({
  event: z.literal('proposal.sent'),
  projectId: z.string().uuid(),
  proposalVersionId: z.string().uuid(),
  crmActions: z.object({
    moveStage: z.literal('Proposal sent'),
    addNote: z.string(),
    addTags: z.array(z.string()),
  }),
});

export type ProposalCRMSentAction = z.infer<typeof ProposalCRMSentActionSchema>;

export const ProposalCRMApprovedActionSchema = z.object({
  event: z.literal('proposal.approved'),
  projectId: z.string().uuid(),
  proposalVersionId: z.string().uuid(),
  crmActions: z.object({
    moveStage: z.literal('Won'),
    triggerWorkflow: z.string(),
    addNote: z.string(),
  }),
});

export type ProposalCRMApprovedAction = z.infer<typeof ProposalCRMApprovedActionSchema>;
