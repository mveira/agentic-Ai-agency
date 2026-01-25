import type { TaskRun, TelemetryStore } from './types.js';
import { TaskRunSchema } from './types.js';
import { estimateCost } from './cost.js';
import { getDefaultStore } from './store.js';

export interface RecordTaskRunParams {
  projectId: string;
  agentId: string;
  taskType: string;
  model: string;
  promptHash: string;
  inputTokens: number;
  outputTokens: number;
  status: TaskRun['status'];
  metadata?: Record<string, unknown>;
  store?: TelemetryStore;
}

/**
 * Records a task run with automatic cost calculation.
 *
 * @param params - The task run parameters
 * @returns The saved task run with generated ID and calculated cost
 */
export async function recordTaskRun(params: RecordTaskRunParams): Promise<TaskRun> {
  const {
    projectId,
    agentId,
    taskType,
    model,
    promptHash,
    inputTokens,
    outputTokens,
    status,
    metadata,
    store = getDefaultStore(),
  } = params;

  // Calculate cost
  const costEstimate = estimateCost({
    modelId: model,
    inputTokens,
    outputTokens,
  });

  const taskRun: TaskRun = {
    projectId,
    agentId,
    taskType,
    model,
    promptHash,
    inputTokens,
    outputTokens,
    cost: costEstimate.totalCost,
    status,
    startedAt: new Date(),
    completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
    metadata,
  };

  // Validate before saving
  TaskRunSchema.parse(taskRun);

  return store.saveTaskRun(taskRun);
}
