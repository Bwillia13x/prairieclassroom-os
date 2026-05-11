# Final Submission Audit - 2026-05-09

## Scope

Final local audit for PrairieClassroom OS submission preparation, including the maintained local pre-submit gate, live browser spot-check, video screenshot regeneration, and submission video build setup.

This memo does not mark the external competition submission complete. Public deployment, public repository verification, YouTube publication, teacher-session evidence, and Kaggle submission remain external actions.

## Local Gate Result

Command run:

```bash
source ~/.nvm/nvm.sh && nvm use && npm run submission:final-check -- --skip-publication-check
```

Result: passed, 7/7 local pre-submit gates, total runtime 4m37s.

Passed steps:

- `claims:check`
- `proof:check`
- `system:inventory:check`
- `eval:inventory:check`
- `demo:fixture:check`
- `check:contrast`
- `release:gate` in mock mode

Current inventory signal from the run:

- Primary panels: 12
- Prompt classes: 13
- Live/planning split: 7/6
- Retrieval-backed prompt classes: 7
- API route bases: 21
- API endpoints: 53
- Eval case files: 134
- Contrast pairs: 80, all WCAG AA
- Demo fixture: 36 interventions, 3 generated plans, 1 pattern report, 1 approved family message, 5 sessions, and zero generated variants/runs

Latest mock gate artifact:

```text
output/release-gate/2026-05-09T23-38-16-402Z-9751
```

## Live Browser Spot-Check

Stack started with:

```bash
source ~/.nvm/nvm.sh && nvm use && npm run pilot:start
```

Verified local services:

- Web: `http://localhost:5173/?demo=true`
- Orchestrator: `http://localhost:3100/health`
- Inference mock service: `http://localhost:3200/health`

Browser checks:

- Desktop `1440x900`, `?demo=true&tab=today&classroom=demo-okafor-grade34`: loaded without first-run onboarding, role prompt, or classroom-code blocker.
- Desktop `prep/differentiate`: active panel and headings loaded; no body-level horizontal overflow.
- Desktop `tomorrow/tomorrow-plan`: active panel loaded; apparent overflow belonged to the intentionally clipped coverage timeline, with document/body width still equal to viewport width.
- Desktop `review/family-message`: active panel loaded, approval copy present, no body-level horizontal overflow.
- Mobile `393x852`, Today route: loaded without first-run blocker, seven nav groups present, document/body width equal to viewport width, no clipped button/card text candidates.

Captured browser audit evidence through Playwright MCP:

- `prairie-final-audit-today-desktop-2026-05-09.png`
- `prairie-final-audit-today-mobile-2026-05-09.png`
- `prairie-final-audit-today-desktop-2026-05-09.md`

## Video Inputs Refreshed

Command run:

```bash
source ~/.nvm/nvm.sh && nvm use && npm run demo:screenshots
```

Result: passed.

Regenerated screenshot source:

```text
qa/demo-script/screenshots/
```

This restores the source path used by `apps/marketing-video/public/screenshots`.

## Submission Video Work

Added a dedicated two-minute Remotion composition:

```text
apps/marketing-video/src/SubmissionVideo.tsx
```

Registered composition:

```text
PrairieClassroomSubmission
```

Added generated image assets:

```text
apps/marketing-video/public/generated/submission-2026-05-09/01-paper-to-laptop.png
apps/marketing-video/public/generated/submission-2026-05-09/02-adult-coordination.png
apps/marketing-video/public/generated/submission-2026-05-09/03-local-privacy.png
apps/marketing-video/public/generated/submission-2026-05-09/04-closed-loop.png
apps/marketing-video/public/generated/submission-2026-05-11/05-human-approval-desk.png
apps/marketing-video/public/generated/submission-2026-05-11/06-memory-loop-tabletop.png
apps/marketing-video/public/generated/submission-2026-05-11/07-product-lockup-devices.png
```

Added live Browser capture assets:

```text
apps/marketing-video/public/browser-captures/submission-2026-05-11/01-today-live.png
apps/marketing-video/public/browser-captures/submission-2026-05-11/06-mobile-today-live.png
```

Added render scripts:

```bash
npm run video:still:submission
npm run video:render:submission
npm run video:render:submission:polished
npm run video:voiceover:elevenlabs
npm run video:render:submission:voiceover
npm run video:qa:submission
```

ElevenLabs voiceover output target:

```text
apps/marketing-video/public/audio/submission-2026-05-11/scene-01.mp3
apps/marketing-video/public/audio/submission-2026-05-11/manifest.json
```

Polish pass status:

- Built-in narration captions are now enabled by default for the submission composition.
- ElevenLabs generation now targets scene-aligned clips rather than one long MP3, reducing timing risk during final render.
- A polished render target writes `qa/demo-script/videos/remotion-submission-2026-05-09-polished.mp4`.
- The final May 11 captioned render target writes `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4`.
- `video:qa:submission` verifies the MP4 container and regenerates a contact sheet for human visual review.

May 11 final video validation:

- Rendered `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4`.
- `video:qa:submission` passed: 120.043s, 30fps, 1920x1080, H.264 video, AAC audio.
- Contact sheet regenerated at `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-contact-sheet.jpg`.
- QuickTime playback opened the MP4, reported 02:00 duration, and advanced from the opening scene into the live-app problem scene.
- `proof:check` passed.
- `claims:check` passed.
- `git diff --check` passed.
- HyperFrames lint reported 0 errors, with one non-blocking timeline-density warning on the older `prairieclassroom-kaggle-90s` HTML composition.

May 11 voiceover validation:

- Generated eight ElevenLabs scene clips with the `Bella - Professional, Bright, Warm` premade voice.
- Clip timing fit each scene slot with at least 1.55s of headroom.
- Rendered `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-voiceover.mp4`.
- `video:qa:submission -- qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-voiceover.mp4` passed: 120.021s, 30fps, 1920x1080, H.264 video, AAC audio.
- Contact sheet regenerated at `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-voiceover-contact-sheet.jpg`.
- Audio signal check passed with mean volume -24.9 dB and max volume -4.9 dB.

## Current Verdict

Local engineering status: green for local submission preparation, the final captioned video artifact, and the ElevenLabs voiceover cut.

Submission status: not complete until external publication and competition submission steps are done. The correct claim remains local-ready, external-incomplete.

## Remaining Highest-Leverage Actions

1. Review the voiceover cut once by ear and choose whether to submit the voiceover or captioned-only version.
2. Upload the selected video cut as unlisted first, then public before final submission.
3. Complete public demo deployment and external-network smoke.
4. Make the repository public and clone-test from a signed-out or separate context.
5. Keep the Kaggle copy aligned to the claims ledger: no real teacher validation, measured outcome, no-cloud, or proven Ollama claim unless new artifacts exist.
