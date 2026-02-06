# LLM Adapters

## Purpose
Provide swappable LLM backends that capture full telemetry for every API call. The adapter interface enables switching between providers without changing agent logic.

## Handbook Alignment
Supports cost discipline (token tracking), telemetry recording, and governance constraints.

## Available Adapters

### ClaudeAdapter (Primary)
Real implementation for Anthropic's Claude API.

```typescript
import { ClaudeAdapter, createClaudeAdapterFromEnv } from '@agency/agent-core';

// From environment (ANTHROPIC_API_KEY)
const adapter = createClaudeAdapterFromEnv();

// With explicit config
const adapter = new ClaudeAdapter({
  apiKey: 'sk-...',
  baseUrl: 'https://api.anthropic.com', // Optional
  defaultModel: 'claude-3-sonnet-20240229', // Optional
  timeoutMs: 120000, // Optional (default: 2 min)
  maxRetries: 3, // Optional
});
```

### MockLLMAdapter (Testing)
Deterministic mock for testing without API calls. Always returns `isDryRun: true`.

```typescript
import { MockLLMAdapter, createMockAdapter } from '@agency/agent-core';

const adapter = createMockAdapter();
adapter.registerResponse('pattern', 'response'); // Optional canned responses
```

## Telemetry Response

All adapters return the same telemetry structure:

```typescript
interface LLMCompletionResult {
  text: string;        // Generated response
  tokensIn: number;    // Input tokens consumed
  tokensOut: number;   // Output tokens generated
  latencyMs: number;   // Request latency in milliseconds
  requestId: string;   // Provider-assigned ID for tracing
  model: string;       // Model used
  isDryRun: boolean;   // Whether this was a dry-run
}
```

## Dry-Run Mode

Pass `dryRun: true` to skip real API calls. Useful for testing orchestrators without spending tokens.

```typescript
const result = await adapter.complete({
  prompt: 'Generate a proposal',
  maxTokens: 2000,
  model: 'claude-3-sonnet-20240229',
  dryRun: true, // No API call made
});

// result.isDryRun === true
// result.latencyMs === 0
// result.requestId === 'dry-run-{timestamp}'
```

## Switching Adapters

Adapters are injected via `AgentRunnerConfig` or `LLMRouter`:

```typescript
// Direct injection
const runner = new AgentRunner({
  llmAdapter: new ClaudeAdapter({ apiKey }),
  // ...
});

// Via router (for multi-model support)
const router = new LLMRouter({
  adapters: {
    'claude': new ClaudeAdapter({ apiKey }),
    // Future: 'openai': new OpenAIAdapter({ apiKey }),
  },
  defaultModel: 'claude-3-sonnet',
  enableDowngrade: true,
  enableCrossProviderFallback: false,
});
```

## Error Handling

```typescript
import {
  ClaudeAPIError,
  ClaudeRateLimitError,
  ClaudeTimeoutError
} from '@agency/agent-core';

try {
  const result = await adapter.complete(params);
} catch (error) {
  if (error instanceof ClaudeRateLimitError) {
    // error.retryAfterMs available
    await sleep(error.retryAfterMs ?? 1000);
  } else if (error instanceof ClaudeTimeoutError) {
    // Request timed out
  } else if (error instanceof ClaudeAPIError) {
    // Other API error (error.statusCode, error.errorType)
  }
}
```

## Adding New Adapters

To add a new provider (e.g., OpenAI):

1. Create `packages/agent-core/src/llm-adapters/openai-adapter.ts`
2. Implement `LLMAdapter` interface with full telemetry
3. Export from `llm-adapters/index.ts`
4. Add to `index.ts` barrel export
5. Register in `LLMRouter` adapters map

## Cost Considerations
- Each real API call incurs token costs
- Use `dryRun: true` for testing
- MockLLMAdapter is free (no API calls)
- Telemetry records all token usage for budget tracking
