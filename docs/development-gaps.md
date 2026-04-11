# Development Gaps — PrairieClassroom OS

**Audit date:** 2026-04-10
**Audited state:** Post-production hardening sprint
**Purpose:** Keep the remaining backlog aligned with what the repo can prove today, without repeating stale gaps that are already closed.

## Current posture

- Comprehensive unit test coverage: 500+ tests across schema validation (166), prompt builders (12 builders + parsers), orchestrator routes, memory retrieval, and inference backends.
- Security hardened: classroomId path traversal validation, rate limiting (global + auth-scoped), security headers, input sanitization, prompt injection detection.
- Resilience hardened: safe JSON deserialization in all 15 memory retrieval paths, health endpoint timeout, atomic schedule writes.
- Documentation current: architecture.md rewritten to match implemented system, three new reference docs (database-schema.md, classroom-profile-schema.md, eval-inventory.md), decision log updated through 2026-04-10.
- Accessibility audited: ARIA attributes verified across 60+ components, minor gaps fixed.
- The no-cost default is explicit: mock and Ollama are the supported local validation lanes. Paid Vertex validation remains optional and blocked unless explicitly enabled.

## Priority map

| Priority | Gap | Status | Why it still matters |
|----------|-----|--------|----------------------|
| **G-01** | Hosted Gemini proof maintenance | Closed for current hackathon proof | The hosted Gemma 4 submission lane is now proven on synthetic/demo data; the remaining work is keeping artifacts and docs current when future reruns happen. |
| **G-02** | Ollama baseline not yet executed on every target host | Pending per machine | The privacy-first live-model story is only credible after `npm run host:preflight:ollama` and `npm run release:gate:ollama` complete on the host that would be used for local demos or pilots. |
| **G-03** | Error-path eval depth still trails happy-path coverage | Partial | The degraded-path corpus is materially deeper now, but it still depends on ongoing expansion as new failure modes are discovered on real hosts. |
| **G-04** | Observability review and retention policy | Mostly closed | Request logging, repo-local log paths, operator summaries, and pruning now exist; the remaining gap is operational discipline rather than missing code. |
| **G-05** | Seed-data and eval-fixture separation | Partial | The ownership split now exists, but proof fixtures should keep growing until demo data carries no proof burden at all. |
| **G-06** | Human validation and pilot evidence | Not started | The product narrative is strongest when teacher, EA, and school feedback are documented. That evidence is intentionally not claimed without artifacts. |
| **G-07** | Paid Vertex baseline | Deferred by design | The paid path remains available, but it is outside the hackathon/zero-cost credibility story and should stay clearly separated. |
| **G-08** | Branded types for domain IDs | **Closed** | ClassroomId, StudentRef, DraftId, PlanId, RecordId branded types defined in `packages/shared/schemas/branded.ts`. Applied at memory layer boundary (db.ts, retrieve.ts, store.ts) and all route handlers. Progressive adoption — internal code migrated, new code uses branded types automatically. |
| **G-09** | Error tracking integration | **Partially closed** | Structured error reporter (`apps/web/src/errorReporter.ts`) with pluggable transport, ErrorBoundary integration, and global error/rejection handlers. Ready for Sentry/LogRocket — just register a transport. |
| **G-10** | Automated baseline regression detection | **Closed** | Release gate now detects regressions automatically by comparing against the latest passing run per inference mode. Non-fatal warnings printed clearly; baseline only updates on pass. |
| **G-11** | Database migration framework | **Closed** | Versioned SQL migrations in `services/memory/migrations/`. Tracked in per-database `_migrations` table. Runs inside transactions with rollback. Current schema is migration 001. Backward-compatible with pre-existing databases. |
| **G-12** | Teacher dashboard structural gaps | **Closed** | Health Bar (success states), sparkline trends, student roster, drill-down drawer — all four structural gaps from the frontend design audit are now implemented. See details below. |

## Gap details

### G-01 — Hosted Gemini baseline execution

**Status:** Closed for the current hackathon proof.

**What is already closed**

- `release:gate:gemini` exists as the hosted Gemma 4 hackathon proof lane.
- The gate now fails fast when no `PRAIRIE_GEMINI_API_KEY` / `GEMINI_API_KEY` is configured or when `PRAIRIE_ENABLE_GEMINI_RUNS=true` is absent.
- `docs/eval-baseline.md` now tracks a separate Hosted Gemini API section.
- `docs/hackathon-hosted-operations.md` documents the exact operator sequence.
- The curated hosted eval suite has already passed on synthetic/demo data.
- The full hosted release gate has completed successfully and produced a passing artifact set.

**What remains**

- Keep `docs/eval-baseline.md`, `docs/hackathon-proof-brief.md`, and `README.md` aligned with the latest passing hosted artifact.
- Re-run `npm run proof:check` and `npm run gemini:readycheck` before any later hosted refresh.
- Use targeted hosted smoke only as an optional repair loop when a single route regresses.

### G-02 — Ollama baseline execution

**Status:** Code path implemented; results depend on the local machine.

**What is already closed**

- `release:gate:ollama` exists as the live-model, zero-cost release lane.
- `host:preflight:ollama` now writes machine-readable host checks under `output/host-preflight/`.
- The gate checks for `gemma4:4b` and `gemma4:27b` before trying to run.
- `docs/eval-baseline.md` is now structured around mock, Ollama, hosted Gemini, and paid Vertex sections.

**What remains**

- Pull the required Ollama models on the target host.
- Run `npm run host:preflight:ollama`.
- Run `npm run release:gate:ollama`.
- Keep the generated Ollama artifact set for the machine used in demos or judging.

### G-03 — Error-path eval depth

**Status:** Improved, not finished.

**What is already closed**

- Validation now rejects oversized free-text payloads at the API boundary.
- Model-output parse failures return structured failures with eval coverage.
- Inference transport and timeout failures now return categorized retry metadata.
- `npm run eval:summary` groups failures into fixed categories for operator review.

**What remains**

- Keep adding host-specific degraded-path cases as new failure modes appear.
- Use proof fixtures rather than demo data for any new edge-case coverage.

### G-04 — Observability and operator view

**Status:** Foundation in place.

**What is already closed**

- Every orchestrator response now carries `X-Request-Id`.
- Request logs are written as JSONL under `output/request-logs/`.
- Prompt bodies stay out of logs unless `PRAIRIE_DEBUG_PROMPTS=true`.
- `npm run logs:summary` gives an operator view of route, category, retryable, and injection counts.
- `npm run logs:prune -- --days 14` prunes repo-local request logs.

**What remains**

- Use the pruning command consistently on long-lived demo machines.
- If operator needs grow, build a richer dashboard on top of the same JSONL files rather than changing the external API.

### G-05 — Fixture separation

**Status:** Still worth doing.

**Why it matters**

The demo classroom is useful, but product proof is stronger when synthetic demo data, regression fixtures, and benchmark fixtures are explicitly separated.

**What remains**

- Move additional edge cases from default local data into `evals/fixtures/classrooms/` and `evals/fixtures/memory/`.
- Keep the fixture ownership manifest current when proof fixtures grow.

### G-06 — Human validation evidence

**Status:** Intentionally unclaimed.

**Why it matters**

The repo can now support a cleaner pilot, but it still does not contain audited teacher, EA, or family validation artifacts. Public copy should continue to describe this as a promising operating model, not a proven classroom outcome.

### G-07 — Paid Vertex baseline

**Status:** Deferred on purpose.

**Why it matters**

The paid path may still matter later for hosted or district-scale deployment, but it should remain outside the zero-cost credibility story until you deliberately fund and run it.

### G-12 — Teacher dashboard structural gaps

**Status:** Closed.

**What was added (2026-04-10)**

- **Health Bar**: Ambient status strip above the triage grid — streak counter, 7-day planning consistency dots, approval cadence chip, overall health indicator. New endpoint `GET /api/classrooms/:id/health`.
- **Sparkline trends**: Inline 14-day trend charts in PendingActionsCard, PlanRecap, and Forecast headers. Reusable `Sparkline` SVG component.
- **Student roster**: Collapsible per-student card grid below the forecast section. Lazy-loaded via new endpoint `GET /api/classrooms/:id/student-summary`. Cards show pending action counts, last intervention timing, active patterns, and priority reasons.
- **Drill-down drawer**: Type-discriminated slide-out panel for student detail, forecast block analysis, debt category inspection, and trend enlargement. Cross-navigates to Intervention and Family Message panels with prefill.
- **History filtering**: Optional `?student=` query parameter on existing `/api/classrooms/:id/interventions` and `/api/classrooms/:id/messages` endpoints.

**What remains**

- VocabCard export (Anki/Quizlet/PDF) — separate feature, not a dashboard concern
- Survival packet print page-break polish — CSS-only refinement
