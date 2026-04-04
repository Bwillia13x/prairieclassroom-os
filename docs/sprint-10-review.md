# Sprint 10 Review — Real Gemma Inference via Vertex AI

**Sprint:** 10 — Real Gemma inference via Vertex AI
**Date:** 2026-04-03

42/42 evals passing (mock mode — real inference baseline pending credentials)

## What works

1. **VertexAIBackend is fully implemented.** The `--mode api` flag in the harness now routes to a `VertexAIBackend` class that calls Gemma 4 models via the `google-genai` SDK. Both model tiers (4B live, 27B planning), thinking mode, system/user prompt splitting, and image support are wired up.

2. **extract_json handles real model output patterns.** Utility strips markdown fences, finds JSON in prose, fixes trailing commas. Tested against 4 common failure patterns. Runs in the harness layer so all 8 prompt classes benefit without parser changes.

3. **System/user prompt splitting is delimiter-aware.** The backend detects section headers (`CLASSROOM CONTEXT:`, `ARTIFACT:`, `TEACHER INPUT:`, etc.) and splits the concatenated prompt into a system instruction + user message. This matches the Vertex AI API's expected format and preserves the prompt contract structure.

4. **Mock regression is zero.** 42/42 evals pass. 4/4 smoke tests pass. No changes to the orchestrator, UI, or parsers.

5. **Error handling returns structured errors.** API failures produce a `GenerationResponse` with `{"error": "..."}` text rather than crashing the harness. The orchestrator will surface this to the UI.

## What breaks or is uncertain

1. **No real inference validation yet.** Vertex AI credentials are not configured. The eval baseline document is staged but empty. This is the core unknown the sprint was designed to resolve.

2. **Prompt splitting heuristic may miss edge cases.** The delimiter-based split works for all 8 current prompt builders, but a prompt that doesn't use any of the known delimiters will send the entire text as the user message with no system instruction.

3. **Thinking budget is hardcoded at 8192 tokens.** May need tuning based on real planning tier output quality and latency.

## Sprint deliverables

| Deliverable | File | Status |
|-------------|------|--------|
| VertexAIBackend class | `services/inference/harness.py` | Complete |
| extract_json utility | `services/inference/harness.py` | Complete + tested |
| google-genai dependency | `services/inference/requirements.txt` | Added |
| GemmaHarness API mode wiring | `services/inference/harness.py` | Complete |
| Eval baseline doc (structure) | `docs/eval-baseline.md` | Staged, pending credentials |
| Sprint 10 ADRs (2) | `docs/decision-log.md` | Complete |
| Sprint 10 plan | `docs/sprint-10-plan.md` | Complete |

## Eval impact

42/42 evals remain green in mock mode. Real inference baseline TBD.

## What to do next

- **Configure Vertex AI credentials** and run `python harness.py --mode api --smoke-test` to validate the connection.
- **Run full eval suite against real inference** and populate `docs/eval-baseline.md`.
- **Sprint 11: Zod validation** (independent of inference) + prompt tuning (depends on baseline results).
