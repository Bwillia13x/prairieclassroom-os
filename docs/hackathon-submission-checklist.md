# Hackathon Submission Checklist

Repo-side checklist for preparing PrairieClassroom OS for the Gemma 4 Good Hackathon submission.

The submission window is owned by [plans/2026-05-18-submission-plan.md](./plans/2026-05-18-submission-plan.md). This checklist is the day-of compliance view; the plan is the day-by-day execution view.

## Current status

Checked against the repo on 2026-04-30, refreshed for submission-delta closure.

- Mock structural gate: passing at `output/release-gate/2026-04-30T23-55-13-933Z-61434`
- Hosted Gemma 4 proof lane: passing on synthetic/demo data at `output/release-gate/2026-04-27T01-26-45-190Z-87424`
- Ollama proof on this machine: **not proven; deferred until viable host (≥16 GiB RAM, ≥40 GiB free disk) is available** (see [development-gaps.md](./development-gaps.md) G-02 and submission-plan Phase D)
- Kaggle writeup: aligned to hosted proof lane; reframed around four daily jobs + closed-loop framing; estimated time-back-to-teaching lines added; current word count 1,412 (within 1,500-word limit)
- Kaggle paste block: synced to writeup
- Public-video script: rewritten 2026-04-26 to lead with multimodal hero shot + teacher quote + offline-Ollama shot (gated)
- Judge/demo URL: `?demo=true` skips first-run onboarding and role-selection modals for the demo classroom
- Judge-facing summary doc: [hackathon-judge-summary.md](./hackathon-judge-summary.md) — refreshed 2026-04-26 with Gemma-4-specificity framing
- Strategic posture: lead with multimodal magic + teacher voice; treat offline-Ollama as the third WOW lever, capturable the moment a viable host arrives
- Live demo deploy: NOT YET DEPLOYED — frontend config exists at `apps/web/vercel.json`; backend target is selected as Render free via `render.yaml`; external service creation, secret entry, and cellular smoke are still pending.

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
- Added `render.yaml` and `services/inference/requirements-gemini.txt` so the selected no-spend public-demo backend path is concrete without installing local/torch dependencies on the hosted Gemma service.
- Added Render private-network inference wiring through `INFERENCE_HOSTPORT`, while retaining `INFERENCE_URL` as the local/manual override.

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

These are required for an actual competition submission but cannot be completed safely from inside the repo alone. Sequenced by submission-plan phase; cross-reference [plans/2026-05-18-submission-plan.md](./plans/2026-05-18-submission-plan.md) for the day-by-day execution.

**Phase B — production prep (target window 2026-04-29 → 2026-05-03):**

1. Send 3 teacher recruitment messages (target: 1 K-6 teacher, 1 EA, 1 retired teacher / consultant; $100 honorarium; 60-90 minute session).
2. Print a real Grade 3/4 fractions worksheet for the multimodal hero shot.
3. Identify a host with ≥16 GiB RAM and ≥40 GiB free disk for the eventual Ollama lane (borrow or order refurb Mac Mini).
4. Create the external Render blueprint services from `render.yaml`, set `CORS_ORIGIN` and `PRAIRIE_GEMINI_API_KEY` as hosting secrets, then link Vercel production `VITE_API_URL` to the Render orchestrator. The orchestrator receives Render's private `INFERENCE_HOSTPORT` reference from the inference service.

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

13. Deploy frontend to Vercel; deploy orchestrator + inference to chosen backend.
14. Smoke from external network and from cellular.
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
- **Code repository:** `https://github.com/Bwillia13x/prairieclassroom-os` once public
- **Live demo:** public URL once deployed
- **Video:** public YouTube link
- **Cover image:** `differentiate-desktop.png` or `today-desktop.png`
- **Additional gallery images:** tomorrow plan, family message, mobile shell

## Final pre-submit checks

Run these from the repo root before publishing the final links:

```bash
nvm use
npm run claims:check
npm run proof:check
npm run system:inventory:check
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
