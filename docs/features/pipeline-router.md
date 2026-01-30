# Pipeline Router

## Purpose
Maps system events and gate states to CRM action contracts, ensuring deterministic pipeline stage progression without direct CRM calls.

## Handbook Alignment
Stage 9: CRM Actions & Delivery

## Trigger
Any pipeline event fired by the system (e.g., INTENT_RECEIVED, ACK_SENT, SAFETY_CHECK_COMPLETED, etc.).

## Inputs
- Project ID and contact ID
- Current pipeline stage (optional)
- Triggering event type (one of 9 defined events)
- Gate state snapshot (safetyCheck, clarification, requirements, assumptions, proposal, proposalReview, fitDecision)

## Outputs
- Array of `CRMActionContract` objects (type: MOVE_STAGE, TRIGGER_WORKFLOW, or ADD_NOTE)
- Contracts are stored as PENDING in `crmActionContracts` table
- No direct CRM calls — contracts only

## Allowed Actions
- Compute CRM action contracts from events + gate state
- Store contracts in the contract store
- Return contracts via internal API endpoints
- Mark contracts as APPLIED or FAILED

## Forbidden Actions
- Direct GHL/CRM API calls from the router
- Bypassing gate checks (safety, proposal review, assumptions)
- Silent stage progression without contract

## UI/UX Summary
Internal dashboard page at `/internal/projects/[id]/crm-actions` showing pending action contracts with type, target stage, reason, and status badges.

## Failure Modes
| Failure | Behaviour | Recovery |
|---------|-----------|----------|
| Unknown event type | Returns ADD_NOTE with explanation | Log and investigate |
| Gate not met | Returns ADD_NOTE explaining block | Fix gate state and retry |
| Store write failure | Contract not persisted | Retry via event bus |

## Escalation Rules
- If a contract remains PENDING for extended periods, escalate to human review
- If FAILED contracts accumulate, investigate CRM integration health

## Cost Considerations
- No LLM calls — pure deterministic computation
- Zero token usage
- Minimal compute cost

## Logging & Audit
- All contracts stored with reason, status, and timestamps
- Status transitions (PENDING → APPLIED/FAILED) tracked
- Gate block reasons captured in ADD_NOTE contracts
