# Core Concepts

## Project
A Project represents one CRM instance (agency or client).
Each project has:
- budgets
- assumptions
- enabled agents
- rollout mode (dry-run / live)

---

## Assumptions
Statements that must be approved before execution.
Statuses:
- PENDING
- APPROVED
- REJECTED

No approved assumptions → no execution.

---

## Requirements
Derived from approved assumptions.
- Versioned (v1, v2, v3)
- Read-only to clients
- Regenerated on assumption changes

---

## Tasks
Generated from requirements.
- Linked to requirement versions
- Blocked if upstream changes occur

---

## Dry-Run vs Live
- Dry-Run: decisions logged, no CRM writes
- Live: actions executed in CRM

Used for safe parallel rollout.
