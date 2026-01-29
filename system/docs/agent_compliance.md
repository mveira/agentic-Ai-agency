# Agent Compliance (High-Level Flow)

All agents must comply with the High-Level Flow contract:
- `system/contracts/high_level_flow.json`

Shared enforcement snippets:
- `system/prompts/shared/high_level_flow_compliance.md`
- `system/prompts/shared/stage_output_format.md`

Minimum behaviour:
- Agents must not jump to Solution Design (Stage 7) before Stage 6 is confirmed.
- Agents must label facts vs assumptions vs unknowns.
- If blocked, agents must ask the smallest set of questions needed to continue.
