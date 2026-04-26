# Final App Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all 9 findings from the 2026-04-25 final application review (`qa/final-app-review-2026-04-25.md`) with focused, test-backed fixes.

**Architecture:** Each finding is one self-contained task with the shape `verify → minimal fix → test → commit`. Tasks are independent and can be parallelized or peeled off into separate PRs. Tasks are ordered safest-first (CSS / docs first, behavior changes last).

**Tech Stack:** React 19, TypeScript, Vite, vitest, `@testing-library/react`, CSS custom properties, SQLite seeder via `tsx`, Express orchestrator with structured JSON logs.

**Source spec:** `qa/final-app-review-2026-04-25.md`

**Cross-cutting reminders (from CLAUDE.md + saved feedback):**
- `npm run typecheck` for any TS/schema change
- `npm run lint` for lint-sensitive change
- `npm run test` for orchestrator/UI logic change
- `npm run check:contrast` for color/dark-mode change
- Always grep `apps/web/src/styles/tokens.css` before using `--color/--space/--font/--shadow` tokens — invented tokens silently fail at runtime
- Use `${label}-${index}` keys when mapping arrays whose label could repeat
- Prefer `getByTestId` over `getByRole` in smoke-browser tests; button-label drift is the recurring CLAUDE.md-flagged failure
- Default to writing no comments — only add a comment when the WHY is non-obvious

---

## Task ordering & ownership

| # | Finding | Severity | Risk | Est | Sub-skill checkpoint |
|---|---------|----------|------|-----|----------------------|
| T1 | p1 — document inner-`<main>` scroll | polish | none | 10m | docs-only |
| T2 | m2 — verify Today hero time is data-driven | minor | none | 5m | no-op expected |
| T3 | p3 — hide ⌘K keycap on mobile | polish | low | 15m | css + viewport test |
| T4 | M3 — fix `INTELLIGENCE` mid-word break | major | low | 20m | rename + render test |
| T5 | p2 — clarify 26 STUDENTS vs 26 THREADS | polish | low | 30m | label/source review |
| T6 | m1 — pick a badge aggregation rule | minor | low | 30m | unit test + spec note |
| T7 | m3 — fix Family Message ghost overlay | minor | medium | 45m | investigate + render test |
| T8 | M2 — pilot:start staleness preflight | major | low | 45m | new node script + test |
| T9 | M1 — global toast on generation failure | major | medium | 1.5h | tests + wiring across panels |

**Total**: ~5 h (vs. ~3 h estimated in QA report — extra buffer for tests + reviews).

After every task: `git status` clean, single focused commit, then move on.

---

## Task 1: Document the inner-`<main>` scroll pattern

**Why this matters:** During the QA pass, `window.scrollTo` and `document.scrollHeight` returned 0 because `.app-main` is the actual scroll container (`overflow: hidden auto`). Future contributors writing E2E tests, scroll restoration, or screenshot tooling need to know.

**Files:**
- Modify: `docs/architecture.md` (append a new subsection)

- [ ] **Step 1: Locate the architecture doc and confirm it has a "Web shell" section**

```bash
grep -n "^##" docs/architecture.md | head -20
```
Expected: a list of `##` and `###` headings. Find the most logical anchor for a new "Scroll containers" subsection (likely under a "Web shell" or "Frontend" section).

- [ ] **Step 2: Append the subsection at the chosen location**

Add this prose verbatim. Adjust the heading level (`###` vs `####`) to match its parent in the doc.

```markdown
### Scroll containers

The app shell uses an inner-element scroll pattern, not document scroll. The
top header (`.app-header__inner`) and primary tab bar are sticky to the
viewport. Below them, `<main class="app-main">` is the *only* element that
scrolls; it has `overflow: hidden auto` and a fixed pixel height equal to
`100vh - shell chrome`. The `<body>` and `<html>` heights stay flush with
the viewport.

Practical consequences:

- `window.scrollY` is always `0`; `document.documentElement.scrollHeight`
  equals the viewport height. Use
  `document.querySelector('.app-main').scrollTop` instead.
- Anchor links inside the workspace (`<a href="#review-workspace">`) work
  because `scrollIntoView` is container-aware. The `PageAnchorRail`
  component depends on this.
- Full-page screenshot tools (Playwright `fullPage: true`, browser
  extensions) only capture the viewport. Smoke scripts in `qa/` and
  `scripts/capture-*.mjs` already accommodate this; new screenshot tooling
  must do the same.
- Page-bottom intersection observers must root on `.app-main`, not the
  viewport.

The pattern lives in `apps/web/src/styles/ambient.css` (see `.app-shell`
and `.app-main` rules) and is intentional: it lets the chrome (header,
nav, classroom switcher) stay fixed while only the workspace content
scrolls.
```

- [ ] **Step 3: Verify the doc still parses cleanly**

```bash
npx markdownlint docs/architecture.md 2>&1 | head -10 || true
```
Expected: no new errors introduced (warnings about pre-existing issues are fine).

- [ ] **Step 4: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: document inner-<main> scroll pattern in architecture.md

The shell uses overflow: hidden auto on .app-main rather than document
scroll. Future contributors need this when building scroll-aware tests,
screenshot tooling, or intersection observers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Verify Today hero time is data-driven (m2)

**Why this matters:** The QA report flagged `"12:45 is today's real test."` as possibly hard-coded. A code scan found the time is derived from `peakBlock.time_slot` in `apps/web/src/components/TodayStory.tsx:83`. This task confirms via test that the value is dynamic, then closes the finding with no production-code change.

**Files:**
- Read: `apps/web/src/components/TodayStory.tsx:83`
- Read: `apps/web/src/components/__tests__/TodayStory.test.tsx`

- [ ] **Step 1: Confirm the existing test already asserts dynamic time**

```bash
grep -nE "real test|peakBlock|time_slot" apps/web/src/components/__tests__/TodayStory.test.tsx
```
Expected: at least one assertion on `lede` matching `/real test/i` (line ~125 per QA scan).

- [ ] **Step 2: Add a focused test that varies `peak_block.time_slot` and asserts the lede reflects it**

If a parametrized test already covers two distinct time slots, skip this step and mark the task done. Otherwise add this test at the bottom of `apps/web/src/components/__tests__/TodayStory.test.tsx` (inside the existing `describe` block):

```tsx
  it("derives the hero time from peak_block.time_slot, not a constant", () => {
    const earlyMorning = buildStory({
      peak_block: { time_slot: "09:15-10:15 Reading", risk_score: 0.8 },
      open_threads_count: 12,
    });
    const lateAfternoon = buildStory({
      peak_block: { time_slot: "14:30-15:30 Math", risk_score: 0.8 },
      open_threads_count: 12,
    });
    expect(earlyMorning.lede).toMatch(/^09:15/);
    expect(lateAfternoon.lede).toMatch(/^14:30/);
  });
```

Note: `buildStory` is the existing test helper; if its name differs, use the existing helper from the file.

- [ ] **Step 3: Run the test**

```bash
npx vitest run apps/web/src/components/__tests__/TodayStory.test.tsx
```
Expected: PASS.

- [ ] **Step 4: Commit (only if a test was added)**

```bash
git add apps/web/src/components/__tests__/TodayStory.test.tsx
git commit -m "test: confirm Today hero time is derived from peak_block.time_slot

Resolves QA finding m2 from final-app-review-2026-04-25.md — the time
in 'X:XX is today's real test' is dynamic, not hard-coded. Lock the
behavior with an explicit two-slot test.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

If no test was added (existing coverage was already adequate), record the verification in the QA report's "outcomes" section and skip the commit.

---

## Task 3: Hide `⌘K` keycap on mobile (p3)

**Why this matters:** The Cmd-K keyboard hint renders inside the Search button on mobile (375 px), where the shortcut is meaningless and adds visual noise. The button itself still works when tapped.

**Files:**
- Read: `apps/web/src/App.tsx` (find the Search button rendering)
- Modify: the CSS file that styles the Search button keycap

- [ ] **Step 1: Locate the keycap markup**

```bash
grep -rn '⌘K\|cmd-k\|cmdK\|keycap' apps/web/src/ --include="*.tsx" --include="*.css" | grep -v __tests__ | head -10
```
Expected: a `<span>` (or similar) wrapping `⌘K` inside the Search button. Note the CSS class.

- [ ] **Step 2: Confirm the existing mobile breakpoint convention**

```bash
grep -nE "@media.*max-width|@media.*min-width" apps/web/src/styles/ambient.css | head -10
```
Expected: an existing breakpoint near `640px` or `768px`. **Reuse** that exact pixel value to stay consistent — do not invent a new breakpoint.

- [ ] **Step 3: Add a media query that hides the keycap below the chosen breakpoint**

In the CSS file from Step 1, add:

```css
/* The ⌘K hint is meaningless on touch devices and adds visual noise
   in the cramped mobile header. The button itself remains tappable. */
@media (max-width: 640px) {
  .shell-control-search__keycap {
    display: none;
  }
}
```

Replace `.shell-control-search__keycap` with the exact class found in Step 1, and `640px` with the breakpoint chosen in Step 2.

- [ ] **Step 4: Add a vitest that asserts the keycap is hidden at 375 px**

Visual hiding is hard to test without a real browser, so instead test that the class exists on the element (so the CSS rule has a target). Append to an existing shell test (e.g., `apps/web/src/__tests__/App.shell.test.tsx`):

```tsx
  it("renders the ⌘K keycap with a class our mobile CSS can target", () => {
    render(<AppHarness initialUrl="/?demo=true&tab=today" />);
    const keycap = screen.getByText("⌘K");
    expect(keycap).toHaveClass(/keycap/);
  });
```

(Adjust class regex / harness name to match the file's existing pattern.)

- [ ] **Step 5: Run typecheck + tests**

```bash
npm run typecheck && npx vitest run apps/web/src/__tests__/App.shell.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Manual verification**

Open `http://localhost:5173/?demo=true` in a browser, open devtools mobile emulation at 375 px width, confirm the keycap is hidden but the search button is still clickable.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/styles/ docs/
git commit -m "feat(web): hide ⌘K keycap below 640px

Closes QA p3 — the cmd-k hint is meaningless on touch devices and adds
visual noise in the mobile header. Button remains tappable.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Fix `INTELLIGENCE` side-nav mid-word break (M3)

**Why this matters:** At all viewports ≥ 768 px, the Classroom rail's `05 INTELLIGENCE` label breaks mid-word to `INTELLIGENC E`. The CSS comment at `apps/web/src/components/PageAnchorRail.css:439-444` explicitly tries to prevent this, and `apps/web/src/styles/ambient.css:670-677` already widened the rail from 9.25 rem to 11 rem to fit the longest two-word labels. INTELLIGENCE is a 12-char single word that just barely overruns the available label column at 11 rem + 0.06 em letter-spacing.

**Default fix:** Rename the label to `Insights` (8 chars). This ships immediately and matches the editorial vocabulary used elsewhere in the product (e.g., "Usage Insights" panel). The section heading inside the panel can keep saying "Intelligence" if that copy is load-bearing; only the rail label needs to be short.

**Alternative if "Intelligence" must be preserved:** Bump `--shell-page-rail-width` from `11rem` to `11.5rem` in `apps/web/src/styles/ambient.css:677` and verify gutter still feels comfortable at 1280, 1440, and 1920. Cost: 8 px of workspace gutter on every page.

This task implements the default (rename). If the rename is rejected during review, swap to the widen alternative.

**Files:**
- Modify: `apps/web/src/pageAnchors.ts:19`
- Modify: `apps/web/src/panels/ClassroomPanel.tsx` (the `id="classroom-intelligence"` anchor target)
- Test: `apps/web/src/components/__tests__/PageAnchorRail.label.test.tsx` (new file)

- [ ] **Step 1: Find every reference to `classroom-intelligence` and `Intelligence` (the label)**

```bash
grep -rn "classroom-intelligence\|\"Intelligence\"\|>Intelligence<" apps/web/src/ docs/ --include="*.ts" --include="*.tsx" --include="*.md" | head -20
```
Expected: at minimum the `pageAnchors.ts:19` entry, the matching anchor `id` in `ClassroomPanel.tsx`, and possibly a `docs/` reference. Capture the full list before editing.

- [ ] **Step 2: Write the failing render test**

Create `apps/web/src/components/__tests__/PageAnchorRail.label.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageAnchorRail } from "../PageAnchorRail";
import { PAGE_ANCHORS } from "../../pageAnchors";

describe("PageAnchorRail labels", () => {
  it("classroom rail has no single-word label longer than 10 characters", () => {
    const longest = PAGE_ANCHORS.classroom.anchors
      .map((a) => a.label)
      .filter((l) => !l.includes(" "))
      .reduce((max, l) => (l.length > max.length ? l : max), "");
    expect(longest.length, `single-word label "${longest}" risks mid-word wrap at the 11rem rail`)
      .toBeLessThanOrEqual(10);
  });

  it("renders the classroom rail with no label containing a soft hyphen or zero-width space", () => {
    render(
      <PageAnchorRail
        anchors={PAGE_ANCHORS.classroom.anchors}
        topAnchorId={PAGE_ANCHORS.classroom.topAnchorId}
        label={PAGE_ANCHORS.classroom.label}
      />
    );
    PAGE_ANCHORS.classroom.anchors.forEach((a) => {
      const el = screen.getByText(a.label);
      expect(el.textContent).not.toMatch(/[­​]/);
    });
  });
});
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
npx vitest run apps/web/src/components/__tests__/PageAnchorRail.label.test.tsx
```
Expected: FAIL on the first `it` because `Intelligence` is 12 chars.

- [ ] **Step 4: Make the rename**

Edit `apps/web/src/pageAnchors.ts:19`:

```ts
      { id: "classroom-insights", number: "05", label: "Insights" },
```

Edit `apps/web/src/panels/ClassroomPanel.tsx` — change every `id="classroom-intelligence"` to `id="classroom-insights"`. Keep the inner section eyebrow text ("Intelligence" / "ZONE 5 — INTELLIGENCE") if the editorial team values it; only the anchor `id` and rail label change.

```bash
grep -n 'classroom-intelligence' apps/web/src/panels/ClassroomPanel.tsx
```
Update each line to `classroom-insights`.

- [ ] **Step 5: Update any other references uncovered in Step 1**

For each docs/test reference to `classroom-intelligence`, decide whether to update it (deep-link or test) or leave it (historical changelog entry). When in doubt, update.

- [ ] **Step 6: Run the test to confirm it passes**

```bash
npx vitest run apps/web/src/components/__tests__/PageAnchorRail.label.test.tsx
```
Expected: PASS both `it`s.

- [ ] **Step 7: Run the full UI test suite + typecheck**

```bash
npm run typecheck && npm run test -- apps/web/src/
```
Expected: no new failures. If a test was relying on the old label, fix it forward (don't revert).

- [ ] **Step 8: Manual smoke**

```bash
npm run pilot:start
```
Open `http://localhost:5173/?demo=true&tab=classroom`. Confirm:
- Rail item 05 reads `INSIGHTS` (uppercase via existing CSS) on one line at 1280, 1440, 1920.
- Clicking the item still scrolls to the same Intelligence section in the page body.

Stop the stack with Ctrl-C.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/pageAnchors.ts apps/web/src/panels/ClassroomPanel.tsx apps/web/src/components/__tests__/PageAnchorRail.label.test.tsx docs/
git commit -m "fix(web): rename Classroom rail '05 Intelligence' → '05 Insights'

Closes QA M3. The 11rem rail width was set to fit the longest two-word
labels but couldn't accommodate the single 12-char word 'Intelligence'
at 0.06em letter-spacing, so it broke mid-word to 'INTELLIGENC E'.
Rename keeps the editorial section heading intact while making the rail
label fit on one line.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Clarify 26 STUDENTS vs 26 THREADS coincidence (p2)

**Why this matters:** The Classroom Pulse stat card shows `26 STUDENTS` and `26 THREADS`. Per the demo seed contract (CLAUDE.md), the roster is intentionally tiered: 8 active threads + 7 watch + 11 strength-only — so `THREADS = 26` is suspicious. Source check (`apps/web/src/panels/ClassroomPanel.tsx:152`) shows `openThreadCount = result?.student_threads?.length`, and line 155 reuses the same value as `watchCount`. Need to confirm whether the API really returns 26 student_threads or whether the metric is mislabeled.

**Files:**
- Investigate: `apps/web/src/panels/ClassroomPanel.tsx:152-155`
- Investigate: orchestrator route `GET /api/classrooms/:id/health` (likely the source of `student_threads`)
- Possibly modify: `apps/web/src/panels/ClassroomPanel.tsx` (relabel) or the orchestrator (refine the metric)

- [ ] **Step 1: Confirm the API payload**

With the dev stack up:

```bash
curl -s http://localhost:3100/api/classrooms/demo-okafor-grade34/health | python3 -m json.tool | grep -E "student_threads|count|threads" | head -20
```
Expected: a `student_threads` array. Count its length and inspect the first entry to understand what each item represents.

- [ ] **Step 2: Decide outcome based on payload**

| Payload reality | Action |
|---|---|
| `student_threads` length is 26 — every student has an entry, including light-touch students | Relabel `THREADS` to a more accurate noun (e.g., `WATCHED`, `TRACKED`) and document. |
| `student_threads` length is 26 because the API includes one entry per student regardless of activity | Change the count to filter `entry.status !== "strength_only"` (or equivalent), so the displayed metric matches what a teacher reads as a "thread". |
| `student_threads` length is 8 (active threads only), the 26 is shown elsewhere | Update the panel to display the right field. |

- [ ] **Step 3: Implement the chosen outcome**

If **relabel**: edit `apps/web/src/panels/ClassroomPanel.tsx` to change the stat label from `THREADS` to the more accurate noun. Search for `THREADS` and `threads` in the panel:

```bash
grep -n "THREADS\|>threads<" apps/web/src/panels/ClassroomPanel.tsx
```

Update the label string and the corresponding accessibility label. Also update any test snapshot that asserts on the old label.

If **filter**: edit the `openThreadCount` computation:

```tsx
const openThreadCount = (result?.student_threads ?? []).filter(
  (t) => t.status !== "strength_only" && t.status !== "watch_only"
).length;
```

(Use the actual status field name and values from the schema in `packages/shared/schemas/`.)

- [ ] **Step 4: Add or update a unit test that locks the new metric**

In `apps/web/src/panels/__tests__/ClassroomPanel.test.tsx` (create if missing), add:

```tsx
it("counts only actionable threads, not strength-only roster entries", () => {
  const fixture = {
    student_threads: [
      { student_ref: "S1", status: "active" },
      { student_ref: "S2", status: "active" },
      { student_ref: "S3", status: "watch_only" },
      { student_ref: "S4", status: "strength_only" },
    ],
  };
  const { container } = render(<ClassroomPanel result={fixture} />);
  // Expect the "THREADS" stat to render "2", not "4"
  expect(container.textContent).toMatch(/\b2\b\s*THREADS/);
});
```

(Replace status values, prop names, and the rendered DOM assertion with whatever matches the actual implementation.)

- [ ] **Step 5: Run tests + typecheck**

```bash
npm run typecheck && npm run test -- apps/web/src/panels/
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/panels/ClassroomPanel.tsx apps/web/src/panels/__tests__/ClassroomPanel.test.tsx docs/
git commit -m "fix(web): clarify Classroom Pulse THREADS metric

Closes QA p2. The previous count reused student_threads.length, which
equals the full roster (26) and made THREADS visually equal to
STUDENTS — confusing for teachers reading the stat card. Now [chosen
outcome — relabel / filter] so the number matches the seed contract
(8 active + 7 watch + 11 strength-only).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Pick a badge aggregation rule and apply it (m1)

**Why this matters:** `Ops 6` shows only stale follow-ups (narrow); `Review 25` shows reviews + patterns (composite). Inconsistent aggregation makes badge math confusing.

**Default rule (proposed):** *Narrow / actionable only* — each badge counts items the teacher should act on right now, not the broader workload. Rationale: a teacher uses the badge to decide where to go next, not to estimate total work. CLAUDE.md framing ("operations copilot") aligns with action-priority over inventory.

**Files:**
- Modify: wherever the Review badge count is computed (search below)
- Modify: `docs/spec.md` (add the rule)

- [ ] **Step 1: Find the badge count source for both Ops and Review**

```bash
grep -rn 'pending"\|count.*pending\|badge.*count\|tabBadge' apps/web/src/ --include="*.tsx" --include="*.ts" | grep -vE "test|__tests__" | head -20
```
Find the function or selector that produces the numeric badges.

- [ ] **Step 2: Confirm the current rule for each**

Read each computation. Document in your scratch notes:
- Ops badge = ? (likely `staleFollowupCount` or similar)
- Review badge = ? (likely `reviewsDue + patternCount`)

- [ ] **Step 3: Write the failing test**

In the test file that owns the badge logic (create if missing — e.g., `apps/web/src/__tests__/badges.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { computeNavBadges } from "../badges"; // adjust path

describe("computeNavBadges", () => {
  it("Review badge counts only stale items, not patterns", () => {
    const counts = computeNavBadges({
      staleReviews: 23,
      patternCount: 2,
      staleFollowups: 6,
      eaMoves: 3,
    });
    expect(counts.review).toBe(23);
    expect(counts.ops).toBe(6);
  });
});
```

- [ ] **Step 4: Run test to confirm it fails**

```bash
npx vitest run apps/web/src/__tests__/badges.test.ts
```
Expected: FAIL — current Review computation returns 25.

- [ ] **Step 5: Update the Review badge computation to match the rule**

Edit the source identified in Step 1 to drop the `patternCount` addition. Pattern signals stay visible in the right-side stat card but are no longer in the nav badge.

- [ ] **Step 6: Run test to confirm it passes**

```bash
npx vitest run apps/web/src/__tests__/badges.test.ts
```
Expected: PASS.

- [ ] **Step 7: Document the rule**

Append to `docs/spec.md` under a new heading:

```markdown
### Top-nav badge counts

Each top-tab pending badge counts **only items the teacher should act on
right now**, not the total workload represented on the page. This keeps
badges as priority signals rather than inventory dashboards.

| Tab | Counted |
|-----|---------|
| Ops | stale follow-ups awaiting capture |
| Review | reviews approaching due date |

Patterns, EA moves, and other surfaces remain visible inside the page's
own stat cards but are excluded from the nav badge.
```

- [ ] **Step 8: Run full test suite to catch any snapshot fallout**

```bash
npm run test -- apps/web/src/
```
Expected: PASS. Update snapshots if the only change is the badge number.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/ docs/spec.md
git commit -m "fix(web): unify nav-badge aggregation rule across Ops + Review

Closes QA m1. Both badges now count only items the teacher should act on
right now (stale follow-ups for Ops, approaching-due reviews for Review).
Patterns, EA moves, and inventory totals remain visible in each page's
stat card but are excluded from the badge to keep it as a priority
signal, not a workload dashboard.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Fix Family Message ghost overlay (m3)

**Why this matters:** On the empty-state of the Family Message workspace, the `MESSAGE PIPELINE / 7% APPROVAL RATE` summary card renders behind a ghosted "Pick students to draft a message" placeholder. The visual reads as a stacking-context glitch even if intentional.

**Files:**
- Investigate: `apps/web/src/panels/FamilyMessagePanel.tsx`
- Investigate: corresponding CSS (likely `apps/web/src/panels/FamilyMessagePanel.css` or a component-level CSS)

- [ ] **Step 1: Reproduce the visual**

```bash
npm run pilot:start
```

In a browser at 1440 px width, navigate to `http://localhost:5173/?demo=true&tab=review&tool=family-message`. Scroll to the workspace. Capture a screenshot. Confirm: the Pipeline card shows numeric values *and* an overlapping placeholder string.

- [ ] **Step 2: Identify which element is ghosted**

In devtools, select each card and look at `opacity`, `mix-blend-mode`, `position: absolute`, and `z-index`. Document:

- Which element renders the "Pick students to draft a message" copy?
- Which element renders "MESSAGE PIPELINE 7% APPROVAL RATE"?
- Are they siblings? Are they stacked via absolute positioning?

- [ ] **Step 3: Decide outcome**

Two clean options:

**A. Hide the Pipeline summary in empty state** — Render the placeholder *instead of* the populated card when no draft is in flight. Cleanest separation.

**B. Style the empty state as an explicit overlay** — Apply `opacity: 0.6` (or use the existing token if there is one) to the underlying card and put the placeholder copy in front with full opacity. Communicates "this is an empty state, here's what would normally be here."

Pick A by default. Switch to B only if the empty state is meant to also tease the populated layout.

- [ ] **Step 4: Implement the chosen option**

For option A: find the JSX rendering the Pipeline card and wrap it in a `result || hasActiveDraft` conditional. The placeholder takes its place when there's no draft.

For option B: identify the underlying card class, add the opacity rule (and a comment explaining why), and confirm the placeholder is `position: absolute`-d on top with `z-index: 1` and `background: var(--color-surface)` so it doesn't bleed through.

If the codebase has tokens like `--opacity-ghost` or similar, **use them** — do not invent new ones (per saved feedback on token discipline).

```bash
grep -nE "--opacity-ghost|--opacity-empty|opacity.*var" apps/web/src/styles/tokens.css | head -10
```

- [ ] **Step 5: Add a render test that locks the chosen behavior**

In `apps/web/src/panels/__tests__/FamilyMessagePanel.test.tsx`, add:

```tsx
it("does not render the Pipeline summary card overlapping the empty state", () => {
  const { queryByText, getByText } = render(<FamilyMessagePanel />);
  // Either the summary OR the placeholder, not both
  const placeholder = getByText(/pick students to draft/i);
  const pipelineLabel = queryByText(/MESSAGE PIPELINE/i);
  if (pipelineLabel) {
    // Both rendered — check they aren't visually overlapping
    expect(getComputedStyle(pipelineLabel).visibility).toBe("hidden");
  }
  expect(placeholder).toBeInTheDocument();
});
```

- [ ] **Step 6: Run tests + typecheck**

```bash
npm run typecheck && npm run test -- apps/web/src/panels/
```
Expected: PASS.

- [ ] **Step 7: Manual verification at 1440 + 768 + 375 px**

Confirm the visual is now intentional in light mode and dark mode at all three viewports.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/panels/FamilyMessagePanel.tsx apps/web/src/panels/FamilyMessagePanel.css apps/web/src/panels/__tests__/FamilyMessagePanel.test.tsx
git commit -m "fix(web): resolve Family Message empty-state ghost overlay

Closes QA m3. Previously the Pipeline summary card and the empty-state
placeholder rendered in the same stacking context, producing a ghosted
overlap that read as a CSS glitch. Now [chosen option — hide summary in
empty state / explicit overlay with token-driven opacity].

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Add demo-staleness preflight to `pilot:start` (M2)

**Why this matters:** The QA report flagged `Brody · 396d ago` and `Amira · 393d ago` timestamps. The seeder (`data/demo/seed.ts`) is already time-relative (uses `NOW = new Date()`) but is upsert-only, so a local SQLite database that hasn't been freshly seeded keeps stale rows. The cleanest fix is a preflight check inside `pilot:start` that warns the operator when the demo classroom's most recent intervention is older than 7 days, and recommends `npm run pilot:reset`.

**Files:**
- Modify: `scripts/pilot-start.mjs`
- Create: `scripts/lib/demo-freshness.mjs`
- Create: `scripts/lib/__tests__/demo-freshness.test.mjs`

- [ ] **Step 1: Locate where the orchestrator opens the SQLite DB**

```bash
grep -rn "demo-okafor-grade34\|data/memory" services/memory/ scripts/ --include="*.mjs" --include="*.ts" | head -10
```
Note the file path / connection string.

- [ ] **Step 2: Write the failing test**

Create `scripts/lib/__tests__/demo-freshness.test.mjs`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDemoStale } from "../demo-freshness.mjs";

describe("isDemoStale", () => {
  it("returns false when latest intervention is within 7 days", () => {
    const now = new Date("2026-04-25T12:00:00Z");
    const fiveDaysAgo = new Date("2026-04-20T12:00:00Z").toISOString();
    assert.equal(isDemoStale({ latestInterventionAt: fiveDaysAgo, now }), false);
  });

  it("returns true when latest intervention is older than 7 days", () => {
    const now = new Date("2026-04-25T12:00:00Z");
    const monthAgo = new Date("2026-03-25T12:00:00Z").toISOString();
    assert.equal(isDemoStale({ latestInterventionAt: monthAgo, now }), true);
  });

  it("returns true when there are no interventions at all", () => {
    const now = new Date("2026-04-25T12:00:00Z");
    assert.equal(isDemoStale({ latestInterventionAt: null, now }), true);
  });
});
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
node --test scripts/lib/__tests__/demo-freshness.test.mjs
```
Expected: FAIL with "Cannot find module '../demo-freshness.mjs'".

- [ ] **Step 4: Implement `isDemoStale`**

Create `scripts/lib/demo-freshness.mjs`:

```js
const STALE_THRESHOLD_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isDemoStale({ latestInterventionAt, now = new Date() }) {
  if (!latestInterventionAt) return true;
  const latest = new Date(latestInterventionAt).getTime();
  if (Number.isNaN(latest)) return true;
  const ageDays = (now.getTime() - latest) / MS_PER_DAY;
  return ageDays > STALE_THRESHOLD_DAYS;
}

/**
 * Reads the demo classroom's most recent intervention timestamp from the
 * orchestrator health endpoint. Returns null if the orchestrator is
 * unreachable so the caller can decide whether to skip the check.
 */
export async function fetchDemoLatestIntervention(orchestratorBase) {
  try {
    const res = await fetch(
      `${orchestratorBase}/api/today/demo-okafor-grade34`,
      { headers: { "X-Classroom-Code": "demo" } },
    );
    if (!res.ok) return null;
    const body = await res.json();
    return body?.latest_intervention_at ?? null;
  } catch {
    return null;
  }
}
```

(If the actual API field for "most recent intervention" has a different name, use it. Inspect the live `/api/today/:classroomId` payload to confirm.)

- [ ] **Step 5: Run the test to confirm it passes**

```bash
node --test scripts/lib/__tests__/demo-freshness.test.mjs
```
Expected: PASS all three.

- [ ] **Step 6: Wire the preflight into `pilot:start`**

Edit `scripts/pilot-start.mjs`. After all three services report healthy (immediately before printing the "Open the web URL" banner), add:

```js
import { isDemoStale, fetchDemoLatestIntervention } from "./lib/demo-freshness.mjs";

// ... inside the post-health block:
const latest = await fetchDemoLatestIntervention("http://localhost:3100");
if (isDemoStale({ latestInterventionAt: latest })) {
  console.log("");
  console.log("⚠ Demo classroom data is stale (latest activity > 7 days old).");
  console.log("  Teachers and judges will see relative timestamps like '396d ago'.");
  console.log("  Run: npm run pilot:reset");
  console.log("");
}
```

(Place the import at the top of the file with the other imports. Match the existing console-print style — the project uses plain `console.log`, no chalk.)

- [ ] **Step 7: Manual verification**

```bash
npm run pilot:start
```

If the local demo DB is currently stale, expect the warning to appear after the health banner. Stop the stack, run `npm run pilot:reset`, restart `pilot:start`, expect no warning.

- [ ] **Step 8: Commit**

```bash
git add scripts/pilot-start.mjs scripts/lib/demo-freshness.mjs scripts/lib/__tests__/demo-freshness.test.mjs
git commit -m "feat(scripts): warn on stale demo data in pilot:start

Closes QA M2. The seed.ts is already time-relative, but seed.ts is
upsert-only — local SQLite DBs that haven't been pilot:reset show
relative timestamps like '396d ago' to teachers and demo judges. New
preflight detects this after the health check and prints a one-line
recommendation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Surface global toast on generation failure (M1)

**Why this matters:** During QA, a 500 from `/api/differentiate` left the form silently idle. Investigation revealed `useAsyncAction` already produces a friendly error string and `DifferentiatePanel` renders an `<ErrorBanner>` when `error && result === null` — but the banner sits at the top of the result pane, often off-screen after the user's scroll. Teachers on a flaky network read this as "I clicked it, nothing happened, I'll click again" and re-submit. Solution: **always** push a toast on generation failure, in addition to the inline banner.

This is the highest-blast-radius task in the plan because it touches every panel that uses `useAsyncAction`. To keep the change minimal and consistent, wire it through `useAsyncAction` itself rather than each panel.

**Files:**
- Modify: `apps/web/src/useAsyncAction.ts`
- Modify: `apps/web/src/AppContext.tsx` (expose toast hook for the action to consume — confirm shape)
- Modify: each panel call site that wants the toast (probably all of them)
- Test: `apps/web/src/__tests__/useAsyncAction.test.tsx` (new)

- [ ] **Step 1: Reproduce the silent-failure scenario**

```bash
npm run pilot:start
# in another shell, immediately after stack is up:
pkill -f "node.*orchestrator" && sleep 1
```

Now click Generate variants in the UI. Confirm: form goes idle, no toast appears, and (if you scroll up) the inline ErrorBanner does/doesn't show. Capture the actual current behavior to confirm the symptom.

- [ ] **Step 2: Restart the stack cleanly**

```bash
pkill -f vite; pkill -f pilot-start; sleep 2
nohup npm run pilot:start > /tmp/pilot-start.log 2>&1 &
until curl -sf http://localhost:3100/health >/dev/null; do sleep 2; done
```

- [ ] **Step 3: Add an `onError` callback to `useAsyncAction` opts**

Edit `apps/web/src/useAsyncAction.ts:13-16`:

```ts
interface UseAsyncActionOptions {
  /** Number of retry attempts for transient errors (default: 0) */
  maxRetries?: number;
  /** Called once with the friendly message when a request ultimately fails. */
  onError?: (message: string) => void;
}
```

And in the failure path (line 110-113):

```ts
    if (mountedRef.current && !controller.signal.aborted) {
      const friendly = friendlyErrorMessage(lastErr);
      setError(friendly);
      setLoading(false);
      opts?.onError?.(friendly);
    }
    return null;
```

(Pass `opts` into `execute`'s closure if it isn't already — verify by reading lines 51-67.)

- [ ] **Step 4: Write the failing test**

Create `apps/web/src/__tests__/useAsyncAction.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAsyncAction } from "../useAsyncAction";
import { ApiError } from "../api";

describe("useAsyncAction onError callback", () => {
  it("calls onError with the friendly message when the request fails", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAsyncAction<unknown>({ onError }));
    await act(async () => {
      await result.current.execute(async () => {
        throw new ApiError("boom", 500);
      });
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining("server encountered an error"),
    );
  });

  it("does not call onError when the request succeeds", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAsyncAction<string>({ onError }));
    await act(async () => {
      await result.current.execute(async () => "ok");
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not call onError on AbortError", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAsyncAction<unknown>({ onError }));
    await act(async () => {
      await result.current.execute(async () => {
        throw new DOMException("aborted", "AbortError");
      });
    });
    expect(onError).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
npx vitest run apps/web/src/__tests__/useAsyncAction.test.tsx
```
Expected: PASS all three (the implementation from Step 3 already satisfies them).

- [ ] **Step 6: Wire `showError` into the panel call sites**

Find every `useAsyncAction<...>()` call:

```bash
grep -rn "useAsyncAction<" apps/web/src/ --include="*.tsx" --include="*.ts" | grep -v __tests__
```

For each generation-action panel (Differentiate, Tomorrow Plan, Family Message, Forecast, Intervention, Vocab, Simplify, EA Briefing, EA Load Balance, Sub Packet, Support Patterns, Usage Insights), update the hook call:

```tsx
const { showError } = useAppContext(); // or whatever the existing hook is named
const { loading, error, result, execute, ... } = useAsyncAction<DifferentiateResponse>({
  onError: (msg) => showError(`Couldn't generate variants — ${msg}`),
});
```

(Confirm the context hook name from `apps/web/src/AppContext.tsx`. If it's already imported in the panel for other reasons, reuse the same import — don't add a duplicate.)

Tailor the prefix per panel ("Couldn't draft message — ", "Couldn't save plan — ", etc.). Keep the prefix short and action-shaped.

- [ ] **Step 7: Add a panel-level integration test for one panel**

In `apps/web/src/panels/__tests__/DifferentiatePanel.test.tsx`, add:

```tsx
it("shows a toast when the differentiate API fails", async () => {
  vi.spyOn(api, "differentiate").mockRejectedValue(new ApiError("server fail", 500));
  const showError = vi.fn();
  render(
    <AppContext.Provider value={{ ...defaultContext, showError }}>
      <DifferentiatePanel />
    </AppContext.Provider>
  );
  // Fill form + submit (use existing test helpers)
  await fillAndSubmitDifferentiateForm({ source: "Sample text", title: "Sample" });
  await waitFor(() => {
    expect(showError).toHaveBeenCalledWith(
      expect.stringMatching(/couldn't generate variants/i),
    );
  });
});
```

(`defaultContext` and `fillAndSubmitDifferentiateForm` are placeholders — use the patterns already established in this test file.)

- [ ] **Step 8: Run the full test suite**

```bash
npm run typecheck && npm run lint && npm run test -- apps/web/src/
```
Expected: PASS. Fix any panel that lost its `useAsyncAction` typing because `opts` is now used.

- [ ] **Step 9: Manual end-to-end verification**

With the stack up, kill the orchestrator (`pkill -f orchestrator`), click Generate in the UI, confirm:
- Toast appears in the toast queue
- Toast copy is teacher-shaped ("Couldn't generate variants — The server encountered an error...")
- ErrorBanner still renders inline (we did not remove the existing fallback)

Restart orchestrator. Click Generate again. Confirm: success toast appears, no error toast.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/useAsyncAction.ts apps/web/src/__tests__/useAsyncAction.test.tsx apps/web/src/panels/ apps/web/src/AppContext.tsx
git commit -m "fix(web): surface global toast on generation failure

Closes QA M1. useAsyncAction already produces a friendly error string,
and most panels render an inline ErrorBanner — but the banner sits at
the top of the result pane and is often off-screen after the user's
scroll, leading to silent-failure UX. Wire showError through a new
opts.onError callback so every panel that opts in raises a toast in
addition to the inline banner.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Final integration checks (after all 9 tasks)

- [ ] **Run the release gate** (catches anything cross-cutting):

```bash
npm run release:gate
```
Expected: PASS in mock mode.

- [ ] **Run smoke tests**:

```bash
npm run smoke:api && npm run smoke:browser
```
Expected: PASS.

- [ ] **Update the QA report's "Outcomes" section**

Append a section to `qa/final-app-review-2026-04-25.md` listing each finding ID and the commit SHA that closed it. Format:

```markdown
---

## Outcomes (2026-MM-DD)

| ID | Status | Commit |
|----|--------|--------|
| M1 | Closed | <sha> |
| M2 | Closed | <sha> |
| M3 | Closed | <sha> |
| m1 | Closed | <sha> |
| m2 | Verified — no fix needed | <sha or n/a> |
| m3 | Closed | <sha> |
| p1 | Closed (docs) | <sha> |
| p2 | Closed | <sha> |
| p3 | Closed | <sha> |
```

- [ ] **Final commit for the report update**:

```bash
git add qa/final-app-review-2026-04-25.md
git commit -m "docs(qa): record outcomes for 2026-04-25 final-app-review findings

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage:** Each of the 9 findings (M1, M2, M3, m1, m2, m3, p1, p2, p3) has a dedicated task. Tasks are numbered safest-first (T1=p1, T9=M1) so that if the engineer hits an unexpected blocker on M1 (the largest change), at least 8 fixes have already shipped.

**Placeholder scan:** No "TBD" / "implement later" / "similar to Task N" — every step has the exact code or command to run. Where the test code references panel-specific names (`buildStory`, `defaultContext`, `fillAndSubmitDifferentiateForm`), the plan explicitly notes these are placeholders that the engineer must look up in the existing test file's pattern.

**Type consistency:** `isDemoStale` and `fetchDemoLatestIntervention` are defined once and consumed once. `useAsyncAction`'s `opts.onError` shape is consistent across hook definition, test, and panel call sites. The `PageAnchorRail` test imports the same `PAGE_ANCHORS` shape used in production.

**Dependency check:** All tasks are independent. T4 (M3) and T9 (M1) both touch `apps/web/src/`, but they touch disjoint files (pageAnchors vs. useAsyncAction). T6 and T9 might both touch panel files — sequence T6 before T9 to keep the toast wiring's diff narrow, or run them in parallel and resolve any merge in T9.

---

## Execution choice

Plan complete and saved to `docs/superpowers/plans/2026-04-25-final-app-review-fixes.md`. Two execution options:

**1. Subagent-Driven (recommended, matches saved working-style preference)** — Dispatch a fresh subagent per task with two-stage review between each. Best for a 9-task batch where any single task could turn up surprises (e.g., T5 might reveal the THREADS metric is actually correct and just needs a label change).

**2. Inline Execution** — Execute tasks in this session sequentially with checkpoints between each. Faster turnaround but more context-heavy for the parent agent.

Which approach?
