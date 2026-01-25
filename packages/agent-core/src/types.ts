import { z } from 'zod';

/**
 * Standard output schema that all agents must conform to.
 */
export const AgentOutputSchema = z.object({
  result: z.unknown(),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  next_actions: z.array(z.string()),
});

export type AgentOutput = z.infer<typeof AgentOutputSchema>;

/**
 * Agent contract defining the agent's role, capabilities, and constraints.
 */
export const AgentContractSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
  constraints: z.array(z.string()),
  maxOutputTokens: z.number().int().positive().default(4096),
});

export type AgentContract = z.infer<typeof AgentContractSchema>;

/**
 * A question from the question bank.
 */
export const QuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  default: z.string().optional(),
  status: z.enum(['open', 'answered', 'deferred']),
  answer: z.string().optional(),
});

export type Question = z.infer<typeof QuestionSchema>;

/**
 * Question bank structure.
 */
export const QuestionBankSchema = z.object({
  version: z.string(),
  purpose: z.string(),
  global_questions: z.array(QuestionSchema),
});

export type QuestionBank = z.infer<typeof QuestionBankSchema>;

/**
 * Framework block for prompt compilation.
 */
export interface FrameworkBlock {
  name: string;
  content: string;
  priority: number;
}

/**
 * Task definition for agent execution.
 */
export interface TaskDefinition {
  taskId: string;
  taskType: string;
  projectId: string;
  prompt: string;
  context?: Record<string, unknown>;
}

/**
 * LLM adapter interface for swappable LLM backends.
 */
export interface LLMAdapter {
  name: string;
  complete(params: LLMCompletionParams): Promise<LLMCompletionResult>;
}

export interface LLMCompletionParams {
  prompt: string;
  maxTokens: number;
  model: string;
}

export interface LLMCompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Result of an agent run.
 */
export interface AgentRunResult {
  success: boolean;
  output?: AgentOutput;
  error?: string;
  telemetry: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    model: string;
  };
}

/**
 * Configuration for the agent runner.
 */
export interface AgentRunnerConfig {
  questionsPath: string;
  globalRules: string[];
  llmAdapter: LLMAdapter;
  defaultModel: string;
  projectBudget?: {
    dailyBudgetGbp: number;
    monthlyBudgetGbp: number;
  };
}
