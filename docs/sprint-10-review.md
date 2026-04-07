# Sprint 10 Review — Real Gemma Inference via Vertex AI

**Sprint:** 10 — Real Gemma inference via Vertex AI
**Date:** 2026-04-05

64-case mock gate passing. Real-inference gate is implemented, and the real path now targets self-deployed Gemma 3 Vertex endpoints instead of unavailable Gemma publisher-model IDs.

## What works

1. **VertexAIBackend is endpoint-backed.** The `--mode api` flag in the harness now routes to a `VertexAIBackend` class that calls long-lived Vertex endpoints via `PredictionServiceClient.raw_predict`. Both model tiers (Gemma 3 4B live, Gemma 3 27B planning), system/user prompt splitting, and image support are wired up.

2. **extract_json handles real model output patterns.** Utility strips markdown fences, finds JSON in prose, fixes trailing commas. Tested against 4 common failure patterns. Runs in the harness layer so all 8 prompt classes benefit without parser changes.

3. **System/user prompt splitting is delimiter-aware.** The backend detects section headers (`CLASSROOM CONTEXT:`, `ARTIFACT:`, `TEACHER INPUT:`, etc.) and splits the concatenated prompt into a system instruction + user message. This matches the Vertex AI API's expected format and preserves the prompt contract structure.

4. **Mock regression is zero.** The mock release gate passes end to end, including the API/browser smoke suite. No user-facing contract changes were required for the real-gate work.

5. **Real preflight is now deterministic.** The real gate resolves the local Python interpreter, records the ADC principal, detected project, quota project, and probes both target models before any services start. When preflight fails, `docs/eval-baseline.md` is still refreshed with the blocked state instead of leaving stale results behind.

6. **Error handling returns structured errors.** API failures produce a `GenerationResponse` with `{"error": "..."}` text rather than crashing the harness. The orchestrator will surface this to the UI.

## What breaks or is uncertain

1. **The configured ADC principal originally differed from the active `gcloud` owner account.** That caused missing quota-project attribution and missing Vertex permissions. The current project now has the required `roles/aiplatform.user`, `roles/serviceusage.serviceUsageConsumer`, and `roles/consumerprocurement.entitlementManager` on the ADC principal, and `cloudcommerceconsumerprocurement.googleapis.com` is enabled.

2. **Real baseline now depends on endpoint provisioning.** The gate no longer probes dead publisher-model IDs. Instead, it requires two configured endpoint resource names and fails early when the endpoint config is missing, the endpoint resource is missing, or the deployed container request format does not match the gate probe.

3. **Prompt quality is still unevaluated.** Because the gate now stops at model access, there is still no live baseline for parse/schema drift, safety, or content quality. Prompt and parser tuning remains intentionally blocked behind a clean real-model startup.

## Sprint deliverables

| Deliverable | File | Status |
|-------------|------|--------|
| VertexAIBackend class | `services/inference/harness.py` | Complete |
| extract_json utility | `services/inference/harness.py` | Complete + tested |
| Vertex endpoint dependencies | `services/inference/requirements.txt` | Added |
| GemmaHarness API mode wiring | `services/inference/harness.py` | Complete |
| Eval baseline doc | `docs/eval-baseline.md` | Live source of truth for preflight/eval status |
| Sprint 10 ADRs (2) | `docs/decision-log.md` | Complete |
| Sprint 10 plan | `docs/sprint-10-plan.md` | Complete |

## Eval impact

The mock gate remains green. The real gate now refreshes the baseline doc even when preflight blocks evals.

## What to do next

- **Provision or reuse the target Gemma endpoints** with `npm run provision:vertex-endpoints`, export the emitted env vars, and rerun `npm run release:gate:real`.
- **Capture the first non-auth real baseline** and use it to sort structural parser work before any prompt-quality tuning.
- **Sprint 11: Zod validation** (independent of inference) + prompt tuning (only after the real baseline exists).
