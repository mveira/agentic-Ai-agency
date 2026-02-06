# Pipeline Router

## Purpose
Maps internal system events to CRM pipeline stage transitions via PipelineActionContracts. Deterministic, consent-driven, no side effects. Preserves a humane client experience through human-readable notes on every stage move.

## Handbook Alignment
Stage 9: CRM Actions & Delivery

## Trigger
Any pipeline event fired via the internal event bus.

## Inputs
- Project ID
- Event ID (unique per event, used for idempotency)
- Triggering event type (one of 11 defined events)
- Optional related IDs (contactId, sessionId, etc.)

## Outputs
- `PipelineActionContract | null` — a single stage-move contract or null for non-stage-moving events
- Contracts stored as PENDING in `pipeline_action_contracts` table
- No direct CRM calls — contracts only, manual apply during pilot

## Stage Mapping (Canonical)

| Event | Target Stage | Human-Readable Note |
|-------|-------------|---------------------|
| INTENT_RECEIVED | NEW_LEAD | New enquiry received and logged. |
| ACK_SENT | IN_REVIEW | Acknowledgement sent — reviewing your information. |
| CLARIFICATION_SESSION_CREATED | CLARIFICATION | We're asking a few focused questions to better understand your needs. |
| REQUIREMENTS_VERSION_CREATED | REQUIREMENTS_REVIEW | Draft requirements prepared for your review. |
| PROPOSAL_MARKED_SENT | PROPOSAL_SENT | Proposal prepared and sent. |
| PROPOSAL_CLIENT_APPROVED | WON | Proposal approved — moving forward. |
| MARK_LOST / NOT_A_FIT | LOST | Not the right fit at this time. |

**Non-stage-moving events** (produce no contract):
- SAFETY_CHECK_COMPLETED
- REQUIREMENTS_CONFIRMED
- ASSUMPTIONS_APPROVED_ALL

## Core Rules (Non-Negotiable)

1. **Stage changes ONLY occur on explicit events** — analysis/checks alone never move stages
2. **CLARIFICATION only via session creation** — NOT via safety check
3. **Consent-driven advancement** — each stage requires its explicit event
4. **Human clarity** — every contract includes humanReadableNote + internalReason
5. **Idempotency** — `idempotencyKey = ${eventId}:MOVE_STAGE`; duplicates rejected
6. **No side effects** — router emits contracts only; never calls GHL or mutates CRM

## Allowed Actions
- Compute PipelineActionContracts from events
- Store contracts as PENDING
- Mark contracts as APPLIED or REJECTED via internal API
- Display contracts in internal dashboard

## Forbidden Actions
- Direct GHL/CRM API calls from the router
- Silent stage progression without contract
- Moving stages on non-stage-moving events
- Guessing intent — only explicit signals

## UI/UX Summary
Internal dashboard page at `/internal/projects/[id]/crm-actions` showing pipeline action contracts with target stage, human-readable note, event source, and status badges (PENDING/APPLIED/REJECTED).

## Failure Modes
| Failure | Behaviour | Recovery |
|---------|-----------|----------|
| Non-stage-moving event | Returns null (no contract) | Expected behaviour |
| Duplicate idempotency key | Store rejects insertion | Skip — event already processed |
| Unknown event type | Returns null | Log and investigate |

## Pilot vs Production
- **Pilot**: All contracts stored as PENDING, manually applied by operator
- **Production**: Contracts auto-applied by downstream executor (future)

## Escalation Rules
- If PENDING contracts accumulate, operator reviews and applies/rejects
- If contracts consistently rejected, investigate event source

## Cost Considerations
- No LLM calls — pure deterministic computation
- Zero token usage
- Minimal compute cost

## Logging & Audit
- All contracts stored with humanReadableNote, internalReason, idempotencyKey, status, timestamps
- Status transitions (PENDING → APPLIED/REJECTED) tracked
- Full event traceability via eventId in internalReason
