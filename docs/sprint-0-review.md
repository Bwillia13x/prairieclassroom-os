# Sprint 0 Review

**Sprint:** 0 — Frame the system correctly
**Date:** 2026-04-02

## What works

1. **Product thesis is locked.** All docs agree: classroom complexity is a coordination problem, the system is teacher/EA-facing, and Gemma 4 is the substrate — not decoration.

2. **Docs are consistent.** No contradictions found across spec, architecture, prompt contracts, data contracts, safety governance, or the sprint-0 checklist. AGENTS.md and CLAUDE.md reinforce the same priorities.

3. **Monorepo skeleton is in place.** Directory structure follows the roadmap guidance with clear separation between interface, orchestration, memory, evaluation, and documentation.

4. **Typed schemas exist.** All seven data contract entities from `data-contracts.md` are now TypeScript interfaces in `packages/shared/schemas/`.

5. **Inference harness is runnable.** Mock mode provides 4/4 smoke tests (text, image+text, thinking, tool call) without requiring GPU. Local mode stub is ready for real Gemma 4 weights.

6. **Orchestrator routing is defined.** Four prompt classes mapped to model tiers with thinking/retrieval/tool-call configuration.

7. **Synthetic data is sufficient for Sprint 1.** 5 classroom profiles across grades 1–6, 5 lesson artifacts across subjects. Profiles vary in EAL load, EA availability, class size, and complexity factors.

## What breaks or is uncertain

1. **No real Gemma 4 inference yet.** Mock mode validates the harness interface but not actual model behavior. Sprint 1 must confirm at least one real model checkpoint works end-to-end.

2. **Model checkpoint names are provisional.** Used `google/gemma-4-4b-it` and `google/gemma-4-27b-it` based on roadmap's mention of E4B and 26B A4B variants. Exact HuggingFace identifiers need verification when model access is confirmed.

3. **No web UI yet.** `apps/web/` is placeholder only. Sprint 1 needs Vite+React scaffold.

4. **Storage backend not implemented.** Decision log records SQLite as the intended approach, but no code exists yet. Sprint 2 or 3 will need this for classroom memory.

5. **Eval cases not written yet.** The runner framework exists but has zero registered test cases. Sprint 1 must add differentiation eval cases.

## What to cut if time is tight

- Skip voice note input until Sprint 2+
- Skip image input in Sprint 1 differentiation (text-only first)
- Defer retrieval/memory to Sprint 3 as planned

## Sprint 1 scope recommendation

**Build the upload-to-differentiation loop:**
1. Scaffold Vite+React web app with artifact upload
2. Connect to orchestrator → inference harness (mock first, then real Gemma)
3. Generate 5 `DifferentiatedVariant` outputs from one artifact
4. Display side-by-side in UI
5. Add 5+ differentiation eval cases
6. Validate against at least 3 different synthetic artifacts

## Updated backlog

| Priority | Item | Target Sprint |
|----------|------|---------------|
| 1 | Upload + differentiation loop | Sprint 1 |
| 2 | Real Gemma 4 inference validation | Sprint 1 |
| 3 | Tomorrow plan generator | Sprint 2 |
| 4 | Tool-call execution layer | Sprint 4 (or 2 if natural) |
| 5 | Classroom memory + EmbeddingGemma | Sprint 3 |
| 6 | Family message + multilingual | Sprint 5 |
| 7 | Safety middleware + ShieldGemma | Sprint 7 |
| 8 | Eval dashboard + benchmarks | Sprint 8 |
| 9 | Demo packaging + Kaggle writeup | Sprint 9 |
