# Final Vercel Browser Audit

Date: 2026-05-15

Base URL: `https://prairieclassroom-os.vercel.app`

Canonical demo URL: `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`

## Verdict

The public Vercel demo is ready for browser review and demo recording. No P0/P1 deployed-app blocker was found in the verified Vercel path.

The demo remains a static-first synthetic public demo. The browser-visible API mode is `prairie-static-demo-api`, and generated public-demo output is labelled `static-demo-fallback`; do not describe this as fresh live hosted-Gemma generation.

## Fresh Checks

- Vercel alias: production deployment `dpl_ETu2zL3fuKmYz93bP2KQYwis5STi`, status `Ready`, created 2026-05-15 11:58 MDT.
- HTTP checks: root returns `307` to `/?demo=true&tab=today&classroom=demo-okafor-grade34`; canonical demo route returns `200`.
- Security headers on canonical route: `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy: geolocation=(), microphone=(), camera=()`.
- Public browser smoke: `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo` passed with `PASS browser smoke`.
- Public route sweep: 35 viewport-route checks, 2 negative checks, static fallback generation path, and screenshots captured.
- Negative checks: stale demo classroom settles back to `demo-okafor-grade34`; protected `alpha-grade4` route shows the access-code prompt.
- Current Today CTA check: SE, mobile, tablet, desktop, and wide viewports all showed `Do a mid-day recovery check with Amira`, `DRAFT AMIRA MESSAGE`, no horizontal overflow, no console errors, and no bad network responses.
- Git/local sync: local `HEAD`, `origin/main`, and remote `refs/heads/main` all match `0b5ced11461cbf41f13026e2160e602097acb4ba`.

## Route Sweep Note

The copied route-sweep script reports five failures because it still expects the older Today text `Start morning triage`. The deployed UI now correctly shows the current mid-day recovery CTA. A focused current-CTA check passed across all five tested viewport classes, so this is a stale assertion in the audit script, not a user-facing regression.

## Lighthouse

| Target | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Today mobile | 87 | 100 | 100 | 100 | 3.1s | 0 | 30ms |
| Today desktop | 100 | 100 | 100 | 100 | 0.6s | 0 | 0ms |

Mobile performance is the only meaningful residual caveat. It is a P2 optimization item, not a release blocker, because accessibility, best practices, SEO, CLS, TBT, route integrity, static fallback behavior, and browser smoke all pass.

## Remaining External Blockers

- Public YouTube/video URL is still external to this browser audit.
- Kaggle writeup/submission URL is still external to this browser audit.
- True cellular-device smoke was not performed in this local browser pass.
- This audit did not refresh hosted Gemini release-gate proof.
