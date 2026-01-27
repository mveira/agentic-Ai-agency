import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryKnowledgeStore } from './knowledge-store.js';
import { loadKBForAgent, AGENT_KB_TOOL_ACCESS } from './knowledge-agent-integration.js';
import type { KnowledgeEntry } from './knowledge-schemas.js';

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

let entryCounter = 0;
function createEntry(overrides: Partial<KnowledgeEntry> = {}): KnowledgeEntry {
  entryCounter++;
  const hex = entryCounter.toString(16).padStart(12, '0');
  return {
    id: `${hex.slice(0, 8)}-e29b-41d4-a716-${hex}`,
    projectId: PROJECT_ID,
    type: 'requirement',
    source: 'agent',
    versionRef: 'v1',
    contentJson: { title: `Entry ${entryCounter}` },
    status: 'approved',
    createdAt: '2026-01-26T10:00:00Z',
    ...overrides,
  };
}

describe('Agent–KB Integration', () => {
  let store: InMemoryKnowledgeStore;

  beforeEach(() => {
    store = new InMemoryKnowledgeStore();
    entryCounter = 0;
  });

  describe('AGENT_KB_TOOL_ACCESS mapping', () => {
    it('all 8 agents are mapped', () => {
      expect(Object.keys(AGENT_KB_TOOL_ACCESS)).toHaveLength(8);
    });

    it('research-agent has no KB access (empty array)', () => {
      expect(AGENT_KB_TOOL_ACCESS['research-agent']).toEqual([]);
    });

    it('business-architect-agent has decisions and design rules', () => {
      expect(AGENT_KB_TOOL_ACCESS['business-architect-agent']).toEqual([
        'getDecisions',
        'getDesignRules',
      ]);
    });

    it('requirements-engineer-agent has approved requirements and rejected assumptions', () => {
      expect(AGENT_KB_TOOL_ACCESS['requirements-engineer-agent']).toEqual([
        'getApprovedRequirements',
        'getRejectedAssumptions',
      ]);
    });

    it('strategy-funnel-agent has design rules and decisions', () => {
      expect(AGENT_KB_TOOL_ACCESS['strategy-funnel-agent']).toEqual([
        'getDesignRules',
        'getDecisions',
      ]);
    });

    it('copy-messaging-agent has design rules', () => {
      expect(AGENT_KB_TOOL_ACCESS['copy-messaging-agent']).toEqual(['getDesignRules']);
    });

    it('automation-crm-agent has design rules', () => {
      expect(AGENT_KB_TOOL_ACCESS['automation-crm-agent']).toEqual(['getDesignRules']);
    });

    it('ux-design-agent has design rules', () => {
      expect(AGENT_KB_TOOL_ACCESS['ux-design-agent']).toEqual(['getDesignRules']);
    });

    it('quality-control-agent has access to all 5 approved tools', () => {
      expect(AGENT_KB_TOOL_ACCESS['quality-control-agent']).toHaveLength(5);
    });
  });

  describe('loadKBForAgent', () => {
    it('research-agent always succeeds with empty data (no KB dependency)', () => {
      const result = loadKBForAgent(store, 'research-agent', PROJECT_ID);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('unknown agent succeeds with empty data', () => {
      const result = loadKBForAgent(store, 'unknown-agent', PROJECT_ID);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('ux-design-agent succeeds even with no design rules', () => {
      const result = loadKBForAgent(store, 'ux-design-agent', PROJECT_ID);
      expect(result.success).toBe(true);
      expect(result.data['getDesignRules']!.count).toBe(0);
    });

    it('business-architect-agent loads decisions and design rules', () => {
      store.store(createEntry({ type: 'decision', status: 'approved' }));
      store.store(createEntry({ type: 'design-rule', status: 'approved' }));

      const result = loadKBForAgent(store, 'business-architect-agent', PROJECT_ID);
      expect(result.success).toBe(true);
      expect(result.data['getDecisions']!.count).toBe(1);
      expect(result.data['getDesignRules']!.count).toBe(1);
    });

    it('requirements-engineer-agent BLOCKS when no approved requirements', () => {
      const result = loadKBForAgent(store, 'requirements-engineer-agent', PROJECT_ID);
      expect(result.success).toBe(false);
      expect(result.blockReason).toContain('getApprovedRequirements');
    });

    it('requirements-engineer-agent succeeds with approved requirements', () => {
      store.store(createEntry({ type: 'requirement', status: 'approved' }));

      const result = loadKBForAgent(store, 'requirements-engineer-agent', PROJECT_ID);
      expect(result.success).toBe(true);
      expect(result.blockReason).toBeUndefined();
      expect(result.data['getApprovedRequirements']!.count).toBe(1);
    });

    it('quality-control-agent BLOCKS when no approved requirements', () => {
      const result = loadKBForAgent(store, 'quality-control-agent', PROJECT_ID);
      expect(result.success).toBe(false);
      expect(result.blockReason).toContain('getApprovedRequirements');
    });

    it('quality-control-agent loads all tool data', () => {
      store.store(createEntry({ type: 'requirement', status: 'approved' }));
      store.store(createEntry({ type: 'assumption', status: 'approved' }));
      store.store(createEntry({ type: 'decision', status: 'approved' }));
      store.store(createEntry({ type: 'design-rule', status: 'approved' }));
      store.store(createEntry({ type: 'review', status: 'approved' }));

      const result = loadKBForAgent(store, 'quality-control-agent', PROJECT_ID);
      expect(result.success).toBe(true);
      expect(Object.keys(result.data)).toHaveLength(5);
      expect(result.data['getApprovedRequirements']!.count).toBe(1);
      expect(result.data['getApprovedAssumptions']!.count).toBe(1);
      expect(result.data['getDecisions']!.count).toBe(1);
      expect(result.data['getDesignRules']!.count).toBe(1);
      expect(result.data['getReviews']!.count).toBe(1);
    });

    it('agents cannot access rejected entries (except requirements-engineer)', () => {
      store.store(createEntry({ type: 'requirement', status: 'rejected' }));

      // UX agent should not see rejected entries (getDesignRules only returns approved)
      const uxResult = loadKBForAgent(store, 'ux-design-agent', PROJECT_ID);
      expect(uxResult.data['getDesignRules']!.count).toBe(0);
    });

    it('agents cannot access superseded entries', () => {
      store.store(createEntry({ type: 'design-rule', status: 'superseded' }));

      const result = loadKBForAgent(store, 'ux-design-agent', PROJECT_ID);
      expect(result.data['getDesignRules']!.count).toBe(0);
    });

    it('strategy-funnel-agent loads design rules and decisions', () => {
      store.store(createEntry({ type: 'design-rule', status: 'approved' }));
      store.store(createEntry({ type: 'decision', status: 'approved' }));

      const result = loadKBForAgent(store, 'strategy-funnel-agent', PROJECT_ID);
      expect(result.success).toBe(true);
      expect(result.data['getDesignRules']!.count).toBe(1);
      expect(result.data['getDecisions']!.count).toBe(1);
    });
  });
});
