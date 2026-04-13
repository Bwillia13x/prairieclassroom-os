# Full Classroom Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed the `demo-okafor-grade34` fixture with 26 students (6 preserved + 20 new) plus 12 new intervention records, so every teacher-facing panel can be exercised at full-scale without breaking the existing seeded narrative arcs or any test.

**Architecture:** Two file edits (`data/synthetic_classrooms/classroom_demo.json` rewrite; `data/demo/seed.ts` append-only) followed by a single seed-script run to rebuild the SQLite memory DB. No schema changes, no new tests, no orchestrator changes. The SQLite output file is gitignored (`data/memory/*.sqlite`) so only the two source files get committed.

**Tech Stack:** Node 25.8.2 (`npm` workspaces), TypeScript (`tsx` for seed execution), Vitest (unit tests), Zod (schema validation at classroom-load time), SQLite via `better-sqlite3` (per-classroom memory).

**Source of truth spec:** `docs/superpowers/specs/2026-04-13-full-classroom-seed-design.md` — read this first for rationale, roster rationale, and risk analysis.

---

## Working directory

All commands assume you are in `/Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev` (the inner git repo, not the outer `Prairie_Complexity/` wrapper).

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
pwd  # must print .../prairieclassroom-predev
```

## Task 1 — Pre-flight baseline check

**Files:** none (read-only).

- [ ] **Step 1.1: Confirm you are on main with a clean enough working tree for this feature's files**

Run:
```bash
git status --short data/synthetic_classrooms/classroom_demo.json data/demo/seed.ts
```
Expected: no output (both files unmodified). If either file shows `M` or is untracked, stop and ask the user what to do — the plan assumes we're starting from the committed version.

Note: there are pre-existing unrelated unstaged changes on `main` (CSS/test files in `apps/web`, `CLAUDE.md`, `.nvmrc`). Leave those alone — our commits will use explicit `git add <file>` so only this feature's files are staged.

- [ ] **Step 1.2: Record the baseline intervention count from the existing memory DB**

Run:
```bash
npm run memory:admin -- summary --classroom demo-okafor-grade34 2>&1 | tail -80
```
Expected: a JSON blob listing table row counts. The demo DB is long-lived and accumulates live-session records on top of the seeded baseline, so the intervention count will be much higher than the 20 literal records in `seed.ts` — a recent snapshot showed ~77 interventions, ~96 plans, ~76 pattern reports, ~68 complexity forecasts, ~94 survival packets, ~82 sessions. **Write down the exact `interventions.count` shown by this run — call it `BASELINE_INTERVENTIONS`.** We will compare against it after re-seeding in Task 10.

- [ ] **Step 1.3: Run the baseline unit test suite as a clean reference point**

Run:
```bash
npm run test 2>&1 | tail -20
```
Expected: all tests pass. If any test is already failing on `main` for unrelated reasons, note which one(s) and carry that baseline into Task 5 and Task 8 comparisons. Do not try to fix pre-existing failures — they're not this plan's scope.

---

## Task 2 — Rewrite `classroom_demo.json` with the 26-student roster

**Files:**
- Modify: `data/synthetic_classrooms/classroom_demo.json` (complete rewrite — 97 lines → ~240 lines)

The existing file is small enough and the edit is structural enough that a complete rewrite with `Write` is safer than incremental `Edit` operations. The new content below preserves the original top-level keys (`classroom_id`, `grade_band`, `subject_focus`, `classroom_notes`, `routines`, `support_constraints`, `sub_ready`, `retention_policy`, `students`, `schedule`, `upcoming_events`) and the order they appear in.

**Key preservation rule:** Students `D1` through `D6` (Amira, Brody, Chantal, Daniyal, Elena, Farid) are copied byte-for-byte from the existing file. The Chantal entry in particular is load-bearing for `int-demo-ch-01` through `int-demo-ch-12` — do not alter her support_tags or scaffolds.

- [ ] **Step 2.1: Write the complete new file**

Use the `Write` tool with path `data/synthetic_classrooms/classroom_demo.json` and the exact content below (2-space indentation, no trailing newline differences from the existing file):

```json
{
  "classroom_id": "demo-okafor-grade34",
  "grade_band": "3-4",
  "subject_focus": "cross_curricular",
  "classroom_notes": [
    "Split grade 3/4 class with 26 students.",
    "EA (Ms. Fehr) available mornings only — afternoons are teacher-only.",
    "Seven EAL students spanning L1-L3 proficiency, with home languages Tagalog, Urdu, Arabic, Somali, Punjabi, Spanish, and Vietnamese.",
    "Sensory corner set up near the window; one student uses it daily.",
    "Math block is right after lunch — transitions are consistently hard."
  ],
  "routines": {
    "morning": "bell work journal then calendar math",
    "after_lunch": "body break then math block",
    "end_of_day": "learning reflection then pack-up song"
  },
  "support_constraints": [
    "EA available 8:30-12:00 only",
    "No 1:1 aide — EA floats between 3 students",
    "Speech-language consult available biweekly"
  ],
  "sub_ready": true,
  "retention_policy": {
    "default_days": 730,
    "overrides": {
      "sessions": 90,
      "feedback": 180
    }
  },
  "students": [
    {
      "student_id": "D1",
      "alias": "Amira",
      "eal_flag": true,
      "support_tags": ["eal_level_2", "needs_visual_supports", "strong_math_reasoning"],
      "known_successful_scaffolds": ["bilingual_word_walls", "visual_step_cards", "peer_buddy_system"],
      "communication_notes": ["Family speaks Tagalog at home", "Mother prefers messages in English with simple vocabulary"],
      "family_language": "tl"
    },
    {
      "student_id": "D2",
      "alias": "Brody",
      "eal_flag": false,
      "support_tags": ["attention_during_transitions", "sensory_needs", "benefits_from_pre_correction"],
      "known_successful_scaffolds": ["advance_notice_of_transitions", "fidget_tools", "visual_timer", "sensory_break_before_math"],
      "communication_notes": ["Father responsive to app messages", "Prefers brief, positive-first updates"]
    },
    {
      "student_id": "D3",
      "alias": "Chantal",
      "eal_flag": false,
      "support_tags": ["strong_reader", "needs_extension_tasks", "peer_mentor"],
      "known_successful_scaffolds": ["independent_extension_menu", "leadership_roles_in_group_work"]
    },
    {
      "student_id": "D4",
      "alias": "Daniyal",
      "eal_flag": true,
      "support_tags": ["eal_level_1", "new_to_school_system", "needs_routine_support"],
      "known_successful_scaffolds": ["visual_schedule", "simplified_instructions", "buddy_system"],
      "communication_notes": ["Family speaks Urdu", "Older sibling translates for parent meetings"],
      "family_language": "ur"
    },
    {
      "student_id": "D5",
      "alias": "Elena",
      "eal_flag": false,
      "support_tags": ["math_anxiety", "benefits_from_manipulatives", "quiet_contributor"],
      "known_successful_scaffolds": ["concrete_manipulatives_first", "small_group_before_independent", "positive_self_talk_prompts"]
    },
    {
      "student_id": "D6",
      "alias": "Farid",
      "eal_flag": true,
      "support_tags": ["eal_level_3", "social_language_stronger_than_academic", "good_at_math"],
      "known_successful_scaffolds": ["academic_vocabulary_previews", "sentence_frames_for_writing"],
      "communication_notes": ["Family speaks Arabic", "Mother is comfortable with English communication"],
      "family_language": "ar"
    },
    {
      "student_id": "D7",
      "alias": "Gabriel",
      "eal_flag": false,
      "support_tags": [],
      "known_successful_scaffolds": []
    },
    {
      "student_id": "D8",
      "alias": "Hannah",
      "eal_flag": false,
      "support_tags": [],
      "known_successful_scaffolds": []
    },
    {
      "student_id": "D9",
      "alias": "Imani",
      "eal_flag": true,
      "support_tags": ["eal_level_1", "new_to_school_system", "needs_visual_supports"],
      "known_successful_scaffolds": ["visual_schedule", "buddy_system", "picture_cues"],
      "communication_notes": ["Family speaks Somali", "Older cousin attends grade 6 at the same school and can translate for urgent messages"],
      "family_language": "so"
    },
    {
      "student_id": "D10",
      "alias": "Jasper",
      "eal_flag": false,
      "support_tags": [],
      "known_successful_scaffolds": []
    },
    {
      "student_id": "D11",
      "alias": "Kiana",
      "eal_flag": false,
      "support_tags": [],
      "known_successful_scaffolds": []
    },
    {
      "student_id": "D12",
      "alias": "Liam",
      "eal_flag": false,
      "support_tags": ["attention_during_transitions", "benefits_from_pre_correction"],
      "known_successful_scaffolds": ["advance_notice_of_transitions", "visual_timer", "clear_step_checklist"]
    },
    {
      "student_id": "D13",
      "alias": "Maya",
      "eal_flag": false,
      "support_tags": ["strong_writer", "needs_extension_tasks", "peer_mentor"],
      "known_successful_scaffolds": ["independent_extension_menu", "leadership_roles_in_group_work"]
    },
    {
      "student_id": "D14",
      "alias": "Navpreet",
      "eal_flag": true,
      "support_tags": ["eal_level_3", "social_language_stronger_than_academic"],
      "known_successful_scaffolds": ["academic_vocabulary_previews", "sentence_frames_for_writing", "bilingual_word_walls"],
      "communication_notes": ["Family speaks Punjabi at home", "Mother prefers phone calls over app messages"],
      "family_language": "pa"
    },
    {
      "student_id": "D15",
      "alias": "Oliver",
      "eal_flag": false,
      "support_tags": [],
      "known_successful_scaffolds": []
    },
    {
      "student_id": "D16",
      "alias": "Anaya",
      "eal_flag": false,
      "support_tags": [],
      "known_successful_scaffolds": []
    },
    {
      "student_id": "D17",
      "alias": "Quinn",
      "eal_flag": false,
      "support_tags": ["anxiety_about_mistakes", "benefits_from_low_stakes_practice"],
      "known_successful_scaffolds": ["draft_framing_for_practice_tasks", "private_feedback", "choice_of_representation"]
    },
    {
      "student_id": "D18",
      "alias": "Rania",
      "eal_flag": false,
      "support_tags": [],
      "known_successful_scaffolds": []
    },
    {
      "student_id": "D19",
      "alias": "Sebastián",
      "eal_flag": true,
      "support_tags": ["eal_level_2", "benefits_from_visual_examples", "strong_verbal_reasoning"],
      "known_successful_scaffolds": ["sentence_frames_for_writing", "bilingual_word_walls", "paired_examples"],
      "communication_notes": ["Family speaks Spanish at home", "Father bilingual in English and Spanish"],
      "family_language": "es"
    },
    {
      "student_id": "D20",
      "alias": "Marco",
      "eal_flag": false,
      "support_tags": ["articulation_support_biweekly_slp", "benefits_from_pre_reading_familiar_vocabulary"],
      "known_successful_scaffolds": ["slow_partner_read_aloud", "vocabulary_pre_teach", "choice_to_share_or_pass"]
    },
    {
      "student_id": "D21",
      "alias": "Uyen",
      "eal_flag": true,
      "support_tags": ["eal_level_2", "new_to_school_system", "needs_routine_support"],
      "known_successful_scaffolds": ["visual_schedule", "buddy_system", "simplified_instructions"],
      "communication_notes": ["Family speaks Vietnamese at home", "Parents both learning English — app translations helpful"],
      "family_language": "vi"
    },
    {
      "student_id": "D22",
      "alias": "Violet",
      "eal_flag": false,
      "support_tags": [],
      "known_successful_scaffolds": []
    },
    {
      "student_id": "D23",
      "alias": "Wesley",
      "eal_flag": false,
      "support_tags": ["strong_math_reasoning", "needs_extension_tasks", "pattern_recognition"],
      "known_successful_scaffolds": ["independent_extension_menu", "cross_grade_challenge_problems", "leadership_roles_in_group_work"]
    },
    {
      "student_id": "D24",
      "alias": "Xavier",
      "eal_flag": false,
      "support_tags": ["movement_needs", "benefits_from_standing_option", "sensory_breaks_during_literacy"],
      "known_successful_scaffolds": ["standing_desk_option", "fidget_tools", "movement_break_between_tasks"]
    },
    {
      "student_id": "D25",
      "alias": "Nadia",
      "eal_flag": false,
      "support_tags": [],
      "known_successful_scaffolds": []
    },
    {
      "student_id": "D26",
      "alias": "Zayn",
      "eal_flag": false,
      "support_tags": ["executive_function_checklist", "benefits_from_materials_routine"],
      "known_successful_scaffolds": ["laminated_desk_checklist", "materials_station_routine", "visual_agenda"]
    }
  ],
  "schedule": [
    { "time_slot": "8:30-9:15", "activity": "Bell work journal + calendar math", "ea_available": true, "ea_student_refs": ["Amira", "Daniyal", "Imani"] },
    { "time_slot": "9:15-9:30", "activity": "Recess transition", "ea_available": true, "notes": "Historically difficult - sensory needs peak", "ea_student_refs": ["Brody", "Liam"] },
    { "time_slot": "9:30-10:30", "activity": "Literacy block", "ea_available": true, "ea_student_refs": ["Amira", "Daniyal", "Farid", "Imani", "Marco"] },
    { "time_slot": "10:30-10:45", "activity": "Snack break", "ea_available": true, "ea_student_refs": [] },
    { "time_slot": "10:45-11:45", "activity": "Science / Social Studies", "ea_available": true, "notes": "EA departs at noon - last full-support block", "ea_student_refs": ["Amira", "Brody", "Xavier"] },
    { "time_slot": "11:45-12:30", "activity": "Lunch", "ea_available": false },
    { "time_slot": "12:30-12:45", "activity": "Body break + transition to math", "ea_available": false, "notes": "Post-lunch transition - consistently hard per classroom notes" },
    { "time_slot": "12:45-1:45", "activity": "Math block", "ea_available": false, "notes": "No EA - teacher solo with 26 students, split grades" },
    { "time_slot": "1:45-2:00", "activity": "Afternoon recess transition", "ea_available": false },
    { "time_slot": "2:00-2:45", "activity": "Art / Music / Phys Ed", "ea_available": false },
    { "time_slot": "2:45-3:00", "activity": "Learning reflection + pack-up", "ea_available": false }
  ],
  "upcoming_events": [
    { "description": "New EAL student (Somali-speaking) starting", "event_date": "2026-04-07", "time_slot": "All day", "impacts": "Will need buddy assignment and visual schedule" }
  ]
}
```

- [ ] **Step 2.2: Verify the file parses as JSON and has exactly 26 students**

Run:
```bash
node -e "const c = require('./data/synthetic_classrooms/classroom_demo.json'); console.log('students:', c.students.length); console.log('ids:', c.students.map(s => s.student_id).join(',')); console.log('aliases:', c.students.map(s => s.alias).join(','));"
```

Expected output:
```
students: 26
ids: D1,D2,D3,D4,D5,D6,D7,D8,D9,D10,D11,D12,D13,D14,D15,D16,D17,D18,D19,D20,D21,D22,D23,D24,D25,D26
aliases: Amira,Brody,Chantal,Daniyal,Elena,Farid,Gabriel,Hannah,Imani,Jasper,Kiana,Liam,Maya,Navpreet,Oliver,Anaya,Quinn,Rania,Sebastián,Marco,Uyen,Violet,Wesley,Xavier,Nadia,Zayn
```

If any line differs, re-read the file and fix before proceeding.

- [ ] **Step 2.3: Verify the schedule EA references span 8 distinct students**

Run:
```bash
node -e "const c = require('./data/synthetic_classrooms/classroom_demo.json'); const refs = new Set(); c.schedule.forEach(s => (s.ea_student_refs || []).forEach(r => refs.add(r))); console.log('distinct ea refs:', Array.from(refs).sort().join(','));"
```

Expected output:
```
distinct ea refs: Amira,Brody,Daniyal,Farid,Imani,Liam,Marco,Xavier
```
(8 distinct names)

## Task 3 — Validate the JSON against the Zod schema via typecheck

**Files:** none (validation only).

The orchestrator's `ClassroomProfileSchema` in `packages/shared/schemas/classroom.ts` will reject the file at load time if its shape is wrong. The cheapest way to trigger that validation without booting the server is to run the workspace typecheck; separately, a server boot test confirms runtime Zod validation.

- [ ] **Step 3.1: Run typecheck**

Run:
```bash
npm run typecheck 2>&1 | tail -20
```
Expected: exit code 0, no errors. If TypeScript complains about anything in `packages/shared/schemas/classroom.ts` or the orchestrator, it means the JSON shape is inconsistent with `ClassroomProfileSchema`. Re-check Task 2.1 content.

- [ ] **Step 3.2: Programmatically parse the classroom through the real Zod schema**

Create a one-shot inline script and run it:
```bash
npx tsx -e "
import { readFileSync } from 'node:fs';
import { ClassroomProfileSchema } from './packages/shared/schemas/classroom.js';
const raw = JSON.parse(readFileSync('./data/synthetic_classrooms/classroom_demo.json', 'utf-8'));
const parsed = ClassroomProfileSchema.parse(raw);
console.log('parse ok, students:', parsed.students.length);
" 2>&1
```
Expected: `parse ok, students: 26`. If Zod throws, read the error path and fix the offending field in Task 2.1, then re-run.

## Task 4 — Run the unit test suite with the expanded classroom

**Files:** none (validation only).

- [ ] **Step 4.1: Run the full unit suite**

Run:
```bash
npm run test 2>&1 | tail -25
```
Expected: same pass/fail state as baseline from Step 1.3. No new failures. If any test regresses, investigate — the most likely failure mode is a test that mistakenly reads `classroom_demo.json` at runtime instead of using an inline fixture. If you find one, do NOT modify the test; stop and report back.

- [ ] **Step 4.2: Run lint**

Run:
```bash
npm run lint 2>&1 | tail -15
```
Expected: clean. JSON isn't linted, so this should be no-op relative to baseline — but running it catches any accidental whitespace drift or syntax issue.

## Task 5 — Commit the classroom JSON change

**Files:** none (git only).

- [ ] **Step 5.1: Stage only the classroom JSON file**

Run:
```bash
git add data/synthetic_classrooms/classroom_demo.json
git status --short data/synthetic_classrooms/classroom_demo.json
```
Expected: `M  data/synthetic_classrooms/classroom_demo.json`.

- [ ] **Step 5.2: Verify no other files are accidentally staged**

Run:
```bash
git diff --cached --name-only
```
Expected: exactly one line — `data/synthetic_classrooms/classroom_demo.json`. If anything else is staged, unstage it with `git reset HEAD <file>` before committing.

- [ ] **Step 5.3: Create the commit**

Run:
```bash
git commit -m "$(cat <<'EOF'
feat(demo): expand demo classroom roster to 26 students

Preserve the 6 existing aliases (Amira, Brody, Chantal, Daniyal,
Elena, Farid) and their support profiles byte-for-byte so seeded
plans and the scaffold-decay arc stay intact. Add 20 new students
with realistic Alberta K-6 demographic and support-profile
distribution: 4 new EAL students (Somali, Punjabi, Spanish,
Vietnamese home languages), 4 regulation/attention profiles, 2
extension profiles, 1 speech-language profile, and 9
typically-developing students with empty support_tags — important
so the fixture doesn't pathologize the class. Distribute schedule
ea_student_refs across 8 distinct students in the morning window
so the EA Load panel sees realistic demand pressure.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```
Expected: commit created successfully.

---

## Task 6 — Append 12 new intervention records to `seed.ts`

**Files:**
- Modify: `data/demo/seed.ts` (append inside the `interventions` array, after `int-demo-ch-12` and before the closing `];` on line 284)

The existing `interventions` array ends at line 284 with `];`. Chantal's scaffold-decay arc ends at `int-demo-ch-12` on line 282-283. We insert 12 new records between `int-demo-ch-12` and the closing bracket.

- [ ] **Step 6.1: Verify the insertion point**

Run:
```bash
sed -n '280,290p' data/demo/seed.ts
```
Expected output includes the closing lines of `int-demo-ch-12` and the `];` that terminates the `interventions` array. Write down the exact line number of the `];` closing — you'll use it as the insertion anchor.

- [ ] **Step 6.2: Edit `seed.ts` using the `Edit` tool**

Use `Edit` with the following parameters (preserving the Chantal record block's last three lines as context so `old_string` is unique):

`old_string`:
```typescript
    created_at: "2025-03-31T10:30:00.000Z",
    schema_version: SCHEMA_V,
  },
];
```

`new_string`:
```typescript
    created_at: "2025-03-31T10:30:00.000Z",
    schema_version: SCHEMA_V,
  },
  // ─── Full-roster interventions (2026-04 week) — referencing new aliases ────
  {
    record_id: "int-demo-020",
    classroom_id: CLASSROOM,
    student_refs: ["Imani"],
    observation:
      "Imani's first day. Sat quietly through morning meeting and appeared overwhelmed when the group moved to literacy centres — stood beside her desk watching the room. Followed other students to the carpet when Chantal gestured her over. Made eye contact briefly twice during the read-aloud. No verbal contribution but tracked the picture book with her eyes.",
    action_taken:
      "Placed visual schedule card on her desk before she arrived. Asked Chantal privately to model the morning routine — pack bag away, get pencil box, go to carpet — without explicit language instructions. Kept all verbal communication brief and paired with gestures or picture cues.",
    outcome:
      "Imani followed each step of the morning routine by end of day. No verbal English but she mimicked Chantal's actions accurately. Left with her belongings organized and a small smile. Follow-up: coordinate with settlement services for home-language support this week.",
    follow_up_needed: true,
    created_at: "2026-04-07T09:12:00.000Z",
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-021",
    classroom_id: CLASSROOM,
    student_refs: ["Imani", "Chantal"],
    observation:
      "During snack break, Chantal noticed Imani hesitating at the snack table — unfamiliar with the routine of grabbing a napkin first. Without being asked, Chantal walked over and demonstrated: napkin, snack, sit at the round table. Imani followed exactly. They sat together for the rest of snack.",
    action_taken:
      "Observed without intervening. At end of snack, quietly acknowledged Chantal privately: 'That was kind and exactly right — you taught without making her feel watched.' Did not make it a classroom announcement.",
    outcome:
      "Chantal's peer mentor role (see int-demo-006, Mar 26) extends naturally to the new arrival. Imani has a clear ally for routine questions. Mental note: Chantal's informal support is saving many teacher interventions per day during Imani's first week.",
    follow_up_needed: false,
    created_at: "2026-04-08T10:45:00.000Z",
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-022",
    classroom_id: CLASSROOM,
    student_refs: ["Liam"],
    observation:
      "Liam didn't follow the post-lunch transition back to math. Continued playing with a puzzle at his choice station even after the whole class had moved to their desks. Not defiant — visibly absorbed. First time observing this specific pattern; usually his attention drift is at morning transitions.",
    action_taken:
      "Walked to his station, tapped twice on the puzzle box, said 'Liam, math in 60 seconds — finish or pause.' Gave a visible countdown on fingers. Liam paused the puzzle at 30 seconds and moved to his desk without argument.",
    outcome:
      "Liam settled into math within a minute of sitting down. Noted that the 60-second countdown worked better than the usual 2-minute advance notice at this time of day. Try the shorter countdown as a standing afternoon support.",
    follow_up_needed: true,
    created_at: "2026-04-08T12:47:00.000Z",
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-023",
    classroom_id: CLASSROOM,
    student_refs: ["Maya"],
    observation:
      "Maya finished the literacy grammar worksheet in 10 minutes — the class had 25. Came to the front quietly and asked 'do you have anything else I could do?' without interrupting the students still working.",
    action_taken:
      "Pulled out the independent extension menu (prepared last week for moments like this) and offered the poetry-analysis option, which she had flagged as interesting. Set it on her desk and said 'try as much as you want; tell me if you get stuck.'",
    outcome:
      "Maya worked on the poetry analysis for the remaining 15 minutes. Produced a thoughtful paragraph on imagery. Independent engagement the whole time. The extension menu is finally working at the pace we hoped for.",
    follow_up_needed: false,
    created_at: "2026-04-08T09:52:00.000Z",
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-024",
    classroom_id: CLASSROOM,
    student_refs: ["Quinn"],
    observation:
      "Math fact practice sheet — 20 questions, 5 minutes. Quinn completed 3 questions then put her pencil down and stared at the paper. When I walked by she whispered 'I keep thinking I'll get one wrong.' Conceptual understanding is fine; the issue is the weight she's putting on each attempt.",
    action_taken:
      "Reframed the sheet as a draft: 'This isn't graded. Draw a little D in the corner. The D means draft. Drafts can be wrong — that's how you find what to practice.' Took back the sheet, wrote D in the corner, and handed it back.",
    outcome:
      "Quinn completed 17 of 20 questions in the remaining time. 16 correct. Said 'I didn't know practice could be a draft' at the end of class. The framing matters; she needs written permission to be wrong on practice work.",
    follow_up_needed: true,
    created_at: "2026-04-09T10:22:00.000Z",
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-025",
    classroom_id: CLASSROOM,
    student_refs: ["Marco"],
    observation:
      "Marco signed up for next Friday's class share (oral report on a book he chose). He flagged three words to the SLP at last week's consult as ones he worries about mispronouncing: 'expedition,' 'archaeologist,' and 'hieroglyph.' Today he practiced reading his draft report to me at his desk.",
    action_taken:
      "Pre-taught the three flagged words using the SLP's suggested sequence: break into syllables, hum the rhythm, then say it. Practiced each word three times. Had him read the draft once with me following along silently.",
    outcome:
      "Marco read the draft fluently, including the three flagged words. He said 'I don't feel the throat tightness on archaeologist anymore.' Sharing is next Friday — repeat the preview on Thursday. Follow-up: confirm SLP consult schedule covers next week.",
    follow_up_needed: true,
    created_at: "2026-04-09T11:35:00.000Z",
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-026",
    classroom_id: CLASSROOM,
    student_refs: ["Xavier"],
    observation:
      "Xavier started the journal writing task at his seat and within 5 minutes was squirming and tapping his feet loudly. First instinct was to redirect, but remembered the standing option I'd set up at the side counter.",
    action_taken:
      "Walked over quietly and said 'Xavier, you can take your journal to the standing spot if you want.' Pointed to the counter. Didn't make it conditional on his behaviour — made it a choice.",
    outcome:
      "Xavier moved to the standing spot within 10 seconds. Completed a full journal entry (6 sentences, his longest in two weeks) over the remaining 15 minutes. Came back to his desk calmly at the end of the block. The standing option is working — make it a permanent fixture, not an intervention.",
    follow_up_needed: false,
    created_at: "2026-04-09T09:45:00.000Z",
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-027",
    classroom_id: CLASSROOM,
    student_refs: ["Sebastián"],
    observation:
      "Sebastián stalled on a word problem during math. Similar profile to what we see with Amira (int-demo-002, Mar 21): the math was clear to him, but the English phrasing was blocking the entry. He read the problem aloud twice and said quietly 'I know what to do but I can't find the words.'",
    action_taken:
      "Sat beside him and offered the same sentence frame card ('First I need to find ___, then I need to ___') that we use with Amira. No one in class shares Spanish, so paired him with Farid as a verbal-first thinking partner — Farid's approach of 'say it aloud before you write' translated well across languages.",
    outcome:
      "Sebastián wrote three sentences of working, solved the problem correctly, and the final answer was in English with a Spanish annotation next to it ('= cinco'). Kept the Spanish annotation intact — it's his thinking, not an error. Pattern match with Amira's language-scaffolding need is strong.",
    follow_up_needed: false,
    created_at: "2026-04-10T10:08:00.000Z",
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-028",
    classroom_id: CLASSROOM,
    student_refs: ["Navpreet", "Farid"],
    observation:
      "During vocabulary work for this week's social studies unit (community roles), Navpreet and Farid chose to pair up at the same table without being assigned. Navpreet's spoken English is stronger than Farid's; Farid's reading comprehension is stronger than Navpreet's. They took turns reading definitions and Navpreet helped Farid pronounce 'municipality' and 'council' after the third attempt.",
    action_taken:
      "Observed from a distance. Did not interrupt. At the end of the period, made a brief note to pair them again on Thursday for the vocabulary quiz practice.",
    outcome:
      "Both students produced correct vocabulary matching sheets. Navpreet's written work was more complete than usual (he stayed focused to explain concepts to Farid) and Farid's pronunciation of the two target words improved. Mutual benefit — this pairing is worth repeating.",
    follow_up_needed: false,
    created_at: "2026-04-10T09:30:00.000Z",
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-029",
    classroom_id: CLASSROOM,
    student_refs: ["Zayn"],
    observation:
      "Zayn arrived at his desk before the morning bell and immediately pulled out his laminated desk checklist (5 items: bag away, pencil box out, agenda open, water bottle on desk, check carpet number). He worked through all five items without prompting and sat ready before the bell rang. First fully independent morning setup since I introduced the laminated checklist.",
    action_taken:
      "Did not draw attention to it — acknowledged him with a small nod and a quiet 'good start today' at his desk. Kept the routine private so it stays his own accomplishment rather than something performed for adults.",
    outcome:
      "Zayn stayed regulated for the entire morning block. The laminated checklist is load-bearing for his morning setup; do not remove it, do not replace it with verbal reminders. Monday will be the test — do the same setup before he arrives.",
    follow_up_needed: false,
    created_at: "2026-04-10T08:38:00.000Z",
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-030",
    classroom_id: CLASSROOM,
    student_refs: ["Uyen"],
    observation:
      "Uyen's third week. Recess transition back to the classroom was overwhelming — she stood at the doorway holding her coat, visibly tense, not moving. Other students walked around her. She appeared to not know where to hang her coat despite having done so successfully the previous two days. Sensory overwhelm, not forgetting.",
    action_taken:
      "Walked to the doorway, took her coat without comment, hung it in her spot, and pointed to her desk. She followed, sat down, and took three minutes to resettle. Did not ask her to explain.",
    outcome:
      "Uyen resettled within 5 minutes and engaged with the literacy block. Note for tomorrow: pair her with Imani on the way back from recess this week — they're both still in the routine-learning window and can anchor each other. Follow-up: confirm whether hallway noise is a specific trigger for her.",
    follow_up_needed: true,
    created_at: "2026-04-11T10:28:00.000Z",
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-031",
    classroom_id: CLASSROOM,
    student_refs: ["Wesley"],
    observation:
      "Wesley finished the grade 4 multiplication worksheet (12 questions) in 8 minutes with every answer correct. Sat at his desk drawing number patterns on scrap paper while the rest of the class continued. When I walked by, he asked 'is there a harder version?'",
    action_taken:
      "Pulled the grade 5 multi-step pattern problem I'd been saving for him (prime numbers and sequences — extends well beyond the grade 4 curriculum). Offered it as a 'try it and show me what you think' task, not an assigned piece. Sat with him for 30 seconds to read the question together.",
    outcome:
      "Wesley solved it in 12 minutes, with a correct written explanation. His reasoning was more structured than I expected — he identified the pattern in two steps and checked his work. Worth documenting as an anchor observation for the GATE program conversation with the resource teacher. Not a referral yet — an observation.",
    follow_up_needed: false,
    created_at: "2026-04-12T13:10:00.000Z",
    schema_version: SCHEMA_V,
  },
];
```

- [ ] **Step 6.3: Verify the edit placed the records in the right location**

Run:
```bash
grep -n "int-demo-" data/demo/seed.ts | head -40
```
Expected: you should see IDs `int-demo-001` through `int-demo-008`, then `int-demo-ch-01` through `int-demo-ch-12`, then `int-demo-020` through `int-demo-031`. All 32 records total. If the grep shows anything out of order or missing an ID, inspect `data/demo/seed.ts` and fix before continuing.

- [ ] **Step 6.4: Verify the `interventions` array is still a single well-formed array**

Run:
```bash
node -e "process.env.NO_RUN = '1';" && npx tsx -e "
import { readFileSync } from 'node:fs';
const src = readFileSync('./data/demo/seed.ts', 'utf-8');
const openBrackets = (src.match(/const interventions: InterventionRecord\[\] = \[/g) || []).length;
const closingMatches = src.match(/^\\];$/gm) || [];
console.log('interventions array opens:', openBrackets);
console.log('top-level array closings:', closingMatches.length);
" 2>&1
```
Expected: `interventions array opens: 1`. If 0 or 2, the edit mangled the array structure — re-read the file around the insertion point and fix.

## Task 7 — Typecheck and lint seed.ts

**Files:** none (validation only).

- [ ] **Step 7.1: Typecheck**

Run:
```bash
npm run typecheck 2>&1 | tail -20
```
Expected: exit 0, no errors. If TypeScript complains, it's almost certainly a quote-escaping or syntax mistake in one of the 12 new records. Read the error and fix the exact field.

- [ ] **Step 7.2: Lint**

Run:
```bash
npm run lint 2>&1 | tail -15
```
Expected: clean. Common issue: long observation strings triggering an `max-len` rule. If so, the rule should already be disabled for `seed.ts` (existing records are long); if it's not, the error will tell you which line.

## Task 8 — Run the unit test suite

**Files:** none (validation only).

- [ ] **Step 8.1: Run the full unit suite**

Run:
```bash
npm run test 2>&1 | tail -25
```
Expected: same pass/fail state as baseline from Step 1.3. No new failures. Seed.ts itself is not imported by any orchestrator or memory test — it's a runnable script, not a library — so failures here would only come from a typecheck regression that tsc didn't catch (unlikely) or from an import that now has a type mismatch (also unlikely).

## Task 9 — Commit the seed.ts change

**Files:** none (git only).

- [ ] **Step 9.1: Stage only seed.ts**

Run:
```bash
git add data/demo/seed.ts
git diff --cached --name-only
```
Expected: exactly one line — `data/demo/seed.ts`.

- [ ] **Step 9.2: Create the commit**

Run:
```bash
git commit -m "$(cat <<'EOF'
feat(demo): add 12 full-roster intervention records to demo seed

Append int-demo-020 through int-demo-031 to the interventions array
without touching any of the existing 20 records or Chantal's
scaffold-decay arc (int-demo-ch-01 through int-demo-ch-12). Dates
cluster 2026-04-07 through 2026-04-12 so the Today panel sees a
full recent-week of material for the new aliases: Imani, Liam,
Maya, Quinn, Marco, Xavier, Sebastián, Navpreet, Zayn, Uyen, and
Wesley. Records follow the established voice of the seeded demo
(specific, concrete, human, non-clinical). Seeded pattern report
and plans are unchanged — runtime regeneration of pattern reports
will see the expanded history and produce richer themes.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Task 10 — Rebuild the SQLite memory DB by running the seed

**Files:**
- Modify (via running seed): `data/memory/demo-okafor-grade34.sqlite` (gitignored — not committed).

The seed script uses `INSERT OR REPLACE` on every table (see `services/memory/store.ts:22-23`, `:43-44`, etc.), so running it against the existing DB is safe. All 20 original records get re-upserted; the 12 new records get inserted for the first time.

- [ ] **Step 10.1: Run the seed script**

Run:
```bash
npx tsx data/demo/seed.ts 2>&1 | tail -40
```

The final summary block reports the literal count of records the seed script itself defines (not the DB row total), so expected tail output is:
```
  Interventions:    32
  Plans:            3
  Pattern reports:  1
  Family messages:  1 (approved)

  DB: data/memory/demo-okafor-grade34.sqlite
```

The specific number to verify here is `Interventions: 32` (was 20). If you see 20, the edit in Task 6 didn't actually add records — re-check `seed.ts`. Plans, pattern reports, and family messages stay at 3/1/1 because this plan intentionally does not touch those sections of the seed.

- [ ] **Step 10.2: Confirm the memory DB absorbed the 12 new intervention records**

Run:
```bash
npm run memory:admin -- summary --classroom demo-okafor-grade34 2>&1 | tail -80
```

The seed script uses `INSERT OR REPLACE` keyed on `record_id`. So after re-seeding:
- All 20 old seed record IDs (`int-demo-001` through `int-demo-008`, `int-demo-ch-01` through `int-demo-ch-12`) get replaced in place — the total row count does NOT increase for these.
- All 12 new seed record IDs (`int-demo-020` through `int-demo-031`) are new rows — the total row count increases by exactly 12.
- Any live-session intervention records already in the DB with different IDs stay untouched.

**Expected:** `interventions.count` equals `BASELINE_INTERVENTIONS + 12` from Step 1.2. If the baseline was 77, the new count should be 89. If the baseline was something else, add 12 to that number and verify.

If the delta is less than 12, some of the new `int-demo-020`..`int-demo-031` IDs collided with existing rows — which would indicate the seed has been run with partial content before, or someone else added records with overlapping IDs. Report this back rather than trying to fix it silently.

Plans, pattern reports, and family messages counts should be **unchanged** from Step 1.2 (seed.ts doesn't touch their record IDs in this plan).

## Task 11 — End-to-end validation (release gate)

**Files:** none (validation only).

The release gate is slower than unit tests but is the canonical end-to-end check per CLAUDE.md:249. It exercises the orchestrator's live classroom loader against the rewritten JSON, meaning any Zod validation failure at server startup will show up here.

- [ ] **Step 11.1: Run the mock-lane release gate**

Run:
```bash
npm run release:gate 2>&1 | tail -30
```
Expected: all stages pass. Duration: a few minutes. If any stage fails, read the artifact path the gate prints (under `output/release-gate/<timestamp>/`) and report the failure back — do not try to hot-fix without understanding what broke.

- [ ] **Step 11.2: If the release gate passed, no commit is needed**

The release gate writes artifacts to `output/release-gate/` which is gitignored. There's nothing to commit from this task; it is pure validation.

## Task 12 — Manual UI smoke test

**Files:** none (manual QA).

Per CLAUDE.md's UI rule: "For UI or frontend changes, start the dev server and use the feature in a browser before reporting the task as complete." This plan's changes are data-layer, but the whole point of the seed expansion is to be visible in the UI — so a manual spot-check is warranted.

- [ ] **Step 12.1: Start the dev stack in the background**

Run:
```bash
npm run dev 2>&1 &
```
Or if there's no combined dev command, start the three services individually per `README.md`. Wait for all three (web, orchestrator, inference) to report listening.

- [ ] **Step 12.2: Open the demo classroom in a browser**

Navigate to `http://localhost:5173/?demo=true&tab=today` (the `demo=true` shortcut loads the demo classroom without requiring a code).

- [ ] **Step 12.3: Spot-check five panels**

Confirm visually:
- **Today panel** — shows recent-week activity; look for at least one mention of a new alias (Imani, Liam, Maya, Quinn, Marco, Xavier, Sebastián, Navpreet, Zayn, Uyen, or Wesley) surfaced from the Apr 7-12 intervention cluster.
- **Student Summary panel** (if present in navigation) — shows 26 entries.
- **EA Load panel** — morning blocks should reference a mix of old and new aliases (Amira, Daniyal, Imani, Brody, Liam, Farid, Marco, Xavier).
- **Survival Packet panel** — the generated packet enumerates 26 students with their tags/scaffolds.
- **Forecast panel** — risk-scoring reflects the expanded roster.

Expected: every panel renders cleanly, no console errors, no 500 responses in the orchestrator logs. If any panel crashes or renders obviously wrong, capture the error and stop.

- [ ] **Step 12.4: Stop the dev stack**

Bring the backgrounded `npm run dev` to the foreground (or `kill` it) and confirm it stopped cleanly.

## Task 13 — Update `CLAUDE.md` current-state line (if needed)

**Files:**
- Modify: `CLAUDE.md` (potentially — only if a line explicitly references the demo student count)

- [ ] **Step 13.1: Check for a stale demo-roster claim in CLAUDE.md**

Run:
```bash
grep -n "demo-okafor\|6 students\|24 students" CLAUDE.md 2>&1
```
Expected: no matches for "6 students" or "24 students" in the context of the demo classroom. If a match exists, read its surrounding paragraph. If it's describing the demo roster size, update the number to `26` (or more general language). If it's historical context, leave it alone.

- [ ] **Step 13.2: If an update was needed, stage and commit**

Only if Step 13.1 required a change:
```bash
git add CLAUDE.md
git diff --cached CLAUDE.md
```
Review the diff — confirm it changes only the roster-count phrase and no other text. Then:
```bash
git commit -m "$(cat <<'EOF'
docs(claude-md): update demo roster count to 26 students

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

If Step 13.1 found no match, skip this commit and proceed.

## Task 14 — Final status report

**Files:** none.

- [ ] **Step 14.1: Summarize the state of the work**

Report back to the user with:
1. The commit count created by this plan (normally 2, possibly 3 if Task 13 fired).
2. The final memory DB row counts: interventions (32), plans (3), pattern reports (1), family messages (1).
3. Whether the release gate passed and how long it took.
4. Any panel anomalies observed during the manual smoke test.
5. Anything that was easier or harder than the plan predicted — so this plan can be improved for future similar seed expansions.

---

## Appendix A — File-by-file summary

| File                                               | Change type | Net effect |
|----------------------------------------------------|-------------|------------|
| `data/synthetic_classrooms/classroom_demo.json`    | Rewrite     | 6 → 26 students; 3 schedule blocks get expanded `ea_student_refs`; `classroom_notes[0]` updated to "26 students". |
| `data/demo/seed.ts`                                | Append only | 12 new intervention records appended to `interventions` array; all existing records and sections untouched. |
| `data/memory/demo-okafor-grade34.sqlite`           | Rebuilt     | Gitignored. `INSERT OR REPLACE` semantics ensure idempotent rebuild. |
| `CLAUDE.md` (possibly)                             | Minor edit  | Only if a line explicitly references demo roster size. |

## Appendix B — Known-good commit sequence

After running the plan to completion, `git log --oneline -5` should show (commits listed newest-first, possibly with unrelated pre-existing commits above):

```
<hash> docs(claude-md): update demo roster count to 26 students  [only if Task 13 fired]
<hash> feat(demo): add 12 full-roster intervention records to demo seed
<hash> feat(demo): expand demo classroom roster to 26 students
<hash> <pre-existing commit on main>
```

## Appendix C — Rollback plan

If something goes badly wrong and the user asks to revert:

```bash
# Identify the commits this plan created:
git log --oneline --grep="demo classroom roster\|full-roster intervention" -5

# Revert in reverse order (no force-pushing; safe revert commits):
git revert <seed.ts-commit-hash> --no-edit
git revert <json-commit-hash> --no-edit

# Rebuild the memory DB against the reverted files:
npx tsx data/demo/seed.ts
```

The SQLite memory file will still contain the 12 extra intervention records after this rollback because seed.ts uses `INSERT OR REPLACE` rather than deleting unmapped rows. If a clean rollback is required, delete `data/memory/demo-okafor-grade34.sqlite*` before re-running the seed (the file is gitignored, so no repo damage).
