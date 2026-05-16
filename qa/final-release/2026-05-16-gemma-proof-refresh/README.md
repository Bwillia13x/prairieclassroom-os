# 2026-05-16 Gemma Proof Refresh

## Verdict

- Hosted Gemma readycheck passed only after sourcing local `.env`; the plain shell did not export the key or run guard.
- `npm run release:gate:gemini` ran against `gemma-4-26b-a4b-it` and `gemma-4-31b-it`.
- The hosted proof refresh failed as a full baseline: `12/13` curated hosted evals passed.
- Blocker: `plan-010-prompt-injection` returned a retryable provider/internal `500` through `POST /api/tomorrow-plan`.
- Latest passing hosted baseline remains `output/release-gate/2026-05-03T17-59-42-981Z-80702`.

## Artifacts

- Hosted gate: `output/release-gate/2026-05-16T19-20-45-520Z-14783`
- Hosted eval summary: `output/evals/2026-05-16-gemini/2026-05-16T19-20-45-520Z-14783-gemini-summary.json`
- Hosted eval failure summary: `output/evals/2026-05-16-gemini/2026-05-16T19-20-45-520Z-14783-gemini-failure-summary.json`
- Cost rollup: `output/cost-rollups/2026-05-16-rollup.json`
- Playwright live route screenshot: `playwright-live-gemma-route.png`
- Playwright live route console/network: `playwright-live-route-console.md`, `playwright-live-route-network-after-warm.md`

## Commands

```bash
source ~/.nvm/nvm.sh && nvm use
npm run cost:status
npm run gemini:readycheck
set -a; source .env; set +a; npm run cost:status
set -a; source .env; set +a; npm run proof:check
set -a; source .env; set +a; npm run gemini:readycheck
set -a; source .env; set +a; npm run release:gate:gemini
npm run eval:summary
npm run logs:summary
npm run cost:status
npm run cost:rollup
npm run proof:check
npm run claims:check
```

## Public Live Path Check

Render warmed successfully:

```text
https://prairieclassroom-orchestrator.onrender.com/api/health -> ready:true
https://prairieclassroom-inference-gemini.onrender.com/health -> {"mode":"gemini","status":"ok"}
```

The production live route loaded without the static demo flag:

```text
https://prairieclassroom-os.vercel.app/?live=true&tab=prep&tool=differentiate&classroom=demo-okafor-grade34
document.documentElement.dataset.demoApi -> null
```

A direct synthetic public Differentiate POST returned:

```json
{
  "status": 200,
  "ok": true,
  "elapsed_ms": 20710,
  "model_id": "gemma-4-26b-a4b-it",
  "variant_count": 5,
  "first_variant_type": "core"
}
```

## Judge Availability Recommendation

Make the static-first Vercel `?demo=true` route the primary judging path. It is fast, reliable, public, and clearly labelled as bundled synthetic demo output.

Expose the live-Gemma path only as a secondary judge/proof link after warming Render. It is real hosted Gemma on synthetic/demo data, but the May 16 full hosted gate is not clean and several live routes have long latencies.
