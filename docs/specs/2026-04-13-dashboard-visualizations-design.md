# Dashboard Visualization Polish — Design Spec

**Date:** 2026-04-13
**Status:** Approved (user delegated full sprint)
**Scope:** Today panel (dashboard) data visualization layer

## Goal

Push the Today panel's visualizations toward boundary-pushing aesthetic and usefulness without breaking the production-hardened visualization library. Add a unified hero that tells the day's story at a glance, a typographic narrative that names the story in words, and craft upgrades to the existing cards.

## What exists now

`TodayPanel` composes seven+ visualizations: `ComplexityDebtGauge`, `StudentPriorityMatrix`, `InterventionRecencyTimeline`, `ClassroomCompositionRings`, `HealthBar` (which contains `PlanStreakCalendar`, `DebtTrendSparkline`, `ComplexityTrendCalendar`), plus `ForecastTimeline`. All are hand-crafted SVG in `DataVisualizations.tsx` (1272 lines) using semantic color tokens from `tokens.css`. Rich 14-day trend data (`plans_14d`, `debt_total_14d`, `peak_complexity_14d`) is available via `ClassroomHealth.trends` but only thinly consumed.

The cards work individually but read like a museum wall of isolated pieces. A teacher at 7:30 AM has to visit each one to build a mental model of the day.

## What changes

### 1. `DayArc` — the signature hero (new)

One wide hero visualization replacing the cognitive assembly work. It unifies three layers on one horizontal axis:

- **Complexity ridge**: a smoothed area curve across the forecast blocks, amplitude proportional to each block's complexity level. Fill is a vertical gradient (warm at the peaks, cool at the valleys) pulled from `--color-forecast-*` tokens.
- **Delta whiskers**: small upward/downward tick marks on each block showing whether today's complexity is above or below the 14-day baseline (computed from `peak_complexity_14d`).
- **Student constellation**: dots along the lower half of the arc, one per priority student, positioned left-to-right by urgency rank (most urgent leftmost) with vertical offset by pending action count. Clickable → drill-down to student detail.
- **Debt motes**: floating glyphs above the ridge at the far-right edge, one per debt category, scaled by count. Tooltip shows category and count.
- **Now line**: a subtle vertical marker at the current time of day, mapped to the 8:30 AM–3:30 PM school window. Breathing opacity (3s sine loop). Hidden outside school hours.
- **Horizon gradient**: very subtle dawn-to-dusk background tint based on time of day.

Mount motion: ridge path draws in via `stroke-dasharray` (ease-out-expo, 800ms), then student dots fade in with 60ms stagger, then debt motes scale in. All disabled under `prefers-reduced-motion`.

Accessibility: `role="img"` with a data-derived `aria-label` that names the day's shape. Interactive elements (students, debt motes, blocks) are keyboard-focusable buttons with `aria-label`s and focus rings. Screen-reader description enumerates block count, peak block, student count.

Files: `apps/web/src/components/DayArc.tsx`, `apps/web/src/components/DayArc.css`.

### 2. `TodayStory` — the narrative ribbon (new)

A single-line Fraunces serif display set below the Day Arc. Deterministic text synthesis from `TodaySnapshot` + `ClassroomHealth` + `StudentSummary[]`. No model calls.

Template rules (priority order):

1. Pending actions exist AND highest-risk block is `high` → "The [block] is today's real test. [Student] enters with unfinished threads."
2. Pending actions > 0 AND high block exists → "Focus finds [Student] first. The [block] is where complexity peaks."
3. Pending actions > 0 AND no high block → "[N] threads still need you before the day starts. [Student] is the first conversation."
4. No pending actions AND streak ≥ 3 AND plan today → "Today should breathe. [N]-day streak, the day's shape is steady."
5. No pending AND no streak → "A quiet queue. Build the next plan while the room is still."
6. No data → "The first plan will set this dashboard in motion."

Uses `--font-serif`, `--text-lg` or `--text-xl`, `color-text`. A small punctuation glyph (accent-colored dot) anchors the left edge.

Files: `apps/web/src/components/TodayStory.tsx`, `apps/web/src/components/TodayStory.css`.

### 3. Craft upgrades to existing cards

Modify `DataVisualizations.tsx` (in-place, minimal diff):

- `ComplexityDebtGauge`: needle arc animates from 0 to target (900ms, ease-spring). Adds an optional `previousTotal` delta badge ("+2 since last check" / "-1") if the trend data is present.
- `StudentPriorityMatrix`: bubbles get a subtle keyboard-navigable focus treatment (tabindex on the `<g>`, focus-visible ring via CSS). Data-rich aria-label enumerating students and their urgency.
- `InterventionRecencyTimeline`: already uses spring easing on bar width. Add `style={{ animationDelay }}` stagger on mount so bars draw in sequence.
- `ClassroomCompositionRings`: rings draw in via `stroke-dasharray` animation (staggered per ring, 600ms each).
- All SVG charts: `aria-label`s upgraded from generic ("Complexity debt gauge") to data-derived ("Complexity debt: 5 items accumulating, stale follow-ups leading").

### 4. Layout

TodayPanel grid order becomes:

```
PageIntro
DayArc                    ← NEW hero, full-width
TodayStory                ← NEW narrative, sits immediately below arc
PendingActionsCard        ← existing
ComplexityDebtGauge       ← polished
StudentPriorityMatrix     ← polished
InterventionRecencyTimeline ← polished
ClassroomCompositionRings ← polished
TimeSuggestion            ← existing
HealthBar                 ← existing
today-grid--secondary     ← existing (PlanRecap + forecast)
StudentRoster             ← existing
```

The `.motion-stagger` class that wraps `.today-grid` gives the new components a free fade-up on mount.

### 5. Tests

New tests:

- `components/__tests__/DayArc.test.tsx`: renders with populated forecast + summaries; renders gracefully with no forecast; computes `aria-label` from data; maps click on student dot to `onStudentClick`.
- `components/__tests__/TodayStory.test.tsx`: each template rule produces the expected narrative; falls back to "first plan" text with no data.

Updated test:

- `panels/__tests__/TodayPanel.test.tsx`: existing assertions continue to pass. If any assertions accidentally depended on scroll/card order, update them minimally.

## Out of scope

- No new data endpoints — the dashboard uses what's already fetched (`TodaySnapshot`, `ClassroomHealth`, `StudentSummary[]`, `ClassroomProfile`).
- No new model-routed prompts. Narrative text is deterministic templating.
- No changes to `services/orchestrator` or `packages/shared`.
- No replacement of existing viz — only additive hero + craft polish.

## Risks & mitigations

- **Visual regression on TodayPanel tests**: new components render above the existing ones. Existing assertions look up by role/text, so they should still find their targets. Verified in design.
- **Motion on low-power devices**: all motion gated behind `prefers-reduced-motion`.
- **Color contrast**: all new elements use semantic tokens already validated by `npm run check:contrast`. New CSS will be added to the contrast-tested token space only.
- **Student-to-block mapping ambiguity**: the data model doesn't attach students to blocks. Rather than fake this, the student constellation uses a deterministic urgency-rank → x-position mapping (most urgent leftmost). This is honest about the data and still gives a meaningful "read left to right" priority queue.
- **Responsive**: Day Arc uses `viewBox` + `max-width: 100%`. On narrow screens it compresses rather than scrolls.

## Validation plan

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test` (vitest — must pass all web tests)
4. `npm run check:contrast`
5. Dev-server spot-check in both light and dark themes if time allows.
