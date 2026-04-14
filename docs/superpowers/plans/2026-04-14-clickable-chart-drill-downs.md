# Clickable Chart Drill-Downs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire every informational chart in `DataVisualizations.tsx` into the existing `DrillDownDrawer` so that clicking any segment, slice, cell, or lane opens a context-aware detail view — turning ~10 purely decorative visualizations into actionable entry points.

**Architecture:** Extend the `DrillDownContext` discriminated union with three new variants (`plan-coverage-section`, `student-tag-group`, `variant-lane`), add matching drawer subcomponents, thread `onSegmentClick`-style callbacks through each chart's props, and wire them in `TodayPanel.tsx` and `HealthBar.tsx`. No new state is required — the existing `setDrillDown` pattern in `TodayPanel` is the single source of truth, and the drawer's existing focus-trap and motion machinery is reused unchanged.

**Tech Stack:** React 18, Vite, TypeScript, vitest, @testing-library/react

---

## Scope and non-goals

**In scope**
- `ComplexityDebtGauge`, `PlanCoverageRadar`, `ClassroomCompositionRings`, `DebtTrendSparkline`, `ComplexityTrendCalendar`, `PlanStreakCalendar`, `VariantSummaryStrip`, `SupportPatternRadar`, `FollowUpSuccessRate`, `InterventionTimeline` (verify) get click handlers.
- New `DrillDownContext` variants for the three targets not covered by existing types.
- New drawer subcomponents `PlanCoverageSectionView`, `StudentTagGroupView`, `VariantLaneView`.
- Keyboard accessibility (Tab + Enter/Space) on every newly clickable segment.
- Hover affordance (`cursor: pointer`, focus ring) gated behind `@media (prefers-reduced-motion: reduce)` for any new motion.
- Regression tests mirroring the `apps/web/src/components/__tests__/TodayStory.test.tsx` pattern.

**Out of scope**
- Restructuring `DataVisualizations.tsx` (the file stays 20-export monolith; we bolt click handlers onto existing components).
- New chart components or new analytics surfaces.
- Changing the drawer's animation, focus trap, or backdrop.
- Modifying the orchestrator API; all drill-down data is already in memory on the Today panel.
- `StudentPriorityMatrix`, `InterventionRecencyTimeline`, `FollowUpDecayIndicators`, `PendingActionsCard` — these already dispatch to the drawer via `onStudentClick` / `onItemClick` and do not need new wiring.
- `ComplexityHeatmap`, `EALoadStackedBars`, `ScaffoldEffectivenessChart`, `StudentSparkIndicator`, `MessageApprovalFunnel`, `ScheduleLoadStrip`, `WorkflowFlowStrip`, `ReadabilityComparisonGauge`, `StudentThemeHeatmap` — either already interactive, ambient indicators, or used exclusively outside Today (out of scope for this sprint; can be added incrementally later).

## Files touched

**Edit**
- `apps/web/src/types.ts` (lines 291-296, extend `DrillDownContext` union)
- `apps/web/src/components/DataVisualizations.tsx` (add optional click props to ~9 chart components, add cursor/focus CSS classes)
- `apps/web/src/components/DataVisualizations.css` (new `.viz-*--clickable` hover/focus tokens, reduced-motion guard)
- `apps/web/src/components/DrillDownDrawer.tsx` (extend `computeTitle`, add 3 new switch cases in body)
- `apps/web/src/components/HealthBar.tsx` (thread new callbacks through to the 3 inner charts)
- `apps/web/src/panels/TodayPanel.tsx` (wire `onSegmentClick` callbacks from every chart into `setDrillDown`)
- `apps/web/src/components/__tests__/TodayStory.test.tsx` (extend only if we repurpose fixtures)

**Create**
- `apps/web/src/components/PlanCoverageSectionView.tsx`
- `apps/web/src/components/StudentTagGroupView.tsx`
- `apps/web/src/components/VariantLaneView.tsx`
- `apps/web/src/components/__tests__/DataVisualizationsClicks.test.tsx` (new; holds click-handler unit tests for every chart we touch)
- `apps/web/src/components/__tests__/DrillDownDrawer.test.tsx` (new; asserts each new context type renders the right subcomponent)
- `apps/web/src/components/__tests__/HealthBar.test.tsx` (new; verifies pass-through callbacks)
- `apps/web/src/panels/__tests__/TodayPanel.drilldown.test.tsx` (new; integration test for end-to-end click → drawer-open for the new chart paths)

**Regenerated (do not hand-edit)**
- `docs/system-inventory.md` via `npm run system:inventory` after all code changes land.

## Key design decisions

1. **Single click-handler prop name: `onSegmentClick`.** Every newly-wired chart gets a `onSegmentClick?: (payload) => void` prop where `payload` is a narrow, chart-specific tagged object. This is distinct from the existing `onStudentClick` and `onBlockClick` names so the two don't collide when a chart has both (e.g. no chart in scope does, but the convention is forward-looking).
2. **Charts remain dumb.** Chart components do not import `DrillDownContext`. They emit a structural payload (e.g. `{ trendKey: "debt", data, label }`) and `TodayPanel` is responsible for wrapping it into `{ type: "trend", ... }`. This keeps `DataVisualizations.tsx` decoupled from the drawer.
3. **Three new context variants, no renaming.** Extending the discriminated union preserves exhaustive `switch` safety. The existing four variants are untouched. Any missing `case` in `computeTitle` or the drawer body will be caught at typecheck time.
4. **Keyboard access via `<button>` wrappers where possible.** For SVG segments that cannot be wrapped in a `<button>` (radar slices, gauge arc), use `role="button" tabIndex={0}` + `onKeyDown` handling Enter and Space. Every clickable region gets `aria-label`.
5. **Reduced motion guard.** Any new hover scale/translate lives in a `@media (prefers-reduced-motion: no-preference)` block, so the default behavior respects `reduce`.
6. **No hex literals.** All new colors/shadows pull from `var(--color-*)` tokens (e.g. `var(--color-focus-ring)`, `var(--color-surface-raised)`).

## Risk and rollback

- **Risk:** Adding `tabIndex={0}` to SVG elements can pollute the tab order. **Mitigation:** Only the outermost group of each interactive chart is focusable; inner shapes remain `aria-hidden`.
- **Risk:** `PlanCoverageRadar` currently has no `plans_items` data — `TodayPanel` would need to pass through `snapshot.latest_plan` subarrays. **Mitigation:** The `onSegmentClick` payload for radar is `{ section: "watchpoints" | "priorities" | ..., items: string[] }` where `TodayPanel` derives `items` from `result.latest_plan` before calling `setDrillDown`. If `latest_plan` is null, the chart stays non-interactive (no-op click).
- **Risk:** Test snapshots for existing drawer behavior. **Mitigation:** No snapshot tests exist for `DrillDownDrawer`; new assertions target rendered text and role.
- **Rollback:** Because each task is committed independently, reverting any single commit leaves the feature in a functional intermediate state. The union extension task should remain committed even on full rollback, since it is backward-compatible.

## Verification commands (run per task where relevant)

- `npm run typecheck --workspace @prairie/web` (after every task that touches `types.ts` or component prop types)
- `npm run test --workspace @prairie/web -- DataVisualizationsClicks` (Tasks 5a-5c)
- `npm run test --workspace @prairie/web -- DrillDownDrawer` (Task 6)
- `npm run test --workspace @prairie/web -- TodayPanel.drilldown` (Task 7)
- `npm run test --workspace @prairie/web -- HealthBar` (Task 8)
- `npm run lint --workspace @prairie/web` (after the final polish task)
- `npm run check:contrast` (Task 9, only if new focus-ring token color is introduced)
- `npm run system:inventory` (Task 10)

Always verify before claiming completion per `superpowers:verification-before-completion`.

---

## Task 1 — Extend `DrillDownContext` union with three new variants

**Outcome:** `types.ts` exports a `DrillDownContext` union that includes `plan-coverage-section`, `student-tag-group`, and `variant-lane`, and the existing four variants still typecheck everywhere they are used.

**Steps**
- [ ] Read `apps/web/src/types.ts` lines 270-296 in full to confirm the exact current union shape.
- [ ] Before editing, write a failing vitest in `apps/web/src/__tests__/types.drilldown.test.ts` that constructs one instance of each of the three new variants and calls a tiny local helper `describeContext(ctx: DrillDownContext): string` containing an exhaustive `switch`. The test asserts each variant returns a nonempty string. This catches the "new variant not added to switch" class of bugs at runtime.
- [ ] Run the test and confirm TypeScript (and the test) fail because the new variants don't exist yet.
- [ ] Extend the union in `apps/web/src/types.ts`:

```ts
export type DrillDownContext =
  | { type: "forecast-block"; blockIndex: number; block: ComplexityBlock }
  | { type: "student"; alias: string; initialData?: StudentSummary }
  | { type: "debt-category"; category: string; items: DebtItem[] }
  | { type: "trend"; trendKey: "debt" | "plans" | "complexity"; data: number[]; label: string; highlightIndex?: number }
  | { type: "plan-coverage-section"; section: "watchpoints" | "priorities" | "ea_actions" | "prep_items" | "family_followups"; label: string; items: string[] }
  | { type: "student-tag-group"; groupKind: "eal" | "support_cluster" | "family_language"; tag: string; label: string; students: { alias: string; eal_flag?: boolean; support_tags?: string[]; family_language?: string }[] }
  | { type: "variant-lane"; variantType: string; label: string; variants: { variant_type: string; estimated_minutes: number; title: string }[] };
```

Note that `trend` gains a backwards-compatible optional `highlightIndex` for Task 5c (ComplexityTrendCalendar day click).
- [ ] Run `npm run typecheck --workspace @prairie/web`. Fix any exhaustive-switch errors in `DrillDownDrawer.tsx`'s `computeTitle` function by adding title cases for the three new variants (these will be refined in Task 6, but they need to compile now — stub with `return context.label` for each).
- [ ] Re-run the vitest and confirm it passes.
- [ ] Commit: `feat(types): extend DrillDownContext with plan-coverage-section, student-tag-group, variant-lane`.

## Task 2 — `PlanCoverageSectionView` drawer subcomponent

**Outcome:** A new presentational component that renders a labeled list of plan-section items inside the drawer.

**Steps**
- [ ] Write `apps/web/src/components/__tests__/PlanCoverageSectionView.test.tsx` that renders `<PlanCoverageSectionView context={{ type: "plan-coverage-section", section: "watchpoints", label: "Watchpoints", items: ["Keep Maya on chunked task", "Ranbir: sensory cue at 10:20", "Jordan: pre-teach vocab"] }} />` inside a `<div role="dialog">` and asserts:
  - The heading includes the label "Watchpoints" and the count "3".
  - Each item string is present in the DOM.
  - `role="list"` is on the container, `role="listitem"` on each entry (use the implicit `<ul>`/`<li>` pair; no explicit role needed).
  - When `items` is empty, the empty-state text "No items in this section." renders and the list does not.
- [ ] Run the test to confirm it fails (component does not exist).
- [ ] Implement `apps/web/src/components/PlanCoverageSectionView.tsx` modeled on `DebtCategoryView.tsx`. Props: `{ context: Extract<DrillDownContext, { type: "plan-coverage-section" }> }`. Use existing `drill-down-*` CSS classes (`drill-down-section`, `drill-down-list`, `drill-down-empty`) so no new styles are required.
- [ ] Re-run the test and confirm it passes.
- [ ] Commit: `feat(drawer): add PlanCoverageSectionView for plan-coverage-section drill-down`.

## Task 3 — `StudentTagGroupView` drawer subcomponent

**Outcome:** A drawer view that lists students sharing a given EAL level, support cluster, or family language, with one-click deep-dive into each student's existing `student` drill-down.

**Steps**
- [ ] Write `apps/web/src/components/__tests__/StudentTagGroupView.test.tsx` with three cases:
  1. `groupKind: "eal"`, `tag: "eal_level_2"`, `label: "EAL Level 2"`, three students each with `eal_flag: true` and `support_tags: ["eal_level_2", ...]`. Asserts the heading `"EAL Level 2"` and `"3 students"`, each alias rendered, each row wrapped in a `<button type="button">`.
  2. `groupKind: "support_cluster"`, `tag: "sensory"`, two students. Asserts students are shown in a list and pressing `Enter` on a button fires `onStudentSelect` with the correct alias (call via a mock passed in from the test).
  3. Empty students list renders "No students in this group."
- [ ] Run tests, confirm they fail.
- [ ] Implement `apps/web/src/components/StudentTagGroupView.tsx`. Props:
  ```ts
  interface Props {
    context: Extract<DrillDownContext, { type: "student-tag-group" }>;
    onStudentSelect: (alias: string) => void;
  }
  ```
  Each row is a native `<button>` for keyboard accessibility. Clicking fires `onStudentSelect(alias)`. Pressing Enter or Space on a focused button is native button behavior — no extra handler needed.
- [ ] Re-run tests and confirm they pass.
- [ ] Commit: `feat(drawer): add StudentTagGroupView for student-tag-group drill-down`.

## Task 4 — `VariantLaneView` drawer subcomponent

**Outcome:** A drawer view that shows all variants within a given variant lane (e.g. "EAL Supported"), with estimated minutes and titles.

**Steps**
- [ ] Write `apps/web/src/components/__tests__/VariantLaneView.test.tsx` with a fixture of 4 variants of type `eal_supported` and one `core`. Render with context `{ type: "variant-lane", variantType: "eal_supported", label: "EAL Supported", variants: <all 5> }` and assert:
  - Heading contains "EAL Supported" and the filtered count "4" (component filters down to the lane before rendering).
  - Each of the 4 matching variant titles is rendered.
  - The `core` variant is NOT rendered.
  - Each row shows its `estimated_minutes` with the unit suffix `"m"`.
- [ ] Run, confirm failure.
- [ ] Implement `apps/web/src/components/VariantLaneView.tsx`. Single prop `{ context: Extract<DrillDownContext, { type: "variant-lane" }> }`. Body filters `context.variants` by `variant_type === context.variantType` and renders with the existing `drill-down-list` class.
- [ ] Re-run and confirm pass.
- [ ] Commit: `feat(drawer): add VariantLaneView for variant-lane drill-down`.

## Task 5a — Add click props to the three "trend" charts (gauge, sparkline, complexity calendar)

**Outcome:** `ComplexityDebtGauge`, `DebtTrendSparkline`, and `ComplexityTrendCalendar` accept a unified `onSegmentClick` prop that fires with a narrow payload on click / keypress. Every clickable region is reachable via Tab and activatable via Enter and Space.

**Steps**
- [ ] Create `apps/web/src/components/__tests__/DataVisualizationsClicks.test.tsx` with the shared imports and a `vi.fn()` helper for spies. Write three failing test blocks:

  1. **`ComplexityDebtGauge` click fires**
     - Render with 5 synthetic `debtItems`, a `previousTotal` of 3, and `onSegmentClick={spy}`.
     - Find the gauge SVG via its `role="img"` `aria-label` prefix. Wrap it in a `<button>` query or query the `[data-testid="viz-debt-gauge-hit"]` element (the new hit target).
     - `fireEvent.click` the hit target. Assert `spy` was called once with `{ trendKey: "debt", label: "Complexity debt", data: [5] }` (single-element fallback when no trend data is available; see note below).
     - Press `Enter` on focus and assert the spy fires again. Press `Space` and assert again.
     - Assert `tabIndex={0}` and `role="button"` on the hit target.

  2. **`DebtTrendSparkline` click fires**
     - Render with `data={[2, 3, 4, 5, 6, 7, 8]}` and `onSegmentClick={spy}`.
     - Click the SVG hit target.
     - Assert `spy` called with `{ trendKey: "debt", label: "Debt trend", data: [2, 3, 4, 5, 6, 7, 8] }`.

  3. **`ComplexityTrendCalendar` day click fires**
     - Render with `data={[0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1]}` and `onSegmentClick={spy}`.
     - Query all cells via `data-testid="viz-complexity-cell"` (added in this task).
     - Click cell at index 7.
     - Assert spy called with `{ trendKey: "complexity", label: "Peak complexity", data: <same array>, highlightIndex: 7 }`.
     - Assert each cell has `tabIndex={0}` and `role="button"` with `aria-label` describing the day.

- [ ] Confirm all three tests fail (props don't exist yet).
- [ ] Edit `apps/web/src/components/DataVisualizations.tsx`:
  - Add `onSegmentClick?: (payload: { trendKey: "debt"; label: string; data: number[] }) => void` to `DebtGaugeProps`. Inside `ComplexityDebtGauge`, wrap the outer `<div className="viz-debt-gauge">` in a native `<button>` when `onSegmentClick` is set, or set `role="button" tabIndex={0}` on it with keyboard handler. Assemble the payload from `{ trendKey: "debt", label: "Complexity debt", data: [debtItems.length] }` (note: gauge has no historical data, so the payload is a single-element array — the `trend` drawer view already handles short data gracefully).
  - Add `onSegmentClick?: (payload: { trendKey: "debt"; label: string; data: number[] }) => void` to `DebtTrendProps`. Wrap the root `<div className="viz-debt-trend">` similarly. Payload is `{ trendKey: "debt", label: "Debt trend", data }`.
  - Add `onSegmentClick?: (payload: { trendKey: "complexity"; label: string; data: number[]; highlightIndex: number }) => void` to `ComplexityTrendProps`. Each cell becomes a `<button type="button">` (replacing the `<div>`) with an `aria-label={`Day ${i + 1}: ${COMPLEXITY_LEVEL_LABELS[clamped]}`}`. Add `data-testid="viz-complexity-cell"`. Click fires with `highlightIndex: i`.
- [ ] Extend `DataVisualizations.css`:
  - Add `.viz-debt-gauge--clickable`, `.viz-debt-trend--clickable`, `.viz-complexity-cal__cell--clickable` rules with `cursor: pointer`, a focus ring using `box-shadow: 0 0 0 2px var(--color-focus-ring)`, and an opt-in hover style behind `@media (prefers-reduced-motion: no-preference)`.
- [ ] Re-run the test file. All three tests pass.
- [ ] Commit: `feat(viz): add onSegmentClick to ComplexityDebtGauge, DebtTrendSparkline, ComplexityTrendCalendar`.

## Task 5b — Add click props to `PlanStreakCalendar`, `VariantSummaryStrip`, `PlanCoverageRadar`

**Outcome:** Three more charts accept `onSegmentClick` with chart-specific payloads.

**Steps**
- [ ] Append three new test blocks to `DataVisualizationsClicks.test.tsx`:

  1. **`PlanStreakCalendar` day click**
     - Render with `plans14d={[1,1,0,1,1,1,0,1,1,1,0,1,1,1]}` and `onSegmentClick={spy}`.
     - Query cell by `data-testid="viz-plan-streak-cell-10"`.
     - Click, assert spy called with `{ dayIndex: 10, planned: false }` (index 10 in the 14-element array corresponds to the second `0`).
     - Assert `tabIndex={0}` on the `<rect>`-turned-`<button>` hit target.

  2. **`VariantSummaryStrip` lane click**
     - Render with `variants=[{variant_type: "core", estimated_minutes: 25, title: "Original lesson"}, {variant_type: "eal_supported", estimated_minutes: 20, title: "EAL scaffolded"}, {variant_type: "eal_supported", estimated_minutes: 18, title: "EAL vocab cards"}]` and `onSegmentClick={spy}`.
     - Click the second item (an `eal_supported` entry).
     - Assert spy called with `{ variantType: "eal_supported", label: "Eal Supported", variants: <same array> }`. (The full array is passed; `VariantLaneView` filters.)

  3. **`PlanCoverageRadar` section click**
     - Render with props `{ watchpoints: 5, priorities: 3, eaActions: 2, prepItems: 4, familyFollowups: 1, onSegmentClick: spy, sectionItems: { watchpoints: ["a","b","c","d","e"], priorities: ["p1","p2","p3"], eaActions: ["e1","e2"], prepItems: ["pr1","pr2","pr3","pr4"], familyFollowups: ["f1"] } }`.
     - Query axis hit target by `data-testid="viz-plan-radar-axis-watchpoints"`.
     - Click, assert spy fires with `{ section: "watchpoints", label: "Watchpoints", items: ["a","b","c","d","e"] }`.
     - Press `Enter` on a focused axis target and assert spy fires.

- [ ] Tests fail — props/testids don't exist.
- [ ] Edit `DataVisualizations.tsx`:
  - **`PlanStreakCalendar`:** Add `onSegmentClick?: (payload: { dayIndex: number; planned: boolean }) => void` to props. Replace each `<rect>` with a `<g>` containing the rect + an overlay `<rect>` that carries `role="button" tabIndex={0} aria-label={…}` (SVG buttons cannot be `<button>` elements, so role is required). Keyboard: Enter and Space keys fire. Add `data-testid={`viz-plan-streak-cell-${i}`}` for each cell (only when the cell has real data — skip padding nulls).
  - **`VariantSummaryStrip`:** Add `onSegmentClick?: (payload: { variantType: string; label: string; variants: VariantSummaryItem[] }) => void`. Each `.viz-variant-strip__item` becomes a `<button type="button">` when the prop is set. Click fires with the `variant_type` of the clicked row + `prettyVariantType(variant_type)` as label + the full `variants` array.
  - **`PlanCoverageRadar`:** Add to `PlanCoverageRadarProps`:
    ```ts
    onSegmentClick?: (payload: { section: "watchpoints" | "priorities" | "eaActions" | "prepItems" | "familyFollowups"; label: string; items: string[] }) => void;
    sectionItems?: Partial<Record<"watchpoints" | "priorities" | "eaActions" | "prepItems" | "familyFollowups", string[]>>;
    ```
    For each axis, add an invisible hit-target `<circle>` at the axis endpoint with `role="button" tabIndex={0}` and `data-testid`. Click/Enter/Space fires with `{ section: axis.key, label: axis.label, items: sectionItems?.[axis.key] ?? [] }`. If `onSegmentClick` is undefined, the chart renders exactly as today (no regression).
- [ ] CSS: add `.viz-plan-streak__cell--clickable`, `.viz-variant-strip__item--clickable`, `.viz-plan-radar__axis-hit` with cursor/focus styles under the reduced-motion guard.
- [ ] Re-run tests, all three pass.
- [ ] Commit: `feat(viz): add onSegmentClick to PlanStreakCalendar, VariantSummaryStrip, PlanCoverageRadar`.

## Task 5c — Add click props to `ClassroomCompositionRings`, `SupportPatternRadar`, `FollowUpSuccessRate`, and verify `InterventionTimeline`

**Outcome:** The three remaining informational charts become clickable; `InterventionTimeline` is audited and confirmed to either already route through a parent or is wired if missing.

**Steps**
- [ ] Append four new test blocks to `DataVisualizationsClicks.test.tsx`:

  1. **`ClassroomCompositionRings` — click a ring segment**
     - Render with 6 students across 3 EAL levels and 2 family languages.
     - Query a ring segment by `data-testid="viz-composition-segment-eal-level_2"`.
     - Click and assert spy (`onSegmentClick={spy}`) called with `{ groupKind: "eal", tag: "eal_level_2", label: "EAL Level 2", students: <filtered subset> }`.
     - Click a `family_language` segment and assert spy fires with `groupKind: "family_language"` payload.

  2. **`SupportPatternRadar` — theme axis click**
     - Render with 5 recurring themes spread across axes.
     - Click the `transition` axis hit target.
     - Assert spy called with `{ groupKind: "support_cluster", tag: "transition", label: "Transitions", themes: <themes with that axis> }`. NOTE: `SupportPatternRadar` emits a **`theme` payload**, which `TodayPanel` will convert into a `student-tag-group` context. The chart itself emits `{ axis, label, themes }` and lets the consumer do the shaping.

  3. **`FollowUpSuccessRate` — donut click**
     - Render with `records=[{ follow_up_needed: true, ... }, { follow_up_needed: false, ...}, ...]`.
     - Click the SVG hit target.
     - Assert spy called with `{ category: "stale_followup", items: <records filtered to follow_up_needed === true> }`. Note: this is a raw `InterventionRecord[]`, not a `DebtItem[]`. `TodayPanel` will remap it into the existing `debt-category` context (see Task 7).

  4. **`InterventionTimeline` verification (no new props)**
     - Read the component body. Confirm it has NO click handlers today. Add a `onDotClick?: (record) => void` prop. Click a dot and assert the spy fires with the matching `InterventionRecord`.

- [ ] Run, confirm all four tests fail.
- [ ] Edit `DataVisualizations.tsx`:
  - **`ClassroomCompositionRings`:** Add `onSegmentClick?: (payload: { groupKind: "eal" | "support_cluster" | "family_language"; tag: string; label: string; students: CompositionRingsProps["students"] }) => void`. Extend `drawDonutRing` to accept an optional `onClick(seg)` callback, and render each `<circle>` as a clickable SVG ring with `role="button" tabIndex={0}` when the callback is set. Map each segment back to its source tag/language code. Filter `students` by the clicked tag and pass the subset.
  - **`SupportPatternRadar`:** Add `onSegmentClick?: (payload: { axis: string; label: string; themes: RecurringTheme[] }) => void`. Each axis label's `<text>` + axis endpoint gets an invisible hit `<rect>` with the standard role/tabIndex/keyboard handler.
  - **`FollowUpSuccessRate`:** Add `onSegmentClick?: (payload: { category: "stale_followup"; items: InterventionRecord[] }) => void`. Wrap root `div` in a `<button>` or role+tabIndex equivalent. Filter `records` to unresolved follow-ups before emitting.
  - **`InterventionTimeline`:** Add `onDotClick?: (record: InterventionRecord) => void`. Each `<circle>` becomes focusable (`role="button" tabIndex={0}`, `aria-label` describing date + status). Click/Enter/Space fires.
- [ ] CSS: add `.viz-composition__segment--clickable`, `.viz-radar__axis-hit`, `.viz-followup-rate--clickable`, `.viz-int-timeline__dot--clickable` with cursor/focus/reduced-motion styles.
- [ ] Re-run tests. All four pass.
- [ ] Commit: `feat(viz): add click handlers to ClassroomCompositionRings, SupportPatternRadar, FollowUpSuccessRate, InterventionTimeline`.

## Task 6 — Wire new context types into `DrillDownDrawer.tsx`

**Outcome:** The drawer renders the correct subcomponent for each of the three new `context.type` values, and `computeTitle` returns a useful string for each.

**Steps**
- [ ] Create `apps/web/src/components/__tests__/DrillDownDrawer.test.tsx`. Write four tests, one for each of the new (or refined) flows:
  1. `context.type === "plan-coverage-section"` → assert the drawer title contains the `label` ("Watchpoints") and the count; assert the body contains item strings.
  2. `context.type === "student-tag-group"` → assert title contains the label ("EAL Level 2"); assert the three student aliases render as focusable buttons; simulate clicking one button and assert `onNavigate` is **not** called but the underlying `onStudentSelect` would transition to a `student` context (mock via a wrapper component that manages local state — see note below).
  3. `context.type === "variant-lane"` → assert title contains the lane label ("EAL Supported") and the filtered variant count.
  4. `context.type === "trend"` with `highlightIndex: 5` → assert the drawer still renders (no regression from the union change).

  Because `StudentTagGroupView` escalates to a `student` drill-down, the test wraps the drawer in a tiny local stateful component:

  ```tsx
  function Harness() {
    const [ctx, setCtx] = useState<DrillDownContext | null>(initialTagGroupContext);
    return (
      <DrillDownDrawer
        context={ctx}
        onClose={() => setCtx(null)}
        onNavigate={() => {}}
        /* drawer internally handles escalation via a new onStudentSelect callback — see impl below */
      />
    );
  }
  ```
  The test clicks a student button and asserts the drawer now renders `<StudentDetailView>` content (find by the existing "Student Detail" heading).

- [ ] Run tests, confirm all four fail.
- [ ] Edit `apps/web/src/components/DrillDownDrawer.tsx`:
  - Import the three new view components.
  - Extend `computeTitle`:
    ```ts
    case "plan-coverage-section":
      return `${context.label} — ${context.items.length} ${context.items.length === 1 ? "item" : "items"}`;
    case "student-tag-group":
      return `${context.label} — ${context.students.length} ${context.students.length === 1 ? "student" : "students"}`;
    case "variant-lane": {
      const count = context.variants.filter((v) => v.variant_type === context.variantType).length;
      return `${context.label} — ${count} ${count === 1 ? "variant" : "variants"}`;
    }
    ```
  - Inside the drawer body, add three new branches:
    ```tsx
    {context.type === "plan-coverage-section" && (
      <PlanCoverageSectionView context={context} />
    )}
    {context.type === "student-tag-group" && (
      <StudentTagGroupView
        context={context}
        onStudentSelect={(alias) => {
          // Escalate to a student drill-down without closing the drawer.
          // We do this by calling a new internal handler that swaps context.
          // Since this component receives `context` as a prop, the swap has to
          // bubble up. Add a new optional prop `onContextChange?: (next: DrillDownContext) => void`.
          onContextChange?.({ type: "student", alias });
        }}
      />
    )}
    {context.type === "variant-lane" && <VariantLaneView context={context} />}
    ```
  - Add a new optional prop `onContextChange?: (next: DrillDownContext) => void` to the `Props` interface. It defaults to `undefined`; `TodayPanel` will pass a setter in Task 7.
- [ ] Typecheck passes because the extended `computeTitle` now handles all union members.
- [ ] Re-run drawer tests. All four pass.
- [ ] Commit: `feat(drawer): route new context types to new view components`.

## Task 7 — Wire `TodayPanel.tsx` to use the new chart callbacks

**Outcome:** Every chart on the Today panel now has an `onSegmentClick` wired to `setDrillDown`, and the drawer's new `onContextChange` prop is wired to the same setter so student escalation from `StudentTagGroupView` works without closing the drawer.

**Steps**
- [ ] Create `apps/web/src/panels/__tests__/TodayPanel.drilldown.test.tsx`. Use the existing vitest and `@testing-library/react` setup. Render the panel with a fixture snapshot that has:
  - 5 debt items of mixed categories,
  - a `latest_plan` with populated `watchpoints`, `priorities`, `ea_actions`, `prep_items`, `family_followups`,
  - `health.trends.plans_14d` and `debt_total_14d` arrays,
  - a profile with 6 students (2 EAL, 4 non-EAL).

  Mock the async actions (`useAsyncAction`) via the usual test helper or by stubbing the module, mirroring the approach taken by existing panel tests. If none exist, add a minimal mock. Assert:
  1. Clicking the `ComplexityDebtGauge` opens the drawer with `"Complexity debt — 14-day trend"` or the matching title produced by `computeTitle`.
  2. Clicking an EAL segment on `ClassroomCompositionRings` opens the drawer with the "EAL Level 2 — N students" title.
  3. Clicking a watchpoints slice on `PlanCoverageRadar` opens the drawer with "Watchpoints — N items".
  4. From inside the `StudentTagGroupView`, clicking a student button replaces the drawer content with `StudentDetailView` (verify by the "Student Detail" heading) without the drawer ever closing (the backdrop element stays mounted throughout).

- [ ] Tests fail (wiring does not exist).
- [ ] Edit `apps/web/src/panels/TodayPanel.tsx`:
  - Pass `onSegmentClick` to `ComplexityDebtGauge`:
    ```tsx
    onSegmentClick={(payload) =>
      setDrillDown({
        type: "trend",
        trendKey: payload.trendKey,
        data: health.result?.trends?.debt_total_14d ?? payload.data,
        label: payload.label,
      })
    }
    ```
  - Pass `onSegmentClick` to `ClassroomCompositionRings`:
    ```tsx
    onSegmentClick={(payload) =>
      setDrillDown({
        type: "student-tag-group",
        groupKind: payload.groupKind,
        tag: payload.tag,
        label: payload.label,
        students: payload.students,
      })
    }
    ```
  - Pass `onSegmentClick` to `PlanCoverageRadar` (when rendered — add this chart near the plan recap if it isn't already on Today; if the radar is only used on the Tomorrow Plan panel, scope the Today wiring to what is actually rendered and add a follow-up note to wire it on Tomorrow Plan in a later task). Build `sectionItems` from `result.latest_plan.watchpoints.map((w) => w.label)`, etc. Pass:
    ```tsx
    sectionItems={sectionItems}
    onSegmentClick={(payload) =>
      setDrillDown({
        type: "plan-coverage-section",
        section: payload.section,
        label: payload.label,
        items: payload.items,
      })
    }
    ```
  - Pass `onSegmentClick` to `VariantSummaryStrip` (again, only where it's rendered in the Today flow — if only on the Differentiate panel, leave Today unchanged and add a follow-up task noted in Task 10):
    ```tsx
    onSegmentClick={(payload) =>
      setDrillDown({
        type: "variant-lane",
        variantType: payload.variantType,
        label: payload.label,
        variants: payload.variants,
      })
    }
    ```
  - Pass `onSegmentClick` to `SupportPatternRadar`:
    ```tsx
    onSegmentClick={(payload) => {
      const studentsOnAxis = /* derive from themes */;
      setDrillDown({
        type: "student-tag-group",
        groupKind: "support_cluster",
        tag: payload.axis,
        label: payload.label,
        students: studentsOnAxis,
      });
    }}
    ```
  - Pass `onSegmentClick` to `FollowUpSuccessRate`:
    ```tsx
    onSegmentClick={(payload) => {
      // Map InterventionRecord[] → DebtItem[] so we reuse DebtCategoryView.
      const items: DebtItem[] = payload.items.map((r) => ({
        category: "stale_followup",
        student_refs: r.student_refs ?? [],
        description: r.note ?? "Follow-up pending",
        source_record_id: r.record_id,
        age_days: /* compute from r.created_at */,
        suggested_action: "Log follow-up",
      }));
      setDrillDown({ type: "debt-category", category: "stale_followup", items });
    }}
    ```
  - Pass `onContextChange={setDrillDown}` to `<DrillDownDrawer>`. This lets `StudentTagGroupView` escalate to a `student` context without ever closing the drawer.
- [ ] Re-run integration tests. All four pass.
- [ ] Commit: `feat(today): wire all chart onSegmentClick handlers into drill-down drawer`.

## Task 8 — Thread drill-down handlers through `HealthBar.tsx`

**Outcome:** The three inner charts inside `HealthBar` (`PlanStreakCalendar`, `DebtTrendSparkline`, `ComplexityTrendCalendar`) forward their click events to a handler that `TodayPanel` passes in, so clicks on them also open the drawer.

**Steps**
- [ ] Create `apps/web/src/components/__tests__/HealthBar.test.tsx`. Render with a populated `ClassroomHealth.trends` and a `onTrendClick` spy. Simulate a click on each of the three inner charts and assert the spy fires with the correct payload (`{ trendKey: "plans", ... }`, `{ trendKey: "debt", ... }`, `{ trendKey: "complexity", ... }`).
- [ ] Run, confirm failure.
- [ ] Edit `apps/web/src/components/HealthBar.tsx`:
  - Extend `Props` with `onTrendClick?: (payload: { trendKey: "debt" | "plans" | "complexity"; label: string; data: number[]; highlightIndex?: number }) => void`.
  - Pass `onSegmentClick={onTrendClick}` to `DebtTrendSparkline` and `ComplexityTrendCalendar`.
  - For `PlanStreakCalendar`, map its cell-click payload (`{ dayIndex, planned }`) to the shared trend payload: call `onTrendClick({ trendKey: "plans", label: "Planning streak", data: health.trends.plans_14d, highlightIndex: dayIndex })`.
- [ ] Edit `TodayPanel.tsx` to pass `onTrendClick={(payload) => setDrillDown({ type: "trend", ...payload })}` to `<HealthBar>`.
- [ ] Re-run tests. All pass.
- [ ] Commit: `feat(health-bar): forward inner-chart clicks through onTrendClick to the drill-down drawer`.

## Task 9 — Accessibility and reduced-motion polish

**Outcome:** Every new clickable chart region is keyboard-reachable, has a visible focus ring, respects `prefers-reduced-motion`, and uses only token-based colors.

**Steps**
- [ ] Add a new test file `apps/web/src/components/__tests__/DataVisualizationsA11y.test.tsx` that for each newly-clickable chart renders it with a spy, then:
  1. Uses `tab()` from `@testing-library/user-event` to move focus onto the first hit target and asserts `document.activeElement` has `role="button"`.
  2. Presses `Enter` and asserts the spy fires.
  3. Presses `Space` and asserts the spy fires.
  4. Presses `Tab` again and (for charts with multiple segments) confirms the next hit target receives focus.
- [ ] Run, confirm any missing keyboard handlers fail the test.
- [ ] Fix each chart in `DataVisualizations.tsx`:
  - Every SVG `role="button"` element has an `onKeyDown` handler that invokes the same callback for `e.key === "Enter"` or `e.key === " "` (with `e.preventDefault()` for Space to avoid page-scroll).
  - Every native `<button>` gets `type="button"` explicitly (no form submission surprise).
  - Every hit target has an `aria-label`.
- [ ] Review `DataVisualizations.css` for all new rules and confirm:
  - No hex literals. Use `var(--color-focus-ring)` (if the token doesn't exist yet, define it in `apps/web/src/styles/tokens.css` matching `--color-accent` at 40% opacity — add this as a prereq in the same commit and run `npm run check:contrast`).
  - Hover-scale / translate transitions live inside `@media (prefers-reduced-motion: no-preference) { ... }`.
  - Focus rings use `outline: none; box-shadow: 0 0 0 2px var(--color-focus-ring);` so they always render (reduced-motion must not hide the focus ring).
- [ ] Re-run all chart tests and the a11y test. All pass.
- [ ] Run `npm run lint --workspace @prairie/web` and `npm run check:contrast`. Both must be clean.
- [ ] Commit: `feat(viz): keyboard accessibility, focus rings, and reduced-motion guards for clickable charts`.

## Task 10 — Regenerate system inventory and close the loop

**Outcome:** `docs/system-inventory.md` reflects the expanded `DrillDownContext` union and the new drawer view components, and any follow-ups noted during implementation are captured.

**Steps**
- [ ] Run `npm run system:inventory` to regenerate `docs/system-inventory.md` and `docs/api-surface.md`.
- [ ] Diff the regenerated files. Confirm the new view components and the expanded union appear in whatever section of the inventory lists them (component index and/or TypeScript symbol index).
- [ ] If there are any charts that were rendered only outside of Today (e.g. `PlanCoverageRadar` might live on Tomorrow Plan, `VariantSummaryStrip` on Differentiate), add a short follow-up note to `docs/development-gaps.md` under a new bullet like: "Task F-NN: wire `PlanCoverageRadar` / `VariantSummaryStrip` drill-downs on Tomorrow Plan and Differentiate panels (charts already expose `onSegmentClick`; wiring deferred from 2026-04-14 sprint)."
- [ ] Run the full panel-focused test suite: `npm run test --workspace @prairie/web`. Confirm no regressions.
- [ ] Run `npm run typecheck --workspace @prairie/web` one final time.
- [ ] Commit: `docs: regenerate system inventory after drill-down expansion`.

---

## Done definition

- [ ] `DrillDownContext` union contains 7 variants.
- [ ] 3 new drawer view components exist with unit tests.
- [ ] 9 chart components emit `onSegmentClick` (or equivalent named prop), each with a test.
- [ ] `DrillDownDrawer` renders the correct subcomponent for each new context type, and `computeTitle` handles every union branch.
- [ ] `TodayPanel` wires every chart on Today into `setDrillDown`.
- [ ] `HealthBar` forwards inner-chart clicks via `onTrendClick`.
- [ ] Every new clickable region is Tab-reachable and Enter/Space-activatable, verified by tests.
- [ ] All new CSS uses token variables; no hex literals; reduced-motion respected.
- [ ] `npm run typecheck`, `npm run lint`, and `npm run test` for `apps/web` all pass.
- [ ] `npm run check:contrast` passes (only if a new color token was added).
- [ ] `npm run system:inventory` has been run and the resulting docs are committed.
- [ ] Each task from 1 through 10 has its own commit.
