# PrairieClassroom OS — 3 Minute Video Script

**Strategic posture (locked 2026-04-26):** lead with the multimodal Gemma-4 magic moment, follow with a real teacher voice, and reserve the offline-Ollama shot for the moment a viable host (≥16 GiB RAM) is available. The submission proof lane remains hosted Gemma 4 on synthetic/demo data; the offline shot reinforces *why Gemma 4* and is gated by the Ollama work in [docs/plans/2026-05-18-submission-plan.md](./plans/2026-05-18-submission-plan.md) Phase D.

This script supersedes the prior shot order. The earlier ordering (problem → differentiate → log → plan → message → tech) is preserved as the **fallback narrative** at the bottom of this doc for use only if the multimodal hero shot or teacher quote cannot be captured in time.

## Recording notes

- Target delivery pace: calm and deliberate, about 130 to 140 words per minute
- Total narration length: about 380 to 405 words
- Keep the screen moving every 8 to 12 seconds
- One proof overlay near the end so the technical story lands without slowing the demo
- Captions from Day 1 — judges often watch muted

---

## Primary Shot Order (lead with WOW)

### Shot 1 — Multimodal hero (0:00 – 0:18)

**Visual** — paper worksheet → phone photo → five differentiated variants on the laptop.

1. Hands holding a printed Grade 3/4 fractions worksheet, framed center on a clean desk in natural light.
2. Phone camera close-up taking the photo (overhead angle, shutter sound).
3. Cut to laptop screen: image dropped into the Differentiate panel's WorksheetUpload component.
4. Brief loading shimmer (Gemma 4 reading the image).
5. Reveal: five variant cards appear with reading-level chips visible.

**Exact narration (under 50 words)**

> "This is a paper worksheet. Eighteen seconds later, on a laptop, it is the same worksheet in five readiness-aligned versions. Support for Elena. EAL scaffolds for Amira and Daniyal. Extension for Chantal. This is a Gemma 4 vision call, on a teacher's laptop, doing what would have taken her thirty minutes by hand."

**Wow to land** — paper became differentiated instruction without retyping. Gemma-4-specific (multimodal), visceral, unmistakable.

### Shot 2 — Teacher voice (0:18 – 0:38)

**Visual** — talking head of the real teacher, or B-roll over their voice.

The 20-second clip captured during Phase C of the submission plan. Use only what the teacher actually said. Acceptable variants:

- "This is the part of my day that's hard."
- "I'd use this on Monday morning."
- "I'm not worried about it taking my judgment away."
- "I would want this for my EA."

**On-screen lower third** — first name only, role (e.g. "Grade 4 teacher, Alberta"), no school name.

**Wow to land** — there is a real human in this story, not just a synthetic persona.

> **Contingency:** If no usable teacher clip exists by Day 12 of the plan, replace this shot with a text-on-camera card: "Recruited from the structured-walkthrough rubric. Pilot session paperwork in `docs/pilot/`." Acknowledged compromise; lowers Impact score by ~3 points but keeps the video honest.

### Shot 3 — Mrs. Okafor problem framing (0:38 – 1:00)

**Visual** — Today panel, classroom roster, EA window indicator.

**Exact narration**

> "This is a synthetic Grade 3/4 split classroom in Lethbridge, Alberta. Twenty-six students. Eight learning English as an additional language. Sensory and transition supports. An educational assistant only in the morning. The hardest part of this day is not writing the lesson. It is coordinating everything around it."

**Wow to land** — coordination is the real problem; the product is a coordination layer.

### Shot 4 — Closed loop in motion (1:00 – 1:35)

**Visual** — Log Intervention → Support Patterns → Tomorrow Plan, in sequence with a brief animated arrow overlay between each.

1. Quick capture: "Brody used his visual timer independently for the first time during math centers."
2. Cut to Support Patterns: the structured record is now part of the pattern report.
3. Cut to Tomorrow Plan: planning-tier output references "the timer breakthrough" by retrieval, not invention.

**Exact narration**

> "A quick teacher note becomes structured memory. The planning workflow reads across recent records and returns specific next-day actions. Not generic advice. 'Have the timer ready for the nine-fifteen transition.' 'Build on Wednesday's math win with Elena.' This is where the system stops looking like a chatbot and starts looking like an operating layer."

**Wow to land** — the closed loop is not a slide; it is the demo.

### Shot 5 — Offline / Why Gemma 4 (1:35 – 2:00)

**Visual** — terminal showing `ollama ps` listing `gemma4:27b` running locally; menubar Wi-Fi indicator visible. Disconnect Wi-Fi mid-shot. Generate a Tomorrow Plan in the web app — it succeeds.

**Exact narration**

> "Same workflow. No cloud. No teacher data leaving the room. This is Gemma 4 running entirely on a laptop. It is why the model choice matters: open weights, real on-device privacy, and a deployment story for an Alberta classroom with spotty internet."

**Wow to land** — Gemma 4 specificity is *demonstrated*, not asserted.

> **Contingency:** If the Ollama lane has not landed on a viable host by Day 12, replace this shot with a 25-second framing of the privacy boundary: hosted lane is synthetic-demo only; intended deployment path is local. Less wow; still honest. **Capturing this shot is the single largest score lever remaining.**

### Shot 6 — Safety and teacher control (2:00 – 2:25)

**Visual** — Family Message draft + approval dialog. Do not click send.

**Exact narration**

> "Family communication is bounded. The system drafts a plain-language note. The teacher reviews, edits, and approves. The approval gate is permanent. PrairieClassroom OS is designed to reduce coordination load without removing professional control."

**Wow to land** — adult-judgment-preserving by design, not by policy.

### Shot 7 — Technical proof and close (2:25 – 3:00)

**Visual** — full UI shell. Overlay one card with the latest hosted gate artifact and the eval count. End on product name + tagline.

**Exact narration**

> "This is a Gemma-4-native architecture. A live tier for fast classroom transformations. A planning tier with selective thinking for cross-record synthesis. Roster-checked function calling so the model cannot confirm a student who does not exist. Twelve workflow tools. One hundred thirty-four checked-in eval cases. Four daily teacher jobs. One closed loop. Built for the Future of Education track because inclusive teaching is a coordination problem, and coordination is a Gemma 4 problem."

**Final on-screen**

- `PrairieClassroom OS`
- `A Gemma-4-native operating layer for inclusive classrooms`

---

## Full Teleprompter Read (primary, 3:00 cut)

Use this when recording in one pass. The pause markers are pacing cues, not spoken words.

> This is a paper worksheet. [pause] Eighteen seconds later, on a laptop, it is the same worksheet in five readiness-aligned versions. [pause] Support for Elena. [pause] EAL scaffolds for Amira and Daniyal. [pause] Extension for Chantal. [pause] This is a Gemma 4 vision call, on a teacher's laptop, doing what would have taken her thirty minutes by hand.

> [Teacher quote — 20 seconds, no narration overlap]

> This is a synthetic Grade 3/4 split classroom in Lethbridge, Alberta. [pause] Twenty-six students. [pause] Eight learning English as an additional language. [pause] Sensory and transition supports. [pause] An educational assistant only in the morning. [pause] The hardest part of this day is not writing the lesson. [pause] It is coordinating everything around it.

> A quick teacher note becomes structured memory. [pause] The planning workflow reads across recent records and returns specific next-day actions. [pause] Not generic advice. [pause] Have the timer ready for the nine-fifteen transition. [pause] Build on Wednesday's math win with Elena. [pause] This is where the system stops looking like a chatbot and starts looking like an operating layer.

> Same workflow. [pause] No cloud. [pause] No teacher data leaving the room. [pause] This is Gemma 4 running entirely on a laptop. [pause] It is why the model choice matters: open weights, real on-device privacy, and a deployment story for an Alberta classroom with spotty internet.

> Family communication is bounded. [pause] The system drafts a plain-language note. [pause] The teacher reviews, edits, and approves. [pause] The approval gate is permanent. [pause] PrairieClassroom OS is designed to reduce coordination load without removing professional control.

> This is a Gemma-4-native architecture. [pause] A live tier for fast classroom transformations. [pause] A planning tier with selective thinking for cross-record synthesis. [pause] Roster-checked function calling so the model cannot confirm a student who does not exist. [pause] Twelve workflow tools. [pause] One hundred thirty-four checked-in eval cases. [pause] Four daily teacher jobs. [pause] One closed loop. [pause] Built for the Future of Education track because inclusive teaching is a coordination problem, and coordination is a Gemma 4 problem.

---

## Tight Cut (2:40 backup)

Use this if the 3:00 cut overruns or the teacher clip is unavailable and only multimodal opens.

- Shot 1 (multimodal hero) — 0:00 – 0:18
- Shot 3 (problem framing) — 0:18 – 0:38 (compressed)
- Shot 4 (closed loop) — 0:38 – 1:08
- Shot 5 (offline / why Gemma 4) — 1:08 – 1:32
- Shot 6 (safety) — 1:32 – 1:55
- Shot 7 (technical proof and close) — 1:55 – 2:40

---

## Production Asset Checklist

Captured assets needed for the primary cut:

- [ ] Paper worksheet — printed Grade 3/4 fractions (use the script in [docs/demo-script.md](./demo-script.md) §B2).
- [ ] Phone photo of the worksheet (overhead, natural light, in focus).
- [ ] Screen recording of the WorksheetUpload → 5 variants flow.
- [ ] Teacher quote, ≤20 seconds, anonymized lower third.
- [ ] Screen recording of Today panel showing 26-student roster and EA window.
- [ ] Screen recording of Log Intervention → Support Patterns → Tomorrow Plan sequence.
- [ ] Terminal recording: `ollama ps` + Wi-Fi off + Tomorrow Plan generates (gated on Phase D Ollama work).
- [ ] Screen recording of Family Message draft + approval dialog.
- [ ] Hosted-gate artifact overlay (date and gate-id text on transparent background).

If any one of these is missing 5 days before submission, escalate per the contingencies above.

---

## Fallback narrative (legacy ordering)

The earlier shot order — problem hook → differentiate → log → plan → message → tech — remains a viable structure if the multimodal hero shot is unrecoverable and the teacher session falls through. It scores lower than the primary order but is honest and well-rehearsed. See git history of this file for the prior version.
