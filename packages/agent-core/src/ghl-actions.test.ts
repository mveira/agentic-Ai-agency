import { describe, it, expect, beforeEach } from 'vitest';
import {
  ActionExecutor,
  MockGHLAdapter,
  MoveStageActionSchema,
  TriggerWorkflowActionSchema,
  GHLActionSchema,
  computePayloadHash,
} from './ghl-actions.js';
import type { MoveStageAction, TriggerWorkflowAction } from './ghl-actions.js';
import type { ProjectConfig } from './project-config.js';

describe('GHL Actions', () => {
  // --- Fixtures ---
  const liveProject: ProjectConfig = {
    projectId: 'agency-001',
    dryRun: false,
    enabledAgents: [],
    enabledActions: ['move_stage', 'trigger_workflow'],
    allowlists: {
      pipelineStages: [
        { pipelineId: 'pipe-001', stageId: 'stage-qual' },
        { pipelineId: 'pipe-001', stageId: 'stage-closed' },
      ],
      workflowIds: ['wf-onboarding', 'wf-nurture'],
    },
  };

  const dryRunProject: ProjectConfig = {
    projectId: 'client-001',
    dryRun: true,
    enabledAgents: [],
    enabledActions: ['move_stage', 'trigger_workflow'],
    allowlists: {
      pipelineStages: [
        { pipelineId: 'pipe-001', stageId: 'stage-qual' },
      ],
      workflowIds: ['wf-onboarding'],
    },
  };

  const restrictedProject: ProjectConfig = {
    projectId: 'restricted-001',
    dryRun: false,
    enabledAgents: [],
    enabledActions: ['move_stage'],
    allowlists: {
      pipelineStages: [
        { pipelineId: 'pipe-001', stageId: 'stage-qual' },
      ],
      workflowIds: [],
    },
  };

  const moveStage: MoveStageAction = {
    action: 'move_stage',
    opportunityId: 'opp-123',
    pipelineId: 'pipe-001',
    stageId: 'stage-qual',
    reason: 'Lead qualified after discovery call',
  };

  const triggerWorkflow: TriggerWorkflowAction = {
    action: 'trigger_workflow',
    contactId: 'contact-456',
    workflowId: 'wf-onboarding',
    reason: 'New client onboarding sequence',
  };

  let adapter: MockGHLAdapter;
  let executor: ActionExecutor;

  beforeEach(() => {
    adapter = new MockGHLAdapter();
    executor = new ActionExecutor(adapter);
  });

  describe('Action Schemas', () => {
    it('validates move_stage action', () => {
      const result = MoveStageActionSchema.safeParse(moveStage);
      expect(result.success).toBe(true);
    });

    it('validates trigger_workflow action', () => {
      const result = TriggerWorkflowActionSchema.safeParse(triggerWorkflow);
      expect(result.success).toBe(true);
    });

    it('discriminated union parses move_stage', () => {
      const result = GHLActionSchema.safeParse(moveStage);
      expect(result.success).toBe(true);
    });

    it('discriminated union parses trigger_workflow', () => {
      const result = GHLActionSchema.safeParse(triggerWorkflow);
      expect(result.success).toBe(true);
    });

    it('rejects unknown action type', () => {
      const result = GHLActionSchema.safeParse({ action: 'delete_contact', id: '1' });
      expect(result.success).toBe(false);
    });
  });

  describe('computePayloadHash', () => {
    it('generates deterministic hash for move_stage', () => {
      const hash = computePayloadHash(moveStage);
      expect(hash).toBe('move_stage:opp-123:pipe-001:stage-qual');
    });

    it('generates deterministic hash for trigger_workflow', () => {
      const hash = computePayloadHash(triggerWorkflow);
      expect(hash).toBe('trigger_workflow:contact-456:wf-onboarding');
    });
  });

  describe('dryRun blocks both actions', () => {
    it('blocks move_stage in dryRun', async () => {
      const result = await executor.execute({
        action: moveStage,
        config: dryRunProject,
      });
      expect(result.executed).toBe(false);
      expect(result.dryRun).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.message).toContain('Dry run');
      expect(adapter.calls).toHaveLength(0);
    });

    it('blocks trigger_workflow in dryRun', async () => {
      const result = await executor.execute({
        action: triggerWorkflow,
        config: dryRunProject,
      });
      expect(result.executed).toBe(false);
      expect(result.dryRun).toBe(true);
      expect(adapter.calls).toHaveLength(0);
    });
  });

  describe('allowlist blocks unknown stage/workflow', () => {
    it('blocks stage not in allowlist', async () => {
      const unknownStage: MoveStageAction = {
        ...moveStage,
        stageId: 'stage-unknown',
      };
      const result = await executor.execute({
        action: unknownStage,
        config: liveProject,
      });
      expect(result.executed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.blockedReason).toBe('stage-not-allowlisted');
      expect(adapter.calls).toHaveLength(0);
    });

    it('blocks workflow not in allowlist', async () => {
      const unknownWf: TriggerWorkflowAction = {
        ...triggerWorkflow,
        workflowId: 'wf-unknown',
      };
      const result = await executor.execute({
        action: unknownWf,
        config: liveProject,
      });
      expect(result.executed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.blockedReason).toBe('workflow-not-allowlisted');
      expect(adapter.calls).toHaveLength(0);
    });

    it('blocks action type not in enabledActions', async () => {
      const result = await executor.execute({
        action: triggerWorkflow,
        config: restrictedProject,
      });
      expect(result.executed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.blockedReason).toBe('action-disabled');
    });
  });

  describe('executor calls correct adapter methods when live', () => {
    it('calls updateOpportunityStage for move_stage', async () => {
      const result = await executor.execute({
        action: moveStage,
        config: liveProject,
      });
      expect(result.executed).toBe(true);
      expect(result.dryRun).toBe(false);
      expect(adapter.calls).toHaveLength(1);
      expect(adapter.calls[0]!.method).toBe('updateOpportunityStage');
      expect(adapter.calls[0]!.args).toEqual(['opp-123', 'pipe-001', 'stage-qual']);
    });

    it('calls addContactToWorkflow for trigger_workflow', async () => {
      const result = await executor.execute({
        action: triggerWorkflow,
        config: liveProject,
      });
      expect(result.executed).toBe(true);
      expect(adapter.calls).toHaveLength(1);
      expect(adapter.calls[0]!.method).toBe('addContactToWorkflow');
      expect(adapter.calls[0]!.args).toEqual(['contact-456', 'wf-onboarding']);
    });

    it('returns failure when adapter fails', async () => {
      adapter.shouldFail = true;
      const result = await executor.execute({
        action: moveStage,
        config: liveProject,
      });
      expect(result.executed).toBe(false);
      expect(result.message).toContain('failed');
    });
  });

  describe('idempotency prevents double execution', () => {
    it('blocks duplicate move_stage', async () => {
      const first = await executor.execute({ action: moveStage, config: liveProject });
      expect(first.executed).toBe(true);

      const second = await executor.execute({ action: moveStage, config: liveProject });
      expect(second.executed).toBe(false);
      expect(second.blocked).toBe(true);
      expect(second.blockedReason).toBe('duplicate-execution');
      expect(adapter.calls).toHaveLength(1);
    });

    it('blocks duplicate trigger_workflow', async () => {
      await executor.execute({ action: triggerWorkflow, config: liveProject });
      const second = await executor.execute({ action: triggerWorkflow, config: liveProject });
      expect(second.blocked).toBe(true);
      expect(second.blockedReason).toBe('duplicate-execution');
    });

    it('allows same action after clearHistory', async () => {
      await executor.execute({ action: moveStage, config: liveProject });
      executor.clearHistory();
      const result = await executor.execute({ action: moveStage, config: liveProject });
      expect(result.executed).toBe(true);
    });

    it('tracks dryRun actions for idempotency too', async () => {
      const first = await executor.execute({ action: moveStage, config: dryRunProject });
      expect(first.dryRun).toBe(true);

      const second = await executor.execute({ action: moveStage, config: dryRunProject });
      expect(second.blocked).toBe(true);
      expect(second.blockedReason).toBe('duplicate-execution');
    });
  });

  describe('telemetry coverage', () => {
    it('records telemetry for every execution', async () => {
      await executor.execute({ action: moveStage, config: liveProject });
      const log = executor.getLog();
      expect(log).toHaveLength(1);
      expect(log[0]!.projectId).toBe('agency-001');
      expect(log[0]!.actionType).toBe('move_stage');
      expect(log[0]!.executed).toBe(true);
      expect(log[0]!.dryRun).toBe(false);
      expect(log[0]!.blocked).toBe(false);
      expect(log[0]!.timestamp).toBeDefined();
    });

    it('records telemetry for blocked actions', async () => {
      const unknownStage: MoveStageAction = { ...moveStage, stageId: 'stage-unknown' };
      await executor.execute({ action: unknownStage, config: liveProject });
      const log = executor.getLog();
      expect(log).toHaveLength(1);
      expect(log[0]!.blocked).toBe(true);
      expect(log[0]!.blockedReason).toBe('stage-not-allowlisted');
    });

    it('records telemetry for dryRun actions', async () => {
      await executor.execute({ action: moveStage, config: dryRunProject });
      const log = executor.getLog();
      expect(log).toHaveLength(1);
      expect(log[0]!.dryRun).toBe(true);
      expect(log[0]!.executed).toBe(false);
    });

    it('records telemetry for duplicate-blocked actions', async () => {
      await executor.execute({ action: moveStage, config: liveProject });
      await executor.execute({ action: moveStage, config: liveProject });
      const log = executor.getLog();
      expect(log).toHaveLength(2);
      expect(log[1]!.blockedReason).toBe('duplicate-execution');
    });

    it('filters log by project', async () => {
      await executor.execute({ action: moveStage, config: liveProject });
      await executor.execute({ action: moveStage, config: dryRunProject });
      const agencyLog = executor.getLogByProject('agency-001');
      const clientLog = executor.getLogByProject('client-001');
      expect(agencyLog).toHaveLength(1);
      expect(clientLog).toHaveLength(1);
      expect(agencyLog[0]!.executed).toBe(true);
      expect(clientLog[0]!.dryRun).toBe(true);
    });

    it('clearHistory clears telemetry log', async () => {
      await executor.execute({ action: moveStage, config: liveProject });
      expect(executor.getLog()).toHaveLength(1);
      executor.clearHistory();
      expect(executor.getLog()).toHaveLength(0);
    });

    it('records action-disabled reason in telemetry', async () => {
      await executor.execute({ action: triggerWorkflow, config: restrictedProject });
      const log = executor.getLog();
      expect(log[0]!.blockedReason).toBe('action-disabled');
      expect(log[0]!.actionType).toBe('trigger_workflow');
    });
  });

  describe('MockGHLAdapter', () => {
    it('getPipelines returns mock data', async () => {
      const pipelines = await adapter.getPipelines();
      expect(pipelines).toHaveLength(1);
      expect(pipelines[0]!.name).toBe('Sales Pipeline');
      expect(pipelines[0]!.stages).toHaveLength(3);
    });

    it('tracks all method calls', async () => {
      await adapter.getPipelines();
      await adapter.updateOpportunityStage('o1', 'p1', 's1');
      await adapter.addContactToWorkflow('c1', 'w1');
      expect(adapter.calls).toHaveLength(3);
    });
  });
});
