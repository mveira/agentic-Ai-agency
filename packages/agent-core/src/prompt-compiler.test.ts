import { describe, it, expect } from 'vitest';
import { compilePrompt, validateAgentOutput } from './prompt-compiler.js';
import type { AgentContract, TaskDefinition } from './types.js';

describe('compilePrompt', () => {
  const mockContract: AgentContract = {
    agentId: 'test-agent',
    name: 'Test Agent',
    description: 'A test agent',
    capabilities: ['testing', 'mocking'],
    constraints: ['no real API calls'],
    maxOutputTokens: 1000,
  };

  const mockTask: TaskDefinition = {
    taskId: 'task-001',
    taskType: 'test-task',
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    prompt: 'Do the test thing',
  };

  it('compiles prompt with all sections', () => {
    const result = compilePrompt({
      globalRules: ['Be helpful', 'Be concise'],
      contract: mockContract,
      frameworkBlocks: [{ name: 'Testing Framework', content: 'Use vitest', priority: 1 }],
      task: mockTask,
      questions: [{ id: 'q1', question: 'What color?', status: 'open' }],
    });

    expect(result.text).toContain('GLOBAL RULES');
    expect(result.text).toContain('Be helpful');
    expect(result.text).toContain('AGENT CONTRACT');
    expect(result.text).toContain('test-agent');
    expect(result.text).toContain('TESTING FRAMEWORK');
    expect(result.text).toContain('Use vitest');
    expect(result.text).toContain('TASK');
    expect(result.text).toContain('Do the test thing');
    expect(result.text).toContain('KNOWN UNKNOWNS');
    expect(result.text).toContain('OUTPUT FORMAT');
  });

  it('generates consistent hash for same input', () => {
    const params = {
      globalRules: ['Rule 1'],
      contract: mockContract,
      frameworkBlocks: [],
      task: mockTask,
      questions: [],
    };

    const result1 = compilePrompt(params);
    const result2 = compilePrompt(params);

    expect(result1.hash).toBe(result2.hash);
  });

  it('generates different hash for different input', () => {
    const result1 = compilePrompt({
      globalRules: ['Rule 1'],
      contract: mockContract,
      frameworkBlocks: [],
      task: mockTask,
      questions: [],
    });

    const result2 = compilePrompt({
      globalRules: ['Rule 2'], // Different
      contract: mockContract,
      frameworkBlocks: [],
      task: mockTask,
      questions: [],
    });

    expect(result1.hash).not.toBe(result2.hash);
  });

  it('sorts framework blocks by priority', () => {
    const result = compilePrompt({
      globalRules: [],
      contract: mockContract,
      frameworkBlocks: [
        { name: 'Low Priority', content: 'Last', priority: 10 },
        { name: 'High Priority', content: 'First', priority: 1 },
      ],
      task: mockTask,
      questions: [],
    });

    const highIndex = result.text.indexOf('HIGH PRIORITY');
    const lowIndex = result.text.indexOf('LOW PRIORITY');

    expect(highIndex).toBeLessThan(lowIndex);
  });
});

describe('validateAgentOutput', () => {
  it('validates correct JSON output', () => {
    const validOutput = JSON.stringify({
      result: { data: 'test' },
      assumptions: ['assumption 1'],
      unknowns: [],
      next_actions: ['action 1'],
    });

    const result = validateAgentOutput(validOutput);

    expect(result.valid).toBe(true);
    expect(result.output).toBeDefined();
  });

  it('rejects invalid JSON', () => {
    const result = validateAgentOutput('not json');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('not valid JSON');
  });

  it('rejects JSON with missing fields', () => {
    const incompleteOutput = JSON.stringify({
      result: { data: 'test' },
      // missing: assumptions, unknowns, next_actions
    });

    const result = validateAgentOutput(incompleteOutput);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Schema validation failed');
  });

  it('extracts JSON from markdown code fence', () => {
    const wrappedOutput = `\`\`\`json
{
  "result": "test",
  "assumptions": [],
  "unknowns": [],
  "next_actions": []
}
\`\`\``;

    const result = validateAgentOutput(wrappedOutput);

    expect(result.valid).toBe(true);
  });

  it('accepts result of any type', () => {
    const outputs = [
      { result: 'string', assumptions: [], unknowns: [], next_actions: [] },
      { result: 123, assumptions: [], unknowns: [], next_actions: [] },
      { result: { nested: 'object' }, assumptions: [], unknowns: [], next_actions: [] },
      { result: ['array'], assumptions: [], unknowns: [], next_actions: [] },
      { result: null, assumptions: [], unknowns: [], next_actions: [] },
    ];

    for (const output of outputs) {
      const result = validateAgentOutput(JSON.stringify(output));
      expect(result.valid).toBe(true);
    }
  });
});
