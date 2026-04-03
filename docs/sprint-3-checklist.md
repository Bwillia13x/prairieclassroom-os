# Sprint 3 Checklist

**Sprint:** 3 — Classroom Memory + Family Messaging

## Deliverables

- [ ] `better-sqlite3` installed
- [ ] `services/memory/db.ts` — SQLite connection manager
- [ ] `services/memory/store.ts` — write functions
- [ ] `services/memory/retrieve.ts` — read + summarize
- [ ] `services/inference/harness.py` — prompt_class dispatch + mock family message
- [ ] `services/orchestrator/family-message.ts` — prompt contract + parser
- [ ] `services/orchestrator/server.ts` — `/api/family-message` endpoint
- [ ] `services/orchestrator/server.ts` — memory persistence in existing routes
- [ ] `services/orchestrator/tomorrow-plan.ts` — retrieval injection
- [ ] `apps/web/src/types.ts` — FamilyMessageDraft types
- [ ] `apps/web/src/api.ts` — draftFamilyMessage + approveFamilyMessage
- [ ] `apps/web/src/components/MessageComposer.tsx` — message input form
- [ ] `apps/web/src/components/MessageDraft.tsx` — draft display + approval
- [ ] `apps/web/src/App.tsx` — Family Message tab
- [ ] `apps/web/src/components/PlanViewer.tsx` — clickable family_followups
- [ ] 5 family message eval cases
- [ ] Updated eval runner with family message dispatch
- [ ] All 17/17 evals passing (7 diff + 5 plan + 5 message)
- [ ] TypeScript compiles clean
- [ ] Inference harness smoke tests passing
- [ ] Sprint 2 review documented
- [ ] Decision log updated

## Verification commands

```bash
npx tsc --noEmit
cd services/inference && source .venv/bin/activate && python harness.py --mode mock --smoke-test
python server.py --mode mock --port 3200 &
cd ../.. && npx tsx services/orchestrator/server.ts &
npx tsx evals/runner.ts
```
