# Sprint 7 Plan — Pattern-Informed Planning

## Goal

Close the final data loop: pattern insights (Sprint 6) now persist to classroom memory and automatically inform tomorrow-plan prompts. The system gains genuine longitudinal intelligence: **interventions -> patterns -> plans -> interventions -> ...**

## User story

As a teacher, when I generate a tomorrow plan, I want it to reference the recurring patterns, follow-up gaps, and positive trends from my recent pattern review — so the plan is informed by what I've been documenting over time, not just yesterday's reflection.

## Changes

### Database
- Add `pattern_reports` table to SQLite schema (db.ts)

### Memory
- `savePatternReport()` — persists pattern reports after generation
- `getLatestPatternReport()` — retrieves the most recent report for a classroom
- `summarizePatternInsights()` — converts a pattern report into a prompt-friendly text block with safety-framed attribution

### Prompt contract
- `buildTomorrowPlanPrompt()` accepts new `patternInsights` parameter
- PATTERN INSIGHTS section injected into user prompt when available
- System prompt updated: "weave pattern insights into support priorities using 'your records show' language"

### API
- `POST /api/support-patterns` — now persists the report to SQLite after generation
- `POST /api/tomorrow-plan` — retrieves latest pattern report, summarizes, injects into prompt; response includes `pattern_informed: boolean`
- `GET /api/support-patterns/latest/:classroomId` — new endpoint to retrieve the most recent persisted pattern report (12th endpoint)

### UI
- PlanViewer shows "Pattern-informed" badge when the plan was generated with pattern context
- Types updated for `pattern_informed` field

### Evals (5 new → 37 total)
- `pat-006-persistence` — pattern report persisted after generation
- `pat-007-latest-retrieval` — latest pattern report retrievable via GET endpoint
- `plan-006-pattern-informed` — plan with pattern context has valid schema
- `plan-007-pattern-safety` — pattern-informed plan maintains safety boundaries (15 forbidden terms)
- `plan-008-pattern-latency` — pattern-informed plan within latency budget

## Safety

Pattern insights carry the same observational framing from Sprint 6 through to the planning prompt. The `summarizePatternInsights()` function preserves "your records show" attribution. The system prompt explicitly instructs the model to use "your records show" or "based on your documented observations" language when referencing pattern context. Safety evals verify no diagnostic/clinical language leaks through the injection.

## Architecture note

Pattern reports transition from ephemeral (Sprint 6) to persisted (Sprint 7). This is the first cross-feature data flow in the system — pattern detection output feeds forward into planning input. The retrieval is by-classroom, most-recent-first, matching the existing memory retrieval pattern.
