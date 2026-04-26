# System Reliability

*Generated 2026-04-26*

**Log files analysed:** 2
**Date range:** 2026-04-25 to 2026-04-26
**Total requests:** 489

## Reliability

- Success rate (2xx/3xx): **96.1%** (470 / 489)
- Client/server errors: 19
- Injection attempts detected: 2

## Error Codes

| Status | Count |
|--------|-------|
| 401 | 15 |
| 403 | 3 |
| 400 | 1 |

## Latency (ms)

| Metric | Value |
|--------|-------|
| Average | 2649 |
| P50 | 6 |
| P95 | 140 |
| P99 | 84582 |

## Top Routes

| Route | Count |
|-------|-------|
| GET /api/classrooms/ | 100 |
| POST /api/sessions/ | 77 |
| GET /api/today/:classroomId | 68 |
| GET /api/classrooms/:id/health | 42 |
| GET /api/classrooms/:id/messages | 31 |
| GET /api/classrooms/:id/plans | 26 |
| GET /api/classrooms/:id/runs | 21 |
| GET /api/classrooms/:id/interventions | 20 |
| GET /api/sessions/summary/:classroomId | 15 |
| GET /api/classrooms/:id/student-summary | 13 |
| GET /health | 10 |
| POST /api/differentiate/ | 6 |
| POST /api/tomorrow-plan/ | 6 |
| POST /api/family-message/ | 6 |
| POST /api/ea-briefing/ | 5 |

## Inference Providers

| Provider | Count |
|----------|-------|
| mock | 408 |
| gemini | 81 |
