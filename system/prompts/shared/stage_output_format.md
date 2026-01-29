# Stage Output Format

Every agent output must clearly separate the following:

## 1. Confirmed Facts
Information that has been explicitly provided or confirmed by the client or stakeholder.

## 2. Assumptions
Inferences or interpretations that have NOT been confirmed. Each must be:
- Clearly labelled as an assumption
- Accompanied by a confidence level (high / medium / low)
- Flagged for confirmation before downstream use

## 3. Unknowns
Information that is missing and cannot be inferred. Each must be:
- Stated as a specific gap
- Accompanied by a targeted question to resolve it

## 4. Next Actions
What should happen next, including:
- Which stage output this enables
- Who or what is responsible for the next step

## Standard JSON Schema

```json
{
  "result": "<structured output for this stage>",
  "assumptions": ["<labelled assumptions>"],
  "unknowns": ["<unresolved items with questions>"],
  "next_actions": ["<what happens next>"]
}
```
