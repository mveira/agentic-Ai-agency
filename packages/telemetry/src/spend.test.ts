import { describe, it, expect, beforeEach } from 'vitest';
import { getProjectSpend } from './spend.js';
import { recordTaskRun } from './record.js';
import { InMemoryTelemetryStore } from './store.js';

describe('getProjectSpend', () => {
  let store: InMemoryTelemetryStore;
  const projectId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    store = new InMemoryTelemetryStore();
  });

  it('returns zero spend for project with no runs', async () => {
    const result = await getProjectSpend({ projectId, store });

    expect(result.projectId).toBe(projectId);
    expect(result.dailySpend).toBe(0);
    expect(result.monthlySpend).toBe(0);
    expect(result.totalSpend).toBe(0);
    expect(result.taskCount).toBe(0);
  });

  it('calculates total spend from task runs', async () => {
    await recordTaskRun({
      projectId,
      agentId: 'agent-1',
      taskType: 'task-1',
      model: 'mock',
      promptHash: 'hash1',
      inputTokens: 1000,
      outputTokens: 500,
      status: 'completed',
      store,
    });

    await recordTaskRun({
      projectId,
      agentId: 'agent-2',
      taskType: 'task-2',
      model: 'mock',
      promptHash: 'hash2',
      inputTokens: 2000,
      outputTokens: 1000,
      status: 'completed',
      store,
    });

    const result = await getProjectSpend({ projectId, store });

    // Run 1: 1000 * 1/1M + 500 * 2/1M = 0.002
    // Run 2: 2000 * 1/1M + 1000 * 2/1M = 0.004
    // Total: 0.006
    expect(result.totalSpend).toBe(0.006);
    expect(result.taskCount).toBe(2);
  });

  it('excludes failed tasks from spend calculation', async () => {
    await recordTaskRun({
      projectId,
      agentId: 'agent-1',
      taskType: 'task-1',
      model: 'mock',
      promptHash: 'hash1',
      inputTokens: 1000,
      outputTokens: 500,
      status: 'completed',
      store,
    });

    await recordTaskRun({
      projectId,
      agentId: 'agent-2',
      taskType: 'task-2',
      model: 'mock',
      promptHash: 'hash2',
      inputTokens: 2000,
      outputTokens: 1000,
      status: 'failed',
      store,
    });

    const result = await getProjectSpend({ projectId, store });

    // Only completed run should count
    expect(result.totalSpend).toBe(0.002);
    expect(result.taskCount).toBe(2); // Both counted in total tasks
  });

  it('excludes budget_exceeded tasks from spend calculation', async () => {
    await recordTaskRun({
      projectId,
      agentId: 'agent-1',
      taskType: 'task-1',
      model: 'mock',
      promptHash: 'hash1',
      inputTokens: 1000,
      outputTokens: 500,
      status: 'completed',
      store,
    });

    await recordTaskRun({
      projectId,
      agentId: 'agent-2',
      taskType: 'task-2',
      model: 'mock',
      promptHash: 'hash2',
      inputTokens: 2000,
      outputTokens: 1000,
      status: 'budget_exceeded',
      store,
    });

    const result = await getProjectSpend({ projectId, store });

    expect(result.totalSpend).toBe(0.002);
  });

  it('includes running tasks in spend calculation', async () => {
    await recordTaskRun({
      projectId,
      agentId: 'agent-1',
      taskType: 'task-1',
      model: 'mock',
      promptHash: 'hash1',
      inputTokens: 1000,
      outputTokens: 500,
      status: 'running',
      store,
    });

    const result = await getProjectSpend({ projectId, store });

    expect(result.totalSpend).toBe(0.002);
  });

  it('separates projects correctly', async () => {
    const otherProjectId = '660e8400-e29b-41d4-a716-446655440001';

    await recordTaskRun({
      projectId,
      agentId: 'agent-1',
      taskType: 'task-1',
      model: 'mock',
      promptHash: 'hash1',
      inputTokens: 1000,
      outputTokens: 500,
      status: 'completed',
      store,
    });

    await recordTaskRun({
      projectId: otherProjectId,
      agentId: 'agent-2',
      taskType: 'task-2',
      model: 'mock',
      promptHash: 'hash2',
      inputTokens: 10000,
      outputTokens: 5000,
      status: 'completed',
      store,
    });

    const result1 = await getProjectSpend({ projectId, store });
    const result2 = await getProjectSpend({ projectId: otherProjectId, store });

    expect(result1.totalSpend).toBe(0.002);
    expect(result2.totalSpend).toBe(0.02);
  });
});
