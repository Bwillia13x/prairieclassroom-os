# Role Identity Pill + Scope Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface per-classroom adult role (teacher / EA / substitute / reviewer) as first-class, persisted, visually distinct state in the UI, send it on every API request as `X-Classroom-Role`, and gate write-action buttons (starting with Family Message approval) via a `useRole()` capability hook with backward-compatible defaulting.

**Architecture:** Role is stored in `AppState.classroomRoles` keyed by `classroom_id`, persisted to `localStorage` under `prairie-classroom-roles`, and exposed through `AppContext` as `activeRole` + `setClassroomRole`. A pure `useRole()` hook maps role to a capability record (`canWrite`, `canApproveMessages`, `canLogInterventions`, `canEditSchedule`). A new `RoleContextPill` mounts next to `shell-classroom-pill` in the app header and opens a 4-option dropdown; when a protected classroom is activated without a stored role, `RolePromptDialog` intercepts and prompts the user. `configureApiClient` gains a `getClassroomRole` callback so every request adds the header. Family Message approval is the first gated action to prove the pattern end-to-end.

**Tech Stack:** React 18, Vite, TypeScript, vitest, @testing-library/react

---

## Working directory

All commands assume you are in `/Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev`.

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
pwd  # must print .../prairieclassroom-predev
```

## Conventions used throughout this plan

- Every task is TDD: write the failing test first, run it, then implement, then re-run.
- Every task ends with a commit scoped to the files touched by that task (`git add <file>` — never `git add -A`).
- Every task references exact file paths (including line ranges where the edit is local to a region).
- `ClassroomRole` defined in Task 1 is the single source of truth; every later task imports it unchanged.
- Tests live beside the code they cover under `__tests__/` using `*.test.ts` or `*.test.tsx`, following the `vitest` + `@testing-library/react` patterns established in `apps/web/src/panels/__tests__/TodayPanel.test.tsx` and `apps/web/src/__tests__/api.test.ts`.
- No hex literals in new CSS. Colors must reference `var(--color-role-*)` tokens introduced in Task 9.
- Reducer tests in this repo do not yet have a dedicated `appReducer.test.ts` file — Task 1 creates one.

---

### Task 1: Add `ClassroomRole` type, `classroomRoles` state, `SET_CLASSROOM_ROLE` action, and persistence

**Files:**
- Create: `apps/web/src/__tests__/appReducer.test.ts`
- Modify: `apps/web/src/appReducer.ts` (lines 146-261 — `AppState`, `AppAction`, `createInitialState`, `loadClassroomAccessCodes` neighborhood; and lines 263-407 — reducer cases)

- [ ] **Step 1.1: Write the failing reducer test for role state + persistence**

Create `apps/web/src/__tests__/appReducer.test.ts` with the exact content below. This is the first reducer test file in the repo; it establishes the `expect(appReducer(initial, action)).toEqual(next)` pattern that future reducer changes will follow.

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { appReducer, createInitialState, type AppState } from "../appReducer";
import type { ClassroomRole } from "../appReducer";

function baseState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...createInitialState(),
    ...overrides,
  };
}

describe("appReducer — SET_CLASSROOM_ROLE", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores the role for the given classroom", () => {
    const initial = baseState({ classroomRoles: {} });
    const next = appReducer(initial, {
      type: "SET_CLASSROOM_ROLE",
      classroomId: "demo-okafor-grade34",
      role: "ea",
    });
    expect(next.classroomRoles).toEqual({ "demo-okafor-grade34": "ea" });
  });

  it("preserves existing role entries for other classrooms", () => {
    const initial = baseState({ classroomRoles: { "classroom-a": "teacher" } });
    const next = appReducer(initial, {
      type: "SET_CLASSROOM_ROLE",
      classroomId: "classroom-b",
      role: "substitute",
    });
    expect(next.classroomRoles).toEqual({
      "classroom-a": "teacher",
      "classroom-b": "substitute",
    });
  });

  it("overwrites an existing role for the same classroom", () => {
    const initial = baseState({ classroomRoles: { "classroom-a": "teacher" } });
    const next = appReducer(initial, {
      type: "SET_CLASSROOM_ROLE",
      classroomId: "classroom-a",
      role: "reviewer",
    });
    expect(next.classroomRoles).toEqual({ "classroom-a": "reviewer" });
  });

  it("persists the role map to localStorage under prairie-classroom-roles", () => {
    const initial = baseState({ classroomRoles: {} });
    appReducer(initial, {
      type: "SET_CLASSROOM_ROLE",
      classroomId: "classroom-a",
      role: "ea",
    });
    expect(localStorage.getItem("prairie-classroom-roles")).toBe(
      JSON.stringify({ "classroom-a": "ea" }),
    );
  });
});

describe("createInitialState — classroomRoles hydration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults classroomRoles to {} when no stored value is present", () => {
    const state = createInitialState();
    expect(state.classroomRoles).toEqual({});
  });

  it("hydrates classroomRoles from localStorage", () => {
    localStorage.setItem(
      "prairie-classroom-roles",
      JSON.stringify({ "classroom-a": "teacher", "classroom-b": "ea" }),
    );
    const state = createInitialState();
    expect(state.classroomRoles).toEqual({
      "classroom-a": "teacher",
      "classroom-b": "ea",
    });
  });

  it("drops unknown role strings and falls back to teacher with a console warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(
      "prairie-classroom-roles",
      JSON.stringify({ "classroom-a": "admin", "classroom-b": "ea" }),
    );
    const state = createInitialState();
    expect(state.classroomRoles).toEqual({
      "classroom-a": "teacher",
      "classroom-b": "ea",
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("ignores malformed JSON and returns an empty map", () => {
    localStorage.setItem("prairie-classroom-roles", "{not json");
    const state = createInitialState();
    expect(state.classroomRoles).toEqual({});
  });
});

describe("ClassroomRole literal shape", () => {
  it("exports the four supported role values", () => {
    const roles: ClassroomRole[] = ["teacher", "ea", "substitute", "reviewer"];
    expect(roles).toHaveLength(4);
  });
});
```

Run:
```bash
npm run test -- appReducer.test 2>&1 | tail -30
```
Expected: all 9 tests fail with `Cannot find name 'ClassroomRole'` / `classroomRoles` missing / `SET_CLASSROOM_ROLE` not handled. This is the red bar — proceed to implementation.

- [ ] **Step 1.2: Add `ClassroomRole` type, `loadClassroomRoles` loader, and `classroomRoles` to `AppState`**

In `apps/web/src/appReducer.ts`, add the following type export immediately before the `// ─── App State ───` section header (around line 145):

```ts
// ─── Classroom Role ───

export type ClassroomRole = "teacher" | "ea" | "substitute" | "reviewer";

export const CLASSROOM_ROLES: readonly ClassroomRole[] = [
  "teacher",
  "ea",
  "substitute",
  "reviewer",
] as const;

export function isClassroomRole(value: unknown): value is ClassroomRole {
  return typeof value === "string" && (CLASSROOM_ROLES as readonly string[]).includes(value);
}
```

Then extend `AppState` (currently ends at line 174 with `authPrompt: AuthPromptState | null;`) to add:

```ts
  // Per-classroom role selection (persisted locally)
  classroomRoles: Record<string, ClassroomRole>;
```

- [ ] **Step 1.3: Add the `SET_CLASSROOM_ROLE` action variant**

In the `AppAction` union (currently ending around line 206 with `| { type: "CLOSE_AUTH_PROMPT" }`), add a new entry before the closing semicolon:

```ts
  | { type: "SET_CLASSROOM_ROLE"; classroomId: string; role: ClassroomRole }
```

- [ ] **Step 1.4: Add `loadClassroomRoles` loader beside the existing `loadClassroomAccessCodes`**

Directly below `loadClassroomAccessCodes` (around line 235), add:

```ts
function loadClassroomRoles(): Record<string, ClassroomRole> {
  try {
    const raw = localStorage.getItem("prairie-classroom-roles");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, ClassroomRole> = {};
    let hadInvalid = false;
    for (const [classroomId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isClassroomRole(value)) {
        result[classroomId] = value;
      } else {
        hadInvalid = true;
        result[classroomId] = "teacher";
      }
    }
    if (hadInvalid) {
      console.warn(
        "[appReducer] Dropped unknown role values from prairie-classroom-roles; defaulted to 'teacher'.",
      );
    }
    return result;
  } catch {
    return {};
  }
}
```

- [ ] **Step 1.5: Wire `classroomRoles` into `createInitialState`**

In `createInitialState` (currently returns at line 237-261), add `classroomRoles: loadClassroomRoles(),` on a new line directly after `classroomAccessCodes: loadClassroomAccessCodes(),`.

- [ ] **Step 1.6: Add the `SET_CLASSROOM_ROLE` reducer case**

Inside `appReducer`'s switch, directly after the `SET_CLASSROOM_ACCESS_CODE` case block (currently lines 385-396), add:

```ts
    case "SET_CLASSROOM_ROLE": {
      const classroomRoles = {
        ...state.classroomRoles,
        [action.classroomId]: action.role,
      };
      try {
        localStorage.setItem("prairie-classroom-roles", JSON.stringify(classroomRoles));
      } catch {
        /* noop */
      }
      return { ...state, classroomRoles };
    }
```

- [ ] **Step 1.7: Re-run the reducer test**

```bash
npm run test -- appReducer.test 2>&1 | tail -30
```
Expected: all 9 tests pass.

- [ ] **Step 1.8: Typecheck**

```bash
npm run typecheck 2>&1 | tail -20
```
Expected: no errors.

- [ ] **Step 1.9: Commit**

```bash
git add apps/web/src/appReducer.ts apps/web/src/__tests__/appReducer.test.ts
git commit -m "feat(roles): add ClassroomRole state, persistence, and reducer case"
```

---

### Task 2: Extend `AppContextValue` with `activeRole` + `setClassroomRole`

**Files:**
- Create: `apps/web/src/__tests__/AppContext.test.tsx`
- Modify: `apps/web/src/AppContext.tsx` (lines 1-41 — full file)
- Modify: `apps/web/src/App.tsx` (lines 497-535 — `ctxValue` useMemo assembly)

- [ ] **Step 2.1: Write the failing context test**

Create `apps/web/src/__tests__/AppContext.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import AppContext, { useApp, type AppContextValue } from "../AppContext";
import type { ClassroomRole } from "../appReducer";

function makeContext(overrides: Partial<AppContextValue> = {}): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "demo-classroom",
    activeTab: "today",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: undefined,
    students: [],
    classroomAccessCodes: {},
    classroomRoles: { "demo-classroom": "ea" },
    activeRole: "ea",
    setClassroomRole: vi.fn(),
    authPrompt: null,
    showSuccess: vi.fn(),
    dispatch: vi.fn(),
    streaming: {
      active: false,
      phase: "idle",
      thinkingText: "",
      partialSections: [],
      progress: 0,
      elapsedSeconds: 0,
    },
    toasts: [],
    featuresSeen: {},
    submitFeedback: vi.fn(),
    showUndo: vi.fn(),
    dismissToast: vi.fn(),
    ...overrides,
  };
}

function Probe() {
  const ctx = useApp();
  return (
    <div>
      <span data-testid="role">{ctx.activeRole}</span>
      <button
        type="button"
        onClick={() => ctx.setClassroomRole("demo-classroom", "substitute")}
      >
        switch
      </button>
    </div>
  );
}

describe("AppContext — role surface", () => {
  it("exposes activeRole and setClassroomRole to consumers", () => {
    const setClassroomRole = vi.fn();
    const value = makeContext({ setClassroomRole });
    render(
      <AppContext.Provider value={value}>
        <Probe />
      </AppContext.Provider>,
    );
    expect(screen.getByTestId("role")).toHaveTextContent("ea");
    act(() => {
      screen.getByText("switch").click();
    });
    expect(setClassroomRole).toHaveBeenCalledWith("demo-classroom", "substitute");
  });

  it("defaults activeRole to 'teacher' for consumers that supply no stored role", () => {
    const value = makeContext({
      classroomRoles: {},
      activeRole: "teacher",
    });
    render(
      <AppContext.Provider value={value}>
        <Probe />
      </AppContext.Provider>,
    );
    expect(screen.getByTestId("role")).toHaveTextContent("teacher");
  });

  it("is typed so activeRole is a ClassroomRole", () => {
    const value = makeContext();
    const role: ClassroomRole = value.activeRole;
    expect(role).toBe("ea");
  });
});
```

Run:
```bash
npm run test -- AppContext.test 2>&1 | tail -20
```
Expected: fails because `AppContextValue` has no `classroomRoles`, `activeRole`, or `setClassroomRole`.

- [ ] **Step 2.2: Extend `AppContextValue` in `apps/web/src/AppContext.tsx`**

Replace the current `AppContextValue` interface (lines 5-30) with the following (additions are the three role fields and the import):

```tsx
import { createContext, useContext, type Dispatch } from "react";
import type { ClassroomProfile } from "./types";
import type {
  ActiveTab,
  AppAction,
  AuthPromptState,
  ClassroomRole,
  StreamingState,
  ToastItem,
} from "./appReducer";

export interface AppContextValue {
  classrooms: ClassroomProfile[];
  activeClassroom: string;
  activeTab: ActiveTab;
  setActiveClassroom: (id: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
  profile: ClassroomProfile | undefined;
  students: { alias: string; family_language?: string }[];
  classroomAccessCodes: Record<string, string>;
  /** Per-classroom role selections (persisted locally) */
  classroomRoles: Record<string, ClassroomRole>;
  /** Computed role for the active classroom, defaulting to 'teacher' */
  activeRole: ClassroomRole;
  /** Set the stored role for a classroom */
  setClassroomRole: (classroomId: string, role: ClassroomRole) => void;
  authPrompt: AuthPromptState | null;
  showSuccess: (msg: string) => void;
  /** Dispatch for the central state reducer */
  dispatch: Dispatch<AppAction>;
  /** Streaming state for planning-tier progressive disclosure */
  streaming: StreamingState;
  /** Toast queue for success, undo, info, error toasts */
  toasts: ToastItem[];
  /** Features the teacher has already seen (contextual onboarding) */
  featuresSeen: Record<string, boolean>;
  /** Submit output feedback */
  submitFeedback: (outputId: string, outputType: string, rating: "up" | "down", note?: string) => void;
  /** Show an undo toast for a reversible action */
  showUndo: (label: string, rollback: () => Promise<void>) => void;
  /** Dismiss a specific toast by id */
  dismissToast: (id: string) => void;
}
```

Leave the rest of the file (createContext / useApp / default export) unchanged.

- [ ] **Step 2.3: Wire `activeRole` + `setClassroomRole` into `App.tsx` provider assembly**

In `apps/web/src/App.tsx`, the `ctxValue` useMemo currently starts at line 497. Above the `ctxValue` declaration (so it's in scope), add:

```tsx
  const setClassroomRole = useCallback(
    (classroomId: string, role: import("./appReducer").ClassroomRole) => {
      dispatch({ type: "SET_CLASSROOM_ROLE", classroomId, role });
    },
    [],
  );

  const activeRole: import("./appReducer").ClassroomRole =
    state.classroomRoles[activeClassroom] ?? "teacher";
```

(Prefer a top-of-file named import `ClassroomRole` rather than the inline `import()`; add `ClassroomRole` to the existing `import { … } from "./appReducer"` at the top of the file and drop the inline types.)

Add `classroomRoles`, `activeRole`, and `setClassroomRole` to both the `ctxValue` object (around line 498) and the dependency array (around line 517). Result should read:

```tsx
  const ctxValue = useMemo(
    () => ({
      classrooms: state.classrooms,
      activeClassroom,
      activeTab,
      setActiveClassroom,
      setActiveTab,
      profile,
      students,
      classroomAccessCodes: state.classroomAccessCodes,
      classroomRoles: state.classroomRoles,
      activeRole,
      setClassroomRole,
      authPrompt,
      showSuccess,
      dispatch,
      streaming: state.streaming,
      toasts: state.toasts,
      featuresSeen: state.featuresSeen,
      submitFeedback,
      showUndo,
      dismissToast,
    }),
    [
      activeClassroom,
      activeRole,
      activeTab,
      authPrompt,
      dismissToast,
      profile,
      setActiveClassroom,
      setActiveTab,
      setClassroomRole,
      showSuccess,
      showUndo,
      state.classroomAccessCodes,
      state.classroomRoles,
      state.classrooms,
      state.featuresSeen,
      state.streaming,
      state.toasts,
      students,
      submitFeedback,
    ],
  );
```

- [ ] **Step 2.4: Update existing test fixtures that construct `AppContextValue`**

Search for panel test fixtures that build an `AppContextValue` literal (TodayPanel.test.tsx at `apps/web/src/panels/__tests__/TodayPanel.test.tsx:141-179` is the canonical example). Add three new keys to every such fixture so existing panel tests still typecheck:

```tsx
    classroomRoles: {},
    activeRole: "teacher",
    setClassroomRole: vi.fn(),
```

Run:
```bash
grep -rln "activeClassroom:" apps/web/src/**/__tests__ apps/web/src/__tests__ 2>/dev/null
```
Update any file that constructs an `AppContextValue` literal. Target: only `TodayPanel.test.tsx` has a full literal today; the other panel test files are single-line import smoke tests that need no change.

- [ ] **Step 2.5: Re-run targeted tests**

```bash
npm run test -- AppContext.test TodayPanel.test 2>&1 | tail -30
```
Expected: all pass.

- [ ] **Step 2.6: Typecheck and commit**

```bash
npm run typecheck 2>&1 | tail -10
git add apps/web/src/AppContext.tsx apps/web/src/App.tsx apps/web/src/__tests__/AppContext.test.tsx apps/web/src/panels/__tests__/TodayPanel.test.tsx
git commit -m "feat(roles): extend AppContext with activeRole and setClassroomRole"
```

---

### Task 3: Create `useRole()` capability hook

**Files:**
- Create: `apps/web/src/hooks/useRole.ts`
- Create: `apps/web/src/hooks/__tests__/useRole.test.tsx`

- [ ] **Step 3.1: Write failing unit tests for every role**

Create `apps/web/src/hooks/__tests__/useRole.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";
import { useRole, roleCapabilities } from "../useRole";
import type { ClassroomRole } from "../../appReducer";

function wrap(role: ClassroomRole) {
  const value: AppContextValue = {
    classrooms: [],
    activeClassroom: "c1",
    activeTab: "today",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: undefined,
    students: [],
    classroomAccessCodes: {},
    classroomRoles: { c1: role },
    activeRole: role,
    setClassroomRole: vi.fn(),
    authPrompt: null,
    showSuccess: vi.fn(),
    dispatch: vi.fn(),
    streaming: {
      active: false,
      phase: "idle",
      thinkingText: "",
      partialSections: [],
      progress: 0,
      elapsedSeconds: 0,
    },
    toasts: [],
    featuresSeen: {},
    submitFeedback: vi.fn(),
    showUndo: vi.fn(),
    dismissToast: vi.fn(),
  };

  function Probe() {
    const capabilities = useRole();
    return (
      <ul>
        <li data-testid="role">{capabilities.role}</li>
        <li data-testid="canWrite">{String(capabilities.canWrite)}</li>
        <li data-testid="canApproveMessages">{String(capabilities.canApproveMessages)}</li>
        <li data-testid="canLogInterventions">{String(capabilities.canLogInterventions)}</li>
        <li data-testid="canEditSchedule">{String(capabilities.canEditSchedule)}</li>
      </ul>
    );
  }

  render(
    <AppContext.Provider value={value}>
      <Probe />
    </AppContext.Provider>,
  );
}

describe("roleCapabilities — pure function", () => {
  it("teacher has every write capability", () => {
    expect(roleCapabilities("teacher")).toEqual({
      role: "teacher",
      canWrite: true,
      canApproveMessages: true,
      canLogInterventions: true,
      canEditSchedule: true,
    });
  });

  it("ea can log interventions but cannot approve messages or edit schedule", () => {
    expect(roleCapabilities("ea")).toEqual({
      role: "ea",
      canWrite: true,
      canApproveMessages: false,
      canLogInterventions: true,
      canEditSchedule: false,
    });
  });

  it("substitute is read-only on approvals and schedule but can log", () => {
    expect(roleCapabilities("substitute")).toEqual({
      role: "substitute",
      canWrite: true,
      canApproveMessages: false,
      canLogInterventions: true,
      canEditSchedule: false,
    });
  });

  it("reviewer is fully read-only", () => {
    expect(roleCapabilities("reviewer")).toEqual({
      role: "reviewer",
      canWrite: false,
      canApproveMessages: false,
      canLogInterventions: false,
      canEditSchedule: false,
    });
  });
});

describe("useRole — context-backed", () => {
  it("returns capabilities for teacher", () => {
    wrap("teacher");
    expect(screen.getByTestId("role")).toHaveTextContent("teacher");
    expect(screen.getByTestId("canApproveMessages")).toHaveTextContent("true");
  });

  it("returns capabilities for ea", () => {
    wrap("ea");
    expect(screen.getByTestId("canApproveMessages")).toHaveTextContent("false");
    expect(screen.getByTestId("canLogInterventions")).toHaveTextContent("true");
  });

  it("returns capabilities for substitute", () => {
    wrap("substitute");
    expect(screen.getByTestId("canEditSchedule")).toHaveTextContent("false");
  });

  it("returns capabilities for reviewer", () => {
    wrap("reviewer");
    expect(screen.getByTestId("canWrite")).toHaveTextContent("false");
    expect(screen.getByTestId("canApproveMessages")).toHaveTextContent("false");
  });
});
```

Run:
```bash
npm run test -- useRole.test 2>&1 | tail -25
```
Expected: all fail — module missing.

- [ ] **Step 3.2: Implement the hook**

Create `apps/web/src/hooks/useRole.ts`:

```ts
import { useApp } from "../AppContext";
import type { ClassroomRole } from "../appReducer";

export interface RoleCapabilities {
  role: ClassroomRole;
  /** Any write back to the API at all (generate/save/approve/log) */
  canWrite: boolean;
  /** Approve & Copy a family message draft */
  canApproveMessages: boolean;
  /** Log an intervention record */
  canLogInterventions: boolean;
  /** Edit the classroom schedule */
  canEditSchedule: boolean;
}

/**
 * Pure role-to-capability mapping. Kept separate from `useRole` so it can
 * be unit-tested without a React tree and reused server-side if needed.
 */
export function roleCapabilities(role: ClassroomRole): RoleCapabilities {
  switch (role) {
    case "teacher":
      return {
        role,
        canWrite: true,
        canApproveMessages: true,
        canLogInterventions: true,
        canEditSchedule: true,
      };
    case "ea":
      return {
        role,
        canWrite: true,
        canApproveMessages: false,
        canLogInterventions: true,
        canEditSchedule: false,
      };
    case "substitute":
      return {
        role,
        canWrite: true,
        canApproveMessages: false,
        canLogInterventions: true,
        canEditSchedule: false,
      };
    case "reviewer":
      return {
        role,
        canWrite: false,
        canApproveMessages: false,
        canLogInterventions: false,
        canEditSchedule: false,
      };
  }
}

/**
 * Returns the capability record for the currently active classroom's role.
 * Must be called inside a component that sits under `AppContext.Provider`.
 */
export function useRole(): RoleCapabilities {
  const { activeRole } = useApp();
  return roleCapabilities(activeRole);
}
```

- [ ] **Step 3.3: Re-run + commit**

```bash
npm run test -- useRole.test 2>&1 | tail -15
npm run typecheck 2>&1 | tail -10
git add apps/web/src/hooks/useRole.ts apps/web/src/hooks/__tests__/useRole.test.tsx
git commit -m "feat(roles): add useRole capability hook with pure role-to-capability mapping"
```

---

### Task 4: Create `RoleContextPill` component (dropdown + color chip)

**Files:**
- Create: `apps/web/src/components/RoleContextPill.tsx`
- Create: `apps/web/src/components/RoleContextPill.css`
- Create: `apps/web/src/components/__tests__/RoleContextPill.test.tsx`

- [ ] **Step 4.1: Write failing render + interaction test**

Create `apps/web/src/components/__tests__/RoleContextPill.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppContext, { type AppContextValue } from "../../AppContext";
import RoleContextPill from "../RoleContextPill";
import type { ClassroomRole } from "../../appReducer";

function makeContext(
  role: ClassroomRole,
  setClassroomRole = vi.fn(),
): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "demo-classroom",
    activeTab: "today",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: undefined,
    students: [],
    classroomAccessCodes: {},
    classroomRoles: { "demo-classroom": role },
    activeRole: role,
    setClassroomRole,
    authPrompt: null,
    showSuccess: vi.fn(),
    dispatch: vi.fn(),
    streaming: {
      active: false,
      phase: "idle",
      thinkingText: "",
      partialSections: [],
      progress: 0,
      elapsedSeconds: 0,
    },
    toasts: [],
    featuresSeen: {},
    submitFeedback: vi.fn(),
    showUndo: vi.fn(),
    dismissToast: vi.fn(),
  };
}

function renderWith(role: ClassroomRole, setClassroomRole?: ReturnType<typeof vi.fn>) {
  const ctx = makeContext(role, setClassroomRole);
  return render(
    <AppContext.Provider value={ctx}>
      <RoleContextPill />
    </AppContext.Provider>,
  );
}

describe("RoleContextPill", () => {
  it("renders the current role label and a color chip keyed to the role", () => {
    renderWith("ea");
    const trigger = screen.getByRole("button", { name: /current role: ea/i });
    expect(trigger).toBeInTheDocument();
    const chip = trigger.querySelector(".role-pill__chip");
    expect(chip).not.toBeNull();
    expect(chip).toHaveAttribute("data-role", "ea");
  });

  it("opens the role menu on click and exposes all four options", async () => {
    const user = userEvent.setup();
    renderWith("teacher");
    await user.click(screen.getByRole("button", { name: /current role: teacher/i }));
    const menu = screen.getByRole("menu", { name: /classroom role/i });
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /teacher/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: /ea/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("menuitemradio", { name: /substitute/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /reviewer/i })).toBeInTheDocument();
  });

  it("calls setClassroomRole with the chosen role and closes the menu", async () => {
    const user = userEvent.setup();
    const setClassroomRole = vi.fn();
    renderWith("teacher", setClassroomRole);
    await user.click(screen.getByRole("button", { name: /current role: teacher/i }));
    await user.click(screen.getByRole("menuitemradio", { name: /substitute/i }));
    expect(setClassroomRole).toHaveBeenCalledWith("demo-classroom", "substitute");
    expect(screen.queryByRole("menu", { name: /classroom role/i })).not.toBeInTheDocument();
  });

  it("closes the menu on Escape", async () => {
    const user = userEvent.setup();
    renderWith("teacher");
    await user.click(screen.getByRole("button", { name: /current role: teacher/i }));
    expect(screen.getByRole("menu", { name: /classroom role/i })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu", { name: /classroom role/i })).not.toBeInTheDocument();
  });
});
```

Run:
```bash
npm run test -- RoleContextPill.test 2>&1 | tail -20
```
Expected: module not found — red bar.

- [ ] **Step 4.2: Implement `RoleContextPill.tsx`**

Create `apps/web/src/components/RoleContextPill.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { useApp } from "../AppContext";
import { CLASSROOM_ROLES, type ClassroomRole } from "../appReducer";
import SectionIcon from "./SectionIcon";
import "./RoleContextPill.css";

const ROLE_LABEL: Record<ClassroomRole, string> = {
  teacher: "Teacher",
  ea: "EA",
  substitute: "Substitute",
  reviewer: "Reviewer",
};

const ROLE_HINT: Record<ClassroomRole, string> = {
  teacher: "Full planning, approval, and intervention access",
  ea: "Support and logging only; no message approvals or schedule edits",
  substitute: "Today view and logging; approvals restricted",
  reviewer: "Read-only access; no write actions",
};

export default function RoleContextPill() {
  const { activeClassroom, activeRole, setClassroomRole } = useApp();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (!anchorRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handleSelect(role: ClassroomRole) {
    if (!activeClassroom) return;
    setClassroomRole(activeClassroom, role);
    setOpen(false);
  }

  return (
    <div className="role-pill-anchor" ref={anchorRef}>
      <button
        type="button"
        className={`role-pill${open ? " role-pill--open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Current role: ${ROLE_LABEL[activeRole]}. Change classroom role.`}
        onClick={() => setOpen((v) => !v)}
        disabled={!activeClassroom}
      >
        <span className="role-pill__chip" data-role={activeRole} aria-hidden="true" />
        <span className="role-pill__copy">
          <span className="role-pill__eyebrow">Role</span>
          <span className="role-pill__label">{ROLE_LABEL[activeRole]}</span>
        </span>
        <span className="role-pill__caret" aria-hidden="true">⌄</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Classroom role"
          className="role-pill__menu"
        >
          <p className="role-pill__menu-header">
            <SectionIcon name="info" className="role-pill__menu-icon" />
            Role controls what you can write back to this classroom.
          </p>
          {CLASSROOM_ROLES.map((role) => {
            const selected = role === activeRole;
            return (
              <button
                key={role}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`role-pill__option${selected ? " role-pill__option--selected" : ""}`}
                onClick={() => handleSelect(role)}
              >
                <span className="role-pill__option-chip" data-role={role} aria-hidden="true" />
                <span className="role-pill__option-copy">
                  <span className="role-pill__option-label">{ROLE_LABEL[role]}</span>
                  <span className="role-pill__option-hint">{ROLE_HINT[role]}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4.3: Create companion CSS**

Create `apps/web/src/components/RoleContextPill.css`. All colors reference role tokens defined in Task 9 — do not use hex literals here.

```css
.role-pill-anchor {
  position: relative;
  display: inline-flex;
}

.role-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface-elevated);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
}

.role-pill:hover:not(:disabled),
.role-pill--open {
  border-color: var(--color-border-strong);
  background: var(--color-surface);
}

.role-pill:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.role-pill__chip {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
}

.role-pill__chip[data-role="teacher"],
.role-pill__option-chip[data-role="teacher"] {
  background: var(--color-role-teacher);
}

.role-pill__chip[data-role="ea"],
.role-pill__option-chip[data-role="ea"] {
  background: var(--color-role-ea);
}

.role-pill__chip[data-role="substitute"],
.role-pill__option-chip[data-role="substitute"] {
  background: var(--color-role-sub);
}

.role-pill__chip[data-role="reviewer"],
.role-pill__option-chip[data-role="reviewer"] {
  background: var(--color-role-reviewer);
}

.role-pill__copy {
  display: inline-flex;
  flex-direction: column;
  text-align: left;
  line-height: 1.1;
}

.role-pill__eyebrow {
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.role-pill__label {
  font-weight: var(--font-weight-semibold);
}

.role-pill__caret {
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
}

.role-pill__menu {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  min-width: 18rem;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-elevated);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  z-index: 50;
}

.role-pill__menu-header {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-1);
  color: var(--color-text-secondary);
  font-size: 0.72rem;
}

.role-pill__menu-icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
}

.role-pill__option {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.role-pill__option:hover,
.role-pill__option:focus-visible {
  border-color: var(--color-border);
  background: var(--color-surface);
}

.role-pill__option--selected {
  border-color: var(--color-border-strong);
  background: var(--color-surface);
}

.role-pill__option-chip {
  width: 0.85rem;
  height: 0.85rem;
  margin-top: 0.25rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
}

.role-pill__option-copy {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.role-pill__option-label {
  font-weight: var(--font-weight-semibold);
}

.role-pill__option-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  line-height: 1.35;
}
```

- [ ] **Step 4.4: Re-run, typecheck, commit**

```bash
npm run test -- RoleContextPill.test 2>&1 | tail -20
npm run typecheck 2>&1 | tail -10
git add apps/web/src/components/RoleContextPill.tsx apps/web/src/components/RoleContextPill.css apps/web/src/components/__tests__/RoleContextPill.test.tsx
git commit -m "feat(roles): add RoleContextPill component with dropdown selector"
```

---

### Task 5: Mount `RoleContextPill` in `App.tsx` header

**Files:**
- Modify: `apps/web/src/App.tsx` (lines 564-636 — `shell-classroom-anchor` block; add import at top)
- Modify: `apps/web/src/components/__tests__/RoleContextPill.test.tsx` (reuse — extended integration assertion)

- [ ] **Step 5.1: Add a failing integration-level assertion**

Append a new describe to `apps/web/src/components/__tests__/RoleContextPill.test.tsx`:

```tsx
import App from "../../App";

describe("RoleContextPill — header integration", () => {
  it("renders the pill next to the classroom pill in App header", async () => {
    // Mock the api to avoid network activity
    const api = await import("../../api");
    vi.spyOn(api, "listClassrooms").mockResolvedValue([
      {
        classroom_id: "demo-okafor-grade34",
        grade_band: "3-4",
        subject_focus: "cross_curricular",
        classroom_notes: [],
        students: [],
        is_demo: true,
      } as never,
    ]);
    vi.spyOn(api, "fetchTodaySnapshot").mockResolvedValue({
      debt_register: {
        register_id: "r",
        classroom_id: "demo-okafor-grade34",
        items: [],
        item_count_by_category: {},
        generated_at: "",
        schema_version: "1",
      },
      latest_plan: null,
      latest_forecast: null,
      student_count: 0,
      last_activity_at: null,
    } as never);

    render(<App />);
    const pill = await screen.findByRole("button", { name: /current role: teacher/i });
    expect(pill).toBeInTheDocument();
    // The role pill sits inside .shell-bar, next to the classroom anchor
    const shellBar = pill.closest(".shell-bar");
    expect(shellBar?.querySelector(".shell-classroom-anchor")).not.toBeNull();
  });
});
```

Run:
```bash
npm run test -- RoleContextPill.test 2>&1 | tail -20
```
Expected: the new integration case fails — `RoleContextPill` is not yet mounted.

- [ ] **Step 5.2: Add the import to `App.tsx`**

In the import block at the top of `apps/web/src/App.tsx` (lines 17-42), add:

```tsx
import RoleContextPill from "./components/RoleContextPill";
```

Place it alphabetically after `ClassroomAccessDialog`.

- [ ] **Step 5.3: Render `RoleContextPill` next to the classroom anchor**

In `apps/web/src/App.tsx`, the `shell-classroom-anchor` div currently closes at line 635. Immediately after that closing `</div>` (before `<div className="shell-bar__actions">` at line 637), insert:

```tsx
              <RoleContextPill />
```

Result (for context) — the `shell-bar` children order becomes:
1. `shell-brand`
2. `shell-classroom-anchor`
3. `RoleContextPill`
4. `shell-bar__actions`

- [ ] **Step 5.4: Re-run integration test, typecheck, commit**

```bash
npm run test -- RoleContextPill.test 2>&1 | tail -20
npm run typecheck 2>&1 | tail -10
git add apps/web/src/App.tsx apps/web/src/components/__tests__/RoleContextPill.test.tsx
git commit -m "feat(roles): mount RoleContextPill in app header"
```

---

### Task 6: Send `X-Classroom-Role` via `configureApiClient`

**Files:**
- Modify: `apps/web/src/api.ts` (lines 53-165 — `ApiClientConfig`, `requestJson`)
- Modify: `apps/web/src/App.tsx` (lines 263-275 — `configureApiClient` effect)
- Modify: `apps/web/src/__tests__/api.test.ts` (add a new describe block)

- [ ] **Step 6.1: Write failing tests for `X-Classroom-Role` injection**

Append the following describe block to `apps/web/src/__tests__/api.test.ts` (before the final `describe("POST with classroomId from body …")` block, or after it — order does not matter). It reuses the existing `mockFetch`, `jsonResponse`, and `configureApiClient` helpers.

```ts
// ===========================================================================
// X-Classroom-Role header
// ===========================================================================

describe("X-Classroom-Role header", () => {
  it("is included when getClassroomRole returns a role for the classroom", async () => {
    configureApiClient({
      getClassroomRole: (id: string) => (id === "c1" ? "ea" : undefined),
    });
    mockFetch.mockResolvedValueOnce(jsonResponse(200, {
      debt_register: { register_id: "r", classroom_id: "c1", items: [], item_count_by_category: {}, generated_at: "", schema_version: "1" },
      latest_plan: null,
      latest_forecast: null,
      student_count: 0,
      last_activity_at: null,
    }));

    await fetchTodaySnapshot("c1");

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-Classroom-Role")).toBe("ea");
  });

  it("is NOT included when getClassroomRole returns undefined", async () => {
    configureApiClient({
      getClassroomRole: () => undefined,
    });
    mockFetch.mockResolvedValueOnce(jsonResponse(200, {
      debt_register: { register_id: "r", classroom_id: "c1", items: [], item_count_by_category: {}, generated_at: "", schema_version: "1" },
      latest_plan: null,
      latest_forecast: null,
      student_count: 0,
      last_activity_at: null,
    }));

    await fetchTodaySnapshot("c1");

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-Classroom-Role")).toBeNull();
  });

  it("resolves classroomId from body for POST and sends the role", async () => {
    configureApiClient({
      getClassroomRole: (id: string) => (id === "c1" ? "substitute" : undefined),
    });
    mockFetch.mockResolvedValueOnce(jsonResponse(200, {
      artifact_id: "a1",
      variants: [],
      model_id: "mock",
      latency_ms: 5,
    }));

    await differentiate({
      artifact: { artifact_id: "a1", title: "T", subject: "math", source_type: "text" },
      classroom_id: "c1",
    });

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-Classroom-Role")).toBe("substitute");
  });

  it("is NOT included when classroomId cannot be resolved", async () => {
    configureApiClient({
      getClassroomRole: () => "ea",
    });
    mockFetch.mockResolvedValueOnce(jsonResponse(200, [
      { classroom_id: "c1", grade_band: "3-4", subject_focus: "math", classroom_notes: [], students: [] },
    ]));

    // listClassrooms has no classroomId in path or body
    await listClassrooms();

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-Classroom-Role")).toBeNull();
  });

  it("is carried through to the retry after an auth challenge", async () => {
    const requestClassroomCode = vi.fn().mockResolvedValue("new-code");
    configureApiClient({
      getClassroomCode: () => undefined,
      getClassroomRole: () => "teacher",
      requestClassroomCode,
    });

    mockFetch
      .mockResolvedValueOnce(jsonResponse(401, {
        error: "auth",
        category: "auth",
        detail_code: "classroom_code_missing",
      }))
      .mockResolvedValueOnce(jsonResponse(200, {
        debt_register: { register_id: "r", classroom_id: "c1", items: [], item_count_by_category: {}, generated_at: "", schema_version: "1" },
        latest_plan: null,
        latest_forecast: null,
        student_count: 0,
        last_activity_at: null,
      }));

    await fetchTodaySnapshot("c1");
    const [, retryInit] = mockFetch.mock.calls[1];
    const retryHeaders = new Headers(retryInit.headers);
    expect(retryHeaders.get("X-Classroom-Role")).toBe("teacher");
  });
});
```

Also update the existing `beforeEach` in this same file (around line 46) to reset the new field:

```ts
  configureApiClient({
    getClassroomCode: undefined,
    getClassroomRole: undefined,
    requestClassroomCode: undefined,
  });
```

Run:
```bash
npm run test -- api.test 2>&1 | tail -30
```
Expected: the 5 new tests fail because `getClassroomRole` is not a valid config field.

- [ ] **Step 6.2: Add `getClassroomRole` to `ApiClientConfig` and inject the header**

In `apps/web/src/api.ts`, extend `ApiClientConfig` (currently lines 53-56):

```ts
interface ApiClientConfig {
  getClassroomCode?: (classroomId: string) => string | undefined;
  getClassroomRole?: (classroomId: string) => string | undefined;
  requestClassroomCode?: (challenge: AuthChallenge) => Promise<string | null>;
}
```

Then in `requestJson` (currently lines 119-164), directly after the block that sets `X-Classroom-Code` (currently lines 127-131), add a parallel block:

```ts
  const classroomRole = classroomId ? apiClientConfig.getClassroomRole?.(classroomId) : undefined;
  if (classroomRole) {
    headers.set("X-Classroom-Role", classroomRole);
  }
```

(Role never comes from `options.classroomCode` directly — there is no per-request override pattern. The hook runs per-classroom.)

- [ ] **Step 6.3: Wire `getClassroomRole` in `App.tsx`'s `configureApiClient` effect**

In `apps/web/src/App.tsx`, the `useEffect` at lines 263-275 currently calls `configureApiClient` with `getClassroomCode` and `requestClassroomCode`. Replace that call with:

```tsx
  useEffect(() => {
    configureApiClient({
      getClassroomCode: (classroomId) => state.classroomAccessCodes[classroomId],
      getClassroomRole: (classroomId) => state.classroomRoles[classroomId] ?? "teacher",
      requestClassroomCode,
    });

    return () => {
      configureApiClient({
        getClassroomCode: undefined,
        getClassroomRole: undefined,
        requestClassroomCode: undefined,
      });
    };
  }, [requestClassroomCode, state.classroomAccessCodes, state.classroomRoles]);
```

- [ ] **Step 6.4: Re-run, typecheck, commit**

```bash
npm run test -- api.test 2>&1 | tail -30
npm run typecheck 2>&1 | tail -10
git add apps/web/src/api.ts apps/web/src/App.tsx apps/web/src/__tests__/api.test.ts
git commit -m "feat(roles): send X-Classroom-Role header on every API request"
```

---

### Task 7: `RolePromptDialog` — first-load role prompt for protected classrooms

**Files:**
- Create: `apps/web/src/components/RolePromptDialog.tsx`
- Create: `apps/web/src/components/RolePromptDialog.css`
- Create: `apps/web/src/components/__tests__/RolePromptDialog.test.tsx`
- Modify: `apps/web/src/appReducer.ts` (add `rolePrompt` state + actions)
- Modify: `apps/web/src/AppContext.tsx` (expose `rolePrompt`)
- Modify: `apps/web/src/App.tsx` (open the prompt on first protected selection; render the dialog near `ClassroomAccessDialog`)

- [ ] **Step 7.1: Add failing reducer tests for the prompt state**

Append to `apps/web/src/__tests__/appReducer.test.ts`:

```ts
describe("appReducer — role prompt", () => {
  it("OPEN_ROLE_PROMPT sets the prompt classroom id", () => {
    const initial = baseState();
    const next = appReducer(initial, {
      type: "OPEN_ROLE_PROMPT",
      classroomId: "classroom-a",
    });
    expect(next.rolePrompt).toEqual({ classroomId: "classroom-a" });
  });

  it("CLOSE_ROLE_PROMPT clears the prompt", () => {
    const initial = baseState({ rolePrompt: { classroomId: "classroom-a" } });
    const next = appReducer(initial, { type: "CLOSE_ROLE_PROMPT" });
    expect(next.rolePrompt).toBeNull();
  });
});
```

Also add `rolePrompt: null,` to `baseState`'s default. Run:
```bash
npm run test -- appReducer.test 2>&1 | tail -20
```
Expected: new cases fail.

- [ ] **Step 7.2: Extend reducer with `rolePrompt`**

In `apps/web/src/appReducer.ts`:
- Add an interface near the top (alongside `AuthPromptState`):
  ```ts
  export interface RolePromptState {
    classroomId: string;
  }
  ```
- Add `rolePrompt: RolePromptState | null;` to `AppState`.
- Add two actions to `AppAction`:
  ```ts
    | { type: "OPEN_ROLE_PROMPT"; classroomId: string }
    | { type: "CLOSE_ROLE_PROMPT" }
  ```
- Add `rolePrompt: null,` to `createInitialState`.
- Add two cases to the reducer switch:
  ```ts
      case "OPEN_ROLE_PROMPT":
        return { ...state, rolePrompt: { classroomId: action.classroomId } };
      case "CLOSE_ROLE_PROMPT":
        return { ...state, rolePrompt: null };
  ```

- [ ] **Step 7.3: Expose `rolePrompt` on `AppContextValue`**

In `apps/web/src/AppContext.tsx`, add:

```ts
  rolePrompt: RolePromptState | null;
```

And update the import block to also pull `RolePromptState` from `./appReducer`.

- [ ] **Step 7.4: Write failing dialog render test**

Create `apps/web/src/components/__tests__/RolePromptDialog.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RolePromptDialog from "../RolePromptDialog";

describe("RolePromptDialog", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <RolePromptDialog
        open={false}
        classroomId="classroom-a"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders all four role options when open", () => {
    render(
      <RolePromptDialog
        open={true}
        classroomId="classroom-a"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: /classroom role/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /teacher/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /ea/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /substitute/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /reviewer/i })).toBeInTheDocument();
  });

  it("submits the selected role when 'Save & Continue' is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <RolePromptDialog
        open={true}
        classroomId="classroom-a"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole("radio", { name: /substitute/i }));
    await user.click(screen.getByRole("button", { name: /save & continue/i }));
    expect(onSubmit).toHaveBeenCalledWith("substitute");
  });

  it("defaults to 'teacher' on submit when no explicit selection was made", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <RolePromptDialog
        open={true}
        classroomId="classroom-a"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole("button", { name: /save & continue/i }));
    expect(onSubmit).toHaveBeenCalledWith("teacher");
  });

  it("calls onClose when the user clicks 'Not now'", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <RolePromptDialog
        open={true}
        classroomId="classroom-a"
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /not now/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

Run:
```bash
npm run test -- RolePromptDialog.test 2>&1 | tail -20
```
Expected: module missing.

- [ ] **Step 7.5: Implement `RolePromptDialog.tsx`**

Create `apps/web/src/components/RolePromptDialog.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { CLASSROOM_ROLES, type ClassroomRole } from "../appReducer";
import "./RolePromptDialog.css";

interface Props {
  open: boolean;
  classroomId: string;
  onClose: () => void;
  onSubmit: (role: ClassroomRole) => void;
}

const ROLE_LABEL: Record<ClassroomRole, string> = {
  teacher: "Teacher — full access",
  ea: "Educational Assistant — logging only",
  substitute: "Substitute — today view only",
  reviewer: "Reviewer — read-only",
};

const ROLE_HINT: Record<ClassroomRole, string> = {
  teacher: "Plan, approve family messages, log interventions, edit schedules.",
  ea: "Log interventions and view briefings. Cannot approve family messages.",
  substitute: "Today view and logging. Cannot approve or change schedules.",
  reviewer: "Read-only access to classroom data for audit or observation.",
};

export default function RolePromptDialog({ open, classroomId, onClose, onSubmit }: Props) {
  const [selected, setSelected] = useState<ClassroomRole>("teacher");
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (open) setSelected("teacher");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(selected);
  }

  return (
    <div className="role-prompt__backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="role-prompt__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-prompt-title"
        aria-describedby="role-prompt-description"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="role-prompt__eyebrow">Classroom Role</span>
        <h2 id="role-prompt-title" className="role-prompt__title">
          Who's using {classroomId}?
        </h2>
        <p id="role-prompt-description" className="role-prompt__description">
          Your role controls what you can write back to this classroom. You can
          change it any time from the role pill in the header.
        </p>

        <form className="role-prompt__form" onSubmit={handleSubmit}>
          <fieldset className="role-prompt__fieldset">
            <legend className="role-prompt__legend">Choose your role</legend>
            {CLASSROOM_ROLES.map((role) => (
              <label
                key={role}
                className={`role-prompt__option${selected === role ? " role-prompt__option--selected" : ""}`}
              >
                <input
                  type="radio"
                  name="classroom-role"
                  value={role}
                  checked={selected === role}
                  onChange={() => setSelected(role)}
                />
                <span className="role-prompt__option-chip" data-role={role} aria-hidden="true" />
                <span className="role-prompt__option-copy">
                  <span className="role-prompt__option-label">{ROLE_LABEL[role]}</span>
                  <span className="role-prompt__option-hint">{ROLE_HINT[role]}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="role-prompt__actions">
            <button className="btn btn--tertiary" onClick={onClose} type="button">
              Not now
            </button>
            <button className="btn btn--primary" type="submit">
              Save & Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 7.6: Add companion CSS mirroring `ClassroomAccessDialog.css`**

Create `apps/web/src/components/RolePromptDialog.css`:

```css
.role-prompt__backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: color-mix(in srgb, var(--color-bg) 62%, transparent);
  backdrop-filter: blur(10px);
}

.role-prompt__card {
  width: min(100%, 520px);
  padding: var(--space-6);
  border: 1px solid color-mix(in srgb, var(--color-border-accent) 82%, transparent);
  border-radius: calc(var(--radius-lg) + 4px);
  background: var(--color-surface-elevated);
  box-shadow: var(--inner-stroke), var(--shadow-lg);
}

.role-prompt__eyebrow {
  display: inline-flex;
  margin-bottom: var(--space-3);
  color: var(--color-text-accent);
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.role-prompt__title {
  font-family: var(--font-serif);
  font-size: clamp(1.7rem, 3.6vw, 2.25rem);
  line-height: 1.05;
}

.role-prompt__description {
  margin-top: var(--space-3);
  color: var(--color-text-secondary);
  line-height: var(--leading-loose);
}

.role-prompt__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-5);
}

.role-prompt__fieldset {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border: none;
  padding: 0;
  margin: 0;
}

.role-prompt__legend {
  margin-bottom: var(--space-2);
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.role-prompt__option {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  background: var(--color-surface);
}

.role-prompt__option--selected {
  border-color: var(--color-border-strong);
  background: var(--color-surface-elevated);
}

.role-prompt__option-chip {
  width: 0.85rem;
  height: 0.85rem;
  margin-top: 0.35rem;
  border-radius: 999px;
}

.role-prompt__option-chip[data-role="teacher"] { background: var(--color-role-teacher); }
.role-prompt__option-chip[data-role="ea"] { background: var(--color-role-ea); }
.role-prompt__option-chip[data-role="substitute"] { background: var(--color-role-sub); }
.role-prompt__option-chip[data-role="reviewer"] { background: var(--color-role-reviewer); }

.role-prompt__option-copy {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.role-prompt__option-label {
  font-weight: var(--font-weight-semibold);
}

.role-prompt__option-hint {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.role-prompt__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

@media (max-width: 600px) {
  .role-prompt__card {
    padding: var(--space-5);
  }
  .role-prompt__actions {
    flex-direction: column-reverse;
  }
}
```

- [ ] **Step 7.7: Wire the prompt into `App.tsx`**

In `apps/web/src/App.tsx`:

1. Import `RolePromptDialog`:
   ```tsx
   import RolePromptDialog from "./components/RolePromptDialog";
   ```
2. Extend `setActiveClassroom` (currently lines 180-195) so that after the access-code branch runs, it also checks for a missing role on a protected classroom and opens the role prompt:

   ```tsx
     const setActiveClassroom = useCallback((classroomId: string, classroomsOverride?: ClassroomProfile[]) => {
       dispatch({ type: "SET_ACTIVE_CLASSROOM", classroomId });

       const classrooms = classroomsOverride ?? classroomsRef.current;
       const classroom = classrooms.find((entry) => entry.classroom_id === classroomId);
       if (!classroom) return;

       if (classroom.requires_access_code && !classroomCodesRef.current[classroomId]) {
         openAuthPrompt({
           classroomId,
           message: `${describeClassroom(classroom)} is protected. Save the classroom access code to unlock planning, messaging, and intervention workflows.`,
           status: 401,
           source: "selection",
         });
       }

       // Prompt for role on first protected classroom selection with no stored role
       if (classroom.requires_access_code && !classroomRolesRef.current[classroomId]) {
         dispatch({ type: "OPEN_ROLE_PROMPT", classroomId });
       }
     }, [openAuthPrompt]);
   ```

   Add a new ref alongside `classroomCodesRef`:
   ```tsx
     const classroomRolesRef = useRef(state.classroomRoles);
   ```
   And a useEffect to keep it current:
   ```tsx
     useEffect(() => {
       classroomRolesRef.current = state.classroomRoles;
     }, [state.classroomRoles]);
   ```

3. In the `ctxValue` memo, add `rolePrompt: state.rolePrompt,`.

4. Near the bottom of the render (around line 757 where `<ClassroomAccessDialog …/>` sits), add:

   ```tsx
           <RolePromptDialog
             open={Boolean(state.rolePrompt)}
             classroomId={state.rolePrompt?.classroomId ?? activeClassroom}
             onClose={() => dispatch({ type: "CLOSE_ROLE_PROMPT" })}
             onSubmit={(role) => {
               if (state.rolePrompt) {
                 dispatch({
                   type: "SET_CLASSROOM_ROLE",
                   classroomId: state.rolePrompt.classroomId,
                   role,
                 });
                 dispatch({ type: "CLOSE_ROLE_PROMPT" });
                 showSuccess(`Role set to ${role}`);
               }
             }}
           />
   ```

- [ ] **Step 7.8: Re-run, typecheck, commit**

```bash
npm run test -- RolePromptDialog.test appReducer.test 2>&1 | tail -30
npm run typecheck 2>&1 | tail -10
git add apps/web/src/components/RolePromptDialog.tsx apps/web/src/components/RolePromptDialog.css apps/web/src/components/__tests__/RolePromptDialog.test.tsx apps/web/src/appReducer.ts apps/web/src/AppContext.tsx apps/web/src/App.tsx apps/web/src/__tests__/appReducer.test.ts
git commit -m "feat(roles): add RolePromptDialog for first-load role selection"
```

---

### Task 8: Gate Family Message approval by role

**Files:**
- Modify: `apps/web/src/components/MessageDraft.tsx` (lines 1-82)
- Modify: `apps/web/src/panels/__tests__/FamilyMessagePanel.test.ts` → rename to `.tsx` and expand
- Modify: `apps/web/src/panels/FamilyMessagePanel.tsx` (tooltip wiring if the button moves up a level — see Step 8.3)

- [ ] **Step 8.1: Replace the 9-line smoke test with a real panel test**

Delete `apps/web/src/panels/__tests__/FamilyMessagePanel.test.ts` and create `apps/web/src/panels/__tests__/FamilyMessagePanel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";
import MessageDraft from "../../components/MessageDraft";
import type { ClassroomRole } from "../../appReducer";
import type { FamilyMessageDraft } from "../../types";

function makeContext(role: ClassroomRole): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "demo-classroom",
    activeTab: "family-message",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: undefined,
    students: [],
    classroomAccessCodes: {},
    classroomRoles: { "demo-classroom": role },
    activeRole: role,
    setClassroomRole: vi.fn(),
    rolePrompt: null,
    authPrompt: null,
    showSuccess: vi.fn(),
    dispatch: vi.fn(),
    streaming: {
      active: false,
      phase: "idle",
      thinkingText: "",
      partialSections: [],
      progress: 0,
      elapsedSeconds: 0,
    },
    toasts: [],
    featuresSeen: {},
    submitFeedback: vi.fn(),
    showUndo: vi.fn(),
    dismissToast: vi.fn(),
  };
}

function makeDraft(): FamilyMessageDraft {
  return {
    draft_id: "draft-1",
    classroom_id: "demo-classroom",
    student_refs: ["Amira"],
    message_type: "praise",
    target_language: "en",
    plain_language_text: "Amira had a great day.",
    teacher_approved: false,
  } as FamilyMessageDraft;
}

function renderDraft(role: ClassroomRole) {
  return render(
    <AppContext.Provider value={makeContext(role)}>
      <MessageDraft draft={makeDraft()} onApprove={vi.fn()} />
    </AppContext.Provider>,
  );
}

describe("MessageDraft — role gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("teacher sees an enabled 'Approve & Copy' button", () => {
    renderDraft("teacher");
    const btn = screen.getByRole("button", { name: /approve & copy/i });
    expect(btn).toBeEnabled();
  });

  it("ea sees the approve button disabled with a tooltip explaining the restriction", () => {
    renderDraft("ea");
    const btn = screen.getByRole("button", { name: /approve & copy/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute(
      "title",
      expect.stringMatching(/only a teacher/i),
    );
  });

  it("substitute sees the approve button disabled", () => {
    renderDraft("substitute");
    const btn = screen.getByRole("button", { name: /approve & copy/i });
    expect(btn).toBeDisabled();
  });

  it("reviewer sees the approve button disabled", () => {
    renderDraft("reviewer");
    const btn = screen.getByRole("button", { name: /approve & copy/i });
    expect(btn).toBeDisabled();
  });

  it("still shows the 'Approved' badge (not the button) when the draft is already approved", () => {
    render(
      <AppContext.Provider value={makeContext("ea")}>
        <MessageDraft
          draft={{ ...makeDraft(), teacher_approved: true }}
          onApprove={vi.fn()}
        />
      </AppContext.Provider>,
    );
    expect(screen.queryByRole("button", { name: /approve & copy/i })).not.toBeInTheDocument();
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
  });
});
```

Run:
```bash
npm run test -- FamilyMessagePanel.test 2>&1 | tail -20
```
Expected: fails — MessageDraft doesn't read role yet.

- [ ] **Step 8.2: Read role capabilities inside `MessageDraft.tsx`**

Modify `apps/web/src/components/MessageDraft.tsx` (replace the whole file with this version — the only meaningful changes are the `useRole()` import, the `canApproveMessages` branch, and the `disabled` + `title` props):

```tsx
import { useEffect, useState } from "react";
import type { FamilyMessageDraft } from "../types";
import { useRole } from "../hooks/useRole";
import PrintButton from "./PrintButton";
import OutputMetaRow from "./OutputMetaRow";
import "./MessageDraft.css";

interface Props {
  draft: FamilyMessageDraft;
  onApprove: (draftId: string) => void;
}

export default function MessageDraft({ draft, onApprove }: Props) {
  const { canApproveMessages, role } = useRole();
  const [copied, setCopied] = useState(false);
  const [approved, setApproved] = useState(draft.teacher_approved);

  useEffect(() => {
    setCopied(false);
    setApproved(draft.teacher_approved);
  }, [draft.draft_id, draft.teacher_approved]);

  async function handleApproveAndCopy() {
    try {
      await navigator.clipboard.writeText(draft.plain_language_text);
      setCopied(true);
      setApproved(true);
      onApprove(draft.draft_id);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setApproved(true);
      onApprove(draft.draft_id);
    }
  }

  const restrictionTooltip = canApproveMessages
    ? undefined
    : `Only a teacher can approve family messages. You are signed in as ${role}.`;

  return (
    <div className="message-draft">
      <header className="draft-header">
        <h2>Draft Message</h2>
        <p className="draft-meta">
          {draft.student_refs.join(", ")} · {draft.message_type.replace(/_/g, " ")} · {draft.target_language}
        </p>
        <OutputMetaRow
          items={[
            { label: approved ? "Approved" : "Approval required", tone: approved ? "success" : "pending" },
            { label: "Plain-language draft", tone: "analysis" },
            { label: "Manual send only", tone: "provenance" },
          ]}
          compact
        />
      </header>

      <div className="draft-body">
        <p className="draft-text">{draft.plain_language_text}</p>
      </div>

      {draft.simplified_student_text && (
        <div className="draft-student-version">
          <h3>Student-Friendly Version</h3>
          <p>{draft.simplified_student_text}</p>
        </div>
      )}

      <div className="draft-approval">
        {approved ? (
          <div className="draft-approved-badge">
            Approved {copied ? "& Copied" : ""}
          </div>
        ) : (
          <button
            className="btn btn--approve"
            type="button"
            onClick={handleApproveAndCopy}
            disabled={!canApproveMessages}
            title={restrictionTooltip}
            aria-describedby={canApproveMessages ? undefined : "draft-approval-restriction"}
          >
            Approve & Copy to Clipboard
          </button>
        )}
        <p
          id="draft-approval-restriction"
          className="draft-approval-note"
        >
          {canApproveMessages
            ? "This message will not be sent automatically. Copy and paste it into your preferred communication channel."
            : `Only a teacher can approve family messages. You are signed in as ${role}. Switch roles from the header pill if that's wrong.`}
        </p>
      </div>

      <PrintButton label="Print Message" />
    </div>
  );
}
```

- [ ] **Step 8.3: Re-run panel test, typecheck, commit**

```bash
npm run test -- FamilyMessagePanel.test 2>&1 | tail -20
npm run typecheck 2>&1 | tail -10
git add apps/web/src/components/MessageDraft.tsx apps/web/src/panels/__tests__/FamilyMessagePanel.test.tsx
git rm apps/web/src/panels/__tests__/FamilyMessagePanel.test.ts 2>/dev/null || true
git commit -m "feat(roles): gate Family Message approval by canApproveMessages capability"
```

---

### Task 9: Add role color tokens to `tokens.css`

**Files:**
- Modify: `apps/web/src/styles/tokens.css` (insert near the forecast colors block, around lines 86-99)
- Modify: `apps/web/src/components/__tests__/RoleContextPill.test.tsx` (optional computed-style assertion — see Step 9.3)

- [ ] **Step 9.1: Add four `--color-role-*` tokens**

In `apps/web/src/styles/tokens.css`, directly after the `--color-forecast-*` block and before `--color-approve` (around line 99), insert:

```css
  /* Classroom role colors — teacher / ea / substitute / reviewer */
  --color-role-teacher: light-dark(#1f6f68, #66b5ac); /* teal */
  --color-role-teacher-bg: light-dark(#dff0ee, #0f1a18);
  --color-role-teacher-text: light-dark(#0e4a45, #99d2cb);

  --color-role-ea: light-dark(#a8680e, #e6b25a); /* amber */
  --color-role-ea-bg: light-dark(#faecc9, #1a140a);
  --color-role-ea-text: light-dark(#6f4408, #f1c87a);

  --color-role-sub: light-dark(#6f3ba5, #c59ae6); /* violet */
  --color-role-sub-bg: light-dark(#ece0f7, #140c1c);
  --color-role-sub-text: light-dark(#4a2375, #d9bdf0);

  --color-role-reviewer: light-dark(#5a6a7a, #a3b5c7); /* slate */
  --color-role-reviewer-bg: light-dark(#e7ecf1, #101318);
  --color-role-reviewer-text: light-dark(#3a4756, #c3d0df);
```

These sit alongside the existing Prairie `light-dark(...)` pattern so dark-mode contrast is handled automatically.

- [ ] **Step 9.2: Verify dark-mode contrast via the existing contrast script**

```bash
npm run check:contrast 2>&1 | tail -40
```
Expected: no regressions. If any `--color-role-*-text` on `--color-role-*-bg` pair fails WCAG AA for small text, bump the light-mode text to a darker shade (e.g., change `#6f4408` → `#5a3706` for EA) and the dark-mode text to a lighter shade until it passes. Iterate until the script reports clean.

- [ ] **Step 9.3: Add a smoke assertion that `RoleContextPill` uses the tokens**

Append to `apps/web/src/components/__tests__/RoleContextPill.test.tsx`:

```tsx
describe("RoleContextPill — design tokens", () => {
  it("role chips reference the --color-role-* tokens", () => {
    renderWith("teacher");
    const chip = screen
      .getByRole("button", { name: /current role: teacher/i })
      .querySelector(".role-pill__chip");
    expect(chip).toHaveAttribute("data-role", "teacher");
    // JSDOM cannot resolve CSS variable values, so we verify the contract
    // via the data-role attribute + a CSS spot-check in RoleContextPill.css.
  });
});
```

- [ ] **Step 9.4: Re-run tests, commit**

```bash
npm run test -- RoleContextPill.test 2>&1 | tail -20
npm run check:contrast 2>&1 | tail -10
git add apps/web/src/styles/tokens.css apps/web/src/components/__tests__/RoleContextPill.test.tsx
git commit -m "feat(roles): add --color-role-* design tokens with dark-mode pairs"
```

---

### Task 10: Update `docs/safety-governance.md` with visible-role-surfacing note

**Files:**
- Modify: `docs/safety-governance.md` (after the "Hard rules" section, around line 14)

This task is prose-only and is the safety governance log entry for this surface change, as called out in the repo's Documentation Rules (`CLAUDE.md` — "classroom memory lifecycle behavior: update docs/database-schema.md, docs/pilot-readiness.md, and docs/safety-governance.md").

- [ ] **Step 10.1: Add the visible-role section**

In `apps/web/src/../../docs/safety-governance.md` (absolute path `/Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev/docs/safety-governance.md`), add a new second-level section immediately after the `## Hard rules` bullets (before `## Output policy`):

```markdown
## Visible role surfacing

Every classroom adult selects or confirms their role (teacher, EA, substitute, reviewer) when they first enter a protected classroom. The active role is shown as a color-coded pill in the app header and is sent to the orchestrator on every request as `X-Classroom-Role`. Write-action buttons (starting with the Family Message "Approve & Copy" control) are disabled client-side when the role lacks the capability, with a tooltip explaining the restriction. The backend remains the source of truth — a forged header will still be rejected by the orchestrator's scope check.

This is a user-visible trust surface, not an access-control boundary. The role pill exists so substitute teachers and EAs can see at a glance what they are and are not allowed to modify in a classroom; it does not replace server-side scope enforcement. Any new write-action capability must gate its UI through `useRole()` and must be reflected on the generated `docs/api-surface.md` scope table.
```

- [ ] **Step 10.2: Regenerate the system inventory so `docs/api-surface.md` stays current**

```bash
npm run system:inventory 2>&1 | tail -20
```
(If this command fails locally because it requires a running orchestrator, run the cheaper variant `npm run system:inventory:check` instead and note in the commit message that the generated artifact was not refreshed — the safety note is independently valid.)

- [ ] **Step 10.3: Commit**

```bash
git add docs/safety-governance.md docs/api-surface.md docs/system-inventory.md
git commit -m "docs(safety): note visible role surfacing and client-side scope gating"
```

---

## Final verification

After Task 10 commits, run the full guardrails called out in CLAUDE.md's Validation Rules:

```bash
npm run typecheck 2>&1 | tail -10
npm run test 2>&1 | tail -30
npm run check:contrast 2>&1 | tail -20
```

Expected:
- `typecheck`: clean
- `test`: all reducer, hook, component, panel, and API tests green
- `check:contrast`: no regressions; new role tokens pass AA

If any step fails, stop and root-cause — do not paper over by weakening a test. The common failure modes are:
- Forgetting to reset `getClassroomRole` in the `api.test.ts` `beforeEach` (Task 6).
- Forgetting to update the existing `TodayPanel.test.tsx` fixture with the three new context fields (Task 2).
- Missing a `--color-role-*-text` dark-mode adjustment that fails WCAG AA in `check:contrast` (Task 9).
- Stale `classroomRolesRef` in `App.tsx` causing the prompt to re-open after a successful save (Task 7).

## Rollback contract

Each task is a single commit touching a bounded set of files. If any task introduces a regression, revert that commit (`git revert <sha>`) without needing to unwind earlier tasks — the tasks are ordered so each compiles and tests green on its own.
