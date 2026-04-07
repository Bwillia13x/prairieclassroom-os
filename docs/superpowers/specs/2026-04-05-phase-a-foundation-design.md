# Phase A — Foundation: Real Inference Validation + Unit Test Suite

**Date:** 2026-04-05
**Gaps addressed:** G-01 (Real Inference Not Validated), G-02 (Zero Unit Tests)
**Parent document:** `docs/development-gaps.md`
**Workstreams:** Two parallel tracks that converge during triage

---

## Overview

Phase A closes the two critical-severity gaps that block all downstream quality work. The workstreams run in parallel:

- **G-01** deploys the planning (27B) Vertex AI endpoint, runs all 64 evals against real Gemma inference, and documents the baseline.
- **G-02** builds a unit test suite for the five highest-risk internal modules, establishing a test foundation that accelerates debugging when real-inference evals fail.

The workstreams converge at triage: when real-inference evals fail, unit tests help isolate whether the fault is in prompt construction, JSON extraction, memory retrieval, schema validation, or the model itself.

---

## Workstream 1: G-01 — Real Inference Validation

### 1.1 Deploy Planning Endpoint

**Problem:** The 27B planning endpoint returns "Dedicated endpoint DNS is empty" during preflight. The 4B live endpoint works. The provisioning script exists at `scripts/provision-vertex-endpoints.mjs`.

**Approach:** Debug and redeploy using the existing provisioning infrastructure. Do not change the inference architecture (stay with self-deployed Model Garden endpoints via `raw_predict`).

**Steps:**

1. **Diagnose the 27B failure.** Run the provisioning script in `--list-only` mode to check current endpoint state:
   ```bash
   export GOOGLE_CLOUD_PROJECT=gen-lang-client-0734779513
   export GOOGLE_CLOUD_LOCATION=us-central1
   node scripts/provision-vertex-endpoints.mjs --list-only
   ```
   Determine whether the endpoint exists but has no deployed model, or whether the endpoint itself failed to create.

2. **Check GPU quota.** The provisioning script checks quota IDs:
   - `CustomModelServingL4GPUsPerProjectPerRegion`
   - `CustomModelServingA10080GBGPUsPerProjectPerRegion`
   - `CustomModelServingH100GPUsPerProjectPerRegion`

   The 27B model requires more GPU memory than the 4B. Verify that the project has sufficient quota for the required accelerator type. If not, request a quota increase via the GCP console.

3. **Redeploy.** Run the provisioning script with `--force-deploy` if the endpoint exists but the model is not deployed:
   ```bash
   node scripts/provision-vertex-endpoints.mjs --force-deploy
   ```

4. **Verify both endpoints.** Run the harness smoke test (substitute endpoint resource names from provisioning output or `eval-baseline.md`):
   ```bash
   export PRAIRIE_VERTEX_BACKEND=endpoint
   export PRAIRIE_VERTEX_ENDPOINT_LIVE=projects/290195322408/locations/us-central1/endpoints/<live-id>
   export PRAIRIE_VERTEX_ENDPOINT_PLANNING=projects/290195322408/locations/us-central1/endpoints/<planning-id>
   python services/inference/harness.py --mode api --smoke-test
   ```
   The exact endpoint IDs are emitted by the provisioning script and recorded in `docs/eval-baseline.md`.
   Both tiers must return a valid response. Planning tier latency should be noted (target: <15s for a simple prompt).

**Fallback:** If the 27B self-deployed endpoint cannot be made operational (quota denial, model unavailability, persistent deployment errors), pivot to Vertex AI managed Gemma endpoints. This would require modifying `VertexAIBackend` in `harness.py` to use the `generate_content` API instead of `raw_predict`. Document the decision in `docs/decision-log.md` if this fallback is triggered.

**Exit criteria:**
- Both `live` and `planning` preflight probes return `ok` in the release gate
- `harness.py --mode api --smoke-test` passes for both tiers

### 1.2 Run Full Real-Inference Eval Suite

**Steps:**

1. **Seed demo data.** Ensure demo classrooms are populated:
   ```bash
   npx tsx data/demo/seed.ts
   ```

2. **Run the real release gate:**
   ```bash
   npm run release:gate:real
   ```
   This starts all three services (inference in API mode, orchestrator, web frontend), runs API smoke tests, browser smoke tests, and the full 64-case eval suite.

3. **Collect artifacts.** Results land in:
   - `output/evals/YYYY-MM-DD-real/{timestamp}-results.json` — full per-case results
   - `output/evals/YYYY-MM-DD-real/{timestamp}-summary.json` — failures only
   - `output/release-gate/{timestamp}/` — service logs

4. **Update eval baseline.** The `--update-baseline` flag in `release:gate:real` writes results to `docs/eval-baseline.md`. Review and commit.

**Exit criteria:**
- Full eval run completes without infrastructure errors (individual eval failures are expected and triaged in 1.3)
- `docs/eval-baseline.md` updated with real results

### 1.3 Triage and Fix Failures

Real-inference evals will likely produce failures. Each failure falls into one of these categories:

| Category | Symptom | Likely fix |
|----------|---------|------------|
| **Parse/Schema** | Response is not valid JSON, or JSON doesn't match expected schema | Fix `extract_json()` in `harness.py`, or adjust prompt to elicit better structure |
| **Safety** | Output contains forbidden terms (diagnosis language, PII) | Strengthen safety framing in the prompt contract |
| **Content quality** | Output is generic, missing required fields, or not grounded in context | Improve prompt specificity, add few-shot examples, or adjust retrieval context |
| **Latency** | Response exceeds `max_latency_ms` threshold | Adjust SLA threshold if model latency is inherently higher, or reduce prompt length |
| **Model tier** | Response `model_id` doesn't match expected tier | Debug routing in orchestrator or harness tier dispatch |

**Triage process:**

1. Read the summary JSON. Group failures by category.
2. For parse/schema failures: check if `extract_json()` handled the output format. If not, add the failing format as a test case in G-02 and fix the extraction logic.
3. For safety failures: review the raw model output. Determine if the forbidden term is in the model's response or in injected retrieval context. Fix the prompt contract accordingly.
4. For content quality failures: compare against the mock response for the same case. Determine if the eval assertion is too strict or if the prompt needs improvement.
5. For latency failures: document actual latency. Adjust thresholds if the model is inherently slower than mock assumptions.

**For each fix:**
- Log the failure and fix in `docs/decision-log.md` as a new ADR
- Re-run the specific failing eval case to confirm the fix
- After all targeted fixes, re-run the full suite to check for regressions

**Exit criteria:**
- At least 55 of 64 evals pass (85%+ pass rate)
- All remaining failures are documented with root cause and planned fix
- No safety-category failures remain (100% safety pass rate required)
- `docs/eval-baseline.md` reflects the stable baseline

---

## Workstream 2: G-02 — Unit Test Suite

### 2.1 Test Infrastructure Setup

**Python tests (pytest):**

Create `services/inference/tests/` with a `conftest.py` and test files. Add pytest to `requirements.txt` (dev dependency). Configure in a `pytest.ini` or `pyproject.toml` section.

File structure:
```
services/inference/
  tests/
    __init__.py
    conftest.py
    test_extract_json.py
```

**TypeScript tests (vitest):**

The project already declares `"test": "vitest run"` in `package.json` and has `vitest` in devDependencies. Create test files adjacent to source files using the `.test.ts` naming convention.

File structure:
```
services/orchestrator/
  __tests__/
    validate.test.ts
    router.test.ts
    auth.test.ts
services/memory/
  __tests__/
    retrieve.test.ts
```

**Vitest configuration:** Add a `vitest.config.ts` at the project root if one doesn't exist, configuring workspace-aware test discovery and path aliases matching `tsconfig.json`.

### 2.2 Test Module: `harness.py` JSON Extraction

**Target function:** `extract_json(raw: str) -> str` at `harness.py:1136`

This function handles the fragile boundary between model output and structured data. It strips markdown fences, finds JSON in prose, and fixes trailing commas. This is the most likely point of failure under real inference.

**Test cases:**

| Case | Input | Expected output |
|------|-------|-----------------|
| Valid JSON object | `'{"key": "value"}'` | `'{"key": "value"}'` |
| Valid JSON array | `'[{"a": 1}]'` | `'[{"a": 1}]'` |
| Markdown fence (json tag) | `` '```json\n{"key": "value"}\n```' `` | `'{"key": "value"}'` |
| Markdown fence (no tag) | `` '```\n{"key": "value"}\n```' `` | `'{"key": "value"}'` |
| Leading prose | `'Here is the result:\n{"key": "value"}'` | `'{"key": "value"}'` |
| Trailing prose | `'{"key": "value"}\nI hope this helps!'` | `'{"key": "value"}'` |
| Both leading and trailing | `'Sure!\n{"key": "value"}\nLet me know.'` | `'{"key": "value"}'` |
| Trailing comma in object | `'{"a": 1, "b": 2,}'` | `'{"a": 1, "b": 2}'` |
| Trailing comma in array | `'[1, 2, 3,]'` | `'[1, 2, 3]'` |
| Nested trailing commas | `'{"a": [1, 2,], "b": 3,}'` | `'{"a": [1, 2], "b": 3}'` |
| Empty string | `''` | `''` |
| No JSON at all | `'Just some text with no structure.'` | `'Just some text with no structure.'` |
| Whitespace only | `'   \n\n  '` | `''` |
| JSON inside prose paragraphs | `'The answer is:\n\n{"key": "val"}\n\nAbove is the JSON.'` | `'{"key": "val"}'` |
| Multiple JSON blocks (first wins) | `'{"a": 1}\n{"b": 2}'` | `'{"a": 1}\n{"b": 2}'` (full range between first `{` and last `}`) |

**Additional real-world cases to add after G-01 triage:** Capture actual failing model outputs from the real-inference eval run and add them as regression test cases.

### 2.3 Test Module: `retrieve.ts` Context Builders

**Target functions** in `services/memory/retrieve.ts`:
- `getRecentPlans(classroomId, limit)` — line 13
- `summarizeRecentPlans(plans)` — line 25
- `getRecentInterventions(classroomId, limit)` — line 72
- `summarizeRecentInterventions(records)` — line 84
- `getStudentInterventions(classroomId, studentRef)` — line 98
- `buildPatternContext(classroomId)` — builds full pattern context string
- `getLatestPatternReport(classroomId)` — retrieves most recent pattern report
- `summarizePatternInsights(report)` — formats pattern data for prompt injection
- `buildEABriefingContext(classroomId)` — builds EA briefing context
- `buildForecastContext(classroomId)` — builds complexity forecast context
- `buildDebtRegister(classroomId, thresholds)` — computes debt items
- `buildScaffoldDecayContext(classroomId, studentRef)` — builds scaffold decay context
- `buildSurvivalContext(classroomId)` — builds comprehensive survival packet context

**Test approach:** The retrieval functions call `getDb(classroomId)` which creates file-based SQLite databases. For testing, either:
- (a) Override `getDb` via dependency injection or module mocking to return an in-memory database (`:memory:` mode), or
- (b) Use a temporary directory with real SQLite files that are cleaned up after each test.

Option (a) is preferred — create a test helper that seeds an in-memory `better-sqlite3` instance with the same schema from `db.ts` and known test records, then mock the `getDb` import. Seed it with known test data, then assert that retrieval functions return expected results.

**Test cases by function:**

**`summarizeRecentPlans`:**
- Empty plans array returns empty string
- Single plan produces expected summary format
- Three plans produce summary with all priority students, watchpoints, EA actions
- Plans with missing optional fields (empty `family_followups`) handled gracefully

**`summarizeRecentInterventions`:**
- Empty records returns empty string
- Single record produces expected format
- Five records all included in summary
- Records with no `outcome` field handled (outcome is optional)

**`buildPatternContext`:**
- Classroom with no pattern reports returns empty/minimal context
- Classroom with one report produces formatted context
- Multiple reports: only the latest is used

**`buildSurvivalContext`:**
- Empty classroom (no records in any table) returns minimal context
- Full classroom produces all 7 sections (plans, interventions, patterns, forecasts, scaffolds, messages, schedule)

**`buildDebtRegister`:**
- Empty classroom returns zero-item register
- Stale followups detected when interventions have `follow_up` older than threshold
- Unapproved messages detected correctly
- Custom thresholds override defaults

### 2.4 Test Module: `validate.ts` Zod Schemas

**Target:** All 14 request schemas in `services/orchestrator/validate.ts` plus the `validateBody` middleware factory.

**Test pattern for each schema:**

```
valid input   → safeParse succeeds, data matches input
missing required field → safeParse fails, error mentions the field
wrong type    → safeParse fails
empty string on min(1) field → safeParse fails
extra fields  → safeParse succeeds (Zod strips by default)
```

**Schemas to test (14):**

1. `DifferentiateRequestSchema` — requires `artifact` (nested LessonArtifactSchema) + `classroom_id`
2. `TomorrowPlanRequestSchema` — requires `classroom_id` + `teacher_reflection`
3. `FamilyMessageRequestSchema` — requires `classroom_id` + `student_refs` (array min 1) + `message_type` (enum) + `target_language`
4. `ApproveMessageRequestSchema` — requires `classroom_id` + `draft_id`
5. `InterventionRequestSchema` — requires `classroom_id` + `student_refs` + `teacher_note`
6. `SimplifyRequestSchema` — requires `source_text` + `grade_band` + `eal_level` (enum)
7. `VocabCardsRequestSchema` — requires `artifact_text` + `subject` + `target_language` + `grade_band`
8. `SupportPatternsRequestSchema` — requires `classroom_id`, optional `student_filter` and `time_window`
9. `EABriefingRequestSchema` — requires `classroom_id`, optional `ea_name`
10. `ComplexityForecastRequestSchema` — requires `classroom_id` + `forecast_date`, optional `teacher_notes`
11. `DebtRegisterRequestSchema` — all fields optional with positive int constraints
12. `ScaffoldDecayRequestSchema` — requires `classroom_id` + `student_ref`, `time_window` defaults to 20
13. `SurvivalPacketRequestSchema` — requires `classroom_id` + `target_date`, optional `teacher_notes`
14. `ScheduleUpdateRequestSchema` — requires `schedule` array of objects with nested validation

**`validateBody` middleware test:**
- Valid body: calls `next()` with parsed body on `req.body`
- Invalid body: returns 400 with `validation_errors` array
- Tests use mock Express `req`/`res`/`next` objects

### 2.5 Test Module: `router.ts` Dispatch Logic

**Target functions** in `services/orchestrator/router.ts`:
- `getRoute(promptClass)` — returns `RouteConfig` for a given prompt class
- `getModelId(tier)` — returns model identifier for a tier
- `listPromptClasses()` — returns all registered prompt classes
- `getRoutingTable()` — returns full table copy

**Test cases:**

| Case | Assertion |
|------|-----------|
| All 11 prompt classes resolve | `getRoute()` returns a valid `RouteConfig` for each |
| Unknown prompt class throws | `getRoute("nonexistent")` throws `Error` |
| Live tier model ID | `getModelId("live")` === `"google/gemma-4-4b-it"` |
| Planning tier model ID | `getModelId("planning")` === `"google/gemma-4-27b-it"` |
| Unknown tier throws | `getModelId("unknown")` throws `Error` |
| Routing table is a copy | Modifying returned table doesn't affect internal state |
| Planning-tier classes use thinking | All 5 planning-tier routes have `thinking_enabled: true` |
| Live-tier classes don't use thinking | All 6 live-tier routes have `thinking_enabled: false` |
| Retrieval-required classes | tomorrow-plan, patterns, briefing, forecast, scaffold-decay, survival-packet |
| `listPromptClasses()` returns 11 | Length check |

### 2.6 Test Module: `auth.ts` Middleware

**Target:** `createAuthMiddleware(loadClassroom)` in `services/orchestrator/auth.ts`

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| No classroom_id in body or params | Any request | `next()` called |
| Demo classroom (`demo-okafor-grade34`) | Any request | `next()` called (bypass) |
| Classroom not found | `classroom_id: "nonexistent"` | `next()` called (let route 404) |
| Classroom with no access_code | Valid classroom, no code set | `next()` called |
| Correct code provided | `X-Classroom-Code` matches | `next()` called |
| No code provided, code required | Missing header | 401 response |
| Wrong code provided | Mismatched header | 403 response |

**Test approach:** Create mock `loadClassroom` function that returns test classroom profiles. Use mock Express `req`/`res`/`next` objects.

### 2.7 CI Integration

Add unit tests to the release gate and CI:

- **GitHub Actions (`release-gate.yml`):** Add a step after dependency installation that runs `npm run test` and `cd services/inference && python -m pytest tests/`.
- **Release gate script (`release-gate.mjs`):** Add a unit test phase before the smoke tests. If unit tests fail, the gate fails early without starting services.
- **`package.json`:** Confirm `"test": "vitest run"` works. Add a `"test:python"` script: `"cd services/inference && python -m pytest tests/ -v"`.

---

## Convergence: How G-01 and G-02 Reinforce Each Other

```
G-01 real eval run
    │
    ├─ Parse/Schema failure ──→ Add failing output as test case in test_extract_json.py
    │                           Fix extract_json(), re-run unit test, re-run eval
    │
    ├─ Retrieval failure ─────→ Add scenario as test case in retrieve.test.ts
    │                           Fix retrieval function, re-run unit test, re-run eval
    │
    ├─ Validation failure ────→ Check if schema is too strict/lenient in validate.test.ts
    │                           Adjust schema, re-run unit test, re-run eval
    │
    ├─ Safety failure ────────→ Fix prompt contract, re-run eval
    │                           (No unit test — this is a model behavior issue)
    │
    └─ Content quality ───────→ Iterate prompt, re-run eval
                                (No unit test — this is prompt engineering)
```

Parse/schema and retrieval failures are caught faster with unit tests. Safety and content quality failures require prompt iteration, which unit tests don't address — those are pure G-01 triage.

---

## Exit Criteria (Phase A Complete)

All of the following must be true:

- [ ] Both Vertex AI endpoints (live + planning) respond to preflight probes
- [ ] `npm run release:gate:real` completes without infrastructure failures
- [ ] At least 55/64 evals pass against real inference (85%+ first-run pass rate)
- [ ] Zero safety-category eval failures (100% safety pass rate)
- [ ] All failures documented in `docs/eval-baseline.md` with category and planned fix
- [ ] `vitest` test suite passes with tests for: validate.ts, router.ts, auth.ts, retrieve.ts
- [ ] `pytest` test suite passes with tests for: extract_json in harness.py
- [ ] Unit tests run in CI (GitHub Actions) and release gate
- [ ] At least one ADR added to `docs/decision-log.md` documenting real-inference findings

---

## Files Created or Modified

**New files:**
- `services/inference/tests/__init__.py`
- `services/inference/tests/conftest.py`
- `services/inference/tests/test_extract_json.py`
- `services/orchestrator/__tests__/validate.test.ts`
- `services/orchestrator/__tests__/router.test.ts`
- `services/orchestrator/__tests__/auth.test.ts`
- `services/memory/__tests__/retrieve.test.ts`
- `vitest.config.ts` (project root, if not already present)

**Modified files:**
- `services/inference/requirements.txt` — add `pytest` dev dependency
- `services/inference/harness.py` — potential fixes from G-01 triage (JSON extraction edge cases)
- `docs/eval-baseline.md` — updated with real inference results
- `docs/decision-log.md` — new ADRs for inference findings and test decisions
- `.github/workflows/release-gate.yml` — add unit test step
- `scripts/release-gate.mjs` — add unit test phase
- `package.json` — add `test:python` script

**Not modified:**
- Prompt contracts, orchestrator endpoints, frontend — these are out of scope for Phase A unless G-01 triage reveals a prompt fix is needed
