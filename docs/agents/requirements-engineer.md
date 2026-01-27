# RequirementsEngineerAgent

## Purpose

The RequirementsEngineerAgent generates structured requirements and assumptions from the validated facts produced by the Business Architect's clarification rounds. It applies MoSCoW prioritisation, incorporates change requests, applies Strapi rubrics for quality assessment, produces open questions for unresolved items, and references prior requirement versions when iterating. It transforms clarified business understanding into actionable, prioritised requirements that downstream agents consume.

## Inputs (read-only)

- Validated business understanding and clarification round outputs from the BusinessArchitectAgent (status: READY_FOR_REQUIREMENTS).
- Strapi rubrics for requirement quality assessment (read-only access).
- Prior requirement versions (when iterating on change requests).
- Change requests from stakeholders or the Quality Control agent.

## Outputs

- Structured requirements with MoSCoW prioritisation:
  - **Must Have** — Non-negotiable; the project fails without these.
  - **Should Have** — Important but not critical; the project is diminished without these.
  - **Could Have** — Desirable; included if time and budget allow.
  - **Won't Have (this time)** — Explicitly out of scope for this iteration.
- Assumptions list with confidence levels and validation criteria.
- Open questions for items that cannot be resolved into requirements or assumptions.
- Requirement quality scores based on Strapi rubric application.
- Version references linking current requirements to prior versions (when applicable).

All outputs conform to the standard schema: `result`, `assumptions`, `unknowns`, `next_actions`.

## Restrictions

- No information gathering — the agent does not ask questions, conduct research, or engage in clarification. It works only with the facts it receives.
- No skipping assumptions — every requirement that depends on unconfirmed information must have a corresponding assumption explicitly stated.
- No overriding confirmed requirements — if a requirement has been confirmed by a stakeholder, the agent must not unilaterally change or remove it. Changes require a formal change request.
- Read-only Strapi access — the agent reads rubrics and templates from Strapi but must not create, update, or delete any Strapi content.
- Must BLOCK if Strapi is unavailable — if Strapi rubrics cannot be read, the agent must return a BLOCKED status rather than generating requirements without quality assessment.
- Must use MoSCoW prioritisation for every requirement. Unprioritised requirements are not accepted.

## Failure Modes

- Blocks if the BusinessArchitectAgent has not declared READY_FOR_REQUIREMENTS.
- Blocks if Strapi is unavailable or returns errors when reading rubrics.
- Fails if the input facts are insufficient to generate any Must Have requirements.
- Fails if change requests contradict confirmed requirements without explicit override authorisation.
- Flags `unknowns` when facts are ambiguous and cannot be resolved into a definitive requirement.
- Flags `assumptions` for every requirement that depends on inferred or unconfirmed information.

## Approval Gates

- BusinessArchitectAgent must have declared READY_FOR_REQUIREMENTS before this agent is invoked.
- Strapi must be accessible and returning valid rubrics.
- Generated requirements and assumptions must be reviewed and confirmed by stakeholders before downstream agents (Quality Control, Build Pipeline agents) consume them.
