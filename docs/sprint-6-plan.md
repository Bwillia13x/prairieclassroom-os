# Sprint 6 Plan

**Sprint:** 6 — Support Pattern Detection
**Date:** 2026-04-04
**Goal:** Surface recurring support patterns, follow-up gaps, positive trends, and suggested focus areas from accumulated classroom memory — proving Gemma 4's multi-record synthesis on real intervention data.

## Rationale

The system has been accumulating intervention records, plans, and support priorities since Sprint 3. Nothing yet reads across records over time. Teachers don't have time to review weeks of notes manually to spot patterns. Sprint 6 turns the classroom memory from a document store into an intelligence layer.

## Objectives

1. Add `detect_support_patterns` prompt contract — analyze interventions + plans to identify patterns
2. Add memory retrieval functions: `getStudentInterventions()`, `getFollowUpPending()`, `buildPatternContext()`
3. Add mock response with thinking text for realistic development
4. Add `POST /api/support-patterns` API endpoint
5. Build PatternReport UI component with cross-tab bridges
6. Add 6th tab "Support Patterns" in App.tsx
7. Add 5 eval cases covering schema, content, safety, follow-up gaps, latency
8. Verify: all 32 evals passing (27 existing + 5 new)

## Architecture

- Uses **planning** model tier (gemma-4-27b-it) with **thinking enabled** — same as tomorrow-plan
- Retrieval: pulls interventions, plans, and pending follow-ups from classroom SQLite
- Output: `SupportPatternReport` with 4 sections (recurring_themes, follow_up_gaps, positive_trends, suggested_focus)
- Pattern reports are ephemeral — not persisted to SQLite (future sprint can add persistence)
- Safety: all output uses observational language only, attributed to teacher documentation

## New prompt class

### G. Detect support patterns
- Route: `detect_support_patterns`
- Model tier: planning (gemma-4-27b-it)
- Thinking: on
- Retrieval: yes
- Schema version: 0.1.0

Input: classroom_id, optional student_filter, time_window (5/10/20 records)
Output: SupportPatternReport (recurring_themes[], follow_up_gaps[], positive_trends[], suggested_focus[])

## Deliverables

| Deliverable | Status |
|-------------|--------|
| `packages/shared/schemas/pattern.ts` — SupportPatternReport types | Done |
| `services/memory/retrieve.ts` — 3 new retrieval functions | Done |
| `services/orchestrator/types.ts` — detect_support_patterns added | Done |
| `services/orchestrator/router.ts` — planning tier route | Done |
| `services/orchestrator/support-patterns.ts` — prompt contract + parser | Done |
| `services/inference/harness.py` — mock response + thinking + dispatch | Done |
| `services/orchestrator/server.ts` — POST /api/support-patterns | Done |
| `apps/web/src/types.ts` — web layer types | Done |
| `apps/web/src/api.ts` — detectSupportPatterns client | Done |
| `apps/web/src/components/PatternReport.tsx` + CSS | Done |
| `apps/web/src/App.tsx` — 6th tab + handler + bridges | Done |
| 5 eval cases (pat-001 through pat-005) | Done |
| Updated eval runner with pattern dispatch | Done |
| Docs: decision-log, prompt-contracts, routing-table, sprint plan | Done |

## What to defer

- Persistent pattern report storage (future)
- Trend visualization / charts (future)
- Cross-classroom pattern analysis (future)
- Real-time pattern alerts (future)
- Pattern injection into tomorrow-plan prompts (future — would close the pattern → plan feedback loop)

## Sprint 7 readiness criteria

- [x] Pattern detection produces structured report from classroom memory
- [x] Safety boundaries preserved: no diagnosis, no clinical language, observational framing only
- [x] Cross-tab bridges work: pattern → intervention logger, positive trend → family message
- [x] All 32 evals passing (27 existing + 5 new)
