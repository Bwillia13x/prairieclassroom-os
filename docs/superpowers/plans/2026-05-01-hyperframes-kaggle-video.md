# HyperFrames Kaggle Submission Video Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. If more than one worker is available, use `superpowers:subagent-driven-development` for parallel capture, composition, and validation work. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a 1-2 minute HyperFrames Studio project for the PrairieClassroom OS Kaggle submission. The final piece should feel like a directed product film, not a screen-recording tutorial: cinematic UI surfaces, crisp proof overlays, readable captions, and a clear Gemma 4 value story.

**Architecture:** Build a self-contained ignored HyperFrames project at `output/hyperframes/prairieclassroom-kaggle-90s/`. Use current PrairieClassroom UI screenshots from `npm run ui:evidence` as the product source, then create a six-beat root composition with per-beat HTML compositions. The root composition owns all scene-to-scene transitions; beat files own entrance, hold, and ambient animation only.

**Tech Stack:** HyperFrames Studio, website-to-hyperframes capture workflow, HTML/CSS/JavaScript, GSAP timelines, captured PrairieClassroom screenshots, optional Kokoro or local TTS narration, Playwright evidence screenshots, and existing repo scripts.

**Target Runtime:** 94 seconds primary cut, with a 78-second fallback cut if narration or scene density runs long.

**Submission Boundary:** This plan produces a HyperFrames preview project and render-ready creative direction. Per HyperFrames workflow, preview and validate in Studio first; render the final MP4 only after explicit approval of the preview cut.

---

## Claims And Evidence Rules

- [ ] Do not claim real teacher validation unless `docs/pilot/sessions/` contains a completed session packet and `docs/pilot/claims-ledger.md` marks the claim supported.
- [ ] Do not include an offline/Ollama shot unless `npm run release:gate:ollama` has passed on a viable host and the artifact path is recorded.
- [ ] Keep hosted Gemma proof language scoped to synthetic/demo data.
- [ ] Use "Gemma 4" in narration and captions because the Kaggle story needs model-specific contribution, not generic AI value.
- [ ] Use the current proof posture: hosted proof remains canonical at `output/release-gate/2026-04-27T01-26-45-190Z-87424` unless a newer hosted gate passes end-to-end.

## Creative Direction

The film should open with the human classroom problem, then immediately prove that PrairieClassroom OS is more than chat. The strongest visual arc is:

1. A teacher is buried in coordination work.
2. A paper worksheet becomes differentiated variants.
3. The day becomes an operating picture.
4. A quick note becomes structured memory and tomorrow's plan.
5. Family communication stays teacher-approved.
6. The close lands the technical proof: Gemma 4, roster-checked tools, prompt classes, and evidence traces.

Visual style follows the repo's product identity: Prairie deep blue, cream operational surfaces, wheat-gold action marks, green trust/live signals, Doto display numerals, Atkinson readable captions, and Space Mono proof labels. Use actual UI surfaces whenever possible. Avoid generic AI particles, floating brains, fake classroom footage, surveillance framing, and unsupported classroom outcome claims.

## Primary Voiceover

Use this as `SCRIPT.md`. It is written for roughly 90-95 seconds at a calm 130-140 words per minute.

```text
A teacher does not need another chatbot.
She needs the classroom day to hold together.

This is PrairieClassroom OS: a Gemma 4 native operating layer for inclusive classrooms.

Start with a paper fractions worksheet.
The system reads the photo and turns the same task into five readiness-aligned versions: support, E A L scaffolds, and extension, without retyping the lesson.

Then the day comes into view.
Twenty-six synthetic students. Morning-only E A coverage. Open threads that would normally live in sticky notes, tabs, and hallway memory.

A quick intervention note becomes structured classroom memory.
The next plan retrieves that signal and turns it into tomorrow's concrete moves, not generic advice.

Family communication stays bounded.
The system drafts. The teacher reviews, edits, and approves. No autonomous sends.

The proof is in the architecture: twelve workflow tools, thirteen prompt classes, roster-checked function calling, and a hosted Gemma proof lane on synthetic data.

PrairieClassroom OS.
An operating layer for the adults doing the work.
```

Pronunciation notes:

- [ ] In TTS prompts, write "Gemma four" if the voice mispronounces "Gemma 4".
- [ ] Write "E A L" and "E A" with spaces for clearer narration.
- [ ] Keep "synthetic students" in the spoken track. It is honest and avoids overclaiming.

## Director Storyboard

### Beat 1 - Cold Open: Not Another Chatbot (0.00-10.00s)

**Narration:** "A teacher does not need another chatbot. She needs the classroom day to hold together."

**Hero Frame:** Dark PrairieClassroom Today surface, angled as a large command plane. Left side has the line "Not another chatbot." The second line appears beneath it: "A day that holds together."

**Visual Sources:**

- `capture/assets/screenshots/today-desktop.png`
- `capture/assets/screenshots/render-dark-desktop-today.png`

**Motion:**

- Product surface enters from the right with a 5-degree perspective tilt.
- "Not another chatbot" types in with a gold cursor mark.
- Three small evidence chips animate in: `26 students`, `EA morning only`, `open threads`.
- Background grid drifts at 1-2 px per second, then stabilizes.

**Transition Out:** Gold vertical rule expands to full height and wipes into Beat 2. No fade.

### Beat 2 - Multimodal Worksheet To Variants (10.00-28.00s)

**Narration:** "This is PrairieClassroom OS: a Gemma 4 native operating layer for inclusive classrooms. Start with a paper fractions worksheet. The system reads the photo and turns the same task into five readiness-aligned versions: support, E A L scaffolds, and extension, without retyping the lesson."

**Hero Frame:** A paper worksheet card on the left transforms into a laptop UI surface on the right. Five differentiated variant cards fan out from the Differentiate panel.

**Visual Sources:**

- `capture/assets/screenshots/differentiate-desktop.png`
- Optional physical asset: `qa/demo-script/multimodal-hero/worksheet-photo.jpg` if captured before implementation.

**Motion:**

- Paper worksheet card slides in, slightly imperfect like a phone photo.
- Camera shutter flash lasts 5 frames.
- A thin Gemma 4 processing line travels from photo to UI.
- Five variant cards enter one by one with labels: `Support`, `EAL 1`, `EAL 2`, `Core`, `Extension`.
- Use a 2.5D crop of the actual Differentiate screenshot behind the cards so the app remains the hero.

**Transition Out:** Focus pull from variant cards into the Today dashboard. The worksheet cards blur backward while the dashboard sharpens forward.

### Beat 3 - The Day Comes Into View (28.00-43.00s)

**Narration:** "Then the day comes into view. Twenty-six synthetic students. Morning-only E A coverage. Open threads that would normally live in sticky notes, tabs, and hallway memory."

**Hero Frame:** Today and Classroom screenshots as a split operating picture. Counters sit in a narrow proof rail.

**Visual Sources:**

- `capture/assets/screenshots/today-desktop.png`
- `capture/assets/screenshots/first-desktop-classroom.png`
- `capture/assets/screenshots/first-desktop-today.png`

**Motion:**

- Counter numerals roll up with Doto styling: `26`, `morning`, `open`.
- Classroom roster surface rises behind Today at 60% scale.
- Gold connector lines point from the counters into real UI regions.
- A subtle "synthetic demo data" badge stays visible in a corner.

**Transition Out:** Left-to-right product pan along the gold connector into Ops/Tomorrow.

### Beat 4 - Note To Memory To Tomorrow (43.00-62.00s)

**Narration:** "A quick intervention note becomes structured classroom memory. The next plan retrieves that signal and turns it into tomorrow's concrete moves, not generic advice."

**Hero Frame:** Three-panel workflow: Log Intervention, Support Pattern / memory trace, Tomorrow Plan. A single note travels through the panels as a gold pulse.

**Visual Sources:**

- `capture/assets/screenshots/render-dark-desktop-ops-log-intervention.png`
- `capture/assets/screenshots/tomorrow-plan-desktop.png`
- `capture/assets/screenshots/tomorrow-plan-dark-desktop.png`

**Motion:**

- Intervention note card enters at left with text: "Visual timer worked during math transition."
- The card compresses into a structured memory chip.
- Memory chip travels along a gold line into the Tomorrow Plan screenshot.
- Two concrete actions stamp in: `timer ready before 9:15` and `repeat fraction-strip win`.

**Transition Out:** Vertical lift from Tomorrow Plan into Review / Family Message. The gold line becomes the top edge of the approval frame.

### Beat 5 - Teacher Control Boundary (62.00-76.00s)

**Narration:** "Family communication stays bounded. The system drafts. The teacher reviews, edits, and approves. No autonomous sends."

**Hero Frame:** Family Message screenshot with an approval gate overlay. The UI is clear enough to read; the overlay makes the safety boundary unmistakable.

**Visual Sources:**

- `capture/assets/screenshots/family-message-desktop.png`
- `capture/assets/screenshots/family-message-dark-desktop.png`

**Motion:**

- Draft card slides up from the product surface.
- Three approval states animate as icons and text: `Draft`, `Review`, `Approve`.
- The `Approve` gate stays locked until a teacher-control checkmark lands.
- Final line appears in Space Mono: `No autonomous sends`.

**Transition Out:** Approval frame contracts into a proof badge and carries into the close.

### Beat 6 - Proof And Brand Lockup (76.00-94.00s)

**Narration:** "The proof is in the architecture: twelve workflow tools, thirteen prompt classes, roster-checked function calling, and a hosted Gemma proof lane on synthetic data. PrairieClassroom OS. An operating layer for the adults doing the work."

**Hero Frame:** Product shell montage behind a structured proof card, then final lockup.

**Visual Sources:**

- `capture/assets/screenshots/first-desktop-week.png`
- `capture/assets/screenshots/first-desktop-review.png`
- `capture/assets/screenshots/render-dark-desktop-classroom.png`
- Proof text from `docs/hackathon-proof-brief.md`, `docs/live-model-proof-status.md`, and `docs/pilot/claims-ledger.md`.

**Motion:**

- Four proof tiles enter in a grid: `12 workflow tools`, `13 prompt classes`, `roster-checked tools`, `hosted Gemma synthetic proof`.
- Tiles collapse into the PrairieClassroom OS wordmark.
- Final caption holds for at least 2.5 seconds: `A Gemma 4 operating layer for inclusive classrooms.`

**Transition Out:** Final fade to black is allowed only after the lockup has held.

## Fallback 78-Second Cut

Use this if the 94-second cut feels too dense after Studio preview.

- Beat 1: 0.00-8.00s
- Beat 2: 8.00-24.00s
- Beat 3: 24.00-36.00s
- Beat 4: 36.00-52.00s
- Beat 5: 52.00-64.00s
- Beat 6: 64.00-78.00s

Remove one sentence from the voiceover:

```text
Morning-only E A coverage.
```

Replace the final architecture sentence with:

```text
The proof: workflow tools, prompt classes, roster-checked function calling, and hosted Gemma synthetic-data artifacts.
```

## File Structure

Implement the HyperFrames project here:

```text
output/hyperframes/prairieclassroom-kaggle-90s/
  DESIGN.md
  SCRIPT.md
  STORYBOARD.md
  README.md
  hyperframes.json
  index.html
  compositions/
    beat-1-cold-open.html
    beat-2-multimodal-worksheet.html
    beat-3-operating-picture.html
    beat-4-memory-loop.html
    beat-5-teacher-control.html
    beat-6-proof-lockup.html
  capture/
    assets/
      screenshots/
      photos/
      svgs/
    meta.json
  narration/
    narration.wav
    transcript.json
  snapshots/
  renders/
```

Keep `output/hyperframes/` ignored unless the submission owner explicitly chooses to commit a small subset of generated artifacts.

## Implementation Tasks

### Task 1 - Create Project Skeleton

- [ ] From repo root, create the project directories:

```bash
mkdir -p output/hyperframes/prairieclassroom-kaggle-90s/{compositions,capture/assets/{screenshots,photos,svgs},narration,snapshots,renders}
```

- [ ] Copy the current design source:

```bash
cp DESIGN.md output/hyperframes/prairieclassroom-kaggle-90s/DESIGN.md
```

- [ ] Write `SCRIPT.md` from the voiceover section above.
- [ ] Write `STORYBOARD.md` from the six-beat director storyboard above.
- [ ] Write `README.md` with run commands, asset sources, and the claim-scope warning.

### Task 2 - Capture Or Refresh Product Assets

- [ ] Start the app and API in a long-running terminal:

```bash
source ~/.nvm/nvm.sh
nvm use
PRAIRIE_TEST_DISABLE_RATE_LIMITS=true npm run dev
```

- [ ] In a second terminal, capture fresh UI evidence:

```bash
source ~/.nvm/nvm.sh
nvm use
npm run ui:evidence
```

- [ ] Copy the latest evidence bundle into the HyperFrames project:

```bash
LATEST_UI_EVIDENCE="$(ls -td output/playwright/ui-evidence/* | head -1)"
cp "$LATEST_UI_EVIDENCE"/*.png output/hyperframes/prairieclassroom-kaggle-90s/capture/assets/screenshots/
cp "$LATEST_UI_EVIDENCE"/manifest.json output/hyperframes/prairieclassroom-kaggle-90s/capture/meta.json
```

- [ ] Verify the following files exist after copying:

```bash
test -f output/hyperframes/prairieclassroom-kaggle-90s/capture/assets/screenshots/today-desktop.png
test -f output/hyperframes/prairieclassroom-kaggle-90s/capture/assets/screenshots/differentiate-desktop.png
test -f output/hyperframes/prairieclassroom-kaggle-90s/capture/assets/screenshots/tomorrow-plan-desktop.png
test -f output/hyperframes/prairieclassroom-kaggle-90s/capture/assets/screenshots/family-message-desktop.png
```

- [ ] If `qa/demo-script/multimodal-hero/worksheet-photo.jpg` exists, copy it:

```bash
cp qa/demo-script/multimodal-hero/worksheet-photo.jpg output/hyperframes/prairieclassroom-kaggle-90s/capture/assets/photos/worksheet-photo.jpg
```

- [ ] If the photo does not exist, create a stylized paper worksheet card in Beat 2 using CSS and label it `synthetic worksheet visual`. Do not pretend it is captured classroom footage.

### Task 3 - Build Root Composition

- [ ] Create `index.html` as the full 94-second root composition.
- [ ] Use CSS variables from `DESIGN.md` for product colors and type.
- [ ] Load all six beat compositions as internal sections or iframes, whichever matches the existing `output/hyperframes/prairieos-launch/` pattern.
- [ ] Implement root timeline labels:

```javascript
const labels = {
  beat1: 0,
  beat2: 10,
  beat3: 28,
  beat4: 43,
  beat5: 62,
  beat6: 76,
  end: 94,
};
```

- [ ] Put every scene transition in `index.html`, not inside beat files.
- [ ] Use GSAP for all timing and avoid jump cuts.
- [ ] Ensure every visual element enters with motion; no static dumps on first frame.

### Task 4 - Build Beat Compositions

- [ ] Beat 1: Build the dark Today command-plane opener with proof chips and gold wipe.
- [ ] Beat 2: Build the worksheet-to-variants transformation using `differentiate-desktop.png`.
- [ ] Beat 3: Build the operating-picture split view using Today and Classroom screenshots.
- [ ] Beat 4: Build the note-to-memory-to-tomorrow workflow using Ops and Tomorrow screenshots.
- [ ] Beat 5: Build the teacher-control approval boundary using Family Message screenshots.
- [ ] Beat 6: Build the proof tile montage and final brand lockup.

Each beat file must include:

- [ ] `data-beat` attribute on the root scene.
- [ ] A self-contained 1920x1080 stage.
- [ ] Asset preload declarations.
- [ ] A local GSAP timeline for entrances and ambient movement only.
- [ ] A still-readable frame at 2 seconds for Studio thumbnails.
- [ ] Captions or on-screen text that does not exceed two lines per region.

### Task 5 - Narration And Captions

- [ ] Generate or record narration as `output/hyperframes/prairieclassroom-kaggle-90s/narration/narration.wav`.
- [ ] Save transcript timing as `output/hyperframes/prairieclassroom-kaggle-90s/narration/transcript.json`.
- [ ] Keep captions visible in the lower safe area with enough contrast over both dark and cream surfaces.
- [ ] Caption every narrated sentence because Kaggle judges may watch muted.
- [ ] Keep proof labels in Space Mono and product captions in Atkinson Hyperlegible.

### Task 6 - HyperFrames Studio Preview

- [ ] Start the HyperFrames project in Studio according to the installed HyperFrames workflow.
- [ ] Preview `index.html` at 1920x1080.
- [ ] Capture six preview thumbnails at these timestamps:

```text
00:04
00:16
00:34
00:52
01:08
01:27
```

- [ ] Save thumbnails under:

```text
output/hyperframes/prairieclassroom-kaggle-90s/snapshots/
```

- [ ] Inspect the full preview before rendering. Confirm no text overlap, no unreadable captions, and no blank product frames.

### Task 7 - Validation Checklist

- [ ] Run repo-side checks that are relevant before final video render:

```bash
source ~/.nvm/nvm.sh
nvm use
npm run claims:check
npm run proof:check
npm run check:contrast
```

- [ ] Validate the HyperFrames preview:
  - Text is readable at 1920x1080 and 1280x720.
  - The first frame of every beat is not blank.
  - Every beat has animated entrance motion.
  - No scene claims teacher validation, measured prep-time reduction, real classroom outcomes, or offline local inference without artifacts.
  - Final lockup holds for at least 2.5 seconds.
  - Runtime is between 60 and 120 seconds.

- [ ] Save a validation note at:

```text
output/hyperframes/prairieclassroom-kaggle-90s/VALIDATION.md
```

### Task 8 - Render Gate

- [ ] Only after the Studio preview is approved, render the final MP4.
- [ ] Save the render as:

```text
output/hyperframes/prairieclassroom-kaggle-90s/renders/prairieclassroom-kaggle-90s.mp4
```

- [ ] Run a basic media check:

```bash
ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 output/hyperframes/prairieclassroom-kaggle-90s/renders/prairieclassroom-kaggle-90s.mp4
```

- [ ] Confirm duration is `>= 60` and `<= 120`.
- [ ] Watch the rendered MP4 end to end before using it as a Kaggle artifact.

## Acceptance Criteria

- [ ] HyperFrames project exists at `output/hyperframes/prairieclassroom-kaggle-90s/`.
- [ ] `SCRIPT.md` and `STORYBOARD.md` match the six-beat 94-second plan.
- [ ] Product screenshots come from a current `npm run ui:evidence` bundle or are explicitly marked as existing local evidence.
- [ ] The preview tells the product job, Gemma 4 contribution, and evidence posture within the first 45 seconds.
- [ ] No unsupported claims appear in narration, captions, proof cards, or README.
- [ ] Studio preview is visually clean at 1920x1080 and 1280x720.
- [ ] Final render, if approved, is between 60 and 120 seconds.

## Cold Viewer Test

After the preview cut exists, show it to one cold viewer and ask only these three questions:

1. What does PrairieClassroom OS do?
2. Why is Gemma 4 important here?
3. What was the most surprising capability?

The cut passes if the viewer can answer:

- It helps teachers coordinate inclusive classroom work across prep, daily operations, planning, and family communication.
- Gemma 4 matters for multimodal worksheet reading, structured planning, tool calling, and an eventual local privacy-first deployment path.
- The surprising capability is either worksheet-to-variants or note-to-memory-to-tomorrow closed loop.

If the viewer cannot answer question 2, revise Beat 2 and Beat 6 before rendering.

## Handoff Notes

- The existing short HyperFrames project at `output/hyperframes/prairieos-launch/` is useful as an implementation reference for composition structure, not as the final Kaggle story.
- The current `docs/video-shot-list.md` remains the more complete 3-minute submission script. This plan is the shorter HyperFrames-native test cut.
- The HyperFrames output should stay under `output/` until the submission owner decides which media assets become public artifacts.
