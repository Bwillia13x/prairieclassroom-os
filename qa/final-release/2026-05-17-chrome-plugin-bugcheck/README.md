# 2026-05-17 Chrome Plugin Bugcheck

Chrome-backed app testing pass against:

`https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`

## Result

Pass for app behavior. No app-code blocker was found in Chrome.

## Chrome Setup

- Backend: Chrome plugin / Codex Chrome Extension
- Profile selected by the extension: `Person 1`
- Initial `chrome://newtab/` user tab could not be claimed because Chrome internal pages are not claimable.
- A fresh controlled Chrome tab was created through `chromeBrowser.tabs.new()` and used for the QA pass.

## Covered Routes

The run loaded these public demo routes in Chrome:

- Today
- Classroom
- Tomorrow / Tomorrow Plan
- Week
- Prep / Differentiate
- Ops / EA Briefing
- Review / Family Message

Each route confirmed:

- `document.documentElement.dataset.demoApi === "prairie-static-demo-api"`
- no onboarding, role, or access modal
- no horizontal overflow
- no clipped button/link/chip text in the audited controls
- no visible `undefined`, `null`, or `NaN` placeholder text

## Covered Workflows

- Differentiate: pasted source text, generated variants, and captured the generated result.
- Family Message: drafted a praise message, confirmed copy stayed disabled before teacher approval, opened the approval dialog, and captured the approval state.

## Console Triage

The raw Chrome result records five identical console errors on the initial Today URL:

`Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received`

This is classified as Chrome-extension message-channel noise rather than an app blocker because:

- the message is a Chrome extension messaging failure pattern
- it appeared only as a browser console artifact, not as a UI, route, request, modal, layout, or workflow failure
- the same public demo passed the independent headless route, workflow, accessibility, keyboard, and public-smoke sweeps with empty app console/page/request failures

The raw file keeps the console anomaly in `failures` for audit honesty:

- `raw/chrome-plugin-bugcheck-results.json`

## Screenshots

- `screenshots/chrome-today.png`
- `screenshots/chrome-classroom.png`
- `screenshots/chrome-tomorrow-plan.png`
- `screenshots/chrome-week.png`
- `screenshots/chrome-prep-differentiate.png`
- `screenshots/chrome-ops-ea-briefing.png`
- `screenshots/chrome-review-family-message.png`
- `screenshots/chrome-workflow-differentiate-generated.png`
- `screenshots/chrome-workflow-family-message-approval-dialog.png`
