# Task Log

## Task Template

Use this template for every task. A task cannot be marked DONE unless 'Tests added/updated' and 'Commands run' are filled.

```
### Task: [Description]
- **Status:** TODO | DOING | DONE | BLOCKED
- **Files touched:**
  - [list files created/modified]
- **Tests added/updated:**
  - [list test files - REQUIRED for DONE status]
- **Commands run:**
  - [e.g., pnpm test, pnpm lint - REQUIRED for DONE status]
- **Notes / blockers:**
  - [any relevant context]
```

---

## Week 4.2 – GHL Actions: Move Stage + Trigger Workflow

### Task: Add GHL action schemas, adapter, and executor
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/ghl-actions.ts (created)
  - packages/agent-core/src/project-config.ts (extended with allowlists)
  - packages/agent-core/src/index.ts (modified)
- **Tests added/updated:**
  - packages/agent-core/src/ghl-actions.test.ts (21 tests)
- **Commands run:**
  - pnpm test (153 tests passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - MoveStageAction: opportunityId, pipelineId, stageId, reason
  - TriggerWorkflowAction: contactId, workflowId, reason
  - GHLAdapter interface: getPipelines, updateOpportunityStage, addContactToWorkflow
  - ActionExecutor: dryRun, allowlists, idempotency via payloadHash
  - MockGHLAdapter for testing
  - ProjectConfig extended with allowlists.pipelineStages and allowlists.workflowIds

### Task: Add API endpoints for project config and sync
- **Status:** DONE
- **Files touched:**
  - apps/api/src/routes/project-config.ts (created)
  - apps/api/src/index.ts (modified)
- **Tests added/updated:**
  - N/A (route wiring, tested via integration)
- **Commands run:**
  - pnpm typecheck (passed)
  - pnpm lint (passed)
- **Notes / blockers:**
  - GET /api/projects/:id/config
  - PUT /api/projects/:id/config
  - POST /api/projects/:id/sync/pipelines
  - POST /api/projects/:id/sync/workflows

### Task: Add dashboard settings page
- **Status:** DONE
- **Files touched:**
  - apps/dashboard/src/app/projects/[id]/settings/page.tsx (created)
- **Tests added/updated:**
  - N/A (UI scaffold)
- **Commands run:**
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - Toggles for dryRun, move_stage, trigger_workflow
  - View allowlisted stages/workflows
  - Sync buttons (disabled, wired in future)

---

## Week 4.1 – Parallel Rollout Controls

### Task: Add project configuration for rollout controls
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/project-config.ts (created)
  - packages/agent-core/src/execution-guard.ts (created)
  - packages/agent-core/src/index.ts (modified)
- **Tests added/updated:**
  - packages/agent-core/src/execution-guard.test.ts (15 tests)
- **Commands run:**
  - pnpm test (132 tests passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - ProjectConfig: dryRun, enabledAgents, enabledActions
  - checkAgentExecution: blocks disabled agents, logs dryRun
  - checkActionExecution: blocks disabled actions, no GHL writes in dryRun
  - formatGuardLog: telemetry-ready log entries with blockedReason
  - Same webhook behaves differently per project (agency vs client)
  - Empty enabledAgents/enabledActions means no filter (all allowed)

---

## Week 3.1 – TDD Guardrails

### Task: Add task-log checklist template
- **Status:** DONE
- **Files touched:**
  - progress/task-log.md
- **Tests added/updated:**
  - N/A (documentation/process change)
- **Commands run:**
  - N/A (no code changes)
- **Notes / blockers:**
  - Template enforces TDD discipline by requiring tests and commands before DONE status

### Task: Add CI workflow
- **Status:** DONE
- **Files touched:**
  - .github/workflows/ci.yml
- **Tests added/updated:**
  - N/A (CI infrastructure)
- **Commands run:**
  - pnpm lint (passed)
  - pnpm typecheck (passed)
  - pnpm test (117 tests passed)
  - YAML validation (passed)
- **Notes / blockers:**
  - Workflow triggers on push and PR to main
  - Uses Node 20, pnpm 9, with caching

---

Segment: Week 1 – Foundation

---

## 2026-01-25

### Task: Create progress tracking files
- **Status:** DONE
- **Files created:**
  - progress/task-log.md
  - progress/error-log.md
  - progress/decision-log.md
- **Tests:** N/A (infrastructure)

### Task: Create monorepo directory structure
- **Status:** DONE
- **Files created:**
  - apps/api/, apps/cms/, apps/dashboard/
  - packages/agent-core/, packages/telemetry/, packages/prompt-library/
  - docs/, scripts/
  - pnpm-workspace.yaml
  - package.json (root)
  - tsconfig.json (root)
  - .env.example
  - .gitignore
  - .prettierrc
  - .eslintrc.cjs
- **Tests:** N/A (infrastructure)

### Task: Implement telemetry package
- **Status:** DONE
- **Files created:**
  - packages/telemetry/package.json
  - packages/telemetry/tsconfig.json
  - packages/telemetry/vitest.config.ts
  - packages/telemetry/src/types.ts
  - packages/telemetry/src/pricing.ts
  - packages/telemetry/src/cost.ts
  - packages/telemetry/src/store.ts
  - packages/telemetry/src/record.ts
  - packages/telemetry/src/spend.ts
  - packages/telemetry/src/budget.ts
  - packages/telemetry/src/index.ts
- **Tests added:**
  - packages/telemetry/src/cost.test.ts
  - packages/telemetry/src/record.test.ts
  - packages/telemetry/src/spend.test.ts
  - packages/telemetry/src/budget.test.ts
- **Functions implemented:**
  - estimateCost() - calculates cost from tokens and model pricing
  - recordTaskRun() - records task run with auto-calculated cost
  - getProjectSpend() - gets daily/monthly/total spend
  - budgetCheck() - validates task against budget limits

### Task: Implement agent-core package
- **Status:** DONE
- **Files created:**
  - packages/agent-core/package.json
  - packages/agent-core/tsconfig.json
  - packages/agent-core/vitest.config.ts
  - packages/agent-core/src/types.ts
  - packages/agent-core/src/questions.ts
  - packages/agent-core/src/mock-llm.ts
  - packages/agent-core/src/prompt-compiler.ts
  - packages/agent-core/src/agent-runner.ts
  - packages/agent-core/src/index.ts
- **Tests added:**
  - packages/agent-core/src/questions.test.ts
  - packages/agent-core/src/prompt-compiler.test.ts
  - packages/agent-core/src/agent-runner.test.ts
- **Features implemented:**
  - Question bank loading from ../agency-questions
  - Prompt compilation (GLOBAL_RULES + AgentContract + FrameworkBlocks + TaskPrompt + KnownUnknowns)
  - JSON output schema enforcement
  - Mock LLM adapter with deterministic output
  - Budget gate integration
  - Telemetry logging for every run

### Task: Implement prompt-library package
- **Status:** DONE
- **Files created:**
  - packages/prompt-library/package.json
  - packages/prompt-library/tsconfig.json
  - packages/prompt-library/src/types.ts
  - packages/prompt-library/src/global-rules.ts
  - packages/prompt-library/src/frameworks.ts
  - packages/prompt-library/src/index.ts
- **Features:**
  - Global rules for all agents
  - Category-specific rules (client-facing, code-generation, data-processing)
  - Framework block placeholders (marketing, technical, ecommerce, communication)

### Task: Implement API app
- **Status:** DONE
- **Files created:**
  - apps/api/package.json
  - apps/api/tsconfig.json
  - apps/api/drizzle.config.ts
  - apps/api/vitest.config.ts
  - apps/api/.env.example
  - apps/api/src/index.ts
  - apps/api/src/db/schema.ts
  - apps/api/src/db/index.ts
  - apps/api/src/db/migrate.ts
  - apps/api/src/routes/task.ts
  - apps/api/src/routes/spend.ts
- **Endpoints:**
  - POST /api/run-task
  - GET /api/projects/:projectId/spend
- **Database schema:**
  - clients
  - projects (with dailyBudgetGbp, monthlyBudgetGbp)
  - model_pricing
  - task_runs (tokens, cost, model, agent, taskType, promptHash, status)

### Task: Scaffold dashboard app
- **Status:** DONE
- **Files created:**
  - apps/dashboard/package.json
  - apps/dashboard/tsconfig.json
  - apps/dashboard/next.config.js
  - apps/dashboard/src/app/layout.tsx
  - apps/dashboard/src/app/page.tsx
  - apps/dashboard/src/app/projects/page.tsx
  - apps/dashboard/src/app/projects/[id]/proposal/page.tsx
  - apps/dashboard/src/app/projects/[id]/assumptions/page.tsx
  - apps/dashboard/src/app/projects/[id]/requirements/page.tsx
  - apps/dashboard/src/app/projects/[id]/tasks/page.tsx
- **Routes:**
  - /projects
  - /projects/[id]/proposal
  - /projects/[id]/assumptions
  - /projects/[id]/requirements
  - /projects/[id]/tasks

### Task: Scaffold CMS app (Strapi)
- **Status:** DONE
- **Files created:**
  - apps/cms/package.json
  - apps/cms/Dockerfile
  - apps/cms/docker-compose.yml
  - apps/cms/.env.example
  - apps/cms/src/api/framework/content-types/framework/schema.json
  - apps/cms/src/api/agent-config/content-types/agent-config/schema.json
  - apps/cms/src/api/prompt-template/content-types/prompt-template/schema.json
- **Content types:**
  - Framework
  - AgentConfig
  - PromptTemplate

### Task: Verify foundation setup
- **Status:** DONE
- **Verification:**
  - pnpm install: SUCCESS (1448 packages installed)
  - pnpm test (telemetry): 25 tests passed
  - pnpm test (agent-core): 24 tests passed
  - pnpm test (prompt-library): 4 tests passed
- **Tests verified:**
  - estimateCost() unit tests
  - Budget overrun blocks execution
  - Missing question bank fails fast
  - Output schema enforcement

  ## Week 2 – Governance & Assumptions (COMPLETED)

Status: DONE

Completed:
- Assumption gate implemented and enforced
- Requirements generated from approved assumptions
- Requirements versioning implemented
- Tasks generated from requirements
- Tasks blocked when assumptions pending
- API endpoints for assumptions, requirements, tasks
- Dashboard views for assumptions, requirements, tasks
- All blocks and decisions logged

Notes:
- Week 2 dependency satisfied
- Safe to proceed to Week 3 and beyond

## Week 3 – Agents & Intelligence

### Task: Add Hormozi/Psychology framework blocks to prompt-library
- **Status:** DONE
- **Files created:**
  - packages/prompt-library/src/frameworks/offer-economics.ts
  - packages/prompt-library/src/frameworks/market-awareness.ts
  - packages/prompt-library/src/frameworks/persuasion.ts
  - packages/prompt-library/src/frameworks/funnel-design.ts
  - packages/prompt-library/src/frameworks/index.ts
- **Features:**
  - Hormozi Value Equation (offer-economics)
  - Schwartz Awareness Levels (market-awareness)
  - PAS/AIDA/Proof Hierarchy (persuasion)
  - UX/CTA rules (funnel-design)
  - All frameworks versioned for cache invalidation

### Task: Define agent contracts
- **Status:** DONE
- **Files created:**
  - packages/agent-core/src/contracts/research-agent.ts
  - packages/agent-core/src/contracts/strategy-funnel-agent.ts
  - packages/agent-core/src/contracts/copy-messaging-agent.ts
  - packages/agent-core/src/contracts/automation-crm-agent.ts
  - packages/agent-core/src/contracts/quality-control-agent.ts
  - packages/agent-core/src/contracts/index.ts
- **Features:**
  - Each agent has: purpose, capabilities, constraints, input/output schemas
  - No overlapping responsibilities enforced via constraints
  - Per-agent model routing (Sonnet/GPT-4/GPT-4o-mini)
  - Per-agent cost caps

### Task: Implement multi-LLM routing
- **Status:** DONE
- **Files created:**
  - packages/agent-core/src/llm-router.ts
- **Features:**
  - Routes Research/Strategy/QC → Claude Sonnet
  - Routes Copy → GPT-4
  - Routes Automation → GPT-4o-mini
  - Downgrade logic when cost cap exceeded
  - Cross-provider fallback support

### Task: Implement specialized agent runner with QC enforcement
- **Status:** DONE
- **Files created:**
  - packages/agent-core/src/specialized-runner.ts
- **Features:**
  - Contract enforcement before execution
  - Framework injection based on agent requirements
  - QC runs after Strategy and Copy agents
  - QC can block execution if violations found
  - Per-agent cost tracking

### Task: Add tests for Week 3 components
- **Status:** DONE
- **Tests added:**
  - packages/agent-core/src/contracts.test.ts
  - packages/agent-core/src/llm-router.test.ts
- **Coverage:**
  - All 5 agents have contracts
  - No overlapping responsibilities
  - LLM routing selects correct model
  - Cost caps enforced
  - QC blocking logic works

---
