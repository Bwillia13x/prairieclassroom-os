# Sprint 8 Plan — EA Daily Briefing

## Goal

Give educational assistants their own entry point into the system. The EA daily briefing synthesizes the teacher's plan (EA actions), recent interventions, pending follow-ups, and pattern insights into a single printable document — so the EA can start their day prepared without a lengthy verbal handover.

## User story

As an educational assistant, when I arrive at school, I want a concise daily briefing that shows me which students I'm supporting, what the teacher's plan expects of me, what follow-ups are pending, and what patterns I should know about — so I'm prepared to act from minute one.

## Why this sprint

- The spec names EAs as a secondary user, but 7 sprints have built only teacher-facing workflows.
- EA briefing is pure synthesis — it consumes existing data (plans, interventions, patterns) without requiring new model capabilities.
- It makes the "classroom OS" metaphor concrete: the system now serves two roles, not just one.
- It's the second consumer of the cross-feature data flow architecture established in Sprint 7.

## New prompt class

**H. Generate EA Briefing**
- Route: `generate_ea_briefing`
- Model tier: live (gemma-4-4b-it)
- Thinking: off
- Retrieval: yes (today's plan EA actions, recent interventions, latest pattern report)
- Tool-call: no
- Schema version: 0.1.0

## Changes

### Schema
- `packages/shared/schemas/briefing.ts` — `EABriefing` type with schedule blocks, student watch list, pending follow-ups, teacher notes

### Orchestrator
- `services/orchestrator/ea-briefing.ts` — prompt builder + response parser

### Memory / Retrieval
- `services/memory/retrieve.ts` — `buildEABriefingContext()` pulls today's plan EA actions, recent interventions (follow-up-pending first), and latest pattern report focus items

### Router
- `services/orchestrator/types.ts` — add `generate_ea_briefing` to `PromptClass`
- `services/orchestrator/router.ts` — add route entry (live tier, no thinking, retrieval required)

### Mock
- `services/inference/harness.py` — `MOCK_EA_BRIEFING` canned response + dispatch

### API
- `POST /api/ea-briefing` — 13th endpoint, generates and returns briefing
- No persistence — briefings are ephemeral synthesis views, not longitudinal records

### UI
- `apps/web/src/types.ts` — EABriefing types
- `apps/web/src/api.ts` — `generateEABriefing()` client function
- `apps/web/src/components/EABriefing.tsx` — 7th tab with printable layout
- `apps/web/src/App.tsx` — add tab + handler

### Evals (5 new → 42 total)
- `ea-001-schema` — required keys present on briefing object
- `ea-002-content-quality` — must contain schedule blocks and student references
- `ea-003-safety` — no diagnostic language (15 forbidden terms)
- `ea-004-latency` — within 2000ms budget (live tier, no thinking)
- `ea-005-synthesis` — when plan exists, briefing references EA actions from it

## Safety

Same observational framing as Sprint 6/7 — "The teacher's plan notes..." not "This student has..." The briefing is a coordination document, not a report card. Briefings don't persist to prevent them from becoming shadow student records.

## Architecture note

No new SQLite table. Briefings are ephemeral — they synthesize current state from other persisted data. This is intentional: the EA briefing is a view, not a source of truth. The teacher's plan, interventions, and patterns remain the canonical records.
