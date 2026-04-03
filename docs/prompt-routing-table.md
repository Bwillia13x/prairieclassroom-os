# Prompt Routing Table

Filled routing table per prompt class, as required by `docs/prompt-contracts.md`.

All routes are **provisional** as of Sprint 0. They will be validated against real model output in Sprint 1.

## Route: differentiate_material

| Field | Value |
|-------|-------|
| Route name | `differentiate_material` |
| Preferred model tier | Live (gemma-4-4b-it) |
| Thinking | Off |
| Retrieval required | No (Sprint 1); Yes with classroom memory (Sprint 3+) |
| Tool-call capable | Yes |
| Output schema | `DifferentiatedVariant[]` v0.1.0 |

**Rationale:** Differentiation is the most frequent teacher action. It must be fast. The small model can handle structured variant generation from a single artifact without deep reasoning. Retrieval becomes relevant when classroom memory informs which student needs which variant type.

## Route: prepare_tomorrow_plan

| Field | Value |
|-------|-------|
| Route name | `prepare_tomorrow_plan` |
| Preferred model tier | Planning (gemma-4-27b-it) |
| Thinking | On |
| Retrieval required | Yes |
| Tool-call capable | Yes |
| Output schema | `TomorrowPlan` v0.1.0 |

**Rationale:** Tomorrow planning is the highest-reasoning task. It must synthesize today's events, upcoming artifacts, classroom routines, student support history, and transition patterns into a coherent plan. This justifies the larger model, thinking mode, and retrieval injection. Latency tolerance is higher because planning happens outside live instruction.

## Route: draft_family_message

| Field | Value |
|-------|-------|
| Route name | `draft_family_message` |
| Preferred model tier | Live (gemma-4-4b-it) |
| Thinking | Off |
| Retrieval required | No (Sprint 1); optional with family communication preferences (Sprint 3+) |
| Tool-call capable | No |
| Output schema | `FamilyMessageDraft` v0.1.0 |

**Rationale:** Family messages must be plain-language, short, and tone-appropriate. The small model is sufficient. Thinking mode adds unnecessary latency for what is essentially a translation/simplification task. Human approval gate is mandatory before any output leaves the system.

## Route: log_intervention

| Field | Value |
|-------|-------|
| Route name | `log_intervention` |
| Preferred model tier | Live (gemma-4-4b-it) |
| Thinking | Off |
| Retrieval required | No |
| Tool-call capable | No |
| Output schema | `InterventionRecord` v0.1.0 |

**Rationale:** Intervention logging is a structured extraction task — teacher provides a note, the model extracts observation, action, outcome, and follow-up fields. This should be near-instant. No retrieval needed because the teacher is providing the raw input directly.
