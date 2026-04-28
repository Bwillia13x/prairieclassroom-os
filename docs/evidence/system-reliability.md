# System Reliability

*Generated 2026-04-28*

**Log files analysed:** 4
**Date range:** 2026-04-25 to 2026-04-28
**Total requests:** 7473

## Reliability

- Success rate (2xx/3xx): **96.6%** (7216 / 7473)
- Client/server errors: 257
- Injection attempts detected: 6

## Error Codes

| Status | Count |
|--------|-------|
| 401 | 140 |
| 403 | 65 |
| 429 | 38 |
| 404 | 13 |
| 400 | 1 |

## Latency (ms)

| Metric | Value |
|--------|-------|
| Average | 550 |
| P50 | 3 |
| P95 | 39 |
| P99 | 299 |

## Top Routes

| Route | Count |
|-------|-------|
| POST /api/sessions/ | 1850 |
| GET /api/classrooms/ | 1614 |
| GET /api/today/:classroomId | 1176 |
| GET /api/classrooms/:id/health | 640 |
| GET /api/classrooms/:id/student-summary | 346 |
| GET /api/classrooms/:id/messages | 338 |
| GET /api/sessions/summary/:classroomId | 323 |
| GET /api/classrooms/:id/plans | 291 |
| GET /api/classrooms/:id/runs | 181 |
| GET /api/classrooms/:id/interventions | 177 |
| POST /api/family-message/ | 54 |
| GET /health | 51 |
| POST /api/tomorrow-plan/stream | 43 |
| GET /api/tomorrow-plan/stream/:streamId/events | 43 |
| POST /api/tomorrow-plan/ | 30 |

## Inference Providers

| Provider | Count |
|----------|-------|
| mock | 7155 |
| gemini | 318 |
