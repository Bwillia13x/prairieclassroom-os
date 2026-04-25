# Eval Baseline

Provider-specific baseline status for the local, hosted, and paid proof lanes.

## Mock Baseline

**Status:** Passing structural gate with no paid services.
**Run date:** 2026-04-25T18:33:58.905Z
**Backend:** `mock`
**What it proves:** Typecheck, lint, Python tests, TS tests, claims check, harness smoke, API smoke, and browser smoke all pass without paid services.
**Raw artifacts:** `output/release-gate/2026-04-25T18-31-17-925Z-20019`

### Commands

```bash
npm run release:gate
```

**Limits:** Mock mode validates prompt contracts and response handling, not live Gemma quality.

## Ollama Baseline

**Status:** Blocked before evals — Ollama preflight failed.
**Backend:** `ollama`
**Raw artifacts:** `output/host-preflight/2026-04-09T14-55-17-627Z.json`

### Commands

```bash
npm run host:preflight:ollama
npm run release:gate:ollama
```

**Role in proof story:** Privacy-first self-hosted school deployment lane.

### Preflight

- Ollama CLI is not available or `ollama list` failed.
- Required models: `gemma4:4b`, `gemma4:27b`
- Available models: none
- Available disk on host: 7.22 GiB
- Total host memory: 8.00 GiB

## Hosted Gemini API Baseline

**Status:** Blocked before evals — Gemini API preflight failed.
**Backend:** `gemini`
**Raw artifacts:** `output/release-gate/2026-04-25T18-31-17-925Z-20019/gemini-preflight.json`

### Commands

```bash
export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>
export PRAIRIE_ENABLE_GEMINI_RUNS=true
npm run release:gate:gemini
```

### Preflight

- Hosted Gemini API baseline has not been executed yet.
- API key present: no
- Key source: not configured
- Hosted run guard: disabled
- Hosted live model: `gemma-4-26b-a4b-it`
- Hosted planning model: `gemma-4-31b-it`

## Paid Vertex Endpoint Baseline

**Status:** Not run in this zero-cost sprint.
**Backend:** `vertex`
**Raw artifacts:** _none recorded in this sprint_

### Commands

```bash
export PRAIRIE_ALLOW_PAID_SERVICES=true
export GOOGLE_CLOUD_PROJECT=<your-project-id>
export GOOGLE_CLOUD_LOCATION=us-central1
export PRAIRIE_VERTEX_BACKEND=endpoint
export PRAIRIE_VERTEX_ENDPOINT_LIVE=projects/<project>/locations/us-central1/endpoints/<live-endpoint>
export PRAIRIE_VERTEX_ENDPOINT_PLANNING=projects/<project>/locations/us-central1/endpoints/<planning-endpoint>
npm run release:gate:real
```

### Notes

- This section is intentionally left unexecuted during the no-cost sprint.
- Vertex-backed validation remains available for later paid testing, but it is blocked unless `PRAIRIE_ALLOW_PAID_SERVICES=true`.
