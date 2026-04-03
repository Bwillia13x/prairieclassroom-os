# Sprint 3 Design — Classroom Memory + Family Messaging

**Sprint:** 3 — Classroom Memory + Family Messaging
**Date:** 2026-04-03
**Goal:** Add SQLite-backed classroom memory (persist and retrieve generated outputs) and the family messaging workflow — moving PrairieClassroom from stateless content generator to a persistent classroom OS with 3 of 4 user-facing workflows complete.

## Approach

Approach B was selected: build the memory layer AND the `draft_family_message` workflow in one sprint. Intervention logging is deferred to Sprint 4.

**Rationale:** Memory is the infrastructure that turns this from "content generator" to "classroom OS" (the product thesis). Family messaging is the natural next user-facing step — it's directly downstream of the tomorrow plan's `family_followups` output. Intervention logging is simpler and benefits from having persistence already in place.

## Section 1: Classroom Memory Layer (SQLite)

### Purpose

Persist generated outputs (plans, variants, family messages) and retrieve relevant classroom history to inject into future prompts. One `.sqlite` file per classroom, stored in `data/memory/`.

### Schema

**`generated_plans`**

| Column | Type | Constraints |
|--------|------|-------------|
| plan_id | TEXT | PRIMARY KEY |
| classroom_id | TEXT | NOT NULL |
| teacher_reflection | TEXT | |
| plan_json | TEXT | NOT NULL (full TomorrowPlan as JSON) |
| model_id | TEXT | |
| created_at | TEXT | NOT NULL (ISO 8601) |

**`generated_variants`**

| Column | Type | Constraints |
|--------|------|-------------|
| variant_id | TEXT | PRIMARY KEY |
| artifact_id | TEXT | NOT NULL |
| classroom_id | TEXT | NOT NULL |
| variant_json | TEXT | NOT NULL (full DifferentiatedVariant as JSON) |
| model_id | TEXT | |
| created_at | TEXT | NOT NULL |

**`family_messages`**

| Column | Type | Constraints |
|--------|------|-------------|
| draft_id | TEXT | PRIMARY KEY |
| classroom_id | TEXT | NOT NULL |
| student_refs | TEXT | NOT NULL (JSON array) |
| message_json | TEXT | NOT NULL (full FamilyMessageDraft as JSON) |
| teacher_approved | INTEGER | DEFAULT 0 |
| approval_timestamp | TEXT | |
| created_at | TEXT | NOT NULL |

### Design decisions

- Full JSON blob in TEXT column avoids relational joins while allowing SQL queries on indexed columns (`classroom_id`, `created_at`). Tradeoff: no efficient in-JSON queries, but retrieval is by classroom + recency, not nested fields.
- One DB file per classroom aligns with local-first, portable design — a teacher can carry their classroom's history as a single file.

### Implementation

New directory: `services/memory/`

- `db.ts` — SQLite connection manager + table creation (using `better-sqlite3`). Opens or creates `data/memory/{classroom_id}.sqlite`. Creates tables on first access. Caches open connections by `classroom_id` so repeated calls don't re-open the file.
- `store.ts` — Write functions: `savePlan(classroomId, plan, reflection, modelId)`, `saveVariants(classroomId, variants, modelId)`, `saveFamilyMessage(classroomId, draft, modelId)`.
- `retrieve.ts` — Read functions: `getRecentPlans(classroomId, limit=5)` returns typed TomorrowPlan objects. `summarizeRecentPlans(plans)` produces a plain-text summary for prompt injection (recent watchpoints, priority students, actions taken).

### Retrieval injection

The orchestrator calls `getRecentPlans(classroomId, 3)` before building the tomorrow plan prompt. Retrieved plans are summarized into a `CLASSROOM MEMORY` section in the user prompt — recent watchpoints, which students had priority support, what actions were taken. This summary is injected alongside the teacher's fresh reflection.

Differentiation and family messaging stay retrieval-free for Sprint 3 (matching the routing table).

## Section 2: Family Messaging Workflow

### Purpose

Teacher selects a student + context (or picks from a tomorrow plan's `family_followups`), chooses message type and target language, gets a structured draft they must approve before it goes anywhere.

### Prompt contract: `draft_family_message` v0.1.0

- **Model tier:** Live (gemma-4-4b-it)
- **Thinking:** Off
- **Retrieval required:** No (Sprint 3)
- **Tool-call capable:** No
- **Output schema:** `FamilyMessageDraft` v0.1.0

**System prompt:** Defines the task (draft a plain-language family note), output format (JSON object), safety rules (no diagnosis, no send without approval, observation/inference separation).

**User prompt:** Injects classroom context, student ref, message type, target language, and optionally the reason from `family_followups`.

**Output JSON object fields:**
- `student_refs[]` — which students this concerns
- `message_type` — one of `"routine_update"`, `"missed_work"`, `"praise"`, `"low_stakes_concern"`
- `target_language` — e.g. `"en"`, `"ar"`, `"uk"`, `"tl"`
- `plain_language_text` — the actual message body
- `simplified_student_text` — optional simpler version the student could read
- `teacher_approved` — always `false` on generation

### Safety gate

`FamilyMessageDraft` has `teacher_approved: false` by default. UI shows an explicit "Approve & Copy" action. No send functionality exists — the teacher copies approved text to their own communication channel. Matches the hard boundary in `safety-governance.md`: "Do not send family communication without explicit human approval."

The `teacher_approved` field is an audit record, not an access control.

### Implementation

- `services/orchestrator/family-message.ts` — prompt builder + parser (same pattern as `differentiate.ts` and `tomorrow-plan.ts`)
- `services/orchestrator/server.ts` — new `POST /api/family-message` endpoint
- `services/inference/harness.py` — new `MOCK_FAMILY_MESSAGE` canned response, update `MockBackend.generate()` dispatch

### Mock dispatch

The current `MockBackend.generate()` dispatches on `thinking`, `images`, and `tools` flags. Family messaging has none of these and would fall through to the differentiation response. Fix: add a `prompt_class` string field to `GenerationRequest` (default `None`). The orchestrator passes the prompt class when calling the harness. The mock backend uses this to select the correct canned response. This is a backward-compatible change — existing calls without `prompt_class` continue to work.

### Mock response

A realistic canned family message for offline development: a praise note for a student showing reading progress, written in plain English, with a simplified student-facing version.

### UI

New "Family Message" tab in `App.tsx` nav.

**`MessageComposer.tsx`** — form with: student selector (from classroom profile), message type dropdown (routine_update, missed_work, praise, low_stakes_concern), target language dropdown, optional context/reason text field, submit button.

**`MessageDraft.tsx`** — displays the generated draft: message body (prominent), simplified student text (if present), "Approve & Copy" button that sets `teacher_approved: true` and copies to clipboard, model/latency metadata.

### Pre-fill from plan

The `MessageComposer` accepts an optional `prefill` prop. When the teacher clicks a `family_followups` entry in PlanViewer, it navigates to the Family Message tab with `student_ref`, `reason`, and `message_type` pre-populated. This is a one-directional link — the composer works standalone too.

### Evals: 5 cases

| Case | Category | Description |
|------|----------|-------------|
| msg-001 | schema_reliability | routine_update in English, check all required keys |
| msg-002 | schema_reliability | praise for different classroom, check schema version |
| msg-003 | content_quality | message is plain-language, references correct student |
| msg-004 | safety_correctness | must not contain diagnosis language, must not auto-approve |
| msg-005 | latency_suitability | live tier should complete under threshold |

## Section 3: Integration & Wiring

### Data flow

```
Differentiate tab  →  POST /api/differentiate  →  /generate  ──save──→  generated_variants
Tomorrow Plan tab  →  POST /api/tomorrow-plan  →  /generate  ──save──→  generated_plans
                            ↑ injects recent plans from ←──retrieve──┘
Family Message tab →  POST /api/family-message  →  /generate  ──save──→  family_messages
                            ↑ can pre-fill from plan's family_followups
```

### Changes to existing files

| File | Change |
|------|--------|
| `package.json` | Add `better-sqlite3`, `@types/better-sqlite3` |
| `services/orchestrator/server.ts` | Import memory module, add `/api/family-message` route, add save calls to existing routes |
| `services/orchestrator/tomorrow-plan.ts` | `buildTomorrowPlanPrompt` accepts optional `recentPlans` for memory injection |
| `services/inference/harness.py` | Add `MOCK_FAMILY_MESSAGE` response, update `MockBackend.generate()` dispatch |
| `apps/web/src/App.tsx` | Add Family Message tab, pre-fill wiring from PlanViewer |
| `apps/web/src/types.ts` | Add `FamilyMessageDraft`, request/response types |
| `apps/web/src/api.ts` | Add `draftFamilyMessage()` client function |
| `apps/web/src/components/PlanViewer.tsx` | Add clickable family_followups entries that pre-fill message composer |
| `evals/runner.ts` | Add `runFamilyMessageEval()` dispatch |

### New files

| File | Purpose |
|------|---------|
| `services/memory/db.ts` | SQLite connection + schema creation |
| `services/memory/store.ts` | Write functions |
| `services/memory/retrieve.ts` | Read + summarize functions |
| `services/orchestrator/family-message.ts` | Prompt contract + parser |
| `apps/web/src/components/MessageComposer.tsx` + `.css` | Message input form |
| `apps/web/src/components/MessageDraft.tsx` + `.css` | Draft display + approval |
| 5 eval case JSON files | `msg-001` through `msg-005` |
| `docs/sprint-3-plan.md` | Sprint plan |
| `docs/sprint-2-review.md` | Sprint 2 review (close-out) |
| `docs/sprint-3-checklist.md` | Deliverables checklist |

### Verification

```bash
npx tsc --noEmit
cd services/inference && source .venv/bin/activate && python harness.py --mode mock --smoke-test
python server.py --mode mock --port 3200 &
cd ../.. && npx tsx services/orchestrator/server.ts &
npx tsx evals/runner.ts
```

### Sprint 4 readiness criteria

- Plans persist to SQLite and are retrievable
- Tomorrow plan generation uses classroom memory when available
- Family message drafts generate reliably from student + context
- Approval flow works (teacher_approved flips, timestamp recorded)
- At least 17 evals passing (7 diff + 5 plan + 5 message)

## What to defer

- Intervention logging (`log_intervention`) — Sprint 4
- Retrieval into differentiation or family messaging — Sprint 4+
- EmbeddingGemma vector search — future sprint (SQL recency queries are sufficient for now)
- Voice note input — future sprint
- Real Gemma 4 inference validation — mock mode continues
- Multi-language generation (beyond prompt contract support) — future sprint
