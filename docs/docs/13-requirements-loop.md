# Requirements & Assumptions Loop

The requirements system generates structured deliverables from clarification facts, supports prospect confirmation via Yes/No decisions, auto-regenerates immutable versions on rejection, and provides review handoff with agent suggestion + human decision.

---

## Flow

```
Facts Snapshot (from clarification)
  │
  ├── RequirementsEngineerPlanner.generate()
  │     ├── Strapi check → rubric fetch → prompt build → LLM call → validate
  │     └── Output: RequirementsBundle
  │
  ├── Store as v1 (status: pending_confirmation)
  │
  ├── Prospect confirms each requirement + assumption
  │     ├── All confirmed → status: confirmed
  │     └── Any rejection → build ChangeRequests → auto-regenerate v2
  │           └── v2 stored as pending_confirmation → repeat
  │
  ├── Review Handoff
  │     ├── Agent suggests: APPROVED | NEEDS_CLARIFICATION | NOT_A_FIT
  │     ├── NEEDS_CLARIFICATION → targeted session with BusinessArchitectAgent
  │     └── Human decides: APPROVED → build ready | REJECTED → stopped
  │
  └── GHL Milestone Hooks fire on key transitions
```

---

## Requirements Bundle

The LLM output from `RequirementsEngineerPlanner`:

```typescript
{
  requirements: [                     // min 1
    {
      id: string;
      title: string;
      details: string;
      priority: 'MUST' | 'SHOULD' | 'COULD';   // MoSCoW
      category?: string;                          // design, functionality, enhancement
    }
  ],
  assumptions: [                      // min 1
    {
      id: string;
      statement: string;
      reason: string;
    }
  ],
  openQuestions?: [                   // unresolved items
    {
      id: string;
      question: string;
      context: string;
    }
  ]
}
```

Validated against `RequirementsBundleSchema` (requires min 1 requirement and min 1 assumption).

---

## Version Store

### Immutable Versions

Each version is a snapshot that cannot be mutated after storage:

```typescript
interface RequirementsVersion {
  versionId: string;
  projectId: string;
  versionNumber: number;              // v1, v2, v3...
  status: 'pending_confirmation' | 'confirmed' | 'regenerating';
  requirements: RequirementWithConfirmation[];
  assumptions: AssumptionWithStatus[];
  factsSnapshot: FactsSnapshot;       // input that generated this version
  changeRequests: ChangeRequest[];    // feedback that triggered this version
  createdAt: string;
}
```

`InMemoryRequirementsVersionStore` uses `structuredClone` on both store and retrieval to guarantee immutability.

### Store Interface

```typescript
interface RequirementsVersionStore {
  store(version: RequirementsVersion): Promise<RequirementsVersion>;
  get(versionId: string): Promise<RequirementsVersion | null>;
  getLatest(projectId: string): Promise<RequirementsVersion | null>;
  listVersions(projectId: string): Promise<RequirementsVersion[]>;
}
```

### StoreBackedRequirementsProvider

Bridges the version store to the `RequirementsProvider` interface used by `BuildOrchestrator`:

```typescript
{
  exists: boolean;              // version found and status === 'confirmed'
  assumptionsApproved: boolean; // all assumptions have status 'approved'
}
```

---

## Confirmation

### Confirm Payload

```typescript
{
  requirements: [
    { id: string, confirmed: boolean, changeNote?: string }
  ],
  assumptions: [
    { id: string, status: 'approved' | 'rejected', comment?: string }
  ]
}
```

### Confirmation Logic

1. Load version from store → 404 if not found
2. Reject if already confirmed → 409
3. Apply decisions to each requirement and assumption
4. If all confirmed → `status: 'confirmed'`, store updated version
5. If any rejection:
   - Set `status: 'regenerating'`
   - Build `ChangeRequest[]` from rejected items
   - Call `RequirementsEngineerPlanner.generate()` with change requests + prior version
   - Store new version as `pending_confirmation` with incremented version number
   - Return `newVersionId` in response

### Change Requests

```typescript
interface ChangeRequest {
  type: 'requirement' | 'assumption';
  itemId: string;
  notes: string;                      // changeNote or rejection comment
}
```

Passed to the planner during regeneration so the next version addresses the feedback.

---

## Facts Snapshot

The input to requirements generation, captured from clarification rounds:

```typescript
interface FactsSnapshot {
  summary: string[];                  // plain-text summaries
  structuredAnswers: Array<{
    key: string;
    value: string | string[] | number;
  }>;
}
```

Stored immutably on each version for audit trail.

---

## Review Handoff

### Agent Suggestion

```
POST /api/projects/:projectId/requirements/:versionId/review/suggest
```

Returns one of:
- `APPROVED` — requirements are complete and ready for build
- `NEEDS_CLARIFICATION` — includes `clarificationTargets[]` for a targeted BusinessArchitectAgent session
- `NOT_A_FIT` — project should not proceed

### Human Decision

```
POST /api/projects/:projectId/requirements/:versionId/review/decide
```

Body: `{ decision: 'APPROVED' | 'REJECTED', notes?: string }`

- `APPROVED` → status set to `build_ready`
- `REJECTED` → status set to `rejected`

---

## GHL Milestone Hooks

| Event | Hook | Actions |
|-------|------|---------|
| Requirements generated | `buildGenerateHooks()` | `move_stage` → Requirements Review |
| Review approved | `buildReviewApprovedHooks()` | `move_stage` → Build Ready + `trigger_workflow` notification |

Actions are valid `GHLAction` entries executable through `ActionExecutor`.

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/projects/:id/requirements/generate` | Generate v1 (or vN+1) from facts |
| GET | `/api/projects/:id/requirements/latest` | Get latest version |
| GET | `/api/projects/:id/requirements` | List all versions |
| GET | `/api/projects/:id/requirements/:versionId` | Get specific version |
| POST | `/api/projects/:id/requirements/:versionId/confirm` | Confirm/reject with auto-regen |
| POST | `/api/projects/:id/requirements/:versionId/review/suggest` | Agent review suggestion |
| POST | `/api/projects/:id/requirements/:versionId/review/decide` | Human final decision |
