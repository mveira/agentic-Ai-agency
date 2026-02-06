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

## Week 5 – BuildOrchestrator Pipeline

### Task: Create build pipeline schemas (Step 1)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/build-schemas.ts (created)
- **Tests added/updated:**
  - packages/agent-core/src/build-schemas.test.ts (21 tests)
- **Commands run:**
  - pnpm test (21 tests passed)
- **Notes / blockers:**
  - MarketingBlueprintSchema, UXUISpecSchema, CopyPackSchema, BuildPlanSchema, BuildTaskSchema, QCReportSchema
  - Sub-schemas: FunnelStep, Screen, Component, LayoutBlock, AccessibilityRule, ScreenState, ScreenCopy
  - Enforces min(1) on funnelSteps, screens, routes, successCriteria, acceptanceCriteria

### Task: Create UX Design Agent contract (Step 2)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/contracts/ux-design-agent.ts (created)
  - packages/agent-core/src/contracts/index.ts (modified)
- **Tests added/updated:**
  - packages/agent-core/src/contracts.test.ts (9 new tests, 40 total)
- **Commands run:**
  - pnpm test (40 tests passed)
- **Notes / blockers:**
  - agentId: ux-design-agent, model: claude-3-sonnet, cost cap: £0.75
  - Consumes MarketingBlueprint, produces UXUISpec
  - Constraints: no copy writing, no strategy modification, no skipping accessibility
  - Added to ALL_AGENT_CONTRACTS, AGENT_MODEL_ROUTING, AGENT_COST_CAPS, AGENT_FRAMEWORK_REQUIREMENTS

### Task: Create build mock factories (Step 3)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/build-mocks.ts (created)
- **Tests added/updated:**
  - packages/agent-core/src/build-mocks.test.ts (9 tests)
- **Commands run:**
  - pnpm test (9 tests passed)
- **Notes / blockers:**
  - createMockBlueprintOutput, createMockUXUISpecOutput, createMockCopyPackOutput
  - createMockQCPassOutput, createMockQCBlockOutput
  - registerBuildMocks(adapter) registers all on MockLLMAdapter via pattern matching

### Task: Create BuildOrchestrator (Step 4)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/build-orchestrator.ts (created)
- **Tests added/updated:**
  - packages/agent-core/src/build-orchestrator.test.ts (20 tests)
- **Commands run:**
  - pnpm test (20 tests passed)
- **Notes / blockers:**
  - RequirementsProvider interface + InMemoryRequirementsProvider
  - Governance gates: requirements existence + assumptions approval
  - 4-step pipeline: strategy-funnel → ux-design → copy-messaging → quality-control
  - Schema validation at every handoff
  - Mode B enforcement: optional separated from core in assembleBuildPlan()
  - QC blocking returns { status: 'blocked', blockReason }
  - Telemetry recorded for each pipeline step

### Task: Update index.ts exports (Step 5)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/index.ts (modified)
- **Tests added/updated:**
  - N/A (exports only)
- **Commands run:**
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - All build schemas + types
  - BuildOrchestrator, InMemoryRequirementsProvider, assembleBuildPlan
  - All build mock factories
  - All new types exported

### Task: Create API build endpoints (Step 6)
- **Status:** DONE
- **Files touched:**
  - apps/api/src/routes/build.ts (created)
  - apps/api/src/index.ts (modified)
- **Tests added/updated:**
  - apps/api/src/routes/build.test.ts (8 tests)
- **Commands run:**
  - pnpm test (283 total tests passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - POST /api/projects/:id/build/plan → executes full pipeline, returns BuildPlan or error/blocked
  - POST /api/projects/:id/build/approve-enhancement → approve/reject optional enhancements
  - In-memory stores for development; swappable to DB later

---

## Portal UX — Hybrid Clarification Flow

### Task: Create API portal stubs
- **Status:** DONE
- **Files touched:**
  - apps/api/src/routes/portal.ts (created)
  - apps/api/src/index.ts (modified — mounted 4 new routers)
- **Tests added/updated:**
  - apps/api/src/routes/portal.test.ts (14 tests)
- **Commands run:**
  - pnpm test (14 portal tests passed)
- **Notes / blockers:**
  - GET /api/projects/:id/intakes/:leadIntakeId — lead intake data
  - GET /api/clarification/sessions/:sessionId — questions with all 6 inputTypes
  - POST /api/clarification/sessions/:sessionId/answers — validates required, returns understanding summary
  - GET /api/requirements/:versionId — requirements + assumptions
  - POST /api/requirements/:versionId/confirm — returns confirmed/regenerating based on decisions
  - GET /api/reviews/:versionId — review status with timeline
  - All endpoints return stubbed JSON matching typed contracts

### Task: Create QuestionField component with tests
- **Status:** DONE
- **Files touched:**
  - apps/dashboard/src/components/QuestionField.tsx (created)
  - apps/dashboard/src/types/portal.ts (created)
  - apps/dashboard/vitest.config.mts (created)
  - apps/dashboard/src/test-setup.ts (created)
  - apps/dashboard/package.json (added test deps + test script)
- **Tests added/updated:**
  - apps/dashboard/src/components/QuestionField.test.tsx (15 tests)
- **Commands run:**
  - pnpm test (15 dashboard tests passed)
- **Notes / blockers:**
  - Renders correct control per inputType: short_text, long_text, number, date, single_select, multi_select
  - Required indicator (asterisk) displayed for required questions
  - Error messages displayed when provided
  - onChange fires with correct value types (string, string[], number)
  - Added vitest + @testing-library/react + jsdom + @vitejs/plugin-react to dashboard

### Task: Create portal flow pages
- **Status:** DONE
- **Files touched:**
  - apps/dashboard/src/app/projects/[id]/intake/[leadIntakeId]/page.tsx (created)
  - apps/dashboard/src/app/projects/[id]/clarification/[sessionId]/page.tsx (created)
  - apps/dashboard/src/app/projects/[id]/requirements/[versionId]/confirm/page.tsx (created)
  - apps/dashboard/src/app/projects/[id]/review/[versionId]/page.tsx (created)
- **Tests added/updated:**
  - N/A (pages compose tested components; API stubs tested separately)
- **Commands run:**
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - Intake page: displays discovery form fields in table, links to clarification
  - Clarification page: chat-like timeline, QuestionField per question, understanding summary panel, client-side validation
  - Requirements confirm page: requirement checklist (Correct/Needs Change), assumptions list (Approve/Reject with comments), regenerating placeholder
  - Review page: progress bars, blockers list, timeline with status indicators
  - All pages driven by JSON contracts from API — no embedded business logic

---

## Event Bus A – DB-backed Queue + Worker

### Task: Create event bus domain layer (types, EventStore, event API)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/event-bus.ts (created)
- **Tests added/updated:**
  - packages/agent-core/src/event-bus.test.ts (17 tests)
- **Commands run:**
  - pnpm test (17 tests passed)
- **Notes / blockers:**
  - SystemEvent type with full lifecycle: PENDING → PROCESSING → DONE/FAILED/DEAD_LETTERED
  - EventStore interface with InMemoryEventStore for tests
  - publishEvent with idempotency via computeEventHash (SHA-256, key-order-independent)
  - markProcessing, markDone, markFailed (with backoff), markDeadLetter
  - Unique constraint on (projectId, type, payloadHash)
  - fetchBatch simulates SELECT ... FOR UPDATE SKIP LOCKED

### Task: Create EventWorker with handler registry and retry logic
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/event-worker.ts (created)
- **Tests added/updated:**
  - packages/agent-core/src/event-worker.test.ts (12 tests)
- **Commands run:**
  - pnpm test (12 tests passed)
- **Notes / blockers:**
  - EventWorker.tick() fetches batch, dispatches handlers, marks DONE/FAILED/DEAD_LETTERED
  - Exponential backoff: baseBackoffMs * 2^(attempts-1)
  - Configurable maxAttempts (dead-letters after exceeding)
  - Handler dispatch by event.type; graceful failure for unknown types
  - Two workers don't process same event (locking verified)
  - createDefaultHandlers() with DISCOVERY_SUBMITTED stub (logs only)
  - ProcessResult telemetry: eventId, eventType, status, error, durationMs

### Task: Add events table to DB schema
- **Status:** DONE
- **Files touched:**
  - apps/api/src/db/schema.ts (modified)
- **Tests added/updated:**
  - N/A (schema definition, verified via typecheck)
- **Commands run:**
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - eventStatusEnum: PENDING, PROCESSING, DONE, FAILED, DEAD_LETTERED
  - events table with all fields matching SystemEvent interface
  - uniqueIndex on (projectId, type, payloadHash)
  - Event/NewEvent type exports

### Task: Update exports and run full verification
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/index.ts (modified)
- **Tests added/updated:**
  - N/A (exports only)
- **Commands run:**
  - pnpm test (312 total tests passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - Exported: InMemoryEventStore, publishEvent, markProcessing, markDone, markFailed, markDeadLetter, computeEventHash
  - Exported: EventWorker, createDefaultHandlers
  - All types exported: SystemEvent, EventStatus, EventStore, EventHandler, ProcessResult, etc.
  - Renamed computePayloadHash → computeEventHash to avoid conflict with ghl-actions export

### Task: Create future upgrades roadmap document
- **Status:** DONE
- **Files touched:**
  - docs/future-upgrades.md (created)
- **Tests added/updated:**
  - N/A (documentation only)
- **Commands run:**
  - pnpm test (283 tests passed)
  - pnpm lint (passed)
- **Notes / blockers:**
  - Living roadmap with status key: IDEA / PLANNED / IN BUILD / DONE
  - Sections: Infrastructure & Eventing, Auth, Portal UI/UX, Agents, Integrations, Observability, Governance
  - DB-backed queue documented as first infrastructure upgrade before SQS/Redis
  - Append-only notes section for ongoing context

---

## Week 4.0 – Auth + Multi-Tenant + Cloud Baseline

### Task: Create @agency/auth package with RBAC
- **Status:** DONE
- **Files touched:**
  - packages/auth/package.json (created)
  - packages/auth/tsconfig.json (created)
  - packages/auth/vitest.config.ts (created)
  - packages/auth/src/types.ts (created)
  - packages/auth/src/rbac.ts (created)
  - packages/auth/src/index.ts (created)
- **Tests added/updated:**
  - packages/auth/src/rbac.test.ts (38 tests)
- **Commands run:**
  - pnpm test (38 auth tests passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - 5 roles: agency_admin, agency_operator, client_admin, client_member, viewer
  - canAccessOrg, canAccessProject, canWriteOrg, canWriteProject
  - isAgencyUser, isViewerOnly, getRoleForOrg
  - getAccessibleOrgIds, filterAccessibleProjects, buildAuthContext
  - Agency roles get cross-org access to all projects

### Task: Extend DB schema for multi-tenant
- **Status:** DONE
- **Files touched:**
  - apps/api/src/db/schema.ts (modified)
- **Tests added/updated:**
  - N/A (schema definition, verified via typecheck)
- **Commands run:**
  - pnpm typecheck (passed)
  - pnpm lint (passed)
- **Notes / blockers:**
  - Added orgTypeEnum (agency, client), membershipRoleEnum (5 roles)
  - Added orgs, users, memberships tables
  - Added orgId to projects table, made clientId nullable
  - Added dryRun boolean to projects table

### Task: Create API auth middleware with server-enforced tenancy
- **Status:** DONE
- **Files touched:**
  - apps/api/package.json (added @agency/auth dependency)
  - apps/api/src/middleware/auth.ts (created)
- **Tests added/updated:**
  - apps/api/src/middleware/auth.test.ts (17 tests)
- **Commands run:**
  - pnpm test (18 API tests passed, 215 total)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - createAuthMiddleware: verifies bearer token, loads memberships, builds AuthContext
  - createProjectAccessMiddleware: enforces read/write access per project via RBAC
  - getAuthContext: extracts AuthContext from Hono context
  - TokenVerifier, MembershipLoader, ProjectLoader interfaces for testability
  - Mock implementations in tests; Supabase implementation plugged in later

### Task: Add dashboard login page and auth middleware
- **Status:** DONE
- **Files touched:**
  - apps/dashboard/package.json (added @supabase/ssr, @supabase/supabase-js)
  - apps/dashboard/src/lib/supabase/client.ts (created)
  - apps/dashboard/src/lib/supabase/server.ts (created)
  - apps/dashboard/src/lib/supabase/middleware.ts (created)
  - apps/dashboard/src/middleware.ts (created)
  - apps/dashboard/src/app/login/page.tsx (created)
  - apps/dashboard/src/app/auth/callback/route.ts (created)
- **Tests added/updated:**
  - N/A (UI scaffold, requires Supabase instance for integration testing)
- **Commands run:**
  - pnpm typecheck (passed)
  - pnpm lint (passed)
- **Notes / blockers:**
  - Magic link auth via Supabase signInWithOtp
  - Next.js middleware protects all routes except /login, /auth, /health
  - Auth callback exchanges code for session
  - Supabase client utilities for browser, server, and middleware contexts

### Task: Update .env.example files with Supabase vars
- **Status:** DONE
- **Files touched:**
  - .env.example (added Supabase vars)
  - apps/api/.env.example (added Supabase vars)
  - apps/dashboard/.env.example (created)
- **Tests added/updated:**
  - N/A (configuration)
- **Commands run:**
  - N/A (env file updates)
- **Notes / blockers:**
  - Root: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
  - API: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
  - Dashboard: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL

---

## Week 4.2 – GHL Actions: Move Stage + Trigger Workflow

### Task: Generate sales & demo materials from system documentation
- **Status:** TODO
- **Agent:** StrategyFunnelAgent, CopyMessagingAgent
- **Depends on:** docs/ baseline complete
- **Deliverables:**
  - Client-facing explanation
  - Demo walkthrough script
  - Value-based positioning
- **Notes / blockers:**
  - No new logic
  - Uses existing system only

### Task: Add telemetry coverage to ActionExecutor
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/ghl-actions.ts (ActionTelemetryEvent, recordAndReturn, getLog, getLogByProject)
  - packages/agent-core/src/index.ts (export ActionTelemetryEvent)
- **Tests added/updated:**
  - packages/agent-core/src/ghl-actions.test.ts (7 new telemetry tests, 28 total)
- **Commands run:**
  - pnpm test (160 tests passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - Every execute() call records ActionTelemetryEvent with projectId, actionType, payloadHash, dryRun, blocked, blockedReason, timestamp
  - getLog() returns full telemetry log
  - getLogByProject() filters by projectId
  - clearHistory() resets both hashes and telemetry

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

## Week 3 – Agents & Intelligence

### Task: Add Hormozi/Psychology framework blocks to prompt-library
- **Status:** DONE
- **Files touched:**
  - packages/prompt-library/src/frameworks/offer-economics.ts
  - packages/prompt-library/src/frameworks/market-awareness.ts
  - packages/prompt-library/src/frameworks/persuasion.ts
  - packages/prompt-library/src/frameworks/funnel-design.ts
  - packages/prompt-library/src/frameworks/index.ts
- **Tests added/updated:**
  - packages/prompt-library/src/global-rules.test.ts
- **Commands run:**
  - pnpm test (passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - Hormozi Value Equation (offer-economics)
  - Schwartz Awareness Levels (market-awareness)
  - PAS/AIDA/Proof Hierarchy (persuasion)
  - UX/CTA rules (funnel-design)
  - All frameworks versioned for cache invalidation

### Task: Define agent contracts
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/contracts/research-agent.ts
  - packages/agent-core/src/contracts/strategy-funnel-agent.ts
  - packages/agent-core/src/contracts/copy-messaging-agent.ts
  - packages/agent-core/src/contracts/automation-crm-agent.ts
  - packages/agent-core/src/contracts/quality-control-agent.ts
  - packages/agent-core/src/contracts/index.ts
- **Tests added/updated:**
  - packages/agent-core/src/contracts.test.ts
- **Commands run:**
  - pnpm test (passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - Each agent has: purpose, capabilities, constraints, input/output schemas
  - No overlapping responsibilities enforced via constraints
  - Per-agent model routing (Sonnet/GPT-4/GPT-4o-mini)
  - Per-agent cost caps

### Task: Implement multi-LLM routing
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/llm-router.ts
- **Tests added/updated:**
  - packages/agent-core/src/llm-router.test.ts
- **Commands run:**
  - pnpm test (passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - Routes Research/Strategy/QC → Claude Sonnet
  - Routes Copy → GPT-4
  - Routes Automation → GPT-4o-mini
  - Downgrade logic when cost cap exceeded
  - Cross-provider fallback support

### Task: Implement specialized agent runner with QC enforcement
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/specialized-runner.ts
- **Tests added/updated:**
  - packages/agent-core/src/specialized-runner.test.ts
- **Commands run:**
  - pnpm test (passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - Contract enforcement before execution
  - Framework injection based on agent requirements
  - QC runs after Strategy and Copy agents
  - QC can block execution if violations found
  - Per-agent cost tracking

---

## Week 2 – Governance & Assumptions

### Task: Implement assumption gate system
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/assumption-gate.ts (created)
  - apps/api/src/db/schema.ts (extended)
  - apps/api/src/routes/assumptions.ts (created)
- **Tests added/updated:**
  - packages/agent-core/src/assumption-gate.test.ts
- **Commands run:**
  - pnpm test (passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - Assumption gate implemented and enforced
  - Requirements generated from approved assumptions
  - Requirements versioning implemented
  - Tasks generated from requirements
  - Tasks blocked when assumptions pending
  - API endpoints for assumptions, requirements, tasks
  - Dashboard views for assumptions, requirements, tasks
  - All blocks and decisions logged

---

## Week 1 – Foundation

### Task: Create progress tracking files
- **Status:** DONE
- **Files touched:**
  - progress/task-log.md
  - progress/error-log.md
  - progress/decision-log.md
- **Tests added/updated:**
  - N/A (infrastructure)
- **Commands run:**
  - N/A (documentation)
- **Notes / blockers:**
  - Foundation for tracking all work

### Task: Create monorepo directory structure
- **Status:** DONE
- **Files touched:**
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
- **Tests added/updated:**
  - N/A (infrastructure)
- **Commands run:**
  - pnpm install (1448 packages installed)
- **Notes / blockers:**
  - Monorepo structure with pnpm workspaces

### Task: Implement telemetry package
- **Status:** DONE
- **Files touched:**
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
- **Tests added/updated:**
  - packages/telemetry/src/cost.test.ts
  - packages/telemetry/src/record.test.ts
  - packages/telemetry/src/spend.test.ts
  - packages/telemetry/src/budget.test.ts
- **Commands run:**
  - pnpm test (25 tests passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - estimateCost() - calculates cost from tokens and model pricing
  - recordTaskRun() - records task run with auto-calculated cost
  - getProjectSpend() - gets daily/monthly/total spend
  - budgetCheck() - validates task against budget limits

### Task: Implement agent-core package
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/package.json
  - packages/agent-core/tsconfig.json
  - packages/agent-core/vitest.config.ts
  - packages/agent-core/src/types.ts
  - packages/agent-core/src/questions.ts
  - packages/agent-core/src/mock-llm.ts
  - packages/agent-core/src/prompt-compiler.ts
  - packages/agent-core/src/agent-runner.ts
  - packages/agent-core/src/index.ts
- **Tests added/updated:**
  - packages/agent-core/src/questions.test.ts
  - packages/agent-core/src/prompt-compiler.test.ts
  - packages/agent-core/src/agent-runner.test.ts
- **Commands run:**
  - pnpm test (24 tests passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - Question bank loading from ../agency-questions
  - Prompt compilation (GLOBAL_RULES + AgentContract + FrameworkBlocks + TaskPrompt + KnownUnknowns)
  - JSON output schema enforcement
  - Mock LLM adapter with deterministic output
  - Budget gate integration
  - Telemetry logging for every run

### Task: Implement prompt-library package
- **Status:** DONE
- **Files touched:**
  - packages/prompt-library/package.json
  - packages/prompt-library/tsconfig.json
  - packages/prompt-library/vitest.config.ts
  - packages/prompt-library/src/types.ts
  - packages/prompt-library/src/global-rules.ts
  - packages/prompt-library/src/frameworks.ts
  - packages/prompt-library/src/index.ts
- **Tests added/updated:**
  - packages/prompt-library/src/global-rules.test.ts
- **Commands run:**
  - pnpm test (4 tests passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - Global rules for all agents
  - Category-specific rules (client-facing, code-generation, data-processing)
  - Framework block placeholders (marketing, technical, ecommerce, communication)

### Task: Implement API app
- **Status:** DONE
- **Files touched:**
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
- **Tests added/updated:**
  - apps/api/src/routes/task.test.ts
  - apps/api/src/routes/spend.test.ts
- **Commands run:**
  - pnpm test (passed)
  - pnpm lint (passed)
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - POST /api/run-task
  - GET /api/projects/:projectId/spend
  - Database schema: clients, projects, model_pricing, task_runs

### Task: Scaffold dashboard app
- **Status:** DONE
- **Files touched:**
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
- **Tests added/updated:**
  - N/A (UI scaffold)
- **Commands run:**
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - Routes: /projects, /projects/[id]/proposal, /projects/[id]/assumptions, /projects/[id]/requirements, /projects/[id]/tasks

### Task: Scaffold CMS app (Strapi)
- **Status:** DONE
- **Files touched:**
  - apps/cms/package.json
  - apps/cms/Dockerfile
  - apps/cms/docker-compose.yml
  - apps/cms/.env.example
  - apps/cms/src/api/framework/content-types/framework/schema.json
  - apps/cms/src/api/agent-config/content-types/agent-config/schema.json
  - apps/cms/src/api/prompt-template/content-types/prompt-template/schema.json
- **Tests added/updated:**
  - N/A (CMS configuration)
- **Commands run:**
  - N/A (Strapi scaffold)
- **Notes / blockers:**
  - Content types: Framework, AgentConfig, PromptTemplate

### Task: Verify foundation setup
- **Status:** DONE
- **Files touched:**
  - N/A (verification only)
- **Tests added/updated:**
  - N/A (running existing tests)
- **Commands run:**
  - pnpm install (SUCCESS - 1448 packages)
  - pnpm test (telemetry: 25 tests passed)
  - pnpm test (agent-core: 24 tests passed)
  - pnpm test (prompt-library: 4 tests passed)
- **Notes / blockers:**
  - All foundation components verified working
  - Budget overrun blocks execution
  - Missing question bank fails fast
  - Output schema enforcement working

---

## BusinessArchitectAgent — Clarification Rounds

### Task: Create BusinessArchitectAgent contract + schemas
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/contracts/business-architect-agent.ts (NEW)
  - packages/agent-core/src/business-architect.test.ts (NEW)
- **Tests added/updated:**
  - business-architect.test.ts — 28 tests (schemas, StrapiProvider, contract constraints)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (28 pass)
- **Notes / blockers:**
  - ClarificationQuestionSchema: key, text, inputType, options, required, validation, helpText
  - ClarificationResultSchema: readiness (0–1), summary[], questions[], blockReason
  - StrapiProvider interface + InMemoryStrapiProvider for tests
  - Agent contract enforces: read-only Strapi, no requirements generation, guided choices

### Task: Register agent in contracts registry + update tests
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/contracts/index.ts (MODIFIED)
  - packages/agent-core/src/contracts.test.ts (MODIFIED)
- **Tests added/updated:**
  - contracts.test.ts — 49 tests (up from 40; +9 for business-architect-agent)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (49 pass)
- **Notes / blockers:**
  - Agent count: 6 → 7
  - Registered in ALL_AGENT_CONTRACTS, AGENT_MODEL_ROUTING (claude-3-sonnet), AGENT_COST_CAPS (0.50), AGENT_FRAMEWORK_REQUIREMENTS (market-awareness, offer-economics)

### Task: Add plan-next and approve-questions API endpoints
- **Status:** DONE
- **Files touched:**
  - apps/api/src/routes/portal.ts (MODIFIED)
  - apps/api/src/routes/portal.test.ts (MODIFIED)
- **Tests added/updated:**
  - portal.test.ts — 22 tests (up from 14; +8 for plan-next and approve-questions)
- **Commands run:**
  - pnpm --filter @agency/api test (22 pass)
- **Notes / blockers:**
  - POST /api/clarification/sessions/:sessionId/plan-next — returns readiness, summary, questions, blockReason
  - POST /api/clarification/sessions/:sessionId/approve-questions — agency approval gate with removedKeys + editedQuestions
  - Round 1 returns lower readiness + more questions; round 2+ returns higher readiness + fewer questions
  - Stub data; will wire to real agent execution later

### Task: Full verification + commit
- **Status:** DONE
- **Files touched:**
  - progress/task-log.md, progress/decision-log.md
- **Tests added/updated:**
  - N/A (verification)
- **Commands run:**
  - pnpm test — 386 tests pass (238 agent-core + 48 api + 15 dashboard + 38 auth + 25 telemetry + 22 prompt-library)
  - pnpm lint — clean
  - pnpm typecheck — clean
- **Notes / blockers:**
  - Committed as 'Add BusinessArchitectAgent and clarification planning'

---

## Step 3 – BusinessArchitectAgent Real Clarification Planning

### Task: Update schemas — readiness enum + ApprovedQuestionSet + MissingSlots
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/contracts/business-architect-agent.ts (MODIFIED)
  - packages/agent-core/src/contracts/index.ts (MODIFIED — added Readiness, MissingSlotsSchema, ApprovedQuestionSetSchema exports)
- **Tests added/updated:**
  - packages/agent-core/src/business-architect.test.ts (rewritten — 35 tests)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (35 pass)
  - pnpm --filter @agency/agent-core test -- contracts.test.ts (49 pass)
- **Notes / blockers:**
  - readiness changed from z.number().min(0).max(1) to Readiness enum: NEEDS_MORE_INFO | READY_FOR_REQUIREMENTS | BLOCKED
  - Added MissingSlotsSchema (budget, timeline, offer, channel, goals, conflicts — booleans, default false)
  - Added ApprovedQuestionSetSchema (approvedBy, approvedAt, questions[], summary[], readiness)
  - Added missingSlots to ClarificationResultSchema (optional)
  - Added missingSlots + currentSummary to BusinessArchitectAgentInputSchema

### Task: Build BusinessArchitectPlanner with Strapi + agent integration
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/business-architect-planner.ts (NEW)
  - packages/agent-core/src/business-architect-planner.test.ts (NEW)
- **Tests added/updated:**
  - business-architect-planner.test.ts — 17 tests (planner lifecycle + computeMissingSlots + mockOutput)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (262 pass)
- **Notes / blockers:**
  - Orchestrates: Strapi availability check → template fetch → prompt build → LLM call → schema validation
  - Returns BLOCKED if Strapi unavailable or fetch fails
  - Validates output against BusinessArchitectAgentOutputSchema then ClarificationResultSchema
  - Static computeMissingSlots() uses key aliases (budget/budgetRange/monthly_budget etc.)
  - createMockPlannerOutput() for test consumers

### Task: Replace portal stubs with DRAFT/APPROVED lifecycle
- **Status:** DONE
- **Files touched:**
  - apps/api/src/routes/portal.ts (REWRITTEN — SessionQuestionStore, ReadinessStatus enum, DRAFT/APPROVED gate)
  - apps/api/src/routes/portal.test.ts (REWRITTEN — 28 tests with lifecycle coverage)
- **Tests added/updated:**
  - portal.test.ts — 28 tests (up from 22; +6 lifecycle tests)
- **Commands run:**
  - pnpm test — 416 total tests pass
- **Notes / blockers:**
  - SessionQuestionStore: storeDraft(), approve(), getApproved(), getDrafts(), clear()
  - PlanNextResult.readiness changed from number to ReadinessStatus enum
  - plan-next stores DRAFT via sessionQuestionStore.storeDraft()
  - approve-questions promotes DRAFT→APPROVED with optional removedKeys/editedQuestions
  - GET /sessions only returns base + APPROVED questions (no DRAFTs)
  - POST /answers validates against base + APPROVED questions

### Task: Exports, verification, and commit
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/index.ts (MODIFIED — added BusinessArchitectPlanner exports)
  - progress/task-log.md, progress/decision-log.md
- **Tests added/updated:**
  - N/A (verification)
- **Commands run:**
  - pnpm test — 416 tests pass (262 agent-core + 54 api + 15 dashboard + 38 auth + 25 telemetry + 22 prompt-library)
  - pnpm lint — clean
  - pnpm typecheck — clean
- **Notes / blockers:**
  - Exported: BusinessArchitectPlanner, createMockPlannerOutput, PlannerInput, PlannerResult, PlannerConfig
  - Committed as 'Add BusinessArchitectAgent with approval-gated clarification planning'

---

## Step 4.5 – Knowledge Base + MCP Tooling + Documentation Hardening (SUPERSEDED)

> All tasks below have been SUPERSEDED by the Step 4.5 REDO section below.

### Task: Knowledge Entry Schema (Step 1)
- **Status:** SUPERSEDED
- **Files touched:**
  - packages/agent-core/src/knowledge-schemas.ts (NEW)
- **Tests added/updated:**
  - packages/agent-core/src/knowledge-schemas.test.ts (8 tests)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (8 pass)
- **Notes / blockers:**
  - KnowledgeEntryTypeSchema: requirement, assumption, decision, design-rule, review
  - KnowledgeEntrySourceSchema: agent, human
  - KnowledgeEntryStatusSchema: approved, rejected, superseded
  - KnowledgeEntrySchema: id (uuid), projectId (uuid), type, source, versionRef (nullable), contentJson, status, createdAt

### Task: KnowledgeStore Interface + InMemory Implementation (Step 2)
- **Status:** SUPERSEDED
- **Files touched:**
  - packages/agent-core/src/knowledge-store.ts (NEW)
- **Tests added/updated:**
  - packages/agent-core/src/knowledge-store.test.ts (12 tests)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (12 pass)
- **Notes / blockers:**
  - KnowledgeStore interface: store, get, getByProject, getByProjectAndType, getByProjectTypeAndStatus, supersede, clear
  - InMemoryKnowledgeStore with Map<string, KnowledgeEntry> + structuredClone

### Task: KB Auto-Populate Function (Step 3)
- **Status:** SUPERSEDED
- **Files touched:**
  - packages/agent-core/src/knowledge-populator.ts (NEW)
- **Tests added/updated:**
  - packages/agent-core/src/knowledge-populator.test.ts (8 tests)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (8 pass)
- **Notes / blockers:**
  - populateKBFromConfirmation(store, version) → PopulateKBResult
  - Only populates from confirmed versions
  - Supersedes prior entries for same project
  - Maps requirements → approved, approved assumptions → approved, rejected assumptions → rejected

### Task: MCP-Style Tool Definitions (Step 4)
- **Status:** SUPERSEDED
- **Files touched:**
  - packages/agent-core/src/knowledge-tools.ts (NEW)
- **Tests added/updated:**
  - packages/agent-core/src/knowledge-tools.test.ts (10 tests)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (10 pass)
- **Notes / blockers:**
  - 5 query tools: getApprovedRequirements, getApprovedAssumptions, getDecisions, getDesignRules, getReviews
  - All return KBToolResult { entries: {id, contentJson, createdAt}[], count }
  - KB_TOOL_REGISTRY for lookup

### Task: Tool Telemetry Logging (Step 5)
- **Status:** SUPERSEDED
- **Files touched:**
  - packages/agent-core/src/knowledge-tool-telemetry.ts (NEW)
- **Tests added/updated:**
  - packages/agent-core/src/knowledge-tool-telemetry.test.ts (4 tests)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (4 pass)
- **Notes / blockers:**
  - logToolUsage() calls recordTaskRun with taskType kb-tool:<toolName>, model 'mock', 0 tokens
  - Uses model 'mock' (not 'none') because estimateCost requires valid model pricing

### Task: ProposalStrategistAgent Contract (Step 6)
- **Status:** SUPERSEDED
- **Files touched:**
  - packages/agent-core/src/contracts/proposal-strategist-agent.ts (NEW)
  - packages/agent-core/src/contracts/index.ts (MODIFIED)
  - packages/agent-core/src/contracts.test.ts (MODIFIED)
- **Tests added/updated:**
  - contracts.test.ts — 71 tests (up from 59; +12 for proposal-strategist-agent)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (71 pass)
- **Notes / blockers:**
  - agentId: proposal-strategist-agent, model: claude-3-sonnet, cost cap: £0.75
  - Agent count: 8 → 9
  - Frameworks: offer-economics, market-awareness
  - BLOCKS without approved requirements via KB

### Task: Agent-KB Integration (Step 7)
- **Status:** SUPERSEDED
- **Files touched:**
  - packages/agent-core/src/knowledge-agent-integration.ts (NEW)
- **Tests added/updated:**
  - packages/agent-core/src/knowledge-agent-integration.test.ts (8 tests)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (8 pass)
- **Notes / blockers:**
  - AGENT_KB_TOOL_ACCESS map defining per-agent tool access
  - loadKBForAgent(store, agentId, projectId) → KBLoadResult
  - ProposalStrategistAgent BLOCKS if no approved requirements

### Task: Wire KB into Confirm Route (Step 8)
- **Status:** SUPERSEDED
- **Files touched:**
  - apps/api/src/routes/requirements-v2.ts (MODIFIED — added KB imports + auto-populate call)
  - apps/api/src/routes/requirements-v2.test.ts (MODIFIED — added 5 KB tests)
- **Tests added/updated:**
  - requirements-v2.test.ts — 24 tests (up from 19; +5 KB auto-populate tests)
- **Commands run:**
  - pnpm --filter @agency/api test (24 pass)
  - pnpm build --filter @agency/agent-core (required for cross-package resolution)
- **Notes / blockers:**
  - Exported knowledgeStore from requirements-v2.ts
  - populateKBFromConfirmation called after status = 'confirmed'
  - KB tests verify requirements, approved assumptions, rejected assumptions populated

### Task: Barrel Exports (Step 9)
- **Status:** SUPERSEDED
- **Files touched:**
  - packages/agent-core/src/index.ts (MODIFIED — ~30 new export lines)
- **Tests added/updated:**
  - N/A (exports only)
- **Commands run:**
  - pnpm typecheck (passed)
- **Notes / blockers:**
  - All KB exports: schemas, types, store, populator, tools, telemetry, agent integration

### Task: Documentation Restructure (Step 10)
- **Status:** SUPERSEDED
- **Files touched:**
  - docs/architecture/system-overview.md (NEW)
  - docs/architecture/event-flow.md (NEW)
  - docs/architecture/governance-model.md (NEW)
  - docs/agents/index.md (NEW)
  - docs/agents/research.md (NEW)
  - docs/agents/strategy-funnel.md (NEW)
  - docs/agents/copy-messaging.md (NEW)
  - docs/agents/automation-crm.md (NEW)
  - docs/agents/ux-design-agent.md (NEW)
  - docs/agents/quality-control.md (NEW)
  - docs/agents/business-architect.md (NEW)
  - docs/agents/requirements-engineer.md (NEW)
  - docs/agents/proposal-strategist.md (NEW)
  - docs/features/discovery-to-requirements.md (NEW)
  - docs/features/clarification-interview.md (NEW)
  - docs/features/assumptions-approval.md (NEW)
  - docs/features/proposal-generation.md (NEW)
  - docs/knowledge/knowledge-base.md (NEW)
  - docs/knowledge/mcp-tooling.md (NEW)
  - docs/docs/ (REMOVED — 15 old files)
- **Tests added/updated:**
  - N/A (documentation only)
- **Commands run:**
  - N/A
- **Notes / blockers:**
  - Restructured from flat docs/docs/00-14 into docs/architecture/, docs/agents/, docs/features/, docs/knowledge/
  - Architecture: 3 files merged from 00+01+08+12+14, 03+05+10, 02+06+07+11
  - Agents: 10 files (index + 9 agent docs)
  - Features: 4 files (discovery, clarification, assumptions, proposal)
  - Knowledge: 2 files (knowledge-base, mcp-tooling)

### Task: Future Upgrades Update (Step 11)
- **Status:** SUPERSEDED
- **Files touched:**
  - docs/future-upgrades.md (MODIFIED — added Knowledge Base section)
- **Tests added/updated:**
  - N/A (documentation only)
- **Commands run:**
  - N/A
- **Notes / blockers:**
  - Added Knowledge Base section with 4 entries
  - Vector search / embeddings as PLANNED
  - KB persistence (database-backed) as PLANNED

### Task: Logging + Verification (Step 12)
- **Status:** SUPERSEDED
- **Files touched:**
  - progress/task-log.md, progress/decision-log.md
- **Tests added/updated:**
  - N/A (verification)
- **Commands run:**
  - pnpm test — 573 tests pass (395 agent-core + 78 api + 15 dashboard + 38 auth + 25 telemetry + 22 prompt-library)
  - pnpm lint — clean
  - pnpm typecheck — clean
- **Notes / blockers:**
  - All 64 new KB tests green
  - All existing tests green (no regressions)
  - Documentation restructured into architecture/agents/features/knowledge

---

## Step 4 – Requirements + Assumptions Loop (Auto-Regenerate on Change)

### Task: Create requirements schemas (Step 4.1)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/requirements-schemas.ts (NEW)
- **Tests added/updated:**
  - packages/agent-core/src/requirements-schemas.test.ts (23 tests)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (23 pass)
- **Notes / blockers:**
  - RequirementSchema: id, title, details, priority (MUST|SHOULD|COULD), category?
  - AssumptionSchema: id, statement, reason
  - RequirementsBundleSchema: requirements[].min(1), assumptions[].min(1), openQuestions?
  - ConfirmPayloadSchema: requirements[{id, confirmed, changeNote?}], assumptions[{id, status, comment?}]
  - RequirementsVersionSchema: versionId, projectId, versionNumber, status, factsSnapshot, changeRequests, createdAt
  - ChangeRequestSchema: type (requirement|assumption), itemId, notes

### Task: Create requirements version store (Step 4.1)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/requirements-store.ts (NEW)
- **Tests added/updated:**
  - packages/agent-core/src/requirements-store.test.ts (17 tests)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (17 pass)
- **Notes / blockers:**
  - RequirementsVersionStore interface: store(), get(), getLatest(), listVersions()
  - InMemoryRequirementsVersionStore with structuredClone for immutability
  - StoreBackedRequirementsProvider bridges store to RequirementsProvider interface
  - clear() method for test reset

### Task: Create RequirementsEngineerAgent contract (Step 4.2)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/contracts/requirements-engineer-agent.ts (NEW)
  - packages/agent-core/src/contracts/index.ts (MODIFIED)
- **Tests added/updated:**
  - packages/agent-core/src/contracts.test.ts (updated — 59 tests, was 49)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (59 pass)
- **Notes / blockers:**
  - agentId: requirements-engineer-agent, model: claude-3-sonnet, cost cap: £0.75
  - Agent count: 7 → 8
  - Capabilities: MoSCoW prioritization, change request incorporation, Strapi rubrics
  - Constraints: no gathering, no skipping assumptions, no overriding confirmed, read-only Strapi
  - Frameworks: market-awareness, offer-economics

### Task: Create RequirementsEngineerPlanner (Step 4.3)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/requirements-engineer-planner.ts (NEW)
- **Tests added/updated:**
  - packages/agent-core/src/requirements-engineer-planner.test.ts (16 tests)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (16 pass)
- **Notes / blockers:**
  - Follows BusinessArchitectPlanner pattern: Strapi check → rubric fetch → prompt build → LLM → validate
  - Returns STRAPI_UNAVAILABLE/STRAPI_FETCH_FAILED on Strapi issues
  - Validates against both AgentOutputSchema and direct RequirementsBundleSchema
  - createMockBundleOutput() helper for test consumers
  - Custom CapturingLLMAdapter and FailingLLMAdapter for test assertions

### Task: Create API routes for generate + confirm + auto-regen (Step 4.4)
- **Status:** DONE
- **Files touched:**
  - apps/api/src/routes/requirements-v2.ts (NEW)
  - apps/api/src/index.ts (MODIFIED — mounted requirementsV2Router)
- **Tests added/updated:**
  - apps/api/src/routes/requirements-v2.test.ts (19 tests)
- **Commands run:**
  - pnpm --filter @agency/api test (19 pass)
- **Notes / blockers:**
  - POST /:projectId/requirements/generate — generates v1 (or vN+1)
  - GET /:projectId/requirements/:versionId — returns specific version
  - GET /:projectId/requirements/latest — returns latest version
  - GET /:projectId/requirements — lists all versions
  - POST /:projectId/requirements/:versionId/confirm — persists decisions; auto-regenerates on rejection
  - Confirm logic: all ok → confirmed; any rejection → regenerating + new version stored

### Task: Add review handoff endpoints (Step 4.5)
- **Status:** DONE
- **Files touched:**
  - apps/api/src/routes/requirements-v2.ts (EXTENDED)
- **Tests added/updated:**
  - apps/api/src/routes/requirements-v2.test.ts (included in 19 tests)
- **Commands run:**
  - pnpm --filter @agency/api test (pass)
- **Notes / blockers:**
  - POST /:projectId/requirements/:versionId/review/suggest — APPROVED|NEEDS_CLARIFICATION|NOT_A_FIT
  - POST /:projectId/requirements/:versionId/review/decide — APPROVED|REJECTED + notes
  - NEEDS_CLARIFICATION includes clarificationTargets[] for targeted session

### Task: Create GHL milestone hooks (Step 4.6)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/requirements-hooks.ts (NEW)
- **Tests added/updated:**
  - packages/agent-core/src/requirements-hooks.test.ts (5 tests)
- **Commands run:**
  - pnpm --filter @agency/agent-core test (5 pass)
- **Notes / blockers:**
  - buildGenerateHooks: move_stage to 'Requirements Review'
  - buildReviewApprovedHooks: move_stage to 'Build Ready' + trigger_workflow for notification
  - All actions validate against GHLActionSchema

### Task: Wire store to BuildOrchestrator (Step 4.7)
- **Status:** DONE
- **Files touched:**
  - apps/api/src/routes/build.ts (MODIFIED)
- **Tests added/updated:**
  - apps/api/src/routes/build.test.ts (8 existing tests still pass)
- **Commands run:**
  - pnpm --filter @agency/api test (8 pass)
- **Notes / blockers:**
  - StoreBackedRequirementsProvider wraps shared requirementsVersionStore
  - Combined provider: tries store-backed first, falls back to legacy InMemoryRequirementsProvider
  - All 8 existing build tests still green

### Task: Exports, verification, and commit (Step 4.8)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/index.ts (MODIFIED — added all Step 4 exports)
  - progress/task-log.md, progress/decision-log.md
- **Tests added/updated:**
  - N/A (verification)
- **Commands run:**
  - pnpm test — 506 tests pass (333 agent-core + 73 api + 15 dashboard + 38 auth + 25 telemetry + 22 prompt-library)
  - pnpm lint — clean
  - pnpm typecheck — clean
- **Notes / blockers:**
  - Exported: RequirementSchema, AssumptionSchema, RequirementsBundleSchema, ConfirmPayloadSchema, ChangeRequestSchema, RequirementsVersionSchema
  - Exported: InMemoryRequirementsVersionStore, StoreBackedRequirementsProvider
  - Exported: RequirementsEngineerPlanner, createMockBundleOutput
  - Exported: buildGenerateHooks, buildReviewApprovedHooks
  - All 28 portal.test.ts tests still green (stubs untouched)
  - All 8 build.test.ts tests still green (updated integration)

---

## Step 4.5 REDO — DB-first Knowledge Base + MCP Tooling + Documentation Restructure

### Task: Remove ProposalStrategistAgent (Wave 1.1)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/contracts/proposal-strategist-agent.ts (DELETED)
  - packages/agent-core/src/contracts/index.ts (MODIFIED — removed all proposal-strategist exports, routing, caps, frameworks)
  - packages/agent-core/src/contracts.test.ts (MODIFIED — removed proposal-strategist tests, agent count 9 → 8, total 71 → 59)
  - packages/agent-core/src/knowledge-agent-integration.ts (MODIFIED — removed proposal-strategist, expanded to 8 agents)
  - packages/agent-core/src/knowledge-agent-integration.test.ts (REWRITTEN — 20 tests for 8-agent config)
  - packages/agent-core/src/knowledge-tool-telemetry.test.ts (MODIFIED — updated agentId)
  - packages/agent-core/src/index.ts (MODIFIED — removed proposal-strategist export, added getRejectedAssumptions)
  - docs/agents/proposal-strategist.md (DELETED)
  - docs/agents/index.md (MODIFIED — removed proposal-strategist row, updated KB access for all agents)
  - docs/agents/quality-control.md (MODIFIED — removed ProposalStrategist from inputs)
  - docs/agents/requirements-engineer.md (MODIFIED — removed Proposal Strategist from approval gates)
  - docs/architecture/system-overview.md (MODIFIED — removed all ProposalStrategist references, agent count 9 → 8)
- **Tests added/updated:**
  - contracts.test.ts — 59 tests (down from 71)
  - knowledge-agent-integration.test.ts — 20 tests (up from 8, fully rewritten)
- **Commands run:**
  - pnpm test — 575 tests pass
  - pnpm typecheck — clean
- **Notes / blockers:**
  - Agent count: 9 → 8
  - ProposalStrategistAgent removed entirely (Step 5 concern, not Step 4.5)
  - All historical task-log references preserved

### Task: Add knowledge_entries DB table (Wave 1.2)
- **Status:** DONE
- **Files touched:**
  - apps/api/src/db/schema.ts (MODIFIED — added knowledgeEntryTypeEnum, knowledgeEntrySourceEnum, knowledgeEntryStatusEnum, knowledgeEntries table, KnowledgeEntryRow/NewKnowledgeEntryRow types)
- **Tests added/updated:**
  - N/A (schema only, typecheck validates)
- **Commands run:**
  - pnpm typecheck — clean
- **Notes / blockers:**
  - Follows existing drizzle patterns (pgTable, pgEnum, uuid pk with defaultRandom, timestamp defaults)
  - References projects.id via foreign key
  - JSONB contentJson column

### Task: Add getRejectedAssumptions MCP tool (Wave 3.1)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/knowledge-tools.ts (MODIFIED — added getRejectedAssumptions, expanded registry to 6 tools)
  - packages/agent-core/src/knowledge-tools.test.ts (MODIFIED — added 2 tests for getRejectedAssumptions, registry count 5 → 6)
  - packages/agent-core/src/index.ts (MODIFIED — added getRejectedAssumptions export)
- **Tests added/updated:**
  - knowledge-tools.test.ts — 12 tests (up from 10)
- **Commands run:**
  - pnpm test — all pass
- **Notes / blockers:**
  - Requirements-engineer-agent exception: gets getRejectedAssumptions to iterate better
  - All other agents restricted to approved entries only
  - Registry now has 6 tools

### Task: Rewrite Agent-KB Integration for 8 agents (Wave 3.3)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/knowledge-agent-integration.ts (MODIFIED — new 8-agent access map, blocking logic for requirements-engineer and quality-control)
  - packages/agent-core/src/knowledge-agent-integration.test.ts (REWRITTEN — 20 tests)
- **Tests added/updated:**
  - knowledge-agent-integration.test.ts — 20 tests
- **Commands run:**
  - pnpm test — all pass
- **Notes / blockers:**
  - research-agent: [] (no KB — facts from external sources)
  - business-architect-agent: getDecisions, getDesignRules
  - requirements-engineer-agent: getApprovedRequirements, getRejectedAssumptions
  - strategy-funnel-agent: getDesignRules, getDecisions
  - copy-messaging-agent: getDesignRules
  - automation-crm-agent: getDesignRules
  - ux-design-agent: getDesignRules
  - quality-control-agent: all 5 approved tools
  - Agents with empty tool list always succeed with empty data
  - requirements-engineer + quality-control BLOCK when required tools return empty

### Task: Documentation restructure (Wave 4)
- **Status:** DONE
- **Files touched:**
  - docs/index.md (NEW — root navigation)
  - docs/archive/original-00-14-index.md (NEW — reference mapping)
  - docs/features/proposal-generation.md (REWRITTEN — now "Build Pipeline" without ProposalStrategist)
  - docs/knowledge/knowledge-base.md (REWRITTEN — DB-first, full schema, supersede behavior, design decisions)
  - docs/knowledge/mcp-tooling.md (REWRITTEN — 6 tools, 8-agent access matrix, getRejectedAssumptions exception)
  - docs/future-upgrades.md (MODIFIED — embeddings "optional accelerator — never source of truth", KB persistence marked DONE)
  - docs/architecture/system-overview.md (MODIFIED — agent count, flow, frameworks, routing, cost caps, test counts)
- **Tests added/updated:**
  - N/A (documentation only)
- **Commands run:**
  - N/A
- **Notes / blockers:**
  - All 8 agent docs verified: Purpose, Inputs, Outputs, Restrictions, Failure Modes, Approval Gates
  - All 4 feature docs verified: Trigger, Steps, Agents, Approval Points, Failure Handling
  - Knowledge docs explain truth, approval, access

### Task: Verification + logging (Wave 5)
- **Status:** DONE
- **Files touched:**
  - progress/task-log.md (MODIFIED — old Step 4.5 tasks marked SUPERSEDED, new tasks added)
  - progress/decision-log.md (MODIFIED — 5 new decisions)
- **Tests added/updated:**
  - N/A (verification)
- **Commands run:**
  - pnpm test — 575 tests pass (397 agent-core + 78 api + 15 dashboard + 38 auth + 25 telemetry + 22 prompt-library)
  - pnpm lint — clean
  - pnpm typecheck — clean
- **Notes / blockers:**
  - All proposal-strategist references removed (except historical task-log entries)
  - 6 MCP tools (5 approved + 1 rejected assumptions)
  - 8 agents with correct KB access
  - knowledge_entries drizzle table added
  - InMemoryKnowledgeStore kept for tests

---

## Step 5 – Proposal System (Strategist + UX Conversion + Review Gate)

### Task: Add proposal DB tables to drizzle schema
- **Status:** DONE
- **Files touched:**
  - apps/api/src/db/schema.ts (MODIFIED — added proposalStatusEnum, proposalReviewStatusEnum, proposalActionTypeEnum, proposalVersions, proposalReviews, proposalActions tables + type exports)
- **Tests added/updated:**
  - N/A (schema definition — tested via typecheck)
- **Commands run:**
  - pnpm typecheck — clean
- **Notes / blockers:**
  - 3 new tables, 3 new enums, 6 inferred type exports
  - Follows existing drizzle patterns (pgTable, pgEnum, uuid pk with defaultRandom)

### Task: Create proposal domain schemas (Zod)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/proposal-schemas.ts (CREATED)
- **Tests added/updated:**
  - packages/agent-core/src/proposal-schemas.test.ts (10 tests)
- **Commands run:**
  - pnpm test — agent-core 436 tests pass
  - pnpm typecheck — clean
- **Notes / blockers:**
  - ProposalJsonSchema with z.literal(true) compliance flags (scopeLocked, noInventedProof, noOutcomePromises)
  - ProposalUiSpecJsonSchema with ctaRequiresLogin: z.literal(true)
  - Strapi content schemas (pricing, templates, frameworks, timeline)
  - CRM action schemas (sent, approved)

### Task: Create ProposalStrategistAgent contract
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/contracts/proposal-strategist-agent.ts (CREATED)
  - packages/agent-core/src/contracts/index.ts (MODIFIED — added to ALL_AGENT_CONTRACTS, AGENT_MODEL_ROUTING, AGENT_COST_CAPS, AGENT_FRAMEWORK_REQUIREMENTS)
  - packages/agent-core/src/knowledge-agent-integration.ts (MODIFIED — added proposal-strategist to KB access)
  - packages/agent-core/src/knowledge-agent-integration.test.ts (MODIFIED — 9 agents, added proposal-strategist tests)
  - packages/agent-core/src/contracts.test.ts (MODIFIED — 9 agents, 10 new proposal-strategist tests)
- **Tests added/updated:**
  - packages/agent-core/src/contracts.test.ts (69 total, 10 new)
  - packages/agent-core/src/knowledge-agent-integration.test.ts (22 total, 2 new)
- **Commands run:**
  - pnpm test — agent-core 436 tests pass
  - pnpm typecheck — clean
- **Notes / blockers:**
  - 7 capabilities, 7 constraints (no scope changes, no pricing alteration, no invented proof)
  - KB access: getApprovedRequirements, getApprovedAssumptions
  - Model: claude-3-sonnet, cost cap: 0.75 GBP

### Task: Create proposal orchestrator
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/proposal-orchestrator.ts (CREATED)
  - packages/agent-core/src/proposal-mocks.ts (CREATED)
- **Tests added/updated:**
  - packages/agent-core/src/proposal-orchestrator.test.ts (17 tests)
- **Commands run:**
  - pnpm test — agent-core 436 tests pass
  - pnpm typecheck — clean
- **Notes / blockers:**
  - 3-step pipeline: ProposalStrategistAgent → UXDesignAgent (conversion) → QualityControlAgent
  - Governance gates (requirements exist, assumptions approved)
  - Strapi content loading with block-on-unavailable
  - Schema validation at each handoff
  - InMemoryProposalStore + InMemoryProposalStrapiProvider for tests
  - generatePublicId(), CRM action builders

### Task: Create proposal API routes
- **Status:** DONE
- **Files touched:**
  - apps/api/src/routes/proposals.ts (CREATED — 8 endpoints + public router)
  - apps/api/src/index.ts (MODIFIED — wired proposalRouter + publicProposalRouter)
- **Tests added/updated:**
  - apps/api/src/routes/proposals.test.ts (13 tests)
- **Commands run:**
  - pnpm test — 627 total tests pass (436 agent-core + 91 api + 15 dashboard + 38 auth + 25 telemetry + 22 prompt-library)
  - pnpm typecheck — clean
  - pnpm lint — clean (0 errors, 0 warnings after fixes)
- **Notes / blockers:**
  - Full lifecycle: generate → list → get → request-review → approve/request-changes → mark-sent → client approve
  - Public read-only endpoint: GET /api/p/:publicId (records VIEWED action)
  - CRM action contracts emitted (not executed) on SENT and APPROVED
  - Human review required before SENT
  - Client authentication required for approval

### Task: Update barrel exports
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/index.ts (MODIFIED — proposal schemas + orchestrator exports)
- **Tests added/updated:**
  - N/A (export wiring)
- **Commands run:**
  - pnpm typecheck — clean
  - pnpm build — clean (agent-core dist rebuilt)
- **Notes / blockers:**
  - 16 value exports, 17 type exports for proposal system

---

## Step 6.0.1 – Internal ProjectManagementAgent (Readiness, Orchestration, Ops Reporting)

### Task: Create PM domain schemas (Zod)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/pm-schemas.ts (CREATED)
- **Tests added/updated:**
  - packages/agent-core/src/pm-schemas.test.ts (17 tests)
- **Commands run:**
  - pnpm test — 17 schema tests pass
  - pnpm typecheck — clean
- **Notes / blockers:**
  - ProjectPhaseSchema (6 phases: INTAKE, CLARIFICATION, REQUIREMENTS, PROPOSAL, BUILD, SUPPORT)
  - ReadinessStatusSchema (4 statuses: READY, BLOCKED, NEEDS_HUMAN, NOT_APPLICABLE)
  - BlockerSchema with type, severity, message, optional references
  - GatesSchema (6 optional boolean gates)
  - ProjectReadinessReportSchema, ProjectOpsSummarySchema
  - Constraints: completion.percent 0-100, health.errorRate 0-1

### Task: Create PM engine (readiness, blockers, ops)
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/pm-engine.ts (CREATED)
- **Tests added/updated:**
  - packages/agent-core/src/pm-engine.test.ts (18 tests)
- **Commands run:**
  - pnpm test — 18 engine tests pass
  - pnpm typecheck — clean
- **Notes / blockers:**
  - PMDataProvider interface abstracts all store reads (KB, proposals, telemetry, events, budget)
  - PMEngine class: computeReadiness(), detectBlockers(), computeOpsSummary()
  - Phase-specific readiness: INTAKE always READY, PROPOSAL needs reqs+assumptions, BUILD needs proposal review
  - Blocker detection: MISSING_APPROVAL, BUDGET_EXCEEDED, REPEATED_FAILURE, STALE_QUEUE, INTEGRATION_DOWN
  - withPMMetrics() observability wrapper (timing + structured metrics)
  - NOT an LLM agent — deterministic computation engine

### Task: Create internal PM API routes + tests
- **Status:** DONE
- **Files touched:**
  - apps/api/src/routes/internal-pm.ts (CREATED)
  - apps/api/src/routes/internal-pm.test.ts (CREATED)
  - apps/api/src/index.ts (MODIFIED — wired internalPMRouter)
- **Tests added/updated:**
  - apps/api/src/routes/internal-pm.test.ts (9 tests)
- **Commands run:**
  - pnpm test — 100 API tests pass (9 new)
- **Notes / blockers:**
  - GET /:projectId/readiness?phase= — ProjectReadinessReport
  - GET /:projectId/ops?phase= — ProjectOpsSummary
  - GET /:projectId/blockers — Blocker[]
  - POST /:projectId/next-actions — NextAllowedAction[]
  - zValidator for phase parameter validation
  - PMDataProvider reads from InMemoryKnowledgeStore + InMemoryProposalStore
  - TODO: Apply createAuthMiddleware + isAgencyUser when auth is wired

### Task: Create ops dashboard page
- **Status:** DONE
- **Files touched:**
  - apps/dashboard/src/app/internal/projects/[id]/ops/page.tsx (CREATED)
- **Tests added/updated:**
  - N/A (UI page, API stubs tested separately)
- **Commands run:**
  - pnpm typecheck — clean
- **Notes / blockers:**
  - Client component with useEffect data fetching from internal PM API
  - Phase selector dropdown (6 phases)
  - Readiness badge (color-coded: green/red/amber/gray)
  - Gates checklist (✓/✗ per gate)
  - Blockers list (severity-colored left border)
  - Next actions (human/agent tagged with badge)
  - Costs section (total + last 24h)
  - Health section (queue depth, error rate, completion %)
  - Inline styles matching existing dashboard pattern

### Task: Update barrel exports + verification + logging
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/index.ts (MODIFIED — PM schemas + engine exports)
  - apps/api/src/routes/internal-pm.ts (MODIFIED — lint fixes)
  - progress/task-log.md (MODIFIED)
  - progress/decision-log.md (MODIFIED)
- **Tests added/updated:**
  - N/A (verification)
- **Commands run:**
  - pnpm test — 671 tests pass (471 agent-core + 100 api + 15 dashboard + 38 auth + 25 telemetry + 22 prompt-library)
  - pnpm lint — clean
  - pnpm typecheck — clean
- **Notes / blockers:**
  - 14 PM schema value exports, 15 PM schema type exports
  - PMEngine class, withPMMetrics, PMDataProvider, PMEngineConfig, PMComputeMetrics exports
  - Lint fixes: removed unused TEST_PROJECT_ID, prefixed unused _projectId param, destructured only result (not metrics)

---

## Docs Backfill (Phase A) — System Handbook + Feature Records + Enforcement

### Task: Create System Handbook and Feature Records with Documentation Enforcement
- **Status:** DONE
- **Files touched:**
  - docs/system-handbook.md (CREATED — authoritative behavioural source of truth)
  - docs/features/README.md (CREATED — feature record contract + template)
  - docs/features/requirements-and-assumptions.md (CREATED — full feature record)
  - docs/features/clarification-interview.md (UPDATED — expanded to full template format)
  - docs/features/proposal-generation.md (UPDATED — expanded to full template format)
  - CLAUDE.md (MODIFIED — added documentation enforcement section)
  - progress/task-log.md (MODIFIED)
  - progress/decision-log.md (MODIFIED)
- **Tests added/updated:**
  - N/A (documentation only, no runtime behaviour changes)
- **Commands run:**
  - pnpm lint
  - pnpm test (if doc tooling exists)
  - Verified all markdown files exist and are readable
- **Notes / blockers:**
  - System Handbook defines 9-stage journey, global rules, agent boundaries
  - Feature README establishes non-negotiable rule: no build/modify without feature record
  - Feature records updated to include: Purpose, Handbook Alignment, Trigger, Inputs, Outputs, Allowed Actions, Forbidden Actions, UI/UX Summary, Failure Modes, Escalation Rules, Cost Considerations, Logging & Audit
  - CLAUDE.md now enforces documentation gate before any feature work
  - Note: project-management-agent.md not created because no such agent exists (8 agents total: Research, StrategyFunnel, CopyMessaging, AutomationCRM, UXDesign, QualityControl, BusinessArchitect, RequirementsEngineer)

---

## Pipeline Router v2 — Consent-Driven Stage Mapping via PipelineActionContracts

### Task: Pipeline Router v2 — rewrite to consent-driven, idempotent, human-readable contracts
- **Status:** DONE
- **Files touched:**
  - packages/agent-core/src/pipeline/pipeline-events.ts (REWRITTEN — removed GateStateSnapshot, added eventId, relatedIds, MARK_LOST, REQUIREMENTS_CONFIRMED, ASSUMPTIONS_APPROVED_ALL)
  - packages/agent-core/src/pipeline/pipeline-router.ts (REWRITTEN — computePipelineAction returns single contract|null, STAGE_MAPPINGS table, humanReadableNote, internalReason, idempotencyKey)
  - packages/agent-core/src/pipeline/pipeline-contract-store.ts (REWRITTEN — PipelineContractStore with idempotency enforcement, status PENDING|APPLIED|REJECTED)
  - packages/agent-core/src/pipeline/index.ts (REWRITTEN — v2 exports)
  - packages/agent-core/src/index.ts (MODIFIED — v2 barrel exports)
  - apps/api/src/routes/crm-actions.ts (REWRITTEN — InMemoryPipelineContractStore, reject endpoint replaces mark-failed)
  - apps/api/src/routes/crm-actions.test.ts (REWRITTEN — 5 tests using computePipelineAction + pipelineContractStore)
  - apps/api/src/db/schema.ts (MODIFIED — pipeline_action_contracts table with idempotencyKey unique, humanReadableNote, internalReason jsonb, status PENDING|APPLIED|REJECTED)
  - apps/dashboard/src/app/internal/projects/[id]/crm-actions/page.tsx (REWRITTEN — PipelineContract interface, humanReadableNote, internalReason display)
  - docs/features/pipeline-router.md (REWRITTEN — v2 spec with stage mapping table, core rules, pilot vs production)
  - docs/system-handbook.md (MODIFIED — v2 stage mapping with human-readable notes, non-stage-moving events)
- **Tests added/updated:**
  - packages/agent-core/src/pipeline/pipeline-stages.test.ts (4 tests — unchanged)
  - packages/agent-core/src/pipeline/pipeline-events.test.ts (6 tests — v2 schema validation)
  - packages/agent-core/src/pipeline/pipeline-router.test.ts (21 tests — 8 stage moves, 3 non-stage-moving, 4 contract structure, 1 determinism, 1 full integration path, 1 idempotency, 3 negative)
  - packages/agent-core/src/pipeline/pipeline-contract-store.test.ts (11 tests — CRUD, idempotency, immutability, REJECTED status)
- **Commands run:**
  - pnpm test — 729 tests pass (510 agent-core + 119 api + 15 dashboard + 38 auth + 25 telemetry + 22 prompt-library)
  - pnpm lint — clean
  - pnpm typecheck — clean
- **Notes / blockers:**
  - Breaking changes from v1: removed GateStateSnapshot, removed gate-based blocking, removed ADD_NOTE/TRIGGER_WORKFLOW action types
  - computePipelineAction returns null for non-stage-moving events (SAFETY_CHECK_COMPLETED, REQUIREMENTS_CONFIRMED, ASSUMPTIONS_APPROVED_ALL)
  - Every contract includes humanReadableNote (client-facing), internalReason (eventType+eventId+relatedIds), idempotencyKey (eventId:MOVE_STAGE)
  - Store enforces idempotency — duplicate keys throw
  - Status lifecycle: PENDING → APPLIED | REJECTED (no FAILED)

---

## High-Level Flow Contract

### Task: Create High-Level Flow JSON contract and next-steps enforcement plan
- **Status:** DONE
- **Files touched:**
  - system/contracts/high_level_flow.json (CREATED — 9-stage human-centred flow contract)
  - system/docs/next-steps-flow-enforcement.md (CREATED — enforcement plan)
  - progress/task-log.md (MODIFIED)
  - progress/decision-log.md (MODIFIED)
- **Tests added/updated:**
  - N/A (documentation and contract only, no runtime changes)
- **Commands run:**
  - Verified JSON is well-formed
  - Verified folders and files exist
- **Notes / blockers:**
  - Contract defines 9 stages with human_experience, system_purpose, system_actions, and output per stage
  - Next-steps plan covers: prompt injection, stage gate validation, orchestrator alignment, audit, docs update
  - No runtime behaviour changed

---
