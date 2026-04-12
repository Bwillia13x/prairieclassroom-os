# PrairieClassroom OS — Classroom Profile Schema

*Updated 2026-04-10*

## Overview

Each classroom in PrairieClassroom OS is defined by a JSON profile file stored in `data/synthetic_classrooms/`. These profiles provide the context that all prompt classes use to generate classroom-specific output.

**Schema source:** `packages/shared/schemas/classroom.ts` (`ClassroomProfileSchema`)
**File naming convention:** `classroom_{slug}.json` where `{slug}` matches the `classroom_id` field
**Validation:** Zod schema validates at runtime; `classroom_id` must match `^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$`

## ClassroomProfile

The top-level object representing a single classroom.

| Field | Type | Required | Description |
|---|---|---|---|
| `classroom_id` | string | **Yes** | Unique identifier (lowercase, hyphens only). Used in URLs, database filenames, and API routes. Example: `"demo-okafor-grade34"` |
| `grade_band` | string | **Yes** | Alberta grade band. Typically `"K-2"`, `"3-4"`, or `"5-6"`. Used to calibrate language complexity in prompts. |
| `subject_focus` | string | **Yes** | Primary subject focus. Examples: `"cross_curricular"`, `"literacy"`, `"math"`. |
| `classroom_notes` | string[] | **Yes** | Free-text notes about classroom context. Injected into prompts to ground model output. Example: `["Split grade 3/4 class with 24 students.", "EA available mornings only."]` |
| `routines` | Record<string, string> | **Yes** | Named daily routines. Keys are routine names, values are descriptions. Example: `{ "morning": "bell work journal then calendar math", "after_lunch": "body break then math block" }` |
| `students` | StudentSupportSummary[] | **Yes** | Array of student entries (see below). At least one student required. |
| `support_constraints` | string[] | Optional | Operational constraints affecting support delivery. Example: `["EA available 8:30-12:00 only", "No 1:1 aide"]` |
| `access_code` | string | Optional | If present, the classroom requires this code via `X-Classroom-Code` header for API access. Omit for open classrooms. |
| `sub_ready` | boolean | Optional | Whether the classroom has enough data for a survival packet to be generated. Default: `false`. |
| `schedule` | ScheduleBlock[] | Optional | Daily schedule blocks (see below). Used by forecast, EA briefing, and today panel. |
| `upcoming_events` | UpcomingEvent[] | Optional | Known upcoming events that may affect classroom complexity. Used by forecast prompt. |
| `retention_policy` | RetentionPolicy | Optional | Per-classroom data-retention governance contract (see below). Read by `npm run memory:admin -- prune`. Omit for open-ended retention. |

## StudentSupportSummary

Each entry in the `students` array describes one student's support profile. **Never include real student names** — use aliases only.

| Field | Type | Required | Description |
|---|---|---|---|
| `student_id` | string | **Yes** | Internal identifier (e.g., `"D1"`, `"A3"`). Not exposed to the model in prompts. |
| `alias` | string | **Yes** | Display name used in all model output and UI. Example: `"Amira"`, `"Brody"`. Must match across the system — interventions, plans, and messages reference students by alias. |
| `eal_flag` | boolean | **Yes** | Whether this student is an English as an Additional Language learner. Drives EAL-specific prompt features. |
| `support_tags` | string[] | **Yes** | Descriptive tags for support needs. Free-text, but the system recognizes common patterns. Examples: `["eal_level_2", "needs_visual_supports"]`, `["attention_during_transitions", "sensory_needs"]` |
| `known_successful_scaffolds` | string[] | **Yes** | Scaffolds that have worked for this student. Injected into prompts to ground recommendations in proven approaches. Examples: `["bilingual_word_walls", "visual_step_cards"]` |
| `communication_notes` | string[] | Optional | Notes about family communication preferences. Example: `["Family speaks Tagalog at home", "Mother prefers messages in English with simple vocabulary"]` |
| `family_language` | string | Optional | ISO 639-1 language code for the family's primary language. Used by the family message prompt class for translation. Examples: `"tl"` (Tagalog), `"ar"` (Arabic), `"ur"` (Urdu). |

## ScheduleBlock

Each entry in the `schedule` array represents one time block in the classroom day.

| Field | Type | Required | Description |
|---|---|---|---|
| `time_slot` | string | **Yes** | Time range for this block. Example: `"8:30-9:15"` |
| `activity` | string | **Yes** | Activity description. Example: `"Literacy block"` |
| `ea_available` | boolean | **Yes** | Whether the Educational Assistant is available during this block. |
| `ea_student_refs` | string[] | Optional | Student aliases the EA focuses on during this block. Must match aliases in the `students` array. |
| `notes` | string | Optional | Additional context. Example: `"Historically difficult - sensory needs peak"` |

## UpcomingEvent

Each entry in `upcoming_events` describes a known event that may affect classroom complexity.

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | **Yes** | Event description. Example: `"Field trip to science centre"` |
| `event_date` | string | Optional | Date of the event (ISO 8601 or human-readable). |
| `time_slot` | string | Optional | Time range if the event occupies a specific block. |
| `impacts` | string | Optional | Description of how this event affects the classroom. Example: `"No EA available, routine disrupted"` |

## RetentionPolicy

The optional `retention_policy` field declares how long time-series classroom memory is kept. It is consumed by `npm run memory:admin -- prune --classroom <id> --confirm`, which deletes rows older than the configured window from every retention-eligible table and writes a tombstone audit artifact to `output/memory-admin/`.

| Field | Type | Required | Description |
|---|---|---|---|
| `default_days` | integer \| null | Optional | Default retention window in days applied to every retention-eligible table. Must be a positive integer when present. `null` or omitted means that table keeps records indefinitely unless overridden. |
| `overrides` | Record<string, integer> | Optional | Per-table retention overrides, keyed by table name. Any specified table uses this window instead of `default_days`. Valid keys are `generated_plans`, `generated_variants`, `family_messages`, `interventions`, `pattern_reports`, `complexity_forecasts`, `scaffold_reviews`, `survival_packets`, `feedback`, `sessions`. |

**Example:**

```json
"retention_policy": {
  "default_days": 730,
  "overrides": {
    "sessions": 90,
    "feedback": 180
  }
}
```

This policy keeps generated artifacts (plans, variants, messages, interventions, reports) for two years, prunes raw session telemetry after 90 days, and prunes teacher feedback after six months. Pruning never runs automatically — it only applies when an operator invokes `memory:admin -- prune` with `--confirm`.

## Example: Minimal classroom

```json
{
  "classroom_id": "sample-grade2",
  "grade_band": "K-2",
  "subject_focus": "literacy",
  "classroom_notes": [
    "Grade 2 class with 20 students.",
    "One EA available full time."
  ],
  "routines": {
    "morning": "circle time then calendar",
    "after_lunch": "quiet reading then math"
  },
  "students": [
    {
      "student_id": "S1",
      "alias": "Kai",
      "eal_flag": false,
      "support_tags": ["needs_extension_tasks"],
      "known_successful_scaffolds": ["independent_reading_menu"]
    }
  ]
}
```

## Example: Protected classroom with full schedule

```json
{
  "classroom_id": "mrs-chen-grade5",
  "grade_band": "5-6",
  "subject_focus": "math",
  "classroom_notes": [
    "Grade 5 math focus with integrated science.",
    "Two EAL students at different proficiency levels."
  ],
  "routines": {
    "morning": "number talk then problem of the day",
    "after_lunch": "body break then science"
  },
  "support_constraints": [
    "EA available 9:00-11:30 only"
  ],
  "access_code": "maple2026",
  "sub_ready": true,
  "students": [
    {
      "student_id": "C1",
      "alias": "Lina",
      "eal_flag": true,
      "support_tags": ["eal_level_2", "strong_math_reasoning"],
      "known_successful_scaffolds": ["sentence_frames", "visual_vocabulary"],
      "communication_notes": ["Family speaks Mandarin"],
      "family_language": "zh"
    },
    {
      "student_id": "C2",
      "alias": "Marcus",
      "eal_flag": false,
      "support_tags": ["math_anxiety", "benefits_from_manipulatives"],
      "known_successful_scaffolds": ["concrete_first_approach", "small_group"]
    }
  ],
  "schedule": [
    { "time_slot": "9:00-9:30", "activity": "Number talk", "ea_available": true, "ea_student_refs": ["Lina"] },
    { "time_slot": "9:30-10:30", "activity": "Math block", "ea_available": true, "ea_student_refs": ["Lina", "Marcus"] },
    { "time_slot": "10:30-10:45", "activity": "Recess", "ea_available": false }
  ],
  "upcoming_events": [
    { "description": "Provincial math assessment", "event_date": "2026-04-15", "impacts": "Higher anxiety expected for Marcus" }
  ]
}
```

## Adding a new classroom

1. Create `data/synthetic_classrooms/classroom_{your-id}.json` following the schema above.
2. Ensure `classroom_id` is unique, lowercase, alphanumeric with hyphens.
3. If protected, set `access_code`. If open, omit it.
4. Run `npm run release:gate` to verify the system recognizes it.
5. The classroom will appear in `GET /api/classrooms` automatically.

## Safety notes

- **Never use real student names.** All `alias` fields must be fictional.
- **Never use real family contact information.** `communication_notes` should describe preferences, not phone numbers or addresses.
- **Access codes are stored in plaintext** in the JSON file. For real deployments, move to environment variables or a secrets manager.
- **Synthetic data only** for demo and hosted Gemini runs. See CLAUDE.md cost guardrails.
