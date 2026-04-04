# Final Eval Report — PrairieClassroom OS

**Date:** 2026-04-03
**Sprints completed:** 13
**Total evals:** 42/42 passing
**Inference mode:** Mock (Vertex AI backend implemented, credentials pending)

## Results by Category

| Category | Cases | Result | Description |
|----------|-------|--------|-------------|
| **Schema reliability** | 14 | 14/14 | Required keys, types, and schema versions validated |
| **Content quality** | 8 | 8/8 | Output specificity, grounding, and actionability |
| **Safety boundaries** | 8 | 8/8 | 15 forbidden terms absent, observational language enforced |
| **Latency suitability** | 7 | 7/7 | Live tier <2000ms, planning tier <6000ms |
| **Cross-feature synthesis** | 5 | 5/5 | Pattern → plan injection, plan → briefing flow |

## Results by Prompt Class

| Prompt Class | Cases | Result |
|-------------|-------|--------|
| Differentiate material | 7 | 7/7 |
| Tomorrow plan | 8 | 8/8 |
| Family message | 5 | 5/5 |
| Log intervention | 5 | 5/5 |
| Simplify text | 3 | 3/3 |
| Vocab cards | 2 | 2/2 |
| Support patterns | 7 | 7/7 |
| EA briefing | 5 | 5/5 |

## Regression History

| Sprint | New evals | Total | Regressions |
|--------|-----------|-------|-------------|
| 0 | 0 | 0 | — |
| 1 | 7 | 7 | 0 |
| 2 | 8 | 15 | 0 |
| 3 | 5 | 20 | 0 |
| 4 | 5 | 25 | 0 |
| 5 | 5 | 30 | 0 |
| 6 | 7 | 37 | 0 |
| 7 | 0 | 37 | 0 |
| 8 | 5 | 42 | 0 |
| 9-13 | 0 | 42 | 0 |

## Infrastructure Changes Validated

- **Zod migration (Sprint 11):** All 42 evals pass after converting 8 TypeScript interfaces to Zod schemas. Zero type regressions.
- **Auth middleware (Sprint 12):** Eval runner sends `X-Classroom-Code` headers. All 42 evals pass with auth enabled.
- **Vertex AI backend (Sprint 10):** Mock mode unaffected. Real inference baseline pending credentials.

## How to Run

```bash
# Start services
cd services/inference && python server.py --mode mock --port 3200 &
INFERENCE_URL=http://localhost:3200 npx tsx services/orchestrator/server.ts &

# Run eval suite
npx tsx evals/runner.ts
```

## Next Steps

1. Configure Vertex AI credentials
2. Run: `python services/inference/harness.py --mode api --smoke-test`
3. Start services with `--mode api`
4. Run: `npx tsx evals/runner.ts`
5. Document results in `docs/eval-baseline.md`
6. Iterate prompt contracts for any failing cases
