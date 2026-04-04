# Sprint 11 Plan — Zod Validation + Prompt Tuning (Staged)

## Goal

Add runtime input validation at the API boundary using Zod. Convert all 8 TypeScript interface schemas to Zod schemas. Stage prompt tuning infrastructure for when real inference credentials are available.

## User story

As a teacher using the system, when I submit a malformed request (missing fields, wrong types), I want a clear 400 error with specific field-level messages — not a crash or garbage output.

## Why this sprint

1. Zod validation is fully independent of inference credentials and provides immediate hardening.
2. The schema conversion is the highest-leverage code quality improvement identified in the state assessment.
3. Validating request bodies at the API boundary prevents malformed data from reaching the inference layer.

## Changes

### 1. Zod schema conversion (`packages/shared/schemas/*.ts`)

Convert all 8 schema files from TypeScript interfaces to Zod schemas:
- Each file exports both the Zod schema object (`FooSchema`) and the inferred type (`type Foo`)
- All existing `import type` consumers are unaffected — the inferred types are identical
- Barrel export in `index.ts` updated to export both schemas and types

### 2. Request validation schemas (`services/orchestrator/validate.ts`)

New file with Zod schemas for all 8 POST route request bodies + a reusable `validateBody()` middleware factory.

### 3. Validation middleware wiring (`services/orchestrator/server.ts`)

All 8 POST routes + the approve endpoint use `validateBody()` middleware. Manual `as` casts and `if (!field)` checks replaced by Zod validation that returns 400 with structured `validation_errors` array.

### 4. Prompt tuning (deferred)

Prompt contract changes are staged for when eval baseline results from real inference are available. No prompt changes in this sprint.

## What this sprint does NOT include

- Prompt contract iteration (requires real inference baseline)
- Response validation (output warning layer — deferred to keep scope tight)
- Authentication (Sprint 12)
- UI changes (none needed)

## File changes

| Layer | Files | What |
|-------|-------|------|
| Schemas | `packages/shared/schemas/*.ts` (8 files) | Interface → Zod conversion |
| Schemas | `packages/shared/schemas/index.ts` | Export both schemas and types |
| Validation | `services/orchestrator/validate.ts` | New: request body schemas + middleware |
| Server | `services/orchestrator/server.ts` | Apply validation middleware to all routes |
| Deps | `package.json` | Add `zod` dependency |
| Docs | `docs/sprint-11-plan.md`, `sprint-11-review.md`, `decision-log.md` | Sprint docs + ADR |

## Eval impact

No new evals. Existing 42 must remain green — Zod schemas produce identical types.
