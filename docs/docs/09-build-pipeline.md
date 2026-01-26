# Build Pipeline

The `BuildOrchestrator` coordinates a 4-step sequential agent pipeline that produces a validated `BuildPlan` with strict governance, schema validation at every handoff, and Mode B enforcement for optional enhancements.

---

## Pipeline Steps

```
Step 1: StrategyFunnelAgent    → MarketingBlueprint
Step 2: UXDesignAgent          → UXUISpec         (input: blueprint)
Step 3: CopyMessagingAgent     → CopyPack         (input: blueprint + uiSpec)
Step 4: QualityControlAgent    → QCReport         (input: all above)
         │
         └── assembleBuildPlan() → BuildPlan
```

Each step:
1. Receives accumulated context from prior steps
2. Executes via `SpecializedAgentRunner` with contract enforcement
3. Validates output against its Zod schema
4. Records telemetry (duration, tokens, cost, model)
5. Fails fast on validation errors

---

## Governance Gate

Before the pipeline starts, the orchestrator checks requirements:

```typescript
const reqs = await requirementsProvider.getRequirements(projectId, versionId);
if (!reqs.exists || !reqs.assumptionsApproved) {
  return { status: 'blocked', blockReason: '...' };
}
```

Both conditions must be true:
- Requirements version exists in the store
- All assumptions are approved

---

## Output Schemas

### MarketingBlueprint (Step 1)

```typescript
{
  goal: string;
  audience: string;
  funnelSteps: FunnelStep[];           // min 1
  sectionsNeeded: Record<string, string[]>;
  proofAssets: string[];
  successCriteria: string[];           // min 1
  optionalEnhancements: Enhancement[];
}
```

Each `FunnelStep` includes: stepId, name, funnelPosition (tofu/mofu/bofu), awarenessLevel (1-5), goal, contentType, cta.

### UXUISpec (Step 2)

```typescript
{
  routes: string[];                    // min 1
  screens: Screen[];                   // min 1
  states: ScreenState[];
  accessibility: AccessibilityRule[];
  optionalDesigns: OptionalDesign[];
}
```

Each `Screen` includes: screenId, route, name, layoutBlocks, components, slots.
Each `Component` includes: componentId, type, props, slots.
Accessibility rules specify WCAG level (A/AA/AAA).

### CopyPack (Step 3)

```typescript
{
  screens: ScreenCopy[];               // min 1
  optionalCopy: OptionalCopy[];
}
```

Each `ScreenCopy` maps slotId + componentId to copy text.

### QCReport (Step 4)

```typescript
{
  approved: boolean;
  violations: Violation[];
  blockReason?: string;
}
```

Each violation has severity: `critical` | `major` | `minor` | `suggestion`.
Critical or major violations → `approved: false` → pipeline blocked.

---

## Mode B Enforcement

The `assembleBuildPlan()` function separates core deliverables from optional enhancements:

### Core (always delivered)
- Blueprint with optional enhancements stripped
- UI spec with optional designs stripped
- Copy pack with optional copy stripped
- Build tasks generated from core screens only

### Optional (requires separate approval)
- Enhancement proposals from the blueprint
- Optional screen designs from the UI spec
- Optional copy from the copy pack

### Approvals

```typescript
approvalsNeeded: Array<{
  enhancementId: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
}>
```

Optional items never leak into the core build. Each must be explicitly approved before inclusion.

---

## BuildPlan Structure

```typescript
{
  projectId: string;
  requirementsVersion: string;
  status: 'draft' | 'approved' | 'in-progress' | 'completed';
  core: {
    blueprint: MarketingBlueprint;
    uiSpec: UXUISpec;
    copyPack: CopyPack;
  };
  optional: {
    enhancements: Enhancement[];
    designs: OptionalDesign[];
    copy: OptionalCopy[];
  };
  tasks: BuildTask[];                  // min 1
  approvalsNeeded: Approval[];
  qcReport?: QCReport;
  telemetry: TelemetryEntry[];
}
```

### BuildTask

```typescript
{
  taskId: string;
  title: string;
  description: string;
  type: 'page' | 'component' | 'integration' | 'content' | 'test';
  acceptanceCriteria: string[];        // min 1
  testNotes: string[];
  dependencies: string[];
}
```

---

## Telemetry

Each pipeline step produces a `TelemetryEntry`:

```typescript
{
  step: 'marketing' | 'ux-design' | 'copy' | 'qc';
  agentId: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  model: string;
}
```

All entries are collected into `buildPlan.telemetry` for cost analysis.

---

## Error Handling

| Scenario | Result |
|----------|--------|
| Requirements missing | `{ status: 'blocked', blockReason }` |
| Assumptions not approved | `{ status: 'blocked', blockReason }` |
| Schema validation fails | `{ status: 'error', error }` |
| QC rejects output | `{ status: 'blocked', blockReason }` |
| LLM failure | `{ status: 'error', error }` |

The pipeline fails fast — no partial results are returned on error.
