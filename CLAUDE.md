# CLAUDE.md

## Project Identity

PrairieClassroom OS is a teacher- and EA-facing classroom complexity copilot for Alberta K-6 classrooms.

This repo is no longer just a pre-dev concept stub. It is a working monorepo with:

- a Vite + React teacher UI in `apps/web`
- an Express orchestrator API in `services/orchestrator`
- a Python inference service in `services/inference`
- per-classroom SQLite memory in `services/memory` and `data/memory`
- shared Zod schemas in `packages/shared`
- an eval harness plus smoke and release-gate scripts at the repo root

The product is still not a student chatbot. It is a classroom operations copilot.

## Current State Of Development

As of 2026-04-10, the practical state of the repo is:

- `npm run release:gate` passes in mock mode and is the default no-cost structural validation lane.
- The hosted Gemini hackathon proof lane passes on synthetic/demo data via `npm run release:gate:gemini`.
- The Ollama privacy-first live-model lane is implemented, but this host is currently blocked because Ollama is unavailable and the required Gemma 4 models are not present.
- The paid Vertex lane exists, but it is intentionally gated behind `PRAIRIE_ALLOW_PAID_SERVICES=true` and is not part of the default no-cost proof story.
- The repo has 12 model-routed prompt classes, a real web UI with 11 teacher-facing panels, 99 eval cases, and 595 unit tests across schema validation, prompt builders, orchestrator routes, memory retrieval, inference backends, and the web API client.
- The web shell supports grouped `Today / Prep / Ops / Review` navigation, URL-backed `tab` and `classroom` state, and a classroom-code prompt that retries protected reads and writes from the UI.
- Security hardened: classroomId path traversal validation, rate limiting (global + per-classroom auth), security headers, safe JSON deserialization, atomic schedule writes, prompt injection detection.
- Documentation current: `docs/architecture.md` rewritten to match the implemented system, reference docs for database schema, classroom profiles, and eval inventory.

Do not treat this repository like a blank-slate MVP. Treat it like a production-hardened classroom operating system that needs careful incremental changes, regression protection, and documentation hygiene.

## Product Boundaries

Never turn the product into:

- a diagnosis engine
- a behavior-risk or discipline scoring system
- a surveillance product
- an autonomous family-messaging sender
- a replacement for teacher or EA judgment

Hosted Gemini runs are synthetic/demo only. Do not use real classroom or student data in that lane.

## Cost Guardrails

- Treat hosted Gemini and any other paid or metered path as budget-constrained operations, not casual defaults.
- Hard operating rule: keep total hosted-model spend under `$20` per day unless the user explicitly overrides that limit for the current day.
- Never rent external GPUs, spin up paid infrastructure, or switch to Vertex/premium paths just to speed up validation without explicit user approval.
- Always run the cheapest sequence first: `npm run proof:check`, then `npm run gemini:readycheck`, then at most one bounded hosted gate run before reassessing.
- Do not loop on hosted retries. If a hosted run fails, inspect artifacts and make the next code or config fix locally before spending again.
- Prefer mock and Ollama for iteration; use hosted Gemini only for bounded proof refreshes on synthetic/demo data.

## Current Surface Area

### Model-routed prompt classes

- `differentiate_material`
- `prepare_tomorrow_plan`
- `draft_family_message`
- `log_intervention`
- `simplify_for_student`
- `generate_vocab_cards`
- `detect_support_patterns`
- `generate_ea_briefing`
- `forecast_complexity`
- `detect_scaffold_decay`
- `generate_survival_packet`
- `extract_worksheet`

### Additional deterministic or retrieval-backed API surfaces

- `GET /health` and `GET /api/health`
- `GET /api/today/:classroomId`
- `GET /api/debt-register/:classroomId`
- `GET /api/classrooms`
- `GET /api/classrooms/:id/schedule`
- `PUT /api/classrooms/:id/schedule`
- `GET /api/classrooms/:id/health`
- `GET /api/classrooms/:id/student-summary`
- history endpoints under `GET /api/classrooms/:id/{plans,messages,interventions,patterns}`
- latest report endpoints: `GET /api/support-patterns/latest/:classroomId`, `GET /api/complexity-forecast/latest/:classroomId`, `GET /api/scaffold-decay/latest/:classroomId/:studentRef`
- `POST /api/feedback` — submit output feedback (rating, comment, panel, generation)
- `GET /api/feedback/summary/:classroomId` — aggregated feedback summary (by panel, by week)
- `POST /api/sessions` — submit session tracking data (panels visited, generations triggered)
- `GET /api/sessions/summary/:classroomId` — aggregated session summary (flows, duration, generation rate)

### Primary UI panels

- Today
- Differentiate
- Language Tools
- Tomorrow Plan
- EA Briefing
- Forecast
- Log Intervention
- Sub Packet
- Family Message
- Support Patterns
- Usage Insights

`extract_worksheet` exists as a backend capability and is used by the web upload components, but it is not a top-level nav tab.

### Web shell contract

- Primary shell groups are `Today`, `Prep`, `Ops`, and `Review`.
- The web UI treats `?tab=` and `?classroom=` as stable deep-link state.
- `?demo=true` remains a convenience selector for the seeded demo classroom when `classroom` is not provided.
- Protected classroom codes are stored locally in-browser and reused automatically for protected `today`, history, and generation routes.

## Runtime And Config Reality

### Toolchain

- Node: `v20.19.5` from `.nvmrc`
- Python: `3.11.x` is the expected path for the inference service and release gate
- Package manager: `npm` with workspaces

### Default local ports

- web UI: `5173`
- orchestrator: `3100`
- inference: `3200`

### Important env vars

From `.env.example` and current scripts:

- `PORT`
- `INFERENCE_URL`
- `CORS_ORIGIN`
- `VITE_API_URL` for the web app when not proxying through Vite
- `API_BASE` for eval overrides
- `PRAIRIE_DATA_DIR`
- `PRAIRIE_MEMORY_DIR`
- `PRAIRIE_PYTHON`
- `PRAIRIE_DEBUG_PROMPTS`
- `PRAIRIE_ENABLE_GEMINI_RUNS`
- `PRAIRIE_GEMINI_API_KEY`
- `PRAIRIE_ALLOW_PAID_SERVICES`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `PRAIRIE_VERTEX_BACKEND`
- `PRAIRIE_VERTEX_ENDPOINT_LIVE`
- `PRAIRIE_VERTEX_ENDPOINT_PLANNING`
- optional Gemini model overrides: `PRAIRIE_GEMINI_MODEL_ID_LIVE`, `PRAIRIE_GEMINI_MODEL_ID_PLANNING`

If you change env expectations, update `.env.example`, `README.md`, and any affected operator docs.

### Data and artifact locations

- classroom JSON profiles and artifacts: `data/synthetic_classrooms/`
- SQLite classroom memory: `data/memory/`
- demo seed script: `data/demo/seed.ts`
- release-gate artifacts: `output/release-gate/`
- host preflight artifacts: `output/host-preflight/`
- request logs: `output/request-logs/`
- eval outputs: `output/evals/`
- evidence reports: `docs/evidence/`
- evidence snapshots: `output/evidence-snapshots/`

## Supported Inference Lanes

The inference harness supports `mock`, `ollama`, `gemini`, `api`, and `local` modes, but not all modes carry the same product weight.

Treat them this way:

1. `mock`
   Default structural development lane. Fastest path for local iteration.
2. `ollama`
   Privacy-first future deployment lane. Intended local/self-hosted Alberta story.
3. `gemini`
   Hosted Gemma 4 hackathon/demo proof lane. Synthetic/demo data only.
4. `api`
   Paid Vertex endpoint lane. Explicitly opt-in only.
5. `local`
   Harness capability exists, but it is not the primary documented operator path and should not silently replace the supported lanes.

## How To Work In This Repo

Before significant edits, read the docs in this order:

1. `README.md`
2. `docs/spec.md`
3. `docs/architecture.md`
4. `docs/prompt-contracts.md`
5. `docs/decision-log.md`

Then pull in the specialized docs that match your task:

- release or run-mode work: `docs/release-checklist.md`, `docs/eval-baseline.md`, `docs/hackathon-hosted-operations.md`, `docs/live-model-proof-status.md`
- current backlog and posture: `docs/development-gaps.md`
- product proof and submission framing: `docs/hackathon-proof-brief.md`, `docs/kaggle-writeup.md`, `docs/demo-script.md`

Do not write against stale assumptions from older sprint docs if README, release docs, and current code disagree.

## Development Rules

For any substantial feature or contract change:

1. Identify whether it is model-routed, deterministic retrieval, UI-only, or ops-only.
2. Update the request/response schema first when the contract changes.
3. Update prompt builders and parsers together for model-routed work.
4. Add or update at least one eval or unit test.
5. Update the canonical docs that describe the changed behavior.

Use the narrowest viable change. Do not re-architect the repo because an older document still sounds aspirational.

## Documentation Rules

Canonical project truth now lives across both `README.md` and `docs/`.

When you change:

- runtime commands or setup: update `README.md` and `docs/release-checklist.md`
- proof-lane behavior or artifacts: update `docs/eval-baseline.md`, `docs/hackathon-hosted-operations.md`, and related proof docs
- route inventory or prompt routing: update `docs/prompt-contracts.md` and any route tables that describe the feature
- major product behavior: update `docs/spec.md`, `docs/architecture.md`, or `docs/decision-log.md` as appropriate

Do not create shadow docs when a canonical doc already exists.

## Validation Rules

No meaningful change is done until you run the checks that fit the change:

- TypeScript or shared schema change: `npm run typecheck`
- lint-sensitive change: `npm run lint`
- orchestrator or shared logic change: `npm run test`
- inference Python change: `npm run test:python`
- end-to-end behavior or release hardening: `npm run release:gate`
- hosted proof maintenance: `npm run proof:check`, `npm run gemini:readycheck`, then `npm run release:gate:gemini`
- evidence portfolio refresh: `npm run evidence:generate`

Prefer the cheapest validation that actually covers the risk, but do not skip the release gate when touching cross-service behavior, run scripts, or operator paths.

## Auth And Safety Notes

- Classroom-code auth is enforced server-side with `X-Classroom-Code` on protected routes.
- `GET /api/classrooms` exposes only non-secret protection metadata such as `requires_access_code` and `is_demo`.
- Demo classroom bypasses auth.
- Some classrooms are open if they do not define an `access_code`.
- The UI now prompts for protected classroom codes and retries protected `today`, history, and generation requests after the code is entered.
- Family-message approval remains human-in-the-loop.
- Hosted Gemini runs must stay synthetic/demo-only.

## When Blocked

If you hit uncertainty:

- choose the smaller scope
- check current code and current operator docs before trusting older planning docs
- record durable decisions in `docs/decision-log.md` when the change affects architecture, routing, safety, or operations
- state clearly whether the blocker is code, host capability, credentials, quota, or documentation drift

The most common mistake in this repo is updating code while leaving the ops and proof docs stale. Avoid that.
