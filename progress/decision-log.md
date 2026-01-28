# Decision Log

## Decision Template

Use this format for all architectural and technical decisions:

```
### Decision: [Brief title]
- **Date:** YYYY-MM-DD
- **Context:** [Why this decision was needed]
- **Decision:** [What was decided]
- **Reason:** [Rationale behind the decision]
- **Alternatives considered:**
  - [Option 1 - why rejected]
  - [Option 2 - why rejected]
- **Impact:**
  - [Effect 1]
  - [Effect 2]
- **Status:** Proposed | Approved | Superseded
```

---

## Step 4.5 REDO — DB-first Knowledge Base + MCP Tooling

### Decision: DB-first knowledge base (knowledge_entries drizzle table)
- **Date:** 2026-01-27
- **Context:** Knowledge base needed structured persistence matching the existing drizzle pattern
- **Decision:** Add knowledge_entries table to drizzle schema with pgEnum types for entry type, source, and status. InMemoryKnowledgeStore kept for tests.
- **Reason:** Consistent with existing DB patterns (events, taskRuns); provides real persistence path; in-memory store sufficient for test isolation
- **Alternatives considered:**
  - Embeddings/vector DB (premature, not needed for structured queries)
  - JSON file storage (not suitable for production, no concurrent access)
- **Impact:**
  - knowledge_entries table with uuid pk, project FK, type/source/status enums, JSONB content
  - InMemoryKnowledgeStore unchanged for test compatibility
- **Status:** Approved

### Decision: MCP-style tool access (6 tools, all read-only)
- **Date:** 2026-01-27
- **Context:** Agents need controlled, read-only access to KB data through a standardized interface
- **Decision:** 6 MCP-style tools (getApprovedRequirements, getApprovedAssumptions, getDecisions, getDesignRules, getReviews, getRejectedAssumptions). Token-efficient payloads. Pre-load pattern via loadKBForAgent().
- **Reason:** Stateless pure functions are easy to test; pre-load keeps agents focused; registry enables programmatic lookup
- **Alternatives considered:**
  - Full MCP protocol (overkill for internal use)
  - Direct store queries by agents (breaks encapsulation, harder to control access)
- **Impact:**
  - All 8 agents have declared tool access lists
  - Agents cannot bypass the tool layer to query the store directly
  - Token-efficient payloads minimize context window usage
- **Status:** Approved

### Decision: Embeddings deferred (optional accelerator, never source of truth)
- **Date:** 2026-01-27
- **Context:** Vector search could enhance KB queries but is not needed for the current structured query pattern
- **Decision:** Defer embeddings/vector search as PLANNED future upgrade. Structured queries remain the authoritative access path. Embeddings will never replace structured queries as source of truth.
- **Reason:** Structured queries are deterministic and auditable; embeddings add complexity and non-determinism; current use cases don't require semantic search
- **Alternatives considered:**
  - Implement embeddings now (premature, adds pgvector dependency)
  - Never implement embeddings (too restrictive for future)
- **Impact:**
  - future-upgrades.md updated with explicit "optional accelerator — never source of truth" note
  - No vector DB dependency added
- **Status:** Approved

### Decision: Remove ProposalStrategistAgent (Step 5 concern)
- **Date:** 2026-01-27
- **Context:** ProposalStrategistAgent was added in Step 4.5 but properly belongs in Step 5. Its presence in the KB layer added unnecessary complexity.
- **Decision:** Remove ProposalStrategistAgent entirely from contracts, index, tests, docs, and KB integration. Agent count: 9 → 8.
- **Reason:** Step 4.5 is about KB infrastructure, not proposal generation. The agent will be re-introduced in Step 5 if needed.
- **Alternatives considered:**
  - Keep the agent (adds maintenance burden, confuses layer boundaries)
  - Move to separate file (still present in the wrong step)
- **Impact:**
  - All 9-agent references updated to 8
  - All contract, test, and doc references removed
  - Historical task-log entries preserved
- **Status:** Approved

### Decision: Requirements-engineer exception for rejected assumptions
- **Date:** 2026-01-27
- **Context:** Requirements-engineer-agent needs to understand why previous assumptions were rejected to iterate effectively on requirement versions
- **Decision:** Grant requirements-engineer-agent access to getRejectedAssumptions as an exception to the "approved entries only" rule. All other agents restricted to approved entries only.
- **Reason:** Without rejected assumption context, the requirements-engineer would regenerate the same flawed requirements. This exception is narrowly scoped and explicitly documented.
- **Alternatives considered:**
  - No exception (requirements-engineer iterates blind, lower quality)
  - All agents get rejected access (too broad, violates least-privilege)
  - Pass rejection reasons via input params (adds coupling, harder to trace)
- **Impact:**
  - requirements-engineer-agent: getApprovedRequirements + getRejectedAssumptions
  - All other agents: approved entries only
  - getRejectedAssumptions tool added to KB_TOOL_REGISTRY (6 tools total)
- **Status:** Approved

---

## Step 4 – Requirements + Assumptions Loop

### Decision: New route file for project-scoped requirements endpoints
- **Date:** 2026-01-26
- **Context:** Requirements V2 endpoints need project-scoped routes; existing portal.ts stubs should remain untouched
- **Decision:** Create apps/api/src/routes/requirements-v2.ts for project-scoped endpoints; keep existing portal.ts stubs for backward compatibility
- **Reason:** Avoids breaking existing dashboard integration; clean separation of new logic from legacy stubs
- **Alternatives considered:**
  - Modify portal.ts directly (risk breaking 28 existing tests, mixing concerns)
  - Create a middleware wrapper (unnecessary complexity)
- **Impact:**
  - Portal stubs untouched, all 28 portal tests still green
  - New router mounted at /api/projects with requirements sub-routes
- **Status:** Approved

### Decision: InMemoryRequirementsVersionStore with structuredClone immutability
- **Date:** 2026-01-26
- **Context:** Requirements versions must be immutable once stored; mutations should not affect stored data
- **Decision:** Use structuredClone on store and retrieval to ensure immutability
- **Reason:** Consistent with existing InMemoryEventStore pattern; prevents accidental mutation bugs in tests and production
- **Alternatives considered:**
  - Deep freeze (breaks mutations entirely, harder to work with)
  - No cloning (allows mutation bugs, inconsistent with persistence semantics)
- **Impact:**
  - Stored versions cannot be mutated after storage
  - Each get() returns a fresh copy safe to modify
- **Status:** Approved

### Decision: Combined RequirementsProvider for backward compatibility
- **Date:** 2026-01-26
- **Context:** build.ts uses InMemoryRequirementsProvider with pre-populated test data; new store-backed provider needs to coexist
- **Decision:** Combined provider tries StoreBackedRequirementsProvider first, falls back to legacy InMemoryRequirementsProvider
- **Reason:** Zero disruption to existing build tests; gradual migration path
- **Alternatives considered:**
  - Replace entirely (breaks 8 existing build tests)
  - Dual registration (more complex, same effect)
- **Impact:**
  - All 8 build tests still pass unchanged
  - New requirements versions automatically available to BuildOrchestrator
- **Status:** Approved

### Decision: Synchronous auto-regeneration on rejection
- **Date:** 2026-01-26
- **Context:** When prospect rejects requirements/assumptions, a new version must be generated
- **Decision:** Confirm endpoint calls planner inline (synchronously); async via event bus can be added later
- **Reason:** Simplicity for MVP; mock LLM makes this fast in tests; production can switch to async without API contract change
- **Alternatives considered:**
  - Async regeneration via event bus (premature complexity)
  - Client polling (worse UX, more API calls)
- **Impact:**
  - Confirm endpoint returns newVersionId immediately when rejections exist
  - Production can add async via event bus later without breaking API contract
- **Status:** Approved

---

## BusinessArchitectAgent — Clarification Rounds

### Decision: StrapiProvider interface with InMemory test implementation
- **Date:** 2026-01-26
- **Context:** BusinessArchitectAgent needs to read templates from Strapi CMS but must not be tightly coupled to it
- **Decision:** Define StrapiProvider interface (available(), fetchTemplates()) with InMemoryStrapiProvider for tests; agent blocks with logged reason if Strapi is required but unavailable
- **Reason:** Consistent with existing adapter/interface patterns (GHLAdapter, TokenVerifier, EventStore); enables full testing without Strapi running
- **Alternatives considered:**
  - Direct Strapi API calls (untestable, tightly coupled)
  - Skip Strapi integration (loses template reuse capability)
- **Impact:**
  - Agent tests run without any CMS dependency
  - Production implementation plugs in via interface
  - Blocking behavior is explicit and logged
- **Status:** Approved

### Decision: Agency approval gate for planned questions
- **Date:** 2026-01-26
- **Context:** Agent-generated questions need human review before being shown to clients
- **Decision:** Add POST approve-questions endpoint as agency review gate; agency can remove, edit, or reject entire question batches
- **Reason:** Prevents low-quality or off-brand questions from reaching clients; maintains agency control over client experience
- **Alternatives considered:**
  - Auto-publish questions (risky, no human review)
  - QC agent review only (insufficient for brand/tone control)
- **Impact:**
  - Questions only reach clients after agency approval
  - Agency can remove specific questions or edit text/helpText
  - Rejected batches trigger re-planning
- **Status:** Approved

### Decision: Readiness enum replacing numeric score
- **Date:** 2026-01-26
- **Context:** Original readiness was a 0–1 float which was ambiguous and hard to use in decision logic
- **Decision:** Replace readiness with string enum: NEEDS_MORE_INFO | READY_FOR_REQUIREMENTS | BLOCKED
- **Reason:** Discrete states are unambiguous, enable clean branching logic, and align with the actual decision points in the clarification flow
- **Alternatives considered:**
  - Keep numeric 0–1 with thresholds (ambiguous, hard to maintain threshold values)
  - Ordinal integers 0/1/2 (less readable, no semantic meaning)
- **Impact:**
  - All schemas, API responses, and tests updated to use enum
  - Dashboard can switch on exact values instead of threshold comparisons
  - Breaking change from earlier stub API (tests updated)
- **Status:** Approved

### Decision: DRAFT/APPROVED lifecycle for agent-planned questions
- **Date:** 2026-01-26
- **Context:** plan-next generates questions but they must not reach prospects without agency review
- **Decision:** Implement SessionQuestionStore with DRAFT → APPROVED lifecycle; prospect-facing GET only returns APPROVED questions
- **Reason:** Strict separation ensures no unreviewed questions leak to clients; agency maintains full editorial control
- **Alternatives considered:**
  - Flag-based visibility on question objects (harder to enforce, easy to forget)
  - Separate approved-questions endpoint (more API surface, same behavior)
- **Impact:**
  - plan-next stores DRAFT (invisible to prospects)
  - approve-questions promotes to APPROVED (visible to prospects)
  - Agency can remove/edit during approval
  - Answers endpoint validates against base + APPROVED questions only
- **Status:** Approved

---

## Portal UX — Hybrid Clarification Flow

### Decision: JSON contract-driven UI with no embedded business logic
- **Date:** 2026-01-26
- **Context:** Portal pages need to render questions, requirements, and review status driven by API data
- **Decision:** All UI components render strictly from typed JSON contracts; form controls selected by inputType discriminator; no business logic in components
- **Reason:** Clean separation enables independent testing of API contracts and UI rendering; components are reusable; logic changes only affect API
- **Alternatives considered:**
  - Embedded logic in components (harder to test, tightly coupled)
  - Server-side form rendering (less interactive, worse UX for interview flow)
- **Impact:**
  - QuestionField renders 6 input types from single schema
  - Pages fetch from API stubs and render from JSON
  - Swapping stubs for real API requires zero UI changes
- **Status:** Approved

---

## Event Bus A – DB-backed Queue + Worker

### Decision: Interface-based EventStore for testability
- **Date:** 2026-01-26
- **Context:** Event bus needs DB persistence but tests must run without a real database
- **Decision:** Define EventStore interface with InMemoryEventStore for tests, same pattern as TelemetryStore and GHLAdapter
- **Reason:** Consistent with existing adapter/interface patterns; enables full unit testing; swappable to Drizzle-backed implementation for production
- **Alternatives considered:**
  - Direct Drizzle queries in event functions (untestable without DB)
  - SQLite in-memory for tests (extra dependency, slower)
- **Impact:**
  - 29 tests run without any database
  - Production implementation plugs in via interface
  - Worker, publisher, and handlers fully tested in isolation
- **Status:** Approved

### Decision: Custom event bus over pg-boss
- **Date:** 2026-01-26
- **Context:** Need reliable event processing with retries and dead-letter; pg-boss is a mature option but adds a dependency
- **Decision:** Build custom event bus with EventStore interface, matching the exact schema and lifecycle needed
- **Reason:** Full control over schema, no external dependency, matches existing codebase patterns, educational value for understanding queue internals
- **Alternatives considered:**
  - pg-boss (mature but opinionated, adds dependency, less control over schema)
  - BullMQ + Redis (requires Redis infrastructure)
- **Impact:**
  - Zero new dependencies
  - Full lifecycle: PENDING → PROCESSING → DONE/FAILED/DEAD_LETTERED
  - Exponential backoff with configurable maxAttempts
  - Idempotency via payloadHash unique constraint
- **Status:** Approved

---

## Week 5 – BuildOrchestrator Pipeline

### Decision: RequirementsProvider interface for governance gate
- **Date:** 2026-01-26
- **Context:** Assumption gate module from Week 2 is referenced in logs but the BuildOrchestrator needs a swappable way to check requirements and assumption approval
- **Decision:** Define RequirementsProvider interface + InMemoryRequirementsProvider for tests, swappable to DB-backed later
- **Reason:** Decouples orchestrator from specific storage; enables full unit testing; consistent with existing adapter patterns (GHLAdapter, TokenVerifier)
- **Alternatives considered:**
  - Direct DB queries (tight coupling, untestable)
  - Importing assumption-gate module directly (not found in source tree, may have been restructured)
- **Impact:**
  - Governance gate enforced before pipeline execution
  - Easy to swap to DB-backed provider in production
- **Status:** Approved

### Decision: Orchestrator manages QC as dedicated final step
- **Date:** 2026-01-26
- **Context:** SpecializedAgentRunner already has QC enforcement for strategy/copy agents, but BuildOrchestrator needs QC across ALL agent outputs as a final review
- **Decision:** Use skipQC: true on all pipeline steps; orchestrator runs quality-control-agent as the 4th and final step
- **Reason:** Avoids duplicate QC runs; allows QC to review the full combined output (blueprint + UI spec + copy pack) rather than individual agent outputs
- **Alternatives considered:**
  - Per-agent QC via enforceQC: true (redundant, can't review cross-agent consistency)
  - No QC (violates governance requirements)
- **Impact:**
  - Single QC pass reviewing all pipeline outputs
  - QC blocking returns { status: 'blocked', blockReason }
  - Telemetry includes QC step duration and cost
- **Status:** Approved

### Decision: DB-backed queue before cloud message broker
- **Date:** 2026-01-26
- **Context:** Current execution is in-memory; need eventing/queue for scaling but SQS/Redis adds infrastructure complexity too early
- **Decision:** Document DB-backed queue (pg-boss or custom) as first upgrade path; SQS/Redis as future step after DB queue proves bottleneck
- **Reason:** DB queue requires no new infrastructure (already have Postgres), simpler ops, sufficient for initial scaling needs
- **Alternatives considered:**
  - Jump straight to SQS (premature infrastructure, adds AWS dependency before needed)
  - Redis Streams (additional service to manage, overkill for current throughput)
  - Keep in-memory (blocks horizontal scaling entirely)
- **Impact:**
  - Clear upgrade path documented in docs/future-upgrades.md
  - No premature infrastructure investment
  - Horizontal scaling unblocked once DB queue is implemented
- **Status:** Approved

### Decision: Mode B enforcement in assembleBuildPlan
- **Date:** 2026-01-26
- **Context:** Optional enhancements, designs, and copy must not leak into the core build plan
- **Decision:** assembleBuildPlan() strips all optional content from core sections and places them in buildPlan.optional with approvalsNeeded tracking
- **Reason:** Strict separation ensures core deliverables are never blocked by optional approval status; clients can approve/reject enhancements independently
- **Alternatives considered:**
  - Mixed core/optional with flags (harder to enforce, risk of accidental inclusion)
  - Separate build plans for core vs optional (complex, harder to track)
- **Impact:**
  - core.blueprint.optionalEnhancements always empty
  - core.copyPack.optionalCopy always empty
  - core.uiSpec.optionalDesigns always empty
  - All optional items in buildPlan.optional with pending approval status
- **Status:** Approved

---

## Week 4.0 – Auth + Multi-Tenant + Cloud Baseline

### Decision: Server-enforced tenancy over Row Level Security
- **Date:** 2026-01-26
- **Context:** Need multi-tenant isolation for agency and client data
- **Decision:** Use server-enforced tenancy via middleware RBAC checks instead of Postgres RLS
- **Reason:** More testable, portable, and explicit; RLS adds complexity with ORM and testing
- **Alternatives considered:**
  - Postgres RLS (database-level, harder to test, ORM compatibility issues)
  - Schema-per-tenant (too many schemas, complex migrations)
- **Impact:**
  - All authorization checked in API middleware before data access
  - Auth middleware injects AuthContext into every request
  - Project access verified via org membership
  - Easy to test with mock verifier/loader interfaces
- **Status:** Approved

### Decision: Supabase magic link for authentication
- **Date:** 2026-01-26
- **Context:** Need passwordless authentication for agency and client users
- **Decision:** Use Supabase Auth with magic link (email OTP)
- **Reason:** Zero-friction onboarding, no password management, built-in JWT tokens
- **Alternatives considered:**
  - Password-based auth (friction, security burden)
  - OAuth providers only (not all clients have Google/GitHub)
  - Custom JWT (reinventing the wheel)
- **Impact:**
  - Users sign in via email link
  - Supabase handles JWT token lifecycle
  - API verifies tokens via JWT secret or Supabase client
  - Dashboard uses @supabase/ssr for cookie-based sessions
- **Status:** Approved

### Decision: Interface-based auth middleware for testability
- **Date:** 2026-01-26
- **Context:** API auth middleware needs to verify tokens and load user data, but shouldn't be tightly coupled to Supabase
- **Decision:** Define TokenVerifier, MembershipLoader, and ProjectLoader interfaces; inject implementations
- **Reason:** Enables full unit testing with mocks, supports swapping auth providers, clean separation of concerns
- **Alternatives considered:**
  - Direct Supabase calls in middleware (untestable, tightly coupled)
  - Middleware that skips auth in test mode (security risk, incomplete testing)
- **Impact:**
  - 17 auth middleware tests running against mock implementations
  - Real Supabase implementation plugged in when deployed
  - Easy to swap auth provider without changing middleware logic
- **Status:** Approved

---

## Week 4.2 – GHL Actions: Move Stage + Trigger Workflow

### Decision: GHL action executor with allowlists and idempotency
- **Date:** 2026-01-25
- **Context:** Need safe, controlled execution of GHL side effects (pipeline moves, workflow triggers) with zero client risk
- **Decision:** Implement GHL action executor with allowlists and idempotency checks
- **Reason:** Prevent accidental GHL writes, ensure same webhook can behave differently per project, enable safe parallel rollout
- **Implementation:**
  - Discriminated union schema for GHL actions (move_stage, trigger_workflow)
  - GHLAdapter interface for testability (mock for tests, real for production)
  - ActionExecutor enforces: action enablement → allowlist → dryRun → idempotency → execute
  - payloadHash prevents duplicate executions
  - ProjectConfig extended with allowlists (pipelineStages, workflowIds)
  - API endpoints for config management and pipeline/workflow sync
- **Alternatives considered:**
  - Direct GHL API calls without executor (no safety layer)
  - Queue-based execution (adds infrastructure complexity at this stage)
- **Impact:**
  - Same webhook produces different behavior per project
  - Client projects log intended actions; agency projects execute them
  - Unknown stages/workflows are blocked before reaching GHL API
- **Status:** Approved

### Decision: Defer sales/demo docs and pricing work
- **Date:** 2026-01-25
- **Context:** Sales materials and pricing tiers need to be created but technical execution is priority
- **Decision:** Defer sales/demo documentation and pricing work to later phase
- **Reason:** Sales materials and pricing tiers will be generated by agents after the system execution phase stabilizes
- **Alternatives considered:**
  - Manual creation now (time-consuming, premature)
  - External copywriter (expensive, not using our own system)
- **Impact:**
  - Tasks queued for later execution
  - Resume technical execution immediately (Week 4.2)
  - Agents will dogfood their own capabilities to create materials
- **Status:** Approved

---

## Week 4.1 – Parallel Rollout Controls

### Decision: Parallel rollout via project-level execution guards
- **Date:** 2026-01-25
- **Context:** Agency and client CRMs need to run the same agents with different execution behavior for safe parallel rollout
- **Decision:** Implement project-level execution guards with dryRun and enablement flags
- **Reason:** Allows same codebase to serve both agency (live) and client (safe) environments without separate deployments
- **Implementation:**
  - ProjectConfig with dryRun, enabledAgents, enabledActions flags
  - Execution guard checks before agent execution and action execution
  - Empty arrays = no filter (all allowed); populated arrays = allowlist
  - Telemetry-ready log format with blockedReason field
- **Alternatives considered:**
  - Environment variables (not per-project, inflexible)
  - Separate agent deployments per client (expensive, hard to maintain)
  - Feature flags service (external dependency, overkill at this stage)
- **Impact:**
  - Client projects in dryRun log all intended actions but never write to GHL
  - Agents can be enabled/disabled per project without code changes
  - Zero client risk during parallel rollout
- **Status:** Approved

---

## Week 3.1 – TDD Guardrails

### Decision: Add TDD guardrails with task template and CI
- **Date:** 2026-01-25
- **Context:** Need to prevent TDD discipline from drifting over time
- **Decision:** Enforce TDD through task template requirements and CI automation
- **Reason:** Automated enforcement catches regressions immediately and ensures consistent testing practices
- **Implementation:**
  - Task template in task-log.md requires 'Tests added/updated' and 'Commands run' before marking DONE
  - CI workflow (.github/workflows/ci.yml) runs lint, typecheck, and test on every push/PR
  - Template ensures documentation of testing steps
- **Alternatives considered:**
  - Pre-commit hooks (can be bypassed locally)
  - Manual code review only (error-prone, not scalable)
- **Benefits:**
  - CI provides consistent verification across all contributors
  - Template creates accountability and documentation
  - Automated process prevents shortcuts
- **Status:** Approved

---

## Week 2 – Governance & Assumptions

### Decision: Week 2 completion and approval
- **Date:** 2026-01-25
- **Context:** All Week 2 deliverables (Governance & Assumptions) have been implemented and tested
- **Decision:** Approve Week 2 as complete and unblock Week 3
- **Reason:** All dependency requirements for controlled agent execution have been met
- **Implementation:**
  - Assumption gate system implemented
  - Requirements generation from assumptions working
  - Task blocking when assumptions pending verified
  - All governance controls tested
- **Impact:**
  - Agents may execute subject to assumption gate
  - Week 3 (Agents & Intelligence) unblocked
  - Safe foundation for agent operations established
- **Status:** Approved

---

## Week 1 – Foundation

### Decision: Use pnpm workspaces for monorepo
- **Date:** 2026-01-25
- **Context:** Need efficient monorepo management for multiple apps and packages
- **Decision:** Use pnpm workspaces as monorepo solution
- **Reason:** Native workspace support, efficient disk usage via hard links, strict dependency resolution
- **Alternatives considered:**
  - npm workspaces (less mature tooling)
  - yarn workspaces (extra dependency)
  - turborepo (adds complexity for initial scaffold)
- **Impact:**
  - Reduced disk usage through hard links
  - Faster installation times
  - Strict dependency resolution prevents version conflicts
- **Status:** Approved

### Decision: TypeScript strict mode everywhere
- **Date:** 2026-01-25
- **Context:** Need type safety and code quality across all packages
- **Decision:** Enable TypeScript strict mode in all packages
- **Reason:** Catches errors at compile time, better IDE support, self-documenting code
- **Alternatives considered:**
  - JavaScript with JSDoc (less type safety)
  - Partial TypeScript (inconsistent experience)
- **Impact:**
  - Higher initial development time
  - Fewer runtime errors
  - Better developer experience with autocomplete
  - Easier refactoring
- **Status:** Approved

### Decision: Vitest over Jest for unit tests
- **Date:** 2026-01-25
- **Context:** Need fast, reliable testing framework with ESM support
- **Decision:** Use Vitest as primary testing framework
- **Reason:** Native ESM support, faster execution, compatible with Vite ecosystem
- **Alternatives considered:**
  - Jest (slower, ESM issues)
  - Mocha (more configuration needed)
- **Impact:**
  - Faster test execution
  - Better ESM compatibility
  - Simpler configuration
  - Compatible with future Vite adoption
- **Status:** Approved

---

## Step 5 – Proposal System

### Decision: Reintroduce ProposalStrategistAgent in Step 5
- **Date:** 2026-01-27
- **Context:** Step 4.5 REDO removed ProposalStrategistAgent. Step 5 spec requires it for proposal generation.
- **Decision:** Add ProposalStrategistAgent as the 9th agent with strict scope-locking constraints
- **Reason:** Spec mandates a dedicated agent to assemble scope-locked proposals from approved requirements with Strapi content
- **Alternatives considered:**
  - Reuse BusinessArchitectAgent for proposals (rejected — different responsibility, would violate non-overlapping agent rule)
  - Generate proposals without an agent (rejected — need LLM-driven pricing recommendation and persuasion)
- **Impact:**
  - Agent count: 8 → 9
  - New contract with 7 capabilities and 7 constraints
  - KB access: getApprovedRequirements, getApprovedAssumptions
- **Status:** Approved

### Decision: 3-step proposal pipeline (Strategist → UX → QC)
- **Date:** 2026-01-27
- **Context:** Proposals need content generation, conversion-focused UI, and validation
- **Decision:** ProposalOrchestrator runs 3-step pipeline using SpecializedAgentRunner
- **Reason:** Mirrors BuildOrchestrator pattern; separation of concerns (content vs. layout vs. validation); QC as final gate
- **Alternatives considered:**
  - Single agent generates both content and UI spec (rejected — violates non-overlapping agent rule)
  - QC runs in parallel with UX (rejected — QC needs the complete proposal including UI spec)
- **Impact:**
  - Schema validation at each handoff (ProposalJsonSchema, ProposalUiSpecJsonSchema)
  - QC can BLOCK proposals with compliance violations
  - Telemetry recorded per step
- **Status:** Approved

### Decision: CRM emit-only pattern for proposal lifecycle
- **Date:** 2026-01-27
- **Context:** Spec requires CRM actions on SENT and APPROVED but forbids direct GHL calls
- **Decision:** Build CRM action contracts (ProposalCRMSentAction, ProposalCRMApprovedAction) and return them from API endpoints; do not execute
- **Reason:** Follows existing GHL action pattern (emit contracts, never execute directly); enables downstream event processing
- **Alternatives considered:**
  - Direct GHL API calls from routes (rejected — violates spec "No direct GHL calls" rule)
  - Event bus integration (deferred — emit contracts now, wire to event bus later)
- **Impact:**
  - SENT emits move_stage 'Proposal sent' + tags
  - APPROVED emits move_stage 'Won' + trigger_workflow
  - No runtime GHL dependency
- **Status:** Approved

### Decision: Compliance flags as z.literal(true)
- **Date:** 2026-01-27
- **Context:** Proposals must guarantee scopeLocked, noInventedProof, noOutcomePromises
- **Decision:** Use z.literal(true) for all three compliance flags in ProposalJsonSchema
- **Reason:** Schema-level enforcement — a proposal cannot exist without all three flags being true. This is stronger than z.boolean() which would allow false.
- **Alternatives considered:**
  - z.boolean() with runtime validation (rejected — weaker guarantee, allows invalid states)
  - Separate compliance check step (rejected — unnecessary when schema can enforce it)
- **Impact:**
  - Any proposal with false compliance flags fails schema validation
  - Agent output is guaranteed compliant if it parses
- **Status:** Approved

### Decision: PM agent is internal-only, deterministic, and read-only
- **Date:** 2026-01-27
- **Context:** Step 6.0.1 requires internal project management capabilities for readiness, blockers, and ops reporting
- **Decision:** Implement as a pure computation engine (PMEngine class), not an LLM agent. No agent contract, no LLM calls. Deterministic JSON outputs from stored state only.
- **Reason:** PM logic is deterministic gate-checking and metric computation — no creative output needed. Using an LLM would add cost, latency, and non-determinism without benefit.
- **Alternatives considered:**
  - LLM-powered agent with contract (rejected — adds cost and non-determinism for purely computational logic)
  - Inline logic in API routes (rejected — untestable, not reusable)
- **Impact:**
  - PMEngine is a pure class with PMDataProvider dependency injection
  - All computations are deterministic from stored state
  - withPMMetrics() wrapper provides observability without OTel dependency
  - No agent contract exists; PM engine is infrastructure, not an agent
- **Status:** Approved

### Decision: PMDataProvider interface for store abstraction
- **Date:** 2026-01-27
- **Context:** PM engine needs data from KB, proposals, telemetry, events, and budget stores
- **Decision:** Define PMDataProvider interface with 10 methods covering all required data access. In-memory mock provider for routes/tests; production will use DB-backed implementation.
- **Reason:** Consistent with existing adapter/interface patterns (GHLAdapter, TokenVerifier, EventStore). Enables full testing without any database.
- **Alternatives considered:**
  - Direct store queries in PM engine (tight coupling, harder to test)
  - Pass individual stores to PM engine (too many constructor params, leaky abstraction)
- **Impact:**
  - Single interface abstracts all PM data needs
  - Mock provider returns safe defaults (budget not configured, no task runs, healthy integrations)
  - Production swaps to DB-backed provider without changing PM engine logic
- **Status:** Approved

### Decision: Human review required before proposal can be SENT
- **Date:** 2026-01-27
- **Context:** Spec mandates human review gate before proposals reach clients
- **Decision:** mark-sent endpoint checks latest review status === APPROVED; returns 400 otherwise
- **Reason:** Governance requirement — automated proposals must be human-reviewed before client delivery
- **Alternatives considered:**
  - Auto-send after QC passes (rejected — violates spec "Human review REQUIRED before proposal can be sent")
  - Require multiple reviewers (deferred — single reviewer sufficient for MVP)
- **Impact:**
  - Lifecycle: DRAFT → IN_REVIEW → (review approve) → mark-sent → SENT
  - Cannot skip review step
- **Status:** Approved

---

## Docs Backfill (Phase A) — Documentation Governance

### Decision: System Handbook is the behavioural source of truth
- **Date:** 2026-01-28
- **Context:** Documentation was scattered across architecture docs, agent docs, and inline comments. No single authoritative reference for system behaviour.
- **Decision:** Create `docs/system-handbook.md` as the authoritative behavioural source of truth. It defines the 9-stage journey, global rules, agent boundaries, cost caps, and escalation protocols.
- **Reason:** Agents and developers need a single reference for expected behaviour. Conflicts between code and docs should trigger escalation, not silent deviation.
- **Alternatives considered:**
  - Keep behaviour implicit in code (rejected — not auditable, hard to onboard)
  - Use CLAUDE.md as sole source of truth (rejected — CLAUDE.md is for Claude execution rules, not system behaviour)
- **Impact:**
  - Single source of truth for all behavioural questions
  - All behaviour changes must update handbook first
  - Conflicts between code and handbook trigger STOP + escalate
- **Status:** Approved

### Decision: Feature Records are mandatory for builds/modifications
- **Date:** 2026-01-28
- **Context:** Features were documented inconsistently, with some having basic docs and others having none. No contract for what a feature doc must contain.
- **Decision:** Create `docs/features/README.md` with a mandatory template. All features must have a record before build or modification. Template includes: Purpose, Handbook Alignment, Trigger, Inputs, Outputs, Allowed Actions, Forbidden Actions, UI/UX Summary, Failure Modes, Escalation Rules, Cost Considerations, Logging & Audit.
- **Reason:** Ensures every feature has traceable governance, clear boundaries, and documented failure handling before implementation.
- **Alternatives considered:**
  - Optional documentation (rejected — leads to inconsistency)
  - Minimal docs without template (rejected — loses value of structured contracts)
- **Impact:**
  - No feature work proceeds without a feature record
  - Phase A (high-level) records acceptable for first drafts
  - Existing feature docs updated to match template
- **Status:** Approved

### Decision: CLAUDE.md enforces documentation gate
- **Date:** 2026-01-28
- **Context:** Documentation rules existed but were not enforced in the Claude execution constitution.
- **Decision:** Add "DOCUMENTATION IS A RULE (NON-NEGOTIABLE)" section to CLAUDE.md requiring: read handbook before acting, read feature record, create if missing, update docs before changing behaviour.
- **Reason:** Makes documentation a hard gate that cannot be bypassed during AI-assisted development.
- **Alternatives considered:**
  - Soft reminder in docs only (rejected — would be ignored)
  - Lint/CI enforcement (deferred — current focus is on constitution-level rules)
- **Impact:**
  - Claude must read docs before any feature work
  - Missing feature records trigger STOP + create
  - Behaviour changes require doc updates first
  - Violation is a task failure
- **Status:** Approved

---
