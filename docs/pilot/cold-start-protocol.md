# PrairieClassroom OS — Teacher Cold-Start Protocol

**For:** A teacher or EA walking through the product for the first time, alone or with one observer.
**Read time:** 3 minutes before you start.
**Walkthrough time:** 30–45 minutes.
**Mode:** Demo classroom only. No real student data. Mock or Ollama lane.

---

## Before you begin

Read [participant-brief.md](./participant-brief.md) once. It tells you what the system *is not* (no diagnosis, no discipline scoring, no autonomous messaging) and what your rights are during the session. This protocol assumes you have read it.

The pilot coordinator has already:

1. Reset the demo classroom to a known clean state — `npm run pilot:reset`.
2. Started the inference, orchestrator, and web servers — `npm run pilot:start`.
3. Opened http://localhost:5173/?demo=true in your browser.
4. Confirmed the role picker shows "Teacher" and skipped/clicked through.

If any of those is not true when you sit down, ask the coordinator before starting.

---

## How to use this protocol

Each scenario below has the same shape:

- **Goal** — what a teacher would actually be trying to do, in plain language.
- **Steps** — exactly which tab to click and what to type. Numbered, deterministic.
- **What you should see** — the rough shape of the output, so you can tell if something is broken vs. just unfamiliar.
- **What to notice** — the friction the project most wants you to surface. *Not leading questions* — if you don't notice anything, write that down too. An honest "I noticed nothing remarkable" is real signal.

After each scenario, take 30 seconds to write a one-line note in [observation-template.md](./observation-template.md) under "Workflow Observation."

You do **not** have to complete every scenario. Stop when you are tired or out of time.

---

## Scenario 1 — "Where should I start today?" (5 min)

**Goal:** Open the day cold and decide your first action.

**Steps:**

1. Make sure the **Today** tab is selected (top-left of the workspace).
2. Read what is on screen for one minute. Don't click anything yet.
3. After one minute, click the large primary button on the right side of the hero card (probably says "Open Family Message" or similar).

**What you should see:**

- A narrative line at the top — "[time] is today's real test" or "A quiet queue" or similar.
- A status chip ("Approval queue", "Follow-up needed", etc.).
- A short sentence under the chip explaining *why* that's the recommended next move.
- A primary button taking you to the recommended panel.
- Below the hero: a "Classroom pulse" section with the day arc, pending actions, debt gauge, and student priority matrix.

**What to notice:**

- Does the rationale sentence under the chip help you decide whether to follow the recommendation?
- Is there one clear "first thing to do," or does the page ask you to compare several things?
- Does any chart or label use a word you don't know?

---

## Scenario 2 — "I need three versions of this lesson by tomorrow" (7 min)

**Goal:** Take one lesson artifact and generate classroom-ready variants.

**Steps:**

1. Click the **Prep** tab, then **Differentiate**.
2. In the left rail under "Prepare Lesson Artifact":
   - Title: *Prairie grasslands reading*
   - Source text (paste): *The prairie is a wide grassland. In summer, the grass grows tall and golden. Animals like bison, gophers, and prairie chickens make their home there. Children can see the prairie from a school bus window on a long drive across Alberta.*
   - Teacher goal: *Differentiate for a Grade 3 reading block with three readiness bands.*
3. Press **Generate variants**.

**What you should see:**

- A "Mock fixture output" notice (in mock mode) — telling you the variants will not adapt to your source text. **Read it.** This is the system being honest.
- 4–5 variant cards (Core, Chunked, EAL Supported, Extension, etc.).
- Each variant shows estimated time and a small "~Grade N" reading-level chip beside "Student Instructions."

**What to notice:**

- Are the reading-level chips believable for a Grade 3 audience?
- If you were going to print one of these tomorrow, which would it be — and what would you change first?
- In mock mode, can you tell where the system genuinely helped vs. where it just returned a template?

---

## Scenario 3 — "I want to send a routine update home about Amira in Punjabi" (5 min)

**Goal:** Draft a family message, with translation, and approve it for sending.

**Steps:**

1. Click the **Review** tab, then **Family Message**.
2. In the left rail:
   - Pick the student **Amira** from the checkbox list.
   - Message Type: *Routine Update*.
   - Language: select **Punjabi** from the dropdown.
   - Context: *Amira read the full prairie passage independently this morning and asked two clarifying questions.*
3. Press **Draft Family Message**.
4. When the draft appears, read the "Mock fixture output" notice carefully if you are in mock mode.
5. Press **Review approval** to open the approval dialog. Edit the draft text in the dialog if you want. Press **Approve & copy**.

**What you should see:**

- A drafted message (in mock mode, the same English fixture regardless of language — this is what the banner is telling you).
- A pipeline visualization on the left rail showing approval rate over time.
- An approval dialog that requires a deliberate confirmation before the message is "sent."

**What to notice:**

- Is the difference between "draft" and "approved" clear enough that you would not accidentally send something?
- Does the dropdown make all 8 supported languages visible and obvious?
- In hosted mode (if your session uses it), does the Punjabi translation feel correct, partially correct, or wrong? **Do not act on this output for any real family.**

---

## Scenario 4 — "I have 90 seconds between blocks and need to log what just happened" (3 min)

**Goal:** Log an intervention quickly and see it land in memory.

**Steps:**

1. Click **Ops**, then **Log Intervention**.
2. Look for the **Quick Capture** chip tray at the top — a row of pre-canned chips like "transition," "regulation," "reading," "EAL support."
3. Click one chip ("transition"), then click a student alias (try **Brody**).
4. Type one short line in the free-text field: *Used calm corner before joining group; settled in 6 minutes.*
5. Press the small primary action.

**What you should see:**

- The intervention card appears in the result canvas within ~1 second.
- A "Mock fixture output" notice in mock mode (because tags and follow-ups are fixture, even though the persisted record is real).
- The intervention shows up in the Ops history view.

**What to notice:**

- Did you finish in under 60 seconds? (If not, what slowed you down?)
- Was the chip row helpful, or did you bypass it for the longer form?
- Could you imagine doing this in a real hallway moment between classes?

---

## Scenario 5 — "Build me tomorrow's plan from what I just typed" (7 min)

**Goal:** Generate a tomorrow plan from a short reflection.

**Steps:**

1. Click **Prep**, then **Tomorrow Plan**.
2. In the left rail's **Teacher reflection** field, type:
   *Today was rough after lunch — math block fell apart for three students during the fractions review. Daniyal needs more visual scaffolds tomorrow. Brody held it together until almost the end.*
3. Press **Generate plan**.

**What you should see:**

- A plan with sections: support priorities, transition watchpoints, EA actions, prep checklist, family follow-ups.
- A "Mock fixture output" notice in mock mode telling you the plan does not actually use your reflection or your classroom memory.
- A radar chart showing coverage across the five sections.
- A "Sources" disclosure (collapsed by default) below the plan that says something like *"9 records pulled from classroom memory."* Click it to expand. You should see plans, interventions, and the pattern report it pulled — each with a record id, an age, and a short excerpt.

**What to notice:**

- In mock mode, is the plan generic enough that you can tell it ignored your reflection?
- In hosted mode, does the plan reference Daniyal and Brody by name — and if so, does what it says about them match what you'd say?
- When you expand the Sources section: does the list of records match what you'd expect the system to have read? Are any records *missing* that you thought it should have used?
- Are the section names self-explanatory? (Especially: do "support priorities" and "transition watchpoints" feel like distinct things, or do they overlap?)

---

## Scenario 6 — "What does tomorrow's complexity look like?" (4 min)

**Goal:** Read a per-block complexity forecast and make sense of it.

**Steps:**

1. Click **Ops**, then **Forecast**.
2. Press **Generate forecast** with the default classroom.

**What you should see:**

- A timeline of tomorrow's blocks with LOW / MEDIUM / HIGH complexity ratings.
- Contributing factors per block.
- A forecast viewer below the timeline with deeper detail.
- A "Sources" disclosure (collapsed by default) below the forecast that says something like *"N records pulled from classroom memory."* Click it to expand. You should see the recent interventions, pending follow-ups, and the latest pattern report the forecast actually read.

**What to notice:**

- Is the rating vocabulary (LOW / MED / HIGH) granular enough? If most blocks are MED, can you still prioritize?
- The contributing factors are text. Would chips ("EA gap", "transition", "new content") be easier to scan?
- Is there a way to tell whether tomorrow is high-complexity *for your classroom* vs. high-complexity *in general*?
- When you expand the Sources section: do the records the forecast pulled in match what you'd expect a complexity forecast to read from? If a record you think should have influenced tomorrow's forecast is missing, that's worth flagging.

---

## Scenario 7 — "What have I been letting slip?" (3 min)

**Goal:** Open the debt register and see what's overdue.

**Steps:**

1. Go back to **Today**.
2. In the "Pending actions" card, click the row labeled **open follow-ups** (the count beside it).
3. The drill-down drawer slides in from the right.

**What you should see:**

- A list of follow-up items, each with a description, the student aliases involved, and an age chip.
- Items older than two weeks show a warning-tone left rule and a "Nw ago" age label so they stand out.

**What to notice:**

- Does "open follow-ups" feel less judgmental than "stale follow-ups" would? (We deliberately reframed this — your read on the new wording is what we want.)
- Is the visual difference between a 5-day-old item and a 14-day-old item enough?
- Is there a way to clear an item that you handled in person without logging? (There isn't yet — this is a known gap.)

---

## Scenario 8 — "Stop the session and write the rubric" (5 min)

**Goal:** Capture your honest read while it's still fresh.

**Steps:**

1. Stop walking through scenarios.
2. Open [usefulness-rubric.md](./usefulness-rubric.md) (the coordinator can paste a copy or open it in their editor).
3. Fill out all five dimensions. **Honest 2 beats polite 4.**
4. Add three "most surprising" things — positives or negatives, no analysis required.
5. The coordinator will close the session by purging or retaining your demo memory according to your preference and writing one paragraph in [session-log-template.md](./session-log-template.md).

---

## If something breaks

- A panel shows an error banner: take a screenshot, tell the coordinator, skip to the next scenario.
- The page becomes unresponsive: tell the coordinator. Do not retry the same action three times.
- A generated output describes a student in language you would not use: stop and open an entry in [incident-log.md](./incident-log.md) before continuing. This is the single most important thing the pilot can surface.

---

## What this protocol intentionally leaves out

- We do not script EA Briefing, Survival Packet, EA Load, Support Patterns, Language Tools (Simplify / Vocab Cards), or Usage Insights as primary scenarios. They exist and are wired in. If you have time at the end, explore one of them and add a short note. Otherwise leave them for a second session.
- We do not ask you to use the classroom code authentication, schedule editor, or memory admin commands. Those are operator surfaces, not teacher surfaces.

---

*Cold-Start Protocol v1. Companion to [participant-brief.md](./participant-brief.md), [observation-template.md](./observation-template.md), [usefulness-rubric.md](./usefulness-rubric.md), [session-log-template.md](./session-log-template.md), [claims-ledger.md](./claims-ledger.md), [incident-log.md](./incident-log.md).*
