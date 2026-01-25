/**
 * Market Awareness Framework
 * Based on Eugene Schwartz's "Breakthrough Advertising" awareness levels
 *
 * Version: 1.0.0
 */

import type { FrameworkBlock } from '../types.js';

export const MARKET_AWARENESS_FRAMEWORK: FrameworkBlock = {
  name: 'Market Awareness',
  content: `## MARKET AWARENESS (Schwartz Awareness Levels)

### The 5 Awareness Stages

**1. UNAWARE**
- Prospect doesn't know they have a problem
- Strategy: Lead with curiosity, pattern interrupt, or story
- Headlines: Intrigue-based, not solution-based
- Example: "The hidden reason your ads stopped working..."

**2. PROBLEM AWARE**
- Knows the problem, doesn't know solutions exist
- Strategy: Agitate the problem, show consequences of inaction
- Headlines: Problem-focused, empathy-driven
- Example: "Struggling to get clients? Here's why..."

**3. SOLUTION AWARE**
- Knows solutions exist, doesn't know YOUR solution
- Strategy: Differentiate, show unique mechanism
- Headlines: Mechanism-focused, "new way" framing
- Example: "The 3-step system that books 10 calls/week"

**4. PRODUCT AWARE**
- Knows your product, hasn't bought yet
- Strategy: Overcome objections, add urgency, social proof
- Headlines: Benefit-stacking, objection-handling
- Example: "Join 500+ agencies using our AI system"

**5. MOST AWARE**
- Bought before or ready to buy
- Strategy: Best offer, direct CTA, exclusivity
- Headlines: Offer-focused, direct
- Example: "50% off ends tonight"

### Content Matching Rules

**CRITICAL: Match content sophistication to awareness level**

| Awareness | Lead With | Avoid |
|-----------|-----------|-------|
| Unaware | Story, curiosity | Product features |
| Problem | Pain, consequences | Solutions |
| Solution | Mechanism, differentiation | Direct pitch |
| Product | Proof, objection handling | Basic education |
| Most | Offer, urgency | Long explanations |

### Awareness Detection

Before creating ANY content, determine:
1. Where does the target audience sit on the awareness scale?
2. What triggered their current search/engagement?
3. What objections exist at their awareness level?

### Output Requirements
When creating content, ALWAYS specify:
- Target awareness level (1-5)
- Why you chose that level
- The specific hook strategy for that level`,
  priority: 15,
};

export const MARKET_AWARENESS_VERSION = '1.0.0';
