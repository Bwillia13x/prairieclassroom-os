# PrairieClassroom OS — Facilitator Session Guide

**For:** The maintainer, observer, or pilot coordinator running a real teacher or EA walkthrough.
**Use with:** [participant-brief.md](./participant-brief.md), [cold-start-protocol.md](./cold-start-protocol.md), [observation-template.md](./observation-template.md), [usefulness-rubric.md](./usefulness-rubric.md), [session-log-template.md](./session-log-template.md), and [claims-ledger.md](./claims-ledger.md).

## Purpose

This guide exists to make the first real walkthrough consistent and low-bias.

The participant protocol tells the teacher or EA what to do. This guide tells the facilitator how to run the session without overselling, over-explaining, or accidentally coaching away the product's real friction.

## Session goal

The goal of the first real walkthrough is not to prove the product is good.

The goal is to learn three things honestly:

1. where the participant gets value quickly
2. where the participant hesitates or loses trust
3. which workflows deserve to become the primary product story

## Facilitator rules

- Do not pitch while the participant is using the product.
- Do not explain what the participant "should" think of an output.
- Do not rescue the participant from ordinary UI confusion.
- Do intervene if the session is blocked by a technical fault, safety concern, or wrong-environment setup.
- Do write down direct quotes when possible.
- Do distinguish between participant confusion and mock-mode limitations.

## Opening script

Use this short framing before the session starts:

> PrairieClassroom is being evaluated as a teacher and EA operations tool, not as a student chatbot.
> We are testing whether the product helps with four adult jobs: opening the day, adapting instruction, preparing tomorrow, and coordinating with adults or families.
> You do not need to be polite. Confusion, hesitation, and distrust are useful findings.
> I will mostly stay quiet unless something is technically broken or unsafe.

## The 4-workflow framing

Use this language when orienting the participant.

| Workflow | Core question | Main surface |
| --- | --- | --- |
| Open the day | Where should I start right now? | Today |
| Adapt instruction | How do I make this usable for different learners by tomorrow? | Differentiate |
| Prepare tomorrow | Given what happened today, what should tomorrow look like? | Tomorrow Plan |
| Coordinate with adults and families | What does the EA need to know, and what should I say to the family? | EA Briefing or Family Message |

`Log Intervention` is supporting workflow evidence, not the lead story.

## Scenario map for the facilitator

Use this table to understand what each scenario is actually testing.

| Scenario | Priority | Workflow | What this is really testing | Watch for |
| --- | --- | --- | --- | --- |
| 1. Where should I start today? | Core | Open the day | Whether the product can establish a clear first move without explanation | Scan time, chart confusion, recommendation trust |
| 2. Three versions of this lesson by tomorrow | Core | Adapt instruction | Whether differentiation feels classroom-ready or still too generic | Variant usefulness, edit burden, print-readiness |
| 3. Routine update home about Amira in Punjabi | Core for teacher | Coordinate with adults and families | Whether approval and language confidence feel safe enough to use | Draft vs approve clarity, translation trust, banner awareness |
| 4. 90 seconds between blocks, log what just happened | Secondary | Supporting workflow | Whether capture velocity is realistic during actual school time pressure | Time-to-log, form friction, willingness to repeat |
| 5. Build me tomorrow's plan from what I just typed | Core | Prepare tomorrow | Whether planning feels grounded in classroom memory and worth the effort | Trust, scannability, actionability |
| 6. What does tomorrow's complexity look like? | Secondary | Prepare tomorrow | Whether forecast output changes planning decisions or just looks interesting | Decision impact, clarity, jargon |
| 7. What have I been letting slip? | Secondary | Open the day | Whether follow-up debt is useful or guilt-inducing | Tone, prioritization, willingness to act |

## Recommended first-session order

For the first real teacher session, use this order unless time is very short:

1. Scenario 1
2. Scenario 2
3. Scenario 5
4. Scenario 3

If time remains, add Scenarios 4, 6, and 7.

For an EA-focused session, keep Scenarios 1 and 5, but replace Scenario 3 with EA Briefing and treat Family Message as out of scope.

## Allowed prompts during the session

These prompts are neutral enough to use without steering the participant.

- What were you expecting to happen there?
- What would you do next if I were not in the room?
- Would you use that as-is, edit it, or ignore it?
- What made you pause just now?
- What part of this feels most useful?
- What part feels least trustworthy?

## Prompts to avoid

Do not use prompts like these, because they bias the evidence.

- Does this save you time?
- Isn't that helpful?
- Can you see how the model used the memory?
- Wouldn't you use this every day?
- This is mock mode, so imagine it better.

If mock-mode limitations matter, record them explicitly instead of asking the participant to compensate for them.

## What to capture live

Use [observation-template.md](./observation-template.md) during the session and make sure you capture:

- time to first useful output
- first point of hesitation in each core workflow
- whether the participant noticed mock-mode banners before judging quality
- whether the participant trusted, cautiously trusted, or distrusted the output
- what they changed before they would actually use it
- exact wording when the participant expresses confusion or delight

## Immediate post-session synthesis

Do this before the participant leaves, or as soon as possible after the session.

### 1. Complete the evidence artifacts

- finish the observation form
- complete the usefulness rubric
- write or update the session log
- append to the incident log if anything safety-relevant occurred

### 2. Produce the two ranked lists Phase 0 needs

Top 5 friction points:

1.
2.
3.
4.
5.

Top 5 obvious-value moments:

1.
2.
3.
4.
5.

### 3. Update the honesty ledger

Before changing any demo script, pitch copy, or public description, update [claims-ledger.md](./claims-ledger.md).

If the session weakens a claim, downgrade the claim. Do not wait for a second session just to avoid saying the first one was negative.

## What counts as a successful first session

A successful first session is not one where the participant likes everything.

A successful first session gives the team enough signal to answer:

- Which workflow felt strongest without explanation?
- Which workflow generated the most hesitation?
- Which workflow should anchor the next demo and product packaging pass?
- Which public claims are still unsupported after a real person touched the product?

## Relationship to Phase 0

This guide is the facilitator-side companion to [../plans/2026-04-22-phase-0-checklist.md](../plans/2026-04-22-phase-0-checklist.md).

If the checklist says what needs to exist by the end of Phase 0, this guide explains how to run the most important evidence-gathering step inside that phase.
