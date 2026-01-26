import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventWorker, type EventHandler } from './event-worker.js';
import { InMemoryEventStore, publishEvent } from './event-bus.js';

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('EventWorker', () => {
  let store: InMemoryEventStore;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  function createWorker(
    handlers: Map<string, EventHandler>,
    overrides: Partial<{
      workerId: string;
      batchSize: number;
      maxAttempts: number;
      baseBackoffMs: number;
    }> = {}
  ) {
    return new EventWorker({
      store,
      handlers,
      workerId: overrides.workerId ?? 'worker-test',
      batchSize: overrides.batchSize ?? 10,
      maxAttempts: overrides.maxAttempts ?? 3,
      baseBackoffMs: overrides.baseBackoffMs ?? 100,
    });
  }

  it('processes a PENDING event and marks it DONE', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const handlers = new Map<string, EventHandler>([
      ['DISCOVERY_SUBMITTED', handler],
    ]);

    await publishEvent(store, {
      projectId: PROJECT_ID,
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { clientName: 'Test' },
    });

    const worker = createWorker(handlers);
    const results = await worker.tick();

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe('success');
    expect(handler).toHaveBeenCalledOnce();

    const events = store.getAll();
    expect(events[0]!.status).toBe('DONE');
  });

  it('handler receives correct event data', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const handlers = new Map<string, EventHandler>([
      ['DISCOVERY_SUBMITTED', handler],
    ]);

    await publishEvent(store, {
      projectId: PROJECT_ID,
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { clientName: 'Acme' },
    });

    const worker = createWorker(handlers);
    await worker.tick();

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: PROJECT_ID,
        type: 'DISCOVERY_SUBMITTED',
        payloadJson: { clientName: 'Acme' },
      })
    );
  });

  it('marks event FAILED on handler error and increments attempts', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('API down'));
    const handlers = new Map<string, EventHandler>([
      ['DISCOVERY_SUBMITTED', handler],
    ]);

    await publishEvent(store, {
      projectId: PROJECT_ID,
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { data: 'test' },
    });

    const worker = createWorker(handlers);
    const results = await worker.tick();

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe('failed');
    expect(results[0]!.error).toBe('API down');

    const events = store.getAll();
    expect(events[0]!.status).toBe('FAILED');
    expect(events[0]!.attempts).toBe(1);
    expect(events[0]!.lastError).toBe('API down');
  });

  it('dead-letters event after max attempts', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Persistent failure'));
    const handlers = new Map<string, EventHandler>([
      ['DISCOVERY_SUBMITTED', handler],
    ]);

    const { event } = await publishEvent(store, {
      projectId: PROJECT_ID,
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { data: 'test' },
    });

    // Simulate previous attempts by setting attempts to maxAttempts - 1
    await store.update(event.id, { attempts: 2 });

    const worker = createWorker(handlers, { maxAttempts: 3 });
    const results = await worker.tick();

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe('dead_lettered');

    const events = store.getAll();
    expect(events[0]!.status).toBe('DEAD_LETTERED');
    expect(events[0]!.lastError).toBe('Persistent failure');
  });

  it('fails gracefully for unknown event type', async () => {
    const handlers = new Map<string, EventHandler>();

    await publishEvent(store, {
      projectId: PROJECT_ID,
      type: 'UNKNOWN_EVENT',
      payloadJson: { data: 'test' },
    });

    const worker = createWorker(handlers);
    const results = await worker.tick();

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe('failed');
    expect(results[0]!.error).toContain('No handler registered');

    const events = store.getAll();
    expect(events[0]!.status).toBe('FAILED');
  });

  it('two workers do not process the same event', async () => {
    const handler = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 50))
    );
    const handlers = new Map<string, EventHandler>([
      ['DISCOVERY_SUBMITTED', handler],
    ]);

    await publishEvent(store, {
      projectId: PROJECT_ID,
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { data: 'shared' },
    });

    const worker1 = createWorker(handlers, { workerId: 'worker-1' });
    const worker2 = createWorker(handlers, { workerId: 'worker-2' });

    // Both workers tick concurrently
    const [results1, results2] = await Promise.all([
      worker1.tick(),
      worker2.tick(),
    ]);

    // Only one should have processed the event
    const totalProcessed = results1.length + results2.length;
    expect(totalProcessed).toBe(1);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('retry uses exponential backoff', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('fail'));
    const handlers = new Map<string, EventHandler>([
      ['DISCOVERY_SUBMITTED', handler],
    ]);

    const { event } = await publishEvent(store, {
      projectId: PROJECT_ID,
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { data: 'test' },
    });

    // First failure (attempt 0 -> 1)
    const worker = createWorker(handlers, { baseBackoffMs: 1000 });
    await worker.tick();

    let updated = (await store.findById(event.id))!;
    expect(updated.attempts).toBe(1);
    // Backoff = baseBackoffMs * 2^(attempts-1) = 1000 * 2^0 = 1000ms
    const backoff1 = updated.nextRunAt.getTime() - updated.updatedAt.getTime();
    expect(backoff1).toBeGreaterThanOrEqual(900); // Allow small timing variance

    // Simulate that backoff has elapsed and try again
    await store.update(event.id, {
      nextRunAt: new Date(Date.now() - 1),
      lockedAt: null,
      lockedBy: null,
      status: 'FAILED',
    });
    await worker.tick();

    updated = (await store.findById(event.id))!;
    expect(updated.attempts).toBe(2);
    // Backoff = 1000 * 2^1 = 2000ms
    const backoff2 = updated.nextRunAt.getTime() - updated.updatedAt.getTime();
    expect(backoff2).toBeGreaterThanOrEqual(1800);
  });

  it('processes multiple events in a single tick', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const handlers = new Map<string, EventHandler>([
      ['EVENT_A', handler],
      ['EVENT_B', handler],
    ]);

    await publishEvent(store, {
      projectId: PROJECT_ID,
      type: 'EVENT_A',
      payloadJson: { id: 1 },
    });
    await publishEvent(store, {
      projectId: PROJECT_ID,
      type: 'EVENT_B',
      payloadJson: { id: 2 },
    });

    const worker = createWorker(handlers);
    const results = await worker.tick();

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === 'success')).toBe(true);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('returns empty results when no events to process', async () => {
    const handlers = new Map<string, EventHandler>();
    const worker = createWorker(handlers);
    const results = await worker.tick();
    expect(results).toHaveLength(0);
  });

  it('records telemetry for each processed event', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const handlers = new Map<string, EventHandler>([
      ['DISCOVERY_SUBMITTED', handler],
    ]);

    await publishEvent(store, {
      projectId: PROJECT_ID,
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { data: 'test' },
    });

    const worker = createWorker(handlers);
    const results = await worker.tick();

    expect(results[0]!.eventId).toBeDefined();
    expect(results[0]!.eventType).toBe('DISCOVERY_SUBMITTED');
    expect(results[0]!.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('DISCOVERY_SUBMITTED stub handler', () => {
  it('is registered in createDefaultHandlers', async () => {
    const { createDefaultHandlers } = await import('./event-worker.js');
    const handlers = createDefaultHandlers();
    expect(handlers.has('DISCOVERY_SUBMITTED')).toBe(true);
  });

  it('executes without error (stub)', async () => {
    const { createDefaultHandlers } = await import('./event-worker.js');
    const handlers = createDefaultHandlers();
    const store = new InMemoryEventStore();

    await publishEvent(store, {
      projectId: PROJECT_ID,
      type: 'DISCOVERY_SUBMITTED',
      payloadJson: { clientName: 'Test' },
    });

    const worker = new EventWorker({
      store,
      handlers,
      workerId: 'test',
      batchSize: 10,
      maxAttempts: 3,
      baseBackoffMs: 100,
    });

    const results = await worker.tick();
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe('success');
  });
});
