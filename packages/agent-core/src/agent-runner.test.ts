import { describe, it, expect, beforeEach } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentRunner } from './agent-runner.js';
import { MockLLMAdapter } from './mock-llm.js';
import type { AgentContract, TaskDefinition, AgentOutput } from './types.js';
import { InMemoryTelemetryStore } from '@agency/telemetry';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS_PATH = join(__dirname, '../../../../agency-questions/questions');

describe('AgentRunner', () => {
  let runner: AgentRunner;
  let mockAdapter: MockLLMAdapter;
  let store: InMemoryTelemetryStore;

  const mockContract: AgentContract = {
    agentId: 'test-agent',
    name: 'Test Agent',
    description: 'A test agent',
    capabilities: ['testing'],
    constraints: ['no real calls'],
    maxOutputTokens: 1000,
  };

  const mockTask: TaskDefinition = {
    taskId: 'task-001',
    taskType: 'test-task',
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    prompt: 'Do the test thing',
  };

  beforeEach(() => {
    mockAdapter = new MockLLMAdapter();
    store = new InMemoryTelemetryStore();

    runner = new AgentRunner(
      {
        questionsPath: QUESTIONS_PATH,
        globalRules: ['Be helpful'],
        llmAdapter: mockAdapter,
        defaultModel: 'mock',
        projectBudget: {
          dailyBudgetGbp: 10.0,
          monthlyBudgetGbp: 100.0,
        },
      },
      store
    );
  });

  it('runs a task successfully with mock adapter', async () => {
    const result = await runner.runTask({
      contract: mockContract,
      task: mockTask,
    });

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.telemetry.inputTokens).toBeGreaterThan(0);
    expect(result.telemetry.model).toBe('mock');
  });

  it('records telemetry for successful run', async () => {
    await runner.runTask({
      contract: mockContract,
      task: mockTask,
    });

    const runs = await store.getTaskRuns(mockTask.projectId);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe('completed');
    expect(runs[0]?.agentId).toBe('test-agent');
  });

  it('blocks task when budget is exceeded', async () => {
    const tightBudgetRunner = new AgentRunner(
      {
        questionsPath: QUESTIONS_PATH,
        globalRules: [],
        llmAdapter: mockAdapter,
        defaultModel: 'mock',
        projectBudget: {
          dailyBudgetGbp: 0.0001, // Very tight budget
          monthlyBudgetGbp: 100.0,
        },
      },
      store
    );

    const result = await tightBudgetRunner.runTask({
      contract: mockContract,
      task: mockTask,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('budget');

    const runs = await store.getTaskRuns(mockTask.projectId);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe('budget_exceeded');
  });

  it('handles custom LLM response', async () => {
    const customOutput: AgentOutput = {
      result: { custom: 'response' },
      assumptions: ['custom assumption'],
      unknowns: ['custom unknown'],
      next_actions: ['custom action'],
    };

    mockAdapter.registerResponse('Do the test thing', JSON.stringify(customOutput));

    const result = await runner.runTask({
      contract: mockContract,
      task: mockTask,
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual(customOutput);
  });

  it('fails when output schema is invalid', async () => {
    mockAdapter.registerResponse('Do the test thing', '{"invalid": "schema"}');

    const result = await runner.runTask({
      contract: mockContract,
      task: mockTask,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('validation failed');

    const runs = await store.getTaskRuns(mockTask.projectId);
    expect(runs[0]?.status).toBe('failed');
  });

  it('compiles prompt with questions from question bank', async () => {
    const prompt = await runner.getCompiledPrompt({
      contract: mockContract,
      task: mockTask,
    });

    expect(prompt).toContain('KNOWN UNKNOWNS');
    expect(prompt).toContain('portal-auth-method');
  });

  it('includes framework blocks in prompt', async () => {
    const prompt = await runner.getCompiledPrompt({
      contract: mockContract,
      task: mockTask,
      frameworkBlocks: [
        { name: 'Custom Framework', content: 'Custom content here', priority: 1 },
      ],
    });

    expect(prompt).toContain('CUSTOM FRAMEWORK');
    expect(prompt).toContain('Custom content here');
  });
});

describe('AgentRunner - fail fast behavior', () => {
  it('fails fast when question bank is missing', async () => {
    const mockAdapter = new MockLLMAdapter();
    const runner = new AgentRunner({
      questionsPath: '/nonexistent/path',
      globalRules: [],
      llmAdapter: mockAdapter,
      defaultModel: 'mock',
    });

    await expect(runner.initialize()).rejects.toThrow('Question bank not found');
  });
});
