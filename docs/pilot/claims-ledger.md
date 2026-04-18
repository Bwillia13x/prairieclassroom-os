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
| Surfaces a per-output retrieval trace on planning-tier responses so teachers can verify the system actually read their classroom memory | supported (all 7 retrieval-backed routes) | `packages/shared/schemas/retrieval-trace.ts`; `services/orchestrator/retrieval-trace.ts` (citation builders for plan, intervention, pattern_report, forecast, scaffold_review, survival_packet, family_message); `apps/web/src/components/RetrievalTraceCard.tsx` mounted on TomorrowPlanPanel, EABriefingPanel, SupportPatternsPanel, ForecastPanel, EALoadPanel, and SurvivalPacketPanel; `detect_scaffold_decay` emits the trace on its response (no dedicated frontend panel yet — `ScaffoldDecayResponse` type in `apps/web/src/types.ts` reserves the contract); trace lists source type, record id, age, and excerpt — explicitly framed as "what was retrieved, not what the model used"; verified end-to-end against the seeded demo classroom (9 citations on the tomorrow-plan route); citation-builder matrix locked by `services/orchestrator/__tests__/retrieval-trace.test.ts` | 2026-04-17 |
| Enforces a dedicated substitute view that is read-only on today / EA briefing / latest forecast / debt-register / classroom profile and write-enabled only for log_intervention (plus session telemetry) — bounded so the covering teacher cannot accidentally generate tomorrow's plan, approve family messages, or regenerate the survival packet | supported | Scope matrix in `services/orchestrator/__tests__/auth.test.ts` (`SCOPE_MATRIX` + per-endpoint allow/deny cases); server-side enforcement in `services/orchestrator/server.ts` mount-level middleware plus per-route `requireRoles` gates in `routes/today.ts`, `routes/debt-register.ts`, `routes/ea-briefing.ts`, `routes/intervention.ts`, `routes/forecast.ts` (GET latest), `routes/sessions.ts`; role scope columns in generated `docs/api-surface.md`; client-side tab visibility and per-capability helpers in `apps/web/src/appReducer.ts` (`TAB_META.roles`, `getVisibleTabs`) and `apps/web/src/hooks/useRole.ts` (`canGenerate`, `canApproveMessages`, `canLogInterventions`); downgrade confirmation dialog in `apps/web/src/components/RoleContextPill.tsx`; panel-level `RoleReadOnlyBanner` explains what is blocked with role-specific copy | 2026-04-17 |
| Enforces a dedicated reviewer view that is fully read-only — exposing plan / message / intervention / pattern history, latest pattern report, latest forecast, debt-register, and aggregated feedback/session summaries — with no write, generation, or approval access on any route | supported | Scope matrix in `services/orchestrator/__tests__/auth.test.ts` locks `reviewer` deny on every POST and PUT endpoint and allow on the documented read-only surfaces; server-side per-route `requireRoles` gates in `routes/history.ts`, `routes/support-patterns.ts` (GET latest), `routes/forecast.ts` (GET latest), `routes/debt-register.ts`, `routes/feedback.ts` (GET summary), `routes/sessions.ts` (GET summary); role scope columns in generated `docs/api-surface.md`; client-side tab visibility in `apps/web/src/appReducer.ts` hides operational surfaces (today, differentiate, language-tools, ea-briefing, ea-load, survival-packet) from reviewer; `roleCapabilities("reviewer")` returns `canWrite: false` across every write capability | 2026-04-17 |
| Ships a reusable safety-artifact review template and five completed per-prompt-class reviews that enumerate what was checked, what was out of scope, and what remains gating before real-data pilot use | supported | `docs/pilot/safety-artifact-review-template.md` (template + 10-check checklist + required §5 "Out of scope" + §8 approval block); completed reviews at `docs/pilot/safety-artifacts/draft_family_message.md`, `detect_support_patterns.md`, `forecast_complexity.md`, `generate_survival_packet.md`, `detect_scaffold_decay.md`. Each review cites the governing `<prompt>-00X-safety-boundaries` and `<prompt>-00X-prompt-injection` fixtures, names specific gating follow-ups, and explicitly states whether the real-data gate is `approved`, `approved-with-followups`, or `blocked`. Reviews are pre-pilot and self-reviewed by the maintainer; pilot-coordinator countersign is the next required step. | 2026-04-17 |
| Ships rehearsable incident-response drill scripts covering the five S1/S2 incident categories the project can anticipate, each with a scripted drill path, a runbook for a real event, and "what good / bad looks like" criteria | supported | `docs/pilot/incident-drills/` — `README.md` (common preconditions, drill index, drill history), `drill-01-wrong-adult-exposure.md` (S1, access/privacy; tests server-enforced role scope via curl), `drill-02-hosted-lane-real-data.md` (S1, privacy; tests lane-kill path and claim-downgrade protocol), `drill-03-diagnostic-language-output.md` (S1, safety; tests eval-fixture-first fix discipline), `drill-04-unapproved-family-message.md` (S1, safety; tests approval gate + family-retrieval protocol), `drill-05-memory-corruption.md` (S2/S1, data-integrity; tests backup-restore + forensic-snapshot protocol). Each drill ends with "follow-up artifacts this drill may produce" so that a rehearsal run is not performative — it either confirms the runbook or produces a concrete issue. Drill history is empty and will be populated as drills are rehearsed before the first real-data session. | 2026-04-17 |

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
| Ready for a bounded real-classroom pilot | unsupported | The substitute/reviewer dedicated views, the 5 per-prompt-class safety-artifact reviews, and the 5 incident-response drill scripts all landed on 2026-04-17 (see the rows above). The structural and documentation blockers in `docs/pilot-readiness.md` are now effectively down to what cannot be produced without a real teacher: an active human-validation evidence plan with at least one completed session, pilot-coordinator countersign on each safety-artifact review, and at least one rehearsal of each of drills 1-5. A real teacher walkthrough remains the single biggest missing piece — the project is code-complete for a first real-data session; it needs the session. | 2026-04-17 |

---

## How to maintain this ledger

1. **Before making a new public claim**: add a row here *first*. If you can't cite an artifact, don't make the claim.
2. **After a pilot session**: update the relevant rows. A session that supports a claim moves its status forward; a session that contradicts one moves it to `contradicted` and forces public copy to change.
3. **Before each release / demo**: the person running the demo skims this ledger and checks that nothing they're about to say on stage is listed as `unsupported` or `contradicted`.
4. **When in doubt, downgrade**: partial support is the honest answer for most intent-flavored claims. `partially supported` is not a failure — it's a realistic position.

A claim that never makes it onto this ledger is not a claim the project can stand behind publicly.

---

*Public Claims Ledger v1. Companion to `participant-brief.md`, `observation-template.md`, `usefulness-rubric.md`, `session-log-template.md`, `incident-log.md`.*
