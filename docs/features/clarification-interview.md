# Clarification Interview

## Trigger
A new project is created with incomplete information. The BusinessArchitectAgent initiates a multi-round clarification interview to gather what is needed before requirements can be generated.

## Flow Steps
1. **Round 1**:
   - Intake data is analyzed for gaps and missing information.
   - The agent generates clarification questions targeting those gaps.
   - The agency reviews the DRAFT questions.
   - The agency approves or edits the questions.
   - APPROVED questions are shown to the prospect.
   - The prospect's answers are collected.
2. **Round 2+**:
   - Prior answers reduce the number of remaining questions.
   - Readiness score increases with each round as gaps are filled.
3. **Readiness Transitions**:
   - `NEEDS_MORE_INFO` — More rounds are needed. Continue the interview.
   - `READY_FOR_REQUIREMENTS` — Enough information has been gathered. Hand off to RequirementsEngineerAgent.
   - `BLOCKED` — Critical information cannot be gathered. The interview cannot proceed.

## Agents Involved
- **BusinessArchitectAgent** — Drives the entire clarification interview process across all rounds.

## Approval Points
- The agency reviews and approves every question set before it reaches the prospect. No questions are shown to the prospect without agency approval.

## Failure Handling
- **BLOCKED readiness** — If critical information cannot be gathered (e.g., the prospect is unresponsive or the project is fundamentally unclear), readiness is set to BLOCKED.
- **Strapi unavailable** — The flow is BLOCKED. Templates cannot be loaded.

## API Endpoints
- `GET /sessions` — Retrieve clarification sessions for a project.
- `POST /answers` — Submit prospect answers for a clarification round.
- `POST /plan-next` — Plan the next clarification round based on current state.
- `POST /approve-questions` — Agency approves or edits draft questions for the current round.
