# Hackathon Submission Checklist

Repo-side checklist for preparing PrairieClassroom OS for the Gemma 4 Good Hackathon submission.

## Current status

Checked against the repo on 2026-04-18.

- Mock structural gate: passing at `output/release-gate/2026-04-18T12-24-07-826Z-37333`
- Hosted Gemma 4 proof lane: passing on synthetic/demo data
- Ollama proof on this machine: not proven
- Kaggle writeup draft: aligned to the hosted proof lane and current code inventory
- Public-video script: aligned to the hosted proof lane

## Completed safely in repo

- Trimmed the Kaggle writeup to fit the competition word limit and aligned it to the current proof story.
- Updated the public-video shot list so it no longer claims unproven Ollama/local behavior on this host.
- Preserved one consistent story across the writeup, proof brief, README, and proof-status docs:
  - hosted Gemma 4 is the submission proof lane
  - Ollama is the intended privacy-first deployment path
- Kept the current proof references anchored to checked-in artifacts.
- Added roster-scoped memory filtering and reset the demo SQLite memory so stale local test records cannot leak into retrieval citations.
- Refreshed UI evidence screenshots on 2026-04-17.

## Existing media candidates

Use the current UI evidence bundle for cover-image and gallery selection:

- `output/playwright/ui-evidence/2026-04-17T23-03-07-559Z/today-desktop.png`
- `output/playwright/ui-evidence/2026-04-17T23-03-07-559Z/differentiate-desktop.png`
- `output/playwright/ui-evidence/2026-04-17T23-03-07-559Z/tomorrow-plan-desktop.png`
- `output/playwright/ui-evidence/2026-04-17T23-03-07-559Z/family-message-desktop.png`
- `output/playwright/ui-evidence/2026-04-17T23-03-07-559Z/shell-mobile.png`

Current local video candidate:

- `qa/demo-script/videos/walkthrough-2026-04-17T19-58-44-014-voiceover.mp4` (137.16 seconds, 1440x900, H.264/AAC)

## External actions still required

These are required for an actual competition submission but cannot be completed safely from inside the repo alone.

1. Make the GitHub repository public and verify public access without login.
2. Publish a public live demo URL and verify it loads without auth or paywall.
3. Record and publish a public YouTube video that is 3 minutes or less.
4. Attach the public repo URL, live demo URL, and YouTube URL to the Kaggle writeup.
5. Add a cover image and supporting screenshots to the media gallery.
6. Confirm the final Kaggle writeup is submitted, not left as a draft.

## Claims to avoid

Do not claim any of the following unless new artifacts exist:

- A passing Ollama proof on the current demo machine
- No-cloud or fully local behavior for a hosted-demo video
- Teacher pilot validation, family validation, or measured classroom outcomes
- Paid Vertex validation in the current zero-cost sprint

## Recommended attachment set

- **Project title:** PrairieClassroom OS
- **Track:** Future of Education
- **Code repository:** `https://github.com/Bwillia13x/prairieclassroom-os` once public
- **Live demo:** public URL once deployed
- **Video:** public YouTube link
- **Cover image:** `differentiate-desktop.png` or `today-desktop.png`
- **Additional gallery images:** tomorrow plan, family message, mobile shell

## Final pre-submit checks

Run these from the repo root before publishing the final links:

```bash
npm run claims:check
npm run proof:check
npm run system:inventory:check
npm run check:contrast
npm run release:gate
```

If you refresh the hosted proof before submission, run:

```bash
npm run gemini:readycheck
export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>
export PRAIRIE_ENABLE_GEMINI_RUNS=true
npm run release:gate:gemini
npm run eval:summary
npm run logs:summary
```
