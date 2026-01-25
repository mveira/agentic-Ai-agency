/**
 * Multi-LLM Router
 *
 * Routes agent requests to the appropriate LLM based on:
 * - Agent type (per-agent routing rules)
 * - Cost constraints (downgrade to cheaper model if needed)
 * - Availability (fallback to alternatives)
 */

import type { LLMAdapter, LLMCompletionResult } from './types.js';
import { estimateCost } from '@agency/telemetry';
import { AGENT_MODEL_ROUTING, AGENT_COST_CAPS } from './contracts/index.js';
import { MockLLMAdapter } from './mock-llm.js';

/**
 * Model capability tiers (highest to lowest)
 */
export const MODEL_TIERS: Record<string, string[]> = {
  'tier-1-reasoning': ['claude-3-opus', 'gpt-4-turbo'],
  'tier-2-balanced': ['claude-3-sonnet', 'gpt-4', 'gpt-4o'],
  'tier-3-fast': ['claude-3-haiku', 'gpt-4o-mini', 'gpt-3.5-turbo'],
};

/**
 * Model downgrade paths
 */
export const MODEL_DOWNGRADE_PATH: Record<string, string> = {
  'claude-3-opus': 'claude-3-sonnet',
  'claude-3-sonnet': 'claude-3-haiku',
  'claude-3-haiku': 'claude-3-haiku', // No further downgrade
  'gpt-4-turbo': 'gpt-4',
  'gpt-4': 'gpt-4o',
  'gpt-4o': 'gpt-4o-mini',
  'gpt-4o-mini': 'gpt-4o-mini', // No further downgrade
};

/**
 * Cross-provider fallbacks
 */
export const CROSS_PROVIDER_FALLBACK: Record<string, string> = {
  'claude-3-sonnet': 'gpt-4',
  'claude-3-haiku': 'gpt-4o-mini',
  'gpt-4': 'claude-3-sonnet',
  'gpt-4o-mini': 'claude-3-haiku',
};

export interface RouterConfig {
  adapters: Record<string, LLMAdapter>;
  defaultModel: string;
  enableDowngrade: boolean;
  enableCrossProviderFallback: boolean;
}

export interface RouteResult {
  model: string;
  adapter: LLMAdapter;
  downgraded: boolean;
  reason?: string;
}

/**
 * LLM Router class
 */
export class LLMRouter {
  private config: RouterConfig;

  constructor(config: RouterConfig) {
    this.config = config;
  }

  /**
   * Get the appropriate model for an agent
   */
  getModelForAgent(agentId: string): string {
    return AGENT_MODEL_ROUTING[agentId] ?? this.config.defaultModel;
  }

  /**
   * Get the cost cap for an agent
   */
  getCostCapForAgent(agentId: string): number {
    return AGENT_COST_CAPS[agentId] ?? Infinity;
  }

  /**
   * Route a request to the appropriate LLM
   */
  route(params: {
    agentId: string;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    currentSpend?: number;
  }): RouteResult {
    const { agentId, estimatedInputTokens, estimatedOutputTokens, currentSpend = 0 } = params;

    let targetModel = this.getModelForAgent(agentId);
    const costCap = this.getCostCapForAgent(agentId);
    let downgraded = false;
    let reason: string | undefined;

    // Check if estimated cost exceeds cap
    const estimate = this.estimateModelCost(targetModel, estimatedInputTokens, estimatedOutputTokens);

    if (currentSpend + estimate > costCap && this.config.enableDowngrade) {
      // Try to downgrade to cheaper model
      const downgradeResult = this.findAffordableModel(
        targetModel,
        estimatedInputTokens,
        estimatedOutputTokens,
        costCap - currentSpend
      );

      if (downgradeResult) {
        targetModel = downgradeResult.model;
        downgraded = true;
        reason = `Downgraded from ${this.getModelForAgent(agentId)} to ${targetModel} due to cost cap`;
      }
    }

    // Get adapter for model
    let adapter = this.getAdapterForModel(targetModel);

    // If adapter not available, try fallback
    if (!adapter && this.config.enableCrossProviderFallback) {
      const fallbackModel = CROSS_PROVIDER_FALLBACK[targetModel];
      if (fallbackModel) {
        adapter = this.getAdapterForModel(fallbackModel);
        if (adapter) {
          targetModel = fallbackModel;
          reason = `Fallback to ${fallbackModel} (${targetModel} unavailable)`;
        }
      }
    }

    // Last resort: use default
    if (!adapter) {
      adapter = this.config.adapters[this.config.defaultModel];
      targetModel = this.config.defaultModel;
      reason = `Using default model (requested model unavailable)`;
    }

    if (!adapter) {
      throw new Error('No LLM adapter available');
    }

    return {
      model: targetModel,
      adapter,
      downgraded,
      reason,
    };
  }

  /**
   * Execute a completion with automatic routing
   */
  async complete(params: {
    agentId: string;
    prompt: string;
    maxTokens: number;
    currentSpend?: number;
  }): Promise<LLMCompletionResult & { routed: RouteResult }> {
    const estimatedInputTokens = Math.ceil(params.prompt.length / 4);
    const estimatedOutputTokens = params.maxTokens;

    const routed = this.route({
      agentId: params.agentId,
      estimatedInputTokens,
      estimatedOutputTokens,
      currentSpend: params.currentSpend,
    });

    const result = await routed.adapter.complete({
      prompt: params.prompt,
      maxTokens: params.maxTokens,
      model: routed.model,
    });

    return {
      ...result,
      routed,
    };
  }

  private estimateModelCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    try {
      const estimate = estimateCost({ modelId, inputTokens, outputTokens });
      return estimate.totalCost;
    } catch {
      // Unknown model, assume moderate cost
      return (inputTokens + outputTokens) * 0.00001;
    }
  }

  private findAffordableModel(
    startModel: string,
    inputTokens: number,
    outputTokens: number,
    maxCost: number
  ): { model: string; cost: number } | null {
    let currentModel = startModel;
    const visited = new Set<string>();

    while (!visited.has(currentModel)) {
      visited.add(currentModel);

      const cost = this.estimateModelCost(currentModel, inputTokens, outputTokens);
      if (cost <= maxCost) {
        return { model: currentModel, cost };
      }

      const nextModel = MODEL_DOWNGRADE_PATH[currentModel];
      if (!nextModel || nextModel === currentModel) {
        break;
      }
      currentModel = nextModel;
    }

    return null;
  }

  private getAdapterForModel(modelId: string): LLMAdapter | undefined {
    // Check direct match
    if (this.config.adapters[modelId]) {
      return this.config.adapters[modelId];
    }

    // Check provider match (e.g., "claude-3-sonnet" matches "claude" adapter)
    for (const [key, adapter] of Object.entries(this.config.adapters)) {
      if (modelId.startsWith(key.split('-')[0] ?? '')) {
        return adapter;
      }
    }

    return undefined;
  }
}

/**
 * Create a router with mock adapters for testing
 */
export function createMockRouter(): LLMRouter {
  const mockAdapter = new MockLLMAdapter();

  return new LLMRouter({
    adapters: {
      mock: mockAdapter,
      'claude-3-sonnet': mockAdapter,
      'claude-3-haiku': mockAdapter,
      'gpt-4': mockAdapter,
      'gpt-4o-mini': mockAdapter,
    },
    defaultModel: 'mock',
    enableDowngrade: true,
    enableCrossProviderFallback: true,
  });
}
