# System Handbook — Agency AI OS

This is the authoritative behavioural source of truth for the Agency AI Operating System. All agents, developers, and automation must follow this handbook. If behaviour conflicts with this document, STOP and escalate.

---

## Purpose and Core Principle

**Think with the client.**

The Agency AI OS is a governed AI execution system that embeds intelligence into CRM workflows while enforcing approvals, budget constraints, and auditability. It is not a chatbot. It is not prompt automation. It is a human-centred system where every decision involves the client and agency at appropriate checkpoints.

---

## Global Rules (Non-Negotiable)

### 1. No Silent Progression
No stage may advance without explicit approval from the appropriate party (agency or prospect). Silent automation is forbidden.

### 2. Max Clarification Rounds
Default: 3 rounds. If readiness is not achieved after 3 rounds, escalate to human review. This can be configured per-project but never bypassed silently.

### 3. Assumptions Must Be Explicit and Approved
- Every assumption is tracked with status: `pending`, `approved`, or `rejected`
- No agent execution proceeds without approved assumptions
- Rejected assumptions trigger requirements regeneration

### 4. Consent Gates
The following are mandatory approval points:
- **Requirements Lock**: The prospect must confirm requirements before build proceeds
- **Proposal Approval**: Optional enhancements require separate client approval
- **CRM Advancement**: Stage moves require prior governance checks

### 5. QC Can Block Progression
The QualityControlAgent can block any build pipeline step if violations are found. QC blocking is not overridable without human intervention.

### 6. Cost Discipline
- Per-agent cost caps are enforced (model downgrade if exceeded)
- Per-project daily/monthly budgets are checked before every run
- Telemetry records all token usage and costs
- Escalate on budget risk — do not silently proceed

---

## The 9-Stage Journey

The Agency AI OS guides projects through a human-centred flow. Each stage has explicit entry and exit criteria.

### Stage 1: Lead Capture
**Trigger**: Lead enters CRM via form or booking
**Behaviour**: GHL webhook fires; event is ingested into the Event Bus with idempotency checks
**Exit**: Event is queued for processing

### Stage 2: Discovery
**Trigger**: Event is dequeued by the Event Worker
**Behaviour**: Governance checks run (assumption gate, budget, execution guards). Intake data is loaded.
**Exit**: System is ready to begin clarification

### Stage 3: Clarification Interview
**Trigger**: BusinessArchitectAgent is invoked
**Behaviour**:
- Multi-round Q&A with the prospect
- Questions are drafted and presented to agency for approval before prospect sees them
- Prospect answers are collected and analysed
- Readiness is assessed each round (NEEDS_MORE_INFO, READY_FOR_REQUIREMENTS, BLOCKED)
**Exit**: Readiness = READY_FOR_REQUIREMENTS

### Stage 4: Requirements Generation
**Trigger**: Clarification complete
**Behaviour**: RequirementsEngineerAgent generates structured requirements (MoSCoW priority) from the facts snapshot. Version v1 is created with status `pending_confirmation`.
**Exit**: Requirements version exists in the store

### Stage 5: Requirements & Assumptions Approval
**Trigger**: Requirements presented to prospect
**Behaviour**:
- Prospect confirms or rejects each requirement (with changeNote if rejected)
- Prospect approves or rejects each assumption (with comment if rejected)
- All confirmed → status = `confirmed`
- Any rejection → ChangeRequests built, new version auto-regenerated
**Exit**: All requirements and assumptions confirmed

### Stage 6: Knowledge Base Population
**Trigger**: Requirements confirmed
**Behaviour**: `populateKBFromConfirmation()` stores approved requirements, approved assumptions, and rejected assumptions (audit trail) in the Knowledge Base. Prior version entries are superseded.
**Exit**: KB is populated and ready for agents to query

### Stage 7: Build Pipeline
**Trigger**: KB populated and governance checks pass
**Behaviour**: BuildOrchestrator runs the 4-step pipeline:
1. StrategyFunnelAgent → MarketingBlueprint
2. UXDesignAgent → UXUISpec
3. CopyMessagingAgent → CopyPack
4. QualityControlAgent → QCReport

Mode B enforcement separates optional enhancements from core deliverables.
**Exit**: Build plan assembled with core + optional sections

### Stage 8: Quality Control & Review
**Trigger**: Build pipeline complete
**Behaviour**:
- QC validates all outputs against frameworks
- Critical/major violations block the build
- Agent suggests: APPROVED, NEEDS_CLARIFICATION, or NOT_A_FIT
- Human makes final review decision
**Exit**: Human decision recorded (APPROVED or REJECTED)

### Stage 9: CRM Actions & Delivery
**Trigger**: Review approved
**Behaviour**:
- Pipeline Router maps explicit system events to PipelineActionContracts (stage moves only)
- Contracts are deterministic: same event always produces the same stage move
- Only explicit events move stages — analysis/checks alone never advance the pipeline
- Every contract includes humanReadableNote (client-facing) + internalReason (audit)
- Idempotency enforced via eventId:MOVE_STAGE keys — duplicate events produce no duplicate contracts
- Contracts are stored as PENDING and manually applied during pilot (no direct CRM calls from router)
- GHL actions execute (move_stage, trigger_workflow) based on allowlists
- Dry-run mode logs actions without side effects
- Telemetry records all action outcomes
**Exit**: Project delivered; CRM updated

#### Pipeline Stage Mapping
| Event | Target Stage | Note |
|-------|-------------|------|
| INTENT_RECEIVED | NEW_LEAD | New enquiry received and logged. |
| ACK_SENT | IN_REVIEW | Acknowledgement sent — reviewing your information. |
| CLARIFICATION_SESSION_CREATED | CLARIFICATION | Focused questions to understand needs. |
| REQUIREMENTS_VERSION_CREATED | REQUIREMENTS_REVIEW | Draft requirements prepared for review. |
| PROPOSAL_MARKED_SENT | PROPOSAL_SENT | Proposal prepared and sent. |
| PROPOSAL_CLIENT_APPROVED | WON | Proposal approved — moving forward. |
| MARK_LOST / NOT_A_FIT | LOST | Not the right fit at this time. |

Non-stage-moving events (no contract emitted): SAFETY_CHECK_COMPLETED, REQUIREMENTS_CONFIRMED, ASSUMPTIONS_APPROVED_ALL

---

## Responsibility Boundaries (Agent Summary)

| Agent | Responsibility | Forbidden Actions |
|-------|---------------|-------------------|
| ResearchAgent | Facts and data gathering only | Strategy, copy, assumptions |
| StrategyFunnelAgent | Funnel design, conversion strategy | Copy writing, UX layout |
| CopyMessagingAgent | Copy for all funnel stages | Strategy changes, UX changes |
| AutomationCRMAgent | CRM logic and workflow JSON | Strategy, copy, UX |
| UXDesignAgent | Screen layouts and components | Copy, strategy changes |
| QualityControlAgent | Framework validation, blocking | Modifying outputs, creating content |
| BusinessArchitectAgent | Clarification rounds, readiness | Requirements generation, build |
| RequirementsEngineerAgent | Requirements generation from facts | Clarification, build execution |

Agents must fail fast if required inputs are missing. No agent may cross into another agent's domain.

---

## Documentation Rule

**If behaviour changes, the handbook must be updated first.**

- No code change may alter behaviour documented here without updating this handbook
- If conflicts exist between code and handbook, STOP and escalate
- All features must have a corresponding feature record in `docs/features/`
- This handbook is the behavioural source of truth; code is the implementation

---

## Cost Caps (per agent, GBP)

| Agent | Cap |
|-------|-----|
| Research | 0.50 |
| Strategy Funnel | 0.75 |
| Copy Messaging | 1.00 |
| Automation CRM | 0.25 |
| UX Design | 0.75 |
| Quality Control | 0.50 |
| Business Architect | 0.50 |
| Requirements Engineer | 0.75 |

Exceeding the cap triggers model downgrade (e.g., claude-3-sonnet → claude-3-haiku).

---

## Governance Layers

All execution passes through these layers in order:

1. **Assumption Gate** — no approved assumptions → no execution
2. **Budget Check** — daily/monthly GBP limits enforced
3. **Execution Guard** — per-project agent/action enablement
4. **Allowlist Enforcement** — stage and workflow allowlists
5. **Dry-Run Mode** — log only, no side effects
6. **Schema Validation** — invalid output rejected
7. **QC Validation** — critical/major violations block build
8. **Idempotency** — duplicate events and actions skipped
9. **RBAC** — role-based access control on all endpoints

---

## Escalation Protocol

When to escalate (do not proceed silently):

- Assumption gate fails and no approved assumptions exist
- Budget is exceeded or at risk of being exceeded
- Max clarification rounds reached without readiness
- QC blocks the build pipeline
- Conflicts between code behaviour and this handbook
- Missing feature records for features being modified

Escalation path: Log the issue → Flag in progress/error-log.md → Request human decision
