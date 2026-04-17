# System Reliability

*Generated 2026-04-15*

**Log files analysed:** 8
**Date range:** 2026-04-08 to 2026-04-15
**Total requests:** 6298

## Reliability

- Success rate (2xx/3xx): **82.6%** (5201 / 6298)
- Client/server errors: 1097
- Injection attempts detected: 27

## Error Codes

| Status | Count |
|--------|-------|
| 429 | 603 |
| 401 | 374 |
| 500 | 47 |
| 502 | 24 |
| 403 | 23 |
| 404 | 20 |
| 400 | 6 |

## Latency (ms)

| Metric | Value |
|--------|-------|
| Average | 2755 |
| P50 | 3 |
| P95 | 56 |
| P99 | 79760 |

## Top Routes

| Route | Count |
|-------|-------|
| POST /api/sessions/ | 1809 |
| GET /api/today/:classroomId | 967 |
| GET /api/classrooms/ | 922 |
| GET /api/classrooms/:id/health | 457 |
| GET /api/classrooms/:id/plans | 402 |
| GET /api/classrooms/:id/messages | 353 |
| GET /api/classrooms/:id/interventions | 244 |
| GET /api/classrooms/:id/student-summary | 244 |
| GET /api/curriculum/entries | 140 |
| GET /api/curriculum/subjects | 118 |
| POST /api/tomorrow-plan/ | 98 |
| POST /api/survival-packet/ | 72 |
| POST /api/support-patterns/ | 68 |
| POST /api/family-message/ | 62 |
| GET /health | 54 |

## Inference Providers

| Provider | Count |
|----------|-------|
| mock | 5983 |
| gemini | 315 |
