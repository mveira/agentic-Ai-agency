import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCRMContractStore } from './pipeline-contract-store.js';
import { CRMActionContractRecordSchema } from './pipeline-contract-store.js';
import type { CRMActionContractRecord } from './pipeline-contract-store.js';

function makeRecord(overrides: Partial<CRMActionContractRecord> = {}): CRMActionContractRecord {
  return {
    id: crypto.randomUUID(),
    projectId: 'proj-1',
    contactId: 'contact-1',
    actionType: 'MOVE_STAGE',
    payload: { targetStage: 'NEW_LEAD' },
    status: 'PENDING',
    reason: 'Test reason',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('CRMActionContractRecordSchema', () => {
  it('validates a valid record', () => {
    const record = makeRecord();
    expect(CRMActionContractRecordSchema.safeParse(record).success).toBe(true);
  });

  it('rejects invalid status', () => {
    const record = makeRecord();
    (record as Record<string, unknown>).status = 'BOGUS';
    expect(CRMActionContractRecordSchema.safeParse(record).success).toBe(false);
  });
});

describe('InMemoryCRMContractStore', () => {
  let store: InMemoryCRMContractStore;

  beforeEach(() => {
    store = new InMemoryCRMContractStore();
  });

  it('inserts and retrieves records by project', () => {
    const record = makeRecord();
    store.insert(record);
    const results = store.findByProject('proj-1');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(record.id);
  });

  it('returns empty array for unknown project', () => {
    expect(store.findByProject('unknown')).toHaveLength(0);
  });

  it('updates status', () => {
    const record = makeRecord();
    store.insert(record);
    store.updateStatus(record.id, 'APPLIED');
    const results = store.findByProject('proj-1');
    expect(results[0].status).toBe('APPLIED');
  });

  it('handles updateStatus for non-existent id gracefully', () => {
    expect(() => store.updateStatus('bogus', 'FAILED')).not.toThrow();
  });

  it('returns cloned records (immutability)', () => {
    const record = makeRecord();
    store.insert(record);
    const a = store.findByProject('proj-1');
    const b = store.findByProject('proj-1');
    expect(a[0]).toEqual(b[0]);
    expect(a[0]).not.toBe(b[0]);
  });

  it('clears all records', () => {
    store.insert(makeRecord());
    store.insert(makeRecord({ projectId: 'proj-2' }));
    store.clear();
    expect(store.findByProject('proj-1')).toHaveLength(0);
    expect(store.findByProject('proj-2')).toHaveLength(0);
  });
});
