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
