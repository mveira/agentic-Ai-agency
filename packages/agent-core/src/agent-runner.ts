import type {
  AgentContract,
  AgentRunnerConfig,
  AgentRunResult,
  AgentOutput,
  FrameworkBlock,
  TaskDefinition,
  Question,
} from './types.js';
import { loadQuestions } from './questions.js';
import { compilePrompt, validateAgentOutput } from './prompt-compiler.js';
import {
  budgetCheck,
  recordTaskRun,
  estimateCost,
  InMemoryTelemetryStore,
  type TelemetryStore,
} from '@agency/telemetry';

export interface RunTaskParams {
  contract: AgentContract;
  task: TaskDefinition;
  frameworkBlocks?: FrameworkBlock[];
}

/**
 * AgentRunner orchestrates agent execution with:
 * - Prompt compilation from multiple sources
 * - Budget enforcement
 * - Schema validation
 * - Telemetry logging
 */
export class AgentRunner {
  private config: AgentRunnerConfig;
  private questions: Question[] | null = null;
  private telemetryStore: TelemetryStore;

  constructor(config: AgentRunnerConfig, telemetryStore?: TelemetryStore) {
    this.config = config;
    this.telemetryStore = telemetryStore ?? new InMemoryTelemetryStore();
  }

  /**
   * Initialize the runner by loading questions.
   * Must be called before running tasks.
   */
  async initialize(): Promise<void> {
    this.questions = await loadQuestions({
      basePath: this.config.questionsPath,
    });
  }

  /**
   * Run a task with full orchestration.
   */
  async runTask(params: RunTaskParams): Promise<AgentRunResult> {
    const { contract, task, frameworkBlocks = [] } = params;

    // Ensure initialized
    if (!this.questions) {
      await this.initialize();
    }

    // Compile the prompt
    const compiledPrompt = compilePrompt({
      globalRules: this.config.globalRules,
      contract,
      frameworkBlocks,
      task,
      questions: this.questions!,
    });

    // Estimate tokens (rough: 4 chars per token)
    const estimatedInputTokens = Math.ceil(compiledPrompt.text.length / 4);
    const estimatedOutputTokens = contract.maxOutputTokens;

    // Check budget before running
    if (this.config.projectBudget) {
      const budgetResult = await budgetCheck({
        projectId: task.projectId,
        modelId: this.config.defaultModel,
        estimatedInputTokens,
        estimatedOutputTokens,
        store: this.telemetryStore,
        budget: {
          projectId: task.projectId,
          ...this.config.projectBudget,
        },
      });

      if (!budgetResult.allowed) {
        // Record the blocked attempt
        await recordTaskRun({
          projectId: task.projectId,
          agentId: contract.agentId,
          taskType: task.taskType,
          model: this.config.defaultModel,
          promptHash: compiledPrompt.hash,
          inputTokens: 0,
          outputTokens: 0,
          status: 'budget_exceeded',
          metadata: { reason: budgetResult.reason },
          store: this.telemetryStore,
        });

        return {
          success: false,
          error: budgetResult.reason,
          telemetry: {
            tokensIn: 0,
            tokensOut: 0,
            latencyMs: 0,
            requestId: '',
            cost: 0,
            model: this.config.defaultModel,
            isDryRun: false,
          },
        };
      }
    }

    // Execute LLM call
    let llmResult;
    try {
      llmResult = await this.config.llmAdapter.complete({
        prompt: compiledPrompt.text,
        maxTokens: contract.maxOutputTokens,
        model: this.config.defaultModel,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown LLM error';

      await recordTaskRun({
        projectId: task.projectId,
        agentId: contract.agentId,
        taskType: task.taskType,
        model: this.config.defaultModel,
        promptHash: compiledPrompt.hash,
        inputTokens: 0,
        outputTokens: 0,
        status: 'failed',
        metadata: { error: errorMessage },
        store: this.telemetryStore,
      });

      return {
        success: false,
        error: errorMessage,
        telemetry: {
          tokensIn: 0,
          tokensOut: 0,
          latencyMs: 0,
          requestId: '',
          cost: 0,
          model: this.config.defaultModel,
          isDryRun: false,
        },
      };
    }

    // Validate output schema
    const validation = validateAgentOutput(llmResult.text);

    // Calculate cost
    const costEstimate = estimateCost({
      modelId: llmResult.model,
      inputTokens: llmResult.tokensIn,
      outputTokens: llmResult.tokensOut,
    });

    // Record telemetry
    await recordTaskRun({
      projectId: task.projectId,
      agentId: contract.agentId,
      taskType: task.taskType,
      model: llmResult.model,
      promptHash: compiledPrompt.hash,
      inputTokens: llmResult.tokensIn,
      outputTokens: llmResult.tokensOut,
      status: validation.valid ? 'completed' : 'failed',
      metadata: validation.valid ? undefined : { validationError: validation.error },
      store: this.telemetryStore,
    });

    if (!validation.valid) {
      return {
        success: false,
        error: `Output validation failed: ${validation.error}`,
        telemetry: {
          tokensIn: llmResult.tokensIn,
          tokensOut: llmResult.tokensOut,
          latencyMs: llmResult.latencyMs,
          requestId: llmResult.requestId,
          cost: costEstimate.totalCost,
          model: llmResult.model,
          isDryRun: llmResult.isDryRun,
        },
      };
    }

    return {
      success: true,
      output: validation.output as AgentOutput,
      telemetry: {
        tokensIn: llmResult.tokensIn,
        tokensOut: llmResult.tokensOut,
        latencyMs: llmResult.latencyMs,
        requestId: llmResult.requestId,
        cost: costEstimate.totalCost,
        model: llmResult.model,
        isDryRun: llmResult.isDryRun,
      },
    };
  }

  /**
   * Get the compiled prompt without executing (for debugging).
   */
  async getCompiledPrompt(params: RunTaskParams): Promise<string> {
    if (!this.questions) {
      await this.initialize();
    }

    const compiledPrompt = compilePrompt({
      globalRules: this.config.globalRules,
      contract: params.contract,
      frameworkBlocks: params.frameworkBlocks ?? [],
      task: params.task,
      questions: this.questions!,
    });

    return compiledPrompt.text;
  }
}
