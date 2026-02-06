/**
 * Claude Adapter Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ClaudeAdapter,
  ClaudeAPIError,
  ClaudeRateLimitError,
  createClaudeAdapterFromEnv,
} from './claude-adapter.js';

describe('ClaudeAdapter', () => {
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should implement LLMAdapter interface', () => {
    const adapter = new ClaudeAdapter({ apiKey: mockApiKey });
    expect(adapter.name).toBe('claude');
    expect(typeof adapter.complete).toBe('function');
  });

  it('should make correct API call and return full telemetry', async () => {
    const mockResponse = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello, world!' }],
      model: 'claude-3-sonnet-20240229',
      usage: { input_tokens: 10, output_tokens: 5 },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const adapter = new ClaudeAdapter({ apiKey: mockApiKey });
    const result = await adapter.complete({
      prompt: 'Say hello',
      maxTokens: 100,
      model: 'claude-3-sonnet-20240229',
    });

    // Verify new telemetry fields
    expect(result.text).toBe('Hello, world!');
    expect(result.tokensIn).toBe(10);
    expect(result.tokensOut).toBe(5);
    expect(result.model).toBe('claude-3-sonnet-20240229');
    expect(result.requestId).toBe('msg_123');
    expect(result.isDryRun).toBe(false);
    expect(typeof result.latencyMs).toBe('number');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-api-key': mockApiKey,
          'anthropic-version': '2023-06-01',
        }),
      })
    );
  });

  it('should support dry-run mode without calling API', async () => {
    const adapter = new ClaudeAdapter({ apiKey: mockApiKey });
    const result = await adapter.complete({
      prompt: 'Say hello',
      maxTokens: 100,
      model: 'claude-3-sonnet-20240229',
      dryRun: true,
    });

    // Verify dry-run response
    expect(result.isDryRun).toBe(true);
    expect(result.latencyMs).toBe(0);
    expect(result.requestId).toMatch(/^dry-run-/);
    expect(result.model).toBe('claude-3-sonnet-20240229');
    expect(result.tokensIn).toBeGreaterThan(0);
    expect(result.tokensOut).toBeGreaterThan(0);
    expect(result.text).toContain('DRY-RUN');

    // API should NOT be called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should use custom base URL', async () => {
    const mockResponse = {
      id: 'msg_456',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello!' }],
      model: 'claude-3-haiku',
      usage: { input_tokens: 5, output_tokens: 2 },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const adapter = new ClaudeAdapter({
      apiKey: mockApiKey,
      baseUrl: 'https://custom.api.com',
    });
    await adapter.complete({
      prompt: 'Test',
      maxTokens: 100,
      model: 'claude-3-haiku',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://custom.api.com/v1/messages',
      expect.any(Object)
    );
  });

  it('should throw ClaudeAPIError on non-429 client errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({
        type: 'error',
        error: { type: 'invalid_request_error', message: 'Invalid request' },
      })),
    });

    const adapter = new ClaudeAdapter({ apiKey: mockApiKey, maxRetries: 1 });

    await expect(
      adapter.complete({ prompt: 'Test', maxTokens: 100, model: 'claude-3-sonnet' })
    ).rejects.toThrow(ClaudeAPIError);

    // Should not retry on 400
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should throw ClaudeRateLimitError on 429', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'retry-after': '1' }),
      text: () => Promise.resolve(JSON.stringify({
        type: 'error',
        error: { type: 'rate_limit_error', message: 'Rate limited' },
      })),
    });

    const adapter = new ClaudeAdapter({ apiKey: mockApiKey, maxRetries: 1 });

    await expect(
      adapter.complete({ prompt: 'Test', maxTokens: 100, model: 'claude-3-sonnet' })
    ).rejects.toThrow(ClaudeRateLimitError);
  });

  it('should throw ClaudeAPIError when no text content in response', async () => {
    const mockResponse = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [], // No text content
      model: 'claude-3-sonnet-20240229',
      usage: { input_tokens: 10, output_tokens: 0 },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const adapter = new ClaudeAdapter({ apiKey: mockApiKey, maxRetries: 1 });

    await expect(
      adapter.complete({ prompt: 'Test', maxTokens: 100, model: 'claude-3-sonnet' })
    ).rejects.toThrow('No text content in response');
  });
});

describe('createClaudeAdapterFromEnv', () => {
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('should throw if ANTHROPIC_API_KEY is not set', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => createClaudeAdapterFromEnv()).toThrow('ANTHROPIC_API_KEY environment variable is required');
  });

  it('should create adapter from env', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const adapter = createClaudeAdapterFromEnv();
    expect(adapter.name).toBe('claude');
  });
});
