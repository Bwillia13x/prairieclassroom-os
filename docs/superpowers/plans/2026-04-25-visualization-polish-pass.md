# Visualization Polish Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** This plan assumes the Cohort Sparkline Grid plan (`2026-04-25-cohort-sparkline-grid.md`) has been merged. If it hasn't, the polish pass still applies — just exclude `CohortSparklineGrid` from the inventory in Task 1.

**Goal:** Audit and remediate the existing visualization layer (28 components after Cohort Grid lands) across six dimensions — token consistency, accessibility, reduced-motion, dark-mode contrast, mobile reflow, and test coverage — so the system is pilot-ready and award-submission-ready before any further visualization additions.

**Architecture:** Six independent audit dimensions, each structured as discover → remediate → verify. Audits are scripted where possible (grep, axe-core, vitest) and human-checked otherwise (visual contrast review, mobile reflow). Output is a single `output/viz-polish-report.md` plus per-dimension fixes committed in topic branches.

**Tech Stack:** Vitest + Testing Library + jest-axe (to be added), Playwright or Puppeteer for visual smoke (already present), `npm run check:contrast` (already wired), shell tools (grep, awk).

**Why this scope:** The 23 visualizations in `DataVisualizations.tsx` were built incrementally over multiple sprints. Each is correct in isolation, but the layer as a whole has not had a horizontal pass. Memory `feedback_design_tokens.md` flags invented tokens silently failing; `feedback_smoke_selectors.md` flags button-label drift in the smoke harness. Both are recurring failure modes that a polish pass will close.

**Out of scope:** Any new visualization, any change to data shape, any redesign of an existing chart. This is purely a horizontal-quality pass.

---

## Visualization Inventory (28 components)

**`apps/web/src/components/DataVisualizations.tsx` — 23 components:**
StudentPriorityMatrix, StudentThemeHeatmap, ComplexityHeatmap, ComplexityDebtGauge, ReadabilityComparisonGauge, ClassroomCompositionRings, InterventionRecencyTimeline, InterventionTimeline, ComplexityTrendCalendar, PlanStreakCalendar, EALoadStackedBars, ScheduleLoadStrip, VariantSummaryStrip, WorkflowFlowStrip, MessageApprovalFunnel, SupportPatternRadar, PlanCoverageRadar, StudentSparkIndicator, DebtTrendSparkline, FollowUpDecayIndicators, ScaffoldEffectivenessChart, FollowUpSuccessRate, (one more if my count is off — verify in Task 1).

**`apps/web/src/components/shared/DataViz.tsx` — 4 primitives:**
Sparkline, TrendIndicator, HealthDot, ProgressBar

**Stand-alone:**
- `apps/web/src/components/Sparkline.tsx` — tone-based variant
- `apps/web/src/components/ForecastTimeline.tsx`
- `apps/web/src/components/CohortSparklineGrid.tsx` (added by previous plan)

**Total: 29 if you include the new grid; the title's "27" was rounded — verify exact count in Task 1.**

---

## File Structure

**Files to create:**
- `output/viz-polish-report.md` — running audit log, one section per dimension (this file is the artifact, not a doc)
- `apps/web/src/test-utils/axe-helpers.ts` — shared jest-axe setup for accessibility tests

**Files to modify (by dimension; specific list discovered in Task 1):**
- All viz component CSS files (token consistency)
- All viz component .tsx files (a11y, reduced-motion)
- All viz component __tests__ files (coverage)
- `package.json` (add jest-axe dep, polish-audit script)

---

## Phase 0 — Inventory and report scaffold

### Task 1: Build the authoritative inventory

**Files:**
- Create: `output/viz-polish-report.md`

- [ ] **Step 1: Enumerate every visualization component**

Run:
```bash
grep -nE "^export (default )?function [A-Z]" apps/web/src/components/DataVisualizations.tsx
grep -nE "^export function [A-Z]" apps/web/src/components/shared/DataViz.tsx
ls apps/web/src/components/Sparkline.tsx apps/web/src/components/ForecastTimeline.tsx apps/web/src/components/CohortSparklineGrid.tsx 2>/dev/null
```

- [ ] **Step 2: Write the report scaffold**

Create `output/viz-polish-report.md`:

```markdown
# Visualization Polish Pass — Audit Report

Generated: 2026-04-25 (update on each pass)

## Inventory
<!-- paste the output of Task 1 Step 1 here -->

## Dimension 1: Token Consistency
<!-- filled by Task 2 -->

## Dimension 2: Accessibility
<!-- filled by Task 4 -->

## Dimension 3: Reduced Motion
<!-- filled by Task 6 -->

## Dimension 4: Dark Mode Contrast
<!-- filled by Task 8 -->

## Dimension 5: Mobile Reflow
<!-- filled by Task 10 -->

## Dimension 6: Test Coverage
<!-- filled by Task 12 -->

## Summary
<!-- final pass summary -->
```

- [ ] **Step 3: Commit**

```bash
git add output/viz-polish-report.md
git commit -m "chore(viz): scaffold polish-pass audit report"
```

---

## Phase 1 — Token Consistency

**Why this dimension first:** invented tokens silently fail at runtime — the failure mode is "the chart renders but the line/fill is invisible in dark mode" or "the spacing collapses to zero." This is the highest-impact, lowest-effort fix.

### Task 2: Discover token violations

**Files:**
- Modify: `output/viz-polish-report.md`

- [ ] **Step 1: Extract every token used by viz CSS**

Run:
```bash
grep -roE "var\(--[a-z0-9-]+" \
  apps/web/src/components/DataVisualizations.css \
  apps/web/src/components/shared/DataViz.css \
  apps/web/src/components/Sparkline*.css \
  apps/web/src/components/ForecastTimeline.css \
  apps/web/src/components/CohortSparklineGrid.css \
  2>/dev/null \
  | sed 's/.*var(\(--[a-z0-9-]*\).*/\1/' \
  | sort -u > /tmp/viz-tokens-used.txt

cat /tmp/viz-tokens-used.txt
```

- [ ] **Step 2: Extract every token defined**

Run:
```bash
grep -oE "^\s*--[a-z0-9-]+" apps/web/src/styles/tokens.css \
  | sed 's/^\s*//' \
  | sort -u > /tmp/viz-tokens-defined.txt
```

- [ ] **Step 3: Diff used vs defined**

Run:
```bash
comm -23 /tmp/viz-tokens-used.txt /tmp/viz-tokens-defined.txt
```

Each line in the output is a token used by viz CSS but not defined in `tokens.css`. These are the violations. Common false positives to ignore: tokens defined in component-local CSS files via `:root` overrides — verify by grepping the union of CSS files for the token name first.

- [ ] **Step 4: Also check inline `style=` props in TSX**

Run:
```bash
grep -rnE "style=\{[^}]*var\(--" apps/web/src/components/DataVisualizations.tsx apps/web/src/components/Sparkline.tsx apps/web/src/components/ForecastTimeline.tsx
grep -rnE "stroke=\"var\(--|fill=\"var\(--" apps/web/src/components/DataVisualizations.tsx apps/web/src/components/Sparkline.tsx apps/web/src/components/ForecastTimeline.tsx
```

Compile the list of TSX-side token uses and check each against tokens.css.

- [ ] **Step 5: Append findings to the report**

Edit `output/viz-polish-report.md` Dimension 1 section, listing each invented token with: token name, file:line where used, suggested replacement. If the diff is empty, write "PASS — no invented tokens detected" under that section.

- [ ] **Step 6: Commit**

```bash
git add output/viz-polish-report.md
git commit -m "chore(viz): document token-consistency audit findings"
```

---

### Task 3: Remediate token violations

**Files:**
- Modify: each file flagged in the Task 2 report

- [ ] **Step 1: For each violation, choose a replacement**

For each invented token found in Task 2, apply ONE of:
1. Replace with the closest existing token (e.g. `--color-border-subtle` → `--color-border` if the latter exists with comparable visual weight).
2. Add the missing token to `tokens.css` if it represents a real new design need (must be approved by the design system — flag any of these instead of adding silently).
3. Replace with a literal value sourced from the tokens.css palette comment.

- [ ] **Step 2: Apply each replacement**

For each violation in the report, edit the offending file with the chosen replacement. Show the diff in the report.

- [ ] **Step 3: Re-run the diff to confirm zero violations**

Run the same diff from Task 2 Step 3. Expected: empty.

- [ ] **Step 4: Run web tests**

Run: `npm run test -- apps/web/src/components`
Expected: PASS (token rename should not affect tests; if it does, the tests were asserting on visual classes which is brittle).

- [ ] **Step 5: Run contrast check if relevant**

Run: `npm run check:contrast`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components apps/web/src/styles output/viz-polish-report.md
git commit -m "fix(viz): replace invented tokens with canonical token references"
```

---

## Phase 2 — Accessibility

### Task 4: Add jest-axe and run accessibility audit per component

**Files:**
- Modify: `apps/web/package.json` (add jest-axe dep)
- Create: `apps/web/src/test-utils/axe-helpers.ts`
- Modify: `output/viz-polish-report.md`

- [ ] **Step 1: Install jest-axe**

Run: `npm install --save-dev jest-axe @types/jest-axe --workspace=apps/web`
Expected: lockfile updated, no peer-dep errors.

- [ ] **Step 2: Create the axe helper**

Create `apps/web/src/test-utils/axe-helpers.ts`:

```typescript
import { axe, toHaveNoViolations } from "jest-axe";
import { expect } from "vitest";

expect.extend(toHaveNoViolations);

export async function expectNoAxeViolations(container: HTMLElement) {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}
```

- [ ] **Step 3: Write a single audit test that covers every viz**

Create `apps/web/src/components/__tests__/viz-accessibility.test.tsx`:

```tsx
import { describe, it } from "vitest";
import { render } from "@testing-library/react";
import { expectNoAxeViolations } from "../../test-utils/axe-helpers";
import {
  StudentPriorityMatrix,
  StudentThemeHeatmap,
  ComplexityHeatmap,
  ComplexityDebtGauge,
  ReadabilityComparisonGauge,
  ClassroomCompositionRings,
  InterventionRecencyTimeline,
  InterventionTimeline,
  ComplexityTrendCalendar,
  PlanStreakCalendar,
  EALoadStackedBars,
  ScheduleLoadStrip,
  VariantSummaryStrip,
  WorkflowFlowStrip,
  MessageApprovalFunnel,
  SupportPatternRadar,
  PlanCoverageRadar,
  StudentSparkIndicator,
  DebtTrendSparkline,
  FollowUpDecayIndicators,
  ScaffoldEffectivenessChart,
  FollowUpSuccessRate,
} from "../DataVisualizations";
import { Sparkline as SharedSparkline, TrendIndicator, HealthDot, ProgressBar } from "../shared/DataViz";
import ToneSparkline from "../Sparkline";
import CohortSparklineGrid from "../CohortSparklineGrid";

// Each test renders a component with minimum-viable props and asserts zero axe violations.
// Fixtures intentionally minimal — fuller fixture coverage stays in component-specific tests.

describe("viz accessibility — zero axe violations", () => {
  it("Sparkline (shared)", async () => {
    const { container } = render(<SharedSparkline data={[1, 2, 3]} label="Trend" />);
    await expectNoAxeViolations(container);
  });

  it("TrendIndicator", async () => {
    const { container } = render(<TrendIndicator value={5} direction="up" />);
    await expectNoAxeViolations(container);
  });

  it("HealthDot", async () => {
    const { container } = render(<HealthDot status="healthy" tooltip="Good" />);
    await expectNoAxeViolations(container);
  });

  it("ProgressBar", async () => {
    const { container } = render(<ProgressBar value={50} label="Done" />);
    await expectNoAxeViolations(container);
  });

  it("ToneSparkline", async () => {
    const { container } = render(<ToneSparkline data={[1, 2, 3, 4]} label="Stable" />);
    await expectNoAxeViolations(container);
  });

  it("CohortSparklineGrid", async () => {
    const { container } = render(
      <CohortSparklineGrid
        students={[
          {
            alias: "A1",
            pending_action_count: 0,
            last_intervention_days: null,
            active_pattern_count: 0,
            pending_message_count: 0,
            latest_priority_reason: null,
            intervention_history_14d: new Array(14).fill(0),
          },
        ]}
      />,
    );
    await expectNoAxeViolations(container);
  });

  // For each component below, supply minimum-viable props.
  // If a component requires complex props, add a per-component fixture file at
  // apps/web/src/__tests__/fixtures/viz/<name>.fixture.ts and import it here.

  // The implementation engineer fills these out by reading the component
  // signatures and supplying minimum fixtures. Each must remain a single
  // it() block calling expectNoAxeViolations.
});
```

NOTE: This test file is a scaffold. The implementation task is to fill out the remaining 23 it() blocks for the components in `DataVisualizations.tsx`, using fixtures that satisfy each component's prop requirements. Use the existing `panels/__tests__` files for fixture inspiration.

- [ ] **Step 4: Run the audit**

Run: `npm run test -- apps/web/src/components/__tests__/viz-accessibility.test.tsx`
Expected: Some failures. Each failure is a violation to fix in Task 5.

- [ ] **Step 5: Append findings to report**

Edit `output/viz-polish-report.md` Dimension 2 section, listing each component with violations, the rule violated (e.g. `image-alt`, `color-contrast`, `aria-required-children`), and a suggested fix.

- [ ] **Step 6: Commit (scaffold + initial findings)**

```bash
git add apps/web/package.json apps/web/src/test-utils apps/web/src/components/__tests__/viz-accessibility.test.tsx output/viz-polish-report.md
git commit -m "test(viz): add jest-axe accessibility audit scaffold + initial findings"
```

---

### Task 5: Remediate accessibility violations

**Files:**
- Modify: any viz component flagged in Task 4

- [ ] **Step 1: For each violation, apply the fix**

Common fixes by violation type:
- `image-alt`: add `role="img" aria-label="..."` to top-level `<svg>`
- `aria-hidden-focus`: ensure `aria-hidden="true"` is only on non-interactive children
- `color-contrast`: tracked in Dimension 4 (Task 8), defer here unless trivially fixed by token swap
- `aria-required-children`: add `<title>` or use `aria-labelledby`

- [ ] **Step 2: Re-run the audit**

Run: `npm run test -- apps/web/src/components/__tests__/viz-accessibility.test.tsx`
Expected: PASS — all components clean.

- [ ] **Step 3: Update report**

Mark Dimension 2 complete in `output/viz-polish-report.md`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components output/viz-polish-report.md
git commit -m "fix(viz): resolve jest-axe accessibility violations"
```

---

## Phase 3 — Reduced Motion

### Task 6: Audit for animations that ignore `prefers-reduced-motion`

**Files:**
- Modify: `output/viz-polish-report.md`

- [ ] **Step 1: Find all animations and transitions in viz CSS**

Run:
```bash
grep -nE "(animation:|@keyframes|transition:)" \
  apps/web/src/components/DataVisualizations.css \
  apps/web/src/components/shared/DataViz.css \
  apps/web/src/components/Sparkline*.css \
  apps/web/src/components/ForecastTimeline.css \
  apps/web/src/components/CohortSparklineGrid.css 2>/dev/null
```

- [ ] **Step 2: For each animation/transition, check the surrounding CSS for a reduced-motion guard**

The required pattern (per CLAUDE.md polish standards):

```css
@media (prefers-reduced-motion: reduce) {
  .my-class {
    animation: none;
    transition: none;
  }
}
```

Run:
```bash
grep -nl "prefers-reduced-motion" \
  apps/web/src/components/DataVisualizations.css \
  apps/web/src/components/shared/DataViz.css \
  apps/web/src/components/Sparkline*.css \
  apps/web/src/components/ForecastTimeline.css \
  apps/web/src/components/CohortSparklineGrid.css 2>/dev/null
```

For each file containing an `animation:` or `transition:` but NOT a `prefers-reduced-motion` guard, log it as a violation.

- [ ] **Step 3: Append findings to report**

Edit `output/viz-polish-report.md` Dimension 3.

- [ ] **Step 4: Commit**

```bash
git add output/viz-polish-report.md
git commit -m "chore(viz): document reduced-motion audit findings"
```

---

### Task 7: Add reduced-motion guards

**Files:**
- Modify: each CSS file flagged in Task 6

- [ ] **Step 1: For each flagged file, append a reduced-motion guard**

At the bottom of each CSS file:

```css
@media (prefers-reduced-motion: reduce) {
  /* List the selectors flagged in Task 6 for this file */
  .selector-with-animation,
  .selector-with-transition {
    animation: none !important;
    transition: none !important;
  }
}
```

(`!important` is justified here because user-agent preference must win over component default.)

- [ ] **Step 2: Manual smoke test in browser**

In Chrome DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`. Reload the Classroom page. Confirm all viz animations stop.

- [ ] **Step 3: Update report**

Mark Dimension 3 complete.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components output/viz-polish-report.md
git commit -m "fix(viz): add prefers-reduced-motion guards to animated visualizations"
```

---

## Phase 4 — Dark Mode Contrast

### Task 8: Audit contrast across themes

**Files:**
- Modify: `output/viz-polish-report.md`

- [ ] **Step 1: Run the existing contrast checker**

Run: `npm run check:contrast`
Expected: produces a contrast report.

- [ ] **Step 2: Filter for viz-related failures**

The contrast report likely covers global tokens. Filter (or manually scan) for stroke/fill colors used in viz components. Common viz contrast risks:
- `--color-text-tertiary` for baselines (may fail in dark mode if too faint)
- `--color-section-*` strokes on dark surfaces
- Heatmap cell backgrounds against the canvas

- [ ] **Step 3: Visual smoke in both themes**

Boot dev server (`npm run dev`), open Classroom page, toggle dark mode. Eye-test each visualization for:
- Lines visible against background
- Text labels readable
- Cell colors distinguishable from each other

Capture a 1440px screenshot of each page in each theme. Save to `output/viz-polish-screenshots/`.

- [ ] **Step 4: Append findings to report**

Edit `output/viz-polish-report.md` Dimension 4 with: component, color used, theme it fails in, suggested replacement.

- [ ] **Step 5: Commit**

```bash
git add output/viz-polish-report.md output/viz-polish-screenshots
git commit -m "chore(viz): document dark-mode contrast audit findings"
```

---

### Task 9: Remediate contrast issues

**Files:**
- Modify: any flagged viz CSS or `tokens.css`

- [ ] **Step 1: For each contrast violation, swap to a higher-contrast token or adjust opacity**

Common remediation pattern:
- Replace `--color-text-tertiary` with `--color-text-secondary` for baselines
- Increase `strokeOpacity` from 0.45 to 0.6 in dark mode
- Use `light-dark()` value pairs where the same token can't satisfy both themes

- [ ] **Step 2: Re-run contrast check**

Run: `npm run check:contrast`
Expected: PASS, or only warnings outside viz scope.

- [ ] **Step 3: Re-screenshot both themes**

Compare against the Task 8 screenshots — every previously-failing viz should now read clearly.

- [ ] **Step 4: Update report**

Mark Dimension 4 complete.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components apps/web/src/styles output/viz-polish-report.md output/viz-polish-screenshots
git commit -m "fix(viz): improve dark-mode contrast for visualizations"
```

---

## Phase 5 — Mobile Reflow

### Task 10: Audit responsive behavior

**Files:**
- Modify: `output/viz-polish-report.md`

- [ ] **Step 1: Identify viz with fixed widths**

Run:
```bash
grep -nE "width:\s*[0-9]+px|width=\"[0-9]+\"" \
  apps/web/src/components/DataVisualizations.css \
  apps/web/src/components/DataVisualizations.tsx \
  apps/web/src/components/shared/DataViz.css \
  apps/web/src/components/shared/DataViz.tsx \
  apps/web/src/components/Sparkline*.tsx \
  apps/web/src/components/Sparkline*.css \
  apps/web/src/components/ForecastTimeline.tsx \
  apps/web/src/components/ForecastTimeline.css 2>/dev/null
```

Flag any pixel-width that exceeds 320px (the smallest viewport breakpoint we support, per `viewport-375-classroom.png` in repo root).

- [ ] **Step 2: Test each viz at three viewports**

In browser DevTools, resize to 375px, 768px, 1440px. For each viz on each page, note:
- Does it overflow horizontally? (causes horizontal scroll on the page — bad)
- Does it shrink to unreadable size? (text < 10px or chart < 60px tall)
- Does it stack/wrap appropriately?

- [ ] **Step 3: Append findings to report**

Edit `output/viz-polish-report.md` Dimension 5 with: component, viewport that fails, failure mode (overflow / unreadable / no-reflow), suggested fix.

- [ ] **Step 4: Commit**

```bash
git add output/viz-polish-report.md
git commit -m "chore(viz): document mobile reflow audit findings"
```

---

### Task 11: Remediate mobile reflow issues

**Files:**
- Modify: any flagged viz CSS or TSX

- [ ] **Step 1: Apply standard remediation patterns**

For each violation:
- Fixed pixel widths in SVG → add `style={{ width: "100%" }}` and rely on `viewBox` for scaling
- Fixed `height: Npx` in CSS → add `max-width: 100%; height: auto;`
- Container flex with no wrap → add a 600px breakpoint that switches to column layout

Pattern for an SVG that needs to fluid-scale:
```tsx
<svg
  width="100%"               // not a fixed number
  height={CELL_H}
  viewBox={`0 0 ${CELL_W} ${CELL_H}`}
  preserveAspectRatio="none" // or "xMidYMid meet" depending on viz semantics
  ...
>
```

- [ ] **Step 2: Re-test the three viewports**

For each remediated component, re-check at 375 / 768 / 1440 px in DevTools.

- [ ] **Step 3: Update report**

Mark Dimension 5 complete.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components output/viz-polish-report.md
git commit -m "fix(viz): improve responsive reflow on mobile viewports"
```

---

## Phase 6 — Test Coverage

### Task 12: Audit test coverage per visualization

**Files:**
- Modify: `output/viz-polish-report.md`

- [ ] **Step 1: List visualization components and their test files**

Run:
```bash
ls apps/web/src/components/__tests__/ apps/web/src/components/shared/__tests__/ 2>/dev/null
```

For each of the 28 visualization components, check whether a corresponding `<Name>.test.tsx` or coverage in a shared test file exists.

- [ ] **Step 2: Define minimum coverage**

Each viz must have at least:
1. A render test with minimum-viable props (smoke)
2. An accessibility test (covered by Task 4's omnibus file)
3. An empty-state or null-data test (when applicable)
4. An interaction test (when the viz has `onClick` / `onSegmentClick` etc)

- [ ] **Step 3: Append findings to report**

Edit `output/viz-polish-report.md` Dimension 6 with a table: component | render-test | a11y-test | empty-state-test | interaction-test. Mark gaps.

- [ ] **Step 4: Commit**

```bash
git add output/viz-polish-report.md
git commit -m "chore(viz): document test coverage audit findings"
```

---

### Task 13: Add missing tests

**Files:**
- Create: per-component test files for any gap identified in Task 12

- [ ] **Step 1: For each gap, write the missing test**

Use the existing `shared/__tests__/DataViz.test.tsx` as a reference for shape. Each new test file should:
1. Import the component
2. Build a minimum-fixture helper similar to `makeStudent` in CohortSparklineGrid.test.tsx
3. Cover the four cases (render / a11y / empty / interaction)

For interaction tests, use `userEvent.setup()` and `await user.click(...)`.

- [ ] **Step 2: Run all viz tests**

Run: `npm run test -- apps/web/src/components`
Expected: PASS, with new test count visibly higher.

- [ ] **Step 3: Update report**

Mark Dimension 6 complete. Capture the final vitest count.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components output/viz-polish-report.md
git commit -m "test(viz): close test-coverage gaps across visualization layer"
```

---

## Phase 7 — Final validation

### Task 14: Full validation pass and report finalize

**Files:**
- Modify: `output/viz-polish-report.md`
- Modify (if needed): `CLAUDE.md`

- [ ] **Step 1: Run the full suite in parallel**

Independent commands:
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run check:contrast`

Expected: all PASS.

- [ ] **Step 2: Run release gate**

Run: `npm run release:gate`
Expected: PASS in mock mode.

- [ ] **Step 3: Run smoke browser**

Run: `npm run smoke`
Expected: PASS — visual rendering on all 7 pages.

- [ ] **Step 4: Finalize report**

Edit `output/viz-polish-report.md` Summary section. Include:
- Total invented tokens fixed
- Total a11y violations resolved
- Total animations guarded
- Total contrast issues remediated
- Total responsive issues fixed
- New test count delta

- [ ] **Step 5: Update CLAUDE.md current-state if relevant**

If the test count language in CLAUDE.md mentions a specific vitest baseline (e.g. "1,891 vitest"), update it to the new count.

- [ ] **Step 6: Final commit**

```bash
git add output/viz-polish-report.md CLAUDE.md
git commit -m "chore(viz): complete polish-pass — token, a11y, motion, contrast, reflow, coverage"
```

- [ ] **Step 7: Update memory if learnings emerged**

If the polish pass surfaced a recurring pattern worth remembering for future visualization work (e.g. "always include `prefers-reduced-motion` guard when adding `transition:` to viz CSS"), update the relevant feedback memory file in the user's auto-memory directory.

---

## Self-Review

**Spec coverage:**
- Token consistency → Phase 1
- Accessibility → Phase 2
- Reduced motion → Phase 3
- Dark mode contrast → Phase 4
- Mobile reflow → Phase 5
- Test coverage → Phase 6
- Final validation → Phase 7

**Placeholder scan:** Most tasks reference "for each component" or "for each violation" which is appropriate for an audit-driven plan — the discovery task surfaces the concrete list, the remediation task acts on it. Where this plan deviates from "complete code in every step" is intentional: a polish pass cannot enumerate fixes before discovery. The failure-mode I'm guarding against is "TBD" — every remediation has a concrete pattern shown in code. The implementation engineer applies the pattern N times, not improvises N times.

**Type consistency:** No new types introduced. The audit-helper file (`axe-helpers.ts`) has its full signature in Task 4 Step 2.

**Risk note:** The accessibility audit (Task 4) requires writing 23+ omnibus test cases with minimum fixtures. If a viz has complex prop requirements (e.g. `EALoadStackedBars` needs structured load data), the fixture work could grow. Budget ~3-4 hours for Task 4 specifically. If a fixture is genuinely infeasible without a richer test harness, document it as a Task 4-followup and skip it for now — partial coverage > no coverage.

**Sequencing note:** Phase 1 (token consistency) is highest-impact and lowest-effort — start there. Phase 4 (dark mode contrast) depends on Phase 1 being clean (token swaps move the contrast story). Phase 6 (test coverage) is the longest tail and can be parallelized with Phases 3-5 if multiple agents are running.

---

## Execution Handoff

Plan complete. Two execution options:

**1. Subagent-Driven (recommended for this audit)** — fresh subagent per dimension, review per dimension, fast iteration. The audit shape fits this model well: each dimension is a discover-then-remediate pair, naturally checkpoint-able.

**2. Inline Execution** — use superpowers:executing-plans, batch execution with checkpoints between phases.

Which approach?
