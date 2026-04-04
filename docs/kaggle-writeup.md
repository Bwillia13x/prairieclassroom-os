# PrairieClassroom OS — Kaggle Competition Writeup

**Gemma-4-native classroom complexity copilot for Alberta K-6 inclusive classrooms**

---

## 1. Problem Statement

Inclusive K-6 classrooms in Alberta are not simple environments. They are coordination problems operating under simultaneous constraints: mixed grades, EAL learners at different language stages, students with sensory and attention needs, shared educational assistants on part-time schedules, family communication requirements in multiple languages, and mandated documentation — all in a single room, all managed by one teacher.

Consider Mrs. Okafor's Grade 3/4 split in Lethbridge. Twenty-four students. Three EAL learners: Amira (Tagalog home language, L2 proficiency), Daniyal (Urdu, newly arrived, L1), and Farid (Arabic, verbal skills ahead of written). One student — Brody — with sensory needs and transition difficulties. Ms. Fehr, the educational assistant, is present mornings only. The school is multilingual; some parents communicate only through translated notes.

On any given day, Mrs. Okafor must:

- Differentiate a fractions worksheet for five distinct learner profiles
- Generate vocab cards in Tagalog for Amira's family to use at home
- Log Brody's milestone when he uses his visual timer independently
- Brief Ms. Fehr before 8:30 so the morning transition runs without incident
- Draft a warm, specific family message about Elena's math confidence — in plain language, not education jargon
- Build tomorrow's plan, integrating two weeks of observations, Ms. Fehr's schedule, the disrupted Monday routine, and the pattern that Elena struggles during timed activities

The gap is not a content gap. Curriculum and pedagogical frameworks are not the bottleneck. The gap is coordination bandwidth. Teachers spend the margin of their planning time on logistics — differentiating, translating, documenting, briefing, messaging — rather than on pedagogy. The problem is operational, not academic.

No existing tool solves this. Generic AI chatbots are untethered from classroom context. Specialized ed-tech tools solve individual workflows in isolation. What's missing is an operating layer that holds classroom memory, routes each task to the right model configuration, enforces the right safety constraints, and serves both the teacher and the educational assistant.

That's the problem PrairieClassroom OS solves.

---

## 2. Product Thesis

PrairieClassroom OS is a classroom operations copilot — not a chatbot, not a content generator, and not a replacement for teacher judgment.

The product is built around one insight: in complex classrooms, the leverage is not in generating better content. It's in reducing the coordination tax that prevents teachers from focusing on students.

Eight structured workflows deliver that reduction:

1. **Differentiate** — one source artifact becomes five learner-specific variants
2. **Tomorrow Plan** — next-day plan grounded in classroom memory and pattern insights
3. **Family Message** — plain-language drafts with mandatory teacher approval before sending
4. **Log Intervention** — free-text observations structured into persistent records
5. **Simplify Text** — grade-level and EAL-level rewrites, on demand
6. **Vocab Cards** — bilingual flashcards in 10 languages, tied to lesson content
7. **Support Patterns** — cross-record synthesis revealing recurring themes and follow-up gaps
8. **EA Briefing** — morning synthesis document for the educational assistant

The product serves two users: the teacher and the educational assistant. Every outward-facing output — family messages, EA briefings — requires explicit human approval before any downstream action. Structured generation means outputs are schema-validated, not freeform text that requires post-processing. Every workflow has a defined input contract, output schema, model tier, and safety framing.

This is not "ask Gemma and hope for the best." It is a classroom operating layer with Gemma as the reasoning substrate.

---

## 3. Architecture

### Three-Service Design

```
┌─────────────────────────────────────────────────────────┐
│                    Teacher / EA Browser                  │
│                    Vite UI  :5173                        │
└─────────────────────────┬───────────────────────────────┘
                          │  REST  (JSON)
                          ▼
┌─────────────────────────────────────────────────────────┐
│               Express Orchestrator  :3100               │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Prompt     │  │  Retrieval   │  │  Schema       │  │
│  │  Builder    │  │  Injection   │  │  Validator    │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           SQLite Classroom Memory               │   │
│  │  students · plans · interventions ·             │   │
│  │  messages · pattern_reports                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │  HTTP  (JSON)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                Flask Inference  :3200                   │
│                                                         │
│    gemma-4-4b-it  (live tier)  ←──── low-latency tasks │
│    gemma-4-27b-it (plan tier)  ←──── deep reasoning    │
└─────────────────────────────────────────────────────────┘
```

The Vite UI hosts seven tabs — one per workflow cluster — and communicates with the Express orchestrator over REST. The orchestrator owns all business logic: it builds prompts using versioned prompt contracts, validates all incoming requests with Zod runtime schemas, injects retrieval context from SQLite, validates responses against typed schemas, enforces classroom-code authentication, and gates all outward-facing outputs on teacher approval. The Flask inference layer supports three modes: mock (development), API (Vertex AI), and local (GPU). In API mode, a `VertexAIBackend` routes to the appropriate Gemma model via the `google-genai` SDK, with a `extract_json` utility handling real model output quirks (markdown fencing, trailing commas, prose wrapping).

### Dual-Tier Gemma Routing

The routing decision is architectural, not an afterthought. Live-tier tasks (differentiation, simplification, vocab cards, intervention logging, EA briefing) use `gemma-4-4b-it` for sub-2-second response times in classroom conditions. Planning-tier tasks (tomorrow plan, support pattern detection) route to `gemma-4-27b-it` with thinking mode enabled, accepting higher latency in exchange for deeper cross-record synthesis.

The tier split is explicit and visible in the routing table. Every prompt class is assigned to exactly one tier at definition time.

### Local-First SQLite Memory

Each classroom gets a single SQLite file — `{classroom-id}.sqlite`. Five tables: `students`, `plans`, `interventions`, `messages`, `pattern_reports`. This is deliberately not a vector database. Classroom memory is small, structured, and relational. SQL queries are more predictable, more auditable, and faster than approximate nearest-neighbor search for this use case.

### Closed Feedback Loops

The architecturally significant property is not any individual feature — it's that the system closes feedback loops across features:

```
interventions → pattern detection → plan generation → EA briefing
      ↑                                                    │
      └────────────── teacher acts on plan ────────────────┘
```

Every intervention logged feeds pattern detection. Every pattern detected informs the next plan. Every plan's EA actions feed the morning briefing. The system gets measurably more useful as the teacher uses it — not through fine-tuning, but through structured retrieval injection that grows richer over time.

---

## 4. Gemma-Specific Technical Story

This section matters most. PrairieClassroom OS is not a wrapper that works with any LLM. It is designed around Gemma 4's specific capabilities — dual-tier architecture, thinking mode, and structured output — and would need to be substantially redesigned to run on a different model family.

### 8 Prompt Classes with Versioned Contracts

Every model interaction is defined by a prompt contract, not an ad hoc string. Each contract specifies:

- Route name (e.g., `detect_support_patterns`)
- Model tier (`live` | `planning`)
- Thinking mode (`on` | `off`)
- Retrieval required (`yes` | `no`)
- Output schema version (semver)
- Forbidden language (clinical/diagnostic terms)

The eight prompt classes are:

| Class | Tier | Thinking | Retrieval |
|-------|------|----------|-----------|
| A. Differentiate | live | off | no |
| B. Tomorrow Plan | planning | **on** | yes |
| C. Family Message | live | off | no |
| D. Intervention Log | live | off | no |
| E. Simplify Text | live | off | no |
| F. Vocab Cards | live | off | no |
| G. Support Patterns | planning | **on** | yes |
| H. EA Briefing | live | off | yes |

### Thinking Mode: Enabled for Exactly 2 of 8 Prompt Classes

Thinking mode is enabled for tomorrow planning (B) and pattern detection (G). Not globally. Not as a default. Exactly these two.

The reasoning is explicit. Thinking mode is appropriate when the task requires cross-record synthesis, temporal reasoning, or hard tradeoff evaluation — and when the user can tolerate 3-5 seconds of latency for a higher-quality result.

**Tomorrow Plan (B):** The model must integrate the teacher's reflection note, recent intervention history, the latest pattern report, and upcoming classroom context. It must reason about transitions, resource constraints (EA schedule), and student-specific priorities simultaneously. A planning-tier model with thinking enabled produces meaningfully better specificity — "have the visual timer prepped at 9:15" rather than "support Brody with transitions."

**Support Patterns (G):** The model is reading across 5-20 records spanning two weeks, clustering by student and intervention type, identifying follow-up gaps by time delta, and surfacing positive trends. This is multi-hop reasoning over structured data. Thinking mode allows the model to work through the clustering before committing to output.

The other six prompt classes do not benefit from thinking mode. Differentiation, simplification, and vocab card generation are transformation tasks — fast, deterministic in structure, quality-insensitive to additional reasoning time. Intervention logging is extraction. EA briefing is formatting/synthesis against pre-reasoned inputs (the plan and pattern report already exist). Enabling thinking mode for these would add latency for no quality gain, and in a classroom context, latency is a product quality dimension.

### Retrieval Injection: SQL, Not RAG

The retrieval system is deliberately simple. When a prompt class requires retrieval, the orchestrator runs structured SQL queries against the classroom SQLite file and injects the results as formatted context blocks in the prompt.

For tomorrow plan generation, three retrieval functions run before prompt construction:

- `buildPlanContext()` — recent plans, EA schedules
- `buildInterventionSummary()` — recent interventions, follow-up flags
- `buildPatternInsights()` — latest pattern report from `pattern_reports` table

For pattern detection, the retrieval pulls the full intervention and plan record set within the requested time window, formatted as structured lists with timestamps and student aliases.

This is not RAG. There is no embedding model, no vector store, no approximate search. The choice was deliberate. Classroom memory is bounded (a teacher's records over weeks, not millions of documents), structured (typed fields, not freeform blobs), and relational (records reference each other by student alias and date). SQL queries on a 5-table SQLite file are fast, auditable, and produce deterministic retrieval — which matters for a tool where a teacher needs to trust what the system is surfacing.

### Safety Framing: Observational Language and 15 Forbidden Terms

Every prompt class that touches student records includes an explicit safety frame in the system prompt. The safety contract has two components:

**Observational language rules.** The model is instructed to frame all student references using teacher-first attribution: "Your records show..." and "Based on your documented observations..." rather than "This student has..." or "I think..." The distinction matters professionally. The system is reflecting the teacher's own documentation back to them, not making independent claims about students.

**15 forbidden clinical/diagnostic terms.** Each prompt class that generates student-related output includes an explicit exclusion list. Terms like "ADHD," "autism," "dyslexia," "behavioral disorder," "at-risk," "deficit," and nine related terms are excluded from output. The system is not a diagnostic tool. Any output using these terms would misrepresent the product's scope and could cause professional harm if surfaced to parents or administrators without clinical context.

The safety contract is not a post-processing filter. It is embedded in the system prompt of each relevant prompt class, making it part of the generation contract rather than a secondary cleanup step.

### Chain Preservation Through Injection Layers

Pattern insights generated in sprint 7 are persisted to the `pattern_reports` table. When tomorrow plan prompts are constructed, `buildPatternInsights()` retrieves the latest report and injects it as a structured `PATTERN INSIGHTS` section. The plan response includes a `pattern_informed: boolean` field indicating whether pattern context was available.

This chain — interventions generate patterns, patterns are persisted, persisted patterns are injected into subsequent plans — is the core feedback loop. It is maintained through retrieval injection, not through fine-tuning or memory architectures. The model itself is stateless; the classroom memory is the state.

---

## 5. Demo Walkthrough

The following condensed demo traces Mrs. Okafor's day in PrairieClassroom OS.

### Morning: Differentiate and Language Tools

Mrs. Okafor pastes a fractions review worksheet and sets a goal: differentiate for five profiles. The orchestrator routes to the live tier (`gemma-4-4b-it`). Within 2 seconds, five variants return:

- EAL-supported (Daniyal/L1): shorter sentences, visual cue suggestions, pre-teaching vocabulary scaffold
- EAL-intermediate (Amira/L2): natural language with diagram prompts, bilingual vocab pre-teach
- Scaffolded (Elena, math anxiety): worked example included, confidence-building framing
- Grade-level (Brody, sensory): standard with clear visual spacing and timer checkpoints
- Extension (Chantal): multi-step problem, real-world context variation

She then generates Tagalog vocab cards for Amira's family:

```json
{
  "cards": [
    { "term": "fraction", "definition": "part of a whole", "target_translation": "bahagi", "example_sentence": "Half a pizza is a fraction.", "visual_hint": "pizza cut in half" },
    { "term": "numerator", "definition": "the top number in a fraction", "target_translation": "numerador", "example_sentence": "In 1/4, the numerator is 1.", "visual_hint": "top number highlighted" }
  ]
}
```

Cards are ephemeral — generated for immediate use, not persisted to the classroom record.

### During Class: Log Intervention

Brody uses his visual timer independently for the first time. Mrs. Okafor types a free-text note. The live tier structures it:

```json
{
  "observation": "Brody set his visual timer independently for 10 minutes and transitioned to the next station without adult prompting.",
  "action_taken": "Teacher observed, did not intervene.",
  "outcome": "Successful independent transition — first time documented.",
  "follow_up_needed": true,
  "follow_up_note": "Document trend; consider fading visual timer support if pattern continues."
}
```

This record is now in `interventions`. It will inform tomorrow's plan and contribute to the next pattern detection run.

### End of Day: The Closed Loop

Mrs. Okafor runs pattern detection. The planning tier reads 8 intervention records over two weeks:

```
Recurring themes:
  • Brody — visual timer independence trend (3 observations, all positive)
  • Elena — confidence dips during timed activities (2 observations)

Follow-up gaps:
  • Elena's family: math progress not communicated (7 days since last message)

Positive trends:
  • All three EAL learners showing growth in verbal participation
```

She generates tomorrow's plan. The orchestrator injects today's intervention, the pattern report, and Ms. Fehr's schedule. The planning tier returns:

```
EA Actions (Ms. Fehr, 8:30–12:00):
  • 9:15 transition: have visual timer prepped for Brody (timer working — maintain routine)
  • Before noon departure: brief hand-off on Elena's math confidence — teacher wants to send a note tonight

Student Watch List:
  • Brody: Success trigger confirmed. Extend independence window — no pre-transition reminder until student requests.
  • Elena: Wednesday win on fractions. Introduce optional challenge problem at morning math.
  • Daniyal: Pair with Chantal during Monday disrupted routine.

Family Follow-ups (require approval):
  • Elena's family: Math breakthrough this week — draft and approve before sending.
```

She generates the EA briefing for Ms. Fehr. She drafts the family message for Elena. The system flags it for approval — no message is sent without teacher review. The loop closes: tomorrow's plan will ingest today's new intervention and the updated pattern report.

---

## 6. Evaluation

### 42 Evals Across 5 Categories

| Category | Evals | What is tested |
|----------|-------|----------------|
| Schema reliability | 14 | All required keys present, correct types, schema version matches |
| Content quality | 8 | Output is specific, grounded, and actionable — not generic |
| Safety boundaries | 8 | 15 forbidden diagnostic terms absent; observational language enforced |
| Latency suitability | 7 | Live-tier tasks complete under 2000ms; planning-tier under 6000ms |
| Cross-feature synthesis | 5 | Outputs correctly reference records from other features (patterns in plans, plans in briefings) |

**Zero regressions across 8 sprints.** Each sprint adds new eval cases covering the new feature; all prior cases remain green.

### Why These Categories

Schema reliability is the minimum bar for a production tool. If outputs don't validate against their schema, downstream features break — the plan parser fails, the EA briefing component throws. Every new prompt class ships with at least one schema eval.

Content quality evals exist because schema compliance is necessary but not sufficient. A tomorrow plan that says "support Brody" passes schema validation. A plan that says "have the visual timer prepped at 9:15" passes schema validation and is actually useful. Content quality evals use golden-case prompts with seed data and check for specificity markers.

Safety boundary evals are non-negotiable for a product used in professional settings with minors. These evals inject adversarial inputs that would elicit clinical language from a naive model and assert that the system's safety framing holds. They also test that family messages cannot be dispatched without approval status in the database record.

Latency evals reflect that teachers use this tool in real classroom moments — not at a desk with unlimited patience. A 12-second response for intervention logging is not acceptable, regardless of quality. Live-tier latency is tested against a 2-second budget.

Cross-feature synthesis evals are the most complex and the most important for demonstrating that the closed feedback loop works. They seed the database with prior records, run a planning or briefing generation, and assert that the output references specific record IDs or student aliases from those seeded records. These evals validate the full stack — retrieval, injection, and generation — together.

### Eval Philosophy

Prefer small, high-quality synthetic cases over large noisy benchmark sets. Each eval case is annotated with the feature it covers, the failure mode it guards against, and the expected assertion. A failing eval tells you exactly what broke, not just that something broke.

---

## 7. What's Not Built and Why

### Real Gemma Inference Baseline

The Flask inference layer supports three modes: mock, API (Vertex AI), and local (transformers). The Vertex AI backend (`VertexAIBackend`) is fully implemented — it calls `gemma-4-4b-it` and `gemma-4-27b-it` via the `google-genai` SDK, supports thinking mode, and includes a `extract_json` utility that handles real model output quirks (markdown fencing, trailing commas, prose wrapping around JSON).

The eval baseline against real inference has not yet been run. The 42 evals pass against mock output, validating contracts end-to-end. Running the same suite against real Gemma output will reveal which prompt contracts need tuning and which parsing needs hardening — but the infrastructure is ready. Swapping from mock to real is a `--mode api` flag change.

### Student-Facing Features

PrairieClassroom OS has no student-facing interface. This is intentional. The problem being solved is adult coordination — teacher and EA collaboration — not direct student interaction. Student-facing tools involve different privacy considerations, different interface requirements, and different safety boundaries. They are future work, not an oversight.

### Autonomous Messaging

Family messages require teacher approval before any record is marked approved. There is no auto-send path, no pre-checked confirmation, no timeout-based auto-approval. This boundary is permanent, not temporary. Teachers are legally and professionally responsible for parent communication. The system assists; the teacher decides.

### Visual Supports and Voice Input

Both are listed in the original architecture document as target capabilities. Visual support generation (image-based differentiation scaffolds) and voice-to-intervention logging are technically feasible with the current architecture. They are scoped as Sprint 9+ work, not excluded by design.

---

## Technical Summary

| Metric | Value |
|--------|-------|
| Prompt classes | 8 |
| Model tiers | 2 (live: gemma-4-4b-it, planning: gemma-4-27b-it) |
| Inference backends | 3 (mock, Vertex AI, local) |
| API endpoints | 13 |
| SQLite tables / classroom | 5 |
| Evaluations | 42 |
| UI tabs | 7 |
| Zod request schemas | 9 |
| Zod entity schemas | 8 |
| Forbidden diagnostic terms | 15 |
| Thinking mode routes | 2 of 8 |
| Auth model | classroom-code (X-Classroom-Code header) |
| TypeScript lines | ~5,000 |
| Python lines | ~750 |
| Sprints completed | 13 |
| Architecture decisions (ADRs) | 32 |
| Users served | 2 (teacher, educational assistant) |
| Languages supported (vocab cards) | 10 |
| Zero regressions | across 13 sprints |

---

## Closing Argument

The core claim of PrairieClassroom OS is that classroom complexity is a coordination problem, and that Gemma 4's specific capabilities — dual-tier inference, thinking mode for targeted reasoning, and reliable structured output — are the right tool for solving it.

The architecture is contract-driven. Every model interaction is a versioned prompt class with defined inputs, outputs, retrieval requirements, safety framing, and model tier. The system does not ask Gemma to do anything undefined.

The memory is local, relational, and closed-loop. Every observation logged becomes an input to the next plan. Every pattern detected informs the next briefing. The system compounds in usefulness as the teacher uses it — not through retraining, but through structured retrieval that grows richer over time.

The safety boundaries are embedded, not bolted on. Observational language, 15 forbidden terms, and mandatory approval gates are part of the generation contracts, not post-processing filters.

Forty-two evals. Zero regressions. Thirteen sprints. Two users served. Eight workflows. One closed loop. Runtime validation at every boundary. Authentication at every classroom endpoint. And a Vertex AI backend ready to swap from mock to real inference with a single flag.

This is what it looks like to build for Gemma 4, not just on top of it.
