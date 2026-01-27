# Knowledge Base

## Overview
The Knowledge Base (KB) is a governed, structured store for project knowledge. It does not use embeddings or vector databases. All data is stored as structured entries with explicit types and statuses, enabling deterministic querying and a complete audit trail.

A `knowledge_entries` Drizzle table provides database persistence. The `InMemoryKnowledgeStore` is used for testing.

## Schema

### KnowledgeEntry
| Field        | Type                        | Description                                      |
|--------------|-----------------------------|--------------------------------------------------|
| id           | uuid                        | Unique identifier for the entry.                 |
| projectId    | uuid                        | The project this entry belongs to.               |
| type         | enum                        | One of: `requirement`, `assumption`, `decision`, `design-rule`, `review`. |
| source       | enum                        | One of: `agent`, `human`.                        |
| versionRef   | nullable string             | Reference to the requirements version that produced this entry. Null if not version-linked. |
| contentJson  | jsonb                       | The structured content of the entry. Schema varies by type. |
| status       | enum                        | One of: `approved`, `rejected`, `superseded`.    |
| createdAt    | timestamp                   | When the entry was created.                      |

## What Counts as Truth
Only **approved** entries are treated as truth. Rejected entries are retained for audit and are accessible only to the requirements-engineer-agent (via `getRejectedAssumptions`). Superseded entries remain immutable for historical audit but are never returned by standard tool queries.

## Entry Types
- **requirement** — A confirmed project requirement derived from the requirements process.
- **assumption** — An assumption made during clarification or requirements, with an explicit approval or rejection status.
- **decision** — A design or architectural decision recorded during the project.
- **design-rule** — A rule or constraint that governs design output.
- **review** — A review entry, typically from QualityControlAgent or human review.

## Statuses
- **approved** — The entry is active and queryable by tools. This is the primary working status.
- **rejected** — The entry was explicitly rejected. Retained for audit trail. Only accessible via `getRejectedAssumptions` by the requirements-engineer-agent.
- **superseded** — The entry belonged to a prior version. When a new version is confirmed, entries from the old version are superseded. Superseded entries remain immutable as part of the audit trail.

## How Entries Are Approved
Entries enter the KB through `populateKBFromConfirmation()`, which is called when a requirements version is confirmed:
1. Only confirmed versions trigger KB population.
2. Each confirmed requirement is stored with type `requirement` and status `approved`.
3. Each approved assumption is stored with type `assumption` and status `approved`.
4. Each rejected assumption is stored with type `assumption` and status `rejected` (with rejection reason in contentJson).
5. Pending assumptions are skipped entirely.

## How Agents Access Knowledge
Agents do not query the KB directly. Instead, `loadKBForAgent()` pre-loads all relevant data before the agent runs using MCP-style read-only tools. Each agent has a declared set of tools it can access (see [MCP Tooling](mcp-tooling.md)). This keeps agents focused on their task and simplifies the query surface.

## Supersede Behavior
When a new version is confirmed for a project:
1. All prior KB entries for the same project with a different `versionRef` are superseded.
2. Superseded entries are never deleted or modified. They remain immutable as part of the audit trail.
3. Only entries with status `approved` are returned by standard query tools (except `getRejectedAssumptions`).

## Store Interface
The KB store exposes the following methods:
- `store(entry)` — Persist a new KnowledgeEntry.
- `get(id)` — Retrieve a single entry by its id.
- `getByProject(projectId)` — Retrieve all entries for a project.
- `getByProjectAndType(projectId, type)` — Retrieve entries for a project filtered by type.
- `getByProjectTypeAndStatus(projectId, type, status)` — Retrieve entries for a project filtered by both type and status.
- `supersede(id)` — Mark an entry as superseded.
- `clear()` — Remove all entries (used in testing).

## InMemoryKnowledgeStore
The in-memory implementation uses a `Map<string, KnowledgeEntry>` as its backing store. It follows the same pattern as InMemoryRequirementsVersionStore:
- `structuredClone` is used on both store and retrieval operations to guarantee immutability. Callers cannot mutate internal state by modifying returned objects.

## Database Table
The `knowledge_entries` Drizzle table mirrors the KnowledgeEntry schema with PostgreSQL types:
- `id` — UUID primary key with `defaultRandom()`
- `project_id` — UUID foreign key referencing `projects.id`
- `type` — `knowledge_entry_type` enum
- `source` — `knowledge_entry_source` enum
- `version_ref` — Nullable text
- `content_json` — JSONB
- `status` — `knowledge_entry_status` enum
- `created_at` — Timestamp with `defaultNow()`

## Design Decisions
- **DB-first** — The KB has a Drizzle schema definition (`knowledge_entries`). InMemoryKnowledgeStore is used for testing only.
- **No embeddings** — The KB uses structured queries, not semantic search. Embedding-based retrieval is PLANNED as an optional accelerator but will never be the source of truth.
- **Synchronous in-memory operations** — All in-memory store methods are synchronous. The database-backed store will use async operations.
