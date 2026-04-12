# PrairieClassroom OS — Pilot Participant Brief

**For:** Teachers and Educational Assistants considering participation in a structured pilot.
**Read time:** 5–7 minutes.
**Purpose:** Give participants enough honest context to decide whether to join the pilot, what they can expect, what they should not expect, and what their rights are.

This brief is deliberately short. If you want the full system context, see `docs/spec.md`, `docs/safety-governance.md`, and `docs/pilot-readiness.md` in the repo.

---

## What PrairieClassroom OS is

PrairieClassroom OS is a classroom operations copilot built for Alberta K-6 teachers and EAs working in complex, inclusive classrooms. It helps with operational coordination tasks — differentiating a worksheet, drafting a plan for tomorrow, preparing an EA briefing, forecasting a difficult block, drafting a family message, logging an intervention — using locally-run or hosted Gemma 4 language models.

## What it is NOT

It is not:

- A student-facing chatbot. Students do not interact with it.
- A diagnosis engine. It does not tell you what a student "has."
- A behavior-risk or discipline scoring system. It does not score or rank students.
- A surveillance product. It does not track students or teachers beyond what you explicitly enter.
- An autonomous family-messaging sender. It drafts; you approve and send.
- A replacement for teacher or EA judgment. Every suggestion is a draft you decide to use, edit, or ignore.

If you see the system doing anything that looks like the above, stop using it and open a pilot incident log entry (see `docs/pilot/incident-log.md`).

## What you will be asked to do in this pilot

1. Read this brief and the safety governance summary below.
2. Walk through a small set of product scenarios (typically 6–8) during a 45–60 minute session.
3. Fill out a usefulness rubric (`docs/pilot/usefulness-rubric.md`) after the session — 1-to-5 scale on five dimensions. Takes about 5 minutes.
4. Optionally keep a lightweight self-log of additional sessions using `docs/pilot/session-log-template.md`.
5. Report any concern — safety, privacy, access, or output quality — to the pilot coordinator using `docs/pilot/incident-log.md`.

You are not being asked to:

- Enter real student names. Use the demo classroom or manually de-identify records yourself.
- Share your session with anyone outside the pilot.
- Commit to any ongoing use after the pilot ends.
- Validate or approve generated outputs for actual classroom use during the pilot session — the purpose of the pilot is to surface friction, not to run the system in production.

## Your control during the session

- You can stop at any time, without explanation.
- You can skip any scenario that feels uncomfortable.
- You can decline to answer any rubric question.
- You can ask the observer to pause, rewind, or clarify at any point.
- Nothing you say is attributed to you by name in any public artifact without your written consent.

## Data boundaries for the pilot

- The pilot runs against the **demo classroom** (`demo-okafor-grade34`) or a **manually de-identified** version of your own classroom's seed data. It does not run against real student records.
- Every classroom memory write the pilot touches is logged in `output/request-logs/` and can be queried with `npm run audit:log`. You can ask to see this log at any time.
- A point-in-time access audit artifact can be generated at the end of your session with `npm run audit:log -- --classroom <id> --from <date> --artifact`.
- Classroom memory can be exported, anonymized, backed up, or purged at any time through `npm run memory:admin`.
- Any classroom memory created in the demo environment during your session can be fully purged when the session ends, if you prefer — `npm run memory:admin -- purge --classroom <id> --confirm`.

## Hosted vs. local model lanes

The system supports multiple model backends. For the pilot:

- **mock mode** (default) — no real model calls, canned fixture responses. Useful for UI friction but does not produce realistic output.
- **Ollama mode** (local Gemma 4) — runs entirely on the pilot machine. Nothing leaves the hardware. This is the intended long-term deployment lane.
- **Hosted Gemini mode** — the hackathon proof lane. **Only synthetic/demo data is allowed here. Real classroom data is explicitly prohibited in the hosted lane.**
- **Paid Vertex mode** — disabled in the pilot unless the coordinator has explicitly opted in.

The coordinator will tell you which lane your session is running in. If you see real classroom data in a hosted lane at any point, stop the session and open an incident log entry.

## What we promise

- Your session will not be shared publicly without your consent.
- You will never be named in any project claim without your consent.
- The system will not be described publicly as "validated by a teacher" on the basis of your session alone — validation requires multiple consenting participants and an explicit claims-ledger entry (`docs/pilot/claims-ledger.md`).
- Any friction you surface is treated as signal, not complaint.

## What we cannot promise

- That the system will feel polished. It is under active development.
- That every generated output will be useful. Some are thin; some are occasionally wrong.
- That the hosted lane won't occasionally fail or produce unexpected results. That is part of what the pilot is surfacing.
- Long-term support for any deployment beyond the pilot horizon.

## After the session

Within 48 hours, the coordinator will:

1. Attach your filled-out usefulness rubric to the pilot artifact set under `docs/pilot/`.
2. Add any claims the session supports to `docs/pilot/claims-ledger.md` — including any claims the session *fails* to support, which are equally valuable.
3. Share the access-audit artifact with you if you asked for it.
4. Purge or retain the session's memory according to your preference.

## Questions this brief should answer — and your right to ask more

You should finish this brief with a clear answer to each of:

- Is my classroom's real data being used? (Default: no.)
- Is anything I say or enter leaving my hardware? (Depends on the lane. Ask the coordinator.)
- Can I see who has accessed any record I create? (Yes — `npm run audit:log`.)
- Can I have everything purged at the end? (Yes — `npm run memory:admin -- purge`.)
- Will I be named in any public claim? (Only with your written consent.)

If this brief does not answer a question you have, stop before the session starts and ask.

---

*Participant Brief v1. Keep under `docs/pilot/` as a companion to `observation-template.md`, `usefulness-rubric.md`, `session-log-template.md`, `claims-ledger.md`, and `incident-log.md`.*
