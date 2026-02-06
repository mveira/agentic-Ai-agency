import { describe, it, expect } from 'vitest';
import { computePipelineAction, PipelineActionContractSchema } from './pipeline-router.js';
import { InMemoryPipelineContractStore } from './pipeline-contract-store.js';
import type { PipelineRouterInput } from './pipeline-events.js';

function makeInput(
  triggeringEvent: PipelineRouterInput['triggeringEvent'],
  eventId = `evt-${crypto.randomUUID()}`,
  relatedIds?: Record<string, string>,
): PipelineRouterInput {
  return { projectId: 'proj-1', eventId, triggeringEvent, relatedIds };
}

describe('computePipelineAction', () => {
  // ─── Stage-Moving Events ──────────────────────────────────────────────────

  it('INTENT_RECEIVED → NEW_LEAD', () => {
    const contract = computePipelineAction(makeInput('INTENT_RECEIVED'));
    expect(contract).not.toBeNull();
    expect(contract!.targetStage).toBe('NEW_LEAD');
    expect(contract!.actionType).toBe('MOVE_STAGE');
    expect(contract!.humanReadableNote).toBe('New enquiry received and logged.');
  });

  it('ACK_SENT → IN_REVIEW', () => {
    const contract = computePipelineAction(makeInput('ACK_SENT'));
    expect(contract).not.toBeNull();
    expect(contract!.targetStage).toBe('IN_REVIEW');
    expect(contract!.humanReadableNote).toContain('Acknowledgement sent');
  });

  it('CLARIFICATION_SESSION_CREATED → CLARIFICATION', () => {
    const contract = computePipelineAction(makeInput('CLARIFICATION_SESSION_CREATED'));
    expect(contract!.targetStage).toBe('CLARIFICATION');
    expect(contract!.humanReadableNote).toContain('focused questions');
  });

  it('REQUIREMENTS_VERSION_CREATED → REQUIREMENTS_REVIEW', () => {
    const contract = computePipelineAction(makeInput('REQUIREMENTS_VERSION_CREATED'));
    expect(contract!.targetStage).toBe('REQUIREMENTS_REVIEW');
    expect(contract!.humanReadableNote).toContain('Draft requirements');
  });

  it('PROPOSAL_MARKED_SENT → PROPOSAL_SENT', () => {
    const contract = computePipelineAction(makeInput('PROPOSAL_MARKED_SENT'));
    expect(contract!.targetStage).toBe('PROPOSAL_SENT');
    expect(contract!.humanReadableNote).toContain('Proposal prepared');
  });

  it('PROPOSAL_CLIENT_APPROVED → WON', () => {
    const contract = computePipelineAction(makeInput('PROPOSAL_CLIENT_APPROVED'));
    expect(contract!.targetStage).toBe('WON');
    expect(contract!.humanReadableNote).toContain('Proposal approved');
  });

  it('MARK_LOST → LOST', () => {
    const contract = computePipelineAction(makeInput('MARK_LOST'));
    expect(contract!.targetStage).toBe('LOST');
    expect(contract!.humanReadableNote).toContain('Not the right fit');
  });

  it('NOT_A_FIT → LOST', () => {
    const contract = computePipelineAction(makeInput('NOT_A_FIT'));
    expect(contract!.targetStage).toBe('LOST');
  });

  // ─── Non-Stage-Moving Events (Must Return null) ───────────────────────────

  it('SAFETY_CHECK_COMPLETED does NOT move stage', () => {
    expect(computePipelineAction(makeInput('SAFETY_CHECK_COMPLETED'))).toBeNull();
  });

  it('REQUIREMENTS_CONFIRMED does NOT move stage', () => {
    expect(computePipelineAction(makeInput('REQUIREMENTS_CONFIRMED'))).toBeNull();
  });

  it('ASSUMPTIONS_APPROVED_ALL does NOT move stage', () => {
    expect(computePipelineAction(makeInput('ASSUMPTIONS_APPROVED_ALL'))).toBeNull();
  });

  // ─── Contract Structure ───────────────────────────────────────────────────

  it('emitted contract validates against PipelineActionContractSchema', () => {
    const contract = computePipelineAction(makeInput('INTENT_RECEIVED', 'evt-42'));
    expect(PipelineActionContractSchema.safeParse(contract).success).toBe(true);
  });

  it('includes internalReason with eventType, eventId, and relatedIds', () => {
    const contract = computePipelineAction(
      makeInput('ACK_SENT', 'evt-99', { contactId: 'c-5' }),
    );
    expect(contract!.internalReason.eventType).toBe('ACK_SENT');
    expect(contract!.internalReason.eventId).toBe('evt-99');
    expect(contract!.internalReason.relatedIds).toEqual({ contactId: 'c-5' });
  });

  it('idempotencyKey follows eventId:MOVE_STAGE pattern', () => {
    const contract = computePipelineAction(makeInput('INTENT_RECEIVED', 'evt-123'));
    expect(contract!.idempotencyKey).toBe('evt-123:MOVE_STAGE');
  });

  // ─── Determinism ──────────────────────────────────────────────────────────

  it('returns same targetStage and note for identical inputs', () => {
    const input = makeInput('INTENT_RECEIVED', 'evt-fixed');
    const a = computePipelineAction(input);
    const b = computePipelineAction(input);
    expect(a!.targetStage).toBe(b!.targetStage);
    expect(a!.humanReadableNote).toBe(b!.humanReadableNote);
    expect(a!.idempotencyKey).toBe(b!.idempotencyKey);
  });
});

// ─── Integration: Full Pipeline Path ────────────────────────────────────────

describe('Full pipeline path integration', () => {
  it('simulates INTENT_RECEIVED → ACK_SENT → CLARIFICATION → REQUIREMENTS → PROPOSAL → WON', () => {
    const store = new InMemoryPipelineContractStore();
    const events: Array<{ event: PipelineRouterInput['triggeringEvent']; id: string }> = [
      { event: 'INTENT_RECEIVED', id: 'evt-1' },
      { event: 'ACK_SENT', id: 'evt-2' },
      { event: 'CLARIFICATION_SESSION_CREATED', id: 'evt-3' },
      { event: 'REQUIREMENTS_VERSION_CREATED', id: 'evt-4' },
      { event: 'PROPOSAL_MARKED_SENT', id: 'evt-5' },
      { event: 'PROPOSAL_CLIENT_APPROVED', id: 'evt-6' },
    ];

    const expectedStages = [
      'NEW_LEAD', 'IN_REVIEW', 'CLARIFICATION',
      'REQUIREMENTS_REVIEW', 'PROPOSAL_SENT', 'WON',
    ];

    for (const { event, id } of events) {
      const contract = computePipelineAction(makeInput(event, id));
      expect(contract).not.toBeNull();
      store.insert(contract!);
    }

    const contracts = store.findByProject('proj-1');
    expect(contracts).toHaveLength(6);
    expect(contracts.map((c) => c.targetStage)).toEqual(expectedStages);
    expect(contracts.every((c) => c.status === 'PENDING')).toBe(true);
  });
});

// ─── Negative: Duplicate Idempotency ────────────────────────────────────────

describe('Idempotency enforcement', () => {
  it('replaying same eventId does NOT duplicate contracts in store', () => {
    const store = new InMemoryPipelineContractStore();
    const contract = computePipelineAction(makeInput('INTENT_RECEIVED', 'evt-dup'));
    store.insert(contract!);

    // Same eventId → same idempotencyKey → must reject
    const duplicate = computePipelineAction(makeInput('INTENT_RECEIVED', 'evt-dup'));
    expect(store.hasIdempotencyKey(duplicate!.idempotencyKey)).toBe(true);
    expect(() => store.insert(duplicate!)).toThrow('Duplicate idempotency key');

    expect(store.findByProject('proj-1')).toHaveLength(1);
  });
});
