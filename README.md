# PrairieClassroom OS

**A Gemma-4-native operating layer for high-complexity inclusive classrooms.**

PrairieClassroom OS is built for the adult coordination work behind inclusive teaching, not the student. It is a teacher command center with 12 primary panels, organized around **four daily teacher jobs** — open the day, adapt instruction, prepare tomorrow, coordinate with adults or families — wired together by a closed feedback loop where today's classroom signal becomes tomorrow's planning context.

The repo ships **12 workflow tools**, **13 model-routed prompt classes**, and **134 eval cases**, validated end-to-end on real hosted Gemma 4 (`gemma-4-26b-a4b-it` + `gemma-4-31b-it`) against synthetic Alberta K-6 classroom data.

> **Submitted to:** [Gemma 4 Good Hackathon](https://kaggle.com/competitions/gemma-4-good-hackathon) — Future of Education track.
> **Judges, start here:** [Kaggle writeup](docs/kaggle-writeup.md) · [Judge summary](docs/hackathon-judge-summary.md) · [Proof brief](docs/hackathon-proof-brief.md) · [Submission plan](docs/plans/2026-05-18-submission-plan.md)
> **Live demo + video:** see "Project Links" inside the Kaggle writeup once Phase F (deploy) and Phase E (video) of the [submission plan](docs/plans/2026-05-18-submission-plan.md) complete.

## Why Gemma 4

- **Multimodal:** the `extract_worksheet` route turns a paper artifact into a structured prompt input — base64-encoded into Gemini-API `inline_data` parts or sent through Ollama's vision channel.
- **Open-weight, local-first:** the same architecture runs on `gemma4:4b` + `gemma4:27b` via Ollama for offline / privacy-preserving deployment to Alberta classrooms.
- **Dual-tier with selective thinking:** live tier for fast classroom transformations; planning tier with `thinking: true` only for cross-record synthesis.
- **Roster-checked function calling:** two bounded local tools (`lookup_curriculum_outcome`, `query_intervention_history`); the intervention-history tool **rejects unknown student aliases** so the model cannot silently confirm a hallucinated student. Tool results round-trip as provider-native `tool_interactions[]`, not prompt injection.

## Quick Start

### Prerequisites

- Node.js 25.8.2 (`nvm use` reads [`.nvmrc`](./.nvmrc))
- Python 3.11.x
- Ollama only if you want the zero-cost live-model lane
- A Google AI Studio API key only if you want the hosted Gemma 4 hackathon lane
- A GCP project with Vertex AI enabled only if you explicitly choose the paid validation path

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

Mock mode and Ollama are the zero-cost defaults. Hosted Gemini API is the hackathon/demo lane for real Gemma 4 validation without local 27B hardware, but hosted runs are disabled by default until you explicitly export `PRAIRIE_ENABLE_GEMINI_RUNS=true`. Any Vertex-backed path is blocked unless you explicitly export `PRAIRIE_ALLOW_PAID_SERVICES=true`.
The operator source of truth for the no-spend local lane is [docs/zero-cost-operations.md](docs/zero-cost-operations.md).
The operator source of truth for the hosted hackathon lane is [docs/hackathon-hosted-operations.md](docs/hackathon-hosted-operations.md).
The artifact-backed proof registry lives in [docs/live-model-proof-status.md](docs/live-model-proof-status.md) for Ollama-host evidence, while provider comparisons live in [docs/eval-baseline.md](docs/eval-baseline.md).

### Reset demo data

```bash
npm run pilot:reset
```

Direct `npx tsx data/demo/seed.ts` is upsert-only. Use `npm run pilot:reset` when you need the canonical clean demo state.

### Run (three terminals)

```bash
# Terminal 1: Inference service (mock mode — no GPU needed)
cd services/inference && python server.py --mode mock --port 3200

# Terminal 2: Orchestrator API
INFERENCE_URL=http://localhost:3200 npx tsx services/orchestrator/server.ts

# Terminal 3: UI dev server
npm run dev -w apps/web
```

### Run with Ollama (privacy-first target — zero cost)

```bash
# Pull Gemma 4 models (one-time)
ollama pull gemma4:4b
ollama pull gemma4:27b

# Verify the host can run the zero-cost live-model lane
npm run host:preflight:ollama

# Terminal 1: Inference service (Ollama mode)
cd services/inference && python server.py --mode ollama --port 3200

# Terminal 2: Orchestrator API
INFERENCE_URL=http://localhost:3200 npx tsx services/orchestrator/server.ts

# Terminal 3: UI dev server
npm run dev -w apps/web
```

### Run with Hosted Gemma 4 via Gemini API (hackathon/demo lane)

```bash
export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>
export PRAIRIE_ENABLE_GEMINI_RUNS=true

# Terminal 1: Inference service (hosted Gemini API mode)
cd services/inference && python server.py --mode gemini --port 3200

# Terminal 2: Orchestrator API
PRAIRIE_INFERENCE_PROVIDER=gemini INFERENCE_URL=http://localhost:3200 npx tsx services/orchestrator/server.ts

# Terminal 3: UI dev server
npm run dev -w apps/web
```

When you start the hosted lane manually, the orchestrator also needs `PRAIRIE_INFERENCE_PROVIDER=gemini`. That flag enables the hosted timeout budget and Gemini-specific planning fallbacks used by heavier routes like Support Patterns.

Use this lane only with synthetic/demo content. Do not use real classroom or student data in the hosted lane.

After backend, inference-harness, or memory-layer changes, restart the inference and orchestrator processes before trusting fresh smoke results.

For real Gemma inference via Vertex AI endpoints:

```bash
export PRAIRIE_ALLOW_PAID_SERVICES=true
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

The shell exposes seven standalone top-level pages in this fixed
order: **classroom → today → tomorrow → week → prep → ops → review**.
`classroom` is the default landing page. Prep, Tomorrow, Ops, and
Review each host multiple embedded tools behind a local tool switcher.

The shell also supports stable deep links:

- `?tab=<page-id>` restores the active top-level page on load and refresh.
- `?tool=<tool-id>` (optional) refines the embedded tool on pages that
  host more than one (e.g. Prep → `differentiate` | `language-tools`).
- `?classroom=<classroom-id>` restores the active classroom.
- `?demo=true` still selects the demo classroom when no explicit classroom is provided.
- Legacy `?tab=<old-panel>` values (e.g. `tomorrow-plan`,
  `log-intervention`, `differentiate`) are migrated on load to their
  canonical (tab, tool) pair and emitted on the next URL write.

Examples:

```text
http://localhost:5173/?demo=true&tab=review&tool=family-message
http://localhost:5173/?classroom=alpha-grade4&tab=tomorrow
http://localhost:5173/?tab=tomorrow-plan   # legacy; redirects to tab=tomorrow&tool=tomorrow-plan
```

`GET /api/classrooms` now returns non-secret classroom metadata for the shell, including `requires_access_code` and `is_demo`. It never returns the classroom access code itself.

Protected classrooms now work in the browser UI: the shell prompts for the classroom code, stores it locally in that browser, and retries protected `today`, history, and generation requests automatically. Direct API callers still authenticate with the `X-Classroom-Code` header.

### Smoke Tests

These checks assume the mock inference service, orchestrator, and Vite UI are already running.

```bash
npm run smoke:api
npm run smoke:browser
# or
npm run smoke
```

The browser smoke saves failure screenshots to `output/playwright/`.
It now verifies the seven-view top-level shell navigation, `tab` + optional `tool` deep-link restore (including legacy `?tab=<old-panel>` migration), the demo classroom flow, and protected classroom auth recovery for missing and invalid codes.

To capture a screenshot bundle for UI review artifacts:

```bash
npm run ui:evidence
```

This writes the current desktop and mobile screenshots under `output/playwright/ui-evidence/`.
For dense local screenshot runs, start the local orchestrator with `PRAIRIE_TEST_DISABLE_RATE_LIMITS=true`; the flag is a proof helper only, and the server ignores it in production.

### Release Gate

Use the release gate when you want the repo to start its own local services, run the full hardening checks, and store logs under `output/release-gate/`.

```bash
npm run release:gate
```

If the gate fails because a port is already in use, stop the existing local processes and re-run the command. The gate expects to own `:3200`, `:3100`, and `:5173`.

For hosted hackathon/demo validation against Gemma 4, use the Gemini gate. The checked-in hosted proof is now passing: the curated hosted eval suite passed and the full hosted release gate completed on synthetic/demo data. Hosted runs fail fast unless both an API key and `PRAIRIE_ENABLE_GEMINI_RUNS=true` are present.
The latest passing hosted artifact is `output/release-gate/2026-04-27T01-26-45-190Z-87424`.

After a future hosted refresh, only one doc needs to change: edit the `Latest passing hosted gate:` line in `docs/hackathon-proof-brief.md`. `npm run proof:check` derives the canonical artifact from that line and verifies every other proof surface references the same value.

Before any future hosted rerun, keep the local-only preparation flow separate from live execution:

```bash
npm run proof:check
npm run gemini:readycheck
```

```bash
export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>
export PRAIRIE_ENABLE_GEMINI_RUNS=true
npm run release:gate:gemini
npm run eval:summary
npm run logs:summary
```

If you are repairing a single hosted route, you can run a cheaper targeted smoke pass before rerunning the full gate:

```bash
export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>
export PRAIRIE_ENABLE_GEMINI_RUNS=true
PRAIRIE_INFERENCE_PROVIDER=gemini PRAIRIE_SMOKE_CASES=tomorrow-plan npm run smoke:api
```

For zero-cost live-model validation, use the Ollama gate. It performs the same local startup flow, verifies the required Gemma 4 models are present in Ollama, runs the eval suite locally, and refreshes `docs/eval-baseline.md`.

```bash
npm run host:preflight:ollama
npm run release:gate:ollama
```

The no-spend observability and evidence helpers are:

```bash
npm run ops:status
npm run system:inventory
npm run system:inventory:check
npm run memory:admin -- summary --classroom demo-okafor-grade34
npm run logs:summary
npm run logs:prune -- --days 14
npm run audit:log -- --classroom demo-okafor-grade34 --from 2026-04-01
npm run eval:summary
```

`npm run audit:log` is the access audit query CLI. It reads the orchestrator JSONL request logs and surfaces the governance question "who accessed which classroom record, when, under which role, and was it allowed?". Filters include `--classroom`, `--role`, `--outcome {allowed|denied|demo_bypass|<detail_code>}`, `--from/--to`, and `--only-classroom`. Passing `--artifact` writes a point-in-time audit snapshot (filters, summary, and up to `--limit` matching records) to `output/access-audit/` as pilot evidence.

Request logs are written inside the repo under `output/request-logs/`. Host preflight artifacts land in `output/host-preflight/`. Eval results and failure summaries land in `output/evals/`.
The generated code-derived surface inventory lives at [docs/system-inventory.md](docs/system-inventory.md), with exact endpoint inventory in [docs/api-surface.md](docs/api-surface.md). Use `npm run system:inventory:check` before updating public proof or operator docs that mention panel counts, prompt-class counts, tier splits, or endpoint tables.
Per-classroom memory lifecycle commands are available through `npm run memory:admin -- <summary|export|anonymize|backup|prune|purge|restore> --classroom <id>`. Destructive `prune`, `purge`, and `restore` operations require `--confirm`. `prune` applies the retention policy defined in the classroom profile JSON (or a `--default-days <n>` flag), deletes rows older than the window from every retention-eligible table, and writes a tombstone artifact to `output/memory-admin/` recording the policy source, per-table cutoffs, and rows removed.
Protected classroom endpoints accept `X-Classroom-Code` plus optional `X-Classroom-Role`. The role defaults to `teacher`; supported values are `teacher`, `ea`, `substitute`, and `reviewer`. Current route scopes are generated in [docs/api-surface.md](docs/api-surface.md).

For credentialed Vertex/Gemma validation, run the real-inference gate only when you intentionally want the paid path. It uses the same startup flow, adds ADC/endpoint preflight checks, runs the real harness smoke + eval suite, saves eval artifacts under `output/evals/<date>-real/`, and refreshes `docs/eval-baseline.md`.

```bash
export PRAIRIE_ALLOW_PAID_SERVICES=true
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
  - `google/gemma-4-4b-it`
  - `google/gemma-4-27b-it`

## Architecture

```
Teacher / EA Browser (Vite + React)
        │
        ▼  REST JSON
Express Orchestrator :3100
  ├─ Prompt builders (13 contracts + retrieval-backed routes + route-scoped tool calling)
  ├─ Zod request validation
  ├─ Classroom-code auth
  ├─ Retrieval injection (SQL)
  └─ SQLite per-classroom memory
        │
        ▼  HTTP JSON
Flask Inference :3200
  ├─ Ollama/Vertex → gemma-4-4b-it / gemma-4-27b-it
  └─ Gemini API → gemma-4-26b-a4b-it / gemma-4-31b-it
```

## Core Surfaces

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
| Complexity forecast | planning | **on** | yes | yes |
| Substitute survival packet | planning | **on** | yes | yes |
| Scaffold decay review | planning | **on** | yes | yes |
| EA load balancing | planning | **on** | yes | no |
| Worksheet extraction | live | off | no | no |

## Safety

- Observational language only ("your records show..." not "this student has...")
- 15 forbidden clinical/diagnostic terms enforced in every prompt class
- All family messages require explicit teacher approval
- No diagnosis, discipline scoring, risk labeling, or autonomous messaging

## Evaluation

134 checked-in eval case files cover schema reliability, content quality, safety boundaries, latency suitability, retrieval fidelity, prompt injection resistance, persistence round-trip, degraded-path handling, and cross-feature synthesis. The current mock release gate passes with 2,058 TypeScript / Vitest tests and 69 Python tests covering shared schemas, prompt builders and parsers, orchestrator routes, memory retrieval with migrations, inference backends, and the web API client.

The hosted Gemma 4 release gate passes 13/13 curated proof cases on synthetic/demo data — including the Punjabi family-message equity case — at `output/release-gate/2026-04-27T01-26-45-190Z-87424` (artifact-backed; see [docs/hackathon-proof-brief.md](docs/hackathon-proof-brief.md) for the full artifact trail).

```bash
# Run evals (requires orchestrator + inference running)
npx tsx evals/runner.ts
npm run eval:summary
```

For public claims, `npm run claims:check` blocks unsupported statements like invented teacher, EA, or parent validation.

## Key Docs

- [Product spec](docs/spec.md) — MVP scope and user stories
- [Architecture](docs/architecture.md) — 6-layer system design
- [Prompt contracts](docs/prompt-contracts.md) — all 13 versioned contracts
- [System inventory](docs/system-inventory.md) — generated panel, routing, endpoint, and eval inventory
- [API surface](docs/api-surface.md) — generated exact Express endpoint table
- [Safety governance](docs/safety-governance.md) — hard boundaries and framing rules
- [Pilot readiness](docs/pilot-readiness.md) — real-data blockers, evidence artifacts, and pilot modes
- [Decision log](docs/decision-log.md) — architecture decision records
- [Kaggle writeup](docs/kaggle-writeup.md) — competition submission document
- [Hackathon proof brief](docs/hackathon-proof-brief.md) — concise artifact-backed proof summary for judges
- [Demo script](docs/demo-script.md) — 15-minute walkthrough with narration cues
- [Video shot list](docs/video-shot-list.md) — 3-minute public-video outline aligned to the hosted proof lane
- [Hackathon submission checklist](docs/hackathon-submission-checklist.md) — repo-complete items, external publish steps, and claims to avoid
- [Hackathon hosted operations](docs/hackathon-hosted-operations.md) — hosted Gemma 4 proof lane for the submission
- [Zero-cost operations](docs/zero-cost-operations.md) — operator checklist for the no-spend mock/Ollama lane
- [Live-model proof status](docs/live-model-proof-status.md) — current blocked/passed host evidence for the zero-cost Ollama lane

## Sprint History

Detailed sprint plans, reviews, and decisions live in [`docs/`](docs/) (search for `sprint-*-{plan,review}.md`) and the [decision log](docs/decision-log.md). The current canonical surface counts (panels, prompt classes, endpoints, eval cases) are derived from code at [`docs/system-inventory.md`](docs/system-inventory.md) and verified by `npm run system:inventory:check` — do not maintain a parallel hand-counted table here.

| Sprint range | Phase focus |
|---|---|
| 0–3 | Framework, schemas, mock harness; differentiation; planning-tier with thinking; classroom memory + family messaging |
| 4–7 | Intervention logging; language bridge (simplify + vocab cards); support pattern detection; pattern-informed planning |
| 8–10 | EA daily briefing; demo packaging + writeup; Vertex AI inference backend |
| 11–13 | Zod validation layer; auth + housekeeping; submission polish |
| Ongoing | Production hardening, hosted Gemini proof maintenance, design-system convergence, pilot paperwork, submission-window plan |
