# PrairieClassroom OS Submission Video Storyboard - 2026-05-09

## Target

- Duration: 2:00
- Format: 1920x1080, 30 fps, H.264 MP4
- Render surface: Remotion composition `PrairieClassroomSubmission`
- Optional voiceover: ElevenLabs scene clips generated into `apps/marketing-video/public/audio/`
- Captions: burned in by default for silent review and accessible voiceover playback
- Visual style: grounded classroom evidence, actual app screenshots, restrained proof overlays, no unproven claims

## Storyboard

| Time | Beat | Visual | Narration |
| --- | --- | --- | --- |
| 0:00-0:12 | Opening proof | Generated worksheet-to-laptop image with five abstract variants | This is the opening proof: a paper worksheet becomes five usable access routes without the teacher retyping the artifact. |
| 0:12-0:26 | Problem | Today dashboard screenshot | The real problem is coordination. In a synthetic Grade 3/4 room, the day includes language supports, sensory routines, family follow-up, and a morning-only educational assistant. |
| 0:26-0:41 | Product shape | Generated teacher/EA coordination desk image | PrairieClassroom OS organizes that work around four adult jobs: open the day, adapt instruction, prepare tomorrow, and coordinate with adults or families. |
| 0:41-0:57 | Adapt instruction | Differentiate workflow screenshot | Gemma 4 matters because the workflow can read the classroom artifact, transform it quickly, and keep the learning goal intact across different supports. |
| 0:57-1:15 | Closed loop | Generated loop visual with animated labels | A quick teacher note becomes structured memory. That memory feeds tomorrow's plan, the EA briefing, the next family message, and the following pattern review. |
| 1:15-1:31 | Safety boundary | Generated teacher-approval desk image | Safety is practical here. The system can draft a family message, but it cannot send one. The teacher reviews, edits, and approves before anything leaves the classroom. |
| 1:31-1:47 | Proof boundary | Generated local-privacy image with claim guardrails | The proof lane stays honest: proof and claims checks pass, hosted Gemma proof is synthetic-demo only, and the privacy-first local deployment path is separate until the Ollama host is proven. |
| 1:47-2:00 | Close | Generated product lockup on desktop and mobile | PrairieClassroom OS is built for the adults carrying inclusive classrooms: less coordination drag, more timely support, and professional judgment still in control. |

## Render Commands

Silent preview still:

```bash
npm run video:still:submission
```

Silent draft:

```bash
npm run video:render:submission
```

Polished captioned cut:

```bash
npm run video:render:submission:polished
npm run video:qa:submission
```

Final captioned cut:

```bash
npm run video:render:submission:final
npm run video:qa:submission
```

Voiceover:

```bash
export ELEVENLABS_API_KEY=<set locally>
export ELEVENLABS_VOICE_ID=<set locally>
npm run video:voiceover:elevenlabs
npm run video:render:submission:voiceover
npm run video:qa:submission -- qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-voiceover.mp4
```

The ElevenLabs script writes one narration clip per scene:

```text
apps/marketing-video/public/audio/submission-2026-05-11/scene-01.mp3
apps/marketing-video/public/audio/submission-2026-05-11/manifest.json
```

## Claim Guardrails

- Say "synthetic/demo" for hosted proof evidence.
- Do not claim real teacher validation unless the teacher-session artifact exists and the claims ledger is advanced.
- Do not claim no-cloud or fully local operation unless a real Ollama run is captured and linked.
- Do not claim measured time savings; use estimated time-back-to-teaching only when explicitly framed as synthetic-demo estimate.

## Asset Map

- `01-paper-to-laptop.png`: opening proof
- `02-adult-coordination.png`: four adult jobs/product shape
- `03-local-privacy.png`: proof boundary/local-first story
- `04-closed-loop.png`: classroom memory loop
- `apps/marketing-video/public/browser-captures/submission-2026-05-11/01-today-live.png`: problem framing
- `apps/marketing-video/public/generated/submission-2026-05-11/05-human-approval-desk.png`: approval boundary
- `apps/marketing-video/public/generated/submission-2026-05-11/06-memory-loop-tabletop.png`: classroom memory loop
- `apps/marketing-video/public/generated/submission-2026-05-11/07-product-lockup-devices.png`: close
- `qa/demo-script/screenshots/08b-differentiate-generated-full.png`: differentiation proof
