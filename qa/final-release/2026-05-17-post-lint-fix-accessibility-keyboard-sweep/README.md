# 2026-05-17 Post-Lint-Fix Public Accessibility And Keyboard Sweep

Live accessibility, keyboard, and mobile touch-target sweep against the current public Vercel alias after commit `7ccc509`.

## Command

```bash
source ~/.nvm/nvm.sh && nvm use --silent 25.8.2
PRAIRIE_QA_OUT_DIR=qa/final-release/2026-05-17-post-lint-fix-accessibility-keyboard-sweep \
PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app \
node qa/final-release/2026-05-17-accessibility-keyboard-sweep/public-accessibility-keyboard-sweep.mjs
```

## Result

`PASS public accessibility keyboard sweep`

Created at `2026-05-17T10:58:54.924Z`.

## Coverage

- 14 public-demo surfaces: 7 desktop and 7 mobile.
- Axe violations: 0.
- Keyboard-focus failures: 0.
- Script failure list: empty.
- Console errors, console warnings, page errors, request failures, and bad responses are empty.
- Layout checks report no horizontal overflow or clipped text failures.

## Artifacts

- Raw results: `raw/public-accessibility-keyboard-sweep-results.json`
- Screenshots: `screenshots/`

## Remaining Publication Blockers

This is browser automation evidence only. It does not resolve the missing public YouTube URL, missing Kaggle writeup/submission URL, or true phone-on-cellular browser smoke.
