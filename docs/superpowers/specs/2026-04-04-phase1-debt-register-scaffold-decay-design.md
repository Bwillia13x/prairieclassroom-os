# Phase 1: Complexity Debt Register + Scaffold Decay Detection

## Overview

Two new capabilities extending PrairieClassroom OS's classroom memory into proactive operational intelligence. Both build on existing infrastructure (SQLite memory, intervention logs, pattern detection) without new model tiers or external dependencies.

- **Complexity Debt Register**: deterministic retrieval + TypeScript logic, no new prompt class
- **Scaffold Decay Detection**: new prompt class (`detect_scaffold_decay`), planning tier

## Capability 1: Complexity Debt Register

### What it does

Scans all persisted classroom records to surface accumulated operational follow-through gaps: stale follow-ups, unapproved family messages, unaddressed pattern insights, recurring unresolved plan items, and items approaching natural review thresholds.

### Architecture decision: no model, no prompt class

The Debt Register is a retrieval and presentation problem. Every debt category maps to a deterministic SQL query:

| Category | Query logic |
|----------|------------|
| Stale follow-ups | `interventions` where `follow_up_needed = true`, no subsequent record for the same `student_refs` within N days |
| Unapproved family messages | `family_messages` where `teacher_approved = 0` older than N days |
| Unaddressed pattern insights | `pattern_reports` with `suggested_focus` items where no corresponding `support_priorities` entry appears in subsequent plans |
| Recurring plan items | `support_priorities` appearing in 3+ consecutive `generated_plans` with identical `student_ref` + similar `reason` |
| Approaching review windows | Students with `support_tags` but fewer than N intervention records in the past M days |

No model is needed for this. The model would add inference where we want precision.

### Output schema: `ComplexityDebtRegister`

New file: `packages/shared/schemas/debt.ts`

```typescript
// Zod schemas

DebtItem {
  category: "stale_followup" | "unapproved_message" | "unaddressed_pattern" | "recurring_plan_item" | "approaching_review"
  student_refs: string[]
  description: string           // human-readable summary
  source_record_id: string      // the originating record
  age_days: number              // days since the item became "due"
  suggested_action: string      // what the teacher could do
}

ComplexityDebtRegister {
  register_id: string
  classroom_id: string
  items: DebtItem[]
  item_count_by_category: Record<string, number>
  generated_at: string
  schema_version: "0.1.0"
}
```

### Retrieval functions

New functions in `services/memory/retrieve.ts`:

- `getStaleFollowUps(classroomId, thresholdDays = 5)` — interventions with `follow_up_needed` and no subsequent record for the same student within threshold
- `getUnapprovedMessages(classroomId, thresholdDays = 3)` — family messages not approved past threshold
- `getUnaddressedPatternInsights(classroomId)` — compares latest pattern report's `suggested_focus` against subsequent plan `support_priorities`
- `getRecurringPlanItems(classroomId, minConsecutive = 3)` — support priorities repeated across consecutive plans
- `getStudentsApproachingReview(classroomId, minRecords = 2, windowDays = 14)` — students with support tags but sparse recent documentation
- `buildDebtRegister(classroomId, config?)` — orchestrates all of the above into a `ComplexityDebtRegister`

### Configurable thresholds

```typescript
interface DebtThresholds {
  stale_followup_days: number       // default 5
  unapproved_message_days: number   // default 3
  recurring_plan_min: number        // default 3
  review_window_days: number        // default 14
  review_min_records: number        // default 2
}
```

Defaults are sensible for a typical Alberta classroom week. Teachers can override per-classroom in the future, but defaults ship first.

### API endpoint

`GET /api/debt-register/:classroomId` — returns the register computed fresh.

Optional query params for threshold overrides.

### Persistence

None. Computed fresh every time. Trend analysis derives from the timestamps on the underlying records (interventions, messages, plans, pattern reports), not from stored snapshots.

### Downstream consumers

- **Tomorrow Plan**: the prompt builder can inject a debt summary (high-priority items only) into the planning context, so the model can factor stale items into next-day priorities
- **EA Briefing**: debt items relevant to EA-supported students can be flagged

### Safety

- Language is supportive: "These items may benefit from attention" not "You forgot to..."
- No student is labeled as "a debt item" — debt describes operational follow-through
- Teachers can dismiss items (future: with reason text, which is itself documentation)

---

## Capability 2: Scaffold Decay Detection

### What it does

Analyzes a specific student's intervention history over time to detect when a scaffold (visual timer, chunked instructions, seating arrangement, etc.) is being used less frequently or is no longer needed. When decay is detected, suggests a phased withdrawal plan.

### Architecture decision: new prompt class

This requires reasoning about trends, interpreting the semantic content of intervention notes, and generating phased withdrawal plans. The planning model (27b, thinking on) is the right tier.

### New prompt class

Added to `types.ts`:
```typescript
PromptClass = ... | "detect_scaffold_decay"
```

Route config:
```typescript
detect_scaffold_decay: {
  prompt_class: "detect_scaffold_decay",
  model_tier: "planning",
  thinking_enabled: true,
  retrieval_required: true,
  tool_call_capable: false,
  output_schema_version: "0.1.0",
}
```

### Output schema: `ScaffoldDecayReport`

New file: `packages/shared/schemas/scaffold-decay.ts`

```typescript
ScaffoldUsageTrend {
  scaffold_name: string
  early_window_count: number      // mentions in first half of records
  early_window_total: number      // total records in first half
  recent_window_count: number     // mentions in second half
  recent_window_total: number     // total records in second half
  trend: "decaying" | "stable" | "increasing"
}

PositiveSignal {
  description: string
  source_record_id: string
}

WithdrawalPhase {
  phase_number: number
  description: string
  duration_weeks: number
  success_criteria: string
}

ScaffoldReview {
  scaffold_name: string
  usage_trend: ScaffoldUsageTrend
  positive_signals: PositiveSignal[]
  withdrawal_plan: WithdrawalPhase[]
  regression_protocol: string
  confidence: "high" | "medium" | "low"
}

ScaffoldDecayReport {
  report_id: string
  classroom_id: string
  student_ref: string
  reviews: ScaffoldReview[]
  summary: string
  generated_at: string
  schema_version: "0.1.0"
}
```

### Prompt builder

New file: `services/orchestrator/scaffold-decay.ts`

Follows the same pattern as `support-patterns.ts`:
- `buildScaffoldDecayPrompt(classroom, input, decayContext)` — constructs system + user prompt
- `parseScaffoldDecayResponse(raw, classroomId, studentRef)` — parses model output into typed schema

System prompt instructs the model to:
1. Identify scaffolds mentioned in the student's intervention records
2. Compare frequency across early vs. recent time windows
3. Look for positive signals (success without the scaffold)
4. Generate phased withdrawal plans only for scaffolds showing clear decay
5. Include regression protocol for every withdrawal plan
6. Use observational language only: "Your records show decreasing use of..."

### Input

```typescript
ScaffoldDecayInput {
  classroom_id: string
  student_ref: string
  time_window: number  // total records to analyze (minimum 10)
}
```

### Retrieval

New function in `retrieve.ts`:
- `buildScaffoldDecayContext(classroomId, studentRef, windowSize)` — pulls student interventions partitioned into early/recent windows, plus the student's `known_successful_scaffolds` from the classroom profile

Reuses existing `getStudentInterventions()`.

### Persistence

New table in `db.ts`:
```sql
CREATE TABLE IF NOT EXISTS scaffold_reviews (
  report_id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  student_ref TEXT NOT NULL,
  report_json TEXT NOT NULL,
  model_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scaffold_reviews_classroom
  ON scaffold_reviews(classroom_id, student_ref, created_at);
```

New functions in `store.ts`:
- `saveScaffoldReview(classroomId, report, modelId)`

New functions in `retrieve.ts`:
- `getLatestScaffoldReview(classroomId, studentRef)`

### API endpoint

`POST /api/scaffold-decay` — body: `{ classroom_id, student_ref, time_window }`

Returns the `ScaffoldDecayReport`.

### Downstream consumers

- **Tomorrow Plan**: when a scaffold review exists with active withdrawal phases, the plan prompt can reference it: "Student C is in Phase 1 of timer withdrawal — remove during structured afternoon blocks"
- **Support Patterns**: future integration could flag scaffold decay as a positive trend category

### Safety

- The system suggests, the teacher decides. Withdrawal plans are never automatic.
- Language is observational: "Your records show decreasing use of..." not "Student C no longer needs..."
- No implication that the scaffold was wrong to begin with
- Regression protocol is built into every withdrawal plan
- This is NOT a diagnosis of student capability — it reflects the teacher's own documented observations

### Minimum record threshold

The prompt refuses to analyze scaffold decay with fewer than 10 intervention records for the student. With fewer records, the response says: "Not enough intervention history to detect scaffold usage trends. Continue documenting and try again after more records are logged."

---

## Shared infrastructure

### Temporal queries on intervention history

Both capabilities need time-aware queries. New retrieval functions:

- `getInterventionsInDateRange(classroomId, startDate, endDate)` — interventions within a date range
- `getStudentInterventionsByDateRange(classroomId, studentRef, startDate, endDate)` — per-student, date-filtered
- `getConsecutivePlans(classroomId, limit)` — plans in order, for detecting recurring items

These extend the existing `retrieve.ts` without modifying existing functions.

### Configurable thresholds pattern

Both capabilities use thresholds (stale days, minimum records, etc.). These are passed as optional config objects with sensible defaults. No global config file — thresholds are parameters on the retrieval functions.

---

## Eval requirements

Per CLAUDE.md evaluation policy, each capability needs at least one eval.

### Debt Register evals

| Case ID | Type | What it tests |
|---------|------|--------------|
| `debt-001-schema` | Deterministic | Output matches `ComplexityDebtRegister` schema |
| `debt-002-stale-detection` | Golden case | Given 3 follow-ups (1 resolved, 2 stale), register contains exactly 2 stale items |
| `debt-003-recurring-detection` | Golden case | Given 4 consecutive plans with same support priority, flagged as recurring |
| `debt-004-empty-classroom` | Edge case | New classroom with no records returns empty register |

### Scaffold Decay evals

| Case ID | Type | What it tests |
|---------|------|--------------|
| `decay-001-schema` | Deterministic | Output matches `ScaffoldDecayReport` schema |
| `decay-002-content-quality` | Golden case | Given declining scaffold mentions, report identifies decay with withdrawal plan |
| `decay-003-safety-boundaries` | Safety | No diagnostic language, observational framing only |
| `decay-004-insufficient-records` | Edge case | Fewer than 10 records produces refusal message |
| `decay-005-latency` | Performance | Planning tier response under latency target |

---

## Prompt contract additions

### J. Complexity Debt Register

**Route:** none (deterministic retrieval)
**Model:** none
**Thinking:** n/a
**Retrieval:** yes — all record types (interventions, plans, messages, pattern reports)

**Input:** `classroom_id`, optional `DebtThresholds`

**Output:** `ComplexityDebtRegister` (items categorized, aged, with suggested actions)

### K. Detect Scaffold Decay

**Route:** `detect_scaffold_decay`
**Model:** planning tier — `gemma-4-27b-it`
**Thinking:** on
**Retrieval:** yes — student intervention history (time-windowed), classroom profile (scaffold list)

**Input:**
- `classroom_id`
- `student_ref` — which student to analyze
- `time_window` — number of records to analyze (minimum 10)

**Output schema (v0.1.0):**
```json
{
  "reviews": [
    {
      "scaffold_name": "visual timer for transitions",
      "usage_trend": {
        "scaffold_name": "visual timer",
        "early_window_count": 12,
        "early_window_total": 15,
        "recent_window_count": 3,
        "recent_window_total": 10,
        "trend": "decaying"
      },
      "positive_signals": [
        {
          "description": "EA noted 'C self-managed the math transition today'",
          "source_record_id": "int-abc-123"
        }
      ],
      "withdrawal_plan": [
        {
          "phase_number": 1,
          "description": "Remove timer during structured afternoon blocks",
          "duration_weeks": 2,
          "success_criteria": "No transition difficulties without timer for 2 weeks"
        }
      ],
      "regression_protocol": "If regression observed, return to previous phase and hold for 2 additional weeks",
      "confidence": "high"
    }
  ],
  "summary": "Your records show decreasing reliance on the visual timer..."
}
```

**Safety rules:**
- Observational language only — "Your records show..."
- No diagnosis or capability inference
- Withdrawal plans are suggestions, never automatic
- Regression protocol required for every withdrawal plan
- Same 15 forbidden terms as all contracts

---

## Files to create or modify

### New files
- `packages/shared/schemas/debt.ts` — DebtItem, ComplexityDebtRegister schemas
- `packages/shared/schemas/scaffold-decay.ts` — ScaffoldDecayReport schema
- `services/orchestrator/scaffold-decay.ts` — prompt builder + parser
- `evals/cases/debt-001-schema.json` through `debt-004-empty-classroom.json`
- `evals/cases/decay-001-schema.json` through `decay-005-latency.json`

### Modified files
- `packages/shared/schemas/index.ts` — export new schemas
- `services/orchestrator/types.ts` — add `detect_scaffold_decay` to PromptClass
- `services/orchestrator/router.ts` — add route config
- `services/orchestrator/server.ts` — add API endpoints
- `services/memory/db.ts` — add `scaffold_reviews` table
- `services/memory/store.ts` — add `saveScaffoldReview()`
- `services/memory/retrieve.ts` — add temporal queries, debt scanning, scaffold decay context
- `docs/prompt-contracts.md` — add contracts J and K
- `docs/decision-log.md` — record architectural decisions
