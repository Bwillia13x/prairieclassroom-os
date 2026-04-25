# 2026-04-22 Testing-Findings Remediation

## Context

Live Safari browser pass of the PrairieClassroom OS web app (using hosted Gemini) surfaced five teacher-trust issues:

1. **Internal model reasoning leaks into the teacher UI.** `StreamingIndicator` renders "Deep reasoning in progress…" and raw model thinking text; orchestrator emits "Consulted local classroom tools…" into the thinking stream.
2. **EA Briefing is not reliable enough for live use.** Plain POST with a static skeleton — 98s run ended in 502/504.
3. **Intervention logging is too slow for hallway capture.** 32s for a structured note; the teacher-facing copy is generic ("Structuring your intervention note…").
4. **`npm run proof:check` is broken.** `scripts/lib/hackathon-proof.mjs` hardcodes an older artifact path; canonical proof docs are split across old and newer references.
5. **Role persistence produces dead-ends on first open.** A persisted `reviewer` role for the demo classroom landed the session on a tab reviewers can't see (403-style dead-end).

This spec scopes a one-sprint remediation. Non-goals: new features, proof-lane refactor beyond the minimum.

## Design

### F1 — Teacher-safe progress copy

- **Phase labels** in `apps/web/src/components/StreamingIndicator.tsx`:
  - `thinking` → "Reviewing classroom context…"
  - `structuring` → "Preparing your plan…"
  - `complete` → "Ready"
- **Thinking-text display**: remove the default render. Gate behind an explicit operator toggle via `localStorage['prairie-debug-thinking'] === 'true'`. The "Model reasoning" label is removed; when the toggle is on, the section renders under a neutral "Working notes" label.
- **Orchestrator emit** (`services/orchestrator/inference-client.ts:834`): replace the tool-consultation text with `"Cross-checking classroom memory…"`. Since the UI no longer renders this by default, the change is dev-visible only.
- **Tests**: `StreamingIndicator.test.tsx` asserts new copy; thinking text hidden by default; visible when toggle set.

### F2 — EA Briefing streaming (mirror Tomorrow Plan)

- Extract `buildEABriefingPayload(deps, req, res, emit?, abortSignal?)` from `services/orchestrator/routes/ea-briefing.ts`.
- Keep `POST /api/ea-briefing` non-stream path (backwards compat).
- Add `POST /api/ea-briefing/stream` and `GET /api/ea-briefing/stream/:streamId/events` mirroring `tomorrow-plan.ts:189–220`.
- Auth: stream endpoints inherit `teacherEaOrSubstitute` scope (same as non-stream endpoint).
- `apps/web/src/api.ts` — add `streamGenerateEABriefing` using the same `streamRequestJson` wrapper as tomorrow-plan.
- `EABriefingPanel` switches to the stream API and replaces `SkeletonLoader` with `<StreamingIndicator label="Generating EA briefing" onCancel={reset} />`.
- **Tests**: new `ea-briefing.stream.test.ts` asserts SSE ready → thinking → complete and abort propagation.

### F3 — Intervention fast-local-save path

- New route `POST /api/intervention/quick` (registered in `server.ts` alongside the existing intervention router).
- Handler constructs an `InterventionRecord` deterministically from the request body:
  - `record_id`: `intv_${Date.now()}_${nanoid(6)}`
  - `observation`: `teacher_note` verbatim
  - `tags`: `[]`
  - `severity`: `"low"`
  - `follow_up_needed`: `false`
  - `next_step`: `null`
  - plus `student_refs`, `classroom_id`, `created_at`
- Persisted via `saveIntervention` with `model_id: "deterministic-quick"`; returns record + meta (target latency < 100ms).
- **No background model enrichment** in v1 — teachers edit the record later in the structured details disclosure if needed.
- **Wire-up**: `apps/web/src/api.ts::logInterventionQuick`; `InterventionPanel::handleQuickSubmit` routes QuickCaptureTray submissions to the quick endpoint; structured `<details>` disclosure keeps the full model-enriched path.
- **Tests**: `intervention.quick.test.ts` — no model call, record persisted, latency < 100ms, schema validates.

### F4 — Proof artifact resync

- Bump `scripts/lib/hackathon-proof.mjs` → `HOSTED_PROOF_RUN_DIR = "output/release-gate/2026-04-25T17-52-51-834Z-9428"` (constant subsequently advanced beyond the original 2026-04-22 artifact to the 2026-04-25 canonical artifact).
- Update in lockstep:
  - `README.md:169`
  - `docs/kaggle-writeup.md:72`, `:74`
  - `docs/demo-script.md:93`, `:94`
  - `docs/gemma-integration-followups.md:165`
  - `docs/pilot/claims-ledger.md:29`
- Eval summary path: `2026-04-21-gemini/2026-04-21T05-13-43-243Z-52665-gemini-summary.json` → `2026-04-25-gemini/2026-04-25T17-52-51-834Z-9428-gemini-summary.json` (advanced to the 2026-04-25 canonical artifact).
- Add `// TODO(follow-up)` at the constant pointing to future refactor: make `validateProofSurfaces` derive the required artifact from `extractHostedProofRunDir(surfaces)` rather than the hardcoded constant, so a single doc edit (in the proof-brief) propagates.
- **Tests**: `npm run proof:check` passes.

### F5 — Role-persistence dead-end escape

- Keep `classroomRoles` persistence in `localStorage` (honors intentional reviewer/EA testing).
- Add a top-level content banner (in `App.tsx`) that renders when `activeRole !== 'teacher'` AND the active tab is not readable for that role. The banner offers a primary "Switch to Teacher" action invoking `setClassroomRole(activeClassroom, 'teacher')`.
- Session-scoped demo convenience: on mount, if `activeClassroom === DEMO_CLASSROOM_ID` and `sessionStorage['prairie-demo-role-welcomed']` is missing, reset the demo classroom's role to `teacher` once, then set the flag. This resets only on fresh-session demo loads.
- **Tests**: `App.role-recovery.test.tsx` asserts banner renders on mismatch, action clears it, demo reset fires once per session.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run test:python`
- `npm run proof:check`
- `npm run system:inventory:check`

## Documentation

- `docs/decision-log.md` — 2026-04-22 entry noting the five decisions, link back to this spec.
- `docs/development-gaps.md` — mark any closed gaps.
- `docs/api-surface.md` and `docs/system-inventory.md` regenerate cleanly after route additions (`npm run system:inventory`).

## Out of scope

- Background enrichment of quick-path intervention records.
- Validator refactor to derive the canonical proof artifact from the proof-brief doc (noted as follow-up).
- New model-routed features.
- Redesign of the role selection UI beyond the dead-end escape banner.
