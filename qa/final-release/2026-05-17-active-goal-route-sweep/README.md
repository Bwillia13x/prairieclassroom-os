# 2026-05-17 Active Goal Route Sweep

Broad live Vercel route sweep for the active submission-readiness goal.

## Command

```bash
source ~/.nvm/nvm.sh && nvm use >/dev/null && node qa/final-release/2026-05-17-active-goal-route-sweep/public-route-sweep.mjs
```

## Result

Passed on 2026-05-17.

Evidence:

- `raw/public-route-sweep-results.json`
- `screenshots/desktop-root.png`
- `screenshots/desktop-today.png`
- `screenshots/desktop-classroom.png`
- `screenshots/desktop-tomorrow-plan.png`
- `screenshots/desktop-tomorrow-forecast.png`
- `screenshots/desktop-week.png`
- `screenshots/desktop-prep-differentiate.png`
- `screenshots/desktop-prep-language-tools.png`
- `screenshots/desktop-ops-log-intervention.png`
- `screenshots/desktop-ops-ea-load.png`
- `screenshots/desktop-review-family-message.png`
- `screenshots/desktop-review-support-patterns.png`
- `screenshots/desktop-review-usage-insights.png`
- `screenshots/mobile-root.png`
- `screenshots/mobile-today.png`
- `screenshots/mobile-prep-differentiate.png`
- `screenshots/mobile-review-family-message.png`

Covered checks:

- public root landing page loads on desktop and mobile
- all primary desktop demo routes expose the static-first public demo marker
- key mobile demo routes expose the static-first public demo marker
- active top-level navigation is present on every demo route
- no onboarding, role, or access-code modal blocks the public demo route
- no console errors, console warnings, page errors, request failures, or 4xx/5xx responses
- no document-level horizontal overflow or clipped control text

This is public-demo browser evidence only. It does not resolve the missing public YouTube URL, missing Kaggle writeup/submission URL, or true cellular-browser smoke.
