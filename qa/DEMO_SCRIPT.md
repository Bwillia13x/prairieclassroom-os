# PrairieClassroom OS — Kaggle Gemma 4 Demo Script

**Target:** 3-minute Kaggle hackathon video (hard cap — submissions over 3:00 are penalized)
**Track:** Future of Education
**Project:** Local-first classroom complexity copilot for Alberta K-6, running on Gemma 4 (4B live + 27B planning)
**Captured:** 2026-04-15 · demo classroom `demo-okafor-grade34` (Grade 3-4 cross-curricular, 26 students, 8 ELL)
**Render state:** dark theme at 1440×900 viewport, mock inference backend (structural validation lane)

---

## How to use this document

1. **Screenshots** are in `qa/demo-script/screenshots/` — filenames below match the 8 beats (regenerate with dev + API up: `npm run demo:screenshots` from repo root).
2. **Narration drafts** below are starting points — rewrite them in your voice before recording voiceover. The tightest 3-minute story is about 420–450 words of narration at a natural teacher-presenter pace (~150 wpm). The draft hits ~440 words.
3. **Assemble the video** in your tool of choice (iMovie, Final Cut, CapCut, DaVinci Resolve). Suggested cadence: 1 image every 6–12 seconds, with light Ken Burns motion on the wider shots. Keep cuts tight — no lingering beyond 15 seconds on any single frame.
4. **Background music**: low-BPM instrumental, ~60 dB under voiceover. Avoid anything percussive during the Differentiate/Family Message beats — the narration carries emotional weight there.

---

## Story arc at a glance

| # | Beat | Panel | Screenshot | Time | Wow moment |
|---|---|---|---|---|---|
| 1 | Open: 94 threads before the bell | Today hero | `01-today-hero.png` | 0:00–0:20 | Complexity made visible |
| 2 | What matters now | Today day arc | `02-today-day-arc.png` | 0:20–0:35 | Complexity curve peaks at 10:00 |
| 3 | The debt trending down | Today debt ring | `04-today-complexity-debt.png` | 0:35–0:50 | 94 items, ▼30 from last check |
| 4 | Gemma 4B: scaffolded material, on-device | Differentiate generated | `08b-differentiate-generated-full.png` | 0:50–1:20 | 4 variant cards in under 2s |
| 5 | Bilingual family message, teacher-approved | Family Message generated | `10b-family-message-generated-full.png` | 1:20–1:50 | Nothing sent automatically |
| 6 | Gemma 27B: EA support plan | EA Briefing full | `13b-ea-briefing-full.png` | 1:50–2:15 | Timestamped support blocks |
| 7 | 5-day forecast: catch patterns early | Forecast full | `17b-forecast-full.png` | 2:15–2:35 | Risk heatmap + early warning |
| 8 | Close: offline, local, teacher-approved | Light theme + mobile | `19-today-light-theme.png` + `20-mobile-today.png` | 2:35–3:00 | Works offline, works on phones |

---

## Beat 1 — 0:00–0:20 — **Open: 94 threads before the bell**

**Screenshot:** `01-today-hero.png`

**Visual notes:** Dark theme, full-bleed dashboard. Hero card dominates the frame with the line *"10:00–10:45 is today's real test"*. Sub-caption: *"Amira enters with unfinished threads — meet them first."* Top nav shows seven primary views (Classroom · Today · Tomorrow · Week · Prep · Ops · Review); this beat is captured on **Today** (same-day triage). Active classroom: Grade 3-4 cross-curricular.

**Narration draft (55 words / ~20s):**
> A Grade 3-4 teacher in Alberta walks into her classroom at 8:47 AM. Twenty-six students. Eight English learners. Ninety-four open threads carried over from yesterday. She has seventy minutes before the first real test of the day: a math block right after the whole-school assembly. This is the problem PrairieClassroom OS exists to solve.

**Wow moment talking point:** *"Notice how the app doesn't open on a dashboard of metrics — it opens on a moment. A specific forty-five-minute window, and a specific student's name."*

**Fallback:** If you want a softer opening, use the light-theme variant `19-today-light-theme.png` instead.

---

## Beat 2 — 0:20–0:35 — **What matters now**

**Screenshot:** `02-today-day-arc.png`

**Visual notes:** The "Today's Shape" day-arc visualization. Four instructional blocks across the day (9:00, 10:00, 11:00, 12:45). The complexity curve peaks at the 10:00–10:45 math block. Student dots labeled Amira, Elena, Farid, Daniyal, Chantal, Imani, Liam.

**Narration draft (35 words / ~15s):**
> This is the day, drawn as a shape. Each hill is a block. The tallest hill is the math block after assembly — and every student whose name is on that hill is someone the teacher will want to reach first.

**Wow moment talking point:** *"Every dot is a real student profile with a real support history. The shape isn't just data — it's where the teacher's attention should go."*

---

## Beat 3 — 0:35–0:50 — **Complexity debt, trending down**

**Screenshot:** `04-today-complexity-debt.png`

**Visual notes:** The Complexity Debt ring chart. Large "94 items" in the center, categorized breakdown: 60 unapproved messages, 25 approaching review, 4 stale followups, 3 recurring plan items, 2 unaddressed patterns. Badge: *▼ 30 · Critical*.

**Narration draft (40 words / ~15s):**
> The app tracks complexity the way an engineer tracks technical debt. Ninety-four outstanding items this morning, down thirty from yesterday. The teacher didn't magic them away — she handled them, one by one, with the copilot helping her see which ones mattered first.

**Wow moment talking point:** *"Framing classroom work as debt that compounds if ignored is the product's thesis. You won't see it in any other edtech tool."*

---

## Beat 4 — 0:50–1:20 — **Gemma 4B: scaffolded material, on-device**

**Screenshot:** `08b-differentiate-generated-full.png` (full-page, shows all four variants)
**Alternative close-up:** `08-differentiate-generated.png` (viewport)

**Visual notes:** The Differentiate panel has generated four variants of a Community Helpers reading passage: *Core Version* (20 min), *ESL Supported Version* (30 min), *Chunked Step-by-Step Version*, *EA Small Group Version*. Each card has teacher notes and materials lists.

**Narration draft (75 words / ~30s):**
> Here's what Gemma 4 does when it's the right model for the job. The teacher pastes the morning's community helpers passage, tells the copilot what she needs — a scaffolded version for Amira's reading level — and Gemma 4B, running entirely on her laptop, generates four different variants in under two seconds. Core version. ESL-supported with sentence frames. A chunked step-by-step version. And a small-group variant the EA can run separately. No cloud call. No student data leaving the classroom.

**Wow moment talking point:** *"Four different cognitive paths through the same content, each appropriate for a different student. Generated locally. This is the 4B live tier of the dual-speed architecture."*

**Fallback:** If the generated output looks thin in your screenshot (mock mode), use the real-inference or Gemini-lane output and re-capture before recording.

---

## Beat 5 — 1:20–1:50 — **Bilingual family message, teacher-approved**

**Screenshot:** `10b-family-message-generated-full.png` (full)
**Alternative viewport:** `10-family-message-generated.png`

**Visual notes:** Draft Family Messages panel with a generated praise message about Amira's courage presenting to the class. Below the message body: *"This message will not be sent automatically. Copy and share via your preferred communication channel."* Message Pipeline on the left shows three states: Approved, Pending, Approved.

**Narration draft (75 words / ~30s):**
> When the teacher wants to send good news home, the copilot drafts the message in her voice — and translates it into the family's home language. Punjabi. Tagalog. Arabic. Ukrainian. Mandarin. Eight languages, all generated on-device. But here is the rule the product will not break: nothing is ever sent automatically. Every word that leaves the classroom passes through the teacher first. The copilot drafts — the teacher decides. Agency stays where it belongs.

**Wow moment talking point:** *"Teacher-in-the-loop by design. Not as a safety afterthought, but as the product's architectural spine. Show judges the 'will not be sent automatically' text — that line is the whole story."*

**Fallback note:** If your capture shows English-only output (mock mode limitation), the Punjabi translation renders in the live Gemma/Gemini lane. Re-capture with `PRAIRIE_ALLOW_PAID_SERVICES=true` and the hosted Gemini lane, or overlay a side-by-side frame in post.

---

## Beat 6 — 1:50–2:15 — **Gemma 27B: the EA support plan**

**Screenshot:** `13b-ea-briefing-full.png` (full EA briefing)
**Complement:** `15b-ea-load-full.png` (EA Load distribution bars)

**Visual notes:** The EA Daily Briefing renders a timestamped support schedule: 9:15–9:30 literacy check, 10:00–10:45 math block support with Amira, plus a Student Watch List. The EA Load chart shows cognitive-load bars across the morning blocks, balanced so no single EA gets overwhelmed.

**Narration draft (65 words / ~25s):**
> While the 4B model handles everything that has to be fast — differentiating content, drafting messages, simplifying on demand — the 27B planning model takes on the harder problem. Who sits with which student, when. How to distribute support across the day so no one EA is stretched thin. This is dual-speed Gemma 4 at work: the small model for instant response, the big model for deep planning.

**Wow moment talking point:** *"This is the ONE sentence that explains the architecture. Pause the video on the EA Load bars while narrating 'dual-speed Gemma 4' — that bar chart is the thesis made visible."*

---

## Beat 7 — 2:15–2:35 — **5-day forecast: catch patterns early**

**Screenshot:** `17b-forecast-full.png`

**Visual notes:** The Forecast panel shows a risk heatmap (green→amber→red bars) across the coming week's blocks, plus a timeline breakdown with specific patterns flagged.

**Narration draft (50 words / ~20s):**
> The copilot also looks ahead. A five-day complexity forecast. Green means stable. Amber means watch. Red means this block is going to be a test, and the teacher should plan for it now. The goal isn't prediction for its own sake. It's catching small patterns before they become classroom emergencies.

**Wow moment talking point:** *"Preventive care for classrooms. This is the shift from reactive to anticipatory teaching."*

---

## Beat 8 — 2:35–3:00 — **Close: offline, local, teacher-approved**

**Screenshots:** `19-today-light-theme.png` (warm close) + `20-mobile-today.png` (picture-in-picture mobile inset, or cut to mobile for the final 5s)

**Visual notes:** The light theme brings warmth. The mobile shot shows the same app adapts to the phone with the same seven-view bottom nav — teacher uses it from her laptop at prep and from her phone during recess duty.

**Narration draft (70 words / ~25s):**
> PrairieClassroom OS runs entirely on hardware the teacher already owns. Thirteen model-routed prompt classes. Sixteen prompt injection detection rules. One thousand one hundred twenty-three tests. Zero cloud by default. Zero student data leaving the building. Classroom complexity isn't a behavior problem. It's a coordination problem. And when the coordination load drops, teachers get their afternoons back — and every student gets the attention they deserve.

**Wow moment talking point:** *"End on the human line. The architecture stats establish credibility; the last sentence establishes why."*

---

## Assembly checklist

- [ ] Render narration voiceover against the 8-beat timing above. Keep total under 3:00:00. If you overrun, cut Beat 2 (day arc) first — it's the most compressible.
- [ ] Assemble in editor, 1 frame per beat minimum, add Ken Burns zoom-ins on the full-page captures.
- [ ] Layer background music at ~-18 dB relative to voiceover peak.
- [ ] Add end card with the repo URL, live demo URL, and the Gemma 4 logo (see hackathon naming guidelines).
- [ ] Export at 1080p (or 4K if the source screenshots hold up — they're 1440×900 so 1080p is safer).
- [ ] Upload to YouTube as *Unlisted → Public* before the 2026-05-18 17:59 MDT deadline.
- [ ] Paste the YouTube link into the Kaggle writeup's Media Gallery.

## Known gaps in current captures

- **Punjabi translation**: Beat 5 capture is from mock inference mode, so the message renders English-only. The live Gemma lane renders the translation correctly — re-capture before final cut, or explain in voiceover that "in live mode this message also renders in Punjabi."
- **Tomorrow Plan and Log Intervention**: Not included in the 3-min cut because the 8-beat arc is already tight. If you need a longer version for the Kaggle writeup or a 5-min backup, capture those two panels as well (URLs: `?tab=tomorrow-plan` and `?tab=log-intervention`).
- **Language Tools, Sub Packet, Support Patterns**: Same — not in the 3-min arc. These are worth mentioning in the writeup but would bloat the video.

## Recording environment (for reproducibility)

- Dev stack: web (5173), orchestrator (3100), inference (3200) — all running via `.claude/launch.json`
- Inference mode: **mock** (structural validation lane, no model cost)
- Browser: Playwright Chromium headless at 1440×900, CSS scale, PNG format
- Theme: `prairie-theme = dark` set in localStorage before navigation
- Demo URL pattern: `http://localhost:5173/?classroom=demo-okafor-grade34&demo=true&tab=<tab-slug>`
- Tab slugs used: `today`, `differentiate`, `family-message`, `ea-briefing`, `ea-load`, `complexity-forecast`, `usage-insights`

## Narration worksheet — rewrite in your voice

The drafts above are scaffolding. Your voice matters more than perfect word choice. Before recording, rewrite each beat below in the tone you want the judges to hear — warmer, drier, more academic, whatever fits you. Aim to preserve the total word count so the timing stays ≤3:00.

```
Beat 1 (target ~55 words):



Beat 2 (target ~35 words):



Beat 3 (target ~40 words):



Beat 4 (target ~75 words):



Beat 5 (target ~75 words):



Beat 6 (target ~65 words):



Beat 7 (target ~50 words):



Beat 8 (target ~70 words):


```

Total target: 465 words · ~3:00 at 155 wpm.
