# 2026-05-17 Active Goal Public Demo QA

Focused live Vercel browser QA for the active submission-readiness goal.

## Command

```bash
source ~/.nvm/nvm.sh && nvm use >/dev/null && PRAIRIE_QA_OUT_DIR=qa/final-release/2026-05-17-active-goal-public-demo-qa node qa/final-release/2026-05-16-pre-submit-e2e/public-demo-check.mjs
```

## Result

Passed on 2026-05-17.

Evidence:

- `raw/public-demo-check-results.json`
- `screenshots/public-root-desktop.png`
- `screenshots/public-root-mobile.png`
- `screenshots/public-root-cta-enters-demo.png`
- `screenshots/public-canonical-today-desktop.png`
- `screenshots/public-canonical-today-mobile.png`
- `screenshots/public-static-differentiate-generated.png`

Covered checks:

- public root renders the first-entry PrairieClassroom OS landing page
- root CTA enters `?demo=true&tab=today&classroom=demo-okafor-grade34`
- canonical Today route exposes `documentElement.dataset.demoApi === "prairie-static-demo-api"`
- static Differentiate generation completes with the static-demo fallback label
- desktop and mobile captures have no horizontal overflow or clipped control text
- console errors, console warnings, page errors, and request failures are empty

This is public-demo browser evidence only. It does not resolve the missing public YouTube URL, missing Kaggle writeup/submission URL, or true cellular-browser smoke.
