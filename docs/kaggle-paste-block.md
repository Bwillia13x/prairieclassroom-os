# Kaggle Paste Block

Paste-ready submission copy derived from the canonical writeup in `docs/kaggle-writeup.md`.

## Title

PrairieClassroom OS

## Subtitle

A Gemma-4-native operating layer for Alberta's inclusive classrooms

## Track

Future of Education

## Body

At 8:12 in the morning, a classroom can already be full.

Not just full of students. Full of reading levels, home languages, sensory needs, missed sleep, behaviour plans, substitute notes, family messages, and an educational assistant who may be available in the morning but gone by the afternoon.

PrairieClassroom OS is built for that coordination problem. It is not a student chatbot. It is a teacher and educational-assistant operating layer for turning classroom signals into coordinated adult action.

The demo classroom is a synthetic Alberta Grade 3/4 split led by "Mrs. Okafor": 26 students, mixed readiness levels, EAL needs, support routines, two weeks of seeded classroom memory, and morning-only EA coverage.

The product is organized around four daily adult jobs:

1. Open the day - triage what changed and where coverage risk exists.
2. Adapt instruction - turn one artifact into readiness-aligned variants.
3. Prepare tomorrow - synthesize recent interventions, plans, patterns, and schedules into next-day action.
4. Coordinate with adults and families - produce EA briefings, substitute packets, and family-message drafts that remain under teacher control.

All four jobs run through the same loop:

`classroom signal -> Gemma 4 synthesis -> teacher / EA action -> classroom memory -> next planning context`

A note logged today becomes structured memory. That memory informs tomorrow's plan. Tomorrow's plan becomes an EA briefing. The briefing becomes action. The action becomes the next signal.

Gemma 4 is central in four ways.

First, PrairieClassroom OS uses Gemma 4 for multimodal classroom artifacts. Teachers can upload a worksheet photo; the `extract_worksheet` route sends the image through the hosted Gemma lane as a Gemini-API `inline_data` part, letting the system turn a paper artifact into structured input for differentiation.

Second, the app uses dual-tier routing. Fast classroom transformations route to a live tier; deeper cross-record synthesis routes to a planning tier. The hosted hackathon proof lane uses `gemma-4-26b-a4b-it` for live workflows and `gemma-4-31b-it` for planning workflows.

Third, the app uses selective thinking. Thinking is enabled for planning-tier tasks such as tomorrow planning, support-pattern detection, forecasting, scaffold review, substitute packets, and EA load balancing. It is not turned on for every quick classroom action.

Fourth, Gemma 4 can call bounded local tools for Alberta curriculum lookup and classroom intervention history. The intervention-history tool checks the active roster and rejects unknown student aliases, preventing the model from silently confirming a hallucinated student.

This matches Gemma 4's strengths: agentic workflows with function calling, multimodal reasoning, multilingual support, and efficient architecture, while letting PrairieClassroom OS separate the hosted synthetic proof lane from the intended local/self-hosted deployment path.

Technically, PrairieClassroom OS is a working monorepo: Vite + React teacher shell, Express orchestrator, Flask inference service, SQLite classroom memory, shared Zod schemas, request logging, role scopes, retrieval, persistence, and auditability.

The implemented system includes 12 workflow tools, 13 model-routed prompt classes, 53 exact API endpoints, 7 retrieval-backed prompt classes, 134 checked-in eval case files, and two model tiers.

The public Vercel demo is static-first on the `?demo=true` route so reviewers are not blocked by hosted cold starts. The hosted Gemma 4 proof lane is separate and documented through public proof summaries on synthetic/demo data.

Hosted Gemma 4 proof baseline: passing. The full hosted release gate completed via `npm run release:gate:gemini` on synthetic/demo classroom data, with 13/13 curated proof cases passing. Those cases cover differentiation, worksheet extraction, tomorrow planning, EA briefing, family-message drafting, complexity debt, substitute packet generation, forecasting, prompt-injection resistance, route-scoped tool calling, and a Punjabi family-message equity case.

A current no-cost structural gate also passes in mock mode, validating contracts, routing, parsing, safety checks, and UI/API behavior without paid services. The public proof summaries include `docs/evidence/2026-05-17-hosted-gemini-release-summary.json`, `docs/evidence/2026-05-17-hosted-gemini-eval-summary.json`, and `docs/evidence/2026-05-18-mock-gate-summary.json`, while the provider-level source of truth is summarized in `docs/eval-baseline.md` and `docs/hackathon-proof-brief.md`.

Education AI should not diagnose, surveil, or replace professional judgment. PrairieClassroom OS does not diagnose students, does not generate discipline scores, does not send family messages autonomously, requires teacher approval for family-message drafts, and limits hosted Gemma runs to synthetic/demo data. The repo includes a public claims ledger so unsupported claims do not creep into the demo.

We do not claim real teacher validation, measured workload reduction, real classroom deployment, no-cloud operation, or a passing Ollama proof on the current maintenance host. The local/Ollama lane is the intended privacy-first deployment path, not an overclaimed result.

In the synthetic demo classroom, adapting one worksheet for five readiness levels moves from an estimated thirty-minute manual task to a short teacher-reviewed workflow. Preparing an EA briefing moves from an ad hoc verbal handoff to a structured artifact. Surfacing a recurring support pattern across two weeks of records becomes a planning-tier synthesis task instead of a fragile working-memory burden.

Those are synthetic-demo estimates, not measured classroom outcome claims.

PrairieClassroom OS does not route around the teacher. It strengthens the teacher's coordination layer. It turns scattered classroom signals into visible memory, planning context, adult handoffs, and safer family communication.

Inclusive classrooms do not need another generic chatbot.

They need memory, coordination, safety, and intelligence close enough to the classroom to be useful.

That is what Gemma 4 makes possible.

## Project Links To Attach

- Public code repository: `https://github.com/Bwillia13x/prairieclassroom-os`
- Public live demo: `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`
- Public video: add public YouTube URL after upload

## Media Gallery Suggestions

- Cover image: `differentiate-desktop.png` or `today-desktop.png`
- Additional images: tomorrow plan, family message, mobile shell
