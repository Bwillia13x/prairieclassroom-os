# Eval Inventory

Reference document for all eval cases in `evals/cases/`.

Generated: 2026-04-10

---

## Summary Statistics

**Total eval case files:** 96 JSON cases (plus 1 README)

*Updated 2026-04-10: +6 prompt injection cases (int-007, ea-007, fcst-006, decay-006, simp-005, vocab-004). Category `safety_boundaries` standardized to `safety_correctness` across all cases.*

### Cases per Prompt Class

| Prompt Class | Abbreviation | Cases |
|---|---|---|
| `differentiate_material` | diff | 14 |
| `prepare_tomorrow_plan` | plan | 13 |
| `detect_support_patterns` | pat | 8 |
| `draft_family_message` | msg | 8 |
| `generate_survival_packet` | surv | 7 |
| `generate_ea_briefing` | ea | 6 |
| `log_intervention` | int | 6 |
| `forecast_complexity` | fcst | 5 |
| `detect_scaffold_decay` | decay | 5 |
| `simplify_for_student` | simp | 4 |
| `complexity_debt_register` | debt | 4 |
| `generate_vocab_cards` | vocab | 3 |
| `extract_worksheet` | extract | 3 |
| `retrieve_latest_pattern` | pat (retrieval) | 2 |
| Schedule endpoints (no prompt class) | sched | 2 |
| **Total** | | **90** |

Note: pat-007 and pat-010 use `retrieve_latest_pattern` as their prompt class (a retrieval sub-route of support patterns). sched-001 and sched-002 have `prompt_class: null` and target schedule CRUD endpoints directly.

### Cases per Category

| Category | Cases |
|---|---|
| `schema_reliability` | 33 |
| `safety_correctness` | 17 |
| `latency_suitability` | 11 |
| `differentiation_quality` | 7 |
| `planning_usefulness` | 7 |
| `retrieval_relevance` | 6 |
| `cross_feature_synthesis` | 2 |
| `content_quality` | 2 |
| `safety_boundaries` | 1 |

Note: Category names used in JSON files sometimes vary slightly from the runner's `EvalCategory` union (e.g., `safety_boundaries` vs `safety_correctness`). The counts above reflect the exact `category` values in the case files.

---

## Case Inventory by Prompt Class

### diff -- differentiate_material (14 cases)

| Filename | Category | Purpose |
|---|---|---|
| `diff-001-reading-schema.json` | schema_reliability | Reading passage artifact produces 5 variants with all required schema fields |
| `diff-002-fractions-schema.json` | schema_reliability | Math fractions artifact produces 5 variants with correct schema |
| `diff-003-communities-schema.json` | schema_reliability | Social studies communities artifact produces 5 schema-valid variants |
| `diff-004-content-quality.json` | differentiation_quality | Differentiated variants should be meaningfully distinct, not just reworded copies |
| `diff-005-safety-boundaries.json` | safety_correctness | No variant should contain diagnosis, risk scoring, discipline, or IEP language |
| `diff-006-latency.json` | latency_suitability | Differentiation should complete within 30s on the live model route |
| `diff-007-persuasive-schema.json` | schema_reliability | Persuasive writing artifact produces 5 schema-valid variants with EAL support |
| `diff-008-prompt-injection.json` | safety_correctness | Differentiate ignores instruction-override language embedded in teacher_goal |
| `diff-009-no-raw-text.json` | schema_reliability | Differentiate still returns five variants when artifact text is absent |
| `diff-010-invalid-json.json` | schema_reliability | Returns structured inference error when inference service emits invalid JSON |
| `diff-011-empty-model-response.json` | schema_reliability | Surfaces structured inference error when model returns empty response |
| `diff-012-timeout-retry-exhaustion.json` | latency_suitability | Returns retryable timeout error after repeated eval-only short timeouts |
| `diff-013-retryable-503-exhaustion.json` | schema_reliability | Returns structured retryable service error after repeated 503 responses |
| `diff-014-long-multilingual-input.json` | safety_correctness | Stays stable on longer multilingual lesson text without crossing validation limits |

### plan -- prepare_tomorrow_plan (13 cases)

| Filename | Category | Purpose |
|---|---|---|
| `plan-001-alpha-schema.json` | planning_usefulness | Tomorrow plan for Grade 4 produces all required schema sections |
| `plan-002-bravo-schema.json` | planning_usefulness | Tomorrow plan for different classroom also produces valid schema |
| `plan-003-content-quality.json` | planning_usefulness | Plan content is specific to classroom context, not generic advice |
| `plan-004-safety-boundaries.json` | safety_correctness | Plan must not contain diagnosis, discipline, or risk scoring language |
| `plan-005-latency.json` | latency_suitability | Tomorrow plan generates within 60s even with thinking mode |
| `plan-006-pattern-informed.json` | planning_usefulness | Pattern-informed plan produces valid schema with all required sections |
| `plan-007-pattern-safety.json` | safety_correctness | Pattern-informed plan maintains safety boundaries (no diagnostic language) |
| `plan-008-pattern-latency.json` | latency_suitability | Pattern-informed plan completes within planning-tier latency budget |
| `plan-009-cold-memory.json` | schema_reliability | Valid schema even with zero prior interventions (cold start, Grade 6) |
| `plan-010-prompt-injection.json` | safety_correctness | Treats malicious teacher reflection text as content, not instructions |
| `plan-011-nonlatin-reflection.json` | planning_usefulness | Handles mixed-script teacher reflections without breaking schema |
| `plan-012-cold-memory-minimal-artifacts.json` | retrieval_relevance | Still returns valid output when there are no explicit artifacts |
| `plan-013-empty-memory-echo.json` | retrieval_relevance | Returns bounded response for classroom with effectively empty memory |

### msg -- draft_family_message (8 cases)

| Filename | Category | Purpose |
|---|---|---|
| `msg-001-alpha-schema.json` | schema_reliability | Family message produces valid schema (routine_update type) |
| `msg-002-bravo-schema.json` | schema_reliability | Family message for different classroom produces valid schema (praise type) |
| `msg-003-content-quality.json` | differentiation_quality | Message content references correct student and is plain-language |
| `msg-004-safety-boundaries.json` | safety_correctness | Must not contain diagnosis language or auto-approve |
| `msg-005-latency.json` | latency_suitability | Live tier completes under 5s latency threshold |
| `msg-006-non-english.json` | differentiation_quality | target_language=Spanish produces valid schema with safety boundaries |
| `msg-007-prompt-injection.json` | safety_correctness | Ignores instruction-override language inside context |
| `msg-008-nonlatin-context.json` | differentiation_quality | Tolerates mixed-script context and still returns safe draft |

### int -- log_intervention (6 cases)

| Filename | Category | Purpose |
|---|---|---|
| `int-001-alpha-schema.json` | schema_reliability | Intervention for Grade 4 produces valid schema |
| `int-002-bravo-schema.json` | schema_reliability | Intervention for Grade 2 produces valid schema |
| `int-003-content-quality.json` | differentiation_quality | Output contains observation and action language |
| `int-004-safety-boundaries.json` | safety_correctness | Output contains no diagnosis or clinical language |
| `int-005-latency.json` | latency_suitability | Intervention logging completes within 5000ms |
| `int-006-nonlatin-note.json` | schema_reliability | Handles teacher notes with non-Latin text |

### ea -- generate_ea_briefing (6 cases)

| Filename | Category | Purpose |
|---|---|---|
| `ea-001-schema.json` | schema_reliability | EA briefing produces valid schema with all required keys |
| `ea-002-content-quality.json` | differentiation_quality | Contains schedule blocks with student references and task descriptions |
| `ea-003-safety.json` | safety_correctness | Does not contain clinical or diagnostic language |
| `ea-004-latency.json` | latency_suitability | Generated within 15s latency budget (live tier) |
| `ea-005-synthesis.json` | retrieval_relevance | Synthesizes EA action content from existing plan data |
| `ea-006-minimal-request.json` | schema_reliability | Works from classroom retrieval even when no EA name supplied |

### pat -- detect_support_patterns (8 cases) + retrieve_latest_pattern (2 cases)

| Filename | Category | Purpose |
|---|---|---|
| `pat-001-alpha-schema.json` | schema_reliability | Support patterns for Grade 4 produces valid schema |
| `pat-002-content-quality.json` | differentiation_quality | Report contains meaningful content sections |
| `pat-003-safety-boundaries.json` | safety_correctness | Report does not contain clinical or diagnostic language |
| `pat-004-follow-up-gaps.json` | retrieval_relevance | Follow-up gaps section identifies interventions needing follow-up |
| `pat-005-latency.json` | latency_suitability | Response completes within 120s (planning tier) |
| `pat-006-persistence.json` | schema_reliability | Pattern report is persisted and retrievable via latest endpoint |
| `pat-007-latest-retrieval.json` | schema_reliability | Latest pattern endpoint returns persisted report with valid schema |
| `pat-008-prompt-injection.json` | safety_correctness | Does not follow instruction-like text in student_filter |
| `pat-009-unknown-student-filter.json` | retrieval_relevance | Handles unknown student filter without crashing |
| `pat-010-latest-retrieval-empty.json` | retrieval_relevance | Latest retrieval returns empty report cleanly for classrooms with no stored history |

### fcst -- forecast_complexity (5 cases)

| Filename | Category | Purpose |
|---|---|---|
| `fcst-001-demo-schema.json` | schema_reliability | Forecast for demo classroom produces valid schema with all required keys |
| `fcst-002-content-quality.json` | planning_usefulness | References specific students and produces actionable mitigations |
| `fcst-003-safety-boundaries.json` | safety_correctness | Output does not contain forbidden diagnostic or clinical terms |
| `fcst-004-latency.json` | latency_suitability | Completes within 120s planning tier latency budget |
| `fcst-005-nonlatin-teacher-notes.json` | planning_usefulness | Tolerates multilingual teacher notes |

### decay -- detect_scaffold_decay (5 cases)

| Filename | Category | Purpose |
|---|---|---|
| `decay-001-schema.json` | schema_reliability | Scaffold decay report produces valid schema |
| `decay-002-content-quality.json` | differentiation_quality | Identifies decay trend with withdrawal plan given declining scaffold mentions |
| `decay-003-safety-boundaries.json` | safety_correctness | Uses observational language and no diagnostic terms |
| `decay-004-insufficient-records.json` | schema_reliability | Fewer than 10 records returns insufficient records message |
| `decay-005-latency.json` | latency_suitability | Completes within 120s planning tier latency target |

### surv -- generate_survival_packet (7 cases)

| Filename | Category | Purpose |
|---|---|---|
| `surv-001-schema.json` | schema_reliability | Valid schema with all 6 sections plus heads_up |
| `surv-002-content-quality.json` | content_quality | References known students and uses actionable substitute-friendly language |
| `surv-003-safety-boundaries.json` | safety_boundaries | Uses observational language and avoids forbidden diagnostic terms |
| `surv-004-comprehensive-retrieval.json` | cross_feature_synthesis | Synthesizes data from multiple memory sources, not just static profiles |
| `surv-005-latency.json` | latency_suitability | Completes within 150s for planning tier with thinking |
| `surv-006-prompt-injection.json` | safety_correctness | Ignores instruction-like teacher notes |
| `surv-007-long-teacher-notes.json` | cross_feature_synthesis | Remains valid with long but bounded teacher notes |

### debt -- complexity_debt_register (4 cases)

| Filename | Category | Purpose |
|---|---|---|
| `debt-001-schema.json` | schema_reliability | Debt register for Grade 4 produces valid schema |
| `debt-002-stale-detection.json` | schema_reliability | Correctly identifies stale follow-ups from fixture data |
| `debt-003-recurring-detection.json` | schema_reliability | Flags support priorities repeated in 4+ consecutive plans |
| `debt-004-empty-classroom.json` | schema_reliability | New classroom with no records returns empty register |

### sched -- schedule endpoints (2 cases)

| Filename | Category | Purpose |
|---|---|---|
| `sched-001-schema.json` | schema_reliability | Schedule GET returns valid structure with ea_student_refs and sub_ready flag |
| `sched-002-update.json` | schema_reliability | Schedule PUT accepts valid schedule and returns updated structure |

### simp -- simplify_for_student (4 cases)

| Filename | Category | Purpose |
|---|---|---|
| `simp-001-beginner-schema.json` | schema_reliability | Simplification for beginner EAL: schema and key fields present |
| `simp-002-content-quality.json` | schema_reliability | Content has simplified text, no diagnosis, no clinical language |
| `simp-003-safety-boundaries.json` | safety_correctness | Must not contain diagnosis, risk scores, or disciplinary language |
| `simp-004-nonlatin-source.json` | schema_reliability | Handles multilingual source text without crashing |

### vocab -- generate_vocab_cards (3 cases)

| Filename | Category | Purpose |
|---|---|---|
| `vocab-001-spanish-schema.json` | schema_reliability | Spanish vocab cards: schema, card count, required fields on each card |
| `vocab-002-content-safety.json` | safety_correctness | No diagnosis, no student names, no clinical language |
| `vocab-003-nonlatin-lesson.json` | schema_reliability | Handles mixed-language lesson text |

### extract -- extract_worksheet (3 cases)

| Filename | Category | Purpose |
|---|---|---|
| `extract-001-schema.json` | schema_reliability | Returns valid schema with extracted_text and confidence_notes |
| `extract-002-content-quality.json` | content_quality | Output contains actual text content, not empty or generic |
| `extract-003-safety.json` | safety_boundaries | Does not introduce forbidden diagnostic terms |

Note: extract cases use a different JSON structure (`assertions` array with typed assertion objects) rather than the `expected` object used by all other cases.

---

## Runner Assertion Types

The eval runner (`evals/runner.ts`) supports the following assertion mechanisms:

### Content Validators (all prompt classes)

| Assertion | Description |
|---|---|
| `must_contain` | Output text must include all listed substrings |
| `must_not_contain` | Output text must NOT include any listed substrings |
| `does_not_contain` | Alias for `must_not_contain` |
| `forbidden_terms_absent` | Case-insensitive check that output does not contain any listed terms |

### Schema Validators

| Assertion | Description |
|---|---|
| `required_keys` | Output object must contain all listed keys (differentiate variants, decay, debt, schedule, extract) |
| `required_plan_keys` | Plan object must contain listed keys (tomorrow plan) |
| `required_message_keys` | Draft object must contain listed keys (family message) |
| `required_intervention_keys` | Record object must contain listed keys (intervention) |
| `required_simplified_keys` | Simplified object must contain listed keys (simplify) |
| `required_cardset_keys` | Card set object must contain listed keys (vocab cards) |
| `required_card_keys` | Each card must contain listed keys (vocab cards) |
| `required_report_keys` | Report object must contain listed keys (support patterns) |
| `required_forecast_keys` | Forecast object must contain listed keys (complexity forecast) |
| `required_briefing_keys` | Briefing object must contain listed keys (EA briefing) |
| `required_packet_keys` | Packet object must contain listed keys (survival packet) |
| `ea_coordination_required_keys` | EA coordination sub-object must contain listed keys (survival packet) |
| `schedule_block_required_keys` | Each schedule block must contain listed keys (schedule) |
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
| `min_vocabulary` | Minimum key vocabulary items (simplify) |
| `min_visual_cues` | Minimum visual cue suggestions (simplify) |
| `min_cards` / `max_cards` | Card count bounds (vocab cards) |
| `min_themes` | Minimum recurring themes (support patterns) |
| `min_gaps` | Minimum follow-up gaps (support patterns) |
| `min_focus` | Minimum suggested focus items (support patterns) |
| `min_blocks` | Minimum forecast blocks (complexity forecast) |
| `min_schedule_blocks` | Minimum schedule blocks (EA briefing, schedule) |
| `min_watch_items` | Minimum watch list items (EA briefing) |
| `min_routines` | Minimum routines (survival packet) |
| `min_student_support` | Minimum student support entries (survival packet) |
| `min_simplified_day_plan` | Minimum day plan entries (survival packet) |
| `min_complexity_peaks` | Minimum complexity peaks (survival packet) |
| `min_heads_up` | Minimum heads-up entries (survival packet) |

### Latency Validators

| Assertion | Description |
|---|---|
| `max_latency_ms` | Response must complete within this many milliseconds |

### Model Tier Validators

| Assertion | Description |
|---|---|
| `model_tier` | Expected model tier (`planning` requires `27b` in model_id; `live` requires no `27b`) |

### Error / Status Validators

| Assertion | Description |
|---|---|
| `expected_status` | API must respond with this HTTP status code |
| `expected_error_category` | Error response must include this category |
| `expected_detail_code` | Error response must include this detail code |
| `expected_retryable` | Error response `retryable` field must match |
| `expected_error_substring` | Error response body must contain this substring |
| `expected_report_null` | Report should be null (latest pattern retrieval) |

### Boolean / Qualitative Validators (survival packet)

| Assertion | Description |
|---|---|
| `teacher_approved_must_be_false` | Draft `teacher_approved` must be `false` (family message) |
| `contains_actionable_instructions` | Packet contains multiple action verbs |
| `uses_observational_language` | Packet uses observational language patterns |
| `family_comms_respects_boundaries` | Family comms entries include notes |
| `references_intervention_history` | Packet references recent history keywords |
| `references_schedule_data` | Packet includes time-slot references |
| `student_support_informed_by_scaffolds` | Student support entries include current scaffolds |
| `complexity_peaks_present` | Packet includes complexity peaks |
| `student_refs_mentioned` | Listed student names appear in output |
| `ea_name_mentioned` | EA name appears in output |

### Extract-specific Assertions (assertions array format)

The extract cases use a different structure with an `assertions` array. Types include:

| Type | Description |
|---|---|
| `status` | HTTP status matches expected value |
| `has_key` | Response contains the specified key |
| `typeof` | Value at key matches expected type |
| `is_array` | Value at key is an array |
| `min_length` | String value at key meets minimum length |
| `not_contains` | Value at key does not contain the specified substring |

---

## Coverage Gaps

### Prompt Classes with the Fewest Cases

| Prompt Class | Cases | Notes |
|---|---|---|
| `extract_worksheet` | 3 | No latency test. No prompt injection test. No multilingual input test. Uses a different assertion format from other cases. |
| `generate_vocab_cards` | 3 | No latency-only test case. No prompt injection test. |
| `complexity_debt_register` | 4 | No safety-specific test. No latency test. Deterministic (not model-routed), so safety/latency may be lower priority. |
| `simplify_for_student` | 4 | No prompt injection test. No retrieval or persistence test. |
| Schedule endpoints | 2 | No safety test. No latency test. No prompt injection test. Deterministic CRUD, so this is expected. |

### Categories That Are Underrepresented

| Category | Cases | Notes |
|---|---|---|
| `cross_feature_synthesis` | 2 | Only surv-004 and surv-007. No cross-feature cases for plan+pattern, forecast+intervention, or EA+debt interactions. |
| `content_quality` | 2 | Only surv-002 and extract-002. Most content quality testing is tagged under `differentiation_quality` or `planning_usefulness`. |
| `safety_boundaries` | 1 | Only surv-003. Most safety testing uses `safety_correctness` instead. These may be intended as the same category. |
| `retrieval_relevance` | 6 | Only covers plan (2), pat (3), ea (1). No retrieval test for forecast, decay, or survival packet retrieval quality. |
| Prompt injection | 6 | diff-008, plan-010, msg-007, pat-008, surv-006 and implicitly others. Missing for: int, ea, fcst, decay, simp, vocab, extract, debt, sched. |
| Multilingual / non-Latin | 8 | diff-014, plan-011, msg-006, msg-008, int-006, fcst-005, simp-004, vocab-003. Missing for: ea, pat, decay, surv, debt, sched, extract. |
| Edge case / empty input | 5 | diff-009 (no text), diff-010/011/012/013 (error paths), decay-004, debt-004, plan-009/012/013, pat-010. Missing for: msg, ea, simp, vocab, extract. |
| Persistence / round-trip | 1 | Only pat-006 explicitly tests that a generated report is persisted. No persistence test for interventions, plans, or messages. |

### Structural Observations

1. **Category naming inconsistency**: `safety_boundaries` and `safety_correctness` appear to overlap. The runner's `EvalCategory` type lists both, but nearly all cases use `safety_correctness`. surv-003 uses `safety_boundaries`.

2. **Extract cases use a different format**: The `extract-*` cases use `assertions` arrays with typed objects plus `request`/`route` fields, while all other cases use the `expected` object with `input` fields. The runner does not appear to have a dedicated dispatch path for `extract_worksheet` -- these cases would fall through to `runDifferentiationEval` since `extract_worksheet` is not listed in the prompt class dispatch switch, which may cause test failures.

3. **No eval cases exist for**: `generate_schedule` as a model-routed class (schedule is tested as deterministic CRUD only).

4. **Debt register is deterministic**: All 4 debt cases test schema reliability. Since the debt register is computed from stored data (not model-routed), the lack of safety and latency cases is by design.
