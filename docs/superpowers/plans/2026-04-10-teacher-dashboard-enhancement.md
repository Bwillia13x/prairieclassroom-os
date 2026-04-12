# Teacher Dashboard Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the Today panel with a Health Bar (success states), inline sparkline trends, a collapsible student roster, and a type-discriminated drill-down drawer — all using progressive disclosure so the initial triage experience stays fast.

**Architecture:** The existing Today panel gains four new sections stacked below the current content. Two new backend endpoints (`/api/classrooms/:id/health` and `/api/classrooms/:id/student-summary`) provide pre-aggregated data. Existing history endpoints gain optional `?student=` filtering. A single `DrillDownDrawer` component replaces the existing `HistoryDrawer` with a type-discriminated sub-view system. All new components use existing design tokens and accessibility patterns.

**Tech Stack:** Vite + React (TSX), Express orchestrator, better-sqlite3 memory layer, Zod shared schemas, Vitest for testing.

**Spec:** `docs/superpowers/specs/2026-04-10-teacher-dashboard-enhancement-design.md`

---

## File Map

### New files — Backend

| File | Responsibility |
|------|---------------|
| `packages/shared/schemas/health.ts` | Zod schema for `ClassroomHealth` response |
| `packages/shared/schemas/student-summary.ts` | Zod schema for `StudentSummary` response |
| `services/memory/health.ts` | SQLite queries for health metrics and trends |
| `services/memory/student-summary.ts` | SQLite queries for per-student aggregation |
| `services/orchestrator/routes/classroom-health.ts` | Express route for `GET /api/classrooms/:id/health` |
| `services/orchestrator/routes/student-summary.ts` | Express route for `GET /api/classrooms/:id/student-summary` |
| `services/orchestrator/__tests__/classroom-health.test.ts` | Tests for health retrieval |
| `services/orchestrator/__tests__/student-summary.test.ts` | Tests for student summary retrieval |
| `services/orchestrator/__tests__/history-student-filter.test.ts` | Tests for `?student=` filter on history endpoints |

### New files — Frontend

| File | Responsibility |
|------|---------------|
| `apps/web/src/components/HealthBar.tsx` + `.css` | Health strip with streak, planning dots, approval cadence, overall chip |
| `apps/web/src/components/Sparkline.tsx` | Reusable inline SVG sparkline |
| `apps/web/src/components/StudentRoster.tsx` + `.css` | Collapsible student card grid |
| `apps/web/src/components/DrillDownDrawer.tsx` + `.css` | Type-discriminated slide-out drawer |

### Modified files

| File | Change |
|------|--------|
| `packages/shared/schemas/index.ts` | Export new health and student-summary schemas |
| `services/memory/retrieve.ts` | Add optional `studentRef` param to `getRecentInterventions`, `getRecentMessages` |
| `services/orchestrator/routes/history.ts` | Accept optional `?student=` query param on interventions, messages |
| `services/orchestrator/server.ts` | Mount two new route modules |
| `apps/web/src/types.ts` | Add `ClassroomHealth`, `StudentSummary`, `DrillDownContext` types |
| `apps/web/src/api.ts` | Add `fetchClassroomHealth`, `fetchStudentSummary`, student-filtered history functions |
| `apps/web/src/panels/TodayPanel.tsx` + `.css` | Wire HealthBar, sparklines, StudentRoster, drill-down triggers |
| `apps/web/src/components/PendingActionsCard.tsx` | Accept `onItemClick` and `sparklineData` props |
| `apps/web/src/components/PlanRecap.tsx` | Accept `onPriorityClick` and `sparklineData` props |
| `apps/web/src/App.tsx` | Pass prefill callbacks to TodayPanel |

---

## Task 1: Shared schemas for health and student summary

**Files:**
- Create: `packages/shared/schemas/health.ts`
- Create: `packages/shared/schemas/student-summary.ts`
- Modify: `packages/shared/schemas/index.ts`

- [ ] **Step 1: Create the health schema**

Create `packages/shared/schemas/health.ts` with a Zod schema defining `ClassroomHealthSchema` with fields: `streak_days` (int, min 0), `plans_last_7` (array of 7 booleans), `messages_approved` (int, min 0), `messages_total` (int, min 0), and `trends` object containing `debt_total_14d` (array of ints), `plans_14d` (array of 0/1 ints), `peak_complexity_14d` (array of 0-3 ints). Export the schema and inferred type.

- [ ] **Step 2: Create the student summary schema**

Create `packages/shared/schemas/student-summary.ts` with `StudentSummarySchema`: `alias` (string), `pending_action_count` (int, min 0), `last_intervention_days` (int, min 0, nullable), `active_pattern_count` (int, min 0), `pending_message_count` (int, min 0), `latest_priority_reason` (string, nullable). Export schema and type.

- [ ] **Step 3: Export from barrel**

Add exports for `ClassroomHealthSchema`, `ClassroomHealth`, `StudentSummarySchema`, `StudentSummary` to `packages/shared/schemas/index.ts`.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

Stage `packages/shared/schemas/health.ts`, `packages/shared/schemas/student-summary.ts`, `packages/shared/schemas/index.ts`. Commit with message: `feat: add ClassroomHealth and StudentSummary shared schemas`

---

## Task 2: Health retrieval queries

**Files:**
- Create: `services/memory/health.ts`
- Create: `services/orchestrator/__tests__/classroom-health.test.ts`

- [ ] **Step 1: Write the failing test**

Create `services/orchestrator/__tests__/classroom-health.test.ts` using the test patterns from `today.test.ts`: import `getDb`, `closeAll`, `unsafeCastClassroomId`. Use test classroom `"test-health-classroom"`. Write 4 tests:

1. `returns zeroed health for empty classroom` — assert streak=0, all plans_last_7 false, messages 0/0, all trend arrays length 14
2. `counts streak_days as consecutive days with no stale follow-ups` — insert a follow_up_needed intervention 2 days ago, assert streak < 2
3. `counts plans_last_7 correctly` — insert plans for today and yesterday, assert [0]=true, [1]=true, [2]=false
4. `counts messages_approved and messages_total` — insert 3 messages (2 approved, 1 not), assert total=3, approved=2

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run services/orchestrator/__tests__/classroom-health.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement health retrieval**

Create `services/memory/health.ts` with function `getClassroomHealth(classroomId: ClassroomId): ClassroomHealth` that:

- **streak_days**: iterates from today backward (max 30 days). For each day, checks if any stale follow-up exists (intervention with `follow_up_needed=true` created before `dayStart - 5 days` with no subsequent intervention for the same students by `dayEnd`). Breaks on first day with stale items.
- **plans_last_7**: for each of 7 days from today, checks if any plan was created in that day window.
- **messages_approved/total**: counts family_messages in last 14 days, summing `teacher_approved`.
- **trends.debt_total_14d**: for each of 14 days (oldest first), counts stale follow-ups + unapproved messages as of that day.
- **trends.plans_14d**: for each of 14 days, 1 if plan exists, 0 if not.
- **trends.peak_complexity_14d**: for each of 14 days, parses latest forecast of that day, maps block levels to 0-3, returns max.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run services/orchestrator/__tests__/classroom-health.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

Stage `services/memory/health.ts` and `services/orchestrator/__tests__/classroom-health.test.ts`. Commit: `feat: add health retrieval queries with streak, plans, messages, trends`

---

## Task 3: Student summary retrieval queries

**Files:**
- Create: `services/memory/student-summary.ts`
- Create: `services/orchestrator/__tests__/student-summary.test.ts`

- [ ] **Step 1: Write the failing test**

Create `services/orchestrator/__tests__/student-summary.test.ts`. Use test classroom `"test-student-summary"` with 2 students (Amira and Brody). Write 4 tests:

1. `returns one summary per student with zero counts when no data` — assert length 2, all counts 0, nulls where expected
2. `counts pending messages for each student` — insert 1 unapproved message for Amira, assert Amira.pending_message_count=1, Brody=0
3. `computes last_intervention_days` — insert intervention for Amira 3 days ago, assert last_intervention_days=3
4. `picks latest_priority_reason from most recent plan` — insert plan with support priority for Amira, assert reason matches

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run services/orchestrator/__tests__/student-summary.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement student summary retrieval**

Create `services/memory/student-summary.ts` with function `getStudentSummaries(classroomId, students): StudentSummary[]` that:

- Precompiles SQLite statements for pending messages (unapproved, filtered by student_ref via `json_each`), last intervention date, latest plan priorities, and latest pattern report focus items.
- Iterates over each student, computing: `pending_action_count` (pending messages + active patterns), `last_intervention_days` (days since most recent), `active_pattern_count` (from latest pattern report suggested_focus), `pending_message_count`, `latest_priority_reason` (from latest plan's support_priorities).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run services/orchestrator/__tests__/student-summary.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

Stage and commit: `feat: add student summary retrieval with per-student aggregation`

---

## Task 4: Backend routes — classroom health and student summary

**Files:**
- Create: `services/orchestrator/routes/classroom-health.ts`
- Create: `services/orchestrator/routes/student-summary.ts`
- Modify: `services/orchestrator/server.ts`

- [ ] **Step 1: Create classroom health route**

Create `services/orchestrator/routes/classroom-health.ts` following the pattern from `routes/history.ts`: export `createClassroomHealthRouter(deps)`, create Router, add auth middleware, handle `GET /:id/health` by calling `getClassroomHealth(classroomId)` and returning JSON. Catch errors with 500 response.

- [ ] **Step 2: Create student summary route**

Create `services/orchestrator/routes/student-summary.ts`: handle `GET /:id/student-summary`. Load classroom profile. Support optional `?student=` query param to filter `classroom.students` before calling `getStudentSummaries`. Return `{ summaries }`. 404 if classroom not found.

- [ ] **Step 3: Mount routes in server.ts**

Import both new route factories. Mount them under `/api/classrooms` after the existing history router mount:
```
app.use("/api/classrooms", createClassroomHealthRouter(deps));
app.use("/api/classrooms", createStudentSummaryRouter(deps));
```

- [ ] **Step 4: Run typecheck and tests**

Run: `npm run typecheck && npm run test`
Expected: PASS

- [ ] **Step 5: Commit**

Stage and commit: `feat: add /api/classrooms/:id/health and /api/classrooms/:id/student-summary routes`

---

## Task 5: Add student filter to history endpoints

**Files:**
- Modify: `services/memory/retrieve.ts`
- Modify: `services/orchestrator/routes/history.ts`
- Create: `services/orchestrator/__tests__/history-student-filter.test.ts`

- [ ] **Step 1: Write the failing test**

Create test file. Insert interventions for Amira and Brody, a message for Amira only. Test:
1. `getRecentInterventions` returns all when no filter
2. `getRecentInterventions` with student filter returns only matching records
3. `getRecentMessages` filters by student

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run services/orchestrator/__tests__/history-student-filter.test.ts`
Expected: FAIL — `getRecentInterventions` doesn't accept third argument

- [ ] **Step 3: Add student filter to retrieve.ts**

Update `getRecentInterventions(classroomId, limit, studentRef?)`: when `studentRef` is provided, delegate to existing `getStudentInterventions`. Update `getRecentMessages(classroomId, limit, studentRef?)`: when provided, add `json_each` WHERE clause filtering by student_ref.

- [ ] **Step 4: Update history routes**

In `routes/history.ts`, update `/:id/interventions` and `/:id/messages` handlers to read `req.query.student` and pass it through to the retrieve functions.

- [ ] **Step 5: Run tests**

Run: `npx vitest run services/orchestrator/__tests__/history-student-filter.test.ts && npm run test`
Expected: PASS — new tests green, no regressions

- [ ] **Step 6: Commit**

Stage and commit: `feat: add optional ?student= filter to interventions, messages history endpoints`

---

## Task 6: Frontend types and API client

**Files:**
- Modify: `apps/web/src/types.ts`
- Modify: `apps/web/src/api.ts`

- [ ] **Step 1: Add frontend types**

Add `ClassroomHealth`, `StudentSummary`, and `DrillDownContext` (discriminated union with types: `forecast-block`, `student`, `debt-category`, `trend`) to `apps/web/src/types.ts`. Mirror the shared schema shapes exactly.

- [ ] **Step 2: Add API client functions**

Add to `apps/web/src/api.ts`: `fetchClassroomHealth(classroomId, signal?)`, `fetchStudentSummary(classroomId, studentRef?, signal?)`, `fetchInterventionHistoryForStudent(classroomId, studentRef, limit?, signal?)`, `fetchMessageHistoryForStudent(classroomId, studentRef, limit?, signal?)`. Follow the existing `requestJson` pattern. Add necessary type imports.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

Stage and commit: `feat: add ClassroomHealth, StudentSummary types and API client functions`

---

## Task 7: Sparkline component

**Files:**
- Create: `apps/web/src/components/Sparkline.tsx`

- [ ] **Step 1: Create the Sparkline component**

Build `Sparkline` component accepting `data: number[]`, `tone?: SectionTone`, `label?: string`, `width?` (default 80), `height?` (default 24). Returns null if data.length < 3. Renders inline SVG with:
- Polyline from data points mapped to SVG coordinates
- Dot on the rightmost point
- Trend arrow (up/down) when 3-day rolling average differs from 14-day average by >20%
- `aria-hidden="true"` on SVG, `<span className="sr-only">` with trend description
- Color mapped from tone via CSS variables

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

Stage and commit: `feat: add Sparkline SVG component for inline trend visualization`

---

## Task 8: HealthBar component

**Files:**
- Create: `apps/web/src/components/HealthBar.tsx`
- Create: `apps/web/src/components/HealthBar.css`

- [ ] **Step 1: Create the HealthBar component**

Build `HealthBar` accepting `health: ClassroomHealth | null` and `loading: boolean`. Returns null while loading. Shows muted chip when no historical data. Otherwise renders:
- Streak chip (`StatusChip` with success tone) if streak > 0, capped at 30
- Planning dots: 7 small circles (filled/unfilled) with count label
- Approval cadence chip if messages_total > 0
- Overall health chip: "On track" (success) when debt=0 + streak>=2 + plan exists, "Catching up" (pending), or "Needs attention" (warning)
- Styled as a horizontal flex-wrap strip with `role="status"`

- [ ] **Step 2: Create HealthBar CSS**

Styles for `.health-bar` (flex, wrap, gap, border, radius-md), `.health-bar--empty`, `.health-bar__planning` (inline-flex), `.health-bar__dot` (8px circles), `.health-bar__dot--filled` (accent color). Use design tokens throughout.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

Stage and commit: `feat: add HealthBar component with streak, planning dots, approval cadence`

---

## Task 9: StudentRoster component

**Files:**
- Create: `apps/web/src/components/StudentRoster.tsx`
- Create: `apps/web/src/components/StudentRoster.css`

- [ ] **Step 1: Create StudentRoster component**

Build collapsible section with:
- Toggle header showing "Students" + attention badge count + chevron
- Collapsed state persisted to localStorage key `prairie-roster-expanded`
- On first expand, calls `fetchStudentSummary` via `useAsyncAction`
- Shows SkeletonLoader while loading
- Renders sorted grid (attention count desc, then alpha) of student cards
- Each card is a button showing: name, pending count, last intervention days, pattern count, message count, priority reason, "View ->" CTA
- Cards with pending actions get `--color-border-warning` left border
- Grid: `repeat(auto-fill, minmax(200px, 1fr))`
- "Show all" button if > 30 students
- Card click triggers `onDrillDown({ type: "student", alias, initialData })`

- [ ] **Step 2: Create StudentRoster CSS**

Styles for `.student-roster`, `.student-roster__toggle`, `.student-card-grid`, `.student-card`, `.student-card--attention`, all inner elements. Use design tokens.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

Stage and commit: `feat: add StudentRoster collapsible grid with lazy loading`

---

## Task 10: DrillDownDrawer component

**Files:**
- Create: `apps/web/src/components/DrillDownDrawer.tsx`
- Create: `apps/web/src/components/DrillDownDrawer.css`

- [ ] **Step 1: Create DrillDownDrawer component**

Build slide-out drawer accepting `context: DrillDownContext | null`, `onClose`, `onNavigate`, `onInterventionPrefill?`, `onMessagePrefill?`. When context is null, renders nothing. Otherwise renders:
- Backdrop (fixed overlay with blur)
- Aside panel (fixed right, 420px or 100vw mobile) with slide-in animation
- Header with title (computed from context type) + close button
- Body with type-discriminated sub-view:
  - `student`: loads interventions + messages via API, shows summary stats, record lists, action buttons
  - `forecast-block`: shows contributing factors list, suggested mitigation
  - `debt-category`: lists debt items with "Log follow-up" buttons for stale_followup category
  - `trend`: shows enlarged Sparkline (340x160) + daily value table
- Escape key and backdrop click close
- Focus on close button on open

- [ ] **Step 2: Create DrillDownDrawer CSS**

Styles for `.drill-down-backdrop`, `.drill-down-drawer`, `@keyframes drawer-slide-in`, header, body, sections, records, actions. Mobile: full width. Use design tokens.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

Stage and commit: `feat: add DrillDownDrawer with student, forecast, debt, and trend sub-views`

---

## Task 11: Wire everything into TodayPanel

**Files:**
- Modify: `apps/web/src/panels/TodayPanel.tsx` + `.css`
- Modify: `apps/web/src/components/PendingActionsCard.tsx`
- Modify: `apps/web/src/components/PlanRecap.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Add sparkline and drill-down props to PendingActionsCard**

Add `onItemClick?: (label: string) => void` and `sparklineData?: number[]` props. Import and render `Sparkline` next to heading. When `onItemClick` is provided, call it instead of `onNavigate`. Add a `.pending-actions-header-row` flex wrapper.

- [ ] **Step 2: Add sparkline and priority click to PlanRecap**

Add `sparklineData?: number[]` and `onPriorityClick?: (studentRef: string) => void` props. Render sparkline in header. Wrap priority items in buttons that call `onPriorityClick`.

- [ ] **Step 3: Update TodayPanel**

Import and render: `HealthBar` (above PendingActionsCard), `Sparkline` (in forecast header), `StudentRoster` (after forecast section), `DrillDownDrawer` (at bottom of panel). Add state for `drillDown: DrillDownContext | null`. Add `useAsyncAction<ClassroomHealth>` fetched in parallel with snapshot. Compute `attentionStudents` set from debt register items. Wire all drill-down triggers:
- PendingActionsCard `onItemClick` → maps label to category, filters debt items, opens drawer
- PlanRecap `onPriorityClick` → opens student drawer
- ForecastTimeline `onBlockClick` → opens forecast-block drawer
- StudentRoster `onDrillDown` → opens drawer directly
- DrillDownDrawer `onNavigate` → closes drawer, calls `onTabChange`

Accept `onInterventionPrefill` and `onMessagePrefill` props and pass through to DrillDownDrawer.

- [ ] **Step 4: Add new CSS**

Add `.pending-actions-header-row`, `.plan-recap-header-row`, `.today-forecast-header-right`, `.plan-recap-priority-btn` styles to `TodayPanel.css`.

- [ ] **Step 5: Update App.tsx**

Pass `onInterventionPrefill={handleInterventionClick}` and `onMessagePrefill={handleFollowupClick}` to TodayPanel render.

- [ ] **Step 6: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 7: Commit**

Stage and commit: `feat: wire HealthBar, sparklines, StudentRoster, and DrillDownDrawer into TodayPanel`

---

## Task 12: Validation and cleanup

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npm run test`
Expected: PASS — no regressions

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS or only pre-existing warnings

- [ ] **Step 4: Start dev server and visually verify**

Run: `npm run dev`

Verify at `http://localhost:5173/?demo=true`:
1. Health Bar appears above Pending Actions with status chips
2. Sparklines appear in PendingActionsCard, PlanRecap, and Forecast headers
3. Student Roster appears collapsed below Forecast; expanding loads cards
4. Clicking student card opens DrillDownDrawer with detail
5. Clicking forecast block opens drawer with block detail
6. Clicking pending action card opens drawer with debt items
7. "Log follow-up" and "Draft message" buttons navigate to correct panels with prefill
8. Drawer closes on Escape, backdrop click, and close button

- [ ] **Step 5: Commit any fixes**

Stage and commit: `fix: visual polish from dashboard enhancement verification`

---

## Task 13: Update documentation

**Files:**
- Modify: `docs/development-gaps.md`

- [ ] **Step 1: Close structural gaps in development-gaps.md**

Add a new section documenting the dashboard enhancement as closed, listing what was added: Health Bar, sparkline trends, student roster, drill-down drawer, two new API endpoints, student filter on history endpoints.

- [ ] **Step 2: Final typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

Stage and commit: `docs: close dashboard structural gaps in development-gaps.md`
