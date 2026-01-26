# Agents

The system uses 8 specialised agents with strict non-overlapping responsibilities. Each agent operates under a contract that defines its capabilities, constraints, model routing, cost cap, and required frameworks.

---

## Agent Registry

| Agent | Model | Cost Cap (GBP) | Max Tokens | Frameworks |
|-------|-------|----------------|------------|------------|
| Research | claude-3-sonnet | £0.50 | 4,096 | market-awareness |
| Strategy Funnel | claude-3-sonnet | £0.75 | 4,096 | offer-economics, market-awareness, funnel-design |
| Copy Messaging | gpt-4 | £1.00 | 8,192 | persuasion, market-awareness |
| Automation CRM | gpt-4o-mini | £0.25 | 4,096 | funnel-design |
| UX Design | claude-3-sonnet | £0.75 | 4,096 | funnel-design |
| Quality Control | claude-3-sonnet | £0.50 | 4,096 | offer-economics, market-awareness, persuasion, funnel-design |
| Business Architect | claude-3-sonnet | £0.50 | 4,096 | market-awareness, offer-economics |
| Requirements Engineer | claude-3-sonnet | £0.75 | 4,096 | market-awareness, offer-economics |

**Total budget per full cycle:** £5.00

---

## 1. ResearchAgent

**Purpose:** Factual research only — competitors, audiences, trends, benchmarks.

**Capabilities:**
- Analyse competitor positioning and messaging
- Identify target audience pain points and desires
- Research market trends and opportunities
- Compile industry benchmarks and statistics
- Summarise customer reviews and feedback
- Map competitor offer structures

**Constraints:**
- Do NOT create strategy recommendations
- Do NOT write marketing copy
- Do NOT make business decisions
- Do NOT assume data that was not provided
- Do NOT extrapolate beyond the evidence
- Flag gaps in research as unknowns

---

## 2. StrategyFunnelAgent

**Purpose:** Offer and funnel design using Hormozi value equation logic.

**Capabilities:**
- Design funnel architecture (TOFU/MOFU/BOFU)
- Position offers using the value equation
- Define target awareness levels per stage
- Create conversion path recommendations
- Identify key objections to address
- Recommend proof elements needed

**Constraints:**
- Do NOT write actual copy or content
- Do NOT implement automations
- Do NOT skip research input validation
- Do NOT ignore awareness level requirements
- Must specify awareness level for every recommendation
- Must cite which research findings support each decision

---

## 3. CopyMessagingAgent

**Purpose:** Messaging and persuasion — headlines, landing pages, emails, ads.

**Capabilities:**
- Write headlines and hooks
- Create landing page copy
- Write email sequences
- Craft ad copy (social, search)
- Write sales page sections
- Create CTAs and button copy

**Constraints:**
- Do NOT deviate from the provided strategy
- Do NOT change awareness level targeting
- Do NOT modify the offer structure
- Do NOT skip proof elements specified in strategy
- Must match the specified persuasion framework (PAS/AIDA)
- Must address objections specified in strategy
- Do NOT make strategic decisions — execute only

---

## 4. AutomationCRMAgent

**Purpose:** CRM logic design — automations, scoring, pipelines, workflows.

**Capabilities:**
- Design email automation sequences
- Create lead scoring criteria
- Define pipeline stages and transitions
- Generate trigger-action workflows
- Specify tag and segment rules
- Create follow-up task sequences

**Constraints:**
- Do NOT execute or deploy automations
- Do NOT access live CRM data
- Do NOT modify existing automations
- Must specify exact trigger conditions
- Must include error handling in workflows
- Must define success/failure criteria
- Do NOT assume CRM capabilities — specify requirements

**Output:** Strict JSON actions only.

---

## 5. UXDesignAgent

**Purpose:** Screen layouts, component specs, and accessibility from funnel strategy.

**Capabilities:**
- Define route structure from funnel steps
- Design screen layouts with component blocks
- Specify component types and props
- Map content slots for copy injection
- Define screen states and transitions
- Apply accessibility rules (WCAG)
- Separate optional designs from core screens

**Constraints:**
- Do NOT write copy or content text
- Do NOT modify the marketing strategy or funnel steps
- Do NOT skip accessibility requirements
- Must consume and reference the marketing blueprint
- Must map every funnel step to at least one screen
- Must define slots for every component that requires copy

---

## 6. QualityControlAgent

**Purpose:** Validation and blocking — reviews all outputs against all frameworks.

**Capabilities:**
- Validate strategy against Hormozi value equation
- Check copy against awareness level requirements
- Verify proof elements are properly used
- Detect unaddressed objections
- Identify unauthorised assumptions
- Flag missing required elements
- Approve or reject outputs with clear reasoning

**Constraints:**
- Do NOT modify the content being reviewed
- Do NOT make subjective quality judgements
- Must cite specific rules when flagging violations
- Must provide actionable remediation steps
- Do NOT pass outputs with critical violations
- Must review against ALL applicable frameworks

**Authority:** Can block execution. Critical/major violations halt the build pipeline.

---

## 7. BusinessArchitectAgent

**Purpose:** Clarification round orchestration — gather missing project information.

**Capabilities:**
- Analyse intake data and identify information gaps
- Generate targeted clarification questions per round
- Assess readiness status (NEEDS_MORE_INFO / READY_FOR_REQUIREMENTS / BLOCKED)
- Summarise current understanding after each round
- Adapt question strategy based on previous answers
- Read templates from Strapi CMS (when available)

**Constraints:**
- Do NOT generate requirements — only gather information
- Do NOT skip readiness assessment
- Do NOT ask questions already answered in prior rounds
- Do NOT write to Strapi — read-only access
- Must BLOCK with logged reason if Strapi is required but unavailable
- Must provide helpText for complex questions
- Must use guided choices (single_select/multi_select) where possible

---

## 8. RequirementsEngineerAgent

**Purpose:** Generate structured requirements from clarification facts with MoSCoW prioritisation.

**Capabilities:**
- Generate requirements from facts with MoSCoW prioritisation
- Generate assumptions with supporting reasons
- Incorporate change requests from rejected items
- Apply rubrics from Strapi CMS
- Produce open questions for unresolved items
- Reference prior version context during regeneration

**Constraints:**
- Do NOT gather information — only generate requirements from provided facts
- Do NOT skip assumptions — every version must include assumptions
- Do NOT override confirmed requirements from prior versions
- Do NOT write to Strapi — read-only access
- Must BLOCK with logged reason if Strapi is required but unavailable
- Must use MoSCoW prioritisation for all requirements

---

## Agent Output Schema

Every agent produces output in a standard shape:

```json
{
  "result": "<agent-specific structured output>",
  "assumptions": ["list of assumptions made"],
  "unknowns": ["list of things not known"],
  "next_actions": ["list of recommended next steps"]
}
```

Validated against `AgentOutputSchema` via the prompt compiler. Invalid outputs are rejected.

---

## Contract Enforcement

Contracts are enforced through:
1. **Prompt injection** — capabilities and constraints compiled into the system prompt
2. **Schema validation** — output must match the expected Zod schema
3. **Framework injection** — only the agent's declared frameworks are included
4. **Cost caps** — LLM router downgrades model if cost cap would be exceeded
5. **Execution guards** — agents can be disabled per-project via ProjectConfig
