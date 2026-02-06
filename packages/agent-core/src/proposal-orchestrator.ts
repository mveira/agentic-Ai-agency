/**
 * Proposal Orchestrator
 *
 * Coordinates the proposal generation pipeline:
 * 1. ProposalStrategistAgent → proposalJson
 * 2. UXDesignAgent (conversion mode) → proposalUiSpecJson
 * 3. QualityControlAgent → validation
 *
 * Enforces governance gates, Strapi availability, and emits CRM action contracts.
 */

import { randomUUID } from 'node:crypto';
import type { SpecializedRunnerConfig, SpecializedRunResult } from './specialized-runner.js';
import { SpecializedAgentRunner } from './specialized-runner.js';
import type { RequirementsProvider } from './build-orchestrator.js';
import {
  ProposalJsonSchema,
  ProposalUiSpecJsonSchema,
  type ProposalJson,
  type ProposalUiSpecJson,
  type ProposalStrapiProvider,
  type ProposalCRMSentAction,
  type ProposalCRMApprovedAction,
} from './proposal-schemas.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProposalOrchestratorInput {
  projectId: string;
  requirementsVersionId: string;
  clientContext?: {
    industry?: string;
    goal?: string;
    companySize?: string;
  };
}

export interface ProposalTelemetryEntry {
  step: string;
  agentId: string;
  durationMs: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  model: string;
}

export interface ProposalOrchestratorResult {
  status: 'success' | 'blocked' | 'error';
  proposalJson?: ProposalJson;
  proposalUiSpecJson?: ProposalUiSpecJson;
  publicId?: string;
  blockReason?: string;
  error?: string;
  telemetry: ProposalTelemetryEntry[];
}

// ─── Pipeline Steps ─────────────────────────────────────────────────────────

interface ProposalPipelineStep {
  stepName: string;
  agentId: string;
  taskType: string;
  prompt: string;
}

const PROPOSAL_PIPELINE_STEPS: ProposalPipelineStep[] = [
  {
    stepName: 'strategist',
    agentId: 'proposal-strategist-agent',
    taskType: 'proposal-strategy',
    prompt: 'Generate a scope-locked proposal with pricing plan recommendation and compliance flags',
  },
  {
    stepName: 'ux-conversion',
    agentId: 'ux-design-agent',
    taskType: 'proposal-ux-conversion',
    prompt: 'Create a conversion-focused UI specification for the proposal with sticky CTA and progressive disclosure',
  },
  {
    stepName: 'qc-validation',
    agentId: 'quality-control-agent',
    taskType: 'proposal-qc-validation',
    prompt: 'Validate proposal: all scope items reference requirementIds, add-ons not in core, pricing matches packages, compliance flags true',
  },
];

// ─── Public ID Generator ────────────────────────────────────────────────────

/**
 * Generates an unguessable public ID for proposal sharing.
 * Default implementation uses crypto.randomUUID.
 */
export function generatePublicId(): string {
  return randomUUID().replace(/-/g, '');
}

// ─── CRM Action Builders ───────────────────────────────────────────────────

export function buildProposalSentCRMAction(
  projectId: string,
  proposalVersionId: string
): ProposalCRMSentAction {
  return {
    event: 'proposal.sent',
    projectId,
    proposalVersionId,
    crmActions: {
      moveStage: 'Proposal sent',
      addNote: `Proposal ${proposalVersionId} sent to client`,
      addTags: ['proposal-sent'],
    },
  };
}

export function buildProposalApprovedCRMAction(
  projectId: string,
  proposalVersionId: string
): ProposalCRMApprovedAction {
  return {
    event: 'proposal.approved',
    projectId,
    proposalVersionId,
    crmActions: {
      moveStage: 'Won',
      triggerWorkflow: 'proposal-won-notification',
      addNote: `Proposal ${proposalVersionId} approved by client`,
    },
  };
}

// ─── In-Memory Strapi Provider (for testing) ────────────────────────────────

export class InMemoryProposalStrapiProvider implements ProposalStrapiProvider {
  private available = true;

  setAvailable(available: boolean): void {
    this.available = available;
  }

  async getPricingPackages() {
    if (!this.available) throw new Error('Strapi unavailable');
    return [
      {
        id: 'pkg-starter',
        name: 'Starter',
        tier: 'starter' as const,
        price: '2500',
        currency: 'GBP',
        features: ['Landing page', 'Basic funnel', 'Email sequence'],
      },
      {
        id: 'pkg-growth',
        name: 'Growth',
        tier: 'growth' as const,
        price: '5000',
        currency: 'GBP',
        features: ['Full funnel', 'CRM setup', 'Ad campaigns', 'Analytics'],
      },
      {
        id: 'pkg-scale',
        name: 'Scale',
        tier: 'scale' as const,
        price: '10000',
        currency: 'GBP',
        features: ['Custom platform', 'Advanced automation', 'Dedicated support', 'A/B testing'],
      },
    ];
  }

  async getProposalTemplates() {
    if (!this.available) throw new Error('Strapi unavailable');
    return [
      {
        id: 'tpl-default',
        name: 'Default Proposal',
        sectionOrder: ['hero', 'problem', 'solution', 'scope', 'pricing', 'timeline', 'cta'],
        defaults: {},
      },
    ];
  }

  async getPersuasionFrameworks() {
    if (!this.available) throw new Error('Strapi unavailable');
    return [
      {
        id: 'fw-ethical',
        name: 'Ethical Persuasion',
        principles: ['Transparency', 'Honesty', 'Value-first'],
        ethicalOnly: true as const,
      },
    ];
  }

  async getHormoziFramework() {
    if (!this.available) throw new Error('Strapi unavailable');
    return {
      id: 'hormozi-001',
      name: 'Value Equation',
      offerFramingRules: [
        'Dream Outcome > Perceived Likelihood > Time Delay > Effort & Sacrifice',
        'Price anchoring against outcome value',
        'Risk reversal via guarantee',
      ],
    };
  }

  async getTimelineRules() {
    if (!this.available) throw new Error('Strapi unavailable');
    return [
      { id: 'tr-landing', scopeType: 'landing-page', estimatedWeeks: 2 },
      { id: 'tr-funnel', scopeType: 'full-funnel', estimatedWeeks: 4 },
      { id: 'tr-platform', scopeType: 'custom-platform', estimatedWeeks: 8 },
    ];
  }
}

// ─── In-Memory Proposal Store (for testing) ─────────────────────────────────

export interface StoredProposal {
  id: string;
  projectId: string;
  requirementsVersionId: string;
  versionNumber: number;
  status: 'DRAFT' | 'IN_REVIEW' | 'SENT' | 'APPROVED' | 'EXPIRED';
  publicId: string;
  expiresAt?: string;
  proposalJson: ProposalJson;
  proposalUiSpecJson: ProposalUiSpecJson;
  createdAt: string;
}

export interface StoredProposalReview {
  id: string;
  proposalVersionId: string;
  status: 'APPROVED' | 'CHANGES_REQUESTED';
  notes?: string;
  reviewerUserId: string;
  createdAt: string;
}

export interface StoredProposalAction {
  id: string;
  proposalVersionId: string;
  action: 'SENT' | 'VIEWED' | 'APPROVED';
  metaJson?: Record<string, unknown>;
  createdAt: string;
}

export interface ProposalStore {
  createProposal(proposal: Omit<StoredProposal, 'id' | 'createdAt'>): StoredProposal;
  getById(id: string): StoredProposal | undefined;
  getByPublicId(publicId: string): StoredProposal | undefined;
  getByProject(projectId: string): StoredProposal[];
  updateStatus(id: string, status: StoredProposal['status']): StoredProposal | undefined;
  getLatestVersion(projectId: string): number;
  addReview(review: Omit<StoredProposalReview, 'id' | 'createdAt'>): StoredProposalReview;
  getReviews(proposalVersionId: string): StoredProposalReview[];
  getLatestReview(proposalVersionId: string): StoredProposalReview | undefined;
  addAction(action: Omit<StoredProposalAction, 'id' | 'createdAt'>): StoredProposalAction;
  getActions(proposalVersionId: string): StoredProposalAction[];
  clear(): void;
}

export class InMemoryProposalStore implements ProposalStore {
  private proposals: StoredProposal[] = [];
  private reviews: StoredProposalReview[] = [];
  private actions: StoredProposalAction[] = [];

  createProposal(proposal: Omit<StoredProposal, 'id' | 'createdAt'>): StoredProposal {
    const entry: StoredProposal = {
      ...proposal,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.proposals.push(entry);
    return entry;
  }

  getById(id: string): StoredProposal | undefined {
    return this.proposals.find((p) => p.id === id);
  }

  getByPublicId(publicId: string): StoredProposal | undefined {
    return this.proposals.find((p) => p.publicId === publicId);
  }

  getByProject(projectId: string): StoredProposal[] {
    return this.proposals.filter((p) => p.projectId === projectId);
  }

  updateStatus(id: string, status: StoredProposal['status']): StoredProposal | undefined {
    const proposal = this.proposals.find((p) => p.id === id);
    if (proposal) {
      proposal.status = status;
    }
    return proposal;
  }

  getLatestVersion(projectId: string): number {
    const projectProposals = this.proposals.filter((p) => p.projectId === projectId);
    if (projectProposals.length === 0) return 0;
    return Math.max(...projectProposals.map((p) => p.versionNumber));
  }

  addReview(review: Omit<StoredProposalReview, 'id' | 'createdAt'>): StoredProposalReview {
    const entry: StoredProposalReview = {
      ...review,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.reviews.push(entry);
    return entry;
  }

  getReviews(proposalVersionId: string): StoredProposalReview[] {
    return this.reviews.filter((r) => r.proposalVersionId === proposalVersionId);
  }

  getLatestReview(proposalVersionId: string): StoredProposalReview | undefined {
    const reviews = this.getReviews(proposalVersionId);
    if (reviews.length === 0) return undefined;
    return reviews[reviews.length - 1];
  }

  addAction(action: Omit<StoredProposalAction, 'id' | 'createdAt'>): StoredProposalAction {
    const entry: StoredProposalAction = {
      ...action,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.actions.push(entry);
    return entry;
  }

  getActions(proposalVersionId: string): StoredProposalAction[] {
    return this.actions.filter((a) => a.proposalVersionId === proposalVersionId);
  }

  clear(): void {
    this.proposals = [];
    this.reviews = [];
    this.actions = [];
  }
}

// ─── ProposalOrchestrator ───────────────────────────────────────────────────

export class ProposalOrchestrator {
  private runner: SpecializedAgentRunner;
  private requirements: RequirementsProvider;
  private strapiProvider: ProposalStrapiProvider;
  private proposalStore: ProposalStore;

  constructor(config: {
    runnerConfig: SpecializedRunnerConfig;
    requirements: RequirementsProvider;
    strapiProvider: ProposalStrapiProvider;
    proposalStore: ProposalStore;
  }) {
    this.runner = new SpecializedAgentRunner(config.runnerConfig);
    this.requirements = config.requirements;
    this.strapiProvider = config.strapiProvider;
    this.proposalStore = config.proposalStore;
  }

  async generate(input: ProposalOrchestratorInput): Promise<ProposalOrchestratorResult> {
    const telemetry: ProposalTelemetryEntry[] = [];

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
        error: 'All assumptions must be approved before generating a proposal',
        telemetry,
      };
    }

    // ── Load Strapi content ──
    let strapiContent;
    try {
      const [pricingPackages, proposalTemplates, persuasionFrameworks, hormoziFramework, timelineRules] =
        await Promise.all([
          this.strapiProvider.getPricingPackages(),
          this.strapiProvider.getProposalTemplates(),
          this.strapiProvider.getPersuasionFrameworks(),
          this.strapiProvider.getHormoziFramework(),
          this.strapiProvider.getTimelineRules(),
        ]);

      strapiContent = {
        pricingPackages,
        proposalTemplates,
        persuasionFrameworks,
        hormoziFramework,
        timelineRules,
      };
    } catch {
      return {
        status: 'blocked',
        blockReason: 'Strapi unavailable — cannot load proposal content',
        telemetry,
      };
    }

    // ── Step 1: ProposalStrategistAgent ──
    const strategistResult = await this.runPipelineStep(
      PROPOSAL_PIPELINE_STEPS[0]!,
      input,
      telemetry,
      { strapiContent, clientContext: input.clientContext }
    );

    if (!strategistResult.success || !strategistResult.output) {
      return {
        status: 'error',
        error: `Strategist agent failed: ${strategistResult.error}`,
        telemetry,
      };
    }

    const proposalParsed = ProposalJsonSchema.safeParse(strategistResult.output.result);
    if (!proposalParsed.success) {
      return {
        status: 'error',
        error: `ProposalJson validation failed: ${proposalParsed.error.message}`,
        telemetry,
      };
    }
    const proposalJson = proposalParsed.data;

    // ── Step 2: UXDesignAgent (conversion mode) ──
    const uxResult = await this.runPipelineStep(
      PROPOSAL_PIPELINE_STEPS[1]!,
      input,
      telemetry,
      { proposalJson }
    );

    if (!uxResult.success || !uxResult.output) {
      return {
        status: 'error',
        error: `UX conversion agent failed: ${uxResult.error}`,
        telemetry,
      };
    }

    const uiSpecParsed = ProposalUiSpecJsonSchema.safeParse(uxResult.output.result);
    if (!uiSpecParsed.success) {
      return {
        status: 'error',
        error: `ProposalUiSpecJson validation failed: ${uiSpecParsed.error.message}`,
        telemetry,
      };
    }
    const proposalUiSpecJson = uiSpecParsed.data;

    // ── Step 3: QualityControlAgent ──
    const qcResult = await this.runPipelineStep(
      PROPOSAL_PIPELINE_STEPS[2]!,
      input,
      telemetry,
      { proposalJson, proposalUiSpecJson, strapiContent }
    );

    if (!qcResult.success || !qcResult.output) {
      return {
        status: 'error',
        error: `QC validation agent failed: ${qcResult.error}`,
        telemetry,
      };
    }

    // Check QC result for blocking violations
    const qcOutput = qcResult.output.result as { approved?: boolean; blockReason?: string } | undefined;
    if (qcOutput && qcOutput.approved === false) {
      return {
        status: 'blocked',
        blockReason: qcOutput.blockReason ?? 'QC rejected the proposal',
        telemetry,
      };
    }

    // ── Store proposal as DRAFT ──
    const publicId = generatePublicId();
    const versionNumber = this.proposalStore.getLatestVersion(input.projectId) + 1;

    this.proposalStore.createProposal({
      projectId: input.projectId,
      requirementsVersionId: input.requirementsVersionId,
      versionNumber,
      status: 'DRAFT',
      publicId,
      proposalJson,
      proposalUiSpecJson,
    });

    return {
      status: 'success',
      proposalJson,
      proposalUiSpecJson,
      publicId,
      telemetry,
    };
  }

  private async runPipelineStep(
    step: ProposalPipelineStep,
    input: ProposalOrchestratorInput,
    telemetry: ProposalTelemetryEntry[],
    context?: Record<string, unknown>
  ): Promise<SpecializedRunResult> {
    const startTime = Date.now();

    const result = await this.runner.runAgent({
      agentId: step.agentId,
      task: {
        taskId: `proposal-${step.stepName}-${Date.now()}`,
        taskType: step.taskType,
        projectId: input.projectId,
        prompt: step.prompt,
        context: {
          ...context,
          requirementsVersionId: input.requirementsVersionId,
        },
      },
      input: {
        projectId: input.projectId,
        requirementsVersionId: input.requirementsVersionId,
        ...context,
      },
      skipQC: true, // Orchestrator manages QC as final step
    });

    const durationMs = Date.now() - startTime;

    telemetry.push({
      step: step.stepName,
      agentId: step.agentId,
      durationMs,
      tokensIn: result.telemetry.tokensIn,
      tokensOut: result.telemetry.tokensOut,
      cost: result.telemetry.cost,
      model: result.routedModel,
    });

    return result;
  }
}
