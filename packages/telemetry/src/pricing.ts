import type { ModelPricing } from './types.js';

/**
 * Default model pricing in GBP per million tokens.
 * These are approximate conversions and should be updated from actual provider rates.
 */
export const DEFAULT_MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4-turbo': {
    modelId: 'gpt-4-turbo',
    inputPricePerMillion: 8.0, // ~$10 USD
    outputPricePerMillion: 24.0, // ~$30 USD
    currency: 'GBP',
  },
  'gpt-4o': {
    modelId: 'gpt-4o',
    inputPricePerMillion: 2.0, // ~$2.50 USD
    outputPricePerMillion: 8.0, // ~$10 USD
    currency: 'GBP',
  },
  'gpt-4o-mini': {
    modelId: 'gpt-4o-mini',
    inputPricePerMillion: 0.12, // ~$0.15 USD
    outputPricePerMillion: 0.48, // ~$0.60 USD
    currency: 'GBP',
  },
  'claude-3-opus': {
    modelId: 'claude-3-opus',
    inputPricePerMillion: 12.0, // ~$15 USD
    outputPricePerMillion: 60.0, // ~$75 USD
    currency: 'GBP',
  },
  'claude-3-sonnet': {
    modelId: 'claude-3-sonnet',
    inputPricePerMillion: 2.4, // ~$3 USD
    outputPricePerMillion: 12.0, // ~$15 USD
    currency: 'GBP',
  },
  'claude-3-haiku': {
    modelId: 'claude-3-haiku',
    inputPricePerMillion: 0.2, // ~$0.25 USD
    outputPricePerMillion: 1.0, // ~$1.25 USD
    currency: 'GBP',
  },
  // Mock model for testing
  'mock': {
    modelId: 'mock',
    inputPricePerMillion: 1.0,
    outputPricePerMillion: 2.0,
    currency: 'GBP',
  },
};

export function getModelPricing(modelId: string): ModelPricing | null {
  return DEFAULT_MODEL_PRICING[modelId] ?? null;
}
