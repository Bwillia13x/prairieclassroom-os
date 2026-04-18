# Prompt Contracts

## Purpose

Every major model interaction should be treated as a versioned contract, not an ad hoc prompt.

## Current prompt classes

### A. Differentiate material
Route: `differentiate_material`
Model tier: live (gemma-4-4b-it)
Thinking: off
Retrieval: no
Tool-call: yes
Schema version: 0.1.0

Input:
- artifact text and/or image
- classroom profile summary
- target variants
- optional Alberta curriculum selection (`entry_id` plus 1-3 focus statements from the local curriculum catalog)
- optional tool grounding through `lookup_curriculum_outcome(grade, subject, keyword)` against the local Alberta curriculum catalog

Output:
- structured list of lesson variants

Notes: When a curriculum selection is provided, the prompt injects an `ALBERTA CURRICULUM ALIGNMENT` block sourced from the local Alberta catalog. The model is instructed to stay inside that focus rather than drifting into adjacent expectations.
When the model needs a curriculum anchor that was not explicitly selected by the teacher, the tool-capable path can call the local `lookup_curriculum_outcome` registry tool. Tool results are local catalog facts only; they do not fetch the web or broaden the prompt beyond Alberta K-6 curriculum context.

### B. Tomorrow plan
Route: `prepare_tomorrow_plan`
Model tier: planning (gemma-4-27b-it)
Thinking: on
Retrieval: yes (plans, interventions, pattern reports)
Tool-call: yes
Schema version: 0.1.0

Input:
- today note (teacher reflection)
- upcoming artifact(s)
- classroom memory summary (auto-injected from recent plans)
- intervention summary (auto-injected from recent interventions)
- pattern insights (auto-injected from latest persisted pattern report, Sprint 7)
- optional tool grounding through `query_intervention_history(student_ref, days, limit)` against the active classroom's local SQLite memory

Output:
- transition watchpoints
- student support priorities
- EA plan
- recommended prep items
- family followups

Notes: When a pattern report exists for the classroom, the PATTERN INSIGHTS section is injected into the prompt. The system prompt instructs the model to weave pattern insights using "your records show" or "based on your documented observations" language. Response includes `pattern_informed: boolean` indicating whether pattern context was available.
The tool-capable path is bounded to already-local classroom memory; it does not infer diagnosis, assign discipline risk, or message families autonomously.

### C. Family message
Input:
- classroom event or missed work summary
- tone class
- target language

Output:
- plain-language family note
- optional simplified student-facing summary

### D. Intervention log
Route: `log_intervention`
Model tier: live (gemma-4-4b-it)
Thinking: off
Retrieval: no
Tool-call: no
Schema version: 0.1.0

Input:
- teacher note (free text)
- tagged student(s)
- optional context from plan support priority

Output:
- structured intervention record (observation, action_taken, outcome, follow_up_needed)

Retrieval downstream: recent interventions are summarized and injected into tomorrow plan prompts.

### E. Simplify for student
Route: `simplify_for_student`
Model tier: live (gemma-4-4b-it)
Thinking: off
Retrieval: no
Tool-call: no
Schema version: 0.1.0

Input:
- source text (artifact passage or teacher-provided content)
- grade band (K-2, 3-4, 5-6)
- EAL level (beginner, intermediate, advanced)

Output:
- simplified_text (grade-appropriate rewrite)
- key_vocabulary[] (essential terms with plain definitions)
- visual_cue_suggestions[] (recommended visual supports)

Notes: Output is ephemeral — not persisted to classroom memory. Three EAL levels apply different simplification strategies (sentence length, vocabulary constraints, scaffold depth).

### F. Generate vocab cards
Route: `generate_vocab_cards`
Model tier: live (gemma-4-4b-it)
Thinking: off
Retrieval: no
Tool-call: no
Schema version: 0.1.0

Input:
- artifact text (lesson content to extract vocabulary from)
- subject (reading, math, science, social-studies)
- target language (es, ar, pa, tl, zh, fr, ur, so, vi, ko)
- grade band (K-2, 3-4, 5-6)
- optional Alberta curriculum selection (`entry_id` plus 1-3 focus statements from the local curriculum catalog)

Output:
- cards[] (5-8 bilingual vocabulary cards)
  - term, definition, target_translation, example_sentence, visual_hint

Notes: Output is ephemeral. Card count bounded 5-8 to keep sets manageable. Supports 10 target languages reflecting common EAL populations in Canadian classrooms. When curriculum alignment is supplied, the prompt prioritizes terms that directly support that Alberta focus instead of general topical vocabulary.

### G. Detect support patterns
Route: `detect_support_patterns`
Model tier: planning (gemma-4-27b-it)
Thinking: on
Retrieval: yes (interventions, plans, family messages)
Tool-call: no
Schema version: 0.1.0

Input:
- classroom_id
- student_filter (optional — alias to filter by)
- time_window (number of recent records to analyze: 5, 10, or 20)

Output:
- recurring_themes[] (theme, student_refs, evidence_count, example_observations)
- follow_up_gaps[] (original_record_id, student_refs, observation, days_since)
- positive_trends[] (student_ref, description, evidence)
- suggested_focus[] (student_ref, reason, suggested_action, priority)

Notes: All output uses observational language only — "Your records show..." not "This student has..." No diagnostic labels, risk scores, or clinical terminology. Patterns are attributed to the teacher's own documentation. This is the first prompt class that reads across multiple records over time.

Persistence (Sprint 7): Reports are saved to `pattern_reports` table after generation. The latest report is automatically retrieved and injected into tomorrow-plan prompts as PATTERN INSIGHTS. This closes the final data loop: interventions -> patterns -> plans -> interventions.

Retrieval endpoint: `GET /api/support-patterns/latest/:classroomId` returns the most recent persisted report.

### H. Generate EA briefing
Route: `generate_ea_briefing`
Model tier: live (gemma-4-4b-it)
Thinking: off
Retrieval: yes (today's plan EA actions, recent interventions, latest pattern report)
Tool-call: no
Schema version: 0.1.0

Input:
- classroom_id
- ea_name (optional — for personalization)

Output:
- schedule_blocks[] (time_slot, student_refs, task_description, materials_needed)
- student_watch_list[] (student_ref, context_summary, suggested_approach)
- pending_followups[] (student_ref, original_observation, days_since, suggested_action)
- teacher_notes_for_ea (summary of today's priorities)

Notes: Output is ephemeral — not persisted to classroom memory. Uses live tier because this is synthesis/formatting, not deep reasoning. All output uses coordination-focused language ("The teacher's plan notes..."). Same 15 forbidden diagnostic terms as pattern detection. This is the first prompt class designed for the secondary user (EA).

Retrieval: `buildEABriefingContext()` pulls from three sources — today's plan EA actions + support priorities, recent interventions (follow-up-pending first), and latest pattern report focus items + positive trends.

## Prompt design rules

- Separate task instructions from project policy.
- Keep structured outputs explicit.
- Do not bury critical schema requirements in prose.
- Prefer short, stable instructions plus injected context.
- Include disallowed behavior where safety matters.

## Thinking mode policy

Use only for:
- tomorrow planning
- ambiguous multimodal synthesis
- hard tradeoff reasoning

Avoid for:
- simple message drafting
- routine variant formatting
- low-stakes transformations

## Routing template

For every prompt class, document:
- route name
- preferred model tier
- thinking on/off
- retrieval required yes/no
- tool-call capable yes/no
- output schema version

---

### I. Forecast Complexity

**Route:** `forecast_complexity`
**Model:** planning tier -- `gemma-4-27b-it`
**Thinking:** On
**Retrieval:** Yes -- intervention history by time-block, recent interventions, pattern report highlights, pending follow-ups

**Input:**
- `classroom_id` -- which classroom
- `forecast_date` -- the date being forecast (YYYY-MM-DD)
- `teacher_notes` -- optional free-text notes about tomorrow (events, changes, absences)

**Context injected:**
- Classroom schedule (time blocks, activities, EA availability)
- Upcoming events
- Intervention frequency by time/context pattern
- Recent interventions
- Pattern report highlights
- Pending follow-ups

**Output schema (v0.1.0):**

    {
      "blocks": [
        {
          "time_slot": "8:30-9:15",
          "activity": "Bell work + calendar math",
          "level": "low | medium | high",
          "contributing_factors": ["EA present", "familiar routine"],
          "suggested_mitigation": "specific actionable strategy"
        }
      ],
      "overall_summary": "2-3 sentence summary referencing specific blocks and students",
      "highest_risk_block": "12:30-12:45"
    }

**Safety rules:**
- Complexity describes classroom conditions, not student behavior
- No individual student is labeled as a "complexity driver"
- No diagnostic or clinical language (same 15 forbidden terms as all contracts)
- Intervention history referenced with "your records show" framing
- Student aliases only

### I2. Balance EA Cognitive Load

**Route:** `balance_ea_load`
**Model:** planning tier -- `gemma-4-27b-it`
**Thinking:** On
**Retrieval:** Yes -- intervention frequency by time/context pattern, recent interventions, latest pattern-report highlights (reuses `buildForecastContext` — the EA-load feature shares retrieval with the complexity forecast)

**Input:**
- `classroom_id` -- which classroom
- `target_date` -- the date being analyzed (YYYY-MM-DD)
- `teacher_notes` -- optional free-text notes about tomorrow's EA coverage (shortened window, coverage swap, unusual routine)

**Context injected:**
- Classroom schedule (time blocks, activities, EA availability, per-block `ea_student_refs`)
- Support constraints (the EA window, coverage rules)
- Student support tags and scaffolds
- Intervention history patterns from `buildForecastContext`
- Upcoming events

**Output schema (v0.1.0):**

    {
      "load_id": "eal-demo-okafor-grade34-1728734400000",
      "classroom_id": "demo-okafor-grade34",
      "target_date": "2026-04-13",
      "blocks": [
        {
          "time_slot": "9:30-10:30",
          "activity": "Literacy block",
          "ea_available": true,
          "supported_students": ["Amira", "Daniyal", "Farid"],
          "load_level": "high",
          "load_factors": ["3 EAL-tagged students need EA attention simultaneously", "Language-heavy block"],
          "redistribution_suggestion": "Consider moving Farid to the independent sentence-frames station at 9:30"
        }
      ],
      "alerts": ["Sustained high-load sequence 9:30-11:45 with only a 15-minute recovery break"],
      "overall_summary": "2-3 sentence summary referencing specific time_slots and student aliases",
      "highest_load_block": "9:30-10:30",
      "schema_version": "0.1.0"
    }

**Level vocabulary:** `low | medium | high | break`. Blocks where the EA is not scheduled are always `break` (enforced by the parser, not just the prompt).

**Safety rules:**
- Describes CLASSROOM CONDITIONS AND EA DEMANDS, never EA competence
- No EA is "failing," "overloaded," or "underperforming" in the output
- No individual student is a "load driver" in isolation — load arises from multiple factors across a sequence of blocks
- Same 15 forbidden terms as every other contract (no diagnosis, no behavioral-risk scoring, no disciplinary suggestions)
- Student aliases only; cross-classroom aliases are scrubbed from narrative text by the parser
- Redistribution suggestions are framed as "consider moving X" — the teacher and EA decide

**Persistence:** Not persisted. The EA load profile is always computed fresh from current schedule + memory.

### J. Complexity Debt Register

**Route:** none (deterministic retrieval)
**Model:** none
**Thinking:** n/a
**Retrieval:** yes — all record types (interventions, plans, messages, pattern reports)

**Input:**
- `classroom_id`
- optional threshold overrides (query params)

**Output:**
- `ComplexityDebtRegister` — categorized items with age, student refs, suggested actions

**Notes:** This is the first workflow that uses no model. All debt categories are computed deterministically from SQL queries against classroom memory. The register is never persisted — it is always computed fresh from current state.

Categories: stale follow-ups, unapproved family messages, unaddressed pattern insights, recurring plan items, approaching review windows.

### K. Detect Scaffold Decay

**Route:** `detect_scaffold_decay`
**Model:** planning tier — `gemma-4-27b-it`
**Thinking:** on
**Retrieval:** yes — student intervention history (time-windowed), classroom profile (scaffold list)
**Tool-call:** no
**Schema version:** 0.1.0

**Input:**
- `classroom_id`
- `student_ref` — which student to analyze
- `time_window` — number of records to analyze (minimum 10)

**Output:**
- `ScaffoldDecayReport` — scaffold reviews with usage trends, positive signals, withdrawal plans

**Notes:** Minimum 10 intervention records required per student. Intervention history is partitioned into early/recent windows for trend comparison. Withdrawal plans are only generated for scaffolds showing "decaying" trend with positive signals. Every withdrawal plan includes a regression protocol. Reports are persisted to `scaffold_reviews` table.

Safety: Observational language only. No diagnosis or capability inference. "Your records show decreasing use of..." not "Student C no longer needs..."

---

## Generate Survival Packet — `generate_survival_packet` (v0.1.0)

<!-- Note: this contract was originally lettered "K" in superpowers/plans/2026-04-04-substitute-survival-packet.md. The scaffold-decay contract later took the "K" slot in the sequential A-O lettered subsections above, so this canonical contract is named explicitly to avoid the collision. -->


### Purpose
One-click generation of a structured substitute teacher briefing that synthesizes the classroom's entire memory into a printable handoff document.

### Route
- **Model tier:** Planning (gemma-4-27b-it)
- **Thinking mode:** Enabled
- **Retrieval:** Required — comprehensive pull from all memory sources

### Input schema
```json
{
  "classroom_id": "string (required)",
  "target_date": "string (required, ISO date)",
  "teacher_notes": "string (optional, additional context for the substitute)"
}
```

### Output schema
```json
{
  "packet_id": "string",
  "classroom_id": "string",
  "generated_for_date": "string",
  "routines": [{ "time_or_label": "string", "description": "string", "recent_changes": "string?" }],
  "student_support": [{ "student_ref": "string", "current_scaffolds": ["string"], "key_strategies": "string", "things_to_avoid": "string?" }],
  "ea_coordination": { "ea_name": "string?", "schedule_summary": "string", "primary_students": ["string"], "if_ea_absent": "string" },
  "simplified_day_plan": [{ "time_slot": "string", "activity": "string", "sub_instructions": "string", "materials_location": "string?" }],
  "family_comms": [{ "student_ref": "string", "status": "enum", "language_preference": "string?", "notes": "string" }],
  "complexity_peaks": [{ "time_slot": "string", "level": "enum", "reason": "string", "mitigation": "string" }],
  "heads_up": ["string"],
  "schema_version": "string"
}
```

### Retrieval sources (10)
1. Classroom schedule (with EA student assignments)
2. Classroom routines
3. Student profiles (aliases, tags, scaffolds, communication notes)
4. Support constraints
5. Most recent tomorrow plan (support priorities, EA actions, watchpoints)
6. Recent interventions (last 10)
7. Latest pattern report (themes, positive trends)
8. Family message status (sent, draft, language preferences)
9. Latest complexity forecast (per-block complexity levels)
10. Upcoming events (with dates)

### Safety rules
- Student aliases only. No raw intervention records in output.
- Observational language only.
- Family comms default to "defer_to_teacher" for sensitive situations.
- 15 forbidden diagnostic terms enforced.
- Requires `sub_ready` flag to be enabled on classroom profile.

### Pre-authorization gate
The classroom's `sub_ready` field must be `true`. Returns 403 if not set. This ensures the teacher has explicitly opted into sharing classroom memory with a substitute.

---

## Non-model API surfaces: Feedback and Sessions

These routes are deterministic (no model call) and support the Usage Insights panel and evidence portfolio.

### L. Submit Feedback

**Route:** `POST /api/feedback`
**Model:** none (deterministic persistence)

**Input:**
- `classroom_id` (required)
- `panel_id` (required) — which panel the output was generated in
- `prompt_class` (optional) — which prompt class produced the output
- `rating` (required) — numeric rating
- `comment` (optional) — free-text teacher comment
- `generation_id` (optional) — links to a specific generation
- `session_id` (optional) — links to the current session

**Output:**
- `id` — persisted feedback record ID
- `created_at` — timestamp

### M. Feedback Summary

**Route:** `GET /api/feedback/summary/:classroomId`
**Model:** none (deterministic aggregation)

**Output:**
- `total` — total feedback count
- `by_panel` — per-panel breakdown (count, avg_rating, recent_comments)
- `by_week` — weekly aggregation (week label, count, avg_rating)
- `top_comments` — recent comments with panel and rating context

### N. Submit Session

**Route:** `POST /api/sessions`
**Model:** none (deterministic persistence)

**Input:**
- `classroom_id` (required)
- `session_id` (required)
- `started_at` / `ended_at` (required) — ISO timestamps
- `panels_visited` (required) — ordered list of panel IDs
- `generations_triggered` (required) — list of { panel_id, prompt_class, timestamp }
- `feedback_count` (required)

**Output:**
- `id` — persisted session record ID

### O. Session Summary

**Route:** `GET /api/sessions/summary/:classroomId`
**Model:** none (deterministic aggregation)

**Output:**
- `total_sessions` — session count
- `avg_duration_minutes` — average session length
- `common_flows` — most frequent panel visit sequences with counts
- `panel_time_distribution` — time spent per panel (estimated from visit order)
- `generations_per_session` — average generation count
