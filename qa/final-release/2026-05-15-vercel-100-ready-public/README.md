# Vercel 100-Ready Public Audit - 2026-05-15

Target:
`https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`

Deployment:
`https://prairieclassroom-qxj14httk-echoexes-projects.vercel.app`

Production alias:
`https://prairieclassroom-os.vercel.app`

## Verdict

Ready for judging on the public demo lane.

The previous mobile Lighthouse blocker is resolved on production. The public static-first judge path is still deterministic and fast, and the hosted live lane is now explicitly available with `?live=true` / `?hosted=true` and was validated from the public app origin against the hosted Gemini stack.

The only wording caveat: the cellular check performed here is a throttled iPhone/Chrome proxy, not a physical phone on a carrier network.

## Public Lighthouse

| Mode | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 96 | 100 | 100 | 100 | 2.0s | 2.0s | 0 | 0ms |
| Desktop | 100 | 100 | 100 | 100 | 0.5s | 0.6s | 0.025 | 0ms |

Artifacts:
- `lighthouse/today-mobile.json`
- `lighthouse/today-desktop.json`

## Smoke Tests

- `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo` passed.
- Local static-demo preview smoke passed before deploy.
- Targeted app tests passed: API static/live lane tests, demo API tests, app reducer tests, shell tests, and typography tests.
- Changed-file ESLint passed.

## Mobile Cellular Proxy

Method:
Playwright iPhone 14 emulation with Chrome DevTools `Network.emulateNetworkConditions`, `cellular4g`, 80ms RTT, 1.6Mbps down, 750Kbps up.

Result:
- Today content visible in 1523ms.
- Static demo active: `prairie-static-demo-api`.
- No console errors, request failures, or HTTP >=400 responses.

Artifacts:
- `raw/mobile-cellular-proxy-smoke.json`
- `screenshots/mobile-cellular-proxy-today.png`

## Hosted Gemini Lane

Live URL:
`https://prairieclassroom-os.vercel.app/?live=true&tab=prep&tool=differentiate&classroom=demo-okafor-grade34`

Result:
- Static fallback bypassed: `document.documentElement.dataset.demoApi` was empty.
- Hosted orchestrator health was OK.
- Hosted inference provider: `gemini`.
- Browser-origin generation succeeded with model `gemma-4-26b-a4b-it`.
- Generation returned 5 variants for artifact `judge-public-browser-live-002`.
- First variant title: `Prairie Plant Fraction Investigation`.

Artifact:
- `raw/public-hosted-live-proof-rerun.json`
- `screenshots/public-hosted-live-prep-rerun.png`

## Remaining Boundary

No code or deployment blocker remains from this audit. Do not describe the mobile proxy as a literal physical carrier-network smoke; if a judge requires that exact proof, run the same public URL from a phone off Wi-Fi and confirm the Today screen appears.
