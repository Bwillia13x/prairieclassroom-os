# Final closeout brief - 2026-04-27

Use this as the next-session entry point for PrairieClassroom OS closeout work.
Work inside `/Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev`
and read `CLAUDE.md` first.

## Current posture

- Branch: `main`.
- Worktree: intentionally dirty from the closeout run. Do not assume a clean
  checkout, and do not revert unrelated changes.
- Cost lane: no-cost local mock/demo validation. Hosted Gemini and paid Vertex
  were not rerun in this closeout pass.
- CodeRabbit: skipped by user request.

PrairieClassroom OS is green for local demo/browser readiness on synthetic
demo data. The latest mock release gate passed, the browser route audit passed
across all seven top-level views, contrast passed, and production-preview
Lighthouse now meets the release score and CLS targets.

## Primary evidence

| Evidence | Path |
|---|---|
| Final release audit | `qa/final-release/FINAL_RELEASE_AUDIT_REPORT.md` |
| Browser checklist | `qa/final-release/browser-checklist.md` |
| Teacher walkthrough | `qa/browser-use/2026-04-27-teacher-walkthrough/BROWSER_USE_REPORT.md` |
| Performance audit | `qa/PERFORMANCE_AUDIT_REPORT.md` |
| Lighthouse summary | `qa/performance/lighthouse/summary.json` |
| Frontend remediation addendum | `qa/performance/FRONTEND_REMEDIATION_2026-04-27.md` |
| Latest mock release gate | `output/release-gate/2026-04-28T00-38-53-468Z-24492/summary.json` |
| Evidence snapshot | `output/evidence-snapshots/2026-04-28/` |
| Route metrics | `qa/final-release/metrics/2026-04-27-current.json` |
| UI evidence bundle | `output/playwright/ui-evidence/2026-04-27T22-51-09-966Z/` |
| Contrast report | `output/contrast-report.md` |

## Validation already run

- `npm run release:gate`: passed in mock/no-cost mode at
  `output/release-gate/2026-04-28T00-38-53-468Z-24492/`.
- `npm run smoke:browser`: passed during the final release audit stack.
- `npm run check:contrast`: passed with 80 required light/dark pairs.
- `npm run ui:evidence`: captured the current screenshot bundle.
- Route/viewport audit: passed across desktop, tablet, mobile, and iPhone SE.
- Production-preview Lighthouse matrix: performance score `>= 90`, CLS `< 0.1`,
  and console errors `0` across default and Today desktop/mobile routes.
- Post-remediation checks: `npm run typecheck`, targeted Vitest, `npm run lint`,
  `npm run proof:check`, `npm run claims:check`, and `git diff --check` passed.

## Current caveats

1. Mobile Lighthouse LCP is still above the strict `2.5s` lab target:
   default mobile `3418ms`, Today mobile `3369ms`. Lighthouse attributes the
   LCP element to `.shell-classroom-pill__label`, not to Today content.
2. Recurring phone/coarse-pointer controls were raised to the shared 44px
   contract; dense SVG chart hit rings remain a candidate for strict
   target-size audit if needed.
3. Hosted Gemini proof was not refreshed in this pass. Keep hosted claims tied
   to the last documented passing hosted artifact unless the user explicitly
   approves a new bounded hosted run.
4. Paid Vertex remains opt-in only behind `PRAIRIE_ALLOW_PAID_SERVICES=true`.
5. Real classroom validation remains intentionally unclaimed.

## Recommended next moves

1. Decide whether the current dirty closeout tree should be committed as one
   release-readiness changeset or split into frontend, evidence, and docs
   commits.
2. If pursuing stricter Core Web Vitals polish, run a focused mobile LCP pass
   against classroom switcher hydration/header rendering and broad entry CSS.
   Do not spend time optimizing Today content first; the current LCP element is
   the shell classroom switcher label.
3. Run a focused SVG chart hit-target pass only if strict target-size compliance
   is required.
4. Before any final publish, rerun the local gate sequence:

   ```bash
   source ~/.nvm/nvm.sh && nvm use
   PRAIRIE_PYTHON=$PWD/services/inference/.venv311/bin/python npm run release:gate
   npm run smoke:browser
   npm run check:contrast
   npm run proof:check
   npm run claims:check
   ```

5. Only refresh hosted Gemini if the user explicitly asks for that lane and
   accepts the hosted budget. Run `npm run gemini:readycheck` first.

## Do not lose

- Keep synthetic/demo, hosted proof, paid Vertex, and real human validation
  claims separated.
- Preserve the current final-release and performance evidence paths; the audit
  docs reference them directly.
- Do not rerun CodeRabbit for this closeout thread unless the user reverses the
  skip instruction.
