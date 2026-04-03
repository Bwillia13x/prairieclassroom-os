# apps/web

Teacher-facing UI for PrairieClassroom OS.

Framework: Vite + React + TypeScript.

## Running

```bash
# From repo root — start all services:
cd services/inference && source .venv/bin/activate && python server.py --mode mock --port 3200
cd ../.. && npx tsx services/orchestrator/server.ts
cd apps/web && npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` to the orchestrator at `:3100`.

## Sprint 1 features
- Classroom selector (loads from synthetic data)
- Artifact upload form (title, subject, content, teacher goal)
- Differentiation trigger — calls orchestrator → inference → returns 5 variants
- Side-by-side variant grid with color-coded badges per variant type
- Latency and model metadata display
