# API Reference

All endpoints are served by the Hono API server at `apps/api/`. Authentication is via Bearer token in the `Authorization` header.

---

## Task Execution

### POST /api/run-task

Execute an agent task with orchestration, budget enforcement, and telemetry.

**Request:**
```json
{
  "projectId": "uuid",
  "taskId": "string",
  "taskType": "string",
  "prompt": "string",
  "agent": {
    "agentId": "string",
    "name": "string",
    "description": "string",
    "capabilities": ["string"],
    "constraints": ["string"],
    "maxOutputTokens": 4096
  },
  "frameworks": ["string"],
  "context": {},
  "budget": {
    "dailyBudgetGbp": 10.0,
    "monthlyBudgetGbp": 100.0
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "output": {},
  "telemetry": {}
}
```

**Error (400/500):**
```json
{
  "success": false,
  "error": "Budget exceeded"
}
```

---

## Spend

### GET /api/projects/:projectId/spend

Get spend summary for a project.

**Response (200):**
```json
{
  "projectId": "uuid",
  "daily": { "spend": 0.45, "currency": "GBP" },
  "monthly": { "spend": 12.30, "currency": "GBP" },
  "total": { "spend": 48.75, "currency": "GBP" },
  "taskCount": 156
}
```

---

## Project Configuration

### GET /api/projects/:id/config

Get project configuration including dry-run mode, enabled agents/actions, and allowlists.

**Response (200):**
```json
{
  "projectId": "uuid",
  "dryRun": false,
  "enabledAgents": [],
  "enabledActions": [],
  "allowlists": {
    "pipelineStages": [{ "pipelineId": "p1", "stageId": "s1" }],
    "workflowIds": ["wf-1"]
  }
}
```

### PUT /api/projects/:id/config

Update project configuration.

**Request:** Same shape as GET response.

### POST /api/projects/:id/sync/pipelines

Fetch pipeline and stage IDs from GHL and store locally.

### POST /api/projects/:id/sync/workflows

Store workflow IDs for the project.

---

## Clarification (Portal)

### GET /api/projects/:id/intakes/:leadIntakeId

Get lead intake data with fields.

**Response (200):**
```json
{
  "intake": {
    "id": "string",
    "projectId": "uuid",
    "source": "form",
    "submittedAt": "ISO date",
    "fields": [{ "key": "name", "label": "Name", "value": "John" }],
    "status": "received"
  }
}
```

### GET /api/clarification/sessions/:sessionId

Get clarification session (prospect-facing — shows only APPROVED questions).

**Response (200):**
```json
{
  "session": {
    "id": "string",
    "projectId": "uuid",
    "status": "in_progress",
    "questions": [],
    "understanding": null
  }
}
```

### POST /api/clarification/sessions/:sessionId/answers

Submit answers to clarification questions.

**Request:**
```json
{
  "answers": [
    { "questionId": "q1", "value": "Answer text" }
  ]
}
```

**Response (200):**
```json
{
  "understanding": {
    "summary": ["Key insight 1"],
    "confidence": 0.7,
    "answeredCount": 3,
    "totalCount": 5
  }
}
```

### POST /api/clarification/sessions/:sessionId/plan-next

Run BusinessArchitectAgent to generate next round of questions.

**Response (200):**
```json
{
  "readiness": "NEEDS_MORE_INFO",
  "proposedQuestions": [],
  "round": 2
}
```

Questions are stored as DRAFT (not visible to prospects until approved).

### POST /api/clarification/sessions/:sessionId/approve-questions

Agency approval gate — move questions from DRAFT to APPROVED.

**Request:**
```json
{
  "approvals": [
    { "questionId": "q1", "approved": true },
    { "questionId": "q2", "approved": true, "editedText": "Revised question?" }
  ],
  "removals": ["q3"]
}
```

---

## Requirements

### POST /api/projects/:projectId/requirements/generate

Generate requirements from facts snapshot.

**Request:**
```json
{
  "factsSnapshot": {
    "summary": ["Key fact 1", "Key fact 2"],
    "structuredAnswers": [
      { "key": "budget", "value": "5000" }
    ]
  }
}
```

**Response (200):**
```json
{
  "versionId": "uuid",
  "versionNumber": 1,
  "status": "pending_confirmation"
}
```

### GET /api/projects/:projectId/requirements/latest

Get the latest requirements version for a project.

### GET /api/projects/:projectId/requirements

List all requirements versions for a project.

### GET /api/projects/:projectId/requirements/:versionId

Get a specific requirements version.

### POST /api/projects/:projectId/requirements/:versionId/confirm

Confirm or reject requirements and assumptions. Auto-regenerates on rejection.

**Request:**
```json
{
  "requirements": [
    { "id": "r1", "confirmed": true },
    { "id": "r2", "confirmed": false, "changeNote": "Needs more detail" }
  ],
  "assumptions": [
    { "id": "a1", "status": "approved" },
    { "id": "a2", "status": "rejected", "comment": "Not accurate" }
  ]
}
```

**Response (200) — all confirmed:**
```json
{
  "status": "confirmed",
  "versionId": "uuid"
}
```

**Response (200) — any rejection:**
```json
{
  "status": "regenerating",
  "versionId": "uuid",
  "newVersionId": "uuid-v2",
  "newVersionNumber": 2
}
```

**Error (409):** Version already confirmed.

### POST /api/projects/:projectId/requirements/:versionId/review/suggest

Get agent review suggestion.

**Response (200):**
```json
{
  "suggestion": "APPROVED",
  "reasoning": "All requirements are well-defined...",
  "clarificationTargets": []
}
```

### POST /api/projects/:projectId/requirements/:versionId/review/decide

Human final review decision.

**Request:**
```json
{
  "decision": "APPROVED",
  "notes": "Looks good, proceed to build"
}
```

---

## Build Pipeline

### POST /api/projects/:id/build/plan

Execute the full 4-step build pipeline.

**Request:**
```json
{
  "requirementsVersionId": "uuid",
  "buildRequest": {
    "type": "landing-page",
    "goal": "Generate leads for consulting service",
    "constraints": {}
  }
}
```

**Response (200):**
```json
{
  "status": "success",
  "buildPlan": {
    "projectId": "uuid",
    "requirementsVersion": "uuid",
    "status": "draft",
    "core": { "blueprint": {}, "uiSpec": {}, "copyPack": {} },
    "optional": { "enhancements": [], "designs": [], "copy": [] },
    "tasks": [],
    "approvalsNeeded": [],
    "qcReport": {},
    "telemetry": []
  }
}
```

**Response (blocked):**
```json
{
  "status": "blocked",
  "blockReason": "Requirements not found or assumptions not approved"
}
```

### POST /api/projects/:id/build/approve-enhancement

Approve or reject an optional enhancement.

**Request:**
```json
{
  "enhancementId": "e1",
  "approved": true
}
```

---

## Existing Portal Stubs

The following endpoints exist in `portal.ts` as stubs (in-memory stores):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/requirements/:versionId` | Legacy requirements get |
| POST | `/api/requirements/:versionId/confirm` | Legacy confirmation |
| GET | `/api/reviews/:versionId` | Review status |

These are maintained for backward compatibility. The `requirements-v2` routes are the canonical implementation.
