# 2026-05-17 Publication Link Preflight Hardening

## Scope

- Repo: `/Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev`
- Branch: `main`
- Verified commit before this evidence note: `6352b8610a9ae84cb15588b60461e8fdbb0aa126`
- Public demo: `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`

## Current Result

The app and public demo remain green on the current validation path. The full submission remains blocked only by external publication links:

- Public YouTube video URL is missing from `docs/kaggle-paste-block.md`.
- Public Kaggle writeup URL is missing from `docs/submission-copy-pack.md`.

The compact publication preflight was hardened in commit `6352b8610a9ae84cb15588b60461e8fdbb0aa126` so it now requires YouTube/youtu.be for the public video and kaggle.com for the Kaggle writeup, matching the stricter final publication gate.

## Commands Rerun

- Passed: `git status --short --branch`
  - Result: `## main...origin/main`
- Passed: `git rev-list --left-right --count main...origin/main`
  - Result: `0 0`
- Passed: `git rev-parse HEAD && git ls-remote origin refs/heads/main`
  - Result before this evidence note: both resolved to `6352b8610a9ae84cb15588b60461e8fdbb0aa126`.
- Passed: `node --test scripts/lib/__tests__/submission-publish-preflight.test.mjs`
  - Result: 7/7 tests passed.
- Expected fail: `npm run submission:publish-preflight`
  - Passed file checks, Node version, git cleanliness, upstream sync, Vercel CLI/project link, Render CLI/token availability, hosted Gemma env/guard, and public live-demo URL.
  - Failed only `public video url: missing` and `kaggle writeup url: missing`.
- Passed: `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo`
  - Result: `PASS browser smoke`.
- Passed: `curl -I -L --max-time 20 'https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34'`
  - Result: HTTP 200 from Vercel.
- Expected fail: `npm run submission:final-check -- --skip-release-gate`
  - Passed 7/8.
  - Passed claims, proof, system inventory, eval inventory, demo fixture, contrast, and public demo smoke.
  - Failed only publication readiness for the missing Kaggle and YouTube URLs.

## Readiness Boundary

Do not mark the full submission complete until both public links are real and the no-skip `npm run submission:final-check` passes. Local app readiness and public demo readiness are green; publication readiness is still externally blocked.
