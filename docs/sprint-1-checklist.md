# Sprint 1 Checklist

**Sprint:** 1 — Upload-to-Differentiation Loop

## Deliverables

- [x] Vite+React scaffold in `apps/web/` with TypeScript
- [x] Artifact upload form (title, subject, content, teacher goal)
- [x] Classroom selector loading from synthetic data
- [x] Inference HTTP bridge (`services/inference/server.py`)
- [x] Orchestrator API server (`services/orchestrator/server.ts`)
- [x] Differentiation prompt contract (`services/orchestrator/differentiate.ts`)
- [x] Variant response parser with schema enforcement
- [x] Side-by-side variant grid UI with color-coded variant types
- [x] 7 differentiation eval cases (schema × 4, content × 1, safety × 1, latency × 1)
- [x] Updated eval runner with live API integration
- [x] Mock inference updated to return full 5-variant response
- [x] All 7/7 evals passing
- [x] TypeScript compiles clean across workspace
- [x] End-to-end API test: UI → orchestrator → inference → 5 variants returned
- [x] Sprint 1 plan documented
- [x] Decision log updated (3 new ADR entries)

## Verification commands

```bash
# TypeScript compile check
npx tsc --noEmit

# Inference smoke test
cd services/inference && source .venv/bin/activate && python harness.py --mode mock --smoke-test

# Start services and run evals
python server.py --mode mock --port 3200 &
cd ../.. && npx tsx services/orchestrator/server.ts &
npx tsx evals/runner.ts
```
