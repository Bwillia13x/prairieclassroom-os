# System Reliability

*Generated 2026-04-29*

**Log files analysed:** 5
**Date range:** 2026-04-25 to 2026-04-29
**Total requests:** 13772

## Reliability

- Success rate (2xx/3xx): **97.3%** (13406 / 13772)
- Client/server errors: 366
- Injection attempts detected: 6

## Error Codes

| Status | Count |
|--------|-------|
| 401 | 175 |
| 429 | 101 |
| 403 | 72 |
| 404 | 16 |
| 400 | 1 |
| 502 | 1 |

## Latency (ms)

| Metric | Value |
|--------|-------|
| Average | 301 |
| P50 | 3 |
| P95 | 27 |
| P99 | 113 |

## Top Routes

| Route | Count |
|-------|-------|
| GET /api/classrooms/ | 3168 |
| POST /api/sessions/ | 2840 |
| GET /api/today/:classroomId | 2231 |
| GET /api/classrooms/:id/health | 1307 |
| GET /api/sessions/summary/:classroomId | 751 |
| GET /api/classrooms/:id/student-summary | 633 |
| GET /api/classrooms/:id/messages | 610 |
| GET /api/classrooms/:id/plans | 536 |
| GET /api/classrooms/:id/runs | 443 |
| GET /api/classrooms/:id/interventions | 419 |
| POST /api/family-message/ | 86 |
| POST /api/tomorrow-plan/stream | 66 |
| GET /api/tomorrow-plan/stream/:streamId/events | 66 |
| POST /api/differentiate/ | 62 |
| GET /health | 61 |

## Inference Providers

| Provider | Count |
|----------|-------|
| mock | 13454 |
| gemini | 318 |
