# PrairieClassroom OS -- Demo Script

**System:** Gemma-4-native classroom complexity copilot for Alberta K-6  
**Demo classroom:** Mrs. Okafor's Grade 3/4 split, Lethbridge (6 students)

This script has two tracks. Choose the one that fits your audience and time.

| Track | Audience | Duration |
|-------|----------|----------|
| **A: Stakeholder Pitch** | School leaders, funders, community partners | ~5 minutes |
| **B: Teacher Walkthrough** | Educators, EAs, curriculum leads | ~15 minutes |

---

## SETUP (both tracks)

### Prerequisites

Ensure all services are running before starting the demo:

```bash
# Terminal 1: Flask inference service (port 3200)
# Option A: Mock mode (no GPU, canned responses)
python services/inference/server.py --mode mock --port 3200

# Option B: Zero-cost live Gemma via Ollama
# ollama pull gemma4:4b
# ollama pull gemma4:27b
# npm run host:preflight:ollama
# python services/inference/server.py --mode ollama --port 3200

# Option C: Hosted Gemma 4 via Gemini API (hackathon/demo only)
# export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>
# export PRAIRIE_ENABLE_GEMINI_RUNS=true
# python services/inference/server.py --mode gemini --port 3200

# Paid Vertex validation exists, but it is outside the zero-cost sprint:
# export PRAIRIE_ALLOW_PAID_SERVICES=true
# export GOOGLE_CLOUD_PROJECT=<your-project-id>
# gcloud auth application-default login
# python services/inference/server.py --mode api --port 3200

# Terminal 2: Express orchestrator (port 3100)
INFERENCE_URL=http://localhost:3200 npx tsx services/orchestrator/server.ts

# Terminal 3: Vite development server (port 5173)
npm run dev -w apps/web
```

**Note:** The demo classroom (`demo-okafor-grade34`) bypasses authentication. Other protected classrooms now prompt for a classroom code in the UI and direct API callers still authenticate with `X-Classroom-Code` on protected reads and writes, including `today` and history routes.
Use only synthetic/demo data if you run the hosted Gemini lane.

### Seed demo classroom data

If this is the first demo run, seed the database with 8 interventions, 3 plans, 1 pattern report, and 1 approved message:

```bash
npx tsx data/demo/seed.ts
```

### Generate evidence reports (recommended)

Before the demo, generate the evidence portfolio so Usage Insights has data to display:

```bash
npm run evidence:generate
```

### Open demo URL

Navigate to: **http://localhost:5173/?demo=true**

You should see the UI with the classroom selector pre-populated to `demo-okafor-grade34`.

---

# TRACK A: 5-Minute Stakeholder Pitch

**Goal:** Convince stakeholders this is real, responsible, and worth supporting.

## A1. Problem (45 seconds)

> "Alberta K-6 teachers manage extraordinary classroom complexity: mixed grades, EAL learners at different stages, accessibility needs, shared EA staffing, family communication in multiple languages. The coordination work is massive, and it happens on top of actual teaching. There is no tool that helps with the *operations* side of a complex classroom."

**Show:** Open the demo classroom. Point at the 6-student roster with three EAL learners, one with sensory needs, one with math anxiety.

## A2. Solution (90 seconds)

> "PrairieClassroom OS is a classroom operations copilot -- not a chatbot, not a grading tool. It has ten structured workflows that help with the coordination work."

**Show quickly (30 seconds each):**

1. **Differentiate** -- paste the fractions worksheet, generate variants. Show that Amira gets EAL supports, Elena gets scaffolding, Chantal gets extension.
2. **Tomorrow Plan** -- show a generated plan that references specific students, specific times, specific EA actions. Point out the "Pattern-informed" badge.
3. **Family Message** -- show a drafted message and the approval gate. "The teacher always decides."

## A3. Evidence (60 seconds)

> "This is not a prototype with mock data. We track how the system is actually used."

**[EVIDENCE] Show the Usage Insights tab.** Point out:
- Total feedback ratings across panels
- Per-panel breakdown showing which workflows teachers use most
- Session patterns showing common workflow sequences
- Average session duration

> "The system reliability report shows a {successRate}% success rate across {totalRequests} requests."

**[EVIDENCE]** Reference `docs/evidence/system-reliability.md` if available: latency percentiles, error rates, request volume.

## A4. Safety (45 seconds)

> "Three principles that are non-negotiable:"
>
> 1. "**No diagnosis.** The system describes what was observed. Never 'this student has ADHD.' Always 'your records show a pattern of transition difficulty.'"
> 2. "**No autonomous sends.** Family messages require teacher approval. Every time."
> 3. "**No surveillance.** This is a teacher's thinking partner, not a monitoring tool."

## A5. Ask (30 seconds)

> "We are looking for pilot classrooms in Alberta to test this with real teachers. The system runs locally -- no student data leaves the building. We need 3-5 classrooms willing to try it for a month."

**Hand out:** Pilot observation template (`docs/pilot/observation-template.md`).

---

# TRACK B: 15-Minute Teacher Walkthrough

**Goal:** Show a realistic morning-to-review cycle that a teacher would actually use.

## B1. Morning Routine -- Classroom Context (30 seconds)

### What to click/show
- **Show the classroom selector dropdown** at the top of the screen.
- **Verify `demo-okafor-grade34` is selected.**
- Briefly scroll through the **classroom roster** to show the 6 students:
  - **Amira** -- EAL L2 (Tagalog home), strong in math
  - **Brody** -- sensory/transition needs
  - **Chantal** -- extension/peer mentor
  - **Daniyal** -- EAL L1 (Urdu, new to school)
  - **Elena** -- math anxiety
  - **Farid** -- EAL L3 (Arabic, verbal > written)

### What to narrate
> "This is Mrs. Okafor's Grade 3/4 split in Lethbridge. Twenty-four students total, with three EAL learners in different stages. Brody has sensory needs. The EA, Ms. Fehr, is here mornings only. And the system has two weeks of classroom memory."

### What to point out
- **Real-world complexity:** mixed grades, EAL diversity, accessibility needs, shared staffing.
- **Continuous memory:** the system doesn't start from scratch.

## B2. Differentiation (2 minutes)

### What to click
- **Navigate to the "Differentiate" workflow.**
- **Paste the following sample fractions worksheet text:**

```
Fractions Review Worksheet

1. Circle the larger fraction: 1/4 or 1/3?

2. Show 2/3 on the number line below.
   [---]

3. Solve: 1/2 + 1/4 = ___

4. Mrs. Okafor has 3/4 of a pizza. If she eats 1/4, how much is left?

5. Write a fraction that is equal to 1/2.

6. Challenge: 5/6 - 2/6 = ___
```

- Set teacher goal:
  > "I need this differentiated for mixed abilities: support for Elena (math anxiety), extension for Chantal (advanced), and EAL adaptations for Amira and Daniyal."
- **Click "Generate 5 variants."**

### What to point out
- **EAL-supported version for Amira/Daniyal:** simpler language, visual supports, vocab pre-teaching.
- **Scaffolded version for Elena:** step-by-step guides, confidence-building language.
- **Challenge version for Chantal:** multi-step problems, real-world context.

**[EVIDENCE]** "If we look at Usage Insights later, this generation will appear in the session's panel visits and workflow patterns."

## B3. Language Tools (1.5 minutes)

### What to click
- **Navigate to "Language Tools".**
- **Choose "Simplify for EAL beginner."**
- **Paste the same fractions worksheet text.**
- **Generate Tagalog vocab cards** for Amira.

### What to narrate
> "These tools are ephemeral -- they don't persist to the record. They're on-demand supports a teacher can generate and use right away."

### What to point out
- **Teacher agency:** tools are suggestions, not decisions.
- **Language-aware:** the system knows Amira's home language.
- **No record clutter:** one-off tools don't pollute the student database.

## B4. Family Communication (2 minutes)

### Log an intervention first
- **Navigate to "Log intervention".**
- Write:

```
Brody used his visual timer independently during the math center rotation today. 
He set it for 10 minutes, watched it count down, and transitioned to the next station 
without adult prompting. This is the first time he's done this without support.
```

- Show the structured output (observation, action taken, outcome, follow-up).

### Draft a family message
- **Navigate to "Family message."**
- Select **Brody** and write a brief note about his milestone.
- **Show the approval gate. Do NOT click "Approve & send."**

> "The system can draft messages -- but it never sends them. The teacher reads it, can edit it, and only then does it go home."

**[EVIDENCE]** "Every time a teacher rates one of these outputs, that feedback flows into the Usage Insights panel -- which panels are most useful, what the average ratings are."

## B5. Review Cycle (3 minutes)

### Support Patterns
- **Navigate to "Support patterns."**
- **Click "Detect patterns."**
- Show the pattern report: recurring themes, follow-up gaps, positive trends.
- If running in planning tier, show the reasoning trace.

> "The system is reading everything -- every observation, every action. The thinking is visible. And notice the language: 'Your records show...' not 'I think...'"

### Tomorrow Plan
- **Navigate to "Tomorrow plan."**
- Write a reflection:

```
This week has been a breakthrough for Brody -- the visual timer is working. 
Elena had a confidence moment on Wednesday solving fractions without help. 
But Monday has the community math event and the routine will be disrupted. 
Ms. Fehr is only here in the morning.
```

- **Click "Generate plan for tomorrow."**
- Show the pattern-informed badge, specific EA actions, student watch list, family follow-ups.

### EA Briefing
- **Navigate to "EA briefing."**
- Generate briefing for Ms. Fehr.

> "This briefing is a synthesis, not a record. Ms. Fehr sees priorities, changes, watch points -- generated fresh each morning."

## B6. Usage Insights (1 minute)

**[EVIDENCE]** Navigate to the **Usage Insights** tab (in the Review group).

> "This is the teacher-facing view of how your classroom uses PrairieClassroom. Not analytics for administrators -- insights for the teacher."

**Show:**
- **Feedback Overview:** Total ratings, per-panel breakdown with progress bars, weekly trend sparkline.
- **Workflow Patterns:** Total sessions, average duration, common workflow sequences.

> "Over time, this helps a teacher see which workflows save the most time and which outputs need improvement. The data stays in the classroom -- it is never sent to a central dashboard."

## B7. Closing Narration (1.5 minutes)

> "PrairieClassroom OS is not a chatbot. It is eleven structured workflows:
>
> 1. **Differentiate** worksheets for mixed learners.
> 2. **Simplify** text and generate home-language supports.
> 3. **Log interventions** in structured form.
> 4. **Detect patterns** across two weeks of memory.
> 5. **Plan tomorrow** using those patterns.
> 6. **Brief the EA** with a real-time synthesis.
> 7. **Draft family messages** for teacher approval.
> 8. **Forecast complexity** across the school day.
> 9. **Generate sub packets** for supply teachers.
> 10. **Track usage insights** to reflect on what works.
> 11. And underneath it: **routing logic** that sends faster transformations to the efficient tier and deeper synthesis to the larger tier.
>
> **[EVIDENCE]** The evidence portfolio documents this: system reliability at {successRate}% across {totalRequests} requests, latency within classroom-speed targets, and every output traceable to a rated feedback loop.
>
> For this demo, the real-model proof lane is hosted Gemma 4 through the Gemini API, using synthetic classroom data only. The same orchestration stack also keeps a separate local/Ollama lane for the privacy-preserving school deployment target. The classroom memory is SQL-based and the teacher remains fully in control. This is a **thinking partner**, not a decision-maker."

---

## TIMING SUMMARY

### Track A (Stakeholder Pitch)

| Step | Duration |
|------|----------|
| A1: Problem | 45 sec |
| A2: Solution (3 quick demos) | 90 sec |
| A3: Evidence + Usage Insights | 60 sec |
| A4: Safety principles | 45 sec |
| A5: Ask | 30 sec |
| **Total** | **~5 min** |

### Track B (Teacher Walkthrough)

| Step | Duration |
|------|----------|
| Setup | 2-3 min |
| B1: Classroom Context | 30 sec |
| B2: Differentiate | 2 min |
| B3: Language Tools | 1.5 min |
| B4: Family Communication | 2 min |
| B5: Review Cycle | 3 min |
| B6: Usage Insights | 1 min |
| B7: Closing narration | 1.5 min |
| **Total** | **~15 min** |

---

## NOTES FOR PRESENTER

- **Live mode:** If using the hosted Gemini lane, describe latency as classroom-speed rather than promising a fixed sub-2-second number.
- **Classroom is demo:** Remind audience this is a demo classroom with seed data, not real student records.
- **Two-lane story:** Say explicitly that hosted Gemini API is the hackathon proof lane and local/Ollama is the intended privacy-preserving deployment lane.
- **Two weeks of memory:** Pattern detection is most impressive with >7 observations. Less data = less compelling patterns.
- **Dark mode:** Use whichever mode is more visible to your audience.
- **Connectivity claim depends on lane:** If demoing Ollama, emphasise local/privacy-first. If demoing hosted Gemini, do not claim no-internet behaviour.
- **Teacher approval loop:** Repeat often -- every auto-generated output has a human approval gate.
- **[EVIDENCE] callouts:** Before the demo, run `npm run evidence:generate` to populate the evidence reports. Reference specific numbers from `docs/evidence/system-reliability.md` when you see `{successRate}` and `{totalRequests}` placeholders.
- **Usage Insights tab:** Navigate to it during the demo. It is in the Review group alongside Family Message and Support Patterns.

## Contingency notes

- **If a service crashes:** Restart in the relevant terminal. The UI will reconnect automatically.
- **If seeding fails:** Check that `data/memory/demo-okafor-grade34.sqlite` exists. If not, run `npx tsx data/demo/seed.ts` again.
- **If patterns don't show:** Ensure you have at least 4-5 logged interventions. Run the seed script and refresh.
- **If latency is >10 seconds:** Likely a model cold-start. Wait. Model loading is a one-time cost per session.
- **If Usage Insights shows empty:** Run `npm run evidence:generate` or exercise the feedback/session API routes first.
