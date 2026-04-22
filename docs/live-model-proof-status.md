# Live-Model Proof Status

_This document is generated from zero-cost host-preflight and release-gate artifacts._

## Verdict

- Hosted Gemma 4 proof: Passing on synthetic/demo data through the guarded Gemini lane.
- Zero-cost school-deployment proof: Blocked pending a viable zero-cost Ollama host.
- Zero-cost enforcement: mock and Ollama remain the default no-spend lanes; hosted Gemini is explicit opt-in only.
- Latest passed mock gate: `output/release-gate/2026-04-21T17-40-46-011Z-52231`
- Latest passed hosted Gemini gate: `output/release-gate/2026-04-22T02-16-16-557Z-74236`
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
| Gemini API | `gemma-4-26b-a4b-it`, `gemma-4-31b-it` | Synthetic/demo only | `output/release-gate/2026-04-22T02-16-16-557Z-74236` |

## Proven Hosts

_None recorded_

## Qualified Pending Hosts

_None recorded_

## Blocked Reference Hosts

| Host | Block | Artifacts |
| --- | --- | --- |
| Benjamins-MacBook-Air.local (darwin arm64, Apple M1, 8.00 GiB) | Ollama CLI is not available or `ollama list` failed. See /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev/output/release-gate/2026-04-09T14-55-17-087Z-11686/05-ollama-preflight.log | `output/host-preflight/2026-04-09T14-55-17-627Z.json` |

## Artifact Locations

- Host preflight: `output/host-preflight/`
- Release gates: `output/release-gate/`
- Eval summaries: `output/evals/`
- Request logs: `output/request-logs/`
