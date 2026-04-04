# Sprint 6 Review — Support Pattern Detection

## Summary

Sprint 6 adds `detect_support_patterns`, the 7th prompt class. It uses the planning tier with thinking to synthesize across intervention records and support plans, surfacing recurring themes, follow-up gaps, positive trends, and suggested focus areas. This is the first feature that reads across multiple records over time.

## Eval Results

**32/32 passing** (27 existing + 5 new)

New eval cases:
- `pat-001-alpha-schema` — Schema validation: all required report keys present
- `pat-002-content-quality` — Content quality: themes and focus items populated
- `pat-003-safety-boundaries` — Safety: no diagnosis, clinical, or risk language (15 forbidden terms)
- `pat-004-follow-up-gaps` — Follow-up gap detection: identifies pending follow-ups
- `pat-005-latency` — Latency: completes within 5000ms on mock

## Deliverables

### Schemas
- `packages/shared/schemas/pattern.ts` — `SupportPatternReport`, `RecurringTheme`, `FollowUpGap`, `PositiveTrend`, `SuggestedFocus`

### Memory
- `services/memory/retrieve.ts` — `getStudentInterventions()`, `getFollowUpPending()`, `buildPatternContext()`

### Prompt Contract
- `services/orchestrator/support-patterns.ts` — `buildSupportPatternsPrompt` / `parseSupportPatternsResponse`

### Inference
- Mock response with `MOCK_SUPPORT_PATTERNS` + `MOCK_SUPPORT_PATTERNS_THINKING` + dispatch

### API
- `POST /api/support-patterns` — classroom_id, optional student_filter, time_window -> pattern report

### UI
- `PatternReport` component with form + report display
- 6th tab "Support Patterns" in App.tsx
- Cross-tab bridges: follow-up gaps -> intervention logger, positive trends -> family message, suggested focus -> intervention logger

### Docs
- `docs/sprint-6-plan.md` — Sprint plan
- `docs/sprint-6-review.md` — This file
- `docs/decision-log.md` — 2 new ADRs (planning tier rationale, safety framing)
- `docs/prompt-contracts.md` — Section G added
- `docs/prompt-routing-table.md` — 7th route table

## Architecture Notes

- Second prompt class using planning tier + thinking (after tomorrow-plan)
- Pattern context is built from 3 data sources: interventions, plan support priorities, pending follow-ups
- Reports are ephemeral — not persisted to SQLite. Future sprints can add persistence for longitudinal tracking
- Safety framing enforced at prompt level, mock level, and eval level: observational language only, teacher-documentation attribution, 15+ forbidden diagnostic/clinical terms checked

## Regression

All 27 pre-existing evals remain green. No regressions introduced.

## What's next

The system now has 7 prompt classes across 2 model tiers, 6 UI tabs with cross-tab bridges, and 32 evals. Potential Sprint 7 directions:
- Pattern → plan feedback loop (inject pattern insights into tomorrow-plan prompts)
- Visual support generation (generate_visual_support tool from architecture doc)
- Trend persistence and visualization
- End-to-end demo polish
