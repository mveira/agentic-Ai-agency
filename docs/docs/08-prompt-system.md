# Prompt System

The prompt system assembles multi-source prompts with deterministic versioning, injects marketing frameworks per agent contract, and routes requests to optimal LLM providers.

---

## Prompt Compiler

The `compilePrompt()` function assembles 6 sections into a single prompt:

```
1. Global Rules        — universal constraints for all agents
2. Agent Contract      — capabilities, constraints, token limit
3. Framework Blocks    — prioritised marketing/strategy frameworks
4. Task Definition     — current task, project ID, context
5. Known Unknowns      — questions to surface
6. Output Schema       — required JSON structure
```

Sections are joined with `\n\n---\n\n` delimiters.

### Prompt Hashing

Every compiled prompt gets a SHA256 hash (first 16 characters). This enables:
- Deduplication of identical prompts
- Audit trail linking prompts to outputs
- Cache key for repeated executions

### Output Validation

`validateAgentOutput()` extracts JSON from the LLM response (handles markdown fences or raw JSON) and validates against `AgentOutputSchema`:

```json
{
  "result": "<agent-specific output>",
  "assumptions": ["string[]"],
  "unknowns": ["string[]"],
  "next_actions": ["string[]"]
}
```

---

## Frameworks

Four marketing/strategy frameworks are injected into agent prompts based on their contract declarations.

### Offer Economics
**Based on:** Alex Hormozi's Value Equation

```
Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice)
```

Strategies:
- **Increase Dream Outcome** — tangible, quantified, emotionally connected results
- **Increase Perceived Likelihood** — case studies, guarantees, social proof, specificity
- **Decrease Time Delay** — quick wins (24-48 hrs), milestone markers
- **Decrease Effort** — done-for-you, templates, automation, concierge onboarding

**Used by:** StrategyFunnelAgent, QualityControlAgent, BusinessArchitectAgent, RequirementsEngineerAgent

### Market Awareness
**Based on:** Eugene Schwartz's 5 Awareness Levels

| Level | Strategy | Lead With | Avoid |
|-------|----------|-----------|-------|
| 1. Unaware | Curiosity, pattern interrupt | Story, intrigue | Product features |
| 2. Problem Aware | Agitate pain | Problem empathy | Solutions |
| 3. Solution Aware | Differentiate | Mechanism, "new way" | Direct pitch |
| 4. Product Aware | Overcome objections | Proof, benefits | Basic education |
| 5. Most Aware | Direct offer | Offer, exclusivity | Long explanations |

**Used by:** ResearchAgent, StrategyFunnelAgent, CopyMessagingAgent, QualityControlAgent, BusinessArchitectAgent, RequirementsEngineerAgent

### Persuasion
**PAS Method:** Problem → Agitate → Solve
**AIDA Method:** Attention → Interest → Desire → Action

**Proof Hierarchy (strongest to weakest):**
1. Demonstration (live)
2. Documentation (screenshots, data)
3. Case Studies (specific client results)
4. Testimonials (named individuals)
5. Social Proof (numbers)
6. Credentials (certifications)
7. Guarantees (risk reversal)
8. Logic (reasoning)

**Used by:** CopyMessagingAgent, QualityControlAgent

### Funnel Design
**Core Principles:** One goal per page, minimum form fields, message match, mobile-first.

| Stage | Goal | Content | CTA |
|-------|------|---------|-----|
| TOFU | Awareness | Educational | Low commitment (watch, read) |
| MOFU | Consideration | Case studies, webinars | Medium (register, schedule) |
| BOFU | Decision | Offers, demos, trials | High commitment (buy, book) |

**Landing Page Structure:** Hero → Problem → Solution → Proof → Offer → CTA

**Used by:** StrategyFunnelAgent, AutomationCRMAgent, UXDesignAgent, QualityControlAgent

---

## Global Rules

Applied to every agent via the prompt compiler:

- **All agents:** No assumptions without flagging, valid JSON output, never expose secrets, prioritise correctness, be concise, track assumptions/unknowns
- **Client-facing:** Professional language, no jargon, actionable recommendations, confidentiality
- **Code-generation:** Follow project style, error handling, self-documenting, no hardcoded secrets
- **Data-processing:** Validate inputs, handle malformed data, preserve integrity, log anomalies

Rules are fetched by category via `getRulesByCategory()`.

---

## LLM Router

The `LLMRouter` selects the optimal model for each agent request based on capability requirements, cost constraints, and provider availability.

### Model Tiers

```
Tier 1 (highest): claude-3-opus, gpt-4-turbo
Tier 2 (default): claude-3-sonnet, gpt-4, gpt-4o
Tier 3 (budget):  claude-3-haiku, gpt-4o-mini, gpt-3.5-turbo
```

### Routing Logic

```
1. Look up agent's assigned model
2. Estimate cost (tokens × model pricing)
3. If within cost cap → use assigned model
4. If over cap → walk downgrade path
5. If no same-provider option → try cross-provider fallback
6. If nothing works → use default model
```

### Downgrade Paths

```
claude-3-opus → claude-3-sonnet → claude-3-haiku
gpt-4-turbo → gpt-4 → gpt-4o → gpt-4o-mini
```

### Cross-Provider Fallbacks

```
claude-3-sonnet ↔ gpt-4
claude-3-haiku ↔ gpt-4o-mini
```

### Route Result

```typescript
{
  model: string;        // Selected model
  adapter: LLMAdapter;  // Provider adapter instance
  downgraded: boolean;  // True if cost-forced downgrade
  reason?: string;      // Explanation for routing decision
}
```

### Convenience Methods

- `route(params)` — returns routing decision without executing
- `complete(params)` — routes and executes in one call
- `getModelForAgent(agentId)` — lookup from `AGENT_MODEL_ROUTING`
- `getCostCapForAgent(agentId)` — lookup from `AGENT_COST_CAPS`

---

## Framework Assignment

| Framework | Agents |
|-----------|--------|
| offer-economics | StrategyFunnel, QualityControl, BusinessArchitect, RequirementsEngineer |
| market-awareness | Research, StrategyFunnel, CopyMessaging, QualityControl, BusinessArchitect, RequirementsEngineer |
| persuasion | CopyMessaging, QualityControl |
| funnel-design | StrategyFunnel, AutomationCRM, UXDesign, QualityControl |

QualityControlAgent receives all 4 frameworks because it validates outputs from every other agent.
