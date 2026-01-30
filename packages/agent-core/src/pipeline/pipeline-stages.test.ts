import { describe, it, expect } from 'vitest';
import { PipelineStageNameSchema, PipelineStageConfigSchema } from './pipeline-stages.js';

describe('PipelineStageNameSchema', () => {
  it('accepts all valid stage names', () => {
    for (const name of ['NEW_LEAD', 'IN_REVIEW', 'CLARIFICATION', 'REQUIREMENTS_REVIEW', 'PROPOSAL_SENT', 'WON', 'LOST']) {
      expect(PipelineStageNameSchema.safeParse(name).success).toBe(true);
    }
  });

  it('rejects invalid stage name', () => {
    expect(PipelineStageNameSchema.safeParse('INVALID').success).toBe(false);
  });
});

describe('PipelineStageConfigSchema', () => {
  it('validates a complete config', () => {
    const config = {
      stageIdByName: {
        NEW_LEAD: 'stage-1',
        IN_REVIEW: 'stage-2',
        CLARIFICATION: 'stage-3',
        REQUIREMENTS_REVIEW: 'stage-4',
        PROPOSAL_SENT: 'stage-5',
        WON: 'stage-6',
        LOST: 'stage-7',
      },
      workflowIdByName: {
        onboarding: 'wf-1',
      },
    };
    expect(PipelineStageConfigSchema.safeParse(config).success).toBe(true);
  });

  it('accepts config without workflowIdByName', () => {
    const config = {
      stageIdByName: {
        NEW_LEAD: 'stage-1',
        IN_REVIEW: 'stage-2',
        CLARIFICATION: 'stage-3',
        REQUIREMENTS_REVIEW: 'stage-4',
        PROPOSAL_SENT: 'stage-5',
        WON: 'stage-6',
        LOST: 'stage-7',
      },
    };
    expect(PipelineStageConfigSchema.safeParse(config).success).toBe(true);
  });

  it('rejects config with missing stageIdByName', () => {
    expect(PipelineStageConfigSchema.safeParse({}).success).toBe(false);
  });
});
