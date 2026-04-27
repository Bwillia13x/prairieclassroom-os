# Public Demo Operations

This is the deployment-side checklist for turning the local PrairieClassroom OS proof into a judge-safe public demo.

The submission window for this work is Phase F of [plans/2026-05-18-submission-plan.md](./plans/2026-05-18-submission-plan.md), targeting 2026-05-11 → 2026-05-12.

## Deploy Targets (selected 2026-04-26)

- **Frontend:** Vercel free tier. `apps/web/vercel.json` is committed and configures SPA rewrites, security headers, and immutable asset caching for the production build.
- **Orchestrator + inference:** TBD — choose one before Phase F begins:
  - Render free tier (sleeps after 15 min idle; cold-start latency ~30s — acceptable for judge demos)
  - Fly.io free tier (3 shared-cpu VMs; no idle sleep on free; needs Dockerfile)
  - Hetzner CX11 ($5/mo; always on; manual systemd setup)

## Pre-deploy Setup (Phase B/F)

```bash
# Frontend — link to a Vercel project
cd apps/web
npx vercel link
# Set the API base; the orchestrator URL goes here
npx vercel env add VITE_API_URL production
```

For the backend (Render example):

```bash
# render.yaml at repo root would define two services (orchestrator + inference)
# Orchestrator env vars:
#   PORT (set by Render)
#   INFERENCE_URL=https://<inference-service>.onrender.com
#   CORS_ORIGIN=https://<vercel-frontend-url>
# Inference env vars:
#   PRAIRIE_INFERENCE_HOST=0.0.0.0
#   PRAIRIE_INFERENCE_PORT=$PORT
#   PRAIRIE_GEMINI_API_KEY (secret)
#   PRAIRIE_ENABLE_GEMINI_RUNS=true
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
- Inference: mock mode or guarded hosted Gemma 4 mode with pre-generated artifacts.
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

For hosted Gemma 4 proof runs, add:

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

3. Web build

```bash
VITE_API_URL=https://<api-demo-host>/api npm run build -w apps/web
```

Serve `apps/web/dist` from the public static host.

## Public Demo Smoke

Before attaching the URL to Kaggle:

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
