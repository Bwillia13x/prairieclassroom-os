# PrairieClassroom OS — Gemma 4 Competition Assessment

Assessment timestamp: 2026-04-18T21:24Z  
Competition: The Gemma 4 Good Hackathon  
Deadline: 2026-05-18 23:59 UTC / 17:59 MDT  
Primary track fit: Future of Education, with secondary relevance to Safety & Trust and Ollama if a viable local host is proven.

## Verdict

PrairieClassroom OS is technically strong and differentiated. It is credible as a top-tier Future of Education submission on product thesis, implementation depth, safety posture, and artifact-backed Gemma 4 proof.

It is not yet in a winner-ready submission state because the external judging package is incomplete:

- GitHub repository is currently private.
- No public live demo URL is recorded.
- Local video assets exist, including a 173.88s `walkthrough-kaggle-final.mp4`, but no public YouTube URL is recorded.
- The local judge/demo path now skips first-run onboarding and role-selection modals, but no public deployed URL is recorded.
- The privacy-first Ollama story is not proven on this host.
- Real teacher/EA validation is still intentionally unclaimed.

My competitive call: this can plausibly be a finalist or track winner if the submission package is polished and public. As of this audit, it is not yet likely to win because the competition weights storytelling and public demonstration heavily, and those are still the least finished parts.

## Competition Criteria Mapping

| Criterion | Weight | Current score | Rationale |
|---|---:|---:|---|
| Impact & Vision | 40 | 34-36 | Strong, specific education problem; avoids generic tutor framing; clear classroom coordination thesis. Loses points for no real teacher validation and limited quantified impact. |
| Video Pitch & Storytelling | 30 | 18-22 if current local video is uploaded; 0 if not attached | A compliant local video exists under 3 minutes, but public YouTube attachment is not recorded. The thesis is compelling, but it must be packaged tightly for judges. |
| Technical Depth & Execution | 30 | 24-27 | Strong monorepo, 12 panels, 13 prompt classes, 127 eval cases, release gates, role/auth/safety. Loses points for limited hosted eval subset, Ollama host block, and live hosted latency. |
| Overall | 100 | 76-85 depending on public assets | The implementation is strong enough; the win probability hinges on external packaging and proof clarity. |

## Validation Run

Fresh checks completed in this session:

- `npm run proof:check`: pass.
- `npm run gemini:readycheck`: blocked as expected because API key is missing and hosted-run guard is disabled; latest hosted artifact remains passing.
- Initial `npm run release:gate`: refused due Node version mismatch (`v20.19.5` instead of `.nvmrc` `v25.8.2`).
- Rerun after `nvm use`: pass, mock mode, zero-cost enforced.
- Latest mock release gate: `output/release-gate/2026-04-18T21-39-00-631Z-96778`.
- `npm run eval:summary`: only current failure is known Ollama host preflight.
- `npm run logs:summary`: 2,325 records, 0 retryable responses, 6 injection-suspected responses from expected prompt-injection tests.
- `npm run ops:status`: inventory ok; mock passed; hosted Gemini passed; Ollama failed/blocked; API none recorded.
- `npm run check:contrast`: 80 pairs, all WCAG AA.
- `npm run system:inventory:check`: panels=12, prompt_classes=13, api_endpoints=37, eval_cases=127.
- `npm run claims:check`: pass.
- `npm run build -w apps/web`: pass after chunk splitting; no large-entry-chunk warning in the current build.
- Fresh Playwright first-run check on `?demo=true&tab=today&classroom=demo-okafor-grade34`: pass; no onboarding modal, no role-selection modal, first heading is Today.
- `npm run ui:evidence`: pass after starting local services.

Current UI evidence:

- `output/playwright/ui-evidence/2026-04-18T21-23-02-371Z`

Generated docs updated by the fresh gate:

- `docs/eval-baseline.md`
- `docs/live-model-proof-status.md`

## Strongest Differentiators

1. The thesis is sharper than a generic edtech chatbot: classroom complexity is treated as an operations and coordination problem.
2. The product has a real workflow loop: differentiate, log interventions, retrieve memory, detect patterns, plan tomorrow, brief EAs, draft family messages with approval.
3. The safety posture is mature for education: observational language, forbidden terminology, approval gates, classroom roles, auth checks, request logging, and synthetic/demo boundaries.
4. The technical artifact trail is unusually strong for a hackathon: release gates, eval suite, provider-specific proof docs, request logs, contrast checks, generated system inventory.
5. Gemma 4 is not just a branding layer: hosted proof uses `gemma-4-26b-a4b-it` and `gemma-4-31b-it`, with multimodal worksheet extraction and tier routing represented in code and artifacts.

## Blocking Or High-Risk Gaps

### P0 — Public submission assets are incomplete

Kaggle requires a writeup, public video, public code repository, public live demo, and media gallery. The local repo contains writeup copy and video files, but public submission URLs are not complete:

- `gh repo view` reports `https://github.com/Bwillia13x/prairieclassroom-os` is private.
- `docs/submission-copy-pack.md` and `docs/kaggle-paste-block.md` still contain placeholders for live demo and YouTube URL.
- No public demo URL is recorded. A deployment runbook now exists in `docs/public-demo-operations.md`, but deployment has not been executed.

### P1 — Public demo URL still needs verification

The local `?demo=true` path now lands directly on the Today dashboard without onboarding or role-selection friction. The remaining risk is public deployment: the final hosted URL still needs to be opened in a private browser and verified against the smoke checklist in `docs/public-demo-operations.md`.

### P1 — Hosted Gemma 4 latency is high

The hosted proof is real, but the latest hosted logs show 30-154s generation latencies for several routes. This is acceptable for artifact proof but risky for a live judge demo. The public demo should use cached/precomputed demo outputs or a clearly labeled fast demo lane, with live Gemma runs available as proof rather than required for every interaction.

### P1 — Ollama privacy-first lane is not proven

The product narrative benefits from local-first/privacy-first deployment, but this host cannot prove the full Ollama lane:

- Ollama CLI unavailable in latest preflight.
- Host has 8 GiB RAM and limited free disk.
- Full dual-tier Ollama story needs a bigger host or a scoped live-tier-only demo.

Do not compete for the Ollama special prize unless a viable host runs `npm run release:gate:ollama` with `gemma4:4b` and `gemma4:27b`.

### P2 — Human validation remains missing

The repo has strong synthetic proof and pilot paperwork, but no filled teacher/EA rubrics, classroom walkthrough observations, or quantified time-savings evidence. This matters most for Impact & Vision.

### P2 — Gemma-native feature proof could be sharper

The code supports function declarations and image inputs, and the hosted proof includes worksheet extraction. However, the writeup/video should make the unique Gemma 4 usage impossible to miss:

- show one worksheet image extraction;
- show one tool-backed or retrieval-backed planning step;
- show dual-tier routing evidence;
- show safety/approval as product behavior, not only text in docs.

## Recommended Priorities

1. Make the repo public and verify the URL unauthenticated.
2. Deploy a public demo that loads without auth/paywall and verify `?demo=true&tab=today&classroom=demo-okafor-grade34` in a private browser.
3. Upload the 173.88s final video to YouTube and attach it to the Kaggle media gallery.
4. Replace every submission placeholder with public URLs.
5. Add a short proof overlay or appendix in the writeup/video: latest mock gate, latest hosted Gemma 4 gate, 12/12 hosted eval proof, 127 checked-in cases.
6. Build a judge-safe demo mode with precomputed outputs and optional live Gemma run buttons for 1-2 flows.
7. Get one real teacher or EA to do a 20-minute walkthrough and fill the usefulness rubric; add one quote and one conservative metric to the writeup.
8. If pursuing the Ollama prize, move to a host with at least 16 GiB RAM and 40 GiB free disk, install Ollama, pull both Gemma 4 models, and run the Ollama release gate.

## Final Competitive Judgment

The application itself has crossed the threshold from MVP to serious product prototype. The concept is differentiated enough to stand out, especially because it avoids the saturated "AI tutor" category and instead attacks the real operational burden of inclusive classrooms.

The remaining risk is not a lack of code. It is that the competition is explicitly judged primarily through the video, then verified through public code, public demo, and writeup. If the public package is incomplete, the project will underperform despite strong engineering. If the public package is completed and the deployed demo is verified, PrairieClassroom OS has a credible shot at a Future of Education track award and an outside shot at a Main Track placement.
