import type { LLMAdapter, LLMCompletionParams, LLMCompletionResult, AgentOutput } from './types.js';
import { createHash } from 'node:crypto';

/**
 * Mock LLM adapter for testing and development.
 * Returns deterministic outputs based on prompt hash.
 */
export class MockLLMAdapter implements LLMAdapter {
  readonly name = 'mock';

  private responses: Map<string, string> = new Map();
  private defaultTokenMultiplier = 0.5; // Output tokens as fraction of input

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

    // Calculate fake token counts based on prompt length
    // Roughly 4 characters per token
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.min(
      Math.ceil(inputTokens * this.defaultTokenMultiplier),
      maxTokens
    );

    // Check for registered responses
    for (const [pattern, response] of this.responses) {
      if (prompt.includes(pattern)) {
        return {
          content: response,
          inputTokens,
          outputTokens: Math.ceil(response.length / 4),
          model: 'mock',
        };
      }
    }

    // Generate deterministic default response
    const content = this.generateDeterministicResponse(prompt);

    return {
      content,
      inputTokens,
      outputTokens,
      model: 'mock',
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
