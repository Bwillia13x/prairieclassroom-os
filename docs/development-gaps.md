# Development Gaps — PrairieClassroom OS

**Audit date:** 2026-04-10
**Audited state:** Post-production hardening sprint
**Purpose:** Keep the remaining backlog aligned with what the repo can prove today, without repeating stale gaps that are already closed.

## Current posture

- Comprehensive unit test coverage: 500+ tests across schema validation (166), prompt builders (12 builders + parsers), orchestrator routes, memory retrieval, and inference backends.
- Security hardened: classroomId path traversal validation, rate limiting (global + auth-scoped), security headers, input sanitization, prompt injection detection.
- Resilience hardened: safe JSON deserialization in all 15 memory retrieval paths, health endpoint timeout, atomic schedule writes.
- Documentation current: architecture.md rewritten to match implemented system, three new reference docs (database-schema.md, classroom-profile-schema.md, eval-inventory.md), decision log updated through 2026-04-10.
- Accessibility audited: ARIA attributes verified across 60+ components, minor gaps fixed.
- The no-cost default is explicit: mock and Ollama are the supported local validation lanes. Paid Vertex validation remains optional and blocked unless explicitly enabled.

## Priority map

| Priority | Gap | Status | Why it still matters |
|----------|-----|--------|----------------------|
| **G-01** | Hosted Gemini proof maintenance | Closed for current hackathon proof | The hosted Gemma 4 submission lane is now proven on synthetic/demo data; the remaining work is keeping artifacts and docs current when future reruns happen. |
| **G-02** | Ollama baseline not yet executed on every target host | Pending per machine | The privacy-first live-model story is only credible after `npm run host:preflight:ollama` and `npm run release:gate:ollama` complete on the host that would be used for local demos or pilots. |
| **G-03** | Error-path eval depth still trails happy-path coverage | Partial | The degraded-path corpus is materially deeper now, but it still depends on ongoing expansion as new failure modes are discovered on real hosts. |
| **G-04** | Observability review and retention policy | Mostly closed | Request logging, repo-local log paths, operator summaries, and pruning now exist; the remaining gap is operational discipline rather than missing code. |
| **G-05** | Seed-data and eval-fixture separation | Partial | The ownership split now exists, but proof fixtures should keep growing until demo data carries no proof burden at all. |
| **G-06** | Human validation and pilot evidence | Not started; synthetic walkthrough baseline + complete pilot-paperwork set now exist | `docs/structured-walkthrough-v1.md` is an explicitly synthetic, self-walked friction log by the maintainer — it surfaces design gaps at hackathon pace but is **not** human validation. `docs/pilot/` now contains the full paperwork set — `participant-brief.md`, `observation-template.md`, `usefulness-rubric.md`, `session-log-template.md`, `claims-ledger.md`, and `incident-log.md` — so the first real pilot session can start without any further drafting. The product narrative is still strongest when a real teacher, EA, or school fills out the rubric and session log, which remains intentionally unclaimed. |
| **G-07** | Paid Vertex baseline | Deferred by design | The paid path remains available, but it is outside the hackathon/zero-cost credibility story and should stay clearly separated. |
| **G-08** | Branded types for domain IDs | **Closed** | ClassroomId, StudentRef, DraftId, PlanId, RecordId branded types defined in `packages/shared/schemas/branded.ts`. Applied at memory layer boundary (db.ts, retrieve.ts, store.ts) and all route handlers. Progressive adoption — internal code migrated, new code uses branded types automatically. |
| **G-09** | Error tracking integration | **Partially closed** | Structured error reporter (`apps/web/src/errorReporter.ts`) with pluggable transport, ErrorBoundary integration, and global error/rejection handlers. Ready for Sentry/LogRocket — just register a transport. |
| **G-10** | Automated baseline regression detection | **Closed** | Release gate now detects regressions automatically by comparing against the latest passing run per inference mode. Non-fatal warnings printed clearly; baseline only updates on pass. |
| **G-11** | Database migration framework | **Closed** | Versioned SQL migrations in `services/memory/migrations/`. Tracked in per-database `_migrations` table. Runs inside transactions with rollback. Current schema is migration 001. Backward-compatible with pre-existing databases. |
| **G-12** | Teacher dashboard structural gaps | **Closed** | Health Bar (success states), sparkline trends, student roster, drill-down drawer — all four structural gaps from the frontend design audit are now implemented. See details below. |
| **G-13** | Canonical system inventory drift | **Closed for current surface** | `npm run system:inventory` now generates `docs/system-inventory.md` and `docs/api-surface.md`, while `npm run system:inventory:check` catches panel, prompt, tier, and exact endpoint drift across canonical docs. |
| **G-14** | Pilot readiness and real-data governance | **Mostly closed** | `docs/pilot-readiness.md`, expanded safety governance, `npm run memory:admin` (including `prune` with tombstone audit artifacts and per-classroom `retention_policy`), `npm run audit:log` (classroom/role/outcome queries + JSON artifact snapshots of access history), API role scopes, and the complete `docs/pilot/` paperwork set (participant brief, observation template, usefulness rubric, session log template, claims ledger, incident log) cover operating modes, memory lifecycle, teacher/EA/substitute/reviewer boundaries, per-request access evidence, and the paperwork a first real pilot session would need. **2026-04-17 (round 4):** dedicated substitute and reviewer bounded views shipped (scope matrix locked by `services/orchestrator/__tests__/auth.test.ts`, per-route enforcement added to the pre-existing mount-level pattern, frontend tab visibility + capability hooks + teacher-downgrade confirmation). **2026-04-17 (round 5):** reusable safety-artifact review template + 5 completed per-prompt-class reviews (`docs/pilot/safety-artifacts/`) + 5 rehearsable incident-response drill scripts (`docs/pilot/incident-drills/`) all landed. The remaining blockers are all human-process: at least one real teacher walkthrough, pilot-coordinator countersign on each safety-artifact review, and at least one rehearsal of each of drills 1-5 before the first real-data session. |
| **G-15** | Synthetic classroom fixture convention drift | **Closed** | Cross-fixture EAL tag vocabulary unified 2026-04-25: non-demo classrooms (`alpha/bravo/charlie/delta/echo`) migrated from `emerging_english`/`eal_for_academic_vocabulary` to `eal_level_N`. |
| **G-16** | Wire clickable chart drill-downs on Tomorrow Plan, Differentiate, Support Patterns, and Intervention panels | **Closed 2026-04-24** | All five previously-unwired chart components now pass click callbacks from their parent panels into `DrillDownDrawer`: `PlanCoverageRadar`, `VariantSummaryStrip`, `SupportPatternRadar`, `FollowUpSuccessRate`, and `InterventionTimeline`. |
| **G-17** | Intervention capture velocity | **Closed** | `QuickCaptureTray` chip-first flow shipped 2026-04-14. Legacy `InterventionLogger` preserved in a `<details>` expansion; auto-opens on Tomorrow-Plan prefill. No schema or API changes — frontend-only addition on top of the existing `logIntervention` contract. |
| **G-18** | OutputActionBar rollout — Plan 4 | **Closed** | Shipped 2026-04-14. All eight generation panels now render a consistent `OutputActionBar`. Supporting hooks `useCopyToClipboard` and `useDownloadBlob` extracted. `tomorrowNotes` AppState slot added for cross-panel output aggregation. `FamilyMessagePanel` approval promoted to a two-step `MessageApprovalDialog`. See `docs/decision-log.md` 2026-04-14 entry. |

## Gap details

### G-16 — Wire clickable chart drill-downs on Tomorrow Plan, Differentiate, Support Patterns, and Intervention panels

**Status:** Closed 2026-04-24.

**What was shipped**

- `TomorrowPlanPanel` opens `plan-coverage-section` drill-downs from `PlanCoverageRadar` with watchpoints, priorities, EA actions, prep items, and family follow-ups.
- `DifferentiatePanel` opens `variant-lane` drill-downs from `VariantSummaryStrip`.
- `SupportPatternsPanel` opens `student-tag-group` drill-downs from `SupportPatternRadar`, derived from recurring-theme student references and enriched from the active classroom roster where available.
- `InterventionPanel` opens `student` drill-downs from `InterventionTimeline` dots and `debt-category` drill-downs from `FollowUpSuccessRate`, mapping pending follow-up records into drawer-compatible `DebtItem` objects.
- All four parent panels mount `DrillDownDrawer` with `onContextChange={setDrillDown}` so grouped-student views can escalate into student detail without leaving the drawer.

**Context**

Plan 5 added `onSegmentClick` props to 10 chart components in `DataVisualizations.tsx` and wired the 2 charts actually rendered on `TodayPanel.tsx` (ComplexityDebtGauge, ClassroomCompositionRings) plus HealthBar's 3 internal charts. The follow-up UI polish pass closed the remaining parent-panel wiring:

- `PlanCoverageRadar` on `TomorrowPlanPanel` opens `plan-coverage-section`.
- `VariantSummaryStrip` on `DifferentiatePanel` opens `variant-lane`.
- `SupportPatternRadar` on `SupportPatternsPanel` opens `student-tag-group`.
- `FollowUpSuccessRate` on `InterventionPanel` opens `debt-category`.
- `InterventionTimeline` on `InterventionPanel` opens `student`.

No remaining G-16 implementation work is tracked here.

### G-01 — Hosted Gemini baseline execution

**Status:** Closed for the current hackathon proof.

**What is already closed**

- `release:gate:gemini` exists as the hosted Gemma 4 hackathon proof lane.
- The gate now fails fast when no `PRAIRIE_GEMINI_API_KEY` / `GEMINI_API_KEY` is configured or when `PRAIRIE_ENABLE_GEMINI_RUNS=true` is absent.
- `docs/eval-baseline.md` now tracks a separate Hosted Gemini API section.
- `docs/hackathon-hosted-operations.md` documents the exact operator sequence.
- The curated hosted eval suite has already passed on synthetic/demo data.
- The full hosted release gate has completed successfully and produced a passing artifact set.

**What remains**

- Keep `docs/eval-baseline.md`, `docs/hackathon-proof-brief.md`, and `README.md` aligned with the latest passing hosted artifact.
- Re-run `npm run proof:check` and `npm run gemini:readycheck` before any later hosted refresh.
- Use targeted hosted smoke only as an optional repair loop when a single route regresses.

### G-02 — Ollama baseline execution

**Status:** Code path implemented; results depend on the local machine. On the current maintenance host, the planning-tier model is hardware-infeasible — this is a stronger block than previously recorded.

**What is already closed**

- `release:gate:ollama` exists as the live-model, zero-cost release lane.
- `host:preflight:ollama` now writes machine-readable host checks under `output/host-preflight/`.
- The gate checks for `gemma4:4b` and `gemma4:27b` before trying to run.
- `docs/eval-baseline.md` is now structured around mock, Ollama, hosted Gemini, and paid Vertex sections.
- `host:preflight:ollama` ran non-destructively on the maintenance host on 2026-04-12 (artifact `output/host-preflight/2026-04-12T16-10-14-124Z.json`) and produced a clean, honest diagnostic: Ollama CLI missing, 8 GiB total RAM, 0.11 GiB free RAM, 6.76 GiB free disk.

**Hardware feasibility finding (2026-04-12)**

The preflight revealed a structural block on the current maintenance host that was previously framed only as "Ollama isn't installed":

- The planning-tier `gemma4:27b` model requires substantially more than 8 GiB RAM for any reasonable quantization — the maintenance host (Apple M1, 8 GiB RAM) cannot run it regardless of whether Ollama is installed.
- The `gemma4:27b` weights also exceed the 6.76 GiB of free disk available on the maintenance host.
- The `gemma4:4b` live-tier model may still be feasible on this host if Ollama is installed and a few GiB of disk is freed; the dual-speed architecture would then run in "live-only" mode on this host with no planning tier.

This means the Ollama lane as a full release gate cannot run on the maintenance host at all. It requires a different target machine with ≥ 16 GiB RAM and ≥ 40 GiB free disk for the full dual-speed lane, or it must be reduced to a live-tier-only configuration on the current host (which would only exercise 7 of the 13 prompt classes).

**What remains**

- Choose a target host with ≥ 16 GiB RAM and ≥ 40 GiB free disk for the full Ollama lane, OR
- Run a live-tier-only Ollama lane on the current maintenance host (requires installing Ollama, pulling `gemma4:4b` only, and accepting that planning-tier routes will fall back to mock or fail in the gate).
- Once a viable host is chosen, pull the required models, run `npm run host:preflight:ollama`, run `npm run release:gate:ollama`, and keep the generated artifact set for demos or judging.

### G-03 — Error-path eval depth

**Status:** Improved further on 2026-04-12 — still not finished.

**What is already closed**

- 2026-04-12: +6 degraded-path / edge-case cases across five prompt classes — `msg-010-empty-context` (optional context omitted), `simp-006-minimum-grade-text` (very short source text), `vocab-005-thin-artifact` (minimal source material), `ea-008-cold-memory` (retrieval against a classroom with minimal intervention history), `eal-004-no-ea-window` (full teacher-only day — every block must report break), `eal-005-minimal-roster` (small roster, must not invent aliases). Edge-case coverage is now present for every prompt class except `extract_worksheet`.
- Validation now rejects oversized free-text payloads at the API boundary.
- Model-output parse failures return structured failures with eval coverage.
- Inference transport and timeout failures now return categorized retry metadata.
- `npm run eval:summary` groups failures into fixed categories for operator review.

**What remains**

- Keep adding host-specific degraded-path cases as new failure modes appear.
- Use proof fixtures rather than demo data for any new edge-case coverage.
- Add at least one edge-case eval for `extract_worksheet` (the remaining uncovered class).

**Update 2026-04-25:** `extract_worksheet` has edge-case coverage via
`extract-003-safety`, `extract-004-latency`, and `extract-005-mime-tolerance`.
Original "every prompt class except extract_worksheet" caveat is closed.

- Author cross-feature synthesis cases: plan+pattern, forecast+intervention, ea-load+intervention, survival-packet+forecast.
- Add retrieval-relevance cases for `forecast_complexity`, `detect_scaffold_decay`, `generate_survival_packet`, `balance_ea_load` (none yet — only plan and pat have explicit retrieval-relevance cases).

### G-04 — Observability and operator view

**Status:** Foundation in place.

**What is already closed**

- Every orchestrator response now carries `X-Request-Id`.
- Request logs are written as JSONL under `output/request-logs/`.
- Prompt bodies stay out of logs unless `PRAIRIE_DEBUG_PROMPTS=true`.
- `npm run logs:summary` gives an operator view of route, category, retryable, and injection counts.
- `npm run logs:prune -- --days 14` prunes repo-local request logs.

**What remains**

- Use the pruning command consistently on long-lived demo machines.
- If operator needs grow, build a richer dashboard on top of the same JSONL files rather than changing the external API.

### G-05 — Fixture separation

**Status:** Still worth doing.

**Why it matters**

The demo classroom is useful, but product proof is stronger when synthetic demo data, regression fixtures, and benchmark fixtures are explicitly separated.

**What remains**

- Move additional edge cases from default local data into `evals/fixtures/classrooms/` and `evals/fixtures/memory/`.
- Keep the fixture ownership manifest current when proof fixtures grow.

### G-06 — Human validation evidence

**Status:** Intentionally unclaimed. A synthetic walkthrough baseline now exists but does not substitute for human validation.

**Why it matters**

The repo can now support a cleaner pilot, but it still does not contain audited teacher, EA, or family validation artifacts. Public copy should continue to describe this as a promising operating model, not a proven classroom outcome.

**What is already closed**

- `docs/structured-walkthrough-v1.md` captures a first-person maintainer walkthrough of 8 product scenarios against the demo classroom in mock mode, with a per-scenario friction log and a top-five change list. It is explicitly framed as synthetic and not as human validation — the doc's opening section states what it is not and the trailing section lists exactly what would need to happen to upgrade it to credible pilot evidence.
- That walkthrough is now the durable baseline the project re-runs after each sprint, so design friction doesn't silently return between the maintainer's touch points.
- `docs/pilot/` now holds the complete paperwork set a first real pilot session needs: `participant-brief.md` (5–7 minute read for teachers/EAs), `observation-template.md` (observer form), `usefulness-rubric.md` (1–5 scale across actionability, trust, time saved, cognitive load, edit burden), `session-log-template.md` (self-documented session shape), `claims-ledger.md` (every public claim with status + evidence reference + last-reviewed date), and `incident-log.md` (append-only, S1–S4 severity, format template + anchor entry). The claims ledger explicitly starts with most usefulness claims at `unsupported` or `partially supported`, which is the honest baseline the project stands behind.

**What remains**

- A real Alberta K-6 teacher, unaffiliated with the project, walks through 8 scenarios cold while an observer (not the maintainer) captures friction using `observation-template.md` — see the closing checklist in `structured-walkthrough-v1.md` for the exact steps required to upgrade the synthetic baseline into real pilot evidence.
- Teacher / EA usefulness rubrics filled out with consent-recorded metadata (templates exist; no data yet).
- Incident-log entries from real sessions (template exists with only an anchor entry).
- Claims-ledger rows moved from `unsupported` / `partially supported` to `supported` as real-session evidence accumulates.

### G-07 — Paid Vertex baseline

**Status:** Deferred on purpose.

**Why it matters**

The paid path may still matter later for hosted or district-scale deployment, but it should remain outside the zero-cost credibility story until you deliberately fund and run it.

### G-12 — Teacher dashboard structural gaps

**Status:** Closed.

**What was added (2026-04-10)**

- **Health Bar**: Ambient status strip above the triage grid — streak counter, 7-day planning consistency dots, approval cadence chip, overall health indicator. New endpoint `GET /api/classrooms/:id/health`.
- **Sparkline trends**: Inline 14-day trend charts in PendingActionsCard, PlanRecap, and Forecast headers. Reusable `Sparkline` SVG component.
- **Student roster**: Collapsible per-student card grid below the forecast section. Lazy-loaded via new endpoint `GET /api/classrooms/:id/student-summary`. Cards show pending action counts, last intervention timing, active patterns, and priority reasons.
- **Drill-down drawer**: Type-discriminated slide-out panel for student detail, forecast block analysis, debt category inspection, and trend enlargement. Cross-navigates to Intervention and Family Message panels with prefill.
- **History filtering**: Optional `?student=` query parameter on existing `/api/classrooms/:id/interventions` and `/api/classrooms/:id/messages` endpoints.

**What remains**

- VocabCard export (Anki/Quizlet/PDF) — separate feature, not a dashboard concern

**Update 2026-04-25:** SurvivalPacket print CSS verified by inspection — the
`@media print` block at `apps/web/src/components/SurvivalPacket.css` carries
the documented `break-inside: avoid` and `print-color-adjust: exact` rules
across all 6 packet sections. Manual print-preview verification deferred to a
future browser-sweep cycle but the structural CSS contract is intact.

### G-13 — Canonical system inventory drift

**Status:** Closed for current surface.

**What is already closed**

- `npm run system:inventory` generates `docs/system-inventory.md` and `docs/api-surface.md` from code-level sources.
- `npm run system:inventory:check` compares canonical docs against the current panel count, prompt-class count, prompt class list, live/planning split, and exact endpoint table.
- `npm run ops:status` includes inventory drift status alongside release-gate, host-preflight, request-log, and evidence-doc summaries.

**Future enhancement**

- Consider folding `system:inventory:check` into `proof:check` once the generated inventory is stable across local environments.

### G-14 — Pilot readiness and real-data governance

**Status:** Partial.

**What is already closed**

- `docs/pilot-readiness.md` defines the difference between demo/synthetic proof, local pilot readiness, and real classroom data readiness.
- `docs/safety-governance.md` now includes operating modes, data lifecycle controls, role-scope expectations, incident response, and real-data blockers.
- `npm run memory:admin` now provides per-classroom `summary`, `export`, `anonymize`, `backup`, `prune`, `purge`, and `restore` commands.
- Destructive memory commands require `--confirm`; anonymized exports still require adult free-text review before external sharing.
- Explicit retention settings per classroom: `ClassroomProfile.retention_policy` (`default_days` + optional per-table `overrides`) is read by `memory:admin -- prune`, which deletes rows older than the configured window from every retention-eligible table and writes a tombstone audit artifact naming the policy source, per-table cutoffs, and rows removed. Pruning is never automatic.

**What remains**

- Extend the initial teacher/EA API role scopes into dedicated substitute and reviewer views before those roles use real classroom records.
- Add structured human-validation artifacts: de-identified observation notes, teacher/EA usefulness rubrics, consent assumptions, friction logs, and a public claims ledger.

### G-15 — Synthetic classroom fixture convention drift

**Status:** Closed 2026-04-25.

**Resolution:** Non-demo classrooms (`alpha/bravo/charlie/delta/echo`) migrated
from `emerging_english` to the demo convention `eal_level_N`. Cross-fixture
vocabulary now unified. Eval cases referencing the old tag updated in the
same commit.

**Findings**

1. **EAL tag vocabulary fragmentation.** `classroom_demo.json` applies `eal_level_1`, `eal_level_2`, and `eal_level_3` to its 8 EAL students. The non-demo classrooms (`classroom_alpha/bravo/charlie/delta/echo.json`) use `emerging_english` as the EAL tag, sometimes with variants like `eal_for_academic_vocabulary`. Two parallel vocabularies for the same concept will fragment any pattern-detection, EA-load, or support-patterns heuristic that keys on the tag. The demo fixture validator now locks the demo convention, but it does not yet normalize the non-demo fixtures.

2. **Former cross-fixture alias collision: `Amira`.** This is closed as of 2026-04-23. The demo keeps load-bearing D1 `Amira`; `data/synthetic_classrooms/classroom_charlie.json` S10 is now `Aisha`; `scripts/validate-demo-fixture.mjs` blocks any future duplicate aliases across `data/synthetic_classrooms/classroom_*.json`.

**Remediation options**

- **Option A — Unify vocabulary.** Back-fill the 5 non-demo classrooms to `eal_level_N` (or the other direction: rename demo's `eal_level_N` to `emerging_english` and encode proficiency in `communication_notes`). Requires careful inspection of every eval case, prompt golden, and doc snippet that references these tags, plus re-running `npm run system:inventory` and affected regression fixtures.
- **Option B — Guard the status quo.** Partly executed. `scripts/validate-demo-fixture.mjs` now blocks alias collisions, validates the demo EAL convention, and is wired into `release:gate`; it intentionally does not force the non-demo classroom tag vocabulary yet.

**What is already closed**

- The 3 new alias collisions introduced by the 26-student expansion (Priya, Tomás, Yasmin) were renamed before they shipped. Commit `86a3422`.
- Navpreet's redundant third support tag was removed in the same fix. Commit `86a3422`.
- The spec at `docs/superpowers/specs/2026-04-13-full-classroom-seed-design.md` §3.2 "Naming integrity rule" now documents the review finding and the rename, so future contributors see the history.
- Charlie's duplicate `Amira` alias was renamed to `Aisha` on 2026-04-23, preserving the demo's load-bearing D1 `Amira`.
- `scripts/validate-demo-fixture.mjs` now blocks future synthetic alias collisions, validates the tiered demo roster, checks demo EAL tags, and asserts clean-seed counts.
- EAL tag vocabulary unified 2026-04-25: `emerging_english` replaced with `eal_level_1/2/3` and `eal_for_academic_vocabulary` replaced with `eal_level_3` across all 5 non-demo classrooms. Option A executed.

**What remains**

None — fully closed.

### Intervention capture velocity

- **G-17 (2026-04-14, shipped):** `QuickCaptureTray` reduces hallway logging friction with a chip-first 5-second submission flow. The legacy `InterventionLogger` remains available in a `<details>` expansion and auto-opens when a Tomorrow-Plan prefill arrives. Downstream impact: higher intervention-record density strengthens `detect_support_patterns` and `forecast_complexity` inputs.

### G-18 — OutputActionBar rollout — Plan 4

**Status:** Closed 2026-04-14.

**What was added**

- `apps/web/src/components/shared/OutputActionBar.tsx` — shared component with `OutputAction` contract (`key`, `label`, `icon`, `onClick`, `variant?`, `disabled?`, `disabledReason?`). Renders below `FeedbackCollector` in every generation panel.
- Eight panels wired: Differentiate, TomorrowPlan, SupportPatterns, EABriefing, Forecast, SurvivalPacket, LanguageTools, FamilyMessage. Panel-specific actions: Print, Copy, Download, Save-to-Tomorrow, Share-with-EA, Review-approval.
- `useCopyToClipboard` hook — clipboard API with execCommand fallback.
- `useDownloadBlob` hook — blob URL download with filename sanitization.
- `tomorrowNotes: TomorrowNote[]` AppState slot persisted to localStorage — enables "Save to Tomorrow" cross-panel output aggregation.
- `MessageApprovalDialog` — promotes FamilyMessagePanel approval to a two-step dialog reflecting the legal/communication weight of family messaging.
