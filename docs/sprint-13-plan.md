# Sprint 13 Plan — Submission Polish

## Goal

Update all submission artifacts to reflect the current state of the system (12 sprints, Vertex AI backend, Zod validation, auth). Make the project self-documenting for a judge or collaborator who clones the repo.

## User story

As a competition judge cloning this repository, when I read the README and writeup, I want to understand what the system does, how to run it, and what makes it technically distinctive — in under 10 minutes.

## Deliverables

### 1. README rewrite

Replace the pre-dev starter README with a proper project README:
- One-paragraph product statement
- Quick-start instructions (3 terminals, seed, open browser)
- Architecture diagram (text)
- Feature list with model tier indicators
- Eval summary
- Link to writeup and demo script

### 2. Kaggle writeup update

Update sections 3, 6, and 7 to reflect:
- Zod runtime validation layer (Sprint 11)
- Classroom-code auth (Sprint 12)
- Vertex AI inference backend (Sprint 10) — ready but credentials pending
- Updated technical summary table (42 evals, 12 sprints, Zod, auth)

### 3. Demo script update

Update setup section to reflect `--mode api` option and auth.

### 4. Final eval report

Document the mock-baseline eval results as the current state, with setup instructions for real inference.

### 5. Sprint docs

Sprint 13 plan + review + decision log entry.

## What this sprint does NOT include

- Demo video recording (requires screen recording tool + narration)
- Prompt tuning (requires real inference credentials)
- New features or UI changes
