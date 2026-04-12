# Structured Walkthrough v1 — Synthetic, Not Human Validation

**Date of walkthrough:** 2026-04-12
**Walker:** Project maintainer (one person)
**Subject classroom:** `demo-okafor-grade34` (synthetic seed — see `data/synthetic_classrooms/classroom_demo.json`)
**Inference mode:** `mock` (no hosted spend, no GPU, no real model calls)
**Runtime state:** post-retention-policy + access-audit sprint

---

## What this document is — and what it isn't

This is a **synthetic walkthrough**: a structured, first-person tour of the PrairieClassroom OS teacher UI by the maintainer, against the demo classroom, in mock mode. It captures friction points and design observations at hackathon pace.

**This is explicitly not**:

- A record of real teacher use.
- Human validation by a practicing Alberta educator.
- Pilot evidence from any real classroom, student, or family.
- A substitute for the consent, IRB, or audit work that real-data pilots require.

It exists for one reason: the project has shipped 12 prompt classes, 11 teacher-facing panels, 117 eval cases, and production-grade governance without ever having the maintainer sit down and *use* the product as a teacher persona from cold start to warm-state. That is a design gap, not a validation gap, and this document is the cheapest honest way to close it.

`docs/safety-governance.md` and `docs/pilot-readiness.md` remain the sources of truth for what the project claims about real-world use. Nothing in this document should be cited as evidence of usefulness to a real teacher, real EA, real family, or real student. The claims ledger in `docs/pilot-readiness.md` still stands: no human validation has been performed.

## Method

The walkthrough follows a deliberate "teacher persona" lens: the maintainer picks a realistic workflow, enters the UI cold, reads what is on screen, and records every moment of hesitation, confusion, or "wait, what does that mean?" friction. The maintainer does *not* read source code or internal docs during the walkthrough — only the UI, the rendered output, and what a teacher would see with no onboarding.

For each scenario, three things are captured:

1. **Observation** — what happened, in plain language.
2. **Friction** — what made the experience harder than it should be, even for someone who built the product.
3. **Candidate change** — the smallest concrete improvement that would reduce the friction.

Each scenario was walked once. This is a first pass, not a deep study.

## Setup preconditions

- Orchestrator (`services/orchestrator`) running on port 3100, mock inference mode.
- Web UI (`apps/web`) running on port 5173.
- Demo classroom seeded via `npx tsx data/demo/seed.ts` (20 interventions, 3 plans, 1 pattern report, 1 approved family message).
- Protected auth code not required: demo classroom bypasses auth.
- No hosted spend, no GPU, no real model calls.

## Scenario 1 — Morning Today Panel: "Where should I start today?"

**Goal:** See whether the Today tab actually helps a teacher decide the first thing to do on arrival.

**Observation:** The Today tab loads with a health bar at the top, a sparkline strip showing 14-day planning consistency, and a pending-actions card listing items that need attention. A priority queue is visible below, grouped by type. The demo classroom shows 3 stale follow-ups, 1 unaddressed pattern, and an IPP-adjacent deadline approaching.

**Friction:**
- The health bar communicates "streak" and "7-day consistency" but the first-time reader has no anchor for what "healthy" looks like. A green bar could mean "good" or could mean "not enough data to say." The labels are accurate but not self-explanatory.
- The priority queue shows counts but doesn't explain *why* an item is prioritized over another. A single "priority reason" chip on each row would close this in a sentence.
- There is no visible "first action" suggestion — the page lays out the state but doesn't make one clear recommended move. A teacher in a rush wants a single "start here" nudge, not a dashboard to scan.

**Candidate change:** Add a single compact "Start with..." card above the priority queue that surfaces the system's top recommendation with one sentence of reasoning. The logic can be the same recommendation that's already computed for `getRecommendedAction` — it just needs a prominent place to live.

---

## Scenario 2 — Differentiate a Grade-3 reading passage for three students

**Goal:** Test whether the differentiation output is directly usable, or whether a teacher would still have to rewrite it.

**Observation:** The Differentiate panel asks for a lesson artifact, a teacher goal, and optionally student refs. Pasting a 400-word reading passage about prairie grasslands and asking for variants produces three differentiated versions keyed to the demo students' support tags (Amira — visual supports, Daniyal — EAL level 1, Elena — math anxiety, which is the wrong band for a reading passage but that's a data quirk of the seed, not the prompt).

**Friction:**
- The output lists variants by student alias but doesn't tell the teacher which variant to *print* for which student. A single "copy-ready" button per variant would collapse a step.
- There's no indication of reading level for each variant. A Lexile estimate or Flesch-Kincaid score would help a teacher decide if the variant actually matches the student's band.
- The panel does not surface *what the source passage already was* next to the variant, so a teacher can't visually confirm the transformation without scrolling back.

**Candidate change:** Add a side-by-side "source vs. variant" toggle to each variant card, plus a rough reading-level estimate computed from the output text. Both are pure frontend additions.

---

## Scenario 3 — Draft a family message in Punjabi for a routine update

**Goal:** Probe the bilingual-coverage story that the new `msg-lang-*` eval cases were written to strengthen.

**Observation:** The Family Message panel accepts a target language string. Entering "Punjabi" and a brief observational context about Amira finishing her reading block produces a draft. In mock mode, the draft is a canned English response — the mock fixtures don't vary by target language. The draft is marked *not yet approved* and waits for teacher review before it becomes a sendable artifact.

**Friction:**
- Mock mode makes it **impossible** to tell whether the real system would produce a credible Punjabi message. The canned response is English. The gap is structural to mock mode, not a UI bug — but a teacher walking through in mock mode would not understand why. A visible mock-mode banner inside the panel would be clearer than the current system-level banner.
- The approval step is appropriate (human-in-the-loop is a core safety boundary), but the "approve" button is the same visual weight as the "regenerate" and "copy" buttons. A teacher could accidentally press approve before reading the draft closely.
- The target_language field is a free-text input. There's no dropdown of the 6 Alberta-regional languages that the project explicitly supports in eval coverage (`msg-lang-pa/tl/zh/fr/ar/uk`). Typing "Punjabi" works; typing "punjabi" or "pa" would not obviously work without trying.

**Candidate change:** Add a language dropdown populated from the eval-covered set (Punjabi, Tagalog, Mandarin, French, Arabic, Ukrainian, Spanish, English) as the default path, with a "Other language..." free-text fallback. Separately, make the approve button visually distinct and require a confirmation click in mock mode — or mark it explicitly "cannot approve mock output" to prevent confused muscle memory.

---

## Scenario 4 — Log an intervention while "between blocks"

**Goal:** Test whether the intervention-logging flow is fast enough to fit the 60-90 second window a teacher actually has.

**Observation:** The Log Intervention panel asks for student refs, a teacher note, and optional context. Selecting Brody and typing a one-sentence observation about a successful post-recess transition produces a structured intervention record within ~1 second in mock mode. The record is saved to SQLite memory and appears in the history view.

**Friction:**
- The student selector requires the teacher to click a dropdown and pick from aliases. For a teacher who knows Brody's alias, that's fine. For a teacher mid-thought, it's a context switch. Typing "Br" should filter the list.
- There is no quick-entry mode. Every field is shown even when the teacher only wants to log "Brody — transition went well, offered fidget." A micro-mode that takes one free-text field and parses it into a structured record would be significantly faster.
- The panel gives no indication of how many interventions the teacher has logged this week. A small counter ("3 interventions logged this week") would give the teacher a sense of momentum without making them open the history view.

**Candidate change:** Add a type-ahead filter to the student selector and a "quick capture" mode that accepts a single free-text line. Low-effort parse on the backend, matching the existing prompt-class.

---

## Scenario 5 — Prepare tomorrow's plan from a short teacher reflection

**Goal:** See whether the plan reflects the classroom's actual memory or produces generic output that could have been written without the project.

**Observation:** The Tomorrow Plan panel accepts a freeform teacher reflection ("Today was rough after lunch — math block fell apart for three students during the fractions review"). Submitting produces a plan with support priorities, EA actions, transition watchpoints, and family follow-ups. In mock mode the response is structurally correct but content-hollow — it cites the demo classroom's students but the advice is generic.

**Friction:**
- Mock output is impossible to tell apart from "the model didn't actually use the classroom memory." Only a hosted-mode run can disconfirm this. A teacher walking through in mock mode has no way to trust that the planning pipeline is doing retrieval.
- The plan is presented as a long scrollable document. For a 15-minute teacher prep window, scannability matters more than completeness. A collapsed-by-default view with expandable sections would be easier to triage.
- "Support priorities" and "transition watchpoints" are two different sections but overlap in intent. A first-time reader doesn't immediately grasp the difference.

**Candidate change:** Collapse sections by default with section-level completion chips ("2 support priorities, 3 EA actions, 1 family followup"). Separately, add a small "retrieval trace" link on each section that, when clicked, shows which memory records were pulled in for that section — this would make mock-mode confusing-ness into hosted-mode explanatory power at zero runtime cost.

---

## Scenario 6 — Generate an EA briefing for tomorrow's EA shift

**Goal:** Test whether the EA briefing is actually usable by an EA who didn't see today's interventions.

**Observation:** The EA Briefing panel produces a structured briefing with schedule blocks, per-student watch items, and pending follow-ups. The briefing correctly reflects the EA's 8:30-12:00 window from the demo schedule. The output has enough structure that an EA could skim it in under two minutes.

**Friction:**
- The briefing does not open with a "today's most important thing for you" lead. An EA coming off their own weekend wants the one thing to hold in their head, not a dashboard to parse.
- Pending follow-ups are listed without any recency signal. A follow-up from 10 days ago and a follow-up from yesterday look identical.
- There is no way for the EA to mark a watch item as "acknowledged" from inside the briefing. That kind of acknowledgement would be valuable audit evidence too, but it requires a role-scoped EA-writable surface that doesn't exist yet.

**Candidate change:** Add a "top of mind" single-sentence lead, a "<n> days ago" chip on each pending follow-up, and — longer term — an EA-writable acknowledgement action that writes to the new access audit log with role=ea.

---

## Scenario 7 — Read tomorrow's complexity forecast

**Goal:** See whether the per-block complexity forecast is actually decision-useful or just visually interesting.

**Observation:** The Forecast panel renders tomorrow's schedule with per-block complexity ratings, contributing factors, and brief narrative explanations. In the demo classroom the post-lunch math block is flagged high-complexity with "transition difficulty, no EA, split grades" as contributing factors — which tracks with the classroom_notes in the seed.

**Friction:**
- The rating vocabulary (LOW / MED / HIGH) is easy to read but the MED bucket is doing too much work. Most blocks are MED. A teacher who sees mostly MED can't prioritize.
- The contributing factors are text. A chip-based UI (EA gap, transition, new content, prior pattern) would make patterns across blocks more visible.
- There's no comparison against a typical day. A teacher seeing "tomorrow is a HIGH day overall" means something different if the classroom's baseline is mostly HIGH blocks versus mostly LOW.

**Candidate change:** Split the MED bucket into MED-low and MED-high, chip the contributing factors, and add a small "typical vs. tomorrow" bar at the top. All frontend-only changes.

---

## Scenario 8 — Complexity Debt Register: "what have I been avoiding?"

**Goal:** Probe whether the debt register's framing feels supportive or accusatory.

**Observation:** The Debt Register panel shows stale follow-ups, overdue family communications, and unaddressed patterns, grouped by category with aging indicators. In the demo classroom, three follow-ups are older than 5 days and one pattern is unaddressed.

**Friction:**
- The framing is accurate but can read as judgmental on first view. "Stale follow-ups (3)" is technically correct but not emotionally neutral for someone already feeling behind. "Open follow-ups (3)" would do the same operational work with less charge.
- There is no "dismiss with reason" affordance. A teacher who handled an item in person, without a record, has no way to clear it. That missing affordance is mentioned in `docs/future-development.md` as a known design question and it still hasn't been built.
- Aging is shown in days, not weeks. A follow-up that's 13 days old looks similar to one that's 5 days old at a glance.

**Candidate change:** Rename "stale" to "open" throughout the register, add a "dismiss with reason" action, and highlight items older than two weeks with a distinct visual weight.

---

## Friction summary across scenarios

| Type | Count | Cross-cutting pattern |
|---|---|---|
| Vocabulary / framing clarity | 6 | Operational labels ("stale", "MED", "streak") are accurate but don't self-explain on first viewing |
| Scannability | 5 | Panels present complete state; teachers coming in hot want a single lead |
| Mock-mode honesty | 3 | Mock responses are uniform across target languages / retrieval contexts, which hides whether the system *could* be credible in hosted mode |
| Quick-capture affordance | 2 | Intervention logging and follow-up dismissal both need shorter paths for the mid-class window |
| Retrieval transparency | 2 | There's no visible "which memory records informed this output?" trace on planning-tier outputs |

## Top five changes this walkthrough surfaces

1. **"Start with..." lead on every panel that has multiple things to show.** Highest leverage; lowest cost. Applies to Today, Tomorrow Plan, EA Briefing, and Debt Register.
2. **Language dropdown on Family Message.** Pulls the 6 eval-covered languages into one click and makes the bilingual coverage discoverable instead of hidden in eval cases.
3. **Mock-mode banner inside panels, not just system-level.** Prevents a teacher walking through in mock mode from mistaking canned fixtures for real model output.
4. **Retrieval trace on planning-tier panels.** Would turn "the plan cites my students' names, but is it actually reading my memory?" into a visible yes/no answer. This is the single biggest trust lever for first-time users.
5. **Quick-capture micro-mode for Log Intervention.** One text field, backend-parsed. Collapses the 60-second window into 10 seconds.

## What would make this document real pilot evidence instead

This document is honest about what it isn't. To upgrade this to credible pilot evidence (and to meaningfully close `G-06` in `docs/development-gaps.md`), the following would need to happen:

- A real Alberta K-6 classroom teacher, unaffiliated with the project, walks through 8 scenarios without prompting.
- The session is observed (with consent) and friction notes are captured by an observer who is not the teacher, so the teacher isn't performing for the maintainer.
- The teacher's comments are transcribed verbatim where consented.
- The friction log uses the same structure as this document, but marked as *observed* rather than *self-reported by maintainer*.
- A usefulness rubric (see `docs/pilot-readiness.md` for the claims the project explicitly does and doesn't make) is completed by the teacher with 1-5 ratings per panel.
- No real student data is entered during the walkthrough. The demo classroom remains the subject.
- An artifact is saved to `docs/pilot/` with the teacher's anonymized consent metadata.

Until those steps happen, this document is exactly what the file name implies — a *structured walkthrough*, not a *pilot*. It is useful for surfacing hackathon-pace design friction. It is not useful as evidence of classroom usefulness.

## Next steps this walkthrough recommends

1. **Implement the top five changes** listed above. All are frontend-only. None require new prompt classes or new backend endpoints.
2. **Schedule a second synthetic walkthrough** after those changes land, from a cold state, to verify the friction reduction is real and not cosmetic.
3. **Prepare a teacher-facing walkthrough protocol** (a one-page cold-start script that a real teacher could follow without maintainer help) ready to use when the project moves into a real pilot conversation.
4. **Treat this document as a living baseline** — revisit after every sprint and re-walk any scenario whose panel changed, so friction doesn't silently return.

---

*Structured Walkthrough v1. Synthetic. Not human validation. Maintained alongside `docs/development-gaps.md` item G-06.*
