import { describe, it, expect } from 'vitest';
import {
  RequirementSchema,
  AssumptionSchema,
  RequirementsBundleSchema,
  ConfirmPayloadSchema,
  ChangeRequestSchema,
  RequirementsVersionSchema,
} from './requirements-schemas.js';

describe('RequirementSchema', () => {
  it('validates a valid requirement', () => {
    const valid = {
      id: 'req-1',
      title: 'Landing page with hero section',
      details: 'Must include CTA above the fold',
      priority: 'MUST',
      category: 'design',
    };
    expect(RequirementSchema.safeParse(valid).success).toBe(true);
  });

  it('validates without optional category', () => {
    const valid = {
      id: 'req-1',
      title: 'Landing page',
      details: 'Details here',
      priority: 'SHOULD',
    };
    expect(RequirementSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid priority', () => {
    const invalid = {
      id: 'req-1',
      title: 'Landing page',
      details: 'Details',
      priority: 'WONT',
    };
    expect(RequirementSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects missing title', () => {
    const invalid = {
      id: 'req-1',
      details: 'Details',
      priority: 'MUST',
    };
    expect(RequirementSchema.safeParse(invalid).success).toBe(false);
  });

  it('accepts all three priority levels', () => {
    for (const priority of ['MUST', 'SHOULD', 'COULD']) {
      const result = RequirementSchema.safeParse({
        id: 'req-1',
        title: 'Test',
        details: 'Test',
        priority,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('AssumptionSchema', () => {
  it('validates a valid assumption', () => {
    const valid = {
      id: 'asn-1',
      statement: 'Client wants minimal design',
      reason: 'Based on intake form preferences',
    };
    expect(AssumptionSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing reason', () => {
    const invalid = {
      id: 'asn-1',
      statement: 'Client wants minimal design',
    };
    expect(AssumptionSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('RequirementsBundleSchema', () => {
  it('validates a valid bundle', () => {
    const valid = {
      requirements: [
        { id: 'req-1', title: 'Landing page', details: 'With hero', priority: 'MUST' },
      ],
      assumptions: [
        { id: 'asn-1', statement: 'Minimal design', reason: 'Intake data' },
      ],
    };
    expect(RequirementsBundleSchema.safeParse(valid).success).toBe(true);
  });

  it('validates with openQuestions', () => {
    const valid = {
      requirements: [
        { id: 'req-1', title: 'Landing page', details: 'With hero', priority: 'MUST' },
      ],
      assumptions: [
        { id: 'asn-1', statement: 'Minimal design', reason: 'Intake data' },
      ],
      openQuestions: ['What is the brand color?'],
    };
    expect(RequirementsBundleSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty requirements array', () => {
    const invalid = {
      requirements: [],
      assumptions: [
        { id: 'asn-1', statement: 'Minimal design', reason: 'Intake data' },
      ],
    };
    expect(RequirementsBundleSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects empty assumptions array', () => {
    const invalid = {
      requirements: [
        { id: 'req-1', title: 'Landing page', details: 'With hero', priority: 'MUST' },
      ],
      assumptions: [],
    };
    expect(RequirementsBundleSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('ConfirmPayloadSchema', () => {
  it('validates a full confirm payload', () => {
    const valid = {
      requirements: [
        { id: 'req-1', confirmed: true },
        { id: 'req-2', confirmed: false, changeNote: 'Need more detail' },
      ],
      assumptions: [
        { id: 'asn-1', status: 'approved' },
        { id: 'asn-2', status: 'rejected', comment: 'Not accurate' },
      ],
    };
    expect(ConfirmPayloadSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid assumption status', () => {
    const invalid = {
      requirements: [{ id: 'req-1', confirmed: true }],
      assumptions: [{ id: 'asn-1', status: 'pending' }],
    };
    expect(ConfirmPayloadSchema.safeParse(invalid).success).toBe(false);
  });

  it('accepts empty arrays', () => {
    const valid = {
      requirements: [],
      assumptions: [],
    };
    expect(ConfirmPayloadSchema.safeParse(valid).success).toBe(true);
  });
});

describe('ChangeRequestSchema', () => {
  it('validates a requirement change request', () => {
    const valid = {
      type: 'requirement',
      itemId: 'req-1',
      notes: 'Needs more detail on CTA placement',
    };
    expect(ChangeRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('validates an assumption change request', () => {
    const valid = {
      type: 'assumption',
      itemId: 'asn-1',
      notes: 'Design should be bold, not minimal',
    };
    expect(ChangeRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid type', () => {
    const invalid = {
      type: 'question',
      itemId: 'q-1',
      notes: 'Invalid',
    };
    expect(ChangeRequestSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('RequirementsVersionSchema', () => {
  const validVersion = {
    versionId: 'v1',
    projectId: 'proj-1',
    versionNumber: 1,
    status: 'pending_confirmation',
    requirements: [
      {
        id: 'req-1',
        title: 'Landing page',
        details: 'With hero section',
        priority: 'MUST',
        confirmed: null,
      },
    ],
    assumptions: [
      {
        id: 'asn-1',
        statement: 'Minimal design',
        reason: 'From intake',
        status: 'pending',
      },
    ],
    factsSnapshot: {
      summary: ['Target audience: SaaS founders'],
      structuredAnswers: [{ key: 'budget', value: 3000 }],
    },
    changeRequests: [],
    createdAt: '2026-01-26T10:00:00Z',
  };

  it('validates a valid version', () => {
    expect(RequirementsVersionSchema.safeParse(validVersion).success).toBe(true);
  });

  it('rejects invalid status', () => {
    const invalid = { ...validVersion, status: 'draft' };
    expect(RequirementsVersionSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects versionNumber less than 1', () => {
    const invalid = { ...validVersion, versionNumber: 0 };
    expect(RequirementsVersionSchema.safeParse(invalid).success).toBe(false);
  });

  it('defaults changeRequests to empty array', () => {
    const withoutCR = { ...validVersion };
    delete (withoutCR as Record<string, unknown>).changeRequests;
    const result = RequirementsVersionSchema.safeParse(withoutCR);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.changeRequests).toEqual([]);
    }
  });

  it('accepts confirmed status', () => {
    const confirmed = { ...validVersion, status: 'confirmed' };
    expect(RequirementsVersionSchema.safeParse(confirmed).success).toBe(true);
  });

  it('accepts regenerating status', () => {
    const regen = { ...validVersion, status: 'regenerating' };
    expect(RequirementsVersionSchema.safeParse(regen).success).toBe(true);
  });
});
