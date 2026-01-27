import { describe, it, expect, beforeEach } from 'vitest';
import { logToolUsage } from './knowledge-tool-telemetry.js';
import { InMemoryTelemetryStore, resetDefaultStore } from '@agency/telemetry';

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('logToolUsage', () => {
  let telemetryStore: InMemoryTelemetryStore;

  beforeEach(() => {
    resetDefaultStore();
    telemetryStore = new InMemoryTelemetryStore();
  });

  it('records with correct taskType kb-tool:<toolName>', async () => {
    await logToolUsage({
      projectId: PROJECT_ID,
      agentId: 'requirements-engineer-agent',
      toolName: 'getApprovedRequirements',
      resultCount: 3,
      store: telemetryStore,
    });

    const runs = await telemetryStore.getTaskRuns(PROJECT_ID);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.taskType).toBe('kb-tool:getApprovedRequirements');
  });

  it('includes correct metadata', async () => {
    await logToolUsage({
      projectId: PROJECT_ID,
      agentId: 'requirements-engineer-agent',
      toolName: 'getApprovedAssumptions',
      resultCount: 5,
      store: telemetryStore,
    });

    const runs = await telemetryStore.getTaskRuns(PROJECT_ID);
    expect(runs[0]!.metadata).toEqual({
      toolName: 'getApprovedAssumptions',
      resultCount: 5,
    });
  });

  it('records the correct agentId', async () => {
    await logToolUsage({
      projectId: PROJECT_ID,
      agentId: 'quality-control-agent',
      toolName: 'getDecisions',
      resultCount: 0,
      store: telemetryStore,
    });

    const runs = await telemetryStore.getTaskRuns(PROJECT_ID);
    expect(runs[0]!.agentId).toBe('quality-control-agent');
  });

  it('records the correct projectId', async () => {
    await logToolUsage({
      projectId: PROJECT_ID,
      agentId: 'ux-design-agent',
      toolName: 'getDesignRules',
      resultCount: 2,
      store: telemetryStore,
    });

    const runs = await telemetryStore.getTaskRuns(PROJECT_ID);
    expect(runs[0]!.projectId).toBe(PROJECT_ID);
  });
});
