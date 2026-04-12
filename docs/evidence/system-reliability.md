# System Reliability

*Generated 2026-04-12*

**Log files analysed:** 4
**Date range:** 2026-04-08 to 2026-04-11
**Total requests:** 1392

## Reliability

- Success rate (2xx/3xx): **90.5%** (1260 / 1392)
- Client/server errors: 132
- Injection attempts detected: 27

## Error Codes

| Status | Count |
|--------|-------|
| 401 | 96 |
| 502 | 22 |
| 403 | 8 |
| 404 | 6 |

## Latency (ms)

| Metric | Value |
|--------|-------|
| Average | 11152 |
| P50 | 6 |
| P95 | 73178 |
| P99 | 169964 |

## Top Routes

| Route | Count |
|-------|-------|
| GET /api/today/:classroomId | 307 |
| GET /api/classrooms/ | 283 |
| GET /api/classrooms/:id/plans | 157 |
| GET /api/classrooms/:id/interventions | 146 |
| GET /api/classrooms/:id/messages | 145 |
| POST /api/tomorrow-plan/ | 64 |
| POST /api/family-message/ | 43 |
| POST /api/survival-packet/ | 42 |
| POST /api/support-patterns/ | 35 |
| GET /health | 33 |
| POST /api/differentiate/ | 33 |
| POST /api/ea-briefing/ | 31 |
| POST /api/complexity-forecast/ | 28 |
| GET /api/debt-register/:classroomId | 21 |
| POST /api/scaffold-decay/ | 7 |

## Inference Providers

| Provider | Count |
|----------|-------|
| mock | 1089 |
| gemini | 303 |
