# Decision Log

Segment: Week 1 – Foundation

---

## 2026-01-25

### Decision: Use pnpm workspaces for monorepo
- **Reason:** Native workspace support, efficient disk usage via hard links, strict dependency resolution
- **Alternatives considered:**
  - npm workspaces (less mature tooling)
  - yarn workspaces (extra dependency)
  - turborepo (adds complexity for initial scaffold)

### Decision: TypeScript strict mode everywhere
- **Reason:** Catches errors at compile time, better IDE support, self-documenting code
- **Alternatives considered:**
  - JavaScript with JSDoc (less type safety)
  - Partial TypeScript (inconsistent)

### Decision: Vitest over Jest for unit tests
- **Reason:** Native ESM support, faster execution, compatible with Vite ecosystem
- **Alternatives considered:**
  - Jest (slower, ESM issues)
  - Mocha (more configuration needed)

## Decision: Week 2 Completion

Decision:
Week 2 (Governance & Assumptions) is complete and approved.

Reason:
All dependency requirements for controlled agent execution have been met.

Impact:
- Agents may execute subject to assumption gate
- Week 3 (Agents & Intelligence) unblocked

Date:
[Today's date]

### Decision: Parallel rollout via project-level execution guards (Week 4.1)
- **Reason:** Agency and client CRMs need to run the same agents with different execution behavior for safe parallel rollout
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

### Decision: Add TDD guardrails (Week 3.1)
- **Reason:** Prevent TDD discipline from drifting over time by enforcing process through tooling
- **Implementation:**
  - Task template in task-log.md requires 'Tests added/updated' and 'Commands run' before marking DONE
  - CI workflow (.github/workflows/ci.yml) runs lint, typecheck, and test on every push/PR
- **Benefits:**
  - Automated enforcement catches regressions immediately
  - Template ensures documentation of testing steps
  - CI provides consistent verification across all contributors
- **Alternatives considered:**
  - Pre-commit hooks (can be bypassed locally)
  - Manual code review only (error-prone, not scalable)

---
