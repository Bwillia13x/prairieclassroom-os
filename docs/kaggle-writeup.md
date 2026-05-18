# PrairieClassroom OS

**A Gemma-4-native operating layer for Alberta's inclusive classrooms**

**Public demo:** https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34

**Code:** https://github.com/Bwillia13x/prairieclassroom-os

## 1. The Problem

At 8:12 in the morning, a classroom can already be full.

Not just full of students. Full of reading levels, home languages, sensory needs, missed sleep, behaviour plans, substitute notes, family messages, and an educational assistant who may be available in the morning but gone by the afternoon.

That is the problem PrairieClassroom OS was built for.

Alberta's K-12/ECS student population has grown from 745,770 in 2021/22 to 835,089 in 2025/26. The Calgary Board of Education's 2025-26 budget describes the same operating pressure: enrolment growth, increasing student complexity, more than 44,000 English-as-an-additional-language students, about 26,000 students with specialized learning needs, and nearly three quarters of schools at or above full utilization. [1][2]

This is not a lack-of-care problem. It is a coordination problem. Inclusive classrooms ask one teacher to hold too many signals in working memory at once.

PrairieClassroom OS is not a student chatbot. It is a teacher and educational-assistant operating layer for turning classroom signals into coordinated adult action.

## 2. What We Built

The demo classroom is a synthetic Alberta Grade 3/4 split led by "Mrs. Okafor": 26 students, mixed readiness levels, EAL needs, support routines, two weeks of seeded classroom memory, and morning-only EA coverage.

The product is organized around four daily adult jobs:

1. **Open the day** - triage what changed, who needs attention, and where coverage risk exists.
2. **Adapt instruction** - turn one classroom artifact into readiness-aligned variants.
3. **Prepare tomorrow** - synthesize recent interventions, plans, patterns, and schedules into next-day action.
4. **Coordinate with adults and families** - produce EA briefings, substitute packets, and family-message drafts that remain under teacher control.

All four jobs run through the same loop:

```text
classroom signal -> Gemma 4 synthesis -> teacher / EA action -> classroom memory
        ^                                                        |
        +---------------- next planning context -----------------+
```

A note logged today becomes structured memory. That memory informs tomorrow's plan. Tomorrow's plan becomes an EA briefing. The briefing becomes action. The action becomes the next signal.

That loop is the product.

## 3. Why Gemma 4 Matters

Gemma 4 is not a decorative chatbot layer. It is the reasoning substrate.

**Multimodal classroom artifacts.** Teachers can upload a worksheet photo. The `extract_worksheet` route sends the image through the hosted Gemma lane as a Gemini-API `inline_data` part, letting the system turn a paper artifact into structured input for differentiation.

**Dual-tier routing.** Fast classroom transformations route to a live tier. Deeper cross-record synthesis routes to a planning tier. The hosted hackathon proof lane uses `gemma-4-26b-a4b-it` for live workflows and `gemma-4-31b-it` for planning workflows.

**Selective thinking.** Thinking is enabled for planning-tier tasks such as tomorrow planning, support-pattern detection, forecasting, scaffold review, substitute packets, and EA load balancing. It is not turned on for every quick classroom action.

**Bounded tool calling.** Gemma 4 can call local tools for Alberta curriculum lookup and classroom intervention history. The intervention-history tool checks the active roster and rejects unknown student aliases, which prevents the model from silently confirming a hallucinated student.

This matches Gemma 4's strengths: agentic workflows with function calling, multimodal reasoning, multilingual support, and efficient deployment paths across hosted and local environments. [3]

## 4. Architecture

PrairieClassroom OS is a working monorepo, not a static mockup.

The frontend is a Vite + React teacher shell with role-aware views for teachers, educational assistants, substitutes, and reviewers. The backend is an Express orchestrator that handles classroom-code protection, request validation, prompt routing, retrieval, local tool execution, streaming, output parsing, persistence, and audit logging. A Flask inference service abstracts provider execution across mock, hosted Gemma, Ollama, Vertex/API, and local modes. Per-classroom SQLite memory stores plans, differentiated variants, family-message drafts, interventions, pattern reports, forecasts, scaffold reviews, substitute packets, feedback, and session telemetry. Shared Zod schemas keep structured request and response contracts aligned across the stack.

The implemented system includes:

- 12 workflow tools
- 13 model-routed prompt classes
- 53 exact API endpoints
- 7 retrieval-backed prompt classes
- 134 checked-in eval case files
- 2 model tiers: live and planning

The public Vercel demo is a judge-safe synthetic demo path designed to load reliably. It is static-first on the `?demo=true` route so reviewers are not blocked by hosted cold starts. The hosted Gemma 4 proof lane is separate and artifact-backed on synthetic/demo data.

## 5. Safety And Trust

Education AI should not diagnose, surveil, or replace professional judgment.

PrairieClassroom OS keeps those boundaries explicit:

- It does not diagnose students.
- It does not generate discipline scores.
- It does not send family messages autonomously.
- It uses observational language such as "your records show."
- It requires teacher approval for family-message drafts.
- It limits hosted Gemma runs to synthetic/demo data.
- It protects non-demo classrooms with classroom codes and role scopes.
- It records access and model-run metadata for auditability.

The repo also includes a public claims ledger so unsupported claims do not creep into the demo. We do not claim real teacher validation, measured workload reduction, real classroom deployment, no-cloud operation, or a passing Ollama proof on the current maintenance host. The local/Ollama lane is the intended privacy-first deployment path, not an overclaimed result.

## 6. Proof Of Work

Current hosted refresh: passing baseline. The full hosted release gate passed via `npm run release:gate:gemini` on synthetic/demo classroom data at `output/release-gate/2026-05-17T00-36-24-280Z-35954`, with 13/13 curated proof cases passing.

Those cases cover differentiation, worksheet extraction, tomorrow planning, EA briefing, family-message drafting, complexity debt, substitute packet generation, forecasting, prompt-injection resistance, route-scoped tool calling, and a Punjabi family-message equity case. The full hosted gate completed typecheck, lint, Python tests, TypeScript/Vitest tests, claims check, harness smoke, hosted evals, API smoke, and browser smoke.

The current no-cost structural gate also passes in mock mode at `output/release-gate/2026-05-17T14-11-36-166Z-99074`. The latest mock gate includes 2,142 TypeScript/Vitest tests and 76 Python tests.

The result is not a concept video. It is a route-complete, test-covered, synthetic-data proof of a classroom operating layer built around Gemma 4.

## 7. Impact

The immediate value is time back to teaching.

In the synthetic demo classroom, adapting one worksheet for five readiness levels moves from an estimated thirty-minute manual task to a short teacher-reviewed workflow. Preparing an EA briefing moves from an ad hoc verbal handoff to a structured, reviewable artifact. Surfacing a recurring support pattern across two weeks of records becomes a planning-tier synthesis task instead of an impossible memory burden.

Those are synthetic-demo estimates, not measured classroom outcome claims.

The larger contribution is the model of AI use. PrairieClassroom OS does not route around the teacher. It strengthens the teacher's coordination layer. It turns scattered classroom signals into visible memory, planning context, adult handoffs, and safer family communication.

Inclusive classrooms do not need another generic chatbot.

They need memory, coordination, safety, and intelligence close enough to the classroom to be useful.

That is what Gemma 4 makes possible.

**PrairieClassroom OS is a classroom operating layer for the future of inclusive education.**

[1]: https://www.alberta.ca/student-population-statistics "Student population statistics | Alberta.ca"
[2]: https://www.cbe.ab.ca/news-centre/Pages/Trustees-Approve-Education-Plan-and-2025-2026-Budget.aspx "Trustees Approve Education Plan & 2025-2026 Budget - Calgary Board of Education"
[3]: https://deepmind.google/models/gemma/gemma-4/ "Gemma 4 - Google DeepMind"
