# Hackathon Submission Checklist

Repo-side checklist for preparing PrairieClassroom OS for the Gemma 4 Good Hackathon submission.

The submission window is owned by [plans/2026-05-18-submission-plan.md](./plans/2026-05-18-submission-plan.md). This checklist is the day-of compliance view; the plan is the day-by-day execution view.

## Current status

Checked against the repo on 2026-05-14 after final local pre-submit, live browser QA, Vercel production inspection, deployed public-demo smoke, deployed route/mobile/desktop submission-readiness screenshots, Lighthouse spot checks, and security validation.

- Mock structural gate: passing at `output/release-gate/2026-05-14T20-57-50-896Z-22629`
- Local pre-submit gate: `npm run submission:final-check -- --skip-publication-check` passed 7/7 on 2026-05-14, including the mock release gate at `output/release-gate/2026-05-14T20-57-50-896Z-22629`.
- Publication gate: `npm run submission:final-check -- --skip-release-gate` still fails on publication placeholders and required URL validation until the public YouTube URL and Kaggle writeup URL are filled in. The live demo URL is now real and the gate runs `npm run smoke:public-demo` against it unless explicitly skipped.
- Hosted Gemma 4 proof lane: current May 8 hosted refresh failed and no current clean full hosted gate was produced. Latest attempted hosted gate: `output/release-gate/2026-05-08T22-47-12-031Z-43430`.
- Hosted Gemma 4 last passing baseline: passing on synthetic/demo data at `output/release-gate/2026-05-03T17-59-42-981Z-80702`.
- Latest completed May 8 hosted eval summary: `output/evals/2026-05-08-gemini/2026-05-08T21-48-03-113Z-23553-gemini-summary.json` (`12/13`; provider high-demand block on `fcst-001-demo-schema`).
- Latest completed May 8 hosted eval failure summary: `output/evals/2026-05-08-gemini/2026-05-08T21-48-03-113Z-23553-gemini-failure-summary.json`
- Latest May 8 cost rollup: `output/cost-rollups/2026-05-08-rollup.json`
- Hosted models: `gemma-4-26b-a4b-it` and `gemma-4-31b-it`; full hosted rerun command is `npm run release:gate:gemini`.
- Ollama proof on this machine: **not proven**. Latest preflight `output/host-preflight/2026-05-11T16-10-25-972Z.json` reports no Ollama CLI, 8.00 GiB RAM, and 16.76 GiB available disk; defer until viable host (≥16 GiB RAM, ≥40 GiB free disk) is available (see [development-gaps.md](./development-gaps.md) G-02 and submission-plan Phase D).
- Kaggle writeup: aligned to hosted proof lane; reframed around four daily jobs + closed-loop framing; estimated time-back-to-teaching lines added; current word count 1,412 (within 1,500-word limit)
- Kaggle paste block: synced to writeup
- Submission copy pack: [submission-copy-pack.md](./submission-copy-pack.md) now carries pre-publish placeholder and claim guardrails for video, Kaggle, repository, and media-gallery fields.
- Public code repository: public clone test passed on 2026-05-11 against `https://github.com/Bwillia13x/prairieclassroom-os`; latest verified pushed `main` is `ac3df78108121347bc6fd36309d3309c456b380a`.
- Public-video script: final local video QA passed for `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4` (120.043 seconds, 1920x1080, 30 fps); upload/public YouTube URL still pending. A public web search on 2026-05-14 did not find an existing PrairieClassroom OS YouTube URL to backfill.
- Publish preflight: with Node `v25.8.2`, `npm run submission:publish-preflight` passes local file checks, upstream configuration, Vercel CLI availability, Vercel project link, Render CLI/token availability, and public live demo URL. It remains blocked in a plain shell by branch/worktree sync until the readiness commit is pushed, by hosted Gemma env checks until `.env` is exported, and by missing public video and Kaggle writeup URLs. Vercel production stores the server-side hosted Gemma key/guard as encrypted env vars, and Render hosted services have been created.
- Judge/demo URL: `?demo=true` skips first-run onboarding and role-selection modals for the demo classroom
- Judge-facing summary doc: [hackathon-judge-summary.md](./hackathon-judge-summary.md) — refreshed 2026-04-26 with Gemma-4-specificity framing
- Local release-ready memo: [evidence/2026-05-05-local-release-ready-memo.md](./evidence/2026-05-05-local-release-ready-memo.md) records the current artifact map and the external lane that is still incomplete.
- Strategic posture: lead with multimodal magic + teacher voice; treat offline-Ollama as the third WOW lever, capturable the moment a viable host arrives
- Live demo deploy: PUBLIC SYNTHETIC DEMO READY / HOSTED BACKEND SMOKE PASSED — Vercel project `echoexes-projects/prairieclassroom-os` is linked from `apps/web`, the production root redirects into the public demo at `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`, stale explicit demo classroom queries settle back onto that demo classroom, and `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo` passes against the Vercel frontend wired to the Render-hosted orchestrator and Gemini inference services after the 2026-05-14 post-readiness redeploy. Fresh deployed submission-readiness evidence is in `qa/final-release/2026-05-14-live-submission/` and `qa/final-release/2026-05-14-post-redeploy/`, covering the main capture surfaces, generated Support Patterns output, command palette, desktop/mobile fit, console/network capture, session telemetry, and Lighthouse spot checks. A non-local web fetch confirms root redirect and canonical HTML reachability; public web search did not find an existing PrairieClassroom OS YouTube or Kaggle submission URL to backfill; true cellular-browser smoke is still pending. This public smoke does not replace the last passing full hosted release gate.

## Completed safely in repo

- Trimmed the Kaggle writeup to fit the competition word limit and aligned it to the current proof story.
- Updated the public-video shot list so it no longer claims unproven Ollama/local behavior on this host.
- Preserved one consistent story across the writeup, proof brief, README, and proof-status docs:
  - hosted Gemma 4 remains synthetic/demo-only proof evidence, but the current hosted refresh is blocked rather than a new passing baseline
  - Ollama is the intended privacy-first deployment path
- Kept the current proof references anchored to checked-in artifacts.
- Refreshed the hosted Gemini proof references to separate the latest attempted hosted gate from the last passing baseline and added a judge-facing short summary.
- Added a safe dry-run-first artifact pruning script for reclaiming local disk from old generated outputs.
- Added roster-scoped memory filtering and reset the demo SQLite memory so stale local test records cannot leak into retrieval citations.
- Refreshed the current shell and workflow evidence bundle on 2026-05-03 with `npm run ui:evidence`.
- Refreshed deployed submission-readiness evidence on 2026-05-14 at `qa/final-release/2026-05-14-live-submission/` across Today, Classroom, Tomorrow Plan, Week, Prep Differentiate, Ops EA Load, Review Family Message, Review Support Patterns, generated Support Patterns output, mobile/desktop route fit, and the keyboard command palette.
- Added a judge-safe `?demo=true` first-run path that skips onboarding and role-selection modals for the demo classroom.
- Split the Vite production bundle into React, panel, and visualization chunks so the current web build no longer emits the large-entry-chunk warning.
- Added [public demo operations](./public-demo-operations.md) with the deployment shape and judge-safe smoke checklist.
- Added `render.yaml` and `services/inference/requirements-gemini.txt` so the selected no-spend public-demo backend path is concrete without installing local/torch dependencies on the hosted Gemma service.
- Added Render service wiring through explicit `INFERENCE_URL=https://prairieclassroom-inference-gemini.onrender.com`, while retaining `INFERENCE_HOSTPORT` as the private-route reference. The orchestrator and hosted inference service share `PRAIRIE_INFERENCE_AUTH_TOKEN` so `/generate` is not callable anonymously.
- Added a Vercel-safe static demo API fallback so the public `?demo=true` route works without Render credentials and can recover from handled transient 429/5xx/network failures while staying clearly separate from hosted Gemma proof. Current production is wired to Render through `VITE_API_URL`, so the latest healthy-path public smoke exercises the hosted synthetic demo path first.

## Existing media candidates

Use the May 3 final visual audit plus the refreshed standard workflow evidence bundle for cover-image and gallery selection:

- `output/final-visual-audit-2026-05-03/desktop-1440-today-final-polish-v2.png`
- `output/playwright/ui-evidence/2026-05-03T22-25-59-189Z/differentiate-desktop.png`
- `output/final-ui-polish-2026-05-03/final-active-tomorrow-plan.png`
- `output/playwright/ui-evidence/2026-05-03T22-25-59-189Z/family-message-desktop.png`
- `output/final-visual-audit-2026-05-03/final-polish-pass/today-mobile.png`

Current local video candidate:

- `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4` (120.043 seconds, 1920x1080, 30 fps; QA contact sheet at `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11-contact-sheet.jpg`)
- `qa/demo-script/videos/walkthrough-kaggle-final.mp4` (173.88 seconds, under the 3-minute limit)
- Backup short cut: `qa/demo-script/videos/walkthrough-teaser-90s.mp4` (94.88 seconds)

## External actions still required

These are required for an actual competition submission but cannot be completed safely from inside the repo alone. Sequenced by submission-plan phase; cross-reference [plans/2026-05-18-submission-plan.md](./plans/2026-05-18-submission-plan.md) for the day-by-day execution.

**Phase B — production prep (target window 2026-04-29 → 2026-05-03):**

1. Send 3 teacher recruitment messages (target: 1 K-6 teacher, 1 EA, 1 retired teacher / consultant; $100 honorarium; 60-90 minute session).
2. Print a real Grade 3/4 fractions worksheet for the multimodal hero shot.
3. Identify a host with ≥16 GiB RAM and ≥40 GiB free disk for the eventual Ollama lane (borrow or order refurb Mac Mini).
4. Create the external Render blueprint services from `render.yaml`, set `CORS_ORIGIN=https://prairieclassroom-os.vercel.app`, `PRAIRIE_GEMINI_API_KEY`, and `PRAIRIE_CLASSROOM_ACCESS_CODES_JSON` as hosting secrets, then link Vercel production `VITE_API_URL` to the Render orchestrator. The orchestrator uses the Render inference service URL and shares `PRAIRIE_INFERENCE_AUTH_TOKEN` with the inference service.

**Phase C — teacher session (target window 2026-05-04 → 2026-05-10):**

5. Conduct the teacher session per [plans/2026-05-XX-teacher-session-prep.md](./plans/2026-05-XX-teacher-session-prep.md).
6. Capture a ≤20-second teacher quote suitable for the video.
7. Save anonymized session notes under `docs/pilot/sessions/<date>-session.md` and advance the relevant row in [pilot/claims-ledger.md](./pilot/claims-ledger.md) — likely from `unsupported` to `partially supported (n=1, synthetic data)`.

**Phase D — Ollama (resumes when viable host arrives, no fixed date):**

8. Install Ollama, pull `gemma4:4b` and `gemma4:27b`, run `npm run host:preflight:ollama` then `npm run release:gate:ollama`.
9. Capture the offline shot: `ollama ps` → Wi-Fi off → Tomorrow Plan generates.
10. Update [eval-baseline.md](./eval-baseline.md) Ollama section and [pilot/claims-ledger.md](./pilot/claims-ledger.md) row "Runs privacy-first locally on commodity Alberta hardware."

**Phase E — video production (target window 2026-05-11 → 2026-05-13):**

11. Record narration; assemble shots per the primary order in [video-shot-list.md](./video-shot-list.md).
12. Add captions; export 1080p H.264; upload to YouTube as **unlisted** first.

**Phase F — live demo deploy (target window 2026-05-11 → 2026-05-12):**

13. Run `npm run submission:publish-preflight`; the orchestrator + inference Render services and Vercel `VITE_API_URL` production build now exist, but preflight remains blocked until the public video and Kaggle URLs are real.
14. Run `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo`, then smoke from cellular. External HTTP reachability was confirmed on 2026-05-14; use cellular to catch mobile-carrier/device issues that HTTP reachability cannot prove.
15. Verify `/?demo=true` lands directly on Today and at least one generation completes end-to-end.

**Phase G — verification (target window 2026-05-14 → 2026-05-16):**

16. Make the GitHub repository public; verify clone works from a different machine without auth.
17. Run the full pre-submit pass (see "Final pre-submit checks" below).
18. Have one cold viewer watch the video and answer (a) what does it do, (b) why Gemma 4, (c) what surprised you.
19. Switch YouTube video to public.
20. Add cover image + 4-5 supporting screenshots + closed-loop architecture diagram to media gallery.

**Phase H — submission (2026-05-17 → 2026-05-18):**

21. Convert Kaggle draft to submitted entry on 2026-05-17 (do not wait until 2026-05-18).
22. Final smoke on submission day: GitHub public ✅, video public ✅, demo loads ✅, writeup submitted ✅.

## Claims to avoid

Do not claim any of the following unless new artifacts exist:

- A passing Ollama proof on any host that has not actually run `npm run release:gate:ollama` to a passing artifact
- No-cloud or fully local behavior for a hosted-demo video (the offline shot only legitimizes that claim if it is real)
- Teacher pilot validation, family validation, or measured classroom outcomes (the n=1 synthetic-data session unlocks at most "partially supported (n=1)")
- Paid Vertex validation in the current zero-cost sprint
- "Time-back-to-teaching" framed as measured rather than estimated against synthetic demo data

## Recommended attachment set

- **Project title:** PrairieClassroom OS
- **Track:** Future of Education
- **Code repository:** `https://github.com/Bwillia13x/prairieclassroom-os`
- **Live demo:** `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`
- **Video:** public YouTube link
- **Cover image:** `differentiate-desktop.png` or `today-desktop.png`
- **Additional gallery images:** tomorrow plan, family message, mobile shell

## Final pre-submit checks

Run the chained final gate from the repo root before publishing the final links:

```bash
nvm use
npm run submission:final-check
```

This command now fails if submission-facing docs still contain public-link placeholders (live demo, video, Kaggle writeup, or public clone-test text). For local-only validation before external links exist, use:

```bash
npm run submission:final-check -- --skip-publication-check
```

Equivalent manual checks:

```bash
nvm use
npm run claims:check
npm run proof:check
npm run system:inventory:check
npm run eval:inventory:check
npm run demo:fixture:check
npm run check:contrast
npm run release:gate
```

If a viable Ollama host exists by submission day:

```bash
PRAIRIE_INFERENCE_PROVIDER=ollama npm run release:gate:ollama
```

If you refresh the hosted proof before submission:

```bash
export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>
export PRAIRIE_ENABLE_GEMINI_RUNS=true
npm run gemini:readycheck
npm run release:gate:gemini
npm run eval:summary
npm run logs:summary
```

## Go/No-Go gates

Each gate must be green before advancing to the next phase:

- **Phase A (doc hardening) → Phase B:** `claims:check` + `system:inventory:check` green; submission-plan checkboxes ticked through Phase A deliverables.
- **Phase B (production prep) → Phase C:** at least one teacher session confirmed; multimodal hero-shot dry-run successful; backend deploy target chosen.
- **Phase C (teacher session) → Phase E:** ≥20-second usable teacher clip captured **OR** explicit decision to ship with multimodal-only opening.
- **Phase D (Ollama) — non-blocking:** runs in parallel; lands when host arrives; not gating any other phase.
- **Phase E + F (production + deploy) → Phase G:** video uploaded (unlisted); live demo loads from external network; repo public-ready (no secrets in history).
- **Phase G (verification) → Phase H:** all `npm run` checks green; cold-viewer comprehension test passed; YouTube video flipped to public.
- **Phase H (submission):** Kaggle entry submitted by 2026-05-17 EOD (24-hour buffer to deadline).
