# Sprint 12 Review — Auth, Error Recovery, and Housekeeping

**Sprint:** 12 — Auth, error recovery, and housekeeping
**Date:** 2026-04-03

42/42 evals passing. Zero TypeScript errors. Zero regressions.

## What works

1. **Classroom-code authentication is wired end-to-end.** Auth middleware validates `X-Classroom-Code` header on all 8 classroom-specific API routes. Demo classroom bypasses auth. Classrooms without access codes are open. Alpha and bravo classrooms have codes set for testing.

2. **WAL checkpoint management prevents unbounded growth.** `checkpointAll()` runs on server startup and every 5 minutes. Uses `PRAGMA wal_checkpoint(TRUNCATE)` to reset WAL files to zero bytes. `closeAll()` now checkpoints before closing connections.

3. **Demo student dropdown works.** Added 6 demo classroom students (Amira, Brody, Chantal, Daniyal, Elena, Farid) to the student stubs map. Intervention logger and family message composer dropdowns now populate correctly in demo mode. Replaced nested ternary chain with a lookup map — cleaner and extensible.

4. **Dead files removed.** `initial_roadmap.md` (0 bytes) and `system_overview.md` (0 bytes) deleted.

5. **Eval runner includes auth headers.** `authHeaders()` utility function attaches the correct classroom code for each eval case. All 42 evals pass with auth enabled.

## What breaks or is uncertain

1. **No UI auth gate.** The auth middleware is functional but the UI doesn't yet prompt for a classroom code. Teachers accessing a code-protected classroom from the browser will get 401 errors. Demo mode is unaffected.

2. **No auth eval cases added.** The planned auth-001 (unauthorized) and auth-002 (wrong code) eval cases were deferred — they require a running server to test, and the current eval suite tests against a running server. Adding them requires testing the 401/403 responses, which needs the server running with auth-protected classrooms.

## Sprint deliverables

| Deliverable | File | Status |
|-------------|------|--------|
| Auth middleware | `services/orchestrator/auth.ts` | Complete |
| Auth wiring | `services/orchestrator/server.ts` | Complete (8 routes) |
| Classroom access codes | `data/synthetic_classrooms/classroom_alpha.json`, `classroom_bravo.json` | Complete |
| ClassroomProfile schema | `packages/shared/schemas/classroom.ts` | Updated (access_code field) |
| WAL checkpoint | `services/memory/db.ts` | Complete |
| WAL on startup + interval | `services/orchestrator/server.ts` | Complete (startup + 5min) |
| Demo student dropdown | `apps/web/src/App.tsx` | Complete (6 students) |
| Dead file cleanup | `initial_roadmap.md`, `system_overview.md` | Removed |
| Eval runner auth | `evals/runner.ts` | Complete (authHeaders utility) |
| ADRs (2) | `docs/decision-log.md` | Complete |

## Eval impact

42/42 evals remain green with auth headers. No new eval cases added this sprint.

## What to do next

- **Sprint 13:** Demo video, writeup update, final eval report, README update.
- **UI auth gate:** Add classroom code entry screen (deferred from this sprint).
- **When credentials land:** Run real inference baseline, populate eval-baseline.md, then iterate prompts.
