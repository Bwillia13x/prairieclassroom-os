# Public Demo Operations

This is the deployment-side checklist for turning the local PrairieClassroom OS proof into a judge-safe public demo.

The submission window for this work is Phase F of [plans/2026-05-18-submission-plan.md](./plans/2026-05-18-submission-plan.md), targeting 2026-05-11 → 2026-05-12.

## Deployment Status (updated 2026-05-12)

- **Configured:** frontend Vercel config is committed at `apps/web/vercel.json`.
- **Configured:** backend Render blueprint is committed at `render.yaml`.
- **Verified:** public source repo `Bwillia13x/prairieclassroom-os` is visible without authentication.
- **Verified:** the local submission video file passes QA at `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4`.
- **Verified:** Vercel project `echoexes-projects/prairieclassroom-os` is linked from `apps/web`, production deployment is live at `https://prairieclassroom-os.vercel.app`, and the static shell returns HTTP 200 with the committed security headers.
- **Verified:** Render blueprint `prairieclassroom-os` exists and created `prairieclassroom-orchestrator`, `prairieclassroom-inference-gemini`, and the shared `prairieclassroom-internal-auth` env group.
- **Verified:** the public synthetic demo URL `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34` passes `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo` using the in-browser static demo API fallback. Hosted Render smoke is in progress and should not be claimed until it passes after `VITE_API_URL` is wired and verified.
- **Not yet complete:** hosted Render generation smoke, public video URL, and Kaggle URL are still pending. Vercel production stores the server-side `PRAIRIE_GEMINI_API_KEY` and `PRAIRIE_ENABLE_GEMINI_RUNS` values as encrypted env vars, but those values are not browser-exposed.

`npm run submission:final-check -- --skip-release-gate` currently remains blocked by the missing public YouTube and Kaggle writeup/submission URLs. The full no-skip submission gate must remain blocked until all final public links are real and reachable.

## 2026-05-12 Hosting Findings

- Render deployment was completed through the authenticated Render dashboard because this shell still has no Render CLI/API token.
- Vercel CLI authentication is present as `bwillia13x`, and `apps/web` is linked to project `prj_Hf8Vju4JZRTNRBEDJ8dvWyftXlQO`.
- Latest production frontend deployment:
  - canonical URL: `https://prairieclassroom-os.vercel.app`
  - deployment URL: `https://prairieclassroom-6cx0q64lr-echoexes-projects.vercel.app`
  - inspect URL: `https://vercel.com/echoexes-projects/prairieclassroom-os/HMmSaVK9HA2S91wLQFhBVNQaTpPy`
- `vercel env ls` reports encrypted production `PRAIRIE_GEMINI_API_KEY`, `PRAIRIE_ENABLE_GEMINI_RUNS`, and `VITE_API_URL` env vars for `echoexes-projects/prairieclassroom-os`. `VITE_API_URL` points to `https://prairieclassroom-orchestrator.onrender.com`.
- The public Vercel demo now has a deliberate static fallback: when the app is loaded from a `*.vercel.app` host with `?demo=true` and no `VITE_API_URL`, it serves deterministic synthetic classroom data and static sample generations in-browser. This keeps the judge demo usable without production secrets and does not create new hosted-Gemma proof.
- Latest public smoke against `https://prairieclassroom-os.vercel.app` passed with `PASS browser smoke`.
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

This target is a public synthetic demo. It uses the bundled static demo API fallback until Render is live and `VITE_API_URL` points to the orchestrator API. Do not describe this fallback as a live hosted Gemma run or as new hosted proof.

`?demo=true` now suppresses first-run onboarding and role-selection modals for the demo classroom. The Quick Help button still lets reviewers open the tour manually.

## Recommended Hackathon Mode

For public judging, the currently deployed path is a fast synthetic demo lane:

- Web: production Vite build.
- API: in-browser static demo fallback on the Vercel `?demo=true` route.
- Inference: deterministic sample outputs labelled `static-demo-fallback`.
- Data: `data/synthetic_classrooms/` only.
- Memory: bundled static demo snapshot only.

The hosted-Gemma public path remains available as the next upgrade once Render credentials and secrets are present:

- API: Express orchestrator.
- Inference: guarded hosted Gemma 4 mode using the Render inference service.
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
2. Confirm the first visible screen is the Today dashboard, not onboarding or role selection.
3. Confirm these panels load without auth or paywall:
   - Today
   - Differentiate
   - Tomorrow Plan
   - Family Message
   - Support Patterns
4. Generate or open at least one output on the public demo path.
5. Confirm no browser console errors.
6. Confirm the visible footer says the app is built for the Gemma 4 Good Hackathon.
7. If the demo is upgraded to Render-hosted inference and generation is slow on first load, warm the Render services and repeat the smoke from a new private/incognito window.

## Submission Boundaries

The public demo may honestly claim:

- hosted Gemma 4 proof passed on synthetic/demo data;
- mock structural gate passes with no paid services;
- public synthetic Vercel demo passes the browser smoke using static sample outputs;
- classroom memory and retrieval are implemented;
- teacher approval is required for family messages.

The public demo must not claim:

- real teacher validation;
- real classroom deployment;
- all data stays local when the public demo uses hosted infrastructure;
- static demo fallback as live model generation;
- Ollama readiness on the current 8 GiB maintenance host.
