# Cohort Sparkline Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Tuftean small-multiples grid on the Classroom page showing per-student intervention pressure over 14 days, enabling pre-attentive cohort scanning that complements the existing top-N Watchlist.

**Architecture:** Extend `StudentSummary` with a real per-student `intervention_history_14d: number[]` series sourced from the `interventions` table (SQLite). New `CohortSparklineGrid` React component renders one sparkline cell per student in a responsive grid with a cohort-mean baseline overlay. Mounts as a new zone in `ClassroomPanel` between Watchlist (Zone 3) and Operating Dashboard (Zone 4). No new charting library — composes the existing `Sparkline` primitive.

**Tech Stack:** TypeScript 5.7, Zod, better-sqlite3 (existing), React 19, Vitest, @testing-library/react, custom SVG.

**Why this scope:** The 23 existing visualizations include `StudentSparkIndicator`, but it synthesizes a 3-point shape from current snapshot fields — not a real time-series. To honestly ship a "scan-the-class-in-200ms outlier-detection" view, real per-student daily history is required. The interventions table already records timestamps, so the backend extension is small and additive.

**Out of scope:** Any change to `StudentSparkIndicator` itself, any change to drill-down routing, any new charting library, any change to the pattern_reports or family_messages query path.

---

## File Structure

**Files to create:**
- `apps/web/src/components/CohortSparklineGrid.tsx` — main component
- `apps/web/src/components/CohortSparklineGrid.css` — grid layout and cell styles
- `apps/web/src/components/__tests__/CohortSparklineGrid.test.tsx` — unit tests
- `services/memory/intervention-history.ts` — query helper (kept separate to keep `student-summary.ts` focused)
- `services/memory/__tests__/intervention-history.test.ts` — query helper tests

**Files to modify:**
- `packages/shared/schemas/student-summary.ts` — add `intervention_history_14d` field
- `services/memory/student-summary.ts` — call new query helper, attach field
- `apps/web/src/types.ts` — mirror new schema field on the frontend type
- `apps/web/src/panels/ClassroomPanel.tsx` — mount new zone between Watchlist and Operating
- `CLAUDE.md` — bump visualization count language if relevant; otherwise leave

---

## Phase A — Backend (real per-student 14-day history)

### Task 1: Extend `StudentSummarySchema` with `intervention_history_14d`

**Files:**
- Modify: `packages/shared/schemas/student-summary.ts`

- [ ] **Step 1: Update the Zod schema to add the new field**

Replace the body of `packages/shared/schemas/student-summary.ts` with:

```typescript
/**
 * StudentSummary — compact student state snapshot for dashboard display and decision support.
 * Captures student identification, pending actions, intervention timing, and alert status.
 */
import { z } from "zod";

export const StudentSummarySchema = z.object({
  alias: z.string(),
  pending_action_count: z.number().int().min(0),
  last_intervention_days: z.number().int().min(0).nullable(),
  active_pattern_count: z.number().int().min(0),
  pending_message_count: z.number().int().min(0),
  latest_priority_reason: z.string().nullable(),
  // NEW: daily intervention count for the last 14 days, oldest-first.
  // Index 0 is 13 days ago, index 13 is today. Always length 14.
  intervention_history_14d: z.array(z.number().int().min(0)).length(14),
});

export type StudentSummary = z.infer<typeof StudentSummarySchema>;
```

- [ ] **Step 2: Run typecheck on shared package**

Run: `npm run typecheck`
Expected: PASS (no other consumer is broken yet — tests live in services/memory and apps/web, which haven't been updated)

- [ ] **Step 3: Commit**

```bash
git add packages/shared/schemas/student-summary.ts
git commit -m "feat(schema): add intervention_history_14d to StudentSummary"
```

---

### Task 2: Write failing test for `getInterventionHistoryByStudent` query helper

**Files:**
- Create: `services/memory/__tests__/intervention-history.test.ts`

- [ ] **Step 1: Write the test**

Create `services/memory/__tests__/intervention-history.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { getInterventionHistoryByStudent } from "../intervention-history.js";
import { getDb, closeDb } from "../db.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

const TEST_CLASSROOM = "test-history-classroom" as ClassroomId;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function insertIntervention(alias: string, daysAgo: number) {
  const db = getDb(TEST_CLASSROOM);
  db.prepare(`
    INSERT INTO interventions (id, classroom_id, student_refs, type, created_at, payload_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `int-${alias}-${daysAgo}-${Math.random().toString(36).slice(2, 8)}`,
    TEST_CLASSROOM,
    JSON.stringify([alias]),
    "redirect",
    isoDaysAgo(daysAgo),
    "{}",
  );
}

function clearInterventions() {
  const db = getDb(TEST_CLASSROOM);
  db.prepare("DELETE FROM interventions").run();
}

describe("getInterventionHistoryByStudent", () => {
  beforeEach(() => {
    closeDb(TEST_CLASSROOM);
    clearInterventions();
  });

  it("returns a length-14 zero array when no interventions exist", () => {
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1"]);
    expect(result.get("A1")).toEqual(new Array(14).fill(0));
  });

  it("places today's intervention at index 13", () => {
    insertIntervention("A1", 0);
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1"]);
    const series = result.get("A1")!;
    expect(series).toHaveLength(14);
    expect(series[13]).toBe(1);
    expect(series.slice(0, 13).every((n) => n === 0)).toBe(true);
  });

  it("places a 13-days-ago intervention at index 0", () => {
    insertIntervention("A1", 13);
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1"]);
    expect(result.get("A1")![0]).toBe(1);
  });

  it("ignores interventions older than 14 days", () => {
    insertIntervention("A1", 14);
    insertIntervention("A1", 30);
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1"]);
    expect(result.get("A1")).toEqual(new Array(14).fill(0));
  });

  it("counts multiple interventions on the same day", () => {
    insertIntervention("A1", 2);
    insertIntervention("A1", 2);
    insertIntervention("A1", 2);
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1"]);
    expect(result.get("A1")![11]).toBe(3);
  });

  it("returns separate series for each student", () => {
    insertIntervention("A1", 0);
    insertIntervention("A2", 5);
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1", "A2"]);
    expect(result.get("A1")![13]).toBe(1);
    expect(result.get("A2")![8]).toBe(1);
    expect(result.get("A1")![8]).toBe(0);
    expect(result.get("A2")![13]).toBe(0);
  });

  it("returns a zero series for students with no interventions in the window", () => {
    insertIntervention("A1", 5);
    const result = getInterventionHistoryByStudent(TEST_CLASSROOM, ["A1", "ghost"]);
    expect(result.get("ghost")).toEqual(new Array(14).fill(0));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- services/memory/__tests__/intervention-history.test.ts`
Expected: FAIL — `Cannot find module '../intervention-history.js'`

---

### Task 3: Implement `getInterventionHistoryByStudent`

**Files:**
- Create: `services/memory/intervention-history.ts`

- [ ] **Step 1: Write the implementation**

Create `services/memory/intervention-history.ts`:

```typescript
// services/memory/intervention-history.ts
import { getDb } from "./db.js";
import type { ClassroomId } from "../../packages/shared/schemas/branded.js";

const HISTORY_DAYS = 14;
const MS_PER_DAY = 86_400_000;

/**
 * For each student alias, return a length-14 array of integer counts
 * representing how many interventions touched that student per UTC day,
 * oldest-first. Index 0 is 13 days ago, index 13 is today.
 *
 * Aliases with zero matching interventions still receive a zero-filled
 * length-14 array, so callers can iterate without nullish handling.
 */
export function getInterventionHistoryByStudent(
  classroomId: ClassroomId,
  aliases: string[],
): Map<string, number[]> {
  const result = new Map<string, number[]>();
  for (const alias of aliases) {
    result.set(alias, new Array(HISTORY_DAYS).fill(0));
  }

  if (aliases.length === 0) return result;

  const db = getDb(classroomId);

  // Today, truncated to UTC midnight, in ISO form for SQL comparison.
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);
  const windowStartMs = todayMidnight.getTime() - (HISTORY_DAYS - 1) * MS_PER_DAY;
  const windowStartIso = new Date(windowStartMs).toISOString();

  const rows = db.prepare<[string, string]>(`
    SELECT student_refs, created_at
    FROM interventions
    WHERE classroom_id = ?
      AND created_at >= ?
  `).all(classroomId, windowStartIso) as Array<{
    student_refs: string;
    created_at: string;
  }>;

  for (const row of rows) {
    let refs: string[];
    try {
      refs = JSON.parse(row.student_refs);
    } catch {
      continue;
    }
    if (!Array.isArray(refs)) continue;

    const tsMs = Date.parse(row.created_at);
    if (Number.isNaN(tsMs)) continue;

    const eventDate = new Date(tsMs);
    eventDate.setUTCHours(0, 0, 0, 0);
    const dayDiff = Math.round(
      (todayMidnight.getTime() - eventDate.getTime()) / MS_PER_DAY,
    );
    if (dayDiff < 0 || dayDiff >= HISTORY_DAYS) continue;
    const index = HISTORY_DAYS - 1 - dayDiff;

    for (const alias of refs) {
      const series = result.get(alias);
      if (series) series[index] += 1;
    }
  }

  return result;
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm run test -- services/memory/__tests__/intervention-history.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 3: Commit**

```bash
git add services/memory/intervention-history.ts services/memory/__tests__/intervention-history.test.ts
git commit -m "feat(memory): add getInterventionHistoryByStudent 14-day query"
```

---

### Task 4: Wire query into `getStudentSummaries`

**Files:**
- Modify: `services/memory/student-summary.ts`

- [ ] **Step 1: Update existing memory tests to expect the new field**

Find every existing test that asserts on a `StudentSummary` shape (search: `getStudentSummaries`, `pending_action_count` in `services/memory/__tests__/`) and add `intervention_history_14d` to expected shapes. For tests that use `toEqual` on the full object, switch to `toMatchObject` if the test doesn't care about the new field, or add `intervention_history_14d: expect.any(Array)`.

Run: `grep -rn "pending_action_count" services/memory/__tests__/ services/orchestrator/__tests__/`

For each matching test, ensure shape assertions accommodate the new field. Where the precise array contents matter, add explicit history. Otherwise:

```typescript
// Before
expect(summary).toEqual({ alias: "A1", pending_action_count: 0, /* ... */ });
// After
expect(summary).toMatchObject({ alias: "A1", pending_action_count: 0 });
expect(summary.intervention_history_14d).toHaveLength(14);
```

- [ ] **Step 2: Modify `getStudentSummaries` to populate the new field**

In `services/memory/student-summary.ts`, add the import near the top:

```typescript
import { getInterventionHistoryByStudent } from "./intervention-history.js";
```

Inside `getStudentSummaries`, immediately before the final `return students.map(...)` block, add:

```typescript
  const historyMap = getInterventionHistoryByStudent(
    classroomId,
    students.map((s) => s.alias),
  );
```

Then change the returned object to include the new field. Replace the existing `return { alias, ... };` block with:

```typescript
    return {
      alias,
      pending_action_count,
      last_intervention_days,
      active_pattern_count,
      pending_message_count,
      latest_priority_reason,
      intervention_history_14d:
        historyMap.get(alias) ?? new Array(14).fill(0),
    };
```

- [ ] **Step 3: Run memory tests**

Run: `npm run test -- services/memory`
Expected: PASS (existing tests adjusted in Step 1, new tests from Task 3 still green).

- [ ] **Step 4: Run orchestrator tests for the route**

Run: `npm run test -- services/orchestrator/__tests__/student-summary`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/memory/student-summary.ts services/memory/__tests__ services/orchestrator/__tests__
git commit -m "feat(memory): attach 14-day intervention history to student summaries"
```

---

### Task 5: Update frontend type to mirror the schema

**Files:**
- Modify: `apps/web/src/types.ts`

- [ ] **Step 1: Locate the frontend `StudentSummary` interface**

Run: `grep -n "interface StudentSummary" apps/web/src/types.ts`
Expected: one hit (the existing interface).

- [ ] **Step 2: Add the new field**

Add `intervention_history_14d: number[];` to the interface, immediately after `latest_priority_reason`. The diff is one new line:

```typescript
  latest_priority_reason: string | null;
  intervention_history_14d: number[];  // length 14, oldest-first daily counts
}
```

- [ ] **Step 3: Run web typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/types.ts
git commit -m "feat(web-types): mirror intervention_history_14d on StudentSummary"
```

---

## Phase B — Frontend component (CohortSparklineGrid)

### Task 6: Write failing test for `CohortSparklineGrid`

**Files:**
- Create: `apps/web/src/components/__tests__/CohortSparklineGrid.test.tsx`

- [ ] **Step 1: Write the test**

Create `apps/web/src/components/__tests__/CohortSparklineGrid.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CohortSparklineGrid from "../CohortSparklineGrid";
import type { StudentSummary } from "../../types";

function makeStudent(
  alias: string,
  history: number[] = new Array(14).fill(0),
  overrides: Partial<StudentSummary> = {},
): StudentSummary {
  return {
    alias,
    pending_action_count: 0,
    last_intervention_days: null,
    active_pattern_count: 0,
    pending_message_count: 0,
    latest_priority_reason: null,
    intervention_history_14d: history,
    ...overrides,
  };
}

describe("CohortSparklineGrid", () => {
  it("renders one cell per student", () => {
    const students = [
      makeStudent("A1"),
      makeStudent("A2"),
      makeStudent("A3"),
    ];
    render(<CohortSparklineGrid students={students} />);
    expect(screen.getAllByTestId("cohort-cell")).toHaveLength(3);
  });

  it("shows the student alias as a visible label in each cell", () => {
    const students = [makeStudent("Amira"), makeStudent("Brody")];
    render(<CohortSparklineGrid students={students} />);
    expect(screen.getByText("Amira")).toBeInTheDocument();
    expect(screen.getByText("Brody")).toBeInTheDocument();
  });

  it("renders an SVG sparkline in cells with non-zero history", () => {
    const students = [
      makeStudent("A1", [0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 1, 0, 3, 1]),
    ];
    const { container } = render(<CohortSparklineGrid students={students} />);
    const cell = container.querySelector("[data-testid='cohort-cell']");
    expect(cell?.querySelector("svg polyline")).toBeInTheDocument();
  });

  it("shows a flat baseline (no spike) for students with all-zero history", () => {
    const students = [makeStudent("Quiet", new Array(14).fill(0))];
    const { container } = render(<CohortSparklineGrid students={students} />);
    const cell = container.querySelector("[data-testid='cohort-cell']");
    expect(cell?.querySelector("svg")).toBeInTheDocument();
    // sr-only label must still mention the student
    expect(cell?.textContent).toContain("Quiet");
  });

  it("renders an empty-state when given zero students", () => {
    render(<CohortSparklineGrid students={[]} />);
    expect(screen.getByText(/no students/i)).toBeInTheDocument();
  });

  it("each cell exposes an aria-label combining alias and intervention total", () => {
    const students = [
      makeStudent("Amira", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0]),
    ];
    render(<CohortSparklineGrid students={students} />);
    const cell = screen.getByTestId("cohort-cell");
    expect(cell.getAttribute("aria-label")).toMatch(/amira/i);
    expect(cell.getAttribute("aria-label")).toMatch(/3/); // total interventions
  });

  it("calls onStudentClick with alias when a cell is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const students = [makeStudent("Amira"), makeStudent("Brody")];
    render(<CohortSparklineGrid students={students} onStudentClick={onClick} />);
    await user.click(screen.getByText("Amira"));
    expect(onClick).toHaveBeenCalledWith("Amira");
  });

  it("does not render click affordance when onStudentClick is omitted", () => {
    const students = [makeStudent("Amira")];
    render(<CohortSparklineGrid students={students} />);
    const cell = screen.getByTestId("cohort-cell");
    expect(cell.tagName.toLowerCase()).not.toBe("button");
  });

  it("renders a cohort baseline overlay element when more than 1 student is provided", () => {
    const students = [makeStudent("A1"), makeStudent("A2")];
    const { container } = render(<CohortSparklineGrid students={students} />);
    expect(container.querySelector("[data-testid='cohort-baseline']")).toBeInTheDocument();
  });

  it("does not render a baseline for a single student", () => {
    const students = [makeStudent("Solo")];
    const { container } = render(<CohortSparklineGrid students={students} />);
    expect(container.querySelector("[data-testid='cohort-baseline']")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/components/__tests__/CohortSparklineGrid.test.tsx`
Expected: FAIL — `Cannot find module '../CohortSparklineGrid'`

---

### Task 7: Implement `CohortSparklineGrid`

**Files:**
- Create: `apps/web/src/components/CohortSparklineGrid.tsx`
- Create: `apps/web/src/components/CohortSparklineGrid.css`

- [ ] **Step 1: Write the component**

Create `apps/web/src/components/CohortSparklineGrid.tsx`:

```tsx
import "./CohortSparklineGrid.css";
import type { StudentSummary } from "../types";

interface Props {
  students: StudentSummary[];
  onStudentClick?: (alias: string) => void;
}

const CELL_W = 92;
const CELL_H = 28;
const PAD = 4;
const HISTORY_DAYS = 14;

/**
 * CohortSparklineGrid — small-multiples grid of per-student
 * 14-day intervention sparklines. Designed for pre-attentive
 * outlier detection: the eye finds rising or sustained cells
 * faster than reading a sequential roster.
 *
 * Encoding:
 *   x-axis: day (oldest left, today right) — fixed 14 points
 *   y-axis: per-student intervention count for that day
 *   per-cell scale: each sparkline is normalized to its own min/max
 *     so quiet students stay visually quiet, but trajectory still shows
 *   cohort baseline: faint dashed line per cell showing the cohort mean
 *
 * No automatic ranking, no risk score — alphabetical only by alias.
 */
export default function CohortSparklineGrid({ students, onStudentClick }: Props) {
  if (students.length === 0) {
    return (
      <div className="cohort-grid cohort-grid--empty" role="status">
        No students in cohort.
      </div>
    );
  }

  const sortedStudents = [...students].sort((a, b) =>
    a.alias.localeCompare(b.alias),
  );

  // Cohort baseline: per-day mean across all students (only when > 1 student).
  const baseline = students.length > 1 ? computeBaseline(students) : null;

  return (
    <div
      className="cohort-grid"
      role="group"
      aria-label="Cohort 14-day intervention pulse"
    >
      {sortedStudents.map((student) => {
        const total = sumSeries(student.intervention_history_14d);
        const ariaLabel = `${student.alias}: ${total} intervention${total === 1 ? "" : "s"} in last 14 days`;
        const cellContent = (
          <>
            <span className="cohort-cell__alias">{student.alias}</span>
            <CellSparkline
              data={student.intervention_history_14d}
              baseline={baseline}
            />
            <span className="sr-only">{ariaLabel}</span>
          </>
        );

        if (onStudentClick) {
          return (
            <button
              key={student.alias}
              data-testid="cohort-cell"
              className="cohort-cell cohort-cell--interactive"
              aria-label={ariaLabel}
              onClick={() => onStudentClick(student.alias)}
            >
              {cellContent}
            </button>
          );
        }

        return (
          <div
            key={student.alias}
            data-testid="cohort-cell"
            className="cohort-cell"
            aria-label={ariaLabel}
          >
            {cellContent}
          </div>
        );
      })}
    </div>
  );
}

interface CellSparklineProps {
  data: number[];
  baseline: number[] | null;
}

function CellSparkline({ data, baseline }: CellSparklineProps) {
  const max = Math.max(1, ...data, ...(baseline ?? []));
  const innerW = CELL_W - PAD * 2;
  const innerH = CELL_H - PAD * 2;

  const toPoints = (series: number[]) =>
    series
      .map((v, i) => {
        const x = PAD + (i / (series.length - 1)) * innerW;
        const y = PAD + (1 - v / max) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <svg
      className="cohort-cell__svg"
      width={CELL_W}
      height={CELL_H}
      viewBox={`0 0 ${CELL_W} ${CELL_H}`}
      aria-hidden="true"
    >
      {baseline && (
        <polyline
          data-testid="cohort-baseline"
          className="cohort-cell__baseline"
          points={toPoints(baseline)}
          fill="none"
          stroke="var(--color-text-tertiary)"
          strokeWidth={1}
          strokeOpacity={0.45}
          strokeDasharray="2 2"
        />
      )}
      <polyline
        className="cohort-cell__line"
        points={toPoints(data)}
        fill="none"
        stroke="var(--color-section-priority)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function sumSeries(data: number[]): number {
  return data.reduce((acc, v) => acc + v, 0);
}

function computeBaseline(students: StudentSummary[]): number[] {
  const out = new Array(HISTORY_DAYS).fill(0);
  for (const s of students) {
    for (let i = 0; i < HISTORY_DAYS; i += 1) {
      out[i] += s.intervention_history_14d[i] ?? 0;
    }
  }
  return out.map((v) => v / students.length);
}
```

- [ ] **Step 2: Write the CSS**

Create `apps/web/src/components/CohortSparklineGrid.css`:

```css
.cohort-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.cohort-grid--empty {
  padding: var(--space-4);
  color: var(--color-text-tertiary);
  font-size: 0.875rem;
  text-align: center;
}

.cohort-cell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-1);
  padding: var(--space-2);
  background: transparent;
  border: 1px solid var(--color-border-subtle, rgba(127, 127, 127, 0.18));
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.75rem;
  color: var(--color-text);
  text-align: left;
}

.cohort-cell--interactive {
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
}

.cohort-cell--interactive:hover,
.cohort-cell--interactive:focus-visible {
  border-color: var(--color-section-priority);
  outline: none;
}

.cohort-cell__alias {
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cohort-cell__svg {
  display: block;
  width: 100%;
  height: 28px;
}

@media (max-width: 600px) {
  .cohort-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: var(--space-2);
  }

  .cohort-cell {
    padding: var(--space-1) var(--space-2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cohort-cell--interactive {
    transition: none;
  }
}
```

- [ ] **Step 3: Run the tests**

Run: `npm run test -- apps/web/src/components/__tests__/CohortSparklineGrid.test.tsx`
Expected: PASS — all 10 tests green.

- [ ] **Step 4: Verify token usage against tokens.css**

Per `feedback_design_tokens.md`: invented tokens silently fail. List the tokens used by the new CSS and verify each one exists.

Run: `grep -oE "var\(--[a-z0-9-]+" apps/web/src/components/CohortSparklineGrid.css | sort -u`

For each token in the output, confirm it appears in `apps/web/src/styles/tokens.css`:

Run: `grep -E "^\s*--space-|^\s*--color-text|^\s*--color-section-priority|^\s*--color-border" apps/web/src/styles/tokens.css`

If `--color-border-subtle` is not present, change it to whichever subtle border token actually exists (likely `--color-border` or `--color-divider`). The fallback rgba in the CSS keeps it from breaking, but tokens-first per the project memory.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/CohortSparklineGrid.tsx apps/web/src/components/CohortSparklineGrid.css apps/web/src/components/__tests__/CohortSparklineGrid.test.tsx
git commit -m "feat(web): add CohortSparklineGrid component with tests"
```

---

## Phase C — Integration into ClassroomPanel

### Task 8: Mount the grid as a new zone in `ClassroomPanel`

**Files:**
- Modify: `apps/web/src/panels/ClassroomPanel.tsx`

- [ ] **Step 1: Add the import**

Near the existing import block in `ClassroomPanel.tsx` (around line 13), add:

```typescript
import CohortSparklineGrid from "../components/CohortSparklineGrid";
```

- [ ] **Step 2: Find the insertion point**

The new zone goes between the Watchlist zone (`<span className="classroom-section__eyebrow">Watchlist</span>`, ~line 399) and the Operating Dashboard section (`<OperatingDashboard ...`, ~line 437).

Run: `grep -n "Watchlist\|OperatingDashboard" apps/web/src/panels/ClassroomPanel.tsx`
Expected: confirms zone boundaries.

- [ ] **Step 3: Insert the new zone**

Find the closing `</section>` that ends the Watchlist zone. Immediately after it (and before the section that opens Operating Dashboard), insert:

```tsx
      {/* ============================================================
          ZONE 3.5 — COHORT PULSE
          14-day per-student intervention sparkline grid.
          Pre-attentive outlier scan that complements the top-N
          Watchlist with an everyone-at-once view.
          ============================================================ */}
      <section className="classroom-section" aria-labelledby="classroom-cohort-pulse-heading">
        <div className="classroom-section__header">
          <div>
            <span className="classroom-section__eyebrow">Cohort pulse</span>
            <h3 id="classroom-cohort-pulse-heading" className="classroom-section__title">
              14-day intervention pulse
            </h3>
          </div>
          <p className="classroom-section__caption">
            Each cell is one student. Tall recent peaks = active attention this week. Faint dashed line = cohort average.
          </p>
        </div>
        {studentSummaries.result && studentSummaries.result.length > 0 ? (
          <CohortSparklineGrid
            students={studentSummaries.result}
            onStudentClick={(alias) => setDrillDown({ type: "student", alias })}
          />
        ) : (
          <SectionSkeleton label="Loading cohort pulse" variant="story" lines={2} />
        )}
      </section>
```

- [ ] **Step 4: Run web tests**

Run: `npm run test -- apps/web/src/panels/__tests__/ClassroomPanel.test`
Expected: PASS. If tests assert on absence of certain text ("14-day intervention pulse", etc.), update them to allow presence — do not skip them.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/panels/ClassroomPanel.tsx
git commit -m "feat(web): mount CohortSparklineGrid as new Cohort Pulse zone on Classroom"
```

---

### Task 9: Smoke-browser test for Cohort Pulse rendering

**Files:**
- Modify (or create): `qa/smoke-browser.mjs` or the equivalent active smoke harness

- [ ] **Step 1: Locate the smoke harness**

Run: `find qa -name "smoke-browser*" -o -name "smoke*.mjs"` (limit to top 5 results)

If `qa/smoke-browser.mjs` exists, edit it. If a different name applies, edit the Classroom-page smoke entry.

- [ ] **Step 2: Add a getByTestId assertion**

Per `feedback_smoke_selectors.md`: prefer `getByTestId` over button-label selectors. Add an assertion that the Cohort Pulse zone renders. Use `page.$$()` (returns element handles, no callback) rather than the callback-based variant — this avoids brittle stringified-callback patterns:

```javascript
// In the Classroom page smoke section:
await page.waitForSelector('[data-testid="cohort-cell"]', { timeout: 5000 });
const cells = await page.$$('[data-testid="cohort-cell"]');
if (cells.length < 1) {
  throw new Error(`Expected at least 1 cohort cell, got ${cells.length}`);
}
```

- [ ] **Step 3: Run the smoke**

Run: `npm run smoke` (or whatever the smoke entrypoint is — check `package.json` scripts)
Expected: PASS — Cohort Pulse zone visible on Classroom page in mock mode.

- [ ] **Step 4: Commit**

```bash
git add qa/
git commit -m "test(smoke): assert Cohort Pulse renders on Classroom"
```

---

### Task 10: Manual visual check + screenshot

- [ ] **Step 1: Boot dev server**

Run: `npm run dev` (in background or new terminal)
Expected: web at http://localhost:5173, orchestrator at 3100.

- [ ] **Step 2: Open the demo classroom**

Visit `http://localhost:5173/?demo=true`

- [ ] **Step 3: Visual checklist**

Walk the Classroom page top-to-bottom. Confirm:
- Cohort pulse zone appears between Watchlist and "Week, coverage, queues"
- Grid wraps responsively (resize the window from 1440px → 800px → 375px)
- Each cell has an alias and a sparkline
- Cohort baseline (dashed) is visible in cells where any student has interventions
- Click on a cell opens the student drill-down drawer
- Dark mode (toggle if available) keeps grid readable — no invisible lines
- No console errors

If any item fails, fix in the relevant file and re-run tests before continuing.

- [ ] **Step 4: Capture screenshot**

Save a 1440px-wide screenshot of the Classroom page. Match the existing naming pattern in the repo root (`dashboard-*.png`):

```bash
grep -E "screenshot|capture" package.json
```

If a screenshot script exists, invoke it. Otherwise capture manually and save as `dashboard-cohort-pulse.png`.

---

## Phase D — Docs and validation

### Task 11: Regenerate inventory and run release gate

**Files:**
- Modify: `CLAUDE.md` (only if visualization count language exists; otherwise skip)
- Read: `docs/system-inventory.md` (after regen)

- [ ] **Step 1: Regenerate system inventory**

Run: `npm run system:inventory`
Expected: `docs/system-inventory.md` updated.

- [ ] **Step 2: Run typecheck + lint + tests**

Run separately (independent commands; can be parallel):
- `npm run typecheck`
- `npm run lint`
- `npm run test`

Expected: all PASS. Per CLAUDE.md the previous baseline was 1,891 vitest cases — new tests bring it to ≥1,901.

- [ ] **Step 3: Run the release gate**

Run: `npm run release:gate`
Expected: PASS in mock mode.

- [ ] **Step 4: Commit any auto-generated doc changes**

```bash
git add docs/
git commit -m "chore(docs): regenerate system inventory for cohort grid"
```

- [ ] **Step 5: Final verification**

Per `superpowers:verification-before-completion` — never claim done without running the verification commands. Already covered in Step 2-3 above.

---

## Self-Review

**Spec coverage:**
- Real per-student 14-day series → Phase A (schema + memory query)
- Tuftean small-multiples grid → Phase B (CohortSparklineGrid)
- Cohort baseline overlay → Task 7, `computeBaseline` helper
- Alphabetical sort, no auto-ranking → Task 7, `localeCompare`
- Click routes to student drill-down → Task 8 integration
- Responsive layout, mobile breakpoint → Task 7 CSS
- Reduced-motion friendly → Task 7 CSS, transition gated
- Aria-label per cell with alias + total → Tasks 6 + 7
- Empty-state for zero students → Tasks 6 + 7

**Placeholder scan:** No "TBD", no "implement appropriate", no "similar to Task N" without code, no missing function definitions.

**Type consistency:** `intervention_history_14d` is the same name in: shared schema (Task 1), memory helper output mapping (Task 4), frontend type (Task 5), test fixture (Task 6), component prop usage (Task 7). `getInterventionHistoryByStudent` signature is consistent between definition (Task 3) and usage (Task 4).

**Risk note:** The new SQL query in `intervention-history.ts` filters by classroom and date range in SQL but expands `student_refs` JSON in JavaScript. This is fine for cohort sizes ≤ ~50 students per classroom. If a single classroom ever exceeds that and query latency shows up in profiling, push the alias filter into SQL via `EXISTS (SELECT 1 FROM json_each(student_refs) WHERE value IN (...))` with a parameterized list.

---

## Execution Handoff

Plan complete. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — use superpowers:executing-plans, batch execution with checkpoints.

Which approach?
