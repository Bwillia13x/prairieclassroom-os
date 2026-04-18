# PrairieClassroom OS — Incident Response Drills

**Purpose:** Rehearsable scripts for the five incident categories the project can reasonably anticipate. Each drill has a trigger, the person who runs it, the steps to take in order, and a "what good looks like" section so the coordinator knows when the drill has been passed.

**Why drills and not just the incident log:** The incident log captures what happened. The drills rehearse what *will* happen when it does. Running each drill once — on the demo classroom, with no real data — before real-data pilot sessions is a G-14 prerequisite.

**Who runs a drill:** The pilot coordinator, with the maintainer observing. The first run of any drill should be scheduled, not spontaneous — the point is to prove the runbook works before it is needed in anger.

**Frequency:** Drill 1-5 once before real-data pilot begins. Re-run any drill whose logic materially changes. Run a random drill at least once between pilot sessions to stay sharp.

---

## Drill index

| # | File | Trigger | Severity band |
|---|---|---|---|
| 1 | `drill-01-wrong-adult-exposure.md` | The wrong adult (EA, substitute, reviewer, or parent) has seen classroom content they were not scoped to see. | S1 |
| 2 | `drill-02-hosted-lane-real-data.md` | Real classroom data has reached — or may have reached — a hosted model lane. | S1 |
| 3 | `drill-03-diagnostic-language-output.md` | A generation output contains clinical, diagnostic, risk-score, or discipline-scoring language. | S1 |
| 4 | `drill-04-unapproved-family-message.md` | A family message was communicated to a family without the teacher's explicit approval step, or the approved message contains a material error. | S1 |
| 5 | `drill-05-memory-corruption.md` | Classroom memory is corrupted, lost, or restored incorrectly from a backup. | S2 (memory loss) or S1 (wrong restore crossing classrooms). |

All S1 drills end with an entry in `docs/pilot/incident-log.md` and a check against `docs/pilot/claims-ledger.md` for any public claim the incident contradicted.

---

## Common preconditions (all drills)

Before starting any drill:

1. **Demo classroom only.** `npm run pilot:reset` confirms a clean demo state.
2. **Maintenance host.** All drills run on the pilot coordinator's or maintainer's laptop, never on a pilot-classroom device.
3. **Incident log open.** `docs/pilot/incident-log.md` is open in a writable tab before the drill begins.
4. **Backups visible.** `output/memory-admin/` is inspected to confirm the most recent backup exists and is dated.
5. **Maintainer on standby.** For first runs, the maintainer is reachable synchronously; for repeat runs, asynchronously.

## Common closeout (all drills)

After any drill:

1. Post an `INC-YYYYMMDD-NN` entry in `docs/pilot/incident-log.md` with severity, disposition, and evidence pointer.
2. If the drill surfaced a genuine bug (not a rehearsal artifact), open a tracked issue and link it from the log entry.
3. If the drill contradicts any row in `docs/pilot/claims-ledger.md`, update that row's status and date — do not rewrite history.
4. Note the drill outcome in a one-line append to this README's "Drill history" section below.

---

## Drill history

*Append one line per drill run. Keep the newest on top. Format: `YYYY-MM-DD — drill-NN — coordinator role — outcome (pass / pass-with-note / fail) — log ref`*

- *No drills have been run yet. The first entry lands when the first drill is executed.*

---

*Incident Drill Suite v1. Companion to `incident-log.md`, `safety-artifact-review-template.md`, `safety-artifacts/`, `claims-ledger.md`.*
