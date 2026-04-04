# Sprint 4 Review

**Sprint:** 4 — Intervention Logging + Memory Feedback Loop
**Completed:** 2026-04-03
**Evals:** 22/22 passing

## What works

1. **Full MVP loop closed end-to-end:** teacher uploads artifact → system differentiates → teacher reflects → system generates tomorrow plan → teacher acts → teacher logs intervention → system structures it → next plan is informed by both prior plans AND actual intervention outcomes.
2. **Intervention logging** — schema, memory (SQLite `interventions` table), prompt contract, API endpoint (`POST /api/intervention`), and UI (Tab 4: Log Intervention).
3. **Intervention → plan feedback loop** — `getRecentInterventions()` + `summarizeRecentInterventions()` injected into tomorrow plan prompts.
4. **Pre-fill bridges** — plan's support priorities pre-fill intervention logger; plan's family followups pre-fill message composer.
5. **Eval regression catch** — Task 3 subagent accidentally deleted `MOCK_FAMILY_MESSAGE` when inserting `MOCK_INTERVENTION`. The 5 family message evals immediately surfaced this regression.

## What was built

| Layer | Files | What |
|-------|-------|------|
| Schema | `intervention.ts` | Added `schema_version` field |
| Memory | `db.ts`, `store.ts`, `retrieve.ts` | interventions table, save/retrieve/summarize |
| Inference | `harness.py` | `MOCK_INTERVENTION` + `log_intervention` dispatch |
| Prompt | `orchestrator/intervention.ts` | System prompt + JSON parser |
| API | `server.ts` | `POST /api/intervention` + retrieval injection into tomorrow-plan |
| UI | `InterventionLogger`, `InterventionCard`, `App.tsx`, `PlanViewer` | 4th tab, form, result card, plan bridge |
| Evals | 5 new cases + runner dispatch | Schema, content, safety, latency |
| Docs | `decision-log.md`, `prompt-contracts.md` | 3 ADRs + Section D routing |

## What breaks

- Nothing currently broken — 22/22 evals passing.

## What to cut

- Nothing was cut from scope.

## Key insight

The system is now a "classroom OS" rather than four disconnected tools. The feedback loop from interventions back into tomorrow plans is the connective tissue.

## Sprint 5 readiness

- [x] All 4 core workflows functional
- [x] Memory persists across all workflow types
- [x] Retrieval feeds back into planning
- [x] 22 evals covering all prompt classes
- [x] UI has 4 tabs with cross-tab pre-fill bridges
