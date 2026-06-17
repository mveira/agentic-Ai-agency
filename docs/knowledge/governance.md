# Knowledge base governance

> **Status**: enforced — see CLAUDE.md §9. Skipping any rule below is a
> task failure with the same severity as skipping the feature-record
> gate.

The knowledge base under `docs/knowledge/` exists to compound across
engagements. Without enforcement, it decays into a dead-letter pile of
half-written notes. These rules are what stop that.

## The three files

| File | Purpose |
|------|---------|
| [`website-build-playbook.md`](./website-build-playbook.md) | Patterns we want to reuse — stack defaults, component set, schema baseline, auth model. |
| [`website-build-traps.md`](./website-build-traps.md) | Anti-patterns to avoid, with root cause + corrective action + first-hit citation. |
| [`sessions/<engagement-slug>-<YYYY-MM-DD>.md`](./sessions/README.md) | One file per Claude Code session that produced a client deliverable. Chronological + decisions + traps + patterns + open items. |

## Mandatory steps

### Before any website-build engagement starts

1. **Read the playbook** end-to-end. Most of it applies verbatim. The
   per-client variables (palette, services, copy, photos) are the
   delta to figure out — everything else is a defaults question.
2. **Read the traps** in full. If you don't read them, you re-discover
   them. We've already paid that cost; do not re-bill it.
3. **Check existing memory** for any client-specific or engagement-
   specific entries (`spyn-repo-location`, the worktree convention,
   the Strapi-not-active flag, the C Through Exteriors session log
   pointer).

### During the engagement

- If a decision differs from a playbook default, **log it** in the
  engagement's `progress/decision-log.md` AND note the divergence in
  the session log so the next engagement can decide whether to fold
  the new variant into the playbook.
- If you discover a new trap, **add it to `website-build-traps.md`
  before the session ends**. Format follows the existing entries:
  T-<area><n>, root cause, do, first-hit citation.

### At the end of every session

Write the session log. Template lives at
[`sessions/README.md`](./sessions/README.md). It is **not optional**.
Sessions that produce a deliverable but no log are a process violation.

### Promotion rules

- **Pattern observed once** → stays in the session log as a candidate.
- **Pattern observed twice across different engagements** → promoted
  to the playbook as a named pattern with a "where this came from"
  pointer.
- **Trap observed once** → goes straight into the traps doc (one
  occurrence is enough; don't wait for a second engagement to also
  pay the cost).
- **Playbook entry contradicts a session decision** → reconcile
  before the session ends. Either update the playbook or document why
  the engagement is an exception.

## Who owns what

| Role | Responsibility |
|------|---------------|
| Engineer (or Claude Code session) | Read playbook + traps at start; write session log + new traps at end. |
| Engagement lead | Verify the session log was written before closing the engagement. Sign off on promotions to the playbook. |
| QualityControlAgent | When the build pipeline runs against a website-build, check that the engagement folder contains a session-log entry for the active session. |
| ResearchAgent | Allowed to read the KB as context for new engagements. Not allowed to write directly — promotions flow through engineer + lead. |

## Audit trail

- Every change to `playbook.md` or `traps.md` lands as its own commit
  with a clear `docs(kb):` prefix and a one-line reason in the body.
- Session log files are append-only within an engagement — once a
  session log entry exists for a given date, that date's content is
  immutable. New sessions add new dated sections.

## Escalation

If a build needs to skip any rule above (e.g. emergency hotfix with no
time for a full read), the engineer must:

1. Note in the session log what was skipped and why.
2. Flag it to the engagement lead at session end.
3. Add a follow-up task to retroactively complete the skipped step
   within 48 hours.

Skipping without notice is a process failure.
