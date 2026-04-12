# Release Checklist

Use this checklist when validating a release candidate from a clean checkout.

## Local sequence

```bash
nvm use
npm install
python3.11 -m venv services/inference/.venv
services/inference/.venv/bin/pip install -r services/inference/requirements.txt
npx tsx data/demo/seed.ts
npm run release:gate
```

If you use a different prepared interpreter, export `PRAIRIE_PYTHON=/abs/path/to/python` before running the gate. Otherwise the gate prefers the first compatible Python 3.11 interpreter from `services/inference/.venv`, `services/inference/.venv311`, `python3.11`, then `python3`.

## What the gate does

- Verifies the local Node version matches `.nvmrc`
- Starts mock inference on `:3200`
- Starts the orchestrator on `:3100`
- Starts the Vite web app on `:5173`
- Waits for health/readiness before running checks
- Runs:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:python`
  - `npm run test`
  - `python3 -m py_compile services/inference/harness.py services/inference/server.py`
  - `python3 services/inference/harness.py --mode mock --smoke-test`
  - `npm run smoke:api`
  - `npm run smoke:browser`
- Saves logs under `output/release-gate/`

The browser smoke now covers:

- grouped `Today / Prep / Ops / Review` shell navigation
- `tab` and `classroom` query-param restore on refresh
- demo classroom panel handoffs
- protected classroom auth prompt, invalid-code recovery, and retry success

After a passing gate, capture current UI review artifacts with:

```bash
npm run ui:evidence
```

The evidence script writes five screenshots plus a manifest under `output/playwright/ui-evidence/`.

## Real inference baseline

Use the real gate when Vertex AI credentials are configured and you want to validate the live Gemma path instead of the mock stack.

```bash
export GOOGLE_CLOUD_PROJECT=<your-project-id>
export GOOGLE_CLOUD_LOCATION=us-central1
export PRAIRIE_VERTEX_BACKEND=endpoint
export PRAIRIE_VERTEX_ENDPOINT_LIVE=projects/<project>/locations/us-central1/endpoints/<live-endpoint>
export PRAIRIE_VERTEX_ENDPOINT_PLANNING=projects/<project>/locations/us-central1/endpoints/<planning-endpoint>
npm run release:gate:real
```

The real gate:

- Fails fast if `GOOGLE_CLOUD_PROJECT` is missing
- Fails fast if endpoint env configuration is incomplete
- Fails fast if ADC cannot be refreshed, the required Python packages are unavailable, or the configured Vertex endpoints are not reachable
- Logs the ADC principal, detected project, quota project, configured endpoint resource names, and endpoint probe results before any local service startup
- Starts inference in `--mode api`
- Runs `python3 services/inference/harness.py --mode api --smoke-test`
- Runs `npx tsx evals/runner.ts` with artifact output under `output/evals/<date>-real/`
- Updates `docs/eval-baseline.md` from the latest real run state before finishing

Provision or reuse the long-lived endpoints before running the real gate:

```bash
export GOOGLE_CLOUD_PROJECT=<your-project-id>
export GOOGLE_CLOUD_LOCATION=us-central1
npm run provision:vertex-endpoints
```

The provisioning script records configs, operation probes, quota snapshots, a manifest, and `exports.sh` under `output/vertex-endpoints/`.
If only one tier is provisioned successfully, the script still writes the artifacts and exits non-zero with the blocking tier called out explicitly. Reuse the successful endpoint, keep the artifacts, fix the quota blocker, then rerun the provisioning command.

If provisioning is blocked by serving quota in `us-central1`, request the quota explicitly before rerunning:

```bash
gcloud beta quotas preferences list --project "$GOOGLE_CLOUD_PROJECT"
gcloud beta quotas preferences create \
  --service=aiplatform.googleapis.com \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --quota-id=CustomModelServingL4GPUsPerProjectPerRegion \
  --preferred-value=6 \
  --dimensions=region=us-central1 \
  --preference-id=prairie-l4-us-central1
```

For the current two-endpoint topology, the practical target is:

- live tier: `2x NVIDIA_L4`
- planning tier: `4x NVIDIA_L4`

If that path is still blocked, request the corresponding A100/H100 serving quotas and let the provisioning script fall through to those verified configs.

The real gate expects the ADC principal to have:

- `roles/aiplatform.user`
- `roles/serviceusage.serviceUsageConsumer`
- access to the configured Vertex endpoints

## Recovery

If `better-sqlite3` breaks after a Node change:

```bash
npm run rebuild:memory
```

Then rerun `npm run release:gate`.

## Release rule

Release PRs include only approved runtime, smoke, and release-doc changes. Unrelated UI, eval, or exploratory docs changes stay out of the release branch.
