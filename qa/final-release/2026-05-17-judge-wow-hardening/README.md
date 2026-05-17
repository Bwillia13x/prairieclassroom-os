# 2026-05-17 Judge-Wow Hardening QA

## Scope

- Public URL: `https://prairieclassroom-os.vercel.app`
- Canonical public demo: `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`
- Local canonical demo: `http://localhost:5173/?demo=true&tab=today&classroom=demo-okafor-grade34`
- Proof lane: public `?demo=true` is the static-first bundled synthetic demo path. This bundle does not claim live hosted Gemma generation.

## Browser Surfaces Used

- Browser / Codex in-app browser: local canonical route after the mobile touch-target fix.
- Chrome / real Chrome extension backend: public canonical route before deploy, confirming static-first marker and desktop state.
- Playwright Chromium: root/canonical desktop and mobile checks, command palette, reduced-motion probe, screenshots, public/local smoke scripts.
- Computer Use: not used; no Mac UI state was required.

## Findings

- P0: none found in this pass.
- P1: none remaining after the prior auth/default-demo recovery fixes in this worktree.
- P2: public mobile canonical demo had two visible top-bar controls under the 40 px touch-target threshold before this fix. Local after-fix evidence shows the role/search controls no longer shrink below the shared mobile control size.

## Fixes Under Test

- `apps/web/src/styles/ambient.css`: prevents the mobile role pill and command-search control from flex-shrinking below `--control-h-md`.
- `apps/web/src/App.tsx`: keeps protected synthetic fixtures out of the default public demo selection and URL demo marking.
- `apps/web/src/appReducer.ts`: clears the role prompt when protected-classroom auth recovery opens.
- `services/orchestrator/auth.ts`: keeps explicit access-code requirements authoritative even for `is_demo` fixtures.

## Current Validation

- Passed: `npm run ui:evidence` (`output/playwright/ui-evidence/2026-05-17T02-59-36-423Z`)
- Passed: focused Vitest for shell, reducer, auth, and root gate tests.
- Passed: `npm run typecheck`
- Passed: `npm run lint`
- Passed: `npm run smoke:browser`
- Passed: `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo`
- Passed: `npm run claims:check`
- Passed: `npm run proof:check`
- Passed: `npm run system:inventory:check`
- Passed: `npm run eval:inventory:check`
- Passed: `npm run demo:fixture:check`
- Passed: `npm run check:contrast`
- Passed: `npm run submission:final-check -- --skip-publication-check --skip-release-gate`
- Passed: `npm run release:gate` (`output/release-gate/2026-05-17T03-24-49-730Z-18838`)

## Evidence Paths

- Command logs: `commands/`
- Raw browser results: `raw/judge-wow-hardening-results.json`
- Browser/Chrome state: `browser-state/`
- Screenshots: `screenshots/`
- QA harness: `judge-wow-hardening-check.mjs`

## Remaining External Blockers

- Public YouTube URL is still missing.
- Kaggle submission/writeup URL is still missing.
- True physical cellular-browser smoke is still pending.
- Ollama/no-cloud proof remains unavailable on this host; do not claim it.
