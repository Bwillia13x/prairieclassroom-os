# PrairieClassroom OS

Gemma-4-native, local-first classroom complexity copilot for Alberta K-6 inclusive classrooms.

PrairieClassroom OS is not a chatbot. It is eight structured workflows that reduce the coordination tax on teachers working in high-complexity classrooms with mixed grades, EAL learners, accessibility needs, and shared staffing.

## Quick Start

### Prerequisites

- Node.js 20.19.5 (`nvm use` reads [`.nvmrc`](./.nvmrc))
- Python 3.11.x
- A GCP project with Vertex AI enabled (for real inference) — or run in mock mode

### Install

```bash
nvm use
npm install
python3.11 -m venv services/inference/.venv
services/inference/.venv/bin/pip install -r services/inference/requirements.txt
```

If you already have a prepared Python interpreter, set `PRAIRIE_PYTHON=/abs/path/to/python` before running the release gate. Otherwise the gate picks the first compatible Python 3.11 interpreter from `services/inference/.venv`, `services/inference/.venv311`, `python3.11`, then `python3`.

If you switch Node versions and `better-sqlite3` stops loading, rebuild the native module before restarting the API:

```bash
npm run rebuild:memory
```

### Seed demo data (first time only)

```bash
npx tsx data/demo/seed.ts
```

### Run (three terminals)

```bash
# Terminal 1: Inference service (mock mode — no GPU needed)
cd services/inference && python server.py --mode mock --port 3200

# Terminal 2: Orchestrator API
INFERENCE_URL=http://localhost:3200 npx tsx services/orchestrator/server.ts

# Terminal 3: UI dev server
npm run dev -w apps/web
```

After backend, inference-harness, or memory-layer changes, restart the inference and orchestrator processes before trusting fresh smoke results.

For real Gemma inference via Vertex AI endpoints:

```bash
export GOOGLE_CLOUD_PROJECT=<your-project-id>
export GOOGLE_CLOUD_LOCATION=us-central1
gcloud auth application-default login
npm run provision:vertex-endpoints
# then export the values printed by the script:
export PRAIRIE_VERTEX_BACKEND=endpoint
export PRAIRIE_VERTEX_ENDPOINT_LIVE=projects/<project>/locations/us-central1/endpoints/<live-endpoint>
export PRAIRIE_VERTEX_ENDPOINT_PLANNING=projects/<project>/locations/us-central1/endpoints/<planning-endpoint>
cd services/inference && python server.py --mode api --port 3200
```

### Open

Navigate to **http://localhost:5173/?demo=true** for the demo classroom (Mrs. Okafor's Grade 3/4 split, pre-loaded with 2 weeks of classroom memory).

### Smoke Tests

These checks assume the mock inference service, orchestrator, and Vite UI are already running.

```bash
npm run smoke:api
npm run smoke:browser
# or
npm run smoke
```

The browser smoke saves failure screenshots to `output/playwright/`.

### Release Gate

Use the release gate when you want the repo to start its own local services, run the full hardening checks, and store logs under `output/release-gate/`.

```bash
npm run release:gate
```

If the gate fails because a port is already in use, stop the existing local processes and re-run the command. The gate expects to own `:3200`, `:3100`, and `:5173`.

For credentialed Vertex/Gemma validation, run the real-inference gate. It uses the same startup flow, adds ADC/endpoint preflight checks, runs the real harness smoke + eval suite, saves eval artifacts under `output/evals/<date>-real/`, and refreshes `docs/eval-baseline.md`.

```bash
export GOOGLE_CLOUD_PROJECT=<your-project-id>
export GOOGLE_CLOUD_LOCATION=us-central1
export PRAIRIE_VERTEX_BACKEND=endpoint
export PRAIRIE_VERTEX_ENDPOINT_LIVE=projects/<project>/locations/us-central1/endpoints/<live-endpoint>
export PRAIRIE_VERTEX_ENDPOINT_PLANNING=projects/<project>/locations/us-central1/endpoints/<planning-endpoint>
npm run release:gate:real
```

Use `npm run provision:vertex-endpoints` to create or reuse the long-lived endpoints and emit the exact exports above. The script records deployment configs, operations, and endpoint names under `output/vertex-endpoints/`.
If one tier provisions and the other remains quota-blocked, the script still writes `manifest.json` and `exports.sh`, then exits non-zero with the blocked tier called out explicitly so you can keep the successful endpoint and rerun after quota approval.

For the current `us-central1` topology, the practical quota targets are:

- live tier: `2x NVIDIA_L4`
- planning tier: `4x NVIDIA_L4`

If those L4 quotas are not yet usable, request the increases with Cloud Quotas before rerunning provisioning:

```bash
gcloud beta quotas preferences list --project "$GOOGLE_CLOUD_PROJECT"
gcloud beta quotas preferences create \
  --service=aiplatform.googleapis.com \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --quota-id=CustomModelServingL4GPUsPerProjectPerRegion \
  --preferred-value=6 \
  --dimensions=region=us-central1 \
  --preference-id=prairie-l4-us-central1
```

Before the real gate can succeed, the ADC principal needs Vertex endpoint access on the target project:

- `roles/aiplatform.user`
- `roles/serviceusage.serviceUsageConsumer`
- reusable deployed endpoints for:
  - `google/gemma3@gemma-3-4b-it`
  - `google/gemma3@gemma-3-27b-it`

## Architecture

```
Teacher / EA Browser (Vite + React)
        │
        ▼  REST JSON
Express Orchestrator :3100
  ├─ Prompt builders (8 contracts)
  ├─ Zod request validation
  ├─ Classroom-code auth
  ├─ Retrieval injection (SQL)
  └─ SQLite per-classroom memory
        │
        ▼  HTTP JSON
Flask Inference :3200
  ├─ Vertex endpoint → google/gemma3@gemma-3-4b-it   (live tier)
  └─ Vertex endpoint → google/gemma3@gemma-3-27b-it  (planning tier)
```

## Features

| Workflow | Model Tier | Thinking | Retrieval | Persisted |
|----------|-----------|----------|-----------|-----------|
| Differentiate lesson | live | off | no | yes |
| Tomorrow plan | planning | **on** | yes | yes |
| Family message | live | off | no | yes |
| Log intervention | live | off | no | yes |
| Simplify text | live | off | no | no |
| Vocab cards (10 languages) | live | off | no | no |
| Support patterns | planning | **on** | yes | yes |
| EA daily briefing | live | off | yes | no |

## Safety

- Observational language only ("your records show..." not "this student has...")
- 15 forbidden clinical/diagnostic terms enforced in every prompt class
- All family messages require explicit teacher approval
- No diagnosis, discipline scoring, risk labeling, or autonomous messaging

## Evaluation

64 golden-case evals across schema reliability, content quality, safety boundaries, latency suitability, retrieval fidelity, and cross-feature synthesis.

```bash
# Run evals (requires orchestrator + inference running)
npx tsx evals/runner.ts
```

## Key Docs

- [Product spec](docs/spec.md) — MVP scope and user stories
- [Architecture](docs/architecture.md) — 6-layer system design
- [Prompt contracts](docs/prompt-contracts.md) — all 8 versioned contracts
- [Safety governance](docs/safety-governance.md) — hard boundaries and framing rules
- [Decision log](docs/decision-log.md) — 32 architecture decision records
- [Kaggle writeup](docs/kaggle-writeup.md) — competition submission document
- [Demo script](docs/demo-script.md) — 15-minute walkthrough with narration cues

## Sprint History

| Sprint | Focus | Evals |
|--------|-------|-------|
| 0 | Framework, schemas, mock harness | 0 |
| 1 | Differentiation (5 variants) | 7 |
| 2 | Tomorrow Plan (thinking mode) | 15 |
| 3 | Memory + Family Messaging | 20 |
| 4 | Intervention Logging | 25 |
| 5 | Language Bridge (simplify + vocab) | 30 |
| 6 | Support Pattern Detection | 37 |
| 7 | Pattern-Informed Planning | 37 |
| 8 | EA Daily Briefing | 42 |
| 9 | Demo Packaging + Writeup | 42 |
| 10 | Vertex AI Inference Backend | 42 |
| 11 | Zod Validation Layer | 42 |
| 12 | Auth + Housekeeping | 42 |
| 13 | Submission Polish | 42 |
