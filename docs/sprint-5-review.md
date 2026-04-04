# Sprint 5 Review — Language Bridge & Multilingual Support

## Summary

Sprint 5 adds two new prompt classes — `simplify_for_student` and `generate_vocab_cards` — providing EAL (English as an Additional Language) support tools for teachers. Both use the live model tier with no thinking, producing ephemeral outputs (not persisted to classroom memory).

## Eval Results

**27/27 passing** (22 existing + 5 new)

New eval cases:
- `simp-001-beginner-schema` — Beginner EAL simplification schema validation
- `simp-002-content-quality` — Simplification content quality and safety
- `simp-003-safety-boundaries` — Simplification safety boundaries (no diagnosis/clinical language)
- `vocab-001-spanish-schema` — Spanish vocab cards schema, card count bounds, required fields
- `vocab-002-content-safety` — Vocab cards content safety (no diagnosis, no student names)

## Deliverables

### Schemas
- `packages/shared/schemas/language.ts` — `SimplifiedOutput`, `VocabCard`, `VocabCardSet`

### Prompt Contracts
- `services/orchestrator/simplify.ts` — buildSimplifyPrompt / parseSimplifyResponse
- `services/orchestrator/vocab-cards.ts` — buildVocabCardsPrompt / parseVocabCardsResponse

### Inference
- Mock responses added to `services/inference/harness.py` for both prompt classes

### API
- `POST /api/simplify` — source_text, grade_band, eal_level → simplified output
- `POST /api/vocab-cards` — artifact_text, subject, target_language, grade_band → card set

### UI
- `SimplifiedViewer` component — form + result display with vocabulary chips and visual cue list
- `VocabCardGrid` component — form + warm-yellow card grid with bilingual translations
- New "Language Tools" tab (5th tab) in App.tsx

### Docs
- `docs/sprint-5-plan.md` — Sprint plan
- `docs/sprint-5-review.md` — This file
- `docs/decision-log.md` — 2 new ADRs (live tier rationale, ephemeral output rationale)
- `docs/prompt-contracts.md` — Sections E and F added
- `docs/prompt-routing-table.md` — 2 new route tables

## Architecture Notes

- Simplification supports 3 EAL levels (beginner/intermediate/advanced) with distinct prompt strategies per level
- Vocab cards support 10 target languages: Spanish, Arabic, Punjabi, Tagalog, Chinese, French, Urdu, Somali, Vietnamese, Korean
- Both routes are ephemeral — no SQLite persistence. Future sprints can add persistence if reuse/tracking is needed
- No retrieval injection — these are single-artifact transformations, not context-dependent synthesis

## Regression

All 22 pre-existing evals remain green. No regressions introduced.

## Next: Sprint 6

Per roadmap: Risk signals, behaviour pattern detection, and teacher alerts.
