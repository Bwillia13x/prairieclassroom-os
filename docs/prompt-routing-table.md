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

## Route: simplify_for_student

| Field | Value |
|-------|-------|
| Route name | `simplify_for_student` |
| Preferred model tier | Live (gemma-4-4b-it) |
| Thinking | Off |
| Retrieval required | No |
| Tool-call capable | No |
| Output schema | `SimplifiedOutput` v0.1.0 |

**Rationale:** Simplification is a single-artifact text transformation — rewrite source text at an appropriate EAL level. No reasoning chain or memory context needed. Must be fast enough for in-class use. Three EAL levels (beginner, intermediate, advanced) control simplification depth via prompt parameters.

## Route: generate_vocab_cards

| Field | Value |
|-------|-------|
| Route name | `generate_vocab_cards` |
| Preferred model tier | Live (gemma-4-4b-it) |
| Thinking | Off |
| Retrieval required | No |
| Tool-call capable | No |
| Output schema | `VocabCardSet` v0.1.0 |

**Rationale:** Vocab card generation extracts key terms from lesson content and provides bilingual translations. This is a formulaic extraction + translation task well-suited to the small model. Card count is bounded 5-8 to keep sets focused. Supports 10 target languages for Canadian EAL classroom populations.

## Route: detect_support_patterns

| Field | Value |
|-------|-------|
| Route name | `detect_support_patterns` |
| Preferred model tier | Planning (gemma-4-27b-it) |
| Thinking | On |
| Retrieval required | Yes |
| Tool-call capable | No |
| Output schema | `SupportPatternReport` v0.1.0 |

**Rationale:** Pattern detection requires synthesizing across multiple intervention records, plan support priorities, and follow-up states. This is the second prompt class using the planning tier and thinking mode (after tomorrow-plan). The model must identify recurring themes, follow-up gaps, positive trends, and suggested focus areas from accumulated classroom memory. Safety framing is critical: all output uses observation language attributing patterns to the teacher's own documentation, never diagnostic or clinical language.
