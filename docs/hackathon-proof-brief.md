# Hackathon Proof Brief

Concise, artifact-backed proof summary for judges and collaborators. This document is derived from [eval-baseline.md](./eval-baseline.md), which remains the provider-level source of truth.

## Current State

- **Mock gate:** green at `output/release-gate/2026-05-17T14-11-36-166Z-99074`
- **Hosted Gemini proof lane:** current hosted refresh is a passing baseline on synthetic/demo data.
- **Ollama privacy-first lane:** blocked on host capability on the current machine
- **Paid Vertex lane:** intentionally not run in the zero-cost sprint

## Hosted Gemini Proof

- **Models used:** `gemma-4-26b-a4b-it` (live), `gemma-4-31b-it` (planning)
- **Hosted readycheck:** passed on 2026-05-16 with the supplied AI Studio key and explicit run guard after sourcing `.env`.
- **Current hosted refresh:** passed. The latest attempted hosted gate is `output/release-gate/2026-05-17T00-36-24-280Z-35954`; the full `npm run release:gate:gemini` run completed typecheck, lint, Python tests, TS tests, claims check, harness smoke, hosted evals, API smoke, and browser smoke.
- **Latest completed hosted eval summary:** `output/evals/2026-05-17-gemini/2026-05-17T00-36-24-280Z-35954-gemini-summary.json` recorded `13/13` curated hosted proof cases passing, including `diff-015-tool-calling-curriculum`, `plan-010-prompt-injection`, `msg-lang-pa-praise`, `surv-001-schema`, and `extract-001-schema`.
- **Latest hosted eval failure summary:** `output/evals/2026-05-17-gemini/2026-05-17T00-36-24-280Z-35954-gemini-failure-summary.json`
- **Latest hosted cost rollup:** `output/cost-rollups/2026-05-17-rollup.json`
- **Current passing baseline:** `13/13` passed on 2026-05-16, including the Punjabi family-message equity case.
- **Gemma-native coverage:** the hosted proof suite includes worksheet image extraction, route-scoped tool calling, and multilingual family-message generation on synthetic/demo data
- **Full hosted release gate passed:** current passing baseline at `output/release-gate/2026-05-17T00-36-24-280Z-35954`
- **Hosted eval failure ledger:** `output/evals/2026-05-17-gemini/2026-05-17T00-36-24-280Z-35954-gemini-failure-summary.json` contains only the separate Ollama host-preflight block; hosted Gemini validation, transport, timeout, parse, schema, and retrieval failure groups are empty.
- **What this proves now:** real hosted Gemma 4 execution is artifact-backed on synthetic/demo classroom data, including route-scoped tool calling, prompt-injection resistance, multilingual family-message coverage, worksheet extraction, API smoke, and browser smoke.

## Artifact Trail

- **Provider truth source:** `docs/eval-baseline.md`
- **Latest passing mock gate:** `output/release-gate/2026-05-17T14-11-36-166Z-99074`
- **Latest mock gate summary:** `output/release-gate/2026-05-17T14-11-36-166Z-99074/summary.json`
- **Latest attempted hosted gate:** `output/release-gate/2026-05-17T00-36-24-280Z-35954`
- **Latest attempted hosted summary:** `output/release-gate/2026-05-17T00-36-24-280Z-35954/summary.json`
- **Latest attempted hosted eval log:** `output/release-gate/2026-05-17T00-36-24-280Z-35954/75-gemini-evals.log`
- **Latest completed hosted eval summary:** `output/evals/2026-05-17-gemini/2026-05-17T00-36-24-280Z-35954-gemini-summary.json`
- **Latest completed hosted eval failure summary:** `output/evals/2026-05-17-gemini/2026-05-17T00-36-24-280Z-35954-gemini-failure-summary.json`
- **Latest hosted cost rollup:** `output/cost-rollups/2026-05-17-rollup.json`
- **Latest passing hosted gate:** `output/release-gate/2026-05-17T00-36-24-280Z-35954`
- **Latest passing hosted release summary:** `output/release-gate/2026-05-17T00-36-24-280Z-35954/summary.json`
- **Latest passing hosted eval summary:** `output/evals/2026-05-17-gemini/2026-05-17T00-36-24-280Z-35954-gemini-summary.json`
- **Hosted eval artifacts:** `output/evals/2026-05-17-gemini`
- **Hosted eval failure ledger:** `output/evals/2026-05-17-gemini/2026-05-17T00-36-24-280Z-35954-gemini-failure-summary.json`
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

The current proof refresh used the latest approved full hosted rerun. Do not run another full hosted gate without explicit approval.
