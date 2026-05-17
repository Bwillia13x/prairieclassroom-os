# 2026-05-17 Judge-Wow Hardening QA

## Scope

- Public URL: `https://prairieclassroom-os.vercel.app`
- Canonical public demo: `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`
- Local canonical demo: `http://localhost:5173/?demo=true&tab=today&classroom=demo-okafor-grade34`
- Proof lane: public `?demo=true` is the static-first bundled synthetic demo path. This bundle does not claim live hosted Gemma generation.

## Browser Surfaces Used

- Browser / Codex in-app browser: local canonical route after the mobile touch-target fix.
- Chrome / real Chrome extension backend: public canonical route before deploy, confirming static-first marker and desktop state. Post-deploy retry found Chrome was not running; the extension and native host checks passed and are logged in `commands/chrome-extension-checks-after-deploy.log`.
- Playwright Chromium: root/canonical desktop and mobile checks, command palette, reduced-motion probe, screenshots, public/local smoke scripts.
- Computer Use: not used; no Mac UI state was required.

## Findings

- P0: none found in this pass.
- P1: none remaining after the prior auth/default-demo recovery fixes in this worktree.
- P2: public mobile canonical demo had two visible top-bar controls under the 40 px touch-target threshold before this fix. The 2026-05-17 post-deploy check now passes with zero public issues and no mobile touch-target regression.

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
- Passed: `npx vercel build --prod`
- Passed: `npx vercel deploy --prebuilt --prod --yes`
- Passed: post-deploy `node qa/final-release/2026-05-17-judge-wow-hardening/judge-wow-hardening-check.mjs`
- Passed: post-deploy `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo`

## Deployment

- Commit deployed: `a39afa5` (`Harden public demo recovery and mobile controls`)
- Production alias: `https://prairieclassroom-os.vercel.app`
- Deployment URL: `https://prairieclassroom-4veol6yuk-echoexes-projects.vercel.app`
- Inspect URL: `https://vercel.com/echoexes-projects/prairieclassroom-os/DJrbcSPujHknALkjSyAk1TiHhDiW`

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
