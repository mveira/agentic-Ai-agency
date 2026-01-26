# System Architecture

## Repository Layout

agency-agents/
├── apps/
│   ├── api/          # Orchestrator + webhooks + execution
│   ├── cms/          # Strapi (frameworks, agent configs)
│   └── dashboard/    # Agency + client portal
├── packages/
│   ├── agent-core/   # Agent contracts, execution rules
│   ├── telemetry/    # Token + cost tracking
│   └── prompt-library/ # Reusable frameworks (Hormozi, persuasion)
├── progress/         # Persistent memory
├── docs/             # System documentation
├── CLAUDE.md         # Execution constitution

Sibling Repos:
- agency-questions (known unknowns)
- agency-skills (future reusable runbooks)

---

## High-Level Flow
CRM Event → Webhook → Governance Check → Agent Decision →
QC Validation → Action Execution (or Dry-Run) → Logging + Telemetry → Portal
