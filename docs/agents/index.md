# Agent Registry

## Active Agents

| Agent | Model | Cost Cap (GBP) | Max Tokens | Frameworks | KB Access |
|-------|-------|----------------|------------|------------|-----------|
| Research | claude-3-sonnet | £0.50 | 4,096 | market-awareness | None (facts from external sources only) |
| Strategy Funnel | claude-3-sonnet | £0.75 | 4,096 | offer-economics, market-awareness, funnel-design | getDesignRules, getDecisions |
| Copy Messaging | gpt-4 | £1.00 | 8,192 | persuasion, market-awareness | getDesignRules |
| Automation CRM | gpt-4o-mini | £0.25 | 4,096 | funnel-design | getDesignRules |
| UX Design | claude-3-sonnet | £0.75 | 4,096 | funnel-design | getDesignRules |
| Quality Control | claude-3-sonnet | £0.50 | 4,096 | all 4 | All 5 approved tools + getReviews |
| Business Architect | claude-3-sonnet | £0.50 | 4,096 | market-awareness, offer-economics | getDecisions, getDesignRules |
| Requirements Engineer | claude-3-sonnet | £0.75 | 4,096 | market-awareness, offer-economics | getApprovedRequirements, getRejectedAssumptions |

## Standard Output Schema

Every agent must return output conforming to the following structure:

- **result** — The primary deliverable produced by the agent.
- **assumptions** — Any assumptions made during execution that require human review or confirmation.
- **unknowns** — Data gaps, unanswered questions, or areas where the agent lacked sufficient input.
- **next_actions** — Recommended follow-up steps, downstream agent invocations, or human tasks.

## Contract Enforcement

All agents operate under strict contract enforcement. The following mechanisms are applied at runtime:

- **Prompt Injection Protection** — Agent prompts are sandboxed. User-supplied content is treated as data, never as instructions. Any attempt to override system instructions is rejected.
- **Schema Validation** — Every agent output is validated against its declared JSON schema before being accepted. Malformed or non-conforming output is rejected and the agent is re-invoked or blocked.
- **Framework Injection** — Each agent receives only the frameworks listed in its registry entry. Frameworks are injected into the system prompt at invocation time. An agent cannot access or reference frameworks outside its allowlist.
- **Cost Caps** — Each invocation is metered. If the estimated or actual cost exceeds the agent's declared cost cap (in GBP), the invocation is terminated and flagged for review.
- **Execution Guards** — Agents cannot self-invoke, escalate privileges, or bypass approval gates. Execution flow is controlled by the orchestrator, not by the agents themselves.
