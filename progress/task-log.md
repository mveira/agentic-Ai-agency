# Task Log

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

---
