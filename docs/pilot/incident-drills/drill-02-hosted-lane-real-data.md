# Drill 02 — Hosted lane real-data exposure

- **Severity band:** S1 (critical)
- **Category:** privacy
- **Driven by:** pilot coordinator, maintainer observing
- **Prerequisite:** `docs/pilot/incident-drills/README.md` common preconditions satisfied.

## Trigger

Real classroom data has reached — or may have reached — a hosted model lane. Common concrete shapes:

- A pilot participant accidentally ran `npm run eval:run -- --mode gemini` or similar against a real classroom database.
- A maintainer edited the inference configuration and left `INFERENCE_MODE=gemini` active during a session that touched real data.
- A screenshot or log containing a real intervention note was pasted into a hosted model playground outside the pilot.
- Mock-mode was disabled mid-session without the teacher understanding what that meant.

All four shapes are S1. The remediation steps overlap but evidence collection differs per shape.

## Objective

Prove the team can, within one hour, (a) confirm whether real data actually crossed into the hosted lane, (b) stop any ongoing hosted traffic, (c) re-assert the "hosted Gemini lane is prohibited from real classroom data" claim, and (d) produce the incident-log entry.

---

## Scripted scenario (for drill rehearsal)

Demo classroom. The drill uses the demo classroom specifically because the demo classroom is *allowed* on hosted lanes — the drill rehearses the response shape without producing a real incident.

**Setup (5 min):**

1. `npm run pilot:reset`.
2. `npm run pilot:start -- --inference mock`.
3. Confirm `echo $INFERENCE_MODE` shows `mock` (or is unset, which defaults to mock).

**Act 1 — simulate the mistake:**

4. In a separate terminal, set `export INFERENCE_MODE=gemini` and start a second stack on a different port (`ORCHESTRATOR_PORT=3002 npm run pilot:start`). Do **not** restart the app window the coordinator was using — the goal is to simulate that "a second process started" rather than "the session's lane flipped."
5. Run `npm run gemini:readycheck` to confirm the hosted lane is actually reachable (or deliberately unreachable if credentials are not configured — the readycheck output is the evidence either way).

**Act 2 — detect and respond (the drill):**

6. Pretend the coordinator has just noticed an unexpected inference-mode change. First action: in the app window, generate any output. Confirm the response's `MockModeBanner` is *absent* — this is the signal to the teacher that they are not on mock mode.

> **Drill fails here if:** the banner state is ambiguous (mock-mode on a hosted response, or hosted-mode without a clear non-mock indicator). The whole point of the banner is to be unambiguous.

7. Kill the hosted process immediately: `lsof -ti:3002 | xargs kill`.
8. Pull the hosted-lane evidence. Two sources:
   - `output/access-audit/` — the access-audit log does not record model lane, but the orchestrator's request log (`output/request-log*.jsonl` if enabled, or `services/orchestrator` stdout capture) does.
   - `scripts/audit-log.mjs` output, filtered by timestamp window.

   Confirm that every hosted request in the window targeted the demo classroom id and no other.

9. Re-run the original mock session to confirm the primary session was unaffected.

---

## Response steps (runbook for a real event)

When a *real* hosted-lane exposure is suspected:

1. **T+0 min — kill hosted traffic.** `lsof -ti:<orchestrator_port> | xargs kill` for every port running a non-mock lane. If the maintainer is not on the call, the coordinator runs this without waiting.
2. **T+5 min — screenshot the mock-mode banner state** on every app window the teacher/EA/substitute had open. This establishes what the session participants could reasonably have understood about the lane.
3. **T+15 min — pull the request-log window.** Collect every request made to the orchestrator during the session. Classify each by classroom id. Any request with a non-demo classroom id on a hosted lane is a real exposure.
4. **T+30 min — notify affected participants.** If real classroom data reached hosted, the teacher and the classroom principal (if applicable) are told — not by the software, by the coordinator, same day. The notification names what was exposed in plain language. Scripted template:

    > "During today's pilot session, classroom data from `[classroom alias]` was sent to a hosted model lane (Google Gemini) instead of the local model. We do not keep hosted-lane outputs and Google's retention policy for this API is `[link]`. The lane has been shut down. We're logging this as incident INC-YYYYMMDD-NN and will share the outcome with you."

5. **T+45 min — freeze hosted lane for the duration of the pilot.** Add `INFERENCE_MODE_LOCK=mock` or equivalent to the pilot coordinator's shell, and confirm both stacks refuse to start on a hosted lane until the lock is removed. The maintainer handles the actual env enforcement.
6. **T+60 min — update claims.** `docs/pilot/claims-ledger.md` row "Hosted Gemini lane is prohibited from real classroom data" moves to `contradicted` with evidence pointing to the incident id. This is the single most important claim to keep honest — do not soften the downgrade.
7. **Before the next session:** the maintainer lands a test or config change that makes the mistake structurally harder. The incident-log entry stays `open` until that change lands.

## What good looks like

- The hosted lane is killed within five minutes of detection.
- The request-log inspection is mechanical — the coordinator runs a one-line jq/grep and produces the exposure set without interpretation.
- The participant notification goes out the same day, in plain language, not through the software.
- The claim in the ledger moves to `contradicted` without argument.
- A structural safeguard (env lock, preflight check, or refusing a non-demo classroom id on a hosted lane) lands before the next real-data pilot session.

## What bad looks like

- Hosted traffic continues for more than 15 minutes after detection because the coordinator is waiting for the maintainer.
- The teacher/principal notification is delayed beyond the same day because "we're still figuring out what happened."
- The ledger is not updated because the exposure was "probably minor."
- No structural safeguard lands before the next session.

## Follow-up artifacts that this drill may produce

- Updated row in `docs/pilot/claims-ledger.md` for the hosted-lane claim.
- Possible new preflight check in `scripts/gemini-readycheck.mjs` or `scripts/pilot-start.mjs` that refuses a non-demo classroom on hosted.
- Updated copy in `CLAUDE.md` cost/mode guardrails if the config path that caused the mistake was ambiguous.
