/**
 * Proposal Orchestrator Tests
 *
 * Covers governance gates, Strapi availability, full pipeline execution,
 * QC blocking, proposal storage, version incrementing, CRM action builders,
 * and public ID generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ProposalOrchestrator,
  InMemoryProposalStrapiProvider,
  InMemoryProposalStore,
  generatePublicId,
  buildProposalSentCRMAction,
  buildProposalApprovedCRMAction,
  type ProposalOrchestratorInput,
} from './proposal-orchestrator.js';
import { InMemoryRequirementsProvider } from './build-orchestrator.js';
import { MockLLMAdapter } from './mock-llm.js';
import { LLMRouter } from './llm-router.js';
import {
  createMockProposalJsonOutput,
  createMockProposalUiSpecOutput,
  createMockProposalQCPassOutput,
  createMockProposalQCBlockOutput,
} from './proposal-mocks.js';
import type { ProposalJson, ProposalUiSpecJson } from './proposal-schemas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS_PATH = join(__dirname, '../../../../agency-questions/questions');

// ─── Helper: create a MockLLMAdapter with proposal pipeline responses ────────

function createProposalMockAdapter(): MockLLMAdapter {
  const adapter = new MockLLMAdapter();

  // Step 1 — ProposalStrategistAgent: prompt will contain "proposal-strategist-agent"
  adapter.registerResponse(
    'proposal-strategist-agent',
    JSON.stringify(createMockProposalJsonOutput()),
  );

  // Step 2 — UXDesignAgent (conversion mode): prompt will contain "proposal-ux-conversion"
  adapter.registerResponse(
    'proposal-ux-conversion',
    JSON.stringify(createMockProposalUiSpecOutput()),
  );

  // Step 3 — QualityControlAgent: prompt will contain "proposal-qc-validation"
  adapter.registerResponse(
    'proposal-qc-validation',
    JSON.stringify(createMockProposalQCPassOutput()),
  );

  return adapter;
}

function createRouterWithAdapter(adapter: MockLLMAdapter): LLMRouter {
  return new LLMRouter({
    adapters: {
      mock: adapter,
      'claude-3-sonnet': adapter,
      'claude-3-haiku': adapter,
      'gpt-4': adapter,
      'gpt-4o-mini': adapter,
    },
    defaultModel: 'mock',
    enableDowngrade: true,
    enableCrossProviderFallback: true,
  });
}

// ─── Standard test fixtures ──────────────────────────────────────────────────

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';
const REQUIREMENTS_VERSION_ID = '660e8400-e29b-41d4-a716-446655440001';

function createStandardInput(): ProposalOrchestratorInput {
  return {
    projectId: PROJECT_ID,
    requirementsVersionId: REQUIREMENTS_VERSION_ID,
    clientContext: {
      industry: 'SaaS',
      goal: 'Generate qualified leads',
      companySize: '10-50',
    },
  };
}

function createApprovedRequirements(): InMemoryRequirementsProvider {
  const reqs = new InMemoryRequirementsProvider();
  reqs.set(PROJECT_ID, REQUIREMENTS_VERSION_ID, {
    exists: true,
    assumptionsApproved: true,
    data: { summary: 'Approved requirements for SaaS lead gen project' },
  });
  return reqs;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProposalOrchestrator', () => {
  let mockAdapter: MockLLMAdapter;
  let router: LLMRouter;
  let requirementsProvider: InMemoryRequirementsProvider;
  let strapiProvider: InMemoryProposalStrapiProvider;
  let proposalStore: InMemoryProposalStore;

  beforeEach(() => {
    mockAdapter = createProposalMockAdapter();
    router = createRouterWithAdapter(mockAdapter);
    requirementsProvider = createApprovedRequirements();
    strapiProvider = new InMemoryProposalStrapiProvider();
    proposalStore = new InMemoryProposalStore();
  });

  function createOrchestrator(): ProposalOrchestrator {
    return new ProposalOrchestrator({
      runnerConfig: {
        questionsPath: QUESTIONS_PATH,
        globalRules: [],
        router,
      },
      requirements: requirementsProvider,
      strapiProvider,
      proposalStore,
    });
  }

  // ── 1. Cannot generate without approved requirements ──

  it('returns error when requirements do not exist', async () => {
    // Override: set requirements as non-existent
    requirementsProvider.set(PROJECT_ID, REQUIREMENTS_VERSION_ID, {
      exists: false,
      assumptionsApproved: false,
    });

    const orchestrator = createOrchestrator();
    const result = await orchestrator.generate(createStandardInput());

    expect(result.status).toBe('error');
    expect(result.error).toContain('Requirements not found');
    expect(result.proposalJson).toBeUndefined();
    expect(result.proposalUiSpecJson).toBeUndefined();
  });

  // ── 2. Cannot generate without approved assumptions ──

  it('returns error when assumptions are not approved', async () => {
    requirementsProvider.set(PROJECT_ID, REQUIREMENTS_VERSION_ID, {
      exists: true,
      assumptionsApproved: false,
    });

    const orchestrator = createOrchestrator();
    const result = await orchestrator.generate(createStandardInput());

    expect(result.status).toBe('error');
    expect(result.error).toContain('assumptions must be approved');
    expect(result.proposalJson).toBeUndefined();
  });

  // ── 3. Blocks when Strapi unavailable ──

  it('returns blocked status when Strapi is unavailable', async () => {
    strapiProvider.setAvailable(false);

    const orchestrator = createOrchestrator();
    const result = await orchestrator.generate(createStandardInput());

    expect(result.status).toBe('blocked');
    expect(result.blockReason).toBeDefined();
    expect(result.blockReason).toContain('Strapi');
    expect(result.proposalJson).toBeUndefined();
  });

  // ── 4. Generates proposal successfully ──

  it('generates proposal successfully through full pipeline', async () => {
    const orchestrator = createOrchestrator();
    const result = await orchestrator.generate(createStandardInput());

    expect(result.status).toBe('success');

    // proposalJson is populated and has correct structure
    expect(result.proposalJson).toBeDefined();
    expect(result.proposalJson!.meta.recommendedPlanId).toBe('plan-growth-001');
    expect(result.proposalJson!.scope.included.length).toBeGreaterThan(0);
    expect(result.proposalJson!.compliance.scopeLocked).toBe(true);
    expect(result.proposalJson!.compliance.noInventedProof).toBe(true);
    expect(result.proposalJson!.compliance.noOutcomePromises).toBe(true);
    expect(result.proposalJson!.pricing.planName).toBe('Growth');

    // proposalUiSpecJson is populated and has correct structure
    expect(result.proposalUiSpecJson).toBeDefined();
    expect(result.proposalUiSpecJson!.layout).toBe('multi-section');
    expect(result.proposalUiSpecJson!.stickyCta).toBe(true);
    expect(result.proposalUiSpecJson!.ctaRequiresLogin).toBe(true);
    expect(result.proposalUiSpecJson!.sections.length).toBeGreaterThan(0);

    // publicId is returned
    expect(result.publicId).toBeDefined();
    expect(typeof result.publicId).toBe('string');
    expect(result.publicId!.length).toBe(32);

    // telemetry entries exist for all pipeline steps
    expect(result.telemetry.length).toBe(3);
    expect(result.telemetry[0]!.step).toBe('strategist');
    expect(result.telemetry[1]!.step).toBe('ux-conversion');
    expect(result.telemetry[2]!.step).toBe('qc-validation');
  });

  // ── 5. QC blocks invalid proposal ──

  it('returns blocked status when QC rejects the proposal', async () => {
    // Override the QC step to return a rejection
    mockAdapter.clearResponses();

    // Re-register strategist and UX with passing outputs
    mockAdapter.registerResponse(
      'proposal-strategist-agent',
      JSON.stringify(createMockProposalJsonOutput()),
    );
    mockAdapter.registerResponse(
      'proposal-ux-conversion',
      JSON.stringify(createMockProposalUiSpecOutput()),
    );

    // Register QC with a blocking output
    mockAdapter.registerResponse(
      'proposal-qc-validation',
      JSON.stringify(createMockProposalQCBlockOutput()),
    );

    const orchestrator = createOrchestrator();
    const result = await orchestrator.generate(createStandardInput());

    expect(result.status).toBe('blocked');
    expect(result.blockReason).toBeDefined();
    expect(result.blockReason).toContain('Compliance violation');
    expect(result.proposalJson).toBeUndefined();
    expect(result.proposalUiSpecJson).toBeUndefined();
  });

  // ── 6. Proposal stored as DRAFT ──

  it('stores proposal with DRAFT status after successful generation', async () => {
    const orchestrator = createOrchestrator();
    const result = await orchestrator.generate(createStandardInput());

    expect(result.status).toBe('success');

    const storedProposals = proposalStore.getByProject(PROJECT_ID);
    expect(storedProposals).toHaveLength(1);

    const stored = storedProposals[0]!;
    expect(stored.status).toBe('DRAFT');
    expect(stored.projectId).toBe(PROJECT_ID);
    expect(stored.requirementsVersionId).toBe(REQUIREMENTS_VERSION_ID);
    expect(stored.publicId).toBe(result.publicId);
    expect(stored.proposalJson).toEqual(result.proposalJson);
    expect(stored.proposalUiSpecJson).toEqual(result.proposalUiSpecJson);
    expect(stored.versionNumber).toBe(1);
    expect(stored.createdAt).toBeDefined();
  });

  // ── 7. Version number increments ──

  it('increments version number on subsequent generations', async () => {
    const orchestrator = createOrchestrator();

    // First generation
    const result1 = await orchestrator.generate(createStandardInput());
    expect(result1.status).toBe('success');

    // Second generation
    const result2 = await orchestrator.generate(createStandardInput());
    expect(result2.status).toBe('success');

    const storedProposals = proposalStore.getByProject(PROJECT_ID);
    expect(storedProposals).toHaveLength(2);

    const versions = storedProposals.map((p) => p.versionNumber).sort((a, b) => a - b);
    expect(versions).toEqual([1, 2]);

    // Public IDs should be different
    expect(result1.publicId).not.toBe(result2.publicId);
  });

  // ── Telemetry is populated for each step ──

  it('populates telemetry with token counts and cost data', async () => {
    const orchestrator = createOrchestrator();
    const result = await orchestrator.generate(createStandardInput());

    expect(result.status).toBe('success');

    for (const entry of result.telemetry) {
      expect(entry.agentId).toBeDefined();
      expect(entry.durationMs).toBeGreaterThanOrEqual(0);
      expect(entry.inputTokens).toBeGreaterThanOrEqual(0);
      expect(entry.outputTokens).toBeGreaterThanOrEqual(0);
      expect(typeof entry.cost).toBe('number');
      expect(entry.model).toBeDefined();
    }
  });

  // ── Error telemetry is empty on governance failures ──

  it('returns empty telemetry array on governance gate failures', async () => {
    requirementsProvider.set(PROJECT_ID, REQUIREMENTS_VERSION_ID, {
      exists: false,
      assumptionsApproved: false,
    });

    const orchestrator = createOrchestrator();
    const result = await orchestrator.generate(createStandardInput());

    expect(result.status).toBe('error');
    expect(result.telemetry).toEqual([]);
  });
});

// ─── CRM Action Builders ───────────────────────────────────────────────────

describe('CRM Action Builders', () => {
  const projectId = '550e8400-e29b-41d4-a716-446655440000';
  const proposalVersionId = '770e8400-e29b-41d4-a716-446655440002';

  it('buildProposalSentCRMAction returns correct structure', () => {
    const action = buildProposalSentCRMAction(projectId, proposalVersionId);

    expect(action.event).toBe('proposal.sent');
    expect(action.projectId).toBe(projectId);
    expect(action.proposalVersionId).toBe(proposalVersionId);
    expect(action.crmActions.moveStage).toBe('Proposal sent');
    expect(action.crmActions.addNote).toContain(proposalVersionId);
    expect(action.crmActions.addTags).toContain('proposal-sent');
  });

  it('buildProposalApprovedCRMAction returns correct structure', () => {
    const action = buildProposalApprovedCRMAction(projectId, proposalVersionId);

    expect(action.event).toBe('proposal.approved');
    expect(action.projectId).toBe(projectId);
    expect(action.proposalVersionId).toBe(proposalVersionId);
    expect(action.crmActions.moveStage).toBe('Won');
    expect(action.crmActions.triggerWorkflow).toBe('proposal-won-notification');
    expect(action.crmActions.addNote).toContain(proposalVersionId);
  });
});

// ─── Public ID Generator ────────────────────────────────────────────────────

describe('generatePublicId', () => {
  it('returns a 32-character hex string with no dashes', () => {
    const id = generatePublicId();

    expect(id).toHaveLength(32);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(id).not.toContain('-');
  });

  it('generates unique IDs on successive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generatePublicId());
    }
    // All 100 IDs should be unique
    expect(ids.size).toBe(100);
  });
});

// ─── InMemoryProposalStore ──────────────────────────────────────────────────

describe('InMemoryProposalStore', () => {
  let store: InMemoryProposalStore;

  beforeEach(() => {
    store = new InMemoryProposalStore();
  });

  it('getLatestVersion returns 0 for unknown project', () => {
    expect(store.getLatestVersion('unknown-project')).toBe(0);
  });

  it('getLatestVersion returns highest version number', () => {
    const proposalBase = {
      projectId: PROJECT_ID,
      requirementsVersionId: REQUIREMENTS_VERSION_ID,
      status: 'DRAFT' as const,
      publicId: 'abc123',
      proposalJson: createMockProposalJsonOutput().result as ProposalJson,
      proposalUiSpecJson: createMockProposalUiSpecOutput().result as ProposalUiSpecJson,
    };

    store.createProposal({ ...proposalBase, versionNumber: 1, publicId: 'id1' });
    store.createProposal({ ...proposalBase, versionNumber: 2, publicId: 'id2' });
    store.createProposal({ ...proposalBase, versionNumber: 3, publicId: 'id3' });

    expect(store.getLatestVersion(PROJECT_ID)).toBe(3);
  });

  it('updateStatus changes proposal status', () => {
    const proposalBase = {
      projectId: PROJECT_ID,
      requirementsVersionId: REQUIREMENTS_VERSION_ID,
      versionNumber: 1,
      status: 'DRAFT' as const,
      publicId: 'test-public-id',
      proposalJson: createMockProposalJsonOutput().result as ProposalJson,
      proposalUiSpecJson: createMockProposalUiSpecOutput().result as ProposalUiSpecJson,
    };

    const created = store.createProposal(proposalBase);
    const updated = store.updateStatus(created.id, 'SENT');

    expect(updated).toBeDefined();
    expect(updated!.status).toBe('SENT');

    // Verify via getById
    const fetched = store.getById(created.id);
    expect(fetched!.status).toBe('SENT');
  });

  it('getByPublicId retrieves proposal by public ID', () => {
    const proposalBase = {
      projectId: PROJECT_ID,
      requirementsVersionId: REQUIREMENTS_VERSION_ID,
      versionNumber: 1,
      status: 'DRAFT' as const,
      publicId: 'unique-public-id-123',
      proposalJson: createMockProposalJsonOutput().result as ProposalJson,
      proposalUiSpecJson: createMockProposalUiSpecOutput().result as ProposalUiSpecJson,
    };

    store.createProposal(proposalBase);
    const found = store.getByPublicId('unique-public-id-123');

    expect(found).toBeDefined();
    expect(found!.publicId).toBe('unique-public-id-123');
  });
});
