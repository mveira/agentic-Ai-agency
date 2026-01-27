/**
 * Project Management Engine
 *
 * Deterministic, read-only computation engine for:
 * - Phase readiness (can we proceed?)
 * - Blocker detection (what's stopping us?)
 * - Ops summary (costs, health, completion)
 *
 * This is NOT an LLM agent — all outputs are deterministic from stored state.
 */

import type {
  ProjectPhase,
  ReadinessStatus,
  ProjectReadinessReport,
  Blocker,
  ProjectOpsSummary,
  NextAllowedAction,
  SuggestedAutomation,
  Gates,
} from './pm-schemas.js';

// ─── Data Provider Interface ────────────────────────────────────────────────

/** Abstracts all store reads needed by the PM engine. */
export interface PMDataProvider {
  /** Count of approved requirements for project */
  getApprovedRequirementsCount(projectId: string): number;

  /** Count of approved assumptions for project */
  getApprovedAssumptionsCount(projectId: string): number;

  /** Count of pending (non-approved, non-rejected) assumptions */
  getPendingAssumptionsCount(projectId: string): number;

  /** Whether a decision KB entry exists for this project */
  hasDecisions(projectId: string): boolean;

  /** Whether a proposal exists for this project */
  hasProposal(projectId: string): boolean;

  /** Whether the latest proposal review is APPROVED */
  isLatestProposalReviewApproved(projectId: string): boolean;

  /** Project budget info; null if no budget configured */
  getBudgetStatus(projectId: string): {
    configured: boolean;
    exceeded: boolean;
    totalSpend: number;
    budgetLimit: number | null;
  };

  /** Task run stats for the project */
  getTaskRunStats(projectId: string): {
    total: number;
    completed: number;
    failed: number;
    totalCostUsd: number;
    last24hCostUsd: number;
    failedLast24h: { error: string; count: number }[];
  };

  /** Event queue health */
  getEventQueueHealth(projectId: string): {
    pendingCount: number;
    lastProcessedAt: string | null;
    failedCount: number;
    totalCount: number;
  };

  /** Whether integrations are healthy (e.g., Strapi) */
  areIntegrationsHealthy(): boolean;
}

// ─── Configuration ──────────────────────────────────────────────────────────

export interface PMEngineConfig {
  /** Max times the same error can recur in 24h before it's a blocker (default 3) */
  repeatedFailureThreshold?: number;
  /** Max minutes since last event processed before stale queue blocker (default 60) */
  staleQueueMinutes?: number;
}

const DEFAULT_CONFIG: Required<PMEngineConfig> = {
  repeatedFailureThreshold: 3,
  staleQueueMinutes: 60,
};

// ─── PM Engine ──────────────────────────────────────────────────────────────

export class PMEngine {
  private provider: PMDataProvider;
  private config: Required<PMEngineConfig>;

  constructor(provider: PMDataProvider, config?: PMEngineConfig) {
    this.provider = provider;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Readiness ──────────────────────────────────────────────────────────

  computeReadiness(projectId: string, phase: ProjectPhase): ProjectReadinessReport {
    const gates = this.computeGates(projectId, phase);
    const blockers = this.detectBlockers(projectId);
    const phaseBlockers = this.filterBlockersForPhase(blockers, phase);

    const { status, reasons } = this.evaluateReadiness(phase, gates, phaseBlockers);
    const nextAllowedActions = this.computeNextActions(phase, gates, status);
    const suggestedAutomations = this.computeSuggestedAutomations(phase, gates, status);

    return {
      projectId,
      phase,
      status,
      reasons,
      gates,
      nextAllowedActions,
      suggestedAutomations,
      updatedAt: new Date().toISOString(),
    };
  }

  // ── Blockers ───────────────────────────────────────────────────────────

  detectBlockers(projectId: string): Blocker[] {
    const blockers: Blocker[] = [];

    // Check missing approvals
    const approvedReqs = this.provider.getApprovedRequirementsCount(projectId);
    const pendingAssumptions = this.provider.getPendingAssumptionsCount(projectId);

    if (approvedReqs === 0) {
      blockers.push({
        type: 'MISSING_APPROVAL',
        severity: 'high',
        message: 'No approved requirements. Requirements must be reviewed and approved.',
      });
    }

    if (pendingAssumptions > 0) {
      blockers.push({
        type: 'MISSING_APPROVAL',
        severity: 'medium',
        message: `${pendingAssumptions} assumption(s) pending approval.`,
      });
    }

    // Check budget
    const budget = this.provider.getBudgetStatus(projectId);
    if (budget.configured && budget.exceeded) {
      blockers.push({
        type: 'BUDGET_EXCEEDED',
        severity: 'critical',
        message: `Budget exceeded: spent $${budget.totalSpend.toFixed(2)} of $${budget.budgetLimit?.toFixed(2)} limit.`,
      });
    }

    // Check repeated failures
    const taskStats = this.provider.getTaskRunStats(projectId);
    for (const failure of taskStats.failedLast24h) {
      if (failure.count >= this.config.repeatedFailureThreshold) {
        blockers.push({
          type: 'REPEATED_FAILURE',
          severity: 'high',
          message: `Repeated failure (${failure.count}x in 24h): ${failure.error}`,
        });
      }
    }

    // Check stale queue
    const queueHealth = this.provider.getEventQueueHealth(projectId);
    if (queueHealth.lastProcessedAt) {
      const lastProcessed = new Date(queueHealth.lastProcessedAt);
      const minutesAgo = (Date.now() - lastProcessed.getTime()) / (1000 * 60);
      if (minutesAgo > this.config.staleQueueMinutes) {
        blockers.push({
          type: 'STALE_QUEUE',
          severity: 'medium',
          message: `Event queue stale: last processed ${Math.round(minutesAgo)} minutes ago.`,
        });
      }
    }

    // Check integrations
    if (!this.provider.areIntegrationsHealthy()) {
      blockers.push({
        type: 'INTEGRATION_DOWN',
        severity: 'critical',
        message: 'External integration(s) unavailable.',
      });
    }

    return blockers;
  }

  // ── Ops Summary ────────────────────────────────────────────────────────

  computeOpsSummary(projectId: string, phase: ProjectPhase): ProjectOpsSummary {
    const taskStats = this.provider.getTaskRunStats(projectId);
    const queueHealth = this.provider.getEventQueueHealth(projectId);
    const blockers = this.detectBlockers(projectId);

    const errorRate =
      taskStats.total > 0 ? taskStats.failed / taskStats.total : 0;

    return {
      projectId,
      phase,
      completion: {
        percent: taskStats.total > 0
          ? Math.round((taskStats.completed / taskStats.total) * 100)
          : 0,
        completedTasks: taskStats.completed,
        totalTasks: taskStats.total,
      },
      costs: {
        totalUsd: taskStats.totalCostUsd,
        byPhase: {}, // Populated when task runs include phase metadata
        last24hUsd: taskStats.last24hCostUsd,
      },
      health: {
        queueDepth: queueHealth.pendingCount,
        lastProcessedAt: queueHealth.lastProcessedAt ?? new Date().toISOString(),
        errorRate: Math.round(errorRate * 1000) / 1000,
      },
      topBlockers: blockers.slice(0, 5),
    };
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  private computeGates(projectId: string, _phase: ProjectPhase): Gates {
    const approvedReqs = this.provider.getApprovedRequirementsCount(projectId);
    const pendingAssumptions = this.provider.getPendingAssumptionsCount(projectId);
    // hasDecisions available for future phase gating
    void this.provider.hasDecisions(projectId);
    const hasProposal = this.provider.hasProposal(projectId);
    const proposalReviewApproved = this.provider.isLatestProposalReviewApproved(projectId);
    const budget = this.provider.getBudgetStatus(projectId);

    return {
      requirementsApproved: approvedReqs > 0,
      assumptionsAllApproved: pendingAssumptions === 0 && approvedReqs > 0,
      proposalExists: hasProposal,
      proposalReviewApproved: proposalReviewApproved,
      budgetOk: !budget.configured || !budget.exceeded,
      integrationsOk: this.provider.areIntegrationsHealthy(),
    };
  }

  private evaluateReadiness(
    phase: ProjectPhase,
    gates: Gates,
    blockers: Blocker[]
  ): { status: ReadinessStatus; reasons: string[] } {
    const reasons: string[] = [];

    // Critical blockers always block
    const criticalBlockers = blockers.filter((b) => b.severity === 'critical');
    if (criticalBlockers.length > 0) {
      for (const b of criticalBlockers) reasons.push(b.message);
      return { status: 'BLOCKED', reasons };
    }

    switch (phase) {
      case 'INTAKE':
        return { status: 'READY', reasons: ['Intake phase has no prerequisites.'] };

      case 'CLARIFICATION':
        return { status: 'READY', reasons: ['Clarification can proceed at any time.'] };

      case 'REQUIREMENTS': {
        if (!gates.requirementsApproved) {
          reasons.push('Requirements not yet approved.');
        }
        if (!gates.assumptionsAllApproved) {
          reasons.push('Not all assumptions are approved.');
          return { status: 'NEEDS_HUMAN', reasons };
        }
        return reasons.length > 0
          ? { status: 'BLOCKED', reasons }
          : { status: 'READY', reasons: ['Requirements approved and assumptions resolved.'] };
      }

      case 'PROPOSAL': {
        if (!gates.requirementsApproved) {
          reasons.push('Requirements must be approved before proposal.');
          return { status: 'BLOCKED', reasons };
        }
        if (!gates.assumptionsAllApproved) {
          reasons.push('All assumptions must be approved before proposal.');
          return { status: 'NEEDS_HUMAN', reasons };
        }
        return { status: 'READY', reasons: ['Requirements and assumptions approved. Ready for proposal.'] };
      }

      case 'BUILD': {
        if (!gates.proposalExists) {
          reasons.push('No proposal exists.');
          return { status: 'BLOCKED', reasons };
        }
        if (!gates.proposalReviewApproved) {
          reasons.push('Proposal review must be approved before build.');
          return { status: 'NEEDS_HUMAN', reasons };
        }
        if (!gates.budgetOk) {
          reasons.push('Budget exceeded.');
          return { status: 'BLOCKED', reasons };
        }
        return { status: 'READY', reasons: ['Proposal approved. Ready for build.'] };
      }

      case 'SUPPORT':
        return { status: 'NOT_APPLICABLE', reasons: ['Support phase not yet active.'] };

      default:
        return { status: 'NOT_APPLICABLE', reasons: [`Unknown phase: ${phase}`] };
    }
  }

  private filterBlockersForPhase(blockers: Blocker[], _phase: ProjectPhase): Blocker[] {
    // All blockers apply to all phases for now.
    // Phase-specific filtering can be added later.
    return blockers;
  }

  private computeNextActions(
    phase: ProjectPhase,
    gates: Gates,
    _status: ReadinessStatus
  ): NextAllowedAction[] {
    const actions: NextAllowedAction[] = [];

    switch (phase) {
      case 'INTAKE':
        actions.push({ action: 'Start clarification interview', owner: 'agent' });
        break;

      case 'CLARIFICATION':
        actions.push({
          action: 'Complete clarification and generate requirements',
          owner: 'agent',
        });
        break;

      case 'REQUIREMENTS':
        if (!gates.requirementsApproved) {
          actions.push({ action: 'Review and approve requirements', owner: 'human' });
        }
        if (!gates.assumptionsAllApproved) {
          actions.push({ action: 'Review pending assumptions', owner: 'human' });
        }
        if (gates.requirementsApproved && gates.assumptionsAllApproved) {
          actions.push({ action: 'Proceed to proposal generation', owner: 'agent' });
        }
        break;

      case 'PROPOSAL':
        if (!gates.proposalExists) {
          actions.push({ action: 'Generate proposal', owner: 'agent' });
        } else if (!gates.proposalReviewApproved) {
          actions.push({ action: 'Review and approve proposal', owner: 'human' });
        } else {
          actions.push({ action: 'Send proposal to client', owner: 'human' });
        }
        break;

      case 'BUILD':
        if (gates.proposalReviewApproved) {
          actions.push({ action: 'Execute build pipeline', owner: 'agent' });
        }
        break;

      case 'SUPPORT':
        actions.push({ action: 'No actions available for support phase', owner: 'human' });
        break;
    }

    return actions;
  }

  private computeSuggestedAutomations(
    phase: ProjectPhase,
    gates: Gates,
    _status: ReadinessStatus
  ): SuggestedAutomation[] {
    const automations: SuggestedAutomation[] = [];

    if (phase === 'REQUIREMENTS' && gates.requirementsApproved && gates.assumptionsAllApproved) {
      automations.push({
        action: 'Auto-generate proposal',
        when: 'All requirements and assumptions approved',
      });
    }

    if (phase === 'PROPOSAL' && gates.proposalReviewApproved) {
      automations.push({
        action: 'Auto-send proposal notification',
        when: 'Proposal review approved',
      });
    }

    return automations;
  }
}

// ─── Observability Helpers ──────────────────────────────────────────────────

export interface PMComputeMetrics {
  projectId: string;
  phase: ProjectPhase;
  status: ReadinessStatus;
  blockerCount: number;
  blockerTypes: string[];
  durationMs: number;
}

/**
 * Wraps a PM computation with timing and structured logging.
 * Returns both the result and metrics for downstream logging.
 */
export function withPMMetrics<T>(
  projectId: string,
  phase: ProjectPhase,
  fn: () => T & { status?: ReadinessStatus; topBlockers?: Blocker[] }
): { result: T; metrics: PMComputeMetrics } {
  const start = Date.now();
  const result = fn();
  const durationMs = Date.now() - start;

  const status = result.status ?? 'READY';
  const blockers = result.topBlockers ?? [];

  const metrics: PMComputeMetrics = {
    projectId,
    phase,
    status,
    blockerCount: blockers.length,
    blockerTypes: [...new Set(blockers.map((b) => b.type))],
    durationMs,
  };

  return { result, metrics };
}
