# Multimodal Hero-Shot Capture Checklist

**Plan owner:** [2026-05-18-submission-plan.md](./2026-05-18-submission-plan.md) Phase B1 → Phase E
**Purpose:** Capture the 18-second video opener that becomes Shot 1 of the submission video. This is the single most important visual asset.

The hero shot proves Gemma 4's multimodal capability in a way no narration or screenshot can: paper artifact → photo → five differentiated variants on a laptop, in eighteen seconds.

---

## Asset Targets

By end of capture session you must have:

- [ ] One **printed worksheet** — a real paper Grade 3/4 fractions worksheet on plain white paper, 8.5×11.
- [ ] One **phone-camera close-up** showing hands taking a photo of the worksheet (overhead angle, in focus, shutter sound captured).
- [ ] One **screen recording** of the WorksheetUpload component:
  - File drop or upload action visible
  - Loading shimmer (1-3 seconds)
  - Five variant cards revealing with reading-level chips
- [ ] One **clean still** of the final five-variant state (for promotional/cover use).

Keep raw footage in `qa/demo-script/multimodal-hero/<YYYY-MM-DD>/`. Do not commit binaries to the repo; reference paths in the plan.

---

## Pre-shoot (T-30 minutes)

1. Print the worksheet. Use the exact text from [docs/demo-script.md](../demo-script.md) §B2 — six fractions questions, Grade 3/4 level.
2. Find a desk with **direct natural light** (window-facing in late morning is ideal). Avoid overhead fluorescent — produces yellow cast.
3. Clear the desk of distractions; only the worksheet, the phone, and the laptop should be visible.
4. Reset demo data: `nvm use && npm run pilot:reset`.
5. Start services in a clean shell (use mock mode for the dry-run; switch to hosted Gemini for the real take):
   ```bash
   # Terminal 1
   python services/inference/server.py --mode mock --port 3200
   # Terminal 2
   INFERENCE_URL=http://localhost:3200 npx tsx services/orchestrator/server.ts
   # Terminal 3
   npm run dev -w apps/web
   ```
6. Open browser to `http://localhost:5173/?demo=true&tab=prep&tool=differentiate`.
7. Verify the WorksheetUpload component is visible and accepts an image drop.
8. Test screen recorder (QuickTime / OBS): record 5 seconds, check audio level (audio should be **off** for this shot — narration is added in post).

---

## The Three Takes

### Take 1 — Paper artifact (5 seconds)
- Frame the worksheet center, hands holding either side, fingers visible at edges only.
- Hold still for 3 seconds, then slowly tilt up by ~10 degrees (subtle motion).
- Cut.

### Take 2 — Phone photo (4 seconds)
- Position phone overhead, ~30 cm above worksheet.
- Frame the phone from a 45-degree side angle so both phone and worksheet are visible.
- Press the shutter button visibly. Capture the shutter sound for audio mix.
- Hold the phone steady for 1 second after shutter.
- Cut.

### Take 3 — Laptop reveal (12 seconds)
- Switch to screen recording.
- Drop the photo file (transfer from phone to laptop ahead of time; have it on the desktop) into the WorksheetUpload component.
- Capture the upload progress, the loading shimmer, and the reveal of five variant cards.
- Hold the final state for 3 seconds.
- Cut.

---

## Real-take (after dry-run passes)

Switch inference service to **hosted Gemini** so the actual model output appears:

```bash
# Replace mock-mode service in Terminal 1
export PRAIRIE_GEMINI_API_KEY=<key>
export PRAIRIE_ENABLE_GEMINI_RUNS=true
python services/inference/server.py --mode gemini --port 3200
```

Re-run Take 3 with hosted Gemini. The five variant cards will reflect real Gemma 4 vision + differentiation output. **This is the take that goes in the video.**

Re-cap budget: $20/day cap per [CLAUDE.md](../../CLAUDE.md). One real take of `differentiate_material` with a worksheet image is comfortably under cap.

---

## Quality gates before moving on

- [ ] The worksheet text is **legible** in the paper shot (judges should believe it is real, not a stage prop).
- [ ] The phone shot **does not show** any personally identifying information on the phone screen (notifications, lock screen, named photos).
- [ ] The laptop screen recording shows the **demo classroom name** (`demo-okafor-grade34`), proving the synthetic context.
- [ ] The five variant cards include at least one EAL adaptation and one extension variant (per the demo-script teacher goal).
- [ ] No personally-identifying information from any teacher or student visible at any frame.

---

## Post-shoot

1. Move raw footage to `qa/demo-script/multimodal-hero/<YYYY-MM-DD>/`.
2. Note the exact take used in the final cut at the top of [video-shot-list.md](../video-shot-list.md) Production Asset Checklist.
3. Tick the corresponding checkbox in [submission-plan.md](./2026-05-18-submission-plan.md) Phase B1.

---

## Contingency

If the real-take with hosted Gemini produces output that visually doesn't read well (variant cards look identical, EAL adaptation is subtle, etc.), regenerate with a slightly more directive teacher goal:

> Differentiate for mixed readiness: **scaffold for Elena with manipulatives**, **EAL bilingual support for Amira (Arabic) and Daniyal (Urdu)**, **extension for Chantal with multi-step word problems**.

This produces visually distinct cards that read clearly in 8-12 seconds of screen time.
