import { describe, it, expect } from 'vitest';
import { PMEngine, withPMMetrics, type PMDataProvider } from './pm-engine.js';

function createMockProvider(overrides: Partial<PMDataProvider> = {}): PMDataProvider {
  return {
    getApprovedRequirementsCount: () => 5,
    getApprovedAssumptionsCount: () => 3,
    getPendingAssumptionsCount: () => 0,
    hasDecisions: () => true,
    hasProposal: () => true,
    isLatestProposalReviewApproved: () => true,
    getBudgetStatus: () => ({ configured: true, exceeded: false, totalSpend: 100, budgetLimit: 1000 }),
    getTaskRunStats: () => ({
      total: 10, completed: 8, failed: 2, totalCostUsd: 50.0,
      last24hCostUsd: 5.0, failedLast24h: [],
    }),
    getEventQueueHealth: () => ({
      pendingCount: 0, lastProcessedAt: new Date().toISOString(), failedCount: 0, totalCount: 20,
    }),
    areIntegrationsHealthy: () => true,
    ...overrides,
  };
}

describe('PMEngine — computeReadiness', () => {
  it('INTAKE always returns READY regardless of gates', () => {
    const provider = createMockProvider({
      getApprovedRequirementsCount: () => 0,
      getPendingAssumptionsCount: () => 5,
      hasProposal: () => false,
    });
    const engine = new PMEngine(provider);
    const report = engine.computeReadiness('proj-1', 'INTAKE');
    expect(report.status).toBe('READY');
  });

  it('PROPOSAL is BLOCKED without approved requirements', () => {
    const provider = createMockProvider({
      getApprovedRequirementsCount: () => 0,
    });
    const engine = new PMEngine(provider);
    const report = engine.computeReadiness('proj-1', 'PROPOSAL');
    expect(report.status).toBe('BLOCKED');
  });

  it('PROPOSAL is NEEDS_HUMAN with pending assumptions', () => {
    const provider = createMockProvider({
      getApprovedRequirementsCount: () => 5,
      getPendingAssumptionsCount: () => 2,
    });
    const engine = new PMEngine(provider);
    const report = engine.computeReadiness('proj-1', 'PROPOSAL');
    expect(report.status).toBe('NEEDS_HUMAN');
  });

  it('PROPOSAL is READY when all gates pass', () => {
    const provider = createMockProvider();
    const engine = new PMEngine(provider);
    const report = engine.computeReadiness('proj-1', 'PROPOSAL');
    expect(report.status).toBe('READY');
  });

  it('BUILD is BLOCKED without a proposal', () => {
    const provider = createMockProvider({
      hasProposal: () => false,
    });
    const engine = new PMEngine(provider);
    const report = engine.computeReadiness('proj-1', 'BUILD');
    expect(report.status).toBe('BLOCKED');
  });

  it('BUILD is NEEDS_HUMAN without proposal review approval', () => {
    const provider = createMockProvider({
      hasProposal: () => true,
      isLatestProposalReviewApproved: () => false,
    });
    const engine = new PMEngine(provider);
    const report = engine.computeReadiness('proj-1', 'BUILD');
    expect(report.status).toBe('NEEDS_HUMAN');
  });

  it('BUILD is BLOCKED when budget is exceeded', () => {
    const provider = createMockProvider({
      getBudgetStatus: () => ({ configured: true, exceeded: true, totalSpend: 1500, budgetLimit: 1000 }),
    });
    const engine = new PMEngine(provider);
    const report = engine.computeReadiness('proj-1', 'BUILD');
    expect(report.status).toBe('BLOCKED');
  });
});

describe('PMEngine — detectBlockers', () => {
  it('returns MISSING_APPROVAL when no approved requirements', () => {
    const provider = createMockProvider({
      getApprovedRequirementsCount: () => 0,
    });
    const engine = new PMEngine(provider);
    const blockers = engine.detectBlockers('proj-1');
    expect(blockers.some((b) => b.type === 'MISSING_APPROVAL' && b.message.includes('requirements'))).toBe(true);
  });

  it('returns MISSING_APPROVAL when pending assumptions exist', () => {
    const provider = createMockProvider({
      getPendingAssumptionsCount: () => 3,
    });
    const engine = new PMEngine(provider);
    const blockers = engine.detectBlockers('proj-1');
    expect(blockers.some((b) => b.type === 'MISSING_APPROVAL' && b.message.includes('assumption'))).toBe(true);
  });

  it('returns BUDGET_EXCEEDED when budget exceeded', () => {
    const provider = createMockProvider({
      getBudgetStatus: () => ({ configured: true, exceeded: true, totalSpend: 1500, budgetLimit: 1000 }),
    });
    const engine = new PMEngine(provider);
    const blockers = engine.detectBlockers('proj-1');
    expect(blockers.some((b) => b.type === 'BUDGET_EXCEEDED')).toBe(true);
  });

  it('returns REPEATED_FAILURE when same error occurs >= 3 times in 24h', () => {
    const provider = createMockProvider({
      getTaskRunStats: () => ({
        total: 10, completed: 5, failed: 5, totalCostUsd: 50.0,
        last24hCostUsd: 10.0,
        failedLast24h: [{ error: 'timeout', count: 4 }],
      }),
    });
    const engine = new PMEngine(provider);
    const blockers = engine.detectBlockers('proj-1');
    expect(blockers.some((b) => b.type === 'REPEATED_FAILURE')).toBe(true);
  });

  it('returns STALE_QUEUE when last processed > 60 minutes ago', () => {
    const staleTime = new Date(Date.now() - 120 * 60 * 1000).toISOString(); // 120 min ago
    const provider = createMockProvider({
      getEventQueueHealth: () => ({
        pendingCount: 5, lastProcessedAt: staleTime, failedCount: 2, totalCount: 20,
      }),
    });
    const engine = new PMEngine(provider);
    const blockers = engine.detectBlockers('proj-1');
    expect(blockers.some((b) => b.type === 'STALE_QUEUE')).toBe(true);
  });

  it('returns INTEGRATION_DOWN when integrations are unhealthy', () => {
    const provider = createMockProvider({
      areIntegrationsHealthy: () => false,
    });
    const engine = new PMEngine(provider);
    const blockers = engine.detectBlockers('proj-1');
    expect(blockers.some((b) => b.type === 'INTEGRATION_DOWN')).toBe(true);
  });
});

describe('PMEngine — computeOpsSummary', () => {
  it('returns correct structure with completion, costs, health, topBlockers', () => {
    const provider = createMockProvider();
    const engine = new PMEngine(provider);
    const summary = engine.computeOpsSummary('proj-1', 'BUILD');

    expect(summary.projectId).toBe('proj-1');
    expect(summary.phase).toBe('BUILD');
    expect(summary.completion).toEqual({
      percent: 80,
      completedTasks: 8,
      totalTasks: 10,
    });
    expect(summary.costs.totalUsd).toBe(50.0);
    expect(summary.costs.last24hUsd).toBe(5.0);
    expect(summary.health.queueDepth).toBe(0);
    expect(Array.isArray(summary.topBlockers)).toBe(true);
  });

  it('computes errorRate correctly (2 failed / 10 total = 0.2)', () => {
    const provider = createMockProvider({
      getTaskRunStats: () => ({
        total: 10, completed: 8, failed: 2, totalCostUsd: 50.0,
        last24hCostUsd: 5.0, failedLast24h: [],
      }),
    });
    const engine = new PMEngine(provider);
    const summary = engine.computeOpsSummary('proj-1', 'BUILD');
    expect(summary.health.errorRate).toBe(0.2);
  });
});

describe('PMEngine — computeNextActions', () => {
  it('REQUIREMENTS shows human review action when requirements not approved', () => {
    const provider = createMockProvider({
      getApprovedRequirementsCount: () => 0,
    });
    const engine = new PMEngine(provider);
    const report = engine.computeReadiness('proj-1', 'REQUIREMENTS');
    expect(report.nextAllowedActions.some(
      (a) => a.owner === 'human' && a.action.toLowerCase().includes('review') && a.action.toLowerCase().includes('requirements')
    )).toBe(true);
  });

  it('PROPOSAL shows agent generate action when no proposal exists', () => {
    const provider = createMockProvider({
      hasProposal: () => false,
    });
    const engine = new PMEngine(provider);
    const report = engine.computeReadiness('proj-1', 'PROPOSAL');
    expect(report.nextAllowedActions.some(
      (a) => a.owner === 'agent' && a.action.toLowerCase().includes('generate')
    )).toBe(true);
  });
});

describe('withPMMetrics', () => {
  it('wraps computation with timing and returns metrics', () => {
    const provider = createMockProvider();
    const engine = new PMEngine(provider);

    const { result, metrics } = withPMMetrics('proj-1', 'BUILD', () =>
      engine.computeOpsSummary('proj-1', 'BUILD')
    );

    expect(result.projectId).toBe('proj-1');
    expect(metrics.projectId).toBe('proj-1');
    expect(metrics.phase).toBe('BUILD');
    expect(typeof metrics.durationMs).toBe('number');
    expect(metrics.durationMs).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(metrics.blockerTypes)).toBe(true);
    expect(typeof metrics.blockerCount).toBe('number');
  });
});
