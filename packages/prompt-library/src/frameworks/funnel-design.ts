/**
 * Funnel Design Framework
 * UX principles and CTA rules for conversion optimization
 *
 * Version: 1.0.0
 */

import type { FrameworkBlock } from '../types.js';

export const FUNNEL_DESIGN_FRAMEWORK: FrameworkBlock = {
  name: 'Funnel Design',
  content: `## FUNNEL DESIGN FRAMEWORK

### Core Funnel Principles

**1. One Goal Per Page**
- Every page has ONE primary action
- Remove competing CTAs
- If it doesn't support the goal, remove it

**2. Friction Reduction**
- Minimum fields on forms (name, email, phone max)
- Progress indicators for multi-step
- Auto-fill where possible
- Mobile-first design

**3. Continuity**
- Message match: Ad → Landing Page → Thank You
- Visual consistency throughout
- Expectation setting (what happens next)

### Funnel Stage Requirements

**Top of Funnel (TOFU) - Awareness**
- Goal: Capture attention, build curiosity
- Content: Educational, value-first
- CTA: Low commitment (watch, read, download)
- Metrics: Reach, engagement, click-through

**Middle of Funnel (MOFU) - Consideration**
- Goal: Build trust, demonstrate expertise
- Content: Case studies, webinars, detailed guides
- CTA: Medium commitment (register, schedule, apply)
- Metrics: Leads, engagement time, return visits

**Bottom of Funnel (BOFU) - Decision**
- Goal: Convert to customer
- Content: Offers, demos, trials, consultations
- CTA: High commitment (buy, book, enroll)
- Metrics: Conversion rate, revenue, CAC

### CTA Rules

**Button Copy:**
- Use action verbs (Get, Start, Join, Claim)
- Specify the outcome, not the action
- Bad: "Submit" | Good: "Get My Free Guide"
- Add urgency where genuine

**Button Placement:**
- Above the fold for primary CTA
- After each major section
- Fixed/sticky on mobile
- Minimum 44px tap target

**Button Design:**
- High contrast with background
- Consistent color throughout funnel
- Whitespace around button
- Loading state for submissions

### Landing Page Structure

1. **Hero Section**
   - Headline (benefit-driven)
   - Subheadline (mechanism or proof)
   - Primary CTA
   - Hero image/video

2. **Problem Section**
   - Agitate the pain
   - Show understanding

3. **Solution Section**
   - Introduce your mechanism
   - Differentiate from alternatives

4. **Proof Section**
   - Testimonials
   - Case studies
   - Trust badges

5. **Offer Section**
   - Clear value stack
   - Price anchoring
   - Guarantee

6. **CTA Section**
   - Repeat primary CTA
   - Urgency element
   - Objection handler

### Output Requirements
When designing funnels:
- Specify funnel stage (TOFU/MOFU/BOFU)
- Define single page goal
- Include CTA copy and placement
- Note mobile considerations`,
  priority: 25,
};

export const FUNNEL_DESIGN_VERSION = '1.0.0';
