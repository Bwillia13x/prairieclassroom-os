# System Reliability

*Generated 2026-05-17*

**Log files analysed:** 19
**Date range:** 2026-04-25 to 2026-05-17
**Total requests:** 43299

## Reliability

- Success rate (2xx/3xx): **97.2%** (42081 / 43299)
- Client/server errors: 1218
- Injection attempts detected: 42

## Error Codes

| Status | Count |
|--------|-------|
| 429 | 590 |
| 401 | 379 |
| 403 | 172 |
| 404 | 62 |
| 502 | 13 |
| 400 | 2 |

## Latency (ms)

| Metric | Value |
|--------|-------|
| Average | 509 |
| P50 | 4 |
| P95 | 38 |
| P99 | 335 |

## Top Routes

| Route | Count |
|-------|-------|
| GET /api/classrooms/ | 8543 |
| GET /api/today/:classroomId | 7242 |
| POST /api/sessions/ | 4812 |
| GET /api/classrooms/:id/health | 4793 |
| GET /api/sessions/summary/:classroomId | 3113 |
| GET /api/classrooms/:id/student-summary | 2644 |
| GET /api/health | 2302 |
| GET /api/classrooms/:id/messages | 1865 |
| GET /api/classrooms/:id/plans | 1376 |
| GET /api/classrooms/:id/profile | 1368 |
| GET /api/classrooms/:id/runs | 1296 |
| GET /api/classrooms/:id/interventions | 1104 |
| POST /api/family-message/ | 228 |
| GET /health | 200 |
| GET /api/classrooms | 178 |

## Inference Providers

| Provider | Count |
|----------|-------|
| mock | 39674 |
| gemini | 3625 |
