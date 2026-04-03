# Sprint 1 Review

**Sprint:** 1 — Upload-to-Differentiation Loop
**Date:** 2026-04-02 → 2026-04-03

## What works

1. **End-to-end differentiation loop is complete.** Teacher uploads artifact text, selects a classroom, receives 5 differentiated variants displayed side-by-side.

2. **Prompt contract is structured and versioned.** `differentiate_material v0.1.0` produces consistent JSON arrays with 5 variant types. Parse layer handles markdown fencing.

3. **Three-service architecture runs.** Vite UI → Express orchestrator → Flask inference pipeline works with mock mode. Ports 5173/3100/3200.

4. **7/7 evals passing.** Schema reliability × 4, content quality × 1, safety boundaries × 1, latency × 1 — all green against mock inference.

5. **TypeScript compiles clean.** Shared schemas, orchestrator, web app all type-safe.

6. **UI is functional.** Classroom selector, artifact upload form, color-coded variant grid with teacher notes and materials.

## What breaks or is uncertain

1. **No real Gemma 4 inference tested.** Mock mode validates pipeline plumbing but not model behavior. This remains a Sprint 2+ concern.

2. **Text-only input.** Image/PDF artifact upload was deferred. Text-only is sufficient for demo but limits multimodal story.

3. **No persistence.** Generated variants are not saved. Each page refresh loses results.

4. **No classroom memory.** Plans and differentiation are context-free beyond the current request.

## What was deferred to Sprint 2+

- Next-day support plan (Sprint 2)
- Classroom memory / SQLite (Sprint 3)
- Image/PDF upload
- Voice note input
- Real Gemma 4 validation

## Sprint 2 scope recommendation

Build the **Tomorrow Plan** feature: teacher reflection + classroom context → structured next-day support plan using thinking mode on the planning model tier.
