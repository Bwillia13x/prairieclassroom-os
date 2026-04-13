# System Reliability

*Generated 2026-04-13*

**Log files analysed:** 6
**Date range:** 2026-04-08 to 2026-04-13
**Total requests:** 2907

## Reliability

- Success rate (2xx/3xx): **90.9%** (2643 / 2907)
- Client/server errors: 264
- Injection attempts detected: 27

## Error Codes

| Status | Count |
|--------|-------|
| 401 | 148 |
| 500 | 47 |
| 502 | 24 |
| 403 | 15 |
| 404 | 12 |
| 429 | 12 |
| 400 | 6 |

## Latency (ms)

| Metric | Value |
|--------|-------|
| Average | 5487 |
| P50 | 5 |
| P95 | 38153 |
| P99 | 94095 |

## Top Routes

| Route | Count |
|-------|-------|
| GET /api/today/:classroomId | 641 |
| GET /api/classrooms/ | 594 |
| GET /api/classrooms/:id/plans | 270 |
| GET /api/classrooms/:id/messages | 235 |
| POST /api/sessions/ | 189 |
| GET /api/classrooms/:id/health | 185 |
| GET /api/classrooms/:id/interventions | 180 |
| POST /api/tomorrow-plan/ | 80 |
| GET /api/classrooms/:id/student-summary | 66 |
| POST /api/survival-packet/ | 54 |
| POST /api/family-message/ | 52 |
| POST /api/support-patterns/ | 50 |
| GET /health | 45 |
| POST /api/ea-briefing/ | 39 |
| GET /api/curriculum/entries | 36 |

## Inference Providers

| Provider | Count |
|----------|-------|
| mock | 2592 |
| gemini | 315 |
