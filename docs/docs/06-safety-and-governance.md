# Safety & Governance

Every agent run, action execution, and build step passes through multiple governance layers before anything is executed.

---

## Governance Layers

```
1. Assumption Gate        — no approved assumptions → no execution
2. Budget Check           — daily/monthly GBP limits enforced
3. Execution Guard        — per-project agent/action enablement
4. Allowlist Enforcement  — stage and workflow allowlists
5. Dry-Run Mode           — log only, no side effects
6. Schema Validation      — invalid output rejected
7. QC Validation          — critical/major violations block build
8. Idempotency            — duplicate events and actions skipped
9. RBAC                   — role-based access control on all endpoints
```

---

## Assumption Gate

No agent execution proceeds without explicitly approved assumptions.

- Every `RequirementsVersion` includes assumptions
- Each assumption has status: `pending` → `approved` | `rejected`
- The `StoreBackedRequirementsProvider` checks `assumptionsApproved` before the build pipeline starts
- Rejected assumptions trigger auto-regeneration of requirements

---

## Budget Enforcement

Per-project budgets are checked before every agent run:

```typescript
interface ProjectBudget {
  projectId: string;
  dailyBudgetGbp: number;
  monthlyBudgetGbp: number;
}
```

The `budgetCheck()` function:
1. Gets current daily and monthly spend from telemetry store
2. Estimates cost of the proposed run (model × tokens)
3. Blocks if projected spend exceeds either limit
4. Returns `allowed: false` with reason if budget would be exceeded

---

## Execution Guards

Per-project guards control which agents and actions can run:

### Agent Guards
```typescript
checkAgentExecution({ agentId, config }) → ExecutionGuardResult
```
- If `config.enabledAgents` is empty → all agents allowed
- If populated → only listed agents can execute
- Dry-run mode logs execution without side effects

### Action Guards
```typescript
checkActionExecution({ actionId, config }) → ExecutionGuardResult
```
- If `config.enabledActions` is empty → all actions allowed
- If populated → only listed action types can execute
- Additional allowlist checks for specific stages and workflows

### BlockedReason Values

| Reason | Meaning |
|--------|---------|
| `dry-run` | Action logged but not executed |
| `agent-disabled` | Agent not in enabledAgents list |
| `action-disabled` | Action type not in enabledActions list |
| `budget-exceeded` | Would exceed daily or monthly budget |
| `stage-not-allowlisted` | Target pipeline stage not permitted |
| `workflow-not-allowlisted` | Target workflow not permitted |
| `duplicate-execution` | Payload hash already executed |

---

## Project Configuration

Each project has a declarative config that controls execution:

```typescript
interface ProjectConfig {
  projectId: string;
  dryRun: boolean;              // default: false
  enabledAgents: string[];      // empty = all enabled
  enabledActions: string[];     // empty = all enabled
  allowlists: {
    pipelineStages: Array<{ pipelineId, stageId }>;
    workflowIds: string[];
  };
}
```

Empty arrays are permissive (all allowed). Populated arrays are restrictive (only listed items allowed).

---

## RBAC & Multi-Tenant Access

### Roles

| Role | Level | Write | Read |
|------|-------|-------|------|
| `agency_admin` | Agency | All projects | All projects |
| `agency_operator` | Agency | All projects | All projects |
| `client_admin` | Client | Own org projects | Own org projects |
| `client_member` | Client | None | Own org projects |
| `viewer` | Any | None | Assigned projects |

### Access Control Functions

- `canAccessOrg(ctx, orgId)` — check org membership
- `canAccessProject(ctx, project)` — agency roles access all; client roles check org
- `canWriteOrg(ctx, orgId)` — write permission check
- `canWriteProject(ctx, project)` — agency roles write all; client_admin writes own
- `isAgencyUser(ctx)` — check for agency_admin or agency_operator
- `isViewerOnly(ctx)` — check if all memberships are viewer role

### Auth Middleware

API endpoints are protected by:
1. **Token verification** — Bearer token validated via `TokenVerifier`
2. **Membership loading** — User's org memberships loaded
3. **AuthContext construction** — Attached to request context
4. **Project access check** — Per-endpoint read or write mode enforcement

---

## Idempotency

### Event Idempotency
- Events are hashed using `computeEventHash()` (SHA256 of sorted JSON payload)
- Duplicate payloads for the same project + type are detected and skipped
- `publishEvent()` returns `{ isNew: false }` for duplicates

### Action Idempotency
- GHL actions are hashed using `computePayloadHash()`
- `ActionExecutor` maintains a set of executed hashes
- Same action cannot execute twice in the same session

---

## Schema Validation

Every handoff point validates output against Zod schemas:

| Handoff | Schema |
|---------|--------|
| Agent output | `AgentOutputSchema` |
| Marketing step | `MarketingBlueprintSchema` |
| UX step | `UXUISpecSchema` |
| Copy step | `CopyPackSchema` |
| QC step | `QCReportSchema` |
| Requirements | `RequirementsBundleSchema` |
| Confirm payload | `ConfirmPayloadSchema` |
| GHL actions | `GHLActionSchema` |

Invalid output is rejected immediately. No graceful degradation.

---

## Kill Switch

Any project can be stopped by:
1. Setting `dryRun: true` — all actions logged but not executed
2. Setting `enabledAgents: []` with specific agents removed
3. Setting `enabledActions: []` with specific actions removed
4. Not approving assumptions — blocks all agent execution

---

## CI & TDD Enforcement

- 506+ tests across all packages
- `pnpm test`, `pnpm lint`, `pnpm typecheck` enforced in CI
- No task marked DONE without tests (per CLAUDE.md rules)
- GitHub Actions pipeline validates on every push
