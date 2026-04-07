# Decision Log

Use this file as a lightweight ADR register.

## Template

### YYYY-MM-DD — Title
- **Decision:**
- **Why:**
- **Alternatives considered:**
- **Consequences:**
- **What would change this:**

---

### 2026-04-04 — Substitute Teacher Survival Packet

- **Decision:** Add `generate_survival_packet` as the 11th prompt class. Planning tier with thinking enabled. Retrieval pulls from all 7 SQLite tables plus the classroom profile. Output structured into 6 named sections + heads_up array. Sub_ready authorization gate on the classroom profile. Persisted to new `survival_packets` SQLite table.
- **Why:** The substitute teacher scenario is the single highest real-world-impact feature in the roadmap. When a teacher is absent, the classroom's accumulated memory becomes inaccessible at the exact moment it's most needed. This is the first feature that makes classroom memory transferable between adults without requiring the teacher to manually write briefing notes.
- **Alternatives considered:** (1) Reuse EA briefing with expanded scope — insufficient because the substitute needs routines, family comms, and day plan sections that the EA briefing doesn't cover. (2) Generate per-section with separate calls — 6x latency and loses cross-section coherence. (3) Deterministic output without model — would miss the synthesis and simplification that makes the packet actionable.
- **Consequences:** The comprehensive retrieval function (buildSurvivalContext) is the most expensive query in the system — it touches all 7 tables. Acceptable because this runs once per absence, not per request. max_tokens set to 8192 to accommodate the 6-section output. New survival_packets table adds an 8th persistence layer.
- **What would change this:** Evidence that substitutes need a different format (e.g., audio briefing, per-block cards instead of document). Or if real inference shows the 6-section output exceeds model capacity, in which case we'd split into 2 calls (operational sections + student sections).

---

### 2026-04-04 — Schedule data model enrichment

- **Decision:** Extend ScheduleBlockInputSchema with optional `ea_student_refs` (which students the EA supports per block) and UpcomingEventSchema with optional `event_date`. Add `sub_ready` boolean flag to ClassroomProfile. Add GET/PUT `/api/classrooms/:id/schedule` endpoints. Persist schedule updates to the classroom JSON file.
- **Why:** The Substitute Survival Packet and EA Cognitive Load Balancer both need richer schedule data than the current boolean `ea_available`. Explicit EA-student assignments per block enable load calculation and substitution handoff. The `sub_ready` flag is the pre-authorization gate for survival packet generation. Date-aware events allow temporal filtering.
- **Alternatives considered:** (1) Separate SQLite table for schedules — adds complexity without clear benefit since schedules are classroom-scoped and change infrequently. (2) Day-of-week schedule variants — deferred; a single default schedule covers most use cases for now. (3) No persistence (in-memory only) — breaks local-first promise.
- **Consequences:** All existing data validates without changes (new fields are optional). Demo classroom enriched with EA assignments from Ms. Fehr's actual support pattern. Schedule PUT writes directly to JSON — fine for single-user local deployments but would need a different strategy for multi-user.
- **What would change this:** Multi-user deployment requiring concurrent schedule edits, or evidence that day-of-week schedule variants are needed for the EA Load Balancer.

---

### 2026-04-03 — Final review hardening pass

- **Decision:** Applied 20+ improvements from a comprehensive code review: auth gap fix on GET endpoint, enum validation on family message type, ESLint config, CORS restriction, database indexes, graceful shutdown, json_each for student ref queries, server-driven student lists, LocalBackend extract_json, empty-candidate logging, VertexAI error codes, SkeletonLoader extraction, aria-describedby/aria-label a11y, pinned Python deps, .env.example, and 2 new eval cases (cold-memory, non-English message).
- **Why:** Pre-production hardening. The auth gap on the pattern report GET endpoint was the most critical — student behavioral data was accessible without a classroom code. The enum validation bug would silently accept invalid message types.
- **Alternatives considered:** Shipping as-is for demo. But the auth gap is a real privacy concern even for synthetic data, and the other fixes are low-risk improvements.
- **Consequences:** Eval count rises to 44. CORS now restricts to configured origin. Three of five synthetic classrooms remain unauthenticated by design (no access_code set).
- **What would change this:** If CORS origin needs to change for deployment, set CORS_ORIGIN env var. If auth is needed on all classrooms, add access_code to charlie/delta/echo JSON files.

---

### 2026-04-03 — Submission artifacts reflect full system state

- **Decision:** Update README, Kaggle writeup, demo script, and eval report to reflect all 13 sprints of work including Vertex AI backend, Zod validation, and classroom-code auth.
- **Why:** The original README was a pre-dev starter doc. The Kaggle writeup's "What's Not Built" section was outdated (Vertex AI backend now exists). A judge or collaborator cloning the repo should understand the full system from the README alone.
- **Alternatives considered:** Separate README for each audience (judges vs. developers). Leaving the writeup as-is with a changelog appendix.
- **Consequences:** README is now the primary entry point with quick-start instructions. Writeup accurately describes 3 inference backends, Zod validation, and auth. Sprint history table in README shows the full 13-sprint arc.
- **What would change this:** Moving to a hosted documentation site, or splitting the repo into separate user-facing and developer-facing docs.

---

### 2026-04-03 — Classroom-code authentication model

- **Decision:** Add optional `access_code` field to ClassroomProfile. API requests to classroom-specific routes require an `X-Classroom-Code` header matching the classroom's code. Demo classroom bypasses auth. Classrooms without an access_code are open.
- **Why:** The state assessment identified no authentication as a critical gap. Student names and intervention records are accessible to anyone on the network. A simple classroom code provides basic access control without the complexity of user accounts.
- **Alternatives considered:** Full user account system (overkill for local-first MVP). API key per deployment (doesn't differentiate classroom access). No auth (status quo, privacy risk).
- **Consequences:** Two test classrooms (alpha, bravo) now have access codes. Demo classroom is open for demo mode. Auth middleware runs before route handlers on all classroom-specific endpoints. UI needs a code entry mechanism (deferred to UI polish).
- **What would change this:** A multi-teacher deployment requiring per-user access control, or integration with school SSO.

---

### 2026-04-03 — WAL checkpoint management

- **Decision:** Add `checkpointAll()` function that runs `PRAGMA wal_checkpoint(TRUNCATE)` on all open SQLite connections. Called on server startup and every 5 minutes via `setInterval`.
- **Why:** WAL files were growing to 3.9MB for a 4KB database because checkpointing never happened. TRUNCATE mode resets the WAL file to zero bytes after checkpointing.
- **Alternatives considered:** Checkpoint on every write (too frequent, adds latency). Manual checkpoint only (requires developer action). Disable WAL mode (loses concurrent read/write benefit).
- **Consequences:** WAL files stay small. `closeAll()` now checkpoints before closing connections. Minimal CPU overhead from periodic checkpointing.
- **What would change this:** Moving to a multi-process server where WAL checkpointing needs coordination.

---

### 2026-04-03 — Zod for runtime schema validation

- **Decision:** Convert all 8 TypeScript interface schema files to Zod schemas. Add request validation middleware to all orchestrator POST routes. Each schema file exports both the Zod object (for validation) and the inferred type (for compile-time use).
- **Why:** The state assessment identified no input validation as a critical gap. TypeScript interfaces provide compile-time safety but zero runtime protection. Malformed API requests could crash the server or produce garbage output. Zod provides runtime validation that catches type mismatches, missing fields, and invalid enum values at the API boundary.
- **Alternatives considered:** joi (heavier, separate type definitions). io-ts (less ergonomic). Manual validation (already existed, incomplete and inconsistent). ArkType (newer, less ecosystem support).
- **Consequences:** All `import type` consumers are unaffected — Zod inferred types are structurally identical. Request bodies are validated before reaching route handlers. Validation errors return 400 with field-level detail. Zod v4 added to root dependencies.
- **What would change this:** A project-wide move away from TypeScript, or Zod's maintenance status changing.

---

### 2026-04-03 — Vertex AI as Gemma inference backend

- **Decision:** Use Vertex AI via the `google-genai` SDK for real Gemma 4 inference. Both model tiers (`gemma-4-4b-it` live, `gemma-4-27b-it` planning) are called through the same SDK. The harness `--mode api` flag activates this backend.
- **Why:** Vertex AI provides both model tiers without local GPU requirements. AI Studio has limited quota. Local inference requires significant GPU hardware. Vertex AI is production-grade and supports thinking mode.
- **Alternatives considered:** AI Studio free tier (rate limits too low for eval runs). Local inference via transformers (requires 16GB+ VRAM for 27B). Gemini API (different model, not Gemma).
- **Consequences:** Requires a GCP project with Vertex AI API enabled and Gemma model access. `GOOGLE_CLOUD_PROJECT` and `GOOGLE_APPLICATION_CREDENTIALS` environment variables must be set. Adds `google-genai` to Python dependencies. Real inference latency will be higher than mock.
- **What would change this:** Gemma models becoming available on a simpler/cheaper API, or a need for offline-only operation where local inference is required.

---

### 2026-04-05 — extract_json() control character sanitization for real model output

- **Decision:** Add `_sanitize_json_control_chars()` that escapes bare control characters (tabs, newlines, etc.) inside JSON string values before returning from `extract_json()`.
- **Why:** Run 2 of real evals revealed that Gemma 3 4B sometimes emits unescaped control characters inside JSON string values (e.g., literal tabs or newlines inside `student_facing_instructions`). These are valid in Python strings but illegal in JSON, causing `json.loads()` to fail with "Bad control character in string literal." The sanitizer walks the string tracking quote state and escapes control chars only inside string values.
- **Alternatives considered:** Post-processing in each orchestrator parser (duplicates logic across 11 parsers). Regex-based replacement (can't distinguish control chars inside vs outside strings). Requesting `response_mime_type: "application/json"` from the endpoint (not reliably supported by vLLM-served Gemma).
- **Consequences:** Adds ~0.1ms per response (character walk is O(n) on output length). 4 new test cases cover tab, newline, already-escaped, and array contexts.
- **What would change this:** Vertex AI vLLM endpoints supporting reliable structured output mode, making control character sanitization unnecessary.

---

### 2026-04-05 — extract_json() unified bracket matching replaces early-return path

- **Decision:** Remove the early-return path in `extract_json()` that returned text as-is when it started with `{` or `[`. Replace with a single code path that always finds the outermost bracket pair (preferring whichever bracket type appears first in the text).
- **Why:** The early-return path didn't strip trailing prose. Real model output like `{"key": "value"}\nI hope this helps!` would return the full string including prose, causing downstream `json.loads()` to fail. While this bug didn't manifest in the first real eval run (Gemma 3's output was cleaner than expected), it's a ticking time bomb.
- **Alternatives considered:** Adding a separate trailing-prose strip after the early return (would duplicate the `rfind` logic). Keeping the early return and just adding `rfind` there (inconsistent code paths for the same operation).
- **Consequences:** All 20 extract_json tests pass including the previously-bug-documenting test case which now asserts correct behavior. The new array trailing-prose test also passes.
- **What would change this:** Evidence that the unified path is slower on large inputs (unlikely — it's a single `find` + `rfind`), or edge cases where the earliest bracket isn't the JSON boundary.

---

### 2026-04-05 — First real-inference baseline: 56/64 (87.5%), zero safety failures

- **Decision:** Accept 56/64 as the Phase A baseline. All 8 failures categorized: 7 latency (mock-calibrated thresholds too tight for real 27B inference), 1 content quality (missing EA name in survival packet due to retrieval gap). After fixes: 7 latency thresholds adjusted, survival context now includes classroom notes.
- **Why:** The 87.5% pass rate exceeds the 85% exit criteria. Zero parse/schema and zero safety failures on the first real run is a strong signal that the prompt contracts, JSON extraction, and safety framing work under real inference conditions.
- **Alternatives considered:** Re-running before fixing to get a "clean" baseline (unnecessary — the failures are well-understood and documented).
- **Consequences:** Planning tier latency budgets are now 60-150s (up from 5-30s). The survival context is richer. The extract_json bug is fixed proactively. Re-run will establish the post-fix baseline.
- **What would change this:** Evidence that the latency thresholds are too generous (should tighten once endpoint is warm), or that classroom notes injection degrades survival packet quality by adding noise.

---

### 2026-04-05 — Both Vertex AI endpoints operational (Phase A G-01 Task 8)

- **Decision:** Both self-deployed Gemma 3 endpoints are confirmed operational and responding to smoke tests. Live tier (4B on A100 80GB) responds in ~2s. Planning tier (27B on A100 80GB) responds in ~5-8s. No GPU quota issues encountered — A100 80GB quota was available.
- **Why:** The planning endpoint was previously blocked with "Dedicated endpoint DNS is empty." The deployment operation (`4140943352084299776`) completed successfully within ~9 minutes of submission. The earlier sessions observed it too early.
- **Alternatives considered:** Managed Gemma API via `generate_content` was the documented fallback if GPU quota blocked deployment. Not needed.
- **Consequences:** Real-inference eval suite (Task 9) is unblocked. Thinking mode returns `thinking=no` from the vLLM endpoint — reasoning traces are not exposed. This is a known limitation documented in the prior ADR. Safety and content quality evals that depend on thinking output will need adjusted assertions.
- **What would change this:** Vertex AI exposing reasoning traces from vLLM-served Gemma 3, or a switch to a different serving stack that supports them.

---

### 2026-04-05 — Vertex real path uses self-deployed Gemma 3 endpoints

- **Decision:** Keep Vertex AI as the real provider, but stop using publisher-model `generate_content` calls. Real inference now targets two long-lived self-deployed Model Garden endpoints via `PredictionServiceClient.raw_predict`: `google/gemma3@gemma-3-4b-it` for the live tier and `google/gemma3@gemma-3-27b-it` for the planning tier.
- **Why:** The project's real gate was blocked by unavailable Gemma publisher-model IDs. Model Garden deployment configs exist for Gemma 3 in `us-central1`, and the verified vLLM configs expose a chat-completions sample request that preserves the prompt split and multimodal surface we already need.
- **Alternatives considered:** Keep waiting on publisher-model availability (blocks all real baselines). Switch to a non-Gemma Vertex model (breaks model intent). Switch providers (adds a second real-provider path and more operational drift).
- **Consequences:** Real mode now requires `PRAIRIE_VERTEX_BACKEND=endpoint`, `PRAIRIE_VERTEX_ENDPOINT_LIVE`, and `PRAIRIE_VERTEX_ENDPOINT_PLANNING`. The repo adds an explicit provisioning script and the real gate probes endpoint reachability before starting local services. Thinking mode remains a contract flag, but endpoint-backed Gemma does not currently expose separate reasoning traces the way the old SDK path did.
- **What would change this:** A supported, project-accessible Gemma publisher-model path on Vertex that preserves the same multimodal and structured-output needs more simply than endpoint deployment.

---

### 2026-04-03 — JSON extraction utility for real model output

- **Decision:** Add an `extract_json` function in the inference harness that strips markdown fences, finds JSON structures in prose output, and fixes trailing commas before returning to the orchestrator.
- **Why:** Real model output rarely arrives as clean JSON. Common patterns include markdown ` ```json ``` ` wrapping, leading/trailing prose, and trailing commas. The mock backend always returned clean JSON, masking this issue.
- **Alternatives considered:** Forcing structured output via API's `response_mime_type` (not all Gemma API endpoints support this reliably). Fixing only in orchestrator parsers (duplicates logic across 8 parsers). No extraction, just retry on failure (wastes API calls).
- **Consequences:** JSON extraction happens once in the harness before returning to Flask, so all 8 prompt classes benefit. Orchestrator parsers remain as-is and serve as a second layer of defense.
- **What would change this:** Vertex AI Gemma endpoints supporting `response_mime_type: "application/json"` reliably, making extraction unnecessary.

---

### 2026-04-03 — Tomorrow plan prompt contract v0.1.0
- **Decision:** The tomorrow plan prompt uses a structured system prompt defining 5 output sections (transition watchpoints, support priorities, EA actions, prep checklist, family followups) with explicit JSON object format, plus a user prompt injecting classroom context and teacher reflection.
- **Why:** Structured output constraints ensure consistent plan sections. Enumerating sections explicitly prevents the model from omitting critical planning areas. Teacher reflection is the primary input signal.
- **Alternatives considered:** Free-form plan narrative (harder to display, less actionable). Separate calls per section (5× latency, loses cross-section coherence). Multi-turn conversation (too slow for end-of-day teacher workflow).
- **Consequences:** Parse layer must validate JSON object structure. Plan viewer UI can render each section independently. Thinking mode is enabled for this route since planning requires multi-step reasoning.
- **What would change this:** Evidence that real Gemma 4 output requires different prompting structure, or that section-by-section calls produce higher-quality plans.

---

### 2026-04-03 — Thinking mode for planning route only
- **Decision:** Tomorrow plan uses thinking mode on the planning model tier. Differentiation continues without thinking.
- **Why:** Planning requires synthesizing multiple inputs (reflection, routines, student profiles, constraints) into a coherent plan. Thinking mode adds reasoning chain visibility. Differentiation is more formulaic and benefits from speed over depth.
- **Alternatives considered:** Thinking for all routes (too slow for live tasks). No thinking anywhere (misses planning quality benefit).
- **Consequences:** API response includes `thinking_summary` field. UI exposes thinking in a disclosure element for teacher transparency.
- **What would change this:** Evidence that differentiation quality improves significantly with thinking, or that planning latency with thinking exceeds teacher patience.

---

### 2026-04-03 — Tabbed UI for workflow modes
- **Decision:** The web UI uses a tab navigation (Differentiate / Tomorrow Plan) rather than a single-page flow.
- **Why:** Teachers may want to differentiate materials and generate plans in separate sessions. Tab navigation keeps each workflow clean and focused. Both tabs share the classroom selector pattern.
- **Alternatives considered:** Single flow wizard (forces a linear path). Sidebar navigation (overkill for 2 features). Modal overlays (poor UX for complex forms).
- **Consequences:** Each tab manages its own state. Classrooms are loaded once on mount and shared. Future tabs (family messaging, intervention logging) can be added without refactoring.
- **What would change this:** User research showing teachers prefer a unified flow, or the addition of cross-workflow dependencies (e.g., plan referencing today's differentiation).

---

### 2026-04-02 — Teacher/EA workflow is the primary MVP
- **Decision:** The first version will optimize for teacher and educational-assistant use, not student chat.
- **Why:** Classroom complexity is primarily a coordination and workload problem.
- **Alternatives considered:** Student tutoring-first interface; admin analytics-first interface.
- **Consequences:** Product demos should focus on classroom operations.
- **What would change this:** Strong evidence that the teacher loop is too narrow to demonstrate impact.

---

### 2026-04-02 — TypeScript for app/orchestrator, Python for inference
- **Decision:** Use TypeScript for the web app, orchestrator, shared schemas, and eval harness. Use Python for the Gemma inference layer only.
- **Why:** TypeScript provides type safety for schemas and UI. Python is required for HuggingFace transformers and the Gemma model ecosystem. Keeping the boundary clean (TS ↔ Python via HTTP/IPC) avoids dual-runtime complexity in most of the codebase.
- **Alternatives considered:** All-Python (weaker UI tooling for hackathon). All-TypeScript (no mature local Gemma inference library). Rust (overkill for MVP).
- **Consequences:** The inference service must expose an HTTP or IPC interface that the TS orchestrator can call. Mock mode in the harness allows TS-side development without running the Python service.
- **What would change this:** A mature TypeScript Gemma inference library emerging, or a decision to use only API-based Gemma access.

---

### 2026-04-02 — Vite + React for the teacher UI
- **Decision:** Use Vite + React for `apps/web/`, not Next.js or other SSR frameworks.
- **Why:** Hackathon context favors fast scaffolding, simple deployment, and minimal boilerplate. The app is local-first and teacher-facing, so SSR/SEO features are irrelevant. Vite provides fast HMR and minimal config.
- **Alternatives considered:** Next.js (unnecessary complexity for a local-first tool), SvelteKit (smaller ecosystem for rapid prototyping).
- **Consequences:** No server-side rendering. API routes handled by a separate service layer.
- **What would change this:** A requirement for server-rendered pages or deployment to a public-facing web service.

---

### 2026-04-02 — SQLite for local classroom memory
- **Decision:** Use SQLite as the local storage backend for classroom memory, intervention records, and generated outputs.
- **Why:** SQLite is local-first, zero-config, file-portable, and supports real queries. It aligns with the project's privacy and local-deployment principles. It is sufficient for hackathon-scale data.
- **Alternatives considered:** Flat JSON files (fragile for queries, no referential integrity). PostgreSQL (requires a server, unnecessary for MVP). IndexedDB (browser-only, limits backend retrieval).
- **Consequences:** The retrieval layer (Sprint 3) can build on SQL queries before adding vector search. Data portability is easy — one `.sqlite` file per classroom.
- **What would change this:** A need for concurrent multi-user writes or server-hosted deployment at scale.

---

### 2026-04-02 — Provisional Gemma 4 model checkpoints
- **Decision:** Default to `google/gemma-4-4b-it` (live route) and `google/gemma-4-27b-it` (planning route).
- **Why:** The roadmap references E4B-it and 26B-A4B-it as the target models. These are the closest identifiers based on available Gemma 4 documentation. The harness is designed to be model-ID-agnostic, so changing checkpoints is a config change.
- **Alternatives considered:** E2B-it for live (even smaller but may lack quality). 31B-it for planning (larger but higher hardware requirements).
- **Consequences:** Hardware requirements for local inference are moderate (4B fits on consumer GPU; 27B needs ~16GB+ VRAM or quantization). Mock mode eliminates this dependency during development.
- **What would change this:** Official model catalog publication confirming exact checkpoint names and hardware profiles.

---

### 2026-04-02 — Thinking mode opt-in only for planning tasks
- **Decision:** Enable Gemma 4 thinking mode only for `prepare_tomorrow_plan` and other high-stakes synthesis tasks. All other prompt classes run with thinking disabled.
- **Why:** Thinking mode adds latency and token cost. It is justified for planning (which requires multi-step reasoning over classroom context) but counterproductive for differentiation, messaging, and logging where speed matters.
- **Alternatives considered:** Thinking on by default (too slow for live tasks). Thinking off everywhere (misses the best use of the planning model's capabilities).
- **Consequences:** The routing table must explicitly flag thinking per prompt class. The inference harness must support toggling thinking mode.
- **What would change this:** Evidence that differentiation quality improves significantly with thinking mode on the small model.

---

### 2026-04-02 — Monorepo workspace structure
- **Decision:** Organize as a pnpm/npm workspace monorepo with `apps/`, `services/`, `packages/`, and `evals/` top-level directories.
- **Why:** The roadmap explicitly calls for separation of interface, orchestration, memory, evaluation, and documentation. A workspace monorepo keeps these concerns separate while allowing shared type imports.
- **Alternatives considered:** Flat directory (loses architectural clarity important for submission). Separate repos (overhead for a hackathon team of one).
- **Consequences:** Shared schemas in `packages/shared/` are importable by all TS packages. Python inference stays in `services/inference/` with its own `requirements.txt`.
- **What would change this:** The project growing beyond hackathon scale and needing independent deployment pipelines.

---

### 2026-04-02 — Flask HTTP bridge for inference service
- **Decision:** Wrap the Python Gemma harness in a lightweight Flask HTTP server (`services/inference/server.py`) rather than using IPC or embedding Python in Node.
- **Why:** Clean HTTP boundary between TypeScript orchestrator and Python inference. Flask is zero-config, the API surface is one endpoint (`POST /generate`), and it works identically in mock and local modes. The orchestrator calls it via `fetch`.
- **Alternatives considered:** gRPC (overkill for single-endpoint MVP). Subprocess/stdin piping (fragile, harder to test). Embedding Python via node-python (complex build dependency).
- **Consequences:** Requires starting two processes for development (inference + orchestrator). Vite dev server proxies `/api` to orchestrator, orchestrator calls inference at `:3200`.
- **What would change this:** Performance requirements demanding sub-millisecond IPC, or a move to fully API-based Gemma access.

---

### 2026-04-02 — Differentiation prompt contract v0.1.0
- **Decision:** The differentiation prompt uses a structured system prompt defining 5 variant types with explicit JSON output format, plus a user prompt injecting classroom context and artifact content.
- **Why:** Structured output constraints reduce parsing failures. Enumerating variant types explicitly ensures the model produces all 5 and doesn't invent its own categories. Injecting classroom context (students, scaffolds, routines) makes outputs classroom-specific rather than generic.
- **Alternatives considered:** Free-form prose output (harder to parse, less schema-stable). Separate calls per variant (5× latency). Tool-call-based generation (adds complexity with no Sprint 1 benefit).
- **Consequences:** Parse layer must handle markdown fencing and validate structure. Mock inference response updated to return full 5-variant JSON for realistic testing.
- **What would change this:** Evidence that real Gemma 4 output requires different prompting structure, or that variant quality improves with per-variant calls.

---

### 2026-04-02 — Express for orchestrator API server
- **Decision:** Use Express.js (v5) for the orchestrator API server in TypeScript.
- **Why:** Minimal boilerplate, well-known API, runs directly with `tsx`. The orchestrator needs only a few routes (`/api/classrooms`, `/api/differentiate`, `/api/health`). Express v5 supports async handlers natively.
- **Alternatives considered:** Hono (lighter but less ecosystem support for rapid prototyping). Fastify (more ceremony than needed). tRPC (type-safe but overkill when the primary consumer is a simple React app).
- **Consequences:** CORS enabled for local dev. Vite proxy handles the browser-to-API path.
- **What would change this:** Need for WebSocket support (would add socket.io or switch to a framework with built-in WS).

---

### 2026-04-03 — SQLite per-classroom memory files

- **Decision:** Use one SQLite database file per classroom, stored in `data/memory/{classroom_id}.sqlite`, with three tables: generated_plans, generated_variants, family_messages.
- **Why:** Per-classroom files align with local-first portability — a teacher can carry their classroom's entire history as a single file. JSON blobs in TEXT columns avoid relational joins while supporting recency-based retrieval via indexed columns.
- **Alternatives considered:** Single shared database (loses portability story). JSON flat files (fragile for queries). PostgreSQL (requires a server).
- **Consequences:** Connection manager caches open connections by classroom_id. Memory retrieval is by classroom + recency, not cross-classroom analytics.
- **What would change this:** A need for cross-classroom queries or multi-user concurrent writes.

---

### 2026-04-03 — prompt_class field for inference dispatch

- **Decision:** Add a `prompt_class` string field to `GenerationRequest` so the mock backend can dispatch to the correct canned response per prompt class.
- **Why:** Family messaging (no thinking, no tools, no images) would otherwise fall through to the differentiation mock response. Explicit dispatch by prompt class is more reliable than heuristic detection.
- **Alternatives considered:** Detect from prompt content (fragile). Separate endpoints per prompt class (breaks the unified /generate interface).
- **Consequences:** Backward-compatible — prompt_class defaults to None, existing calls unchanged. Real model inference ignores this field.
- **What would change this:** Moving to real model inference where the model determines output format from the prompt.

---

### 2026-04-03 — Family message approval is UX audit, not access control

- **Decision:** The `teacher_approved` field on `FamilyMessageDraft` is an audit record. There is no outbound messaging system to gate. The teacher manually copies the approved text to their own communication channel.
- **Why:** Building a send system introduces complexity and safety risk beyond MVP scope. The safety governance doc requires "no external send without approval" — the simplest way to enforce this is to not have send functionality at all.
- **Alternatives considered:** Email integration (too complex, privacy risk). SMS gateway (cost, privacy). Auto-send with approval toggle (violates safety principle).
- **Consequences:** UI shows "Approve & Copy" rather than "Send". Approval timestamp is recorded for audit.
- **What would change this:** A clear need for integrated messaging with proper consent infrastructure.

---

### 2026-04-03 — Intervention logging: model-structured approach

- **Decision:** Interventions use a model-structured approach: teacher writes free-text, Gemma (live tier, no thinking) extracts observation, action_taken, outcome, and follow_up_needed into a structured InterventionRecord. Teacher reviews the structured result; it saves to classroom memory automatically.
- **Why:** Matches the prompt-in/structured-out pattern of the other three workflows. Keeps the UX fast — teachers write naturally, not in forms. Demonstrates Gemma doing useful NLP work (structuring observations vs. just generating text).
- **Alternatives considered:** Form-first with no model (no NLP value, more friction). Hybrid form + model (more UI complexity for marginal benefit).
- **Consequences:** The mock response needs a prompt_class dispatch. Intervention records feed back into tomorrow plan prompts via retrieval injection.
- **What would change this:** Evidence that teachers prefer structured forms over free-text, or that model structuring is unreliable with real Gemma output.

---

### 2026-04-03 — Intervention retrieval injection into tomorrow plans

- **Decision:** Recent interventions are summarized and injected into the tomorrow plan prompt as a RECENT INTERVENTIONS section, alongside the existing CLASSROOM MEMORY section.
- **Why:** This closes the MVP loop: plan → act → log → next plan informed by outcomes. Without this, interventions are a dead-end log. The spec explicitly requires "classroom memory that actually improves outputs."
- **Alternatives considered:** No injection (simpler but breaks the loop). Full intervention detail injection (too much context, risk of prompt bloat).
- **Consequences:** The tomorrow-plan prompt builder accepts an additional interventionSummary parameter. The server route retrieves recent interventions before building the prompt.
- **What would change this:** Evidence that intervention context degrades plan quality, or that the prompt is too long with both plan and intervention summaries.

---

### 2026-04-03 — Plan-to-intervention UI bridge

- **Decision:** PlanViewer support priority cards include a "Log Intervention" button that pre-fills the InterventionLogger with the student ref, suggested action, and reason from the plan.
- **Why:** Mirrors the plan-to-message bridge from Sprint 3. Reduces friction in the plan → act → log loop. Teachers don't have to re-type context that already exists in the plan.
- **Alternatives considered:** No bridge, standalone intervention tab only (simpler but more friction). Auto-logging from plans (violates teacher-in-the-loop principle).
- **Consequences:** PlanViewer accepts an onInterventionClick callback. InterventionLogger accepts an optional prefill prop.
- **What would change this:** User research showing the bridge is confusing or that teachers prefer to log interventions independently of plans.

---

### 2026-04-04 — Language tools use live tier with no thinking

- **Decision:** Both `simplify_for_student` and `generate_vocab_cards` use the live model tier (gemma-4-4b-it) with thinking off and no retrieval.
- **Why:** Simplification and vocab card generation are single-artifact transformations — no multi-step reasoning or memory required. Speed is critical since teachers use these in-class, not during planning.
- **Alternatives considered:** Planning tier with thinking (unnecessary reasoning overhead for text transformation). Retrieval of student EAL profiles (useful future enhancement, but over-engineers Sprint 5 MVP).
- **Consequences:** Both routes complete in <1 second on mock, expected <5s on real models. No SQLite persistence — outputs are ephemeral, generated on demand.
- **What would change this:** Evidence that quality improves significantly with thinking, or a decision to persist simplified outputs per student for longitudinal tracking.

---

### 2026-04-04 — Support pattern detection uses planning tier with thinking

- **Decision:** `detect_support_patterns` uses the planning model tier (gemma-4-27b-it) with thinking enabled, the same configuration as tomorrow-plan. It retrieves interventions, plans, and follow-up states from classroom memory.
- **Why:** Pattern detection requires synthesizing across 10+ records to identify recurring themes, gaps, and trends. This is multi-step reasoning over accumulated data — the same class of problem that justified thinking mode for tomorrow-plan. The live tier lacks the context window and reasoning depth for cross-record synthesis.
- **Alternatives considered:** Live tier without thinking (insufficient for multi-record synthesis). Live tier with thinking (small model may miss subtle cross-record patterns). No thinking on planning tier (loses the reasoning trace that helps teachers understand why a pattern was identified).
- **Consequences:** Pattern reports take longer to generate (~5-10s real inference). Thinking summary is exposed in a disclosure element so teachers can review the model's reasoning. This is an end-of-day review tool, not a live-instruction tool, so latency is acceptable.
- **What would change this:** Evidence that the planning tier's reasoning adds no quality over the live tier for pattern detection, or that teachers find the latency unacceptable.

---

### 2026-04-04 — Pattern detection framed as teacher-documentation reflection, not student inference

- **Decision:** All pattern detection output uses observational language: "Your records show...", "You've documented..." Patterns are attributed to the teacher's own notes, not presented as model judgments about students. No diagnostic labels, risk scores, or clinical terminology.
- **Why:** The safety governance doc explicitly flags "a feature that begins to infer student state" as requiring careful handling. Pattern detection is the first feature that reads across multiple records and could easily drift into pseudo-diagnosis territory. The framing as "reflecting your own documentation back to you" keeps the teacher as the expert and the system as a memory assistant.
- **Alternatives considered:** Risk-scored output with student rankings (violates hard boundaries). Clinical pattern language like "behavioral regression" (violates safety governance). Neutral but unattributed patterns (ambiguous whether the system is diagnosing).
- **Consequences:** Mock responses and prompt contract embed safety language throughout. Evals include explicit checks for 15+ forbidden clinical/diagnostic terms. The UI description emphasizes "This reflects your own documentation — not a diagnosis."
- **What would change this:** A formal partnership with school psychologists who validate that the safety framing is sufficient, or evidence that the observational framing limits the feature's usefulness.

---

### 2026-04-04 — Pattern reports persisted for cross-feature data flow

- **Decision:** Pattern reports (previously ephemeral in Sprint 6) are now persisted to a `pattern_reports` table in classroom SQLite. The most recent report is automatically retrieved and injected into tomorrow-plan prompts as a PATTERN INSIGHTS section.
- **Why:** This closes the final data loop: interventions -> patterns -> plans -> interventions. Without persistence, pattern insights exist only during the teacher's review session and are lost before the next planning cycle. Persisting them makes the "classroom OS" metaphor real — the system connects findings across features.
- **Alternatives considered:** On-the-fly pattern generation during plan building (double inference latency, defeats the purpose of the separate review step). Passing pattern report IDs manually (adds friction, breaks the seamless loop). No injection (patterns remain informational-only, no downstream impact on planning).
- **Consequences:** The SQLite schema gains a 5th table. Tomorrow-plan prompts are longer when pattern context exists. The response includes `pattern_informed: boolean` for UI indication. A new GET endpoint (`/api/support-patterns/latest/:classroomId`) exposes persisted reports.
- **What would change this:** Evidence that pattern injection degrades plan quality, or that teachers prefer to manually control which patterns inform the plan.

---

### 2026-04-04 — Pattern insight injection preserves safety framing through the chain

- **Decision:** The `summarizePatternInsights()` function preserves the observational framing from Sprint 6 when injecting pattern context into tomorrow-plan prompts. All pattern summaries use "your records show" attribution, and the system prompt instructs the model to continue this framing.
- **Why:** Pattern detection was carefully safety-framed (Sprint 6, ADR). That framing must carry through when pattern data crosses into planning — otherwise, the planning model could reframe observational patterns as diagnoses. The chain of safety must be unbroken: teacher documentation -> pattern detection (observational) -> plan injection (observational) -> plan output (observational).
- **Alternatives considered:** Raw pattern data injection without framing (model might infer diagnostic language). Separate safety prompt for pattern-informed plans (duplicates safety rules, harder to maintain).
- **Consequences:** The pattern summary is structured with clear sections (HIGH-PRIORITY FOCUS, RECURRING THEMES, etc.) that maintain attribution. Safety evals for pattern-informed plans include the same 15 forbidden terms as pattern detection evals.
- **What would change this:** Evidence that the framing is insufficient and the planning model produces diagnostic language despite the safety prompt.

---

### 2026-04-03 — EA daily briefing uses live tier, no persistence

- **Decision:** The EA briefing uses the live model tier (gemma-4-4b-it) with no thinking, and is not persisted to SQLite. It synthesizes data from three existing sources (plans, interventions, pattern reports).
- **Why:** The briefing is a formatting/synthesis task, not deep reasoning — the planning tier already did the hard work. No persistence prevents briefings from becoming shadow student records. EAs regenerate on demand each morning.
- **Alternatives considered:** Planning tier with thinking (unnecessary — the source data is already reasoned over). Persist to a `briefings` table (risk of briefings becoming quasi-reports about students). Cache with TTL (over-engineered for local-first app).
- **Consequences:** No new SQLite table. Briefings pull from three existing tables via `buildEABriefingContext()`. The briefing is the second cross-feature synthesis view after pattern-informed planning.
- **What would change this:** Evidence that synthesis quality requires the planning tier, or EA feedback requesting briefing history for shift handoffs.

---

### 2026-04-03 — EA briefing observational framing matches pattern chain

- **Decision:** EA briefings use the same observational attribution as pattern reports and pattern-informed plans: "The teacher's plan notes..." rather than "This student has..." The same 15 forbidden diagnostic terms apply.
- **Why:** The EA briefing reads pattern data and intervention records — the same data that Sprint 6/7 carefully safety-framed. The framing must carry through to the briefing or we'd break the safety chain at the final display layer.
- **Alternatives considered:** Simplified safety rules for briefings (inconsistent, harder to maintain). No safety rules (dangerous — EA briefings about individual students need the same care as pattern reports).
- **Consequences:** The prompt contract includes the full forbidden terms list. Safety evals check the briefing output for all 15 terms.
- **What would change this:** Evidence that the observational framing makes briefings less useful for EAs, or school feedback that briefings need a different tone.

---

### 2026-04-04 — Simplification and vocab cards are ephemeral (not persisted)

- **Decision:** Language tool outputs (SimplifiedOutput, VocabCardSet) are returned directly to the UI but not stored in classroom SQLite.
- **Why:** These are on-demand transformations, not longitudinal records. A teacher simplifies a passage for today's lesson or generates vocab cards for this week — storing every generation adds complexity without MVP value.
- **Alternatives considered:** Persist to a `language_outputs` table (premature for MVP). Cache in memory with TTL (over-engineered for local-first app).
- **Consequences:** No retrieval injection of language tool history into tomorrow plans. Future sprints can add persistence if teachers want to reuse/share simplified content.
- **What would change this:** Teacher feedback requesting "save this simplification for reuse" or a need to track which simplification levels students are receiving over time.

---

### 2026-04-03 — Demo seed data uses production store functions

- **Decision:** The demo seed script (`data/demo/seed.ts`) populates classroom memory by calling the same `saveIntervention`, `savePlan`, `savePatternReport`, and `saveFamilyMessage` functions that the live system uses.
- **Why:** If seed data bypassed the store layer (e.g., raw SQL inserts), the demo could work even if the store functions were broken. Using production code paths means the seed script is also an integration test — if the store functions have bugs, the seed will fail. This approach caught a real bug in `db.ts` where `import.meta.dirname` was undefined in tsx's CJS mode.
- **Alternatives considered:** Raw SQLite inserts (faster but bypass validation). JSON fixture loading (simpler but doesn't test the real persistence path).
- **Consequences:** Seed script depends on `services/memory/store.ts` and `services/memory/db.ts`. Any schema changes to the store layer require updating the seed data.
- **What would change this:** A need for seed data that represents states the store functions can't produce (e.g., partially corrupted records for error-handling demos).

---

## 2026-04-04 — Phase 1: Debt Register as deterministic retrieval (no model)

**Decision:** The Complexity Debt Register uses pure SQL queries and TypeScript logic instead of a model prompt class.

**Rationale:** Every debt category maps to a deterministic query (stale follow-ups, unapproved messages, etc.). A model would add inference where we want precision. SQL counts stale items more reliably than a 4b model would.

**Evidence that would change this:** If teachers want natural-language debt summaries with contextual recommendations (beyond suggested actions), a model-generated summary layer could be added on top of the deterministic scan.

## 2026-04-04 — Phase 1: Scaffold Decay as separate prompt class (not extension of support-patterns)

**Decision:** Scaffold decay detection is a new prompt class (`detect_scaffold_decay`) rather than an extension of the existing `detect_support_patterns` workflow.

**Rationale:** The pattern report is already complex (recurring themes, follow-up gaps, positive trends, suggested focus). Adding scaffold decay analysis would make it too large. Additionally, scaffold decay is per-student and time-windowed differently — it needs 10+ records for a single student, while pattern detection works across the whole classroom.

**Evidence that would change this:** If the two workflows are always run together and users find it confusing to have separate reports, they could be merged under a unified "classroom intelligence" workflow.
