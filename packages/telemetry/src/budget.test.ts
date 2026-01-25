import { describe, it, expect, beforeEach } from 'vitest';
import { budgetCheck } from './budget.js';
import { recordTaskRun } from './record.js';
import { InMemoryTelemetryStore } from './store.js';

describe('budgetCheck', () => {
  let store: InMemoryTelemetryStore;
  const projectId = '550e8400-e29b-41d4-a716-446655440000';
  const defaultBudget = {
    projectId,
    dailyBudgetGbp: 10.0,
    monthlyBudgetGbp: 100.0,
  };

  beforeEach(() => {
    store = new InMemoryTelemetryStore();
  });

  it('returns not allowed when no budget is configured', async () => {
    const result = await budgetCheck({
      projectId,
      modelId: 'mock',
      estimatedInputTokens: 1000,
      estimatedOutputTokens: 500,
      store,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('No budget configured');
  });

  it('allows task when within budget', async () => {
    const result = await budgetCheck({
      projectId,
      modelId: 'mock',
      estimatedInputTokens: 1000,
      estimatedOutputTokens: 500,
      budget: defaultBudget,
      store,
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.estimatedCost).toBe(0.002);
  });

  it('blocks task when daily budget would be exceeded', async () => {
    const tightBudget = {
      projectId,
      dailyBudgetGbp: 0.001, // Very tight daily budget
      monthlyBudgetGbp: 100.0,
    };

    const result = await budgetCheck({
      projectId,
      modelId: 'mock',
      estimatedInputTokens: 1000,
      estimatedOutputTokens: 500,
      budget: tightBudget,
      store,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Daily budget exceeded');
  });

  it('blocks task when monthly budget would be exceeded', async () => {
    const tightBudget = {
      projectId,
      dailyBudgetGbp: 100.0,
      monthlyBudgetGbp: 0.001, // Very tight monthly budget
    };

    const result = await budgetCheck({
      projectId,
      modelId: 'mock',
      estimatedInputTokens: 1000,
      estimatedOutputTokens: 500,
      budget: tightBudget,
      store,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Monthly budget exceeded');
  });

  it('accounts for existing spend when checking budget', async () => {
    // Record some existing spend
    await recordTaskRun({
      projectId,
      agentId: 'agent-1',
      taskType: 'task-1',
      model: 'mock',
      promptHash: 'hash1',
      inputTokens: 1_000_000,
      outputTokens: 500_000,
      status: 'completed',
      store,
    });

    // This run cost: 1M * 1/1M + 500K * 2/1M = 1 + 1 = 2 GBP

    const tightBudget = {
      projectId,
      dailyBudgetGbp: 2.5, // Just above current spend
      monthlyBudgetGbp: 100.0,
    };

    // Try to add another task that would exceed daily budget
    const result = await budgetCheck({
      projectId,
      modelId: 'mock',
      estimatedInputTokens: 1_000_000, // Would cost another 1 GBP input
      estimatedOutputTokens: 500_000, // Would cost another 1 GBP output
      budget: tightBudget,
      store,
    });

    expect(result.allowed).toBe(false);
    expect(result.currentDailySpend).toBe(2);
    expect(result.estimatedCost).toBe(2);
  });

  it('returns current spend information in result', async () => {
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

    const result = await budgetCheck({
      projectId,
      modelId: 'mock',
      estimatedInputTokens: 1000,
      estimatedOutputTokens: 500,
      budget: defaultBudget,
      store,
    });

    expect(result.currentDailySpend).toBe(0.002);
    expect(result.currentMonthlySpend).toBe(0.002);
    expect(result.dailyBudget).toBe(10.0);
    expect(result.monthlyBudget).toBe(100.0);
  });

  it('handles zero token estimates', async () => {
    const result = await budgetCheck({
      projectId,
      modelId: 'mock',
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      budget: defaultBudget,
      store,
    });

    expect(result.allowed).toBe(true);
    expect(result.estimatedCost).toBe(0);
  });
});
