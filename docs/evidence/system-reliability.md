# System Reliability

*Generated 2026-04-29*

**Log files analysed:** 5
**Date range:** 2026-04-25 to 2026-04-29
**Total requests:** 15944

## Reliability

- Success rate (2xx/3xx): **97.3%** (15518 / 15944)
- Client/server errors: 426
- Injection attempts detected: 6

## Error Codes

| Status | Count |
|--------|-------|
| 401 | 180 |
| 429 | 152 |
| 403 | 75 |
| 404 | 16 |
| 400 | 2 |
| 502 | 1 |

## Latency (ms)

| Metric | Value |
|--------|-------|
| Average | 262 |
| P50 | 3 |
| P95 | 25 |
| P99 | 102 |

## Top Routes

| Route | Count |
|-------|-------|
| GET /api/classrooms/ | 3637 |
| POST /api/sessions/ | 3196 |
| GET /api/today/:classroomId | 2572 |
| GET /api/classrooms/:id/health | 1560 |
| GET /api/sessions/summary/:classroomId | 931 |
| GET /api/classrooms/:id/student-summary | 784 |
| GET /api/classrooms/:id/messages | 696 |
| GET /api/classrooms/:id/plans | 627 |
| GET /api/classrooms/:id/runs | 496 |
| GET /api/classrooms/:id/interventions | 476 |
| POST /api/family-message/ | 101 |
| POST /api/tomorrow-plan/stream | 75 |
| GET /api/tomorrow-plan/stream/:streamId/events | 75 |
| POST /api/differentiate/ | 71 |
| GET /health | 64 |

## Inference Providers

| Provider | Count |
|----------|-------|
| mock | 15626 |
| gemini | 318 |
