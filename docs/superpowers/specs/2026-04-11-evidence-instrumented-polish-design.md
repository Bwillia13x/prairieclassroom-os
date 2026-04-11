# Evidence-Instrumented Polish — Design Spec

**Date:** 2026-04-11
**Status:** Approved
**Scope:** Product depth & polish (B) + Evidence & credibility (C), interleaved

## Problem Statement

PrairieClassroom OS is production-hardened with 595 tests, 99 eval cases, 12 prompt classes, and comprehensive security. The architecture is mature. Two gaps remain:

1. **Product polish**: 10 panels work but share no component library, each handles its own loading/error/empty states, there's no design token system, and frontend test coverage is minimal (1 test file for the entire web app).
2. **Evidence & credibility**: The system proves structural correctness through eval gates, but has no mechanism to demonstrate pedagogical value — no feedback aggregation, no session workflow capture, no structured evidence for external audiences (judges, administrators, researchers).

These gaps reinforce each other: a polished product generates better evidence, and evidence validates which polish matters.

## Strategic Approach

**Evidence-Instrumented Polish** — every UI improvement simultaneously generates evidence data. The design system emerges from shared components that both polish and evidence infrastructure require. Two goals collapse into one stream of work.

## Architecture

Five layers, built bottom-up:

```
Layer 5: Credibility Artifacts (docs/evidence/, pilot templates, demo script)
Layer 4: Usage Insights Panel (new Review-group panel)
Layer 3: Panel Polish (10 panels migrated to shared components + tokens)
Layer 2: Feedback & Evidence Pipeline (backend + session capture)
Layer 1: Shared Component Library + Design Tokens (foundation)
```

Dependencies flow upward: Layer 1 supports everything above; Layer 2 enables Layers 4-5; Layer 3 uses Layer 1 and instruments with Layer 2.

---

## Layer 1: Shared Component Library + Design Tokens

### Design Tokens (`apps/web/src/tokens.css`)

CSS custom properties defining the visual language:

```
/* Color palette */
--color-surface, --color-surface-raised, --color-surface-sunken
--color-border, --color-border-subtle
--color-text-primary, --color-text-secondary, --color-text-muted
--color-accent, --color-accent-hover, --color-accent-subtle
--color-success, --color-warning, --color-danger
--color-info

/* Spacing scale (4px base) */
--space-1 through --space-12

/* Type scale */
--text-xs through --text-2xl
--font-sans, --font-mono
--leading-tight, --leading-normal, --leading-relaxed

/* Border radii */
--radius-sm, --radius-md, --radius-lg, --radius-full

/* Shadows */
--shadow-sm, --shadow-md, --shadow-lg

/* Transitions */
--transition-fast (150ms), --transition-normal (250ms)
```

### Shared Components (`apps/web/src/components/shared/`)

8 primitives extracted from existing panel patterns:

#### `StatusCard`
- Props: `title`, `status` (idle | loading | success | error | empty), `children`, `actions?`, `className?`
- Renders consistent card with header bar, status badge, and content area
- Loading state: skeleton placeholder
- Error state: red border + message + retry button
- Empty state: delegates to `EmptyState`

#### `ActionButton`
- Props: `variant` (primary | secondary | danger), `loading?`, `disabled?`, `onClick`, `children`
- Loading state: inline spinner replaces text, button disabled
- Keyboard accessible: Enter and Space trigger

#### `ResultDisplay`
- Props: `result` (structured output object), `promptClass`, `onCopy?`, `onExpand?`, `children?`
- Renders structured model output with section headers
- Copy-to-clipboard on result sections
- Expandable/collapsible sections for long outputs
- Slot for FeedbackCollector below result

#### `FormSection`
- Props: `label`, `description?`, `error?`, `charCount?`, `maxChars?`, `children`
- Labeled input group with validation feedback
- Character counter when `maxChars` provided
- Error styling on validation failure

#### `FeedbackCollector`
- Props: `panelId`, `promptClass`, `classroomId`, `generationId?`
- Collapsed by default: "Rate this result" link
- Expanded: 1-5 star rating + 200-char optional text
- Submits to `POST /api/feedback`; falls back to localStorage on failure
- Renders non-intrusively below results

#### `SessionBanner`
- Props: `classroom` (name, health, protection status)
- Ambient bar at top of shell showing active classroom context
- Health indicator dot (green/yellow/red)
- Classroom name + grade level

#### `DataVizCard`
- Sub-components: `Sparkline`, `TrendIndicator`, `HealthDot`, `ProgressBar`
- `Sparkline`: SVG line chart, 7-14 data points, no axis labels (ambient)
- `TrendIndicator`: up/down/flat arrow with percentage
- `HealthDot`: colored circle with tooltip
- `ProgressBar`: labeled bar with percentage

#### `EmptyState`
- Props: `icon?`, `title`, `description`, `action?` (label + onClick)
- Consistent empty-data messaging across all panels
- Optional call-to-action button

### Testing

Each component gets a `.test.tsx` file in `apps/web/src/components/shared/__tests__/`:
- Render in default state
- Loading state rendering
- Error state rendering
- Empty state rendering (where applicable)
- Keyboard navigation (focus, Enter, Space)
- ARIA attribute verification
- Callback invocation (onClick, onSubmit)

---

## Layer 2: Feedback & Evidence Pipeline

### Backend Routes (services/orchestrator)

#### `POST /api/feedback`
```
Request:
  classroomId: ClassroomId (branded)
  panelId: string (enum of 10 panel IDs + "usage-insights")
  promptClass: string (enum of 12 prompt classes, optional)
  rating: number (1-5)
  comment: string (max 200 chars, optional)
  generationId: string (optional, links to specific output)
  sessionId: string (from useSessionContext)

Response:
  { id: string, created_at: string }
```
- Zod-validated in packages/shared
- Stored in per-classroom SQLite `feedback` table
- Rate limited: 20 per 60s per IP (generous — feedback is low-frequency)
- Auth: classroom-code required on protected classrooms (same as generation routes); demo classroom bypasses

#### `GET /api/feedback/summary/:classroomId`
```
Response:
  {
    total: number,
    byPanel: Record<panelId, { count, avgRating, recentComments[] }>,
    byWeek: { week: string, count, avgRating }[],
    topComments: { text, panelId, rating, created_at }[]
  }
```
- Aggregated from feedback table
- Powers the Usage Insights panel
- No auth required beyond classroom-code (same as other classroom routes)

#### `POST /api/sessions`
```
Request:
  classroomId: ClassroomId
  sessionId: string
  startedAt: string (ISO)
  endedAt: string (ISO)
  panelsVisited: string[] (ordered)
  generationsTriggered: { panelId, promptClass, timestamp }[]
  feedbackGiven: number (count)

Response:
  { id: string }
```
- Captures teacher workflow sequences
- Sent on tab close (visibilitychange) or classroom switch

#### `GET /api/sessions/summary/:classroomId`
```
Response:
  {
    totalSessions: number,
    avgDurationMinutes: number,
    commonFlows: { sequence: string[], count: number }[],
    panelTimeDistribution: Record<panelId, avgMinutes>,
    generationsPerSession: number
  }
```
- Aggregated workflow patterns
- Powers the Usage Insights panel

### Database Schema (services/memory)

New migration `002_feedback_and_sessions.sql`:

```sql
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  panel_id TEXT NOT NULL,
  prompt_class TEXT,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  generation_id TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_feedback_classroom ON feedback(classroom_id, created_at);
CREATE INDEX idx_feedback_panel ON feedback(panel_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  panels_visited TEXT NOT NULL, -- JSON array
  generations_triggered TEXT NOT NULL, -- JSON array
  feedback_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_classroom ON sessions(classroom_id, created_at);
```

### Frontend Hooks (`apps/web/src/hooks/`)

#### `useSessionContext`
- Generates unique session ID on mount
- Tracks: panels visited (ordered), time entered each panel, generations triggered
- Exposes: `recordPanelVisit(panelId)`, `recordGeneration(panelId, promptClass)`, `recordFeedback()`
- Submits session summary to `POST /api/sessions` on `visibilitychange` (hidden) or classroom switch
- Falls back to localStorage queue if backend unreachable; retries on next session start

#### `useFeedback`
- Wraps feedback submission: `submitFeedback({ panelId, promptClass, rating, comment })`
- Handles optimistic UI (show submitted state immediately)
- Falls back to localStorage on network failure

### Shared Schemas (packages/shared)

New files:
- `schemas/feedback.ts` — FeedbackRequest, FeedbackResponse, FeedbackSummary
- `schemas/session.ts` — SessionRequest, SessionResponse, SessionSummary

---

## Layer 3: Panel Polish

### Migration Pattern (applied to all 10 panels)

For each panel:
1. Replace inline loading/error/empty rendering with StatusCard
2. Replace custom buttons with ActionButton
3. Wrap generation results in ResultDisplay
4. Replace input groups with FormSection
5. Add FeedbackCollector below each generation result
6. Replace hardcoded CSS values with design token references
7. Instrument with useSessionContext hooks
8. Add panel test file

### Priority Order

1. **TodayPanel** — Dashboard hub. Add DataVizCard sparklines for 7-day planning consistency, health trend, intervention frequency. Improve triage grid layout. Add SessionBanner integration.
2. **DifferentiatePanel** — Most-used generation. Add side-by-side variant comparison view. Clean input flow with FormSection. Add FeedbackCollector.
3. **FamilyMessagePanel** — Safety-critical. Refine approval workflow visual clarity. Add tone indicator. Improve draft/approved state transitions.
4. **TomorrowPlanPanel** — Daily planning. Add timeline visualization for schedule blocks. Show retrieval context that informed the plan.
5. **ForecastPanel** — Add DataVizCard trend visualization. Reframe outputs as actionable recommendations.
6. **EABriefingPanel** — Add structured section layout with collapsible areas. Add printable view (CSS print media query).
7. **InterventionPanel** — Add intervention history timeline. Link to related pattern reports.
8. **SupportPatternsPanel** — Add trend overlay visualization. Improve pattern-to-action framing.
9. **LanguageToolsPanel** — Refine language selector UX. Add vocab card preview grid.
10. **SurvivalPacketPanel** — Add section navigation. Add printable layout.

### Frontend Test Coverage

Each panel gets `<PanelName>.test.tsx`:
- Renders without crashing
- Shows loading state when generation in progress
- Shows error state on API failure
- Handles user interaction (form submit, button click)
- FeedbackCollector renders after generation
- Keyboard accessibility (tab order, Enter to submit)

---

## Layer 4: Usage Insights Panel

### New panel in Review group: "Usage Insights"

**Tab ID:** `usage-insights`
**Nav group:** Review (alongside Support Patterns)
**Route:** Renders from `GET /api/feedback/summary/:classroomId` + `GET /api/sessions/summary/:classroomId`

### Layout

Four sections:

1. **Feedback Overview**
   - Average rating across all panels (large number)
   - Rating distribution bar (1-5 stars)
   - Recent comments list (most recent 10)
   - Per-panel rating breakdown (sorted by usage)

2. **Workflow Patterns**
   - Most common panel sequences (e.g., "Today -> Differentiate -> Family Message")
   - Average session duration
   - Sessions per week trend (Sparkline)

3. **Generation Activity**
   - Generations per panel (horizontal bar chart)
   - Generations per week trend (Sparkline)
   - Most active time-of-day distribution

4. **Panel Engagement**
   - Time spent per panel (horizontal bar chart)
   - Most/least visited panels
   - Panels with highest/lowest feedback ratings

### Framing

Teacher-facing language, not analytics jargon:
- "How your classroom uses PrairieClassroom" not "Usage Analytics"
- "Teachers find Differentiate most helpful" not "Highest engagement metric"
- "Your most common workflow" not "Top session sequences"

---

## Layer 5: Credibility Artifacts

### Pilot Observation Template (`docs/pilot/observation-template.md`)

Structured markdown form for recording classroom observations:
- Observer info (name, role, date)
- Setup section (time to launch, initial teacher reaction, any friction)
- Workflow section (which panels used, in what order, for what purpose)
- Outcome section (what the teacher produced, how it was used, student impact observed)
- Friction section (confusion points, errors, workarounds)
- Surprises section (unexpected uses, teacher insights)
- Recommendations section (observer's assessment)

### Evidence Portfolio (`docs/evidence/`)

Auto-generated reports from system data:

- `feedback-summary.md` — Aggregated from feedback table: ratings by panel, trend over time, notable comments
- `session-patterns.md` — Aggregated from sessions table: common workflows, engagement metrics, time distribution
- `eval-quality-report.md` — Aggregated from release gate artifacts: pass rates by prompt class, regression history
- `system-reliability.md` — Aggregated from request logs: uptime, latency percentiles, error rates, injection detection stats

### Evidence Generation Commands

- `npm run evidence:generate` — Runs aggregation scripts, writes markdown reports to `docs/evidence/`
- `npm run evidence:snapshot` — Copies `docs/evidence/` to `output/evidence-snapshots/YYYY-MM-DD/` for submission

### Demo Script Revision (`docs/demo-script.md`)

Two tracks:
1. **5-minute stakeholder pitch** — Problem → Solution → Evidence → Safety → Ask
2. **15-minute teacher walkthrough** — Morning routine → Differentiation → Family communication → Review cycle

Each track annotated with evidence callouts referencing data from the Usage Insights panel and evidence portfolio.

---

## Scope Boundaries

### In Scope
- 8 shared UI components + design tokens
- 2 new backend routes (feedback, sessions) + 2 summary routes
- 1 new SQLite migration (2 tables)
- 2 new frontend hooks
- 2 new shared schema files
- 10 panel migrations to shared components
- 10 panel test files + 8 shared component test files
- 1 new panel (Usage Insights)
- Evidence generation scripts + portfolio structure
- Pilot observation template
- Demo script revision

### Out of Scope
- Ollama unblocking or deployment readiness
- Cross-classroom aggregation or multi-school dashboards
- New prompt classes
- Vertex/paid lane work
- Student-facing features
- External system integrations (webhooks, SSO)
- Mobile app or PWA conversion

### Risk Mitigations
- Design tokens are additive — existing CSS continues to work during migration
- Feedback pipeline degrades gracefully to localStorage
- Session capture uses visibilitychange, not beforeunload (more reliable)
- Panel migration is incremental — each panel is independently shippable
- No new inference costs — all new routes are deterministic retrieval/storage

---

## Success Criteria

1. All 10 panels use shared components and design tokens consistently
2. Every generation result has a FeedbackCollector
3. Session workflows are captured and visible in Usage Insights
4. Frontend test coverage: every panel + every shared component has tests
5. `npm run evidence:generate` produces readable evidence portfolio
6. `npm run release:gate` continues to pass (no regressions)
7. Demo script covers both 5-minute and 15-minute tracks with evidence callouts
