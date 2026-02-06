import type { LLMAdapter, LLMCompletionParams, LLMCompletionResult, AgentOutput } from './types.js';
import { createHash } from 'node:crypto';

/**
 * Mock LLM adapter for testing and development.
 * Returns deterministic outputs based on prompt hash.
 * Always returns isDryRun: true since no real API is called.
 */
export class MockLLMAdapter implements LLMAdapter {
  readonly name = 'mock';

  private responses: Map<string, string> = new Map();
  private defaultTokenMultiplier = 0.5; // Output tokens as fraction of input
  private callCount = 0;

  /**
   * Register a canned response for a specific prompt pattern.
   */
  registerResponse(promptPattern: string, response: string): void {
    this.responses.set(promptPattern, response);
  }

  /**
   * Clear all registered responses.
   */
  clearResponses(): void {
    this.responses.clear();
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const { prompt, maxTokens } = params;
    this.callCount++;

    // Calculate fake token counts based on prompt length
    // Roughly 4 characters per token
    const tokensIn = Math.ceil(prompt.length / 4);
    const tokensOut = Math.min(
      Math.ceil(tokensIn * this.defaultTokenMultiplier),
      maxTokens
    );

    // Check for registered responses
    for (const [pattern, response] of this.responses) {
      if (prompt.includes(pattern)) {
        return {
          text: response,
          tokensIn,
          tokensOut: Math.ceil(response.length / 4),
          latencyMs: 0,
          requestId: `mock-${this.callCount}`,
          model: 'mock', // Always return 'mock' for consistent test behavior
          isDryRun: true,
        };
      }
    }

    // Generate deterministic default response
    const text = this.generateDeterministicResponse(prompt);

    return {
      text,
      tokensIn,
      tokensOut,
      latencyMs: 0,
      requestId: `mock-${this.callCount}`,
      model: 'mock', // Always return 'mock' for consistent test behavior
      isDryRun: true,
    };
  }

  private generateDeterministicResponse(prompt: string): string {
    // Create a hash-based deterministic response
    const hash = createHash('md5').update(prompt).digest('hex').slice(0, 8);

    const output: AgentOutput = {
      result: {
        message: `Mock response for prompt hash: ${hash}`,
        generated: true,
      },
      assumptions: ['This is a mock response', 'No actual LLM was called'],
      unknowns: [],
      next_actions: ['Review mock output', 'Replace with real LLM in production'],
    };

    return JSON.stringify(output, null, 2);
  }
}

/**
 * Create a mock adapter with default configuration.
 */
export function createMockAdapter(): MockLLMAdapter {
  return new MockLLMAdapter();
}
