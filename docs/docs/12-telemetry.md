# Telemetry & Cost Tracking

The telemetry system tracks token usage, cost estimation, and budget enforcement across all agent runs. All costs are in GBP.

---

## Model Pricing

| Model | Input (GBP/M tokens) | Output (GBP/M tokens) |
|-------|---------------------|-----------------------|
| claude-3-opus | £12.00 | £60.00 |
| claude-3-sonnet | £2.40 | £12.00 |
| claude-3-haiku | £0.20 | £1.00 |
| gpt-4-turbo | £8.00 | £24.00 |
| gpt-4o | £2.00 | £8.00 |
| gpt-4o-mini | £0.12 | £0.48 |

Pricing is looked up via `getModelPricing(modelId)`.

---

## Cost Estimation

```typescript
const estimate = estimateCost({
  modelId: 'claude-3-sonnet',
  inputTokens: 1000,
  outputTokens: 500
});

// Returns:
// {
//   inputCost: 0.0024,
//   outputCost: 0.006,
//   totalCost: 0.0084,
//   currency: 'GBP'
// }
```

Used before execution (budget check) and after execution (telemetry recording).

---

## Task Run Recording

Every agent execution is recorded as a `TaskRun`:

```typescript
interface TaskRun {
  projectId: string;
  agentId: string;
  taskType: string;
  model: string;
  promptHash: string;        // Links to compiled prompt
  inputTokens: number;
  outputTokens: number;
  cost: number;              // GBP
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}
```

`recordTaskRun()` auto-calculates cost from model pricing and token counts. Sets `completedAt` when status is `completed` or `failed`.

---

## Spend Queries

```typescript
const spend = await getProjectSpend({ projectId: 'project-123' });

// Returns:
// {
//   projectId: 'project-123',
//   dailySpend: 0.45,
//   monthlySpend: 12.30,
//   totalSpend: 48.75,
//   taskCount: 156
// }
```

- Only counts `completed` or `running` tasks (excludes `failed`)
- Daily spend = tasks from today (ISO date boundary)
- Monthly spend = tasks from this calendar month

---

## Budget Enforcement

Each project has configurable budget limits:

```typescript
interface ProjectBudget {
  projectId: string;
  dailyBudgetGbp: number;
  monthlyBudgetGbp: number;
}
```

### Budget Check Flow

```
1. Get current daily + monthly spend from store
2. Estimate cost of proposed run (model × tokens)
3. Check: currentDaily + estimatedCost ≤ dailyBudget?
4. Check: currentMonthly + estimatedCost ≤ monthlyBudget?
5. If either exceeds → blocked
```

### Budget Check Result

```typescript
interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;              // Why blocked
  currentDailySpend: number;
  currentMonthlySpend: number;
  estimatedCost: number;
  dailyBudget: number;
  monthlyBudget: number;
}
```

Budget checks run before every agent execution via the task route. If `allowed: false`, the task is not executed and the reason is returned.

---

## Telemetry Store

`InMemoryTelemetryStore` provides:
- Task run storage per project
- Project budget storage
- Model pricing storage
- Default singleton via `getDefaultStore()`
- Reset function for tests: `resetDefaultStore()`

Production will replace with database-backed implementation.

---

## Build Pipeline Telemetry

Each step of the build pipeline records a `TelemetryEntry`:

```typescript
{
  step: 'marketing' | 'ux-design' | 'copy' | 'qc';
  agentId: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  model: string;
}
```

All entries are collected into `buildPlan.telemetry` for per-build cost analysis.

---

## Action Telemetry

GHL action executions produce `ActionTelemetryEvent` entries:

```typescript
{
  projectId: string;
  actionType: string;           // 'move_stage' | 'trigger_workflow'
  payloadHash: string;
  executed: boolean;
  dryRun: boolean;
  blocked: boolean;
  blockedReason?: string;
  message: string;
  timestamp: Date;
}
```

Accessible via `ActionExecutor.getLog()` and `ActionExecutor.getLogByProject(projectId)`.

---

## Cost Caps per Agent

| Agent | Cost Cap (GBP) |
|-------|----------------|
| Research | £0.50 |
| Strategy Funnel | £0.75 |
| Copy Messaging | £1.00 |
| Automation CRM | £0.25 |
| UX Design | £0.75 |
| Quality Control | £0.50 |
| Business Architect | £0.50 |
| Requirements Engineer | £0.75 |

If an agent's estimated cost exceeds its cap, the LLM router downgrades to a cheaper model before execution.

---

## Spend API

```
GET /api/projects/:projectId/spend
```

Returns:
```json
{
  "projectId": "project-123",
  "daily": { "spend": 0.45, "currency": "GBP" },
  "monthly": { "spend": 12.30, "currency": "GBP" },
  "total": { "spend": 48.75, "currency": "GBP" },
  "taskCount": 156
}
```
