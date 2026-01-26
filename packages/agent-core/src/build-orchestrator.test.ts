import { describe, it, expect, beforeEach } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BuildOrchestrator,
  InMemoryRequirementsProvider,
  assembleBuildPlan,
  type BuildOrchestratorInput,
} from './build-orchestrator.js';
import {
  createMockBlueprintOutput,
  createMockUXUISpecOutput,
  createMockCopyPackOutput,
  createMockQCBlockOutput,
  registerBuildMocks,
} from './build-mocks.js';
import {
  MarketingBlueprintSchema,
  UXUISpecSchema,
  CopyPackSchema,
  BuildPlanSchema,
} from './build-schemas.js';
import { createMockRouter } from './llm-router.js';
import type { MockLLMAdapter } from './mock-llm.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS_PATH = join(__dirname, '../../../../agency-questions/questions');

// ─── Helpers ────────────────────────────────────────────────────────────────

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';
const VERSION_ID = 'v1.0';

function createDefaultInput(): BuildOrchestratorInput {
  return {
    projectId: PROJECT_ID,
    requirementsVersionId: VERSION_ID,
    buildRequest: {
      type: 'landing-page',
      goal: 'Generate leads for SaaS product',
    },
  };
}

function createOrchestrator(
  requirements: InMemoryRequirementsProvider,
  mockAdapter?: MockLLMAdapter
) {
  const router = createMockRouter();

  // If a custom adapter is provided, register it on the router
  // Otherwise use the default mock router which already has a MockLLMAdapter
  if (mockAdapter) {
    // The mock router's adapters already contain a mock adapter
    // We register our responses on the adapter returned by route()
    const routed = router.route({
      agentId: 'strategy-funnel-agent',
      estimatedInputTokens: 100,
      estimatedOutputTokens: 100,
    });
    // Register build mocks on the router's adapter
    registerBuildMocks(routed.adapter as MockLLMAdapter);
  } else {
    // Register build mocks on the mock router's default adapter
    const routed = router.route({
      agentId: 'strategy-funnel-agent',
      estimatedInputTokens: 100,
      estimatedOutputTokens: 100,
    });
    registerBuildMocks(routed.adapter as MockLLMAdapter);
  }

  return new BuildOrchestrator({
    runnerConfig: {
      questionsPath: QUESTIONS_PATH,
      globalRules: [],
      router,
      enforceQC: false, // Orchestrator manages QC separately
    },
    requirements,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('BuildOrchestrator', () => {
  let requirements: InMemoryRequirementsProvider;

  beforeEach(() => {
    requirements = new InMemoryRequirementsProvider();
  });

  describe('Governance Gates', () => {
    it('refuses if requirements not found', async () => {
      const orchestrator = createOrchestrator(requirements);
      const result = await orchestrator.execute(createDefaultInput());

      expect(result.status).toBe('error');
      expect(result.error).toContain('Requirements not found');
      expect(result.telemetry).toHaveLength(0);
    });

    it('refuses if assumptions not approved', async () => {
      requirements.set(PROJECT_ID, VERSION_ID, {
        exists: true,
        assumptionsApproved: false,
      });

      const orchestrator = createOrchestrator(requirements);
      const result = await orchestrator.execute(createDefaultInput());

      expect(result.status).toBe('error');
      expect(result.error).toContain('Assumptions have not been approved');
      expect(result.telemetry).toHaveLength(0);
    });
  });

  describe('Pipeline Execution', () => {
    beforeEach(() => {
      requirements.set(PROJECT_ID, VERSION_ID, {
        exists: true,
        assumptionsApproved: true,
        data: { goal: 'Generate leads' },
      });
    });

    it('runs all 4 agents in correct order', async () => {
      const orchestrator = createOrchestrator(requirements);
      const result = await orchestrator.execute(createDefaultInput());

      expect(result.status).toBe('success');
      expect(result.telemetry).toHaveLength(4);
      expect(result.telemetry[0]!.step).toBe('marketing');
      expect(result.telemetry[0]!.agentId).toBe('strategy-funnel-agent');
      expect(result.telemetry[1]!.step).toBe('ux-design');
      expect(result.telemetry[1]!.agentId).toBe('ux-design-agent');
      expect(result.telemetry[2]!.step).toBe('copy');
      expect(result.telemetry[2]!.agentId).toBe('copy-messaging-agent');
      expect(result.telemetry[3]!.step).toBe('qc');
      expect(result.telemetry[3]!.agentId).toBe('quality-control-agent');
    });

    it('records telemetry for each step', async () => {
      const orchestrator = createOrchestrator(requirements);
      const result = await orchestrator.execute(createDefaultInput());

      for (const entry of result.telemetry) {
        expect(entry.durationMs).toBeGreaterThanOrEqual(0);
        expect(entry.inputTokens).toBeGreaterThanOrEqual(0);
        expect(entry.outputTokens).toBeGreaterThanOrEqual(0);
        expect(entry.model).toBeDefined();
      }
    });

    it('produces valid BuildPlan on success', async () => {
      const orchestrator = createOrchestrator(requirements);
      const result = await orchestrator.execute(createDefaultInput());

      expect(result.status).toBe('success');
      expect(result.buildPlan).toBeDefined();
      expect(BuildPlanSchema.safeParse(result.buildPlan).success).toBe(true);
    });

    it('tasks include acceptanceCriteria and testNotes', async () => {
      const orchestrator = createOrchestrator(requirements);
      const result = await orchestrator.execute(createDefaultInput());

      expect(result.buildPlan).toBeDefined();
      for (const task of result.buildPlan!.tasks) {
        expect(task.acceptanceCriteria.length).toBeGreaterThan(0);
        expect(task.testNotes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('QC Blocking', () => {
    beforeEach(() => {
      requirements.set(PROJECT_ID, VERSION_ID, {
        exists: true,
        assumptionsApproved: true,
      });
    });

    it('returns blocked when QC disapproves', async () => {
      const router = createMockRouter();
      const routed = router.route({
        agentId: 'strategy-funnel-agent',
        estimatedInputTokens: 100,
        estimatedOutputTokens: 100,
      });
      const adapter = routed.adapter as MockLLMAdapter;

      // Register all mocks but override QC with block response
      adapter.registerResponse(
        'strategy-funnel-agent',
        JSON.stringify(createMockBlueprintOutput())
      );
      adapter.registerResponse(
        'ux-design-agent',
        JSON.stringify(createMockUXUISpecOutput())
      );
      adapter.registerResponse(
        'copy-messaging-agent',
        JSON.stringify(createMockCopyPackOutput())
      );
      adapter.registerResponse(
        'quality-control-agent',
        JSON.stringify(createMockQCBlockOutput())
      );

      const orchestrator = new BuildOrchestrator({
        runnerConfig: {
          questionsPath: QUESTIONS_PATH,
          globalRules: [],
          router,
          enforceQC: false,
        },
        requirements,
      });

      const result = await orchestrator.execute(createDefaultInput());

      expect(result.status).toBe('blocked');
      expect(result.blockReason).toBeDefined();
      expect(result.blockReason).toContain('Optional content leaked into core');
      expect(result.buildPlan).toBeUndefined();
      expect(result.telemetry).toHaveLength(4);
    });
  });

  describe('Schema Validation', () => {
    beforeEach(() => {
      requirements.set(PROJECT_ID, VERSION_ID, {
        exists: true,
        assumptionsApproved: true,
      });
    });

    it('fails if MarketingBlueprint validation fails', async () => {
      const router = createMockRouter();
      const routed = router.route({
        agentId: 'strategy-funnel-agent',
        estimatedInputTokens: 100,
        estimatedOutputTokens: 100,
      });
      const adapter = routed.adapter as MockLLMAdapter;

      // Register an invalid blueprint (missing required fields)
      adapter.registerResponse(
        'strategy-funnel-agent',
        JSON.stringify({
          result: { invalidField: true },
          assumptions: [],
          unknowns: [],
          next_actions: [],
        })
      );

      const orchestrator = new BuildOrchestrator({
        runnerConfig: {
          questionsPath: QUESTIONS_PATH,
          globalRules: [],
          router,
          enforceQC: false,
        },
        requirements,
      });

      const result = await orchestrator.execute(createDefaultInput());

      expect(result.status).toBe('error');
      expect(result.error).toContain('MarketingBlueprint validation failed');
    });

    it('fails if UXUISpec validation fails', async () => {
      const router = createMockRouter();
      const routed = router.route({
        agentId: 'strategy-funnel-agent',
        estimatedInputTokens: 100,
        estimatedOutputTokens: 100,
      });
      const adapter = routed.adapter as MockLLMAdapter;

      adapter.registerResponse(
        'strategy-funnel-agent',
        JSON.stringify(createMockBlueprintOutput())
      );
      adapter.registerResponse(
        'ux-design-agent',
        JSON.stringify({
          result: { routes: [], screens: [] }, // Invalid: empty arrays
          assumptions: [],
          unknowns: [],
          next_actions: [],
        })
      );

      const orchestrator = new BuildOrchestrator({
        runnerConfig: {
          questionsPath: QUESTIONS_PATH,
          globalRules: [],
          router,
          enforceQC: false,
        },
        requirements,
      });

      const result = await orchestrator.execute(createDefaultInput());

      expect(result.status).toBe('error');
      expect(result.error).toContain('UXUISpec validation failed');
    });

    it('fails if CopyPack validation fails', async () => {
      const router = createMockRouter();
      const routed = router.route({
        agentId: 'strategy-funnel-agent',
        estimatedInputTokens: 100,
        estimatedOutputTokens: 100,
      });
      const adapter = routed.adapter as MockLLMAdapter;

      adapter.registerResponse(
        'strategy-funnel-agent',
        JSON.stringify(createMockBlueprintOutput())
      );
      adapter.registerResponse(
        'ux-design-agent',
        JSON.stringify(createMockUXUISpecOutput())
      );
      adapter.registerResponse(
        'copy-messaging-agent',
        JSON.stringify({
          result: { screens: [] }, // Invalid: empty screens
          assumptions: [],
          unknowns: [],
          next_actions: [],
        })
      );

      const orchestrator = new BuildOrchestrator({
        runnerConfig: {
          questionsPath: QUESTIONS_PATH,
          globalRules: [],
          router,
          enforceQC: false,
        },
        requirements,
      });

      const result = await orchestrator.execute(createDefaultInput());

      expect(result.status).toBe('error');
      expect(result.error).toContain('CopyPack validation failed');
    });
  });
});

describe('assembleBuildPlan (Mode B Enforcement)', () => {
  const blueprint = MarketingBlueprintSchema.parse(createMockBlueprintOutput().result);
  const uiSpec = UXUISpecSchema.parse(createMockUXUISpecOutput().result);
  const copyPack = CopyPackSchema.parse(createMockCopyPackOutput().result);
  const qcReport = { approved: true, violations: [] as Array<{ severity: string; description: string; location: string }> };

  it('optional enhancements in BuildPlan.optional ONLY', () => {
    const plan = assembleBuildPlan('proj-1', 'v1', blueprint, uiSpec, copyPack, qcReport, []);

    expect(plan.core.blueprint.optionalEnhancements).toHaveLength(0);
    expect(plan.optional.enhancements.length).toBeGreaterThan(0);
    expect(plan.optional.enhancements).toEqual(blueprint.optionalEnhancements);
  });

  it('optional copy NOT in core.copyPack', () => {
    const plan = assembleBuildPlan('proj-1', 'v1', blueprint, uiSpec, copyPack, qcReport, []);

    expect(plan.core.copyPack.optionalCopy).toHaveLength(0);
    expect(plan.optional.copy.length).toBeGreaterThan(0);
    expect(plan.optional.copy).toEqual(copyPack.optionalCopy);
  });

  it('optional designs NOT in core.uiSpec', () => {
    const plan = assembleBuildPlan('proj-1', 'v1', blueprint, uiSpec, copyPack, qcReport, []);

    expect(plan.core.uiSpec.optionalDesigns).toHaveLength(0);
    expect(plan.optional.designs.length).toBeGreaterThan(0);
    expect(plan.optional.designs).toEqual(uiSpec.optionalDesigns);
  });

  it('approvalsNeeded lists all optional items with pending status', () => {
    const plan = assembleBuildPlan('proj-1', 'v1', blueprint, uiSpec, copyPack, qcReport, []);

    expect(plan.approvalsNeeded.length).toBe(blueprint.optionalEnhancements.length);
    for (const approval of plan.approvalsNeeded) {
      expect(approval.status).toBe('pending');
      expect(
        blueprint.optionalEnhancements.some(
          (e) => e.enhancementId === approval.enhancementId
        )
      ).toBe(true);
    }
  });

  it('tasks are generated from core screens', () => {
    const plan = assembleBuildPlan('proj-1', 'v1', blueprint, uiSpec, copyPack, qcReport, []);

    expect(plan.tasks.length).toBe(uiSpec.screens.length);
    for (const task of plan.tasks) {
      expect(task.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(task.testNotes.length).toBeGreaterThan(0);
    }
  });

  it('status is draft', () => {
    const plan = assembleBuildPlan('proj-1', 'v1', blueprint, uiSpec, copyPack, qcReport, []);
    expect(plan.status).toBe('draft');
  });

  it('includes QC report when provided', () => {
    const plan = assembleBuildPlan('proj-1', 'v1', blueprint, uiSpec, copyPack, qcReport, []);
    expect(plan.qcReport).toBeDefined();
    expect(plan.qcReport!.approved).toBe(true);
  });

  it('produces a schema-valid BuildPlan', () => {
    const plan = assembleBuildPlan('proj-1', 'v1', blueprint, uiSpec, copyPack, qcReport, []);
    expect(BuildPlanSchema.safeParse(plan).success).toBe(true);
  });
});

describe('InMemoryRequirementsProvider', () => {
  it('returns not-found for unknown project', async () => {
    const provider = new InMemoryRequirementsProvider();
    const result = await provider.getRequirements('unknown', 'v1');
    expect(result.exists).toBe(false);
    expect(result.assumptionsApproved).toBe(false);
  });

  it('returns stored requirements', async () => {
    const provider = new InMemoryRequirementsProvider();
    provider.set('proj-1', 'v1', {
      exists: true,
      assumptionsApproved: true,
      data: { goal: 'test' },
    });

    const result = await provider.getRequirements('proj-1', 'v1');
    expect(result.exists).toBe(true);
    expect(result.assumptionsApproved).toBe(true);
    expect(result.data).toEqual({ goal: 'test' });
  });
});
