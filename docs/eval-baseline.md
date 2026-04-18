# Eval Baseline

Provider-specific baseline status for the local, hosted, and paid proof lanes.

## Mock Baseline

**Status:** Passing structural gate with no paid services.
**Run date:** 2026-04-18T18:29:08.394Z
**Backend:** `mock`
**What it proves:** Typecheck, lint, Python tests, TS tests, claims check, harness smoke, API smoke, and browser smoke all pass without paid services.
**Raw artifacts:** `output/release-gate/2026-04-18T18-27-46-952Z-48215`

### Commands

```bash
npm run release:gate
```

**Limits:** Mock mode validates prompt contracts and response handling, not live Gemma quality.

## Ollama Baseline

**Status:** Blocked before evals — Ollama preflight failed.
**Backend:** `ollama`
**Raw artifacts:** `output/host-preflight/2026-04-12T16-10-14-124Z.json`

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
- Available disk on host: 6.76 GiB
- Total host memory: 8.00 GiB

## Hosted Gemini API Baseline

**Status:** Passing baseline — 12/12 evals passed and the full hosted release gate completed.
**Run date:** 2026-04-18T16:17:22.585Z
**Backend:** `gemini`
**Key source:** `PRAIRIE_GEMINI_API_KEY`
**Hosted run guard:** enabled
**Eval suite:** Hosted Gemini proof suite (12/127 cases from the full corpus).
**Usage scope:** Synthetic/demo evaluation only.
**Model identifiers observed:** `gemma-4-26b-a4b-it`, `gemma-4-31b-it`
**Raw artifacts:** `output/release-gate/2026-04-18T16-04-28-504Z-87799`

### Commands

```bash
export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>
export PRAIRIE_ENABLE_GEMINI_RUNS=true
npm run release:gate:gemini
```

### Route Summary

| Route | Cases | Passed |
|-------|-------|--------|
| complexity_debt_register | 1 | 1/1 |
| draft_family_message | 2 | 2/2 |
| extract_worksheet | 1 | 1/1 |
| forecast_complexity | 1 | 1/1 |
| generate_ea_briefing | 1 | 1/1 |
| generate_survival_packet | 1 | 1/1 |
| POST /api/differentiate | 3 | 3/3 |
| prepare_tomorrow_plan | 2 | 2/2 |

### Failure Ledger

#### Auth / Startup
- None

#### Parse / Schema
- None

#### Safety
- None

#### Content Quality
- None

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
