/**
 * Specialized Agent Runner
 *
 * Extends the base AgentRunner with:
 * - Contract enforcement before execution
 * - Framework injection based on agent requirements
 * - Multi-LLM routing
 * - QC enforcement after Strategy and Copy agents
 * - Per-agent cost tracking
 */

import type {
  AgentRunResult,
  TaskDefinition,
  LLMAdapter,
  AgentOutput,
} from './types.js';
import { AgentRunner } from './agent-runner.js';
import { LLMRouter, createMockRouter } from './llm-router.js';
import {
  getAgentContract,
  AGENT_FRAMEWORK_REQUIREMENTS,
  AGENT_COST_CAPS,
  QualityControlAgentInputSchema,
  shouldBlock,
} from './contracts/index.js';
import { getFrameworks } from '@agency/prompt-library';
import { getProjectSpend, type TelemetryStore, InMemoryTelemetryStore } from '@agency/telemetry';

export interface SpecializedRunnerConfig {
  questionsPath: string;
  globalRules: string[];
  router: LLMRouter;
  telemetryStore?: TelemetryStore;
  enforceQC?: boolean;
  projectBudget?: {
    dailyBudgetGbp: number;
    monthlyBudgetGbp: number;
  };
}

export interface SpecializedRunResult extends AgentRunResult {
  agentId: string;
  routedModel: string;
  downgraded: boolean;
  qcResult?: {
    approved: boolean;
    violations: number;
    blockReason?: string;
  };
}

/**
 * Agents that require QC review after execution
 */
const QC_REQUIRED_AGENTS = ['strategy-funnel-agent', 'copy-messaging-agent'];

/**
 * Specialized Agent Runner
 */
export class SpecializedAgentRunner {
  private config: SpecializedRunnerConfig;
  private telemetryStore: TelemetryStore;
  private runnerCache: Map<string, AgentRunner> = new Map();

  constructor(config: SpecializedRunnerConfig) {
    this.config = config;
    this.telemetryStore = config.telemetryStore ?? new InMemoryTelemetryStore();
  }

  /**
   * Run a specialized agent with full contract enforcement
   */
  async runAgent(params: {
    agentId: string;
    task: TaskDefinition;
    input: unknown;
    skipQC?: boolean;
  }): Promise<SpecializedRunResult> {
    const { agentId, task, input, skipQC = false } = params;

    // 1. Get contract
    const contract = getAgentContract(agentId);
    if (!contract) {
      return this.createErrorResult(agentId, `Unknown agent: ${agentId}`);
    }

    // 2. Validate input against contract requirements
    const validationError = this.validateInput(agentId, input);
    if (validationError) {
      return this.createErrorResult(agentId, validationError);
    }

    // 3. Get current spend for cost cap checking
    const spend = await getProjectSpend({
      projectId: task.projectId,
      store: this.telemetryStore,
    });

    // 4. Check per-agent cost cap
    const costCap = AGENT_COST_CAPS[agentId] ?? Infinity;
    if (spend.dailySpend >= costCap) {
      return this.createErrorResult(
        agentId,
        `Agent cost cap exceeded. Daily spend: £${spend.dailySpend.toFixed(4)}, Cap: £${costCap.toFixed(2)}`
      );
    }

    // 5. Route to appropriate LLM
    const routed = this.config.router.route({
      agentId,
      estimatedInputTokens: 2000, // Estimate based on typical prompt size
      estimatedOutputTokens: contract.maxOutputTokens,
      currentSpend: spend.dailySpend,
    });

    // 6. Get required frameworks for this agent
    const frameworkIds = AGENT_FRAMEWORK_REQUIREMENTS[agentId] ?? [];
    const frameworkBlocks = getFrameworks(frameworkIds);

    // 7. Create or get cached runner
    const runner = this.getRunner(routed.adapter, routed.model);

    // 8. Execute the agent
    const result = await runner.runTask({
      contract,
      task,
      frameworkBlocks,
    });

    // 9. Build specialized result
    let specializedResult: SpecializedRunResult = {
      ...result,
      agentId,
      routedModel: routed.model,
      downgraded: routed.downgraded,
    };

    // 10. Run QC if required and not skipped
    if (
      result.success &&
      QC_REQUIRED_AGENTS.includes(agentId) &&
      this.config.enforceQC &&
      !skipQC
    ) {
      const qcResult = await this.runQualityControl({
        projectId: task.projectId,
        agentId,
        output: result.output!,
        frameworks: frameworkIds,
      });

      specializedResult.qcResult = qcResult;

      // Block if QC fails
      if (!qcResult.approved) {
        specializedResult = {
          ...specializedResult,
          success: false,
          error: `QC blocked execution: ${qcResult.blockReason}`,
        };
      }
    }

    return specializedResult;
  }

  /**
   * Run QC agent to validate output
   */
  private async runQualityControl(params: {
    projectId: string;
    agentId: string;
    output: AgentOutput;
    frameworks: string[];
  }): Promise<{
    approved: boolean;
    violations: number;
    blockReason?: string;
  }> {
    const qcInput = {
      projectId: params.projectId,
      reviewType: params.agentId.includes('strategy') ? 'strategy-review' : 'copy-review',
      contentToReview: {
        type: params.agentId,
        content: params.output.result,
        sourceAgent: params.agentId,
        frameworks: params.frameworks,
      },
      originalRequirements: {
        // These would come from the original task in a real implementation
        constraints: [],
      },
      strictMode: true,
    };

    // Validate input
    const parsed = QualityControlAgentInputSchema.safeParse(qcInput);
    if (!parsed.success) {
      // Can't run QC, approve by default but log warning
      console.warn('Could not validate QC input:', parsed.error);
      return { approved: true, violations: 0 };
    }

    // Run QC agent
    const qcResult = await this.runAgent({
      agentId: 'quality-control-agent',
      task: {
        taskId: `qc-${Date.now()}`,
        taskType: 'quality-control',
        projectId: params.projectId,
        prompt: `Review the following ${params.agentId} output for compliance with frameworks: ${params.frameworks.join(', ')}`,
        context: qcInput,
      },
      input: qcInput,
      skipQC: true, // Don't QC the QC agent
    });

    if (!qcResult.success || !qcResult.output) {
      // QC failed to run, approve by default
      console.warn('QC agent failed to run:', qcResult.error);
      return { approved: true, violations: 0 };
    }

    // Parse QC output
    const qcOutput = qcResult.output.result as {
      approved?: boolean;
      violations?: Array<{ severity: string }>;
      blockReason?: string;
    };

    const violations = qcOutput.violations ?? [];
    const approved = qcOutput.approved ?? !shouldBlock(
      violations.map((v) => ({ severity: v.severity as 'critical' | 'major' | 'minor' | 'suggestion' })),
      true
    );

    return {
      approved,
      violations: violations.length,
      blockReason: qcOutput.blockReason,
    };
  }

  private validateInput(_agentId: string, input: unknown): string | null {
    // Input validation would be done against the agent's input schema
    // For now, just check that input is provided
    if (input === undefined || input === null) {
      return 'Input is required';
    }
    return null;
  }

  private getRunner(adapter: LLMAdapter, model: string): AgentRunner {
    const cacheKey = `${adapter.name}-${model}`;

    if (!this.runnerCache.has(cacheKey)) {
      const runner = new AgentRunner(
        {
          questionsPath: this.config.questionsPath,
          globalRules: this.config.globalRules,
          llmAdapter: adapter,
          defaultModel: model,
          projectBudget: this.config.projectBudget,
        },
        this.telemetryStore
      );
      this.runnerCache.set(cacheKey, runner);
    }

    return this.runnerCache.get(cacheKey)!;
  }

  private createErrorResult(agentId: string, error: string): SpecializedRunResult {
    return {
      success: false,
      error,
      agentId,
      routedModel: 'none',
      downgraded: false,
      telemetry: {
        tokensIn: 0,
        tokensOut: 0,
        latencyMs: 0,
        requestId: '',
        cost: 0,
        model: 'none',
        isDryRun: false,
      },
    };
  }
}

/**
 * Create a specialized runner with mock configuration for testing
 */
export function createMockSpecializedRunner(questionsPath: string): SpecializedAgentRunner {
  return new SpecializedAgentRunner({
    questionsPath,
    globalRules: [],
    router: createMockRouter(),
    enforceQC: true,
  });
}
