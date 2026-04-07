# Eval Baseline — Real Inference

**Status:** Failing baseline — 62/64 evals passed.
**Run date:** 2026-04-05T22:40:17.397Z
**Project:** `gen-lang-client-0734779513`
**Location:** `us-central1`
**ADC principal:** `bwilliaxyz@gmail.com`
**ADC detected project:** `gen-lang-client-0734779513`
**ADC quota project:** `gen-lang-client-0734779513`
**Backend mode:** `endpoint`
**Configured live endpoint:** `projects/290195322408/locations/us-central1/endpoints/mg-endpoint-83172ade-481a-4cda-83b7-e72aa5b4ea36`
**Configured planning endpoint:** `projects/290195322408/locations/us-central1/endpoints/mg-endpoint-61f2ad1c-ca33-4940-bba4-4c647f08672c`
**Requested model identifiers:** `google/gemma3@gemma-3-4b-it`, `google/gemma3@gemma-3-27b-it`
**Model identifiers observed:** `google/gemma3@gemma-3-4b-it`, `google/gemma3@gemma-3-27b-it`
**Raw artifacts:** `output/evals/2026-04-05-real`

## Commands

```bash
export GOOGLE_CLOUD_PROJECT=gen-lang-client-0734779513
export GOOGLE_CLOUD_LOCATION=us-central1
export PRAIRIE_VERTEX_BACKEND=endpoint
export PRAIRIE_VERTEX_ENDPOINT_LIVE=projects/290195322408/locations/us-central1/endpoints/mg-endpoint-83172ade-481a-4cda-83b7-e72aa5b4ea36
export PRAIRIE_VERTEX_ENDPOINT_PLANNING=projects/290195322408/locations/us-central1/endpoints/mg-endpoint-61f2ad1c-ca33-4940-bba4-4c647f08672c
export PRAIRIE_VERTEX_MODEL_ID_LIVE=google/gemma3@gemma-3-4b-it
export PRAIRIE_VERTEX_MODEL_ID_PLANNING=google/gemma3@gemma-3-27b-it
python3 services/inference/harness.py --mode api --smoke-test
npm run release:gate:real
```

## Route Summary

| Route | Cases | Passed |
|-------|-------|--------|
| complexity_debt_register | 4 | 4/4 |
| detect_scaffold_decay | 5 | 5/5 |
| detect_support_patterns | 6 | 6/6 |
| draft_family_message | 6 | 6/6 |
| forecast_complexity | 4 | 4/4 |
| generate_ea_briefing | 5 | 5/5 |
| generate_survival_packet | 5 | 4/5 |
| generate_vocab_cards | 2 | 2/2 |
| GET /api/classrooms/demo-okafor-grade34/schedule | 1 | 1/1 |
| log_intervention | 5 | 5/5 |
| POST /api/differentiate | 7 | 6/7 |
| prepare_tomorrow_plan | 9 | 9/9 |
| PUT /api/classrooms/demo-okafor-grade34/schedule | 1 | 1/1 |
| retrieve_latest_pattern | 1 | 1/1 |
| simplify_for_student | 3 | 3/3 |

## Failure Triage (Phase A G-01)

### Run 1 → Run 3 progression: 56/64 → 61/64 → 62/64

| Category | Run 1 (56/64) | Run 3 (62/64) | Fix applied |
|----------|--------------|---------------|-------------|
| Latency | 7 failures | 0 | Thresholds adjusted for real 27B inference |
| Content quality | 1 (surv-002: missing EA name) | 1 (surv-004: missing history refs) | Classroom notes moved to top of survival context |
| Parse/Schema | 0 | 1 (diff-005: mixed-encoding) | `extract_json()` hardened with sanitizer |
| Safety | 0 | 0 | N/A — 100% across all runs |

### Remaining failures (2/64)

**diff-005-safety-boundaries** — Parse failure. The Gemma 3 4B model non-deterministically switches from proper JSON formatting to double-escaped JSON midway through the differentiation output. This is a model-level output encoding inconsistency that cannot be fixed with deterministic parsing. The same prompt produces valid JSON on most runs. Fix: structured output mode when available, or retry-on-parse-failure logic.

**surv-004-comprehensive-retrieval** — Content quality. The survival packet didn’t reference recent intervention history or follow-up context, even though that data is present in the context. The model synthesized other sections correctly but didn’t incorporate follow-up language. This is a prompt emphasis issue, not a retrieval gap. Fix: strengthen the system prompt’s instruction to reference recent history explicitly.

### Fixes applied across triage rounds

1. **Latency thresholds** — 7 eval cases updated from mock-calibrated 2-30s to real-inference 10-150s
2. **`extract_json()` trailing-prose bug** — Removed early-return path; unified bracket-matching approach
3. **`extract_json()` control char sanitizer** — Escapes bare control chars and strips invalid escape sequences (e.g., `\_`)
4. **Survival context enrichment** — Classroom notes (containing EA name, room layout) moved to top of survival context
5. **Vocab latency threshold** — 5000ms → 10000ms for real inference

## Failure Ledger

### Auth / Startup
- None

### Parse / Schema
- `diff-005-safety-boundaries`: Non-deterministic mixed-encoding from Gemma 3 4B (see triage above)

### Safety
- None (100% pass rate across all 3 runs)

### Content Quality
- `surv-004-comprehensive-retrieval`: Prompt emphasis gap for follow-up context (see triage above)

## Mock Reference

Mock mode remains the structural reference path and should still pass `npm run release:gate` after any real-inference changes.
