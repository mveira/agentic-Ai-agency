# Requirements & Assumptions

## Purpose
Manage the generation, versioning, confirmation, and rejection lifecycle of project requirements and their associated assumptions, ensuring no work proceeds without explicit approval.

## Handbook Alignment
- Stage 4: Requirements Generation
- Stage 5: Requirements & Assumptions Approval
- Stage 6: Knowledge Base Population

## Trigger
- **Generation**: Clarification readiness = READY_FOR_REQUIREMENTS
- **Confirmation**: Prospect reviews requirements version via portal
- **Regeneration**: Any requirement or assumption is rejected

## Inputs
- Facts snapshot from clarification rounds (summary + structured answers)
- Prior version rejections (ChangeRequests) if regenerating
- Prospect confirmation/rejection decisions with notes

## Outputs
- Requirements version (v1, v2, v3...) with status and immutable snapshot
- Individual requirements with MoSCoW priority and confirmation state
- Assumptions with approval status (pending → approved | rejected)
- Knowledge Base entries (on confirmation)

## Allowed Actions
- Invoke RequirementsEngineerAgent to generate requirements from facts
- Create new immutable requirement versions
- Store confirmation/rejection decisions
- Trigger auto-regeneration on rejections
- Populate Knowledge Base on full confirmation
- Fire GHL milestone hooks on status transitions

## Forbidden Actions
- Modifying a confirmed version (immutable)
- Proceeding to build without confirmed requirements
- Silent assumption approval (all assumptions must be explicitly approved)
- Bypassing the confirmation gate
- Deleting or hiding rejected assumptions (audit trail required)

## UI/UX Summary
- Portal page: `/projects/[id]/requirements`
- Displays current version with all requirements and assumptions
- Each item has confirm/reject toggle with optional notes
- Submit button triggers confirmation logic
- Shows version history for audit

## Failure Modes
| Failure | Behaviour | Recovery |
|---------|-----------|----------|
| LLM failure during generation | Error returned, no version created | Retry with logged context |
| LLM failure during regeneration | Error returned, version stuck | Retry or escalate |
| Version already confirmed | 409 Conflict returned | Inform user, no action needed |
| All assumptions rejected | Regeneration triggered | New version addresses feedback |
| Schema validation failure | Generation fails, logged | Fix input data, retry |

## Escalation Rules
- If regeneration fails 3+ times, escalate to human review
- If prospect rejects same items across multiple versions, escalate
- If budget is at risk due to repeated regenerations, escalate

## Cost Considerations
- RequirementsEngineerAgent: cost cap £0.75 per invocation
- Each regeneration is a separate LLM call
- Multiple rejections can accumulate costs quickly
- Consider version limits per project if cost becomes excessive

## Logging & Audit
- All requirement versions stored immutably in the database
- Confirmation/rejection decisions logged with timestamps
- ChangeRequests logged for audit trail
- KB population logged via telemetry with `kb-tool:` prefix
- Rejected assumptions retained in KB with status `rejected`
