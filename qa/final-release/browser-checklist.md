# Browser Verification Checklist

Date: 2026-04-27
Target: `http://localhost:5173/?demo=true`
Mode: local mock/demo stack

## Automated Browser Checks

| Check | Result | Evidence |
|---|---|---|
| Mock release gate | Pass | `output/release-gate/2026-04-28T00-38-53-468Z-24492/summary.json` |
| Browser smoke | Pass | `npm run smoke:browser` |
| UI evidence capture | Pass | `output/playwright/ui-evidence/2026-04-27T22-51-09-966Z/manifest.json` |
| Desktop route audit | Pass | `qa/final-release/metrics/2026-04-27-current.json` |
| Tablet route audit | Pass | `qa/final-release/metrics/2026-04-27-current.json` |
| Mobile route audit | Pass | `qa/final-release/metrics/2026-04-27-current.json` |
| iPhone SE route audit | Pass | `qa/final-release/metrics/2026-04-27-current.json` |
| Console/page errors | Pass | `qa/final-release/console-errors.log` is empty |
| Contrast | Pass | `output/contrast-report.md` |
| Production-preview Lighthouse | Pass with caveat | Performance score `>= 90`, CLS `< 0.1`, and console errors `0` across default/Today desktop/mobile; mobile LCP remains `3.4s`, attributed to the shell classroom switcher label. |

## Top-Level Routes

| View | Desktop | Tablet | Mobile | SE | Notes |
|---|---|---|---|---|---|
| Classroom | Pass | Pass | Pass | Pass | Active panel visible; no horizontal overflow. |
| Today | Pass | Pass | Pass | Pass | First-viewport command card clears bottom nav on mobile evidence. |
| Tomorrow | Pass | Pass | Pass | Pass | Tool state restores to Tomorrow Plan. |
| Week | Pass | Pass | Pass | Pass | Forecast overview visible across viewports. |
| Prep | Pass | Pass | Pass | Pass | Differentiation lane visible and mobile nav remains usable. |
| Ops | Pass | Pass | Pass | Pass | Log Intervention lane visible; operations summary readable on mobile. |
| Review | Pass | Pass | Pass | Pass | Family Message lane visible; mobile first viewport has clear review context. |

## Manual Visual Spot Check

| Surface | Result | Screenshot |
|---|---|---|
| Desktop Classroom | Pass | `qa/final-release/screenshots/2026-04-27-current/desktop-classroom.png` |
| Mobile Today | Pass | `qa/final-release/screenshots/2026-04-27-current/mobile-today.png` |
| Mobile Ops | Pass | `qa/final-release/screenshots/2026-04-27-current/mobile-ops.png` |
| Mobile Prep | Pass | `qa/final-release/screenshots/2026-04-27-current/mobile-prep.png` |
| Mobile Review | Pass | `qa/final-release/screenshots/2026-04-27-current/mobile-review.png` |
| iPhone SE Tomorrow | Pass | `qa/final-release/screenshots/2026-04-27-current/se-tomorrow.png` |

## Open Items

- Production-preview Lighthouse has been rerun. Performance score and CLS now pass across the default and Today routes on desktop/mobile; the remaining performance caveat is mobile LCP at `3.4s`, attributed to the shell classroom switcher label.
- Recurring phone/coarse-pointer controls were remediated to the shared 44px hit-area contract; dense SVG chart hit rings remain the main strict target-size follow-up if needed.
- Hosted Gemini and paid Vertex were not rerun as part of this browser-only audit pass.
