# Parallel Rollout

## Principle

The same system runs both agency and client CRMs simultaneously. The difference is configuration, not code.

---

## How It Works

Every project has a `ProjectConfig` that controls execution behaviour:

```typescript
{
  projectId: "project-123",
  dryRun: false,                    // Agency: false (live), Client: true (dry-run)
  enabledAgents: [],                // Empty = all agents active
  enabledActions: ["move_stage"],   // Restrict which GHL actions are allowed
  allowlists: {
    pipelineStages: [               // Only these stages can be targeted
      { pipelineId: "pipe-1", stageId: "stage-a" }
    ],
    workflowIds: ["wf-notify"]      // Only these workflows can be triggered
  }
}
```

---

## Rollout Modes

### Agency CRM — Live

```
dryRun: false
enabledAgents: []         → all agents active
enabledActions: []        → all action types allowed
allowlists: populated    → specific stages and workflows permitted
```

- Webhooks fire from agency CRM
- Agents execute with real LLM calls
- GHL actions execute (move stages, trigger workflows)
- Telemetry records actual costs
- Full pipeline: clarification → requirements → build → actions

### Client CRM — Dry-Run

```
dryRun: true
enabledAgents: []         → all agents active (or subset)
enabledActions: []        → all action types allowed
allowlists: populated    → restrict to safe stages only
```

- Same webhooks, same event bus, same agents
- LLM calls execute normally (agents still reason)
- GHL actions are **logged but not executed**
- `ActionExecutionResult.dryRun = true`
- Telemetry still tracks token usage and cost
- Portal still updates with results

### Graduated Rollout

Transition from dry-run to live by changing one config value:

```
dryRun: true  →  dryRun: false
```

No code changes. No redeployment. Same webhook, same agents, different execution mode.

---

## Execution Guard Flow

```
Incoming event
  │
  ├── checkAgentExecution()
  │     ├── Agent in enabledAgents? → proceed
  │     └── Agent disabled? → blocked (reason: agent-disabled)
  │
  ├── budgetCheck()
  │     ├── Within daily/monthly limit? → proceed
  │     └── Over budget? → blocked (reason: budget-exceeded)
  │
  └── ActionExecutor.execute()
        ├── 1. Idempotency → already done? → skip
        ├── 2. Action enabled? → not in list? → block
        ├── 3. Allowlisted? → stage/workflow not permitted? → block
        ├── 4. Dry-run? → log only, skip execution
        └── 5. Execute → call GHL adapter
```

Every step produces telemetry. Blocked actions are logged with their `blockedReason`.

---

## Benefits

- **Real traffic testing** — agents process actual CRM events, just without side effects
- **Zero client risk** — dry-run mode prevents any CRM mutations
- **Cost visibility** — token spend tracked even in dry-run
- **Faster iteration** — test agent behaviour on real data before going live
- **Strong sales narrative** — show clients the system working on their data before turning it on
- **Gradual enablement** — enable agents one by one, actions one by one, stages one by one

---

## Telemetry in Both Modes

Both live and dry-run produce identical telemetry:

| Metric | Live | Dry-Run |
|--------|------|---------|
| Token usage | Tracked | Tracked |
| Cost estimation | Tracked | Tracked |
| Agent execution | Recorded | Recorded |
| Action execution | Recorded (executed=true) | Recorded (dryRun=true) |
| Guard decisions | Logged | Logged |
| Event processing | Full lifecycle | Full lifecycle |

The only difference: `ActionExecutionResult.executed` is `false` in dry-run mode.
