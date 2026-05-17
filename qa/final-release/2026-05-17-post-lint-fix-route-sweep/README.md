# 2026-05-17 Post-Lint-Fix Public Route Sweep

Broad live route sweep against the current public Vercel alias after commit `7ccc509`.

## Command

```bash
source ~/.nvm/nvm.sh && nvm use --silent 25.8.2
PRAIRIE_QA_OUT_DIR=qa/final-release/2026-05-17-post-lint-fix-route-sweep \
PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app \
node qa/final-release/2026-05-17-active-goal-route-sweep/public-route-sweep.mjs
```

## Result

`PASS public route sweep`

Created at `2026-05-17T10:58:55.268Z`.

## Coverage

- 13 desktop public-demo routes.
- 4 mobile public-demo routes.
- Public root landing page.
- Canonical Today route.
- Classroom, Tomorrow, Week, Prep, Ops, and Review route families.
- Static-first marker required on demo app routes.
- No blocking modals.
- No horizontal overflow or clipped text recorded.
- Desktop and mobile console errors, console warnings, page errors, request failures, and bad responses are empty.

## Artifacts

- Raw results: `raw/public-route-sweep-results.json`
- Screenshots: `screenshots/`

## Remaining Publication Blockers

This is public-route browser evidence only. It does not resolve the missing public YouTube URL, missing Kaggle writeup/submission URL, or true phone-on-cellular browser smoke.
