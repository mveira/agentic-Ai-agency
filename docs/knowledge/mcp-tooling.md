# MCP Tooling

## Overview
The KB tools follow an MCP-style pattern (though not the full MCP protocol). They are read-only query tools that agents use to access Knowledge Base data. All tools are stateless pure functions, making them easy to test and reason about. Payloads are token-efficient: only `id`, `contentJson`, and `createdAt` are returned per entry, stripping `projectId`, `type`, `source`, and `status` to minimize token usage in agent contexts.

## Tools (6 total)

### getApprovedRequirements(store, projectId)
Returns all KB entries with type `requirement` and status `approved` for the given project.
- **Returns**: `KBToolResult`

### getApprovedAssumptions(store, projectId)
Returns all KB entries with type `assumption` and status `approved` for the given project.
- **Returns**: `KBToolResult`

### getDecisions(store, projectId)
Returns all KB entries with type `decision` and status `approved` for the given project.
- **Returns**: `KBToolResult`

### getDesignRules(store, projectId)
Returns all KB entries with type `design-rule` and status `approved` for the given project.
- **Returns**: `KBToolResult`

### getReviews(store, projectId)
Returns all KB entries with type `review` and status `approved` for the given project.
- **Returns**: `KBToolResult`

### getRejectedAssumptions(store, projectId)
Returns all KB entries with type `assumption` and status `rejected` for the given project. This tool is an exception to the "approved only" rule — it provides the requirements-engineer-agent with visibility into why assumptions were rejected, enabling better requirement iteration.
- **Returns**: `KBToolResult`

## KBToolResult
```typescript
{
  entries: { id: string; contentJson: Record<string, unknown>; createdAt: string }[];
  count: number;
}
```

## KB_TOOL_REGISTRY
A `Record<string, KBToolFn>` that maps tool names to their implementations for programmatic lookup. Contains all 6 tools.

## Per-Agent Access (AGENT_KB_TOOL_ACCESS)

| Agent                        | Accessible Tools                                                         |
|------------------------------|--------------------------------------------------------------------------|
| research-agent               | None (facts from external sources only)                                  |
| business-architect-agent     | getDecisions, getDesignRules                                             |
| requirements-engineer-agent  | getApprovedRequirements, getRejectedAssumptions                          |
| strategy-funnel-agent        | getDesignRules, getDecisions                                             |
| copy-messaging-agent         | getDesignRules                                                           |
| automation-crm-agent         | getDesignRules                                                           |
| ux-design-agent              | getDesignRules                                                           |
| quality-control-agent        | All 5 approved tools + getReviews (getApprovedRequirements, getApprovedAssumptions, getDecisions, getDesignRules, getReviews) |

**Key exception:** The requirements-engineer-agent has access to `getRejectedAssumptions` so it can understand why previous assumptions were rejected when iterating on requirements. All other agents are restricted to approved entries only.

## Pre-Loading: loadKBForAgent()

`loadKBForAgent(store, agentId, projectId)` returns a `KBLoadResult`:

```typescript
{
  success: boolean;
  blockReason?: string;
  data: Record<string, KBToolResult>;
}
```

Behavior:
- **Agents without KB access** (e.g., research-agent with empty tool list) — Returns `{ success: true, data: {} }`. The call succeeds but provides no data.
- **Agents requiring KB data** (requirements-engineer, quality-control) — BLOCK if required tools return empty results (e.g., no approved requirements).
- **All other agents with KB access** — Succeed even if no data is found. Empty results are acceptable.

## Telemetry
Tool usage is logged via `logToolUsage()`, which calls `recordTaskRun` with:
- `taskType`: `kb-tool:<toolName>` (e.g., `kb-tool:getApprovedRequirements`)
- `model`: `'mock'`
- `tokens`: `0`
- `metadata`: `{ toolName, resultCount, agentId, projectId }`

## Design Decisions
- **MCP-style, not full MCP** — The tools follow MCP conventions (stateless, typed, registry-based) but do not implement the full MCP protocol.
- **Pre-load pattern** — Agents do not query the KB directly. Instead, `loadKBForAgent()` pre-loads all relevant data before the agent runs. This keeps agents focused on their task and simplifies the query surface.
- **Stateless pure functions** — Every tool is a pure function of its inputs. No side effects, no caching, no shared state. This makes testing straightforward.
- **Token-efficient payloads** — Only `id`, `contentJson`, and `createdAt` are included in results. Fields like `projectId`, `type`, `source`, and `status` are stripped because the caller already knows them from the query context.
- **getRejectedAssumptions exception** — The requirements-engineer-agent needs rejected assumption data to iterate effectively. This is the only exception to the "approved entries only" access rule.
