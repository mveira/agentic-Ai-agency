# UXDesignAgent

## Purpose

The UXDesignAgent produces screen layouts, component specifications, route structures, and accessibility requirements for the project's digital interfaces. It consumes the funnel blueprint and translates each funnel step into concrete screen definitions with content slots, component types, and interaction states. It enforces WCAG accessibility standards and optionally separates design concerns for downstream handoff to design tools or developers.

## Inputs (read-only)

- Funnel architecture and blueprint from the StrategyFunnelAgent (stages, conversion paths, awareness levels).
- Project brief describing the product, target audience, and platform requirements.
- Design rules from the knowledge base (via `getDesignRules`).

## Outputs

- Route structure (URL hierarchy, page relationships, navigation flow).
- Screen layouts per funnel step (wireframe-level structure, not pixel-perfect designs).
- Component type specifications (hero blocks, form components, testimonial carousels, CTA buttons, nav elements).
- Content slot definitions (where copy, images, video, and proof elements are placed on each screen).
- Screen state definitions (loading, empty, error, success, authenticated, unauthenticated).
- WCAG accessibility annotations (contrast requirements, focus order, ARIA labels, keyboard navigation, alt text requirements).
- Optional design separation outputs (design tokens, spacing scales, typography scales) for handoff.

All outputs conform to the standard schema: `result`, `assumptions`, `unknowns`, `next_actions`.

## Restrictions

- No copywriting — the agent defines content slots and placeholder labels, not final copy.
- No strategy modification — the agent implements the funnel blueprint as given; it does not alter funnel stages, awareness levels, or conversion paths.
- No skipping accessibility — every screen must include WCAG accessibility annotations. Screens without accessibility specifications are rejected.
- Must consume the funnel blueprint as its primary structural input. Screens that do not trace back to a funnel step must be justified in `assumptions`.
- Must map every funnel step to at least one screen. Unmapped funnel steps must be flagged in `unknowns`.

## Failure Modes

- Blocks if the funnel blueprint is missing or incomplete.
- Fails if design rules cannot be retrieved from the knowledge base (getDesignRules unavailable).
- Fails if funnel steps cannot be mapped to screen definitions due to insufficient detail.
- Flags `unknowns` when platform-specific constraints are unknown (e.g., mobile vs. desktop breakpoints).
- Flags `assumptions` when component choices are made without explicit design rule guidance.

## Approval Gates

- Funnel strategy must be approved and available before this agent is invoked.
- Design rules must be accessible in the knowledge base via `getDesignRules`.
- Output may be subject to Quality Control review for framework compliance (funnel-design) and accessibility completeness.

## KB Access

- **getDesignRules** — Reads design rules from the knowledge base including spacing, typography, colour, component standards, and accessibility requirements. Read-only access.
