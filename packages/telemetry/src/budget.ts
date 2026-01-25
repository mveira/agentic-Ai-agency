import type { BudgetCheckResult, TelemetryStore, ProjectBudget } from './types.js';
import { estimateCost } from './cost.js';
import { getProjectSpend } from './spend.js';
import { getDefaultStore } from './store.js';

export interface BudgetCheckParams {
  projectId: string;
  modelId: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  store?: TelemetryStore;
  budget?: ProjectBudget;
}

/**
 * Checks if a task can be executed within budget constraints.
 *
 * @param params - The parameters for budget checking
 * @returns BudgetCheckResult indicating if the task is allowed
 */
export async function budgetCheck(params: BudgetCheckParams): Promise<BudgetCheckResult> {
  const {
    projectId,
    modelId,
    estimatedInputTokens,
    estimatedOutputTokens,
    store = getDefaultStore(),
    budget: providedBudget,
  } = params;

  // Get project budget
  const budget = providedBudget ?? (await store.getProjectBudget(projectId));

  if (!budget) {
    return {
      allowed: false,
      reason: `No budget configured for project: ${projectId}`,
      currentDailySpend: 0,
      currentMonthlySpend: 0,
      estimatedCost: 0,
      dailyBudget: 0,
      monthlyBudget: 0,
    };
  }

  // Get current spend
  const spend = await getProjectSpend({ projectId, store });

  // Estimate cost of this task
  const costEstimate = estimateCost({
    modelId,
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
  });

  const projectedDailySpend = spend.dailySpend + costEstimate.totalCost;
  const projectedMonthlySpend = spend.monthlySpend + costEstimate.totalCost;

  // Check daily budget
  if (projectedDailySpend > budget.dailyBudgetGbp) {
    return {
      allowed: false,
      reason: `Daily budget exceeded. Current: £${spend.dailySpend.toFixed(4)}, Estimated: £${costEstimate.totalCost.toFixed(4)}, Limit: £${budget.dailyBudgetGbp.toFixed(2)}`,
      currentDailySpend: spend.dailySpend,
      currentMonthlySpend: spend.monthlySpend,
      estimatedCost: costEstimate.totalCost,
      dailyBudget: budget.dailyBudgetGbp,
      monthlyBudget: budget.monthlyBudgetGbp,
    };
  }

  // Check monthly budget
  if (projectedMonthlySpend > budget.monthlyBudgetGbp) {
    return {
      allowed: false,
      reason: `Monthly budget exceeded. Current: £${spend.monthlySpend.toFixed(4)}, Estimated: £${costEstimate.totalCost.toFixed(4)}, Limit: £${budget.monthlyBudgetGbp.toFixed(2)}`,
      currentDailySpend: spend.dailySpend,
      currentMonthlySpend: spend.monthlySpend,
      estimatedCost: costEstimate.totalCost,
      dailyBudget: budget.dailyBudgetGbp,
      monthlyBudget: budget.monthlyBudgetGbp,
    };
  }

  return {
    allowed: true,
    currentDailySpend: spend.dailySpend,
    currentMonthlySpend: spend.monthlySpend,
    estimatedCost: costEstimate.totalCost,
    dailyBudget: budget.dailyBudgetGbp,
    monthlyBudget: budget.monthlyBudgetGbp,
  };
}
