# Sprint 8 Review — EA Daily Briefing

## Summary

Sprint 8 adds the first feature designed for the secondary user (educational assistant). The EA daily briefing synthesizes the teacher's plan, recent interventions, pending follow-ups, and pattern insights into a concise, printable coordination document. The system now serves two roles — teacher and EA — making the "classroom OS" metaphor concrete.

## Eval Results

**42/42 passing** (37 existing + 5 new, zero regressions)

New eval cases:
- `ea-001-schema` — Briefing has all required keys, correct schema version
- `ea-002-content-quality` — Contains schedule blocks and student references
- `ea-003-safety` — No diagnostic/clinical language (15 forbidden terms checked)
- `ea-004-latency` — Within 2000ms budget (live tier, no thinking)
- `ea-005-synthesis` — References student aliases from existing plan data

## Deliverables

### Schema
- `packages/shared/schemas/briefing.ts` — `EABriefing`, `ScheduleBlock`, `StudentWatchItem`, `PendingFollowup`
- `packages/shared/schemas/index.ts` — barrel export updated

### Orchestrator
- `services/orchestrator/ea-briefing.ts` — prompt builder + response parser
- `services/orchestrator/types.ts` — `generate_ea_briefing` added to `PromptClass` (8th prompt class)
- `services/orchestrator/router.ts` — routing entry (live tier, no thinking, retrieval required)

### Memory / Retrieval
- `services/memory/retrieve.ts` — `buildEABriefingContext()` pulls from three sources: today's plan EA actions + support priorities, recent interventions (follow-up-pending first), latest pattern report focus items + positive trends

### Mock
- `services/inference/harness.py` — `MOCK_EA_BRIEFING` canned response + dispatch for `generate_ea_briefing`

### API
- `POST /api/ea-briefing` — 13th endpoint, generates ephemeral briefing

### UI
- `apps/web/src/types.ts` — `EABriefing`, `EABriefingRequest`, `EABriefingResponse` types
- `apps/web/src/api.ts` — `generateEABriefing()` client function
- `apps/web/src/components/EABriefing.tsx` + CSS — 7th tab with printable layout
- `apps/web/src/App.tsx` — EA Briefing tab, handler, state

### Docs
- `docs/sprint-8-plan.md` — Sprint plan
- `docs/sprint-8-review.md` — This file
- `docs/decision-log.md` — 2 new ADRs (live tier / no persistence rationale, safety framing)
- `docs/prompt-contracts.md` — Section H added

## Architecture Notes

- **No new SQLite table.** Briefings are ephemeral synthesis views, not longitudinal records. This is a safety design choice — persisted briefings about individual students could become shadow records.
- **Three-source retrieval.** `buildEABriefingContext()` is the first retrieval function that pulls from three data sources (plans, interventions, pattern reports). Previous functions pulled from one or two.
- **Live tier.** The briefing uses the live model (4B) because it's formatting/synthesis, not reasoning. The planning tier already did the reasoning when generating the plan and patterns.
- **Second cross-feature consumer.** Sprint 7 established the first cross-feature data flow (patterns → plans). Sprint 8 adds the second (plans + patterns + interventions → EA briefing).

## Data Flow (Complete System)

```
Teacher uploads artifact
  → Differentiate (5 variants) [persisted]
  → Teacher reflects on today
    → Tomorrow Plan [persisted]
      ← Classroom memory (recent plans)
      ← Recent interventions
      ← Pattern insights (Sprint 7)
    → Teacher acts on plan
      → Log Intervention [persisted]
        → Feeds back into tomorrow plan prompts
        → Feeds into pattern detection
          → Detect Support Patterns [persisted]
            → Feeds back into tomorrow plan (Sprint 7)
            → Feeds into EA briefing (Sprint 8)
  → Language Tools (simplify, vocab cards) [ephemeral]
  → Family Messages [persisted, teacher-approved]
  → EA Daily Briefing [ephemeral, Sprint 8]
    ← Today's plan EA actions + support priorities
    ← Recent interventions + pending follow-ups
    ← Pattern report focus items + positive trends
```

## System Totals

| Metric | Count |
|--------|-------|
| Prompt classes | 8 |
| Model tiers | 2 (live, planning) |
| UI tabs | 7 |
| API endpoints | 13 |
| SQLite tables | 5 |
| Eval cases | 42 |
| Users served | 2 (teacher, EA) |

## Regression

All 37 pre-existing evals remain green. No regressions introduced.

## What's next

Potential Sprint 9 directions:
- Real Gemma 4 validation and demo polish
- Visual support generation (from architecture doc tool list)
- Voice note input (audio → intervention logging)
- Trend visualization dashboard (chart patterns over time)
- Demo walkthrough script and writeup (spec priority 5)
