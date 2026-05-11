# Alberta Classroom Complexity + PrairieClassroomOS Video Brief

Date: 2026-05-11

Purpose: research the current Alberta classroom complexity problem, map it to what PrairieClassroom OS actually does, and define a claim-safe HyperFrames explainer spine for a short video.

## Core Thesis

Alberta's classroom complexity crisis is not only a class-size problem. It is a coordination problem: more students, more layered needs, more language support, more assessment waitlists, more adult handoffs, and more pressure on teachers to hold the day together with incomplete support.

PrairieClassroom OS addresses that operational layer. It does not replace teachers, EAs, specialists, funding, or policy. It helps the adults in the room turn classroom signals into coordinated next actions: adapt the lesson, log what happened, retrieve the record, prepare tomorrow, brief the EA, and keep family communication teacher-approved.

Best video sentence:

> Alberta's classroom complexity crisis is a coordination crisis. PrairieClassroom OS is a Gemma 4 operating layer that turns classroom signal into adult action while keeping teachers in control.

## Alberta Problem: Evidence Summary

- Alberta defines classroom complexity as the learning environment affected by academic, behavioural, social-emotional, linguistic, and socio-economic student needs. This is broader than headcount alone.
- Alberta reports more than 80,000 new students entered the education system over the past 3 years, creating larger and more complex classrooms.
- In February 2026, the province said it had new data from 89,000 classrooms across 1,549 schools, and that composition and complexity were growing rapidly even where average class sizes appeared acceptable.
- Alberta is investing $143 million for 476 K-6 complexity teams, each with one teacher and two educational assistants. This is important context for the video: the province itself is treating K-6 complexity as an urgent operational pressure point.
- The ATA's Fall 2025 Pulse report had over 5,700 teacher and school-leader respondents. Its weighted complexity framing shows why average class size understates teacher load: one classroom can have a moderate headcount but a much heavier planning, safety, language, and coordination burden.
- In that ATA report, 8 in 10 respondents said the complexity and diversity of student needs increased year over year. Reported areas of greatest complexity were social-emotional, behavioural, cognitive, ELL/EAL, and socioeconomic needs.
- CBE's local data makes this concrete: about 19% of CBE students have special education needs, about 31% are learning English as an Additional Language, and CBE reported thousands of students waitlisted for assessments or carrying additional complexity factors not reflected in codes.

Interpretation for the video: the crisis is the gap between a classroom's visible roster count and the actual coordination load of teaching that roster well.

## How PrairieClassroom OS Maps To The Problem

### 1. Makes Complexity Visible

Alberta's public response now depends on class size and composition data. PrairieClassroom OS mirrors that logic at classroom scale. Today, Forecast, Week, Support Patterns, and the deterministic debt register help surface open loops, stale follow-ups, coverage risk, and pressure blocks before they become emergencies.

Video framing: "The province is collecting data to see complexity. PrairieClassroom brings that visibility to tomorrow morning's actual classroom decisions."

### 2. Reduces Rework Around Materials

Teachers facing EAL, mixed grade, cognitive, and extension needs often rebuild the same lesson several ways. PrairieClassroom's Differentiate, Language Tools, vocabulary cards, and worksheet extraction workflows turn one artifact into multiple readiness-aligned access routes while preserving the original learning goal.

Video framing: "One worksheet becomes multiple access routes, without the teacher retyping and rebuilding the entire lesson."

### 3. Coordinates Adults, Not Just Content

The Alberta response emphasizes teachers, EAs, specialists, and cross-sector supports. PrairieClassroom is strongest when framed as adult coordination software: EA Briefing, EA Load Balance, Sub Packet, Today, and role-scoped teacher/EA routes help move knowledge between adults without turning the system into student surveillance.

Video framing: "Inclusive classrooms are carried by adults coordinating minute by minute. PrairieClassroom turns memory into briefings, support blocks, and handoffs."

### 4. Closes The Memory Loop

The product's central value is continuity. A quick intervention note becomes structured SQLite memory. That memory feeds Tomorrow Plan, Complexity Forecast, EA Briefing, Support Patterns, and family-message context. This is the key difference from a generic AI teacher tool: the output is not a one-off answer; it is part of a classroom operating loop.

Video framing: "Today is not lost at 3:30. It becomes tomorrow's context."

### 5. Keeps Professional Judgment In Control

PrairieClassroom explicitly avoids diagnosis, discipline scoring, autonomous family messaging, surveillance, and student-facing chatbot behaviour. Family messages remain drafts. Teachers approve before anything leaves the classroom.

Video framing: "The copilot drafts. The teacher decides."

## Gemma 4 Novelty Story

The strongest Gemma 4 claim is not "we used an LLM." It is that the app uses Gemma 4's open, multimodal, agentic, and reasoning capabilities as an operating layer.

Implemented / repo-supported story:

- Dual-tier routing: fast classroom transformations use the live tier; deeper planning and pattern synthesis use the planning tier.
- Selective thinking: thinking is enabled where cross-record reasoning matters, not for every small classroom task.
- Multimodal artifacts: worksheet images can become structured prompt input, so a physical classroom artifact can enter the workflow without manual retyping.
- Roster-checked function calling: Gemma can call local bounded tools for Alberta curriculum lookup and classroom intervention history. The intervention-history tool rejects unknown student aliases, preventing the model from silently validating a hallucinated student.
- Structured outputs: prompt classes are schema-backed and routed through the orchestrator, not exposed as open chat.
- Privacy posture: hosted Gemma proof is synthetic/demo only; the intended school deployment story is local/self-hosted Gemma via Ollama once host proof is captured.

Claim-safe wording:

- Say: "Gemma 4 powers multimodal worksheet extraction, route-scoped tool calling, selective planning-tier reasoning, and structured adult workflows."
- Say: "Hosted Gemma proof is on synthetic/demo classroom data."
- Do not say: "Proven in Alberta classrooms", "fully offline proven", "solves classroom complexity", or "replaces EAs / teachers / specialists."

## HyperFrames Story Spine

Target: 75-90 seconds, 1920x1080, restrained operational product film. Use actual PrairieClassroom UI screenshots plus a few clean evidence overlays. Avoid generic AI visuals.

| Time | Beat | Narration spine | Visual direction |
| --- | --- | --- | --- |
| 0:00-0:10 | The crisis | "Alberta's classroom complexity crisis is not just about how many students are in the room. It is about the layered needs a teacher must coordinate at once." | Dark Today/Classroom surface. Evidence chips: 80,000 new students, 89,000 classrooms measured, K-6 complexity teams. |
| 0:10-0:22 | Hidden load | "A moderate class can still carry heavy instructional load: EAL support, individualized plans, behaviour and social-emotional needs, assessments, and adult handoffs." | Roster/profile and support-thread overlays. Keep "synthetic demo data" visible. |
| 0:22-0:36 | Product answer | "PrairieClassroom OS turns that load into four adult jobs: open the day, adapt instruction, prepare tomorrow, and coordinate with adults or families." | Four-job layout from product UI, no marketing hero. |
| 0:36-0:50 | Gemma 4 material flow | "Gemma 4 reads classroom artifacts and helps turn one worksheet into multiple access routes while keeping the learning goal intact." | Worksheet/photo to Differentiate workflow; labels for core, EAL, chunked, extension, EA small group. |
| 0:50-1:05 | Gemma 4 memory flow | "A quick note becomes structured classroom memory. The planning tier retrieves it for tomorrow's plan, the EA briefing, and the next pattern review." | Log Intervention -> memory chip -> Tomorrow Plan -> EA Briefing chain. |
| 1:05-1:18 | Control boundary | "The system can draft a family message, but it cannot send one. The teacher reviews, edits, and approves." | Family Message approval gate. Use lock/checkmark, no autonomous-send imagery. |
| 1:18-1:30 | Close/proof | "This is not a student chatbot. It is a Gemma 4 operating layer for the adults carrying inclusive classrooms." | Proof card: 12 workflow tools, 13 prompt classes, roster-checked tools, hosted synthetic proof, local-first target. |

## Draft Voiceover

```text
Alberta's classroom complexity crisis is not just about how many students are in the room.
It is about the layered needs a teacher has to coordinate at the same time.

Language support. Individual plans. Behaviour and social-emotional needs. Assessment waits. Adult handoffs.
The visible roster is only part of the load.

PrairieClassroom OS is built for that hidden coordination work.
It organizes the day around four adult jobs: open the day, adapt instruction, prepare tomorrow, and coordinate with adults or families.

Gemma 4 is the operating layer.
It can read a classroom artifact, turn one worksheet into multiple access routes, and keep the learning goal intact.

Then a quick teacher note becomes structured classroom memory.
The planning tier retrieves that signal for tomorrow's plan, the EA briefing, and the next pattern review.

Safety stays practical.
The system can draft a family message, but it cannot send one.
The teacher reviews, edits, and approves.

PrairieClassroom OS is not a student chatbot.
It is a Gemma 4 operating layer for the adults carrying inclusive classrooms.
```

## Sources

- Government of Alberta, "Taking action on classroom complexity": https://www.alberta.ca/taking-action-on-classroom-complexity
- Government of Alberta, "A bold investment in student success", February 12, 2026: https://www.alberta.ca/release.cfm?xID=9564141722588-FFA6-400D-B388DB636D18FB65
- Government of Alberta, "Better data, better outcomes for Alberta students", October 29, 2025: https://www.alberta.ca/release.cfm?xID=95165F2D98747-B448-1FBE-E357DE1A8E9CF1CB
- Government of Alberta, "Aggression and Complexity in Schools Action Team" and terms of reference: https://www.alberta.ca/aggression-and-complexity-in-schools-action-team
- Alberta Teachers' Association, "A Polycrisis: Class Size and Complexity in an Education System Under Duress", 2026: https://teachers.ab.ca/sites/default/files/2026-01/COOR-10-46_Pulse_Rapid_Research_Fall_2025_digital_compressed.pdf
- Alberta Teachers' Association, "Addressing complexity in Alberta's classrooms", February 12, 2026: https://teachers.ab.ca/news/addressing-complexity-albertas-classrooms
- Calgary Board of Education, "Class Size & Complexity", 2026: https://cbe.ab.ca/about-us/board-of-trustees/advocacy-priorities/Documents/Class-Size-and-Complexity.pdf
- Google, "Gemma 4: Byte for byte, the most capable open models", April 2, 2026: https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/
- Local product evidence: `README.md`, `docs/kaggle-writeup.md`, `docs/architecture.md`, `docs/hackathon-proof-brief.md`, `services/orchestrator/router.ts`, `services/orchestrator/tool-registry.ts`, `services/inference/harness.py`.
