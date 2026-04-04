# Eval Baseline — Real Inference

**Status:** Pending — Vertex AI credentials not yet configured.

## Mock baseline (reference)

42/42 evals pass against mock backend. This is the contract-validation baseline — every eval case was written to match the mock output structure.

| Category | Cases | Mock result |
|----------|-------|-------------|
| Differentiation (diff-001 to diff-007) | 7 | 7/7 |
| Tomorrow Plan (plan-001 to plan-008) | 8 | 8/8 |
| Family Message (msg-001 to msg-005) | 5 | 5/5 |
| Intervention (int-001 to int-005) | 5 | 5/5 |
| Simplification (simp-001 to simp-003) | 3 | 3/3 |
| Vocab Cards (vocab-001 to vocab-002) | 2 | 2/2 |
| Support Patterns (pat-001 to pat-007) | 7 | 7/7 |
| EA Briefing (ea-001 to ea-005) | 5 | 5/5 |

## Real inference baseline

To be populated when Vertex AI credentials are configured.

### Setup

```bash
export GOOGLE_CLOUD_PROJECT=<your-project-id>
gcloud auth application-default login
pip install google-genai
python services/inference/harness.py --mode api --smoke-test
```

### Run evals

```bash
# Start inference server in API mode
cd services/inference && python server.py --mode api --port 3200 &

# Run eval suite
npx tsx evals/runner.ts
```

### Expected failure categories

Based on known model output patterns, likely failure modes under real inference:

1. **Parse errors** — model wraps JSON in prose or uses non-standard formatting. Mitigated by `extract_json` utility in harness.
2. **Missing keys** — model omits optional-but-expected fields (e.g., `estimated_minutes`, `visual_hint`). Parser defaults handle some cases.
3. **Safety violations** — model uses clinical/diagnostic language not present in mock output. Safety evals check 15 forbidden terms.
4. **Latency exceeded** — real inference slower than mock. Budget: 2000ms live, 10000ms planning.
5. **Schema drift** — model invents extra fields or changes value types. Zod validation (Sprint 11) will catch these.
