# Video Upload Candidates QA — 2026-05-17

This note records the current local video files that are ready to upload before the public YouTube URL exists.

## Commands

```bash
source ~/.nvm/nvm.sh && nvm use --silent 25.8.2
npm run video:qa:submission -- qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4
npm run video:qa:submission -- qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-voiceover.mp4
shasum -a 256 qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4 qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-voiceover.mp4
```

## Results

| File | Status | Duration | Video | Container | SHA-256 |
| --- | --- | ---: | --- | --- | --- |
| `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4` | Pass | 120.043s | 1920x1080, 30fps | H.264 video + AAC audio | `2fbd0bd1b48ef1aefd7c82f612f9fecdf0dfafd273a80454a26b2bb59b796da6` |
| `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-voiceover.mp4` | Pass | 120.021s | 1920x1080, 30fps | H.264 video + AAC audio | `f47d35c7fe235b8e43064d95b0ed1d303c3831607904a25ffabca7b64a4dbd26` |

Contact sheets were refreshed at:

- `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-contact-sheet.jpg`
- `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-voiceover-contact-sheet.jpg`

## Upload Guidance

Use the `-voiceover.mp4` file if the final public YouTube artifact should include narration. Keep the non-suffixed MP4 as the deterministic checked-in baseline used by `submission:publish-preflight`.

This evidence does not resolve the public-video blocker. The blocker closes only after the final public or reviewable YouTube URL is recorded with `npm run submission:apply-links`.
