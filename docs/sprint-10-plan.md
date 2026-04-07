# Sprint 10 Plan — Real Gemma Inference via Vertex AI

## Goal

Replace mock inference with real Gemma model output via Vertex AI. Run the full 64-case eval corpus against actual model responses. Establish a baseline of what works, what needs prompt tuning, and what parsing needs hardening.

## User story

As a developer, when I start the inference server with `--mode api`, I want the system to call real Gemma 4 models on Vertex AI — so I can validate that the prompt contracts produce usable structured output under real inference.

## Why this sprint

Everything downstream depends on this. Prompt tuning, safety validation, demo video, and submission polish all require real model output. The system currently runs entirely on canned mock responses. This is the single biggest unknown in the project.

## Backend decision

**Vertex AI** was chosen over AI Studio (limited quota) and local inference (GPU requirement). Vertex AI provides:
- Both model tiers: `gemma-4-4b-it` (live) and `gemma-4-27b-it` (planning)
- Thinking mode support via `thinking_config`
- Structured output via `response_mime_type: "application/json"`
- No local GPU required
- Production-grade reliability and quota

## Changes

> Note: the original publisher-model plan in this document was superseded on 2026-04-05 by the endpoint-backed Vertex path. The current real implementation uses self-deployed Gemma 3 Model Garden endpoints, not `google-genai` publisher-model calls.

### 1. Vertex AI backend (`services/inference/harness.py`)

New `VertexAIBackend` class implementing:
- Model dispatch: `model_tier=live` → `gemma-4-4b-it`, `model_tier=planning` → `gemma-4-27b-it`
- Thinking mode: when `thinking=True`, enable `thinking_config` in the API request
- System/user prompt split: prompts arrive as a single string; the backend splits on the `\n\nCLASSROOM CONTEXT:` or similar delimiter to separate system instruction from user message (matching the pattern in all prompt builders)
- Latency tracking: measure wall-clock time for the API call
- Error handling: catch API errors, return structured error in `GenerationResponse`

### 2. Dependencies (`services/inference/requirements.txt`)

Add `google-genai>=1.0.0` for the Google GenAI SDK (unified API for Vertex AI Gemma access).

### 3. Environment configuration

- `GOOGLE_CLOUD_PROJECT` — GCP project ID
- `GOOGLE_CLOUD_LOCATION` — region (default: `us-central1`)
- `GOOGLE_APPLICATION_CREDENTIALS` — service account key path (or use `gcloud auth application-default login`)
- `gcloud auth application-default set-quota-project <project>` — required when using local authorized-user ADC
- Open-model access for the ADC principal:
  - `roles/aiplatform.user`
  - `roles/serviceusage.serviceUsageConsumer`
  - `roles/consumerprocurement.entitlementManager`
  - `cloudcommerceconsumerprocurement.googleapis.com` enabled and allowed by org policy
  - target model enabled for the project in Model Garden

### 4. Orchestrator mode awareness (`services/orchestrator/server.ts`)

No orchestrator changes needed — it already calls `INFERENCE_URL/generate` and passes `model_tier`, `thinking`, and `prompt_class`. The Flask server already forwards these to the harness. The change is entirely in the Python backend.

### 5. JSON extraction hardening (`services/inference/harness.py`)

Real model output often wraps JSON in prose or markdown fencing. Add a `extract_json` utility:
- Strip markdown ` ```json ... ``` ` fences
- Find first `[` or `{` and match to closing bracket
- Handle trailing commas (common Gemma quirk)
- If extraction fails, return raw text and let the orchestrator parsers handle it

### 6. Eval baseline run

Run all 64 evals against real inference. Document results in `docs/eval-baseline.md`:
- Per-case pass/fail
- Failure categories: parse error, missing keys, safety violation, latency exceeded
- Model IDs and latency percentiles
- Comparison to the mock release gate

## What this sprint does NOT include

- Prompt contract changes (that's Sprint 11)
- Input validation / Zod (that's Sprint 11)
- Authentication (that's Sprint 12)
- UI changes (none needed)

## File changes

| Layer | Files | What |
|-------|-------|------|
| Inference | `services/inference/harness.py` | Add `VertexAIBackend` class, JSON extraction utility |
| Deps | `services/inference/requirements.txt` | Add `google-genai` |
| Docs | `docs/sprint-10-plan.md` | This file |
| Docs | `docs/eval-baseline.md` | Real-gate preflight or eval results against live inference |
| Docs | `docs/sprint-10-review.md` | Sprint review (after execution) |
| Docs | `docs/decision-log.md` | ADR for Vertex AI backend choice |

## Eval impact

The validation suite now contains 64 cases. Expected: some failures under real inference — the baseline document captures which and why.

## Risks

- **Structured output quality**: Gemma 4 may not reliably produce the JSON structures the prompts demand. Mitigation: JSON extraction utility + the existing orchestrator parsers already handle markdown fencing. Sprint 11 will tune prompts if needed.
- **API access**: Requires a GCP project with Vertex AI API enabled, open-model entitlements configured, and the target model enabled for the project. Mitigation: document setup steps and run a direct model probe before starting local services.
- **Latency**: Real inference is slower than mock. Mitigation: latency evals have generous budgets (2000ms live, 10000ms planning).
- **Thinking mode**: Gemma 4 thinking config may differ from documentation. Mitigation: test with smoke tests first.
