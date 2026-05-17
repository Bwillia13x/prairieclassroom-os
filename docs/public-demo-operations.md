# Public Demo Operations

This is the deployment-side checklist for turning the local PrairieClassroom OS proof into a judge-safe public demo.

The submission window for this work is Phase F of [plans/2026-05-18-submission-plan.md](./plans/2026-05-18-submission-plan.md), targeting 2026-05-11 → 2026-05-12.

## Deployment Status (updated 2026-05-17)

- **Configured:** frontend Vercel config is committed at `apps/web/vercel.json`.
- **Configured:** backend Render blueprint is committed at `render.yaml`.
- **Verified:** public source repo `Bwillia13x/prairieclassroom-os` is visible without authentication.
- **Verified:** the local submission video file passes QA at `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4`.
- **Verified:** Vercel project `echoexes-projects/prairieclassroom-os` is linked from `apps/web`, production deployment is live at `https://prairieclassroom-os.vercel.app`, and the root URL now serves the first-entry PrairieClassroom OS landing page before users enter the canonical demo classroom path.
- **Verified:** Render blueprint `prairieclassroom-os` exists and created `prairieclassroom-orchestrator`, `prairieclassroom-inference-gemini`, and the shared `prairieclassroom-internal-auth` env group.
- **Verified:** after the 2026-05-16 landing-page pass, `https://prairieclassroom-os.vercel.app/` serves the landing page, the primary CTA points to `/?demo=true&tab=today&classroom=demo-okafor-grade34`, the canonical demo target returns HTTP 200, stale `?demo=true&classroom=<unknown>` links settle back onto the demo classroom, and `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo` remains the browser-smoke path. The public Vercel demo route is static-first: it preloads the bundled synthetic classroom/profile/today data in-browser before making Render API calls, so reviewer and recording sessions do not wait on Render cold starts. Fresh evidence is in `qa/final-release/2026-05-16-public-demo-check/`. This is public demo validation, not a new hosted release-gate proof baseline.
- **Verified:** the 2026-05-17 continued public QA in `qa/final-release/2026-05-17-continued-bug-sweep/` passes after redeploying the protected-classroom auth recovery fix. Public `smoke:public-demo` and the stricter public browser check reconfirmed HTTP 200 root/canonical URLs, root CTA behavior, the `prairie-static-demo-api` marker, static-fallback output labelling, clean console/page errors, mobile capture, route timing evidence, and zero layout failures after static Differentiate generation.
- **Verified:** the 2026-05-17 continuation public demo QA in `qa/final-release/2026-05-17-continuation-public-demo-qa/` refreshed the live Vercel root/canonical checks after deployment `dpl_997YuiBiEqzrv3KWxU45HMFxoAgT`. It confirms the root landing hero image loads from optimized WebP assets (75 KB desktop, 27 KB mobile), the root CTA enters the canonical demo path, canonical Today uses static-first loading, static Differentiate generation completes with fallback labelling, desktop/mobile screenshots are clean, console/page/request failures are empty, and layout failures are zero.
- **Verified:** the active-goal public demo refresh in `qa/final-release/2026-05-17-active-goal-public-demo-qa/` reconfirmed the public root, root CTA, canonical Today static-first marker, static Differentiate fallback label, desktop/mobile screenshots, empty console/page/request failures, and zero layout failures.
- **Verified:** the active-goal broad route sweep in `qa/final-release/2026-05-17-active-goal-route-sweep/` reconfirmed the public root, all primary desktop demo surfaces, and key mobile demo surfaces with static-first markers, active navigation, no blocking modals, empty console/page/request/bad-response logs, and zero layout failures.
- **Verified:** the active-goal workflow sweep in `qa/final-release/2026-05-17-active-goal-workflow-sweep/` drove live public generated-output flows for Differentiation, Language Tools, Tomorrow Plan, Forecast, EA Briefing, EA Load, Support Patterns, Survival Packet, and Family Message approval. It captured clean screenshots, empty console/page/request/bad-response logs, and zero layout failures.
- **Verified:** the accessibility keyboard sweep in `qa/final-release/2026-05-17-accessibility-keyboard-sweep/` passed against the canonical public Vercel alias after deployment `dpl_997YuiBiEqzrv3KWxU45HMFxoAgT`. It covered 7 desktop and 7 mobile public-demo surfaces with the static-first marker required, zero serious/critical Axe violations, zero keyboard-focus failures, zero mobile touch-target failures, zero horizontal overflow, zero clipped text, and empty console/page/request/bad-response logs.
- **Verified:** earlier 2026-05-17 current-deploy evidence captured Vercel deployment `dpl_B3pic6utiisDsHnANmDqEpcrSBs3` before the later accessibility/touch-target redeploy. Evidence in `qa/final-release/2026-05-17-current-deploy-qa/` covers root, canonical Today desktop/mobile, Classroom, Tomorrow Plan, Week, Prep Differentiate, Ops EA Load, Review Family Message, Review Support Patterns, command palette, static-demo marker, no console/page errors, no bad responses, and no horizontal overflow. Lighthouse JSON in `qa/performance/lighthouse/2026-05-17-current-deploy/` reports canonical desktop `100/100/100/100` and canonical mobile `95/100/100/100` for performance/accessibility/best-practices/SEO. The latest aliased production deployment is listed below.
- **Verified:** deployed submission-readiness screenshots and runtime checks passed at `qa/final-release/2026-05-15-vercel-submission-final/` for the pre-landing root redirect path, Today, Classroom, Tomorrow Plan, Week, Prep Differentiate, Ops EA Load, Review Family Message, Review Support Patterns, command palette, negative protected/stale classroom behavior, and static-fallback-labelled Differentiate output across mobile, tablet, desktop, and wide desktop sizes. The new root landing page must be reviewed separately from that older evidence bundle.
- **Verified:** remaining-work closeout on 2026-05-15 confirmed the GitHub repository is public, and the 2026-05-17 publication preflight verifies the local branch is clean, upstreamed, and synced with `origin/main` before final link publishing.
- **Verified:** on 2026-05-16, after warming Render, `https://prairieclassroom-orchestrator.onrender.com/api/health` returned `ready:true`, the production `?live=true&tab=prep&tool=differentiate&classroom=demo-okafor-grade34` route used the hosted API rather than the bundled static demo (`documentElement.dataset.demoApi` unset), and a direct synthetic Differentiate POST returned 5 variants from `gemma-4-26b-a4b-it` in about 20.7s. This confirms a secondary live-Gemma judge path is available. The default public path remains static-first so reviewers do not wait on 90-180s hosted planning calls; the full hosted proof gate now passes separately at `output/release-gate/2026-05-17T00-36-24-280Z-35954`.
- **Not yet complete:** public video URL, Kaggle URL, and true cellular-browser smoke are still pending. Vercel production stores the server-side `PRAIRIE_GEMINI_API_KEY` and `PRAIRIE_ENABLE_GEMINI_RUNS` values as encrypted env vars, but those values are not browser-exposed.

`npm run submission:final-check -- --skip-release-gate` currently remains blocked by the missing public YouTube URL, missing Kaggle writeup/submission URL, and missing true cellular-browser smoke evidence. The full no-skip submission gate must remain blocked until all final public links are real, reachable, and paired with real cellular-device smoke evidence.

Use [cellular-smoke-checklist.md](./cellular-smoke-checklist.md) to close the physical cellular-browser smoke item without confusing it with desktop HTTP reachability or emulated mobile checks.

## Hosting Findings (2026-05-12 to 2026-05-17)

- Render deployment was completed through the authenticated Render dashboard, then verified through the Render CLI after the dashboard device login completed.
- Vercel CLI authentication is present as `bwillia13x`, and `apps/web` is linked to project `prj_Hf8Vju4JZRTNRBEDJ8dvWyftXlQO`.
- Latest production frontend deployment:
  - canonical URL: `https://prairieclassroom-os.vercel.app`
  - deployment id: `dpl_997YuiBiEqzrv3KWxU45HMFxoAgT`
  - deployment URL: `https://prairieclassroom-jgb08ugoh-echoexes-projects.vercel.app`
  - inspect URL: `https://vercel.com/echoexes-projects/prairieclassroom-os/997YuiBiEqzrv3KWxU45HMFxoAgT`
- `vercel env ls` reports encrypted production `PRAIRIE_GEMINI_API_KEY`, `PRAIRIE_ENABLE_GEMINI_RUNS`, and `VITE_API_URL` env vars for `echoexes-projects/prairieclassroom-os`. `VITE_API_URL` points to `https://prairieclassroom-orchestrator.onrender.com`, but the public Vercel `?demo=true` route bypasses it for handled bundled demo routes so the initial classroom, profile, Today snapshot, and static generations load immediately.
- The public Vercel demo keeps a deliberate static-first path: when the app is loaded from a `*.vercel.app` host with `?demo=true`, it serves deterministic synthetic classroom data and static sample generations in-browser before any hosted API call. The root route is now a first-entry landing page whose CTA opens that static-first demo path. Render remains the hosted synthetic/demo backend for explicit hosted checks and future non-static paths, but it is no longer on the reviewer recording critical path.
- Latest public smoke against `https://prairieclassroom-os.vercel.app` passed with `PASS browser smoke` on 2026-05-17 after the responsive WebP landing hero optimization was pushed and redeployed through Vercel prebuilt production artifacts. Earlier 2026-05-13 direct generation saw Render inference 502/timeouts before service recovery, which drove the frontend fallback hardening; the public Vercel route now avoids that cold-start risk by serving the bundled static demo first.
- Latest focused public browser check in `qa/final-release/2026-05-17-continuation-public-demo-qa/` confirms the optimized WebP root landing hero image, root CTA, canonical Today route, static-first marker, static Differentiate generation, clean console/page errors, empty request failures, zero clipped text, and zero layout failures on the live Vercel deployment. Broader accessibility evidence in `qa/final-release/2026-05-17-accessibility-keyboard-sweep/` confirms the root/canonical route family, desktop/mobile accessibility, keyboard focus, mobile touch targets, empty 4xx/5xx response logs, zero serious/critical Axe violations, zero clipped text, and zero layout failures; `qa/final-release/2026-05-17-active-goal-workflow-sweep/` confirms Differentiation, Language Tools, Tomorrow Plan, Forecast, EA Briefing, EA Load, Support Patterns, Survival Packet, and Family Message approval flows.
- Earlier current-deploy root/canonical demo evidence against `https://prairieclassroom-os.vercel.app` was written to `qa/final-release/2026-05-17-current-deploy-qa/` before the later accessibility/touch-target redeploy. It covers root and canonical demo at desktop/mobile, command palette, static-first demo marker, horizontal overflow, blocking modal absence, broader route smoke, console/page errors, bad responses, request failures, and canonical Lighthouse assertions. The broader deployed route bundle at `qa/final-release/2026-05-15-vercel-submission-final/` predates the first-entry landing page and passed the earlier root redirect behavior plus clean-session first-run, route, generated-output, command-palette, console, bad-response, overflow, mobile/tablet/desktop/wide, protected-route, stale-demo-classroom, static-fallback label, security/header, and Lighthouse assertions.
- A plain shell does not export the hosted Gemma key or enable hosted runs. `gemini:readycheck` reports the key and guard only after exporting `.env`; that confirms local credential readiness but does not create a new hosted proof artifact.
- In the remaining-work closeout, `source ~/.nvm/nvm.sh && nvm use --silent 25.8.2 && set -a && source .env && set +a && npm run submission:publish-preflight` passed every local, GitHub, Vercel, Render, hosted-Gemma-env, and live-demo check. That compact publish preflight now also reports the missing true cellular-browser smoke evidence, so the remaining compact-preflight failures are the missing public video URL, missing Kaggle writeup URL, and missing cellular evidence.
- Ollama is not a viable proof lane on the current maintenance host: `npm run host:preflight:ollama` reports the Ollama CLI unavailable on an 8 GiB RAM host with 16.76 GiB free disk.
- With Node `v25.8.2`, `npm run submission:publish-preflight` passes local file checks for `render.yaml`, `apps/web/vercel.json`, final MP4, upstream configuration, Vercel CLI availability, Vercel project link, Render availability, hosted Gemma env checks when `.env` is exported, and public live demo URL. The compact preflight remains blocked until the public video URL, Kaggle writeup URL, and true cellular-browser smoke evidence are real.

## Deploy Targets (selected 2026-04-30)

- **Frontend:** Vercel free tier. `apps/web/vercel.json` is committed and configures SPA rewrites, security headers, and immutable asset caching for the production build.
- **Orchestrator + inference:** Render free tier, via the root `render.yaml` blueprint.
  - `prairieclassroom-orchestrator`: Node service running the Express API.
  - `prairieclassroom-inference-gemini`: Python Flask service running hosted Gemma mode.
  - Expected tradeoff: free-tier cold starts are acceptable for a judge demo if the URL is warmed before review; if cellular smoke is unreliable, submit the recorded demo as the primary demo artifact.

## Pre-deploy Setup (Phase B/F)

```bash
# Confirm local publication prerequisites and credentials before external deploy.
npm run submission:publish-preflight

# Frontend — already linked to echoexes-projects/prairieclassroom-os
cd apps/web
npx vercel project inspect prairieclassroom-os
# Set the API base after the Render orchestrator URL exists
npx vercel env add VITE_API_URL production
```

Do not set the Gemini key with a `VITE_` prefix. The production Vercel project already has encrypted server-side `PRAIRIE_GEMINI_API_KEY` and `PRAIRIE_ENABLE_GEMINI_RUNS` values as of 2026-05-12; the current Vite-only public demo cannot read those values in the browser.

For the backend (Render blueprint):

```bash
# Create the blueprint from render.yaml in the Render dashboard.
# Then set the sync:false values:
#   prairieclassroom-orchestrator:
#     CORS_ORIGIN=https://<vercel-frontend-url>
#   prairieclassroom-inference-gemini:
#     PRAIRIE_GEMINI_API_KEY=<secret>
#
# The orchestrator sets INFERENCE_URL to the Render inference service's public
# URL because the initial private hostport health check degraded on this free-tier
# blueprint. `/generate` remains protected by the shared
# PRAIRIE_INFERENCE_AUTH_TOKEN env group.
```

## Demo URL

Use a URL that lands directly on the strongest demo state:

```text
/?demo=true&tab=today&classroom=demo-okafor-grade34
```

Current public demo target:

```text
https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34
```

The production root URL now opens the PrairieClassroom OS landing page. Its primary CTA enters this target, so reviewers who choose "Enter PrairieClassroom" start in demo mode instead of hitting classroom-code restrictions.

This target is a public synthetic demo. All checked-in `data/synthetic_classrooms/classroom_*.json` profiles are synthetic public demo fixtures for submission and are explicitly marked `is_demo: true`, so they bypass classroom-code auth and report `requires_access_code: false` from the hosted classroom selector. Future real or de-identified classroom profiles loaded through `PRAIRIE_DATA_DIR` must stay non-demo and protected by access codes; do not use a global unlock flag that would expose arbitrary hosted data. Current production preloads the bundled static demo data for the Vercel `?demo=true` route, even though `VITE_API_URL` remains configured for Render-hosted checks. Do not describe static demo responses as live hosted-Gemma generation or as a new hosted release-gate proof baseline.

`?demo=true` now suppresses first-run onboarding and role-selection modals for the demo classroom. The Quick Help button still lets reviewers open the tour manually.

Secondary live-Gemma judge path, after manually warming Render:

```text
https://prairieclassroom-os.vercel.app/?live=true&tab=prep&tool=differentiate&classroom=demo-okafor-grade34
```

Use this as an optional proof lane only. The live path makes real hosted Gemma calls against synthetic/demo data through Render and can be slow or fail on provider instability. Keep the primary judging link on the static-first `?demo=true` route unless the reviewer is explicitly testing live hosted inference.

## Recommended Hackathon Mode

For public judging and demo recording, the currently deployed path is a static-first synthetic demo lane:

- Web: production Vite build.
- API: bundled static demo API for public Vercel `?demo=true` routes.
- Inference: deterministic static sample outputs labelled `static-demo-fallback`.
- Data: `data/synthetic_classrooms/` only, with every bundled classroom profile classified as synthetic public demo data via `is_demo: true`.
- Memory: bundled static demo snapshot only.

The Render-hosted path remains available for hosted synthetic checks and future dynamic public demos:

- API: Render-hosted Express orchestrator at `https://prairieclassroom-orchestrator.onrender.com`.
- Inference: Render-hosted guarded Gemini service at `https://prairieclassroom-inference-gemini.onrender.com`.
- Memory: demo SQLite memory.

Do not use real student or classroom data in the public demo.

## Hosted Runtime Shape

The Render-hosted upgrade path needs three running pieces:

1. Inference service

```bash
PRAIRIE_INFERENCE_HOST=0.0.0.0 PRAIRIE_INFERENCE_PORT=$PORT \
python services/inference/server.py --mode mock
```

For hosted Gemma 4 proof runs or the Render inference service, add:

```bash
PRAIRIE_ENABLE_GEMINI_RUNS=true
PRAIRIE_GEMINI_API_KEY=<secret>
python services/inference/server.py --mode gemini
```

2. Orchestrator API

```bash
PORT=$PORT \
INFERENCE_URL=https://<inference-service-host> \
CORS_ORIGIN=https://<web-demo-host> \
npx tsx services/orchestrator/server.ts
```

On Render, `render.yaml` sets `INFERENCE_URL=https://prairieclassroom-inference-gemini.onrender.com` for the orchestrator and still carries `INFERENCE_HOSTPORT` as the private-route reference. The public inference `/generate` endpoint remains protected by the shared `PRAIRIE_INFERENCE_AUTH_TOKEN`.

3. Web build

```bash
VITE_API_URL=https://<api-demo-host>/api npm run build -w apps/web
```

Serve `apps/web/dist` from the public static host.

## Public Demo Smoke

Before attaching the URL to Kaggle:

```bash
PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo
```

1. Open the final public URL in a private/incognito browser.
2. Confirm the root URL shows the PrairieClassroom OS landing page and its primary CTA points to `?demo=true&tab=today&classroom=demo-okafor-grade34`.
3. Click the CTA and confirm the first app screen is the Today dashboard, not onboarding or role selection.
4. Confirm these panels load without auth or paywall:
   - Today
   - Differentiate
   - Tomorrow Plan
   - Family Message
   - Support Patterns
5. Generate or open at least one output on the public demo path.
6. Confirm no browser console errors.
7. Confirm the visible footer says the app is built for the Gemma 4 Good Hackathon.
8. If a separate hosted Render/Gemini check is needed, run it intentionally outside the public recording path and warm the Render services before the check.

## Submission Boundaries

The public demo may honestly claim:

- hosted Gemma 4 proof passed on synthetic/demo data;
- mock structural gate passes with no paid services;
- public synthetic Vercel demo passes browser smoke using bundled synthetic/demo data;
- classroom memory and retrieval are implemented;
- teacher approval is required for family messages.

The public demo must not claim:

- real teacher validation;
- real classroom deployment;
- all data stays local for any hosted Render/Gemini check;
- static demo output as live model generation;
- public hosted smoke as a new full hosted release-gate proof baseline;
- Ollama readiness on the current 8 GiB maintenance host.
