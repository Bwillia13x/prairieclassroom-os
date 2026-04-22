# Next-session brief — 2026-04-23 follow-up work

Paste this entire file as the opening message of a new Claude Code session. It is self-contained — assume zero prior context.

---

## Working directory + repo posture

Work inside `/Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev`. Read `CLAUDE.md` first.

**Before doing anything else, check the git posture:**
- If today's handoff-era diff is still uncommitted (proof validator refactor + permissive extractor tightening + new test file + spec + decision-log entry + README note), the user plans to run `/ultrareview` over it. **Do not commit or push.**
- If it has been committed (check with `git log --oneline | head -5`), proceed normally.

Primary no-cost validation lane is fully green as of 2026-04-22: `npm run test` (1830 pass), `npm run test:scripts` (11 pass), `npm run test:python` (69 pass), `npm run proof:check`, `npm run typecheck`, `npm run lint`, `npm run system:inventory:check` all clean. Do not re-run these speculatively at session start — they were the last thing the prior session did.

## What shipped in the prior session (reference, not work)

See `docs/decision-log.md` top-of-file 2026-04-22 entries:

1. **Proof validator derives from proof-brief.** `validateProofSurfaces` now extracts the canonical hosted artifact from the `Latest passing hosted gate:` line in `docs/hackathon-proof-brief.md` at runtime. Future hosted refreshes are a one-file edit. See `scripts/lib/hackathon-proof.mjs` and `scripts/lib/__tests__/hackathon-proof.test.mjs`.
2. **Permissive extractor tightened.** `extractHostedProofRunDir`'s preferred regex list now matches real doc formats (previously three of five patterns never fired and the function worked only via the repo-wide fallback).

## Task 1 — EA Briefing hosted latency re-verification (priority: first, needs user approval)

Carried over from the 2026-04-22 brief, Task 2. Previously deferred on budget grounds at the close of 2026-04-22. Full task description is in `docs/superpowers/handoff/2026-04-22-next-session-brief.md` under "Task 2." Short version:

- Goal: one targeted hosted smoke (`PRAIRIE_INFERENCE_PROVIDER=gemini PRAIRIE_SMOKE_CASES=ea-briefing npm run smoke:api`) to confirm the EA Briefing streaming fix (F2 from 2026-04-22) holds under real hosted Gemini latency.
- Guardrails: `<$20/day` hosted budget ceiling (per `CLAUDE.md`). Needs `PRAIRIE_GEMINI_API_KEY` + `PRAIRIE_ENABLE_GEMINI_RUNS=true`. **Explicit user approval required before execution — do not assume.** No retry on failure; if 504 or >120s, inspect `output/request-logs/` + eval summary and propose next step rather than rerunning.
- On pass: record latency in `docs/decision-log.md` as a verification postscript to the "Live-testing findings remediation" entry. Done.

## Task 2 — Intervention background enrichment (deferred, only on signal)

Unchanged from the 2026-04-22 brief. Only execute on: (a) teacher-pilot friction about empty `action_taken`, or (b) a downstream consumer actively treating empty `action_taken` as missing signal. No signal surfaced in the 2026-04-22 session. Full design sketch is in the 2026-04-22 brief, Task 3.

## Optional hygiene items (only if user requests)

These are logged in the 2026-04-22 decision-log entry as "Follow-up deferred" and are non-blocking:

- **Vitest `environmentMatchGlobs` → `test.projects` migration.** Non-trivial — the current flat config would split into ~2 project configs (node + jsdom), each duplicating includes and setupFiles. Deferred to a dedicated test-infra sprint. Do not tackle without an explicit user ask.

## Session boundaries (unchanged from 2026-04-22)

- Mock and local work: freely iterate.
- Hosted: Task 1 only, only with explicit user approval, only once per session.
- Follow brainstorming → spec → implement → verify → document flow.
- Every substantive change: typecheck + lint + test + proof:check + system:inventory:check where relevant.
- No commit unless the user explicitly asks.
- Tests: node:test for `scripts/lib/**` (runner: `npm run test:scripts`), vitest for everything else.

## Closing protocol (unchanged)

At session end, do **not** commit. Produce a concise summary + validation results + any new follow-ups.
