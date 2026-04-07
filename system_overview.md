Finalized System Overview

Working title

PrairieClassroom OS — a local-first classroom complexity copilot for Alberta K–6 classrooms.

Executive overview

PrairieClassroom OS is a teacher- and EA-facing classroom operating layer built for high-complexity Alberta classrooms. Its purpose is not to replace teaching, and not to act as a generic student chatbot. Its purpose is to help classroom adults plan, differentiate, coordinate, document, and communicate inside classrooms where academic variance, EAL needs, behavioural pressure, and support scarcity have all risen at once. This is a strong fit for the Gemma 4 Good Hackathon because the competition explicitly asks teams to explain their app architecture, how they specifically used Gemma 4, and why the technical implementation matters.  ￼

Problem framing

Alberta has now publicly framed “classroom complexity” as a system-level issue shaped by class size, composition, and student needs, and the province is investing $143 million to create up to 476 complexity teams, each with one teacher and two educational assistants, for the highest-need K–6 classrooms. In Calgary, the CBE reports that about 19% of students have special education needs and about 31% are learning English as an Additional Language, which helps explain why the operational burden on classroom staff is no longer just instructional; it is also organizational, relational, and documentation-heavy.  ￼

Product thesis

The core thesis is simple: classroom complexity is not mainly a tutoring problem; it is a coordination problem under time, privacy, and staffing constraints. A useful system therefore has to do more than answer questions. It has to ingest classroom materials, remember context, produce differentiated outputs, trigger structured actions, and help adults allocate limited attention intelligently. That is the niche PrairieClassroom OS is designed to occupy.  ￼

What the system is

One-sentence definition

PrairieClassroom OS is a Gemma-4-native, local-first, multimodal classroom orchestration system that turns messy classroom inputs into practical next actions for teachers, educational assistants, and complexity teams.  ￼

Primary users

The primary users are:
	•	classroom teachers,
	•	educational assistants,
	•	school-based complexity teams,
	•	and, later, inclusive-education leads or principals for aggregate planning.

The initial product, however, should stay tightly focused on the teacher + EA workflow, because that is where the real-time burden sits and where a hackathon prototype can demonstrate immediate value most clearly.  ￼

Core jobs the system performs

At its core, the system does five things:
	1.	Differentiates one lesson or material into multiple classroom-ready versions.
	2.	Coordinates adult support by suggesting who needs attention first, where an EA should focus, and which transitions may be fragile.
	3.	Documents interventions, incidents, and support history in structured form.
	4.	Bridges language through simplified English and multilingual family communication.
	5.	Maintains classroom memory so support decisions improve over time rather than resetting every day.

This structure is deliberately aligned to Gemma 4’s multimodal reasoning, long context, function calling, and multilingual capabilities.  ￼

Why Gemma 4 is the correct substrate

Architectural rationale

Gemma 4 is the right substrate because the target problem is local, multimodal, multilingual, long-context, and action-heavy. Gemma 4 supports text and image across the family, adds audio input on E2B and E4B, provides 128K context on edge models and up to 256K on the larger models, and has native function calling for structured tool use. It is also released with open weights under Apache 2.0, which makes local deployment, tuning, and cost-controlled rollout much more credible than a closed cloud-only design.  ￼

Why this matters for schools

That mix of capabilities maps unusually well onto school reality. Teachers work with worksheet photos, classroom visuals, voice notes, family messages, and prior support history, not just typed prompts. They also operate in environments where privacy, connectivity, latency, and budget all matter. Google’s Gemma 4 materials explicitly position the model family for on-device and edge use, including mobile, desktop, browser, and even Raspberry Pi-class hardware, which makes a local-first school deployment story technically believable rather than aspirational.  ￼

The key framing for judges

The system should therefore be presented as Gemma-4-native, not merely Gemma-compatible. In other words: the product works the way it does because Gemma 4 can fuse multimodal classroom inputs, reason over long classroom histories, invoke tools through function calling, and run across a spectrum from teacher devices to stronger local machines using the same model family. That is the argument that makes the model choice look intentional rather than decorative.  ￼

System concept

Product statement

PrairieClassroom OS converts everyday classroom artifacts into a living classroom support layer. A teacher can photograph tomorrow’s worksheet, attach a short voice note about which students struggled today, pull in the visual schedule, and receive a structured next-day support plan: differentiated task versions, EA group instructions, transition-risk flags, plain-language parent communication, and a clean intervention log stub for the day ahead.  ￼

Two operating tempos

The system should operate in two tempos:

Live mode: fast, on-device assistance during the school day for instruction simplification, visual supports, translation, quick logging, and small-group planning.

Planning mode: deeper reasoning outside the live instructional moment for next-day lesson adaptation, weekly intervention synthesis, support-pattern review, and referral packet drafting.

This “dual-speed” design is one of the strongest ways to show specific use of Gemma 4, because the same family spans smaller edge-oriented models and larger reasoning-oriented models.  ￼

Core product modules

1. Classroom Differentiation Engine

This module takes one source artifact — worksheet, textbook page, teacher prompt, or photographed handout — and produces multiple versions: core class version, EAL-supported version, chunked version, EA small-group version, and extension version. Gemma 4’s image understanding is especially relevant here because Google explicitly lists document/PDF parsing, OCR, chart understanding, and handwriting recognition among Gemma 4’s image capabilities.  ￼

2. Classroom Memory Layer

This module stores routines, support notes, prior interventions, class preferences, accommodations, and successful scaffolds. The reasoning model then works against that memory instead of starting fresh each day. For retrieval, the natural companion is EmbeddingGemma, which is specifically described by Google as an on-device embedding model for semantic search, RAG pipelines, and everyday-device deployment, with offline and secure operation.  ￼

3. Action and Tool Layer

This module turns language into structured actions such as differentiate_material, generate_visual_schedule, draft_parent_message, log_intervention, and prepare_ea_plan. That is where Gemma 4’s native function-calling support becomes central. Google’s function-calling guide is explicit that Gemma can be used to operate programming interfaces, with the surrounding application handling safe execution and validation.  ￼

4. Language Bridge

This module handles simplified English, translated family communication, bilingual vocabulary support, and multilingual classroom-facing summaries. This is not an optional flourish in the Alberta context; it is a direct response to the high EAL share reported by the CBE, paired with Gemma 4’s training across more than 140 languages.  ￼

5. Support Coordination Layer

This module produces daily adult-support guidance: which students likely need pre-correction, which transition may be fragile, how to sequence EA attention, and which small group should be run first. This is where the system aligns most directly to Alberta’s new complexity-team policy, because it helps scarce adult support get deployed with more precision.  ￼

6. Safety and Governance Layer

Because the system will handle child-related classroom data, governance is not optional. A robust implementation should enforce human approval before any outward communication, separate observation from inference, minimize retention, maintain role-based access, and filter risky content. If an image-safety component is needed, ShieldGemma is designed precisely as a safety classifier for text and images against defined policies, with open weights for use inside larger applications.  ￼

What makes the concept novel

Not “another edtech chatbot”

The novelty is not the use of AI in education by itself. The novelty is the reframing of the classroom as a high-frequency operational environment that needs an orchestration layer rather than a conversation toy. The system is built around the proposition that the scarce resource in Alberta classrooms is not just instructional content, but adult coordination capacity. That is why the product centers teachers, EAs, and complexity teams rather than student chat as the primary interface.  ￼

The technical novelty

The technical novelty lies in combining:
	•	multimodal classroom-state construction,
	•	persistent classroom memory,
	•	tool-triggered action generation,
	•	dual-speed local deployment,
	•	and multilingual support

inside one Gemma-4-native architecture. Each of those elements is individually supported by current Gemma-family capabilities; the novelty is in composing them into a classroom OS rather than a single-task app.  ￼

Product boundaries

What the system is not

PrairieClassroom OS should be explicitly framed as:
	•	not a diagnostic tool,
	•	not a student-surveillance system,
	•	not an automated discipline engine,
	•	not a replacement for teacher judgment,
	•	and not a generic student chatbot.

That boundary is strategically important. It keeps the product focused on teacher workload, support precision, and equity, while reducing avoidable ethical and political risk. The Kaggle prompt’s emphasis on explaining architecture and technical choices makes this kind of design discipline an advantage, not a limitation.  ￼

The development-ready framing

North-star objective

The north-star objective is to give a high-complexity Alberta classroom a local-first copilot that reduces planning burden, improves support allocation, and makes multilingual family communication faster and clearer.  ￼

MVP scope

The first build should stay narrow:
	1.	Differentiate one uploaded lesson artifact into multiple classroom-ready versions.
	2.	Generate a next-day support plan from teacher notes plus class context.
	3.	Draft plain-language and translated family communication.
	4.	Log interventions in structured form.

That is enough to prove the product thesis while keeping the demo coherent and visibly Gemma-4-specific.  ￼

Phase-two expansion

Once the core loop works, the strongest extensions are:
	•	referral/evidence packet assembly,
	•	substitute-teacher handoff mode,
	•	school-level support heatmaps,
	•	and deeper longitudinal pattern analysis.

Those belong after the core teacher/EA workflow is proven.  ￼

Final polished description

PrairieClassroom OS is a Gemma-4-native, local-first classroom complexity copilot for Alberta K–6 schools. It is designed for teachers, educational assistants, and complexity teams working in classrooms shaped by rising academic variance, multilingual needs, behavioural pressure, and limited support capacity. Rather than acting as a generic chatbot, the system functions as a classroom operating layer: it ingests multimodal classroom materials, remembers routines and support context, generates differentiated lesson variants, coordinates adult support, drafts multilingual family communication, and logs interventions in structured form. Gemma 4 is the correct substrate because the problem demands multimodal understanding, long-context reasoning, multilingual support, structured tool use, and deployment on local or edge hardware. The result is a system that helps adults run complex classrooms more effectively while preserving privacy, keeping humans in control, and aligning directly to Alberta’s current classroom-complexity reality.  ￼
