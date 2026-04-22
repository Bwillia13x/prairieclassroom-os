# Next-session brief — 2026-04-22 follow-up work

Paste this entire file as the opening message of a new Claude Code session. It is self-contained — assume the new session has zero prior context.

---

## Working directory + repo posture

Work inside `/Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev`. That is the git repository; the parent `Prairie_Complexity/` directory is just a workspace holder.

Read these first, in this order:
1. `CLAUDE.md` (repo root) — product boundaries, cost guardrails, validation rules.
2. `docs/superpowers/specs/2026-04-22-testing-findings-remediation-design.md` — the spec that shipped in the previous session.
3. `docs/decision-log.md` — the `2026-04-22 — Live-testing findings remediation (5 findings)` entry at the top.

The previous session landed F1–F5 (teacher-safe progress copy, EA Briefing streaming, intervention fast-path, proof artifact resync, role-persistence escape banner) with 1830/1830 vitest tests passing, `proof:check` green, and `system:inventory:check` green. Nothing was committed — the user runs `/ultrareview` over the aggregated local diff at the end of the day and only then decides on a commit + PR. **Do not commit or push in this session unless the user explicitly asks.**

## User profile and working style

- Pre-PMF founder. Delegates full sprints autonomously once a decisive proposal is approved.
- Prefers one decisive recommendation + the main tradeoff, not a menu.
- Honors the zero-cost default: mock and Ollama are free iteration lanes; hosted Gemini runs are budget-bounded at <$20/day and require the `PRAIRIE_GEMINI_API_KEY` + `PRAIRIE_ENABLE_GEMINI_RUNS=true` gates. **Never** spin up paid Vertex or external GPUs without an explicit override.
- Memory notes that are load-bearing for this work:
  - Always `grep apps/web/src/styles/tokens.css` before using `--color/--space/--font/--shadow` tokens; invented tokens silently fail.
  - Prefer `getByTestId` over `getByRole` in `smoke-browser.mjs`.

## Task 1 — Proof validator refactor (bounded, no-cost, priority: do this first)

Context. The previous session bumped `HOSTED_PROOF_RUN_DIR` in `scripts/lib/hackathon-proof.mjs:14` from `2026-04-21T05-13-43-243Z-52665` to `2026-04-22T02-16-16-557Z-74236` and manually synchronized six proof surfaces (README.md, docs/kaggle-writeup.md, docs/demo-script.md, docs/gemma-integration-followups.md, docs/pilot/claims-ledger.md, docs/hackathon-proof-brief.md, docs/hackathon-hosted-operations.md, docs/eval-baseline.md). That fan-out will recur on every hosted refresh. The validator already has the machinery to avoid it — see `extractHostedProofRunDir(surfaces)` in the same file — but `validateProofSurfaces` still checks every doc against the hardcoded constant.

Goal. Make `docs/hackathon-proof-brief.md` the single source of truth for the canonical hosted proof artifact, so a future refresh is a one-file edit.

Design.
1. In `scripts/lib/hackathon-proof.mjs`, change `validateProofSurfaces(surfaces)` so the required-substring check uses the value returned by `extractHostedProofRunDir(surfaces)` (preferred-extractions list already favors the proof-brief's `Latest passing hosted gate:` line). Keep `HOSTED_PROOF_RUN_DIR` exported as a fallback for callers that don't pass surfaces (e.g., the `readHostedProofSummary` helper), but no longer require it to appear in docs.
2. If the extracted value is missing or doesn't start with `output/release-gate/`, surface a clear issue ("could not extract canonical artifact from proof-brief doc") rather than falling back silently.
3. Update the comment on `HOSTED_PROOF_RUN_DIR` to note that the constant is now only a fallback seed for test shims and `readHostedProofSummary` callers — docs derive from the proof-brief.
4. Add a unit test in `scripts/__tests__/hackathon-proof.test.mjs` (create the file if it doesn't exist; check the scripts/ layout first). Cases:
   - Happy path: all docs reference the same artifact as the proof-brief → `ok: true`.
   - Drift: one doc references an older artifact → `ok: false` with an issue mentioning the drifting doc path and the expected substring.
   - Missing proof-brief line: → `ok: false` with the "could not extract" issue.
5. Verify `npm run proof:check` still passes after the refactor.
6. Optional mini-benefit: add a one-liner to `README.md` Release-Gate section explaining that future hosted refreshes only need to edit the "Latest passing hosted artifact" line in the proof-brief.

Acceptance:
- `npm run proof:check` still green.
- New unit test file passes; the drift case demonstrates the validator would catch a future one-doc-missing update.
- `docs/superpowers/specs/` gains a short (half-page) spec document for this refactor before coding, per the user's brainstorming→spec→implement flow.
- Update `docs/decision-log.md` with a brief 2026-04-22 (or next-date) follow-up entry explaining that the proof validator now derives from the proof-brief.

Validation commands to run:
- `npm run typecheck`
- `npm run lint`
- `npm run test` (targeted: `npx vitest run scripts/__tests__/hackathon-proof.test.mjs` first, then full)
- `npm run proof:check`
- `npm run system:inventory:check`

## Task 2 — EA Briefing hosted latency re-verification (budget-bounded, priority: second, needs user approval)

Context. F2 in the previous session adopted the Tomorrow Plan streaming pattern for EA Briefing so the teacher sees progressive phase updates instead of a static skeleton. The change is structural — streaming SSE end-to-end, with abort propagation and the same `buildEABriefingPayload` helper as before. Local integration tests pass (`services/orchestrator/__tests__/integration.test.ts` covers both the non-stream POST and the 202 stream-start response). What the previous session could **not** cover is whether the streaming actually arrives in time under real hosted Gemini latency — the original testing failure was a 98-second run ending in 504 DEADLINE_EXCEEDED.

Goal. Verify that the streamed EA Briefing either completes within 90s on hosted Gemini, or fails fast with a visible teacher-safe error rather than a silent 502/504.

**Before running anything:** ask the user to confirm this hosted run is in-budget for the day and that they want you to execute it. Do not assume approval. Reference the `$20/day` hard rule in `CLAUDE.md`. If the user declines, park this task and document the reason.

If approved, run the cheapest-viable sequence:
1. `npm run proof:check` (sanity).
2. `npm run gemini:readycheck` (confirms API key + `PRAIRIE_ENABLE_GEMINI_RUNS=true` are set; do not proceed if missing).
3. `PRAIRIE_INFERENCE_PROVIDER=gemini PRAIRIE_SMOKE_CASES=ea-briefing npm run smoke:api` — this is the **targeted** one-case hosted smoke, not the full release gate. Cheap and sufficient for the latency question.
4. Inspect `output/evals/*-gemini/` for the most recent EA Briefing results and note latency.
5. If the smoke passes within 90s and no 504 appears: the fix holds. Write the finding into `docs/decision-log.md` under the 2026-04-22 entry as a verification postscript. Done.
6. If the smoke fails with a 504 or exceeds 120s: do not retry hosted. Inspect the orchestrator request logs (`output/request-logs/`) and the eval failure summary to identify the latency driver. Draft a next-step proposal (likely candidates: prompt compression, retrieval trimming, move to live tier, fall back to deterministic synthesis from existing Tomorrow Plan + Forecast state). Bring the proposal back to the user before any further hosted run.

Acceptance:
- User explicitly approved the hosted run before execution.
- If passed: latency recorded in the decision log and a sentence confirming the EA Briefing streaming fix holds under real hosted Gemini.
- If failed: a proposal document, not another hosted retry.

Budget discipline: if this task's hosted run is refused or fails, **do not iterate** on hosted. Move on.

## Task 3 — Intervention background enrichment (deferred, only on signal)

Context. F3 ships the deterministic quick-capture path (`POST /api/intervention/quick`, no model call, <100ms) and intentionally leaves `action_taken` empty so teachers later enrich via the structured-details form. The design brief deferred background enrichment because it adds a concurrency surface (double-write ordering, re-validation, error recovery) without clearly outperforming the structured-form fallback.

**Only execute this task if the user reports one of the following signals:**
- A teacher pilot where empty `action_taken` in EA briefings, pattern reports, or forecasts is producing real friction.
- Any downstream consumer (family message, support-patterns retrieval, EA load) actively treating empty `action_taken` as missing signal.

If neither signal is present, skip this task and report "deferred — no signal yet" in the session summary.

If the user signals go: the design is ~30 lines in `services/orchestrator/routes/intervention.ts`. Sketch:
1. After the quick record persists and the response is returned, use `setImmediate` (or `queueMicrotask` plus a background promise) to call the same prompt builder + inference flow the full `/api/intervention` path uses, keyed to the already-saved `record_id`.
2. Patch the record via a new `updateInterventionEnrichment(recordId, enrichment)` function in `services/memory/store.ts` that merges `tags`, `action_taken`, `outcome`, `follow_up_needed`, and `severity` onto the existing row. Only fill fields that were left empty/default in the quick save.
3. Log enrichment outcomes to the existing request-log pipeline with a distinct `detail_code` (e.g., `intervention_enriched_background`) so admin tooling can count success rate.
4. Tag enriched rows by updating `model_id` from `deterministic-quick` to `deterministic-quick-enriched` so the audit trail can distinguish the two-phase path from a straight-through model run.
5. Test coverage: integration test that asserts the quick POST returns in <100ms *and* the background enrichment eventually patches the record within a timeout (use fake timers; don't wait on real model latency).
6. Failure behavior: if the background model call fails, leave the original quick record intact, log a warning, and do **not** retry. The teacher can manually enrich through the structured form.

Acceptance:
- Quick path still returns in <100ms and still passes its existing integration test unchanged.
- Background enrichment is visible in the DB within a bounded timeout when it succeeds, and silently abandoned on failure.
- No double-write: the enrichment only patches fields that were left empty, never clobbers teacher-entered structured-form values.

## Session boundaries

- Mock and local work: freely iterate. Hosted: only Task 2, only with explicit user approval, only once per session.
- Follow the brainstorming → spec → plan → implement → verify → document flow from the previous session. If scope expands mid-task, **stop and confirm** rather than drift.
- Validation is non-negotiable: every merged change runs at least `typecheck` + `lint` + `test` + `proof:check` + `system:inventory:check` where relevant.
- Documentation hygiene: every substantive change closes with a decision-log entry, system-inventory regeneration if the API surface moved, and at least one test.
- Tests are mostly flat files under `__tests__/` directories next to the source they cover. No supertest dependency — integration tests use `fetch` against an `express().listen(0)` instance (see `services/orchestrator/__tests__/integration.test.ts` for the canonical pattern).

## Closing protocol

At the end of the session, do **not** commit. Produce:
1. A concise summary of what shipped and what was deferred.
2. Validation results for every changed surface.
3. A list of any new follow-ups surfaced during the session that weren't in this brief.

The user will run `/ultrareview` over the accumulated diff across sessions once the day's work is complete.
