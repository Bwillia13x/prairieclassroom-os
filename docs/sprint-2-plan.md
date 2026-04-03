# Sprint 2 Plan

**Sprint:** 2 — Next-Day Support Plan
**Date:** 2026-04-03
**Goal:** Turn teacher notes + classroom context into a structured "tomorrow plan" — the first move from content generator to classroom OS.

## Objectives

1. Build the `prepare_tomorrow_plan` prompt contract (versioned, structured, thinking-enabled)
2. Add mock tomorrow-plan response to the Python inference harness
3. Add `/api/tomorrow-plan` orchestrator endpoint
4. Build teacher reflection input + plan display UI
5. Add 5+ eval cases covering schema, content quality, safety, and latency
6. Verify end-to-end: UI → orchestrator → inference → structured plan

## Architecture

Same three-service architecture as Sprint 1. Tomorrow plan uses the **planning** model tier with **thinking mode enabled**.

```
[Teacher UI]             [Orchestrator API]           [Inference Service]
 apps/web/        →       :3100/api/tomorrow-plan  →   :3200/generate
 Vite+React               Express+TypeScript           Flask+Python
 Port 5173                Port 3100                    Port 3200
```

## Prompt contract: prepare_tomorrow_plan v0.1.0

- **System prompt:** Defines the planning task, output schema (JSON), safety rules
- **User prompt:** Injects classroom context (students, routines, support constraints) + teacher reflection + today's artifact(s) + teacher goal
- **Model tier:** planning (larger Gemma 4, thinking mode ON)
- **Output:** JSON object matching `TomorrowPlan` schema:
  - `transition_watchpoints[]` — time/activity, risk, mitigation
  - `support_priorities[]` — student, reason, suggested action
  - `ea_actions[]` — description, student refs, timing
  - `prep_checklist[]` — string items
  - `family_followups[]` — student, reason, message type

## Deliverables

| Deliverable | Status |
|-------------|--------|
| `services/orchestrator/tomorrow-plan.ts` — prompt contract + parser | Pending |
| `services/inference/harness.py` — mock planning response | Pending |
| `services/orchestrator/server.ts` — `/api/tomorrow-plan` endpoint | Pending |
| `apps/web/` — teacher reflection input + plan viewer UI | Pending |
| 5+ eval cases for tomorrow-plan | Pending |
| Updated eval runner with plan eval support | Pending |
| Sprint 1 review doc | Pending |

## What to defer

- Classroom memory retrieval (Sprint 3) — plan uses only current-session context
- Voice note input (future sprint)
- Plan persistence to SQLite (Sprint 3)
- Real Gemma 4 inference (mock mode continues)

## Sprint 3 readiness criteria

Before starting Sprint 3:
- [ ] Tomorrow plan generates reliably from teacher note + classroom context
- [ ] Plan output is structured and schema-validated
- [ ] UI shows plan sections clearly for teacher review
- [ ] At least 3 different classroom/artifact combinations tested via evals
