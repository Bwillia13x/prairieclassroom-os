# Future Development — PrairieClassroom OS

## Status

This document is now a historical feature-ideation inventory.

Several capabilities described below have since shipped, so this file should not be treated as the active roadmap or as the current-state source of truth.

Use these documents for active planning and current behavior instead:

- `docs/plans/2026-04-22-strategic-roadmap.md` — active sequencing and next-phase priorities
- `README.md` — current operator reality
- `docs/spec.md` — product scope and success criteria
- `docs/architecture.md` — implemented system shape

## Purpose

This document originally mapped out six novel capabilities that would extend PrairieClassroom OS beyond its early MVP into a system that treats classroom complexity as a dynamic, forecastable, and actively manageable signal.

It remains useful as historical product thinking and architectural rationale, but not as the canonical backlog.

Each capability builds on the existing architecture — Gemma routing, SQLite memory, intervention logs, pattern detection — without violating any safety boundaries defined in `safety-governance.md`.

## Priority ranking

The ranking below reflects the original prioritization at the time this document was written:

| Priority | Capability | Novelty | Real-world impact | Implementation cost |
|----------|-----------|---------|-------------------|---------------------|
| 1 | Complexity Weather Forecast | Highest | High | Medium |
| 2 | Substitute Teacher Survival Packet | High | Highest | Medium |
| 3 | Scaffold Decay Detection | Highest | High | Low–Medium |
| 4 | Complexity Debt Register | Medium | High | Low |
| 5 | EA Cognitive Load Balancer | High | High | Medium |
| 6 | Cross-Adult Handoff Protocol | High | High | Medium–High |

---

## 1. Complexity Weather Forecast

**Status:** Implemented -- Sprint 14. See `docs/prompt-contracts.md` Contract I and `services/orchestrator/complexity-forecast.ts`.

### Problem

Classroom complexity fluctuates minute-to-minute based on overlapping factors — schedule disruptions, EA availability windows, student energy patterns, lesson transitions, external events. Teachers hold this entire model in their heads. Nobody externalizes it.

### Insight

Classroom complexity is a forecastable, multi-dimensional signal. Treating it as such transforms every downstream workflow — tomorrow plans gain temporal coordinates, EA briefings gain sequencing logic, and pattern detection gains causal structure.

### How it works

The system synthesizes known schedule data, intervention history patterns, EA availability windows, upcoming events (assemblies, fire drills, new student arrivals), and historical classroom memory into a per-block complexity forecast for the next day.

### Example output

```
Complexity Forecast — Tomorrow, January 24
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8:30–9:15   LOW    — Morning routine, full EA, familiar content
9:15–9:30   HIGH   — Recess transition + new EAL student's first day
9:30–10:30  MED    — Math block, but 3 students need different levels
10:30–11:00 HIGH   — EA leaves for other classroom, 2 IPP reviews due
11:00–11:45 MED    — Literacy, structured activity, EA returns
12:30–1:00  HIGH   — Post-lunch transition, historically worst block
1:00–2:30   LOW    — Art block, high engagement, full support
```

### Architecture fit

- **Model tier:** Planning (27b, thinking on)
- **Inputs:** Intervention history, classroom schedule, EA availability, event calendar, classroom profile
- **Outputs:** Per-block complexity rating with contributing factors
- **Retrieval:** Yes — historical intervention patterns by time-of-day and day-of-week
- **Persistence:** Yes — forecasts are saved and compared against actual outcomes to improve future predictions
- **Downstream consumers:** Tomorrow Plan (complexity-aware scheduling), EA Briefing (load-aware sequencing)

### Key design questions

- How granular should time blocks be? (15 min? 30 min? Activity-based?)
- Should the forecast feed directly into Tomorrow Plan generation, or remain a separate advisory output?
- How is the classroom schedule ingested? (Manual entry? Calendar import? Recurring template?)
- How should forecast accuracy be measured over time?

### Safety considerations

- Complexity ratings describe classroom conditions, not student behavior
- No individual student is identified as a "complexity driver"
- Language must remain operational ("this block has overlapping demands") not judgmental ("this block will be chaotic")

---

## 2. Substitute Teacher Survival Packet

### Problem

When a teacher is absent, the substitute walks into a room full of invisible complexity. They don't know that Student A needs a visual timer, Student B's EA arrives at 10:30, the afternoon routine changed last week, or that three families need communication in Punjabi. The classroom memory that makes PrairieClassroom powerful becomes inaccessible at the exact moment it's most needed.

### Insight

This is the first opportunity for classroom memory to become transferable between adults without requiring the teacher to write a novel the night before they're sick. The system already holds everything the substitute needs — it just needs a new output mode.

### How it works

One-click generation of a structured briefing packet that synthesizes:

1. **Classroom routines and recent changes** — daily schedule, transition protocols, any modifications from the past week
2. **Active support plans** — anonymized to student aliases, with current scaffolds and strategies
3. **EA schedule and coordination notes** — arrival/departure times, which students, handoff expectations
4. **Adjusted day plan** — today's plan simplified for substitute capabilities (pre-differentiated materials flagged, complex transitions simplified)
5. **Family communication status** — who is expecting a message, who should not be contacted, language preferences
6. **Known complexity peaks** — which blocks require the most attention and why

### Example output

```
Substitute Briefing — Mrs. Okafor's Grade 3/4 Split
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ROUTINES
- Morning: Students enter, unpack, read independently until 8:45
- Changed this week: Math moved from Block 2 to Block 3
- Post-lunch: 5-minute calm-down before instruction (non-negotiable)

STUDENT SUPPORT (5 active plans)
- Student A: Visual timer for transitions. Sits near door.
- Student B: EAL — arrives with translated instructions. 
  Check-in after each task transition.
- Student C: Needs chunked worksheets (pre-printed, blue folder)
- Student D: EA-supported 9:30–12:00 only
- Student E: Extension activities in green folder when finished early

EA COORDINATION
- EA arrives 9:30, departs 12:00
- Primary support: Students B and D
- If EA is late: Student D can work independently on math review

TODAY'S PLAN (simplified)
- Use pre-differentiated packets in labeled folders
- Skip the group rotation in Block 3 — use whole-class instead
- Afternoon art: materials are pre-set, instructions on whiteboard

FAMILY COMMS
- Do NOT contact Student B's family (teacher handling directly)
- Student D's family expects a weekly check-in (Punjabi) — defer to teacher

HEADS UP
- 10:30–11:00 is typically the hardest block (EA leaves, 
  energy peaks, content is new)
- Fire drill scheduled for Thursday — if today is Thursday, 
  warn Student A 10 minutes before
```

### Architecture fit

- **Model tier:** Planning (27b, thinking on)
- **Inputs:** All memory sources — interventions, patterns, plans, family comms, classroom profile, schedule
- **Outputs:** Structured briefing document with sections
- **Retrieval:** Yes — comprehensive pull from all classroom memory
- **Persistence:** Yes — packet is saved as a dated artifact
- **Approval gate:** Teacher must pre-authorize packet generation. Teacher can set a "sub-ready" flag or generate on demand before an absence.

### Key design questions

- Should the packet be generated proactively (e.g., every Sunday night for the week ahead) or on-demand?
- What level of detail is appropriate? Too much overwhelms the substitute; too little defeats the purpose.
- Should the packet include a "if things go sideways" section with de-escalation strategies from intervention history?
- How is the packet delivered? (Printed? Shared link? Both?)

### Safety considerations

- No raw intervention notes — only synthesized operational guidance
- Student aliases only (consistent with existing safety rules)
- Teacher controls what is shared — the system does not autonomously expose classroom memory to a substitute
- Family communication section explicitly flags what NOT to do

---

## 3. Scaffold Decay Detection

### Problem

When a support strategy works for a student, teachers keep using it indefinitely. But students grow. The scaffold that was essential in September may be holding a student back by February. Educational technology universally adds supports — nobody helps remove them.

### Insight

This is anti-scaffolding: the system actively works to make its own recommendations less necessary for each student. It operationalizes something Alberta's inclusive education framework explicitly values — building student independence — by detecting when supports have outlived their usefulness.

### How it works

The existing `support-patterns` workflow already analyzes 5–20 intervention records for recurring themes. Extend it to detect diminishing-need signals:

- A scaffold mentioned frequently in early records but rarely in recent ones
- Intervention notes that describe success without the scaffold ("didn't need the visual today")
- A student succeeding in contexts where the scaffold isn't present
- Teacher notes that question whether the scaffold is still needed

When detected, the system suggests a gradual withdrawal plan — not abrupt removal, but phased reduction with reassessment checkpoints.

### Example output

```
Scaffold Review — Student C
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Visual timer for transitions

Usage trend:
  Sept–Nov: mentioned in 12 of 15 interventions
  Dec–Jan:  mentioned in 3 of 10 interventions

Positive signals:
  - 2 recent notes describe successful transitions without timer
  - Timer not mentioned in any afternoon interventions (structured blocks)
  - EA noted "C self-managed the math transition today"

Suggested withdrawal plan:
  Phase 1: Remove timer during structured afternoon blocks (2 weeks)
  Phase 2: Remove during familiar morning transitions (2 weeks)
  Phase 3: Maintain only for high-complexity transitions (assembly days, 
           schedule changes). Reassess after 2 weeks.

  If regression is observed at any phase, return to previous phase
  and hold for 2 additional weeks before retrying.
```

### Architecture fit

- **Model tier:** Planning (27b, thinking on)
- **Inputs:** Intervention history for a specific student over time, current support plan
- **Outputs:** Scaffold usage trend analysis + phased withdrawal suggestion
- **Retrieval:** Yes — time-windowed intervention queries
- **Persistence:** Yes — scaffold reviews are logged as a new record type
- **Downstream consumers:** Tomorrow Plan can incorporate withdrawal phase into daily support priorities

### Key design questions

- What is the minimum record count before scaffold decay can be detected? (10? 15? 20?)
- Should decay detection run automatically on pattern report generation, or be triggered separately?
- How should the system handle conflicting signals (scaffold mentioned less, but student outcomes aren't clearly improving)?
- Should withdrawal plans have configurable phase durations?

### Safety considerations

- The system suggests — the teacher decides. Withdrawal plans are never automatic.
- Language is observational: "Your records show decreasing use of..." not "Student C no longer needs..."
- No implication that the scaffold was wrong to begin with
- Regression detection is built into the plan (return to previous phase)
- This is explicitly NOT a diagnosis of student capability — it's a reflection of the teacher's own documented observations

---

## 4. Complexity Debt Register

### Problem

Like technical debt in software, classrooms accumulate complexity debt — unresolved follow-ups, overdue family contacts, pattern insights that were noted but never acted on, scaffolds that should have been reviewed weeks ago. This debt is invisible until something breaks: a parent complains, a student regresses, or an IPP review reveals gaps.

### Insight

This reframes classroom management from reactive (deal with what's in front of you) to proactive (see what's accumulating before it compounds). It's the first system that treats classroom operational health as something that can be measured and maintained.

### How it works

The system continuously scans classroom memory for:

- **Stale follow-ups:** Intervention records with follow-up actions that were never completed
- **Overdue communications:** Family messages drafted or approved but not confirmed sent
- **Unaddressed patterns:** Pattern report recommendations older than a configurable threshold with no corresponding plan action
- **Recurring unresolved issues:** Support priorities that appear in consecutive tomorrow plans without resolution
- **Approaching deadlines:** IPP review dates, report card periods, or other known milestones approaching without recent relevant documentation

### Example output

```
Complexity Debt — Mrs. Okafor's Grade 3/4 Split
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FOLLOW-UPS (3 older than 5 days)
  - Student B: Math scaffold review (logged Jan 15, 8 days ago)
  - Student D: Family check-in re: attendance (logged Jan 12, 11 days ago)
  - Student A: Transition strategy reassessment (logged Jan 10, 13 days ago)

PATTERNS UNADDRESSED (1)
  - "Afternoon literacy block consistently produces off-task behavior
     for 3 students" — detected Jan 8, no plan action since

APPROACHING DEADLINES (1)
  - Student E: IPP review due Jan 28 (5 days)
    Recent documentation: 2 relevant intervention records available
    Suggested: Log 1–2 more observations before review

CONSECUTIVE PLAN ITEMS (1)
  - "Regroup with EA about morning math support" has appeared
    in 3 consecutive tomorrow plans without resolution

DEBT TREND
  Week of Jan 6:  ██░░░░░░ 2 items
  Week of Jan 13: ████░░░░ 4 items
  Week of Jan 20: ██████░░ 6 items  ← accumulating
```

### Architecture fit

- **Model tier:** Live (4b) for scanning and categorization; planning (27b) for trend analysis and suggestions
- **Inputs:** All persisted records — interventions, plans, family messages, pattern reports
- **Outputs:** Categorized debt register with aging and trend
- **Retrieval:** Yes — temporal queries across all record types
- **Persistence:** No — the register is always computed fresh from current state (avoids stale debt-about-debt)
- **Downstream consumers:** Tomorrow Plan can prioritize debt resolution. EA Briefing can flag overdue items relevant to EA.

### Key design questions

- How old is "stale"? Should thresholds be configurable per category?
- Should the debt register be surfaced proactively (e.g., at morning login) or on-demand?
- How to avoid the register itself becoming a source of guilt/stress? Framing matters.
- Should debt items have a "dismiss with reason" option (e.g., "discussed in person, no record needed")?

### Safety considerations

- The register reflects the teacher's own documented actions and omissions — it does not infer what should have been done
- Language is supportive, not accusatory: "These items may benefit from attention" not "You forgot to..."
- No student is labeled as "a debt item" — the debt is about operational follow-through, not student behavior
- Teachers can dismiss items with a reason, which is itself a form of documentation

---

## 5. EA Cognitive Load Balancer

**Status:** Implemented — 2026-04-12. See `docs/prompt-contracts.md` Contract I2 and `services/orchestrator/ea-load.ts`. Full end-to-end surface: shared schema, orchestrator route (`/api/ea-load`, teacher+EA scope), Python prompt builder + mock fixture, three eval cases (`eal-001-schema`, `eal-002-safety`, `eal-003-prompt-injection`), and a 12th web panel (`EALoadPanel`).

### Problem

Educational assistants in Alberta typically support 3–5 students across the day, often floating between classrooms. Their cognitive load is invisible — to the system, to the teacher, and often to the EA themselves. An EA who has had three back-to-back high-intensity support sessions is less effective in the fourth, but nobody tracks this.

### Insight

EAs are treated as static resources ("assigned to Student X") when they are dynamic human beings whose effectiveness degrades under sustained load. Making EA cognitive load visible transforms scheduling from "fill the slots" to "optimize for human capacity."

### How it works

The system models EA load as a function of:

- **Number of students supported per block** — more students = higher load
- **Support intensity** — derived from intervention history (a student with frequent high-intensity notes implies higher load)
- **Transition complexity** — moving between classrooms or switching students adds load
- **Break schedule** — recovery time between high-load blocks matters
- **Historical patterns** — which blocks historically produce the most EA interventions

The Tomorrow Plan already generates EA action items. This adds a load profile that highlights overloaded blocks and suggests redistribution.

### Example output

```
EA Load Profile — Tomorrow
━━━━━━━━━━━━━━━━━━━━━━━━━━

8:30–9:15   LOW    — 1 student, familiar routine
9:15–9:30   —      — Transition (no direct support)
9:30–10:30  HIGH   — 3 students, new content, post-transition
10:30–11:00 HIGH   — 2 students + float to Room 204
11:00–11:30 BREAK
11:30–12:30 MED    — 2 students, structured activity
12:30–1:00  —      — Lunch
1:00–2:00   MED    — 1 student, familiar content
2:00–2:30   LOW    — Prep/documentation time

ALERT: 9:30–11:00 is 90 minutes of continuous high load
with no recovery break.

Suggestion: Move vocab card activity to independent work
at 9:30 (Student B can self-manage with pre-printed cards).
Shift EA to math support at 10:00. This creates a 30-minute
lower-intensity window before the Room 204 float.
```

### Architecture fit

- **Model tier:** Live (4b) for load calculation; planning (27b) for redistribution suggestions
- **Inputs:** EA schedule, classroom profile, intervention history (intensity signals), tomorrow plan EA actions
- **Outputs:** Per-block load profile + redistribution suggestions
- **Retrieval:** Yes — historical intervention frequency and intensity by time block
- **Persistence:** No — computed fresh each time Tomorrow Plan generates
- **Downstream consumers:** Tomorrow Plan (integrated load-aware EA actions), EA Briefing (load-aware pacing guidance)

### Key design questions

- How is "support intensity" quantified from intervention records? (Frequency? Duration? Teacher-rated?)
- Should the EA have input into their own load profile? (Self-reported energy, preferences)
- How to handle multi-classroom EAs whose full schedule isn't visible to one teacher's instance?
- Should load balancing suggestions be integrated into Tomorrow Plan or remain a separate advisory?

### Safety considerations

- Load profiles describe operational demands, not EA competence
- The system never suggests an EA is "failing" or "overloaded" in judgmental terms
- Suggestions are operational ("consider redistributing") not prescriptive ("you must change")
- EA autonomy is preserved — they can override any suggestion
- No comparison between EAs or classrooms

---

## 6. Cross-Adult Handoff Protocol

### Problem

Students in inclusive Alberta classrooms interact with 3–5 adults per day — classroom teacher, EA, specialist teacher, lunch supervisor, resource teacher. Every transition loses context. The student who had a breakthrough in morning math arrives at afternoon reading with no one knowing. The student who was dysregulated at lunch arrives at class with no warning.

### Insight

Most educational technology focuses on teacher-to-student or teacher-to-parent communication. Nobody builds for the teacher-to-EA, EA-to-specialist, specialist-to-teacher handoff chain that happens 10+ times daily in complex classrooms. This is where information loss compounds.

### How it works

When a student transitions between adults (or when an adult takes over a group), the system generates a micro-briefing — 3–5 lines of operationally relevant context:

1. **What just happened** — emotional state, academic progress, strategy currently in use
2. **What's working right now** — current scaffold, seating arrangement, approach
3. **What to watch for** — known trigger, pending follow-up, recent pattern

### Example output

```
Handoff: Student B → EA (10:30 math block)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Just now: Good morning. Completed literacy task independently
  for the first time this week. Positive mood.

Working: Chunked instructions (3 steps max). Sitting near
  window. Using English + visual supports.

Watch for: New math content today — may need extra check-in
  after first problem set. If frustrated, offer the
  manipulatives bin (worked well on Tuesday).
```

### Architecture fit

- **Model tier:** Live (4b, fast inference) — handoffs need to be near-instant
- **Inputs:** Today's interventions for the student, current plan, recent pattern insights
- **Outputs:** 3–5 line micro-briefing
- **Retrieval:** Yes — today's records only (ephemeral scope)
- **Persistence:** No — handoff notes are ephemeral by design (not persisted beyond the day)
- **Approval gate:** Sending adult must confirm before the handoff note is shared

### Key design questions

- How is a "handoff moment" triggered? (Manual button? Schedule-based? EA arrival detection?)
- Should handoffs be bidirectional? (Teacher-to-EA AND EA-to-teacher at end of support block?)
- What is the delivery mechanism? (Push notification? Shared screen? Printed card?)
- How to handle the lunch supervisor or other adults who aren't PrairieClassroom users?
- Should handoff history (even if ephemeral) inform pattern detection?

### Safety considerations

- Handoff notes contain only operationally relevant information — no raw intervention records
- Student aliases only
- Sending adult must approve before sharing (no autonomous handoffs)
- Ephemeral by design — handoff notes do not persist and cannot be used for surveillance
- Receiving adult sees only what the sending adult approved — no unilateral access to classroom memory
- The system facilitates communication between adults — it does not replace it

---

## Implementation sequencing

These capabilities have natural dependencies and can be phased:

### Phase 1 — Foundation (low cost, immediate value)

- **Complexity Debt Register** — Mostly a retrieval and presentation problem. Uses existing memory infrastructure. Provides immediate daily value.
- **Scaffold Decay Detection** — Extension of existing `support-patterns` workflow. Same model tier, same safety rules, new analysis lens.

### Phase 2 — Temporal intelligence

- **Complexity Weather Forecast** — Requires schedule data ingestion (new input source). Once built, it enriches Tomorrow Plan and EA Briefing.
- **EA Cognitive Load Balancer** — Depends on schedule data from Phase 2. Natural extension of Tomorrow Plan's EA action items.

### Phase 3 — Multi-adult coordination

- **Substitute Teacher Survival Packet** — Comprehensive retrieval from all memory sources. Requires careful approval gate design. High demo impact.
- **Cross-Adult Handoff Protocol** — Most ambitious. Requires real-time delivery mechanism and multi-user coordination. Best built after the system has proven its value to a single teacher.

### Shared prerequisites

All six capabilities require:

- **Schedule data model:** Classroom schedule with time blocks, EA availability windows, known events. This is the single most valuable infrastructure addition.
- **Temporal queries on intervention history:** Ability to query interventions by time-of-day and day-of-week patterns, not just recency.
- **Configurable thresholds:** What counts as "stale," "overloaded," or "decaying" should be adjustable per classroom.

---

## Relationship to existing architecture

```
                    ┌─────────────────────────┐
                    │   Schedule Data Model    │  ← NEW shared prerequisite
                    │  (blocks, EA windows,    │
                    │   events, deadlines)     │
                    └────────┬────────────────┘
                             │
              ┌──────────────┼──────────────────┐
              │              │                  │
              v              v                  v
   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
   │  Complexity   │  │  EA Cognitive │  │  Substitute      │
   │  Weather      │  │  Load         │  │  Teacher         │
   │  Forecast     │  │  Balancer     │  │  Survival Packet │
   └──────┬───────┘  └──────┬───────┘  └──────────────────┘
          │                  │
          v                  v
   ┌──────────────────────────────┐
   │       Tomorrow Plan          │  ← EXISTING (enriched with
   │  (now complexity-aware and   │     temporal + load awareness)
   │   load-balanced)             │
   └──────────────┬───────────────┘
                  │
                  v
   ┌──────────────────────────────┐
   │       EA Briefing            │  ← EXISTING (enriched with
   │  (now load-aware and         │     load profile + debt items)
   │   debt-informed)             │
   └──────────────────────────────┘

   ┌──────────────┐  ┌──────────────────┐
   │  Scaffold     │  │  Complexity      │
   │  Decay        │  │  Debt            │
   │  Detection    │  │  Register        │
   └──────┬───────┘  └──────┬───────────┘
          │                  │
          v                  v
   ┌──────────────────────────────┐
   │     Support Patterns         │  ← EXISTING (extended with
   │  (now includes decay         │     decay lens + debt scan)
   │   analysis + debt scan)      │
   └──────────────────────────────┘

   ┌──────────────────────────────┐
   │  Cross-Adult Handoff         │  ← NEW standalone workflow
   │  Protocol                    │     (live tier, ephemeral)
   └──────────────────────────────┘
```

## Guiding principles for all future development

These principles apply to every capability above:

1. **Teacher decides, system suggests.** No capability takes autonomous action.
2. **Observational language only.** Outputs cite teacher records, never infer diagnosis.
3. **Safety boundaries are inherited.** All 15 forbidden terms, approval gates, and governance rules from `safety-governance.md` apply to every new workflow.
4. **Schema-first development.** Define input/output contracts before implementation.
5. **At least one eval per capability.** No feature ships without a golden-case test.
6. **Dual-speed routing is preserved.** Live tier for real-time actions, planning tier for synthesis.
7. **Memory is explicit.** Any retrieval that informs an output must be visible and traceable.
8. **Complexity is the product.** Every feature must reduce or make visible classroom complexity. Features that add complexity without resolving it are rejected.
