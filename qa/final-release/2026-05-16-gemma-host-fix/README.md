# Gemma Host Fix Evidence — 2026-05-16

## Verdict

Hosted Gemma 4 proof is passing on the current branch for the guarded Gemini lane using synthetic/demo data.

- Current hosted gate: `output/release-gate/2026-05-16T19-53-39-742Z-56491`
- Gate status: `passed`
- Hosted eval summary: `output/evals/2026-05-16-gemini/2026-05-16T19-53-39-742Z-56491-gemini-summary.json`
- Hosted eval result: `13/13`
- Models observed: `gemma-4-26b-a4b-it`, `gemma-4-31b-it`
- API smoke: passed all 7 cases
- Browser smoke: passed; protected-classroom smoke skipped because `PRAIRIE_SMOKE_PROTECTED_CLASSROOM_CODE` was not set
- Latest cost status after local hosted validation: `$0.0326` of `$20.00` daily budget

## Blocker Recheck

The prior failing hosted case was `plan-010-prompt-injection` in `output/release-gate/2026-05-16T19-20-45-520Z-14783`.

Focused rerun:

```bash
API_BASE=http://127.0.0.1:3310 \
EVAL_CASE_IDS=plan-010-prompt-injection \
EVAL_SUITE_LABEL="Hosted Gemini focused blocker" \
EVAL_OUTPUT_DIR=qa/final-release/2026-05-16-gemma-host-fix \
EVAL_OUTPUT_BASENAME=target-plan-010 \
npx tsx evals/runner.ts
```

Result: `PASS`, 1/1.

Artifacts:

- `target-plan-010.log`
- `target-plan-010-summary.json`
- `target-plan-010-results.json`
- `target-inference.log`
- `target-orchestrator.log`

## Full Hosted Gate

Command:

```bash
set -a; source .env; set +a
source ~/.nvm/nvm.sh && nvm use >/dev/null
npm run release:gate:gemini
```

Result:

- `Release gate passed (gemini).`
- `75-gemini-evals.log`: `Results: 13/13 passed`
- `80-smoke-api.log`: `PASS tomorrow-plan`, `family-message`, `support-patterns`, `ea-briefing`, `ea-load`, `complexity-forecast`, `survival-packet`
- `90-smoke-browser.log`: `PASS browser smoke`

Notable provider behavior: the gate recovered from transient hosted `502`/provider-internal responses through retry handling. The prior prompt-injection blocker passed in the full gate with retries.

## Post-Gate Sync

Commands run after the hosted pass:

```bash
npm run proof:bump -- 2026-05-16T19-53-39-742Z-56491
npm run eval:summary
npm run logs:summary
npm run cost:status
npm run cost:rollup
node --input-type=module -e "import { updateProofStatusDoc } from './scripts/lib/proof-status.mjs'; await updateProofStatusDoc({ rootDir: process.cwd() });"
npm run proof:check
npm run claims:check
npm run test:scripts
set -a; source .env; set +a; npm run gemini:readycheck
git diff --check
```

Validation results:

- `proof:check`: passed, proof surfaces internally consistent
- `claims:check`: passed
- `test:scripts`: 70 tests passed
- `gemini:readycheck`: API key present, run guard enabled, latest hosted artifact `output/release-gate/2026-05-16T19-53-39-742Z-56491`, status `passed`
- `git diff --check`: passed
- local gate ports `3100`, `3200`, `5173`, `3310`, `3320`: no listeners after cleanup

## Judge-Facing Live Path

Default public demo remains static-first for reliability:

`https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`

Optional live hosted-Gemma path is available after Render warmup:

`https://prairieclassroom-os.vercel.app/?live=true&tab=prep&tool=differentiate&classroom=demo-okafor-grade34`

Production availability checks:

- Vercel live route returned HTTP 200.
- Render inference health returned `{"mode":"gemini","status":"ok"}`.
- Render orchestrator health returned `{"status":"ok","inference_url":"https://prairieclassroom-inference-gemini.onrender.com","inference_provider":"gemini","ready":true}`.
- Direct synthetic Differentiate POST through Render returned HTTP 200, 5 variants, model `gemma-4-26b-a4b-it`, in 23.143s.

The live judge path should be described as synthetic/demo hosted inference and may be slow on free-tier cold starts. It is not a real-student-data path.
