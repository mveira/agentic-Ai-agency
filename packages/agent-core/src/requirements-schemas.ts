/**
 * Requirements Schemas
 *
 * Zod schemas for requirements + assumptions confirmation flow.
 * Used by RequirementsVersionStore and API routes.
 */

import { z } from 'zod';

// ─── Requirement ─────────────────────────────────────────────────────────────

export const RequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  details: z.string(),
  priority: z.enum(['MUST', 'SHOULD', 'COULD']),
  category: z.string().optional(),
});

export type Requirement = z.infer<typeof RequirementSchema>;

// ─── Assumption ──────────────────────────────────────────────────────────────

export const AssumptionSchema = z.object({
  id: z.string(),
  statement: z.string(),
  reason: z.string(),
});

export type Assumption = z.infer<typeof AssumptionSchema>;

// ─── Requirements Bundle (LLM output) ───────────────────────────────────────

export const RequirementsBundleSchema = z.object({
  requirements: z.array(RequirementSchema).min(1),
  assumptions: z.array(AssumptionSchema).min(1),
  openQuestions: z.array(z.string()).optional(),
});

export type RequirementsBundle = z.infer<typeof RequirementsBundleSchema>;

// ─── Confirm Payload (from dashboard) ────────────────────────────────────────

export const ConfirmPayloadSchema = z.object({
  requirements: z.array(
    z.object({
      id: z.string(),
      confirmed: z.boolean(),
      changeNote: z.string().optional(),
    })
  ),
  assumptions: z.array(
    z.object({
      id: z.string(),
      status: z.enum(['approved', 'rejected']),
      comment: z.string().optional(),
    })
  ),
});

export type ConfirmPayload = z.infer<typeof ConfirmPayloadSchema>;

// ─── Change Request ──────────────────────────────────────────────────────────

export const ChangeRequestSchema = z.object({
  type: z.enum(['requirement', 'assumption']),
  itemId: z.string(),
  notes: z.string(),
});

export type ChangeRequest = z.infer<typeof ChangeRequestSchema>;

// ─── Requirements Version ────────────────────────────────────────────────────

export const RequirementsVersionSchema = z.object({
  versionId: z.string(),
  projectId: z.string(),
  versionNumber: z.number().int().min(1),
  status: z.enum(['pending_confirmation', 'confirmed', 'regenerating']),
  requirements: z.array(
    RequirementSchema.extend({
      confirmed: z.boolean().nullable().default(null),
      changeNote: z.string().optional(),
    })
  ),
  assumptions: z.array(
    AssumptionSchema.extend({
      status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
      comment: z.string().optional(),
    })
  ),
  factsSnapshot: z.object({
    summary: z.array(z.string()),
    structuredAnswers: z.array(
      z.object({
        key: z.string(),
        value: z.union([z.string(), z.array(z.string()), z.number()]),
      })
    ),
  }),
  changeRequests: z.array(ChangeRequestSchema).default([]),
  createdAt: z.string(),
});

export type RequirementsVersion = z.infer<typeof RequirementsVersionSchema>;
