# Feature Records

## Why Feature Records Exist

Feature records are the contract between what the system promises and what it delivers. They ensure:

1. **Traceability** — Every feature links back to handbook stages and governance rules
2. **Clarity** — Allowed and forbidden actions are explicit, preventing scope creep
3. **Auditability** — Failure modes, escalation paths, and logging requirements are documented
4. **Cost awareness** — Token and budget implications are considered before implementation
5. **Handoff continuity** — New developers and agents can understand features without reading code

---

## Non-Negotiable Rule

**No build or modification without a feature record.**

Before implementing or modifying any feature:

1. Check if a feature record exists in `docs/features/`
2. If missing, STOP and create it (Phase A high-level format is acceptable for first drafts)
3. If the feature record exists, read it before making changes
4. If behaviour changes, update the feature record first

This rule is enforced in CLAUDE.md as a documentation gate.

---

## Feature Record Template

Use this template for all new feature records. All sections are required.

```markdown
# Feature Name

## Purpose
One sentence describing what this feature does and why it exists.

## Handbook Alignment
Which handbook stages this feature implements (reference by stage name).
Example: "Stage 3: Clarification Interview, Stage 4: Requirements Generation"

## Trigger
What event or condition initiates this feature.
Example: "GHL webhook fires when lead enters CRM"

## Inputs
- List of required inputs
- Data sources (KB, Strapi, CRM, etc.)
- Prerequisite states

## Outputs
- What this feature produces
- Where outputs are stored (KB, database, CRM, etc.)
- Schema references if applicable

## Allowed Actions
What this feature is permitted to do:
- Agent invocations
- Data modifications
- CRM actions
- External calls

## Forbidden Actions
What this feature must NOT do:
- Cross-domain actions (e.g., copy agent doing strategy)
- Silent progressions
- Bypassing governance gates

## UI/UX Summary
Brief description of the user-facing interface, if any.
Example: "Chat-like question flow in /projects/[id]/clarification"

## Failure Modes
| Failure | Behaviour | Recovery |
|---------|-----------|----------|
| LLM unavailable | Return error, do not advance | Retry with backoff |
| Budget exceeded | Block execution | Escalate to human |
| Schema validation fails | Reject output | Log and request fix |

## Escalation Rules
When to stop and escalate:
- Conditions that require human intervention
- Escalation path (log → flag → human decision)

## Cost Considerations
- Which agents are invoked (reference cost caps from handbook)
- Estimated token usage per operation
- Budget implications

## Logging & Audit
- What is logged (events, telemetry, actions)
- Where logs are stored
- Retention and access policies
```

---

## Existing Feature Records

| Feature | File | Handbook Stages |
|---------|------|-----------------|
| Discovery to Requirements | discovery-to-requirements.md | Stages 1-4 |
| Clarification Interview | clarification-interview.md | Stage 3 |
| Assumptions Approval | assumptions-approval.md | Stage 5 |
| Requirements & Assumptions | requirements-and-assumptions.md | Stages 4-6 |
| Build Pipeline | proposal-generation.md | Stages 6-7 |

---

## Phase A vs Phase B Records

**Phase A (High-Level)**: Captures the essential contract — purpose, triggers, allowed/forbidden actions, failure modes. Acceptable for initial documentation.

**Phase B (Detailed)**: Adds implementation specifics — exact API endpoints, schema definitions, step-by-step flows, edge cases. Required before major modifications.

All records start as Phase A. Upgrade to Phase B when the feature is being actively developed or modified.
