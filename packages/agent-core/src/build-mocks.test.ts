import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockBlueprintOutput,
  createMockUXUISpecOutput,
  createMockCopyPackOutput,
  createMockQCPassOutput,
  createMockQCBlockOutput,
  registerBuildMocks,
} from './build-mocks.js';
import {
  MarketingBlueprintSchema,
  UXUISpecSchema,
  CopyPackSchema,
  QCReportSchema,
} from './build-schemas.js';
import { AgentOutputSchema } from './types.js';
import { MockLLMAdapter } from './mock-llm.js';

describe('Build Mock Factories', () => {
  it('createMockBlueprintOutput produces valid AgentOutput', () => {
    const output = createMockBlueprintOutput();
    expect(AgentOutputSchema.safeParse(output).success).toBe(true);
  });

  it('createMockBlueprintOutput.result validates against MarketingBlueprintSchema', () => {
    const output = createMockBlueprintOutput();
    expect(MarketingBlueprintSchema.safeParse(output.result).success).toBe(true);
  });

  it('createMockUXUISpecOutput produces valid AgentOutput', () => {
    const output = createMockUXUISpecOutput();
    expect(AgentOutputSchema.safeParse(output).success).toBe(true);
  });

  it('createMockUXUISpecOutput.result validates against UXUISpecSchema', () => {
    const output = createMockUXUISpecOutput();
    expect(UXUISpecSchema.safeParse(output.result).success).toBe(true);
  });

  it('createMockCopyPackOutput produces valid AgentOutput', () => {
    const output = createMockCopyPackOutput();
    expect(AgentOutputSchema.safeParse(output).success).toBe(true);
  });

  it('createMockCopyPackOutput.result validates against CopyPackSchema', () => {
    const output = createMockCopyPackOutput();
    expect(CopyPackSchema.safeParse(output.result).success).toBe(true);
  });

  it('createMockQCPassOutput produces approved QC report', () => {
    const output = createMockQCPassOutput();
    const report = QCReportSchema.parse(output.result);
    expect(report.approved).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it('createMockQCBlockOutput produces blocked QC report with critical violation', () => {
    const output = createMockQCBlockOutput();
    const report = QCReportSchema.parse(output.result);
    expect(report.approved).toBe(false);
    expect(report.violations.length).toBeGreaterThan(0);
    expect(report.violations[0]!.severity).toBe('critical');
    expect(report.blockReason).toBeDefined();
  });
});

describe('registerBuildMocks', () => {
  let adapter: MockLLMAdapter;

  beforeEach(() => {
    adapter = new MockLLMAdapter();
  });

  it('registers responses for all 4 pipeline agents', async () => {
    registerBuildMocks(adapter);

    const blueprintResult = await adapter.complete({
      prompt: 'some prompt with strategy-funnel-agent in it',
      maxTokens: 4096,
      model: 'mock',
    });
    const parsed = JSON.parse(blueprintResult.content);
    expect(parsed.result.goal).toBeDefined();
    expect(parsed.result.funnelSteps).toBeDefined();

    const uxResult = await adapter.complete({
      prompt: 'some prompt with ux-design-agent in it',
      maxTokens: 4096,
      model: 'mock',
    });
    const uxParsed = JSON.parse(uxResult.content);
    expect(uxParsed.result.routes).toBeDefined();
    expect(uxParsed.result.screens).toBeDefined();
  });
});
