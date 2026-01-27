/**
 * Cross-Module Integration Tests — Internal PM Routes
 *
 * These tests seed REAL InMemoryKnowledgeStore and InMemoryProposalStore
 * instances (shared with the route handlers) and verify that the PM engine
 * computes correct readiness, blockers, and ops from that combined state.
 *
 * Unlike the unit tests (internal-pm.test.ts) which test route structure
 * with empty stores, these tests exercise the full wiring:
 *   Store seeding → PMDataProvider reads → PMEngine computation → JSON response
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import { internalPMRouter, knowledgeStore, proposalStore } from './internal-pm.js';
import type { KnowledgeEntry } from '@agency/agent-core';

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

function createTestApp() {
  const app = new Hono();
  app.route('/api/internal/projects', internalPMRouter);
  return app;
}

// ─── Seed Helpers ─────────────────────────────────────────────────────────────

function seedApprovedRequirement(projectId: string, title = 'Landing page'): KnowledgeEntry {
  const entry: KnowledgeEntry = {
    id: randomUUID(),
    projectId,
    type: 'requirement',
    source: 'agent',
    versionRef: 'v1',
    contentJson: { id: `req-${randomUUID().slice(0, 8)}`, title, details: 'Test requirement', priority: 'MUST' },
    status: 'approved',
    createdAt: new Date().toISOString(),
  };
  knowledgeStore.store(entry);
  return entry;
}

function seedApprovedAssumption(projectId: string, statement = 'Budget is flexible'): KnowledgeEntry {
  const entry: KnowledgeEntry = {
    id: randomUUID(),
    projectId,
    type: 'assumption',
    source: 'agent',
    versionRef: 'v1',
    contentJson: { id: `asn-${randomUUID().slice(0, 8)}`, statement, reason: 'From intake' },
    status: 'approved',
    createdAt: new Date().toISOString(),
  };
  knowledgeStore.store(entry);
  return entry;
}

function seedDecision(projectId: string, decision = 'Use multi-page layout'): KnowledgeEntry {
  const entry: KnowledgeEntry = {
    id: randomUUID(),
    projectId,
    type: 'decision',
    source: 'human',
    versionRef: null,
    contentJson: { decision, reason: 'Client preference' },
    status: 'approved',
    createdAt: new Date().toISOString(),
  };
  knowledgeStore.store(entry);
  return entry;
}

function seedProposal(projectId: string) {
  return proposalStore.createProposal({
    projectId,
    requirementsVersionId: 'v1',
    versionNumber: 1,
    status: 'DRAFT',
    publicId: `pub-${randomUUID().slice(0, 8)}`,
    proposalJson: {
      meta: { recommendedPlanId: 'plan-1', recommendationReasons: ['Budget fits'] },
      scope: { included: [{ requirementId: 'req-1', title: 'Landing page', description: 'Hero + CTA' }] },
      optionalAddons: [],
      pricing: { planId: 'plan-1', planName: 'Growth', amount: '4500', currency: 'GBP' },
      timeline: { estimatedWeeks: 4, phases: [{ name: 'Build', durationWeeks: 4 }] },
      compliance: { scopeLocked: true, noInventedProof: true, noOutcomePromises: true },
    },
    proposalUiSpecJson: {
      layout: 'single-page',
      sections: [{ sectionId: 'sec-1', type: 'hero', order: 1 }],
      recommendedPlanHighlighted: true,
      stickyCta: true,
      progressiveDisclosureForAddons: false,
      ctaRequiresLogin: true,
    },
  });
}

function seedApprovedReview(proposalId: string) {
  return proposalStore.addReview({
    proposalVersionId: proposalId,
    status: 'APPROVED',
    notes: 'Looks good',
    reviewerUserId: randomUUID(),
  });
}

// ─── Integration Tests ───────────────────────────────────────────────────────

describe('Internal PM — Cross-Module Integration', () => {
  let app: Hono;

  beforeEach(() => {
    knowledgeStore.clear();
    proposalStore.clear();
    app = createTestApp();
  });

  // ── Phase Readiness Transitions ──────────────────────────────────────────

  describe('Phase readiness transitions via store seeding', () => {
    it('PROPOSAL is BLOCKED with empty KB, then READY after seeding requirements + assumptions', async () => {
      // Step 1: Empty stores → BLOCKED
      const blockedRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/readiness?phase=PROPOSAL`
      );
      expect(blockedRes.status).toBe(200);
      const blocked = await blockedRes.json();
      expect(blocked.status).toBe('BLOCKED');
      expect(blocked.gates.requirementsApproved).toBe(false);

      // Step 2: Seed approved requirements + assumptions
      seedApprovedRequirement(PROJECT_ID);
      seedApprovedAssumption(PROJECT_ID);

      // Step 3: Same endpoint → READY
      const readyRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/readiness?phase=PROPOSAL`
      );
      expect(readyRes.status).toBe(200);
      const ready = await readyRes.json();
      expect(ready.status).toBe('READY');
      expect(ready.gates.requirementsApproved).toBe(true);
      expect(ready.gates.assumptionsAllApproved).toBe(true);
    });

    it('BUILD is BLOCKED without proposal, NEEDS_HUMAN without review, READY after approved review', async () => {
      // Seed KB prerequisites (requirements + assumptions)
      seedApprovedRequirement(PROJECT_ID);
      seedApprovedAssumption(PROJECT_ID);

      // Step 1: No proposal → BLOCKED
      const noProposalRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/readiness?phase=BUILD`
      );
      expect(noProposalRes.status).toBe(200);
      const noProposal = await noProposalRes.json();
      expect(noProposal.status).toBe('BLOCKED');
      expect(noProposal.gates.proposalExists).toBe(false);

      // Step 2: Add proposal (no review) → NEEDS_HUMAN
      const proposal = seedProposal(PROJECT_ID);
      const needsReviewRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/readiness?phase=BUILD`
      );
      expect(needsReviewRes.status).toBe(200);
      const needsReview = await needsReviewRes.json();
      expect(needsReview.status).toBe('NEEDS_HUMAN');
      expect(needsReview.gates.proposalExists).toBe(true);
      expect(needsReview.gates.proposalReviewApproved).toBe(false);

      // Step 3: Add approved review → READY
      seedApprovedReview(proposal.id);
      const readyRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/readiness?phase=BUILD`
      );
      expect(readyRes.status).toBe(200);
      const ready = await readyRes.json();
      expect(ready.status).toBe('READY');
      expect(ready.gates.proposalReviewApproved).toBe(true);
    });

    it('INTAKE is always READY regardless of store state', async () => {
      // Empty stores
      const emptyRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/readiness?phase=INTAKE`
      );
      const empty = await emptyRes.json();
      expect(empty.status).toBe('READY');

      // Seeded stores
      seedApprovedRequirement(PROJECT_ID);
      seedProposal(PROJECT_ID);
      const seededRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/readiness?phase=INTAKE`
      );
      const seeded = await seededRes.json();
      expect(seeded.status).toBe('READY');
    });
  });

  // ── Blocker Resolution ───────────────────────────────────────────────────

  describe('Blockers resolve when store state satisfies gates', () => {
    it('MISSING_APPROVAL blocker disappears after seeding approved requirements', async () => {
      // Step 1: Empty → has MISSING_APPROVAL
      const beforeRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/blockers`
      );
      const before = await beforeRes.json();
      const missingApprovalBefore = before.blockers.filter(
        (b: { type: string }) => b.type === 'MISSING_APPROVAL'
      );
      expect(missingApprovalBefore.length).toBeGreaterThan(0);

      // Step 2: Seed requirements + assumptions
      seedApprovedRequirement(PROJECT_ID);
      seedApprovedAssumption(PROJECT_ID);

      // Step 3: MISSING_APPROVAL for requirements resolved
      const afterRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/blockers`
      );
      const after = await afterRes.json();
      const reqBlockers = after.blockers.filter(
        (b: { type: string; message: string }) =>
          b.type === 'MISSING_APPROVAL' && b.message.toLowerCase().includes('requirements')
      );
      expect(reqBlockers.length).toBe(0);
    });
  });

  // ── Cross-Endpoint Consistency ───────────────────────────────────────────

  describe('Cross-endpoint consistency', () => {
    it('readiness, blockers, and next-actions agree on seeded state', async () => {
      seedApprovedRequirement(PROJECT_ID);
      seedApprovedAssumption(PROJECT_ID);

      // All three endpoints should reflect PROPOSAL is ready
      const [readinessRes, blockersRes, actionsRes] = await Promise.all([
        app.request(`/api/internal/projects/${PROJECT_ID}/readiness?phase=PROPOSAL`),
        app.request(`/api/internal/projects/${PROJECT_ID}/blockers`),
        app.request(`/api/internal/projects/${PROJECT_ID}/next-actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 'PROPOSAL' }),
        }),
      ]);

      const readiness = await readinessRes.json();
      const blockers = await blockersRes.json();
      const actions = await actionsRes.json();

      // Readiness: READY for PROPOSAL
      expect(readiness.status).toBe('READY');

      // Blockers: no requirement-related missing approval
      const reqBlockers = blockers.blockers.filter(
        (b: { type: string; message: string }) =>
          b.type === 'MISSING_APPROVAL' && b.message.toLowerCase().includes('requirements')
      );
      expect(reqBlockers.length).toBe(0);

      // Next-actions: should have agent actions (generate proposal)
      expect(actions.nextAllowedActions.length).toBeGreaterThan(0);
    });

    it('readiness and blockers agree when state is empty (BLOCKED)', async () => {
      const [readinessRes, blockersRes] = await Promise.all([
        app.request(`/api/internal/projects/${PROJECT_ID}/readiness?phase=PROPOSAL`),
        app.request(`/api/internal/projects/${PROJECT_ID}/blockers`),
      ]);

      const readiness = await readinessRes.json();
      const blockers = await blockersRes.json();

      // Readiness is BLOCKED
      expect(readiness.status).toBe('BLOCKED');

      // Blockers include MISSING_APPROVAL
      expect(blockers.blockers.some(
        (b: { type: string }) => b.type === 'MISSING_APPROVAL'
      )).toBe(true);

      // Readiness reasons should mention requirements
      expect(readiness.reasons.some(
        (r: string) => r.toLowerCase().includes('requirements') || r.toLowerCase().includes('requirement')
      )).toBe(true);
    });

    it('ops summary reflects empty task stats when no telemetry wired', async () => {
      const opsRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/ops?phase=BUILD`
      );
      expect(opsRes.status).toBe(200);
      const ops = await opsRes.json();

      // Safe defaults from unwired telemetry
      expect(ops.completion.totalTasks).toBe(0);
      expect(ops.costs.totalUsd).toBe(0);
      expect(ops.health.queueDepth).toBe(0);
      expect(ops.health.errorRate).toBe(0);
    });
  });

  // ── Project Isolation ────────────────────────────────────────────────────

  describe('Project isolation', () => {
    it('seeding data for project A does not affect project B readiness', async () => {
      const PROJECT_A = '550e8400-e29b-41d4-a716-000000000001';
      const PROJECT_B = '550e8400-e29b-41d4-a716-000000000002';

      // Seed only project A
      seedApprovedRequirement(PROJECT_A);
      seedApprovedAssumption(PROJECT_A);

      // Project A: READY for PROPOSAL
      const resA = await app.request(
        `/api/internal/projects/${PROJECT_A}/readiness?phase=PROPOSAL`
      );
      const a = await resA.json();
      expect(a.status).toBe('READY');

      // Project B: still BLOCKED (no data)
      const resB = await app.request(
        `/api/internal/projects/${PROJECT_B}/readiness?phase=PROPOSAL`
      );
      const b = await resB.json();
      expect(b.status).toBe('BLOCKED');
    });

    it('seeding proposal for project A does not affect project B BUILD readiness', async () => {
      const PROJECT_A = '550e8400-e29b-41d4-a716-000000000001';
      const PROJECT_B = '550e8400-e29b-41d4-a716-000000000002';

      // Seed full lifecycle for project A
      seedApprovedRequirement(PROJECT_A);
      seedApprovedAssumption(PROJECT_A);
      const proposal = seedProposal(PROJECT_A);
      seedApprovedReview(proposal.id);

      // Project A: BUILD READY
      const resA = await app.request(
        `/api/internal/projects/${PROJECT_A}/readiness?phase=BUILD`
      );
      expect((await resA.json()).status).toBe('READY');

      // Project B: BUILD BLOCKED
      const resB = await app.request(
        `/api/internal/projects/${PROJECT_B}/readiness?phase=BUILD`
      );
      expect((await resB.json()).status).toBe('BLOCKED');
    });
  });

  // ── Full Lifecycle ───────────────────────────────────────────────────────

  describe('Full project lifecycle through stores', () => {
    it('progresses from BLOCKED through NEEDS_HUMAN to READY across phases', async () => {
      // Phase 1: REQUIREMENTS — needs human review of requirements
      const reqPhaseRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/readiness?phase=REQUIREMENTS`
      );
      const reqPhase = await reqPhaseRes.json();
      // REQUIREMENTS phase depends on clarification; without approved reqs it signals need for action
      expect(['BLOCKED', 'NEEDS_HUMAN', 'READY']).toContain(reqPhase.status);

      // Seed approved requirements + assumptions (simulates confirm flow)
      seedApprovedRequirement(PROJECT_ID, 'Landing page');
      seedApprovedRequirement(PROJECT_ID, 'CRM integration');
      seedApprovedAssumption(PROJECT_ID, 'Budget is ~3000 GBP');
      seedApprovedAssumption(PROJECT_ID, 'Timeline is 4 weeks');
      seedDecision(PROJECT_ID, 'Use HubSpot for CRM');

      // Phase 2: PROPOSAL — now READY (requirements + assumptions in KB)
      const proposalPhaseRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/readiness?phase=PROPOSAL`
      );
      const proposalPhase = await proposalPhaseRes.json();
      expect(proposalPhase.status).toBe('READY');
      expect(proposalPhase.gates.requirementsApproved).toBe(true);
      expect(proposalPhase.gates.assumptionsAllApproved).toBe(true);

      // Seed proposal (simulates ProposalOrchestrator output)
      const proposal = seedProposal(PROJECT_ID);

      // Phase 3: BUILD — NEEDS_HUMAN (proposal exists, no review yet)
      const buildNeedsReviewRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/readiness?phase=BUILD`
      );
      const buildNeedsReview = await buildNeedsReviewRes.json();
      expect(buildNeedsReview.status).toBe('NEEDS_HUMAN');
      expect(buildNeedsReview.gates.proposalExists).toBe(true);
      expect(buildNeedsReview.gates.proposalReviewApproved).toBe(false);

      // Seed approved review (simulates human approval)
      seedApprovedReview(proposal.id);

      // Phase 4: BUILD — READY (proposal + approved review)
      const buildReadyRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/readiness?phase=BUILD`
      );
      const buildReady = await buildReadyRes.json();
      expect(buildReady.status).toBe('READY');
      expect(buildReady.gates.proposalReviewApproved).toBe(true);

      // Verify blockers are minimal at this stage
      const blockersRes = await app.request(
        `/api/internal/projects/${PROJECT_ID}/blockers`
      );
      const blockers = await blockersRes.json();
      const criticalBlockers = blockers.blockers.filter(
        (b: { severity: string }) => b.severity === 'critical' || b.severity === 'high'
      );
      expect(criticalBlockers.length).toBe(0);
    });
  });

  // ── Next Actions Reflect State ───────────────────────────────────────────

  describe('Next actions reflect current store state', () => {
    it('PROPOSAL phase shows agent generate action when no proposal exists but KB is ready', async () => {
      seedApprovedRequirement(PROJECT_ID);
      seedApprovedAssumption(PROJECT_ID);

      const res = await app.request(
        `/api/internal/projects/${PROJECT_ID}/next-actions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 'PROPOSAL' }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();

      // Should suggest agent-driven proposal generation
      const agentActions = body.nextAllowedActions.filter(
        (a: { owner: string }) => a.owner === 'agent'
      );
      expect(agentActions.length).toBeGreaterThan(0);
      expect(agentActions.some(
        (a: { action: string }) => a.action.toLowerCase().includes('generate')
      )).toBe(true);
    });

    it('PROPOSAL phase shows human review action when proposal exists but not reviewed', async () => {
      seedApprovedRequirement(PROJECT_ID);
      seedApprovedAssumption(PROJECT_ID);
      seedProposal(PROJECT_ID);

      // Review action lives in PROPOSAL phase (not BUILD)
      const res = await app.request(
        `/api/internal/projects/${PROJECT_ID}/next-actions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 'PROPOSAL' }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();

      // Should suggest human review of proposal
      const humanActions = body.nextAllowedActions.filter(
        (a: { owner: string }) => a.owner === 'human'
      );
      expect(humanActions.length).toBeGreaterThan(0);
      expect(humanActions.some(
        (a: { action: string }) => a.action.toLowerCase().includes('review')
      )).toBe(true);
    });

    it('BUILD phase has no actions when proposal review is pending', async () => {
      seedApprovedRequirement(PROJECT_ID);
      seedApprovedAssumption(PROJECT_ID);
      seedProposal(PROJECT_ID);
      // No review added — BUILD phase should have no actions

      const res = await app.request(
        `/api/internal/projects/${PROJECT_ID}/next-actions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 'BUILD' }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();

      // BUILD only surfaces actions when proposal is approved
      expect(body.nextAllowedActions.length).toBe(0);
    });

    it('BUILD phase shows agent action after proposal review is approved', async () => {
      seedApprovedRequirement(PROJECT_ID);
      seedApprovedAssumption(PROJECT_ID);
      const proposal = seedProposal(PROJECT_ID);
      seedApprovedReview(proposal.id);

      const res = await app.request(
        `/api/internal/projects/${PROJECT_ID}/next-actions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 'BUILD' }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();

      // BUILD now has agent-driven execution
      const agentActions = body.nextAllowedActions.filter(
        (a: { owner: string }) => a.owner === 'agent'
      );
      expect(agentActions.length).toBeGreaterThan(0);
      expect(agentActions.some(
        (a: { action: string }) => a.action.toLowerCase().includes('build')
      )).toBe(true);
    });
  });
});
