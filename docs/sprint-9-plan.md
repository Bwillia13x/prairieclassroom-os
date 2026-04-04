# Sprint 9 Plan — Demo Packaging + Kaggle Writeup

## Goal

Package PrairieClassroom OS for competition submission. Build a scripted demo walkthrough with realistic seed data, write a Kaggle-ready writeup that tells the product and technical story, and apply minimal UI polish so the demo flow is smooth end-to-end.

## User story

As a competition judge reviewing this submission, when I open the notebook and watch the demo, I want to understand in under 5 minutes why classroom complexity is a coordination problem, how Gemma 4 solves it differently than a generic chatbot, and what the system actually does — so I can evaluate the technical depth and product thinking behind the entry.

## Why this sprint

- 8 sprints of features with zero demo infrastructure. The system works but nobody outside the project has seen it.
- The Kaggle writeup is the primary evaluation artifact. Without it, the technical work is invisible.
- Seed data transforms the demo from "click through empty tabs" to "experience a realistic teacher workflow."
- This is spec priority 5: "A coherent demo and writeup."

## Deliverables

### 1. Demo seed data

Pre-loaded classroom memory that makes the demo compelling from first interaction.

**File:** `data/demo/seed.ts` — script that populates a demo classroom SQLite database.

**Contents:**
- 1 demo classroom profile ("Mrs. Okafor's Grade 3/4 split, Lethbridge")
- 6-8 pre-existing intervention records spanning 2 weeks (varied students, follow-up states)
- 2-3 generated plans (showing progression over days)
- 1 pattern report (so pattern-informed planning works immediately)
- 1 family message draft (approved, showing the approval flow)

**Design constraints:**
- All student names are fictional but culturally representative of southern Alberta classrooms
- Interventions show realistic variety: EAL support, sensory breaks, academic scaffolding, social coaching
- Data must be internally consistent (follow-ups reference earlier interventions, plans reference the right students)

### 2. Demo walkthrough script

A step-by-step script that exercises the full system loop in a compelling order.

**File:** `docs/demo-script.md`

**Flow:**
1. **Open system** — show classroom selector, pick Mrs. Okafor's class (pre-loaded with seed data)
2. **Differentiate** — upload a sample Grade 3/4 math worksheet, generate 5 variants. Show how variants address different needs.
3. **Language Tools** — simplify the worksheet for EAL Level 2, generate Tagalog vocab cards
4. **Log Intervention** — write a quick note about a student interaction during the lesson. Show model structuring the free text.
5. **Support Patterns** — run pattern detection. Show thinking disclosure. Point out how it reflects the teacher's own documentation back.
6. **Tomorrow Plan** — generate a pattern-informed plan. Show the "Pattern-informed" badge. Point out how today's intervention feeds into tomorrow's priorities.
7. **EA Briefing** — generate the briefing. Show how the plan's EA actions, pending follow-ups, and pattern focus flow into the printable view.
8. **Family Message** — draft a message from the plan's family followup. Show approval gate.

**Each step includes:**
- What to click / what to type
- What to point out to the audience (the "why this matters" narration)
- Expected output highlights

### 3. Kaggle writeup

Competition-ready document telling the product thesis, technical architecture, and Gemma-specific story.

**File:** `docs/kaggle-writeup.md`

**Sections:**

1. **Problem statement** (~300 words)
   - Classroom complexity in Alberta K-6
   - Why this is a coordination problem, not a content problem
   - The gap: teachers spend planning time on logistics, not pedagogy

2. **Product thesis** (~200 words)
   - PrairieClassroom OS as a classroom operations copilot
   - Not a chatbot — a structured workflow system
   - Two users: teacher + EA

3. **Architecture** (~400 words)
   - Three-service design (Vite UI, Express orchestrator, Flask inference)
   - Dual-tier Gemma routing with rationale
   - SQLite per-classroom local-first memory
   - Closed feedback loops: interventions -> patterns -> plans -> interventions

4. **Gemma-specific technical story** (~500 words)
   - 8 prompt classes across 2 model tiers
   - Thinking mode: why only for planning/patterns, not live tasks
   - Retrieval injection: how classroom memory improves outputs
   - Structured output: JSON schemas, not free-form chat
   - Safety framing: observational language, forbidden terms, no diagnosis

5. **Walkthrough** (~400 words)
   - Condensed version of the demo script
   - Representative outputs from each workflow
   - Representative mock output snippets (deterministic from harness) showing the loop in action

6. **Evaluation** (~300 words)
   - 42 evals across 5 categories (schema, content, safety, latency, synthesis)
   - Eval philosophy: why these categories matter for a classroom tool
   - Zero regressions across 8 sprints

7. **What's not built (and why)** (~200 words)
   - Real Gemma inference (mock mode, contract-validated)
   - Student-facing features (deliberate scope choice)
   - Autonomous messaging (safety boundary)
   - Visual supports, voice input (future work)

### 4. Minimal UI polish

Only changes that directly improve the demo flow. No feature work.

**Changes:**
- `apps/web/src/App.tsx` — add demo mode detection: when `?demo=true` query param is present, auto-select the demo classroom
- `apps/web/src/components/ClassroomSelector.tsx` — highlight the demo classroom when in demo mode
- Demo data loading: on server startup, check for demo seed database and log its availability

## What this sprint does NOT include

- Real Gemma inference (stays on mock — the writeup explains why)
- New prompt classes or features
- New evals (the existing 42 cover all workflows)
- UI redesign or component refactoring
- Video recording (can be done post-sprint if needed)

## File changes summary

| Layer | Files | What |
|-------|-------|------|
| Seed data | `data/demo/seed.ts` | Demo classroom population script |
| Demo script | `docs/demo-script.md` | Step-by-step walkthrough with narration |
| Writeup | `docs/kaggle-writeup.md` | Competition submission document |
| UI polish | `App.tsx`, `ClassroomSelector.tsx` | Demo mode query param |
| Server | `server.ts` | Demo database detection on startup |
| Docs | `sprint-9-plan.md`, `sprint-9-review.md`, `decision-log.md` | Sprint docs + ADR |

## Eval impact

No new evals. Existing 42 must remain green — demo mode and seed data must not interfere with the eval suite.

## Risks

- Seed data consistency: interventions, plans, and patterns must cross-reference correctly or the demo feels fake. Mitigation: build seed data programmatically using the same store functions that the app uses.
- Writeup length: Kaggle notebooks have practical reading limits. Mitigation: target ~2500 words total, use clear section headers, lead with the thesis.
- Mock outputs in demo: all demo outputs come from the mock harness, which returns canned responses. Mitigation: the writeup explicitly addresses this. The eval suite validates schema contracts that would hold with real models.
