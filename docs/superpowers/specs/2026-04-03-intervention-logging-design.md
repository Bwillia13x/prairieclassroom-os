# Sprint 4 — Intervention Logging Design

## Summary

Add `log_intervention` as the fourth and final MVP workflow. A teacher writes a free-text note about what happened with a student. The model (Gemma 4, live tier) structures it into an `InterventionRecord`. The record persists to classroom memory and feeds back into tomorrow plan generation.

## Design decisions

- **Model-structured** (not form-first): Teacher writes naturally, model extracts observation/action/outcome/follow-up. Teacher reviews the structured result before it saves. Matches the prompt-in/structured-out pattern of the other three workflows.
- **Retrieval injection**: Recent interventions are summarized and injected into tomorrow plan prompts as a `RECENT INTERVENTIONS` section alongside the existing `CLASSROOM MEMORY` section. This closes the MVP loop: plan → act → log → next plan informed by outcomes.
- **Plan-to-intervention bridge**: PlanViewer support priorities get a "Log Intervention" link that pre-fills the intervention logger with student ref and suggested action. Mirrors the plan-to-message bridge from Sprint 3.
- **No approval gate**: Unlike family messages, interventions are internal records, not outward-facing. No teacher approval step needed beyond reviewing the structured output.

## Data & Schema

### InterventionRecord (existing, one addition)

`packages/shared/schemas/intervention.ts` already defines:

```ts
interface InterventionRecord {
  record_id: string;
  classroom_id: string;
  student_refs: string[];
  observation: string;
  action_taken: string;
  outcome?: string;
  follow_up_needed: boolean;
  created_at: string;
}
```

Add `schema_version: string` for eval consistency with the other three schemas.

### Memory table

New `interventions` table in `services/memory/db.ts`:

| Column | Type | Notes |
|--------|------|-------|
| record_id | TEXT PK | e.g. `int-{classroom_id}-{timestamp}` |
| classroom_id | TEXT NOT NULL | |
| student_refs | TEXT NOT NULL | JSON array |
| record_json | TEXT NOT NULL | Full InterventionRecord as JSON |
| model_id | TEXT | |
| created_at | TEXT NOT NULL | ISO 8601 |

### Memory functions

- `saveIntervention(classroomId, record, modelId)` in `store.ts`
- `getRecentInterventions(classroomId, limit=5)` in `retrieve.ts`
- `summarizeRecentInterventions(records)` in `retrieve.ts` — format: one line per intervention, `"{student_ref}: {observation} -> {action_taken} (outcome: {outcome})"`

## Prompt contract

### Route config (already registered)

- prompt_class: `log_intervention`
- model_tier: `live`
- thinking: `false`
- retrieval: `false`
- tool_call: `false`
- schema_version: `0.1.0`

### Orchestrator module

`services/orchestrator/intervention.ts`:

**InterventionInput:**
- `classroom_id: string`
- `student_refs: string[]`
- `teacher_note: string`
- `context?: string` (pre-filled from plan bridge)

**buildInterventionPrompt(classroom, input):**

System prompt instructs the model to:
1. Extract observation (what the teacher noticed)
2. Extract action taken (what was done)
3. Extract outcome if mentioned (what resulted)
4. Determine follow_up_needed (boolean)
5. Output a JSON object with these four fields

Safety rules in system prompt:
- No diagnosis or clinical language
- No discipline scoring
- Distinguish observations from inferences
- Use student aliases only

**parseInterventionResponse(raw, classroomId, input):**
- Strip markdown fencing
- Parse JSON
- Assign record_id, classroom_id, student_refs, schema_version
- Return InterventionRecord

### Mock response

`MOCK_INTERVENTION` in `harness.py` — canned JSON for Ari, writing support scenario. Dispatched via `prompt_class == "log_intervention"`.

## Retrieval injection into tomorrow plans

The `buildTomorrowPlanPrompt` function in `tomorrow-plan.ts` accepts an additional `interventionSummary` parameter. If non-empty, it appears as:

```
RECENT INTERVENTIONS:
- Ari: Needed 1:1 support during writing block -> Used sentence starters and word bank (outcome: Completed 3/5 questions independently)
```

The server route for `/api/tomorrow-plan` calls `getRecentInterventions` + `summarizeRecentInterventions` and passes the result to the prompt builder.

## API

### POST /api/intervention

**Request:**
```json
{
  "classroom_id": "alpha-grade4",
  "student_refs": ["Ari"],
  "teacher_note": "Ari needed 1:1 support during writing block...",
  "context": "Optional context from plan support priority"
}
```

**Response:**
```json
{
  "record": { ...InterventionRecord },
  "model_id": "mock",
  "latency_ms": 42
}
```

**Errors:** 400 (missing fields), 404 (classroom not found), 422 (parse failure), 502 (inference error).

## UI

### InterventionLogger component

Form with:
- Classroom selector (shared with other tabs)
- Student multi-select (checkboxes from student stubs)
- Free-text textarea for teacher's note
- Pre-filled context display (if from plan bridge, shown as read-only context block above the textarea)
- Submit button

### InterventionCard component

Displays the structured result:
- Observation (text)
- Action taken (text)
- Outcome (text, if present)
- Follow-up needed badge (yes/no)
- "Saved to classroom memory" confirmation

### App.tsx changes

- Fourth tab: "Log Intervention"
- `InterventionPrefill` type: `{ student_ref, suggested_action, reason }`
- PlanViewer support priorities get "Log Intervention" links
- `handleInterventionClick(prefill)` switches tab and pre-fills
- `interventionResult` state, `handleIntervention()` async handler

### Types (apps/web/src/types.ts)

```ts
interface InterventionRecord {
  record_id: string;
  classroom_id: string;
  student_refs: string[];
  observation: string;
  action_taken: string;
  outcome?: string;
  follow_up_needed: boolean;
  created_at: string;
  schema_version: string;
}

interface InterventionRequest {
  classroom_id: string;
  student_refs: string[];
  teacher_note: string;
  context?: string;
}

interface InterventionResponse {
  record: InterventionRecord;
  model_id: string;
  latency_ms: number;
}

interface InterventionPrefill {
  student_ref: string;
  suggested_action: string;
  reason: string;
}
```

### API client (apps/web/src/api.ts)

`logIntervention(request: InterventionRequest): Promise<InterventionResponse>` — POST to `/api/intervention`.

## Evals

5 new eval cases:

| ID | Category | Description |
|----|----------|-------------|
| int-001-alpha-schema | schema_reliability | Grade 4 intervention produces valid schema |
| int-002-bravo-schema | schema_reliability | Grade 2 intervention produces valid schema |
| int-003-content-quality | differentiation_quality | Output contains observation + action language |
| int-004-safety-boundaries | safety_correctness | No diagnosis/clinical/discipline language |
| int-005-latency | latency_suitability | Under 5000ms |

Eval runner dispatch: `if (ec.prompt_class === "log_intervention")` -> `runInterventionEval(ec)`.

**Sprint 4 target: 22/22 evals** (17 existing + 5 new).

## Docs updates

- `decision-log.md`: ADR for intervention logging (model-structured, retrieval injection, plan bridge)
- `prompt-contracts.md`: Section D routing details

## Files to create

- `services/orchestrator/intervention.ts`
- `apps/web/src/components/InterventionLogger.tsx`
- `apps/web/src/components/InterventionLogger.css`
- `apps/web/src/components/InterventionCard.tsx`
- `apps/web/src/components/InterventionCard.css`
- `evals/cases/int-001-alpha-schema.json`
- `evals/cases/int-002-bravo-schema.json`
- `evals/cases/int-003-content-quality.json`
- `evals/cases/int-004-safety-boundaries.json`
- `evals/cases/int-005-latency.json`

## Files to modify

- `packages/shared/schemas/intervention.ts` (add schema_version)
- `services/memory/db.ts` (add interventions table)
- `services/memory/store.ts` (add saveIntervention)
- `services/memory/retrieve.ts` (add getRecentInterventions, summarizeRecentInterventions)
- `services/orchestrator/server.ts` (add /api/intervention route, inject interventions into tomorrow-plan)
- `services/orchestrator/tomorrow-plan.ts` (accept interventionSummary parameter)
- `services/inference/harness.py` (add MOCK_INTERVENTION + dispatch)
- `apps/web/src/App.tsx` (fourth tab, intervention state, plan bridge)
- `apps/web/src/api.ts` (add logIntervention)
- `apps/web/src/types.ts` (add intervention types)
- `apps/web/src/components/PlanViewer.tsx` (add "Log Intervention" links on support priorities)
- `evals/runner.ts` (add runInterventionEval, dispatch)
- `docs/decision-log.md` (new ADR)
- `docs/prompt-contracts.md` (Section D routing details)
