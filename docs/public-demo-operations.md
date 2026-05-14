# Public Demo Operations

This is the deployment-side checklist for turning the local PrairieClassroom OS proof into a judge-safe public demo.

The submission window for this work is Phase F of [plans/2026-05-18-submission-plan.md](./plans/2026-05-18-submission-plan.md), targeting 2026-05-11 → 2026-05-12.

## Deployment Status (updated 2026-05-14)

- **Configured:** frontend Vercel config is committed at `apps/web/vercel.json`.
- **Configured:** backend Render blueprint is committed at `render.yaml`.
- **Verified:** public source repo `Bwillia13x/prairieclassroom-os` is visible without authentication.
- **Verified:** the local submission video file passes QA at `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4`.
- **Verified:** Vercel project `echoexes-projects/prairieclassroom-os` is linked from `apps/web`, production deployment is live at `https://prairieclassroom-os.vercel.app`, and the root URL redirects to the canonical demo classroom path before serving the static shell.
- **Verified:** Render blueprint `prairieclassroom-os` exists and created `prairieclassroom-orchestrator`, `prairieclassroom-inference-gemini`, and the shared `prairieclassroom-internal-auth` env group.
- **Verified:** after the 2026-05-14 demo-start and invalid-query cleanup deployment, `https://prairieclassroom-os.vercel.app/` returns HTTP 307 to `/?demo=true&tab=today&classroom=demo-okafor-grade34`, the canonical demo target returns HTTP 200, stale `?demo=true&classroom=<unknown>` links settle back onto the demo classroom, and `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo` passes against the Vercel frontend wired to the Render-hosted orchestrator and Gemini inference services. Production remains Render-wired when services are healthy, and the browser switches to the bundled static synthetic fallback only for the public demo path when a handled route returns transient 429/5xx or a network failure. This is public demo validation, not a new hosted release-gate proof baseline.
- **Verified:** deployed submission-readiness screenshots and runtime checks passed at `qa/final-release/2026-05-14-live-submission/` for root redirect, Today, Classroom, Tomorrow Plan, Week, Prep Differentiate, Ops EA Load, Review Family Message, Review Support Patterns, generated Support Patterns output, and keyboard command palette at desktop/mobile sizes. The pass recorded zero horizontal overflow, no access/onboarding prompts, no console/page errors, and no bad HTTP responses. Rapid route automation on the current production build still records non-user-visible aborted `POST /api/sessions` telemetry requests; local code now disables session telemetry on explicit demo/judge/presentation entry paths, pending the next approved production deploy.
- **Not yet complete:** public video URL, Kaggle URL, and external/cellular smoke are still pending. Vercel production stores the server-side `PRAIRIE_GEMINI_API_KEY` and `PRAIRIE_ENABLE_GEMINI_RUNS` values as encrypted env vars, but those values are not browser-exposed.

`npm run submission:final-check -- --skip-release-gate` currently remains blocked by the missing public YouTube and Kaggle writeup/submission URLs. The full no-skip submission gate must remain blocked until all final public links are real and reachable.

## Hosting Findings (2026-05-12 to 2026-05-14)

- Render deployment was completed through the authenticated Render dashboard, then verified through the Render CLI after the dashboard device login completed.
- Vercel CLI authentication is present as `bwillia13x`, and `apps/web` is linked to project `prj_Hf8Vju4JZRTNRBEDJ8dvWyftXlQO`.
- Latest production frontend deployment:
  - canonical URL: `https://prairieclassroom-os.vercel.app`
  - deployment URL: `https://prairieclassroom-edbee9b3o-echoexes-projects.vercel.app`
  - inspect URL: `https://vercel.com/echoexes-projects/prairieclassroom-os/82nsNzo8Dp5yH38Yc1yGVuBXziAq`
- `vercel env ls` reports encrypted production `PRAIRIE_GEMINI_API_KEY`, `PRAIRIE_ENABLE_GEMINI_RUNS`, and `VITE_API_URL` env vars for `echoexes-projects/prairieclassroom-os`. `VITE_API_URL` points to `https://prairieclassroom-orchestrator.onrender.com`.
- The public Vercel demo keeps a deliberate static fallback: when the app is loaded from a `*.vercel.app` host with `?demo=true`, it can serve deterministic synthetic classroom data and static sample generations in-browser if no `VITE_API_URL` is baked into the bundle or if a handled public-demo API route returns transient 429/5xx/network failure. Current production has `VITE_API_URL` baked into the Vite bundle, so healthy-path smoke exercises the Render-hosted API first.
- Latest public smoke against `https://prairieclassroom-os.vercel.app` passed with `PASS browser smoke` on 2026-05-14 after the root redirect and invalid-query cleanup deployments. Earlier 2026-05-13 direct generation saw Render inference 502/timeouts before service recovery, which drove the frontend fallback hardening; the earlier 2026-05-12 smoke also passed after both Render services were live on commit `6653b7c`.
- Latest deployed submission-readiness pass against `https://prairieclassroom-os.vercel.app` wrote fresh capture evidence to `qa/final-release/2026-05-14-live-submission/` and passed root redirect, clean-session first-run, route, generated-output, command-palette, console, bad-response, overflow, and mobile/desktop assertions. The only remaining live runtime caveat is hidden aborted session telemetry during rapid automated navigation, with a local fix awaiting an approved production deploy.
- A plain shell does not export the hosted Gemma key or enable hosted runs. `gemini:readycheck` reports the key and guard only after exporting `.env`; that confirms local credential readiness but does not create a new hosted proof artifact.
- Ollama is not a viable proof lane on the current maintenance host: `npm run host:preflight:ollama` reports the Ollama CLI unavailable on an 8 GiB RAM host with 16.76 GiB free disk.
- With Node `v25.8.2` and `.env` exported, `npm run submission:publish-preflight` currently passes local file checks for `render.yaml`, `apps/web/vercel.json`, final MP4, upstream configuration, branch sync, Vercel CLI availability, Vercel project link, hosted Gemma key/guard presence, and public live demo URL, then remains blocked until the public video URL and Kaggle writeup URL exist.

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

The production root URL now redirects to this target, so reviewers who open `https://prairieclassroom-os.vercel.app/` start in demo mode instead of hitting classroom-code restrictions.

This target is a public synthetic demo. Current production uses the Render-hosted orchestrator and Gemini inference service because `VITE_API_URL` points to the Render API. The bundled static fallback remains available when no API URL is baked into the Vercel bundle and as a public-demo resilience path for handled transient 429/5xx/network failures. Do not describe either public smoke path as a new hosted release-gate proof baseline.

`?demo=true` now suppresses first-run onboarding and role-selection modals for the demo classroom. The Quick Help button still lets reviewers open the tour manually.

## Recommended Hackathon Mode

For public judging, the currently deployed path is a hosted synthetic demo lane:

- Web: production Vite build.
- API: Render-hosted Express orchestrator at `https://prairieclassroom-orchestrator.onrender.com`.
- Inference: Render-hosted guarded Gemini service at `https://prairieclassroom-inference-gemini.onrender.com`.
- Data: `data/synthetic_classrooms/` only.
- Memory: demo SQLite memory.

The in-browser static fallback remains available as a safety path when `VITE_API_URL` is absent from the Vercel build, or when the public demo route sees a handled transient 429/5xx/network failure:

- API: bundled static demo API fallback on the Vercel `?demo=true` route.
- Inference: deterministic sample outputs labelled `static-demo-fallback`.
- Memory: bundled static demo snapshot only.

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
2. Confirm the root URL redirects into `?demo=true&tab=today&classroom=demo-okafor-grade34`.
3. Confirm the first visible screen is the Today dashboard, not onboarding or role selection.
4. Confirm these panels load without auth or paywall:
   - Today
   - Differentiate
   - Tomorrow Plan
   - Family Message
   - Support Patterns
5. Generate or open at least one output on the public demo path.
6. Confirm no browser console errors.
7. Confirm the visible footer says the app is built for the Gemma 4 Good Hackathon.
8. If the demo is upgraded to Render-hosted inference and generation is slow on first load, warm the Render services and repeat the smoke from a new private/incognito window.

## Submission Boundaries

The public demo may honestly claim:

- hosted Gemma 4 proof passed on synthetic/demo data;
- mock structural gate passes with no paid services;
- public synthetic Vercel + Render demo passes the browser smoke using hosted Gemini on synthetic/demo data;
- classroom memory and retrieval are implemented;
- teacher approval is required for family messages.

The public demo must not claim:

- real teacher validation;
- real classroom deployment;
- all data stays local when the public demo uses hosted infrastructure;
- static demo fallback as live model generation;
- public hosted smoke as a new full hosted release-gate proof baseline;
- Ollama readiness on the current 8 GiB maintenance host.
