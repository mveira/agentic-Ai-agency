import { describe, it, expect } from 'vitest';
import { buildGenerateHooks, buildReviewApprovedHooks } from './requirements-hooks.js';
import { GHLActionSchema } from './ghl-actions.js';

describe('buildGenerateHooks', () => {
  const params = {
    opportunityId: 'opp-123',
    pipelineId: 'pipe-1',
    stageId: 'stage-requirements-review',
    projectId: 'proj-1',
  };

  it('returns a milestone hook with move_stage action', () => {
    const hook = buildGenerateHooks(params);

    expect(hook.milestone).toBe('requirements_generated');
    expect(hook.actions).toHaveLength(1);
    expect(hook.actions[0]!.action).toBe('move_stage');
  });

  it('produces valid GHLActionSchema entries', () => {
    const hook = buildGenerateHooks(params);

    for (const action of hook.actions) {
      const result = GHLActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    }
  });

  it('includes project ID in the reason', () => {
    const hook = buildGenerateHooks(params);
    const action = hook.actions[0]!;
    if (action.action === 'move_stage') {
      expect(action.reason).toContain('proj-1');
    }
  });
});

describe('buildReviewApprovedHooks', () => {
  const params = {
    opportunityId: 'opp-123',
    pipelineId: 'pipe-1',
    stageId: 'stage-build-ready',
    contactId: 'contact-456',
    workflowId: 'wf-notify',
    projectId: 'proj-1',
  };

  it('returns a milestone hook with move_stage and trigger_workflow actions', () => {
    const hook = buildReviewApprovedHooks(params);

    expect(hook.milestone).toBe('review_approved');
    expect(hook.actions).toHaveLength(2);
    expect(hook.actions[0]!.action).toBe('move_stage');
    expect(hook.actions[1]!.action).toBe('trigger_workflow');
  });

  it('produces valid GHLActionSchema entries', () => {
    const hook = buildReviewApprovedHooks(params);

    for (const action of hook.actions) {
      const result = GHLActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    }
  });
});
