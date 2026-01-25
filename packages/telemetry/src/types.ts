import { z } from 'zod';

export const ModelPricingSchema = z.object({
  modelId: z.string(),
  inputPricePerMillion: z.number().positive(),
  outputPricePerMillion: z.number().positive(),
  currency: z.literal('GBP').default('GBP'),
});

export type ModelPricing = z.infer<typeof ModelPricingSchema>;

export const TaskRunSchema = z.object({
  id: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  agentId: z.string(),
  taskType: z.string(),
  model: z.string(),
  promptHash: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cost: z.number().nonnegative(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'budget_exceeded']),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type TaskRun = z.infer<typeof TaskRunSchema>;

export const ProjectBudgetSchema = z.object({
  projectId: z.string().uuid(),
  dailyBudgetGbp: z.number().positive(),
  monthlyBudgetGbp: z.number().positive(),
});

export type ProjectBudget = z.infer<typeof ProjectBudgetSchema>;

export const SpendSummarySchema = z.object({
  projectId: z.string().uuid(),
  dailySpend: z.number().nonnegative(),
  monthlySpend: z.number().nonnegative(),
  totalSpend: z.number().nonnegative(),
  taskCount: z.number().int().nonnegative(),
});

export type SpendSummary = z.infer<typeof SpendSummarySchema>;

export const BudgetCheckResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  currentDailySpend: z.number().nonnegative(),
  currentMonthlySpend: z.number().nonnegative(),
  estimatedCost: z.number().nonnegative(),
  dailyBudget: z.number().positive(),
  monthlyBudget: z.number().positive(),
});

export type BudgetCheckResult = z.infer<typeof BudgetCheckResultSchema>;

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: 'GBP';
}

export interface TelemetryStore {
  getTaskRuns(projectId: string): Promise<TaskRun[]>;
  saveTaskRun(run: TaskRun): Promise<TaskRun>;
  getProjectBudget(projectId: string): Promise<ProjectBudget | null>;
  getModelPricing(modelId: string): Promise<ModelPricing | null>;
}
