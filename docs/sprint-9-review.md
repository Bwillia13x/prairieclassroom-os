# Sprint 9 Review — Demo Packaging + Kaggle Writeup

**Sprint:** 9 — Demo packaging + Kaggle writeup
**Date:** 2026-04-03

42/42 evals passing (zero new, zero regressions)

## What works

1. **Demo seed data is realistic and cross-referenced.** 8 interventions span 2 weeks with consistent student references. Plans reference the same students and build on intervention outcomes. The pattern report cites specific intervention records. The family message references a real breakthrough (Elena's fraction tiles).

2. **Seed script uses production code paths.** Every record goes through the same `store.ts` functions the live system uses. This caught a real bug: `import.meta.dirname` returned undefined in tsx's CJS mode, causing SQLite databases to be created at the wrong path. Fixed by falling back to `fileURLToPath(new URL(".", import.meta.url))` in `db.ts`.

3. **Demo mode is minimal and non-invasive.** A single query param (`?demo=true`) auto-selects the demo classroom. No feature flags, no mode switches, no conditional rendering. The system works identically — it just starts with the right classroom selected.

4. **Walkthrough script covers the full loop.** All 8 workflows exercised in a logical order that tells a coherent story: differentiate → language tools → log → patterns → plan → briefing → message. Each step includes narration cues explaining why the feature matters.

5. **Kaggle writeup tells the Gemma-specific technical story.** Dual-tier routing, thinking mode decisions, structured SQL retrieval (not RAG), observational safety framing, and closed feedback loops — these are the architectural choices that distinguish this from a generic LLM wrapper.

## What breaks or is uncertain

1. **Mock outputs are generic.** The demo walkthrough shows system structure but not model intelligence — all responses are canned. This is explicitly acknowledged in the writeup's "What's Not Built" section.

2. **Student stubs in App.tsx are hardcoded.** The `studentStubs` array in `App.tsx` doesn't include demo classroom students. The intervention logger and family message composer use these stubs for the student dropdown. The demo requires typing student names manually rather than selecting from a dropdown.

3. **No video recording.** A recorded walkthrough video would strengthen the submission but was deferred from sprint scope.

## Sprint deliverables

| Deliverable | File | Status |
|-------------|------|--------|
| Demo classroom profile | `data/synthetic_classrooms/classroom_demo.json` | Complete |
| Demo seed script | `data/demo/seed.ts` | Complete (8 int, 3 plans, 1 pattern, 1 msg) |
| Demo mode wiring | `server.ts`, `App.tsx` | Complete |
| Demo walkthrough script | `docs/demo-script.md` | Complete |
| Kaggle writeup | `docs/kaggle-writeup.md` | Complete |
| Sprint 9 ADR | `docs/decision-log.md` | Complete |
| Bug fix | `services/memory/db.ts` | Fixed (import.meta.dirname fallback) |

## Eval impact

42/42 evals remain green. No new evals added — this sprint is documentation and data, not features.

## What to do next

- **Real Gemma 4 validation:** Swap mock mode for real inference. Run the full eval suite against actual model output. This is the biggest remaining unknown.
- **Demo video:** Record a narrated walkthrough using the demo script.
- **Student dropdown for demo classroom:** Add demo classroom students to the stubs or implement a proper `/api/classrooms/:id/students` endpoint.
