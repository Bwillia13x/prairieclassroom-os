# Sprint 3 Plan

**Sprint:** 3 — Classroom Memory + Family Messaging
**Date:** 2026-04-03
**Goal:** Add SQLite-backed classroom memory and the family messaging workflow — moving from stateless content generator to persistent classroom OS.

## Objectives

1. Build SQLite memory layer (per-classroom DB, three tables)
2. Persist differentiation variants, tomorrow plans, and family messages
3. Wire retrieval injection into tomorrow plan prompt (CLASSROOM MEMORY section)
4. Build `draft_family_message` prompt contract v0.1.0
5. Add mock family message response to inference harness
6. Add `/api/family-message` endpoint with approval flow
7. Build message composer + draft display UI with approval gate
8. Connect plan's family_followups to message composer (pre-fill)
9. Add 5 eval cases for family messaging
10. Verify end-to-end: all 17+ evals passing

## Architecture

Same three-service architecture. Family messaging uses live model tier (no thinking). Memory layer is a new `services/memory/` module using `better-sqlite3`.

## Deliverables

| Deliverable | Status |
|-------------|--------|
| `services/memory/db.ts` — connection manager + schema | Pending |
| `services/memory/store.ts` — write functions | Pending |
| `services/memory/retrieve.ts` — read + summarize | Pending |
| `services/orchestrator/family-message.ts` — prompt contract + parser | Pending |
| `services/orchestrator/server.ts` — `/api/family-message` + memory wiring | Pending |
| `services/inference/harness.py` — mock family message + prompt_class dispatch | Pending |
| `apps/web/` — message composer + draft viewer + approval | Pending |
| `apps/web/` — Family Message tab + pre-fill from plan | Pending |
| 5 family message eval cases | Pending |
| Updated eval runner with family message dispatch | Pending |
| Sprint 2 review doc | Pending |
| Decision log updated | Pending |

## What to defer

- Intervention logging (Sprint 4)
- Retrieval into differentiation or family messaging (Sprint 4+)
- EmbeddingGemma vector search (future)
- Voice note input (future)
- Real Gemma 4 inference (mock mode continues)

## Sprint 4 readiness criteria

- [ ] Plans persist to SQLite and are retrievable
- [ ] Tomorrow plan generation uses classroom memory when available
- [ ] Family message drafts generate reliably from student + context
- [ ] Approval flow works (teacher_approved flips, timestamp recorded)
- [ ] At least 17 evals passing (7 diff + 5 plan + 5 message)
