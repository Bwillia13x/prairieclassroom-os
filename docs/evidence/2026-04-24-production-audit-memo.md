# Production Readiness Audit — Sign-off Memo

- **Audit date:** 2026-04-24
- **Audit window:** single-session morning sprint (09:02 – 12:11 MDT)
- **Plan followed:** [docs/production-readiness-audit.md](../production-readiness-audit.md)
- **Auditor:** solo maintainer
- **Commit SHA at audit start:** `9f8d9db` (HEAD at that moment; audit produced uncommitted changes described in §4)
- **Target verdict:** confident pilot-ready for `demo`, `synthetic-proof`, and `local-pilot-rehearsal` operating modes; **not** real-data-pilot and **not** hosted-real-data

---

## 1. Verdict

**GREEN** — every in-scope dimension passed on evidence produced during this audit. The two known-yellow dimensions (D4 Ollama, D7 drill rehearsals) remain yellow by design, carried forward under the exact terms already named in [development-gaps.md](../development-gaps.md) (G-02 / G-14). The audit surfaced two small real findings (§Findings); one was fixed in place, one is an operator reminder. No claims-ledger row was promoted.

## 2. Per-dimension verdict

| #   | Dimension                                | Verdict | Evidence                                                                                                                                           |
| --- | ---------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Structural Integrity                     | GREEN   | `output/release-gate/2026-04-24T12-03-26-295Z-7347/` — typecheck, lint, scripts tests all green inside the gate                                    |
| D2  | Schema and Contract Validity             | GREEN   | `55-ts-tests.log` (74 KB, full vitest corpus) and `50-python-tests.log` inside the same release-gate run                                           |
| D3  | Prompt Class Coverage (13 classes)       | GREEN-WITH-NOTE | 127 eval cases exist (verified by `npm run system:inventory:check`); `60-claims-check.log` green inside today's release-gate. **Note:** the mock gate does not run the full 127-case eval corpus (`summary.json.eval_results_file: null`). The last full-corpus run against a real backend was the hosted Gemini 12-case proof suite on 2026-04-22. Today's audit verifies structural coverage, not a fresh cross-class quality run. |
| D4  | Inference Lanes — mock                   | GREEN   | Same release-gate, `status: "passed"`, `zero_cost_enforced: true`                                                                                   |
| D4  | Inference Lanes — ollama                 | YELLOW  | `output/host-preflight/2026-04-12T16-10-14-124Z.json` + G-02: host-infeasible (8 GiB RAM vs 27B planning-tier requirement). Skipped per operator direction. |
| D4  | Inference Lanes — gemini                 | GREEN   | 2026-04-22 baseline cited (`output/release-gate/2026-04-22T02-16-16-557Z-74236/`); `proof:check` green today; `gemini:readycheck` confirms hosted lane correctly guard-disabled without `PRAIRIE_GEMINI_API_KEY`. No hosted spend today. |
| D4  | Inference Lanes — api / vertex           | N/A     | Out of scope per plan §2.                                                                                                                          |
| D5  | API Surface and Role Scope               | GREEN   | `npm run system:inventory:check` — panels=12, prompt_classes=13, api_endpoints=52, eval_cases=127, live/planning=7/6. Role matrix locked by `services/orchestrator/__tests__/auth.test.ts`. |
| D6  | Web Shell and UX Behavior                | GREEN   | Release-gate `90-smoke-browser.log` (Playwright smoke passed). Fresh 8-screenshot bundle at `output/playwright/ui-evidence/2026-04-24T12-11-06-752Z/` + `manifest.json`. |
| D7  | Security and Safety Controls             | GREEN-WITH-NOTE | Release-gate test suite green (covers path traversal, rate limit, safe JSON deserialization, atomic schedule writes, prompt-injection detection, role-header enforcement). Audit log evidence healthy: 1059 denials categorized across `classroom_code_missing` (945), `classroom_code_invalid` (79), `classroom_role_forbidden` (35). **Note:** Drills 1–5 are written and rigorous; zero have been rehearsed. That is G-14 human-process and not an audit failure. |
| D8  | Data Integrity and Memory Lifecycle      | GREEN   | `npm run pilot:reset` round-tripped cleanly — `output/pilot/2026-04-24T12-02-22-041Z-pilot-reset-demo-okafor-grade34.json`. `_migrations` table current via release-gate migrations suite. |
| D9  | Demo Fixture Integrity                   | GREEN   | `npm run demo:fixture:check` — 26 students, 36 interventions, 3 plans, 1 pattern report, 1 approved family message, 5 sessions, 0 seeded feedback/forecast/scaffold/survival/variant/run rows. Alias + EAL conventions locked. |
| D10 | Accessibility and Dark-Mode Contrast     | GREEN   | `npm run check:contrast` — 80 pairs (light + dark) all WCAG AA. Report at `output/contrast-report.md`.                                              |
| D11 | Observability and Cost Controls          | GREEN   | `npm run ops:status` — no drift. Per-request `X-Request-Id` in place; request logs growing under `output/request-logs/` (2332 records in today's file, non-200=10, injection-suspected=0). Audit-window hosted spend: **$0.00** (no hosted runs). |
| D12 | Evidence Portfolio and Docs Hygiene      | GREEN   | `docs/evidence/{feedback-summary,session-patterns,system-reliability}.md` regenerated via `npm run evidence:generate`. Archived by `npm run evidence:snapshot` to `output/evidence-snapshots/2026-04-24/`. `npm run claims:check` green. |

Legend: GREEN = all three readiness-bar conditions met; YELLOW = limitation carried forward with a decision-log pointer; RED = none.

## 3. Findings from this audit

### F1 — Node version check bails the gate when `nvm use` isn't run first

- **Severity:** minor (operator reminder; no production impact).
- **What happened:** First release-gate invocation from the audit shell exited after the `.nvmrc` check ("Expected v25.8.2 from .nvmrc, got v25.9.0. Run `nvm use` before `npm run release:gate`.") The bailed-run artifact dir (`output/release-gate/2026-04-24T12-02-30-206Z-6712/`) contains only `summary.json` with `"status": "failed"`, vs. the passing run's 14 log files + summary. The release-gate script correctly refused to proceed and persisted a "failed" marker for audit forensics.
- **Resolution:** Re-ran with `source ~/.nvm/nvm.sh && nvm use && npm run release:gate`. Passing run at `output/release-gate/2026-04-24T12-03-26-295Z-7347/` (`status: "passed"`, completed in ≈3 min).
- **Follow-up:** None code-side. This is exactly the behavior [release-checklist.md](../release-checklist.md) §"Local sequence" documents. Keep the reminder visible; no doc or script change.

### F2 — `ui:evidence` had stale layout assertions after the shell consolidation refactor

- **Severity:** minor (false negative in a validation script; actual UI was fine).
- **What happened:** `scripts/capture-ui-evidence.mjs` asserted two selectors that no longer exist in the DOM: `.today-panel--with-rail` (with `display: grid`) and `.today-anchor-rail`. These were renamed/removed by commit `471ae66 Consolidate seven-view teacher shell`. The modern equivalents are `.today-panel` (flex, with many `.today-anchor-target` children) and `.page-anchor-rail` (position: fixed) — the contract is documented in [TodayPanel.test.tsx:569](../../apps/web/src/panels/__tests__/TodayPanel.test.tsx).
- **Live-DOM verification:** Inspected the running dev server during the audit; confirmed `.today-panel` class `workspace-page today-panel` (flex), `.page-anchor-rail` visible on desktop (`display: block`), old classes absent.
- **Resolution:** Surgical selector update in `scripts/capture-ui-evidence.mjs` (13 insertions, 9 deletions). The assertion now checks: panel renders with ≥3 `.today-anchor-target` children + `.page-anchor-rail` visible on desktop + hidden on mobile. Post-fix ui:evidence run passed; 8-screenshot bundle produced.
- **Follow-up:** Commit the fix alongside this memo so subsequent runs don't re-bail on the old selectors.

## 4. Deltas produced by the audit (uncommitted as of memo time)

| File                                               | Kind       | Why                                                                                                         |
| -------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `docs/production-readiness-audit.md`               | new doc    | The orchestrator plan this audit ran against.                                                               |
| `scripts/capture-ui-evidence.mjs`                  | bug fix    | Finding F2: update stale `.today-panel--with-rail` / `.today-anchor-rail` selectors to `.today-panel` + `.page-anchor-rail`. |
| `docs/evidence/2026-04-24-production-audit-memo.md`| new memo   | This file.                                                                                                   |
| `docs/evidence/{feedback-summary,session-patterns,system-reliability}.md` | regenerated | `npm run evidence:generate` refreshed timestamps + counters.                                 |
| `output/release-gate/2026-04-24T12-03-26-295Z-7347/` | new artifact dir | The passing mock gate.                                                                                |
| `output/playwright/ui-evidence/2026-04-24T12-11-06-752Z/` | new artifact dir | Fresh 8-screenshot UI bundle.                                                                 |
| `output/evidence-snapshots/2026-04-24/`            | new snapshot | Archived evidence portfolio.                                                                               |
| `output/pilot/2026-04-24T12-02-22-041Z-pilot-reset-demo-okafor-grade34.json` | tombstone | Pilot reset audit artifact.                                              |

No `docs/decision-log.md` entry is required — the only yellow rows (D4 Ollama, D7 drill rehearsals) already have durable decision-log pointers at G-02 and G-14.

## 5. Claims-ledger delta

None. No claim moved. No "unsupported" row was promoted to "partially supported." No "partially supported" row was promoted to "supported." The audit's evidence supports the existing ledger state; it does not unlock anything new.

In particular, the following remain unchanged and remain honest:

- "Validated by Alberta teachers" — **unsupported** (no real teacher walkthrough).
- "Reduces teacher prep time" / "Improves EA coordination" — **unsupported** (no measurements).
- "Produces family messages in Alberta-regional languages" — **partially supported** (`msg-lang-*` fixtures authored; hosted run still pending).
- "Ready for a bounded real-classroom pilot" — **unsupported** (G-14 human-process remainder: real teacher walkthrough, pilot coordinator countersigns, drill rehearsals).
- "Runs privacy-first locally on commodity Alberta hardware via Ollama + Gemma 4" — **unsupported** (host-infeasible on 8 GiB maintenance host per G-02).
- "Refuses to produce diagnostic language" / "Ignores prompt-injection attempts" — **partially supported** (eval coverage, no adversarial red-teaming).

## 6. Hosted spend during audit window

**$0.00.** The audit cited the 2026-04-22 hosted Gemini baseline (`output/release-gate/2026-04-22T02-16-16-557Z-74236/`) as current. `npm run proof:check` confirmed proof surfaces are internally consistent. `npm run gemini:readycheck` confirmed the hosted lane is correctly guard-disabled without `PRAIRIE_GEMINI_API_KEY` set (a defensive control, not a defect). Per the audit plan's cost guardrails, no bounded hosted gate run was triggered because the existing baseline is 2 days old with no intervening code changes that would affect hosted behavior.

## 7. Drill rehearsal references

None. Drills 1–5 (`docs/pilot/incident-drills/drill-01..05.md`) are written, rigorous, and each has clear "what good / what bad" criteria. **Zero** have been rehearsed. The drill-history section of `docs/pilot/incident-drills/README.md` still reads "No drills have been run yet." This is a G-14 human-process requirement, not an audit artifact failure. Rehearsals need the pilot coordinator and cannot be produced by a solo-maintainer audit.

## 8. Known limitations carried forward

| Gap  | Status after audit | Why it stays yellow                                                                                          |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| G-02 | Yellow             | Ollama lane is hardware-infeasible on the 8 GiB maintenance host for the 27B planning-tier model. Target host with ≥16 GiB RAM / ≥40 GiB free disk needed to move this to green. No solo-maintainer action can close it. |
| G-06 | Yellow by design   | Real teacher walkthrough + completed usefulness rubric + claims-ledger promotions are intentionally unclaimed until a pilot session produces them. The audit cannot substitute for human validation. |
| G-14 | Yellow by design   | Pilot-coordinator countersign on each of the five safety-artifact reviews + at least one rehearsal of each of drills 1–5. Human-process; cannot be closed in a solo audit. |
| G-15 | Yellow             | Non-demo classroom EAL tag vocabulary fragmentation (`eal_level_N` on demo vs. `emerging_english` on non-demo fixtures). Demo fixture validator locks the demo convention; non-demo normalization is a post-audit ticket decision. |

## 9. What this audit does NOT unlock

The audit is explicit about its ceiling. None of the following become true as a result of passing this audit:

- **No hosted real-data use.** The "Hosted Gemini lane is prohibited from real classroom data" claim stays `supported`.
- **No claim of human-validated outcomes.** No row in the "Usefulness / outcome claims" section of the ledger moves.
- **No district-readiness claim.** The "Ready for a bounded real-classroom pilot" row remains `unsupported`.
- **No promotion beyond `local-pilot-rehearsal`.** Real-data pilot requires the G-14 human-process items to close.

What the audit *does* confirm: the repo is code-complete and evidence-complete for a first real-data session, once the remaining human-process items are scheduled. The code will not be the bottleneck.

## 10. Sign-off

- **Audit plan exit criteria met:** yes (§5 of the plan; Phase 5 exit).
- **All 12 dimensions green or explicitly yellow-with-decision-log:** yes (D3 is GREEN-WITH-NOTE — structural coverage verified, not a fresh full-corpus quality run; see §2).
- **Sign-off memo committed:** not yet — the artifacts, F2 fix, and this memo are on disk as uncommitted changes pending the maintainer's commit decision.
- **Solo sign-off caveat:** this memo is a solo-maintainer sign-off. Per the audit plan §8 note, a second-party review on the memo and any future claims-ledger promotions is the safer posture for publicly-cited audits. No promotion was produced today, so no second-party review is gating this memo.

---

*Memo generated from the commands in [docs/production-readiness-audit.md](../production-readiness-audit.md) on 2026-04-24. Do not edit retroactively — if a finding turns out to be wrong, append a correction section rather than rewriting the record.*
