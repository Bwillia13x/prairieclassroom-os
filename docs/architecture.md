# PrairieClassroom OS — Architecture

*Updated 2026-04-18 — reflects the implemented system, not the original aspirational sketch.*

## System thesis

Use Gemma 4 as the reasoning-and-orchestration substrate for a classroom operating layer that helps Alberta K-6 teachers manage complexity without replacing their judgment.

## Core architecture

Six layers, each with a clear boundary and contract surface.

### 1. Input layer

Accepts teacher-initiated input across multiple modalities:

- Typed teacher notes (reflections, intervention observations, forecast context)
- Lesson artifact text (titles, subjects, raw text, teacher goals)
- Worksheet/photo upload (base64-encoded images via `extract_worksheet`)
- Optional Alberta curriculum alignment chosen from a local catalog of official Alberta K-6 curriculum entries
- URL-backed UI state (`?tab=`, `?classroom=`, `?demo=true`)

Voice notes are spec'd but not yet implemented.

### 2. Orchestration layer

Express API (`services/orchestrator/`) responsible for:

- **Prompt class routing** — maps each of the 13 prompt classes to a model tier (live or planning) with explicit thinking-mode and tool-capability flags via the routing table in `router.ts`
- **Request validation** — Zod schemas validate all API request bodies at the boundary (`validate.ts`)
- **Curriculum registry access** — serves a read-only Alberta curriculum catalog from `data/curriculum/alberta/catalog.json` and validates curriculum selections before prompt injection
- **Classroom-code authentication** — `X-Classroom-Code` header validated per request; demo classroom bypasses; rate-limited
- **Input sanitization** — middleware strips injection patterns and trims text
- **Retrieval injection** — pulls recent plans, interventions, patterns, and forecasts from classroom memory and injects them into prompt context
- **Curriculum context injection** — injects a bounded Alberta curriculum summary into differentiate and vocabulary prompts when the teacher selects one
- **Inference dispatch** — calls the Python inference service via HTTP with structured request/response, or proxies provider chunks over SSE for long planning-tier calls
- **Tool-call orchestration** — when a route is tool-capable, attaches route-scoped tool definitions, executes approved local JS tools after a model tool-call response, and sends a provider-native follow-up generation with the tool results
- **Streaming job handoff** — authenticated planning requests can create short-lived opaque stream jobs; the browser attaches with `EventSource` without putting classroom codes in URLs
- **Output parsing** — parses model JSON responses with fallback error handling (422 on parse failure, 502 on inference failure)
- **Memory persistence** — stores generated plans, variants, messages, interventions, forecasts, patterns, scaffold reviews, and survival packets to per-classroom SQLite

### 3. Model layer — two-speed prompt class routing

The routing table in `router.ts` assigns every prompt class to a model tier and thinking mode:

| Prompt class | Model tier | Thinking | Retrieval | Purpose |
|---|---|---|---|---|
| `differentiate_material` | live | off | no | Real-time material adaptation |
| `simplify_for_student` | live | off | no | Language simplification |
| `generate_vocab_cards` | live | off | no | Vocabulary card generation |
| `draft_family_message` | live | off | no | Family communication drafts |
| `log_intervention` | live | off | no | Intervention structuring |
| `generate_ea_briefing` | live | off | yes | EA daily briefing |
| `extract_worksheet` | live | off | no | Multimodal worksheet extraction |
| `prepare_tomorrow_plan` | planning | **on** | yes | Next-day plan synthesis |
| `forecast_complexity` | planning | **on** | yes | 7-day complexity forecasting |
| `detect_support_patterns` | planning | **on** | yes | Recurring pattern detection |
| `detect_scaffold_decay` | planning | **on** | yes | Scaffold withdrawal readiness |
| `generate_survival_packet` | planning | **on** | yes | Supply teacher packet |
| `balance_ea_load` | planning | **on** | yes | EA cognitive load balancing |

The `complexity_debt_register` is deterministic (no model call) — it computes pending actions from memory state.

**Model tier targets:**

| Tier | Local (Ollama) | Hosted (Gemini API) | Paid (Vertex AI) |
|---|---|---|---|
| Live | gemma-4-4b-it | gemma-4-26b-a4b-it | Custom endpoint |
| Planning | gemma-4-27b-it | gemma-4-31b-it | Custom endpoint |

Hosted Gemini uses different model IDs than local targets because Google AI Studio exposes different checkpoints than the open Gemma weights available via Ollama or Vertex.

**Thinking mode** is enabled only for planning-tier classes where deeper chain-of-thought reasoning improves output quality (plans, forecasts, pattern analysis). Live-tier classes use direct generation for lower latency.

**Tool calling** is enabled only where the routing table declares it and the orchestrator has a registered local tool. Current tools are:

| Prompt class | Tool | Data source | Boundary |
|---|---|---|---|
| `differentiate_material` | `lookup_curriculum_outcome(grade, subject, keyword)` | Local Alberta curriculum catalog | Curriculum grounding only |
| `prepare_tomorrow_plan` | `query_intervention_history(student_ref, days, limit)` | Active classroom SQLite memory | Observational intervention history only |

The Python inference service forwards tool definitions to Gemini API, Ollama, and Vertex/OpenAI-compatible payloads, and returns model-emitted tool calls to the TypeScript orchestrator. The orchestrator executes the JavaScript tool implementation and asks for a final JSON response in a follow-up turn.

### 4. Memory layer

Per-classroom SQLite databases (`services/memory/`) with WAL mode for concurrency safety.

**Ten tables per classroom** (migration 002 added `feedback` and `sessions`):

| Table | Key fields | Purpose |
|---|---|---|
| `generated_plans` | plan_id, classroom_id, plan_json | Tomorrow plans |
| `generated_variants` | variant_id, artifact_id, variant_json | Differentiation variants |
| `family_messages` | draft_id, student_refs, teacher_approved | Draft and approved messages |
| `interventions` | record_id, student_refs, record_json | Logged interventions |
| `pattern_reports` | report_id, student_filter, report_json | Support patterns |
| `complexity_forecasts` | forecast_id, forecast_date, forecast_json | Complexity forecasts |
| `scaffold_reviews` | report_id, student_ref, report_json | Scaffold decay reviews |
| `survival_packets` | packet_id, generated_for_date, packet_json | Supply teacher packets |
| `feedback` | feedback_id, rating, panel, generation_id | Teacher feedback on generations (F14 harvest input) |
| `sessions` | session_id, panels_visited, generations_count | Per-session usage telemetry |

All tables indexed on `(classroom_id, created_at)`. Student-specific tables add `student_ref` to the index.

**Retrieval functions** (`retrieve.ts`) provide clean interfaces for the orchestrator:
- `getRecentPlans()`, `getRecentInterventions()`, `getRecentPatternReports()` — feed context into planning-tier prompts
- `buildDebtRegister()` — computes the complexity debt register deterministically from memory state
- `getLatestForecast()`, `getLatestPlan()` — power the Today panel

### 5. Prompt class routing layer

Thirteen model-routed prompt classes plus one deterministic query, each defined by a versioned contract in `docs/prompt-contracts.md`:

**Live tier (7 classes):** `differentiate_material`, `simplify_for_student`, `generate_vocab_cards`, `draft_family_message`, `log_intervention`, `generate_ea_briefing`, `extract_worksheet`

**Planning tier (6 classes):** `prepare_tomorrow_plan`, `forecast_complexity`, `detect_support_patterns`, `detect_scaffold_decay`, `generate_survival_packet`, `balance_ea_load`

**Deterministic:** `complexity_debt_register`

Each prompt class has:
- A Zod request schema (validated at the API boundary)
- A prompt builder (constructs the full prompt with classroom context and retrieval injection)
- A response parser (extracts structured JSON from model output)
- A shared output schema (in `packages/shared/schemas/`)
- Mock fixtures for offline development (per-classroom canned responses)

### 6. Safety layer

Enforces product boundaries at multiple levels:

- **15 forbidden diagnostic terms** — rejected in all student-facing output (e.g., "ADHD", "autism", "disability"). Enforced in prompt builders and validated in eval cases.
- **Observational language framing** — all student references use "your records show" rather than "this student has". No clinical framing.
- **No diagnosis** — the system describes observed classroom patterns, never suggests medical or psychological diagnoses
- **No discipline scoring** — no behavior-risk scoring or surveillance features
- **Human-in-the-loop messaging** — family messages require explicit teacher approval before any external action
- **No autonomous sends** — the system drafts; teachers decide
- **Prompt injection detection** — regex-based scanning of all request fields with logging (defense-in-depth alongside model safety filters)
- **Classroom-code authentication** — rate-limited per-IP access code validation on protected routes
- **Input sanitization** — middleware neutralizes markdown fences and common injection patterns
- **Audit trail** — all model-routed outputs persisted with model_id and timestamp

## Canonical flow

1. Teacher interacts via the web UI (tab navigation, form input, file upload).
2. Request hits the orchestrator API with Zod-validated body and classroom-code auth.
3. Orchestrator loads the classroom profile and routes to the correct prompt class.
4. For retrieval-backed classes, relevant memory (plans, interventions, patterns) is injected into the prompt context.
5. Prompt is dispatched to the inference service with the correct model tier and thinking flag. Long planning-tier UI calls use the streaming route variant; shorter routes keep the synchronous JSON path.
6. If the route has registered tools and the model emits tool calls, the orchestrator executes those local tools and sends one provider-native follow-up generation containing the tool results.
7. Inference service generates structured JSON output (mock, Ollama, Gemini, or Vertex backend). Gemini and Ollama can stream generation fragments through `/generate/stream`; other modes fall back to a full-response stream.
8. Orchestrator forwards provider chunks and thinking updates to the browser over SSE, assembles the final model text server-side, then parses and validates the complete JSON response.
9. Only the final validated result is persisted to classroom memory.
10. Structured result is returned to the UI for teacher review.
11. For family messages, teacher explicitly approves before any external action.

## Inference backends

The Python inference harness (`services/inference/harness.py`) supports five modes:

| Mode | Purpose | Cost | Status |
|---|---|---|---|
| `mock` | Default development lane | Free | Passing |
| `ollama` | Privacy-first local deployment | Free | Code complete, blocked on host |
| `gemini` | Hackathon demo proof (synthetic data only) | API credits | Passing |
| `api` | Paid Vertex AI endpoints | Compute + traffic | Gated behind PRAIRIE_ALLOW_PAID_SERVICES |
| `local` | Direct transformers loading | GPU required | Available, not primary path |

The inference service exposes both `/generate` and `/generate/stream`. The
streaming endpoint emits SSE `chunk`, `thinking`, `complete`, and `error`
events. The orchestrator translates that backend stream into client-facing SSE
events for planning-tier panels and persists only the final parsed JSON output.

## Web shell

### Scroll containers

The app shell uses an inner-element scroll pattern, not document scroll. The
top header (`.app-header__inner`) and primary tab bar are sticky to the
viewport. Below them, `<main class="app-main">` is the *only* element that
scrolls; it has `overflow: hidden auto` and a fixed pixel height equal to
`100vh - shell chrome`. The `<body>` and `<html>` heights stay flush with
the viewport.

Practical consequences:

- `window.scrollY` is always `0`; `document.documentElement.scrollHeight`
  equals the viewport height. Use
  `document.querySelector('.app-main').scrollTop` instead.
- Anchor links inside the workspace (`<a href="#review-workspace">`) work
  because `scrollIntoView` is container-aware. The `PageAnchorRail`
  component depends on this.
- Full-page screenshot tools (Playwright `fullPage: true`, browser
  extensions) only capture the viewport. Smoke scripts in `qa/` and
  `scripts/capture-*.mjs` already accommodate this; new screenshot tooling
  must do the same.
- Page-bottom intersection observers must root on `.app-main`, not the
  viewport.

The pattern lives in `apps/web/src/styles/ambient.css` (see `.app-shell`
and `.app-main` rules) and is intentional: it lets the chrome (header,
nav, classroom switcher) stay fixed while only the workspace content
scrolls.

## What to keep modular

- Prompt contracts (versioned, one per class)
- Output schemas (shared Zod package)
- Inference backends (swappable without orchestrator changes)
- Memory retrieval adapters (clean function interfaces)
- Model-routing logic (single routing table)
- Safety rules (centralized forbidden-term lists)

## Feedback and session data flow

Teacher feedback and session tracking form a closed evidence loop:

1. **Feedback submission** (`POST /api/feedback`) — the UI submits per-output ratings (thumbs up/down plus optional comment) to the orchestrator, which persists them to the `feedback` table in the classroom's SQLite database.
2. **Session submission** (`POST /api/sessions`) — at session end, the UI submits a session record (panels visited, generations triggered, start/end time) to the `sessions` table.
3. **Summary aggregation** — `GET /api/feedback/summary/:classroomId` and `GET /api/sessions/summary/:classroomId` compute aggregates (by-panel counts, weekly trends, common workflow flows, a repeated Today-starting workflow nudge, duration statistics) from the stored records.
4. **Teacher-facing surfaces** — the web UI's Usage Insights tab (Review group) renders these summaries in a teacher-facing view with per-panel progress bars, sparkline trends, and workflow sequence lists. The Today panel consumes the same session summary to surface a one-line "usual next step" nudge when the teacher has a repeated multi-panel workflow that starts from Today.
5. **Evidence generation** — `npm run evidence:generate` reads all classroom databases and request logs to produce markdown evidence reports in `docs/evidence/`.

No feedback or session data is sent to any external service. All data remains in the per-classroom SQLite databases.

## What not to overbuild yet

- Multi-school dashboards
- External system integrations (LMS, SIS)
- Analytics warehouse
- Fully automated workflow chains
- Student-facing interfaces
- Cross-classroom pattern aggregation
