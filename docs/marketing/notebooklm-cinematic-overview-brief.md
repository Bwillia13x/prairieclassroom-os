# NotebookLM Source Brief — PrairieClassroom OS Cinematic Overview

Use this document as the primary source when asking NotebookLM to create a cinematic overview, advertising, or launch-style marketing video for PrairieClassroom OS. It is written so NotebookLM does not need direct access to the codebase.

## Primary Ask For NotebookLM

Create a cinematic marketing and explanatory overview video for PrairieClassroom OS. The audience is a mix of educators, school leaders, hackathon judges, and potential pilot partners. The video should feel grounded, credible, human, and technically specific. It should not feel like a generic AI education commercial.

Suggested output length: 2.5 to 4 minutes.

Suggested tone: warm, serious, cinematic, hopeful, and precise. Avoid hype. The core emotional movement is from overload to clarity: the teacher starts the day carrying too many invisible threads, then PrairieClassroom OS makes the coordination work visible and actionable.

## One-Sentence Product Definition

PrairieClassroom OS is a Gemma-4-native, local-first classroom complexity copilot for Alberta K-6 teachers and educational assistants that turns classroom memory, lesson artifacts, and teacher notes into differentiated materials, support plans, family-message drafts, forecasts, and structured intervention records.

## Product Thesis

Classroom complexity is not mainly a tutoring problem. It is a coordination problem under time, privacy, and staffing constraints.

Teachers in complex classrooms are not just teaching lessons. They are remembering accommodations, managing mixed-grade content, supporting English language learners, coordinating scarce EA time, watching fragile transitions, documenting interventions, communicating with families, and preparing for the next day. PrairieClassroom OS is built as a classroom operating layer for that coordination load.

The product is explicitly not a student chatbot, not a diagnostic system, not an automated discipline engine, and not a surveillance dashboard. It is a teacher and EA command center.

## Setting And Demo Classroom

The demo classroom is Mrs. Okafor's Grade 3/4 split in Lethbridge, Alberta. It represents a high-complexity K-6 classroom:

- 26 students total.
- 8 English language learners.
- Multiple home-language contexts.
- A mix of academic variance, math anxiety, sensory and transition needs, and extension needs.
- Shared educational assistant support, with morning support being especially scarce.
- Two weeks of classroom memory available in the system.

Named example learners used in the demo:

- Amira: EAL learner with strong math potential, needs language scaffolding.
- Brody: benefits from visual timers and transition supports.
- Chantal: extension learner and peer mentor candidate.
- Daniyal: early-stage EAL learner.
- Elena: needs confidence-building and math-anxiety scaffolds.
- Farid: stronger verbal language than written output.

These are synthetic/demo records, not real student records.

## Core Workflows To Explain

### 1. Today View And Morning Triage

The app opens on the day as a practical operating view, not a generic dashboard. It identifies the fragile block of the day, the students most likely to need first attention, and the unresolved classroom work carried forward from previous days.

Key visual ideas:

- "10:00-10:45 is today's real test."
- A day arc showing complexity rising and falling across blocks.
- Student names placed against the blocks where adult attention is most needed.
- Complexity debt showing outstanding items like unapproved messages, stale follow-ups, recurring plan items, and unaddressed support patterns.

Message to communicate: PrairieClassroom helps the teacher see the day before it happens.

### 2. Complexity Debt

Complexity debt is the product metaphor for the invisible coordination work that compounds when ignored. It includes follow-ups, pending messages, stale interventions, recurring plan items, and unresolved support patterns.

Important framing: this is not blame and not surveillance. It is a way of making invisible teacher workload visible enough to prioritize.

Example line:

"The app tracks classroom complexity the way an engineer tracks technical debt: not to judge the person doing the work, but to reveal which unresolved threads will compound if they stay hidden."

### 3. Differentiation Engine

A teacher can provide one lesson artifact, worksheet, or passage and ask the system to adapt it for the classroom. PrairieClassroom OS produces classroom-ready variants such as:

- Core version.
- EAL-supported version.
- Chunked step-by-step version.
- EA small-group version.
- Extension version.

The goal is not to lower expectations. The goal is to preserve the same instructional objective while giving different students viable access routes.

Example line:

"One lesson becomes several paths through the same learning goal."

### 4. Language Tools And Family Communication

PrairieClassroom OS supports simplified English, vocabulary cards, bilingual support, and family-message drafting. Family messages can be drafted in a teacher's tone and adapted for multilingual family communication.

Non-negotiable product rule: nothing is ever sent automatically. The teacher reviews, edits, copies, and sends through the school's normal channel.

Example line:

"The copilot drafts. The teacher decides."

### 5. EA Briefing And EA Load Balancing

PrairieClassroom OS helps educational assistants understand where to focus. It generates concrete briefings and support plans:

- Who needs pre-correction.
- Which block will spike.
- Which students should be grouped.
- When the EA should step in.
- Where handoff risk exists.
- How to balance cognitive load across the morning.

Message to communicate: the app turns scarce adult support into a route through the day.

### 6. Tomorrow Plan

The Tomorrow Plan synthesizes teacher reflection, recent interventions, pattern reports, and forecast context into a next-day support plan.

It should identify:

- Priority students.
- Fragile moments.
- EA actions.
- materials to prepare.
- family follow-ups.
- watch points.

Message to communicate: PrairieClassroom helps teachers leave school with a plan instead of a pile of mental tabs.

### 7. Complexity Forecast

The forecast looks ahead across coming blocks or days. It classifies upcoming classroom pressure into stable, watch, or high-risk moments, and gives the teacher practical planning guidance.

Important framing: the system does not "predict student behavior." It forecasts classroom support complexity from observed patterns and teacher records.

Example line:

"The goal is not prediction for its own sake. It is catching small patterns before they become classroom emergencies."

### 8. Usage Insights And Evidence Loop

PrairieClassroom OS includes feedback and session tracking to show how the tool is used by the teacher. It can summarize:

- Which panels are used most.
- Which outputs receive positive feedback.
- How sessions flow.
- Reliability and request-volume evidence.
- Pilot-readiness artifacts.

This is teacher-facing evidence, not an external analytics warehouse.

## Architecture To Explain

PrairieClassroom OS is organized as six layers:

1. Input layer: teacher notes, lesson text, worksheet/photo upload, curriculum selections, URL-backed UI state.
2. Orchestration layer: Express API, request validation, auth, input sanitization, prompt routing, retrieval injection, inference dispatch, tool-call orchestration, streaming handoff, output parsing, memory persistence.
3. Model layer: two-speed Gemma 4 routing.
4. Memory layer: per-classroom SQLite databases with generated plans, variants, messages, interventions, forecasts, pattern reports, scaffold reviews, survival packets, feedback, and sessions.
5. Prompt class routing: 13 model-routed prompt classes plus one deterministic complexity debt register.
6. Safety layer: forbidden diagnostic terms, observational framing, no diagnosis, no discipline scoring, human approval for messages, prompt-injection detection, classroom-code authentication, input sanitization, and audit trail.

## Gemma 4 And Model Routing

The product is framed as Gemma-4-native because the classroom problem requires multimodal understanding, long-context reasoning, multilingual support, tool use, and local or edge deployment.

There are two operating tiers:

Live tier:

- Used for fast classroom tasks.
- Examples: differentiate material, simplify for student, generate vocab cards, draft family message, log intervention, generate EA briefing, extract worksheet.
- Thinking mode off for lower latency.

Planning tier:

- Used for deeper synthesis.
- Examples: prepare tomorrow plan, forecast complexity, detect support patterns, detect scaffold decay, generate survival packet, balance EA load.
- Thinking mode on.
- Retrieval-backed with classroom memory.

Deterministic:

- Complexity debt register is computed from memory, not generated by a model.

Proof state from the repository:

- 13 model-routed prompt classes.
- 7 live classes.
- 6 planning classes.
- 1 deterministic debt register.
- Hosted Gemma proof lane passing on synthetic/demo data.
- Hosted curated eval suite: 12/12 passed.
- Final baseline eval report: 42/42 passing.
- Reliability evidence analyzed 6,298 requests across 8 log files.

Important caveat: hosted Gemma is a synthetic/demo proof lane, not the intended school deployment path. The intended privacy-preserving path is local or self-hosted Gemma 4.

## Safety And Governance Boundaries

These points must be stated clearly:

- PrairieClassroom OS does not diagnose students.
- It does not produce clinical claims.
- It does not discipline-score children.
- It is not a student surveillance product.
- It does not send family messages automatically.
- It does not replace teacher judgment.
- It uses observational language such as "your records show" rather than clinical labels.
- It requires teacher review before outward communication.
- It supports role-aware access and classroom-code authentication.
- It logs and audits model-routed outputs.
- It blocks forbidden diagnostic terms and detects prompt-injection patterns.

Best summary line:

"The system makes coordination visible without turning children into scores."

## Visual Direction For Cinematic Overview

Opening mood:

- Early morning classroom.
- Quiet, slightly tense.
- Desk, lesson materials, sticky notes, coffee, bell schedule, laptop glow.
- The teacher is mentally carrying many open loops before students arrive.

Visual progression:

1. Start with the teacher's morning overload.
2. Move into the app's Today view.
3. Show the day arc and complexity debt.
4. Cut to lesson differentiation and generated variants.
5. Show family message drafting with a clear teacher-approval moment.
6. Show EA briefing and load balancing as operational clarity.
7. Show forecast as anticipation, not prediction.
8. Show architecture or abstract system layers: UI, orchestrator, Gemma tiers, memory, safety.
9. Close with the teacher leaving with a clearer plan and students receiving more timely support.

Style guidance:

- Cinematic but restrained.
- Natural classroom light.
- Avoid futuristic hologram cliches.
- Use UI overlays sparingly.
- Use grounded language, not generic AI hype.
- Treat teachers as professionals, not as helpless users.
- Treat students with dignity.

Suggested color mood:

- Warm classroom daylight.
- Clean interface whites and muted blues/greens.
- Subtle contrast between morning chaos and operational clarity.

## Suggested Voiceover Script

This script can be used directly or adapted by NotebookLM.

PrairieClassroom OS begins with a simple premise: classroom complexity is not mainly a tutoring problem. It is a coordination problem.

In a high-complexity Alberta K-6 classroom, a teacher starts the morning with more than a lesson plan. There are English language learners at different stages, students who need transition support, families waiting for updates, an educational assistant with limited time, and yesterday's interventions still sitting in memory. The hard part is not knowing that every student matters. The hard part is deciding what needs attention first.

PrairieClassroom OS is a local-first classroom operating layer for that work. It does not open as a chatbot. It opens on the day itself: the fragile block, the students who need the first touch, the follow-ups that are becoming complexity debt, and the support decisions that cannot stay hidden.

From there, the teacher can turn one lesson artifact into several workable paths. A single worksheet or passage can become a core version, an EAL-supported version, a chunked step-by-step version, an extension path, and an EA small-group plan. The goal is not to lower expectations. The goal is to keep the class moving through the same learning objective with supports that match the learners in the room.

The same operating layer helps with communication. It can draft a clear family message or simplify classroom language, but it never sends on the teacher's behalf. Every outward message remains reviewable, editable, and human-approved. The copilot drafts. The teacher decides.

For educational assistants, PrairieClassroom turns memory into a route through the day: who needs pre-correction, where the morning will spike, when a handoff matters, and how to distribute scarce adult support without overwhelming one person or missing the quiet student who needed the first check-in.

Under the surface, the architecture is deliberately bounded. Teacher input passes through validation, role-aware access, sanitization, retrieval from classroom memory, model-tier routing, and safety checks. Fast live workflows use the live Gemma tier. Deeper planning workflows use a planning tier with retrieval-backed classroom context. The complexity debt register is deterministic. The memory stays classroom-scoped.

This matters because the product is built around professional judgment. PrairieClassroom does not diagnose students. It does not discipline-score children. It is not a surveillance dashboard. It uses observational language, approval gates, audit trails, and safety rules because school software has to earn trust before it earns adoption.

The result is a practical shift in the teacher's day. Less invisible coordination load. More timely support. A clearer plan for the adult team. And a classroom where the next fragile moment is seen early enough to prepare for it.

PrairieClassroom OS is a copilot for the adults carrying the classroom.

## Scene-By-Scene Cinematic Outline

1. Open on morning overload: empty classroom, teacher desk, lesson pages, sticky notes, bell schedule. Voiceover introduces coordination problem.
2. Cut to PrairieClassroom Today view: show the fragile block and student watch points.
3. Show day arc: the day is not flat; pressure rises and falls.
4. Show complexity debt: unresolved work becomes visible and prioritized.
5. Show differentiation: one source artifact becomes multiple lesson variants.
6. Show language and family communication: message draft, teacher approval boundary.
7. Show EA briefing: adult support receives a concrete route.
8. Show forecast: red/amber/green future blocks and early-warning framing.
9. Show architecture abstraction: UI, orchestrator, Gemma tiers, memory, safety.
10. Show evidence loop: usage insights, feedback, reliability proof.
11. Show governance boundaries: no diagnosis, no autonomous sends, no surveillance.
12. Close on teacher and classroom: less coordination drag, more timely support.

## Claims NotebookLM Should Avoid

Do not claim:

- That the product has been deployed with real student data.
- That it diagnoses learning disabilities or mental-health conditions.
- That it predicts individual student behavior.
- That it sends messages automatically.
- That it replaces teachers, EAs, or school judgment.
- That it is a student-facing chatbot.
- That hosted Gemma is the intended production path for real classroom data.
- That all features are certified for production school district use.

Use this safer language instead:

- "Synthetic demo classroom."
- "Pilot-ready."
- "Local-first deployment target."
- "Teacher-reviewed drafts."
- "Observed classroom patterns."
- "Support complexity forecast."
- "Human-approved communication."

## Strong Closing Options

Option 1:

"Classroom complexity is not a behavior problem. It is a coordination problem. PrairieClassroom OS helps the adults carrying that complexity see the day clearly enough to act."

Option 2:

"Less coordination drag for teachers. More timely support for students. PrairieClassroom OS is a local-first copilot for the adults who hold the classroom together."

Option 3:

"The promise is not artificial intelligence replacing professional judgment. The promise is professional judgment with better memory, better timing, and less invisible load."

