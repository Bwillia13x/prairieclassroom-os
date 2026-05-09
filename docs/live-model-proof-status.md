# Live-Model Proof Status

_This document is generated from zero-cost host-preflight and release-gate artifacts._

## Verdict

- Hosted Gemini proof lane: passing baseline on synthetic/demo data through the guarded Gemini lane.
- Current hosted refresh: the May 8 hosted refresh failed and did not produce a passing baseline; latest attempted hosted Gemini gate is `output/release-gate/2026-05-08T22-47-12-031Z-43430`.
- Zero-cost school-deployment proof: Blocked pending a viable privacy-first Ollama/self-hosted school deployment host.
- Zero-cost enforcement: mock and Ollama remain the default no-spend lanes; hosted Gemini is explicit opt-in only.
- Latest passed mock gate: `output/release-gate/2026-05-09T14-55-13-435Z-19611`
- Latest passed hosted Gemini gate: `output/release-gate/2026-05-03T17-59-42-981Z-80702`
- Latest attempted hosted Gemini gate: `output/release-gate/2026-05-08T22-47-12-031Z-43430`
- Latest passed Ollama gate: _none recorded_

## Commands

```bash
npm run host:preflight:ollama
npm run release:gate
npm run gemini:readycheck
npm run release:gate:gemini
npm run release:gate:ollama
npm run eval:summary
npm run logs:summary
```

## Hosted Proof

| Provider | Models | Scope | Artifact |
| --- | --- | --- | --- |
| Gemini API | `gemma-4-26b-a4b-it`, `gemma-4-31b-it` | Synthetic/demo only | `output/release-gate/2026-05-03T17-59-42-981Z-80702` |

The May 8 hosted attempt at `output/release-gate/2026-05-08T22-47-12-031Z-43430` is not a passing baseline; it remains a current hosted attempt artifact for failure/refresh traceability.

## Proven Hosts

_None recorded_

## Qualified Pending Hosts

_None recorded_

## Blocked Reference Hosts

| Host | Block | Artifacts |
| --- | --- | --- |
| macbookair.ucalgary.ca (darwin arm64, Apple M1, 8.00 GiB) | Ollama CLI is not available or `ollama list` failed. | `output/host-preflight/2026-04-29T18-59-02-929Z.json` |
| Benjamins-MacBook-Air.local (darwin arm64, Apple M1, 8.00 GiB) | Ollama CLI is not available or `ollama list` failed. | `output/host-preflight/2026-04-12T16-10-14-124Z.json` |

## Artifact Locations

- Host preflight: `output/host-preflight/`
- Release gates: `output/release-gate/`
- Eval summaries: `output/evals/`
- Request logs: `output/request-logs/`
