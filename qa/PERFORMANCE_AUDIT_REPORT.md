# Performance Audit Report

Date: 2026-04-27
Target: PrairieClassroom OS web app, production Vite preview
Base URL: `http://localhost:4173/?demo=true`
Additional route: `http://localhost:4173/?demo=true&tab=today&classroom=demo-okafor-grade34`

## Method

- Built `apps/web` with `VITE_API_URL=http://localhost:3101/api`.
- Ran the local mock stack: inference on `3200`, orchestrator on `3101` with `CORS_ORIGIN=http://localhost:4173`, Vite preview on `4173`.
- Ran Lighthouse `13.1.0` desktop and mobile audits for the default demo route and the Today route.
- Refreshed the Lighthouse JSON/HTML reports, bundle asset list, and build output artifacts.

Artifacts:

- `qa/performance/lighthouse/*.report.json`
- `qa/performance/lighthouse/*.report.html`
- `qa/performance/lighthouse/summary.json`
- `qa/performance/bundle/build-output.txt`
- `qa/performance/bundle/dist-assets.json`

## Current Lighthouse Matrix

Lighthouse lab does not provide field INP. TBT is listed as the closest lab proxy.

| Route | Mode | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS | Transfer | Console |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Demo default, resolves to Classroom | Desktop | 100 | 92 | 100 | 91 | 0.4s | 0.7s | 0ms | 0.007446 | 407 KiB | 0 |
| Demo default, resolves to Classroom | Mobile | 90 | 100 | 100 | 91 | 2.0s | 3.4s | 44ms | 0.000447 | 407 KiB | 0 |
| Today | Desktop | 100 | 94 | 100 | 91 | 0.4s | 0.7s | 0ms | 0.006031 | 379 KiB | 0 |
| Today | Mobile | 90 | 99 | 100 | 91 | 2.0s | 3.4s | 38ms | 0.000447 | 379 KiB | 0 |

Status:

- Performance score target `>= 90`: pass on all four runs.
- CLS target `< 0.1`: pass on all four runs.
- Console errors: pass on all four runs.
- Desktop LCP `< 2.5s`: pass.
- Mobile LCP `< 2.5s`: still fails in Lighthouse lab on both routes. The LCP element is the shell classroom switcher label, not the Today content.

## Closed Findings

### Initial CLS

Status: fixed.

Previous report:

- Default mobile CLS: `0.213`.
- Today desktop CLS: `0.739`.
- Today mobile CLS: `0.738`.

Current report:

- Default mobile CLS: `0.000447`.
- Today desktop CLS: `0.006031`.
- Today mobile CLS: `0.000447`.

Changes that closed it:

- The app page rail can mount during long-form page bootstrap instead of appearing after classroom metadata loads.
- Today renders a route-shaped command-center loading shell instead of returning `null` before profile data.
- The Today command-center skeleton reserves the measured hero height.
- Today keeps below-command sections, workflow nudge, and the footer out of the first viewport until the Today snapshot exists.
- The `StudentCoverageStrip` sentinel is ordered with the coverage strip so it no longer creates a flex gap above the command center.

### Duplicate Today Snapshot Loading

Status: fixed.

`App` owns a shared in-flight Today snapshot request cache, and `TodayPanel` hydrates from `latestTodaySnapshot` instead of issuing a second `/api/today/:classroomId` request.

### Inactive Panel Preload

Status: improved.

Top-level non-critical panels are lazy-loaded. The production build now emits separate `TomorrowPanel`, `WeekPanel`, `PrepPanel`, `OpsPanel`, and `ReviewPanel` chunks instead of a single forced global `panels` chunk.

### Brand PNG in Loading/Skeleton Path

Status: fixed for first-load loading/skeleton UI.

The loading state uses the inline `BrandMark` component, and `SectionSkeleton` uses CSS vector decoration instead of `/brand/prairieclassroom-mark.png`.

### Disabled Sentry Bundle Cost

Status: fixed.

Sentry is dynamically imported only when `VITE_SENTRY_DSN` is present.

### Phone Touch Targets

Status: improved.

Recurring phone/coarse-pointer controls now use the shared `44px` medium control height for the shell action buttons, classroom switcher pill, page-intro info trigger, contextual hint dismiss button, popover menu rows, output feedback controls, visualization header actions, recency rows, and dense chart calendar cells. Source-level regression coverage lives in `apps/web/src/styles/__tests__/touchTargets.test.ts`.

## Remaining Findings

### P1 - Mobile LCP remains above the 2.5s lab target

Evidence:

- Default mobile LCP: `3418ms`.
- Today mobile LCP: `3369ms`.
- Lighthouse attributes mobile LCP to the shell classroom switcher label (`.shell-classroom-pill__label`), not to classroom content or Today snapshot loading.

Likely cause:

- The mobile emulation path is dominated by the initial sticky-header classroom label, API hydration timing, and the broad entry CSS payload.
- The shell wordmark now uses the already-preloaded Inter path. Extra Instrument Sans preloads for chrome/display text were tested and removed because they did not improve the mobile score.

Recommended next step:

- Treat this as a focused mobile critical-rendering pass only if strict Core Web Vitals compliance is required: decouple the classroom switcher label from the first mobile LCP path and reduce first-route CSS before optimizing Today content.

### P2 - Broad entry CSS remains the next size target

Evidence:

- Main CSS remains about `436 KiB` raw / `61 KiB` gzip.
- Lighthouse performance scores now pass, but mobile LCP still misses the strict Core Web Vitals lab target.

Recommended next step:

- Split non-critical visualization and deep-panel CSS if future work needs to push mobile LCP under `2.5s`.

## Verification Commands

```bash
source ~/.nvm/nvm.sh && nvm use
VITE_API_URL=http://localhost:3101/api npm run build -w @prairie/web
PORT=3101 CORS_ORIGIN=http://localhost:4173 INFERENCE_URL=http://127.0.0.1:3200 node services/orchestrator/dist/index.js
npx lighthouse 'http://localhost:4173/?demo=true' --preset=desktop --output=json --output=html --output-path=qa/performance/lighthouse/desktop
npx lighthouse 'http://localhost:4173/?demo=true' --output=json --output=html --output-path=qa/performance/lighthouse/mobile
npx lighthouse 'http://localhost:4173/?demo=true&tab=today&classroom=demo-okafor-grade34' --preset=desktop --output=json --output=html --output-path=qa/performance/lighthouse/today-desktop
npx lighthouse 'http://localhost:4173/?demo=true&tab=today&classroom=demo-okafor-grade34' --output=json --output=html --output-path=qa/performance/lighthouse/today-mobile
```
