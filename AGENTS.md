# AGENTS.md

## Project identity

PrairieClassroom OS is a Gemma-4-native operating layer for Alberta's inclusive classrooms. It is teacher- and EA-facing, not student-facing, and is designed around multimodal lesson differentiation, next-day support planning, family communication with teacher approval, intervention logging, and classroom memory.

This repository is now in submission-readiness mode for the Gemma 4 Good Hackathon. Preserve the proof split: the public Vercel demo is static-first on synthetic/demo data for judge reliability, the hosted Gemma 4 lane is the artifact-backed synthetic/demo proof path, and the Ollama lane is the intended privacy-first local/self-hosted deployment path, not a claimed passing result on this host.

## Core outcome

Every meaningful change should make at least one of these loops better:

1. Turn one classroom artifact into differentiated outputs.
2. Turn classroom context into a next-day support plan.
3. Turn a classroom event into a plain-language and translated family communication.
4. Turn staff notes into structured intervention memory.

## Non-goals

Do not drift into these areas unless explicitly approved:

- diagnosis or pseudo-diagnosis
- student surveillance
- automated discipline scoring
- parent-facing autonomous sending without staff approval
- broad generic tutoring features that do not strengthen the classroom-operations loop
- overbuilt school-admin analytics before the teacher/EA loop works

## Build priorities

Prioritize work in this order:

1. Clear end-to-end loop
2. Reliable structured outputs
3. Retrieval and memory correctness
4. Safety and approval boundaries
5. UI polish
6. Performance optimizations

## Model-routing intent

Default assumptions:

- Use smaller Gemma 4 variants for low-latency live actions.
- Use larger Gemma 4 variants for deeper planning and synthesis.
- Use thinking mode only for high-stakes planning, synthesis, or ambiguous multimodal reasoning.
- Keep model routing explicit and documented in `docs/prompt-contracts.md`.

## Working style

- Start by reading the spec and architecture docs.
- Work in small, reviewable increments.
- Add or update an eval whenever you add a significant capability.
- Prefer schema-first design for any model output that feeds another step.
- Avoid hidden assumptions; write them down in `docs/decision-log.md`.
- Keep prompts, tool schemas, and storage contracts versioned.
- When uncertain, choose the smaller, more demoable scope.

## File hygiene

- Do not create duplicate strategy docs unless replacing an old one.
- Prefer updating canonical docs over creating parallel alternatives.
- Keep new top-level files rare.
- Put implementation notes under `docs/`, not scattered across the repo.

## Required checks before calling a task done

- Does the feature strengthen one of the four core loops?
- Is the Gemma-4-specific rationale still clear?
- Is there at least one eval or manual test case?
- Are safety boundaries preserved?
- Are docs updated enough that another agent can pick up the work?
- If the change is public-facing, did you keep `README.md`, `docs/kaggle-writeup.md`, `docs/hackathon-proof-brief.md`, `docs/hackathon-submission-checklist.md`, and `docs/submission-copy-pack.md` aligned with the claims ledger?

## Communication style

When summarizing work:

- state what changed
- state what still breaks or is uncertain
- state the next best action
- be concrete and brief
