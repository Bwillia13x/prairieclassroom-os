# CLAUDE.md

## Mission

Build PrairieClassroom OS as a Gemma-4-native, local-first classroom orchestration layer for teachers and educational assistants working in high-complexity Alberta classrooms.

The product is not a generic student chatbot. It is a classroom operations copilot.

## Product thesis

Classroom complexity is primarily a coordination problem under time, staffing, language, privacy, and cognitive-load constraints.

Therefore, the system must excel at:

- multimodal input handling
- structured lesson differentiation
- next-day planning
- classroom memory and retrieval
- multilingual communication
- action execution via tool calls
- human-in-the-loop safety controls

## Hard boundaries

Never design the product as:

- a diagnosis engine
- a discipline or risk score generator
- a surveillance product
- an autonomous parent-messaging bot
- a replacement for teacher judgment

## Architecture assumptions

- Dual-speed Gemma routing is the default architecture.
- Small Gemma models serve live classroom assistance.
- Larger Gemma models serve planning, synthesis, and deeper reasoning.
- Memory retrieval should be explicit and source-aware.
- Any outward-facing output requires human approval.

## Development priorities

1. One clean end-to-end teacher workflow
2. Reliable schemas and tool contracts
3. Classroom memory that actually improves outputs
4. Safety and approval gates
5. A coherent demo and writeup

## How to work in this repository

Before major edits:

1. Read `docs/spec.md`
2. Read `docs/architecture.md`
3. Read `docs/prompt-contracts.md`
4. Check `docs/decision-log.md`

For any substantial feature:

1. Define the user story
2. Define input and output schema
3. Define prompt or tool contract
4. Implement the narrowest viable version
5. Add at least one eval
6. Update docs

## Subagent usage policy

Use subagents when:

- workstreams can run in parallel
- the task benefits from isolated context
- evaluation or review should be separated from implementation

Do not use subagents when:

- the task is simple and sequential
- changes are confined to one file or one narrow flow
- shared context matters more than parallelism

## Prompting policy

- Prefer structured instructions over long narrative prompts.
- Keep system and developer intent stable; move task-specific logic into versioned prompt contracts.
- Use JSON or typed schema outputs where downstream actions depend on model output.
- Make retrieval provenance visible whenever prior classroom memory informs an answer.

## Evaluation policy

No major feature is complete unless at least one of these exists:

- deterministic schema test
- golden-case prompt test
- manual UX walkthrough
- failure-mode test

## Documentation policy

Canonical docs live in `docs/`. Update them instead of creating shadow docs.

## When blocked

If you hit uncertainty:

- choose the smaller scope
- record the assumption in `docs/decision-log.md`
- leave a short note on what evidence would change the decision
