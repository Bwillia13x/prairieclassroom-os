# Drill 01 — Wrong-adult exposure

- **Severity band:** S1 (critical)
- **Category:** access / privacy
- **Driven by:** pilot coordinator, maintainer observing
- **Prerequisite:** `docs/pilot/incident-drills/README.md` common preconditions satisfied.

## Trigger

An adult who is scoped to a *narrower* role than teacher has viewed content they should not have been able to see. Common concrete shapes:

- A substitute saw tomorrow's plan, family-message history, or a support-patterns report.
- A reviewer saw the "Today" live snapshot, survival packet, or EA briefing — any surface reviewers are scoped out of.
- An EA saw a family-message approval screen or a classroom-health dashboard.
- A parent saw a raw intervention note (not the approved family message).

The drill works the same for all four shapes. Use the substitute variant for the first rehearsal unless the pilot context argues otherwise.

## Objective

Prove the team can, within one hour, (a) confirm what was actually exposed, (b) close the exposure, (c) evaluate whether the event contradicts the scope-matrix claim, and (d) produce the incident-log entry + updated claim where relevant.

---

## Scripted scenario (for drill rehearsal)

Demo classroom, no real data. The coordinator plays two roles sequentially.

**Setup (5 min):**

1. `npm run pilot:reset` — clean demo state.
2. `npm run pilot:start` in one terminal.
3. Open the app in two browser windows side by side. Window A will be the teacher. Window B will be the "wrong adult."

**Act 1 — the wrong adult has the wrong scope (simulate the breach):**

4. In window A, set the role to **teacher** via the `RoleContextPill`. Generate a Tomorrow Plan on the demo classroom so there is something in history.
5. In window B, set the role to **substitute** via the `RoleContextPill`. The substitute downgrade from teacher should surface the `role-pill__confirm` dialog. Confirm and proceed.
6. Attempt to navigate to **Prep → Tomorrow Plan** in window B.

**Expected outcome:** The Tomorrow Plan tab is *not in the nav* for the substitute role. Window B cannot reach it by click. Any attempted direct request (e.g., via the URL hash) is caught by `getVisibleTabs(role)` and routes to the first visible tab for the role.

> **Drill fails here if:** window B can see or reach the Tomorrow Plan tab.

**Act 2 — curl the backend (prove server enforcement):**

7. From the maintainer terminal, run:

    ```bash
    curl -s -o /dev/null -w "%{http_code}\n" \
      -H "X-Classroom-Code: $CLASSROOM_CODE" \
      -H "X-Classroom-Role: substitute" \
      http://localhost:3001/api/classrooms/$CLASSROOM_ID/plans
    ```

**Expected outcome:** HTTP `403` with `detail_code: classroom_role_forbidden` and `allowed_roles: ["teacher", "reviewer"]`. Confirms the scope matrix is enforced server-side even if the client is bypassed.

> **Drill fails here if:** the response is 200 or a 5xx.

---

## Response steps (runbook for a real event)

When a *real* wrong-adult-exposure is suspected:

1. **T+0 min — stop the session.** Pilot coordinator closes the session immediately. Participants are told the pilot is paused while a privacy event is investigated. No hostile framing, no blame — just paused.
2. **T+5 min — pull the evidence.** Run:

    ```bash
    npm run audit:log -- --classroom <classroom_id> --from <session_start> --artifact
    ```

    Artifact writes to `output/access-audit/`. Record the file path in the incident entry.

3. **T+15 min — enumerate what was exposed.** From the audit artifact, list every `auth_outcome: allowed` request for the affected role in the session window. If the role is narrower than the request would normally need, that is the exposure set.
4. **T+30 min — close the exposure.** Rotate the classroom code (re-issue via the classroom profile). If the wrong adult retained screenshots or notes, document that in the entry; deletion depends on the adult's cooperation and cannot be compelled by software.
5. **T+45 min — evaluate claim impact.** Check `docs/pilot/claims-ledger.md` for the two scope-matrix rows (substitute bounded view, reviewer bounded view) and the "Access audit log records who accessed which classroom record" row. If any of them are contradicted by the evidence, update the status and date.
6. **T+60 min — write the entry.** Append `INC-YYYYMMDD-01` to `docs/pilot/incident-log.md` with severity S1, category `access` or `privacy`, the audit-artifact path, and the disposition (`open` until all follow-ups land).
7. **Until resolved:** no new real-data pilot sessions on this classroom or any classroom sharing a coordinator with this one.

## What good looks like

- The evidence pull completes in under 15 minutes without needing the maintainer to intervene.
- The `allowed_roles` values in the audit artifact exactly match the SCOPE_MATRIX in `services/orchestrator/__tests__/auth.test.ts`.
- The incident-log entry is written the same day, not queued.
- If a scope matrix change is needed, it lands as a test-driven change — `auth.test.ts` updated first, then the server, then the UI.

## What bad looks like

- The audit-log artifact is missing entries for the affected role during the session (log gap).
- The coordinator needs the maintainer to interpret the `role_scope` column in `docs/api-surface.md`. The coordinator should be able to read this independently.
- The session continues while the incident is being investigated.
- A claim in the ledger is contradicted by the evidence and is *not* updated the same day.

## Follow-up artifacts that this drill may produce

- Updated row(s) in `docs/pilot/claims-ledger.md`.
- New test case in `services/orchestrator/__tests__/auth.test.ts` if the scope matrix needed correction.
- Updated copy in `docs/pilot/participant-brief.md` if the exposure surfaced a role-scope misunderstanding.
