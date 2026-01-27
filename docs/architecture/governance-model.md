# Governance Model

## Governance Layers

Every agent run, action execution, and build step passes through multiple governance layers before anything is executed.

```
1. Assumption Gate        -- no approved assumptions -> no execution
2. Budget Check           -- daily/monthly GBP limits enforced
3. Execution Guard        -- per-project agent/action enablement
4. Allowlist Enforcement  -- stage and workflow allowlists
5. Dry-Run Mode           -- log only, no side effects
6. Schema Validation      -- invalid output rejected
7. QC Validation          -- critical/major violations block build
8. Idempotency            -- duplicate events and actions skipped
9. RBAC                   -- role-based access control on all endpoints
```

---

## Core Concepts

### Project

A Project represents one engagement (agency or client). Each project has:
- **Organisation** -- agency or client org with role-based access
- **Budgets** -- daily and monthly GBP limits enforced before every agent run
- **Enabled agents** -- which agents are active (empty = all)
- **Enabled actions** -- which GHL actions are allowed (empty = all)
- **Rollout mode** -- dry-run (log only) or live (execute GHL actions)
- **Allowlists** -- permitted pipeline stages and workflow IDs

### Assumptions

Statements about the project that must be explicitly approved before work proceeds.

**Statuses:** PENDING -> APPROVED | REJECTED

- No approved assumptions -> no agent execution
- Rejected assumptions trigger requirements regeneration
- Tracked per-version alongside requirements

### Requirements

Structured deliverables derived from clarification facts via the RequirementsEngineerAgent.

- **Immutable versions** -- v1, v2, v3... each version is a snapshot
- **MoSCoW priority** -- every requirement is MUST, SHOULD, or COULD
- **Confirmation state** -- null (pending), true (confirmed), false (rejected)
- **Version lifecycle:** `pending_confirmation -> confirmed` (all ok) or `pending_confirmation -> regenerating -> new version`

### Change Requests

When a prospect rejects requirements or assumptions, `ChangeRequest` objects are built and passed to the planner during auto-regeneration so the next version addresses the feedback.

---

## Assumption Gate

No agent execution proceeds without explicitly approved assumptions.

- Every `RequirementsVersion` includes assumptions
- Each assumption has status: `pending` -> `approved` | `rejected`
- `StoreBackedRequirementsProvider` checks `assumptionsApproved` before the build pipeline starts
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
2. Estimates cost of the proposed run (model x tokens)
3. Blocks if projected spend exceeds either limit
4. Returns `allowed: false` with reason if budget would be exceeded

---

## Execution Guards

Per-project guards control which agents and actions can run.

### Agent Guards

```typescript
checkAgentExecution({ agentId, config }) -> ExecutionGuardResult
```
- Empty `enabledAgents` -> all agents allowed
- Populated -> only listed agents can execute
- Dry-run mode logs execution without side effects

### Action Guards

```typescript
checkActionExecution({ actionId, config }) -> ExecutionGuardResult
```
- Empty `enabledActions` -> all actions allowed
- Populated -> only listed action types can execute
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

## Parallel Rollout

The same system runs both agency and client CRMs simultaneously. The difference is configuration, not code.

### Agency CRM -- Live

- `dryRun: false`
- Webhooks fire from agency CRM
- Agents execute with real LLM calls
- GHL actions execute (move stages, trigger workflows)
- Telemetry records actual costs

### Client CRM -- Dry-Run

- `dryRun: true`
- Same webhooks, same event bus, same agents
- LLM calls execute normally (agents still reason)
- GHL actions are logged but not executed
- Telemetry still tracks token usage and cost

### Graduated Rollout

Transition from dry-run to live by changing `dryRun: true` to `dryRun: false`. No code changes. No redeployment.

---

## RBAC & Multi-Tenant Access

### Roles

| Role | Level | Read Access | Write Access |
|------|-------|-------------|--------------|
| `agency_admin` | Agency | All projects | All projects |
| `agency_operator` | Agency | All projects | All projects |
| `client_admin` | Client | Own org projects | Own org projects |
| `client_member` | Client | Own org projects | None |
| `viewer` | Any | Assigned projects | None |

Agency roles have cross-org access. Client roles are scoped to their organisation.

### Access Control Functions

| Function | Purpose |
|----------|---------|
| `canAccessOrg(ctx, orgId)` | Check org membership |
| `canAccessProject(ctx, project)` | Agency -> true; client -> check org |
| `canWriteOrg(ctx, orgId)` | Write-capable role check |
| `canWriteProject(ctx, project)` | Agency -> true; client_admin -> check org |
| `isAgencyUser(ctx)` | agency_admin or agency_operator check |
| `isViewerOnly(ctx)` | All memberships are viewer |

### Auth Middleware

1. **Token verification** -- Bearer token validated via `TokenVerifier`
2. **Membership loading** -- User's org memberships loaded
3. **AuthContext construction** -- Attached to request context
4. **Project access check** -- Per-endpoint read or write mode enforcement

Returns 401 if token is missing/invalid. Returns 403 if access is denied.

---

## Multi-Tenant Data Isolation

- Every project belongs to an organisation (`orgId`)
- Every query is scoped by project or org
- Agency users can cross org boundaries
- Client users are strictly isolated to their org
- Dashboard renders different views based on role

---

## Idempotency

### Event Idempotency

Events are hashed using `computeEventHash()` (SHA256 of sorted JSON payload). Duplicate payloads for the same project + type are detected and skipped.

### Action Idempotency

GHL actions are hashed using `computePayloadHash()`. `ActionExecutor` maintains a set of executed hashes. Same action cannot execute twice in the same session.

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
1. Setting `dryRun: true` -- all actions logged but not executed
2. Removing agents from `enabledAgents`
3. Removing action types from `enabledActions`
4. Not approving assumptions -- blocks all agent execution

---

## Authentication Flow

```
1. User requests magic link via Supabase
2. Email delivered with login link
3. User clicks link -> redirected to /auth/callback
4. Supabase exchanges code for session token
5. Token attached to all subsequent API requests as Bearer token
6. API middleware verifies token + loads memberships
```
