# Sprint 2 Checklist

**Sprint:** 2 — Next-Day Support Plan

## Deliverables

- [x] Sprint 1 review documented
- [x] Sprint 2 plan documented
- [x] Mock tomorrow-plan response in inference harness (structured JSON + thinking text)
- [x] `services/orchestrator/tomorrow-plan.ts` — prompt contract + parser
- [x] `services/orchestrator/server.ts` — `/api/tomorrow-plan` endpoint
- [x] `apps/web/src/types.ts` — TomorrowPlan types
- [x] `apps/web/src/api.ts` — `generateTomorrowPlan` API client
- [x] `apps/web/src/components/TeacherReflection.tsx` — reflection input form
- [x] `apps/web/src/components/PlanViewer.tsx` — plan display with 5 sections
- [x] `apps/web/src/App.tsx` — tabbed UI (Differentiate / Tomorrow Plan)
- [x] 5 tomorrow-plan eval cases (schema × 2, content × 1, safety × 1, latency × 1)
- [x] Updated eval runner with plan eval dispatch
- [x] All 12/12 evals passing (7 differentiation + 5 planning)
- [x] TypeScript compiles clean across workspace
- [x] Inference harness smoke tests 4/4 passing
- [x] Decision log updated (3 new ADR entries)

## Verification commands

```bash
# TypeScript compile check
npx tsc --noEmit

# Inference smoke test
cd services/inference && source .venv/bin/activate && python harness.py --mode mock --smoke-test

# Start services and run evals
python server.py --mode mock --port 3200 &
cd ../.. && npx tsx services/orchestrator/server.ts &
npx tsx evals/runner.ts
```
