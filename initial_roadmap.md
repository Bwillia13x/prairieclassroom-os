Development roadmap: PrairieClassroom OS

This roadmap is designed for an agent like Claude Code to execute in sequenced, repeatable sprints toward a hackathon-grade MVP. It assumes you are optimizing for a submission that can clearly show architecture, specific Gemma 4 usage, technical choices, and a compelling real-world need, because the public Kaggle brief explicitly says entrants must explain those elements. The product target remains Alberta classroom complexity, where the province has publicly tied rising complexity to rapid enrolment growth and is funding 476 classroom complexity teams, while CBE reports high EAL load, meaningful special-needs concentration, and thousands of students waitlisted for assessment.  ￼

The architecture assumption behind the roadmap is a dual-speed Gemma system: a smaller Gemma 4 edge model for live classroom actions and a larger Gemma 4 model for deeper planning/synthesis. That is realistic because Gemma 4 ships in E2B, E4B, 26B A4B, and 31B sizes, supports text and image across the family, supports audio on the small models, has up to 256K context, supports 140+ languages, and is intended for deployment from phones and laptops to servers. Function calling and thinking mode are both first-class capabilities in the current docs.  ￼

North-star outcome

By the end of the roadmap, Claude Code should have built a demoable, local-first classroom copilot that can do three things reliably:
	1.	turn one classroom artifact into differentiated outputs,
	2.	generate a next-day support plan from multimodal teacher inputs and classroom memory,
	3.	draft multilingual family communication and log interventions through structured actions.

That scope is narrow enough for a hackathon, but rich enough to prove that the system is Gemma-4-native, not just Gemma-adjacent. The reason to keep the first version teacher/EA-facing is that Alberta’s public framing of the problem is operational: support allocation, complexity management, and classroom burden, not merely content delivery.  ￼

⸻

Recommended repo shape for the agent

Claude Code should work inside a monorepo with this target structure:
	•	apps/web — teacher-facing UI
	•	services/orchestrator — model routing, tool execution, policy layer
	•	services/retrieval — classroom memory, embedding pipeline
	•	packages/shared — schemas, types, prompt contracts
	•	evals/ — benchmark prompts, golden outputs, latency tests
	•	data/synthetic_classrooms — synthetic class rosters, worksheets, notes, interventions
	•	docs/ — product spec, architecture, sprint reviews, Kaggle writeup drafts

The important point is not the exact folder names. It is that Claude should separate:
	•	interface,
	•	orchestration,
	•	memory,
	•	evaluation,
	•	and documentation

from the start, because the submission will need architecture clarity, not just working code.  ￼

⸻

Agent operating cadence

Use one-week sprints with the same internal loop every time:

Before each sprint

Claude should:
	•	read docs/product-spec.md
	•	read docs/current-architecture.md
	•	read the previous sprint review
	•	produce docs/sprint-N-plan.md

During each sprint

Claude should:
	•	implement only the sprint scope
	•	keep decisions in docs/decision-log.md
	•	update prompt contracts and schemas as code changes
	•	add at least one eval for every major new capability

At sprint end

Claude should produce:
	•	docs/sprint-N-review.md
	•	a short “what works / what breaks / what to cut” section
	•	updated demo script notes
	•	updated backlog for the next sprint

This cadence matters because hackathon winners are usually not the teams with the most features; they are the teams with the clearest evidence that the product works as designed.

⸻

Phase 0 — Product lock and technical spike

Sprint 0: Frame the system correctly

Goal

Freeze the product thesis, pick the first user loop, and validate the Gemma toolchain locally.

Why this comes first

The biggest failure mode is building a broad edtech app instead of a Gemma-4-specific classroom operating layer. The public Gemma 4 materials make clear that the model family’s differentiators are multimodality, long context, device-range deployment, and tool use. Those must shape the first build decisions.  ￼

Claude tasks
	•	Write docs/product-spec.md with:
	•	target user: teacher + EA
	•	target setting: Alberta K–6
	•	target pain: differentiation + support coordination + communication
	•	explicit non-goals: diagnosis, surveillance, discipline scoring
	•	Write docs/gemma-rationale.md explaining:
	•	why Gemma 4, specifically
	•	why dual-speed deployment
	•	why function calling matters
	•	Stand up a minimal inference harness for:
	•	gemma-4-E2B-it or gemma-4-E4B-it
	•	gemma-4-26B-A4B-it or gemma-4-31B-it
	•	Run smoke tests for:
	•	text prompt
	•	image + text prompt
	•	thinking mode
	•	one tool-call round trip

Deliverables
	•	locked product spec
	•	local inference harness
	•	first architecture diagram
	•	first benchmark notebook/script

Exit criteria

You can show one prompt going through Gemma 4, optionally with image input, and getting either a normal answer or a valid tool call. Gemma 4’s official docs already provide the primitives needed for multimodal loading, thinking mode, and function-calling workflow.  ￼

⸻

Phase 1 — Core demo loop

Sprint 1: Multimodal lesson differentiation MVP

Goal

Build the first judge-visible feature: upload a worksheet or handout and generate multiple classroom-ready versions.

Why this is the right first feature

It is visually demoable, directly relevant to Alberta complexity, and uses Gemma 4’s multimodal strengths immediately. CBE’s reported classroom mix shows exactly why one-size-fits-all materials break down in practice.  ￼

Claude tasks
	•	Build upload flow in apps/web
	•	Support image/PDF page ingestion into orchestrator
	•	Create prompt templates for:
	•	core class version
	•	EAL-supported version
	•	chunked/low-load version
	•	EA small-group version
	•	extension version
	•	Add structured output schema so each variant has:
	•	title
	•	teacher instructions
	•	student-facing instructions
	•	required materials
	•	estimated time
	•	Build side-by-side results UI
	•	Add basic latency and output-quality evals

Deliverables
	•	working upload + generate flow
	•	five differentiated variants from one source artifact
	•	test fixtures with synthetic classroom materials

Exit criteria

A teacher can upload a classroom artifact and reliably receive multiple differentiated outputs in one interface session.

⸻

Sprint 2: Next-day support plan

Goal

Turn teacher notes plus classroom context into a “tomorrow plan.”

Why this matters

This is the first move from “content generator” to “classroom OS.” Gemma 4’s long context and thinking mode are especially relevant here because tomorrow planning depends on combining routines, recent struggles, support notes, and lesson materials in one reasoning pass.  ￼

Claude tasks
	•	Create structured classroom_state schema:
	•	roster
	•	support tags
	•	EAL flags
	•	seating/transition notes
	•	prior intervention notes
	•	Add teacher voice note or typed reflection input
	•	Generate:
	•	likely fragile transitions
	•	students needing pre-correction
	•	EA priority list
	•	small-group recommendation
	•	parent follow-up suggestions
	•	Enable thinking mode for planning tasks only
	•	Store generated plans for later retrieval

Deliverables
	•	tomorrow-plan generator
	•	classroom-state schema
	•	planning-mode prompt pack
	•	eval set with 10–20 synthetic classroom scenarios

Exit criteria

The system can turn “today’s worksheet + teacher note + class context” into a coherent next-day plan.

⸻

Phase 2 — Persistent intelligence

Sprint 3: Classroom memory and retrieval

Goal

Add persistent classroom memory so the system stops behaving like a stateless chatbot.

Why this matters

A classroom tool that forgets everything is weak. EmbeddingGemma is a strong fit here because it is designed for on-device retrieval, semantic similarity, clustering, and multilingual use on phones, laptops, and tablets, with low memory needs.  ￼

Claude tasks
	•	Build classroom_memory store:
	•	routines
	•	intervention history
	•	accommodations
	•	family communication preferences
	•	successful scaffolds
	•	Add EmbeddingGemma-based retrieval pipeline
	•	Define retrieval scopes:
	•	per student
	•	whole class
	•	per subject/unit
	•	Add citation-style provenance in the UI:
	•	“based on prior intervention note from X”
	•	Build tests for retrieval relevance

Deliverables
	•	local memory store
	•	embedding pipeline
	•	retrieval wrapper
	•	source-aware answer formatting

Exit criteria

Support plans and differentiated outputs start referencing prior classroom history instead of only current-turn input.

⸻

Sprint 4: Structured action layer

Goal

Convert assistant outputs into actual application actions.

Why this matters

This is where the system becomes agentic. Gemma 4’s official function-calling docs define a four-stage tool-use cycle: define tools, let the model return a structured function call, execute the tool, and feed the result back for a final response.  ￼

Claude tasks
	•	Define internal tools:
	•	differentiate_material
	•	log_intervention
	•	draft_parent_message
	•	generate_visual_schedule
	•	prepare_ea_plan
	•	Implement tool schemas centrally
	•	Add tool-call parser/executor layer
	•	Require structured arguments and validation
	•	Add human confirmation gate for any externalized action
	•	Add logs showing:
	•	user request
	•	selected tool
	•	arguments
	•	execution result

Deliverables
	•	tool registry
	•	validated action executor
	•	basic action history UI
	•	tests for malformed tool calls and safe failure

Exit criteria

The system can decide to use a tool, execute it, and return a natural language result grounded in the execution outcome.

⸻

Phase 3 — Alberta-specific value

Sprint 5: Language bridge and family communication

Goal

Build multilingual support and plain-language family messaging.

Why this matters

This is both mission-aligned and locally relevant. CBE reports roughly 31% of students are learning English as an Additional Language, which makes language support one of the clearest “digital equity” wedges for the project. Gemma 4’s multilingual support across 140+ languages makes this a natural capability, not a stretch add-on.  ￼

Claude tasks
	•	Add “simplify for student” mode
	•	Add “translate for family” mode
	•	Build parent message templates:
	•	routine update
	•	missed work
	•	praise
	•	low-stakes concern
	•	Add teacher approval screen before send/export
	•	Create bilingual vocabulary card generator for a lesson artifact
	•	Add eval set covering:
	•	plain-English clarity
	•	consistency across message types
	•	multilingual formatting correctness

Deliverables
	•	family communication module
	•	student simplification mode
	•	bilingual vocabulary card generator

Exit criteria

A teacher can turn one classroom event or assignment into a parent-ready message and a student-friendly simplified explanation.

⸻

Sprint 6: EA and complexity-team coordination

Goal

Help adults allocate scarce support more precisely.

Why this matters

This is where the product starts to look specifically tuned to Alberta’s current policy environment. Alberta is funding complexity teams made up of one teacher and two EAs, and CBE says it will receive targeted funding for 118 schools under that initiative.  ￼

Claude tasks
	•	Create adult-support planner:
	•	first-priority students
	•	first transition to watch
	•	suggested EA group
	•	suggested adult script
	•	Add “morning briefing card” output
	•	Add “substitute continuity card” output
	•	Build support-allocation rationale formatter:
	•	short, plain-English explanation of why the plan was generated
	•	Create eval cases for:
	•	overloaded class
	•	heavy EAL class
	•	transition-heavy day
	•	substitute day

Deliverables
	•	coordination layer
	•	printable/exportable support cards
	•	substitute-teacher mode

Exit criteria

The system can produce a practical adult-support plan, not just student-facing materials.

⸻

Phase 4 — Governance and trust

Sprint 7: Safety, policy, and auditability

Goal

Add the guardrails needed for child-related school workflows.

Why this matters

If the system touches classroom notes, images, or parent communications, governance is not optional. ShieldGemma is intended for evaluating the safety of text and images against defined policies and can be integrated into a larger application as a moderation layer.  ￼

Claude tasks
	•	Add policy engine:
	•	no diagnosis
	•	no punitive recommendations
	•	no external message without teacher approval
	•	observation vs inference separation
	•	Integrate ShieldGemma checks for image/text workflows where relevant
	•	Add redaction option for exported artifacts
	•	Add audit trail for:
	•	prompt class
	•	tool call
	•	safety check
	•	export action
	•	Create failure-mode tests:
	•	harmful request
	•	unsupported medical inference
	•	ambiguous family message
	•	unsafe image input

Deliverables
	•	safety middleware
	•	audit log UI / JSON records
	•	policy test suite

Exit criteria

The system fails safely, logs clearly, and prevents the most obvious misuse categories.

⸻

Phase 5 — Proof, polish, and submission

Sprint 8: Evaluation harness and benchmark evidence

Goal

Generate the evidence the submission will need.

Why this matters

Because the brief asks entrants to explain their technical implementation and challenges, you want evidence, not just screenshots.  ￼

Claude tasks
	•	Build benchmark suites for:
	•	differentiation quality
	•	support-plan usefulness
	•	tool-call accuracy
	•	retrieval relevance
	•	multilingual communication quality
	•	latency by task class
	•	Score small vs large Gemma 4 variants on the same scenarios
	•	Document where E2B/E4B is enough and where 26B/31B is needed
	•	Capture before/after demos for:
	•	lesson adaptation
	•	tomorrow plan
	•	family note
	•	Write docs/technical-evidence.md

Deliverables
	•	eval dashboard or markdown report
	•	latency/quality tradeoff summary
	•	benchmark corpus of synthetic classroom scenarios

Exit criteria

You can defend why the system uses Gemma 4 in this exact architecture.

⸻

Sprint 9: Demo packaging and Kaggle writeup

Goal

Turn the build into a winning submission package.

Claude tasks
	•	Write Kaggle submission narrative:
	•	problem
	•	why Alberta
	•	why Gemma 4
	•	architecture
	•	demos
	•	limitations
	•	future work
	•	Create 3 polished demo flows:
	•	differentiate one worksheet
	•	generate tomorrow support plan
	•	draft multilingual parent communication
	•	Build architecture diagram
	•	Build one-slide “why Gemma 4 specifically” graphic
	•	Create final README and demo video script

Deliverables
	•	submission-ready writeup
	•	demo script
	•	architecture visual
	•	final README

Exit criteria

A judge can understand the product, the model choice, and the technical novelty in under five minutes.

⸻

Optional stretch phase

Sprint 10: Optimization or specialized local routing

Only do this if the core loop is already strong.

Good stretch options
	•	test FunctionGemma for deterministic fast local tool routing
	•	add referral packet builder for assessment backlog scenarios
	•	add limited school-level dashboard from aggregated synthetic data
	•	test TranslateGemma as a later multilingual enhancement path

FunctionGemma is explicitly positioned for fast, private, local API-action routing when you have a defined action surface and want more deterministic tool behavior than zero-shot prompting. That makes it a plausible stretch optimization, but not the center of the initial build.  ￼

⸻

Sprint prioritization logic

If time gets tight, keep this order:
	1.	Sprint 0
	2.	Sprint 1
	3.	Sprint 2
	4.	Sprint 4
	5.	Sprint 3
	6.	Sprint 5
	7.	Sprint 7
	8.	Sprint 9

That ordering preserves the most judge-visible chain:
multimodal input → long-context planning → action execution → memory → multilingual support → governance → polished submission.

⸻

Definition of a credible MVP

A credible hackathon MVP is not “many features.” It is this:
	•	one uploaded classroom artifact,
	•	one classroom memory layer,
	•	one tomorrow-planning flow,
	•	one working action loop,
	•	one multilingual communication path,
	•	one safety/audit layer,
	•	one clean demo story.

That is already enough to show a system built around Gemma 4’s real strengths: multimodality, long context, multilingual support, function calling, and device-flexible deployment.  ￼

Recommended build horizon

Given the public May 18, 2026 deadline referenced in Kaggle launch materials, I would run this as 8 core sprints plus 1 stretch sprint, with Sprint 9 reserved for packaging rather than net-new capability.  ￼

Final recommendation

Tell Claude Code to optimize for this sentence:

Build the smallest end-to-end system that proves Alberta classroom complexity can be managed better through a local-first, Gemma-4-native orchestration layer for teachers and EAs.

That keeps the agent from wandering into generic edtech or overbuilding.
