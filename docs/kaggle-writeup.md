# PrairieClassroom OS

**Gemma-4-native classroom complexity copilot for Alberta K-6 inclusive classrooms**

---

## 1. Problem

Mrs. Okafor runs a Grade 3/4 split in Lethbridge. Twenty-four students. Three EAL learners: Amira (Tagalog, L2), Daniyal (Urdu, newly arrived, L1), and Farid (Arabic, verbal ahead of written). One student — Brody — with sensory needs and transition difficulties. Ms. Fehr, the educational assistant, is present mornings only. Some families communicate only through translated notes.

On any given day: differentiate a fractions worksheet for five learner profiles, generate bilingual vocab cards for Amira's family, log Brody's milestone, brief Ms. Fehr before 8:30, draft a family message, and build tomorrow's plan integrating two weeks of observations. Simultaneously.

The gap is coordination bandwidth, not curriculum. Generic chatbots are untethered from classroom context. Specialized ed-tech solves workflows in isolation. What's missing is an operating layer that holds classroom memory, routes each task to the right model, enforces safety constraints, and serves both teacher and EA.

---

## 2. Product

PrairieClassroom OS is a classroom operations copilot — not a chatbot, not a content generator, not a replacement for teacher judgment. Eight structured workflows deliver the coordination tax reduction:

1. **Differentiate** — one source artifact becomes five learner-specific variants; multimodal input accepts pasted text or worksheet images
2. **Tomorrow Plan** — next-day plan grounded in classroom memory and pattern synthesis
3. **Family Message** — plain-language drafts with mandatory teacher approval before any downstream action
4. **Log Intervention** — free-text observations structured into persistent, queryable records
5. **Simplify Text** — grade-level and EAL-level rewrites, on demand
6. **Vocab Cards** — bilingual flashcards in 10 languages, tied to lesson content
7. **Support Patterns** — cross-record synthesis revealing recurring themes and follow-up gaps
8. **EA Briefing** — morning synthesis document for the educational assistant

The system closes a feedback loop: interventions feed pattern detection, patterns inform plan generation, plans feed EA briefings. Every cycle adds retrieval context that makes outputs more grounded.

Two users are served: teacher and educational assistant. All outward-facing communication requires explicit teacher approval. Every workflow has a defined input contract, output schema, model tier, and safety framing.

---

## 3. Architecture and Gemma 4

### Three-Service Design

```
┌──────────────────────────────────────────────┐
│           Teacher / EA Browser               │
│           Vite UI  :5173                     │
└───────────────────┬──────────────────────────┘
                    │  REST (JSON)
                    ▼
┌──────────────────────────────────────────────┐
│         Express Orchestrator  :3100          │
│  Prompt Builder · Retrieval · Schema Validator│
│  SQLite Classroom Memory                     │
│  students · plans · interventions ·          │
│  messages · pattern_reports                  │
└───────────────────┬──────────────────────────┘
                    │  HTTP (JSON)
                    ▼
┌──────────────────────────────────────────────┐
│         Flask Inference  :3200               │
│  gemma-4-4b-it  (live tier)  ← sub-2s tasks │
│  gemma-4-27b-it (plan tier)  ← deep synthesis│
│  Served locally via Ollama                   │
└──────────────────────────────────────────────┘
```

The Vite UI hosts eight tabs and communicates with the Express orchestrator over REST. The orchestrator owns all business logic: builds prompts from versioned contracts, validates requests with Zod schemas, injects retrieval context from SQLite, validates responses, and gates outward-facing outputs on teacher approval.

### Dual-Tier Gemma 4 Routing via Ollama

The inference layer runs Gemma 4 locally through Ollama — no cloud dependency, no data leaving the school. Two model tiers handle different task profiles:

**Live tier (`gemma-4-4b-it`):** Differentiation, simplification, vocab cards, intervention logging, EA briefing — sub-2-second response times for tasks that happen in real classroom moments.

**Planning tier (`gemma-4-27b-it` with thinking enabled):** Tomorrow plan generation and support pattern detection — cross-record synthesis where a teacher accepts 3–5 seconds for meaningfully better specificity.

Tier assignment is static. Every prompt class is assigned at definition time.

### Multimodal Worksheet Extraction

Gemma 4 vision enables worksheet images submitted directly as multimodal input to the Differentiate workflow. The model extracts content, identifies learning objectives, and generates differentiated variants from the image — no manual copy-paste. This is the primary Gemma 4 differentiator over earlier model families and what makes differentiation practical at classroom speed.

### 12 Prompt Classes with Versioned Contracts

Every model interaction is a versioned prompt contract. Each contract specifies: route name, model tier, thinking mode, retrieval required, output schema version, and forbidden language list.

| Class | Tier | Thinking | Retrieval |
|-------|------|----------|-----------|
| A. Differentiate (text) | live | off | no |
| B. Differentiate (image/multimodal) | live | off | no |
| C. Tomorrow Plan | planning | **on** | yes |
| D. Family Message | live | off | no |
| E. Intervention Log | live | off | no |
| F. Simplify Text | live | off | no |
| G. Vocab Cards | live | off | no |
| H. Support Patterns | planning | **on** | yes |
| I. EA Briefing | live | off | yes |
| J. Worksheet Extraction | live | off | no |
| K. Language Detection | live | off | no |
| L. Translation Scaffold | live | off | no |

Thinking mode is enabled for exactly two classes: tomorrow planning and pattern detection — the only tasks requiring cross-record synthesis and temporal reasoning. All other classes are transformation or extraction tasks where thinking mode adds latency without quality gain.

### Retrieval Injection: SQL, Not RAG

When a prompt class requires retrieval, the orchestrator runs structured SQL queries against the classroom SQLite file and injects results as formatted context blocks. For tomorrow plan generation, three retrieval functions run before prompt construction: recent plans and EA schedules, recent interventions with follow-up flags, and the latest pattern report.

This is not RAG. Classroom memory is bounded, structured, and relational. SQL on a 5-table SQLite file is faster, more auditable, and more deterministic than approximate vector search for this use case.

---

## 4. Safety

Every prompt class that touches student records includes an explicit safety contract in the system prompt. The contract has two components.

**Observational language.** All student references use teacher-first attribution: "Your records show..." not "This student has..." The system reflects the teacher's own documentation — no independent claims about students.

**15 forbidden clinical/diagnostic terms.** ADHD, autism, dyslexia, behavioral disorder, at-risk, deficit, and nine related terms are excluded from every relevant prompt class. Output using these terms would misrepresent the product's scope and cause professional harm if surfaced to parents or administrators without clinical context.

Safety is embedded in each prompt contract — enforced at source, not filtered afterward. Family messages require explicit teacher approval. No auto-send path, no timeout-based auto-approval. This boundary is permanent.

---

## 5. Evaluation

67+ golden-case evals across five categories validate retrieval, injection, and generation together:

| Category | Evals | What is tested |
|----------|-------|----------------|
| Schema reliability | 22 | All required keys present, correct types, schema version matches |
| Content quality | 15 | Output is specific, grounded, actionable — not generic |
| Safety boundaries | 12 | 15 forbidden terms absent; observational language enforced |
| Latency suitability | 10 | Live tier under 2000ms; planning tier under 6000ms |
| Cross-feature synthesis | 8 | Outputs correctly reference records from other features |

**Zero safety failures. Zero regressions across 13 sprints.**

Cross-feature synthesis evals seed the database with prior records, run a planning or briefing generation, and assert the output references specific student aliases from those seeded records — confirming the full feedback loop works end-to-end, not each feature in isolation. Safety evals inject adversarial inputs that would elicit clinical language from a naive model and assert the safety framing holds.

---

## 6. Local-First Architecture

PrairieClassroom OS runs entirely on a laptop via Ollama. No cloud dependency. No data leaves the school. Privacy by architecture, not by policy.

Each classroom gets a single SQLite file — `{classroom-id}.sqlite`. Five tables: students, plans, interventions, messages, pattern\_reports. The model is stateless; the classroom memory is the state.

The system compounds in usefulness through structured retrieval, not retraining. Every intervention logged feeds pattern detection, every pattern informs the next plan, every plan feeds the morning briefing. Over weeks, retrieval context grows richer — and so do outputs — without any model update or external dependency. Deployable in schools with restrictive IT policies, limited internet, or firm data residency requirements.

---

## Technical Summary

| Metric | Value |
|--------|-------|
| Prompt classes | 12 |
| Model tiers | 2 (live: gemma-4-4b-it, planning: gemma-4-27b-it) |
| Inference backends | 4 (mock, Ollama local, Vertex AI, transformers) |
| Thinking mode routes | 2 of 12 |
| API endpoints | 13 |
| SQLite tables / classroom | 5 |
| Evaluations | 67+ |
| Zero safety failures | confirmed |
| Zero regressions | across 13 sprints |
| UI tabs | 8 |
| Forbidden diagnostic terms | 15 |
| Languages supported (vocab cards) | 10 |
| Multimodal input | worksheet image extraction via Gemma 4 vision |
| Auth model | classroom-code (X-Classroom-Code header) |
| LOC (TypeScript) | ~14,500 |
| LOC (Python) | ~1,000 |
| Sprints completed | 13 |
| Users served | 2 (teacher, educational assistant) |
