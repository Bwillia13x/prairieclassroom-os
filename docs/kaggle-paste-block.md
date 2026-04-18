# Kaggle Paste Block

Paste-ready submission copy derived from the canonical writeup in `docs/kaggle-writeup.md`.

## Title

PrairieClassroom OS

## Subtitle

A Gemma-4-native operating layer for high-complexity inclusive classrooms

## Body

The hardest part of teaching an inclusive classroom is usually not writing the lesson. It is coordinating everything around it.

PrairieClassroom OS is built for that coordination problem. It is a classroom operations copilot for teachers and educational assistants, not a tutor and not a replacement for teacher judgment. The system spans 12 primary panels and 13 model-routed workflows: differentiation, worksheet extraction, tomorrow planning, family-message drafting with approval gates, intervention logging, language supports, support-pattern detection, EA briefings, complexity forecasting, scaffold-decay review, substitute packets, and EA load balancing.

The product thesis is simple: classroom complexity is a coordination problem. A useful AI system in this setting needs memory, retrieval, safety boundaries, and role-specific workflows, not just text generation.

Technically, PrairieClassroom OS uses a three-service architecture:

- Vite + React UI for the teacher and EA shell
- Express orchestrator for prompt construction, retrieval, validation, and approval boundaries
- Flask inference service for provider-specific model execution

Classroom memory lives in SQLite. Retrieval is SQL-based because the data is bounded, structured, and relational: students, interventions, plans, messages, and pattern reports. For this use case, SQL is more transparent and controllable than approximate vector retrieval.

Gemma 4 is central to the design in three ways.

1. Multimodal worksheet handling: teachers can submit a worksheet image directly to the Differentiate workflow, letting Gemma 4 vision extract content without manual retyping.
2. Dual-tier routing: fast transformation tasks stay on the live tier, while planning and pattern synthesis route to the larger planning tier.
3. Selective thinking mode: thinking is enabled only for tomorrow planning and support-pattern detection, where cross-record reasoning matters.

For the hackathon submission, the artifact-backed proof lane is hosted Gemma 4 through the Gemini API on synthetic/demo classroom data:

- live tier: `gemma-4-26b-a4b-it`
- planning tier: `gemma-4-31b-it`

The repo also includes a separate local/self-hosted Ollama lane for the intended privacy-preserving school deployment path:

- live tier: `gemma4:4b`
- planning tier: `gemma4:27b`

That distinction is intentional. The hosted lane is the proof path used for the submission artifacts. The Ollama lane is the future local-first deployment path for school environments.

Safety is built into the product design. PrairieClassroom OS uses observational language instead of diagnostic claims, excludes clinical and stigmatizing terms from relevant prompt classes, and keeps a permanent teacher-approval boundary on family messaging.

The checked-in repo currently proves three things:

- the no-cost structural gate passes on the current branch
- the hosted Gemma 4 proof suite passed `12/12`
- the full hosted release gate completed successfully on synthetic/demo data

The system is therefore not just a demo concept. It is a working Gemma-4-native operating layer for differentiated instruction, classroom memory, family communication, and next-day planning.

## Project Links To Attach

- Public code repository: `https://github.com/Bwillia13x/prairieclassroom-os`
- Public live demo: add public deployed URL after deployment
- Public video: add public YouTube URL after upload

## Media Gallery Suggestions

- Cover image: `differentiate-desktop.png` or `today-desktop.png`
- Additional images: tomorrow plan, family message, mobile shell
