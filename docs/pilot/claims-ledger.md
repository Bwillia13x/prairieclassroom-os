# PrairieClassroom OS — Public Claims Ledger

**Purpose:** Track every public-facing claim about PrairieClassroom OS against the evidence that does or does not support it. This is the project's honesty ledger — it exists so that when someone asks "what can you actually claim about this system?", the answer is one file away.

**Format:** Every row has a claim, a status, a supporting artifact reference (if any), and a "last reviewed" date. When evidence changes, update the row — don't rewrite history.

**Status vocabulary:**

- **supported** — there is an artifact in the repo or the pilot folder that directly supports this claim.
- **partially supported** — there is an artifact, but it supports a weaker version of the claim than the public copy says.
- **unsupported** — no artifact. The claim may still be true but cannot be said publicly.
- **contradicted** — an artifact exists that *disagrees* with the claim. Public copy must be changed.
- **retired** — the claim is no longer made publicly.

Rows are not rewritten when status changes. Add a new row with the new status and date, and mark the old one with a ← superseded pointer.

---

## Architecture & engineering claims

| Claim | Status | Evidence | Reviewed |
|---|---|---|---|
| Runs 13 model-routed prompt classes | supported | `docs/system-inventory.md`, `services/orchestrator/router.ts` | 2026-04-12 |
| Has a Vite + React teacher UI with 12 primary panels | supported | `docs/system-inventory.md`, `apps/web/src/panels/` | 2026-04-12 |
| Enforces safety boundaries (no diagnosis, no discipline scoring, no surveillance) in the prompt builders | supported | `docs/safety-governance.md`, `services/orchestrator/prompt-safety.ts`, test suite assertions | 2026-04-12 |
| Has an integrated mock/Ollama/Gemini inference lane design | supported | `services/inference/harness.py`, `docs/eval-baseline.md` | 2026-04-12 |
| Mock-mode release gate passes consistently | supported | `output/release-gate/` artifacts | 2026-04-12 |
| Hosted Gemini release gate passes on synthetic/demo data | supported | `docs/eval-baseline.md`, `output/release-gate/2026-04-09T14-26-54-338Z-54148/` | 2026-04-12 |
| Ollama lane passes end-to-end on a real host | unsupported | No artifact. Ollama is not installed on the current maintenance host and Gemma 4 models are not present. | 2026-04-12 |
| Ollama lane is *feasible* on the current maintenance host | contradicted | Non-destructive `host:preflight:ollama` run on 2026-04-12 (artifact `output/host-preflight/2026-04-12T16-10-14-124Z.json`) reported 8.00 GiB total RAM, 0.11 GiB free RAM, and 6.76 GiB free disk. The planning-tier 27B Gemma model requires substantially more than 8 GiB RAM for any reasonable quantization and substantially more than 6.76 GiB free disk for the weights alone. The 4B live-tier model may still be runnable on this host. The 27B planning-tier model is **hardware-infeasible** on this host regardless of whether Ollama is installed. | 2026-04-12 |
| Has per-classroom retention policy governance with audit artifacts | supported | `packages/shared/schemas/classroom.ts` (`RetentionPolicySchema`), `scripts/memory-admin.mjs` (`prune` command), `output/memory-admin/*-prune-tombstone.json` example artifact | 2026-04-12 |
| Has per-request access audit logging with classroom role and auth outcome | supported | `services/orchestrator/request-context.ts` (`buildRequestLogRecord`), `scripts/audit-log.mjs`, `output/access-audit/` example artifact | 2026-04-12 |
| Enforces per-classroom SQLite memory isolation with versioned migrations | supported | `services/memory/db.ts`, `services/memory/migrations/`, `services/memory/__tests__/migrate.test.ts` | 2026-04-12 |
| Surfaces a panel-level "mock fixture output" notice on every generation surface so teachers cannot mistake mock fixtures for real model behavior | supported | `apps/web/src/components/MockModeBanner.tsx` mounted on FamilyMessage, Differentiate, TomorrowPlan, EABriefing, Forecast, SupportPatterns, SurvivalPacket, LanguageTools (simplify + vocab), Intervention, and EALoad panels with per-panel hints; `MockModeBanner.test.tsx` covers render gating | 2026-04-17 |
| Provides a one-command pilot reset (`npm run pilot:reset`) that purges and re-seeds the demo classroom to a known state with an audit tombstone | supported | `scripts/pilot-reset.mjs`; refuses non-demo classroom ids by default; writes tombstone artifact to `output/pilot/`; verified end-to-end against `data/demo/seed.ts` on 2026-04-17 (42 interventions, 3 plans, 1 pattern report, 1 approved family message) | 2026-04-17 |
| Provides a one-command pilot bootstrap (`npm run pilot:start`) that brings up inference + orchestrator + web in parallel with health checks | supported | `scripts/pilot-start.mjs`; defaults to mock lane; supports `--inference ollama`; deliberately blocks hosted lanes which require credentials and budget review; clean Ctrl-C shutdown | 2026-04-17 |
| Has a teacher-facing cold-start protocol that lets a participant walk through the system without maintainer help | supported | `docs/pilot/cold-start-protocol.md`; 8 deterministic scenarios with click-by-click steps, "what you should see" baselines, and "what to notice" friction prompts; aligned with the maintainer structured-walkthrough scenario set | 2026-04-17 |
| Surfaces a per-output retrieval trace on planning-tier responses so teachers can verify the system actually read their classroom memory | supported (3 of 7 retrieval-backed routes) | `packages/shared/schemas/retrieval-trace.ts`; `services/orchestrator/retrieval-trace.ts`; `apps/web/src/components/RetrievalTraceCard.tsx` mounted on TomorrowPlanPanel, EABriefingPanel, SupportPatternsPanel; trace lists source type, record id, age, and excerpt — explicitly framed as "what was retrieved, not what the model used"; verified end-to-end against the seeded demo classroom (9 citations on the tomorrow-plan route) | 2026-04-17 |

## Usefulness / outcome claims

| Claim | Status | Evidence | Reviewed |
|---|---|---|---|
| "Validated by Alberta teachers" | unsupported | No real teacher has walked through the system in a structured pilot. Do not make this claim. | 2026-04-12 |
| "Reduces teacher prep time" | unsupported | Intuitively plausible, no measurements. Do not make this claim. | 2026-04-12 |
| "Improves EA coordination" | unsupported | The EA briefing and EA load balancer features exist; no evidence they actually improve coordination in a real classroom. | 2026-04-12 |
| "Usable mid-class by a busy teacher" | unsupported | The interface was designed with this in mind but no teacher has confirmed it in a real mid-class moment. | 2026-04-12 |
| "Surfaces friction points at hackathon pace" (as a design tool for the maintainer) | partially supported | `docs/structured-walkthrough-v1.md` is an explicit maintainer self-walkthrough, not human validation. It surfaces friction credibly for the maintainer but not for any real teacher. | 2026-04-12 |
| "Produces family messages in Alberta-regional languages" | partially supported | 18 `msg-lang-*` eval cases exist covering Punjabi, Tagalog, Mandarin, French, Arabic, Ukrainian. They were authored but **not yet run against a hosted model** — they will run on the next hosted-Gemini refresh. Until then, the claim is "we have coverage prepared, not confirmed." | 2026-04-12 |

## Safety & governance claims

| Claim | Status | Evidence | Reviewed |
|---|---|---|---|
| Refuses to produce diagnostic language | partially supported | Prompt builders include explicit rules. Eval cases (`*-004-safety-boundaries`, `*-safety`) verify refusal on mock and hosted. No adversarial red-teaming has been performed. | 2026-04-12 |
| Ignores prompt-injection attempts in user-supplied content | partially supported | 6+ prompt-injection eval cases (`diff-008`, `plan-010`, `msg-007`, `pat-008`, `surv-006`, `eal-003`, etc.) verify the system stays in scope on synthetic injection attempts. Not exhaustive. | 2026-04-12 |
| Human-in-the-loop approval for family messages | supported | `services/orchestrator/routes/family-message.ts` approval route, `docs/safety-governance.md` | 2026-04-12 |
| Demo classroom bypasses auth by design (for judging) | supported | `services/orchestrator/auth.ts:67`, `docs/api-surface.md` | 2026-04-12 |
| Hosted Gemini lane is prohibited from real classroom data | supported | `docs/safety-governance.md`, `CLAUDE.md`, `docs/pilot-readiness.md`, demo-only fixtures | 2026-04-12 |
| Access audit log records who accessed which classroom record, when, under which role | supported | `services/orchestrator/request-context.ts:buildRequestLogRecord`, `docs/pilot/participant-brief.md`, pilot can verify via `npm run audit:log` | 2026-04-12 |

## Deployment / operational claims

| Claim | Status | Evidence | Reviewed |
|---|---|---|---|
| Runs privacy-first locally on commodity Alberta hardware via Ollama + Gemma 4 | unsupported | Design intent, not demonstrated. Ollama lane has never passed end-to-end on the maintenance host, and the 2026-04-12 preflight showed the maintenance host cannot fit the 27B planning-tier weights on 8 GiB RAM regardless. "Commodity Alberta hardware" must explicitly mean "≥ 16 GiB RAM and ≥ 40 GiB free disk" to support the dual-speed architecture; the public claim should not describe 8-GiB MacBook Airs as a target. | 2026-04-12 |
| Default budget-capped to $20/day for hosted model spend | supported | `CLAUDE.md` cost guardrails, `scripts/gemini-readycheck.mjs` | 2026-04-12 |
| Ready for a bounded real-classroom pilot | unsupported | `docs/pilot-readiness.md` still lists substitute/reviewer dedicated views and human-validation artifacts as remaining blockers. | 2026-04-12 |

---

## How to maintain this ledger

1. **Before making a new public claim**: add a row here *first*. If you can't cite an artifact, don't make the claim.
2. **After a pilot session**: update the relevant rows. A session that supports a claim moves its status forward; a session that contradicts one moves it to `contradicted` and forces public copy to change.
3. **Before each release / demo**: the person running the demo skims this ledger and checks that nothing they're about to say on stage is listed as `unsupported` or `contradicted`.
4. **When in doubt, downgrade**: partial support is the honest answer for most intent-flavored claims. `partially supported` is not a failure — it's a realistic position.

A claim that never makes it onto this ledger is not a claim the project can stand behind publicly.

---

*Public Claims Ledger v1. Companion to `participant-brief.md`, `observation-template.md`, `usefulness-rubric.md`, `session-log-template.md`, `incident-log.md`.*
