# System Architecture

## Repository Layout

```
agency-agents/
├── apps/
│   ├── api/             # Hono API server — orchestration, webhooks, routes
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── task.ts              # POST /api/run-task
│   │   │   │   ├── spend.ts            # GET /api/projects/:id/spend
│   │   │   │   ├── portal.ts           # Portal stubs (clarification, requirements, reviews)
│   │   │   │   ├── build.ts            # Build orchestrator endpoints
│   │   │   │   ├── project-config.ts   # Project config + GHL sync
│   │   │   │   └── requirements-v2.ts  # Requirements confirmation + auto-regen
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts             # Token verification + RBAC middleware
│   │   │   └── db/
│   │   │       └── schema.ts           # Drizzle schema (projects, orgs, users, events)
│   │
│   ├── cms/             # Strapi CMS — frameworks, agent configs, templates
│   │   └── src/api/     # Content types: Framework, AgentConfig, PromptTemplate
│   │
│   └── dashboard/       # Next.js — agency + client portal
│       └── src/
│           ├── app/
│           │   ├── login/              # Supabase magic link auth
│           │   ├── auth/callback/      # OAuth callback
│           │   └── projects/[id]/
│           │       ├── intake/         # Discovery form display
│           │       ├── clarification/  # Chat-like question flow
│           │       ├── requirements/   # Confirm/reject requirements + assumptions
│           │       ├── review/         # Review status + timeline
│           │       └── settings/       # Project config toggles
│           ├── components/
│           │   └── QuestionField.tsx    # 6-type input component
│           └── lib/supabase/           # Auth utilities (client, server, middleware)
│
├── packages/
│   ├── agent-core/      # Core intelligence layer
│   │   └── src/
│   │       ├── types.ts                # AgentOutput, AgentContract, LLMAdapter
│   │       ├── contracts/              # 8 agent contracts + registry
│   │       │   ├── index.ts            # ALL_AGENT_CONTRACTS, routing, cost caps
│   │       │   ├── research-agent.ts
│   │       │   ├── strategy-funnel-agent.ts
│   │       │   ├── copy-messaging-agent.ts
│   │       │   ├── automation-crm-agent.ts
│   │       │   ├── ux-design-agent.ts
│   │       │   ├── quality-control-agent.ts
│   │       │   ├── business-architect-agent.ts
│   │       │   └── requirements-engineer-agent.ts
│   │       ├── prompt-compiler.ts      # Prompt assembly from rules + contracts + frameworks
│   │       ├── llm-router.ts           # Multi-model routing with fallback
│   │       ├── agent-runner.ts         # Basic agent execution
│   │       ├── specialized-runner.ts   # Contract-enforced execution with QC
│   │       ├── build-orchestrator.ts   # 4-step build pipeline
│   │       ├── build-schemas.ts        # Blueprint, UXUISpec, CopyPack, BuildPlan
│   │       ├── build-mocks.ts          # Mock factories for build pipeline
│   │       ├── business-architect-planner.ts     # Clarification round orchestrator
│   │       ├── requirements-schemas.ts           # Requirement, Assumption, Bundle schemas
│   │       ├── requirements-store.ts             # Version store + provider bridge
│   │       ├── requirements-engineer-planner.ts  # Requirements generation orchestrator
│   │       ├── requirements-hooks.ts             # GHL milestone hooks
│   │       ├── event-bus.ts            # Event store + queue lifecycle
│   │       ├── event-worker.ts         # Event processor with retry + dead-letter
│   │       ├── ghl-actions.ts          # GHL action schemas + ActionExecutor
│   │       ├── execution-guard.ts      # Per-project agent/action guards
│   │       ├── project-config.ts       # ProjectConfig schema + allowlists
│   │       └── mock-llm.ts            # Deterministic mock LLM for tests
│   │
│   ├── auth/            # RBAC + multi-tenant package
│   │   └── src/
│   │       ├── types.ts               # Roles, AuthContext, Membership
│   │       └── rbac.ts               # canAccess*, canWrite*, isAgencyUser, buildAuthContext
│   │
│   ├── telemetry/       # Token + cost tracking
│   │   └── src/
│   │       ├── pricing.ts            # Model pricing (Claude, GPT-4, GPT-4o-mini)
│   │       ├── cost.ts              # estimateCost()
│   │       ├── record.ts            # recordTaskRun()
│   │       ├── spend.ts             # getProjectSpend()
│   │       ├── budget.ts            # budgetCheck()
│   │       └── store.ts             # InMemoryTelemetryStore
│   │
│   └── prompt-library/  # Reusable frameworks + global rules
│       └── src/
│           ├── global-rules.ts       # Universal agent rules
│           └── frameworks/
│               ├── offer-economics.ts   # Hormozi Value Equation
│               ├── market-awareness.ts  # Schwartz Awareness Levels
│               ├── persuasion.ts        # PAS/AIDA/Proof Hierarchy
│               └── funnel-design.ts     # UX/CTA rules
│
├── progress/            # Persistent memory (task-log, error-log, decision-log)
├── docs/                # System documentation
└── CLAUDE.md            # AI execution constitution
```

Sibling repos:
- `agency-questions` — known unknowns question bank
- `agency-skills` — future reusable runbooks

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
CRM Event → Webhook → Event Bus → Governance Check →
  → BusinessArchitect (clarification rounds) →
  → RequirementsEngineer (generate + confirm + auto-regen) →
  → BuildOrchestrator (Strategy → UX → Copy → QC) →
  → GHL Actions (move_stage / trigger_workflow) →
  → Telemetry + Portal
```

---

## Key Integration Points

- **GHL CRM** — webhooks in, stage moves + workflow triggers out
- **Strapi CMS** — framework templates, rubrics, agent configs (read-only from agents)
- **Supabase** — auth tokens, user management, session handling
- **LLM Providers** — Claude (Anthropic), GPT-4/GPT-4o-mini (OpenAI) via LLMAdapter interface
