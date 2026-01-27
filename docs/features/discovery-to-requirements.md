# Discovery to Requirements

## Trigger
A lead enters the CRM via a form or booking. A GHL (GoHighLevel) webhook fires, sending the event into the system.

## Flow Steps
1. The GHL webhook event is ingested by the system.
2. The Event Bus receives the event with idempotency checks to prevent duplicate processing.
3. Governance checks run: assumption gate, budget guard, and execution guards are evaluated.
4. BusinessArchitectAgent begins clarification rounds:
   - Intake data is loaded from Strapi templates.
   - The LLM analyzes the intake data and generates clarification questions along with a readiness assessment.
   - The agency reviews the draft questions before they are sent to the prospect.
   - The prospect answers the questions.
   - This cycle repeats until readiness reaches READY_FOR_REQUIREMENTS.
5. RequirementsEngineerAgent generates requirements from the collected facts.
6. The requirements version is stored as v1 with status `pending_confirmation`.

## Agents Involved
- **BusinessArchitectAgent** — Conducts clarification rounds, analyzes intake data, generates questions, and assesses readiness.
- **RequirementsEngineerAgent** — Generates structured requirements from the clarified facts.

## Approval Points
- The agency approves each set of clarification questions before the prospect sees them.
- The prospect confirms the generated requirements.

## Failure Handling
- **Strapi unavailable** — The flow is BLOCKED. No templates can be loaded, so clarification cannot proceed.
- **LLM failure** — An error is returned to the caller. The round does not advance.
- **Budget exceeded** — The flow is blocked by the budget execution guard.
