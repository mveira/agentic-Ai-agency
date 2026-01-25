# Claude Operating Rules — Agency AI OS

This repository uses Claude Code with GSD and a Ralph-style loop.
These rules are permanent and must be followed in all runs.

---

## 1. READ BEFORE DOING ANYTHING

Before making changes, you MUST:
1. Read all files in `progress/`
   - task-log.md
   - error-log.md
   - decision-log.md
2. Do NOT repeat work marked as DONE.
3. Do NOT retry errors blindly — adjust approach and log the change.

Failure to do this is a task failure.

---

## 2. LOGGING IS MANDATORY (PERSISTENT MEMORY)

Every run MUST update logs:

### Task Log
File: `progress/task-log.md`

For each task:
- Task
- Status (TODO / DOING / DONE / BLOCKED)
- Files touched
- Tests added/updated
- Commands run
- Notes

No task may be marked DONE without tests.

### Error Log
File: `progress/error-log.md`

Log:
- Timestamp
- Segment / Week
- Command or action
- Error or issue
- Resolution or next step

### Decision Log
File: `progress/decision-log.md`

Log:
- Decision
- Reason
- Alternatives considered
- Impact

---

## 3. TEST-DRIVEN DEVELOPMENT (NON-NEGOTIABLE)

This repo uses strict TDD.

Rules:
- Tests must exist for all meaningful logic.
- `pnpm test` must pass before marking work DONE.
- CI enforces lint, typecheck, and tests.
- If tests are missing, work is BLOCKED.

---

## 4. GOVERNANCE & DEPENDENCIES

- Assumption Gate is enforced.
- No development or agent execution if assumptions are not APPROVED.
- Requirements are versioned.
- Tasks are derived from requirements.

Do not bypass governance logic.

---

## 5. AGENT BEHAVIOUR RULES

Agents are specialised and must not overlap.

- ResearchAgent: facts only
- StrategyFunnelAgent: offer + funnel (Hormozi logic)
- CopyMessagingAgent: copy only, no strategy changes
- AutomationCRMAgent: logic only, strict JSON
- QualityControlAgent: evaluates, may block

Agents must fail fast if required inputs are missing.

---

## 6. TOKEN & COST AWARENESS

- Be concise.
- Prefer reuse and cached artifacts.
- Never resend large context unless required.
- Avoid repeating analysis already logged.

Token usage is a first-class constraint.

---

## 7. EXECUTION STYLE (RALPH LOOP)

Work in small, atomic steps:
- Pick the smallest unfinished task
- Implement
- Test
- Log
- Commit
- Stop

Never attempt large changes in a single run.

---

## 8. SOURCE OF TRUTH

The following are authoritative:
- `CLAUDE.md`
- `prd.json` (if present)
- `progress/` logs

If instructions conflict, ask for clarification.
