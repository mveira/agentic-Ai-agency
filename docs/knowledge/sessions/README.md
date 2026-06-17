# Session logs

This folder is the audit trail of agency builds — one file per Claude
Code session that produces a client deliverable. Sessions are the unit;
not days, not sprints. A session log lets the next session start with
real context instead of redoing discovery.

## When to write one

- At the end of any session that ships a client deliverable
- At the end of any session that introduced a reusable pattern (which
  gets distilled into [`../website-build-playbook.md`](../website-build-playbook.md))
- At the end of any session that hit a real trap (which gets distilled
  into [`../website-build-traps.md`](../website-build-traps.md))

## File name

`<engagement-slug>-<YYYY-MM-DD>.md` — matches the dossier folder name
under `docs/08-operations/clients/`. Multiple sessions in the same
engagement append to the same file under dated headings.

## Template

```markdown
# <Engagement> — session log

## Session: YYYY-MM-DD (start) → YYYY-MM-DD (end)

### Scope going in
Brief: what we set out to do.

### What shipped
- Commit hash · short description
- ...

### Decisions worth remembering
- **Decision**: short title
  - Why: …
  - Alternatives considered: …
  - Source of truth: link to decision-log entry

### Traps we hit
- **Trap**: short title
  - What happened: …
  - Root cause: …
  - Fix: …
  - Generalised lesson → added to website-build-traps.md as …

### Patterns worth reusing
- **Pattern**: short title
  - Where it lived in this session
  - Generalised version → added to website-build-playbook.md as …

### Open at session end
- Item 1 (owner)
- Item 2 (owner)

### Time cost notes (optional but valuable)
- "X took longer than necessary because Y. Next time …"
```

## What NOT to put here

- The full commit log — `git log` is authoritative for that
- Decisions — they live in `progress/decision-log.md` and we link to them
- Tasks — they live in `progress/task-log.md`
- Code — git is the code

Session logs are about **narrative and lessons**, not state.
