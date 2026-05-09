# Hackathon Hosted Operations

This document is the operator source of truth for the hosted Gemma 4 hackathon lane.

## Usage Scope

- Synthetic/demo evaluation only
- Do not use real classroom or student data in this hosted lane
- The Alberta privacy-preserving target remains local Ollama or a self-hosted deployment path
- Hosted Gemini runs are disabled by default. Enable them only when you intentionally want a hosted run and the budget allows it.

## Current Proof Status

- Hosted Gemini proof lane: current hosted refresh failed on the API-key-only synthetic/demo lane; no current clean full hosted gate was produced on May 8.
- Hosted Gemini last passing baseline: passed (`13/13` curated cases) on 2026-05-03, including the Punjabi family-message equity case.
- Full `release:gate:gemini`: historical last passing baseline only; the May 8 current hosted attempt failed before completion.
- Latest attempted gate artifact: `output/release-gate/2026-05-08T22-47-12-031Z-43430`
- Latest attempted gate summary: `output/release-gate/2026-05-08T22-47-12-031Z-43430/summary.json`
- Latest attempted eval log: `output/release-gate/2026-05-08T22-47-12-031Z-43430/75-gemini-evals.log`
- Latest completed May 8 eval summary: `output/evals/2026-05-08-gemini/2026-05-08T21-48-03-113Z-23553-gemini-summary.json` (`12/13`; `fcst-001-demo-schema` blocked by provider high demand)
- Latest completed May 8 eval failure summary: `output/evals/2026-05-08-gemini/2026-05-08T21-48-03-113Z-23553-gemini-failure-summary.json`
- Latest May 8 cost rollup: `output/cost-rollups/2026-05-08-rollup.json`
- Latest passing gate artifact: `output/release-gate/2026-05-03T17-59-42-981Z-80702`
- Latest passing eval summary: `output/evals/2026-05-03-gemini/2026-05-03T17-59-42-981Z-80702-gemini-summary.json`
- Hosted eval failure ledger: `output/evals/2026-05-03-gemini/2026-05-03T17-59-42-981Z-80702-gemini-failure-summary.json` contains only the separate Ollama host-preflight block; hosted Gemini validation, transport, timeout, parse, schema, and retrieval failure groups are empty.
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

`release:gate:gemini` creates an internal inference bearer token for the local child processes automatically. For manual hosted launches, set the same `PRAIRIE_INFERENCE_AUTH_TOKEN` on both the inference server and orchestrator so `/generate` and `/generate/stream` remain internal-only.

## Primary Hosted Verification Order

Use this exact order for any future full hosted refresh:

1. Run the local-only preparation flow:

```bash
npm run proof:check
export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>
export PRAIRIE_ENABLE_GEMINI_RUNS=true
npm run gemini:readycheck
npm run release:gate:gemini
npm run proof:bump -- --auto    # fan canonical ref across editorial surfaces
npm run proof:check             # verify post-bump consistency
npm run eval:summary
npm run logs:summary
```

`proof:bump` is the operator helper that sweeps the canonical hosted-gate artifact reference across the editorial surfaces (`README.md`, `docs/hackathon-proof-brief.md`, `docs/kaggle-writeup.md`, `docs/pilot/claims-ledger.md`, etc.). `release:gate:gemini --update-baseline` refreshes `docs/eval-baseline.md` and `docs/live-model-proof-status.md` automatically; `proof:bump` covers the rest. Use `proof:bump -- --dry-run --auto` to preview, or pass an explicit artifact id when bumping back to a prior canonical.

The May 8 closure pass already used its one approved full hosted rerun. Do not run another full hosted gate without explicit approval. The current hosted attempt artifact is a blocker record, not a passing baseline; keep the privacy-first school deployment claim tied to local/self-hosted Gemma 4 via Ollama until that lane has a passing artifact.

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
- `PRAIRIE_INFERENCE_AUTH_TOKEN` when launching the inference server and orchestrator manually
- `PRAIRIE_CLASSROOM_ACCESS_CODES_JSON` for protected hosted classroom codes

Optional model overrides:

- `PRAIRIE_GEMINI_MODEL_ID_LIVE`
- `PRAIRIE_GEMINI_MODEL_ID_PLANNING`

## Artifact Locations

- Release-gate runs: `output/release-gate/`
- Eval results: `output/evals/`
- Request logs: `output/request-logs/`
- Baseline comparison: `docs/eval-baseline.md`
