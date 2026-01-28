# Build Pipeline (Proposal Generation)

## Purpose
Execute the 4-step build pipeline to produce marketing strategy, UX specifications, copy, and quality validation from confirmed requirements, delivering a complete build plan with core and optional deliverables.

## Handbook Alignment
- Stage 6: Knowledge Base Population (prerequisite)
- Stage 7: Build Pipeline
- Stage 8: Quality Control & Review

## Trigger
Requirements have been confirmed and populated in the Knowledge Base. The project is ready for the build pipeline.

## Inputs
- Confirmed requirements from KB (via getApprovedRequirements)
- Approved assumptions from KB (via getApprovedAssumptions)
- Build request (type, goal, constraints)
- Marketing frameworks (Hormozi, Schwartz, PAS/AIDA, Funnel Design)

## Outputs
- MarketingBlueprint (StrategyFunnelAgent)
- UXUISpec (UXDesignAgent)
- CopyPack (CopyMessagingAgent)
- QCReport (QualityControlAgent)
- Assembled BuildPlan with core and optional sections
- Telemetry entries for each pipeline step

## Allowed Actions
- Invoke 4 agents in sequence: StrategyFunnel → UXDesign → CopyMessaging → QualityControl
- Query KB via MCP-style tools (read-only)
- Validate output schemas at each handoff
- Separate optional enhancements from core (Mode B enforcement)
- Log telemetry for each step
- Return blocked status if QC fails

## Forbidden Actions
- Executing build without confirmed requirements in KB
- Executing build without approved assumptions
- Skipping any of the 4 pipeline steps
- Modifying KB entries (read-only access)
- Ignoring QC violations
- Proceeding past budget limits

## UI/UX Summary
- API-driven (no direct portal page for build)
- Build results rendered in project dashboard
- Optional enhancements displayed with separate approval controls
- QC violations shown with severity and remediation notes

## Flow Steps
1. Governance checks verify that confirmed requirements exist in the KB and all assumptions are resolved
2. The BuildOrchestrator coordinates the pipeline in sequence:
   - **StrategyFunnelAgent** defines the funnel and conversion strategy (produces MarketingBlueprint)
   - **UXDesignAgent** translates the blueprint into screen layouts and component specs (produces UXUISpec)
   - **CopyMessagingAgent** writes copy for all funnel stages (produces CopyPack)
   - **QualityControlAgent** reviews all outputs for framework compliance and can block the pipeline
3. Mode B enforcement: optional enhancements are separated from core deliverables
4. Tool usage is logged via telemetry with the `kb-tool:` prefix
5. The build plan is assembled with core and optional sections

## Failure Modes
| Failure | Behaviour | Recovery |
|---------|-----------|----------|
| No confirmed requirements in KB | Pipeline BLOCKS | Complete requirements flow first |
| Assumptions not approved | Pipeline BLOCKS | Complete assumption approval |
| Budget exceeded | Pipeline BLOCKS | Escalate to human |
| QC violations (critical/major) | Pipeline BLOCKS | Resolve violations, retry |
| Schema validation failure | Step halts, error logged | Fix agent output, retry |
| LLM failure at any step | Pipeline halts | Retry with backoff |

## Escalation Rules
- QC blocks the pipeline → human must review violations and approve override or fix
- Budget at risk → escalate before proceeding
- Multiple pipeline failures → escalate for root cause analysis
- Optional enhancements exceed budget allocation → escalate

## Cost Considerations
- StrategyFunnelAgent: cost cap £0.75
- UXDesignAgent: cost cap £0.75
- CopyMessagingAgent: cost cap £1.00
- QualityControlAgent: cost cap £0.50
- Total pipeline cost: up to £3.00 per full run
- Cost-forced model downgrades may affect output quality

## Logging & Audit
- Each step produces a TelemetryEntry (step, agentId, durationMs, tokens, cost, model)
- All entries collected in buildPlan.telemetry
- KB tool calls logged with `kb-tool:` prefix
- QC violations logged with severity and details
- Action telemetry tracks GHL action outcomes

## API Endpoints
- `POST /api/projects/:id/build/plan` — Execute the full 4-step build pipeline
- `POST /api/projects/:id/build/approve-enhancement` — Approve or reject an optional enhancement
