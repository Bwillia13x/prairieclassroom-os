# Public Demo Operations

This is the deployment-side checklist for turning the local PrairieClassroom OS proof into a judge-safe public demo.

The submission window for this work is Phase F of [plans/2026-05-18-submission-plan.md](./plans/2026-05-18-submission-plan.md), targeting 2026-05-11 → 2026-05-12.

## Deployment Status (updated 2026-05-11)

- **Configured:** frontend Vercel config is committed at `apps/web/vercel.json`.
- **Configured:** backend Render blueprint is committed at `render.yaml`.
- **Verified:** public source repo `Bwillia13x/prairieclassroom-os` is visible without authentication.
- **Verified:** the local submission video file passes QA at `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4`.
- **Not yet complete:** Render services have not been created from this environment, production secrets have not been set in Render/Vercel, the Vercel project is not linked, the public demo URL has not been smoked from a non-local network, and the public video/Kaggle URLs are still placeholders.

`npm run submission:final-check -- --skip-release-gate` currently fails only on publication placeholders and required public-URL validation. The full no-skip submission gate must remain blocked until the public demo, public YouTube video, and Kaggle writeup/submission URLs are real and reachable.

## 2026-05-11 Hosting Findings

- Render deployment cannot be completed from this shell because no Render CLI/API token is available.
- Vercel CLI authentication is present, but `apps/web` is not linked to a Vercel project.
- A frontend-only Vercel deploy would not be a valid public demo. The web app calls the orchestrator through `VITE_API_URL`/`/api`, so the Render orchestrator and inference services must be live first.
- A plain shell does not expose the hosted Gemma key or enable hosted runs. `gemini:readycheck` reports the key and guard only after sourcing `.env`; production hosting still needs its own Render/Vercel secret values.
- Ollama is not a viable proof lane on the current maintenance host: `npm run host:preflight:ollama` reports the Ollama CLI unavailable on an 8 GiB RAM host with 16.76 GiB free disk.
- `npm run submission:publish-preflight` currently passes local file checks for `render.yaml`, `apps/web/vercel.json`, final MP4, Node `v25.8.2`, upstream configuration, branch sync, and Vercel CLI availability, then fails on 56 uncommitted paths, missing Vercel project link, Render CLI/API token, hosted Gemma env in the current shell, public live demo URL, public video URL, and Kaggle writeup URL.

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

# Frontend — link to a Vercel project
cd apps/web
npx vercel link
# Set the API base; the orchestrator URL goes here
npx vercel env add VITE_API_URL production
```

For the backend (Render blueprint):

```bash
# Create the blueprint from render.yaml in the Render dashboard.
# Then set the sync:false values:
#   prairieclassroom-orchestrator:
#     CORS_ORIGIN=https://<vercel-frontend-url>
#   prairieclassroom-inference-gemini:
#     PRAIRIE_GEMINI_API_KEY=<secret>
#
# The orchestrator receives INFERENCE_HOSTPORT from the inference service through
# Render's private service reference. Set INFERENCE_URL manually only if you are
# intentionally overriding that private-network route.
```

## Demo URL

Use a URL that lands directly on the strongest demo state:

```text
/?demo=true&tab=today&classroom=demo-okafor-grade34
```

`?demo=true` now suppresses first-run onboarding and role-selection modals for the demo classroom. The Quick Help button still lets reviewers open the tour manually.

## Recommended Hackathon Mode

For public judging, prefer a fast synthetic demo lane:

- Web: production Vite build.
- API: Express orchestrator.
- Inference: guarded hosted Gemma 4 mode using the Render inference service.
- Data: `data/synthetic_classrooms/` only.
- Memory: demo SQLite memory only.

Do not use real student or classroom data in the public demo.

## Runtime Shape

The app needs three running pieces:

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

On Render, `render.yaml` sets `INFERENCE_HOSTPORT` from the inference service's private network reference, so `INFERENCE_URL` is not required unless overriding that route manually.

3. Web build

```bash
VITE_API_URL=https://<api-demo-host>/api npm run build -w apps/web
```

Serve `apps/web/dist` from the public static host.

## Public Demo Smoke

Before attaching the URL to Kaggle:

```bash
PRAIRIE_PUBLIC_DEMO_URL=https://<vercel-frontend-url> npm run smoke:public-demo
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
7. If generation is slow on first load, warm the Render services and repeat the smoke from a new private/incognito window.

## Submission Boundaries

The public demo may honestly claim:

- hosted Gemma 4 proof passed on synthetic/demo data;
- mock structural gate passes with no paid services;
- classroom memory and retrieval are implemented;
- teacher approval is required for family messages.

The public demo must not claim:

- real teacher validation;
- real classroom deployment;
- all data stays local when the public demo uses hosted infrastructure;
- Ollama readiness on the current 8 GiB maintenance host.
