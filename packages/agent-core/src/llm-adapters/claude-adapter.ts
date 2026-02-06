/**
 * Claude LLM Adapter
 *
 * Real implementation of the LLMAdapter interface for Anthropic's Claude API.
 * Captures full telemetry: tokensIn, tokensOut, latencyMs, requestId, isDryRun.
 *
 * Supports dry-run mode for testing without real API calls.
 */

import type { LLMAdapter, LLMCompletionParams, LLMCompletionResult } from '../types.js';

// ─── Configuration ───────────────────────────────────────────────────────────

export interface ClaudeAdapterConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

// ─── Claude API Types ───────────────────────────────────────────────────────

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
}

interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface ClaudeErrorResponse {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

// ─── Error Types ────────────────────────────────────────────────────────────

export class ClaudeAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly errorType?: string
  ) {
    super(message);
    this.name = 'ClaudeAPIError';
  }
}

export class ClaudeRateLimitError extends ClaudeAPIError {
  constructor(message: string, public readonly retryAfterMs?: number) {
    super(message, 429, 'rate_limit');
    this.name = 'ClaudeRateLimitError';
  }
}

export class ClaudeTimeoutError extends ClaudeAPIError {
  constructor(message: string) {
    super(message, undefined, 'timeout');
    this.name = 'ClaudeTimeoutError';
  }
}

// ─── Claude Adapter ─────────────────────────────────────────────────────────

export class ClaudeAdapter implements LLMAdapter {
  readonly name = 'claude';

  private readonly config: Required<ClaudeAdapterConfig>;

  constructor(config: ClaudeAdapterConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? 'https://api.anthropic.com',
      defaultModel: config.defaultModel ?? 'claude-3-sonnet-20240229',
      timeoutMs: config.timeoutMs ?? 120000,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const { prompt, maxTokens, model, dryRun } = params;
    const targetModel = model || this.config.defaultModel;

    // ─── Dry-Run Mode ───────────────────────────────────────────────────────
    if (dryRun) {
      return this.generateDryRunResponse(prompt, targetModel);
    }

    // ─── Real API Call ──────────────────────────────────────────────────────
    const startTime = performance.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const result = await this.doComplete(prompt, maxTokens, targetModel, startTime);
        return result;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx except 429)
        if (
          error instanceof ClaudeAPIError &&
          error.statusCode !== undefined &&
          error.statusCode >= 400 &&
          error.statusCode < 500 &&
          error.statusCode !== 429
        ) {
          throw error;
        }

        // Handle rate limiting with backoff
        if (error instanceof ClaudeRateLimitError) {
          const backoffMs = error.retryAfterMs ?? (attempt + 1) * 1000;
          await this.sleep(backoffMs);
          continue;
        }

        // Exponential backoff for other retriable errors
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        await this.sleep(backoffMs);
      }
    }

    throw lastError ?? new ClaudeAPIError('Max retries exceeded');
  }

  private async doComplete(
    prompt: string,
    maxTokens: number,
    model: string,
    startTime: number
  ): Promise<LLMCompletionResult> {
    const requestBody: ClaudeRequest = {
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const latencyMs = Math.round(performance.now() - startTime);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `Claude API error: ${response.status}`;
        let errorType: string | undefined;

        try {
          const parsed = JSON.parse(errorBody) as ClaudeErrorResponse;
          if (parsed.error) {
            errorMessage = parsed.error.message;
            errorType = parsed.error.type;
          }
        } catch {
          // Use default error message
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
          throw new ClaudeRateLimitError(errorMessage, retryAfterMs);
        }

        throw new ClaudeAPIError(errorMessage, response.status, errorType);
      }

      const data = (await response.json()) as ClaudeResponse;

      // Extract text content
      const textContent = data.content.find((c) => c.type === 'text');
      if (!textContent) {
        throw new ClaudeAPIError('No text content in response');
      }

      return {
        text: textContent.text,
        tokensIn: data.usage.input_tokens,
        tokensOut: data.usage.output_tokens,
        latencyMs,
        requestId: data.id,
        model: data.model,
        isDryRun: false,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ClaudeTimeoutError(`Request timed out after ${this.config.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generate a dry-run response without calling the API.
   * Useful for testing orchestrators without spending tokens.
   */
  private generateDryRunResponse(prompt: string, model: string): LLMCompletionResult {
    // Estimate tokens: ~4 chars per token
    const tokensIn = Math.ceil(prompt.length / 4);
    const tokensOut = Math.ceil(tokensIn * 0.5);

    return {
      text: JSON.stringify({
        result: { message: '[DRY-RUN] No real API call made', dryRun: true },
        assumptions: ['This is a dry-run response'],
        unknowns: [],
        next_actions: ['Enable real API calls by setting dryRun: false'],
      }),
      tokensIn,
      tokensOut,
      latencyMs: 0,
      requestId: `dry-run-${Date.now()}`,
      model,
      isDryRun: true,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a Claude adapter from environment variables.
 * Expects ANTHROPIC_API_KEY to be set.
 */
export function createClaudeAdapterFromEnv(
  overrides?: Partial<ClaudeAdapterConfig>
): ClaudeAdapter {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return new ClaudeAdapter({
    apiKey,
    ...overrides,
  });
}
