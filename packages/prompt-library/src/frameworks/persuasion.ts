/**
 * Persuasion Framework
 * Combines PAS, AIDA, and proof hierarchy for compelling copy
 *
 * Version: 1.0.0
 */

import type { FrameworkBlock } from '../types.js';

export const PERSUASION_FRAMEWORK: FrameworkBlock = {
  name: 'Persuasion',
  content: `## PERSUASION FRAMEWORKS

### PAS (Problem-Agitate-Solve)

**P - Problem**
- State the problem clearly and specifically
- Use the prospect's exact language
- Make them feel understood

**A - Agitate**
- Amplify the emotional impact
- Show consequences of inaction
- Create urgency through pain
- "What happens if this continues?"

**S - Solve**
- Present your solution as the relief
- Connect solution directly to agitated pain
- Make the path clear and simple

### AIDA (Attention-Interest-Desire-Action)

**A - Attention**
- Pattern interrupt or curiosity hook
- Bold claim or surprising statistic
- Max 7 words for headlines

**I - Interest**
- Expand on the hook with relevance
- "Here's why this matters to you..."
- Build credibility quickly

**D - Desire**
- Paint the after state vividly
- Stack benefits emotionally
- Use future pacing ("Imagine when...")

**A - Action**
- Single, clear CTA
- Remove friction
- Add urgency (real, not fake)

### Proof Hierarchy (Strongest to Weakest)

1. **Demonstration** - Show it working live
2. **Documentation** - Screenshots, recordings, data
3. **Case Studies** - Specific client results with numbers
4. **Testimonials** - Named individuals with credentials
5. **Social Proof** - Numbers (users, revenue, years)
6. **Credentials** - Certifications, awards, media
7. **Guarantees** - Risk reversal
8. **Logic** - Reasoning and explanations

**RULE: Always use the strongest proof available**

### Objection Handling Framework

For every claim, preemptively address:
1. "I don't believe you" → Add proof
2. "I don't need it" → Agitate problem
3. "It won't work for me" → Show similar cases
4. "I can't afford it" → Reframe value, offer payment
5. "I don't have time" → Show time investment vs. return
6. "I need to think about it" → Add urgency, reduce risk

### Output Requirements
When creating persuasive content:
- Specify which framework (PAS or AIDA) and why
- Include at least 2 proof types from the hierarchy
- Address top 2 likely objections`,
  priority: 20,
};

export const PERSUASION_VERSION = '1.0.0';
