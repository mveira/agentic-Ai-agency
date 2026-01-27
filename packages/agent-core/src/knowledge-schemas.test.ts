import { describe, it, expect } from 'vitest';
import {
  KnowledgeEntrySchema,
  KnowledgeEntryTypeSchema,
  KnowledgeEntryStatusSchema,
} from './knowledge-schemas.js';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

function validEntry() {
  return {
    id: VALID_UUID,
    projectId: VALID_UUID,
    type: 'requirement' as const,
    source: 'agent' as const,
    versionRef: 'v1',
    contentJson: { title: 'Landing page', priority: 'MUST' },
    status: 'approved' as const,
    createdAt: '2026-01-26T10:00:00Z',
  };
}

describe('KnowledgeEntrySchema', () => {
  it('parses a valid entry', () => {
    const result = KnowledgeEntrySchema.safeParse(validEntry());
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const { id: _, ...rest } = validEntry();
    const result = KnowledgeEntrySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid type', () => {
    const result = KnowledgeEntrySchema.safeParse({
      ...validEntry(),
      type: 'invalid-type',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = KnowledgeEntrySchema.safeParse({
      ...validEntry(),
      status: 'pending',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid projectId', () => {
    const result = KnowledgeEntrySchema.safeParse({
      ...validEntry(),
      projectId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts nullable versionRef', () => {
    const result = KnowledgeEntrySchema.safeParse({
      ...validEntry(),
      versionRef: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('KnowledgeEntryTypeSchema', () => {
  it('accepts all valid types', () => {
    for (const t of ['requirement', 'assumption', 'decision', 'design-rule', 'review']) {
      expect(KnowledgeEntryTypeSchema.safeParse(t).success).toBe(true);
    }
  });
});

describe('KnowledgeEntryStatusSchema', () => {
  it('accepts all valid statuses', () => {
    for (const s of ['approved', 'rejected', 'superseded']) {
      expect(KnowledgeEntryStatusSchema.safeParse(s).success).toBe(true);
    }
  });
});
