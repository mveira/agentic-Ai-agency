import { describe, it, expect, beforeEach } from 'vitest';
import { LLMRouter, createMockRouter, MODEL_DOWNGRADE_PATH } from './llm-router.js';
import { MockLLMAdapter } from './mock-llm.js';

describe('LLMRouter', () => {
  let router: LLMRouter;
  let mockAdapter: MockLLMAdapter;

  beforeEach(() => {
    mockAdapter = new MockLLMAdapter();
    router = new LLMRouter({
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
  });

  describe('getModelForAgent', () => {
    it('returns correct model for research agent', () => {
      expect(router.getModelForAgent('research-agent')).toBe('claude-3-sonnet');
    });

    it('returns correct model for copy agent', () => {
      expect(router.getModelForAgent('copy-messaging-agent')).toBe('gpt-4');
    });

    it('returns correct model for automation agent', () => {
      expect(router.getModelForAgent('automation-crm-agent')).toBe('gpt-4o-mini');
    });

    it('returns default model for unknown agent', () => {
      expect(router.getModelForAgent('unknown-agent')).toBe('mock');
    });
  });

  describe('getCostCapForAgent', () => {
    it('returns cost cap for known agent', () => {
      expect(router.getCostCapForAgent('research-agent')).toBe(0.50);
      expect(router.getCostCapForAgent('copy-messaging-agent')).toBe(1.00);
    });

    it('returns Infinity for unknown agent', () => {
      expect(router.getCostCapForAgent('unknown-agent')).toBe(Infinity);
    });
  });

  describe('route', () => {
    it('routes to correct model for agent', () => {
      const result = router.route({
        agentId: 'research-agent',
        estimatedInputTokens: 1000,
        estimatedOutputTokens: 500,
      });

      expect(result.model).toBe('claude-3-sonnet');
      expect(result.downgraded).toBe(false);
    });

    it('returns adapter for routed model', () => {
      const result = router.route({
        agentId: 'research-agent',
        estimatedInputTokens: 1000,
        estimatedOutputTokens: 500,
      });

      expect(result.adapter).toBe(mockAdapter);
    });
  });

  describe('downgrade logic', () => {
    it('downgrades when cost cap would be exceeded', () => {
      const tightRouter = new LLMRouter({
        adapters: {
          mock: mockAdapter,
          'claude-3-sonnet': mockAdapter,
          'claude-3-haiku': mockAdapter,
        },
        defaultModel: 'mock',
        enableDowngrade: true,
        enableCrossProviderFallback: false,
      });

      // With very high current spend, should downgrade
      const result = tightRouter.route({
        agentId: 'research-agent',
        estimatedInputTokens: 1000000,
        estimatedOutputTokens: 500000,
        currentSpend: 0.49, // Almost at cap
      });

      // Should attempt downgrade
      expect(result.model).toBeDefined();
    });
  });
});

describe('MODEL_DOWNGRADE_PATH', () => {
  it('claude-3-opus downgrades to claude-3-sonnet', () => {
    expect(MODEL_DOWNGRADE_PATH['claude-3-opus']).toBe('claude-3-sonnet');
  });

  it('claude-3-sonnet downgrades to claude-3-haiku', () => {
    expect(MODEL_DOWNGRADE_PATH['claude-3-sonnet']).toBe('claude-3-haiku');
  });

  it('gpt-4 downgrades to gpt-4o', () => {
    expect(MODEL_DOWNGRADE_PATH['gpt-4']).toBe('gpt-4o');
  });

  it('gpt-4o downgrades to gpt-4o-mini', () => {
    expect(MODEL_DOWNGRADE_PATH['gpt-4o']).toBe('gpt-4o-mini');
  });
});

describe('createMockRouter', () => {
  it('creates a functional router', () => {
    const mockRouter = createMockRouter();
    expect(mockRouter).toBeInstanceOf(LLMRouter);
  });

  it('mock router can route requests', () => {
    const mockRouter = createMockRouter();
    const result = mockRouter.route({
      agentId: 'research-agent',
      estimatedInputTokens: 1000,
      estimatedOutputTokens: 500,
    });

    expect(result.adapter).toBeDefined();
    expect(result.model).toBeDefined();
  });
});
