import { describe, it, expect } from 'vitest';
import { estimateCost } from './cost.js';

describe('estimateCost', () => {
  it('calculates cost correctly for mock model', () => {
    const result = estimateCost({
      modelId: 'mock',
      inputTokens: 1000,
      outputTokens: 500,
    });

    // mock model: input = 1.0/million, output = 2.0/million
    // 1000 input tokens = 0.001 GBP
    // 500 output tokens = 0.001 GBP
    expect(result.inputCost).toBe(0.001);
    expect(result.outputCost).toBe(0.001);
    expect(result.totalCost).toBe(0.002);
    expect(result.currency).toBe('GBP');
  });

  it('calculates cost correctly for gpt-4o-mini', () => {
    const result = estimateCost({
      modelId: 'gpt-4o-mini',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });

    // gpt-4o-mini: input = 0.12/million, output = 0.48/million
    expect(result.inputCost).toBe(0.12);
    expect(result.outputCost).toBe(0.48);
    expect(result.totalCost).toBe(0.6);
  });

  it('returns zero cost for zero tokens', () => {
    const result = estimateCost({
      modelId: 'mock',
      inputTokens: 0,
      outputTokens: 0,
    });

    expect(result.inputCost).toBe(0);
    expect(result.outputCost).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it('throws error for unknown model', () => {
    expect(() =>
      estimateCost({
        modelId: 'unknown-model',
        inputTokens: 1000,
        outputTokens: 500,
      })
    ).toThrow('No pricing found for model: unknown-model');
  });

  it('throws error for negative token counts', () => {
    expect(() =>
      estimateCost({
        modelId: 'mock',
        inputTokens: -100,
        outputTokens: 500,
      })
    ).toThrow('Token counts must be non-negative');
  });

  it('accepts custom pricing', () => {
    const result = estimateCost({
      modelId: 'custom',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      pricing: {
        modelId: 'custom',
        inputPricePerMillion: 5.0,
        outputPricePerMillion: 10.0,
        currency: 'GBP',
      },
    });

    expect(result.inputCost).toBe(5.0);
    expect(result.outputCost).toBe(10.0);
    expect(result.totalCost).toBe(15.0);
  });

  it('handles large token counts accurately', () => {
    const result = estimateCost({
      modelId: 'mock',
      inputTokens: 100_000_000,
      outputTokens: 50_000_000,
    });

    expect(result.inputCost).toBe(100);
    expect(result.outputCost).toBe(100);
    expect(result.totalCost).toBe(200);
  });
});
