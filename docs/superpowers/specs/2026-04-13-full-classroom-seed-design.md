# Full Classroom Seed — Design

**Date:** 2026-04-13
**Status:** Approved, ready for implementation plan
**Scope:** Seed the demo classroom fixture with a realistic 26-student roster so every teacher-facing panel can be exercised at full-scale without new auth plumbing or test churn.

## 1. Motivation

`data/synthetic_classrooms/classroom_demo.json` (`demo-okafor-grade34`) has been the canonical demo fixture since the repo went beyond pre-dev. Its `classroom_notes` describe a "Split grade 3/4 class with 24 students," but the roster has always contained only 6 aliases (Amira, Brody, Chantal, Daniyal, Elena, Farid). That gap is now actively limiting:

- **EA Load** panel redistributions look thin because there are only 6 possible beneficiaries of any reallocation.
- **Forecast** and **Survival Packet** sections enumerate students class-wide; with 6 aliases the output reads more like a small group than a classroom.
- **Student Summary** and **Support Patterns** cannot show realistic diversity of need profiles or EAL distribution.
- The **Today** panel never feels crowded enough to stress-test visual hierarchy decisions.

We want a full-scale fixture that exercises every one of the 12 teacher-facing panels at realistic Alberta K-6 density, *without* breaking the seeded narrative arcs (especially Chantal's 12-record scaffold-decay progression, which is load-bearing for the scaffold-decay eval threshold).

## 2. Goals and non-goals

**In scope**
- Expand `classroom_demo.json` from 6 → 26 students while preserving the existing 6 aliases byte-for-byte.
- Update a handful of `schedule[].ea_student_refs` entries so EA attention spreads across the larger roster.
- Update the "24 students" note to "26 students" and leave the rest of `classroom_notes` intact.
- Extend `data/demo/seed.ts` with ~12 new intervention records (IDs `int-demo-020` through `int-demo-031`) that reference the new students, so Support Patterns, EA Load, Survival Packet, Forecast, and Today all see richer material at re-seed time.
- Re-run `npx tsx data/demo/seed.ts` to rebuild `data/memory/demo-okafor-grade34.sqlite` idempotently.

**Explicitly out of scope**
- **No changes** to the existing 20 intervention records, 3 plans, pattern report, or family message in `seed.ts`. Those encode a specific narrative (Brody's regulation arc, Amira's language scaffolding, Elena's fraction breakthrough, Chantal's scaffold-decay arc) that the demo narrative and eval cases depend on.
- No pattern-report re-synthesis — a fresh `detect_support_patterns` generation at runtime will pull the expanded intervention set automatically.
- No schema or prompt-contract changes.
- No changes to orchestrator loader, auth middleware, or any other classroom JSON file (`classroom_alpha`, `classroom_bravo`, etc.).
- No new tests. A grep scan of `services/orchestrator/__tests__`, `services/memory/__tests__`, and `packages/shared/schemas/__tests__` confirmed (a) orchestrator unit tests build their own inline `ClassroomProfile` fixtures rather than reading `classroom_demo.json`, and (b) no assertion anywhere targets `demo-okafor-grade34.students.length`. The implementation agent should re-run the grep before committing to confirm the codebase hasn't drifted since this spec was written.
- No documentation overhaul — only the inline `classroom_notes` count gets updated.

## 3. Roster design

### 3.1 Preserved (6 students, untouched)

| ID | Alias | Home lang | Tags summary |
|----|-------|-----------|--------------|
| D1 | Amira | Tagalog | EAL L2, visual supports, strong math reasoning |
| D2 | Brody | English | sensory/transition regulation |
| D3 | Chantal | English | strong reader, peer mentor, **scaffold-decay arc — DO NOT EDIT** |
| D4 | Daniyal | Urdu | EAL L1, new to school system |
| D5 | Elena | English | math anxiety, manipulatives-first |
| D6 | Farid | Arabic | EAL L3, strong verbal math |

These six entries are copied forward unchanged — same `student_id`, `alias`, `eal_flag`, `support_tags`, `known_successful_scaffolds`, `communication_notes`, `family_language`. Any edit risks breaking `int-demo-ch-01` through `int-demo-ch-12` and the seeded plans.

### 3.2 New (20 students)

Each new student follows the existing needs/strengths framing from `classroom.ts:8-16`: descriptive tags only, no clinical labels, no diagnoses, no behavior-risk scoring. Tags reuse existing vocabulary where possible (`eal_level_1`, `needs_visual_supports`, `attention_during_transitions`, `needs_extension_tasks`, etc.) and extend it where the new profile requires (`benefits_from_standing_option`, `articulation_support_biweekly_slp`, `executive_function_checklist`, `anxiety_about_mistakes`, `academic_vocabulary_support`).

Distribution targets (realistic for Edmonton/Calgary public split 3/4 class):
- **EAL (7 total, ~27%)**: 3 existing + 4 new (Imani—Somali, Navpreet—Punjabi, Sebastián—Spanish, Uyen—Vietnamese). Matches Alberta demographic reality.
- **Regulation / attention (5 total)**: Brody + Liam (transitions), Quinn (anxiety about mistakes), Xavier (movement needs), Zayn (executive function/organization).
- **Extension / strong profiles (3 total)**: Chantal + Maya (writing) + Wesley (math).
- **Speech-language (1 new)**: Marco (biweekly SLP consult, matches existing `support_constraints` entry).
- **Math-specific (1 existing)**: Elena.
- **Typically developing, empty tag arrays (9 total)**: Gabriel, Hannah, Jasper, Kiana, Oliver, Anaya, Rania, Violet, Nadia. Important — a realistic classroom does **not** pathologize every student, and the seeded fixture should reflect that. Nine students with empty `support_tags: []` and `known_successful_scaffolds: []` is the correct shape.

Complete roster:

| ID  | Alias     | `eal_flag` | `family_language` | Support profile (tags) |
|-----|-----------|-----------|-----|------------------------|
| D7  | Gabriel   | false | — | typical (empty arrays) |
| D8  | Hannah    | false | — | typical (empty arrays) |
| D9  | Imani     | true  | so | EAL L1, new mid-year, needs visual schedule, buddy system — matches the `upcoming_events` foreshadow |
| D10 | Jasper    | false | — | typical (empty arrays) |
| D11 | Kiana     | false | — | typical (empty arrays) |
| D12 | Liam      | false | — | attention during transitions, benefits from advance notice, visual timer |
| D13 | Maya      | false | — | strong writer, needs extension, peer mentor potential |
| D14 | Navpreet  | true  | pa | EAL L3, social English stronger than academic; scaffolds: academic vocabulary previews, sentence frames, bilingual word walls |
| D15 | Oliver    | false | — | typical (empty arrays) |
| D16 | Anaya     | false | — | typical (empty arrays) |
| D17 | Quinn     | false | — | anxiety about mistakes, benefits from low-stakes practice, private feedback |
| D18 | Rania     | false | — | typical (empty arrays) |
| D19 | Sebastián | true  | es | EAL L2, Spanish-speaking, benefits from bilingual word walls and sentence frames |
| D20 | Marco     | false | — | articulation support, biweekly SLP consult, benefits from pre-reading familiar vocabulary |
| D21 | Uyen      | true  | vi | EAL L2, new to school system, needs routine support; paired with Imani as buddy cohort |
| D22 | Violet    | false | — | typical (empty arrays) |
| D23 | Wesley    | false | — | math extension, strong pattern recognition, leadership in small groups |
| D24 | Xavier    | false | — | movement needs, benefits from standing option and sensory breaks during literacy block |
| D25 | Nadia     | false | — | typical (empty arrays) |
| D26 | Zayn      | false | — | executive function support, benefits from visible checklist and materials station routine |

Total: 26 students. EAL students: 7. Empty-tag students: 9 (Gabriel, Hannah, Jasper, Kiana, Oliver, Anaya, Rania, Violet, Nadia).

**Naming integrity rule.** All new aliases are single-word first names. None collide with the existing 6 aliases or with aliases from any other `classroom_*.json`. A post-implementation code review caught three collisions (Priya ↔ `classroom_charlie`, Tomás ↔ `classroom_bravo`, Yasmin ↔ `classroom_delta`) that the initial draft missed; these were renamed to Anaya, Marco, and Nadia respectively (commit `86a3422`) before any downstream consumers touched them. Cross-classroom alias leakage is already one of the regression fixtures (`evals/fixtures/regressions/*-alias-leak.json`), so distinct names matter.

## 4. Schedule updates

Keep the same five time slots and the same `ea_available` values. Extend `ea_student_refs` in three blocks to distribute EA attention across the expanded roster:

| Time slot   | Current `ea_student_refs`              | New `ea_student_refs`                          |
|-------------|-----------------------------------------|-------------------------------------------------|
| 8:30-9:15   | `["Amira", "Daniyal"]`                 | `["Amira", "Daniyal", "Imani"]`                |
| 9:15-9:30   | `["Brody"]`                             | `["Brody", "Liam"]`                            |
| 9:30-10:30  | `["Amira", "Daniyal", "Farid"]`        | `["Amira", "Daniyal", "Farid", "Imani", "Marco"]` |
| 10:30-10:45 | `[]`                                    | `[]` (unchanged)                               |
| 10:45-11:45 | `["Amira", "Brody"]`                   | `["Amira", "Brody", "Xavier"]`                 |
| (remaining slots) | unchanged                         | unchanged                                      |

After the update, the EA's morning window directly supports 8 distinct students (Amira, Daniyal, Imani, Brody, Liam, Farid, Marco, Xavier) — realistic pressure for the Forecast and EA Load panels, and consistent with the existing `support_constraints` entry "No 1:1 aide — EA floats between 3 students" only being technically accurate at a single-moment snapshot (the demand pool is larger).

`classroom_notes` updates:
- `classroom_notes[0]`: "Split grade 3/4 class with 24 students." → "Split grade 3/4 class with 26 students."
- `classroom_notes[2]`: "Three EAL students at different proficiency levels." → "Seven EAL students spanning L1-L3 proficiency, with home languages Tagalog, Urdu, Arabic, Somali, Punjabi, Spanish, and Vietnamese." (updated in commit `e828be3` to correct stale count after expansion).
- `schedule[12:45-1:45].notes`: "No EA - teacher solo with 24 students, split grades" → "No EA - teacher solo with 26 students, split grades".
- No other note changes.

`upcoming_events` stays as-is. The existing Imani foreshadow (`2026-04-07`) is now consistent with her being on the roster — today is `2026-04-13`, so she has been in class six days. That's exactly the operational state we want reflected in the fixture.

## 5. Seed script extension

Add 12 new intervention records to the bottom of the `interventions` array in `data/demo/seed.ts`, **after** `int-demo-ch-12` and **before** the "PLANS" section. Do not touch any existing record. Use IDs `int-demo-020` through `int-demo-031`. All records use `schema_version = SCHEMA_V` and `classroom_id = CLASSROOM`, matching the existing pattern.

Narrative design: each new record captures *one* realistic observation and action for a new student, written in the same voice as the existing seeded interventions (specific, concrete, human, non-clinical). Dates cluster April 7-12, 2026, so today's panel (`2026-04-13`) sees a full week of fresh material for the expanded roster.

| ID  | Date   | `student_refs`        | Narrative arc |
|-----|--------|------------------------|---------------|
| 020 | Apr 07 | `["Imani"]`           | First-day integration; buddy assigned (Amira via bilingual instinct wasn't possible — Somali/Tagalog mismatch — so visual schedule + Chantal as English-model buddy); nonverbal engagement during literacy circle. |
| 021 | Apr 08 | `["Imani", "Chantal"]`| Chantal proactively modelled the snack routine for Imani; Chantal's emerging peer-mentor role (documented in Mar 26 `int-demo-006`) extending to new arrival. |
| 022 | Apr 08 | `["Liam"]`            | Attention drift during transition to math block; advance-notice + visual timer worked on first day of attempting it. |
| 023 | Apr 08 | `["Maya"]`            | Finished literacy task in half the allotted time; asked for extension; provided independent poetry-analysis menu. Engagement sustained 25 minutes. |
| 024 | Apr 09 | `["Quinn"]`           | Froze on a math fact practice sheet (similar surface to Elena `int-demo-004` but driven by perfectionism, not manipulative need); offered a "draft version" framing — practice sheet is a draft, not graded — Quinn completed without freezing. |
| 025 | Apr 09 | `["Marco"]`           | Read-aloud practice for upcoming class share; pre-taught three low-frequency words he'd flagged with SLP consult; fluency at share time was noticeably calmer. |
| 026 | Apr 09 | `["Xavier"]`          | Standing option at his desk during literacy block; completed journal entry for the first time in a week without leaving his seat area. |
| 027 | Apr 10 | `["Sebastián"]`       | Stalled on a word problem in math; similar language-processing profile to Amira but Spanish-first. Sentence frame + bilingual peer-check (no one in class speaks Spanish but a translated sentence frame was provided); Sebastián completed with partial scaffold. |
| 028 | Apr 10 | `["Navpreet", "Farid"]` | Navpreet and Farid paired voluntarily during social studies vocabulary work; Navpreet's social English helped Farid pronounce target words; mutual benefit observed. |
| 029 | Apr 10 | `["Zayn"]`            | Desk-organization checklist (laminated, 5 items) left on his desk before morning block; Zayn followed it without reminder; first fully independent morning setup since the checklist was introduced. |
| 030 | Apr 11 | `["Uyen"]`            | Week-three student, still orienting to Canadian school routines; visual schedule on desk plus paired transitions with Imani; improving but sensory overwhelm at recess transition noted — follow up needed. |
| 031 | Apr 12 | `["Wesley"]`          | Completed grade-level multiplication tasks in 8 minutes; given a multi-step pattern problem from grade 5 curriculum as extension; solved it with correct explanation. Worth documenting for GATE referral conversation with resource teacher. |

`follow_up_needed` flags: records 020, 022, 024, 025, 030 set `true` (to create realistic overdue-follow-up pressure in the Support Patterns panel); the rest set `false`.

**Pattern report implications.** The existing `patternReport` (saved in `savePatternReport` at the end of `seed.ts`) remains unchanged. At runtime, the panels that show the *saved* pattern report (`GET /api/support-patterns/latest/:classroomId`) will keep displaying the original narrative. Panels that regenerate on demand (`POST /api/detect_support_patterns`) will see the full 32-record intervention history and will produce richer themes. This is the intended behaviour — we want *both* the stable demo narrative and the ability to exercise the full prompt pipeline against the expanded roster.

## 6. File-by-file changes

1. **`data/synthetic_classrooms/classroom_demo.json`** — rewritten roster (6 preserved + 20 new), `classroom_notes[0]` updated to "26 students", 3 schedule entries gain additional `ea_student_refs`. Total student array length: 26. Schema version unchanged. File remains valid against `ClassroomProfileSchema`.
2. **`data/demo/seed.ts`** — append 12 new objects to the `interventions` const. Nothing else in the file changes. The logging section at the bottom automatically picks up the new count because it uses `interventions.length`.
3. **`data/memory/demo-okafor-grade34.sqlite`** — rebuilt at seed time. Existing seed uses `INSERT OR REPLACE`, so running the seed against an existing DB is idempotent and safe. No migration, no schema change.

No other files are touched. No tests are added or modified.

## 7. Validation plan

After implementation, run in this order (cheapest first, per the cost guardrails in CLAUDE.md):

1. **`npm run typecheck`** — catches any Zod schema regression from the JSON shape change. Must pass.
2. **`npm run lint`** — catches seed.ts lint drift. Must pass.
3. **`npm run test`** — the full unit suite. Must pass. Expected: all green, since no test asserts on demo roster length. Any failure means a hidden dependency that the grep scan missed.
4. **`npx tsx data/demo/seed.ts`** — rebuild the SQLite memory. Expected output: "Interventions: 32" (was 20), 3 plans, 1 pattern report, 1 family message.
5. **`npm run memory:admin -- summary --classroom demo-okafor-grade34`** — confirm the memory DB has 32 interventions recorded.
6. **`npm run release:gate`** — optional but recommended. End-to-end validation across the default mock lane. This *will* pick up the expanded JSON via the orchestrator's runtime classroom loader.

For a manual smoke test after step 4, start the dev stack and open the web shell at the demo classroom. Expected visible changes:
- Today panel shows richer EA watchpoints because more students carry recent observations.
- Student Summary list is 26 entries tall.
- EA Load panel shows distribution across 8+ students in the morning window.
- Survival Packet panel lists 26 students organized by support profile.
- Forecast panel risk-scores reflect the diverse tag distribution.

## 8. Risks and mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| A test somewhere asserts demo roster count | Low | Grep verified no such assertion. If discovered, the fix is trivial — update the expected value. |
| Expanded EA demand breaks an EA-load prompt builder that assumes small rosters | Low | The prompt builder (`services/orchestrator/ea-load.ts`) already handles arbitrary roster sizes — its test fixtures use 2-student classrooms and the real data lane uses 6, with no scaling logic. |
| New tags introduce vocabulary drift in support-patterns prompts | Low | All new tags follow the existing snake_case needs/strengths framing. No clinical terms. The prompt-contracts tests validate tag *format* not tag *content*. |
| Seed.ts extension introduces narrative inconsistency with existing records | Medium | Narrative design above keeps each new record self-contained; none of the new records reference events or students that contradict the existing 20 records or the 3 plans. Cross-read during implementation to verify. |
| Chantal's scaffold-decay arc breaks | High if touched, zero if not | The spec explicitly forbids touching `int-demo-ch-01` through `int-demo-ch-12` or the Chantal row in the roster. Implementation should visually diff-check this before committing. |
| Re-running seed corrupts existing memory DB | Low | Seed uses `INSERT OR REPLACE` on every table, and close the DB via `closeAll()`. Existing behaviour; no change. |
| Pattern report shown in UI still reflects old 3-theme narrative | N/A (intended) | See Section 5 — this is by design. Live regeneration produces fresh themes when the teacher triggers it. |
| Eval cases that reference demo aliases (14 files) break | Very low | All 14 reference only the 6 existing aliases, and none assert on roster length. Grep confirms this. |

## 9. Implementation order

1. Draft the full 26-student JSON roster inline and spot-check against `ClassroomProfileSchema` mentally.
2. Overwrite `data/synthetic_classrooms/classroom_demo.json` in a single `Write` call (the existing file is only 97 lines — safer than incremental `Edit` operations for a structural rewrite).
3. Append the 12 new intervention records to `data/demo/seed.ts` via `Edit`, immediately after `int-demo-ch-12` and before the "// ─── PLANS ───" divider.
4. Run `npx tsx data/demo/seed.ts` to rebuild the SQLite memory.
5. Run validation steps 1-5 from Section 7.
6. Report back with exact counts and any anomalies.
