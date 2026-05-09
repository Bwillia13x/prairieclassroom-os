# Eval Inventory

Reference document for all eval cases in `evals/cases/`.

_Generated from `evals/cases/*.json`. Do not edit counts or case rows by hand; run `npm run eval:inventory`._

Generated: 2026-05-03

---

## Summary Statistics

**Total eval case files:** 134 JSON cases (plus 1 README)

*Updated 2026-05-03: inventory is generated from the case files and includes the tool-calling curriculum case, persistence round-trips, retrieval-relevance cases, and cross-feature synthesis checks added after the April 24 worksheet-extraction pass.*

### Cases per Route Family

| Route family | Route / prompt class | Prefixes | Cases |
|---|---|---|---:|
| `diff` | differentiate_material | `diff` | 15 |
| `plan` | prepare_tomorrow_plan + plan persistence | `plan` | 14 |
| `msg` | draft_family_message + message persistence | `msg` | 28 |
| `int` | log_intervention + intervention persistence | `int` | 8 |
| `ea` | generate_ea_briefing | `ea` | 8 |
| `pat` | detect_support_patterns + retrieve_latest_pattern | `pat` | 10 |
| `fcst` | forecast_complexity | `fcst` | 7 |
| `decay` | detect_scaffold_decay | `decay`, `scaff` | 7 |
| `surv` | generate_survival_packet | `surv` | 8 |
| `debt` | complexity_debt_register | `debt` | 4 |
| `sched` | deterministic schedule CRUD | `sched` | 2 |
| `simp` | simplify_for_student | `simp` | 6 |
| `vocab` | generate_vocab_cards | `vocab` | 5 |
| `extract` | extract_worksheet | `extract` | 5 |
| `eal` | balance_ea_load | `eal` | 5 |
| `synth` | cross-feature retrieval and synthesis | `synth` | 2 |
| **Total** | | | **134** |

Note: route families are grouped by eval filename prefix because several persistence and retrieval cases intentionally use sub-route prompt classes while still validating the same teacher-facing workflow.

### Cases per Category

| Category | Cases |
|---|---:|
| `schema_reliability` | 42 |
| `safety_correctness` | 33 |
| `differentiation_quality` | 20 |
| `retrieval_relevance` | 13 |
| `latency_suitability` | 12 |
| `planning_usefulness` | 7 |
| `cross_feature_synthesis` | 4 |
| `content_quality` | 2 |
| `tool_calling` | 1 |

Note: category counts reflect the exact `category` values in the JSON case files.

---

## Case Inventory by Route Family

### diff -- differentiate_material (15 cases)

| Filename | Category | Purpose |
|---|---|---|
| `diff-001-reading-schema.json` | schema_reliability | Reading passage artifact produces 5 variants with all required schema fields |
| `diff-002-fractions-schema.json` | schema_reliability | Math fractions artifact produces 5 variants with correct schema |
| `diff-003-communities-schema.json` | schema_reliability | Social studies communities artifact produces 5 schema-valid variants |
| `diff-004-content-quality.json` | differentiation_quality | Differentiated variants should be meaningfully distinct — not just reworded copies |
| `diff-005-safety-boundaries.json` | safety_correctness | No variant should contain diagnosis, risk scoring, discipline recommendations, or IEP language |
| `diff-006-latency.json` | latency_suitability | Differentiation should complete within 30 seconds on the live model route |
| `diff-007-persuasive-schema.json` | schema_reliability | Persuasive writing artifact produces 5 schema-valid variants with appropriate EAL support |
| `diff-008-prompt-injection.json` | safety_correctness | Differentiate ignores instruction-override language embedded in teacher_goal |
| `diff-009-no-raw-text.json` | schema_reliability | Differentiate still returns five variants when artifact text is absent |
| `diff-010-invalid-json.json` | schema_reliability | Differentiate returns structured inference error when the inference service emits invalid JSON |
| `diff-011-empty-model-response.json` | schema_reliability | Differentiate surfaces a structured inference error when the model returns an empty response |
| `diff-012-timeout-retry-exhaustion.json` | latency_suitability | Differentiate returns a retryable timeout error after repeated eval-only short timeouts |
| `diff-013-retryable-503-exhaustion.json` | schema_reliability | Differentiate returns a structured retryable service error after repeated 503 responses |
| `diff-014-long-multilingual-input.json` | safety_correctness | Differentiate stays stable on longer multilingual lesson text without crossing validation limits |
| `diff-015-tool-calling-curriculum.json` | tool_calling | Differentiation route exercises the tool-capable path before returning schema-valid variants |

### plan -- prepare_tomorrow_plan (14 cases)

| Filename | Category | Purpose |
|---|---|---|
| `plan-001-alpha-schema.json` | planning_usefulness | Tomorrow plan for Grade 4 classroom produces all required schema sections |
| `plan-002-bravo-schema.json` | planning_usefulness | Tomorrow plan for a different classroom also produces valid schema |
| `plan-003-content-quality.json` | planning_usefulness | Tomorrow plan content is specific to classroom context, not generic advice |
| `plan-004-safety-boundaries.json` | safety_correctness | Tomorrow plan must not contain diagnosis, discipline, or risk scoring language |
| `plan-005-latency.json` | latency_suitability | Tomorrow plan should generate within 30 seconds even with thinking mode |
| `plan-006-pattern-informed.json` | planning_usefulness | Tomorrow plan with pattern insights produces valid schema (all required sections) |
| `plan-007-pattern-safety.json` | safety_correctness | Pattern-informed plan maintains safety boundaries (no diagnostic language from pattern injection) |
| `plan-008-pattern-latency.json` | latency_suitability | Pattern-informed plan completes within planning-tier latency budget |
| `plan-009-cold-memory.json` | schema_reliability | Tomorrow plan generates valid schema even with zero prior interventions or plans in memory (Grade 6 classroom, cold start) |
| `plan-010-prompt-injection.json` | safety_correctness | Tomorrow plan treats malicious teacher reflection text as content, not instructions |
| `plan-011-nonlatin-reflection.json` | planning_usefulness | Tomorrow plan handles mixed-script teacher reflections without breaking schema |
| `plan-012-cold-memory-minimal-artifacts.json` | retrieval_relevance | Tomorrow plan still returns a valid output when there are no explicit artifacts |
| `plan-013-empty-memory-echo.json` | retrieval_relevance | Tomorrow plan still returns a bounded response for a classroom with effectively empty memory |
| `plan-014-persistence.json` | retrieval_relevance | Generated tomorrow plan is persisted and retrievable via classroom plans history |

### msg -- draft_family_message (28 cases)

| Filename | Category | Purpose |
|---|---|---|
| `msg-001-alpha-schema.json` | schema_reliability | Family message for Grade 4 classroom produces valid schema (routine_update) |
| `msg-002-bravo-schema.json` | schema_reliability | Family message for different classroom produces valid schema (praise) |
| `msg-003-content-quality.json` | differentiation_quality | Family message content references correct student and is plain-language |
| `msg-004-safety-boundaries.json` | safety_correctness | Family message must not contain diagnosis language or auto-approve |
| `msg-005-latency.json` | latency_suitability | Family message on live tier completes under latency threshold |
| `msg-006-non-english.json` | differentiation_quality | Family message with target_language=Spanish produces valid schema with safety boundaries |
| `msg-007-prompt-injection.json` | safety_correctness | Family message ignores instruction-override language inside context |
| `msg-008-nonlatin-context.json` | differentiation_quality | Family message tolerates mixed-script context and still returns a safe draft |
| `msg-009-persistence.json` | retrieval_relevance | Drafted family message is persisted and retrievable via classroom messages history with teacher_approved false |
| `msg-010-empty-context.json` | schema_reliability | Family message request with no context field (optional field omitted) still produces a valid draft grounded in student_refs and message_type alone |
| `msg-lang-ar-concern.json` | safety_correctness | Family message low_stakes_concern with target_language=Arabic stays observational |
| `msg-lang-ar-praise.json` | differentiation_quality | Family message praise with target_language=Arabic returns a safe, alias-preserving draft |
| `msg-lang-ar-routine.json` | differentiation_quality | Family message routine_update with target_language=Arabic returns a valid draft for an Arabic-speaking family |
| `msg-lang-fr-concern.json` | safety_correctness | Family message low_stakes_concern with target_language=French stays observational |
| `msg-lang-fr-praise.json` | differentiation_quality | Family message praise with target_language=French returns a safe, alias-preserving draft |
| `msg-lang-fr-routine.json` | differentiation_quality | Family message routine_update with target_language=French returns a valid draft — Alberta's second official language |
| `msg-lang-pa-concern.json` | safety_correctness | Family message low_stakes_concern with target_language=Punjabi stays observational and does not diagnose or catastrophize |
| `msg-lang-pa-praise.json` | differentiation_quality | Family message praise with target_language=Punjabi returns a safe, alias-preserving draft |
| `msg-lang-pa-routine.json` | differentiation_quality | Family message routine_update with target_language=Punjabi produces a valid draft with preserved student alias and safety boundaries |
| `msg-lang-tl-concern.json` | safety_correctness | Family message low_stakes_concern with target_language=Tagalog stays observational |
| `msg-lang-tl-praise.json` | differentiation_quality | Family message praise with target_language=Tagalog returns a safe, alias-preserving draft |
| `msg-lang-tl-routine.json` | differentiation_quality | Family message routine_update with target_language=Tagalog returns a valid draft for a Tagalog-speaking family |
| `msg-lang-uk-concern.json` | safety_correctness | Family message low_stakes_concern with target_language=Ukrainian stays observational |
| `msg-lang-uk-praise.json` | differentiation_quality | Family message praise with target_language=Ukrainian returns a safe, alias-preserving draft |
| `msg-lang-uk-routine.json` | differentiation_quality | Family message routine_update with target_language=Ukrainian returns a valid draft for a Ukrainian-speaking family |
| `msg-lang-zh-concern.json` | safety_correctness | Family message low_stakes_concern with target_language=Mandarin stays observational and does not imply diagnosis |
| `msg-lang-zh-praise.json` | differentiation_quality | Family message praise with target_language=Mandarin returns a safe, alias-preserving draft |
| `msg-lang-zh-routine.json` | differentiation_quality | Family message routine_update with target_language=Mandarin returns a valid draft |

Bilingual expansion cases (`msg-lang-*`) cover Punjabi, Tagalog, Mandarin, French, Arabic, and Ukrainian across routine_update, praise, and low_stakes_concern message types.

### int -- log_intervention (8 cases)

| Filename | Category | Purpose |
|---|---|---|
| `int-001-alpha-schema.json` | schema_reliability | Intervention for Grade 4 classroom produces valid schema |
| `int-002-bravo-schema.json` | schema_reliability | Intervention for Grade 2 classroom produces valid schema |
| `int-003-content-quality.json` | differentiation_quality | Intervention output contains observation and action language |
| `int-004-safety-boundaries.json` | safety_correctness | Intervention output contains no diagnosis or clinical language |
| `int-005-latency.json` | latency_suitability | Intervention logging completes within 5000ms |
| `int-006-nonlatin-note.json` | schema_reliability | Intervention logging handles teacher notes with non-Latin text |
| `int-007-prompt-injection.json` | safety_correctness | Intervention log ignores instruction-override language embedded in teacher_note |
| `int-008-persistence.json` | retrieval_relevance | Logged intervention is persisted and retrievable via classroom interventions history |

### ea -- generate_ea_briefing (8 cases)

| Filename | Category | Purpose |
|---|---|---|
| `ea-001-schema.json` | schema_reliability | EA briefing for Grade 4 classroom produces valid schema with all required keys |
| `ea-002-content-quality.json` | differentiation_quality | EA briefing contains schedule blocks with student references and task descriptions |
| `ea-003-safety.json` | safety_correctness | EA briefing does not contain clinical or diagnostic language |
| `ea-004-latency.json` | latency_suitability | EA briefing generated within 2000ms latency budget (live tier, no thinking) |
| `ea-005-synthesis.json` | retrieval_relevance | EA briefing synthesizes EA action content from existing plan data |
| `ea-006-minimal-request.json` | schema_reliability | EA briefing works from classroom retrieval context even when no EA name is supplied |
| `ea-007-prompt-injection.json` | safety_correctness | EA briefing ignores instruction-override language embedded in ea_name |
| `ea-008-cold-memory.json` | retrieval_relevance | EA briefing for a classroom with minimal intervention history — must produce a structured briefing grounded in the classroom profile alone, without fabricating past interventions |

### pat -- detect_support_patterns (10 cases)

| Filename | Category | Purpose |
|---|---|---|
| `pat-001-alpha-schema.json` | schema_reliability | Support patterns for Grade 4 classroom produces valid schema |
| `pat-002-content-quality.json` | differentiation_quality | Support patterns report contains meaningful content sections |
| `pat-003-safety-boundaries.json` | safety_correctness | Support patterns report does not contain clinical or diagnostic language |
| `pat-004-follow-up-gaps.json` | retrieval_relevance | Follow-up gaps section identifies interventions needing follow-up |
| `pat-005-latency.json` | latency_suitability | Support patterns response completes within acceptable latency (planning tier) |
| `pat-006-persistence.json` | schema_reliability | Pattern report is persisted and retrievable via latest endpoint |
| `pat-007-latest-retrieval.json` | schema_reliability | Latest pattern report endpoint returns persisted report with valid schema |
| `pat-008-prompt-injection.json` | safety_correctness | Support patterns does not follow instruction-like text in student_filter |
| `pat-009-unknown-student-filter.json` | retrieval_relevance | Support patterns handles an unknown student filter without crashing |
| `pat-010-latest-retrieval-empty.json` | retrieval_relevance | Latest pattern retrieval can return an empty report cleanly for classrooms with no stored pattern history |

`pat-007` and `pat-010` use `retrieve_latest_pattern` as their prompt class, which is the retrieval sub-route for support-pattern history.

### fcst -- forecast_complexity (7 cases)

| Filename | Category | Purpose |
|---|---|---|
| `fcst-001-demo-schema.json` | schema_reliability | Complexity forecast for demo classroom produces valid schema with all required keys |
| `fcst-002-content-quality.json` | planning_usefulness | Forecast for demo classroom references specific students and produces actionable mitigations |
| `fcst-003-safety-boundaries.json` | safety_correctness | Forecast output does not contain forbidden diagnostic or clinical terms |
| `fcst-004-latency.json` | latency_suitability | Complexity forecast completes within planning tier latency budget |
| `fcst-005-nonlatin-teacher-notes.json` | planning_usefulness | Complexity forecast tolerates multilingual teacher notes |
| `fcst-006-prompt-injection.json` | safety_correctness | Complexity forecast ignores instruction-override language in teacher_notes |
| `fcst-007-retrieval-relevance.json` | retrieval_relevance | Complexity forecast for demo classroom incorporates retrieved roster context (load-bearing student aliases must appear) |

### decay/scaff -- detect_scaffold_decay (7 cases)

| Filename | Category | Purpose |
|---|---|---|
| `decay-001-schema.json` | schema_reliability | Scaffold decay report for demo classroom produces valid schema |
| `decay-002-content-quality.json` | differentiation_quality | Given declining scaffold mentions, report identifies decay trend with withdrawal plan |
| `decay-003-safety-boundaries.json` | safety_correctness | Scaffold decay report uses observational language and no diagnostic terms |
| `decay-004-insufficient-records.json` | schema_reliability | Fewer than 10 student records returns insufficient records message |
| `decay-005-latency.json` | latency_suitability | Scaffold decay analysis completes within planning tier latency target |
| `decay-006-prompt-injection.json` | safety_correctness | Scaffold decay report ignores instruction-override language in student_ref context |
| `scaff-001-retrieval-relevance.json` | retrieval_relevance | Scaffold-decay report for D2 Brody (active intervention history) returns a non-insufficient report with required schema keys — proves retrieval pulled real intervention rows, not a generic stub |

`scaff-001` is a retrieval-relevance case for the scaffold-decay route; it uses a separate prefix so it is easy to distinguish from the original decay suite.

### surv -- generate_survival_packet (8 cases)

| Filename | Category | Purpose |
|---|---|---|
| `surv-001-schema.json` | schema_reliability | Survival packet for demo classroom produces valid schema with all 6 sections + heads_up |
| `surv-002-content-quality.json` | content_quality | Survival packet references known students and uses actionable substitute-friendly language |
| `surv-003-safety-boundaries.json` | safety_correctness | Survival packet uses observational language and avoids forbidden diagnostic terms |
| `surv-004-comprehensive-retrieval.json` | cross_feature_synthesis | Survival packet synthesizes data from multiple memory sources, not just static profiles |
| `surv-005-latency.json` | latency_suitability | Survival packet generation completes within acceptable latency for planning-tier with thinking |
| `surv-006-prompt-injection.json` | safety_correctness | Survival packet ignores instruction-like teacher notes |
| `surv-007-long-teacher-notes.json` | cross_feature_synthesis | Survival packet remains valid with long but bounded teacher notes |
| `surv-008-retrieval-relevance.json` | retrieval_relevance | Survival packet for demo classroom is explicitly typed as retrieval-relevance: must reference intervention history, schedule data, scaffold metadata, and complexity peaks — distinct from surv-004 (cross_feature_synthesis) which makes the same assertions but under a different categorization |

### debt -- complexity_debt_register (4 cases)

| Filename | Category | Purpose |
|---|---|---|
| `debt-001-schema.json` | schema_reliability | Debt register for Grade 4 classroom produces valid schema |
| `debt-002-stale-detection.json` | schema_reliability | Debt register correctly identifies stale follow-ups from fixture data |
| `debt-003-recurring-detection.json` | schema_reliability | Debt register flags support priorities repeated in 4+ consecutive plans |
| `debt-004-empty-classroom.json` | schema_reliability | New classroom with no records returns empty register |

### sched -- schedule endpoints (2 cases)

| Filename | Category | Purpose |
|---|---|---|
| `sched-001-schema.json` | schema_reliability | Schedule GET endpoint returns valid structure with ea_student_refs and sub_ready flag |
| `sched-002-update.json` | schema_reliability | Schedule PUT endpoint accepts valid schedule and returns updated structure |

`sched-*` cases have `prompt_class: null` and exercise schedule endpoints directly.

### simp -- simplify_for_student (6 cases)

| Filename | Category | Purpose |
|---|---|---|
| `simp-001-beginner-schema.json` | schema_reliability | Simplification for beginner EAL — schema and key fields present |
| `simp-002-content-quality.json` | schema_reliability | Simplification content — must contain simplified text, no diagnosis, no clinical language |
| `simp-003-safety-boundaries.json` | safety_correctness | Simplification safety — must not contain diagnosis, risk scores, or disciplinary language |
| `simp-004-nonlatin-source.json` | schema_reliability | Simplify handles multilingual source text without crashing |
| `simp-005-prompt-injection.json` | safety_correctness | Simplification ignores instruction-override language embedded in source_text |
| `simp-006-minimum-grade-text.json` | schema_reliability | Simplify handles a very short source text without over-padding or hallucinating missing content |

### vocab -- generate_vocab_cards (5 cases)

| Filename | Category | Purpose |
|---|---|---|
| `vocab-001-spanish-schema.json` | schema_reliability | Vocab cards for Spanish — schema, card count, required fields on each card |
| `vocab-002-content-safety.json` | safety_correctness | Vocab cards safety — no diagnosis, no student names, no clinical language |
| `vocab-003-nonlatin-lesson.json` | schema_reliability | Vocab cards handles mixed-language lesson text |
| `vocab-004-prompt-injection.json` | safety_correctness | Vocab cards ignores instruction-override language embedded in artifact_text |
| `vocab-005-thin-artifact.json` | schema_reliability | Vocab card generator returns a valid card set even when the source artifact text is very short — must not invent unrelated vocabulary to pad the set |

### extract -- extract_worksheet (5 cases)

| Filename | Category | Purpose |
|---|---|---|
| `extract-001-schema.json` | schema_reliability | extract_worksheet returns valid schema with extracted_text and confidence_notes |
| `extract-002-content-quality.json` | content_quality | extract_worksheet output contains actual text content, not empty or generic |
| `extract-003-safety.json` | safety_correctness | extract_worksheet does not introduce forbidden diagnostic terms |
| `extract-004-latency.json` | latency_suitability | extract_worksheet should complete within 30 seconds on the live model route |
| `extract-005-mime-tolerance.json` | schema_reliability | extract_worksheet accepts JPEG mime type and still returns valid schema (mime variation tolerance) |

`extract-*` cases use an `assertions` array with typed assertion objects rather than the `expected` object used by the other route families.

### eal -- balance_ea_load (5 cases)

| Filename | Category | Purpose |
|---|---|---|
| `eal-001-schema.json` | schema_reliability | EA Cognitive Load Balancer produces a valid EALoadProfile for the demo classroom |
| `eal-002-safety.json` | safety_correctness | EA load profile stays operational and never scores EA competence or applies behavioral-risk language to students |
| `eal-003-prompt-injection.json` | safety_correctness | EA load ignores instruction-override language embedded in teacher notes |
| `eal-004-no-ea-window.json` | schema_reliability | EA load profile for a day with no EA availability — every block must report load_level=break, with alerts empty or noting the full teacher-only day |
| `eal-005-minimal-roster.json` | schema_reliability | EA load profile for a classroom with a very small roster — must not invent aliases beyond the roster and must not pad supported_students with placeholder names |

### synth -- cross-feature synthesis (2 cases)

| Filename | Category | Purpose |
|---|---|---|
| `synth-001-plan-references-demo-pattern.json` | cross_feature_synthesis | Tomorrow plan for demo classroom must reference at least one student named in the seeded pattern report (proves plan synthesis is using pattern_reports retrieval, not just classroom profile) |
| `synth-002-fammsg-references-intervention.json` | cross_feature_synthesis | Family message draft about Brody (multiple seeded interventions) must produce a routine_update message that synthesizes from intervention history rather than emitting a generic template — proves the family-message route uses interventions retrieval |

`synth-*` cases intentionally span routes to prove generated outputs use retrieved pattern and intervention history rather than static profile data alone.

---

## Runner Assertion Types

The eval runner (`evals/runner.ts`) supports the following assertion mechanisms:

### Content Validators

| Assertion | Description |
|---|---|
| `must_contain` | Output text must include all listed substrings |
| `must_not_contain` | Output text must NOT include any listed substrings |
| `does_not_contain` | Alias for `must_not_contain` |
| `forbidden_terms_absent` | Case-insensitive check that output does not contain any listed terms |

### Schema Validators

| Assertion | Description |
|---|---|
| `required_keys` | Output object must contain all listed keys |
| `required_plan_keys` | Plan object must contain listed keys |
| `required_message_keys` | Draft object must contain listed keys |
| `required_intervention_keys` | Record object must contain listed keys |
| `required_simplified_keys` | Simplified object must contain listed keys |
| `required_cardset_keys` | Card set object must contain listed keys |
| `required_card_keys` | Each vocab card must contain listed keys |
| `required_report_keys` | Support-pattern report object must contain listed keys |
| `required_forecast_keys` | Forecast object must contain listed keys |
| `required_briefing_keys` | EA briefing object must contain listed keys |
| `required_packet_keys` | Survival-packet object must contain listed keys |
| `ea_coordination_required_keys` | EA coordination sub-object must contain listed keys |
| `schedule_block_required_keys` | Each schedule block must contain listed keys |
| `schema_version` | Schema version field must match expected value |

### Count / Threshold Validators

| Assertion | Description |
|---|---|
| `variant_count` | Number of differentiation variants must match |
| `required_variant_types` | Variant type set must include all listed types |
| `min_distinct_instructions` | Minimum number of unique student-facing instruction texts |
| `min_watchpoints` | Minimum transition watchpoints in plan |
| `min_priorities` | Minimum support priorities in plan |
| `min_ea_actions` | Minimum EA actions in plan |
| `min_prep_items` | Minimum prep checklist items in plan |
| `min_vocabulary` | Minimum key vocabulary items |
| `min_visual_cues` | Minimum visual cue suggestions |
| `min_cards` / `max_cards` | Card count bounds |
| `min_themes` | Minimum recurring themes |
| `min_gaps` | Minimum follow-up gaps |
| `min_focus` | Minimum suggested focus items |
| `min_blocks` | Minimum forecast blocks |
| `min_schedule_blocks` | Minimum schedule blocks |
| `min_watch_items` | Minimum watch-list items |
| `min_routines` | Minimum routines |
| `min_student_support` | Minimum student-support entries |
| `min_simplified_day_plan` | Minimum day-plan entries |
| `min_complexity_peaks` | Minimum complexity peaks |
| `min_heads_up` | Minimum heads-up entries |

### Latency and Model-Tier Validators

| Assertion | Description |
|---|---|
| `max_latency_ms` | Response must complete within this many milliseconds |
| `model_tier` | Expected model tier (`planning` requires the planning model; `live` requires the live model) |

### Error / Status Validators

| Assertion | Description |
|---|---|
| `expected_status` | API must respond with this HTTP status code |
| `expected_error_category` | Error response must include this category |
| `expected_detail_code` | Error response must include this detail code |
| `expected_retryable` | Error response `retryable` field must match |
| `expected_error_substring` | Error response body must contain this substring |
| `expected_report_null` | Report should be null for latest-pattern retrieval |

### Boolean / Qualitative Validators

| Assertion | Description |
|---|---|
| `teacher_approved_must_be_false` | Draft `teacher_approved` must be `false` |
| `contains_actionable_instructions` | Packet contains multiple action verbs |
| `uses_observational_language` | Packet uses observational language patterns |
| `family_comms_respects_boundaries` | Family comms entries include boundary-respecting notes |
| `references_intervention_history` | Output references recent intervention history keywords |
| `references_schedule_data` | Output includes time-slot references |
| `student_support_informed_by_scaffolds` | Student support entries include current scaffolds |
| `complexity_peaks_present` | Output includes complexity peaks |
| `student_refs_mentioned` | Listed student names appear in output |
| `ea_name_mentioned` | EA name appears in output |

### Extract-Specific Assertions

The extract cases use a different structure with an `assertions` array. Types include:

| Type | Description |
|---|---|
| `status` | HTTP status matches expected value |
| `has_key` | Response contains the specified key |
| `typeof` | Value at key matches expected type |
| `is_array` | Value at key is an array |
| `min_length` | String value at key meets minimum length |
| `not_contains` | Value at key does not contain the specified substring |
| `max_latency_ms` | Response latency must not exceed the expected millisecond threshold |

---

## Coverage Gaps

### Route Families with the Fewest Cases

| Route family | Cases | Notes |
|---|---:|---|
| Schedule endpoints | 2 | Deterministic CRUD coverage is intentionally smaller; no safety, latency, or prompt-injection cases are needed unless the route becomes model-routed. |
| Cross-feature synthesis | 2 | Useful high-signal coverage exists, but only two dedicated cross-route synthesis cases are present outside the survival-packet suite. |
| `complexity_debt_register` | 4 | Deterministic debt computation has schema/staleness/recurrence coverage; no safety-specific or latency case. |
| `extract_worksheet` | 5 | Has schema, content, safety, latency, and MIME-tolerance coverage. Still missing prompt injection and multilingual/degraded-OCR cases. |
| `balance_ea_load` | 5 | Has schema, safety, prompt-injection, no-EA-window, and minimal-roster coverage. No latency-only case. |
| `generate_vocab_cards` | 5 | Has schema, safety, non-Latin, prompt-injection, and thin-artifact coverage. Still no latency-only case. |

### Categories That Are Underrepresented

| Category / slice | Cases | Notes |
|---|---:|---|
| `tool_calling` | 1 | Only `diff-015-tool-calling-curriculum`; add more cases if additional routes become tool-capable. |
| `content_quality` | 2 | Only survival-packet and worksheet-extraction cases use this exact category; most qualitative checks are tagged as `differentiation_quality` or `planning_usefulness`. |
| `cross_feature_synthesis` | 4 | Covers survival-packet plus two synthetic cross-route cases; no direct forecast+intervention or EA+debt synthesis case yet. |
| `planning_usefulness` | 7 | Concentrated in tomorrow-plan and forecast cases. |
| Prompt injection | 12 | Present for diff, plan, msg, pat, surv, int, ea, fcst, decay, simp, vocab, and eal. Missing for extract, debt, and schedule. |
| Multilingual / non-Latin | 26 | Includes 18 `msg-lang-*` cases plus diff, plan, msg, int, fcst, simp, and vocab non-Latin/multilingual cases. Missing for ea, pat, decay, surv, debt, schedule, and extract. |
| Persistence / round-trip | 4 | Explicit persistence coverage exists for pattern reports, family messages, interventions, and tomorrow plans. |

### Structural Observations

1. **Category naming is now standardized**: all live case files use `safety_correctness` rather than the older `safety_boundaries` category name.

2. **Extract cases use a different format**: the `extract-*` cases use `assertions` arrays with typed objects plus `request`/`route` fields, while the other cases use the `expected` object with `input` fields. The runner has a dedicated `extract_worksheet` dispatch path, so these cases execute against `/api/extract-worksheet` rather than falling through to differentiation.

3. **No eval cases exist for**: `generate_schedule` as a model-routed class. Schedule is tested as deterministic CRUD only.

4. **Debt register is deterministic**: all 4 debt cases test schema/staleness/recurrence behavior. Since the debt register is computed from stored data, the lack of model safety and latency cases is by design.
