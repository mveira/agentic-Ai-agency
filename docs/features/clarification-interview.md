# Clarification Interview

## Purpose
Conduct a structured multi-round Q&A with prospects to gather sufficient information before requirements can be generated, ensuring no silent assumptions are made.

## Handbook Alignment
- Stage 3: Clarification Interview

## Trigger
A new project is created with incomplete information. The BusinessArchitectAgent initiates a multi-round clarification interview to gather what is needed before requirements can be generated.

## Inputs
- Intake data from CRM (lead form, booking details)
- Strapi templates for question generation
- Prior round answers (if not round 1)
- Project context and goals

## Outputs
- Clarification questions (DRAFT → APPROVED status)
- Prospect answers per round
- Readiness assessment (NEEDS_MORE_INFO, READY_FOR_REQUIREMENTS, BLOCKED)
- Readiness score (increases with each round)

## Allowed Actions
- Invoke BusinessArchitectAgent to analyse intake and generate questions
- Store draft questions for agency review
- Present approved questions to prospect
- Collect and store prospect answers
- Assess readiness after each round
- Transition to requirements generation when ready

## Forbidden Actions
- Showing draft questions to prospects (agency must approve first)
- Silently advancing to requirements without READY_FOR_REQUIREMENTS status
- Exceeding max clarification rounds (default 3) without escalation
- Generating requirements within this feature (separate agent responsibility)
- Making assumptions about missing information

## UI/UX Summary
- Portal page: `/projects/[id]/clarification`
- Chat-like question flow interface
- Agency sees draft questions with approve/edit/remove controls
- Prospect sees only approved questions
- QuestionField component supports 6 input types

## Flow Steps
1. **Round 1**:
   - Intake data is analysed for gaps and missing information
   - Agent generates clarification questions targeting those gaps
   - Agency reviews the DRAFT questions
   - Agency approves or edits the questions
   - APPROVED questions are shown to the prospect
   - Prospect's answers are collected
2. **Round 2+**:
   - Prior answers reduce the number of remaining questions
   - Readiness score increases with each round as gaps are filled
3. **Readiness Transitions**:
   - `NEEDS_MORE_INFO` — More rounds needed; continue interview
   - `READY_FOR_REQUIREMENTS` — Sufficient information gathered; hand off to RequirementsEngineerAgent
   - `BLOCKED` — Critical information cannot be gathered; interview cannot proceed

## Failure Modes
| Failure | Behaviour | Recovery |
|---------|-----------|----------|
| Strapi unavailable | Flow BLOCKED, no templates | Wait for Strapi, retry |
| LLM failure | Error returned, round does not advance | Retry with backoff |
| Budget exceeded | Flow BLOCKED | Escalate to human |
| Max rounds reached | Readiness stuck | Escalate to human review |
| Prospect unresponsive | Readiness = BLOCKED | Escalate or close project |

## Escalation Rules
- Max clarification rounds reached without readiness → escalate
- Prospect unresponsive after 7 days → escalate
- Critical gaps identified that cannot be resolved via Q&A → escalate
- Budget at risk due to multiple rounds → escalate

## Cost Considerations
- BusinessArchitectAgent: cost cap £0.50 per invocation
- Each round is a separate LLM call
- Multiple rounds accumulate costs
- Consider the default max of 3 rounds as a cost control

## Logging & Audit
- All questions stored with DRAFT/APPROVED status
- All prospect answers stored with timestamps
- Readiness assessments logged per round
- Agency approvals/edits tracked for audit
- Telemetry records token usage per round

## API Endpoints
- `GET /sessions` — Retrieve clarification sessions for a project
- `POST /answers` — Submit prospect answers for a clarification round
- `POST /plan-next` — Plan the next clarification round based on current state
- `POST /approve-questions` — Agency approves or edits draft questions for the current round
