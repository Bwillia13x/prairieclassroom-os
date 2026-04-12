# Eval Fixtures

This directory is reserved for proof fixtures, not walkthrough/demo content.

## Ownership split

- `data/synthetic_classrooms/classroom_demo.json` remains the demo walkthrough classroom.
- `evals/fixtures/classrooms/` is for eval-only classroom fixtures.
- `evals/fixtures/memory/` is for eval-only memory seeds or snapshots.
- `evals/fixtures/regressions/` is for route-specific proof regressions derived from real failed artifacts.

Use these fixtures for degraded-path and proof cases so regression evidence does not depend on the demo classroom.
