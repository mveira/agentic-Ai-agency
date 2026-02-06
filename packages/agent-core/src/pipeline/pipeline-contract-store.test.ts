import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPipelineContractStore, StoredPipelineContractSchema } from './pipeline-contract-store.js';
import { computePipelineAction } from './pipeline-router.js';
import type { PipelineRouterInput } from './pipeline-events.js';

function makeContract(eventId = `evt-${crypto.randomUUID()}`) {
  const input: PipelineRouterInput = {
    projectId: 'proj-1',
    eventId,
    triggeringEvent: 'INTENT_RECEIVED',
  };
  return computePipelineAction(input)!;
}

describe('StoredPipelineContractSchema', () => {
  it('validates a stored contract', () => {
    const contract = makeContract();
    const stored = { ...contract, status: 'PENDING' as const };
    expect(StoredPipelineContractSchema.safeParse(stored).success).toBe(true);
  });

  it('rejects invalid status', () => {
    const contract = makeContract();
    const stored = { ...contract, status: 'BOGUS' };
    expect(StoredPipelineContractSchema.safeParse(stored).success).toBe(false);
  });
});

describe('InMemoryPipelineContractStore', () => {
  let store: InMemoryPipelineContractStore;

  beforeEach(() => {
    store = new InMemoryPipelineContractStore();
  });

  it('inserts and retrieves contracts by project', () => {
    const contract = makeContract();
    const stored = store.insert(contract);
    expect(stored.status).toBe('PENDING');
    const results = store.findByProject('proj-1');
    expect(results).toHaveLength(1);
    expect(results[0].contractId).toBe(contract.contractId);
  });

  it('returns empty array for unknown project', () => {
    expect(store.findByProject('unknown')).toHaveLength(0);
  });

  it('tracks idempotency keys', () => {
    const contract = makeContract('evt-track');
    store.insert(contract);
    expect(store.hasIdempotencyKey('evt-track:MOVE_STAGE')).toBe(true);
    expect(store.hasIdempotencyKey('evt-other:MOVE_STAGE')).toBe(false);
  });

  it('rejects duplicate idempotency keys', () => {
    const contract = makeContract('evt-dup');
    store.insert(contract);
    const dup = makeContract('evt-dup');
    expect(() => store.insert(dup)).toThrow('Duplicate idempotency key');
  });

  it('updates status to APPLIED', () => {
    const contract = makeContract();
    store.insert(contract);
    store.updateStatus(contract.contractId, 'APPLIED');
    const results = store.findByProject('proj-1');
    expect(results[0].status).toBe('APPLIED');
  });

  it('updates status to REJECTED', () => {
    const contract = makeContract();
    store.insert(contract);
    store.updateStatus(contract.contractId, 'REJECTED');
    const results = store.findByProject('proj-1');
    expect(results[0].status).toBe('REJECTED');
  });

  it('handles updateStatus for non-existent id gracefully', () => {
    expect(() => store.updateStatus('bogus', 'APPLIED')).not.toThrow();
  });

  it('returns cloned records (immutability)', () => {
    const contract = makeContract();
    store.insert(contract);
    const a = store.findByProject('proj-1');
    const b = store.findByProject('proj-1');
    expect(a[0]).toEqual(b[0]);
    expect(a[0]).not.toBe(b[0]);
  });

  it('clears all records and keys', () => {
    const contract = makeContract('evt-clear');
    store.insert(contract);
    store.clear();
    expect(store.findByProject('proj-1')).toHaveLength(0);
    expect(store.hasIdempotencyKey('evt-clear:MOVE_STAGE')).toBe(false);
  });
});
