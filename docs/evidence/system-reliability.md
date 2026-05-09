# System Reliability

*Generated 2026-05-03*

**Log files analysed:** 9
**Date range:** 2026-04-25 to 2026-05-03
**Total requests:** 25679

## Reliability

- Success rate (2xx/3xx): **97.1%** (24940 / 25679)
- Client/server errors: 739
- Injection attempts detected: 12

## Error Codes

| Status | Count |
|--------|-------|
| 401 | 297 |
| 429 | 296 |
| 403 | 96 |
| 404 | 47 |
| 400 | 2 |
| 502 | 1 |

## Latency (ms)

| Metric | Value |
|--------|-------|
| Average | 325 |
| P50 | 4 |
| P95 | 27 |
| P99 | 107 |

## Top Routes

| Route | Count |
|-------|-------|
| GET /api/classrooms/ | 5701 |
| GET /api/today/:classroomId | 4189 |
| POST /api/sessions/ | 4103 |
| GET /api/classrooms/:id/health | 3002 |
| GET /api/sessions/summary/:classroomId | 2021 |
| GET /api/classrooms/:id/student-summary | 1713 |
| GET /api/classrooms/:id/messages | 1081 |
| GET /api/classrooms/:id/plans | 911 |
| GET /api/classrooms/:id/runs | 788 |
| GET /api/classrooms/:id/interventions | 719 |
| POST /api/family-message/ | 132 |
| GET /health | 108 |
| POST /api/tomorrow-plan/stream | 95 |
| GET /api/tomorrow-plan/stream/:streamId/events | 95 |
| POST /api/differentiate/ | 85 |

## Inference Providers

| Provider | Count |
|----------|-------|
| mock | 24297 |
| gemini | 1382 |
