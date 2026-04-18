# System Inventory

_Generated from code-level inventory sources. Do not update counts by hand without running `npm run system:inventory`._

## UI Surface

- Primary panels: 12
- Navigation groups: today, prep, ops, review

### today
- Today

### prep
- Differentiate
- Language Tools

### ops
- Tomorrow Plan
- EA Briefing
- EA Load
- Forecast
- Log Intervention
- Sub Packet

### review
- Family Message
- Support Patterns
- Usage Insights

## Prompt Routing

- Model-routed prompt classes: 13
- Live tier: 7
- Planning tier: 6
- Retrieval-backed classes: 7

| Prompt class | Tier | Thinking | Retrieval | Tool capable |
|---|---|---:|---:|---:|
| `differentiate_material` | live | no | no | yes |
| `prepare_tomorrow_plan` | planning | yes | yes | yes |
| `draft_family_message` | live | no | no | no |
| `log_intervention` | live | no | no | no |
| `simplify_for_student` | live | no | no | no |
| `generate_vocab_cards` | live | no | no | no |
| `detect_support_patterns` | planning | yes | yes | no |
| `generate_ea_briefing` | live | no | yes | no |
| `forecast_complexity` | planning | yes | yes | no |
| `detect_scaffold_decay` | planning | yes | yes | no |
| `generate_survival_packet` | planning | yes | yes | no |
| `extract_worksheet` | live | no | no | no |
| `balance_ea_load` | planning | yes | yes | no |

## API Mounts

- Mounted Express route bases: 21
- Exact endpoints: 37
- `/api/differentiate`
- `/api/tomorrow-plan`
- `/api/family-message`
- `/api/intervention`
- `/api/simplify`
- `/api/vocab-cards`
- `/api/support-patterns`
- `/api/ea-briefing`
- `/api/complexity-forecast`
- `/api/ea-load`
- `/api/debt-register`
- `/api/today`
- `/api/scaffold-decay`
- `/api/survival-packet`
- `/api/extract-worksheet`
- `/api/feedback`
- `/api/sessions`
- `/`
- `/api/classrooms`
- `/api/curriculum`
- `/api`

## API Endpoints

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
| POST | `/api/family-message` | `services/orchestrator/routes/family-message.ts` | classroom-code | teacher |
| POST | `/api/family-message/approve` | `services/orchestrator/routes/family-message.ts` | classroom-code | teacher |
| POST | `/api/intervention` | `services/orchestrator/routes/intervention.ts` | classroom-code | teacher, ea, substitute |
| POST | `/api/simplify` | `services/orchestrator/routes/language-tools.ts` | classroom-code | teacher |
| POST | `/api/vocab-cards` | `services/orchestrator/routes/language-tools.ts` | classroom-code | teacher |
| POST | `/api/support-patterns` | `services/orchestrator/routes/support-patterns.ts` | classroom-code | teacher |
| GET | `/api/support-patterns/latest/:classroomId` | `services/orchestrator/routes/support-patterns.ts` | classroom-code | teacher, reviewer |
| POST | `/api/ea-briefing` | `services/orchestrator/routes/ea-briefing.ts` | classroom-code | teacher, ea, substitute |
| POST | `/api/complexity-forecast` | `services/orchestrator/routes/forecast.ts` | classroom-code | teacher |
| GET | `/api/complexity-forecast/latest/:classroomId` | `services/orchestrator/routes/forecast.ts` | classroom-code | teacher, substitute, reviewer |
| POST | `/api/ea-load` | `services/orchestrator/routes/ea-load.ts` | classroom-code | teacher, ea |
| GET | `/api/debt-register/:classroomId` | `services/orchestrator/routes/debt-register.ts` | classroom-code | teacher, ea, substitute, reviewer |
| GET | `/api/today/:classroomId` | `services/orchestrator/routes/today.ts` | classroom-code | teacher, ea, substitute |
| GET | `/api/classrooms/:id/plans` | `services/orchestrator/routes/history.ts` | classroom-code | teacher, reviewer |
| GET | `/api/classrooms/:id/messages` | `services/orchestrator/routes/history.ts` | classroom-code | teacher, reviewer |
| GET | `/api/classrooms/:id/interventions` | `services/orchestrator/routes/history.ts` | classroom-code | teacher, reviewer |
| GET | `/api/classrooms/:id/patterns` | `services/orchestrator/routes/history.ts` | classroom-code | teacher, reviewer |
| GET | `/api/classrooms/:id/health` | `services/orchestrator/routes/classroom-health.ts` | classroom-code | teacher |
| GET | `/api/classrooms/:id/student-summary` | `services/orchestrator/routes/student-summary.ts` | classroom-code | teacher |
| POST | `/api/scaffold-decay` | `services/orchestrator/routes/scaffold-decay.ts` | classroom-code | teacher |
| GET | `/api/scaffold-decay/latest/:classroomId/:studentRef` | `services/orchestrator/routes/scaffold-decay.ts` | classroom-code | teacher |
| POST | `/api/survival-packet` | `services/orchestrator/routes/survival-packet.ts` | classroom-code | teacher |
| POST | `/api/extract-worksheet` | `services/orchestrator/routes/extract-worksheet.ts` | classroom-code | teacher |
| POST | `/api/feedback` | `services/orchestrator/routes/feedback.ts` | classroom-code | teacher, ea |
| GET | `/api/feedback/summary/:classroomId` | `services/orchestrator/routes/feedback.ts` | classroom-code | teacher, ea, reviewer |
| POST | `/api/sessions` | `services/orchestrator/routes/sessions.ts` | classroom-code | teacher, ea, substitute |
| GET | `/api/sessions/summary/:classroomId` | `services/orchestrator/routes/sessions.ts` | classroom-code | teacher, ea, reviewer |

## Eval Corpus

- Eval case files: 127

## Canonical Docs

- `README.md`
- `CLAUDE.md`
- `docs/architecture.md`
- `docs/prompt-contracts.md`
- `docs/development-gaps.md`
- `docs/api-surface.md`
