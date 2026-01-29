# Next Steps: Enforcing the High-Level Flow Contract

This document describes what must happen to make `system/contracts/high_level_flow.json` the authoritative runtime reference for agent orchestration and workflow progression.

**No runtime changes have been made yet.** This is a plan only.

---

## Status

| Step | Status |
|------|--------|
| Flow contract created | DONE |
| Next-steps plan written | DONE |
| Agent prompt injection | TODO |
| Stage gate validation | TODO |
| Orchestrator alignment | TODO |
| Audit & observability | TODO |

---

## 1. Inject Flow Contract into Agent Prompts

**Goal:** Every agent knows which stage it operates in and what it is allowed to do.

- Load `high_level_flow.json` at prompt compile time
- For each agent, inject only the stages it is responsible for
- Include `system_purpose`, `system_actions`, and `output` as prompt context
- Include the `principle` as a global preamble

**Files likely affected:**
- `packages/agent-core/src/prompt-compiler.ts`
- `packages/agent-core/src/contracts/*.ts` (add `flow_stages` field to contracts)

---

## 2. Add Stage Gate Validation

**Goal:** No stage transition happens without the prior stage's output being confirmed.

- Before entering Stage N, verify Stage N-1 `output` exists and is valid
- Map each stage `output` to a concrete data check (e.g., Stage 6 output = confirmed requirements in KB)
- Block progression if the check fails; log the block reason

**Files likely affected:**
- `packages/agent-core/src/build-orchestrator.ts`
- `packages/agent-core/src/business-architect-planner.ts`
- `packages/agent-core/src/requirements-engineer-planner.ts`
- New file: `packages/agent-core/src/flow-gate.ts` (stage gate checker)

---

## 3. Align Orchestrators with Flow Stages

**Goal:** Existing orchestrators explicitly reference flow stages rather than implicit sequencing.

- `BusinessArchitectPlanner` → Stages 4-5 (Understanding & Clarification, Guided Follow-Up)
- `RequirementsEngineerPlanner` → Stage 6 (Reflection & Assumption Confirmation)
- `BuildOrchestrator` → Stage 7 (Solution Design)
- QC step → Stage 8 (Second Opinion & Quality Review)
- CRM actions → Stage 9 (Next-Step Advancement)
- Stages 1-3 (Intent Recognition, Acknowledgement, Safety Check) → Event Bus + Governance layer

Each orchestrator should log the stage it is executing against.

---

## 4. Audit & Observability

**Goal:** Every stage transition is logged with the flow contract stage reference.

- Add `flow_stage` field to telemetry entries and event logs
- Log stage entry, stage exit, and stage blocks
- Surface stage progression in the ops dashboard

**Files likely affected:**
- `packages/telemetry/src/record.ts`
- `packages/agent-core/src/event-bus.ts`
- `apps/dashboard/src/app/internal/projects/[id]/ops/page.tsx`

---

## 5. Update Documentation

When enforcement is built, update:
- `docs/system-handbook.md` — align the 9-stage journey to match the contract exactly
- `docs/features/*.md` — add `flow_stage` references to each feature record
- `CLAUDE.md` — add rule: "Read `system/contracts/high_level_flow.json` before modifying orchestration"

---

## Execution Order

1. Agent prompt injection (lowest risk, highest clarity gain)
2. Orchestrator alignment (label existing code with stages)
3. Stage gate validation (enforce progression rules)
4. Audit & observability (track stage transitions)
5. Documentation update (align all docs to contract)

Each step should be a separate segment with its own tests and commit.
