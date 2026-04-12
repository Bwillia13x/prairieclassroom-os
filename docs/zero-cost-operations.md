# Zero-Cost Operations

This document is the operator source of truth for the no-spend lane.
The current artifact-backed host status is tracked in `docs/live-model-proof-status.md`.

## Allowed Modes

- `mock`
- `ollama`

## Forbidden Paths In This Sprint

- Vertex provisioning
- `npm run release:gate:real`
- `PRAIRIE_ALLOW_PAID_SERVICES=true`
- Any paid API, paid cloud inference, or paid pilot workflow

## Host Setup

1. Install dependencies:

```bash
nvm use
npm install
python3.11 -m venv services/inference/.venv
services/inference/.venv/bin/pip install -r services/inference/requirements.txt
```

2. Install Ollama locally.
3. Pull the required Gemma models:

```bash
ollama pull gemma4:4b
ollama pull gemma4:27b
```

4. Run host preflight:

```bash
npm run host:preflight:ollama
```

5. Run the zero-cost release lanes:

```bash
npm run release:gate
npm run release:gate:ollama
```

## Candidate Host Workflow

Run this sequence exactly once per candidate machine:

```bash
npm run host:preflight:ollama
npm run release:gate
npm run release:gate:ollama
npm run eval:summary
npm run logs:summary
```

Admission rule:

- Continue only if `npm run host:preflight:ollama` exits with `status=ok`, `cli_available=true`, and both `gemma4:4b` plus `gemma4:27b` are present.
- If preflight exits non-zero, stop immediately for that machine and keep it in the blocked-host ledger.

## Optional Operator Commands

```bash
npm run logs:summary
npm run logs:prune -- --days 14
npm run eval:summary
```

## Artifact Locations

- Mock and Ollama release-gate runs: `output/release-gate/`
- Ollama host preflight: `output/host-preflight/`
- Eval results and failure summaries: `output/evals/`
- Request logs: `output/request-logs/`
- Browser smoke screenshots: `output/playwright/`

## Pass Criteria

- `npm run release:gate` passes with no paid services enabled.
- `npm run host:preflight:ollama` writes a JSON artifact under `output/host-preflight/`.
- `npm run release:gate:ollama` either:
  - passes with both `gemma4:4b` and `gemma4:27b` available locally, or
  - exits non-zero with a documented zero-cost block in the host-preflight artifact and `docs/eval-baseline.md`.
- Request logs stay inside the repo under `output/request-logs/` and are summarizable with `npm run logs:summary`.

## If Ollama Is Blocked On A Host

1. Run `npm run host:preflight:ollama`.
2. Inspect the latest artifact in `output/host-preflight/`.
3. If the block is `ollama_unavailable`, install or repair the local Ollama CLI.
4. If the block is `missing_models`, pull `gemma4:4b` and `gemma4:27b`.
5. If the host still cannot satisfy the requirement for `gemma4:27b`, treat the machine as blocked for live-model proof.

Do not switch to Vertex, do not enable paid services, and do not weaken the requirement to a smaller-model-only claim.
