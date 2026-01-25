import type { SpendSummary, TelemetryStore } from './types.js';
import { getDefaultStore } from './store.js';

export interface GetProjectSpendParams {
  projectId: string;
  store?: TelemetryStore;
}

/**
 * Gets the spend summary for a project including daily, monthly, and total spend.
 *
 * @param params - The parameters for getting project spend
 * @returns SpendSummary with spend totals and task count
 */
export async function getProjectSpend(params: GetProjectSpendParams): Promise<SpendSummary> {
  const { projectId, store = getDefaultStore() } = params;

  const taskRuns = await store.getTaskRuns(projectId);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let dailySpend = 0;
  let monthlySpend = 0;
  let totalSpend = 0;

  for (const run of taskRuns) {
    // Only count completed or running tasks (not failed/budget_exceeded)
    if (run.status === 'completed' || run.status === 'running') {
      totalSpend += run.cost;

      const runDate = run.startedAt ?? run.completedAt;
      if (runDate) {
        if (runDate >= startOfMonth) {
          monthlySpend += run.cost;
        }
        if (runDate >= startOfDay) {
          dailySpend += run.cost;
        }
      }
    }
  }

  return {
    projectId,
    dailySpend: roundToSixDecimals(dailySpend),
    monthlySpend: roundToSixDecimals(monthlySpend),
    totalSpend: roundToSixDecimals(totalSpend),
    taskCount: taskRuns.length,
  };
}

function roundToSixDecimals(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
