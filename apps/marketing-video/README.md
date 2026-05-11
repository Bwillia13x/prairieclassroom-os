# PrairieClassroom Marketing Video

Remotion composition for a detailed PrairieClassroom OS marketing and explanatory overview.

The composition uses the existing QA demo screenshots through:

```text
apps/marketing-video/public/screenshots -> ../../../qa/demo-script/screenshots
```

Those screenshots are intentionally ignored by git because they are large generated assets. Recreate them with the repo's demo capture workflow before rendering on a clean checkout.

## Commands

```bash
npm run video:studio
npm run video:render
npm run video:still:submission
npm run video:render:submission
npm run video:render:submission:polished
npm run video:voiceover:elevenlabs
npm run video:render:submission:voiceover
npm run video:qa:submission
npm run still:nothing -w @prairie/marketing-video
npm run render:nothing -w @prairie/marketing-video
```

The render writes:

```text
qa/demo-script/videos/remotion-marketing-overview.mp4
```

The preview still writes:

```text
qa/demo-script/videos/remotion-marketing-overview-preview.png
```

The Nothing-design launch composition uses fresh screenshots from:

```text
qa/demo-script/screenshots/nothing-fixed/
```

It writes:

```text
qa/demo-script/videos/remotion-nothing-launch.mp4
qa/demo-script/videos/remotion-nothing-launch-preview.png
```

## Submission Cut

`PrairieClassroomSubmission` is the May 11 two-minute submission cut. It uses:

```text
qa/demo-script/screenshots/
apps/marketing-video/public/browser-captures/submission-2026-05-11/
apps/marketing-video/public/generated/submission-2026-05-09/
apps/marketing-video/public/generated/submission-2026-05-11/
```

The silent draft render writes:

```text
qa/demo-script/videos/remotion-submission-2026-05-09-draft.mp4
```

The polished captioned render writes:

```text
qa/demo-script/videos/remotion-submission-2026-05-09-polished.mp4
```

The final captioned render writes:

```text
qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4
```

To generate the scene-aligned ElevenLabs voiceover clips, set
`ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in the shell, then run:

```bash
npm run video:voiceover:elevenlabs
npm run video:render:submission:voiceover
```

The voiceover render writes:

```text
qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-voiceover.mp4
```

Run the QA script after a polished or final render. With no argument it checks
the May 11 final captioned render and regenerates its contact sheet:

```bash
npm run video:qa:submission
npm run video:qa:submission -- qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-voiceover.mp4
```
