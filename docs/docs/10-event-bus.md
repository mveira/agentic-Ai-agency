# Event Bus & Worker

The event system provides persistent, deduplicated event processing with automatic retries, exponential backoff, and dead-lettering.

---

## Event Lifecycle

```
PENDING → PROCESSING → DONE
                     → FAILED → (retry) → PROCESSING → DONE
                              → (max retries) → DEAD_LETTERED
```

---

## Publishing Events

```typescript
const result = await publishEvent(store, {
  projectId: 'project-123',
  type: 'DISCOVERY_SUBMITTED',
  payloadJson: { leadId: 'lead-456', source: 'form' }
});

// result.isNew === true  → new event created
// result.isNew === false → duplicate detected, existing event returned
```

### Deduplication

Events are deduplicated by `payloadHash` — a SHA256 hash of the JSON payload with sorted keys.

If a matching event already exists for the same `projectId` + `type` + `payloadHash`, the existing event is returned with `isNew: false`.

---

## Event Schema

```typescript
interface SystemEvent {
  id: string;                     // Generated on insert
  projectId: string;
  type: string;                   // Event type identifier
  status: EventStatus;            // PENDING | PROCESSING | DONE | FAILED | DEAD_LETTERED
  payloadJson: Record<string, unknown>;
  payloadHash: string;            // SHA256 for idempotency
  attempts: number;               // Retry counter
  nextRunAt: Date;                // Backoff scheduling
  lockedAt: Date | null;          // Distributed lock timestamp
  lockedBy: string | null;        // Worker ID holding lock
  lastError: string | null;       // Error from last attempt
  createdAt: Date;
  updatedAt: Date;
}
```

---

## EventStore Interface

```typescript
interface EventStore {
  insert(event): Promise<SystemEvent>;
  findByHash(projectId, type, payloadHash): Promise<SystemEvent | null>;
  findById(id): Promise<SystemEvent | null>;
  fetchBatch(batchSize, workerId): Promise<SystemEvent[]>;
  update(id, updates): Promise<SystemEvent>;
}
```

`InMemoryEventStore` is the current implementation. Real database storage is planned.

### Batch Fetching

`fetchBatch()` atomically locks eligible events:
- Status is `PENDING` or `FAILED`
- `nextRunAt` is not in the future
- Not already locked by another worker

---

## Event Worker

The `EventWorker` processes event batches using registered handlers.

### Configuration

```typescript
interface EventWorkerConfig {
  store: EventStore;
  handlers: Map<string, EventHandler>;   // event type → handler function
  workerId: string;
  batchSize: number;
  maxAttempts: number;
  baseBackoffMs: number;
}
```

### Processing Loop

Each `tick()` call:
1. Fetches a batch of eligible events from the store
2. For each event:
   - Looks up handler by `event.type`
   - Executes handler
   - On success → `markDone()`
   - On failure:
     - If `attempts < maxAttempts` → `markFailed()` with backoff
     - If `attempts >= maxAttempts` → `markDeadLetter()`
3. Returns `ProcessResult[]` for each event

### Process Result

```typescript
interface ProcessResult {
  eventId: string;
  eventType: string;
  status: 'success' | 'failed' | 'dead_lettered';
  error?: string;
  durationMs: number;
}
```

---

## Retry & Backoff

Failed events are retried with exponential backoff:

```
nextRunAt = now + baseBackoffMs × 2^(attempts - 1)
```

| Attempt | Backoff (base=1000ms) |
|---------|----------------------|
| 1 | 1 second |
| 2 | 2 seconds |
| 3 | 4 seconds |
| 4 | 8 seconds |
| 5 | 16 seconds |

After `maxAttempts`, the event is moved to `DEAD_LETTERED` status and will not be retried.

---

## Status Transition Functions

| Function | From | To | Notes |
|----------|------|----|-------|
| `markProcessing()` | PENDING/FAILED | PROCESSING | Locks with workerId |
| `markDone()` | PROCESSING | DONE | Clears lock |
| `markFailed()` | PROCESSING | FAILED | Increments attempts, schedules retry |
| `markDeadLetter()` | PROCESSING | DEAD_LETTERED | Max retries exceeded |

---

## Distributed Locking

Events are locked atomically during `fetchBatch()`:
- `lockedAt` set to current timestamp
- `lockedBy` set to worker ID
- Other workers cannot claim locked events
- Prevents duplicate processing in multi-worker deployments
