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
- 2026-04-29 follow-up: the production preview now supports a same-origin `/api` proxy via `PRAIRIE_PREVIEW_API_TARGET`, so Lighthouse can measure the app without local cross-port CORS preflights.
- 2026-04-29 follow-up: multi-tool page CSS, collapsed Classroom intelligence charts, roster detail, health trends, student detail drawer charts, and DataVisualization CSS are deferred behind lazy route/interaction boundaries instead of blocking Classroom/Today first paint.
- 2026-04-29 follow-up: the Inter preload is desktop-only (`min-width: 700px`) so strict mobile first paint is not competing with font transfer before CSS/JS.

## Validation

Commands run from repo root:

```bash
source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run typecheck
source ~/.nvm/nvm.sh && nvm use >/dev/null && npx vitest run apps/web/src/panels/__tests__/TodayPanel.test.tsx apps/web/src/panels/__tests__/TodayPanel.drilldown.test.tsx apps/web/src/__tests__/App.shell.test.tsx
source ~/.nvm/nvm.sh && nvm use >/dev/null && npx vitest run apps/web/src/styles/__tests__/touchTargets.test.ts apps/web/src/__tests__/App.shell.test.tsx apps/web/src/components/__tests__/DataVisualizationsA11y.test.tsx
source ~/.nvm/nvm.sh && nvm use >/dev/null && npm --prefix apps/web run build
source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run lint
source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run smoke:browser
source ~/.nvm/nvm.sh && nvm use >/dev/null && VITE_API_URL=/api npm run build -w @prairie/web
PRAIRIE_PREVIEW_API_TARGET=http://localhost:3101 npm run preview -w @prairie/web -- --host 127.0.0.1 --port 4173
npx lighthouse 'http://127.0.0.1:4173/?demo=true&classroom=demo-okafor-grade34&tab=classroom' --preset=desktop --output=json --output=html --output-path=qa/performance/lighthouse/desktop
npx lighthouse 'http://127.0.0.1:4173/?demo=true&classroom=demo-okafor-grade34&tab=classroom' --output=json --output=html --output-path=qa/performance/lighthouse/mobile
npx lighthouse 'http://127.0.0.1:4173/?demo=true&classroom=demo-okafor-grade34&tab=today' --preset=desktop --output=json --output=html --output-path=qa/performance/lighthouse/today-desktop
npx lighthouse 'http://127.0.0.1:4173/?demo=true&classroom=demo-okafor-grade34&tab=today' --output=json --output=html --output-path=qa/performance/lighthouse/today-mobile
```

Results:

- `npm run typecheck`: pass
- targeted Vitest (`TodayPanel`, `TodayPanel.drilldown`, `App.shell`): pass
- targeted touch-target Vitest (`touchTargets`, `App.shell`, `DataVisualizationsA11y`): pass
- `npm --prefix apps/web run build`: pass
- `npm run lint`: pass
- `npm run smoke:browser`: pass
- Production-preview Lighthouse matrix: pass for performance score `>= 90`, CLS `< 0.1`, and console errors `0` on all four tested runs. Mobile LCP remains above the strict `2.5s` target.

Production build evidence:

- Initial HTML now preloads `react`, but not global `panels` or `visualizations` JS/CSS chunks.
- Deferred panel chunks are emitted separately, including `TomorrowPanel`, `PrepPanel`, `OpsPanel`, `ReviewPanel`, and `WeekPanel`.
- Deferred interaction chunks are emitted separately for `HealthBar`, `StudentRoster`, `StudentDetailView`, `ClassroomIntelligenceGrid`, and the DataVisualization submodules.
- Main JS entry is about `237 KiB` raw / `65 KiB` gzip after deferring inactive panel surfaces, chart surfaces, and no-DSN Sentry.

Runtime browser check:

- Loaded `http://localhost:5173/?demo=true&tab=today`.
- Clicked Prep, Ops, Review, and Tomorrow.
- Observed `1` request to `/api/today/demo-okafor-grade34`.
- Observed lazy panel module requests on navigation.
- Console warnings/errors: `0`.

## Lighthouse Closeout

| Route | Mode | Performance | LCP | CLS | Console |
|---|---:|---:|---:|---:|---:|
| Classroom | Desktop | 100 | 0.8s | 0.001715 | 0 |
| Classroom | Mobile | 93 | 2.8s | 0 | 0 |
| Today | Desktop | 100 | 0.7s | 0.000004 | 0 |
| Today | Mobile | 90 | 3.2s | 0 | 0 |

The original CLS blocker is closed. The 2026-04-29 pass also removed cross-port CORS preflights from the preview run and deferred chart CSS/JS from the first paint path. The remaining strict performance caveat is mobile Lighthouse LCP above `2.5s`: Classroom is close at `2.8s`, while Today remains `3.2s` because its data-complete command hero becomes the largest contentful element. A placeholder-first hero experiment reduced no real user work and caused measurable CLS, so it was not kept.
