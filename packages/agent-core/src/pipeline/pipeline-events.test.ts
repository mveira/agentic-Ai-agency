import { describe, it, expect } from 'vitest';
import {
  PipelineEventTypeSchema,
  PipelineRouterInputSchema,
} from './pipeline-events.js';

describe('PipelineEventTypeSchema', () => {
  it('accepts all valid event types', () => {
    const events = [
      'INTENT_RECEIVED', 'ACK_SENT', 'SAFETY_CHECK_COMPLETED',
      'CLARIFICATION_SESSION_CREATED', 'REQUIREMENTS_VERSION_CREATED',
      'REQUIREMENTS_CONFIRMED', 'ASSUMPTIONS_APPROVED_ALL',
      'PROPOSAL_MARKED_SENT', 'PROPOSAL_CLIENT_APPROVED',
      'MARK_LOST', 'NOT_A_FIT',
    ];
    for (const e of events) {
      expect(PipelineEventTypeSchema.safeParse(e).success).toBe(true);
    }
  });

  it('rejects invalid event type', () => {
    expect(PipelineEventTypeSchema.safeParse('BOGUS').success).toBe(false);
  });
});

describe('PipelineRouterInputSchema', () => {
  it('validates a complete input', () => {
    const input = {
      projectId: 'proj-1',
      eventId: 'evt-1',
      triggeringEvent: 'INTENT_RECEIVED',
      relatedIds: { contactId: 'c-1' },
    };
    expect(PipelineRouterInputSchema.safeParse(input).success).toBe(true);
  });

  it('accepts input without relatedIds', () => {
    const input = {
      projectId: 'proj-1',
      eventId: 'evt-1',
      triggeringEvent: 'ACK_SENT',
    };
    expect(PipelineRouterInputSchema.safeParse(input).success).toBe(true);
  });

  it('rejects missing eventId', () => {
    const input = {
      projectId: 'proj-1',
      triggeringEvent: 'ACK_SENT',
    };
    expect(PipelineRouterInputSchema.safeParse(input).success).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(PipelineRouterInputSchema.safeParse({}).success).toBe(false);
  });
});
