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
  /** If true, adapter skips real API call and returns mock response */
  dryRun?: boolean;
}

/**
 * LLM completion result with full telemetry.
 * All adapters must return this structure.
 */
export interface LLMCompletionResult {
  /** The generated text response */
  text: string;
  /** Input tokens consumed */
  tokensIn: number;
  /** Output tokens generated */
  tokensOut: number;
  /** Request latency in milliseconds */
  latencyMs: number;
  /** Provider-assigned request ID for tracing */
  requestId: string;
  /** Model used for completion */
  model: string;
  /** Whether this was a dry-run (no real API call) */
  isDryRun: boolean;
}

/**
 * Result of an agent run.
 */
export interface AgentRunResult {
  success: boolean;
  output?: AgentOutput;
  error?: string;
  telemetry: {
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    requestId: string;
    cost: number;
    model: string;
    isDryRun: boolean;
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
