# 2026-05-17 Post-Guardrail Public Demo QA

Focused live browser QA after commit `650e7e7 docs: tighten submission status guardrails`.

## Command

```bash
source ~/.nvm/nvm.sh && nvm use --silent 25.8.2
PRAIRIE_QA_OUT_DIR=qa/final-release/2026-05-17-post-guardrail-public-demo-qa \
PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app \
node qa/final-release/2026-05-16-pre-submit-e2e/public-demo-check.mjs
```

## Result

`PASS public demo browser QA`

Created at `2026-05-17T10:45:20.012Z`.

## Coverage

- Public root landing page loads with title `PrairieClassroom OS`.
- Primary CTA text is `Enter PrairieClassroom`.
- CTA opens `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`.
- Desktop root hero loads optimized WebP: `prairieclassroom-landing-hero-1672.webp`.
- Mobile root hero loads optimized WebP: `prairieclassroom-landing-hero-800.webp`.
- Canonical Today uses the `prairie-static-demo-api` marker.
- Static Differentiate generation completes and shows the static-demo fallback label.
- Desktop and mobile console errors, console warnings, page errors, and request failures are empty.
- Layout failures are zero across root desktop, canonical Today desktop, static Differentiate output, root mobile, and canonical Today mobile.

## Artifacts

- Raw results: `raw/public-demo-check-results.json`
- Screenshots:
  - `screenshots/public-root-desktop.png`
  - `screenshots/public-root-cta-enters-demo.png`
  - `screenshots/public-canonical-today-desktop.png`
  - `screenshots/public-static-differentiate-generated.png`
  - `screenshots/public-root-mobile.png`
  - `screenshots/public-canonical-today-mobile.png`

## Remaining Publication Blockers

This is public-demo browser evidence only. It does not resolve the missing public YouTube URL, missing Kaggle writeup/submission URL, or true phone-on-cellular browser smoke.
