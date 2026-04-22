# PrairieClassroom OS -- Demo Script

**System:** Gemma-4-native classroom complexity copilot for Alberta K-6  
**Demo classroom:** Mrs. Okafor's Grade 3/4 split, Lethbridge (26 synthetic students)

Use this script for a competition demo, stakeholder walkthrough, or teacher-facing product conversation. The safest public story is:

- hosted Gemma 4 is the competition proof lane
- the demo uses synthetic classroom data only
- the local/Ollama path is an intended privacy-first deployment lane, not proven on the current maintenance host
- teacher validation is not claimed unless a completed pilot artifact exists under `docs/pilot/`

For Phase 0 pilot sessions, prefer the 4-workflow story defined in `docs/plans/2026-04-22-phase-0-checklist.md`: open the day, adapt instruction, prepare tomorrow, and coordinate with adults or families. Treat intervention logging as supporting infrastructure inside that story, not as the lead narrative.

- **A: Competition Pitch** — Judges, funders, technical reviewers — ~5 minutes
- **B: Teacher Walkthrough** — Educators, EAs, curriculum leads — ~15 minutes

---

## Setup

### Start services

```bash
# Terminal 1: Flask inference service
python services/inference/server.py --mode mock --port 3200

# Optional hosted competition proof lane; synthetic/demo data only
# export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>
# export PRAIRIE_ENABLE_GEMINI_RUNS=true
# python services/inference/server.py --mode gemini --port 3200

# Terminal 2: Express orchestrator
INFERENCE_URL=http://localhost:3200 npx tsx services/orchestrator/server.ts

# Terminal 3: Vite web app
npm run dev -w apps/web
```

The demo classroom (`demo-okafor-grade34`) bypasses classroom-code auth for judging. Protected classrooms still require `X-Classroom-Code` and role-scoped access.

### Reset demo data

```bash
npx tsx data/demo/seed.ts
```

The current seed gives the demo classroom a 26-student roster, 42 intervention records, 3 plans, 1 pattern report, 1 approved family message, and session/feedback surfaces for Usage Insights.

### Refresh evidence

```bash
npm run evidence:generate
```

Use the generated reports as instrumentation proof. Do not present them as real teacher usage unless the underlying session came from a documented human walkthrough.

### Open

Navigate to:

```text
http://localhost:5173/?demo=true
```

---

## Track A: 5-Minute Competition Pitch

## A1. Problem (45 seconds)

> "Mrs. Okafor teaches a Grade 3/4 split in Lethbridge. Twenty-six students. Multiple home languages. Sensory and transition supports. An educational assistant only in the morning. The hard part is not one worksheet or one message. It is coordinating the whole classroom day."

**Show:** Today panel. Point to the 26-student classroom and the recommended next action.

## A2. Core Loop (90 seconds)

> "PrairieClassroom OS turns classroom signal into teacher action across four adult jobs: open the day, adapt instruction, prepare tomorrow, and coordinate with adults or families. A quick note becomes structured memory, but memory capture is supporting infrastructure, not the headline."

**Show quickly:**

1. **Today:** the system recommends the first move.
2. **Differentiate:** one fractions worksheet becomes multiple variants.
3. **Tomorrow Plan:** recent memory becomes specific next-day actions.
4. **Family Message or EA Briefing:** the same context becomes coordinated communication.

## A3. Gemma 4 Proof (60 seconds)

> "This is a Gemma-4-native app, not a generic education shell. The live tier handles fast classroom transformations. The planning tier handles deeper synthesis across classroom memory. The competition proof lane is hosted Gemma 4 on synthetic data only."

**Point to artifact-backed proof if needed:**

- Hosted gate: `output/release-gate/2026-04-22T02-16-16-557Z-74236`
- Hosted eval summary: `output/evals/2026-04-22-gemini/2026-04-22T02-16-16-557Z-74236-gemini-summary.json`
- System inventory: `docs/system-inventory.md`

## A4. Safety (45 seconds)

> "Three boundaries are permanent: no diagnosis, no discipline scoring, and no autonomous family messaging. The system drafts; the teacher reviews. The system retrieves records; it does not pretend to observe. Hosted model runs use synthetic data only."

**Show:** Family Message approval dialog. Do not click any button that implies a real send.

## A5. Close (30 seconds)

> "PrairieClassroom OS is not an AI tutor with school branding. It is a classroom operating layer for the adult coordination work of inclusive teaching."

---

## Track B: 15-Minute Teacher Walkthrough

This walkthrough should be framed as a 4-workflow teacher story, not a 12-panel tour. If time is short, prioritize B1, B2, B4, and B6.

## B1. Open The Day (1 minute)

**Show:**

- Classroom selector with `demo-okafor-grade34`.
- Today panel.
- Student roster or classroom profile view.

**Narration:**

> "This is a synthetic Grade 3/4 split with 26 students. Eight are EAL learners across several home languages. Brody has transition and sensory supports. Gabriel uses hearing aids. Hannah has fine-motor supports. The EA, Ms. Fehr, is here mornings only. The system has seeded classroom memory so it does not start from zero."
> "The first workflow is opening the day and deciding where to start. The point of Today is not generic dashboarding. It is giving the teacher one clear first move."

## B2. Adapt Instruction (2 minutes)

Paste this worksheet into **Prep -> Differentiate**:

```text
Fractions Review Worksheet

1. Circle the larger fraction: 1/4 or 1/3?
2. Show 2/3 on the number line below.
3. Solve: 1/2 + 1/4 = ___
4. Mrs. Okafor has 3/4 of a pizza. If she eats 1/4, how much is left?
5. Write a fraction that is equal to 1/2.
6. Challenge: 5/6 - 2/6 = ___
```

Teacher goal:

```text
Differentiate for mixed readiness: support for Elena, EAL adaptations for Amira and Daniyal, and extension for Chantal.
```

**Show:** generated variants, reading-level chips, and output actions.

**Narration:**

> "One artifact becomes multiple classroom-ready variants. The value is not more content. It is getting the right version to the right learner without rebuilding the worksheet by hand."

## B3. Supporting Workflow: Capture A Classroom Event (2 minutes)

Open **Ops -> Log Intervention** and use the quick-capture flow or full form:

```text
Brody used his visual timer independently during the math center rotation today. He set it for 10 minutes, watched it count down, and transitioned to the next station without adult prompting.
```

**Show:** structured intervention record.

**Narration:**

> "This is the memory layer. A hallway note becomes a structured record that later planning workflows can retrieve. It matters, but in the product story it supports the core workflows rather than replacing them."

## B4. Prepare Tomorrow (3 minutes)

Open **Ops -> Tomorrow Plan** and enter:

```text
This week has been a breakthrough for Brody. The visual timer is working. Elena had a confidence moment solving fractions with manipulatives. Tomorrow's math block comes after lunch and Ms. Fehr is only available in the morning.
```

**Show:** support priorities, EA actions, family follow-ups, and retrieval trace.

**Narration:**

> "The planning tier reads recent classroom memory and turns it into next-day actions. The Sources disclosure is intentionally honest: it shows which records were retrieved into the prompt, not a fake claim about what the model used internally."

## B5. Coordinate With Adults (2 minutes)

Open **Ops -> EA Briefing** and generate the briefing.

**Show:** priority items for Ms. Fehr's morning window.

**Narration:**

> "The EA briefing is role-specific. It turns the same classroom memory into a two-minute support handoff."

## B6. Coordinate With Families (2 minutes)

Open **Review -> Family Message**, select Brody, and draft a positive update about the timer milestone.

**Show:** draft and approval dialog.

**Narration:**

> "This is useful but bounded. The system can draft a plain-language message, but it never sends on its own. The teacher reviews, edits, and approves."

## B7. Evidence And Limits (3 minutes)

Open **Review -> Usage Insights** if populated, or reference the proof docs directly.

**Say clearly:**

> "The proof lane is hosted Gemma 4 on synthetic/demo data. The latest hosted gate passed, the current generated inventory records 12 panels, 13 prompt classes, 49 endpoints, and 127 eval cases. Real classroom validation is not claimed yet; the pilot materials are ready, but the first real teacher/EA walkthrough must still be captured before outcome claims are made."

---

## Presenter Notes

- If using mock mode, point out panel-level mock banners. Do not let a viewer mistake fixture output for hosted model quality.
- If using hosted Gemini, remind the audience that all inputs are synthetic/demo only.
- Do not say "no student data leaves the building" during a hosted demo. Say that the local/Ollama lane is the intended privacy-preserving deployment path.
- Do not claim teacher validation, measured time savings, or improved classroom outcomes unless a completed `docs/pilot/` artifact supports it.
- Use "coordinated next day" instead of unsupported outcome language.
- Keep the family-message approval gate visible. It is a central safety proof point.

## Contingency Notes

- If a service crashes, restart the affected terminal and refresh the browser.
- If generated output looks generic, confirm whether the inference service is running in mock mode.
- If Usage Insights is empty, say that instrumentation is built but the current local data does not represent real teacher usage.
- If latency is high in hosted mode, describe it as model/API latency and continue with the next visible artifact.
