# PrairieClassroom OS Kaggle 2026 Video Image Pack

Rendered for the mini-documentary product-proof video, **The Classroom Is Already Full**.

## Directories

- `png/` - final 1920x1080 PNG cards and lower-third overlays.
- `source/html/` - editable HTML/CSS source used to render the PNGs.
- `source/backgrounds/` - imagegen cinematic source backgrounds copied from the Codex generated image store.
- `prompts/` - per-asset prompt logs, exact text, and deterministic-compositing notes.
- `contact-sheet.png` - visual sheet of every PNG in the pack.

## Full-screen Cards

| File | Exact on-screen text | Timeline use |
|---|---|---|
| 01-cold-open-812.png | 8:12 AM<br>The classroom is already full. | 0:00-0:07 cold open; slow push-in with faint room tone. |
| 02-not-just-students.png | Not just students.<br>Reading levels · home languages · sensory needs<br>family messages · EA coverage · tomorrow’s plan | 0:07-0:18 hidden load; slight parallax/zoom. |
| 03-alberta-complexity-stat-card.png | Alberta classrooms are scaling in complexity.<br>835,089 K–12/ECS students<br>44,000+ EAL students in CBE<br>26,000 specialized learning needs in CBE<br>Sources: Alberta Education · CBE 2025–26 budget | 0:18-0:32 Alberta complexity stat card; let the stats breathe. |
| 04-the-crisis-is-coordination.png | The crisis is coordination. | 0:32-0:44 coordination crisis; music tension rises. |
| 05-product-reveal.png | PrairieClassroom OS<br>A teacher operating layer for inclusive classrooms<br>Built with Gemma 4 | 0:44-0:52 first product reveal. |
| 06-open-the-day.png | Open the day<br>What changed? Who needs attention? Where could the morning break down? | Use before Today View or as a chapter card if needed. |
| 07-one-worksheet-four-lanes.png | One worksheet → four readiness lanes<br>Core · Chunked · Extension · EAL supported | 1:08-1:13 transition into Differentiate workflow. |
| 08-observation-to-memory.png | Observation → classroom memory | Optional bridge into Clip C; use if pacing needs a still beat. |
| 09-tomorrow-to-ea.png | Tomorrow plan → EA briefing<br>Planning context becomes adult coordination. | Optional bridge between Tomorrow Plan and EA Briefing. |
| 10-teacher-approval-required.png | Draft only.<br>Teacher approval required.<br>No autonomous sends. | Use before or during Family Message safety beat. |
| 11-classroom-loop.png | Classroom signal<br>Gemma 4 synthesis<br>Teacher / EA action<br>Classroom memory | 2:00-2:10 diagram moment for the closed loop. |
| 12-gemma4-dual-tier.png | Gemma 4 live tier<br>Fast classroom transformations<br>Gemma 4 planning tier<br>Cross-record synthesis | 2:10-2:24 Gemma 4 dual-tier architecture. |
| 13-bounded-tools.png | Bounded tools<br>Curriculum lookup · intervention history · roster check | 2:24-2:33 technical trust beat. |
| 14-proof-of-work.png | Proof of work<br>12 workflow tools<br>13 prompt classes<br>134 eval cases | 2:43-2:50 proof flash or substitute for terminal shot. |
| 15-not-a-student-chatbot.png | Not a student chatbot.<br>A coordination layer for the adults holding the classroom together. | 2:50-2:56 closing claim guardrail. |
| 16-closing-card.png | PrairieClassroom OS<br>Built with Gemma 4<br>Synthetic Alberta classroom demo | 2:56-3:00 closing card; cut tightly if needed. |

## Lower Thirds

Transparent 1920x1080 overlays for Descript. Place each over the matching app screen recording.

| File | Exact on-screen text | Timeline use |
|---|---|---|
| lower-third-today.png | Today View<br>Morning triage · coverage risk · first move | Clip A Today View |
| lower-third-differentiate.png | Differentiate<br>One artifact → readiness-aligned variants | Clip B Differentiate workflow |
| lower-third-intervention.png | Log Intervention<br>Observation → classroom memory | Clip C Log Intervention |
| lower-third-tomorrow.png | Tomorrow Plan<br>Classroom memory → next-day action | Clip D Tomorrow Plan |
| lower-third-ea.png | EA Briefing<br>Planning context → adult handoff | Clip E EA Briefing |
| lower-third-family.png | Family Message<br>Draft only · teacher approval required | Clip F Family Message approval |
| lower-third-patterns.png | Support Patterns<br>Recurring signals across classroom memory | Clip G Support Patterns |

## Recommended Descript Use

1. Import the ElevenLabs narration first and use it as the timeline spine.
2. Import `png/` and the screen recordings.
3. Use the full-screen cards for the documentary story beats and the lower-thirds over real app footage.
4. Keep the image cards slow: subtle push-in or parallax only.
5. Keep captions small, restrained, and out of the UI capture area.
6. Do not add generic stock footage or colorful SaaS gradient motion.

## Export Settings

- Runtime target: 2:35-2:50, hard cap under 3:00.
- Format: 1920x1080, 30 fps, H.264.
- Voiceover: peak around -3 to -6 dB.
- Music: documentary piano/ambient bed around -24 to -30 dB under narration.

## Claim Guardrails

- Say: synthetic Alberta classroom demo.
- Say: teacher-controlled and draft-only where family communication appears.
- Say: hosted Gemma 4 proof only when tied to current synthetic/demo artifacts.
- Do not claim real student-data deployment.
- Do not claim real teacher validation or measured workload reduction.
- Do not claim fully offline/no-cloud operation.
- Do not claim the privacy-first Ollama proof passed on the current host.
- Do not imply autonomous family messaging.

## Rendering Note

Cinematic backgrounds were generated with imagegen. Final typography was composited deterministically from `source/html/` to preserve exact spelling, punctuation, and asset dimensions.
