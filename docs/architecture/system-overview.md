# System Overview

## What This System Is

The Agency AI Operating System is an AI-powered execution layer for agencies to manage client onboarding, strategy, delivery, and CRM automation in a controlled, auditable, and cost-aware way.

It embeds intelligence directly into CRM workflows while enforcing governance, approvals, and budget constraints across 8 specialised agents, a 4-step build pipeline, a full requirements confirmation loop with auto-regeneration, and a structured knowledge base.

This is not a chatbot.
This is not prompt automation.
This is a governed AI execution system.

---

## Core Problems Solved

- Silent assumptions during delivery
- Scope creep and rework
- Manual CRM operations
- Unpredictable AI costs
- Repeated mistakes across clients
- Lack of auditability
- Unreviewed AI-generated questions reaching clients
- Requirements drift without version control

---

## Core Principles

- **Governance before execution** -- assumption gate, requirements confirmation, and QC validation must pass before any action
- **No assumptions without approval** -- every assumption is explicitly tracked and approved or rejected
- **Versioned requirements** -- immutable versions (v1, v2, v3...) with auto-regeneration on rejection
- **Test-driven development** -- 570+ tests, CI enforcement, no task marked DONE without tests
- **Token and cost awareness** -- per-agent cost caps, per-project budgets, model routing for cost optimisation
- **Parallel rollout** -- agency CRM live, client CRM dry-run, same codebase
- **Small, auditable steps** -- Ralph loop: pick, implement, test, log, commit, stop
- **Agent separation** -- 8 agents with strict non-overlapping responsibilities
- **Framework injection** -- Hormozi, Schwartz, PAS/AIDA frameworks injected per agent contract
- **Knowledge base** -- structured, queryable store of approved facts that agents read from

---

## Repository Layout

```
agency-agents/
+-- apps/
|   +-- api/             # Hono API server -- orchestration, webhooks, routes
|   |   +-- src/
|   |   |   +-- routes/
|   |   |   |   +-- task.ts              # POST /api/run-task
|   |   |   |   +-- spend.ts            # GET /api/projects/:id/spend
|   |   |   |   +-- portal.ts           # Portal stubs (clarification, requirements, reviews)
|   |   |   |   +-- build.ts            # Build orchestrator endpoints
|   |   |   |   +-- project-config.ts   # Project config + GHL sync
|   |   |   |   +-- requirements-v2.ts  # Requirements confirmation + auto-regen
|   |   |   +-- middleware/
|   |   |   |   +-- auth.ts             # Token verification + RBAC middleware
|   |   |   +-- db/
|   |   |       +-- schema.ts           # Drizzle schema (projects, orgs, users, events)
|   |
|   +-- cms/             # Strapi CMS -- frameworks, agent configs, templates
|   |   +-- src/api/     # Content types: Framework, AgentConfig, PromptTemplate
|   |
|   +-- dashboard/       # Next.js -- agency + client portal
|       +-- src/
|           +-- app/
|           |   +-- login/              # Supabase magic link auth
|           |   +-- auth/callback/      # OAuth callback
|           |   +-- projects/[id]/
|           |       +-- intake/         # Discovery form display
|           |       +-- clarification/  # Chat-like question flow
|           |       +-- requirements/   # Confirm/reject requirements + assumptions
|           |       +-- review/         # Review status + timeline
|           |       +-- settings/       # Project config toggles
|           +-- components/
|           |   +-- QuestionField.tsx    # 6-type input component
|           +-- lib/supabase/           # Auth utilities (client, server, middleware)
|
+-- packages/
|   +-- agent-core/      # Core intelligence layer
|   |   +-- src/
|   |       +-- types.ts                # AgentOutput, AgentContract, LLMAdapter
|   |       +-- contracts/              # 8 agent contracts + registry
|   |       |   +-- index.ts            # ALL_AGENT_CONTRACTS, routing, cost caps
|   |       |   +-- research-agent.ts
|   |       |   +-- strategy-funnel-agent.ts
|   |       |   +-- copy-messaging-agent.ts
|   |       |   +-- automation-crm-agent.ts
|   |       |   +-- ux-design-agent.ts
|   |       |   +-- quality-control-agent.ts
|   |       |   +-- business-architect-agent.ts
|   |       |   +-- requirements-engineer-agent.ts
|   |       +-- prompt-compiler.ts      # Prompt assembly from rules + contracts + frameworks
|   |       +-- llm-router.ts           # Multi-model routing with fallback
|   |       +-- agent-runner.ts         # Basic agent execution
|   |       +-- specialized-runner.ts   # Contract-enforced execution with QC
|   |       +-- build-orchestrator.ts   # 4-step build pipeline
|   |       +-- build-schemas.ts        # Blueprint, UXUISpec, CopyPack, BuildPlan
|   |       +-- build-mocks.ts          # Mock factories for build pipeline
|   |       +-- business-architect-planner.ts     # Clarification round orchestrator
|   |       +-- requirements-schemas.ts           # Requirement, Assumption, Bundle schemas
|   |       +-- requirements-store.ts             # Version store + provider bridge
|   |       +-- requirements-engineer-planner.ts  # Requirements generation orchestrator
|   |       +-- requirements-hooks.ts             # GHL milestone hooks
|   |       +-- knowledge-schemas.ts    # KnowledgeEntry, types, statuses
|   |       +-- knowledge-store.ts      # InMemoryKnowledgeStore
|   |       +-- knowledge-populator.ts  # Populate KB from confirmed requirements
|   |       +-- knowledge-tools.ts      # Agent-facing query tools
|   |       +-- knowledge-tool-telemetry.ts  # Telemetry for KB tool usage
|   |       +-- knowledge-agent-integration.ts   # Wire KB tools into agent execution
|   |       +-- event-bus.ts            # Event store + queue lifecycle
|   |       +-- event-worker.ts         # Event processor with retry + dead-letter
|   |       +-- ghl-actions.ts          # GHL action schemas + ActionExecutor
|   |       +-- execution-guard.ts      # Per-project agent/action guards
|   |       +-- project-config.ts       # ProjectConfig schema + allowlists
|   |       +-- mock-llm.ts            # Deterministic mock LLM for tests
|   |
|   +-- auth/            # RBAC + multi-tenant package
|   |   +-- src/
|   |       +-- types.ts               # Roles, AuthContext, Membership
|   |       +-- rbac.ts               # canAccess*, canWrite*, isAgencyUser, buildAuthContext
|   |
|   +-- telemetry/       # Token + cost tracking
|   |   +-- src/
|   |       +-- pricing.ts            # Model pricing (Claude, GPT-4, GPT-4o-mini)
|   |       +-- cost.ts              # estimateCost()
|   |       +-- record.ts            # recordTaskRun()
|   |       +-- spend.ts             # getProjectSpend()
|   |       +-- budget.ts            # budgetCheck()
|   |       +-- store.ts             # InMemoryTelemetryStore
|   |
|   +-- prompt-library/  # Reusable frameworks + global rules
|       +-- src/
|           +-- global-rules.ts       # Universal agent rules
|           +-- frameworks/
|               +-- offer-economics.ts   # Hormozi Value Equation
|               +-- market-awareness.ts  # Schwartz Awareness Levels
|               +-- persuasion.ts        # PAS/AIDA/Proof Hierarchy
|               +-- funnel-design.ts     # UX/CTA rules
|
+-- progress/            # Persistent memory (task-log, error-log, decision-log)
+-- docs/                # System documentation
+-- CLAUDE.md            # AI execution constitution
```

Sibling repos:
- `agency-questions` -- known unknowns question bank
- `agency-skills` -- future reusable runbooks

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| API Server | Hono (Bun/Node) |
| Dashboard | Next.js 14 |
| CMS | Strapi |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Supabase (magic link) |
| Validation | Zod |
| Testing | Vitest |
| Monorepo | pnpm workspaces |
| CI | GitHub Actions |

---

## High-Level Flow

```
CRM Event
  |
  v
Webhook
  |
  v
Event Bus (idempotency check via payloadHash)
  |
  v
Governance Check (assumption gate, budget, execution guards)
  |
  v
BusinessArchitectAgent (clarification rounds)
  |
  v
RequirementsEngineerAgent (generate + confirm + auto-regen)
  |
  v
Knowledge Base populated (approved requirements, assumptions, decisions)
  |
  v
BuildOrchestrator (Strategy -> UX -> Copy -> QC)
  |
  v
GHL Actions (move_stage / trigger_workflow)
  |
  v
Telemetry + Portal
```

### Key Integration Points

- **GHL CRM** -- webhooks in, stage moves + workflow triggers out
- **Strapi CMS** -- framework templates, rubrics, agent configs (read-only from agents)
- **Supabase** -- auth tokens, user management, session handling
- **LLM Providers** -- Claude (Anthropic), GPT-4/GPT-4o-mini (OpenAI) via LLMAdapter interface

---

## Prompt System

### Prompt Compiler

The `compilePrompt()` function assembles 6 sections into a single prompt:

```
1. Global Rules        -- universal constraints for all agents
2. Agent Contract      -- capabilities, constraints, token limit
3. Framework Blocks    -- prioritised marketing/strategy frameworks
4. Task Definition     -- current task, project ID, context
5. Known Unknowns      -- questions to surface
6. Output Schema       -- required JSON structure
```

Sections are joined with `\n\n---\n\n` delimiters.

### Prompt Hashing

Every compiled prompt gets a SHA256 hash (first 16 characters). This enables:
- Deduplication of identical prompts
- Audit trail linking prompts to outputs
- Cache key for repeated executions

### Output Validation

`validateAgentOutput()` extracts JSON from the LLM response (handles markdown fences or raw JSON) and validates against `AgentOutputSchema`:

```json
{
  "result": "<agent-specific output>",
  "assumptions": ["string[]"],
  "unknowns": ["string[]"],
  "next_actions": ["string[]"]
}
```

### Frameworks

Four marketing and strategy frameworks are injected into agent prompts based on their contract declarations.

**Offer Economics** (Hormozi Value Equation):
```
Value = (Dream Outcome x Perceived Likelihood) / (Time Delay x Effort & Sacrifice)
```
Strategies: increase dream outcome, increase perceived likelihood, decrease time delay, decrease effort. Used by StrategyFunnel, QualityControl, BusinessArchitect, RequirementsEngineer.

**Market Awareness** (Schwartz 5 Awareness Levels):

| Level | Strategy | Lead With | Avoid |
|-------|----------|-----------|-------|
| 1. Unaware | Curiosity, pattern interrupt | Story, intrigue | Product features |
| 2. Problem Aware | Agitate pain | Problem empathy | Solutions |
| 3. Solution Aware | Differentiate | Mechanism, "new way" | Direct pitch |
| 4. Product Aware | Overcome objections | Proof, benefits | Basic education |
| 5. Most Aware | Direct offer | Offer, exclusivity | Long explanations |

Used by Research, StrategyFunnel, CopyMessaging, QualityControl, BusinessArchitect, RequirementsEngineer.

**Persuasion** (PAS + AIDA + Proof Hierarchy):
- PAS: Problem, Agitate, Solve
- AIDA: Attention, Interest, Desire, Action
- Proof Hierarchy (strongest to weakest): Demonstration, Documentation, Case Studies, Testimonials, Social Proof, Credentials, Guarantees, Logic

Used by CopyMessaging, QualityControl.

**Funnel Design** (UX/CTA rules):

| Stage | Goal | Content | CTA |
|-------|------|---------|-----|
| TOFU | Awareness | Educational | Low commitment (watch, read) |
| MOFU | Consideration | Case studies, webinars | Medium (register, schedule) |
| BOFU | Decision | Offers, demos, trials | High commitment (buy, book) |

Landing Page Structure: Hero, Problem, Solution, Proof, Offer, CTA. Used by StrategyFunnel, AutomationCRM, UXDesign, QualityControl.

### Framework Assignment

| Framework | Agents |
|-----------|--------|
| offer-economics | StrategyFunnel, QualityControl, BusinessArchitect, RequirementsEngineer |
| market-awareness | Research, StrategyFunnel, CopyMessaging, QualityControl, BusinessArchitect, RequirementsEngineer |
| persuasion | CopyMessaging, QualityControl |
| funnel-design | StrategyFunnel, AutomationCRM, UXDesign, QualityControl |

QualityControlAgent receives all 4 frameworks because it validates outputs from every other agent.

### Global Rules

Applied to every agent via the prompt compiler:

- **All agents:** No assumptions without flagging, valid JSON output, never expose secrets, prioritise correctness, be concise, track assumptions/unknowns
- **Client-facing:** Professional language, no jargon, actionable recommendations, confidentiality
- **Code-generation:** Follow project style, error handling, self-documenting, no hardcoded secrets
- **Data-processing:** Validate inputs, handle malformed data, preserve integrity, log anomalies

Rules are fetched by category via `getRulesByCategory()`.

---

## LLM Router

The `LLMRouter` selects the optimal model for each agent request based on capability requirements, cost constraints, and provider availability.

### Model Tiers

```
Tier 1 (highest): claude-3-opus, gpt-4-turbo
Tier 2 (default): claude-3-sonnet, gpt-4, gpt-4o
Tier 3 (budget):  claude-3-haiku, gpt-4o-mini, gpt-3.5-turbo
```

### Agent Model Routing

| Agent | Assigned Model |
|-------|---------------|
| Research | claude-3-sonnet |
| Strategy Funnel | claude-3-sonnet |
| Copy Messaging | gpt-4 |
| Automation CRM | gpt-4o-mini |
| UX Design | claude-3-sonnet |
| Quality Control | claude-3-sonnet |
| Business Architect | claude-3-sonnet |
| Requirements Engineer | claude-3-sonnet |

### Routing Logic

```
1. Look up agent's assigned model
2. Estimate cost (tokens x model pricing)
3. If within cost cap -> use assigned model
4. If over cap -> walk downgrade path
5. If no same-provider option -> try cross-provider fallback
6. If nothing works -> use default model
```

### Downgrade Paths

```
claude-3-opus -> claude-3-sonnet -> claude-3-haiku
gpt-4-turbo -> gpt-4 -> gpt-4o -> gpt-4o-mini
```

### Cross-Provider Fallbacks

```
claude-3-sonnet <-> gpt-4
claude-3-haiku <-> gpt-4o-mini
```

### Route Result

```typescript
{
  model: string;        // Selected model
  adapter: LLMAdapter;  // Provider adapter instance
  downgraded: boolean;  // True if cost-forced downgrade
  reason?: string;      // Explanation for routing decision
}
```

### Convenience Methods

- `route(params)` -- returns routing decision without executing
- `complete(params)` -- routes and executes in one call
- `getModelForAgent(agentId)` -- lookup from `AGENT_MODEL_ROUTING`
- `getCostCapForAgent(agentId)` -- lookup from `AGENT_COST_CAPS`

---

## Telemetry

All costs are tracked in GBP.

### Model Pricing

| Model | Input (GBP/M tokens) | Output (GBP/M tokens) |
|-------|---------------------|-----------------------|
| claude-3-opus | 12.00 | 60.00 |
| claude-3-sonnet | 2.40 | 12.00 |
| claude-3-haiku | 0.20 | 1.00 |
| gpt-4-turbo | 8.00 | 24.00 |
| gpt-4o | 2.00 | 8.00 |
| gpt-4o-mini | 0.12 | 0.48 |

### Cost Estimation

```typescript
const estimate = estimateCost({
  modelId: 'claude-3-sonnet',
  inputTokens: 1000,
  outputTokens: 500
});
// Returns: { inputCost, outputCost, totalCost, currency: 'GBP' }
```

Used before execution (budget check) and after execution (telemetry recording).

### Task Run Recording

Every agent execution is recorded as a `TaskRun`:

```typescript
interface TaskRun {
  projectId: string;
  agentId: string;
  taskType: string;
  model: string;
  promptHash: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}
```

`recordTaskRun()` auto-calculates cost from model pricing and token counts. Sets `completedAt` when status is `completed` or `failed`.

### Spend Queries

```typescript
const spend = await getProjectSpend({ projectId: 'project-123' });
// Returns: { projectId, dailySpend, monthlySpend, totalSpend, taskCount }
```

- Only counts `completed` or `running` tasks (excludes `failed`)
- Daily spend = tasks from today (ISO date boundary)
- Monthly spend = tasks from this calendar month

### Budget Enforcement

Per-project budgets are checked before every agent run:

```typescript
interface ProjectBudget {
  projectId: string;
  dailyBudgetGbp: number;
  monthlyBudgetGbp: number;
}
```

Budget check flow: get current daily + monthly spend from store, estimate cost of proposed run, check daily limit, check monthly limit, block if either exceeds.

### Cost Caps per Agent

| Agent | Cost Cap (GBP) |
|-------|----------------|
| Research | 0.50 |
| Strategy Funnel | 0.75 |
| Copy Messaging | 1.00 |
| Automation CRM | 0.25 |
| UX Design | 0.75 |
| Quality Control | 0.50 |
| Business Architect | 0.50 |
| Requirements Engineer | 0.75 |

If an agent's estimated cost exceeds its cap, the LLM router downgrades to a cheaper model before execution.

### Build Pipeline Telemetry

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

### Action Telemetry

GHL action executions produce `ActionTelemetryEvent` entries:

```typescript
{
  projectId: string;
  actionType: string;
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

## API Reference

All endpoints are served by the Hono API server at `apps/api/`. Authentication is via Bearer token in the `Authorization` header.

### Task Execution

**POST /api/run-task** -- Execute an agent task with orchestration, budget enforcement, and telemetry.

Request:
```json
{
  "projectId": "uuid",
  "taskId": "string",
  "taskType": "string",
  "prompt": "string",
  "agent": {
    "agentId": "string",
    "name": "string",
    "description": "string",
    "capabilities": ["string"],
    "constraints": ["string"],
    "maxOutputTokens": 4096
  },
  "frameworks": ["string"],
  "context": {},
  "budget": {
    "dailyBudgetGbp": 10.0,
    "monthlyBudgetGbp": 100.0
  }
}
```

Response (200): `{ "success": true, "output": {}, "telemetry": {} }`

Error (400/500): `{ "success": false, "error": "Budget exceeded" }`

### Spend

**GET /api/projects/:projectId/spend** -- Get spend summary for a project.

Response (200):
```json
{
  "projectId": "uuid",
  "daily": { "spend": 0.45, "currency": "GBP" },
  "monthly": { "spend": 12.30, "currency": "GBP" },
  "total": { "spend": 48.75, "currency": "GBP" },
  "taskCount": 156
}
```

### Project Configuration

**GET /api/projects/:id/config** -- Get project configuration including dry-run mode, enabled agents/actions, and allowlists.

**PUT /api/projects/:id/config** -- Update project configuration.

**POST /api/projects/:id/sync/pipelines** -- Fetch pipeline and stage IDs from GHL and store locally.

**POST /api/projects/:id/sync/workflows** -- Store workflow IDs for the project.

### Clarification (Portal)

**GET /api/projects/:id/intakes/:leadIntakeId** -- Get lead intake data with fields.

**GET /api/clarification/sessions/:sessionId** -- Get clarification session (prospect-facing, shows only APPROVED questions).

**POST /api/clarification/sessions/:sessionId/answers** -- Submit answers to clarification questions.

Request:
```json
{
  "answers": [
    { "questionId": "q1", "value": "Answer text" }
  ]
}
```

**POST /api/clarification/sessions/:sessionId/plan-next** -- Run BusinessArchitectAgent to generate next round of questions. Questions stored as DRAFT until approved.

**POST /api/clarification/sessions/:sessionId/approve-questions** -- Agency approval gate. Move questions from DRAFT to APPROVED.

Request:
```json
{
  "approvals": [
    { "questionId": "q1", "approved": true },
    { "questionId": "q2", "approved": true, "editedText": "Revised question?" }
  ],
  "removals": ["q3"]
}
```

### Requirements

**POST /api/projects/:projectId/requirements/generate** -- Generate requirements from facts snapshot.

Request:
```json
{
  "factsSnapshot": {
    "summary": ["Key fact 1", "Key fact 2"],
    "structuredAnswers": [{ "key": "budget", "value": "5000" }]
  }
}
```

Response (200): `{ "versionId": "uuid", "versionNumber": 1, "status": "pending_confirmation" }`

**GET /api/projects/:projectId/requirements/latest** -- Get the latest requirements version.

**GET /api/projects/:projectId/requirements** -- List all requirements versions.

**GET /api/projects/:projectId/requirements/:versionId** -- Get a specific requirements version.

**POST /api/projects/:projectId/requirements/:versionId/confirm** -- Confirm or reject requirements and assumptions. Auto-regenerates on rejection.

Response (all confirmed): `{ "status": "confirmed", "versionId": "uuid" }`

Response (any rejection): `{ "status": "regenerating", "versionId": "uuid", "newVersionId": "uuid-v2", "newVersionNumber": 2 }`

Error (409): Version already confirmed.

**POST /api/projects/:projectId/requirements/:versionId/review/suggest** -- Get agent review suggestion.

**POST /api/projects/:projectId/requirements/:versionId/review/decide** -- Human final review decision.

### Build Pipeline

**POST /api/projects/:id/build/plan** -- Execute the full 4-step build pipeline.

Request:
```json
{
  "requirementsVersionId": "uuid",
  "buildRequest": {
    "type": "landing-page",
    "goal": "Generate leads for consulting service",
    "constraints": {}
  }
}
```

Response (200):
```json
{
  "status": "success",
  "buildPlan": {
    "projectId": "uuid",
    "requirementsVersion": "uuid",
    "status": "draft",
    "core": { "blueprint": {}, "uiSpec": {}, "copyPack": {} },
    "optional": { "enhancements": [], "designs": [], "copy": [] },
    "tasks": [],
    "approvalsNeeded": [],
    "qcReport": {},
    "telemetry": []
  }
}
```

Response (blocked): `{ "status": "blocked", "blockReason": "Requirements not found or assumptions not approved" }`

**POST /api/projects/:id/build/approve-enhancement** -- Approve or reject an optional enhancement.

### Legacy Portal Stubs

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/requirements/:versionId | Legacy requirements get |
| POST | /api/requirements/:versionId/confirm | Legacy confirmation |
| GET | /api/reviews/:versionId | Review status |

These are maintained for backward compatibility. The `requirements-v2` routes are the canonical implementation.

---

## Test Coverage

| System | Tests |
|--------|-------|
| 8 Agent Contracts + Registry | 59 |
| Prompt Compiler + Framework Injection | 9 |
| LLM Router (multi-model) | 15 |
| Build Orchestrator (4-step pipeline) | 20 |
| Build Schemas | 21 |
| Build Mocks | 9 |
| Event Bus | 17 |
| Event Worker | 12 |
| GHL Actions + ActionExecutor | 28 |
| Execution Guards | 15 |
| Auth + RBAC + Multi-Tenant | 38 |
| Business Architect + Clarification Rounds | 52 |
| Requirements Schemas | 23 |
| Requirements Store | 17 |
| Requirements Engineer Planner | 16 |
| Requirements Hooks | 5 |
| Knowledge Base Schemas | 8 |
| Knowledge Store | 12 |
| Knowledge Populator | 8 |
| Knowledge Tools | 12 |
| Knowledge Tool Telemetry | 4 |
| Knowledge Agent Integration | 20 |
| Telemetry / Cost Tracking | 25 |
| Portal UI + QuestionField | 15 |
| Portal Routes | 28 |
| Auth Middleware | 17 |
| Build Routes | 8 |
| Requirements v2 Routes | 24 |
| Prompt Library + Frameworks | 22 |
| Questions | 7 |
| API Health | 1 |
| Agent Runner | 8 |
| **Total** | **575** |
