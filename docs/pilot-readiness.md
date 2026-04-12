# Pilot Readiness — PrairieClassroom OS

## Purpose

This document separates demo proof from real classroom readiness. PrairieClassroom OS can prove its workflow shape today with synthetic/demo data, but real classroom or student data requires additional controls before pilot use.

## Current Readiness Verdict

- Synthetic/demo proof: ready.
- Local technical pilot rehearsal with fake or de-identified records: ready when `npm run release:gate` passes on the target machine.
- Real classroom data pilot: not ready until the blockers below are closed.
- Hosted Gemini with real classroom or student data: prohibited.

## Operating Modes

| Mode | Data allowed | Model lane | Purpose |
|---|---|---|---|
| `demo` | seeded synthetic classrooms only | mock or hosted Gemini | demos, walkthroughs, judging |
| `synthetic-proof` | synthetic eval and fixture data | mock, Ollama, or hosted Gemini | artifact-backed proof and regression checks |
| `local-pilot-rehearsal` | fake or manually de-identified classroom notes | mock or Ollama | teacher/EA workflow rehearsal without sensitive records |
| `local-pilot-real-data` | real records only after readiness blockers close | Ollama/local only | bounded school pilot on controlled hardware |
| `hosted-real-data` | none | none | explicitly unsupported |

## Real-Data Blockers

Do not enter `local-pilot-real-data` until all of these are true:

- Initial API role scopes are verified for teacher and EA workflows, and any substitute/reviewer access uses dedicated bounded views rather than raw classroom-memory endpoints.
- Each classroom has an explicit data-retention setting.
- Operators can run and verify the classroom memory lifecycle commands for export, anonymize, purge, backup, and restore.
- Anonymized exports receive manual free-text review before they are shared outside the pilot boundary.
- Pilot participants have written expectations for what the system can and cannot do.
- Safety review artifacts exist for family messages, support patterns, forecasts, survival packets, and scaffold-decay outputs.
- A human validation evidence plan is active, with teacher and EA rubrics.
- Incident response steps exist for accidental sensitive-data exposure, incorrect output, or unauthorized access.
- Hosted lanes are technically and operationally blocked from real classroom data.

## Pilot Evidence Artifacts

Create these artifacts before making any product claims from a pilot:

- `docs/pilot/participant-brief.md` — teacher/EA expectations, safety boundaries, and non-goals.
- `docs/pilot/usefulness-rubric.md` — 1-5 ratings for actionability, trust, time saved, cognitive load, and edit burden.
- `docs/pilot/session-log-template.md` — de-identified task, inputs used, output reviewed, teacher action, and friction.
- `docs/pilot/claims-ledger.md` — claims supported by evidence, claims not yet supported, and source artifact links.
- `docs/pilot/incident-log.md` — any safety, privacy, access, or output-quality concern.

### Synthetic walkthrough baseline

`docs/structured-walkthrough-v1.md` is a maintainer-run walkthrough of 8 product scenarios against the demo classroom in mock mode. It is **not** human validation — it is a synthetic friction log that surfaces design gaps at hackathon pace without claiming real-teacher use. It is the durable design-quality baseline the project re-runs each sprint, and it contains an explicit checklist of what would need to change for a walkthrough like this to count as real pilot evidence.

## Minimum Pilot Loop

1. Run `npm run ops:status` and confirm no inventory or gate drift.
2. Run `npm run release:gate` on the target machine.
3. If testing live local inference, run `npm run host:preflight:ollama` and `npm run release:gate:ollama`.
4. Confirm the route role scopes in `docs/api-surface.md` match the adult workflow being rehearsed.
5. Run `npm run memory:admin -- summary --classroom <id>` before the session and save a backup with `npm run memory:admin -- backup --classroom <id>`.
6. Use only demo or de-identified records unless real-data blockers are closed.
7. If evidence leaves the local pilot machine, use `npm run memory:admin -- anonymize --classroom <id>` and manually review free-text fields.
8. Ask the teacher or EA to complete one workflow loop: Today, Prep, Ops, Review.
9. Capture usefulness ratings and friction notes.
10. Update the claims ledger before public copy changes.

## Memory Lifecycle Commands

The memory lifecycle CLI operates on one classroom SQLite database at a time:

```bash
npm run memory:admin -- summary --classroom demo-okafor-grade34
npm run memory:admin -- export --classroom demo-okafor-grade34
npm run memory:admin -- anonymize --classroom demo-okafor-grade34
npm run memory:admin -- backup --classroom demo-okafor-grade34
npm run memory:admin -- prune --classroom demo-okafor-grade34 --confirm
npm run memory:admin -- purge --classroom demo-okafor-grade34 --confirm
npm run memory:admin -- restore --classroom demo-okafor-grade34 --from output/memory-admin/<backup>.sqlite --confirm
```

`prune`, `purge`, and `restore` require `--confirm`. `anonymize` structurally replaces classroom IDs and detected student-reference fields, but it is not a substitute for adult review of free-text notes.

## Access Audit

Every protected orchestrator request is written to the JSONL request log at `output/request-logs/<date>.jsonl` with `classroom_id`, `classroom_role`, `demo_bypass`, and a stable `auth_outcome` field. `npm run audit:log` queries those logs for the governance question behind pilot readiness: "who accessed which classroom record, when, under which role, and was it allowed?"

```bash
# Daily review of all demo activity for a window
npm run audit:log -- --classroom demo-okafor-grade34 --from 2026-04-11 --to 2026-04-12

# Denials only across every classroom
npm run audit:log -- --outcome denied

# Snapshot a classroom's access history to a pilot evidence artifact
npm run audit:log -- --classroom cls-alpha --from 2026-04-01 --artifact
```

Pass `--artifact` (or `--out <path>`) to write a JSON snapshot to `output/access-audit/` that includes the applied filters, per-classroom + per-role + per-outcome summary, and up to `--limit` matching records. That snapshot is the intended audit evidence when a school or district asks who has touched classroom records.

`prune` applies the `retention_policy` declared in the classroom profile JSON (or a `--default-days <n>` flag) and deletes time-series rows older than the configured window from every retention-eligible table. The retention policy is a governance contract: a `default_days` value covers every record type, with optional per-table overrides (for example, shorter windows on `sessions` and `feedback` telemetry than on `interventions`). Every prune run writes a tombstone artifact to `output/memory-admin/` naming the policy source, the per-table cutoffs, and the row counts removed. That artifact is the intended pilot-audit evidence when a school or district asks how long classroom records are retained.

## Public Claim Rules

Allowed before human validation:

- The system has synthetic/demo proof artifacts.
- The system has local-first architecture and privacy-first deployment intent.
- The system supports teacher and EA classroom operations workflows.

Not allowed before human validation:

- Claims that teachers, EAs, students, or families have validated outcomes.
- Claims of reduced incidents, improved achievement, or improved family trust.
- Claims of district readiness or production readiness.
