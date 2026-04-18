# Hackathon Proof Brief

Concise, artifact-backed proof summary for judges and collaborators. This document is derived from [eval-baseline.md](./eval-baseline.md), which remains the provider-level source of truth.

## Current State

- **Mock gate:** green at `output/release-gate/2026-04-17T23-01-11-249Z-44643`
- **Hosted Gemini proof lane:** passing
- **Ollama privacy-first lane:** blocked on host capability on the current machine
- **Paid Vertex lane:** intentionally not run in the zero-cost sprint

## Hosted Gemini Proof

- **Models used:** `gemma-4-26b-a4b-it` (live), `gemma-4-31b-it` (planning)
- **Curated hosted eval suite:** `10/10` passed
- **Full hosted release gate:** passed
- **What this proves:** real hosted Gemma 4 execution on synthetic/demo classroom data for the curated proof suite, API smoke, and browser smoke

## Artifact Trail

- **Provider truth source:** `docs/eval-baseline.md`
- **Latest passing mock gate:** `output/release-gate/2026-04-17T23-01-11-249Z-44643`
- **Latest mock gate summary:** `output/release-gate/2026-04-17T23-01-11-249Z-44643/summary.json`
- **Latest passing hosted gate:** `output/release-gate/2026-04-09T14-26-54-338Z-54148`
- **Hosted release summary:** `output/release-gate/2026-04-09T14-26-54-338Z-54148/summary.json`
- **Hosted eval artifacts:** `output/evals/2026-04-09-gemini`

## Privacy Boundary

- The hosted Gemini lane is for **synthetic/demo data only**.
- It is the **hackathon proof lane**, not the intended Alberta school deployment path.
- The intended privacy-preserving path remains **local/self-hosted Gemma 4 via Ollama**.

## Next Approved Hosted Rerun Order

1. Run `npm run proof:check`.
2. Run `npm run gemini:readycheck`.
3. Run `npm run release:gate:gemini`.
4. Run `npm run eval:summary`.
5. Run `npm run logs:summary`.

If a future hosted rerun is repairing one route instead of refreshing the full proof, an optional repair-first smoke loop is available: `PRAIRIE_INFERENCE_PROVIDER=gemini PRAIRIE_SMOKE_CASES=ea-briefing npm run smoke:api`.
