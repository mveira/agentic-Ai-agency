import type { CostEstimate, ModelPricing } from './types.js';
import { getModelPricing } from './pricing.js';

export interface EstimateCostParams {
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  pricing?: ModelPricing;
}

/**
 * Estimates the cost of a task run based on token counts and model pricing.
 *
 * @param params - The parameters for cost estimation
 * @returns CostEstimate with input, output, and total costs in GBP
 * @throws Error if model pricing is not found
 */
export function estimateCost(params: EstimateCostParams): CostEstimate {
  const { modelId, inputTokens, outputTokens, pricing: providedPricing } = params;

  if (inputTokens < 0 || outputTokens < 0) {
    throw new Error('Token counts must be non-negative');
  }

  const pricing = providedPricing ?? getModelPricing(modelId);

  if (!pricing) {
    throw new Error(`No pricing found for model: ${modelId}`);
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePerMillion;
  const totalCost = inputCost + outputCost;

  return {
    inputCost: roundToSixDecimals(inputCost),
    outputCost: roundToSixDecimals(outputCost),
    totalCost: roundToSixDecimals(totalCost),
    currency: 'GBP',
  };
}

function roundToSixDecimals(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
