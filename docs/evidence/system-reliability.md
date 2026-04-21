# System Reliability

*Generated 2026-04-21*

**Log files analysed:** 13
**Date range:** 2026-04-08 to 2026-04-21
**Total requests:** 27978

## Reliability

- Success rate (2xx/3xx): **92.3%** (25832 / 27978)
- Client/server errors: 2146
- Injection attempts detected: 44

## Error Codes

| Status | Count |
|--------|-------|
| 429 | 1004 |
| 401 | 886 |
| 403 | 102 |
| 404 | 59 |
| 500 | 50 |
| 502 | 34 |
| 400 | 10 |
| 422 | 1 |

## Latency (ms)

| Metric | Value |
|--------|-------|
| Average | 880 |
| P50 | 2 |
| P95 | 30 |
| P99 | 26220 |

## Top Routes

| Route | Count |
|-------|-------|
| POST /api/sessions/ | 15136 |
| GET /api/classrooms/ | 3229 |
| GET /api/today/:classroomId | 2574 |
| GET /api/classrooms/:id/health | 1336 |
| GET /api/classrooms/:id/plans | 969 |
| GET /api/classrooms/:id/messages | 835 |
| GET /api/classrooms/:id/student-summary | 736 |
| GET /api/classrooms/:id/interventions | 562 |
| GET /api/curriculum/entries | 446 |
| GET /api/curriculum/subjects | 380 |
| POST /api/tomorrow-plan/ | 201 |
| GET /api/classrooms/:id/runs | 179 |
| POST /api/survival-packet/ | 159 |
| POST /api/support-patterns/ | 148 |
| POST /api/family-message/ | 136 |

## Inference Providers

| Provider | Count |
|----------|-------|
| mock | 27194 |
| gemini | 784 |
