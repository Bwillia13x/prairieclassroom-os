# API Surface Inventory

_Generated from `services/orchestrator/server.ts` and `services/orchestrator/routes/*.ts`. Do not edit endpoint rows by hand; run `npm run system:inventory`._

- Mounted Express route bases: 21
- Exact endpoints: 49

| Method | Endpoint | Route file | Auth boundary | Role scope |
|---|---|---|---|---|
| GET | `/health` | `services/orchestrator/routes/health.ts` | open/demo metadata | none |
| GET | `/api/health` | `services/orchestrator/routes/health.ts` | open/demo metadata | none |
| GET | `/api/classrooms` | `services/orchestrator/routes/classrooms.ts` | open/demo metadata | none |
| GET | `/api/classrooms/:id/schedule` | `services/orchestrator/routes/classrooms.ts` | open/demo metadata | none |
| PUT | `/api/classrooms/:id/schedule` | `services/orchestrator/routes/classrooms.ts` | classroom-code | teacher |
| GET | `/api/curriculum/subjects` | `services/orchestrator/routes/curriculum.ts` | open/demo metadata | none |
| GET | `/api/curriculum/entries` | `services/orchestrator/routes/curriculum.ts` | open/demo metadata | none |
| GET | `/api/curriculum/entries/:entryId` | `services/orchestrator/routes/curriculum.ts` | open/demo metadata | none |
| POST | `/api/differentiate` | `services/orchestrator/routes/differentiate.ts` | classroom-code | teacher |
| POST | `/api/tomorrow-plan` | `services/orchestrator/routes/tomorrow-plan.ts` | classroom-code | teacher |
| POST | `/api/tomorrow-plan/stream` | `services/orchestrator/routes/tomorrow-plan.ts` | classroom-code | teacher |
| GET | `/api/tomorrow-plan/stream/:streamId/events` | `services/orchestrator/routes/tomorrow-plan.ts` | classroom-code | teacher |
| POST | `/api/family-message` | `services/orchestrator/routes/family-message.ts` | classroom-code | teacher |
| POST | `/api/family-message/approve` | `services/orchestrator/routes/family-message.ts` | classroom-code | teacher |
| POST | `/api/intervention` | `services/orchestrator/routes/intervention.ts` | classroom-code | teacher, ea, substitute |
| POST | `/api/simplify` | `services/orchestrator/routes/language-tools.ts` | classroom-code | teacher |
| POST | `/api/vocab-cards` | `services/orchestrator/routes/language-tools.ts` | classroom-code | teacher |
| POST | `/api/support-patterns` | `services/orchestrator/routes/support-patterns.ts` | classroom-code | teacher |
| POST | `/api/support-patterns/stream` | `services/orchestrator/routes/support-patterns.ts` | classroom-code | teacher |
| GET | `/api/support-patterns/stream/:streamId/events` | `services/orchestrator/routes/support-patterns.ts` | classroom-code | teacher |
| GET | `/api/support-patterns/latest/:classroomId` | `services/orchestrator/routes/support-patterns.ts` | classroom-code | teacher, reviewer |
| POST | `/api/ea-briefing` | `services/orchestrator/routes/ea-briefing.ts` | classroom-code | teacher, ea, substitute |
| POST | `/api/complexity-forecast` | `services/orchestrator/routes/forecast.ts` | classroom-code | teacher |
| POST | `/api/complexity-forecast/stream` | `services/orchestrator/routes/forecast.ts` | classroom-code | teacher |
| GET | `/api/complexity-forecast/stream/:streamId/events` | `services/orchestrator/routes/forecast.ts` | classroom-code | teacher |
| GET | `/api/complexity-forecast/latest/:classroomId` | `services/orchestrator/routes/forecast.ts` | classroom-code | teacher, substitute, reviewer |
| POST | `/api/ea-load` | `services/orchestrator/routes/ea-load.ts` | classroom-code | teacher, ea |
| POST | `/api/ea-load/stream` | `services/orchestrator/routes/ea-load.ts` | classroom-code | teacher, ea |
| GET | `/api/ea-load/stream/:streamId/events` | `services/orchestrator/routes/ea-load.ts` | classroom-code | teacher, ea |
| GET | `/api/debt-register/:classroomId` | `services/orchestrator/routes/debt-register.ts` | classroom-code | teacher, ea, substitute, reviewer |
| GET | `/api/today/:classroomId` | `services/orchestrator/routes/today.ts` | classroom-code | teacher, ea, substitute |
| GET | `/api/classrooms/:id/plans` | `services/orchestrator/routes/history.ts` | classroom-code | teacher, reviewer |
| GET | `/api/classrooms/:id/messages` | `services/orchestrator/routes/history.ts` | classroom-code | teacher, reviewer |
| GET | `/api/classrooms/:id/interventions` | `services/orchestrator/routes/history.ts` | classroom-code | teacher, reviewer |
| GET | `/api/classrooms/:id/patterns` | `services/orchestrator/routes/history.ts` | classroom-code | teacher, reviewer |
| GET | `/api/classrooms/:id/health` | `services/orchestrator/routes/classroom-health.ts` | classroom-code | teacher |
| GET | `/api/classrooms/:id/student-summary` | `services/orchestrator/routes/student-summary.ts` | classroom-code | teacher |
| POST | `/api/classrooms/:id/runs` | `services/orchestrator/routes/runs.ts` | classroom-code | teacher |
| GET | `/api/classrooms/:id/runs` | `services/orchestrator/routes/runs.ts` | classroom-code | teacher, ea |
| POST | `/api/scaffold-decay` | `services/orchestrator/routes/scaffold-decay.ts` | classroom-code | teacher |
| GET | `/api/scaffold-decay/latest/:classroomId/:studentRef` | `services/orchestrator/routes/scaffold-decay.ts` | classroom-code | teacher |
| POST | `/api/survival-packet` | `services/orchestrator/routes/survival-packet.ts` | classroom-code | teacher |
| POST | `/api/survival-packet/stream` | `services/orchestrator/routes/survival-packet.ts` | classroom-code | teacher |
| GET | `/api/survival-packet/stream/:streamId/events` | `services/orchestrator/routes/survival-packet.ts` | classroom-code | teacher |
| POST | `/api/extract-worksheet` | `services/orchestrator/routes/extract-worksheet.ts` | classroom-code | teacher |
| POST | `/api/feedback` | `services/orchestrator/routes/feedback.ts` | classroom-code | teacher, ea |
| GET | `/api/feedback/summary/:classroomId` | `services/orchestrator/routes/feedback.ts` | classroom-code | teacher, ea, reviewer |
| POST | `/api/sessions` | `services/orchestrator/routes/sessions.ts` | classroom-code | teacher, ea, substitute |
| GET | `/api/sessions/summary/:classroomId` | `services/orchestrator/routes/sessions.ts` | classroom-code | teacher, ea, reviewer |
