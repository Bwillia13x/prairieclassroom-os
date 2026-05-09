# Hackathon Judge Summary

Short, judge-facing copy for PrairieClassroom OS. This is the one-page narrative version of the proof state in [hackathon-proof-brief.md](./hackathon-proof-brief.md) and [eval-baseline.md](./eval-baseline.md).

## Paste-Ready Submission Blurb

PrairieClassroom OS is a Gemma-4-native classroom operating layer for Alberta K-6 teachers and educational assistants managing mixed-readiness, high-complexity classrooms. It is organized around four daily adult jobs — open the day, adapt instruction, prepare tomorrow, coordinate with adults or families — wired together by a closed feedback loop where today's classroom signal becomes tomorrow's planning context. For the hackathon proof lane, we verified real hosted Gemma 4 execution on synthetic/demo classroom data. The last passing hosted baseline is the May 3 full release gate; the current May 8 hosted refresh did not produce a clean new passing gate because the hosted eval lane hit provider instability. The intended school deployment path remains privacy-first local or self-hosted Gemma 4 via Ollama.

## What Judges Can Safely Credit

- Real hosted Gemma 4 execution was proven on the synthetic/demo lane.
- The last passing hosted baseline includes curated evals, API smoke, and browser smoke.
- The current hosted refresh failed at `output/release-gate/2026-05-08T22-47-12-031Z-43430`; do not present it as a passing baseline.
- Multimodal worksheet image extraction (`extract_worksheet`) is wired through Gemini-API `inline_data` parts, not stub code.
- Roster-checked function calling rejects unknown student aliases, preventing the model from confirming a hallucinated student.
- Tool results round-trip through provider-native `tool_interactions[]`, not prompt injection.
- The product is organized around concrete teacher and EA workflows wired into a closed feedback loop, not generic chat.
- The privacy-preserving deployment target is local or self-hosted Gemma 4, even though the current submission proof lane is hosted.

## Why Gemma 4 Specifically

- **Multimodal:** the `extract_worksheet` route turns a paper artifact into structured input for differentiation.
- **Open-weight:** the same architecture is implemented for `gemma4:4b` + `gemma4:27b` via Ollama for offline / privacy-first deployment; the current submission proof lane is hosted Gemma 4 on synthetic/demo data.
- **Dual-tier with selective thinking:** `gemma-4-26b-a4b-it` (live) handles fast classroom transformations; `gemma-4-31b-it` (planning) with thinking enabled handles cross-record synthesis.
- **Native function calling:** bounded local tools (Alberta curriculum, classroom intervention history) execute and return through provider-native tool history.

## Proof Anchors

- Latest attempted hosted gate: `output/release-gate/2026-05-08T22-47-12-031Z-43430`
- Current hosted refresh status: failed at the curated hosted eval step; `diff-015-tool-calling-curriculum` passed before a retryable provider `500 INTERNAL`, then the eval process exited with code 143.
- Latest completed May 8 hosted eval summary: `output/evals/2026-05-08-gemini/2026-05-08T21-48-03-113Z-23553-gemini-summary.json` (`12/13`; provider high-demand block on `fcst-001-demo-schema`).
- Latest completed May 8 hosted eval failure summary: `output/evals/2026-05-08-gemini/2026-05-08T21-48-03-113Z-23553-gemini-failure-summary.json`
- Latest May 8 cost rollup: `output/cost-rollups/2026-05-08-rollup.json`
- Last passing hosted baseline: `output/release-gate/2026-05-03T17-59-42-981Z-80702`
- Hosted eval result in the last passing baseline: `13/13` curated proof cases passed, including the Punjabi family-message equity case.
- Models observed in the hosted lane: `gemma-4-26b-a4b-it` and `gemma-4-31b-it`
- Hosted rerun command: `npm run release:gate:gemini`
- Provider source of truth: [eval-baseline.md](./eval-baseline.md)
- Concise artifact trail: [hackathon-proof-brief.md](./hackathon-proof-brief.md)
- Submission window plan: [plans/2026-05-18-submission-plan.md](./plans/2026-05-18-submission-plan.md)

## Product Surfaces To Mention

- Today tab for triage, attention routing, and coverage risk.
- Differentiate flow for adapting work to student need (with multimodal worksheet upload).
- Tomorrow Plan for next-day preparation (planning-tier with selective thinking).
- EA Briefing for morning-window handoff to the educational assistant.
- Family Message drafting for clear home communication, behind a permanent teacher-approval gate.

## Boundaries

- The hosted hackathon lane is synthetic and demo data only.
- The hosted hackathon lane is synthetic/demo only and does not support real-student-data claims.
- Do not claim a passing Ollama proof on a host that has not run `npm run release:gate:ollama` to a passing artifact.
- Do not claim paid Vertex validation in the zero-cost sprint.
- Do not claim classroom outcome evidence, teacher pilots, or family validation unless new artifacts under `docs/pilot/sessions/` exist and the corresponding row in [docs/pilot/claims-ledger.md](./pilot/claims-ledger.md) has been advanced.
