# 2026-05-17 Accessibility Keyboard Sweep

Live Vercel accessibility, keyboard-focus, and mobile touch-target sweep for the active submission-readiness goal.

## Command

```bash
source ~/.nvm/nvm.sh && nvm use >/dev/null && node qa/final-release/2026-05-17-accessibility-keyboard-sweep/public-accessibility-keyboard-sweep.mjs
```

## Result

Passed on 2026-05-17 against `https://prairieclassroom-os.vercel.app` after production deployment `dpl_DuYtYunconaSaJbayb1NyPVsMfUL` was aliased to the canonical public URL.

Evidence:

- `raw/public-accessibility-keyboard-sweep-results.json`
- `screenshots/desktop-today.png`
- `screenshots/desktop-classroom.png`
- `screenshots/desktop-week.png`
- `screenshots/desktop-prep-differentiate.png`
- `screenshots/desktop-tomorrow-plan.png`
- `screenshots/desktop-ops-ea-briefing.png`
- `screenshots/desktop-review-family-message.png`
- `screenshots/mobile-today.png`
- `screenshots/mobile-classroom.png`
- `screenshots/mobile-week.png`
- `screenshots/mobile-prep-differentiate.png`
- `screenshots/mobile-tomorrow-plan.png`
- `screenshots/mobile-ops-ea-briefing.png`
- `screenshots/mobile-review-family-message.png`

Covered checks:

- Desktop and mobile passes across Today, Classroom, Week, Prep Differentiate, Tomorrow Plan, Ops EA Briefing, and Review Family Message.
- Static-first public-demo marker was required and present.
- Serious and critical Axe violations were zero.
- Keyboard-focus failures were zero after real `Tab` navigation.
- Mobile touch-target failures were zero after the chart and compact-control fixes.
- Horizontal overflow and clipped text were zero.
- Console errors, console warnings, page errors, request failures, and 4xx/5xx responses were empty.

This is public-demo browser evidence only. It does not resolve the missing public YouTube URL, missing Kaggle writeup/submission URL, or true cellular-browser smoke.
