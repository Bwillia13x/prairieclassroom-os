# Sprint 11 Review — Zod Validation + Prompt Tuning (Staged)

**Sprint:** 11 — Zod validation layer
**Date:** 2026-04-03

42/42 evals passing. Zero TypeScript errors. Zero regressions.

## What works

1. **All 8 schema files converted to Zod.** Each exports both a Zod schema object (for runtime validation) and an inferred TypeScript type (for compile-time checking). All existing `import type` consumers are unaffected — the inferred types are structurally identical to the original interfaces.

2. **Request validation middleware covers all routes.** 9 Zod request schemas (8 routes + approve endpoint) validate every POST body before it reaches the route handler. Malformed requests return 400 with a structured `validation_errors` array listing specific field-level issues.

3. **Manual validation code eliminated.** The `as` type casts and `if (!field)` guard clauses in `server.ts` are replaced by the `validateBody()` middleware. The server code is shorter and the validation is more precise (Zod catches type mismatches, empty strings, and wrong enum values that the old manual checks missed).

4. **Drop-in replacement with zero downstream changes.** No changes to any orchestrator prompt builder, memory store/retrieve function, UI component, or eval case. The Zod migration is invisible to every consumer.

## What breaks or is uncertain

1. **Prompt tuning is deferred.** Real inference baseline is needed before prompt contracts can be iterated. The Zod output schemas exist and are ready for response validation when that work happens.

2. **Response validation not yet wired.** The Zod schemas can validate model output, but response-side validation (warn on invalid output, don't block) is deferred to keep scope tight. The parsers in each prompt builder still handle this.

## Sprint deliverables

| Deliverable | File | Status |
|-------------|------|--------|
| Zod schema: classroom | `packages/shared/schemas/classroom.ts` | Complete |
| Zod schema: artifact | `packages/shared/schemas/artifact.ts` | Complete |
| Zod schema: plan | `packages/shared/schemas/plan.ts` | Complete |
| Zod schema: intervention | `packages/shared/schemas/intervention.ts` | Complete |
| Zod schema: message | `packages/shared/schemas/message.ts` | Complete |
| Zod schema: language | `packages/shared/schemas/language.ts` | Complete |
| Zod schema: briefing | `packages/shared/schemas/briefing.ts` | Complete |
| Zod schema: pattern | `packages/shared/schemas/pattern.ts` | Complete |
| Barrel export update | `packages/shared/schemas/index.ts` | Complete |
| Request validation | `services/orchestrator/validate.ts` | Complete (9 schemas + middleware) |
| Server wiring | `services/orchestrator/server.ts` | Complete (all routes validated) |
| Zod dependency | `package.json` | Added (zod ^4.3.6) |

## Eval impact

42/42 evals remain green. No new evals — this sprint is infrastructure, not features.

## What to do next

- **Sprint 12:** Auth, error recovery, housekeeping, demo student dropdown.
- **When credentials land:** Run eval baseline, then iterate prompt contracts using the Zod output schemas for response validation.
