/**
 * Knowledge Base Schemas
 *
 * Zod schemas for the structured knowledge base.
 * Entries represent approved requirements, assumptions, decisions,
 * design rules, and reviews — populated from confirmed requirement versions.
 */

import { z } from 'zod';

// ─── Entry Type ─────────────────────────────────────────────────────────────

export const KnowledgeEntryTypeSchema = z.enum([
  'requirement',
  'assumption',
  'decision',
  'design-rule',
  'review',
]);

export type KnowledgeEntryType = z.infer<typeof KnowledgeEntryTypeSchema>;

// ─── Entry Source ───────────────────────────────────────────────────────────

export const KnowledgeEntrySourceSchema = z.enum(['agent', 'human']);

export type KnowledgeEntrySource = z.infer<typeof KnowledgeEntrySourceSchema>;

// ─── Entry Status ───────────────────────────────────────────────────────────

export const KnowledgeEntryStatusSchema = z.enum([
  'approved',
  'rejected',
  'superseded',
]);

export type KnowledgeEntryStatus = z.infer<typeof KnowledgeEntryStatusSchema>;

// ─── Knowledge Entry ────────────────────────────────────────────────────────

export const KnowledgeEntrySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  type: KnowledgeEntryTypeSchema,
  source: KnowledgeEntrySourceSchema,
  versionRef: z.string().nullable(),
  contentJson: z.record(z.unknown()),
  status: KnowledgeEntryStatusSchema,
  createdAt: z.string(),
});

export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;
