# Hackathon Submission Plan — 2026-05-18

**Created:** 2026-04-26 (T-22 days)
**Owner:** solo maintainer
**Deadline:** 2026-05-18 23:59 UTC
**Status:** in progress
**Companion docs:** [hackathon-submission-checklist.md](../hackathon-submission-checklist.md), [video-shot-list.md](../video-shot-list.md), [hackathon-proof-brief.md](../hackathon-proof-brief.md)

---

## Strategic Posture

The 2026-04-26 strategic assessment scored the as-is submission at ~78/100. Three Tier-1 actions move it toward ~95/100:

1. **Ollama lane proven on a viable host** — privacy-first / offline story; unlocks Ollama Special Tech Track ($10K).
2. **Real teacher voice / observation** — lifts the n=1 claim from `unsupported` to `partially supported`.
3. **Multimodal hero shot leading the video** — the most visceral Gemma-4-specific magic moment.

This plan implements **everything that is not Ollama-blocked first**, then resumes Ollama work the moment a viable host (≥16 GiB RAM, ≥40 GiB free disk) is available. The Ollama deferral is intentional and reversible; this plan does not assume a hard pivot to a non-Ollama story.

---

## Phase Map

| Phase | Window | Scope | Status |
|---|---|---|---|
| **A — Doc hardening** | 2026-04-26 → 2026-04-28 | Writeup, video shot list, judge summary, submission checklist, plan docs | in progress |
| **B — Production prep** | 2026-04-29 → 2026-05-03 | Hero-shot capture checklist, teacher session prep, deploy plan, media gallery selection | in progress |
| **C — Teacher session** | 2026-05-04 → 2026-05-10 | Recruit, schedule, conduct, capture quote and observation notes | pending (host external) |
| **D — Ollama lane** | resumes when viable host arrives | Install Ollama, pull weights, run `release:gate:ollama`, capture offline footage | gated on host |
| **E — Video production** | 2026-05-11 → 2026-05-13 | Edit, voiceover, captions, upload to YouTube | pending |
| **F — Live demo deploy** | 2026-05-11 → 2026-05-12 | Vercel frontend + free-tier backend, smoke from external network | pending |
| **G — Verification** | 2026-05-14 → 2026-05-16 | Full `release:gate`, `claims:check`, `system:inventory:check`, external smoke | pending |
| **H — Submission** | 2026-05-17 → 2026-05-18 | Submit Kaggle entry early; monitor | pending |

---

## Phase A — Doc Hardening (completed 2026-04-26)

### Deliverables

- [x] This plan doc, committed.
- [x] [docs/kaggle-writeup.md](../kaggle-writeup.md) — three impact-estimate lines added to §1, panel count reframed, closed-loop framing led, word count verified ≤1,500 (current: 1,412 words).
- [x] [docs/kaggle-paste-block.md](../kaggle-paste-block.md) — synchronized to writeup edits.
- [x] [docs/video-shot-list.md](../video-shot-list.md) — rewritten with multimodal-first + teacher-quote + offline-Ollama shot order; tight-cut backup retained; legacy ordering preserved in git history per the doc's own pointer.
- [x] [docs/hackathon-judge-summary.md](../hackathon-judge-summary.md) — tighter framing reflecting new posture; "Why Gemma 4 Specifically" section added.
- [x] [docs/hackathon-submission-checklist.md](../hackathon-submission-checklist.md) — external-actions list updated, Ollama-deferred posture noted, go/no-go gates added.
- [x] [docs/decision-log.md](../decision-log.md) — strategic-pivot ADR entry committed.
- [x] [docs/plans/2026-05-XX-multimodal-hero-shot-capture.md](./2026-05-XX-multimodal-hero-shot-capture.md) — production checklist.
- [x] [docs/plans/2026-05-XX-teacher-session-prep.md](./2026-05-XX-teacher-session-prep.md) — facilitator pre-flight.
- [x] [docs/plans/2026-05-XX-media-gallery-selection.md](./2026-05-XX-media-gallery-selection.md) — cover-image candidates and gallery sequencing recommendations.
- [x] [docs/architecture.md](../architecture.md) — Mermaid closed-loop diagram added at top of "System thesis."
- [x] [docs/public-demo-operations.md](../public-demo-operations.md) — deploy targets selected (Vercel + TBD backend), pre-deploy setup commands documented.
- [x] [README.md](../../README.md) — judge-friendly opening rewritten with "Why Gemma 4" section + judge-doc nav links + sprint-history cleanup.
- [x] [apps/web/vercel.json](../../apps/web/vercel.json) — SPA rewrites, security headers, immutable asset cache; unblocks Phase F deploy.
- [x] [scripts/submission-final-check.mjs](../../scripts/submission-final-check.mjs) — chained pre-submit gate; new `npm run submission:final-check` (with `--skip-release-gate` and `--include-ollama` flags).
- [x] [.gitignore](../../.gitignore) — minor hygiene fix (stray `-e` line); `qa/demo-script/multimodal-hero/` and `qa/demo-script/teacher-quote/` added for Phase B/C capture artifacts.

### Validation (2026-04-26)

All six gates passed end-to-end via `npm run submission:final-check`:

| Gate | Status | Duration |
|---|---|---|
| `claims:check` | ✓ | 0.4s |
| `proof:check` | ✓ | 0.2s |
| `system:inventory:check` | ✓ | 0.2s |
| `demo:fixture:check` | ✓ | 1.6s |
| `check:contrast` | ✓ | 0.2s |
| `release:gate` (mock) | ✓ | 2m30s |

Run anytime with `npm run submission:final-check`; pass `--skip-release-gate` to skip the slow step during iteration; pass `--include-ollama` once a viable Ollama host is available.

---

## Phase B — Production Prep (pending Phase A)

### Workstreams

**B1 — Multimodal hero-shot rehearsal**
- Print a real Grade 3/4 fractions worksheet on plain paper.
- Identify good natural-light desk; verify phone camera + screen recorder.
- Dry-run the shot list end-to-end with mock-mode generation; confirm the Differentiate panel renders cleanly with five variants.

**B2 — Teacher recruitment**
- Send 3 outreach messages by EOD 2026-04-28. Targets: K-6 classroom teacher, EA, retired teacher.
- $100 honorarium; 60-90 minute session; informed consent per [docs/pilot/participant-brief.md](../pilot/participant-brief.md).
- Schedule for window 2026-05-04 → 2026-05-10.

**B3 — Live-demo deploy plan**
- Backend: Render free tier selected for the no-spend public demo path; root `render.yaml` defines the orchestrator and hosted-Gemini inference services.
- Frontend: Vercel free tier; `apps/web/vercel.json` exists and carries SPA rewrites, security headers, and immutable asset caching.
- Inference: hosted Gemma 4 mode with synthetic-only data; API key must be entered as a Render secret and must not be committed.
- Smoke checklist exists at [docs/public-demo-operations.md](../public-demo-operations.md); external service creation and cellular smoke remain pending.

**B4 — Media gallery selection**
- Cover image candidate: `output/playwright/ui-evidence/2026-04-24T12-11-06-752Z/differentiate-desktop.png` or fresh capture mid-generation.
- Supporting images: Today, Tomorrow Plan, Family Message approval dialog, EA Briefing, mobile shell.
- Closed-loop architecture diagram: render the ASCII version as a clean PNG.

**Update 2026-04-30:** Vercel frontend config already existed; Render free tier is now the selected backend path with a committed `render.yaml` blueprint and Gemini-only inference requirements. Remaining Phase B deployment work is external: create the Render services, enter secrets, link Vercel `VITE_API_URL`, and complete external/cellular smoke.

### Go/No-Go Gate

By EOD 2026-05-03: at least one teacher session confirmed; deploy targets selected; hero-shot dry-run successful.

---

## Phase C — Teacher Session (pending recruitment)

### Pre-session (T-1 day)
- `npm run pilot:reset`
- Verify demo classroom loads at `?demo=true`.
- Test screen recording (OBS / QuickTime); test audio recorder.
- Print observation template + usefulness rubric.

### Session (90 minutes)
- 15 min: cold-start protocol per [docs/pilot/cold-start-protocol.md](../pilot/cold-start-protocol.md).
- 30 min: walk through the four daily jobs (open, adapt, prepare tomorrow, coordinate).
- 15 min: capture one unscripted reaction moment (Tomorrow Plan retrieval is the usual win).
- 15 min: usefulness rubric.
- 15 min: video quote capture — "one true sentence about what this is."

### Post-session (within 24 hrs)
- Anonymized notes → `docs/pilot/sessions/2026-05-XX-session.md` (NEW directory; create when first session lands).
- Update [docs/pilot/claims-ledger.md](../pilot/claims-ledger.md): move "Validated by Alberta teachers" from `unsupported` to `partially supported (n=1, synthetic data)` if rubric supports it.
- Crop teacher quote to ≤20 seconds for video.

### Quote targets (any one wins)
- "This is the part of my day that's hard."
- "I'd use this on Monday morning."
- "I'm not worried about it taking my judgment away."
- "I would want this for my EA."

### Go/No-Go Gate
A 20-second usable teacher clip lands in the video. If the session fails or is unrecoverable, video reverts to multimodal-only opening (still ~85/100 ceiling; do not panic).

---

## Phase D — Ollama Lane (resumes when host arrives)

This phase is fully scoped in [docs/development-gaps.md](../development-gaps.md) G-02 and is **not blocked by anything in this plan**. The moment a ≥16 GiB RAM, ≥40 GiB free disk host is available:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma4:4b
ollama pull gemma4:27b
nvm use && npm run host:preflight:ollama
PRAIRIE_INFERENCE_PROVIDER=ollama npm run release:gate:ollama
```

Capture three pieces of footage immediately:
1. `ollama ps` listing `gemma4:27b`.
2. WiFi disconnected; web app generates a Tomorrow Plan successfully.
3. Passing `release:gate:ollama` artifact directory.

Update [docs/eval-baseline.md](../eval-baseline.md) Ollama section. Update [docs/pilot/claims-ledger.md](../pilot/claims-ledger.md) row "Runs privacy-first locally on commodity Alberta hardware" from `unsupported` to `partially supported (host: <model>, ≥16 GiB RAM)`.

---

## Phase E — Video Production (2026-05-11 → 2026-05-13)

### Revised shot order (overrides default narrative in [video-shot-list.md](../video-shot-list.md))

| Shot | Timing | Purpose |
|---|---|---|
| 1 | 0:00 - 0:18 | **Multimodal hero** — paper worksheet → photo → 5 variants. Visceral magic. |
| 2 | 0:18 - 0:38 | **Teacher quote** — 20-second real human voice. |
| 3 | 0:38 - 1:00 | Mrs. Okafor problem framing. |
| 4 | 1:00 - 1:35 | Closed loop: intervention → pattern → tomorrow plan. |
| 5 | 1:35 - 2:00 | **Offline shot** — Ollama, WiFi off, plan generates. (Skip if Ollama not landed; replace with privacy boundary callout.) |
| 6 | 2:00 - 2:25 | Family Message draft + approval gate. |
| 7 | 2:25 - 3:00 | Architecture proof + closing. |

### Production checklist
- Day 1: rough cut, voiceover, royalty-free music selection.
- Day 2: picture lock + audio mix.
- Day 3: captions, color pass, export 1080p H.264, upload **unlisted** YouTube first.

### Backup
Always export the 2:40 tight cut as a parallel deliverable. The 3:00 cut is preferred; the tight cut is insurance.

---

## Phase F — Live Demo Deploy (2026-05-11 → 2026-05-12, parallel with E)

Per [docs/public-demo-operations.md](../public-demo-operations.md):
- Frontend → Vercel; `apps/web/vercel.json` to be created.
- Orchestrator + inference → Render free tier or $5/mo box.
- Smoke from external network and from cellular.
- Confirm `/?demo=true` lands directly on Today.

If anything is flaky from cellular, fall back to a *recorded video of the demo running locally* — Kaggle's rule reads "a URL or files for your working demo."

---

## Phase G — Verification (2026-05-14 → 2026-05-16)

### Full pre-submit pass

```bash
nvm use
npm run claims:check
npm run proof:check
npm run system:inventory:check
npm run check:contrast
npm run release:gate
# If on viable Ollama host:
npm run release:gate:ollama
# If refreshing hosted artifacts:
export PRAIRIE_GEMINI_API_KEY=<key>
export PRAIRIE_ENABLE_GEMINI_RUNS=true
npm run gemini:readycheck
npm run release:gate:gemini
```

### External verification
- Have one cold viewer watch the video and answer: (a) what does this do, (b) why Gemma 4, (c) what surprised you. If they cannot answer (b), recut.
- External smoke of live demo from a different device + cellular network.

### Final draft Kaggle writeup as **draft** (not submitted) with all attachments.

---

## Phase H — Submission (2026-05-17 → 2026-05-18)

- 2026-05-17: Convert Kaggle draft to submitted entry. Verify submitted-state badge.
- 2026-05-18 morning: final smoke (GitHub public ✅, video plays ✅, demo loads ✅, writeup submitted ✅).
- Do not edit anything else after submission.

---

## Risk Register

| Risk | Trigger | Response |
|---|---|---|
| No teacher recruited by 2026-05-03 | Zero responses after 7 outreach attempts | Widen to EAs, retired teachers, B.Ed. students; raise honorarium to $200; if still zero by 2026-05-08, video opens with multimodal only. |
| Ollama host never arrives | Day-by-day uncertainty | Continue Phases A → C → E → G → H without it; cap final ceiling at ~85/100; do not let it block any other phase. |
| Live demo flaky externally | CORS, env, auth, latency | Submit a *video of the demo running locally* as a "files" attachment per Kaggle rule. |
| Video runs over 3:00 | Footage too rich | Use 2:40 tight cut as primary. |
| Word count exceeds 1,500 | Adding teacher quote pushes over | Cut writeup §5 (Safety) to 3 lines; safety detail lives in repo docs. |
| Hosted Gemini API issue late | Quota / model deprecation | Skip refresh; checked-in 2026-04-27 artifact remains valid. |

---

## Decision Forks Already Taken

- **Ollama work deferred, not abandoned.** Phase D resumes the moment a viable host is available. Plan does not pivot to a fully Ollama-less story.
- **Track strategy:** Future of Education primary; Ollama Special Tech secondary. Not pursuing Cactus / LiteRT / llama.cpp / Unsloth in this window.
- **Demo data only:** synthetic demo classroom remains the only data source for hosted runs and live demo. No real student data ever.

---

## Update Discipline

This plan is the source of truth for the submission window. Update the checkboxes above as work lands. When a phase completes, append a one-line summary at the bottom of that phase section (date + artifact pointer). Do not rewrite history; do not delete completed checkboxes; surface drift in the [development-gaps.md](../development-gaps.md) priority map if any phase slips by more than two days.
