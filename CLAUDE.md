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

As of 2026-04-18, the practical state of the repo is:

- `npm run release:gate` passes in mock mode and is the default no-cost structural validation lane.
- The hosted Gemini hackathon proof lane passes on synthetic/demo data via `npm run release:gate:gemini`.
- The Ollama privacy-first live-model lane is implemented, but this host is **structurally blocked** for the full dual-speed lane: the 2026-04-12 `host:preflight:ollama` run recorded 8 GiB total RAM and 6.76 GiB free disk, which cannot fit the planning-tier `gemma4:27b` weights regardless of whether Ollama is installed. The `gemma4:4b` live-tier model may still be feasible on this host. See `docs/decision-log.md` (2026-04-12 maintenance host finding) and `docs/development-gaps.md` G-02.
- The paid Vertex lane exists, but it is intentionally gated behind `PRAIRIE_ALLOW_PAID_SERVICES=true` and is not part of the default no-cost proof story.
- The repo has 13 model-routed prompt classes, a real web UI with 12 teacher-facing panels, 134 eval cases, and broad unit coverage (1,907 vitest + 69 pytest in the latest mock gate) across schema validation, prompt builders, orchestrator routes, memory retrieval, inference backends, and the web API client.
- The web shell exposes a flat seven-view navigation (`classroom / today / tomorrow / week / prep / ops / review`) with URL-backed `tab` + optional `tool` state and a classroom-code prompt that retries protected reads and writes from the UI.
- Protected classroom APIs now support `X-Classroom-Code` plus optional `X-Classroom-Role`; the role defaults to `teacher`, and generated `docs/api-surface.md` records current teacher-only and teacher/EA scopes.
- Security hardened: classroomId path traversal validation, rate limiting (global + per-classroom auth), security headers, safe JSON deserialization, atomic schedule writes, prompt injection detection.
- Documentation current: generated system/API inventory, pilot-readiness gates, memory lifecycle controls, database schema, classroom profiles, and eval inventory.

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
- `balance_ea_load`

### Additional deterministic or retrieval-backed API surfaces

Exact endpoint inventory is generated in `docs/api-surface.md`; do not maintain a parallel hand-counted endpoint table here.

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

The teacher-facing working-surface inventory stays at 12 — the one
stand-alone Today surface plus the eleven workflow tools hosted inside
the new multi-tool pages (Prep, Tomorrow, Ops, Review):

- Today
- Differentiate
- Language Tools
- Tomorrow Plan
- Forecast
- Log Intervention
- EA Briefing
- EA Load Balance
- Sub Packet
- Family Message
- Support Patterns
- Usage Insights

`extract_worksheet` exists as a backend capability and is used by the web upload components, but it is not a top-level nav tab.

### Web shell contract

- The web shell exposes seven standalone top-level pages in this fixed
  order: `classroom`, `today`, `tomorrow`, `week`, `prep`, `ops`,
  `review`. `classroom` is the default landing page when no `?tab=` is
  present.
- `Classroom` is the bird's-eye operating dashboard (health, coverage,
  queues, student watch).
- `Today` is the live-day triage surface.
- `Tomorrow` hosts the Tomorrow Plan and Complexity Forecast tools on
  one page; it is also the destination for all "Save to Tomorrow" flows.
- `Week` centers the multi-day forecast band, upcoming events, planning
  rhythm, and pattern pressure.
- `Prep` hosts Differentiate + Language Tools with a local tool switcher.
- `Ops` hosts Log Intervention, EA Briefing, EA Load, and Sub Packet
  with a local tool switcher and the ops workflow stepper.
- `Review` hosts Family Message, Support Patterns, and Usage Insights
  with a local tool switcher.
- The web UI treats `?tab=` as the canonical top-level selector and
  `?tool=` as an optional embedded-tool selector. `?classroom=` remains
  a stable deep-link parameter, and legacy `?tab=<old-panel>` values
  (e.g. `tomorrow-plan`, `log-intervention`, `differentiate`) are
  migrated on load to their canonical (tab, tool) pair on the next URL
  write.
- `?demo=true` remains a convenience selector for the seeded demo classroom when `classroom` is not provided.
- Protected classroom codes are stored locally in-browser and reused automatically for protected `today`, history, and generation routes.

### Adult API role contract

- Protected classroom endpoints accept `X-Classroom-Code` and optional `X-Classroom-Role`.
- Supported role header values are `teacher`, `ea`, `substitute`, and `reviewer`; missing role defaults to `teacher` for backwards compatibility.
- Current implemented scopes are intentionally narrow: teacher-only routes cover generation, history, schedule writes, health, and student summaries; teacher/EA routes cover Today, EA briefing, debt register, feedback, and session summaries.
- Top-level page visibility mirrors the backend scope: `classroom` and `today` are teacher/ea/substitute; `tomorrow` and `week` are teacher/substitute/reviewer; `prep` is teacher-only; `ops` is teacher/ea/substitute; `review` is teacher/ea/reviewer. Embedded tool capabilities inside each page remain gated by `roleCapabilities()`.
- Substitute and reviewer roles are declared for future bounded views, but they are not granted raw classroom-memory endpoint access by default.
- Exact route scopes are generated in `docs/api-surface.md`; do not hand-maintain a separate role table.

## Runtime And Config Reality

### Toolchain

- Node: `v25.8.2` from `.nvmrc`
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
- generated system inventory: `docs/system-inventory.md`

### Demo Classroom Data Contract

- Canonical demo classroom: `demo-okafor-grade34` (`data/synthetic_classrooms/classroom_demo.json`). It is synthetic-only and may bypass classroom-code auth for judging.
- The demo roster is intentionally tiered: 8 active support threads, 7 lighter watchlist students, and 11 ordinary, light-touch, or strength-only classmates. Do not return to an "every student has a support need" fixture.
- Load-bearing aliases must remain stable unless evals, tests, and docs are deliberately updated together: D1 Amira, D2 Brody, D3 Chantal, D4 Daniyal, D5 Elena, D6 Farid.
- The clean seed contract is 26 students, 36 interventions, 3 generated plans, 1 pattern report, 1 approved family message, 5 sessions, and zero seeded feedback/forecast/scaffold/survival/variant/run rows.
- `npm run pilot:reset` is the canonical deterministic reset. `npx tsx data/demo/seed.ts` is upsert-only and will not purge manual-demo drift.
- `npm run demo:fixture:check` validates alias uniqueness, demo EAL tag conventions, clean-seed counts, latest-plan determinism (`plan-demo-003`), and no real/student-identifying fixture language. `npm run release:gate` runs this check before starting services.
- Do not seed fake human feedback. If demo telemetry is added later, label it explicitly as synthetic demo telemetry.

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
- code-derived surface inventory: `docs/system-inventory.md`, `docs/api-surface.md`
- pilot and real-data readiness: `docs/pilot-readiness.md`, `docs/safety-governance.md`
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
- route inventory or prompt routing: update `docs/prompt-contracts.md`, then run `npm run system:inventory` so `docs/system-inventory.md` and `docs/api-surface.md` stay generated from code
- classroom memory lifecycle behavior: update `docs/database-schema.md`, `docs/pilot-readiness.md`, and `docs/safety-governance.md`
- color tokens, dark-mode switching, or contrast contracts: update `docs/dark-mode-contract.md`, then run `npm run check:contrast`
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
- canonical surface or proof-claim updates: `npm run system:inventory:check`
- classroom memory lifecycle changes: `npm run memory:admin -- summary --classroom demo-okafor-grade34`
- color token or dark-mode contrast changes: `npm run check:contrast`
- evidence portfolio refresh: `npm run evidence:generate`

Prefer the cheapest validation that actually covers the risk, but do not skip the release gate when touching cross-service behavior, run scripts, or operator paths.

## Auth And Safety Notes

- Classroom-code auth is enforced server-side with `X-Classroom-Code` on protected routes.
- Adult API scopes are enforced server-side with optional `X-Classroom-Role`; invalid roles return `classroom_role_invalid`, and disallowed roles return `classroom_role_forbidden`.
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
