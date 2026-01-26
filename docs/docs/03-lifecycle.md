# System Lifecycle

## Full Flow

```
1. Lead enters CRM (form, booking, etc.)
         │
2. GHL webhook fires
         │
3. Event ingested → Event Bus (idempotency check via payloadHash)
         │
4. Governance check (assumption gate, budget, execution guards)
         │
5. CLARIFICATION PHASE
   │  BusinessArchitectAgent runs clarification rounds
   │  ├── Round 1: intake data → Strapi templates → LLM → questions + readiness
   │  ├── Agency reviews DRAFT questions → approves/edits → APPROVED
   │  ├── Prospect answers APPROVED questions
   │  ├── Round 2+: prior answers → fewer questions → higher readiness
   │  └── Readiness: NEEDS_MORE_INFO → READY_FOR_REQUIREMENTS | BLOCKED
         │
6. REQUIREMENTS PHASE
   │  RequirementsEngineerAgent generates requirements from facts
   │  ├── Facts snapshot (summary + structured answers) → Strapi rubric → LLM
   │  ├── Output: RequirementsBundle (requirements with MoSCoW + assumptions)
   │  ├── Version stored as v1 with status: pending_confirmation
   │  ├── Prospect confirms/rejects each requirement and assumption
   │  ├── All confirmed → status: confirmed
   │  └── Any rejection → auto-regenerate v2 with change requests → repeat
         │
7. REVIEW HANDOFF
   │  ├── Agent suggests: APPROVED | NEEDS_CLARIFICATION | NOT_A_FIT
   │  ├── NEEDS_CLARIFICATION → targeted session with BusinessArchitectAgent
   │  └── Human decides: APPROVED → build ready | REJECTED → stopped
         │
8. BUILD PHASE
   │  BuildOrchestrator runs 4-step pipeline:
   │  ├── Step 1: StrategyFunnelAgent → MarketingBlueprint
   │  ├── Step 2: UXDesignAgent → UXUISpec
   │  ├── Step 3: CopyMessagingAgent → CopyPack
   │  ├── Step 4: QualityControlAgent → QCReport
   │  ├── Schema validation at every handoff
   │  ├── QC can block execution → { status: 'blocked', blockReason }
   │  └── assembleBuildPlan() → Mode B enforcement (core vs optional)
         │
9. GHL ACTIONS
   │  ActionExecutor runs with 5-level guard:
   │  ├── Action enabled? → Allowlisted? → Dry-run? → Idempotent? → Execute
   │  ├── move_stage: transition opportunity in pipeline
   │  └── trigger_workflow: add contact to notification workflow
         │
10. TELEMETRY recorded (tokens, cost, model, duration)
         │
11. PORTAL updated (dashboard reflects current state)
         │
12. GHL MILESTONE HOOKS fire (stage transitions + workflow triggers)
```

---

## Key Decision Points

| Point | Gate | Outcome on Failure |
|-------|------|--------------------|
| Event ingestion | Idempotency hash | Duplicate skipped |
| Before agent run | Assumption gate | Execution blocked |
| Before agent run | Budget check | Execution blocked |
| Before agent run | Execution guard | Agent disabled / dry-run logged |
| After LLM output | Schema validation | Invalid output rejected |
| After QC | Severity check | Critical/major → blocked |
| Before GHL action | Allowlist + idempotency | Action blocked or skipped |
| Requirements confirm | Rejection detected | Auto-regeneration triggered |
