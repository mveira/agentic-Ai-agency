import { describe, it, expect } from 'vitest';
import {
  ProjectPhaseSchema,
  ReadinessStatusSchema,
  BlockerSchema,
  ProjectReadinessReportSchema,
  ProjectOpsSummarySchema,
  CompletionSchema,
  HealthSchema,
} from './pm-schemas.js';

describe('ProjectPhaseSchema', () => {
  const validPhases = ['INTAKE', 'CLARIFICATION', 'REQUIREMENTS', 'PROPOSAL', 'BUILD', 'SUPPORT'] as const;

  it.each(validPhases)('accepts valid phase: %s', (phase) => {
    const result = ProjectPhaseSchema.safeParse(phase);
    expect(result.success).toBe(true);
  });

  it('rejects invalid phase', () => {
    const result = ProjectPhaseSchema.safeParse('INVALID_PHASE');
    expect(result.success).toBe(false);
  });
});

describe('ReadinessStatusSchema', () => {
  const validStatuses = ['READY', 'BLOCKED', 'NEEDS_HUMAN', 'NOT_APPLICABLE'] as const;

  it.each(validStatuses)('accepts valid status: %s', (status) => {
    const result = ReadinessStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });
});

describe('BlockerSchema', () => {
  it('validates a valid blocker with references', () => {
    const blocker = {
      type: 'MISSING_APPROVAL',
      severity: 'high',
      message: 'No approved requirements.',
      references: [
        { eventId: 'evt-1', runId: 'run-1', versionId: 'v-1' },
        { eventId: 'evt-2' },
      ],
    };
    const result = BlockerSchema.safeParse(blocker);
    expect(result.success).toBe(true);
  });

  it('rejects invalid severity', () => {
    const blocker = {
      type: 'MISSING_APPROVAL',
      severity: 'extreme',
      message: 'Bad severity.',
    };
    const result = BlockerSchema.safeParse(blocker);
    expect(result.success).toBe(false);
  });
});

describe('ProjectReadinessReportSchema', () => {
  it('validates a complete report', () => {
    const report = {
      projectId: 'proj-1',
      phase: 'BUILD',
      status: 'READY',
      reasons: ['All gates passed.'],
      gates: {
        requirementsApproved: true,
        assumptionsAllApproved: true,
        proposalExists: true,
        proposalReviewApproved: true,
        budgetOk: true,
        integrationsOk: true,
      },
      nextAllowedActions: [
        { action: 'Execute build pipeline', owner: 'agent' },
      ],
      suggestedAutomations: [
        { action: 'Auto-deploy on success', when: 'Build completes' },
      ],
      updatedAt: new Date().toISOString(),
    };
    const result = ProjectReadinessReportSchema.safeParse(report);
    expect(result.success).toBe(true);
  });
});

describe('ProjectOpsSummarySchema', () => {
  it('validates a complete ops summary', () => {
    const summary = {
      projectId: 'proj-1',
      phase: 'BUILD',
      completion: {
        percent: 80,
        completedTasks: 8,
        totalTasks: 10,
      },
      costs: {
        totalUsd: 50.0,
        byPhase: { BUILD: 40.0, PROPOSAL: 10.0 },
        last24hUsd: 5.0,
      },
      health: {
        queueDepth: 2,
        lastProcessedAt: new Date().toISOString(),
        errorRate: 0.1,
      },
      topBlockers: [],
    };
    const result = ProjectOpsSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});

describe('CompletionSchema', () => {
  it('rejects percent > 100', () => {
    const completion = {
      percent: 101,
      completedTasks: 10,
      totalTasks: 10,
    };
    const result = CompletionSchema.safeParse(completion);
    expect(result.success).toBe(false);
  });
});

describe('HealthSchema', () => {
  it('rejects errorRate > 1', () => {
    const health = {
      queueDepth: 0,
      lastProcessedAt: new Date().toISOString(),
      errorRate: 1.5,
    };
    const result = HealthSchema.safeParse(health);
    expect(result.success).toBe(false);
  });
});
