# Sprint 1 Plan

**Sprint:** 1 — Upload-to-Differentiation Loop
**Date:** 2026-04-02
**Goal:** Build the first end-to-end teacher workflow: upload an artifact, generate 5 differentiated variants, display them side-by-side.

## Objectives

1. Scaffold Vite+React teacher UI in `apps/web/`
2. Build artifact upload form with classroom selection
3. Create inference HTTP bridge (Flask wrapping the Gemma harness)
4. Build orchestrator API server connecting UI → prompt contract → inference
5. Write the differentiation prompt contract (versioned, structured)
6. Parse model output into `DifferentiatedVariant[]` with schema validation
7. Display 5 variants side-by-side in the UI
8. Add 7 differentiation eval cases (schema, content, safety, latency)
9. Verify end-to-end with mock, then validate readiness for real Gemma 4

## Architecture

```
[Teacher UI]             [Orchestrator API]           [Inference Service]
 apps/web/        →       :3100/api/*          →       :3200/generate
 Vite+React               Express+TypeScript           Flask+Python
 Port 5173                Port 3100                    Port 3200
```

Vite proxies `/api` → orchestrator. Orchestrator builds prompt from contract, calls inference, parses response, returns typed variants.

## Deliverables

| Deliverable | Status |
|-------------|--------|
| `apps/web/` — Vite+React scaffold with artifact upload + variant viewer | Done |
| `services/inference/server.py` — Flask HTTP bridge for Gemma harness | Done |
| `services/orchestrator/server.ts` — Express API (classrooms, differentiate) | Done |
| `services/orchestrator/differentiate.ts` — prompt contract + parser | Done |
| 7 eval cases in `evals/cases/` covering schema, quality, safety, latency | Done |
| Updated eval runner with live API integration | Done |
| Mock inference returns proper 5-variant differentiation response | Done |

## Prompt contract: differentiate_material v0.1.0

- **System prompt:** Defines 5 variant types, output format (JSON array), rules (no diagnosis, plain language)
- **User prompt:** Injects classroom context (students, scaffolds, routines) + artifact text + teacher goal
- **Output:** JSON array of 5 objects with variant_type, title, student_facing_instructions, teacher_notes, required_materials, estimated_minutes
- **Parse layer:** Handles markdown fencing, validates structure, assigns `variant_id` and `schema_version`

## Eval summary

7 cases registered:
- 4 schema reliability (reading, fractions, communities, persuasive writing)
- 1 content quality (variants genuinely distinct)
- 1 safety boundaries (no diagnosis/discipline language)
- 1 latency suitability (<30s)

All 7/7 passing against mock inference.

## Sprint 2 readiness criteria

Before starting Sprint 2:
- [ ] Real Gemma 4 checkpoint tested through the same pipeline
- [ ] At least 3 different artifacts differentiated with real model
- [ ] UI confirmed usable for demo walkthrough
- [ ] Tomorrow plan prompt contract drafted

## What was deferred

- Image/PDF artifact upload (text-only in Sprint 1)
- Voice note input
- Persistence to SQLite
- Classroom memory retrieval
- Real Gemma 4 inference (mock mode only — model access required)
