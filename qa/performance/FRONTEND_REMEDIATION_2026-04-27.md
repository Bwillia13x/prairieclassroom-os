# Frontend Remediation - 2026-04-27

## Scope

This pass addressed the highest-confidence frontend issues from `qa/PERFORMANCE_AUDIT_REPORT.md` without changing product behavior:

- duplicate Today snapshot loading
- inactive panel code preloaded on first paint
- disabled Sentry bundled into the main entry
- large brand PNG pulled by loading and skeleton UI
- non-compositor first-load panel transition cost
- app footer participating in first-paint layout before classrooms hydrate
- Today command-center CLS caused by below-hero sections and the sticky coverage sentinel entering the flex order before snapshot data stabilized
- the shell wordmark and recurring phone controls keeping avoidable font and touch-target risk in the first mobile viewport

## Changes

- `TodayPanel` now hydrates from `latestTodaySnapshot` in app context instead of issuing its own `/api/today/:classroomId` request.
- `App` owns a shared in-flight Today snapshot request cache so React StrictMode development replays do not send duplicate Today requests.
- Prep, Ops, Review, Tomorrow, and Week are loaded with `React.lazy`/`Suspense`.
- Vite no longer forces every panel into a single preloaded `panels` manual chunk.
- The initial loading state uses the inline `BrandMark` component rather than `/brand/prairieclassroom-mark.png`.
- `SectionSkeleton` uses CSS vector decoration instead of the same brand PNG watermark.
- `PageIntro` images now use `loading="lazy"` and `decoding="async"`.
- Sentry is dynamically imported only when `VITE_SENTRY_DSN` is present.
- First-load panel animation no longer uses `filter: blur(...)` or an explicit delay.
- The Today route now renders a command-center-sized pending shell before profile/snapshot data arrives.
- The Today pulse, workflow nudge, and footer wait for the Today snapshot so they do not enter the first viewport and then shift below preview/coverage content.
- The `StudentCoverageStrip` sentinel is ordered with the coverage strip on Today, so its 1px in-flow marker no longer creates a 40px flex gap above the command center.
- The shell wordmark now stays on the already-preloaded Inter path; the extra display-face preload was removed from `index.html`.
- Recurring phone/coarse-pointer controls now use the shared `44px` medium control height across shell actions, the classroom switcher pill, page-intro info, contextual hints, popover rows, output feedback, visualization actions, recency rows, and dense chart calendar cells.

## Validation

Commands run from repo root:

```bash
source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run typecheck
source ~/.nvm/nvm.sh && nvm use >/dev/null && npx vitest run apps/web/src/panels/__tests__/TodayPanel.test.tsx apps/web/src/panels/__tests__/TodayPanel.drilldown.test.tsx apps/web/src/__tests__/App.shell.test.tsx
source ~/.nvm/nvm.sh && nvm use >/dev/null && npx vitest run apps/web/src/styles/__tests__/touchTargets.test.ts apps/web/src/__tests__/App.shell.test.tsx apps/web/src/components/__tests__/DataVisualizationsA11y.test.tsx
source ~/.nvm/nvm.sh && nvm use >/dev/null && npm --prefix apps/web run build
source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run lint
source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run smoke:browser
source ~/.nvm/nvm.sh && nvm use >/dev/null && VITE_API_URL=http://localhost:3101/api npm run build -w @prairie/web
npx lighthouse 'http://localhost:4173/?demo=true' --preset=desktop --output=json --output=html --output-path=qa/performance/lighthouse/desktop
npx lighthouse 'http://localhost:4173/?demo=true' --output=json --output=html --output-path=qa/performance/lighthouse/mobile
npx lighthouse 'http://localhost:4173/?demo=true&tab=today&classroom=demo-okafor-grade34' --preset=desktop --output=json --output=html --output-path=qa/performance/lighthouse/today-desktop
npx lighthouse 'http://localhost:4173/?demo=true&tab=today&classroom=demo-okafor-grade34' --output=json --output=html --output-path=qa/performance/lighthouse/today-mobile
```

Results:

- `npm run typecheck`: pass
- targeted Vitest (`TodayPanel`, `TodayPanel.drilldown`, `App.shell`): pass
- targeted touch-target Vitest (`touchTargets`, `App.shell`, `DataVisualizationsA11y`): pass
- `npm --prefix apps/web run build`: pass
- `npm run lint`: pass
- `npm run smoke:browser`: pass
- Production-preview Lighthouse matrix: pass for performance score `>= 90`, CLS `< 0.1`, and console errors `0` on all four tested runs

Production build evidence:

- Initial HTML now preloads `react` and `visualizations`, but not a global `panels` JS/CSS chunk.
- Deferred panel chunks are emitted separately, including `TomorrowPanel`, `PrepPanel`, `OpsPanel`, `ReviewPanel`, and `WeekPanel`.
- Main JS entry is about `231 KiB` raw / `63 KiB` gzip after deferring inactive panel surfaces and no-DSN Sentry.

Runtime browser check:

- Loaded `http://localhost:5173/?demo=true&tab=today`.
- Clicked Prep, Ops, Review, and Tomorrow.
- Observed `1` request to `/api/today/demo-okafor-grade34`.
- Observed lazy panel module requests on navigation.
- Console warnings/errors: `0`.

## Lighthouse Closeout

| Route | Mode | Performance | LCP | CLS | Console |
|---|---:|---:|---:|---:|---:|
| Demo default | Desktop | 100 | 0.7s | 0.007446 | 0 |
| Demo default | Mobile | 90 | 3.4s | 0.000447 | 0 |
| Today | Desktop | 100 | 0.7s | 0.006031 | 0 |
| Today | Mobile | 90 | 3.4s | 0.000447 | 0 |

The original CLS blocker is closed. The remaining performance caveat is mobile Lighthouse LCP above `2.5s`; the current LCP element is the shell classroom switcher label, not the Today content.
