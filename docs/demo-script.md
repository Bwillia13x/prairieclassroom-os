# PrairieClassroom OS — Demo Walkthrough Script

**Target audience:** Educators, school leaders, community stakeholders  
**Duration:** ~15 minutes  
**System:** Gemma-4-native classroom complexity copilot  
**Demo classroom:** Mrs. Okafor's Grade 3/4 split, Lethbridge (6 students)

---

## SETUP

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

### Open demo URL
Navigate to: **http://localhost:5173/?demo=true**

You should see the UI with the classroom selector pre-populated to `demo-okafor-grade34`.

---

## STEP 1: Classroom Context (30 seconds)

### What to click/show
- **Show the classroom selector dropdown** at the top of the screen.
- **Verify `demo-okafor-grade34` is selected.**
- Briefly scroll through the **classroom roster** on the left sidebar to show the 6 students:
  - **Amira** — EAL L2 (Tagalog home), strong in math
  - **Brody** — sensory/transition needs
  - **Chantal** — extension/peer mentor  
  - **Daniyal** — EAL L1 (Urdu, new to school)
  - **Elena** — math anxiety
  - **Farid** — EAL L3 (Arabic, verbal > written)

### What to narrate to audience
> "This is Mrs. Okafor's Grade 3/4 split in Lethbridge. Twenty-four students total, with three who are EAL learners in different stages of language acquisition. Brody has sensory needs—he needs transition scaffolding between activities. The EA, Ms. Fehr, is here mornings only. And the system has two weeks of classroom memory: every observation, interaction log, and support plan is woven together to inform what we do next."

### What to point out
- **Real-world complexity:** mixed grades, EAL diversity, accessibility needs, shared staffing.
- **Continuous memory:** the system doesn't start from scratch; it knows the last two weeks.

---

## STEP 2: Differentiate (2 minutes)

### What to click
- **Navigate to the "Differentiate" workflow** (typically in the left nav or main menu).
- **Click "Upload worksheet" or "Paste content."**
- **Paste the following sample fractions worksheet text:**

```
Fractions Review Worksheet

1. Circle the larger fraction: 1/4 or 1/3?

2. Show 2/3 on the number line below.
   [─────────────────]

3. Solve: 1/2 + 1/4 = ___

4. Mrs. Okafor has 3/4 of a pizza. If she eats 1/4, how much is left?

5. Write a fraction that is equal to 1/2.

6. Challenge: 5/6 - 2/6 = ___
```

### Set teacher goal
- In the goal field, write something like:
  > "I need this differentiated for mixed abilities: support for Elena (math anxiety), extension for Chantal (advanced), and EAL adaptations for Amira and Daniyal."

### Generate variants
- **Click "Generate 5 variants."**
- Wait ~2–5 seconds for the model to return results.

### What to point out
- **EAL-supported version for Amira/Daniyal:**
  - Simpler language
  - Visual supports (diagrams)
  - Vocab pre-teaching suggestions
- **Scaffolded version for Elena:**
  - Step-by-step guides
  - Confidence-building language ("Great start!")
  - Problem setup with worked example
- **Challenge version for Chantal:**
  - Multi-step problems
  - Real-world context variation
- **Latency:** "The live tier is built for classroom-speed responses; for the hosted hackathon lane, frame this as a few seconds rather than promising an exact number."

---

## STEP 3: Language Tools (1.5 minutes)

### What to click
- **Navigate to "Language Tools"** (or similar section in the UI).
- **Choose "Simplify for EAL beginner."**
- **Paste the same fractions worksheet text.**

### Show the simplified output
- The model should simplify the language, shorten sentences, and add images/icons.

### Generate Tagalog vocab cards
- **Click "Generate vocab cards"** and select **Tagalog** (Amira's home language).
- The system should output flashcards with:
  - English: "half" / Tagalog: "kalahati"
  - English: "fraction" / Tagalog: "bahagi"
  - etc.

### What to narrate
> "These tools are ephemeral—they don't persist to the record. They're on-demand supports that a teacher can generate and use right away. Amira's family gets Tagalog vocab cards. Elena gets a simplified version. No permanent noise in the system."

### What to point out
- **Teacher agency:** tools are suggestions, not decisions.
- **Language-aware:** the system knows Amira's home language and can generate supports in it.
- **No record clutter:** one-off tools don't pollute the student database.

---

## STEP 4: Log Intervention (1.5 minutes)

### What to click
- **Navigate to "Log intervention"** (or "New observation" in the sidebar).
- **Write a free-text observation** like:

```
Brody used his visual timer independently during the math center rotation today. 
He set it for 10 minutes, watched it count down, and transitioned to the next station 
without adult prompting. This is the first time he's done this without support.
```

### Show the structured output
- After pasting, the model should structure it into:
  - **Observation:** what happened (free-form note)
  - **Action taken:** what the teacher did (or didn't do)
  - **Outcome:** what resulted
  - **Follow-up needed:** yes/no

### What to narrate
> "The system is reading free text and organizing it into a structure that persists and informs the rest of the platform. Brody's milestone—using the visual timer independently—is now part of his record. When we generate his support plan later, the system will remember this."

### What to point out
- **NLP-structured logs:** free-form becomes structured without extra teacher steps.
- **Follow-up routing:** the `follow_up_needed` flag correctly set based on content.
- **Memory persistence:** observation feeds directly into classroom memory for future analyses.

---

## STEP 5: Support Patterns (2 minutes)

### What to click
- **Navigate to "Support patterns"** or **"Analyze patterns"** in the UI.
- **Click "Detect patterns"** or similar action.
- Wait ~3–5 seconds for the analysis.

### Show the pattern report
The system should return a pattern report like:

- **Recurring themes:**
  - Brody's transition struggles and sensory regulation strategies (3 observations, all successful with visual timer)
  - Elena's confidence dips during timed activities (2 observations)
  - Amira's strength in collaborative problem-solving
  
- **Follow-up gaps:**
  - Elena's family has not been updated on progress (flagged as pending)
  - Daniyal's phoneme workshop progress unclear (needs check-in)

- **Positive trends:**
  - All three EAL learners showing growth in verbal participation
  - Brody's independence trend is sharp and positive

### Show thinking disclosure (planning tier only)
- If running in planning tier, show the **reasoning trace:**
  - "Analyzing 8 intervention records across 2 weeks…"
  - "Clustering by student and intervention type…"
  - "Identifying gaps in follow-up communication…"

### What to narrate
> "The system is reading everything—every observation, every action, every outcome. It's not guessing; it's analyzing your actual records. The thinking is visible, so you can see exactly how it arrived at these patterns. And notice the language: 'Your records show…' not 'I think…' The system is reflecting your professional judgment back to you."

### What to point out
- **Observational language:** "Your records show" reinforces that the system is synthesizing teacher data, not prescribing.
- **Transparency:** visible reasoning trace shows exactly what the model is considering.
- **Actionability:** themes are specific enough to guide next steps.

---

## STEP 6: Tomorrow Plan (2 minutes)

### What to click
- **Navigate to "Tomorrow plan"** or **"Plan for tomorrow."**
- **Write a reflection** about the week in the reflection field:

```
This week has been a breakthrough for Brody—the visual timer is working, 
and he's gaining independence. Elena had a real confidence moment on Wednesday 
when she solved the fraction problem without help. But I'm worried about Monday 
because we have the community math event and the routine will be disrupted. 
Chantal is being a great peer mentor to Daniyal. The EA (Ms. Fehr) is only here 
in the morning, so transitions after lunch are still tough.
```

### Generate pattern-informed plan
- **Click "Generate plan for tomorrow."**
- Wait ~3–5 seconds.

### Show the plan output
The system should generate a **Tomorrow Plan** with:

- **Pattern-informed badge:** "Plan informed by 8 observations and 3 prior plans"
- **Specific EA actions:**
  - "Ms. Fehr (morning): Monitor Brody at 9:15 transition; have visual timer prepped"
  - "Ms. Fehr (before departure at 12:00): Brief hand-off to you on Elena's confidence gains"
- **Student watch list:**
  - Brody: Success trigger (visual timer working) + transition point (lunch)
  - Elena: Celebrate Wednesday win + introduce challenge problem
  - Daniyal: Pair with Chantal for peer support during routine shift
- **Family follow-ups pending:**
  - Elena's family: send brief note about math breakthrough
  - Daniyal's family: check in on ESL workshop progress

### What to narrate
> "This plan isn't generic. It's informed by what you've actually observed. It knows Brody's success with the timer. It knows Elena's breakthrough on Wednesday. It knows Ms. Fehr leaves at noon and the routine will change on Monday. And it's specific: not 'support Brody' but 'have the timer prepped at 9:15.'"

### What to point out
- **Pattern-informed badge:** shows the system is working from real data.
- **Specific time/student pairing:** actions are concrete and assignable (not vague).
- **Family follow-ups:** flagged for you to execute, not automated.

---

## STEP 7: EA Briefing (1 minute)

### What to click
- **Navigate to "EA briefing"** or **"Generate briefing"** section.
- **Click "Generate briefing for Ms. Fehr"** (or similar).

### Show the briefing output
The system should generate a brief, actionable briefing like:

```
Good morning, Ms. Fehr!

Schedule: Morning duty, 8:30–12:00 (hand-off at noon).

Watch list:
• Brody: Visual timer success continuing. Monitor 9:15 transition (Math center → ELA).
• Elena: Had a real confidence win on Wednesday. Offer challenge problem this morning.
• Daniyal: Pair with Chantal for peer support during the disrupted Monday routine.

Pending:
• Check in with Elena's family about math progress (you can draft; Mrs. O approves).

See you at 8:30!
```

### What to narrate
> "This briefing is a synthesis, not a record. Ms. Fehr sees what she needs to know—priorities, changes, watch points. It's not persisted as a formal document. It's a real-time synthesis of the classroom memory, generated fresh each morning."

### What to point out
- **Not autonomous:** The EA still makes decisions and has judgment.
- **Synthesis view:** Information is compiled, not prescriptive.
- **Ephemeral:** Tomorrow's briefing will be different because there will be new observations.

---

## STEP 8: Family Message (1 minute)

### What to click
- **Navigate to "Family message"** or **"Draft message"** section.
- **Click "New message"** and select **Brody** as the student.
- **Write a brief teacher note:**

```
Brody used his visual timer independently today during math centers for the 
first time. He set it, watched it, and moved to the next station without 
reminders. We're so proud of his growing independence!
```

### Show the drafted message
- The system should generate a plain-language version ready for approval:

```
Hi Brody's family!

We wanted to share a wonderful moment from this week. Brody used his visual 
timer by himself during math time—he set it, watched it count down, and moved 
to the next activity all on his own. This shows real growth in his ability to 
manage transitions independently. We're excited to see him building this skill!

Best,
Mrs. Okafor
```

### Approval gate
- **Show the "Approve & send" button.**
- **Do NOT click it.** Emphasize: "Even after refinement, the teacher approves before any message leaves the classroom."

### What to narrate
> "The system can draft messages—but it never sends them. It's plain language, warm, specific to what actually happened. The teacher reads it, can edit it, and only then does it go home. No autonomous communication."

### What to point out
- **Teacher remains the voice:** Messages are suggestions that reflect observed facts.
- **No dark patterns:** No auto-send, no pre-checked boxes.
- **Approval is required:** The human is always in the loop.

---

## CLOSING NARRATION

> "PrairieClassroom OS is not a chatbot. It's eight structured workflows:
> 
> 1. **Differentiate** worksheets for mixed learners.
> 2. **Simplify** text and generate home-language supports.
> 3. **Log interventions** in structured form.
> 4. **Detect patterns** across two weeks of memory.
> 5. **Plan tomorrow** using those patterns.
> 6. **Brief the EA** with a real-time synthesis.
> 7. **Draft family messages** for teacher approval.
> 8. And underneath it: **routing logic** that sends faster transformations to the efficient tier and deeper synthesis to the larger tier.
>
> For this hackathon demo, the real-model proof lane is hosted Gemma 4 through the Gemini API, using synthetic classroom data only. The same orchestration stack also keeps a separate local/Ollama lane for the privacy-preserving school deployment target. The classroom memory is SQL-based and the teacher remains fully in control. This is a **thinking partner**, not a decision-maker.
>
> We've evaluated the workflow contracts on realistic classroom scenarios and keep the structural gate green locally. The hosted Gemini lane is the hackathon proof path, and the current checked-in hosted proof now includes a passing full hosted gate on synthetic/demo data. The Ollama lane remains the privacy-first future deployment path. The claim here is still careful and honest: when teachers have a partner that remembers context and surfaces the right information at the right time, the coordination work becomes more manageable.
>
> That's the promise of PrairieClassroom OS."

---

## TIMING SUMMARY

| Step | Duration | Notes |
|------|----------|-------|
| Setup | 2–3 min | Run all services, seed data (first time only), open URL |
| Step 1: Classroom Context | 30 sec | Show roster, narrate complexity |
| Step 2: Differentiate | 2 min | Upload worksheet, set goal, generate 5 variants |
| Step 3: Language Tools | 1.5 min | Simplify + vocab cards |
| Step 4: Log Intervention | 1.5 min | Free-text note → structured observation |
| Step 5: Support Patterns | 2 min | Detect patterns, show reasoning, point out themes |
| Step 6: Tomorrow Plan | 2 min | Reflection → pattern-informed plan with specific actions |
| Step 7: EA Briefing | 1 min | Synthesis (not persistence) for morning staff |
| Step 8: Family Message | 1 min | Draft + approval gate (no auto-send) |
| **Closing narration** | 1.5 min | Recap 8 workflows, routing logic, evaluations |
| **Total** | **~15 min** | |

---

## NOTES FOR PRESENTER

- **Live mode:** If you are using the hosted Gemini lane, describe latency as classroom-speed rather than promising a fixed sub-2-second number.
- **Classroom is demo:** Remind audience that this is a demo classroom with seed data, not real student records.
- **Two-lane story:** Say explicitly that hosted Gemini API is the hackathon proof lane and local/Ollama is the intended privacy-preserving deployment lane.
- **Two weeks of memory:** The pattern detection is most impressive when the classroom has >7 observations. Less data = less compelling patterns.
- **Dark mode:** If the UI has a dark mode toggle, use whichever is more visible to your audience.
- **Connectivity claim depends on lane:** If you are demoing Ollama, emphasize the local/privacy-first path. If you are demoing hosted Gemini, do not claim no-internet or no-cloud behavior.
- **Teacher approval loop:** Repeat this often—every auto-generated output has a human approval gate.

---

## Contingency notes

- **If a service crashes:** Restart in the relevant terminal. The UI will reconnect automatically.
- **If seeding fails:** Check that `data/memory/demo-okafor-grade34.sqlite` exists. If not, run `npx tsx data/demo/seed.ts` again.
- **If patterns don't show:** Ensure you have at least 4–5 logged interventions. If the demo database is fresh, they may not be seeded. Run the seed script and refresh.
- **If latency is >10 seconds:** Likely a model cold-start. Wait. Model loading is a one-time cost per session.
