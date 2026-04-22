# 2026-04-22 Phase 0 Checklist — Evidence And Focus

## Purpose

This checklist operationalizes Phase 0 from [2026-04-22-strategic-roadmap.md](./2026-04-22-strategic-roadmap.md).

Phase 0 exists to do three things before more surface-area expansion:

1. get real teacher or EA evidence
2. tighten the primary product story
3. stop roadmap drift

## Working rules

- Do not add net-new prompt classes during Phase 0.
- Use demo or explicitly de-identified data only unless the real-data pilot gate is already open.
- Do not upgrade public claims without updating [../pilot/claims-ledger.md](../pilot/claims-ledger.md).
- Run `npm run claims:check` before any external demo or submission-copy refresh.
- Treat pilot artifacts as product inputs, not as ceremonial paperwork.

## The 4-workflow pilot story

This is the primary story the product should tell during Phase 0.

### Workflow 1 — Open the day

Start in Today.

Question answered:

- Where should I start right now?

Primary surface:

- Today

### Workflow 2 — Adapt instruction

Move to Differentiate when the teacher has one artifact and needs classroom-ready variants.

Question answered:

- How do I make this usable for different learners by tomorrow?

Primary surface:

- Differentiate

### Workflow 3 — Prepare tomorrow

Use reflection plus memory to generate the next-day plan.

Question answered:

- Given what happened today, what should tomorrow look like?

Primary surface:

- Tomorrow Plan

### Workflow 4 — Coordinate with adults and families

Use the same classroom context to coordinate outward-facing or cross-adult communication.

Questions answered:

- What does the EA need to know?
- What should I say to the family?

Primary surfaces:

- EA Briefing
- Family Message

## Supporting workflow

Intervention logging remains part of the real usage loop, but during Phase 0 it should be treated as enabling infrastructure for the four primary workflows above rather than as the lead story.

Primary supporting surface:

- Log Intervention

## Pre-session checklist

Complete these before a teacher or EA sits down.

### Environment and runtime

- Run `npm run ops:status` and confirm the repo state is healthy enough for a walkthrough.
- Run `npm run release:gate` on the target machine if it has not been run recently.
- Run `npm run pilot:reset` to re-seed the demo classroom.
- Run `npm run pilot:start` and confirm the app opens at `http://localhost:5173/?demo=true`.
- Confirm the participant will use the Teacher role unless the walkthrough explicitly targets EA, substitute, or reviewer scope.

### Participant materials

- Give the participant [../pilot/participant-brief.md](../pilot/participant-brief.md).
- Use [../pilot/cold-start-protocol.md](../pilot/cold-start-protocol.md) as the default scenario script.
- Use [../pilot/facilitator-session-guide.md](../pilot/facilitator-session-guide.md) as the facilitator-side session guide.
- Keep [../pilot/observation-template.md](../pilot/observation-template.md) open for the observer.
- Keep [../pilot/usefulness-rubric.md](../pilot/usefulness-rubric.md) open for the participant rating step.
- Keep [../pilot/session-log-template.md](../pilot/session-log-template.md) available for post-session synthesis or for self-documented follow-up sessions.
- Keep [../pilot/incident-log.md](../pilot/incident-log.md) available in case a real safety or access concern appears.

## Session checklist

Use this during the walkthrough.

- Start with the 4-workflow story above so the participant knows the intended product shape.
- Let the participant drive the mouse and narration.
- Avoid coaching unless the session is blocked by a technical fault or a safety issue.
- Capture the first point of hesitation on each workflow.
- Record time to first useful output.
- Record how many panels were touched to complete each workflow.
- Record whether the participant trusted the output immediately, cautiously, or not at all.
- Record what they edited before they would use or approve the output.

## Post-session evidence update

Do these immediately after each session while the observations are still fresh.

- Add the session summary to [../pilot/session-log-template.md](../pilot/session-log-template.md) or the actual session artifact derived from it.
- Record rubric results from [../pilot/usefulness-rubric.md](../pilot/usefulness-rubric.md).
- Add workflow-specific friction notes from [../pilot/observation-template.md](../pilot/observation-template.md).
- Update [../pilot/claims-ledger.md](../pilot/claims-ledger.md) before changing any public copy.
- If anything safety-relevant happened, append it to [../pilot/incident-log.md](../pilot/incident-log.md).

## Required outputs from Phase 0

Phase 0 is not complete until these exist:

- at least one real teacher or EA walkthrough artifact set
- an updated claims ledger reflecting the new evidence
- a ranked top-5 friction list
- a ranked top-5 obvious-value list
- a confirmed 4-workflow product story that can be used in demos, pilots, and future prioritization

## What can be done before a real participant is available

These tasks are valid Phase 0 work and can be completed immediately:

- mark stale roadmap documents as historical when they are no longer the active backlog
- align demo and pitch materials to the 4-workflow story
- identify public claims that should be downgraded before any external demo
- use [../pilot/facilitator-session-guide.md](../pilot/facilitator-session-guide.md) to run the first real walkthrough without over-coaching the participant

These tasks are not substitutes for a real walkthrough:

- maintainer self-walkthroughs
- mock-only product tours
- code-complete feature reviews

Those are still useful, but they do not upgrade public claims.

## Done criteria

Phase 0 is done when the project can honestly say all of the following:

- We have at least one real participant artifact set.
- We know the top repeated friction points.
- We know the strongest moments of obvious value.
- We have narrowed the product story to the workflows people actually respond to.
- We are no longer treating stale ideation documents as the live roadmap.
