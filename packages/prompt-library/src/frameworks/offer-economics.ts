/**
 * Offer Economics Framework
 * Based on Alex Hormozi's Value Equation from "$100M Offers"
 *
 * Value = (Dream Outcome × Perceived Likelihood of Achievement) /
 *         (Time Delay × Effort & Sacrifice)
 *
 * Version: 1.0.0
 */

import type { FrameworkBlock } from '../types.js';

export const OFFER_ECONOMICS_FRAMEWORK: FrameworkBlock = {
  name: 'Offer Economics',
  content: `## OFFER ECONOMICS (Hormozi Value Equation)

### The Value Equation
Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice)

To INCREASE value, you must:
1. **Increase Dream Outcome** - Make the end result more desirable
2. **Increase Perceived Likelihood** - Add proof, guarantees, specificity
3. **Decrease Time Delay** - Speed up time to first result
4. **Decrease Effort & Sacrifice** - Remove friction, do the work for them

### Offer Construction Rules

**Dream Outcome Amplification:**
- Name the specific, tangible result (not vague benefits)
- Quantify where possible (revenue, time saved, percentage improvement)
- Connect to deeper emotional desires (status, security, freedom)

**Likelihood Boosters:**
- Case studies with specific numbers
- Risk reversal (guarantees that exceed expectations)
- Social proof from similar prospects
- Demonstrate competence through specificity

**Time Delay Reducers:**
- Quick wins within first 24-48 hours
- Milestone markers showing progress
- "Speed of implementation" bonuses

**Effort Reducers:**
- Done-for-you components
- Templates, scripts, and swipe files
- Automation of manual tasks
- Concierge onboarding

### Pricing Psychology
- Price anchoring: Show the value gap (worth £X, costs £Y)
- Stack the value: List every component separately
- Bonuses should solve adjacent problems
- Guarantee should remove ALL risk from buyer

### Output Requirements
When creating offers, ALWAYS specify:
- The exact dream outcome in measurable terms
- At least 3 likelihood boosters
- Time to first result
- What effort is removed from the buyer`,
  priority: 10,
};

export const OFFER_ECONOMICS_VERSION = '1.0.0';
