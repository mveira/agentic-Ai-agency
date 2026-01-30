import { describe, it, expect } from 'vitest';
import {
  PipelineEventTypeSchema,
  GateStateSnapshotSchema,
  PipelineRouterInputSchema,
} from './pipeline-events.js';

describe('PipelineEventTypeSchema', () => {
  it('accepts all valid event types', () => {
    const events = [
      'INTENT_RECEIVED', 'ACK_SENT', 'SAFETY_CHECK_COMPLETED',
      'CLARIFICATION_SESSION_CREATED', 'REQUIREMENTS_VERSION_CREATED',
      'ASSUMPTIONS_ALL_APPROVED', 'PROPOSAL_MARKED_SENT',
      'PROPOSAL_CLIENT_APPROVED', 'NOT_A_FIT',
    ];
    for (const e of events) {
      expect(PipelineEventTypeSchema.safeParse(e).success).toBe(true);
    }
  });

  it('rejects invalid event type', () => {
    expect(PipelineEventTypeSchema.safeParse('BOGUS').success).toBe(false);
  });
});

describe('GateStateSnapshotSchema', () => {
  it('validates a full gate state', () => {
    const state = {
      safetyCheck: 'passed',
      clarification: 'complete',
      requirements: 'confirmed',
      assumptions: 'all_approved',
      proposal: 'sent',
      proposalReview: 'approved',
      fitDecision: 'fit',
    };
    expect(GateStateSnapshotSchema.safeParse(state).success).toBe(true);
  });

  it('provides defaults for missing fields', () => {
    const result = GateStateSnapshotSchema.parse({});
    expect(result.safetyCheck).toBe('pending');
    expect(result.assumptions).toBe('pending');
  });

  it('rejects invalid gate values', () => {
    expect(GateStateSnapshotSchema.safeParse({ safetyCheck: 'invalid' }).success).toBe(false);
  });
});

describe('PipelineRouterInputSchema', () => {
  it('validates a complete input', () => {
    const input = {
      projectId: 'proj-1',
      contactId: 'contact-1',
      currentStage: 'NEW_LEAD',
      triggeringEvent: 'INTENT_RECEIVED',
      gateState: {},
    };
    expect(PipelineRouterInputSchema.safeParse(input).success).toBe(true);
  });

  it('accepts input without currentStage', () => {
    const input = {
      projectId: 'proj-1',
      contactId: 'contact-1',
      triggeringEvent: 'ACK_SENT',
      gateState: {},
    };
    expect(PipelineRouterInputSchema.safeParse(input).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    expect(PipelineRouterInputSchema.safeParse({}).success).toBe(false);
  });
});
