# Sprint 7 Review — Pattern-Informed Planning

## Summary

Sprint 7 closes the final data loop in PrairieClassroom OS. Pattern reports (Sprint 6) now persist to classroom SQLite and automatically inform tomorrow-plan prompts. When a teacher generates a tomorrow plan, the system retrieves the latest pattern report and injects its insights — recurring themes, follow-up gaps, positive trends, and focus areas — into the planning prompt. The system now has genuine longitudinal intelligence: **interventions -> patterns -> plans -> interventions -> ...**

## Eval Results

**37/37 passing** (32 existing + 5 new, zero regressions)

New eval cases:
- `pat-006-persistence` — Pattern report saved after generation and retrievable
- `pat-007-latest-retrieval` — GET endpoint returns latest persisted report with valid schema
- `plan-006-pattern-informed` — Plan with pattern context produces all required sections
- `plan-007-pattern-safety` — Pattern-informed plan maintains safety (15 forbidden terms checked)
- `plan-008-pattern-latency` — Pattern-informed plan within 5000ms latency budget

## Deliverables

### Database
- `services/memory/db.ts` — `pattern_reports` table (5th table)

### Memory
- `services/memory/store.ts` — `savePatternReport()`
- `services/memory/retrieve.ts` — `getLatestPatternReport()`, `summarizePatternInsights()`

### Prompt Contract
- `services/orchestrator/tomorrow-plan.ts` — accepts `patternInsights` parameter, PATTERN INSIGHTS section in user prompt, safety framing in system prompt

### API
- `POST /api/support-patterns` — now persists report after generation
- `POST /api/tomorrow-plan` — retrieves latest pattern report, injects into prompt, returns `pattern_informed: boolean`
- `GET /api/support-patterns/latest/:classroomId` — new retrieval endpoint (12th endpoint)

### UI
- `PlanViewer` — "Pattern-informed" badge with purple accent
- `TomorrowPlanResponse` type — added `pattern_informed` field

### Docs
- `docs/sprint-7-plan.md` — Sprint plan
- `docs/sprint-7-review.md` — This file
- `docs/decision-log.md` — 2 new ADRs (pattern persistence rationale, safety chain)
- `docs/prompt-contracts.md` — Section B updated, Section G updated

## Architecture Notes

- Pattern reports transition from ephemeral (Sprint 6) to persisted (Sprint 7)
- This is the first cross-feature data flow: pattern detection output feeds into planning input
- The `summarizePatternInsights()` function structures pattern data with high-priority focus items first, maintaining observational attribution throughout
- Safety framing carries through the entire chain: teacher docs -> pattern report -> pattern summary -> plan prompt -> plan output
- The retrieval pattern (by classroom, most-recent-first) matches existing memory conventions

## Data Flow (Complete System)

```
Teacher uploads artifact
  → Differentiate (5 variants) [persisted]
  → Teacher reflects on today
    → Tomorrow Plan [persisted]
      ← Classroom memory (recent plans)
      ← Recent interventions
      ← Pattern insights (Sprint 7: from latest pattern report)
    → Teacher acts on plan
      → Log Intervention [persisted]
        → Feeds back into tomorrow plan prompts
        → Feeds into pattern detection
          → Detect Support Patterns [persisted, Sprint 7]
            → Recurring themes, gaps, trends, focus
            → Feeds back into tomorrow plan (Sprint 7)
  → Language Tools (simplify, vocab cards) [ephemeral]
  → Family Messages [persisted, teacher-approved]
```

## Regression

All 32 pre-existing evals remain green. No regressions introduced.

## What's next

The system now has 7 prompt classes across 2 model tiers, 6 UI tabs with cross-tab bridges, 12 API endpoints, and 37 evals. The complete data loop is closed. Potential Sprint 8 directions:
- Real Gemma 4 validation and demo polish
- Visual support generation
- EA daily briefing (synthesize plan EA actions + pattern insights into a printable EA briefing)
- Trend visualization dashboard (chart pattern report data over time)
- Voice note input (audio transcription → intervention logging)
