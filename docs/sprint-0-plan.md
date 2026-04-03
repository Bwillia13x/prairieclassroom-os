# Sprint 0 Plan

**Sprint:** 0 — Frame the system correctly
**Date:** 2026-04-02
**Goal:** Freeze the product thesis, stand up the development skeleton, and validate readiness for Sprint 1.

## Objectives

1. Lock the product thesis and implementation boundaries
2. Create the monorepo structure per roadmap guidance
3. Codify data contracts as typed schemas
4. Stand up the Gemma 4 inference harness (mock mode + local mode stub)
5. Create the orchestrator skeleton with prompt class routing
6. Bootstrap the eval runner framework
7. Expand synthetic classroom data for Sprint 1 evals
8. Fill the prompt routing table
9. Document all architectural decisions

## Deliverables

| Deliverable | Status |
|-------------|--------|
| Monorepo directory structure | Done |
| `packages/shared/schemas/` — typed data contracts | Done |
| `services/inference/harness.py` — Gemma harness with mock + local backends | Done |
| `services/orchestrator/router.ts` + `types.ts` — prompt routing scaffold | Done |
| `evals/runner.ts` — eval execution framework | Done |
| Synthetic data: 5 classroom profiles, 5 lesson artifacts | Done |
| `docs/prompt-routing-table.md` — filled routing table | Done |
| `docs/sprint-0-plan.md` — this file | Done |
| `docs/sprint-0-review.md` — sprint review | Done |
| Updated `docs/decision-log.md` | Done |
| `.gitignore`, `package.json`, `tsconfig.json` | Done |

## Sprint 1 readiness criteria

Before starting Sprint 1, confirm:
- [ ] `python services/inference/harness.py --mode mock --smoke-test` passes 4/4
- [ ] TypeScript schemas compile without errors
- [ ] At least 5 synthetic artifacts exist for differentiation testing
- [ ] Routing table covers all four prompt classes
- [ ] Decision log captures runtime, storage, and model checkpoint choices

## First end-to-end demo loop (Sprint 1 target)

**User input:** Teacher uploads a lesson artifact (text or image of a worksheet).
**Orchestrator:** Classifies as `differentiate_material`, selects live model route.
**Model invocation:** Gemma 4 small model (4B-it) generates 5 structured variants.
**Output:** JSON array of `DifferentiatedVariant` objects displayed side-by-side.
**Persistence:** Artifact + variants stored locally.
**Eval criteria:** All 5 variants conform to schema, are genuinely distinct, and would be usable by a teacher.

## Gemma 4 model placement (Sprint 0 mapping)

| Task | Model | Tier | Thinking | Retrieval |
|------|-------|------|----------|-----------|
| Differentiate material | gemma-4-4b-it | Live | Off | No |
| Tomorrow plan | gemma-4-27b-it | Planning | On | Yes |
| Family message | gemma-4-4b-it | Live | Off | No |
| Log intervention | gemma-4-4b-it | Live | Off | No |

**Later slots:**
- EmbeddingGemma → retrieval pipeline (Sprint 3)
- ShieldGemma → safety filtering layer (Sprint 7)
- FunctionGemma → potential routing optimization (Sprint 10 stretch)
