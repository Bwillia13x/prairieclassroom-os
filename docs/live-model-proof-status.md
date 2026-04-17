# Live-Model Proof Status

_This document is generated from zero-cost host-preflight and release-gate artifacts._

## Verdict

- Live-model proof: Blocked pending a viable zero-cost Ollama host.
- Zero-cost enforcement: mock and Ollama only; no paid fallback recorded
- Latest passed mock gate: `output/release-gate/2026-04-15T13-55-48-066Z-75327`
- Latest passed Ollama gate: _none recorded_

## Commands

```bash
npm run host:preflight:ollama
npm run release:gate
npm run release:gate:ollama
npm run eval:summary
npm run logs:summary
```

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
