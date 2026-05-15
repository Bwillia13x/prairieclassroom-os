# Submission Copy Pack

External-facing copy for fields that are not stored directly in the Kaggle body.

## Pre-Publish Guardrails

Replace every bracketed placeholder before publishing the video, Kaggle project, or media gallery:

- Live demo URL: `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34` loads from the public Vercel deployment, the root URL redirects to that demo path, and `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo` passes.
- Live demo claim boundary: production is wired to the Render-hosted orchestrator and Gemini inference service for synthetic/demo data when those services are healthy; the public `?demo=true` path also has a deterministic static fallback for transient Render/network 429/5xx failures. Do not describe the fallback as live hosted-Gemma generation or a new hosted proof baseline.
- Deployed submission-readiness evidence: `qa/final-release/2026-05-15-vercel-submission-final/` passed on the public URL across the main capture views at mobile/tablet/desktop/wide sizes, including static-fallback-labelled Differentiate output and the keyboard command palette.
- Video URL: must be public or unlisted only for review; switch public before final submission.
- Kaggle writeup URL: add only after the Kaggle entry exists.
- Repository URL: public clone test passed on 2026-05-11 against `https://github.com/Bwillia13x/prairieclassroom-os`; the latest verified pushed `main` state is `1208fd11c7b1db4c0ca9905a42f4764c9d989c6c`.

Current proof anchors to keep in external copy:

- Mock structural gate: `output/release-gate/2026-05-15T12-57-10-977Z-52253`
- Current hosted Gemma 4 refresh: failed at `output/release-gate/2026-05-08T22-47-12-031Z-43430`; do not claim a current clean full hosted gate.
- Latest completed May 8 hosted eval summary: `output/evals/2026-05-08-gemini/2026-05-08T21-48-03-113Z-23553-gemini-summary.json` (`12/13`)
- Last passing hosted Gemma 4 baseline: `output/release-gate/2026-05-03T17-59-42-981Z-80702`
- Last passing hosted eval summary: `output/evals/2026-05-03-gemini/2026-05-03T17-59-42-981Z-80702-gemini-summary.json`
- Latest May 8 cost rollup: `output/cost-rollups/2026-05-08-rollup.json`
- Current test count: 2,086 Vitest + 76 Python in the latest mock gate

Do not add claims about real teacher validation, local Ollama proof, no-cloud operation, or measured classroom outcomes unless new artifacts are added and the claims ledger is advanced.

## YouTube Title

PrairieClassroom OS | Gemma 4 for Inclusive Classroom Coordination

## YouTube Description

PrairieClassroom OS is a Gemma-4-native operating layer for high-complexity inclusive classrooms.

Instead of acting like a generic tutor, it helps teachers and educational assistants handle four adult jobs: open the day, adapt instruction, prepare tomorrow, and coordinate with adults or families using the same classroom context.

For this hackathon submission, the artifact-backed proof lane is hosted Gemma 4 on synthetic/demo classroom data:

- live tier: `gemma-4-26b-a4b-it`
- planning tier: `gemma-4-31b-it`

The project also keeps a separate local/self-hosted Ollama path for the intended privacy-preserving school deployment model. That local path is not claimed as proven on the current maintenance host.

Project links:

- Code: [PrairieClassroom OS source code](https://github.com/Bwillia13x/prairieclassroom-os)
- Live demo: [PrairieClassroom OS public synthetic demo](https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34)
- Kaggle writeup: [add Kaggle writeup URL after submission]

## Kaggle Project Links Text

### Code Repository

PrairieClassroom OS source code and docs

### Live Demo

PrairieClassroom OS public demo

### Video

PrairieClassroom OS hackathon demo video

## Media Gallery Captions

### Cover Image

PrairieClassroom OS differentiates one classroom artifact into learner-specific supports for a synthetic high-complexity inclusive classroom.

### Today / Shell Screenshot

Teacher-facing shell showing classroom memory, planning, and operations workflows in one workspace.

### Differentiate Screenshot

Gemma 4 vision plus differentiation workflow turns one worksheet into multiple classroom-ready learner variants.

### Tomorrow Plan Screenshot

Tomorrow planning is grounded in recent interventions, prior plans, and retrieved classroom patterns.

### Family Message Screenshot

Family communication is useful but bounded: the system drafts, and the teacher approves before anything moves forward.

### Mobile Shell Screenshot

Responsive shell for quick classroom access to planning and communication workflows.

## One-Sentence Verbal Pitch

PrairieClassroom OS is a Gemma-4-native operating layer that helps teachers open the day, adapt instruction, prepare tomorrow, and coordinate family or EA communication in inclusive classrooms.
