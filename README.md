# PrairieClassroom OS

Gemma-4-native, local-first classroom complexity copilot for Alberta K-6 inclusive classrooms.

PrairieClassroom OS is not a chatbot. It is eight structured workflows that reduce the coordination tax on teachers working in high-complexity classrooms with mixed grades, EAL learners, accessibility needs, and shared staffing.

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- A GCP project with Vertex AI enabled (for real inference) — or run in mock mode

### Install

```bash
npm install
pip install -r services/inference/requirements.txt
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

For real Gemma inference via Vertex AI:

```bash
export GOOGLE_CLOUD_PROJECT=<your-project-id>
gcloud auth application-default login
cd services/inference && python server.py --mode api --port 3200
```

### Open

Navigate to **http://localhost:5173/?demo=true** for the demo classroom (Mrs. Okafor's Grade 3/4 split, pre-loaded with 2 weeks of classroom memory).

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
  ├─ gemma-4-4b-it   (live tier — fast classroom tasks)
  └─ gemma-4-27b-it  (planning tier — deep reasoning)
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

42 golden-case evals across 5 categories: schema reliability, content quality, safety boundaries, latency suitability, and cross-feature synthesis. Zero regressions across 12 sprints.

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
