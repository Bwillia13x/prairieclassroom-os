# Phase A G-01 Handoff — Real Inference Validation

## Copy this prompt into the next agent session:

---

@prairieclassroom-predev/CLAUDE.md Continue Phase A foundation plan. G-02 (unit test suite) is complete — 142 tests passing, committed as `48775a0`. Now execute G-01: Tasks 8–10 (real inference validation).

## What's done

- Tasks 1–7 complete and committed. 142 tests across 5 modules (vitest + pytest), CI integrated.
- Plan: `docs/superpowers/plans/2026-04-05-phase-a-foundation.md` — Tasks 8–10 remain.

## What's next

**Task 8: Deploy Planning Endpoint** (diagnostic — may need your GCP interaction)

The 27B planning endpoint (`gemma-3-27b-it`) is currently BLOCKED with "Dedicated endpoint DNS is empty." The 4B live endpoint works (~2069ms).

Steps:
1. Run `node scripts/provision-vertex-endpoints.mjs --list-only` to check endpoint state
2. If quota issue, check GPU quota (A100 80GB or L4). If blocked, document in `docs/decision-log.md` and evaluate managed Gemma via `generate_content` API as fallback
3. Run `node scripts/provision-vertex-endpoints.mjs --force-deploy` to redeploy
4. Verify both tiers: `python services/inference/harness.py --mode api --smoke-test`
5. Log results in `docs/decision-log.md`

Environment:
```
export GOOGLE_CLOUD_PROJECT=gen-lang-client-0734779513
export GOOGLE_CLOUD_LOCATION=us-central1
```

**Task 9: Run Real-Inference Eval Suite** (depends on Task 8)

1. Seed demo data: `npx tsx data/demo/seed.ts`
2. Run: `npm run release:gate:real`
3. Inspect `output/evals/` for pass/fail counts
4. Commit baseline to `docs/eval-baseline.md`

**Task 10: Triage and Fix Failures** (iterative)

For each failure category:
- Parse/Schema: add raw model output as test case in `test_extract_json.py`, fix `extract_json()`, re-run eval
- Safety: must reach 0 failures — fix prompt contracts or retrieval formatting
- Content quality: compare real vs mock, adjust eval assertions or prompts
- Latency: adjust thresholds (live <= 5000ms, planning <= 30000ms)

Known risk: `extract_json()` has an early-return path that doesn't strip trailing prose when input starts with `{`/`[`. This will likely cause parse failures on real Gemma output.

## Exit criteria

- Both Vertex AI endpoints respond to preflight probes
- `npm run release:gate:real` completes without infrastructure failures
- At least 55/64 evals pass (85%+)
- Zero safety-category failures
- All failures documented in `docs/eval-baseline.md`
- At least one ADR in `docs/decision-log.md`

## Authority

You have full design and implementation authority. Bias toward executing. If the planning endpoint cannot be deployed (GPU quota, billing), document the blocker and evaluate the managed Gemma API fallback — don't wait.

---
