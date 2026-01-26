import { createHash } from 'node:crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export type EventStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'DEAD_LETTERED';

export interface SystemEvent {
  id: string;
  projectId: string;
  type: string;
  status: EventStatus;
  payloadJson: Record<string, unknown>;
  payloadHash: string;
  attempts: number;
  nextRunAt: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishEventParams {
  projectId: string;
  type: string;
  payloadJson: Record<string, unknown>;
}

export interface PublishEventResult {
  event: SystemEvent;
  isNew: boolean;
}

// ─── EventStore Interface ────────────────────────────────────────────────────

export interface EventStore {
  insert(event: Omit<SystemEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<SystemEvent>;
  findByHash(projectId: string, type: string, payloadHash: string): Promise<SystemEvent | null>;
  findById(id: string): Promise<SystemEvent | null>;
  fetchBatch(batchSize: number, workerId: string): Promise<SystemEvent[]>;
  update(id: string, updates: Partial<Omit<SystemEvent, 'id' | 'createdAt'>>): Promise<SystemEvent>;
}

// ─── Payload Hash ────────────────────────────────────────────────────────────

export function computeEventHash(payload: Record<string, unknown>): string {
  const sorted = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash('sha256').update(sorted).digest('hex');
}

// ─── Event API ───────────────────────────────────────────────────────────────

export async function publishEvent(
  store: EventStore,
  params: PublishEventParams
): Promise<PublishEventResult> {
  const payloadHash = computeEventHash(params.payloadJson);

  const existing = await store.findByHash(params.projectId, params.type, payloadHash);
  if (existing) {
    return { event: existing, isNew: false };
  }

  const event = await store.insert({
    projectId: params.projectId,
    type: params.type,
    status: 'PENDING',
    payloadJson: params.payloadJson,
    payloadHash,
    attempts: 0,
    nextRunAt: new Date(),
    lockedAt: null,
    lockedBy: null,
    lastError: null,
  });

  return { event, isNew: true };
}

export async function markProcessing(
  store: EventStore,
  eventId: string,
  workerId: string
): Promise<SystemEvent> {
  return store.update(eventId, {
    status: 'PROCESSING',
    lockedAt: new Date(),
    lockedBy: workerId,
  });
}

export async function markDone(store: EventStore, eventId: string): Promise<SystemEvent> {
  return store.update(eventId, {
    status: 'DONE',
    lockedAt: null,
    lockedBy: null,
  });
}

export async function markFailed(
  store: EventStore,
  eventId: string,
  error: string,
  backoffMs: number
): Promise<SystemEvent> {
  const event = await store.findById(eventId);
  if (!event) throw new Error(`Event ${eventId} not found`);

  return store.update(eventId, {
    status: 'FAILED',
    attempts: event.attempts + 1,
    lastError: error,
    lockedAt: null,
    lockedBy: null,
    nextRunAt: new Date(Date.now() + backoffMs),
  });
}

export async function markDeadLetter(
  store: EventStore,
  eventId: string,
  error: string
): Promise<SystemEvent> {
  return store.update(eventId, {
    status: 'DEAD_LETTERED',
    lastError: error,
    lockedAt: null,
    lockedBy: null,
  });
}

// ─── InMemoryEventStore ──────────────────────────────────────────────────────

let counter = 0;
function generateId(): string {
  counter++;
  return `evt-${Date.now()}-${counter}`;
}

export class InMemoryEventStore implements EventStore {
  private events = new Map<string, SystemEvent>();

  async insert(
    event: Omit<SystemEvent, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SystemEvent> {
    const now = new Date();
    const full: SystemEvent = {
      ...event,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    this.events.set(full.id, full);
    return { ...full };
  }

  async findByHash(
    projectId: string,
    type: string,
    payloadHash: string
  ): Promise<SystemEvent | null> {
    for (const event of this.events.values()) {
      if (
        event.projectId === projectId &&
        event.type === type &&
        event.payloadHash === payloadHash
      ) {
        return { ...event };
      }
    }
    return null;
  }

  async findById(id: string): Promise<SystemEvent | null> {
    const event = this.events.get(id);
    return event ? { ...event } : null;
  }

  async fetchBatch(batchSize: number, workerId: string): Promise<SystemEvent[]> {
    const now = new Date();
    const eligible: SystemEvent[] = [];

    for (const event of this.events.values()) {
      if (eligible.length >= batchSize) break;

      // Only fetch PENDING or FAILED (retry-ready) events
      if (event.status !== 'PENDING' && event.status !== 'FAILED') continue;

      // Skip if locked by another worker
      if (event.lockedAt !== null) continue;

      // Skip if not yet ready to run (backoff)
      if (event.nextRunAt > now) continue;

      eligible.push(event);
    }

    // Atomically lock all eligible events
    const locked: SystemEvent[] = [];
    for (const event of eligible) {
      const updated: SystemEvent = {
        ...event,
        status: 'PROCESSING',
        lockedAt: now,
        lockedBy: workerId,
        updatedAt: now,
      };
      this.events.set(event.id, updated);
      locked.push({ ...updated });
    }

    return locked;
  }

  async update(
    id: string,
    updates: Partial<Omit<SystemEvent, 'id' | 'createdAt'>>
  ): Promise<SystemEvent> {
    const existing = this.events.get(id);
    if (!existing) throw new Error(`Event ${id} not found`);

    const updated: SystemEvent = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.events.set(id, updated);
    return { ...updated };
  }

  /** Test helper: get all events */
  getAll(): SystemEvent[] {
    return [...this.events.values()].map((e) => ({ ...e }));
  }
}
