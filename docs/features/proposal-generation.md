# Build Pipeline

## Trigger
Requirements have been confirmed and populated in the Knowledge Base. The project is ready for the build pipeline.

## Flow Steps
1. Governance checks verify that confirmed requirements exist in the KB and all assumptions are resolved.
2. The BuildOrchestrator coordinates the pipeline in sequence:
   - **StrategyFunnelAgent** defines the funnel and conversion strategy (produces MarketingBlueprint).
   - **UXDesignAgent** translates the blueprint into screen layouts and component specs (produces UXUISpec).
   - **CopyMessagingAgent** writes copy for all funnel stages (produces CopyPack).
   - **QualityControlAgent** reviews all outputs for framework compliance and can block the pipeline.
3. Mode B enforcement: optional enhancements are separated from core deliverables.
4. Tool usage is logged via telemetry with the `kb-tool:` prefix.
5. The build plan is assembled with core and optional sections.

## Agents Involved
- **StrategyFunnelAgent** — Defines funnel and conversion strategy.
- **UXDesignAgent** — Handles UX and design deliverables.
- **CopyMessagingAgent** — Handles copy and messaging deliverables.
- **QualityControlAgent** — Reviews all output for quality and compliance.

## Approval Points
- Requirements must be confirmed in the KB before the build pipeline can begin.
- QualityControlAgent can block the build pipeline if violations are found.
- Optional enhancements require separate client approval.

## Failure Handling
- **No confirmed requirements in KB** — The pipeline BLOCKS. Build cannot proceed without confirmed requirements.
- **Budget exceeded** — The flow is blocked by the budget execution guard.
- **QC violations** — The build pipeline is blocked until violations are resolved.
- **Schema validation failure** — Each handoff validates output schema; failures halt the pipeline.
