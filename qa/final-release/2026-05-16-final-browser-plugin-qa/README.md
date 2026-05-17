# PrairieClassroom OS Final Browser Plugin QA

Date: 2026-05-16 America/Edmonton

Public URL tested:
- Root: https://prairieclassroom-os.vercel.app
- Canonical static demo: https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34

Proof lane: public `?demo=true` Vercel path is a static-first bundled synthetic demo using `prairie-static-demo-api`. This pass does not claim live hosted Gemma generation, local Ollama proof, real teacher validation, real classroom deployment, measured outcomes, or no-cloud behavior.

## Browser Surfaces Used

- Chrome plugin: public Vercel root/demo QA, real Chrome tab behavior, public route sweep, command palette, stale demo recovery, legacy deep links, generated static fallback flow, approval-before-copy flow, console/runtime checks.
- Browser / Codex in-app browser plugin: localhost protected-classroom prompt, wrong-code recovery, valid-code recovery.
- Computer Use: not used. Direct macOS UI interaction was not required.
- Supporting automation: Chrome-channel Playwright exact viewport sweep for 1440x900, 393x852, 768x1024, and 1920x1080 screenshots.

## Key Evidence

- Public exact viewport sweep state: `browser-state/public-exact-viewport-sweep.json`
- Public root viewport sweep state: `browser-state/public-root-exact-viewport-sweep.json`
- Chrome route sweep state: `browser-state/chrome-public-route-sweep.json`
- Command palette state: `browser-state/chrome-public-command-palette.json`
- Approval gate state: `browser-state/chrome-public-family-message-approval-gate.json`
- Local protected wrong-code state: `browser-state/browser-local-protected-invalid-code-after-roleprompt-fix.json`
- Local protected valid-code state: `browser-state/browser-local-protected-valid-code-after-roleprompt-fix.json`
- Full command logs: `raw-results/`
- Screenshot directory: `screenshots/`

Representative screenshots:
- `screenshots/public-root-desktop-1440x900.png`
- `screenshots/public-mobile-393x852-today.png`
- `screenshots/chrome-public-generated-differentiate-static-fallback.png`
- `screenshots/chrome-public-family-message-approval-modal.png`
- `screenshots/browser-local-protected-invalid-code-after-roleprompt-fix.png`
- `screenshots/browser-local-protected-valid-code-after-roleprompt-fix.png`

## Commands

Passing after fixes:
- `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo`
- `PRAIRIE_WEB_BASE=http://localhost:5173 PRAIRIE_SMOKE_PROTECTED_CLASSROOM_CODE=prairie-alpha-2026 npm run smoke:browser`
- `npm exec -- vitest run apps/web/src/__tests__/appReducer.test.ts apps/web/src/__tests__/App.shell.test.tsx services/orchestrator/__tests__/auth.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run claims:check`
- `npm run proof:check`
- `npm run system:inventory:check`
- `npm run eval:inventory:check`
- `npm run demo:fixture:check`
- `npm run check:contrast`
- `npm run submission:final-check -- --skip-publication-check --skip-release-gate`
- `npm run release:gate`

Release gate result:
- Passed mock gate.
- New gate artifact: `output/release-gate/2026-05-17T02-33-38-283Z-67545`
- Docs updated: `docs/eval-baseline.md`, `docs/live-model-proof-status.md`

## Findings And Fixes

P0:
- None found.

P1 fixed:
- Protected synthetic demo fixtures could be treated as public demo classrooms. `App.tsx` now prefers the canonical public demo classroom, only treats unprotected demo fixtures as public demo candidates, and avoids writing `demo=true` for protected synthetic fixtures. Regression: `App.shell.test.tsx`.
- Backend auth bypass treated any `is_demo` classroom as unlocked even when it had an explicit access code. `services/orchestrator/auth.ts` now lets `access_code` override demo bypass. Regression: `services/orchestrator/__tests__/auth.test.ts`.
- Invalid-code recovery could be obscured by the role prompt after an optimistic protected-classroom selection. `appReducer.ts` now clears `rolePrompt` when `OPEN_AUTH_PROMPT` fires. Regression: `appReducer.test.ts`.

P2:
- No remaining public-demo or local protected-flow P2 findings from this pass.

## Remaining External Blockers

- Public YouTube walkthrough URL remains external.
- Kaggle submission URL remains external.
- True physical cellular smoke remains unresolved.
- Hosted Gemini proof was not rerun in this pass; the docs still point to the previously passed hosted synthetic/demo run.
- Ollama/local no-cloud proof remains unproven.
