# Core Concepts

## Project

A Project represents one engagement (agency or client). Each project has:
- **Organisation** — agency or client org with role-based access
- **Budgets** — daily and monthly GBP limits enforced before every agent run
- **Enabled agents** — which of the 8 agents are active (empty = all)
- **Enabled actions** — which GHL actions are allowed (empty = all)
- **Rollout mode** — dry-run (log only) or live (execute GHL actions)
- **Allowlists** — permitted pipeline stages and workflow IDs

---

## Assumptions

Statements about the project that must be explicitly approved before work proceeds.

**Statuses:** PENDING → APPROVED | REJECTED

- No approved assumptions → no agent execution
- Rejected assumptions trigger requirements regeneration
- Tracked per-version alongside requirements
- Part of the ConfirmPayload sent from the dashboard

---

## Requirements

Structured deliverables derived from clarification facts via the RequirementsEngineerAgent.

**Key properties:**
- **Immutable versions** — v1, v2, v3... each version is a snapshot that cannot be mutated after storage
- **MoSCoW priority** — every requirement is MUST, SHOULD, or COULD
- **Category** — optional grouping (design, functionality, enhancement)
- **Confirmation state** — null (pending), true (confirmed), false (rejected with changeNote)

**Version lifecycle:**
```
pending_confirmation → confirmed (all ok)
pending_confirmation → regenerating (any rejection) → new version created
```

---

## Requirements Bundle

The LLM output from RequirementsEngineerPlanner containing:
- `requirements[]` — each with id, title, details, priority, category
- `assumptions[]` — each with id, statement, reason
- `openQuestions[]` — unresolved items for further clarification

Validated against `RequirementsBundleSchema` (requires min 1 requirement and min 1 assumption).

---

## Change Requests

When a prospect rejects requirements or assumptions during confirmation, the system builds `ChangeRequest` objects:
- `type` — requirement | assumption
- `itemId` — ID of the rejected item
- `notes` — the changeNote or rejection comment

These are passed to the RequirementsEngineerPlanner during auto-regeneration so the next version addresses the feedback.

---

## Facts Snapshot

The input to requirements generation, captured from clarification rounds:
- `summary[]` — plain-text summaries of what was learned
- `structuredAnswers[]` — key-value pairs from answered questions

Stored immutably on each RequirementsVersion for audit trail.

---

## Dry-Run vs Live

- **Dry-Run** — agent decisions logged, GHL actions recorded but not executed, telemetry still tracked
- **Live** — actions executed in GHL CRM (move stages, trigger workflows)

Controlled per-project via `ProjectConfig.dryRun`. Same webhook, same agents, different execution mode.

---

## Build Plan

The output of the BuildOrchestrator pipeline containing:
- **core** — confirmed deliverables (blueprint, UI spec, copy pack) with optional items stripped
- **optional** — enhancement proposals requiring separate approval
- **approvalsNeeded** — list of optional items with pending/approved/rejected status
- **qcReport** — quality control evaluation with pass/block decision

Mode B enforcement ensures optional items never leak into the core build.
