# 2026-05-17 Last Runtime Sweep

Final app-runtime sweep against the public static-first Vercel demo and a local
mock stack with a protected-classroom access-code override.

## Result

Passed. No app-runtime P0/P1 blockers found.

## Public Demo

- Canonical URL: `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`
- Static-first marker verified: `documentElement.dataset.demoApi === "prairie-static-demo-api"`
- Route/viewport matrix: 48 captures across mobile `393x852`, tablet `768x1024`, desktop `1440x900`, and wide `1920x1080`
- Required route list covered: `/`, Today, Classroom, Tomorrow Plan, Week, Prep Differentiate, Prep Language Tools, Ops Log Intervention, Ops EA Load, Ops EA Briefing, Review Family Message, Review Support Patterns
- Navigation covered: desktop nav clicks, mobile nav clicks, command palette route to Support Patterns, visible keyboard focus, URL-backed route state
- Workflow outputs covered: Differentiate, Language Tools, Tomorrow Plan, Forecast, EA Briefing, EA Load, Support Patterns, Survival Packet print, Family Message draft/approval boundary
- Accessibility/keyboard/touch sweep: zero failures, zero browser errors, zero request failures

## Local Protected-Classroom Check

Local stack was first started with:

```bash
PRAIRIE_CLASSROOM_ACCESS_CODES_JSON='{"alpha-grade4":"qa-code-123"}' npm run pilot:start
```

Verified:

- `alpha-grade4` exposed `requires_access_code: true`
- access-code prompt appeared
- wrong code was rejected
- valid code recovered Today
- saved code survived reload
- `demo-okafor-grade34` still opened without an access-code prompt

Then a stricter local-only fixture copy was used from
`local-protected-smoke/protected-data/`, where `alpha-grade4` was set to
`is_demo: false` with `access_code: "qa-code-123"` while the canonical demo
classroom stayed `is_demo: true`. That non-demo protected-classroom flow passed
the same prompt, wrong-code, valid-code, reload, and demo-safe checks.

## Lighthouse

Desktop: performance 100, accessibility 100, best-practices 100, SEO 100, CLS 0.

Mobile: performance 94, accessibility 100, best-practices 100, SEO 100, CLS 0.

## Key Artifacts

- `viewport-command-sweep/raw/public-viewport-command-sweep-results.json`
- `route-sweep/raw/public-route-sweep-results.json`
- `workflow-sweep/raw/public-workflow-sweep-results.json`
- `accessibility-keyboard-sweep/raw/public-accessibility-keyboard-sweep-results.json`
- `local-protected-smoke/raw/protected-classroom-flow-results.json`
- `local-protected-smoke/raw/protected-non-demo-classroom-flow-results.json`
- `local-protected-smoke/raw/local-smoke-browser-protected.log`
- `lighthouse/lighthouse-summary.json`
- `browser-public-today.json`
