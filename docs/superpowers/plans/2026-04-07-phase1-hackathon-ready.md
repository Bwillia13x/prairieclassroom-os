# Phase 1: "Hackathon Ready" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a morning dashboard, entrance motion, forecast timeline, and visual polish — making the demo stunning while solving the teacher's #1 daily friction (orientation without tab-hopping).

**Architecture:** New TodayPanel powered by the existing debt register + latest plan/forecast queries (retrieval-only, no model call). New ForecastTimeline component reused in both ForecastPanel and TodayPanel. Centralized motion.css for all animations. Developer metadata stripped from teacher-facing views. All changes are frontend + one new GET endpoint.

**Tech Stack:** React 18, Vite, TypeScript, CSS custom properties, Express.js, SQLite (existing stack — no new dependencies)

**Spec:** `docs/superpowers/specs/2026-04-07-teacher-friction-roadmap-design.md` — Phase 1 (sections 1A-1E)

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `apps/web/src/panels/TodayPanel.tsx` | Morning dashboard — composes debt register + latest plan + latest forecast |
| `apps/web/src/panels/TodayPanel.css` | Dashboard-specific styles |
| `apps/web/src/components/PendingActionsCard.tsx` | Clickable action-count cards with tab navigation |
| `apps/web/src/components/PlanRecap.tsx` | Condensed read-only plan summary |
| `apps/web/src/components/ForecastTimeline.tsx` | Horizontal color-coded timeline bar |
| `apps/web/src/components/ForecastTimeline.css` | Timeline bar styles |
| `apps/web/src/motion.css` | All animation keyframes and transition utilities |
| `services/orchestrator/__tests__/today.test.ts` | Tests for today snapshot data layer |

### Modified files
| File | Change |
|------|--------|
| `apps/web/src/App.tsx` | Add "today" tab at position 0, update TAB_ORDER, default to "today" |
| `apps/web/src/App.css` | Remove duplicate fade-up keyframe (moved to motion.css) |
| `apps/web/src/index.css` | Import motion.css, optional grain texture |
| `apps/web/src/types.ts` | Add TodaySnapshot, DebtItem, ComplexityDebtRegister types |
| `apps/web/src/api.ts` | Add fetchTodaySnapshot() |
| `apps/web/src/components/MobileNav.tsx` | Add Today as first group |
| `apps/web/src/components/PlanViewer.tsx` | Remove dev metadata, add stagger class |
| `apps/web/src/components/MessageDraft.tsx` | Remove latency/model from metadata |
| `apps/web/src/panels/TomorrowPlanPanel.tsx` | Stop passing latencyMs/modelId to PlanViewer |
| `apps/web/src/panels/FamilyMessagePanel.tsx` | Stop passing latencyMs/modelId to MessageDraft |
| `apps/web/src/panels/ForecastPanel.tsx` | Add ForecastTimeline above cards |
| `services/orchestrator/server.ts` | Add GET /api/today/:classroomId endpoint |
| `services/memory/retrieve.ts` | Add getLatestPlan() helper |

---

## Task 1: Today Snapshot — Data Layer and API Endpoint

**Files:**
- Modify: `services/memory/retrieve.ts`
- Modify: `services/orchestrator/server.ts`
- Create: `services/orchestrator/__tests__/today.test.ts`

- [ ] **Step 1: Write failing test for getLatestPlan()**

Create `services/orchestrator/__tests__/today.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb, closeAll } from "../../memory/db.js";
import { getLatestPlan, getLatestForecast } from "../../memory/retrieve.js";
import { savePlan } from "../../memory/store.js";

const TEST_CLASSROOM = "test-today-classroom";

describe("getLatestPlan", () => {
  beforeEach(() => {
    const db = getDb(TEST_CLASSROOM);
    db.exec("DELETE FROM generated_plans");
  });

  afterEach(() => {
    closeAll();
  });

  it("returns null when no plans exist", () => {
    const result = getLatestPlan(TEST_CLASSROOM);
    expect(result).toBeNull();
  });

  it("returns the most recent plan", () => {
    const plan1 = {
      plan_id: "plan-1",
      classroom_id: TEST_CLASSROOM,
      source_artifact_ids: [],
      transition_watchpoints: [],
      support_priorities: [{ student_ref: "Ari", reason: "test", suggested_action: "test" }],
      ea_actions: [],
      prep_checklist: ["Item 1"],
      family_followups: [],
      schema_version: "0.1.0",
    };
    const plan2 = { ...plan1, plan_id: "plan-2", prep_checklist: ["Item 2"] };

    savePlan(TEST_CLASSROOM, plan1);
    savePlan(TEST_CLASSROOM, plan2);

    const result = getLatestPlan(TEST_CLASSROOM);
    expect(result).not.toBeNull();
    expect(result!.plan_id).toBe("plan-2");
    expect(result!.prep_checklist).toEqual(["Item 2"]);
  });
});

describe("today snapshot composition", () => {
  beforeEach(() => {
    const db = getDb(TEST_CLASSROOM);
    db.exec("DELETE FROM generated_plans");
    db.exec("DELETE FROM complexity_forecasts");
  });

  afterEach(() => {
    closeAll();
  });

  it("composes latest plan and latest forecast (both nullable)", () => {
    savePlan(TEST_CLASSROOM, {
      plan_id: "today-plan",
      classroom_id: TEST_CLASSROOM,
      source_artifact_ids: [],
      transition_watchpoints: [],
      support_priorities: [{ student_ref: "Ari", reason: "needs focus", suggested_action: "seat near teacher" }],
      ea_actions: [],
      prep_checklist: ["Print worksheets"],
      family_followups: [],
      schema_version: "0.1.0",
    });

    const latestPlan = getLatestPlan(TEST_CLASSROOM);
    expect(latestPlan).not.toBeNull();
    expect(latestPlan!.support_priorities).toHaveLength(1);

    const latestForecast = getLatestForecast(TEST_CLASSROOM);
    // No forecast saved — should be null
    expect(latestForecast).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run services/orchestrator/__tests__/today.test.ts`

Expected: FAIL — `getLatestPlan` is not exported from retrieve.ts

- [ ] **Step 3: Implement getLatestPlan()**

In `services/memory/retrieve.ts`, add after the existing `getRecentPlans` function (around line 23):

```typescript
export function getLatestPlan(classroomId: string): TomorrowPlan | null {
  const plans = getRecentPlans(classroomId, 1);
  return plans.length > 0 ? plans[0] : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run services/orchestrator/__tests__/today.test.ts`

Expected: PASS (4 tests)

- [ ] **Step 5: Add GET /api/today/:classroomId route to server.ts**

In `services/orchestrator/server.ts`, add `getLatestPlan` to the import from `../memory/retrieve.js` (line 61).

Then add after the debt-register route (around line 1063):

```typescript
// ----- Today Snapshot Route -----

app.get("/api/today/:classroomId", (req, res) => {
  try {
    const classroomId = req.params.classroomId as string;
    const classroom = loadClassroom(classroomId);
    if (!classroom) {
      res.status(404).json({ error: `Classroom '${classroomId}' not found` });
      return;
    }

    const register = buildDebtRegister(classroomId, classroom);
    const latestPlan = getLatestPlan(classroomId);
    const latestForecast = getLatestForecast(classroomId);

    res.json({
      debt_register: register,
      latest_plan: latestPlan,
      latest_forecast: latestForecast,
      student_count: classroom.students.length,
      last_activity_at: register.items.length > 0
        ? register.generated_at
        : null,
    });
  } catch (err) {
    console.error("Today snapshot error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});
```

- [ ] **Step 6: Run full test suite**

Run: `npm test`

Expected: All existing tests pass + 4 new tests pass

- [ ] **Step 7: Commit**

Stage: `services/memory/retrieve.ts`, `services/orchestrator/server.ts`, `services/orchestrator/__tests__/today.test.ts`

Message: `feat: add GET /api/today/:classroomId endpoint for morning dashboard`

---

## Task 2: Frontend Types and API Client

**Files:**
- Modify: `apps/web/src/types.ts`
- Modify: `apps/web/src/api.ts`

- [ ] **Step 1: Add TodaySnapshot types to types.ts**

Append at end of `apps/web/src/types.ts`:

```typescript
// ----- Today Snapshot types -----

export interface DebtItem {
  category: "stale_followup" | "unapproved_message" | "unaddressed_pattern" | "recurring_plan_item" | "approaching_review";
  student_refs: string[];
  description: string;
  source_record_id: string;
  age_days: number;
}

export interface ComplexityDebtRegister {
  register_id: string;
  classroom_id: string;
  items: DebtItem[];
  item_count_by_category: Record<string, number>;
  generated_at: string;
  schema_version: string;
}

export interface TodaySnapshot {
  debt_register: ComplexityDebtRegister;
  latest_plan: TomorrowPlan | null;
  latest_forecast: ComplexityForecast | null;
  student_count: number;
  last_activity_at: string | null;
}
```

- [ ] **Step 2: Add fetchTodaySnapshot() to api.ts**

Add `TodaySnapshot` to the imports at top of `apps/web/src/api.ts`:

```typescript
import type {
  // ... existing imports ...
  TodaySnapshot,
} from "./types";
```

Append at end of file:

```typescript
export async function fetchTodaySnapshot(
  classroomId: string,
  signal?: AbortSignal,
): Promise<TodaySnapshot> {
  const res = await fetch(`${API_BASE}/today/${classroomId}`, { signal });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Today snapshot failed (${res.status}): ${body}`);
  }
  return res.json();
}
```

- [ ] **Step 3: Commit**

Stage: `apps/web/src/types.ts`, `apps/web/src/api.ts`

Message: `feat: add TodaySnapshot type and fetchTodaySnapshot API client`

---

## Task 3: ForecastTimeline Component

**Files:**
- Create: `apps/web/src/components/ForecastTimeline.tsx`
- Create: `apps/web/src/components/ForecastTimeline.css`
- Modify: `apps/web/src/panels/ForecastPanel.tsx`

- [ ] **Step 1: Create ForecastTimeline component**

Create `apps/web/src/components/ForecastTimeline.tsx`:

```tsx
import type { ComplexityBlock } from "../types";
import "./ForecastTimeline.css";

interface Props {
  blocks: ComplexityBlock[];
  onBlockClick?: (index: number) => void;
}

export default function ForecastTimeline({ blocks, onBlockClick }: Props) {
  if (blocks.length === 0) return null;

  return (
    <div className="forecast-timeline" role="img" aria-label="Complexity timeline for the day">
      {blocks.map((block, i) => (
        <button
          key={i}
          className={`forecast-timeline-segment forecast-timeline-segment--${block.level}`}
          onClick={onBlockClick ? () => onBlockClick(i) : undefined}
          aria-label={`${block.time_slot}: ${block.activity} — ${block.level} complexity`}
          type="button"
        >
          <span className="forecast-timeline-time">{block.time_slot}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create ForecastTimeline styles**

Create `apps/web/src/components/ForecastTimeline.css`:

```css
.forecast-timeline {
  display: flex;
  gap: 2px;
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: var(--space-4);
}

.forecast-timeline-segment {
  flex: 1;
  min-height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: filter 0.15s;
  padding: var(--space-1) var(--space-2);
}

.forecast-timeline-segment:hover {
  filter: brightness(0.92);
}

.forecast-timeline-segment--low {
  background: var(--color-forecast-low-bg);
  color: var(--color-forecast-low-text);
}

.forecast-timeline-segment--medium {
  background: var(--color-forecast-medium-bg);
  color: var(--color-forecast-medium-text);
}

.forecast-timeline-segment--high {
  background: var(--color-forecast-high-bg);
  color: var(--color-forecast-high-text);
}

.forecast-timeline-time {
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
}
```

- [ ] **Step 3: Integrate into ForecastPanel**

In `apps/web/src/panels/ForecastPanel.tsx`, add import:

```typescript
import ForecastTimeline from "../components/ForecastTimeline";
```

Render `<ForecastTimeline blocks={result.forecast.blocks} />` immediately before the existing forecast card grid inside the `{result && (...)}` block.

- [ ] **Step 4: Verify visually**

Run: `cd apps/web && npx vite dev`

Navigate to Forecast tab, generate a forecast, verify the colored timeline bar appears above the detail cards with correct colors (green/amber/red).

- [ ] **Step 5: Commit**

Stage: `apps/web/src/components/ForecastTimeline.tsx`, `apps/web/src/components/ForecastTimeline.css`, `apps/web/src/panels/ForecastPanel.tsx`

Message: `feat: add ForecastTimeline color-coded bar — reusable in ForecastPanel and TodayPanel`

---

## Task 4: PendingActionsCard and PlanRecap Subcomponents

**Files:**
- Create: `apps/web/src/components/PendingActionsCard.tsx`
- Create: `apps/web/src/components/PlanRecap.tsx`

- [ ] **Step 1: Create PendingActionsCard**

Create `apps/web/src/components/PendingActionsCard.tsx`:

```tsx
interface ActionItem {
  label: string;
  count: number;
  targetTab: string;
  icon: string;
}

interface Props {
  items: ActionItem[];
  onNavigate: (tab: string) => void;
}

export default function PendingActionsCard({ items, onNavigate }: Props) {
  const activeItems = items.filter((item) => item.count > 0);

  if (activeItems.length === 0) {
    return (
      <div className="pending-actions pending-actions--clear">
        <p className="pending-actions-clear-text">No pending actions — you're caught up.</p>
      </div>
    );
  }

  return (
    <div className="pending-actions">
      <h3 className="pending-actions-heading">Needs Attention</h3>
      <div className="pending-actions-grid">
        {activeItems.map((item) => (
          <button
            key={item.targetTab}
            className="pending-action-card"
            onClick={() => onNavigate(item.targetTab)}
            type="button"
          >
            <span className="pending-action-icon" aria-hidden="true">{item.icon}</span>
            <span className="pending-action-count">{item.count}</span>
            <span className="pending-action-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PlanRecap**

Create `apps/web/src/components/PlanRecap.tsx`:

```tsx
import type { TomorrowPlan } from "../types";

interface Props {
  plan: TomorrowPlan;
}

export default function PlanRecap({ plan }: Props) {
  return (
    <div className="plan-recap">
      <h3 className="plan-recap-heading">Yesterday's Plan</h3>

      {plan.support_priorities.length > 0 && (
        <div className="plan-recap-section">
          <h4>Support Priorities</h4>
          <ul className="plan-recap-list">
            {plan.support_priorities.map((p, i) => (
              <li key={i}>
                <strong>{p.student_ref}</strong> — {p.suggested_action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.prep_checklist.length > 0 && (
        <div className="plan-recap-section">
          <h4>Prep Checklist</h4>
          <ul className="plan-recap-list">
            {plan.prep_checklist.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.family_followups.length > 0 && (
        <div className="plan-recap-section">
          <h4>Family Follow-ups</h4>
          <ul className="plan-recap-list">
            {plan.family_followups.map((f, i) => (
              <li key={i}>
                <strong>{f.student_ref}</strong> — {f.message_type.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

Stage: `apps/web/src/components/PendingActionsCard.tsx`, `apps/web/src/components/PlanRecap.tsx`

Message: `feat: add PendingActionsCard and PlanRecap subcomponents for TodayPanel`

---

## Task 5: TodayPanel — Full Dashboard Assembly

**Files:**
- Create: `apps/web/src/panels/TodayPanel.tsx`
- Create: `apps/web/src/panels/TodayPanel.css`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/MobileNav.tsx`

- [ ] **Step 1: Create TodayPanel**

Create `apps/web/src/panels/TodayPanel.tsx`:

```tsx
import { useEffect } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { fetchTodaySnapshot } from "../api";
import PendingActionsCard from "../components/PendingActionsCard";
import PlanRecap from "../components/PlanRecap";
import ForecastTimeline from "../components/ForecastTimeline";
import SkeletonLoader from "../components/SkeletonLoader";
import type { TodaySnapshot } from "../types";
import "./TodayPanel.css";

interface Props {
  onTabChange: (tab: string) => void;
}

export default function TodayPanel({ onTabChange }: Props) {
  const { activeClassroom, profile } = useApp();
  const { loading, error, result, execute } = useAsyncAction<TodaySnapshot>();

  useEffect(() => {
    if (!activeClassroom) return;
    execute((signal) => fetchTodaySnapshot(activeClassroom, signal));
  }, [activeClassroom, execute]);

  if (!profile) return null;

  return (
    <div className="today-panel">
      <header className="today-header">
        <h2>Good Morning</h2>
        <p className="today-subtitle">
          Grade {profile.grade_band} — {profile.subject_focus.replace(/_/g, " ")} — {profile.students.length} students
        </p>
      </header>

      {loading && !result && (
        <SkeletonLoader variant="stack" message="Loading today's snapshot..." label="Loading dashboard" />
      )}

      {error && !result && <div className="error-banner">{error}</div>}

      {result && (
        <div className="today-grid">
          <PendingActionsCard
            items={[
              {
                label: "unapproved messages",
                count: result.debt_register.item_count_by_category["unapproved_message"] ?? 0,
                targetTab: "family-message",
                icon: "\u2709",
              },
              {
                label: "stale follow-ups",
                count: result.debt_register.item_count_by_category["stale_followup"] ?? 0,
                targetTab: "log-intervention",
                icon: "\u26A0",
              },
              {
                label: "unaddressed patterns",
                count: result.debt_register.item_count_by_category["unaddressed_pattern"] ?? 0,
                targetTab: "support-patterns",
                icon: "\u2605",
              },
              {
                label: "approaching review",
                count: result.debt_register.item_count_by_category["approaching_review"] ?? 0,
                targetTab: "support-patterns",
                icon: "\u23F1",
              },
            ]}
            onNavigate={onTabChange}
          />

          {result.latest_plan && (
            <PlanRecap plan={result.latest_plan} />
          )}

          {result.latest_forecast && (
            <div className="today-forecast-section">
              <h3>Today's Complexity Shape</h3>
              <ForecastTimeline blocks={result.latest_forecast.blocks} />
              <p className="today-forecast-summary">{result.latest_forecast.overall_summary}</p>
            </div>
          )}

          {!result.latest_plan && !result.latest_forecast && result.debt_register.items.length === 0 && (
            <div className="empty-state">
              <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <path d="M8 36 Q16 20 24 28 Q32 16 40 24" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <line x1="8" y1="38" x2="40" y2="38" stroke="var(--color-border)" strokeWidth="1.5"/>
                <circle cx="24" cy="14" r="6" stroke="var(--color-accent)" strokeWidth="1.5" fill="var(--color-bg-accent)"/>
              </svg>
              <div className="empty-state-title">Fresh start</div>
              <p className="empty-state-description">
                No classroom data yet. Start by generating a Tomorrow Plan or logging an intervention.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create TodayPanel styles**

Create `apps/web/src/panels/TodayPanel.css`:

```css
.today-panel {
  max-width: 720px;
}

.today-header {
  margin-bottom: var(--space-6);
}

.today-header h2 {
  font-family: var(--font-serif);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-text);
}

.today-subtitle {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

.today-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* Pending actions */
.pending-actions-heading {
  font-size: var(--text-base);
  font-weight: 600;
  margin-bottom: var(--space-3);
  color: var(--color-text);
}

.pending-actions--clear {
  padding: var(--space-4);
  background: var(--color-bg-success);
  border: 1px solid var(--color-border-success);
  border-radius: var(--radius);
}

.pending-actions-clear-text {
  color: var(--color-text-success);
  font-weight: 500;
}

.pending-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-3);
}

.pending-action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-4) var(--space-3);
  background: var(--color-bg-warning);
  border: 1px solid var(--color-border-warning);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
}

.pending-action-card:hover {
  background: var(--color-bg-accent);
  transform: translateY(-1px);
}

.pending-action-icon {
  font-size: 1.25rem;
}

.pending-action-count {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text-warning);
}

.pending-action-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  text-align: center;
}

/* Plan recap */
.plan-recap {
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-section-priority);
  border-radius: var(--radius);
}

.plan-recap-heading {
  font-size: var(--text-base);
  font-weight: 600;
  margin-bottom: var(--space-3);
}

.plan-recap-section {
  margin-top: var(--space-3);
}

.plan-recap-section h4 {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: var(--space-1);
}

.plan-recap-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-recap-list li {
  font-size: var(--text-sm);
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--color-border);
}

.plan-recap-list li:last-child {
  border-bottom: none;
}

/* Forecast section */
.today-forecast-section h3 {
  font-size: var(--text-base);
  font-weight: 600;
  margin-bottom: var(--space-3);
}

.today-forecast-summary {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-2);
}
```

- [ ] **Step 3: Wire TodayPanel into App.tsx**

In `apps/web/src/App.tsx`:

Add import: `import TodayPanel from "./panels/TodayPanel";`

Update `ActiveTab` type — prepend `"today"`:
```typescript
type ActiveTab = "today" | "differentiate" | "tomorrow-plan" | "family-message" | "log-intervention" | "language-tools" | "support-patterns" | "ea-briefing" | "complexity-forecast" | "survival-packet";
```

Update `TAB_ORDER` — prepend `"today"`:
```typescript
const TAB_ORDER: ActiveTab[] = [
  "today",
  "differentiate", "language-tools",
  "tomorrow-plan", "ea-briefing", "complexity-forecast", "log-intervention", "survival-packet",
  "family-message", "support-patterns",
];
```

Update default `activeTab`: `useState<ActiveTab>("today")`

Add tab button before the Lesson Prep group (a new `<div className="tab-group">` with label "Today" containing one button for the "today" tab).

Add tabpanel before the differentiate panel:
```tsx
<div role="tabpanel" id="panel-today" aria-labelledby="tab-today" hidden={activeTab !== "today"}>
  <ErrorBoundary><TodayPanel onTabChange={(tab) => setActiveTab(tab as ActiveTab)} /></ErrorBoundary>
</div>
```

- [ ] **Step 4: Add Today group to MobileNav**

In `apps/web/src/components/MobileNav.tsx`:

Add `"today"` to the `ActiveTab` type union.

Update `TabGroup` type: `type TabGroup = "today" | "prep" | "ops" | "review";`

Prepend new entry to `GROUPS` array:
```typescript
{
  key: "today" as TabGroup,
  label: "Today",
  icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-.83 0-1.5-.67-1.5-1.5h3c0 .83-.67 1.5-1.5 1.5zm5-2.5H7v-1l1-1V9.5C8 7.57 9.12 5.85 11 5.18V4.5c0-.55.45-1 1-1s1 .45 1 1v.68C14.88 5.85 16 7.57 16 9.5V12l1 1v1z",
  tabs: [
    { id: "today" as ActiveTab, label: "Today" },
  ],
},
```

- [ ] **Step 5: Verify full dashboard visually**

Start dev server and verify:
- App loads with Today tab active
- Dashboard shows pending actions or "caught up" message
- Plan recap appears if demo data has a plan
- Clicking pending-action cards navigates to correct tabs
- Mobile nav shows Today as first group
- Keyboard shortcut `1` goes to Today

- [ ] **Step 6: Commit**

Stage: `apps/web/src/panels/TodayPanel.tsx`, `apps/web/src/panels/TodayPanel.css`, `apps/web/src/App.tsx`, `apps/web/src/components/MobileNav.tsx`

Message: `feat: add TodayPanel as default morning dashboard — solves #1 teacher friction`

---

## Task 6: Entrance Motion System

**Files:**
- Create: `apps/web/src/motion.css`
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/src/App.css`
- Modify: `apps/web/src/components/PlanViewer.tsx`

- [ ] **Step 1: Create motion.css**

Create `apps/web/src/motion.css`:

```css
/* Centralized animation keyframes and motion utilities */

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Stagger children: each card animates in with slight delay */
.motion-stagger > * {
  animation: fade-up 0.25s ease-out both;
}

.motion-stagger > *:nth-child(1) { animation-delay: 0ms; }
.motion-stagger > *:nth-child(2) { animation-delay: 50ms; }
.motion-stagger > *:nth-child(3) { animation-delay: 100ms; }
.motion-stagger > *:nth-child(4) { animation-delay: 150ms; }
.motion-stagger > *:nth-child(5) { animation-delay: 200ms; }
.motion-stagger > *:nth-child(6) { animation-delay: 250ms; }
.motion-stagger > *:nth-child(7) { animation-delay: 300ms; }
.motion-stagger > *:nth-child(8) { animation-delay: 350ms; }

/* Button micro-interaction */
.btn {
  transition: background 0.15s, color 0.15s, transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn:active {
  transform: scale(0.97);
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .motion-stagger > *,
  .app-main > [role="tabpanel"]:not([hidden]) {
    animation: none !important;
  }

  .btn {
    transition: background 0.15s, color 0.15s !important;
  }
}
```

- [ ] **Step 2: Import motion.css and remove duplicate keyframe**

In `apps/web/src/index.css`, add at the very end: `@import "./motion.css";`

In `apps/web/src/App.css`, the rule at line 129 references the `fade-up` keyframe. Check if `@keyframes fade-up` is defined in App.css — if so, remove that `@keyframes` block (it now lives in motion.css). Keep the rule that applies the animation:

```css
.app-main > [role="tabpanel"]:not([hidden]) {
  animation: fade-up 0.2s ease-out;
}
```

- [ ] **Step 3: Add stagger class to result card containers**

In `apps/web/src/components/PlanViewer.tsx`, change each `<div className="plan-cards">` to `<div className="plan-cards motion-stagger">` (there are 4 instances — watchpoints, priorities, EA, family).

In `apps/web/src/panels/TodayPanel.tsx`, change `<div className="today-grid">` to `<div className="today-grid motion-stagger">`.

In `apps/web/src/components/PendingActionsCard.tsx`, change `<div className="pending-actions-grid">` to `<div className="pending-actions-grid motion-stagger">`.

- [ ] **Step 4: Verify motion and reduced-motion**

Start dev server. Generate a plan and verify cards stagger in.

Then in DevTools > Rendering > Emulate CSS media "prefers-reduced-motion: reduce" — verify all animations are disabled.

- [ ] **Step 5: Commit**

Stage: `apps/web/src/motion.css`, `apps/web/src/index.css`, `apps/web/src/App.css`, `apps/web/src/components/PlanViewer.tsx`, `apps/web/src/panels/TodayPanel.tsx`, `apps/web/src/components/PendingActionsCard.tsx`

Message: `feat: add centralized motion system with staggered fade-up and reduced-motion support`

---

## Task 7: Strip Developer Metadata from Result Views

**Files:**
- Modify: `apps/web/src/components/PlanViewer.tsx`
- Modify: `apps/web/src/components/MessageDraft.tsx`
- Modify: `apps/web/src/panels/TomorrowPlanPanel.tsx`
- Modify: `apps/web/src/panels/FamilyMessagePanel.tsx`

- [ ] **Step 1: Clean PlanViewer**

In `apps/web/src/components/PlanViewer.tsx`:

Remove the `.plan-meta` paragraph (lines 23-26):
```tsx
// DELETE:
<p className="plan-meta">
  {plan.classroom_id} . {Math.round(latencyMs)}ms . {modelId}
  {plan.schema_version && ` . v${plan.schema_version}`}
</p>
```

Update Props interface — remove `latencyMs` and `modelId`:
```typescript
interface Props {
  plan: TomorrowPlan;
  thinkingSummary: string | null;
  patternInformed?: boolean;
  onFollowupClick?: (prefill: FamilyMessagePrefill) => void;
  onInterventionClick?: (prefill: InterventionPrefill) => void;
}
```

Update destructure to match.

- [ ] **Step 2: Update TomorrowPlanPanel caller**

In `apps/web/src/panels/TomorrowPlanPanel.tsx`, remove `latencyMs` and `modelId` props from the PlanViewer call:

```tsx
<PlanViewer
  plan={result.plan}
  thinkingSummary={result.thinking_summary}
  patternInformed={result.pattern_informed}
  onFollowupClick={onFollowupClick}
  onInterventionClick={onInterventionClick}
/>
```

- [ ] **Step 3: Clean MessageDraft**

In `apps/web/src/components/MessageDraft.tsx`:

Keep contextual info, remove latency/model from the meta line:
```tsx
<p className="draft-meta">
  {draft.student_refs.join(", ")} · {draft.message_type.replace(/_/g, " ")} · {draft.target_language}
</p>
```

Remove `latencyMs` and `modelId` from Props interface and destructure.

- [ ] **Step 4: Update FamilyMessagePanel caller**

In `apps/web/src/panels/FamilyMessagePanel.tsx`, remove `latencyMs` and `modelId` props from the MessageDraft call:

```tsx
<MessageDraft
  draft={result.draft}
  onApprove={handleApprove}
/>
```

- [ ] **Step 5: Search for other result viewers with metadata**

Grep for `latencyMs` or `modelId` in `apps/web/src/components/` and `apps/web/src/panels/` — apply the same cleanup to any remaining viewers. Common suspects: any component rendering `{Math.round(latencyMs)}ms` or `{modelId}`.

- [ ] **Step 6: Run test suite**

Run: `npm test`

Expected: All tests pass (UI-only changes, backend tests unaffected)

- [ ] **Step 7: Commit**

Stage all modified files.

Message: `fix: remove developer metadata from teacher-facing views — keep in API responses for debug`

---

## Task 8: Visual Identity Audit and Grain Texture

**Files:**
- Modify: `apps/web/src/index.css` (if needed)

- [ ] **Step 1: Audit current visual identity**

Start dev server and verify each item is present:
- [ ] Font pair: Source Sans 3 (body) + Fraunces (headings)
- [ ] Palette: Warm earth tones (wheat bg `#faf8f3`, bronze accent `#b07a2b`) — confirmed in index.css
- [ ] SVG mark: Prairie horizon line in header — confirmed in App.tsx
- [ ] Empty state SVGs: Custom inline SVGs (not Unicode) — check each panel
- [ ] Dark mode: Warm evening palette — check `@media (prefers-color-scheme: dark)` block

Record what is already done vs. what needs work. Only make changes for items that are missing.

- [ ] **Step 2: Add subtle grain texture (if not present)**

Check if `body::before` grain overlay exists in index.css. If not, add to `apps/web/src/index.css`:

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 256px 256px;
}

@media (prefers-reduced-motion: reduce) {
  body::before {
    display: none;
  }
}
```

- [ ] **Step 3: Commit only if changes were made**

Stage modified files.

Message: `polish: visual identity audit — add grain texture for prairie warmth`

---

## Task 9: Full Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Run backend tests**

Run: `npm test`

Expected: All tests pass (existing + new today.test.ts)

- [ ] **Step 2: Run eval suite**

Run: `npm run eval -- --mode mock`

Expected: 62/64 evals pass (same as baseline — no prompt/schema changes in this phase)

- [ ] **Step 3: Full visual walkthrough**

Start dev server and walk through every item:

- [ ] App opens to Today dashboard (not Differentiate)
- [ ] Pending actions show counts or "caught up" message
- [ ] Plan recap appears if demo data has a plan
- [ ] Clicking a pending-action card navigates to correct tab
- [ ] Forecast timeline appears in ForecastPanel (and TodayPanel if forecast exists)
- [ ] Tab switching has fade-up animation
- [ ] Result cards animate in with stagger delay
- [ ] No developer metadata (latency, model ID) visible on any result view
- [ ] Mobile nav shows Today group as first item
- [ ] Keyboard shortcuts: 1=Today, 2=Differentiate, 3=Language Tools, etc.
- [ ] Reduced motion: all animations disabled when preference is set
- [ ] Grain texture visible at low opacity on backgrounds
- [ ] Dark mode still looks correct

- [ ] **Step 4: Phase 1 milestone commit**

Stage any uncommitted verification fixes.

Message: `milestone: Phase 1 "Hackathon Ready" complete — morning dashboard, motion, timeline, visual polish`
