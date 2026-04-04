# Prompt Contracts

## Purpose

Every major model interaction should be treated as a versioned contract, not an ad hoc prompt.

## Current prompt classes

### A. Differentiate material
Input:
- artifact text and/or image
- classroom profile summary
- target variants

Output:
- structured list of lesson variants

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

Output:
- transition watchpoints
- student support priorities
- EA plan
- recommended prep items
- family followups

Notes: When a pattern report exists for the classroom, the PATTERN INSIGHTS section is injected into the prompt. The system prompt instructs the model to weave pattern insights using "your records show" or "based on your documented observations" language. Response includes `pattern_informed: boolean` indicating whether pattern context was available.

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

Output:
- cards[] (5-8 bilingual vocabulary cards)
  - term, definition, target_translation, example_sentence, visual_hint

Notes: Output is ephemeral. Card count bounded 5-8 to keep sets manageable. Supports 10 target languages reflecting common EAL populations in Canadian classrooms.

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
