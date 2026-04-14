# TodayStory Hero Restage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote `TodayStory` to a full-width hero directly under `PageIntro` on the Today panel, pair it with one prominent primary CTA bound to `recommendedAction`, and move the existing grid (DayArc, visualizations, PendingActionsCard, HealthBar, PlanRecap, Forecast, Roster) into a clearly-separated "Classroom pulse" section below.

**Architecture:** Introduce a new presentational component `TodayHero` in `apps/web/src/components/` that composes the existing `TodayStory` and a single `ActionButton`. `TodayPanel.tsx` will render `<TodayHero />` above the grid, stop passing `primaryAction`/`onNavigate` to `PendingActionsCard`, wrap the rest of the dashboard in a `<section className="today-pulse">` with a quiet section header, and drop all new styles into a dedicated `TodayHero.css`. No new types are introduced — the hero consumes the same inline return type that `getRecommendedAction` already produces.

**Tech Stack:** React 18, Vite, TypeScript, vitest, @testing-library/react, CSS custom properties

---

### Task 1: Scaffold `TodayHero` component with failing tests

**Files:**
- Create: `apps/web/src/components/TodayHero.tsx`
- Create: `apps/web/src/components/TodayHero.css`
- Create: `apps/web/src/components/__tests__/TodayHero.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/__tests__/TodayHero.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TodayHero from "../TodayHero";
import type {
  TodaySnapshot,
  ClassroomHealth,
  ComplexityForecast,
} from "../../types";

function makeForecast(
  peak: "low" | "medium" | "high" = "high",
): ComplexityForecast {
  return {
    forecast_id: "fc-1",
    classroom_id: "demo",
    forecast_date: "2026-04-13",
    overall_summary: "",
    highest_risk_block: "10:00-10:45",
    schema_version: "1.0",
    blocks: [
      {
        time_slot: "09:00-09:45",
        activity: "Literacy",
        level: "medium",
        contributing_factors: [],
        suggested_mitigation: "",
      },
      {
        time_slot: "10:00-10:45",
        activity: "Math",
        level: peak,
        contributing_factors: [],
        suggested_mitigation: "",
      },
    ],
  };
}

function makeSnapshot(overrides: Partial<TodaySnapshot> = {}): TodaySnapshot {
  return {
    debt_register: {
      register_id: "r1",
      classroom_id: "demo",
      items: [],
      item_count_by_category: {},
      generated_at: "2026-04-13T00:00:00Z",
      schema_version: "1.0",
    },
    latest_plan: null,
    latest_forecast: null,
    student_count: 3,
    last_activity_at: null,
    ...overrides,
  } as TodaySnapshot;
}

function makeHealth(streak = 0, planToday = false): ClassroomHealth {
  const plans7 = [planToday, false, false, false, false, false, false];
  return {
    streak_days: streak,
    plans_last_7: plans7,
    messages_approved: 0,
    messages_total: 0,
    trends: {
      debt_total_14d: [],
      plans_14d: [],
      peak_complexity_14d: [],
    },
  };
}

const calmAction = {
  description:
    "Core planning is up to date. Use the prep suite to build differentiated material for the next lesson artifact.",
  tab: "differentiate" as const,
  cta: "Differentiate",
  label: "Prep ready",
  tone: "success" as const,
};

describe("TodayHero", () => {
  it("renders the TodayStory lede inside the hero shell", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    expect(screen.getByText(/breathe/i)).toBeInTheDocument();
  });

  it("renders the primary CTA with 'Open {cta}' label", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /open differentiate/i }),
    ).toBeInTheDocument();
  });

  it("invokes onCtaClick when the primary button is pressed", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={handler}
      />,
    );
    await user.click(screen.getByRole("button", { name: /open differentiate/i }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("surfaces the recommended-action label chip inside the hero", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    expect(screen.getByText("Prep ready")).toBeInTheDocument();
  });

  it("omits the CTA row when recommendedAction is null", () => {
    render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={null}
        onCtaClick={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /open differentiate/i }),
    ).not.toBeInTheDocument();
  });

  it("exposes a landmark region labelled 'Today hero'", () => {
    const { container } = render(
      <TodayHero
        snapshot={makeSnapshot({ latest_forecast: makeForecast("low") })}
        health={makeHealth(5, true)}
        students={[]}
        recommendedAction={calmAction}
        onCtaClick={() => {}}
      />,
    );
    expect(container.querySelector(".today-hero")).toBeInTheDocument();
    expect(
      container.querySelector('[aria-label="Today hero"]'),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=apps/web -- TodayHero`
Expected: FAIL with `Failed to resolve import "../TodayHero"` (the component file does not yet exist).

- [ ] **Step 3: Create the `TodayHero` component**

Create `apps/web/src/components/TodayHero.tsx`:

```tsx
/**
 * TodayHero.tsx — Full-width hero banner above the Today dashboard grid.
 *
 * Pairs the deterministic TodayStory narrative with a single primary CTA
 * tied to the panel's `recommendedAction`. Everything else on the Today
 * panel (DayArc, visualizations, HealthBar, PlanRecap, etc.) flows below
 * the "Classroom pulse" section divider.
 */

import type { ActiveTab } from "../appReducer";
import type {
  TodaySnapshot,
  ClassroomHealth,
  StudentSummary,
} from "../types";
import TodayStory from "./TodayStory";
import StatusChip from "./StatusChip";
import { ActionButton } from "./shared";
import "./TodayHero.css";

export interface TodayHeroAction {
  description: string;
  tab: ActiveTab;
  cta: string;
  label: string;
  tone: "pending" | "warning" | "analysis" | "provenance" | "success";
}

interface Props {
  snapshot: TodaySnapshot | null;
  health: ClassroomHealth | null;
  students: StudentSummary[];
  recommendedAction: TodayHeroAction | null;
  onCtaClick: () => void;
}

export default function TodayHero({
  snapshot,
  health,
  students,
  recommendedAction,
  onCtaClick,
}: Props) {
  return (
    <section className="today-hero" aria-label="Today hero">
      <TodayStory snapshot={snapshot} health={health} students={students} />
      {recommendedAction ? (
        <div className="today-hero__cta-row">
          <StatusChip
            label={recommendedAction.label}
            tone={recommendedAction.tone}
          />
          <ActionButton
            variant="primary"
            size="lg"
            onClick={onCtaClick}
            className="today-hero__cta"
          >
            Open {recommendedAction.cta}
          </ActionButton>
        </div>
      ) : null}
    </section>
  );
}
```

Create `apps/web/src/components/TodayHero.css`:

```css
/* ================================================================
   TodayHero.css — Full-width hero above the Today dashboard grid
   ================================================================
   Gives the narrative and primary CTA the dominant visual weight on
   the Command Center. All spacing, color, and radius values are
   sourced from the design-token layer.
   ================================================================ */

.today-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-surface-elevated) 82%, transparent),
      color-mix(in srgb, var(--color-surface-elevated) 28%, transparent)
    ),
    var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md), var(--inner-stroke);
}

/* Let the narrative breathe at a full hero scale inside the hero shell. */
.today-hero .today-story {
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.today-hero .today-story__lede {
  font-size: var(--text-3xl);
  line-height: var(--leading-tight);
  letter-spacing: -0.01em;
}

.today-hero .today-story__sub {
  font-size: var(--text-base);
  max-width: 72ch;
}

.today-hero__cta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid color-mix(in srgb, var(--color-border) 62%, transparent);
}

.today-hero__cta {
  margin-left: auto;
}

@media (max-width: 760px) {
  .today-hero {
    padding: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .today-hero .today-story__lede {
    font-size: var(--text-2xl);
  }

  .today-hero .today-story__sub {
    font-size: var(--text-sm);
  }

  .today-hero__cta-row {
    flex-direction: column;
    align-items: stretch;
  }

  .today-hero__cta {
    margin-left: 0;
    width: 100%;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=apps/web -- TodayHero`
Expected: PASS — all 6 cases under `describe("TodayHero", ...)` green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/TodayHero.tsx apps/web/src/components/TodayHero.css apps/web/src/components/__tests__/TodayHero.test.tsx
git commit -m "feat(today): introduce TodayHero component with primary CTA"
```

---

### Task 2: Mount `TodayHero` above the grid in `TodayPanel`

**Files:**
- Modify: `apps/web/src/panels/TodayPanel.tsx:137-156` (add hero rendering above the `today-grid` and drop the inline `<TodayStory />` usage)
- Test: `apps/web/src/panels/__tests__/TodayPanel.test.tsx` (create if it does not exist)

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/panels/__tests__/TodayPanel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import TodayPanel from "../TodayPanel";
import { AppProvider } from "../../AppContext";
import { SessionProvider } from "../../SessionContext";
import type {
  TodaySnapshot,
  ClassroomHealth,
  StudentSummary,
} from "../../types";

vi.mock("../../api", () => ({
  fetchTodaySnapshot: vi.fn(),
  fetchClassroomHealth: vi.fn(),
  fetchStudentSummary: vi.fn(),
}));

import {
  fetchTodaySnapshot,
  fetchClassroomHealth,
  fetchStudentSummary,
} from "../../api";

const snapshot: TodaySnapshot = {
  debt_register: {
    register_id: "r1",
    classroom_id: "demo",
    items: [],
    item_count_by_category: {},
    generated_at: "2026-04-13T00:00:00Z",
    schema_version: "1.0",
  },
  latest_plan: null,
  latest_forecast: {
    forecast_id: "fc-1",
    classroom_id: "demo",
    forecast_date: "2026-04-13",
    overall_summary: "",
    highest_risk_block: "10:00-10:45",
    schema_version: "1.0",
    blocks: [
      {
        time_slot: "10:00-10:45",
        activity: "Math",
        level: "low",
        contributing_factors: [],
        suggested_mitigation: "",
      },
    ],
  },
  student_count: 3,
  last_activity_at: null,
} as TodaySnapshot;

const health: ClassroomHealth = {
  streak_days: 5,
  plans_last_7: [true, true, true, true, true, false, false],
  messages_approved: 0,
  messages_total: 0,
  trends: {
    debt_total_14d: [],
    plans_14d: [],
    peak_complexity_14d: [],
  },
};

const students: StudentSummary[] = [];

beforeEach(() => {
  vi.mocked(fetchTodaySnapshot).mockResolvedValue(snapshot);
  vi.mocked(fetchClassroomHealth).mockResolvedValue(health);
  vi.mocked(fetchStudentSummary).mockResolvedValue(students);
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderPanel() {
  return render(
    <AppProvider>
      <SessionProvider>
        <TodayPanel onTabChange={() => {}} />
      </SessionProvider>
    </AppProvider>,
  );
}

describe("TodayPanel layout", () => {
  it("renders the TodayHero landmark above the pulse grid", async () => {
    const { container } = renderPanel();
    await waitFor(() => {
      expect(container.querySelector(".today-hero")).toBeInTheDocument();
    });
    const hero = container.querySelector(".today-hero")!;
    const grid = container.querySelector(".today-grid")!;
    expect(grid).toBeInTheDocument();
    // DOM order: hero must appear before the grid in source order.
    expect(
      hero.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders the hero CTA tied to the recommended action", async () => {
    renderPanel();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /open differentiate/i }),
      ).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=apps/web -- TodayPanel`
Expected: FAIL — `.today-hero` is not found in the rendered output because `TodayPanel` still renders `<TodayStory />` inside the grid.

- [ ] **Step 3: Mount `TodayHero` inside `TodayPanel`**

In `apps/web/src/panels/TodayPanel.tsx`:

Replace the import on line 24:

```tsx
import TodayStory from "../components/TodayStory";
```

with:

```tsx
import TodayHero from "../components/TodayHero";
```

Replace the current markup block at lines 137-156 (from `{result ? (` through the `<TodayStory ... />` usage) so the hero renders outside the grid:

```tsx
      {result ? (
        <>
          <TodayHero
            snapshot={result}
            health={health.result ?? null}
            students={studentSummaries.result ?? []}
            recommendedAction={recommendedAction}
            onCtaClick={() => {
              if (recommendedAction) onTabChange(recommendedAction.tab);
            }}
          />
          <div className="today-grid motion-stagger">
            <DayArc
              forecast={result.latest_forecast}
              students={studentSummaries.result ?? []}
              debtItems={result.debt_register.items}
              health={health.result ?? null}
              onStudentClick={(alias) => setDrillDown({ type: "student", alias })}
              onBlockClick={(index) => {
                const block = result.latest_forecast?.blocks[index];
                if (block) setDrillDown({ type: "forecast-block", blockIndex: index, block });
              }}
            />
```

Then delete the now-duplicated `<TodayStory ...>` block that currently sits between `<DayArc />` and `<PendingActionsCard />` (lines 151-155 in the current file).

Close the new fragment wrapper where the existing grid `</div>` closes (currently line 286) so the closing becomes:

```tsx
          </div>
        </>
      ) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=apps/web -- TodayPanel`
Expected: PASS — both layout assertions green. Also run `npm run test --workspace=apps/web -- TodayStory` to confirm the `composeStory` and `TodayStory` tests still pass unchanged.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/panels/TodayPanel.tsx apps/web/src/panels/__tests__/TodayPanel.test.tsx
git commit -m "feat(today): mount TodayHero above the dashboard grid"
```

---

### Task 3: Remove duplicate `primaryAction` from `PendingActionsCard`

**Files:**
- Modify: `apps/web/src/components/PendingActionsCard.tsx:15-68` (delete `primaryAction`/`onNavigate` coupling; keep per-item navigation)
- Modify: `apps/web/src/panels/TodayPanel.tsx:157-200` (drop `primaryAction` and `onNavigate` props at the call site)
- Modify: `apps/web/src/components/__tests__/PendingActionsCard.test.tsx` if it exists, or create it

- [ ] **Step 1: Write the failing test**

Check whether `apps/web/src/components/__tests__/PendingActionsCard.test.tsx` exists. If it does, update it; otherwise create it with this content:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PendingActionsCard from "../PendingActionsCard";
import SectionIcon from "../SectionIcon";

describe("PendingActionsCard", () => {
  const items = [
    {
      key: "unapproved_message",
      label: "unapproved messages",
      count: 2,
      targetTab: "family-message" as const,
      icon: <SectionIcon name="mail" />,
    },
  ];

  it("does not render the legacy 'Open {cta}' primary action button", () => {
    render(
      <PendingActionsCard
        items={items}
        totalCount={2}
        studentsToCheckFirst={[]}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /^open /i }),
    ).not.toBeInTheDocument();
  });

  it("invokes onItemClick when a triage row is pressed", async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    render(
      <PendingActionsCard
        items={items}
        totalCount={2}
        studentsToCheckFirst={[]}
        onItemClick={onItemClick}
      />,
    );
    await user.click(screen.getByRole("button", { name: /unapproved messages/i }));
    expect(onItemClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=apps/web -- PendingActionsCard`
Expected: FAIL — TypeScript will complain that `primaryAction` and `onNavigate` are required props on `PendingActionsCard`, and/or the first assertion will fail because the "Open ..." button still renders.

- [ ] **Step 3: Drop `primaryAction`/`onNavigate` from `PendingActionsCard`**

Edit `apps/web/src/components/PendingActionsCard.tsx`:

Remove the `PrimaryAction` interface and update `Props`:

```tsx
import type { ActiveTab } from "../appReducer";
import StatusChip from "./StatusChip";
import { Card } from "./shared";

import type { ReactNode } from "react";

interface ActionItem {
  key: string;
  label: string;
  count: number;
  targetTab: ActiveTab;
  icon: ReactNode;
}

interface Props {
  items: ActionItem[];
  onItemClick?: (item: ActionItem) => void;
  totalCount: number;
  studentsToCheckFirst?: string[];
  onStudentClick?: (studentRef: string) => void;
}
```

Replace the component body so the header row no longer renders the primary CTA and each triage row relies solely on `onItemClick`:

```tsx
export default function PendingActionsCard({
  items,
  onItemClick,
  totalCount,
  studentsToCheckFirst = [],
  onStudentClick,
}: Props) {
  const activeItems = items.filter((item) => item.count > 0);

  return (
    <Card variant="raised" tone="priority" accent className="today-triage-card">
      <Card.Body className="today-triage-card__body">
        <div className="pending-actions-header-row">
          <div className="today-triage-card__header-copy">
            <div className="today-triage-card__meta">
              <span className="pending-actions-heading">Needs Attention Now</span>
              <StatusChip
                label={formatActionCount(totalCount)}
                tone={totalCount > 0 ? "warning" : "success"}
              />
            </div>
          </div>
        </div>

        {activeItems.length > 0 ? (
          <div className="today-triage-list motion-stagger">
            {activeItems.map((item) => (
              <button
                key={`${item.key}-${item.targetTab}`}
                className="today-triage-row"
                onClick={() => onItemClick?.(item)}
                type="button"
              >
                <span className="pending-action-icon" aria-hidden="true">{item.icon}</span>
                <span className="today-triage-row__label">{item.label}</span>
                <span className="today-triage-row__count">{item.count}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="pending-actions pending-actions--clear">
            <p className="pending-actions-clear-text">No pending actions — you're caught up.</p>
          </div>
        )}

        {studentsToCheckFirst.length > 0 ? (
          <div className="today-triage-students">
            <span className="today-triage-students__label">Students to check first</span>
            <div className="today-triage-students__chips">
              {studentsToCheckFirst.map((studentRef) => (
                <button
                  key={studentRef}
                  type="button"
                  className="today-triage-students__chip"
                  onClick={() => onStudentClick?.(studentRef)}
                >
                  {studentRef}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
```

Also remove the now-unused `ActionButton` import at the top of the file.

In `apps/web/src/panels/TodayPanel.tsx`, remove the two removed props from the call site (currently lines 188-189):

```tsx
          <PendingActionsCard
            items={[
              {
                key: "unapproved_message",
                label: "unapproved messages",
                count: result.debt_register.item_count_by_category.unapproved_message ?? 0,
                targetTab: "family-message",
                icon: <SectionIcon name="mail" className="shell-nav__group-icon" />,
              },
              {
                key: "stale_followup",
                label: "stale follow-ups",
                count: result.debt_register.item_count_by_category.stale_followup ?? 0,
                targetTab: "log-intervention",
                icon: <SectionIcon name="alert" className="shell-nav__group-icon" />,
              },
              {
                key: "unaddressed_pattern",
                label: "unaddressed patterns",
                count: result.debt_register.item_count_by_category.unaddressed_pattern ?? 0,
                targetTab: "support-patterns",
                icon: <SectionIcon name="star" className="shell-nav__group-icon" />,
              },
              {
                key: "approaching_review",
                label: "approaching review",
                count: result.debt_register.item_count_by_category.approaching_review ?? 0,
                targetTab: "support-patterns",
                icon: <SectionIcon name="clock" className="shell-nav__group-icon" />,
              },
            ]}
            totalCount={totalActionCount}
            studentsToCheckFirst={studentsToCheckFirst}
            onStudentClick={(studentRef) => setDrillDown({ type: "student", alias: studentRef })}
            onItemClick={(item) => {
              if (item.key) {
                const category = item.key;
                const items = result.debt_register.items.filter((i) => i.category === category);
                setDrillDown({ type: "debt-category", category, items });
              }
            }}
          />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=apps/web -- PendingActionsCard`
Expected: PASS. Also run `npm run typecheck` from the repo root and expect clean output; the `primaryAction!` non-null assertion on the former line 188 must be gone.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/PendingActionsCard.tsx apps/web/src/components/__tests__/PendingActionsCard.test.tsx apps/web/src/panels/TodayPanel.tsx
git commit -m "refactor(today): retire PendingActionsCard primary action row"
```

---

### Task 4: Wrap the grid in a "Classroom pulse" section

**Files:**
- Modify: `apps/web/src/panels/TodayPanel.tsx` (wrap the `today-grid` in a `<section className="today-pulse">` with a quiet heading)
- Modify: `apps/web/src/panels/TodayPanel.css` (add `.today-pulse` and `.today-pulse__header` rules)
- Modify: `apps/web/src/panels/__tests__/TodayPanel.test.tsx` (add assertion)

- [ ] **Step 1: Write the failing test**

Append this test to the existing `describe("TodayPanel layout", ...)` block in `apps/web/src/panels/__tests__/TodayPanel.test.tsx`:

```tsx
  it("renders a 'Classroom pulse' section wrapping the grid", async () => {
    const { container } = renderPanel();
    await waitFor(() => {
      expect(container.querySelector(".today-pulse")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: /classroom pulse/i }),
    ).toBeInTheDocument();
    const pulseSection = container.querySelector(".today-pulse")!;
    expect(pulseSection.querySelector(".today-grid")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=apps/web -- TodayPanel`
Expected: FAIL — `.today-pulse` selector returns `null`.

- [ ] **Step 3: Wrap the grid in `<section className="today-pulse">`**

In `apps/web/src/panels/TodayPanel.tsx`, change the post-hero block so the existing `<div className="today-grid motion-stagger">` is nested inside a new `<section className="today-pulse" aria-labelledby="today-pulse-heading">`:

```tsx
          <section
            className="today-pulse"
            aria-labelledby="today-pulse-heading"
          >
            <header className="today-pulse__header">
              <h2 id="today-pulse-heading" className="today-pulse__title">
                Classroom pulse
              </h2>
              <p className="today-pulse__subtitle">
                The full snapshot — visualizations, attention queue, and forecast.
              </p>
            </header>
            <div className="today-grid motion-stagger">
              {/* ...existing DayArc / PendingActionsCard / visualizations / HealthBar / PlanRecap / ForecastTimeline / StudentRoster / EmptyStateCard children, unchanged... */}
            </div>
          </section>
```

(Do not change the children of the grid — the change is a wrapping section plus the header only.)

Append the matching CSS to `apps/web/src/panels/TodayPanel.css`:

```css
.today-pulse {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.today-pulse__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-top: var(--space-3);
  border-top: 1px solid color-mix(in srgb, var(--color-border) 62%, transparent);
}

.today-pulse__title {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.today-pulse__subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  max-width: 62ch;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=apps/web -- TodayPanel`
Expected: PASS — all three layout assertions green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/panels/TodayPanel.tsx apps/web/src/panels/TodayPanel.css apps/web/src/panels/__tests__/TodayPanel.test.tsx
git commit -m "feat(today): wrap dashboard grid in Classroom pulse section"
```

---

### Task 5: Cross-cutting validation and design-system check

**Files:**
- Validate only: `apps/web/src/components/TodayHero.css`, `apps/web/src/panels/TodayPanel.css`

- [ ] **Step 1: Write the failing guard test (token hygiene)**

Add one smoke assertion to `apps/web/src/components/__tests__/TodayHero.test.tsx` that ensures no raw hex values leaked into the new stylesheet:

```tsx
import fs from "node:fs";
import path from "node:path";

describe("TodayHero css hygiene", () => {
  it("does not introduce raw hex colors", () => {
    const cssPath = path.resolve(
      __dirname,
      "..",
      "TodayHero.css",
    );
    const css = fs.readFileSync(cssPath, "utf8");
    // Match #abc or #aabbcc hex literals (excluding var refs).
    const hexMatches = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexMatches).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (only if a hex slipped in)**

Run: `npm run test --workspace=apps/web -- TodayHero`
Expected: PASS — the CSS shipped in Task 1 already uses only `var(--*)` references. If the test fails, a hex value was introduced and must be replaced with the matching `--color-*` token before proceeding.

- [ ] **Step 3: Run broader checks**

Run these three commands from the repo root in order:

```bash
npm run typecheck
npm run lint
npm run test --workspace=apps/web
```

Expected:
- `typecheck`: 0 errors.
- `lint`: 0 errors (any new unused-import warnings must be cleaned up).
- `test`: all suites green, including `TodayStory`, `TodayHero`, `PendingActionsCard`, and `TodayPanel`.

- [ ] **Step 4: Manual visual check**

Start the dev server with `npm run dev --workspace=apps/web`, open `http://localhost:5173/?demo=true`, and verify:
- The hero sits immediately under the PageIntro, occupies the full content width, and renders the serif lede at a larger scale than the previous in-grid TodayStory.
- The primary CTA label matches `Open {recommendedAction.cta}` for the demo classroom.
- Scrolling past the hero reveals the "Classroom pulse" heading, then the existing DayArc, visualizations, PendingActionsCard (without a second "Open ..." button), HealthBar, PlanRecap, forecast, and roster.
- Narrow the viewport to 600px and confirm the hero CTA goes full-width and the Classroom pulse section header still renders.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/__tests__/TodayHero.test.tsx
git commit -m "test(today): guard TodayHero css against raw hex values"
```

---

## Rollback plan

If the hero restage causes regressions in production:

1. Revert the commits in reverse order (Task 5 → Task 4 → Task 3 → Task 2 → Task 1).
2. Re-run `npm run test --workspace=apps/web` to confirm the previous layout is restored.
3. Note: reverting Task 3 restores the duplicated primary CTA inside `PendingActionsCard`, which is acceptable as a temporary state while root-causing any hero failure.
