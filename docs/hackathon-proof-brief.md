# Hackathon Proof Brief

Concise, artifact-backed proof summary for judges and collaborators. This document is derived from [eval-baseline.md](./eval-baseline.md), which remains the provider-level source of truth.

## Current State

- **Mock gate:** green at `output/release-gate/2026-04-28T00-38-53-468Z-24492`
- **Hosted Gemini proof lane:** passing on the API-key-only synthetic/demo lane
- **Ollama privacy-first lane:** blocked on host capability on the current machine
- **Paid Vertex lane:** intentionally not run in the zero-cost sprint

## Hosted Gemini Proof

- **Models used:** `gemma-4-26b-a4b-it` (live), `gemma-4-31b-it` (planning)
- **Hosted readycheck:** passed with the supplied AI Studio key and explicit run guard
- **Curated hosted eval suite:** `13/13` passed for the latest checked-in artifact, including the Punjabi family-message equity case
- **Gemma-native coverage:** the hosted proof suite includes worksheet image extraction, route-scoped tool calling, and multilingual family-message generation on synthetic/demo data
- **Full hosted release gate:** passed at `output/release-gate/2026-04-27T01-26-45-190Z-87424`
- **Hosted eval failure ledger:** `output/evals/2026-04-27-gemini/2026-04-27T01-26-45-190Z-87424-gemini-failure-summary.json` contains only the separate Ollama host-preflight block; hosted Gemini validation, transport, timeout, parse, schema, and retrieval failure groups are empty.
- **What this proves:** real hosted Gemma 4 execution on synthetic/demo classroom data for the curated proof suite, API smoke, and browser smoke without enabling the paid Vertex lane or any rented GPU path

## Artifact Trail

- **Provider truth source:** `docs/eval-baseline.md`
- **Latest passing mock gate:** `output/release-gate/2026-04-28T00-38-53-468Z-24492`
- **Latest mock gate summary:** `output/release-gate/2026-04-28T00-38-53-468Z-24492/summary.json`
- **Latest passing hosted gate:** `output/release-gate/2026-04-27T01-26-45-190Z-87424`
- **Hosted release summary:** `output/release-gate/2026-04-27T01-26-45-190Z-87424/summary.json`
- **Hosted eval summary:** `output/evals/2026-04-27-gemini/2026-04-27T01-26-45-190Z-87424-gemini-summary.json`
- **Hosted eval artifacts:** `output/evals/2026-04-27-gemini`
- **Hosted eval failure ledger:** `output/evals/2026-04-27-gemini/2026-04-27T01-26-45-190Z-87424-gemini-failure-summary.json`
- **Ollama host-preflight failure summary:** `output/host-preflight/2026-04-12T16-10-14-124Z-failure-summary.json`

## Privacy Boundary

- The hosted Gemini lane is for **synthetic/demo data only**.
- It is the **hackathon proof lane**, not the intended Alberta school deployment path.
- The intended privacy-preserving path remains **local/self-hosted Gemma 4 via Ollama**.

## Next Approved Hosted Rerun Order

1. Run `npm run proof:check`.
2. Export `PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>` and `PRAIRIE_ENABLE_GEMINI_RUNS=true`.
3. Run `npm run gemini:readycheck`.
4. Run `npm run release:gate:gemini`.
5. Run `npm run eval:summary`.
6. Run `npm run logs:summary`.

If a future hosted rerun is repairing one route instead of refreshing the full proof, an optional repair-first smoke loop is available: `PRAIRIE_INFERENCE_PROVIDER=gemini PRAIRIE_SMOKE_CASES=tomorrow-plan npm run smoke:api`.
