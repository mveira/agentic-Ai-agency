# Next Steps Plan (Humanised Flow Contract)

This repo contains a contract describing the *human journey* the system must follow:
- `system/contracts/high_level_flow.json`

## Why it exists
- Prevents "AI rushing" ahead
- Keeps assumptions explicit
- Makes outputs predictable and client-friendly
- Gives humans and agents the same shared mental model

---

## Recommended Steps (do in order)

### Step 1 — Agent Compliance Wrapper (highest ROI)
**Goal:** Ensure every agent respects the flow stages.
- Add a short instruction to each agent's prompt:
  - "Follow the High-Level Flow contract."
  - "Do not skip stages."
  - "If a required stage output is missing, ask questions instead of proceeding."

**Definition of done**
- Every agent prompt references `high_level_flow.json`
- Agents stop jumping to solutions when stage 6 is unconfirmed

---

### Step 2 — Stage Gates (outputs become permission)
**Goal:** Enforce simple "can I proceed?" checks before moving forward.
- Treat each stage `output` as a gate.
- Do not enter Solution Design (stage 7) unless stage 6 is confirmed.

**Definition of done**
- A checklist exists that validates:
  - stage 2 acknowledgement sent
  - stage 3 checks passed
  - stage 6 confirmed before stage 7

---

### Step 3 — Follow-up Question Generator
**Goal:** Ask fewer, smarter questions.
- Generate follow-ups only from:
  - gaps/conflicts found in stage 4
  - missing confirmations in stage 6
- Ask in short rounds (avoid "20 questions").

**Definition of done**
- Follow-ups are targeted, minimal, and tied to stage outputs

---

### Step 4 — Quality Review Checklist
**Goal:** Reduce risk before any client exposure.
- QC checks must verify:
  - assumptions are labeled
  - next steps are explicit
  - solution matches confirmed requirements
  - risks are called out

**Definition of done**
- QC output includes pass/fail + reasons

---

### Step 5 — Diagram Blueprint (human on top, system beneath)
**Goal:** Make the system explainable in 60 seconds.
- Create a single diagram that shows:
  - stages 1-9 across the top (human journey)
  - system actions underneath each stage
  - agents appear only where they add value

**Definition of done**
- One image/diagram spec exists and matches the JSON contract

---

### Step 6 — Later: CRM mapping + automation (do NOT do yet)
**Goal:** Map flow stages to CRM pipeline stages + triggers.
- Only after the human journey is stable.
