import { describe, it, expect, beforeEach } from 'vitest';
import { recordTaskRun } from './record.js';
import { InMemoryTelemetryStore } from './store.js';

describe('recordTaskRun', () => {
  let store: InMemoryTelemetryStore;
  const projectId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    store = new InMemoryTelemetryStore();
  });

  it('records a task run with calculated cost', async () => {
    const result = await recordTaskRun({
      projectId,
      agentId: 'test-agent',
      taskType: 'test-task',
      model: 'mock',
      promptHash: 'abc123',
      inputTokens: 1000,
      outputTokens: 500,
      status: 'completed',
      store,
    });

    expect(result.id).toBeDefined();
    expect(result.projectId).toBe(projectId);
    expect(result.agentId).toBe('test-agent');
    expect(result.cost).toBe(0.002); // 1000 * 1/1M + 500 * 2/1M
    expect(result.status).toBe('completed');
  });

  it('stores the task run in the store', async () => {
    await recordTaskRun({
      projectId,
      agentId: 'test-agent',
      taskType: 'test-task',
      model: 'mock',
      promptHash: 'abc123',
      inputTokens: 1000,
      outputTokens: 500,
      status: 'completed',
      store,
    });

    const runs = await store.getTaskRuns(projectId);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.agentId).toBe('test-agent');
  });

  it('records multiple task runs', async () => {
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

    const runs = await store.getTaskRuns(projectId);
    expect(runs).toHaveLength(2);
  });

  it('includes metadata when provided', async () => {
    const result = await recordTaskRun({
      projectId,
      agentId: 'test-agent',
      taskType: 'test-task',
      model: 'mock',
      promptHash: 'abc123',
      inputTokens: 1000,
      outputTokens: 500,
      status: 'completed',
      metadata: { customField: 'customValue' },
      store,
    });

    expect(result.metadata).toEqual({ customField: 'customValue' });
  });

  it('sets timestamps appropriately based on status', async () => {
    const completedRun = await recordTaskRun({
      projectId,
      agentId: 'test-agent',
      taskType: 'test-task',
      model: 'mock',
      promptHash: 'abc123',
      inputTokens: 1000,
      outputTokens: 500,
      status: 'completed',
      store,
    });

    expect(completedRun.startedAt).toBeDefined();
    expect(completedRun.completedAt).toBeDefined();

    const runningRun = await recordTaskRun({
      projectId,
      agentId: 'test-agent',
      taskType: 'test-task',
      model: 'mock',
      promptHash: 'abc456',
      inputTokens: 1000,
      outputTokens: 500,
      status: 'running',
      store,
    });

    expect(runningRun.startedAt).toBeDefined();
    expect(runningRun.completedAt).toBeUndefined();
  });
});
