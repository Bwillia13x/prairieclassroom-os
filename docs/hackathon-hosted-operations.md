# Hackathon Hosted Operations

This document is the operator source of truth for the hosted Gemma 4 hackathon lane.

## Usage Scope

- Synthetic/demo evaluation only
- Do not use real classroom or student data in this hosted lane
- The Alberta privacy-preserving target remains local Ollama or a self-hosted deployment path
- Hosted Gemini runs are disabled by default. Enable them only when you intentionally want a hosted run and the budget allows it.

## Current Proof Status

- Hosted Gemini proof lane: passing on the API-key-only synthetic/demo lane
- Hosted Gemini eval suite: passed (`12/12` curated cases)
- Full `release:gate:gemini`: passed
- Latest passing gate artifact: `output/release-gate/2026-04-25T17-52-51-834Z-9428`
- Latest passing eval summary: `output/evals/2026-04-25-gemini/2026-04-25T17-52-51-834Z-9428-gemini-summary.json`
- Latest failure summary contains only the Ollama host-preflight artifact, not a hosted Gemini route failure.
- Hosted reruns remain opt-in and synthetic/demo-only

## Hosted Models

- Live tier: `gemma-4-26b-a4b-it`
- Planning tier: `gemma-4-31b-it`

## Commands

Before any later hosted rerun, keep the local-only preparation flow separate from live execution:

```bash
npm run proof:check
export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>
export PRAIRIE_ENABLE_GEMINI_RUNS=true
npm run gemini:readycheck
```

Then run the hosted release gate:

```bash
npm run release:gate:gemini
npm run eval:summary
npm run logs:summary
```

If you are repairing one hosted route before rerunning the full gate, use a targeted smoke subset:

```bash
PRAIRIE_INFERENCE_PROVIDER=gemini PRAIRIE_SMOKE_CASES=ea-briefing npm run smoke:api
```

If you are launching the hosted stack manually instead of using `release:gate:gemini`, start the orchestrator with `PRAIRIE_INFERENCE_PROVIDER=gemini` as well. The hosted timeout budget and buffered planning fallbacks are keyed off that env on the orchestrator process, not just on the smoke command.

## Primary Hosted Verification Order

Use this exact order for the next full hosted refresh:

1. Run the local-only preparation flow:

```bash
npm run proof:check
export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>
export PRAIRIE_ENABLE_GEMINI_RUNS=true
npm run gemini:readycheck
npm run release:gate:gemini
npm run eval:summary
npm run logs:summary
```

## Optional Repair-First Loop

If a future rerun is fixing a single hosted route before refreshing the full proof, use this cheaper repair-first sequence:

1. Run the local-only preparation flow above.
2. Run the targeted hosted smoke:

```bash
PRAIRIE_INFERENCE_PROVIDER=gemini PRAIRIE_SMOKE_CASES=ea-briefing npm run smoke:api
```

1. Run the full hosted gate only after the targeted smoke passes.

## What This Gate Does

- Validates local TypeScript and Python checks
- Starts the hosted Gemini-backed inference service
- Runs harness smoke, a curated hosted proof eval suite, API smoke, and browser smoke
- Writes artifacts under `output/release-gate/` and `output/evals/`
- Refreshes `docs/eval-baseline.md`
- Produces the hackathon proof artifacts without touching the Ollama or Vertex lanes
- Fails fast if the hosted-run guard is not explicitly enabled

## Required Environment Variables

- `PRAIRIE_GEMINI_API_KEY` or `GEMINI_API_KEY`
- `PRAIRIE_ENABLE_GEMINI_RUNS=true`

Optional model overrides:

- `PRAIRIE_GEMINI_MODEL_ID_LIVE`
- `PRAIRIE_GEMINI_MODEL_ID_PLANNING`

## Artifact Locations

- Release-gate runs: `output/release-gate/`
- Eval results: `output/evals/`
- Request logs: `output/request-logs/`
- Baseline comparison: `docs/eval-baseline.md`
