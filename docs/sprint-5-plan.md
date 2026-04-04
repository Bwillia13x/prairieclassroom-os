# Sprint 5 Plan

**Sprint:** 5 — Language Bridge & Multilingual Support
**Date:** 2026-04-03
**Goal:** Add multilingual translation, student simplification, and bilingual vocabulary cards — proving Gemma 4's multilingual capabilities on a real Alberta classroom need.

## Rationale

CBE reports ~31% of students are learning English as an Additional Language. Language support is one of the clearest "digital equity" wedges. Gemma 4 supports 140+ languages natively. Sprint 5 makes this capability practically useful for teachers.

## Objectives

1. Add `simplify_for_student` prompt contract — take any classroom output and produce a student-friendly, language-simplified version
2. Add `generate_vocab_cards` prompt contract — extract key vocabulary from a lesson artifact and produce bilingual flashcard-style cards
3. Enhance family message flow with explicit translation support (target language already wired, but needs mock translation responses)
4. Add mock responses for `simplify_for_student` and `generate_vocab_cards` to inference harness
5. Add `/api/simplify` and `/api/vocab-cards` API endpoints
6. Build SimplifiedViewer and VocabCardGrid UI components
7. Add a 5th tab "Language Tools" grouping simplification and vocab cards
8. Add 5 eval cases covering new prompt classes
9. Verify: all 27+ evals passing

## Architecture

- Both new prompt classes use the **live** model tier (fast, no thinking needed)
- No retrieval required — these are single-turn transformations
- No new tables — simplified outputs are ephemeral; vocab cards could be saved later
- New schema types: `SimplifiedOutput`, `VocabCard`

## New prompt classes

### E. Simplify for student
- Route: `simplify_for_student`
- Model tier: live (gemma-4-4b-it)
- Thinking: off
- Retrieval: no
- Schema version: 0.1.0

Input: source_text (any classroom output), grade_band, eal_level (beginner/intermediate/advanced)
Output: simplified_text, key_vocabulary[], visual_cue_suggestions[]

### F. Generate vocab cards
- Route: `generate_vocab_cards`
- Model tier: live (gemma-4-4b-it)
- Thinking: off
- Retrieval: no
- Schema version: 0.1.0

Input: artifact_text, subject, target_language (e.g., "ar", "es", "tl", "pa"), grade_band
Output: VocabCard[] — each has: term, definition, target_translation, example_sentence, visual_hint

## Deliverables

| Deliverable | Status |
|-------------|--------|
| `packages/shared/schemas/language.ts` — SimplifiedOutput + VocabCard schemas | Pending |
| `services/orchestrator/simplify.ts` — prompt contract + parser | Pending |
| `services/orchestrator/vocab-cards.ts` — prompt contract + parser | Pending |
| `services/orchestrator/server.ts` — `/api/simplify` + `/api/vocab-cards` | Pending |
| `services/orchestrator/router.ts` — 2 new routes | Pending |
| `services/orchestrator/types.ts` — 2 new prompt classes | Pending |
| `services/inference/harness.py` — 2 new mock responses + dispatch | Pending |
| `apps/web/src/components/SimplifiedViewer.tsx` + CSS | Pending |
| `apps/web/src/components/VocabCardGrid.tsx` + CSS | Pending |
| `apps/web/src/` — Language Tools tab, types, api | Pending |
| 5 eval cases (simp-001 through simp-003, vocab-001, vocab-002) | Pending |
| Updated eval runner with new dispatchers | Pending |
| Sprint 5 docs (plan, decision log, prompt contracts) | Pending |

## What to defer

- Persistent vocab card storage (Sprint 6+)
- Audio pronunciation for vocab cards (future)
- Retrieval into simplification (future — could use student profile for personalization)
- Real translation API fallback (future)
- EmbeddingGemma vector search (future)

## Sprint 6 readiness criteria

- [ ] Simplification produces grade-appropriate, EAL-friendly output
- [ ] Vocab cards generate bilingual pairs with context
- [ ] Family message translation mock demonstrates multilingual capability
- [ ] At least 27 evals passing (22 existing + 5 new)
