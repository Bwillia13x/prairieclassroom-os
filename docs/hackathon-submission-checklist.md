# Hackathon Submission Checklist

Repo-side checklist for preparing PrairieClassroom OS for the Gemma 4 Good Hackathon submission.

## Current status

Checked against the repo on 2026-04-24.

- Mock structural gate: passing at `output/release-gate/2026-04-25T02-31-26-869Z-92725`
- Hosted Gemma 4 proof lane: passing on synthetic/demo data at `output/release-gate/2026-04-26T13-28-55-908Z-48591`
- Ollama proof on this machine: not proven
- Kaggle writeup draft: aligned to the hosted proof lane and current code inventory
- Public-video script: aligned to the hosted proof lane
- Judge/demo URL: `?demo=true` now skips first-run onboarding and role-selection modals for the demo classroom
- Judge-facing summary doc: [hackathon-judge-summary.md](./hackathon-judge-summary.md)

## Completed safely in repo

- Trimmed the Kaggle writeup to fit the competition word limit and aligned it to the current proof story.
- Updated the public-video shot list so it no longer claims unproven Ollama/local behavior on this host.
- Preserved one consistent story across the writeup, proof brief, README, and proof-status docs:
  - hosted Gemma 4 is the submission proof lane
  - Ollama is the intended privacy-first deployment path
- Kept the current proof references anchored to checked-in artifacts.
- Refreshed the hosted Gemini proof references to the latest passing artifact set and added a judge-facing short summary.
- Added a safe dry-run-first artifact pruning script for reclaiming local disk from old generated outputs.
- Added roster-scoped memory filtering and reset the demo SQLite memory so stale local test records cannot leak into retrieval citations.
- Refreshed UI evidence screenshots on 2026-04-20.
- Added a judge-safe `?demo=true` first-run path that skips onboarding and role-selection modals for the demo classroom.
- Split the Vite production bundle into React, panel, and visualization chunks so the current web build no longer emits the large-entry-chunk warning.
- Added [public demo operations](./public-demo-operations.md) with the deployment shape and judge-safe smoke checklist.

## Existing media candidates

Use the current UI evidence bundle for cover-image and gallery selection:

- `output/playwright/ui-evidence/2026-04-20T18-16-58-840Z/today-desktop.png`
- `output/playwright/ui-evidence/2026-04-20T18-16-58-840Z/differentiate-desktop.png`
- `output/playwright/ui-evidence/2026-04-20T18-16-58-840Z/tomorrow-plan-desktop.png`
- `output/playwright/ui-evidence/2026-04-20T18-16-58-840Z/family-message-desktop.png`
- `output/playwright/ui-evidence/2026-04-20T18-16-58-840Z/shell-mobile.png`

Current local video candidate:

- `qa/demo-script/videos/walkthrough-kaggle-final.mp4` (173.88 seconds, under the 3-minute limit)
- Backup short cut: `qa/demo-script/videos/walkthrough-teaser-90s.mp4` (94.88 seconds)

## External actions still required

These are required for an actual competition submission but cannot be completed safely from inside the repo alone.

1. Make the GitHub repository public and verify public access without login.
2. Publish a public live demo URL and verify it loads without auth or paywall; use [public demo operations](./public-demo-operations.md) for the smoke checklist.
3. Publish a public YouTube video that is 3 minutes or less.
4. Attach the public repo URL, live demo URL, and YouTube URL to the Kaggle writeup.
5. Add a cover image and supporting screenshots to the media gallery.
6. Confirm the final Kaggle writeup is submitted, not left as a draft.
7. If a real teacher/EA walkthrough is completed before submission, add the anonymized artifact under `docs/pilot/` and update `docs/pilot/claims-ledger.md`. If not, leave human validation explicitly unclaimed.

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
export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>
export PRAIRIE_ENABLE_GEMINI_RUNS=true
npm run gemini:readycheck
npm run release:gate:gemini
npm run eval:summary
npm run logs:summary
```
