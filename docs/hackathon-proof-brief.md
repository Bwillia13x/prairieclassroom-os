# Hackathon Proof Brief

Concise, artifact-backed proof summary for judges and collaborators. This document is derived from [eval-baseline.md](./eval-baseline.md), which remains the provider-level source of truth.

## Current State

- **Mock gate:** green at `output/release-gate/2026-05-11T22-53-32-342Z-87696`
- **Hosted Gemini proof lane:** no current clean full hosted gate after the May 8 hosted refresh; the last passing baseline remains the May 3 synthetic/demo artifact.
- **Ollama privacy-first lane:** blocked on host capability on the current machine
- **Paid Vertex lane:** intentionally not run in the zero-cost sprint

## Hosted Gemini Proof

- **Models used:** `gemma-4-26b-a4b-it` (live), `gemma-4-31b-it` (planning)
- **Hosted readycheck:** passed on 2026-05-08 with the supplied AI Studio key and explicit run guard
- **May 8 hosted refresh:** failed and did not produce a passing baseline. The latest attempted hosted gate is `output/release-gate/2026-05-08T22-47-12-031Z-43430`; `75-gemini-evals.log` shows `diff-001` and `diff-015-tool-calling-curriculum` passed, `diff-008-prompt-injection` then hit a retryable provider `500 INTERNAL`, and the eval process exited with code 143 before the suite completed.
- **Latest completed May 8 hosted eval summary:** `output/evals/2026-05-08-gemini/2026-05-08T21-48-03-113Z-23553-gemini-summary.json` recorded `12/13` curated hosted proof cases, with `fcst-001-demo-schema` blocked by provider high demand (`503 UNAVAILABLE`).
- **Latest May 8 hosted eval failure summary:** `output/evals/2026-05-08-gemini/2026-05-08T21-48-03-113Z-23553-gemini-failure-summary.json`
- **Latest May 8 cost rollup:** `output/cost-rollups/2026-05-08-rollup.json`
- **Last passing baseline:** `13/13` passed on 2026-05-03, including the Punjabi family-message equity case.
- **Gemma-native coverage:** the hosted proof suite includes worksheet image extraction, route-scoped tool calling, and multilingual family-message generation on synthetic/demo data
- **Full hosted release gate passed:** historical last passing baseline at `output/release-gate/2026-05-03T17-59-42-981Z-80702`
- **Hosted eval failure ledger:** `output/evals/2026-05-03-gemini/2026-05-03T17-59-42-981Z-80702-gemini-failure-summary.json` contains only the separate Ollama host-preflight block; hosted Gemini validation, transport, timeout, parse, schema, and retrieval failure groups are empty.
- **What this proves now:** real hosted Gemma 4 execution remains artifact-backed on synthetic/demo classroom data, including route-scoped tool calling; the May 8 closure pass did not create a current clean full-gate proof and should not be presented as a new passing baseline.

## Artifact Trail

- **Provider truth source:** `docs/eval-baseline.md`
- **Latest passing mock gate:** `output/release-gate/2026-05-11T22-53-32-342Z-87696`
- **Latest mock gate summary:** `output/release-gate/2026-05-11T22-53-32-342Z-87696/summary.json`
- **Latest attempted hosted gate:** `output/release-gate/2026-05-08T22-47-12-031Z-43430`
- **Latest attempted hosted summary:** `output/release-gate/2026-05-08T22-47-12-031Z-43430/summary.json`
- **Latest attempted hosted eval log:** `output/release-gate/2026-05-08T22-47-12-031Z-43430/75-gemini-evals.log`
- **Latest completed May 8 hosted eval summary:** `output/evals/2026-05-08-gemini/2026-05-08T21-48-03-113Z-23553-gemini-summary.json`
- **Latest completed May 8 hosted eval failure summary:** `output/evals/2026-05-08-gemini/2026-05-08T21-48-03-113Z-23553-gemini-failure-summary.json`
- **Latest May 8 hosted cost rollup:** `output/cost-rollups/2026-05-08-rollup.json`
- **Latest passing hosted gate:** `output/release-gate/2026-05-03T17-59-42-981Z-80702`
- **Last passing hosted release summary:** `output/release-gate/2026-05-03T17-59-42-981Z-80702/summary.json`
- **Last passing hosted eval summary:** `output/evals/2026-05-03-gemini/2026-05-03T17-59-42-981Z-80702-gemini-summary.json`
- **Hosted eval artifacts:** `output/evals/2026-05-03-gemini`
- **Hosted eval failure ledger:** `output/evals/2026-05-03-gemini/2026-05-03T17-59-42-981Z-80702-gemini-failure-summary.json`
- **Ollama host-preflight artifact:** `output/host-preflight/2026-04-29T18-59-02-929Z.json`

## Privacy Boundary

- The hosted Gemini lane is for **synthetic/demo data only**.
- It is the **hackathon proof lane**, not the intended Alberta school deployment path.
- The intended privacy-preserving path remains **local/self-hosted Gemma 4 via Ollama**.

## Future Hosted Rerun Order

1. Run `npm run proof:check`.
2. Export `PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>` and `PRAIRIE_ENABLE_GEMINI_RUNS=true`.
3. Run `npm run gemini:readycheck`.
4. Run `npm run release:gate:gemini`.
5. Run `npm run eval:summary`.
6. Run `npm run logs:summary`.

The May 8 closure pass already used its one approved full hosted rerun. Do not run another full hosted gate without explicit approval.
