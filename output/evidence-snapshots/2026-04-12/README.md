# Evidence Portfolio

This directory contains auto-generated evidence reports for PrairieClassroom OS. Each report is produced by `npm run evidence:generate` and summarises real usage data from the classroom SQLite databases and the request-log JSONL files.

## Reports

| File | Source | Content |
|------|--------|---------|
| `feedback-summary.md` | `data/memory/*.sqlite` (feedback table) | Total ratings, per-panel breakdown, recent comments |
| `session-patterns.md` | `data/memory/*.sqlite` (sessions table) | Session counts, duration stats, common workflow sequences |
| `system-reliability.md` | `output/request-logs/*.jsonl` | Success rate, latency percentiles, top routes, error codes, provider distribution |

## Workflow

1. **Generate:** `npm run evidence:generate` reads all databases and logs, writes fresh reports here.
2. **Snapshot:** `npm run evidence:snapshot` copies this directory to `output/evidence-snapshots/YYYY-MM-DD/` for archival.
3. **Review:** The Usage Insights panel in the web UI provides a live view of the same data via the `/api/feedback/summary` and `/api/sessions/summary` endpoints.

## Notes

- Reports reflect *all* classrooms across the memory directory, not just the demo classroom.
- The feedback and sessions tables may be empty until those API routes are exercised during real or demo use.
- System reliability data comes from the orchestrator request logger (JSONL), which records every API request regardless of inference mode.
- No student data or PII appears in these reports. Feedback and session records are aggregated by panel and workflow, not by student.
