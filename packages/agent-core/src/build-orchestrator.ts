/**
 * Build Orchestrator
 *
 * Coordinates Marketing → UX → Copy → QC agents to produce a BuildPlan.
 * Enforces strict handoff schemas, governance gates, Mode B optional
 * enhancement policy, and telemetry recording.
 */

import { z } from 'zod';
import type { SpecializedRunnerConfig, SpecializedRunResult } from './specialized-runner.js';
import { SpecializedAgentRunner } from './specialized-runner.js';
import {
  MarketingBlueprintSchema,
  UXUISpecSchema,
  CopyPackSchema,
  QCReportSchema,
  type MarketingBlueprint,
  type UXUISpec,
  type CopyPack,
  type BuildPlan,
  type BuildTask,
} from './build-schemas.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export const BuildRequestSchema = z.object({
  type: z.string(),
  goal: z.string(),
  constraints: z.record(z.unknown()).optional(),
});

export type BuildRequest = z.infer<typeof BuildRequestSchema>;

export interface BuildOrchestratorInput {
  projectId: string;
  requirementsVersionId: string;
  buildRequest: BuildRequest;
}

export interface TelemetryEntry {
  step: string;
  agentId: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  model: string;
}

export interface BuildOrchestratorResult {
  status: 'success' | 'blocked' | 'error';
  buildPlan?: BuildPlan;
  blockReason?: string;
  error?: string;
  telemetry: TelemetryEntry[];
}

/**
 * Interface for checking project requirements and assumption approval.
 */
export interface RequirementsProvider {
  getRequirements(
    projectId: string,
    versionId: string
  ): Promise<{
    exists: boolean;
    assumptionsApproved: boolean;
    data?: Record<string, unknown>;
  }>;
}

/**
 * In-memory implementation for testing.
 */
export class InMemoryRequirementsProvider implements RequirementsProvider {
  private store: Map<
    string,
    { exists: boolean; assumptionsApproved: boolean; data?: Record<string, unknown> }
  > = new Map();

  set(
    projectId: string,
    versionId: string,
    value: { exists: boolean; assumptionsApproved: boolean; data?: Record<string, unknown> }
  ): void {
    this.store.set(`${projectId}:${versionId}`, value);
  }

  async getRequirements(
    projectId: string,
    versionId: string
  ): Promise<{
    exists: boolean;
    assumptionsApproved: boolean;
    data?: Record<string, unknown>;
  }> {
    return (
      this.store.get(`${projectId}:${versionId}`) ?? {
        exists: false,
        assumptionsApproved: false,
      }
    );
  }
}

// ─── Pipeline Steps ─────────────────────────────────────────────────────────

interface PipelineStep {
  stepName: string;
  agentId: string;
  taskType: string;
  prompt: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    stepName: 'marketing',
    agentId: 'strategy-funnel-agent',
    taskType: 'build-blueprint',
    prompt: 'Generate a marketing blueprint for the build plan',
  },
  {
    stepName: 'ux-design',
    agentId: 'ux-design-agent',
    taskType: 'build-ux-spec',
    prompt: 'Transform the marketing blueprint into a UX/UI specification',
  },
  {
    stepName: 'copy',
    agentId: 'copy-messaging-agent',
    taskType: 'build-copy-pack',
    prompt: 'Write copy for all screen slots defined in the UX/UI specification',
  },
  {
    stepName: 'qc',
    agentId: 'quality-control-agent',
    taskType: 'build-qc-review',
    prompt: 'Review all pipeline outputs for quality and compliance',
  },
];

// ─── BuildOrchestrator ──────────────────────────────────────────────────────

export class BuildOrchestrator {
  private runner: SpecializedAgentRunner;
  private requirements: RequirementsProvider;

  constructor(config: {
    runnerConfig: SpecializedRunnerConfig;
    requirements: RequirementsProvider;
  }) {
    this.runner = new SpecializedAgentRunner(config.runnerConfig);
    this.requirements = config.requirements;
  }

  async execute(input: BuildOrchestratorInput): Promise<BuildOrchestratorResult> {
    const telemetry: TelemetryEntry[] = [];

    // ── Governance gate ──
    const reqs = await this.requirements.getRequirements(
      input.projectId,
      input.requirementsVersionId
    );

    if (!reqs.exists) {
      return {
        status: 'error',
        error: `Requirements not found for project ${input.projectId} version ${input.requirementsVersionId}`,
        telemetry,
      };
    }

    if (!reqs.assumptionsApproved) {
      return {
        status: 'error',
        error: 'Assumptions have not been approved. Cannot proceed with build.',
        telemetry,
      };
    }

    // ── Step 1: Marketing Blueprint ──
    const blueprintResult = await this.runPipelineStep(
      PIPELINE_STEPS[0]!,
      input,
      telemetry
    );
    if (!blueprintResult.success || !blueprintResult.output) {
      return {
        status: 'error',
        error: `Marketing agent failed: ${blueprintResult.error}`,
        telemetry,
      };
    }

    const blueprintParsed = MarketingBlueprintSchema.safeParse(blueprintResult.output.result);
    if (!blueprintParsed.success) {
      return {
        status: 'error',
        error: `MarketingBlueprint validation failed: ${blueprintParsed.error.message}`,
        telemetry,
      };
    }
    const blueprint = blueprintParsed.data;

    // ── Step 2: UX Design ──
    const uxResult = await this.runPipelineStep(
      PIPELINE_STEPS[1]!,
      input,
      telemetry,
      { blueprint }
    );
    if (!uxResult.success || !uxResult.output) {
      return {
        status: 'error',
        error: `UX design agent failed: ${uxResult.error}`,
        telemetry,
      };
    }

    const uxParsed = UXUISpecSchema.safeParse(uxResult.output.result);
    if (!uxParsed.success) {
      return {
        status: 'error',
        error: `UXUISpec validation failed: ${uxParsed.error.message}`,
        telemetry,
      };
    }
    const uiSpec = uxParsed.data;

    // ── Step 3: Copy Messaging ──
    const copyResult = await this.runPipelineStep(
      PIPELINE_STEPS[2]!,
      input,
      telemetry,
      { blueprint, uiSpec }
    );
    if (!copyResult.success || !copyResult.output) {
      return {
        status: 'error',
        error: `Copy messaging agent failed: ${copyResult.error}`,
        telemetry,
      };
    }

    const copyParsed = CopyPackSchema.safeParse(copyResult.output.result);
    if (!copyParsed.success) {
      return {
        status: 'error',
        error: `CopyPack validation failed: ${copyParsed.error.message}`,
        telemetry,
      };
    }
    const copyPack = copyParsed.data;

    // ── Step 4: Quality Control ──
    const qcResult = await this.runPipelineStep(
      PIPELINE_STEPS[3]!,
      input,
      telemetry,
      { blueprint, uiSpec, copyPack }
    );
    if (!qcResult.success || !qcResult.output) {
      return {
        status: 'error',
        error: `QC agent failed: ${qcResult.error}`,
        telemetry,
      };
    }

    const qcParsed = QCReportSchema.safeParse(qcResult.output.result);
    if (qcParsed.success && !qcParsed.data.approved) {
      return {
        status: 'blocked',
        blockReason: qcParsed.data.blockReason ?? 'QC rejected the build plan',
        telemetry,
      };
    }

    // ── Assemble BuildPlan with Mode B enforcement ──
    const buildPlan = assembleBuildPlan(
      input.projectId,
      input.requirementsVersionId,
      blueprint,
      uiSpec,
      copyPack,
      qcParsed.success ? qcParsed.data : undefined,
      telemetry
    );

    return {
      status: 'success',
      buildPlan,
      telemetry,
    };
  }

  private async runPipelineStep(
    step: PipelineStep,
    input: BuildOrchestratorInput,
    telemetry: TelemetryEntry[],
    context?: Record<string, unknown>
  ): Promise<SpecializedRunResult> {
    const startTime = Date.now();

    const result = await this.runner.runAgent({
      agentId: step.agentId,
      task: {
        taskId: `build-${step.stepName}-${Date.now()}`,
        taskType: step.taskType,
        projectId: input.projectId,
        prompt: step.prompt,
        context: {
          ...context,
          buildRequest: input.buildRequest,
        },
      },
      input: {
        projectId: input.projectId,
        buildRequest: input.buildRequest,
        ...context,
      },
      skipQC: true, // Orchestrator manages QC as final step
    });

    const durationMs = Date.now() - startTime;

    telemetry.push({
      step: step.stepName,
      agentId: step.agentId,
      durationMs,
      inputTokens: result.telemetry.inputTokens,
      outputTokens: result.telemetry.outputTokens,
      cost: result.telemetry.cost,
      model: result.routedModel,
    });

    return result;
  }
}

// ─── Build Plan Assembly (Mode B Enforcement) ───────────────────────────────

/**
 * Assembles a BuildPlan with Mode B enforcement:
 * - Core tasks generated from core screens ONLY
 * - Optional enhancements → buildPlan.optional
 * - Optional copy stripped from core.copyPack
 * - approvalsNeeded lists all optional items with pending status
 */
export function assembleBuildPlan(
  projectId: string,
  requirementsVersion: string,
  blueprint: MarketingBlueprint,
  uiSpec: UXUISpec,
  copyPack: CopyPack,
  qcReport: { approved: boolean; violations: Array<{ severity: string; description: string; location: string }>; blockReason?: string } | undefined,
  telemetry: TelemetryEntry[]
): BuildPlan {
  // Strip optional copy from core
  const coreCopyPack: CopyPack = {
    screens: copyPack.screens,
    optionalCopy: [], // Optional copy goes to buildPlan.optional
  };

  // Core UI spec without optional designs
  const coreUiSpec: UXUISpec = {
    ...uiSpec,
    optionalDesigns: [], // Optional designs go to buildPlan.optional
  };

  // Core blueprint without optional enhancements listed inline
  const coreBlueprint: MarketingBlueprint = {
    ...blueprint,
    optionalEnhancements: [], // Enhancements go to buildPlan.optional
  };

  // Generate tasks from core screens only
  const tasks: BuildTask[] = generateTasksFromScreens(uiSpec.screens, coreCopyPack);

  // Collect all optional items
  const approvalsNeeded = blueprint.optionalEnhancements.map((enh) => ({
    enhancementId: enh.enhancementId,
    title: enh.title,
    status: 'pending' as const,
  }));

  return {
    projectId,
    requirementsVersion,
    status: 'draft',
    core: {
      blueprint: coreBlueprint,
      uiSpec: coreUiSpec,
      copyPack: coreCopyPack,
    },
    optional: {
      enhancements: blueprint.optionalEnhancements,
      designs: uiSpec.optionalDesigns,
      copy: copyPack.optionalCopy,
    },
    tasks,
    approvalsNeeded,
    qcReport: qcReport
      ? {
          approved: qcReport.approved,
          violations: qcReport.violations.map((v) => ({
            severity: v.severity as 'critical' | 'major' | 'minor' | 'suggestion',
            description: v.description,
            location: v.location,
          })),
          blockReason: qcReport.blockReason,
        }
      : undefined,
    telemetry,
  };
}

function generateTasksFromScreens(
  screens: UXUISpec['screens'],
  copyPack: CopyPack
): BuildTask[] {
  return screens.map((screen, index) => {
    const screenCopy = copyPack.screens.find((s) => s.screenId === screen.screenId);
    const copyCount = screenCopy?.copies.length ?? 0;

    return {
      taskId: `task-${screen.screenId}`,
      title: `Build ${screen.name}`,
      description: `Implement the ${screen.name} screen at route ${screen.route} with ${screen.components.length} components and ${copyCount} copy slots`,
      type: 'page' as const,
      acceptanceCriteria: [
        `Screen renders at route ${screen.route}`,
        `All ${screen.components.length} components are functional`,
        `All ${copyCount} copy slots display correct content`,
        'Accessibility rules are met',
      ],
      testNotes: [
        `Visual regression test for ${screen.name}`,
        `Component unit tests for ${screen.components.map((c) => c.componentId).join(', ')}`,
      ],
      dependencies: index > 0 ? [`task-${screens[index - 1]!.screenId}`] : [],
    };
  });
}
