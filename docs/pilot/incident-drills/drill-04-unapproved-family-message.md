# Drill 04 — Unapproved family message

- **Severity band:** S1 (critical)
- **Category:** safety / output-quality
- **Driven by:** pilot coordinator, maintainer observing
- **Prerequisite:** `docs/pilot/incident-drills/README.md` common preconditions satisfied.

## Trigger

A family has received a message that *either* never passed through the explicit approval step *or* contained a material error in the approved version. Common concrete shapes:

- The teacher copied a draft (not the approved text) into the school communication portal.
- The teacher approved a draft but edited the portal-side text and introduced an error (wrong student alias, wrong date, wrong tone).
- The approval UI was bypassed by calling `POST /api/family-message/approve` directly without the dialog's confirm step.
- A substitute or EA screenshot of the draft panel was sent to a family by a classroom helper who mistook it for an approved note.

Shapes 1, 2, 4 are human-process failures; shape 3 would be a real structural failure. The drill treats all four the same until evidence distinguishes them.

## Objective

Prove the team can, within one hour, (a) retrieve the exact text that reached the family, (b) identify whether the approval gate failed or the human process failed, (c) follow up with the family, and (d) evaluate whether the claim "Human-in-the-loop approval for family messages" holds.

---

## Scripted scenario (for drill rehearsal)

Demo classroom. No real family is ever contacted during rehearsal.

**Setup (5 min):**

1. `npm run pilot:reset`.
2. `npm run pilot:start -- --inference mock`.

**Act 1 — the approval path works (baseline check):**

3. Open **Review → Family Message**. Draft a `routine_update` message about `Mika`. The panel produces a draft with `teacher_approved: false`.
4. Click the approval button. The `MessageApprovalDialog` opens with the two-step confirmation (review full text → explicit "I approve" action).
5. Complete the approval. The record now has `teacher_approved: true`.

**Expected outcome:** The approval dialog appeared between the draft and the approved state. `teacher_approved` flipped only after the explicit confirm step. The `MessageApprovalFunnel` visualization shows one draft, one approved.

> **Drill fails here if:** the approval dialog does not appear, or `teacher_approved` flips without the confirm step.

**Act 2 — simulate the bypass (prove the backend still enforces):**

6. From the maintainer terminal, attempt a direct approval without the dialog's confirmation token (if such a token exists in the route):

    ```bash
    curl -s -w "\n%{http_code}\n" \
      -X POST \
      -H "Content-Type: application/json" \
      -H "X-Classroom-Code: $CLASSROOM_CODE" \
      -H "X-Classroom-Role: ea" \
      -d '{"draft_id":"<id>","teacher_approved":true}' \
      http://localhost:3001/api/family-message/approve
    ```

**Expected outcome:** HTTP `403` with `detail_code: classroom_role_forbidden` and `allowed_roles: ["teacher"]`. The EA role cannot approve even if they bypass the UI.

> **Drill fails here if:** the response is 200.

**Act 3 — the retrievability check:**

7. Query recent message history for the classroom:

    ```bash
    curl -s \
      -H "X-Classroom-Code: $CLASSROOM_CODE" \
      -H "X-Classroom-Role: teacher" \
      http://localhost:3001/api/classrooms/$CLASSROOM_ID/messages | jq '.messages[] | {draft_id, teacher_approved, plain_language_text}'
    ```

**Expected outcome:** The drill's approved message is present with `teacher_approved: true` and the exact approved text. Any real incident will need this retrieval path to reproduce exactly.

---

## Response steps (runbook for a real event)

When a *real* unapproved-message event is suspected:

1. **T+0 min — retrieve the exact text that reached the family.** This almost always means asking the family what they received. The coordinator phones the family the same day; the notification script is in step 5 below.
2. **T+5 min — retrieve what the system has on record.** Pull message history for the classroom (the `jq` query in Act 3 above). Compare the on-record `plain_language_text` against what the family reports receiving.
3. **T+15 min — classify the failure mode.** Four possibilities:
   - **Draft copied instead of approved.** The on-record record shows `teacher_approved: false` at the time of send.
   - **Approved but edited outside the system.** The on-record text matches the approved record, but what the family received has differences.
   - **Structural bypass.** The on-record record shows `teacher_approved: true` but no `MessageApprovalDialog` event in the session log, or the approval happened with a non-teacher role.
   - **Human-to-human misforward.** A draft screenshot was sent by an adult other than the teacher.

4. **T+30 min — fix the immediate harm.** If the message contained an error, the teacher sends a correction the same day. The coordinator writes the correction text (or helps the teacher write it). If the message was a draft that should not have been sent, the teacher sends a brief correction: "Please disregard the previous message — it was a working draft sent in error. The correct message will follow."
5. **T+45 min — notify the family explicitly.** If the on-record text differs materially from what the family received, that difference is named. Script:

    > "Earlier today you received a message about `[student alias]` from our classroom. I wanted to follow up directly — that message reached you before I had approved the final text, and I want to make sure you have the version I meant to send. `[Correct text follows.]` I'm sorry for the confusion."

6. **T+60 min — update claims.** `docs/pilot/claims-ledger.md` row "Human-in-the-loop approval for family messages" is `supported`. If the failure mode is structural (Act 3 curl returned 200, or the route accepted an EA approval), downgrade to `contradicted`. If the failure was human process (Act 1 or 2 in the classification), the claim can remain supported, but the row's evidence should cite the incident as a clarifying example.
7. **Before the next session:** if structural, the fix lands before real-data pilot resumes. If human-process, the `participant-brief.md` gets an explicit "the approved version of the message is the only version to copy into your communication channel" reminder.

## What good looks like

- The family is called the same day, by the teacher where possible, by the coordinator if the teacher is unreachable.
- The structural-vs-process classification is based on artifact evidence (request log + session log), not on memory of what happened.
- The correction message goes out within a few hours of the incident, not a few days.
- If structural, the fix is a minimal change with a new test case in `services/orchestrator/__tests__/family-message*.test.ts` that would have caught it.

## What bad looks like

- The family is not contacted.
- The classification is hand-waved ("probably human error") without checking the session log.
- The claims-ledger row stays untouched.
- The correction message is itself generated through the system without a careful second approval.

## Follow-up artifacts that this drill may produce

- Updated row in `docs/pilot/claims-ledger.md`.
- Possible new test case in `services/orchestrator/__tests__/family-message*.test.ts` or `__tests__/auth.test.ts`.
- Updated copy in `docs/pilot/participant-brief.md` about the approved-version discipline.
