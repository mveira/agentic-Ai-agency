# Future Upgrades Roadmap

> Living document. Append-only — do not delete entries, mark them DONE.

## Status Key

| Status     | Meaning                              |
|------------|--------------------------------------|
| **IDEA**   | Captured but not yet scoped          |
| **PLANNED**| Scoped and sequenced for build       |
| **IN BUILD**| Currently being implemented         |
| **DONE**   | Shipped and verified                 |

---

## Infrastructure & Eventing

| Upgrade | Status | Notes |
|---------|--------|-------|
| DB-backed job queue (custom EventStore) | DONE | Custom event bus with InMemoryEventStore + Drizzle schema. Full lifecycle with retries, DLQ, idempotency. |
| SQS / Redis Streams migration | IDEA | Replace DB queue when throughput requires dedicated message broker. Only after DB queue proves bottleneck. |
| Edge caching for prompt templates | IDEA | Cache compiled prompts at CDN edge to reduce cold-start latency. |
| Horizontal scaling (multiple API instances) | IDEA | Requires queue-based execution (DB or SQS) to be in place first. |

---

## Auth

| Upgrade | Status | Notes |
|---------|--------|-------|
| Invitation system (agency invites client users) | PLANNED | Agency admin sends magic-link invite; auto-creates org membership on first login. |
| Optional password login | IDEA | Some clients prefer password auth. Add as alternative to magic link, not replacement. |
| Role-based dashboard permissions | IDEA | View-only vs editor vs admin roles within an org. |
| SSO / SAML for enterprise clients | IDEA | Required for larger agency clients with IT policies. |

---

## Portal UI/UX

| Upgrade | Status | Notes |
|---------|--------|-------|
| Design system pass (tokens, spacing, color) | PLANNED | Standardize Tailwind tokens, component library, dark mode support. |
| Diagram export (build plan → PDF/PNG) | PLANNED | Export build plan as visual diagram for client presentations. |
| Real-time build progress (SSE/WebSocket) | IDEA | Stream pipeline step completion to dashboard during build execution. |
| Client-facing approval portal | IDEA | Standalone view for clients to approve/reject optional enhancements without full dashboard access. |

---

## Agents

| Upgrade | Status | Notes |
|---------|--------|-------|
| BuildOrchestrator auto-task generation | PLANNED | Generate dev tasks directly from build plan screens with acceptance criteria pre-filled. |
| Exact-match prompt caching | PLANNED | Cache identical prompt compilations to skip redundant LLM calls. Hash prompt + input → cache lookup. |
| Optional enhancements approval flow | PLANNED | Full UI flow for client to review, approve, or reject optional enhancements from build plan. |
| Agent retry with backoff | IDEA | Automatic retry on transient LLM failures with exponential backoff. |
| Multi-model fallback routing | IDEA | If primary model is unavailable, fall back to secondary model per agent contract. |
| Streaming agent output | IDEA | Stream partial results during long agent runs for better UX. |

---

## Integrations

| Upgrade | Status | Notes |
|---------|--------|-------|
| GHL → Next.js form migration | PLANNED | Auto-generate Next.js form components from GHL form definitions. |
| Shopify integration | IDEA | Read product catalog, generate landing pages for e-commerce clients. |
| Additional CRMs (HubSpot, Salesforce) | IDEA | Extend adapter pattern beyond GHL. Each CRM gets its own adapter implementing shared interface. |
| Zapier / Make webhook triggers | IDEA | Allow external automation platforms to trigger agent runs. |

---

## Observability

| Upgrade | Status | Notes |
|---------|--------|-------|
| Cost alerts (per-project thresholds) | PLANNED | Alert when project spend exceeds configurable threshold. Uses existing telemetry data. |
| Token savings dashboard | PLANNED | Visualize prompt caching hit rates, token savings, cost reduction over time. |
| Agent performance benchmarks | IDEA | Track agent output quality scores over time, identify regression. |
| Distributed tracing (OpenTelemetry) | IDEA | Full request tracing across API → orchestrator → agents → LLM calls. |

---

## Governance

| Upgrade | Status | Notes |
|---------|--------|-------|
| Requirements diff viewer | PLANNED | Side-by-side diff when requirements version changes, highlighting what changed for re-approval. |
| Not-a-fit rules engine | PLANNED | Configurable rules that auto-reject projects that don't meet minimum criteria (budget, scope, timeline). |
| Assumption audit trail | IDEA | Full history of assumption changes with who approved/rejected and when. |
| Compliance export (SOC 2 / GDPR) | IDEA | Export governance data in compliance-friendly format. |

---

## Knowledge Base

| Upgrade | Status | Notes |
|---------|--------|-------|
| Vector search / embeddings | PLANNED | Optional accelerator — never source of truth. Add semantic search over KB entries using embeddings. Enables natural-language queries against approved requirements, assumptions, and decisions. No vector DB selected yet — evaluate pgvector, Pinecone, or Weaviate. The structured query system remains the authoritative access path. |
| KB persistence (database-backed) | DONE | knowledge_entries Drizzle table added. InMemoryKnowledgeStore kept for tests. |
| KB entry versioning | IDEA | Track individual entry edits beyond supersede. Full audit trail per entry. |
| Cross-project KB patterns | IDEA | Identify common patterns across projects for template generation. |

---

## Notes

<!-- Append-only: add new notes below this line -->

- 2026-01-26: Initial roadmap created from Week 5 retrospective. DB-backed queue is the critical next infrastructure upgrade before any horizontal scaling.
