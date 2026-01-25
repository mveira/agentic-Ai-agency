import type { TaskRun, ProjectBudget, TelemetryStore, ModelPricing } from './types.js';
import { DEFAULT_MODEL_PRICING } from './pricing.js';

/**
 * In-memory telemetry store for testing and development.
 * In production, this would be replaced with a database-backed implementation.
 */
export class InMemoryTelemetryStore implements TelemetryStore {
  private taskRuns: Map<string, TaskRun[]> = new Map();
  private projectBudgets: Map<string, ProjectBudget> = new Map();
  private modelPricing: Map<string, ModelPricing> = new Map();

  constructor() {
    // Initialize with default pricing
    for (const [modelId, pricing] of Object.entries(DEFAULT_MODEL_PRICING)) {
      this.modelPricing.set(modelId, pricing);
    }
  }

  async getTaskRuns(projectId: string): Promise<TaskRun[]> {
    return this.taskRuns.get(projectId) ?? [];
  }

  async saveTaskRun(run: TaskRun): Promise<TaskRun> {
    const projectRuns = this.taskRuns.get(run.projectId) ?? [];
    const runWithId: TaskRun = {
      ...run,
      id: run.id ?? crypto.randomUUID(),
    };
    projectRuns.push(runWithId);
    this.taskRuns.set(run.projectId, projectRuns);
    return runWithId;
  }

  async getProjectBudget(projectId: string): Promise<ProjectBudget | null> {
    return this.projectBudgets.get(projectId) ?? null;
  }

  async setProjectBudget(budget: ProjectBudget): Promise<void> {
    this.projectBudgets.set(budget.projectId, budget);
  }

  async getModelPricing(modelId: string): Promise<ModelPricing | null> {
    return this.modelPricing.get(modelId) ?? null;
  }

  async setModelPricing(pricing: ModelPricing): Promise<void> {
    this.modelPricing.set(pricing.modelId, pricing);
  }

  // For testing: clear all data
  clear(): void {
    this.taskRuns.clear();
    this.projectBudgets.clear();
    this.modelPricing.clear();
    // Re-initialize default pricing
    for (const [modelId, pricing] of Object.entries(DEFAULT_MODEL_PRICING)) {
      this.modelPricing.set(modelId, pricing);
    }
  }
}

// Default singleton instance
let defaultStore: InMemoryTelemetryStore | null = null;

export function getDefaultStore(): InMemoryTelemetryStore {
  if (!defaultStore) {
    defaultStore = new InMemoryTelemetryStore();
  }
  return defaultStore;
}

export function resetDefaultStore(): void {
  defaultStore = null;
}
