# Drill 05 — Classroom memory corruption, loss, or cross-classroom restore

- **Severity band:** S2 (memory loss / corruption on one classroom) or S1 (restore crossing classroom boundaries)
- **Category:** data integrity / privacy
- **Driven by:** pilot coordinator, maintainer observing
- **Prerequisite:** `docs/pilot/incident-drills/README.md` common preconditions satisfied.

## Trigger

A classroom's per-classroom SQLite memory is lost, corrupted, or restored from a backup in a way that crosses classroom boundaries. Common concrete shapes:

- The SQLite file for a classroom is deleted (process crash + OS cleanup; wrong `rm`).
- The file is present but fails migrations (schema-version mismatch after a prompt-contracts change).
- A backup intended for classroom A is restored into classroom B (wrong `--classroom` flag on `npm run memory:admin -- restore`).
- Two classroom codes hash to the same legacy slug after a rename, causing writes to pool into one database.

Shape 3 is S1 because it is a privacy boundary violation; the other three shapes are S2 because they damage one classroom without leaking data.

## Objective

Prove the team can, within two hours (memory corruption takes longer to recover than a scope or lane mistake), (a) identify exactly what was lost or corrupted, (b) restore from backup without crossing classroom boundaries, (c) verify the restored memory matches a known snapshot, and (d) understand what the teacher and their pilot participants lost in the process.

---

## Scripted scenario (for drill rehearsal)

Demo classroom. The drill uses `npm run memory:admin` in its non-destructive modes first, then simulates a destructive mistake in a disposable copy of the database.

**Setup (10 min):**

1. `npm run pilot:reset` — clean demo state.
2. `npm run memory:admin -- backup --classroom $CLASSROOM_ID` — confirm backup writes to `output/memory-admin/`.
3. `npm run pilot:start -- --inference mock`.
4. Generate two interventions and one tomorrow plan so the classroom has recoverable content.

**Act 1 — the "safe path" check (export + restore roundtrip):**

5. `npm run memory:admin -- export --classroom $CLASSROOM_ID` — save the export JSON to `output/memory-admin/<classroom>-export-<timestamp>.json`.
6. Confirm the export contains the two interventions and one plan. This is the evidence baseline.
7. `npm run memory:admin -- backup --classroom $CLASSROOM_ID` — take a fresh backup.
8. Copy the SQLite file to a `.bak` so the rehearsal damage is recoverable outside the npm backup/restore tools.

**Act 2 — simulate corruption:**

9. In a separate terminal, truncate the classroom's SQLite file to 0 bytes:

    ```bash
    : > $CLASSROOM_DB_PATH  # destructive, but we have the .bak from step 8
    ```

10. Attempt any read — e.g., open **Today** on the demo classroom. The orchestrator should surface a clean error state rather than a crash.

> **Drill fails here if:** the orchestrator crashes (the whole process exits) rather than returning a structured error from the affected classroom's routes.

**Act 3 — restore:**

11. `npm run memory:admin -- restore --classroom $CLASSROOM_ID` — restore from the most recent backup.
12. Re-open **Today** and confirm the two interventions and the plan are present.
13. Run `npm run memory:admin -- export --classroom $CLASSROOM_ID` and diff the new export against the baseline export from step 5. The diff should be empty.

> **Drill fails here if:** the restore silently writes to a different classroom, or the diff between the baseline and post-restore export is non-empty.

**Act 4 — restore the rehearsal artifact too:**

14. Move the `.bak` back into place so the maintenance host is in a known state.

---

## Response steps (runbook for a real event)

When a *real* memory event is suspected:

1. **T+0 min — stop writes.** Pilot coordinator stops any sessions targeting the affected classroom. If the mistake was a cross-classroom restore, stop sessions on *both* classrooms until the integrity of each is confirmed.
2. **T+10 min — snapshot the current state.** Before any recovery, `cp` the current SQLite file to a forensic location (`output/memory-admin/forensic/<classroom>-<timestamp>.sqlite`). This is not a backup — it is evidence. Do not modify it.
3. **T+20 min — identify the event class.** Four classifications:
   - **Loss** — file missing or 0 bytes.
   - **Corruption** — file present, fails `PRAGMA integrity_check` or migrations.
   - **Cross-classroom restore** — file present, but contents belong to a different classroom.
   - **Pooling** — two classroom codes routing to the same database.

4. **T+30 min — restore from the newest untainted backup.** For corruption/loss, `npm run memory:admin -- restore --classroom <id>` from the most recent backup predating the event. For cross-classroom restore, the *wrong* classroom's backup must be un-applied first (restore the wrong classroom from its own backup predating the bad restore), then apply the right backup to the right classroom. Pooling requires code/config fix, not restore.
5. **T+60 min — verify.** `npm run memory:admin -- export` on each affected classroom, diff against the newest pre-event export. Any non-empty diff means the restore is incomplete.
6. **T+90 min — tell the teacher what they lost.** The restore only recovers up to the most recent backup; anything generated or logged between the backup and the event is gone. The coordinator tells the teacher plainly:

    > "We restored your classroom memory to the state it was in at `[backup timestamp]`. Anything you logged or generated between then and `[event timestamp]` is not recoverable in the system. If you remember any specific intervention from that window, you can re-log it now."

7. **T+120 min — update claims.** `docs/pilot/claims-ledger.md` row "Enforces per-classroom SQLite memory isolation with versioned migrations" is `supported`. If the event was a cross-classroom restore that actually succeeded (shape 3), the claim is `contradicted` and must be downgraded. Loss and corruption on a single classroom do not contradict the isolation claim.
8. **Before the next session:** if the event was pooling or cross-classroom restore, the structural fix lands first. If the event was loss/corruption, the backup cadence is reviewed — a longer gap between backups than the pilot risk tolerates must shrink before the next session.

## What good looks like

- The forensic snapshot exists before any recovery begins.
- The event classification is made from artifact evidence, not from memory.
- The teacher is told exactly what window was unrecoverable, in specific timestamps, not a vague apology.
- For a cross-classroom event, neither classroom's restore accidentally exports the wrong classroom's data to `output/memory-admin/`.

## What bad looks like

- Recovery is attempted before the forensic snapshot is taken.
- The teacher is told the memory is "fine now" without naming the window that was lost.
- Two restores are attempted back-to-back without diffing between them.
- A cross-classroom event is resolved without downgrading the isolation claim in the ledger.

## Follow-up artifacts that this drill may produce

- Forensic snapshot in `output/memory-admin/forensic/`.
- Updated row in `docs/pilot/claims-ledger.md` if the event was cross-classroom.
- Possible backup-cadence change reflected in the pilot's operating procedure.
- New test case in `services/memory/__tests__/` if a specific corruption pattern was exposed.
- If pooling was the shape, a code change in the classroom-id hashing layer plus a test that would have caught it.
