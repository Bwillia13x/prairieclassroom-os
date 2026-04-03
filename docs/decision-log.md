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
- **Consequences:**
- **What would change this:**

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
