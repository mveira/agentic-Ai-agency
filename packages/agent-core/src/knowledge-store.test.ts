import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryKnowledgeStore } from './knowledge-store.js';
import type { KnowledgeEntry } from './knowledge-schemas.js';

const PROJECT_A = '550e8400-e29b-41d4-a716-446655440000';
const PROJECT_B = '660e8400-e29b-41d4-a716-446655440001';

function createEntry(overrides: Partial<KnowledgeEntry> = {}): KnowledgeEntry {
  return {
    id: '770e8400-e29b-41d4-a716-446655440002',
    projectId: PROJECT_A,
    type: 'requirement',
    source: 'agent',
    versionRef: 'v1',
    contentJson: { title: 'Landing page', priority: 'MUST' },
    status: 'approved',
    createdAt: '2026-01-26T10:00:00Z',
    ...overrides,
  };
}

describe('InMemoryKnowledgeStore', () => {
  let store: InMemoryKnowledgeStore;

  beforeEach(() => {
    store = new InMemoryKnowledgeStore();
  });

  it('stores and retrieves an entry', () => {
    const entry = createEntry();
    store.store(entry);

    const result = store.get(entry.id);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(entry.id);
    expect(result!.type).toBe('requirement');
  });

  it('returns null for unknown id', () => {
    const result = store.get('nonexistent-id');
    expect(result).toBeNull();
  });

  it('returns immutable copies (mutations do not affect stored data)', () => {
    const entry = createEntry();
    store.store(entry);

    const retrieved = store.get(entry.id);
    retrieved!.status = 'rejected';
    retrieved!.contentJson = { changed: true };

    const fresh = store.get(entry.id);
    expect(fresh!.status).toBe('approved');
    expect(fresh!.contentJson).toEqual({ title: 'Landing page', priority: 'MUST' });
  });

  it('store does not affect the original object', () => {
    const entry = createEntry();
    store.store(entry);

    entry.status = 'rejected';

    const stored = store.get(entry.id);
    expect(stored!.status).toBe('approved');
  });

  it('getByProject filters by project', () => {
    store.store(createEntry({ id: '110e8400-e29b-41d4-a716-446655440010', projectId: PROJECT_A }));
    store.store(createEntry({ id: '220e8400-e29b-41d4-a716-446655440011', projectId: PROJECT_B }));

    const results = store.getByProject(PROJECT_A);
    expect(results).toHaveLength(1);
    expect(results[0]!.projectId).toBe(PROJECT_A);
  });

  it('getByProjectAndType filters by project and type', () => {
    store.store(createEntry({ id: '110e8400-e29b-41d4-a716-446655440010', type: 'requirement' }));
    store.store(createEntry({ id: '220e8400-e29b-41d4-a716-446655440011', type: 'assumption' }));
    store.store(createEntry({ id: '330e8400-e29b-41d4-a716-446655440012', type: 'requirement' }));

    const results = store.getByProjectAndType(PROJECT_A, 'requirement');
    expect(results).toHaveLength(2);
    results.forEach((r) => expect(r.type).toBe('requirement'));
  });

  it('getByProjectTypeAndStatus returns only matching status', () => {
    store.store(createEntry({ id: '110e8400-e29b-41d4-a716-446655440010', type: 'assumption', status: 'approved' }));
    store.store(createEntry({ id: '220e8400-e29b-41d4-a716-446655440011', type: 'assumption', status: 'rejected' }));
    store.store(createEntry({ id: '330e8400-e29b-41d4-a716-446655440012', type: 'assumption', status: 'superseded' }));

    const approved = store.getByProjectTypeAndStatus(PROJECT_A, 'assumption', 'approved');
    expect(approved).toHaveLength(1);
    expect(approved[0]!.status).toBe('approved');
  });

  it('supersede changes status to superseded', () => {
    const entry = createEntry();
    store.store(entry);

    store.supersede(entry.id);

    const result = store.get(entry.id);
    expect(result!.status).toBe('superseded');
  });

  it('clear removes all entries', () => {
    store.store(createEntry({ id: '110e8400-e29b-41d4-a716-446655440010' }));
    store.store(createEntry({ id: '220e8400-e29b-41d4-a716-446655440011' }));
    store.clear();

    const result = store.get('110e8400-e29b-41d4-a716-446655440010');
    expect(result).toBeNull();
  });

  it('empty project returns empty array', () => {
    const results = store.getByProject('nonexistent-project');
    expect(results).toEqual([]);
  });

  it('multiple projects are isolated', () => {
    store.store(createEntry({ id: '110e8400-e29b-41d4-a716-446655440010', projectId: PROJECT_A }));
    store.store(createEntry({ id: '220e8400-e29b-41d4-a716-446655440011', projectId: PROJECT_A }));
    store.store(createEntry({ id: '330e8400-e29b-41d4-a716-446655440012', projectId: PROJECT_B }));

    expect(store.getByProject(PROJECT_A)).toHaveLength(2);
    expect(store.getByProject(PROJECT_B)).toHaveLength(1);
  });

  it('supersede is a no-op for unknown id', () => {
    expect(() => store.supersede('nonexistent')).not.toThrow();
  });
});
