# Submission Copy Pack

External-facing copy for fields that are not stored directly in the Kaggle body.

## Pre-Publish Guardrails

Do not paste bracketed placeholders into any external field. The public video usually has to be uploaded before the Kaggle submission URL exists, so use the YouTube description below with the Kaggle line omitted for the initial upload. After the Kaggle entry exists, run `npm run submission:apply-links -- --video-url '<youtube-url>' --kaggle-url '<kaggle-url>'`, update the YouTube description with the complete Project links block, and rerun `npm run submission:final-check`.

- Live demo URL: `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34` loads from the public Vercel deployment. The root URL now shows the PrairieClassroom OS landing page with a primary CTA into that demo path, and `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo` remains the public demo smoke command.
- Live demo claim boundary: the public `?demo=true` Vercel path is static-first and preloads bundled synthetic/demo data in-browser so reviewers do not wait on Render cold starts. Render-hosted synthetic checks remain separate; do not describe static demo output as live hosted-Gemma generation or a new hosted proof baseline.
- Deployed submission-readiness evidence: `qa/final-release/2026-05-17-continuation-public-demo-qa/` confirms the live public root now renders the optimized WebP landing hero image, enters the canonical demo path, loads canonical Today in static-first mode, completes static Differentiate generation, and has empty console/page/request failures with zero layout failures; `qa/final-release/2026-05-17-active-goal-route-sweep/` and `qa/final-release/2026-05-17-active-goal-workflow-sweep/` cover the live public route family and generated-output workflows; `qa/final-release/2026-05-17-accessibility-keyboard-sweep/` covers desktop/mobile accessibility, keyboard focus, touch targets, console/page/request health, overflow, and clipping on the current Vercel deployment.
- Video URL: must be public or unlisted only for review; switch public before final submission.
- Video upload candidate: use `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-voiceover.mp4` if the final YouTube artifact should include narration; the non-suffixed MP4 remains the deterministic checked-in baseline used by `submission:publish-preflight`.
- Kaggle writeup URL: add only after the Kaggle entry exists.
- Repository URL: public clone test passed on 2026-05-11 against `https://github.com/Bwillia13x/prairieclassroom-os`; the 2026-05-17 publication preflight verifies the local branch is clean, upstreamed, and synced with `origin/main` before final link publishing.

Current proof anchors to keep in external copy:

- Mock structural gate: `output/release-gate/2026-05-17T10-51-35-351Z-42560`
- Current hosted Gemma 4 refresh: passed at `output/release-gate/2026-05-17T00-36-24-280Z-35954`; claim it only as synthetic/demo hosted proof.
- Latest completed hosted eval summary: `output/evals/2026-05-17-gemini/2026-05-17T00-36-24-280Z-35954-gemini-summary.json` (`13/13`)
- Latest passing hosted Gemma 4 baseline: `output/release-gate/2026-05-17T00-36-24-280Z-35954`
- Latest passing hosted eval summary: `output/evals/2026-05-17-gemini/2026-05-17T00-36-24-280Z-35954-gemini-summary.json`
- Latest hosted cost rollup: `output/cost-rollups/2026-05-17-rollup.json`
- Current test count: 2,142 Vitest + 76 Python in the latest mock gate

Do not add claims about real teacher validation, local Ollama proof, no-cloud operation, or measured classroom outcomes unless new artifacts are added and the claims ledger is advanced.

## YouTube Title

PrairieClassroom OS | Gemma 4 for Inclusive Classroom Coordination

## YouTube Description

For the initial YouTube upload, paste this description and omit the `Kaggle writeup` bullet under Project links until the Kaggle URL exists. After `submission:apply-links` records both final public links, paste the complete Project links block including the real Kaggle URL.

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
