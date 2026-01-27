import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryKnowledgeStore } from './knowledge-store.js';
import {
  getApprovedRequirements,
  getApprovedAssumptions,
  getDecisions,
  getDesignRules,
  getReviews,
  getRejectedAssumptions,
  KB_TOOL_REGISTRY,
} from './knowledge-tools.js';
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

describe('Knowledge Tools', () => {
  let store: InMemoryKnowledgeStore;

  beforeEach(() => {
    store = new InMemoryKnowledgeStore();
    entryCounter = 0;
  });

  describe('getApprovedRequirements', () => {
    it('returns only approved requirements', () => {
      store.store(createEntry({ type: 'requirement', status: 'approved' }));
      store.store(createEntry({ type: 'requirement', status: 'rejected' }));
      store.store(createEntry({ type: 'assumption', status: 'approved' }));

      const result = getApprovedRequirements(store, PROJECT_ID);
      expect(result.count).toBe(1);
      expect(result.entries).toHaveLength(1);
    });

    it('returns empty for no entries', () => {
      const result = getApprovedRequirements(store, PROJECT_ID);
      expect(result.count).toBe(0);
      expect(result.entries).toEqual([]);
    });
  });

  describe('getApprovedAssumptions', () => {
    it('returns only approved assumptions', () => {
      store.store(createEntry({ type: 'assumption', status: 'approved' }));
      store.store(createEntry({ type: 'assumption', status: 'rejected' }));

      const result = getApprovedAssumptions(store, PROJECT_ID);
      expect(result.count).toBe(1);
    });
  });

  describe('getDecisions', () => {
    it('returns only approved decisions', () => {
      store.store(createEntry({ type: 'decision', status: 'approved' }));
      store.store(createEntry({ type: 'decision', status: 'superseded' }));

      const result = getDecisions(store, PROJECT_ID);
      expect(result.count).toBe(1);
    });
  });

  describe('getDesignRules', () => {
    it('returns only approved design-rules', () => {
      store.store(createEntry({ type: 'design-rule', status: 'approved' }));

      const result = getDesignRules(store, PROJECT_ID);
      expect(result.count).toBe(1);
    });
  });

  describe('getReviews', () => {
    it('returns only approved reviews', () => {
      store.store(createEntry({ type: 'review', status: 'approved' }));
      store.store(createEntry({ type: 'review', status: 'rejected' }));

      const result = getReviews(store, PROJECT_ID);
      expect(result.count).toBe(1);
    });
  });

  describe('getRejectedAssumptions', () => {
    it('returns only rejected assumptions', () => {
      store.store(createEntry({ type: 'assumption', status: 'rejected' }));
      store.store(createEntry({ type: 'assumption', status: 'approved' }));
      store.store(createEntry({ type: 'requirement', status: 'rejected' }));

      const result = getRejectedAssumptions(store, PROJECT_ID);
      expect(result.count).toBe(1);
      expect(result.entries).toHaveLength(1);
    });

    it('returns empty for no rejected assumptions', () => {
      store.store(createEntry({ type: 'assumption', status: 'approved' }));

      const result = getRejectedAssumptions(store, PROJECT_ID);
      expect(result.count).toBe(0);
      expect(result.entries).toEqual([]);
    });
  });

  describe('excluded statuses', () => {
    it('rejected entries are excluded from tools', () => {
      store.store(createEntry({ type: 'requirement', status: 'rejected' }));
      expect(getApprovedRequirements(store, PROJECT_ID).count).toBe(0);
    });

    it('superseded entries are excluded from tools', () => {
      store.store(createEntry({ type: 'requirement', status: 'superseded' }));
      expect(getApprovedRequirements(store, PROJECT_ID).count).toBe(0);
    });
  });

  describe('minimal payload shape', () => {
    it('returns only id, contentJson, createdAt', () => {
      store.store(createEntry({ type: 'requirement', status: 'approved' }));

      const result = getApprovedRequirements(store, PROJECT_ID);
      const entry = result.entries[0]!;

      expect(Object.keys(entry).sort()).toEqual(['contentJson', 'createdAt', 'id']);
      expect(entry.id).toBeDefined();
      expect(entry.contentJson).toBeDefined();
      expect(entry.createdAt).toBeDefined();
    });
  });

  describe('KB_TOOL_REGISTRY', () => {
    it('contains all 6 tools', () => {
      expect(Object.keys(KB_TOOL_REGISTRY)).toHaveLength(6);
      expect(KB_TOOL_REGISTRY['getApprovedRequirements']).toBe(getApprovedRequirements);
      expect(KB_TOOL_REGISTRY['getApprovedAssumptions']).toBe(getApprovedAssumptions);
      expect(KB_TOOL_REGISTRY['getDecisions']).toBe(getDecisions);
      expect(KB_TOOL_REGISTRY['getDesignRules']).toBe(getDesignRules);
      expect(KB_TOOL_REGISTRY['getReviews']).toBe(getReviews);
      expect(KB_TOOL_REGISTRY['getRejectedAssumptions']).toBe(getRejectedAssumptions);
    });
  });
});
