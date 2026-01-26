# Agency AI Operating System — System Overview

## What This System Is

An AI-powered operating layer for agencies to manage client onboarding, strategy, delivery, and CRM automation in a controlled, auditable, and cost-aware way.

It embeds intelligence directly into CRM workflows while enforcing governance, approvals, and budget constraints across 8 specialised agents, a 4-step build pipeline, and a full requirements confirmation loop with auto-regeneration.

This is not a chatbot.
This is not prompt automation.
This is a governed execution system.

---

## Core Problems It Solves

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

- **Governance before execution** — assumption gate, requirements confirmation, and QC validation must pass before any action
- **No assumptions without approval** — every assumption is explicitly tracked and approved/rejected
- **Versioned requirements** — immutable versions (v1, v2, v3...) with auto-regeneration on rejection
- **Test-driven development** — 506+ tests, CI enforcement, no task marked DONE without tests
- **Token and cost awareness** — per-agent cost caps, per-project budgets, model routing for cost optimisation
- **Parallel rollout** — agency CRM live, client CRM dry-run, same codebase
- **Small, auditable steps** — Ralph loop: pick → implement → test → log → commit → stop
- **Agent separation** — 8 agents with strict non-overlapping responsibilities
- **Framework injection** — Hormozi, Schwartz, PAS/AIDA frameworks injected per agent contract

---

## Who This Is For

- **The agency** — internal operations, live CRM execution, full control
- **Client businesses** — via their CRM in dry-run mode initially, graduated to live
- **AI agents** — operating under strict contracts with capabilities and constraints

---

## What's Built

| System | Status | Tests |
|--------|--------|-------|
| 8 Agent Contracts | Done | 59 |
| Prompt Compiler + Framework Injection | Done | 9 |
| LLM Router (multi-model) | Done | 15 |
| Build Orchestrator (4-step pipeline) | Done | 20 |
| Event Bus + Worker | Done | 29 |
| GHL Actions + ActionExecutor | Done | 28 |
| Execution Guards | Done | 15 |
| Auth + RBAC + Multi-Tenant | Done | 38 |
| Business Architect + Clarification Rounds | Done | 35 |
| Requirements + Auto-Regeneration | Done | 90 |
| Telemetry / Cost Tracking | Done | 25 |
| Portal UI + QuestionField | Done | 15 |
| Prompt Library + Frameworks | Done | 22 |
| **Total** | | **506** |
