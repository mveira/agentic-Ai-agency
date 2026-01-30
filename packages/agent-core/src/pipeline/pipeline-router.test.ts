import { describe, it, expect } from 'vitest';
import { computeCrmActions } from './pipeline-router.js';
import type { PipelineRouterInput } from './pipeline-events.js';
import type { GateStateSnapshot } from './pipeline-events.js';

function makeInput(
  triggeringEvent: PipelineRouterInput['triggeringEvent'],
  gateOverrides: Partial<GateStateSnapshot> = {},
): PipelineRouterInput {
  return {
    projectId: 'proj-1',
    contactId: 'contact-1',
    triggeringEvent,
    gateState: {
      safetyCheck: 'pending',
      clarification: 'pending',
      requirements: 'pending',
      assumptions: 'pending',
      proposal: 'pending',
      proposalReview: 'pending',
      fitDecision: 'pending',
      ...gateOverrides,
    },
  };
}

describe('computeCrmActions', () => {
  // ─── Event → Stage Mappings ──────────────────────────────────────────────

  it('INTENT_RECEIVED → MOVE_STAGE NEW_LEAD', () => {
    const actions = computeCrmActions(makeInput('INTENT_RECEIVED'));
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('MOVE_STAGE');
    expect(actions[0].targetStage).toBe('NEW_LEAD');
  });

  it('ACK_SENT → MOVE_STAGE IN_REVIEW', () => {
    const actions = computeCrmActions(makeInput('ACK_SENT'));
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('MOVE_STAGE');
    expect(actions[0].targetStage).toBe('IN_REVIEW');
  });

  it('SAFETY_CHECK_COMPLETED (passed + clarification needed) → MOVE_STAGE CLARIFICATION', () => {
    const actions = computeCrmActions(
      makeInput('SAFETY_CHECK_COMPLETED', { safetyCheck: 'passed', clarification: 'needed' }),
    );
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('MOVE_STAGE');
    expect(actions[0].targetStage).toBe('CLARIFICATION');
  });

  it('SAFETY_CHECK_COMPLETED (passed + no clarification) → MOVE_STAGE IN_REVIEW', () => {
    const actions = computeCrmActions(
      makeInput('SAFETY_CHECK_COMPLETED', { safetyCheck: 'passed', clarification: 'pending' }),
    );
    expect(actions[0].type).toBe('MOVE_STAGE');
    expect(actions[0].targetStage).toBe('IN_REVIEW');
  });

  it('CLARIFICATION_SESSION_CREATED → MOVE_STAGE CLARIFICATION', () => {
    const actions = computeCrmActions(makeInput('CLARIFICATION_SESSION_CREATED'));
    expect(actions[0].type).toBe('MOVE_STAGE');
    expect(actions[0].targetStage).toBe('CLARIFICATION');
  });

  it('REQUIREMENTS_VERSION_CREATED → MOVE_STAGE REQUIREMENTS_REVIEW', () => {
    const actions = computeCrmActions(makeInput('REQUIREMENTS_VERSION_CREATED'));
    expect(actions[0].type).toBe('MOVE_STAGE');
    expect(actions[0].targetStage).toBe('REQUIREMENTS_REVIEW');
  });

  it('PROPOSAL_MARKED_SENT (gated: proposal sent + review approved) → MOVE_STAGE PROPOSAL_SENT', () => {
    const actions = computeCrmActions(
      makeInput('PROPOSAL_MARKED_SENT', { proposal: 'sent', proposalReview: 'approved' }),
    );
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('MOVE_STAGE');
    expect(actions[0].targetStage).toBe('PROPOSAL_SENT');
  });

  it('PROPOSAL_CLIENT_APPROVED (gated: proposal approved) → MOVE_STAGE WON', () => {
    const actions = computeCrmActions(
      makeInput('PROPOSAL_CLIENT_APPROVED', { proposal: 'approved' }),
    );
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('MOVE_STAGE');
    expect(actions[0].targetStage).toBe('WON');
  });

  it('NOT_A_FIT → MOVE_STAGE LOST + ADD_NOTE', () => {
    const actions = computeCrmActions(
      makeInput('NOT_A_FIT', { fitDecision: 'not_a_fit' }),
    );
    expect(actions).toHaveLength(2);
    expect(actions[0].type).toBe('MOVE_STAGE');
    expect(actions[0].targetStage).toBe('LOST');
    expect(actions[1].type).toBe('ADD_NOTE');
  });

  // ─── Gate Enforcement (Blocks) ───────────────────────────────────────────

  it('SAFETY_CHECK_COMPLETED blocks when safety check not passed', () => {
    const actions = computeCrmActions(
      makeInput('SAFETY_CHECK_COMPLETED', { safetyCheck: 'failed' }),
    );
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('ADD_NOTE');
    expect(actions[0].note).toContain('Safety check did not pass');
  });

  it('PROPOSAL_MARKED_SENT blocks when proposal not sent', () => {
    const actions = computeCrmActions(
      makeInput('PROPOSAL_MARKED_SENT', { proposal: 'draft', proposalReview: 'approved' }),
    );
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('ADD_NOTE');
    expect(actions[0].note).toContain('Cannot move to PROPOSAL_SENT');
  });

  it('PROPOSAL_MARKED_SENT blocks when review not approved', () => {
    const actions = computeCrmActions(
      makeInput('PROPOSAL_MARKED_SENT', { proposal: 'sent', proposalReview: 'pending' }),
    );
    expect(actions[0].type).toBe('ADD_NOTE');
    expect(actions[0].note).toContain('proposal review');
  });

  it('PROPOSAL_CLIENT_APPROVED blocks when proposal not approved', () => {
    const actions = computeCrmActions(
      makeInput('PROPOSAL_CLIENT_APPROVED', { proposal: 'sent' }),
    );
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('ADD_NOTE');
    expect(actions[0].note).toContain('Cannot move to WON');
  });

  it('ASSUMPTIONS_ALL_APPROVED blocks when assumptions not all approved', () => {
    const actions = computeCrmActions(
      makeInput('ASSUMPTIONS_ALL_APPROVED', { assumptions: 'some_approved' }),
    );
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('ADD_NOTE');
    expect(actions[0].note).toContain('Cannot advance');
  });

  // ─── Determinism ─────────────────────────────────────────────────────────

  it('returns identical results for identical inputs', () => {
    const input = makeInput('INTENT_RECEIVED');
    const a = computeCrmActions(input);
    const b = computeCrmActions(input);
    expect(a).toEqual(b);
  });
});
