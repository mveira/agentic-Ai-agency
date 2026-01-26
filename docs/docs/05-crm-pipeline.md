# CRM Pipeline & GHL Actions

## Pipeline Stages

```
New Lead
  → Discovery Complete
    → Requirements Review
      → Proposal Sent
        → Won / Lost
```

Optional: Internal Review (between Requirements Review and Proposal Sent)

---

## Allowed AI Transitions

| From | To | Trigger |
|------|----|---------|
| New Lead | Discovery Complete | Clarification rounds complete |
| Discovery Complete | Requirements Review | Requirements generated |
| Requirements Review | Build Ready | Review approved |

**Blocked transitions:**
- Skipping stages (e.g. New Lead → Proposal Sent)
- Auto-marking Won — requires human decision
- Any stage not in the project's allowlist

---

## GHL Action Types

The system supports two action types, defined as a discriminated union in `GHLActionSchema`:

### move_stage
Move an opportunity to a new pipeline stage.

```json
{
  "action": "move_stage",
  "opportunityId": "opp-123",
  "pipelineId": "pipe-abc",
  "stageId": "stage-xyz",
  "reason": "Requirements confirmed — moving to build ready"
}
```

### trigger_workflow
Add a contact to a GHL workflow (e.g. notification, follow-up).

```json
{
  "action": "trigger_workflow",
  "contactId": "contact-456",
  "workflowId": "wf-789",
  "reason": "Notify agency of review completion"
}
```

---

## ActionExecutor

The `ActionExecutor` class enforces a 5-level guard chain before executing any GHL action:

```
1. Idempotency check → already executed? → skip
2. Action enablement → action type in config.enabledActions? → block
3. Allowlist check → stage/workflow in allowlist? → block
4. Dry-run check → config.dryRun? → log only
5. Execute → call GHL adapter → record hash
```

### Guard Results

Each guard check returns an `ExecutionGuardResult`:

```typescript
{
  allowed: boolean;
  dryRun: boolean;
  blockedReason?: BlockedReason;
  message?: string;
}
```

**BlockedReason values:**
- `dry-run` — action logged but not executed
- `action-disabled` — action type not in enabledActions
- `stage-not-allowlisted` — target stage not in allowlist
- `workflow-not-allowlisted` — target workflow not in allowlist
- `duplicate-execution` — payload hash already executed

### Telemetry

Every action execution (or block) produces an `ActionTelemetryEvent`:

```typescript
{
  projectId, actionType, payloadHash,
  executed, dryRun, blocked,
  blockedReason?, message, timestamp
}
```

Accessible via `executor.getLog()` and `executor.getLogByProject(projectId)`.

### Payload Hashing

Actions are hashed deterministically based on their type and fields using `computePayloadHash()`. This ensures idempotency — the same action cannot be executed twice in the same session.

---

## GHL Adapter Interface

The `GHLAdapter` interface abstracts all CRM communication:

```typescript
interface GHLAdapter {
  getPipelines(): Promise<GHLPipeline[]>;
  updateOpportunityStage(opportunityId, pipelineId, stageId): Promise<{ success, error? }>;
  addContactToWorkflow(contactId, workflowId): Promise<{ success, error? }>;
}
```

A `MockGHLAdapter` is provided for tests with a `.calls` array and `.shouldFail` toggle.

---

## Milestone Hooks

GHL actions are triggered at key system milestones via hook builders:

| Hook | Actions |
|------|---------|
| `buildGenerateHooks()` | `move_stage` to Requirements Review |
| `buildReviewApprovedHooks()` | `move_stage` to Build Ready + `trigger_workflow` for notification |

These return `MilestoneHook` objects containing valid `GHLAction` entries that can be passed to `ActionExecutor.execute()`.

---

## Pipeline Sync

Projects can sync pipeline and workflow data from GHL:

- `POST /api/projects/:id/sync/pipelines` — fetch pipeline/stage IDs from GHL
- `POST /api/projects/:id/sync/workflows` — store workflow IDs for the project

This populates the allowlists used by execution guards.
