import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryEventStore,
  publishEvent,
  markProcessing,
  markDone,
  markFailed,
  markDeadLetter,
  computeEventHash,
} from './event-bus.js';

describe('computeEventHash', () => {
  it('produces deterministic hash for same payload', () => {
    const payload = { foo: 'bar', num: 42 };
    const h1 = computeEventHash(payload);
    const h2 = computeEventHash(payload);
    expect(h1).toBe(h2);
  });

  it('produces same hash regardless of key order', () => {
    const h1 = computeEventHash({ a: 1, b: 2 });
    const h2 = computeEventHash({ b: 2, a: 1 });
    expect(h1).toBe(h2);
  });

  it('produces different hash for different payloads', () => {
    const h1 = computeEventHash({ a: 1 });
    const h2 = computeEventHash({ a: 2 });
    expect(h1).not.toBe(h2);
  });
});

describe('publishEvent', () => {
  let store: InMemoryEventStore;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  it('inserts a new PENDING event', async () => {
    const result = await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { clientName: 'Test Corp' },
    });

    expect(result.isNew).toBe(true);
    expect(result.event.status).toBe('PENDING');
    expect(result.event.attempts).toBe(0);
    expect(result.event.lockedAt).toBeNull();
    expect(result.event.lockedBy).toBeNull();
    expect(result.event.lastError).toBeNull();
    expect(result.event.id).toBeDefined();
    expect(result.event.payloadHash).toBeDefined();
  });

  it('idempotency: same payload returns existing event', async () => {
    const first = await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { clientName: 'Test Corp' },
    });

    const second = await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { clientName: 'Test Corp' },
    });

    expect(second.isNew).toBe(false);
    expect(second.event.id).toBe(first.event.id);
  });

  it('same payload different project creates new event', async () => {
    const first = await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { clientName: 'Test Corp' },
    });

    const second = await publishEvent(store, {
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { clientName: 'Test Corp' },
    });

    expect(second.isNew).toBe(true);
    expect(second.event.id).not.toBe(first.event.id);
  });

  it('same payload different type creates new event', async () => {
    const first = await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { data: 'test' },
    });

    const second = await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'BUILD_REQUESTED',
      payloadJson: { data: 'test' },
    });

    expect(second.isNew).toBe(true);
    expect(second.event.id).not.toBe(first.event.id);
  });
});

describe('markProcessing', () => {
  let store: InMemoryEventStore;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  it('sets status to PROCESSING with lock info', async () => {
    const { event } = await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { data: 'test' },
    });

    const updated = await markProcessing(store, event.id, 'worker-1');
    expect(updated.status).toBe('PROCESSING');
    expect(updated.lockedBy).toBe('worker-1');
    expect(updated.lockedAt).toBeInstanceOf(Date);
  });
});

describe('markDone', () => {
  let store: InMemoryEventStore;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  it('sets status to DONE and clears lock', async () => {
    const { event } = await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { data: 'test' },
    });

    await markProcessing(store, event.id, 'worker-1');
    const updated = await markDone(store, event.id);

    expect(updated.status).toBe('DONE');
    expect(updated.lockedAt).toBeNull();
    expect(updated.lockedBy).toBeNull();
  });
});

describe('markFailed', () => {
  let store: InMemoryEventStore;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  it('increments attempts and sets backoff', async () => {
    const { event } = await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { data: 'test' },
    });

    await markProcessing(store, event.id, 'worker-1');
    const updated = await markFailed(store, event.id, 'Connection timeout', 1000);

    expect(updated.status).toBe('FAILED');
    expect(updated.attempts).toBe(1);
    expect(updated.lastError).toBe('Connection timeout');
    expect(updated.lockedAt).toBeNull();
    expect(updated.lockedBy).toBeNull();
    expect(updated.nextRunAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('markDeadLetter', () => {
  let store: InMemoryEventStore;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  it('sets status to DEAD_LETTERED', async () => {
    const { event } = await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { data: 'test' },
    });

    await markProcessing(store, event.id, 'worker-1');
    const updated = await markDeadLetter(store, event.id, 'Max retries exceeded');

    expect(updated.status).toBe('DEAD_LETTERED');
    expect(updated.lastError).toBe('Max retries exceeded');
    expect(updated.lockedAt).toBeNull();
    expect(updated.lockedBy).toBeNull();
  });
});

describe('InMemoryEventStore', () => {
  let store: InMemoryEventStore;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  it('fetchBatch returns only PENDING/FAILED events ready to run', async () => {
    // Insert 3 events
    await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'EVENT_A',
      payloadJson: { id: 1 },
    });
    await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'EVENT_B',
      payloadJson: { id: 2 },
    });
    await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'EVENT_C',
      payloadJson: { id: 3 },
    });

    // Mark one as DONE
    const all = await store.fetchBatch(10, 'worker-0');
    await markDone(store, all[0]!.id);

    // Reset locks on the remaining so they can be fetched again
    await store.update(all[1]!.id, { lockedAt: null, lockedBy: null, status: 'PENDING' });
    await store.update(all[2]!.id, { lockedAt: null, lockedBy: null, status: 'PENDING' });

    // Fetch batch — should get 2 (not the DONE one)
    const batch = await store.fetchBatch(10, 'worker-1');
    expect(batch).toHaveLength(2);
    for (const e of batch) {
      expect(e.status).toBe('PROCESSING');
      expect(e.lockedBy).toBe('worker-1');
    }
  });

  it('fetchBatch respects batchSize limit', async () => {
    for (let i = 0; i < 5; i++) {
      await publishEvent(store, {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        type: `EVENT_${i}`,
        payloadJson: { i },
      });
    }

    const batch = await store.fetchBatch(2, 'worker-1');
    expect(batch).toHaveLength(2);
  });

  it('fetchBatch skips locked events (simulates SKIP LOCKED)', async () => {
    await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'EVENT_A',
      payloadJson: { id: 1 },
    });

    // Worker 1 locks it
    const batch1 = await store.fetchBatch(10, 'worker-1');
    expect(batch1).toHaveLength(1);

    // Worker 2 should get nothing (already locked)
    const batch2 = await store.fetchBatch(10, 'worker-2');
    expect(batch2).toHaveLength(0);
  });

  it('fetchBatch skips FAILED events with future nextRunAt', async () => {
    const { event } = await publishEvent(store, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'EVENT_A',
      payloadJson: { id: 1 },
    });

    // Mark as failed with future backoff
    await markProcessing(store, event.id, 'worker-1');
    await markFailed(store, event.id, 'error', 60_000); // 60s backoff

    // Should not be fetched because nextRunAt is in the future
    const batch = await store.fetchBatch(10, 'worker-2');
    expect(batch).toHaveLength(0);
  });

  it('findByHash returns null for non-existent event', async () => {
    const result = await store.findByHash('proj', 'TYPE', 'nope');
    expect(result).toBeNull();
  });

  it('findById returns null for non-existent event', async () => {
    const result = await store.findById('nonexistent');
    expect(result).toBeNull();
  });
});
