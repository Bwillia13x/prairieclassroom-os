# System Reliability

*Generated 2026-04-24*

**Log files analysed:** 16
**Date range:** 2026-04-08 to 2026-04-24
**Total requests:** 34060

## Reliability

- Success rate (2xx/3xx): **93.1%** (31697 / 34060)
- Client/server errors: 2363
- Injection attempts detected: 49

## Error Codes

| Status | Count |
|--------|-------|
| 401 | 1060 |
| 429 | 1004 |
| 403 | 125 |
| 404 | 76 |
| 500 | 50 |
| 502 | 37 |
| 400 | 10 |
| 422 | 1 |

## Latency (ms)

| Metric | Value |
|--------|-------|
| Average | 800 |
| P50 | 2 |
| P95 | 29 |
| P99 | 20047 |

## Top Routes

| Route | Count |
|-------|-------|
| POST /api/sessions/ | 17312 |
| GET /api/classrooms/ | 4226 |
| GET /api/today/:classroomId | 3410 |
| GET /api/classrooms/:id/health | 1823 |
| GET /api/classrooms/:id/plans | 1156 |
| GET /api/classrooms/:id/student-summary | 1068 |
| GET /api/classrooms/:id/messages | 997 |
| GET /api/classrooms/:id/interventions | 716 |
| GET /api/curriculum/entries | 446 |
| GET /api/sessions/summary/:classroomId | 397 |
| GET /api/curriculum/subjects | 380 |
| GET /api/classrooms/:id/runs | 306 |
| POST /api/tomorrow-plan/ | 219 |
| POST /api/survival-packet/ | 175 |
| POST /api/support-patterns/ | 164 |

## Inference Providers

| Provider | Count |
|----------|-------|
| mock | 33041 |
| gemini | 1019 |
