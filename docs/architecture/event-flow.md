# Event Flow

## System Lifecycle

```
1. Lead enters CRM (form, booking, etc.)
         |
2. GHL webhook fires
         |
3. Event ingested -> Event Bus (idempotency check via payloadHash)
         |
4. Governance check (assumption gate, budget, execution guards)
         |
5. CLARIFICATION PHASE
   |  BusinessArchitectAgent runs clarification rounds
   |  +-- Round 1: intake data -> Strapi templates -> LLM -> questions + readiness
   |  +-- Agency reviews DRAFT questions -> approves/edits -> APPROVED
   |  +-- Prospect answers APPROVED questions
   |  +-- Round 2+: prior answers -> fewer questions -> higher readiness
   |  +-- Readiness: NEEDS_MORE_INFO -> READY_FOR_REQUIREMENTS | BLOCKED
         |
6. REQUIREMENTS PHASE
   |  RequirementsEngineerAgent generates requirements from facts
   |  +-- Facts snapshot (summary + structured answers) -> Strapi rubric -> LLM
   |  +-- Output: RequirementsBundle (requirements with MoSCoW + assumptions)
   |  +-- Version stored as v1 with status: pending_confirmation
   |  +-- Prospect confirms/rejects each requirement and assumption
   |  +-- All confirmed -> status: confirmed -> KB auto-populated
   |  +-- Any rejection -> auto-regenerate v2 with change requests -> repeat
         |
7. REVIEW HANDOFF
   |  +-- Agent suggests: APPROVED | NEEDS_CLARIFICATION | NOT_A_FIT
   |  +-- NEEDS_CLARIFICATION -> targeted session with BusinessArchitectAgent
   |  +-- Human decides: APPROVED -> build ready | REJECTED -> stopped
         |
8. BUILD PHASE
   |  BuildOrchestrator runs 4-step pipeline:
   |  +-- Step 1: StrategyFunnelAgent -> MarketingBlueprint
   |  +-- Step 2: UXDesignAgent -> UXUISpec
   |  +-- Step 3: CopyMessagingAgent -> CopyPack
   |  +-- Step 4: QualityControlAgent -> QCReport
   |  +-- Schema validation at every handoff
   |  +-- QC can block execution -> { status: 'blocked', blockReason }
   |  +-- assembleBuildPlan() -> Mode B enforcement (core vs optional)
         |
9. GHL ACTIONS
   |  ActionExecutor runs with 5-level guard:
   |  +-- Action enabled? -> Allowlisted? -> Dry-run? -> Idempotent? -> Execute
   |  +-- move_stage: transition opportunity in pipeline
   |  +-- trigger_workflow: add contact to notification workflow
         |
10. TELEMETRY recorded (tokens, cost, model, duration)
         |
11. PORTAL updated (dashboard reflects current state)
         |
12. GHL MILESTONE HOOKS fire (stage transitions + workflow triggers)
```

---

## Key Decision Points

| Point | Gate | Outcome on Failure |
|-------|------|--------------------|
| Event ingestion | Idempotency hash | Duplicate skipped |
| Before agent run | Assumption gate | Execution blocked |
| Before agent run | Budget check | Execution blocked |
| Before agent run | Execution guard | Agent disabled / dry-run logged |
| After LLM output | Schema validation | Invalid output rejected |
| After QC | Severity check | Critical/major -> blocked |
| Before GHL action | Allowlist + idempotency | Action blocked or skipped |
| Requirements confirm | Rejection detected | Auto-regeneration triggered |
| Requirements confirm | All confirmed | KB auto-populated |

---

## Event Bus

The event system provides persistent, deduplicated event processing with automatic retries, exponential backoff, and dead-lettering.

### Event Lifecycle

```
PENDING -> PROCESSING -> DONE
                      -> FAILED -> (retry) -> PROCESSING -> DONE
                               -> (max retries) -> DEAD_LETTERED
```

### Event Schema

```typescript
interface SystemEvent {
  id: string;
  projectId: string;
  type: string;
  status: EventStatus;       // PENDING | PROCESSING | DONE | FAILED | DEAD_LETTERED
  payloadJson: Record<string, unknown>;
  payloadHash: string;       // SHA256 for idempotency
  attempts: number;
  nextRunAt: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Publishing & Deduplication

Events are deduplicated by `payloadHash` (SHA256 of sorted JSON payload). If a matching event already exists for the same `projectId` + `type` + `payloadHash`, the existing event is returned with `isNew: false`.

### EventStore Interface

```typescript
interface EventStore {
  insert(event): Promise<SystemEvent>;
  findByHash(projectId, type, payloadHash): Promise<SystemEvent | null>;
  findById(id): Promise<SystemEvent | null>;
  fetchBatch(batchSize, workerId): Promise<SystemEvent[]>;
  update(id, updates): Promise<SystemEvent>;
}
```

`InMemoryEventStore` is the current implementation. Database-backed storage is planned.

---

## Event Worker

The `EventWorker` processes event batches using registered handlers.

### Configuration

```typescript
interface EventWorkerConfig {
  store: EventStore;
  handlers: Map<string, EventHandler>;
  workerId: string;
  batchSize: number;
  maxAttempts: number;
  baseBackoffMs: number;
}
```

### Processing Loop

Each `tick()` call:
1. Fetches a batch of eligible events from the store
2. For each event: looks up handler by `event.type`, executes handler
3. On success: `markDone()`
4. On failure: if `attempts < maxAttempts` -> `markFailed()` with backoff; if `attempts >= maxAttempts` -> `markDeadLetter()`

### Retry & Backoff

Failed events are retried with exponential backoff: `nextRunAt = now + baseBackoffMs * 2^(attempts - 1)`

| Attempt | Backoff (base=1000ms) |
|---------|-----------------------|
| 1 | 1 second |
| 2 | 2 seconds |
| 3 | 4 seconds |
| 4 | 8 seconds |
| 5 | 16 seconds |

After `maxAttempts`, the event is moved to `DEAD_LETTERED` and will not be retried.

### Status Transition Functions

| Function | From | To | Notes |
|----------|------|----|-------|
| `markProcessing()` | PENDING/FAILED | PROCESSING | Locks with workerId |
| `markDone()` | PROCESSING | DONE | Clears lock |
| `markFailed()` | PROCESSING | FAILED | Increments attempts, schedules retry |
| `markDeadLetter()` | PROCESSING | DEAD_LETTERED | Max retries exceeded |

### Distributed Locking

Events are locked atomically during `fetchBatch()`. `lockedAt` and `lockedBy` prevent duplicate processing in multi-worker deployments.

---

## CRM Pipeline

### Pipeline Stages

```
New Lead -> Discovery Complete -> Requirements Review -> Proposal Sent -> Won / Lost
```

### Allowed AI Transitions

| From | To | Trigger |
|------|----|---------|
| New Lead | Discovery Complete | Clarification rounds complete |
| Discovery Complete | Requirements Review | Requirements generated |
| Requirements Review | Build Ready | Review approved |

Blocked transitions: skipping stages, auto-marking Won, any stage not in the project's allowlist.

### GHL Action Types

**move_stage** -- Move an opportunity to a new pipeline stage.

**trigger_workflow** -- Add a contact to a GHL workflow (notification, follow-up).

### ActionExecutor Guard Chain

```
1. Idempotency check -> already executed? -> skip
2. Action enablement -> action type in config.enabledActions? -> block
3. Allowlist check -> stage/workflow in allowlist? -> block
4. Dry-run check -> config.dryRun? -> log only
5. Execute -> call GHL adapter -> record hash
```

### Milestone Hooks

| Hook | Actions |
|------|---------|
| `buildGenerateHooks()` | `move_stage` to Requirements Review |
| `buildReviewApprovedHooks()` | `move_stage` to Build Ready + `trigger_workflow` for notification |
