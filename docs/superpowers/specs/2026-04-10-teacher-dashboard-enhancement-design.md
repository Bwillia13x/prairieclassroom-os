# Teacher Dashboard Enhancement — Design Spec

**Date:** 2026-04-10
**Approach:** Layered Dashboard (progressive disclosure on Today panel)
**Scope:** Four structural enhancements — Health Bar, Sparkline Trends, Student Roster, Drill-Down Drawer

## Overview

The Today panel currently works as a triage-first command center: it shows what's broken (debt register), then what was planned (plan recap, forecast). This design extends it with four features that add positive reinforcement, temporal depth, student-centric views, and interactive navigation — all without changing the shell navigation structure.

The guiding principle is **progressive disclosure**: the initial load remains the same fast triage experience. New sections load data lazily and expand on demand. The teacher's mental model stays "open Today, see what needs attention, then drill deeper."

### What does NOT change

- Shell navigation groups (Today / Prep / Ops / Review)
- Tab structure — Today remains a single-tab group
- Existing card order: TimeSuggestion → PendingActions → Recommended Step → PlanRecap → Forecast
- API contract for `GET /api/today/:classroomId` — all new data comes from new endpoints
- Auth model — new endpoints respect the same `X-Classroom-Code` enforcement

## Section 1: Health Bar (Success States)

### Purpose

Flip the dashboard from deficit-only to balanced. Surface positive signals — streaks, consistency, throughput — so the tool feels like a partner, not a scorecard.

### Placement

A horizontal status strip rendered directly above PendingActionsCard. One row, no vertical scroll cost.

### Indicators

| Indicator | Source | Display |
|-----------|--------|---------|
| Follow-up streak | Consecutive days with 0 `stale_followup` debt | `"4-day streak — no stale follow-ups"` with streak icon. Resets to 0 when debt appears. |
| Planning consistency | Plans generated in last 7 days | `"5 of 7 days planned"` as a 7-dot row (filled = plan exists) |
| Approval cadence | Approved vs total messages in last 14 days | `"12 of 14 messages approved"` — throughput, not backlog |
| Overall health | Composite: 0 pending actions + streak >= 2 + plan exists | Tonal chip: `"On track"` (success) / `"Catching up"` (pending) / `"Needs attention"` (warning) |

### Rendering rules

- Fresh classroom (zero historical data): single muted chip — `"Health tracking starts after your first plan or intervention"`. No empty dots or zeroes.
- Streaks cap display at 30 days.
- Uses existing `StatusChip` component for each indicator.

### Component

`HealthBar` — new component in `components/`. Receives pre-computed health data as props.

### Backend

New endpoint: `GET /api/classrooms/:id/health`

```ts
interface ClassroomHealth {
  streak_days: number;
  plans_last_7: boolean[];    // 7 entries, today → 6 days ago
  messages_approved: number;
  messages_total: number;
}
```

Computed from existing SQLite history tables. No new data capture.

## Section 2: Sparkline Trends (Trend Visualization)

### Purpose

Add temporal context to point-in-time cards. The teacher sees "3 stale follow-ups" AND that the number is trending down. Distinguishes "bad" from "bad but improving."

### What it is

Tiny inline SVG line charts (~80x24px) embedded in three existing card headers. No axes, no labels — just a line with an optional trend arrow. Color follows the card's section tone.

### Placement

| Card | Sparkline shows | Data window |
|------|----------------|-------------|
| PendingActionsCard header | Total pending-action count over time | Last 14 days |
| PlanRecap header | Plans generated per day | Last 14 days |
| Forecast section header | Peak complexity level per day | Last 14 days |

### Rendering rules

- Minimum 3 data points to render. Below that, sparkline is absent (no placeholder).
- Rightmost point (today) gets a small dot to anchor the eye.
- Trend arrow appears when 3-day rolling average differs from 14-day average by >20%. Otherwise no arrow.
- `aria-hidden="true"` with visually-hidden text: `"Trending down over 14 days"` or `"Stable over 14 days"`.

### Component

`Sparkline` — new component in `components/`.

```ts
interface SparklineProps {
  data: number[];
  tone: SectionTone;
  label?: string; // sr-only trend description
}
```

Pure SVG, no chart library. Rendered as a flex sibling next to the `<h3>` in existing card headers.

### Backend

Extend the `/api/classrooms/:id/health` response:

```ts
interface ClassroomHealth {
  // ...existing fields from Section 1...
  trends: {
    debt_total_14d: number[];      // daily total pending actions, oldest first
    plans_14d: number[];           // daily plan count (0 or 1), oldest first
    peak_complexity_14d: number[]; // daily peak complexity (0=none, 1=low, 2=med, 3=high)
  };
}
```

One aggregation query per series, indexed by date.

## Section 3: Student Roster (Student-Centric View)

### Purpose

Invert the index from function-organized to student-organized. Let the teacher answer "How is Amira doing?" without mentally joining data across 4 panels.

### What it is

A collapsible section below the Forecast section. Collapsed by default. When expanded, renders a grid of compact student cards.

### Collapse behavior

- Header always visible: `"Students · 3 need attention"` with chevron toggle.
- Collapsed state persisted to `localStorage` key `prairie-roster-expanded`.
- Expanding triggers a fetch to load student summaries — data not loaded until first open.
- "Need attention" count in the header comes from the already-loaded debt register — students appearing in any debt item's `student_refs`.

### Student card layout

```
┌──────────────────────────┐
│  Amira              ▲ 2  │  name + pending action count
│  ──────────────────────  │
│  ● Last intervention: 3d │  days since last intervention
│  ● Patterns: 1 active    │  unresolved pattern count
│  ● Messages: 1 pending   │  unapproved message count
│  ──────────────────────  │
│  ⚡ Transition difficulty │  most recent support priority reason
│                    View → │  opens drill-down drawer
└──────────────────────────┘
```

### Rendering rules

- Sorted: students with pending actions first (descending), then alphabetically.
- Students with zero activity: muted card showing name + `"No recent activity"`.
- Grid: `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`.
- Cards with pending actions: left border `--color-border-warning`. Clear cards: `--color-border`.
- Max 30 cards initially. `"Show all N students"` button if more.

### Component

`StudentRoster` — new component in `components/`. Contains `StudentCard` sub-component.

### Backend

New endpoint: `GET /api/classrooms/:id/student-summary`

```ts
interface StudentSummary {
  alias: string;
  pending_action_count: number;
  last_intervention_days: number | null;
  active_pattern_count: number;
  pending_message_count: number;
  latest_priority_reason: string | null;
}
```

Returns one entry per student. Aggregated from interventions, patterns, messages, and debt tables.

## Section 4: Drill-Down Drawer (Interactive Drill-Down)

### Purpose

Connect existing cards into a navigable web. Click any data point to see its full context without leaving the Today page.

### What it is

A slide-out panel (right edge, ~420px desktop, full-width mobile) that opens when the teacher clicks an interactive element. Extends the existing `HistoryDrawer` pattern — same animation, close behavior, focus trap.

### Trigger points

| Click target | Drawer title | Drawer content |
|---|---|---|
| Forecast timeline block | `"9:00 AM — Math · High complexity"` | Contributing factors, suggested mitigation, linked interventions, related students |
| Student card "View →" | `"Amira — Student Detail"` | Recent interventions (last 5), active patterns, pending messages, family follow-up history, support priorities. Sub-sections collapsible. |
| PendingActionsCard item | `"3 stale follow-ups"` | Actual debt items: student name, observation, days since. "Log follow-up" button → Intervention panel with prefill. |
| PlanRecap support priority | `"Brody — early finisher"` | Opens student drawer pre-scrolled to relevant priority |
| Sparkline (any) | `"Pending actions — 14-day trend"` | Enlarged chart (~300px tall) with daily values, date axis, hover tooltips |

### Component design

```
DrillDownDrawer
├── props: { type, context, onClose }
├── type discriminator selects sub-view:
│   ├── "forecast-block" → ForecastBlockDetail
│   ├── "student" → StudentDetail
│   ├── "debt-category" → DebtItemList
│   └── "trend" → TrendDetail
└── shared: header (title + close), scrollable body, focus trap
```

Single component with a type discriminator — not 4 separate drawers. The existing `HistoryDrawer` is refactored into `DrillDownDrawer` as the `"history"` sub-view, preserving its current list-of-records behavior. The standalone `HistoryDrawer` component is then deprecated and removed.

### Interaction

- Close on Escape, close on backdrop click, focus trap matching `ClassroomAccessDialog`.
- Shows `SkeletonLoader` while data loads.
- If data already loaded (e.g., student summary from roster), passed as initial data to skip skeleton.

### Cross-navigation from inside drawer

- "Log follow-up" on debt item → close drawer, navigate to Intervention panel with `InterventionPrefill`
- "Draft message" on student detail → close drawer, navigate to Family Message panel with `FamilyMessagePrefill`
- Uses existing `onTabChange` + prefill dispatch pattern in `App.tsx`.

### Backend

No new endpoints. Composes from:
- `GET /api/classrooms/:id/student-summary` (Section 3, with optional `?student=` filter)
- `GET /api/classrooms/:id/interventions` (existing, adding optional `?student=` filter)
- `GET /api/classrooms/:id/patterns` (existing, adding optional `?student=` filter)
- `GET /api/classrooms/:id/messages` (existing, adding optional `?student=` filter)
- `GET /api/classrooms/:id/health` (Sections 1-2, for trend enlargement)

The only backend addition is supporting an optional `?student=` query parameter on the existing history endpoints to filter by student ref.

## Data Flow Summary

### New endpoints

| Endpoint | When fetched | Payload size |
|----------|-------------|--------------|
| `GET /api/classrooms/:id/health` | On Today panel mount (alongside existing snapshot) | Small — scalars + 3 arrays of 14 numbers |
| `GET /api/classrooms/:id/student-summary` | On roster expand (lazy) | Medium — one object per student |

### Modified endpoints

| Endpoint | Change |
|----------|--------|
| `GET /api/classrooms/:id/interventions` | Add optional `?student=` query filter |
| `GET /api/classrooms/:id/patterns` | Add optional `?student=` query filter |
| `GET /api/classrooms/:id/messages` | Add optional `?student=` query filter |

### Loading sequence

1. **Initial mount** (unchanged): `GET /api/today/:classroomId` → renders TimeSuggestion, PendingActions, Recommended Step, PlanRecap, Forecast
2. **Parallel on mount**: `GET /api/classrooms/:id/health` → renders Health Bar + sparklines in card headers
3. **On roster expand** (lazy): `GET /api/classrooms/:id/student-summary` → renders student cards
4. **On drill-down open** (lazy): targeted fetches based on drawer type → renders drawer content

### New components

| Component | File | Depends on |
|-----------|------|------------|
| `HealthBar` | `components/HealthBar.tsx` + `.css` | `StatusChip` |
| `Sparkline` | `components/Sparkline.tsx` | None (pure SVG) |
| `StudentRoster` | `components/StudentRoster.tsx` + `.css` | `StudentCard`, `DrillDownDrawer` |
| `StudentCard` | `components/StudentCard.tsx` + `.css` | `SectionIcon` |
| `DrillDownDrawer` | `components/DrillDownDrawer.tsx` + `.css` | `SkeletonLoader`, `SectionIcon`, `StatusChip` |
| `ForecastBlockDetail` | `components/ForecastBlockDetail.tsx` | None |
| `StudentDetail` | `components/StudentDetail.tsx` | None |
| `DebtItemList` | `components/DebtItemList.tsx` | None |
| `TrendDetail` | `components/TrendDetail.tsx` | `Sparkline` (enlarged) |

### Modified components

| Component | Change |
|-----------|--------|
| `TodayPanel` | Add HealthBar, pass sparkline data to cards, add StudentRoster, wire drill-down triggers |
| `PendingActionsCard` | Accept sparkline data prop, make items clickable for drill-down |
| `PlanRecap` | Accept sparkline data prop, make priority items clickable |
| `ForecastTimeline` | Wire existing `onBlockClick` prop to open drill-down |

## Design tokens

All new components use existing tokens from `styles/tokens.css`. No new tokens required. Follow established hierarchy:
- `--radius-lg` for drawer panel
- `--radius-md` for student cards and roster container
- `--radius-sm` for inner elements
- `--motion-fast` / `--motion-base` for transitions
- `--font-weight-*` tokens for typography
- `--space-*` tokens for spacing

## Accessibility

- Health Bar indicators include `aria-label` descriptions
- Sparklines are `aria-hidden="true"` with visually-hidden trend text
- Student cards are focusable buttons with descriptive `aria-label`
- Drill-down drawer uses focus trap, Escape to close, backdrop click to close
- Roster collapse toggle has `aria-expanded` and `aria-controls`
- All new interactive elements meet 44x44px minimum tap target
