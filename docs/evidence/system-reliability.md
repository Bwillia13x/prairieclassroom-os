# System Reliability

*Generated 2026-04-21*

**Log files analysed:** 13
**Date range:** 2026-04-08 to 2026-04-21
**Total requests:** 28557

## Reliability

- Success rate (2xx/3xx): **92.4%** (26389 / 28557)
- Client/server errors: 2168
- Injection attempts detected: 46

## Error Codes

| Status | Count |
|--------|-------|
| 429 | 1004 |
| 401 | 904 |
| 403 | 105 |
| 404 | 59 |
| 500 | 50 |
| 502 | 35 |
| 400 | 10 |
| 422 | 1 |

## Latency (ms)

| Metric | Value |
|--------|-------|
| Average | 879 |
| P50 | 2 |
| P95 | 31 |
| P99 | 27056 |

## Top Routes

| Route | Count |
|-------|-------|
| POST /api/sessions/ | 15213 |
| GET /api/classrooms/ | 3358 |
| GET /api/today/:classroomId | 2669 |
| GET /api/classrooms/:id/health | 1388 |
| GET /api/classrooms/:id/plans | 988 |
| GET /api/classrooms/:id/messages | 859 |
| GET /api/classrooms/:id/student-summary | 766 |
| GET /api/classrooms/:id/interventions | 591 |
| GET /api/curriculum/entries | 446 |
| GET /api/curriculum/subjects | 380 |
| POST /api/tomorrow-plan/ | 206 |
| GET /api/classrooms/:id/runs | 200 |
| POST /api/survival-packet/ | 163 |
| POST /api/support-patterns/ | 151 |
| POST /api/family-message/ | 143 |

## Inference Providers

| Provider | Count |
|----------|-------|
| mock | 27748 |
| gemini | 809 |
