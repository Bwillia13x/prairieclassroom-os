# PrairieClassroom OS — Product Spec

## Product statement

PrairieClassroom OS is a local-first classroom complexity copilot for Alberta K–6 teachers and educational assistants. It helps adults plan, differentiate, coordinate, document, and communicate in classrooms with mixed academic levels, multilingual learners, and scarce support capacity.

## Primary user

- classroom teacher
- educational assistant

## Secondary user

- school complexity-team member
- inclusive-education lead

## Core jobs to be done

1. Differentiate one lesson artifact into multiple classroom-ready versions.
2. Generate a next-day support plan using recent notes and classroom memory.
3. Draft plain-language and translated family communication.
4. Log interventions in structured form.

## Out-of-scope for MVP

- student-facing general-purpose chatbot
- school-wide analytics dashboard
- assessment/referral automation beyond a stub
- direct LMS or SIS integrations
- autonomous outbound messaging

## Design principles

- local-first where feasible
- teacher-facing, not student-chat-first
- multimodal by default
- retrieval-aware and source-aware
- human approval for outward communication
- narrow, demoable workflows over broad feature sprawl

## MVP definition

A credible MVP must support this loop:

1. Teacher uploads or captures a classroom artifact.
2. System generates differentiated outputs.
3. Teacher adds a short note about what happened today.
4. System generates a tomorrow support plan.
5. Teacher drafts a parent/family message from the same context.
6. Intervention note is saved into classroom memory.

## Current system definition

The implemented system now exceeds the original MVP loop. The current operating surface includes:

- Seven top-level pages (`classroom`, `today`, `tomorrow`, `week`, `prep`, `ops`, `review`) hosting 12 teacher-facing working surfaces — the Today surface plus 11 embedded tools on Prep/Tomorrow/Ops/Review.
- 13 model-routed prompt classes plus deterministic retrieval surfaces.
- 37 Express endpoints tracked in generated `docs/api-surface.md`.
- Per-classroom SQLite memory for plans, variants, family messages, interventions, pattern reports, forecasts, scaffold reviews, survival packets, feedback, and sessions.
- No-cost mock validation, privacy-first Ollama support, hosted synthetic/demo Gemini proof, and explicitly gated paid Vertex support.
- Generated inventory checks in `docs/system-inventory.md` and `docs/api-surface.md` to keep public surface claims aligned with code.
- Per-classroom memory lifecycle CLI for summary, export, structural anonymization, backup, purge, and restore.
- Initial adult API role scopes that separate teacher-only routes from teacher/EA coordination routes while leaving substitute/reviewer access for dedicated bounded views.

The next product phase is pilot-readiness, not feature sprawl. Real classroom use requires the controls in `docs/pilot-readiness.md` and `docs/safety-governance.md`.

## Success criteria

- The system completes the loop end to end.
- Outputs are structured and readable.
- The next-day plan is meaningfully grounded in class context.
- The family message is plain-language and teacher-approvable.
- Memory can be retrieved and cited back into later generations.
- Teachers and EAs can inspect what sources informed an output before acting on it.
- Pilot evidence can distinguish synthetic proof from human validation.

## Failure criteria

- The product feels like a generic chatbot.
- There is no clear Gemma-specific technical story.
- Outputs are inconsistent and not schema-stable.
- The system tries to infer diagnosis or automate discipline.
- Public copy claims teacher, EA, student, family, or classroom outcome validation before pilot artifacts support it.
- Real classroom data enters a hosted model lane.
