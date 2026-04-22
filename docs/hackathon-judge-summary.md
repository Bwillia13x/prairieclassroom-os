# Hackathon Judge Summary

Short, judge-facing copy for PrairieClassroom OS. This is the one-page narrative version of the proof state in [hackathon-proof-brief.md](./hackathon-proof-brief.md) and [eval-baseline.md](./eval-baseline.md).

## Paste-Ready Submission Blurb

PrairieClassroom OS is a Gemma 4-native classroom copilot built for Alberta K-6 teachers and education assistants managing mixed-readiness, high-complexity classrooms. It helps staff turn classroom signals into concrete next steps across four daily jobs: triaging the day, differentiating work, planning tomorrow, and drafting family communication. For the hackathon proof lane, we verified real hosted Gemma 4 execution on synthetic and demo classroom data, with the full hosted release gate and curated eval suite passing. The intended school deployment path remains local or self-hosted Gemma 4 for privacy, but the submission proof is the hosted synthetic-demo lane backed by artifacted evals, browser smoke, and API smoke.

## What Judges Can Safely Credit

- Real hosted Gemma 4 execution was proven on the synthetic and demo lane.
- The current passing hosted proof includes curated evals, API smoke, and browser smoke.
- The product is organized around concrete teacher and EA workflows rather than generic chat.
- The privacy-preserving deployment target is local or self-hosted Gemma 4, even though the current submission proof lane is hosted.

## Proof Anchors

- Current hosted baseline: `output/release-gate/2026-04-22T02-16-16-557Z-74236`
- Hosted eval result: `12/12` curated proof cases passed.
- Models observed in the hosted lane: `gemma-4-26b-a4b-it` and `gemma-4-31b-it`
- Provider source of truth: [eval-baseline.md](./eval-baseline.md)
- Concise artifact trail: [hackathon-proof-brief.md](./hackathon-proof-brief.md)

## Product Surfaces To Mention

- Today tab for triage, attention routing, and coverage risk.
- Differentiate flow for adapting work to student need.
- Tomorrow Plan for next-day preparation.
- Family Message drafting for clear home communication.

## Boundaries

- The hosted hackathon lane is synthetic and demo data only.
- Do not claim a passing Ollama proof on this specific machine.
- Do not claim paid Vertex validation in the zero-cost sprint.
- Do not claim classroom outcome evidence, teacher pilots, or family validation unless new artifacts are added.